const fs = require('node:fs');
const path = require('node:path');

const gameHtmlPath = path.resolve(__dirname, '../public/game.html');
let content = fs.readFileSync(gameHtmlPath, 'utf8');

const hadCrlf = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

console.log('Original content lines:', content.split('\n').length);

function replaceExact(oldSnippet, newSnippet, label) {
  if (!content.includes(oldSnippet)) {
    console.error(`Target not found: ${label}`);
    process.exit(1);
  }
  content = content.replace(oldSnippet, newSnippet);
  console.log(`✓ Patched: ${label}`);
}

// 1. Result CSS for Draw
replaceExact(
`#result[data-winner="1"] {
  --victor: #c1e9ff;
  --victor-glow: #3568a1;
  --victor-art: url('img/game/eaglelord_blue.png');
}`,
`#result[data-winner="1"] {
  --victor: #c1e9ff;
  --victor-glow: #3568a1;
  --victor-art: url('img/game/eaglelord_blue.png');
}
#result[data-winner="draw"],
#result[data-winner="-1"] {
  --victor: #fef08a;
  --victor-glow: #854d0e;
  --victor-art: none;
}`,
'1. Result Draw CSS'
);

// 2. newMatch state & clean ticker
replaceExact(
`    bosses: {
      drag: { key: 'drag', name: 'Hỏa Long', x: BOSS_POS.drag.x, y: BOSS_POS.drag.y, hp: 9000, maxHp: 9000, cd: 0, respawnAt: 0, alive: true },
      baron: { key: 'baron', name: 'Baron Hư Không', x: BOSS_POS.baron.x, y: BOSS_POS.baron.y, hp: 13000, maxHp: 13000, cd: 0, respawnAt: 0, alive: true },
    },
    buffUntil: { drag: [0, 0], baron: [0, 0] },
    projectiles: [],
    portals: [],
    particles: [],
    epicFx: [],
    skyBeams: [],
    bolts: [],
    shake: 0,
    flash: null,
    stormBoost: 0,
    tickers: [],
    waveAt: gameNow + 1.5,
    routePings: [],
    fallen: [],
    resultTimer: null,
    siegeVote: {
      active: false,
      endsAt: 0,
      votes: [
        { top: 0, mid: 0, bot: 0 },
        { top: 0, mid: 0, bot: 0 },
      ],
      voters: new Map(),
    },
    siegeNextVoteElapsed: SIEGE_VOTE_INTERVAL,
  };
  giftRank.nextMatch = new Map();
  $('result').classList.remove('on');
  $('result').setAttribute('aria-hidden', 'true');
  addTicker('⚔️ Trận chiến bắt đầu! Comment 1 vào Đỏ, 2 vào Xanh!');`,
`    bosses: {
      drag: { key: 'drag', name: 'Hỏa Long', x: BOSS_POS.drag.x, y: BOSS_POS.drag.y, hp: 9000, maxHp: 9000, cd: 0, respawnAt: 0, alive: true, dmgLog: [], contested: false, leadSide: -1 },
      baron: { key: 'baron', name: 'Baron Hư Không', x: BOSS_POS.baron.x, y: BOSS_POS.baron.y, hp: 13000, maxHp: 13000, cd: 0, respawnAt: 0, alive: true, dmgLog: [], contested: false, leadSide: -1 },
    },
    buffUntil: { drag: [0, 0], baron: [0, 0] },
    projectiles: [],
    portals: [],
    particles: [],
    epicFx: [],
    skyBeams: [],
    bolts: [],
    shake: 0,
    flash: null,
    stormBoost: 0,
    tickers: [],
    waveAt: gameNow + 1.5,
    routePings: [],
    fallen: [],
    resultTimer: null,
    mapEvents: [],
    overtime: false,
    overtimeLeft: 0,
    overtimeObjective: null,
    resultAnnounced: false,
    siegeVote: {
      active: false,
      endsAt: 0,
      votes: [
        { top: 0, mid: 0, bot: 0 },
        { top: 0, mid: 0, bot: 0 },
      ],
      voters: new Map(),
    },
    siegeNextVoteElapsed: SIEGE_VOTE_INTERVAL,
  };
  giftRank.nextMatch = new Map();
  $('result').classList.remove('on');
  $('result').setAttribute('aria-hidden', 'true');
  addTicker('Trận đấu bắt đầu. Gõ 1 vào Đỏ, 2 vào Xanh.');`,
'2. newMatch state & clean ticker'
);

// 3. triggerMapEvent helper
replaceExact(
`function toastBanner(text) {`,
`function triggerMapEvent(x, y, title, subtitle, color, kind = 'event') {
  if (!S) return;
  if (!S.mapEvents) S.mapEvents = [];
  if (S.mapEvents.length >= 8) S.mapEvents.shift();
  S.mapEvents.push({
    x, y,
    title,
    subtitle: subtitle || '',
    color: color || '#fde047',
    kind,
    life: 3.0,
    maxLife: 3.0,
  });
}

function toastBanner(text) {`,
'3. triggerMapEvent helper'
);

// 4. Bá Chủ xuất trận hook in spawnUnit
replaceExact(
`    dead: false,
  };
  S.units.push(u);
  return u;
}`,
`    dead: false,
  };
  S.units.push(u);
  if (tierKey === 'eagleDragonLord' || spec.lord) {
    sfx('lord');
    burst(start.x, start.y, '#fde047', 42, 2.8);
    triggerMapEvent(start.x, start.y, 'BÁ CHỦ XUẤT TRẬN', 'PHE ' + TEAM_LABEL[side].toUpperCase(), '#fde047', 'lord');
    toastBanner('Bá Chủ Rồng Ưng phe ' + TEAM_LABEL[side] + ' xuất trận');
    addTicker('Bá Chủ Rồng Ưng phe ' + TEAM_LABEL[side] + ' đã ra chiến trường');
    if (mc.speaker) mcSay('Bá Chủ Rồng Ưng của phe ' + TEAM_LABEL[side] + ' đã xuất trận, toàn quân hãy mở đường!', 4);
  }
  return u;
}`,
'4. Bá Chủ xuất trận hook in spawnUnit'
);

// 5. isTargetAlive & startOvertime()
replaceExact(
`function isTargetAlive(target) {
  if (target.kind === 'unit') return !target.ref.dead;
  if (target.kind === 'boss') return target.ref.alive;
  if (target.kind === 'turret') return target.ref.hp > 0;
  return S.hp[target.ref] > 0;
}`,
`function isTargetAlive(target) {
  if (target.kind === 'unit') return !target.ref.dead;
  if (target.kind === 'boss') return target.ref.alive;
  if (target.kind === 'turret') return target.ref.hp > 0;
  if (target.kind === 'overtimeObjective') return target.ref.alive;
  return S.hp[target.ref] > 0;
}

function startOvertime() {
  if (!S || S.overtime || S.phase !== 'fight') return;
  S.overtime = true;
  S.overtimeLeft = 60;
  if (S.siegeVote) S.siegeVote.active = false;
  const midX = 500 * SXY, midY = 500 * SXY;
  S.overtimeObjective = {
    name: 'Cổ Vật Tranh Chấp',
    x: midX,
    y: midY,
    r: 36,
    hp: 4500,
    maxHp: 4500,
    alive: true,
  };
  sfx('boss');
  burst(midX, midY, '#fde047', 48, 3.0);
  triggerMapEvent(midX, midY, 'HIỆP PHỤ 60S', 'MỤC TIÊU ĐƯỜNG GIỮA', '#fde047', 'overtime');
  toastBanner('Hiệp phụ 60 giây! Điều quân về đường giữa');
  addTicker('Hiệp phụ 60 giây: Hạ mục tiêu giữa hoặc phá nhà chính để thắng');
  if (mc.speaker) mcSay('Hai phe hòa máu! Bắt đầu hiệp phụ 60 giây, tất cả hãy gõ mid để điều quân tranh chấp mục tiêu đường giữa!', 4);
}`,
'5. isTargetAlive & startOvertime()'
);

// 6. findTarget overtimeObjective consideration
replaceExact(
`  const boss = u.route === 'upatk' ? S.bosses.drag : u.route === 'downatk' ? S.bosses.baron : null;
  if (boss?.alive) consider('boss', boss, boss.x, boss.y, 38);
  return best;`,
`  const boss = u.route === 'upatk' ? S.bosses.drag : u.route === 'downatk' ? S.bosses.baron : null;
  if (boss?.alive) consider('boss', boss, boss.x, boss.y, 38);
  if (S.overtime && S.overtimeObjective?.alive && u.route === 'mid') {
    consider('overtimeObjective', S.overtimeObjective, S.overtimeObjective.x, S.overtimeObjective.y, S.overtimeObjective.r);
  }
  return best;`,
'6. findTarget overtimeObjective'
);

// 7. applyDamage moments & overtimeObjective
replaceExact(
`  } else if (target.kind === 'turret') {
    const tr = target.ref;
    tr.hp = Math.max(0, tr.hp - dmg);
    if (tr.hp <= 0) {
      sfx('turret');
      burst(tr.px, tr.py, '#fbbf24', 32, 2.2);
      toastBanner(\`💥 Trụ \${tr.lane.toUpperCase()} đội \${TEAM_LABEL[tr.t]} bị phá hủy!\`);
      addTicker(\`💥 Phá trụ \${tr.lane.toUpperCase()} đội \${TEAM_LABEL[tr.t]}!\`);
      if (mc.speaker) mcSay(\`Quá gắt! Trụ đường \${tr.lane} của đội \${TEAM_LABEL[tr.t]} vừa nổ tung!\`, 2);
    }
  } else if (target.kind === 'nexus') {
    const side = target.ref;
    S.hp[side] = Math.max(0, S.hp[side] - dmg);
    if (attackerOwnerId && S.players.has(attackerOwnerId)) S.players.get(attackerOwnerId).pts += Math.round(dmg * 0.4);
    if (S.hp[side] <= 0 && S.phase === 'fight') endMatch(1 - side);
  } else if (target.kind === 'boss') {
    const b = target.ref;
    if (!b.alive) return;
    b.hp -= dmg;
    if (b.hp <= 0) {
      b.alive = false;
      b.hp = 0;
      b.respawnAt = gameNow + 95;
      S.buffUntil[b.key][attackerSide] = gameNow + 60;
      sfx('boss');
      burst(b.x, b.y, '#c084fc', 36, 2.4);
      toastBanner(\`🐉 Đội \${TEAM_LABEL[attackerSide]} hạ gục \${b.name}! (+Tăng Công 60s)\`);
      addTicker(\`🏆 Đội \${TEAM_LABEL[attackerSide]} ăn thành công \${b.name}!\`);
      mcSay(\`Đội \${TEAM_LABEL[attackerSide]} vừa hạ gục \${b.name}! Sức mạnh toàn quân tăng vọt trong 60 giây!\`, 3);
      // Redirect attackers back to Mid after claiming boss
      for (const u of S.units) {
        if (u.t === attackerSide && (u.route === 'upatk' || u.route === 'downatk')) {
          u.route = 'mid';
          u.wpIdx = closestWaypoint(ROUTE_PTS[u.t].mid, u);
        }
      }
    }
  }`,
`  } else if (target.kind === 'turret') {
    const tr = target.ref;
    tr.hp = Math.max(0, tr.hp - dmg);
    if (tr.hp <= 0) {
      sfx('turret');
      burst(tr.px, tr.py, TEAM_COL[tr.t], 36, 2.4);
      triggerMapEvent(tr.px, tr.py, 'PHÁ TRỤ', \`ĐƯỜNG \${tr.lane.toUpperCase()} · PHE \${TEAM_LABEL[1 - tr.t].toUpperCase()}\`, TEAM_COL[1 - tr.t], 'turret');
      toastBanner(\`Đã phá trụ \${tr.lane.toUpperCase()} phe \${TEAM_LABEL[tr.t]}\`);
      addTicker(\`Phe \${TEAM_LABEL[1 - tr.t]} đã phá trụ đường \${tr.lane.toUpperCase()}\`);
      if (mc.speaker) mcSay(\`Phe \${TEAM_LABEL[1 - tr.t]} vừa phá hủy trụ đường \${tr.lane} của phe \${TEAM_LABEL[tr.t]}!\`, 2);
    }
  } else if (target.kind === 'nexus') {
    const side = target.ref;
    S.hp[side] = Math.max(0, S.hp[side] - dmg);
    if (attackerOwnerId && S.players.has(attackerOwnerId)) S.players.get(attackerOwnerId).pts += Math.round(dmg * 0.4);
    if (S.hp[side] <= 0 && S.phase === 'fight') endMatch(1 - side);
  } else if (target.kind === 'overtimeObjective') {
    const obj = target.ref;
    if (!obj.alive) return;
    obj.hp = Math.max(0, obj.hp - dmg);
    burst(obj.x + (Math.random() - .5) * 16, obj.y + (Math.random() - .5) * 16, TEAM_COL[attackerSide], 6, 1.0);
    if (obj.hp <= 0) {
      obj.alive = false;
      sfx('win');
      burst(obj.x, obj.y, TEAM_COL[attackerSide], 48, 3.0);
      triggerMapEvent(obj.x, obj.y, 'CHIẾN THẮNG HIỆP PHỤ', \`PHE \${TEAM_LABEL[attackerSide].toUpperCase()}\`, TEAM_COL[attackerSide], 'win');
      toastBanner(\`Phe \${TEAM_LABEL[attackerSide]} hạ gục Mục Tiêu Hiệp Phụ\`);
      addTicker(\`Phe \${TEAM_LABEL[attackerSide]} hạ gục Mục Tiêu Hiệp Phụ và giành chiến thắng\`);
      if (mc.speaker) mcSay(\`Phe \${TEAM_LABEL[attackerSide]} đã hạ gục mục tiêu hiệp phụ và giành chiến thắng chung cuộc!\`, 4);
      endMatch(attackerSide);
    }
  } else if (target.kind === 'boss') {
    const b = target.ref;
    if (!b.alive) return;
    b.dmgLog = b.dmgLog || [];
    b.dmgLog.push({ t: gameNow, side: attackerSide, dmg });
    b.hp -= dmg;
    if (b.hp <= 0) {
      b.alive = false;
      b.hp = 0;
      b.respawnAt = gameNow + 95;
      b.contested = false;
      b.dmgLog = [];
      S.buffUntil[b.key][attackerSide] = gameNow + 60;
      sfx('boss');
      burst(b.x, b.y, TEAM_COL[attackerSide], 40, 2.6);
      triggerMapEvent(b.x, b.y, 'HẠ BOSS', \`\${b.name.toUpperCase()} · PHE \${TEAM_LABEL[attackerSide].toUpperCase()}\`, TEAM_COL[attackerSide], 'boss');
      toastBanner(\`Phe \${TEAM_LABEL[attackerSide]} hạ gục \${b.name}\`);
      addTicker(\`Phe \${TEAM_LABEL[attackerSide]} nhận bùa tăng công từ \${b.name}\`);
      if (mc.speaker) mcSay(\`Phe \${TEAM_LABEL[attackerSide]} vừa hạ gục \${b.name}, tăng sức mạnh toàn quân trong 60 giây!\`, 3);
      // Redirect attackers back to Mid after claiming boss
      for (const u of S.units) {
        if (u.t === attackerSide && (u.route === 'upatk' || u.route === 'downatk')) {
          u.route = 'mid';
          u.wpIdx = closestWaypoint(ROUTE_PTS[u.t].mid, u);
        }
      }
    }
  }`,
'7. applyDamage moments & overtimeObjective'
);

// 8. step(dt) boss contest evaluation & overtime check
replaceExact(
`  S.time = Math.max(0, S.time - dt);
  if (!S.time) endMatch(S.hp[RED] >= S.hp[BLUE] ? RED : BLUE);
}

function stepEffects(dt) {
  for (const ping of S.routePings) ping.life -= dt;
  S.routePings = S.routePings.filter((ping) => ping.life > 0);`,
`  // Boss contest calculation in 3.5s window
  for (const key of ['drag', 'baron']) {
    const b = S.bosses[key];
    if (!b.alive) {
      b.contested = false;
      b.leadSide = -1;
      b.dmgLog = [];
    } else {
      b.dmgLog = (b.dmgLog || []).filter((e) => gameNow - e.t <= 3.5);
      const rDmg = b.dmgLog.filter((e) => e.side === RED).reduce((acc, e) => acc + e.dmg, 0);
      const bDmg = b.dmgLog.filter((e) => e.side === BLUE).reduce((acc, e) => acc + e.dmg, 0);
      if (rDmg > 0 && bDmg > 0) {
        b.contested = true;
        b.leadSide = rDmg > bDmg * 1.2 ? RED : (bDmg > rDmg * 1.2 ? BLUE : -1);
      } else {
        b.contested = false;
        b.leadSide = rDmg > 0 ? RED : (bDmg > 0 ? BLUE : -1);
      }
    }
  }

  S.time = Math.max(0, S.time - dt);
  if (S.time <= 0) {
    if (!S.overtime) {
      if (S.hp[RED] === S.hp[BLUE] && S.hp[RED] > 0) {
        startOvertime();
      } else {
        endMatch(S.hp[RED] > S.hp[BLUE] ? RED : BLUE);
      }
    }
  }
  if (S.overtime) {
    S.overtimeLeft = Math.max(0, S.overtimeLeft - dt);
    if (S.overtimeLeft <= 0 && S.phase === 'fight') {
      endMatch(-1); // Overtime expired with equal outcome -> Draw!
    }
  }
}

function stepEffects(dt) {
  if (S.mapEvents) {
    for (const ev of S.mapEvents) ev.life -= dt;
    S.mapEvents = S.mapEvents.filter((ev) => ev.life > 0);
  }
  for (const ping of S.routePings) ping.life -= dt;
  S.routePings = S.routePings.filter((ping) => ping.life > 0);`,
'8. boss contest & overtime time logic'
);

// 9. endMatch single announcement & Draw handling
replaceExact(
`function endMatch(winSide) {
  if (S.phase !== 'fight') return;
  S.phase = 'result';
  const finished = S;
  sfx('win');
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      if (S !== finished) return;
      const base = NEXUS_POS[1 - winSide];
      burst(base.x + (Math.random() - .5) * 90, base.y + (Math.random() - .5) * 90, '#fde047', 40, 2.5);
    }, i * 250);
  }
  giftRank.completed++;
  saveGiftRank();
  renderMatchMvp(finished, winSide);
  renderGiftRank(finished);
  const rEl = $('result');
  rEl.dataset.winner = String(winSide);
  rEl.querySelector('.w').textContent = \`ĐỘI \${TEAM_LABEL[winSide].toUpperCase()} CHIẾN THẮNG!\`;
  rEl.setAttribute('aria-hidden', 'false');
  rEl.classList.add('on');
  mcSay(\`Chúc mừng đội \${TEAM_LABEL[winSide]} đã giành chiến thắng chung cuộc!\`, 4);
  let left = 10;
  const countdown = () => {
    rEl.querySelector('.s').textContent = \`Trận mới sau \${left} giây · gõ 1 hoặc 2 để chọn phe\`;
    if (!giftRankScroll.hidden && !manualGiftScroll && !reducedMotion.matches && left <= 8 && left >= 1) {
      const distance = giftRankScroll.scrollHeight - giftRankScroll.clientHeight;
      if (distance > 0) giftRankScroll.scrollTo({ top: distance * (8 - left) / 7, behavior: 'smooth' });
    }
    if (left-- <= 0) newMatch();
    else S.resultTimer = setTimeout(countdown, 1000);
  };
  countdown();
}`,
`function endMatch(winSide) {
  if (!S || S.phase !== 'fight') return;
  if (S.resultAnnounced) return;
  S.resultAnnounced = true;
  S.phase = 'result';
  const finished = S;
  sfx('win');
  giftRank.completed++;
  saveGiftRank();
  renderMatchMvp(finished, winSide);
  renderGiftRank(finished);
  const rEl = $('result');
  if (winSide === RED || winSide === BLUE) {
    rEl.dataset.winner = String(winSide);
    rEl.querySelector('.w').textContent = \`ĐỘI \${TEAM_LABEL[winSide].toUpperCase()} CHIẾN THẮNG!\`;
    if (mc.speaker) mcSay(\`Chúc mừng đội \${TEAM_LABEL[winSide]} đã giành chiến thắng chung cuộc!\`, 4);
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (S !== finished) return;
        const base = NEXUS_POS[1 - winSide];
        burst(base.x + (Math.random() - .5) * 90, base.y + (Math.random() - .5) * 90, '#fde047', 40, 2.5);
      }, i * 250);
    }
  } else {
    rEl.dataset.winner = 'draw';
    rEl.querySelector('.w').textContent = 'KẾT QUẢ HÒA!';
    if (mc.speaker) mcSay('Hết giờ hiệp phụ! Trận đấu kết thúc với kết quả hòa!', 4);
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (S !== finished) return;
        const cx = 500 * SXY, cy = 500 * SXY;
        burst(cx + (Math.random() - .5) * 120, cy + (Math.random() - .5) * 120, '#fde047', 35, 2.2);
      }, i * 250);
    }
  }
  rEl.setAttribute('aria-hidden', 'false');
  rEl.classList.add('on');
  let left = 10;
  const countdown = () => {
    rEl.querySelector('.s').textContent = \`Trận mới sau \${left} giây · gõ 1 hoặc 2 để chọn phe\`;
    if (!giftRankScroll.hidden && !manualGiftScroll && !reducedMotion.matches && left <= 8 && left >= 1) {
      const distance = giftRankScroll.scrollHeight - giftRankScroll.clientHeight;
      if (distance > 0) giftRankScroll.scrollTo({ top: distance * (8 - left) / 7, behavior: 'smooth' });
    }
    if (left-- <= 0) newMatch();
    else S.resultTimer = setTimeout(countdown, 1000);
  };
  countdown();
}`,
'9. endMatch single announcement & Draw handling'
);

// 10. renderMatchMvp Draw handling
replaceExact(
`  const feature = best[winSide] || best[1 - winSide];`,
`  const feature = (winSide === RED || winSide === BLUE)
    ? (best[winSide] || best[1 - winSide])
    : ((best[RED]?.pts || 0) >= (best[BLUE]?.pts || 0) ? (best[RED] || best[BLUE]) : (best[BLUE] || best[RED]));`,
'10. renderMatchMvp Draw handling'
);

// 11. Boss pit rim & Overtime Objective in render()
replaceExact(
`  // 5. Bosses (DRAG & BARON)
  for (const key of ['drag', 'baron']) {
    const b = S.bosses[key];
    if (!b.alive) {
      ctx.fillStyle = 'rgba(200,220,255,0.78)';
      ctx.font = '800 16px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(\`Tái sinh \${Math.ceil(b.respawnAt - gameNow)}s\`, b.x, b.y + 18);
      continue;
    }
    const hover = Math.sin(nowSec * 3.2) * (key === 'drag' ? 4.5 : 2.5);
    const col = key === 'drag' ? '#fb923c' : '#c084fc';
    ctx.save();
    ctx.translate(b.x, b.y);
    // Cast shadow on pit floor
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.beginPath(); ctx.ellipse(0, 22, 38, 16, 0, 0, Math.PI * 2); ctx.fill();

    const bossTex = TEX[\`boss_\${key}\`];
    if (bossTex?.ready) {
      const bw = key === 'drag' ? 114 : 118;
      const wingPulse = key === 'drag' ? 1 + Math.sin(nowSec * 6.5) * 0.04 : 1 + Math.sin(nowSec * 3.5) * 0.025;
      ctx.save();
      ctx.translate(0, hover - 8);
      ctx.scale(wingPulse, 1 / Math.sqrt(wingPulse));
      ctx.drawImage(bossTex.img, -bw / 2, -bw / 2, bw, bw);
      ctx.restore();
    } else {
      ctx.fillStyle = key === 'drag' ? '#ea580c' : '#7e22ce';
      ctx.beginPath(); ctx.ellipse(0, hover, 22, 24, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Boss HP Bar
    const pct = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(-42, -56, 84, 10);
    ctx.fillStyle = col;
    ctx.fillRect(-40, -54, 80 * pct, 6);
    ctx.restore();
  }`,
`  // 5. Bosses (DRAG & BARON) & Contested Pit Rims
  for (const key of ['drag', 'baron']) {
    const b = S.bosses[key];
    if (!b.alive) {
      ctx.fillStyle = 'rgba(200,220,255,0.78)';
      ctx.font = '800 16px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(\`Tái sinh \${Math.ceil(b.respawnAt - gameNow)}s\`, b.x, b.y + 18);
      continue;
    }

    // Dynamic Pit Rim: shows team damage dominance in recent 3.5s window
    ctx.save();
    ctx.beginPath();
    ctx.arc(b.x, b.y, 82, 0, Math.PI * 2);
    if (b.contested) {
      const rimCol = b.leadSide === RED ? '#ef4444' : (b.leadSide === BLUE ? '#38bdf8' : '#fbbf24');
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 7;
      ctx.stroke();

      // "Đang tranh chấp" badge above HP bar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 2;
      const bw = 130, bh = 22;
      ctx.beginPath();
      ctx.roundRect(b.x - bw / 2, b.y - 74, bw, bh, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = rimCol;
      ctx.font = '800 13px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Đang tranh chấp', b.x, b.y - 63);
    } else {
      ctx.strokeStyle = key === 'drag' ? 'rgba(71, 85, 105, 0.55)' : 'rgba(76, 29, 149, 0.55)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();

    const hover = Math.sin(nowSec * 3.2) * (key === 'drag' ? 4.5 : 2.5);
    const col = key === 'drag' ? '#fb923c' : '#c084fc';
    ctx.save();
    ctx.translate(b.x, b.y);
    // Cast shadow on pit floor
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.beginPath(); ctx.ellipse(0, 22, 38, 16, 0, 0, Math.PI * 2); ctx.fill();

    const bossTex = TEX[\`boss_\${key}\`];
    if (bossTex?.ready) {
      const bw = key === 'drag' ? 114 : 118;
      const wingPulse = key === 'drag' ? 1 + Math.sin(nowSec * 6.5) * 0.04 : 1 + Math.sin(nowSec * 3.5) * 0.025;
      ctx.save();
      ctx.translate(0, hover - 8);
      ctx.scale(wingPulse, 1 / Math.sqrt(wingPulse));
      ctx.drawImage(bossTex.img, -bw / 2, -bw / 2, bw, bw);
      ctx.restore();
    } else {
      ctx.fillStyle = key === 'drag' ? '#ea580c' : '#7e22ce';
      ctx.beginPath(); ctx.ellipse(0, hover, 22, 24, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Boss HP Bar
    const pct = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(-42, -56, 84, 10);
    ctx.fillStyle = col;
    ctx.fillRect(-40, -54, 80 * pct, 6);
    ctx.restore();
  }

  // 5b. Overtime Mid Contested Objective
  if (S.overtime && S.overtimeObjective?.alive) {
    const obj = S.overtimeObjective;
    ctx.save();
    ctx.translate(obj.x, obj.y);
    const auraPulse = 1 + Math.sin(nowSec * 5) * 0.12;
    ctx.fillStyle = 'rgba(253, 224, 71, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, obj.r * 1.5 * auraPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, obj.r * auraPulse, 0, Math.PI * 2);
    ctx.stroke();

    const floatY = Math.sin(nowSec * 3) * 6;
    ctx.save();
    ctx.translate(0, floatY);
    ctx.rotate(nowSec * 0.9);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(22, 0);
    ctx.lineTo(0, 26);
    ctx.lineTo(-22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    const pct = Math.max(0, obj.hp / obj.maxHp);
    const bw = 84, bh = 8;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(-bw / 2 - 1, -48 - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-bw / 2, -48, bw * pct, bh);
    ctx.font = '800 12px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.fillText('MỤC TIÊU TRANH CHẤP', 0, -56);
    ctx.restore();
  }`,
'11. Boss pit rim & Overtime Objective in render()'
);

// 12. In-map event beacons in render() (anchored before S.routePings loop)
replaceExact(
`  for (const ping of S.routePings) {
    const progress = 1 - ping.life / 1.25;`,
`  // 11b. In-Map Key Moments & Event Beacons (Turret broken, Boss slain, Lord emerged, Overtime)
  if (S.mapEvents && S.mapEvents.length > 0) {
    for (const ev of S.mapEvents) {
      const progress = ev.life / ev.maxLife;
      const alpha = Math.min(1, progress * 1.6);
      ctx.save();
      ctx.globalAlpha = alpha;
      const expandR = (1 - progress) * 80 + 16;
      ctx.strokeStyle = ev.color;
      ctx.lineWidth = Math.max(1.5, 4 * progress);
      ctx.beginPath();
      ctx.arc(ev.x, ev.y, expandR, 0, Math.PI * 2);
      ctx.stroke();

      const badgeY = ev.y - 42 - (1 - progress) * 22;
      ctx.font = '900 14px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tW = ctx.measureText(ev.title).width;
      ctx.font = '700 11px "Be Vietnam Pro", sans-serif';
      const sW = ev.subtitle ? ctx.measureText(ev.subtitle).width : 0;
      const bw = Math.max(124, Math.max(tW, sW) + 24);
      const bh = ev.subtitle ? 36 : 24;

      ctx.fillStyle = 'rgba(10, 14, 26, 0.94)';
      ctx.strokeStyle = ev.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(ev.x - bw / 2, badgeY - bh / 2, bw, bh, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 13px "Be Vietnam Pro", sans-serif';
      ctx.fillStyle = ev.color;
      ctx.fillText(ev.title, ev.x, ev.subtitle ? badgeY - 8 : badgeY);

      if (ev.subtitle) {
        ctx.font = '700 10px "Be Vietnam Pro", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(ev.subtitle, ev.x, badgeY + 8);
      }
      ctx.restore();
    }
  }

  for (const ping of S.routePings) {
    const progress = 1 - ping.life / 1.25;`,
'12. In-map event beacons in render()'
);

// 13. updateUI clock & rotating guide Overtime support
replaceExact(
`  const sec = Math.max(0, Math.ceil(S.time));
  $('clock').textContent = \`\${String(Math.floor(sec / 60)).padStart(2, '0')}:\${String(sec % 60).padStart(2, '0')}\`;
  $('clock').classList.toggle('hurry', S.phase === 'fight' && sec <= 180);

  const van = (S.totalScore / 10000).toFixed(2);
  const mult = Math.min(8, 1 + Math.floor((S.kills[RED] + S.kills[BLUE]) / 45));
  $('totalPtsTxt').textContent = \`\${van} vạn · 🪙 X\${mult}\`;

  // Dynamic rotating guide / siege vote UI
  const guideNormalEl = $('guideNormal');
  const guideVoteEl = $('guideVote');
  if (S.siegeVote && S.siegeVote.active) {
    if (guideNormalEl) guideNormalEl.style.display = 'none';
    if (guideVoteEl) {
      guideVoteEl.style.display = 'flex';
      const rem = Math.max(0, Math.ceil(S.siegeVote.endsAt - gameNow));
      $('voteCountdown').textContent = \`\${rem}s\`;
      $('voteRedTop').textContent = S.siegeVote.votes[RED].top;
      $('voteRedMid').textContent = S.siegeVote.votes[RED].mid;
      $('voteRedBot').textContent = S.siegeVote.votes[RED].bot;
      $('voteBlueTop').textContent = S.siegeVote.votes[BLUE].top;
      $('voteBlueMid').textContent = S.siegeVote.votes[BLUE].mid;
      $('voteBlueBot').textContent = S.siegeVote.votes[BLUE].bot;
    }
  } else {
    if (guideVoteEl) guideVoteEl.style.display = 'none';
    if (guideNormalEl) {
      guideNormalEl.style.display = 'flex';
      if (gameNow - lastGuideSlideTime >= 6) {
        lastGuideSlideTime = gameNow;
        guideSlideIdx = (guideSlideIdx + 1) % GUIDE_SLIDES.length;
        $('guideSlideText').textContent = GUIDE_SLIDES[guideSlideIdx];
      }
    }
  }`,
`  if (S.overtime) {
    const otSec = Math.max(0, Math.ceil(S.overtimeLeft));
    $('clock').textContent = \`HP 00:\${String(otSec).padStart(2, '0')}\`;
    $('clock').classList.add('hurry');
  } else {
    const sec = Math.max(0, Math.ceil(S.time));
    $('clock').textContent = \`\${String(Math.floor(sec / 60)).padStart(2, '0')}:\${String(sec % 60).padStart(2, '0')}\`;
    $('clock').classList.toggle('hurry', S.phase === 'fight' && sec <= 180);
  }

  const van = (S.totalScore / 10000).toFixed(2);
  const mult = Math.min(8, 1 + Math.floor((S.kills[RED] + S.kills[BLUE]) / 45));
  $('totalPtsTxt').textContent = \`\${van} vạn · 🪙 X\${mult}\`;

  // Dynamic rotating guide / siege vote UI
  const guideNormalEl = $('guideNormal');
  const guideVoteEl = $('guideVote');
  if (S.overtime) {
    if (guideVoteEl) guideVoteEl.style.display = 'none';
    if (guideNormalEl) {
      guideNormalEl.style.display = 'flex';
      const otSec = Math.max(0, Math.ceil(S.overtimeLeft));
      $('guideSlideText').textContent = \`HIỆP PHỤ: \${otSec}s · Gõ mid để tranh chấp mục tiêu đường giữa!\`;
    }
  } else if (S.siegeVote && S.siegeVote.active) {
    if (guideNormalEl) guideNormalEl.style.display = 'none';
    if (guideVoteEl) {
      guideVoteEl.style.display = 'flex';
      const rem = Math.max(0, Math.ceil(S.siegeVote.endsAt - gameNow));
      $('voteCountdown').textContent = \`\${rem}s\`;
      $('voteRedTop').textContent = S.siegeVote.votes[RED].top;
      $('voteRedMid').textContent = S.siegeVote.votes[RED].mid;
      $('voteRedBot').textContent = S.siegeVote.votes[RED].bot;
      $('voteBlueTop').textContent = S.siegeVote.votes[BLUE].top;
      $('voteBlueMid').textContent = S.siegeVote.votes[BLUE].mid;
      $('voteBlueBot').textContent = S.siegeVote.votes[BLUE].bot;
    }
  } else {
    if (guideVoteEl) guideVoteEl.style.display = 'none';
    if (guideNormalEl) {
      guideNormalEl.style.display = 'flex';
      if (gameNow - lastGuideSlideTime >= 6) {
        lastGuideSlideTime = gameNow;
        guideSlideIdx = (guideSlideIdx + 1) % GUIDE_SLIDES.length;
        $('guideSlideText').textContent = GUIDE_SLIDES[guideSlideIdx];
      }
    }
  }`,
'13. updateUI clock & rotating guide Overtime support'
);

// 14. jump(j) reset overtime
replaceExact(
`  jump(j) {
    if (!S) return;
    if (S.siegeVote && S.siegeVote.active) S.siegeVote.active = false;`,
`  jump(j) {
    if (!S) return;
    if (S.overtime) {
      S.overtime = false;
      S.overtimeLeft = 0;
      S.overtimeObjective = null;
    }
    if (S.siegeVote && S.siegeVote.active) S.siegeVote.active = false;`,
'14. jump() overtime cleanup'
);

// 15. window.GAME_API test methods
replaceExact(
`  startSiegeVote() { startSiegeVote(); },
  spawnSiegeTank(side, lane) { return spawnSiegeTank(side, lane); },`,
`  startSiegeVote() { startSiegeVote(); },
  spawnSiegeTank(side, lane) { return spawnSiegeTank(side, lane); },
  startOvertime() { startOvertime(); },
  testBossContest(key) {
    if (!S || !S.bosses[key]) return;
    const b = S.bosses[key];
    b.alive = true;
    b.dmgLog = [
      { t: gameNow, side: RED, dmg: 400 },
      { t: gameNow, side: BLUE, dmg: 750 }
    ];
  },
  testMoment(kind) {
    if (!S) return;
    if (kind === 'turret') {
      const tr = S.turrets[0];
      if (tr) {
        tr.hp = 0;
        sfx('turret');
        burst(tr.px, tr.py, TEAM_COL[tr.t], 36, 2.4);
        triggerMapEvent(tr.px, tr.py, 'PHÁ TRỤ', \`ĐƯỜNG \${tr.lane.toUpperCase()} · PHE \${TEAM_LABEL[1 - tr.t].toUpperCase()}\`, TEAM_COL[1 - tr.t], 'turret');
        toastBanner(\`Đã phá trụ \${tr.lane.toUpperCase()} phe \${TEAM_LABEL[tr.t]}\`);
      }
    } else if (kind === 'boss') {
      const b = S.bosses.drag;
      b.alive = false;
      sfx('boss');
      burst(b.x, b.y, TEAM_COL[RED], 40, 2.6);
      triggerMapEvent(b.x, b.y, 'HẠ BOSS', \`\${b.name.toUpperCase()} · PHE \${TEAM_LABEL[RED].toUpperCase()}\`, TEAM_COL[RED], 'boss');
      toastBanner(\`Phe \${TEAM_LABEL[RED]} hạ gục \${b.name}\`);
    } else if (kind === 'lord') {
      const pos = pt(500, 500);
      sfx('lord');
      burst(pos.x, pos.y, '#fde047', 42, 2.8);
      triggerMapEvent(pos.x, pos.y, 'BÁ CHỦ XUẤT TRẬN', \`PHE \${TEAM_LABEL[RED].toUpperCase()}\`, '#fde047', 'lord');
      toastBanner(\`Bá Chủ Rồng Ưng phe \${TEAM_LABEL[RED]} xuất trận\`);
    }
  },`,
'15. GAME_API test methods exposed'
);

// 16. window.GAME_API stats() overtime & contested fields
replaceExact(
`      dragPct: Math.round((S.bosses.drag.hp / S.bosses.drag.maxHp) * 100),
      baronPct: Math.round((S.bosses.baron.hp / S.bosses.baron.maxHp) * 100),
    };`,
`      dragPct: Math.round((S.bosses.drag.hp / S.bosses.drag.maxHp) * 100),
      baronPct: Math.round((S.bosses.baron.hp / S.bosses.baron.maxHp) * 100),
      overtime: !!S.overtime,
      overtimeLeft: Math.ceil(S.overtimeLeft || 0),
      dragContested: !!S.bosses.drag.contested,
      baronContested: !!S.bosses.baron.contested,
    };`,
'16. GAME_API stats() overtime & contested fields'
);

// Restore CRLF if needed
if (hadCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(gameHtmlPath, content, 'utf8');
console.log('\n✓ Successfully applied all Phase 2 patches to public/game.html!');
