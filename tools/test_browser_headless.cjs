const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '../public');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.wav': 'audio/wav',
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end(); return;
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/game.html' : pathname));
  const type = types[path.extname(file)];
  if (req.method !== 'GET' || !file.startsWith(root + path.sep) || !type) {
    res.writeHead(404).end(); return;
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size });
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/game.html?mute=1`;
  console.log(`Server listening on ${url}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tmpDir = path.resolve(__dirname, 'tmp-chrome');
  const chromeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=' + tmpDir,
    '--window-size=1080,1920',
    '--remote-debugging-port=9222',
    url
  ];

  console.log('Launching Headless Chrome...');
  const chrome = spawn(chromePath, chromeArgs, { stdio: 'ignore' });

  // Wait for Chrome remote debugging
  await new Promise((r) => setTimeout(r, 2500));

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await listRes.json();
    console.log(`Found ${tabs.length} tabs in Chrome`);
    const pageTab = tabs.find((t) => t.url.includes('game.html')) || tabs[0];

    if (!pageTab || !pageTab.webSocketDebuggerUrl) {
      throw new Error('No debugger websocket found');
    }

    console.log('Connecting to Chrome DevTools WebSocket:', pageTab.webSocketDebuggerUrl);
    const WebSocket = globalThis.WebSocket;
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    // Enable console and runtime
    await send('Runtime.enable');
    await send('Console.enable');

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.method === 'Console.messageAdded') {
        console.log('[BROWSER CONSOLE]', data.params.message.text);
      } else if (data.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails);
      }
    });

    console.log('Navigating to target URL:', url);
    await send('Page.enable');
    await send('Page.navigate', { url });

    console.log('Waiting for window.GAME_API to be ready...');
    for (let i = 0; i < 20; i++) {
      const check = await send('Runtime.evaluate', { expression: 'typeof window.GAME_API === "object" && window.GAME_API !== null' });
      if (check?.result?.value === true) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    console.log('Running in-page browser tests...');
    const evalResult = await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async () => {
        const report = [];
        const api = window.GAME_API;
        if (!api) return { ok: false, error: 'window.GAME_API is missing' };

        // Test 1: Check elements
        const matchHeader = document.getElementById('matchHeaderRow');
        const clock = document.getElementById('clock');
        const redHp = document.getElementById('redHpTxt');
        const blueHp = document.getElementById('blueHpTxt');
        const joinRow = document.getElementById('joinRow');
        const guideArea = document.getElementById('rotatingGuideArea');
        const guideNormal = document.getElementById('guideNormal');
        const guideVote = document.getElementById('guideVote');

        report.push({ check: 'matchHeaderRow exists', pass: !!matchHeader });
        report.push({ check: 'clock exists', pass: !!clock && clock.textContent.includes(':') });
        report.push({ check: 'redHp and blueHp exist', pass: !!redHp && !!blueHp });
        report.push({ check: 'joinRow exists', pass: !!joinRow && joinRow.textContent.includes('1 VÀO ĐỎ') });
        report.push({ check: 'guideArea exists', pass: !!guideArea });

        // Test 2: Trigger Siege Vote
        api.startSiegeVote();
        await new Promise((r) => setTimeout(r, 200));

        report.push({ check: 'guideVote visible on vote start', pass: guideVote.style.display !== 'none' });
        report.push({ check: 'countdown running', pass: document.getElementById('voteCountdown').textContent.includes('s') });

        // Test 3: Cast Votes
        // User 1 votes top for Red
        api.event({ type: 'comment', user: 'tester_1', name: 'Tester 1', text: '1 top' });
        // User 2 votes mid for Red
        api.event({ type: 'comment', user: 'tester_2', name: 'Tester 2', text: '1 mid' });
        // User 2 changes vote to top
        api.event({ type: 'comment', user: 'tester_2', name: 'Tester 2', text: 'top' });
        // User 3 votes adc for Blue
        api.event({ type: 'comment', user: 'tester_3', name: 'Tester 3', text: '2 adc' });

        await new Promise((r) => setTimeout(r, 250));

        const redTopVotes = Number(document.getElementById('voteRedTop').textContent);
        const redMidVotes = Number(document.getElementById('voteRedMid').textContent);
        const blueBotVotes = Number(document.getElementById('voteBlueBot').textContent);

        report.push({ check: 'Red top votes == 2', pass: redTopVotes === 2, got: redTopVotes });
        report.push({ check: 'Red mid votes == 0 (switched)', pass: redMidVotes === 0, got: redMidVotes });
        report.push({ check: 'Blue bot votes == 1', pass: blueBotVotes === 1, got: blueBotVotes });

        // Test 4: Spawn Siege Tank directly
        const tank = api.spawnSiegeTank(0, 'mid');
        report.push({ check: 'spawnSiegeTank returns tank', pass: !!tank && tank.tier === 'siegeTank' && tank.spec.siege });

        let stats = api.stats();
        report.push({ check: 'api.stats() units > 0', pass: stats.units > 0 });

        // Test 5: Boss Contest Tracking (Đợt 2)
        api.testBossContest('drag');
        await new Promise((r) => setTimeout(r, 200));
        stats = api.stats();
        report.push({ check: 'Dragon is contested', pass: stats.dragContested === true });

        // Test 6: In-Map Key Moments (Đợt 2)
        api.testMoment('turret');
        const toastEl = document.getElementById('bossToast');
        report.push({ check: 'Turret broken moment notification', pass: toastEl && toastEl.textContent.includes('phá trụ') });

        api.testMoment('boss');
        report.push({ check: 'Boss slain moment notification', pass: toastEl && toastEl.textContent.includes('Hỏa Long') });

        api.testMoment('lord');
        report.push({ check: 'Lord emerged moment notification', pass: toastEl && toastEl.textContent.includes('Bá Chủ') });

        // Test 7: Overtime (Hiệp phụ 60 giây khi hòa máu - Đợt 2)
        api.startOvertime();
        await new Promise((r) => setTimeout(r, 200));
        stats = api.stats();
        report.push({ check: 'Overtime is active', pass: stats.overtime === true });
        report.push({ check: 'Clock shows a valid overtime time', pass: /^HP 0[01]:[0-5][0-9]$/.test(clock.textContent) });
        const guideTextEl = document.getElementById('guideSlideText');
        report.push({ check: 'Guide prompts mid in overtime', pass: guideTextEl && guideTextEl.textContent.includes('HIỆP PHỤ') });

        // Test 8: Clean reset on newMatch
        api.newMatch();
        await new Promise((r) => setTimeout(r, 150));
        stats = api.stats();
        report.push({ check: 'Overtime reset on new match', pass: stats.overtime === false });
        report.push({ check: 'Contest reset on new match', pass: stats.dragContested === false });
        report.push({ check: 'Clock normal MM:SS after reset', pass: clock.textContent.includes(':') && !clock.textContent.startsWith('HP') });

        return { ok: true, report };
      })()`,
      returnByValue: true
    });

    console.log('\n--- BROWSER EVALUATION RESULTS ---');
    console.log(JSON.stringify(evalResult.result.value, null, 2));

    const value = evalResult.result.value;
    if (!value || !value.ok) {
      console.error('Browser test failed:', value);
      process.exit(1);
    }
    const failed = value.report.filter((r) => !r.pass);
    if (failed.length > 0) {
      console.error('Some checks failed:', failed);
      process.exit(1);
    }

    console.log('\n✓ ALL IN-BROWSER TESTS PASSED PERFECTLY!');

    // Take screenshot of Stage
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    if (screenshot?.data) {
      fs.writeFileSync(path.resolve(__dirname, 'stage_screenshot.png'), Buffer.from(screenshot.data, 'base64'));
      console.log('Captured stage screenshot to tools/stage_screenshot.png');
    }

    ws.close();
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    chrome.kill();
    server.close();
  }
});
