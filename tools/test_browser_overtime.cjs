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

  const chrome = spawn(chromePath, chromeArgs, { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2000));

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find((t) => t.url.includes('game.html')) || tabs[0];
    const WebSocket = globalThis.WebSocket;
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

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

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url });

    for (let i = 0; i < 20; i++) {
      const check = await send('Runtime.evaluate', { expression: 'typeof window.GAME_API === "object" && window.GAME_API !== null' });
      if (check?.result?.value === true) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    const evalResult = await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async () => {
        const report = [];
        const api = window.GAME_API;
        if (!api) return { ok: false, error: 'window.GAME_API is missing' };

        const resultEl = document.getElementById('result');

        // Test Outcome 1: Draw scenario in Overtime
        api.newMatch();
        api.startOvertime();
        await new Promise((r) => setTimeout(r, 100));

        api.testOvertimeEnd('draw');
        await new Promise((r) => setTimeout(r, 150));

        const winnerTitle = resultEl.querySelector('.w').textContent;
        report.push({ check: 'Result banner shows KẾT QUẢ HÒA!', pass: winnerTitle === 'KẾT QUẢ HÒA!', got: winnerTitle });
        report.push({ check: 'Result winner dataset is draw', pass: resultEl.dataset.winner === 'draw' });
        report.push({ check: 'Phase changed to result', pass: api.phase() === 'result' });

        // Test Outcome 2: Red Win in Overtime via Mid Objective kill
        api.newMatch();
        api.startOvertime();
        await new Promise((r) => setTimeout(r, 100));

        // Red damages and slays mid objective
        api.testOvertimeKillObjective(0);
        await new Promise((r) => setTimeout(r, 150));

        const redWinTitle = resultEl.querySelector('.w').textContent;
        report.push({ check: 'Result banner shows ĐỎ CHIẾN THẮNG on mid objective kill', pass: redWinTitle.includes('ĐỎ CHIẾN THẮNG'), got: redWinTitle });
        report.push({ check: 'Winner dataset is 0 (Red)', pass: resultEl.dataset.winner === '0' });

        // Test Outcome 3: Blue Win
        api.newMatch();
        api.testOvertimeEnd('blue');
        await new Promise((r) => setTimeout(r, 150));

        const blueWinTitle = resultEl.querySelector('.w').textContent;
        report.push({ check: 'Result banner shows XANH CHIẾN THẮNG', pass: blueWinTitle.includes('XANH CHIẾN THẮNG'), got: blueWinTitle });
        report.push({ check: 'Winner dataset is 1 (Blue)', pass: resultEl.dataset.winner === '1' });

        // Test Single Announcement Guard (call end again, verify no throw or error)
        api.testOvertimeEnd('red');
        report.push({ check: 'Result announcement guarded against duplicates', pass: resultEl.dataset.winner === '1' });

        // Clean reset
        api.newMatch();
        await new Promise((r) => setTimeout(r, 150));
        report.push({ check: 'Result overlay hidden after newMatch', pass: !resultEl.classList.contains('on') });
        report.push({ check: 'Overtime cleared after newMatch', pass: api.stats().overtime === false });

        return { ok: true, report };
      })()`,
      returnByValue: true
    });

    console.log('\n--- OVERTIME & ENDMATCH EVALUATION RESULTS ---');
    console.log(JSON.stringify(evalResult.result.value, null, 2));

    const value = evalResult.result.value;
    if (!value || !value.ok) {
      console.error('Test failed:', value);
      process.exit(1);
    }
    const failed = value.report.filter((r) => !r.pass);
    if (failed.length > 0) {
      console.error('Some checks failed:', failed);
      process.exit(1);
    }

    console.log('\n✓ ALL OVERTIME OUTCOMES (RED, BLUE, DRAW) PASSED PERFECTLY!');
    ws.close();
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    chrome.kill();
    server.close();
  }
});
