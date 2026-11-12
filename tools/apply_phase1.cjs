const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const filePath = path.resolve(__dirname, '../public/game.html');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

function doReplace(target, replacement, label) {
  const normTarget = target.replace(/\r\n/g, '\n');
  const normReplacement = replacement.replace(/\r\n/g, '\n');
  assert.ok(content.includes(normTarget), `Target not found for: ${label}`);
  content = content.replace(normTarget, normReplacement);
  console.log(`[OK] Replaced: ${label}`);
}

// 1. Canvas and Map Frame positioning
doReplace(
  `#gameCanvas { left: 26px; top: 416px; width: 1028px; height: 1028px; border-radius: 18px; }`,
  `#gameCanvas { left: 26px; top: 268px; width: 1028px; height: 1028px; border-radius: 18px; }`,
  'gameCanvas position'
);

doReplace(
  `#mapFrame {
  position: absolute;
  left: 22px;
  top: 412px;
  width: 1036px;
  height: 1036px;`,
  `#mapFrame {
  position: absolute;
  left: 22px;
  top: 264px;
  width: 1036px;
  height: 1036px;`,
  'mapFrame position'
);

// 2. Replace Header & Top HUD CSS (lines ~74 to ~265)
const oldHeaderCssTarget = `/* Header: Centered Eagle-Dragon Crest + Gold Title + Top-right Controls */
#headerBar { position: absolute; top: 16px; left: 20px; right: 20px; height: 176px; }

.brandWrap {
  position: absolute;
  left: 39%;
  top: 8px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.crestSvg {
  width: 110px;
  height: 76px;
  filter: drop-shadow(0 6px 14px rgba(255, 160, 40, .55)) drop-shadow(0 2px 3px #000);
  margin-bottom: -12px;
}
.brandTitle {
  font-family: var(--display);
  font-size: 46px;
  line-height: 1.04;
  letter-spacing: 0.8px;
  color: #ffe270;
  -webkit-text-stroke: 3px #1f0d02;
  paint-order: stroke fill;
  text-shadow: 0 4px 0 #1c0b02, 0 0 22px rgba(255, 196, 46, 0.6), 0 8px 16px rgba(0, 0, 0, 0.92);
  white-space: nowrap;
  position: relative;
}
.brandSubRow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.brandSub {
  font: 800 18px/1 var(--body);
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: #fde68a;
  background: rgba(12, 10, 22, 0.72);
  border: 1px solid rgba(246, 201, 84, 0.55);
  border-radius: 999px;
  padding: 4px 14px;
}
.verBadge {
  font: 900 16px/1 var(--body);
  color: #fff;
  background: linear-gradient(180deg, #475569, #1e293b);
  border: 1px solid #94a3b8;
  border-radius: 6px;
  padding: 3px 8px;
}

.topControls {
  position: absolute;
  right: 0;
  top: 6px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: auto;
}
.resRow {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(14, 16, 30, 0.85);
  border: 1.5px solid rgba(246, 201, 84, 0.5);
  border-radius: 10px;
  padding: 5px 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, .6);
}
.resRow span { font: 700 17px/1 var(--body); color: #fef08a; }
.resRow select {
  background: #0f172a;
  color: #fff;
  border: 1px solid #475569;
  border-radius: 6px;
  padding: 4px 8px;
  font: 700 16px/1 var(--body);
  cursor: pointer;
}
.btnGroup { display: flex; gap: 10px; }
.rpgBtn {
  border: 2px solid #d8b4fe;
  border-radius: 12px;
  padding: 8px 20px;
  font: 800 20px/1 var(--body);
  color: #fff;
  cursor: pointer;
  background: linear-gradient(180deg, #7e22ce 0%, #581c87 52%, #3b0764 100%);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, .35), 0 4px 12px rgba(0, 0, 0, .75);
  transition: transform .12s, filter .12s;
}
.rpgBtn:hover { filter: brightness(1.15); transform: translateY(-1px); }
.rpgBtn:active { transform: translateY(1px); }

/* Command guide & Score VS Bar above Map */
#topHud {
  position: absolute;
  top: 192px;
  left: 20px;
  right: 20px;
  height: 214px;
}
.scorePill {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 22px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(35, 26, 12, 0.92), rgba(14, 10, 6, 0.94));
  border: 2px solid var(--gold);
  box-shadow: 0 4px 16px rgba(0, 0, 0, .75);
  white-space: nowrap;
}
.scorePill .pts { font: 800 22px/1 var(--body); color: #fde047; }
.scorePill .clockBox {
  font: 900 26px/1 var(--display);
  color: #fff;
  background: rgba(255, 255, 255, .08);
  border-radius: 999px;
  padding: 4px 14px;
  letter-spacing: 1px;
}
.scorePill .clockBox.hurry { color: #ff5757; animation: pulse .9s infinite; }
@keyframes pulse { 50% { transform: scale(1.09); } }

.cmdLeft {
  position: absolute;
  left: 0;
  top: 26px;
  width: 448px;
  padding: 12px 18px;
  border-radius: 14px;
  background: rgba(10, 12, 22, 0.78);
  border: 1.5px solid rgba(255, 110, 110, 0.42);
  box-shadow: 0 8px 22px rgba(0, 0, 0, .65);
}
.cmdLeft div {
  font: 900 31px/1.24 var(--body);
  color: #ff6b6b;
  letter-spacing: -0.2px;
}
.cmdLeft b { color: #ff9a9a; }

.vsWrap {
  position: absolute;
  left: 50%;
  top: 66px;
  transform: translateX(-50%);
  width: 148px;
  height: 112px;
  display: grid;
  place-items: center;
}
.vsText {
  font-family: var(--display);
  font-size: 74px;
  line-height: 1;
  background: linear-gradient(180deg, #fffbe2 0%, #ffd24c 45%, #d97706 85%, #78350f 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 4px 0 #1f0e02) drop-shadow(0 0 18px rgba(255, 180, 40, .65));
  font-style: italic;
}

.cmdRight {
  position: absolute;
  right: 0;
  top: 52px;
  width: 448px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(10, 12, 22, 0.62);
  border: 1.5px solid rgba(250, 204, 21, 0.35);
}
.cmdRight div {
  font: 900 33px/1.28 var(--body);
  color: #facc15;
  white-space: nowrap;
}`;

const newHeaderCssReplacement = `/* Header: Centered Crest + Compact Title */
#headerBar {
  position: absolute;
  top: 10px;
  left: 20px;
  right: 20px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brandWrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.crestSvg {
  width: 52px;
  height: 38px;
  filter: drop-shadow(0 4px 10px rgba(255, 160, 40, .55)) drop-shadow(0 2px 3px #000);
}
.brandTitle {
  font-family: var(--display);
  font-size: 34px;
  line-height: 1;
  letter-spacing: 0.8px;
  color: #ffe270;
  -webkit-text-stroke: 2.5px #1f0d02;
  paint-order: stroke fill;
  text-shadow: 0 3px 0 #1c0b02, 0 0 18px rgba(255, 196, 46, 0.6);
  white-space: nowrap;
}

/* Match Header Row: RED HP · MATCH CLOCK · BLUE HP in 1 single row */
#matchHeaderRow {
  position: absolute;
  top: 64px;
  left: 20px;
  right: 20px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: linear-gradient(180deg, rgba(16, 12, 28, 0.95), rgba(8, 7, 16, 0.96));
  border: 2px solid rgba(246, 201, 84, 0.45);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
}
.teamHpBlock {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.teamHpBlock.blue { justify-content: flex-end; }
.teamTag {
  font: 900 24px/1 var(--body);
  padding: 4px 12px;
  border-radius: 8px;
  color: #fff;
  letter-spacing: 0.5px;
}
.teamTag.red { background: linear-gradient(180deg, #dc2626, #991b1b); border: 1.5px solid #fca5a5; }
.teamTag.blue { background: linear-gradient(180deg, #0284c7, #075985); border: 1.5px solid #7dd3fc; }
.hpNum {
  font: 900 32px/1 var(--display);
  letter-spacing: 0.5px;
  min-width: 70px;
}
.hpNum.red { color: #fca5a5; }
.hpNum.blue { color: #7dd3fc; text-align: right; }
.hpBarBox {
  width: 165px;
  height: 18px;
  border-radius: 6px;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  background: rgba(10, 12, 20, 0.88);
  overflow: hidden;
  position: relative;
}
.hpBarFill {
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: 100%;
  transition: width 0.25s ease-out;
}
.hpBarFill.red { background: linear-gradient(90deg, #b91c1c, #ef4444); }
.hpBarFill.blue { background: linear-gradient(90deg, #0284c7, #38bdf8); right: 0; left: auto; }

.centerClockBlock {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  min-width: 130px;
}
.centerClockBlock .clockBox {
  font: 900 34px/1 var(--display);
  color: #fff;
  letter-spacing: 1.5px;
  text-shadow: 0 0 16px rgba(255, 255, 255, 0.45);
}
.centerClockBlock .clockBox.hurry {
  color: #f87171;
  animation: pulse 0.85s infinite;
}
@keyframes pulse { 50% { transform: scale(1.09); } }
.centerClockBlock .ptsText {
  font: 700 13px/1 var(--body);
  color: #fbbf24;
  margin-top: 2px;
}

/* Join Line: 1 VÀO ĐỎ · 2 VÀO XANH */
#joinRow {
  position: absolute;
  top: 130px;
  left: 20px;
  right: 20px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(10, 12, 22, 0.88);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
}
.joinPill {
  font: 900 24px/1 var(--body);
  letter-spacing: 1px;
}
.joinPill.red { color: #fca5a5; }
.joinPill.blue { color: #7dd3fc; }
.joinDot { font: 900 22px/1 var(--body); color: #fbbf24; }

/* Rotating Guide / Siege Tank Vote Area */
#rotatingGuideArea {
  position: absolute;
  top: 178px;
  left: 20px;
  right: 20px;
  height: 78px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(16, 14, 28, 0.94), rgba(10, 8, 20, 0.96));
  border: 1.5px solid rgba(246, 201, 84, 0.35);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.65);
  overflow: hidden;
}
.guideContent {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.guideText {
  font: 800 23px/1.3 var(--body);
  color: #fde047;
  letter-spacing: 0.2px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 100%;
}
.voteTitleRow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.voteTitle {
  font: 900 22px/1 var(--body);
  color: #fde047;
  letter-spacing: 0.5px;
}
.voteClock {
  font: 900 22px/1 var(--display);
  color: #fff;
  background: #dc2626;
  padding: 2px 10px;
  border-radius: 999px;
  animation: pulse 0.75s infinite;
}
.votePrompt {
  font: 700 15px/1.2 var(--body);
  color: #cbd5e1;
  margin-top: 2px;
}
.voteTallyRow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  font: 800 18px/1 var(--body);
  margin-top: 3px;
}
.tallyTeam { display: flex; align-items: center; gap: 8px; }
.tallyTeam.red { color: #fca5a5; }
.tallyTeam.blue { color: #7dd3fc; }
.tallyTeam b { color: #fff; font-family: var(--display); font-size: 20px; }
.tallySep { color: #64748b; }`;

doReplace(oldHeaderCssTarget, newHeaderCssReplacement, 'header and hud css');

// 3. Update Boss Toast, Summon Banner, and Footer CSS
doReplace(
  `#bossToast {
  position: absolute;
  top: 432px;`,
  `#bossToast {
  position: absolute;
  top: 280px;`,
  'bossToast position'
);

doReplace(
  `#summonBanner {
  position: absolute;
  top: 1336px;`,
  `#summonBanner {
  position: absolute;
  top: 1200px;`,
  'summonBanner position'
);

doReplace(
  `#footerHud {
  position: absolute;
  top: 1458px;
  left: 20px;
  right: 20px;
  bottom: 18px;
  display: grid;
  grid-template-columns: 468px 1fr;
  gap: 16px;
  align-items: start;
}`,
  `#footerHud {
  position: absolute;
  top: 1316px;
  left: 20px;
  right: 20px;
  bottom: 18px;
  display: grid;
  grid-template-columns: 500px 1fr;
  gap: 16px;
  align-items: start;
}
.avatarRowContainer {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}
.avatarTeamBlock {
  flex: 1;
  background: rgba(8, 10, 20, 0.7);
  border-radius: 10px;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.avTeamTitle {
  display: block;
  font: 800 13px/1 var(--body);
  margin-bottom: 6px;
}
.avTeamTitle.red { color: #fca5a5; }
.avTeamTitle.blue { color: #7dd3fc; text-align: right; }
.legendTitle {
  font: 900 18px/1 var(--body);
  color: #fde047;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  text-align: center;
}`,
  'footerHud css'
);

// 4. Replace HTML in #ui
const oldHtmlTarget = `        <!-- Header -->
        <div id="headerBar">
          <div class="brandWrap">
            <svg class="crestSvg" viewBox="0 0 180 120" aria-hidden="true">
              <defs>
                <linearGradient id="crestGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#fff8cf"/>
                  <stop offset="45%" stop-color="#fbbf24"/>
                  <stop offset="100%" stop-color="#92400e"/>
                </linearGradient>
                <linearGradient id="wingFire" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#fde047"/>
                  <stop offset="60%" stop-color="#ea580c"/>
                  <stop offset="100%" stop-color="#7f1d1d"/>
                </linearGradient>
              </defs>
              <path d="M90 108 L45 78 L10 30 L42 42 L26 16 L65 44 L80 28 L90 12 L100 28 L115 44 L154 16 L138 42 L170 30 L135 78 Z" fill="url(#wingFire)" stroke="#2c1202" stroke-width="4" stroke-linejoin="round"/>
              <path d="M90 18 C78 36 74 52 84 68 L70 92 L90 104 L110 92 L96 68 C106 52 102 36 90 18 Z" fill="url(#crestGold)" stroke="#1f0d02" stroke-width="3.5"/>
              <circle cx="84" cy="44" r="3.5" fill="#dc2626"/>
              <circle cx="96" cy="44" r="3.5" fill="#dc2626"/>
            </svg>
            <div class="brandTitle o">LONG ƯNG CHIẾN TRƯỜNG</div>
            <div class="brandSubRow">
              <span class="brandSub">ĐẠI CHIẾN 3 ĐƯỜNG</span>
              <span class="verBadge">1.6.0</span>
            </div>
          </div>

          <div class="topControls">
            <label class="resRow">
              <span>Đồ họa:</span>
              <select id="qualitySelect" aria-label="Chất lượng đồ họa">
                <option value="full">Chuẩn</option>
                <option value="lite">Nhẹ</option>
              </select>
            </label>
            <div class="btnGroup">
              <button class="rpgBtn" id="homeBtn" type="button">Trang chủ</button>
              <button class="rpgBtn" id="settingsBtn" type="button">Thiết lập</button>
            </div>
          </div>
        </div>

        <!-- Top Command Guide & VS -->
        <div id="topHud">
          <div class="scorePill">
            <span class="pts" id="totalPtsTxt">Số điểm: 0.00 vạn · 🪙 X1</span>
            <span class="clockBox" id="clock">30:00</span>
          </div>

          <div class="cmdLeft o">
            <div><b>top</b> = đường trên</div>
            <div><b>adc</b> = đường dưới</div>
            <div><b>mid</b> = đường giữa</div>
            <div><b>bac</b> = kéo về nhà</div>
          </div>

          <div class="vsWrap">
            <div class="vsText">VS</div>
          </div>

          <div class="cmdRight o">
            <div>upatk = ăn rồng</div>
            <div>downatk = ăn baro</div>
          </div>
        </div>

        <!-- Map Ornamental Border -->
        <div id="mapFrame"></div>

        <!-- Blue Top-Right Base Corner HUD -->
        <div class="cornerHud" id="blueCornerHud">
          <div class="avatarRow" id="blueAvatars"></div>
          <div class="nexusBarWrap">
            <div class="hpBarBox">
              <div class="hpBarFill blue" id="blueHpFill"></div>
              <div class="hpBarText o" id="blueHpTxt">100.00%</div>
            </div>
            <div class="gemOrb blue"><div class="gemDiamond"></div></div>
          </div>
        </div>

        <!-- Red Bottom-Left Base Corner HUD -->
        <div class="cornerHud" id="redCornerHud">
          <div class="avatarRow" id="redAvatars"></div>
          <div class="nexusBarWrap">
            <div class="gemOrb red"><div class="gemDiamond"></div></div>
            <div class="hpBarBox">
              <div class="hpBarFill red" id="redHpFill"></div>
              <div class="hpBarText o" id="redHpTxt">100.00%</div>
            </div>
          </div>
        </div>

        <!-- Dynamic Stage Toasts -->
        <div id="bossToast" class="o"></div>
        <div id="summonBanner">
          <div class="sAv" id="sbAv"></div>
          <div class="sTxt">
            <b id="sbTitle">TRIỆU HỒI BÁ CHỦ RỒNG ƯNG!</b>
            <span id="sbSub">Đội Đỏ · Tiếp viện tức thì</span>
          </div>
          <div class="sCoin" id="sbCoin" style="display:none">🪙 299 xu</div>
        </div>

        <!-- Footer below Map -->
        <div id="footerHud">
          <div class="footerLeft">
            <div class="joinCtaCard">
              <div class="rLine">cmt 1 vào đỏ</div>
              <div class="bLine">cmt 2 vào xanh</div>
            </div>
            <div class="battleStatsBox">
              <div class="teamCounters">
                <span class="rc" id="redStatTxt">🔴 Đỏ: 0 cmt · 0 hạ</span>
                <span class="bc" id="blueStatTxt">🔵 Xanh: 0 cmt · 0 hạ</span>
              </div>
              <div class="buffRow" id="buffRow"></div>
              <div id="tickerBox"></div>
            </div>
          </div>

          <div class="legendCard">
            <div class="legendTeams">
              <div class="pillTeamRed">1 Vào đội đỏ</div>
              <div class="pillTeamBlue">2 Vào đội xanh</div>
            </div>
            <div class="legendCmd"><span>top/mid/adc/bac</span><span>Thay đổi lộ trình</span></div>
            <div class="legendCmd"><span>upatk/downatk</span><span>Tấn công boss</span></div>
            <div class="giftRows" id="giftRows">
              <div class="giftRow"><img src="img/game/gift_rose.webp" alt="Rose"><b>Triệu Binh</b><small>Rose</small></div>
              <div class="giftRow"><img src="img/game/gift_rosa.webp" alt="Rosa"><b>Triệu Cung Binh</b><small>Rosa</small></div>
              <div class="giftRow"><img src="img/game/gift_doughnut.webp" alt="Doughnut"><b>Triệu hồi kỵ sĩ rồng</b><small>Doughnut</small></div>
              <div class="giftRow"><img src="img/game/gift_cap.webp" alt="Cap"><b>Triệu hồi rồng xương</b><small>Cap</small></div>
              <div class="giftRow"><img src="img/game/gift_corgi.webp" alt="Corgi"><b>Triệu hồi bá chủ rồng ưng</b><small>Corgi</small></div>
            </div>
          </div>
        </div>`;

const newHtmlReplacement = `        <!-- Compact Brand Header -->
        <div id="headerBar">
          <div class="brandWrap">
            <svg class="crestSvg" viewBox="0 0 180 120" aria-hidden="true">
              <defs>
                <linearGradient id="crestGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#fff8cf"/>
                  <stop offset="45%" stop-color="#fbbf24"/>
                  <stop offset="100%" stop-color="#92400e"/>
                </linearGradient>
                <linearGradient id="wingFire" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#fde047"/>
                  <stop offset="60%" stop-color="#ea580c"/>
                  <stop offset="100%" stop-color="#7f1d1d"/>
                </linearGradient>
              </defs>
              <path d="M90 108 L45 78 L10 30 L42 42 L26 16 L65 44 L80 28 L90 12 L100 28 L115 44 L154 16 L138 42 L170 30 L135 78 Z" fill="url(#wingFire)" stroke="#2c1202" stroke-width="4" stroke-linejoin="round"/>
              <path d="M90 18 C78 36 74 52 84 68 L70 92 L90 104 L110 92 L96 68 C106 52 102 36 90 18 Z" fill="url(#crestGold)" stroke="#1f0d02" stroke-width="3.5"/>
              <circle cx="84" cy="44" r="3.5" fill="#dc2626"/>
              <circle cx="96" cy="44" r="3.5" fill="#dc2626"/>
            </svg>
            <div class="brandTitle o">LONG ƯNG CHIẾN TRƯỜNG</div>
          </div>
        </div>

        <!-- Unified Top Battle Row: ĐỎ HP · CLOCK · BLUE HP -->
        <div id="matchHeaderRow">
          <div class="teamHpBlock red">
            <span class="teamTag red">ĐỎ</span>
            <span class="hpNum red o" id="redHpTxt">100%</span>
            <div class="hpBarBox red">
              <div class="hpBarFill red" id="redHpFill"></div>
            </div>
          </div>
          <div class="centerClockBlock">
            <div class="clockBox o" id="clock">30:00</div>
            <div class="ptsText" id="totalPtsTxt">0.00 vạn · 🪙 X1</div>
          </div>
          <div class="teamHpBlock blue">
            <div class="hpBarBox blue">
              <div class="hpBarFill blue" id="blueHpFill"></div>
            </div>
            <span class="hpNum blue o" id="blueHpTxt">100%</span>
            <span class="teamTag blue">XANH</span>
          </div>
        </div>

        <!-- Prominent Join Line -->
        <div id="joinRow">
          <span class="joinPill red">1 VÀO ĐỎ</span>
          <span class="joinDot">·</span>
          <span class="joinPill blue">2 VÀO XANH</span>
        </div>

        <!-- Rotating Guide & Siege Tank Vote Area -->
        <div id="rotatingGuideArea">
          <div id="guideNormal" class="guideContent">
            <div id="guideSlideText" class="guideText o">ĐI ĐƯỜNG: top (Trên) · mid (Giữa) · adc (Dưới) · bac (Về thủ)</div>
          </div>
          <div id="guideVote" class="guideContent" style="display:none;">
            <div class="voteTitleRow">
              <span class="voteTitle o">BỎ PHIẾU XE CÔNG THÀNH</span>
              <span class="voteClock o" id="voteCountdown">20s</span>
            </div>
            <div class="votePrompt">Gõ top, mid hoặc adc để chọn đường</div>
            <div class="voteTallyRow">
              <div class="tallyTeam red">
                <span>ĐỎ:</span>
                <span>top <b id="voteRedTop">0</b></span>
                <span>mid <b id="voteRedMid">0</b></span>
                <span>adc <b id="voteRedBot">0</b></span>
              </div>
              <span class="tallySep">|</span>
              <div class="tallyTeam blue">
                <span>XANH:</span>
                <span>top <b id="voteBlueTop">0</b></span>
                <span>mid <b id="voteBlueMid">0</b></span>
                <span>adc <b id="voteBlueBot">0</b></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Map Ornamental Border -->
        <div id="mapFrame"></div>

        <!-- Dynamic Stage Toasts -->
        <div id="bossToast" class="o"></div>
        <div id="summonBanner">
          <div class="sAv" id="sbAv"></div>
          <div class="sTxt">
            <b id="sbTitle">TRIỆU HỒI BÁ CHỦ RỒNG ƯNG!</b>
            <span id="sbSub">Đội Đỏ · Tiếp viện tức thì</span>
          </div>
          <div class="sCoin" id="sbCoin" style="display:none">🪙 299 xu</div>
        </div>

        <!-- Footer below Map -->
        <div id="footerHud">
          <div class="footerLeft">
            <div class="battleStatsBox">
              <div class="teamCounters">
                <span class="rc" id="redStatTxt">🔴 Đỏ: 0 cmt · 0 hạ</span>
                <span class="bc" id="blueStatTxt">🔵 Xanh: 0 cmt · 0 hạ</span>
              </div>
              <div class="avatarRowContainer">
                <div class="avatarTeamBlock">
                  <span class="avTeamTitle red">Top Đóng Góp Đỏ</span>
                  <div class="avatarRow" id="redAvatars"></div>
                </div>
                <div class="avatarTeamBlock">
                  <span class="avTeamTitle blue">Top Đóng Góp Xanh</span>
                  <div class="avatarRow" id="blueAvatars"></div>
                </div>
              </div>
              <div class="buffRow" id="buffRow"></div>
              <div id="tickerBox"></div>
            </div>
          </div>

          <div class="legendCard">
            <div class="legendTitle o">QUÀ TRIỆU HỒI QUÂN</div>
            <div class="giftRows" id="giftRows">
              <div class="giftRow"><img src="img/game/gift_rose.webp" alt="Rose"><b>Triệu Binh</b><small>Rose</small></div>
              <div class="giftRow"><img src="img/game/gift_rosa.webp" alt="Rosa"><b>Triệu Cung Binh</b><small>Rosa</small></div>
              <div class="giftRow"><img src="img/game/gift_doughnut.webp" alt="Doughnut"><b>Triệu hồi kỵ sĩ rồng</b><small>Doughnut</small></div>
              <div class="giftRow"><img src="img/game/gift_cap.webp" alt="Cap"><b>Triệu hồi rồng xương</b><small>Cap</small></div>
              <div class="giftRow"><img src="img/game/gift_corgi.webp" alt="Corgi"><b>Triệu hồi bá chủ rồng ưng</b><small>Corgi</small></div>
            </div>
          </div>
        </div>`;

doReplace(oldHtmlTarget, newHtmlReplacement, 'HTML in #ui');

// 5. Add siegeTank to TIERS
doReplace(
  `eagleDragonLord: { name: 'Bá Chủ Rồng Ưng',   hp: 3400, atk: 245, spd: 64, range: 128,cd: 0.95, r: 42, pts: 1000, ranged: true,  proj: 'goldfire', fly: true, lord: true },
};`,
  `eagleDragonLord: { name: 'Bá Chủ Rồng Ưng',   hp: 3400, atk: 245, spd: 64, range: 128,cd: 0.95, r: 42, pts: 1000, ranged: true,  proj: 'goldfire', fly: true, lord: true },
  siegeTank:       { name: 'Xe Công Thành',     hp: 1400, atk: 45,  siegeAtk: 160, spd: 46, range: 75, cd: 1.1, r: 24, pts: 180, ranged: true,  proj: 'boulder', siege: true },
};`,
  'TIERS siegeTank'
);

// 6. Add siegeTank to SPRITE_META
doReplace(
  `eagleDragonLord: { size: 140, ax: -70, ay: -78, barY: -82 },
};`,
  `eagleDragonLord: { size: 140, ax: -70, ay: -78, barY: -82 },
  siegeTank:       { size: 76,  ax: -38, ay: -42, barY: -48 },
};`,
  'SPRITE_META siegeTank'
);

// 7. Add sprite builder for siegeTank in buildSprites()
const buildSpritesAnchor = `  }
}
buildSprites();`;

const buildSpritesAddition = `    // 6. Armored Siege Tank (spiked iron wheels + reinforced chassis + siege ballista/cannon)
    SPRITES[\`siegeTank_\${t}\`] = mkSprite(100, 100, (g) => {
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.beginPath(); g.ellipse(0, 14, 26, 13, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1e293b';
      g.strokeStyle = '#475569';
      g.lineWidth = 2;
      for (const [wx, wy] of [[-16, -15], [16, -15], [-16, 15], [16, 15]]) {
        g.beginPath(); g.ellipse(wx, wy, 8, 5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.fillStyle = '#451a03';
      g.fillRect(-20, -14, 40, 28);
      g.strokeStyle = '#0f172a';
      g.lineWidth = 2;
      g.strokeRect(-20, -14, 40, 28);
      g.fillStyle = main;
      g.fillRect(-14, -10, 28, 20);
      g.fillStyle = hi;
      g.fillRect(-12, -8, 24, 3);
      g.fillStyle = gold;
      for (const [rx, ry] of [[-12, -8], [12, -8], [-12, 8], [12, 8], [0, -8], [0, 8]]) {
        g.beginPath(); g.arc(rx, ry, 2, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#334155';
      g.fillRect(0, -5, 26, 10);
      g.fillStyle = '#0f172a';
      g.fillRect(24, -6, 5, 12);
      g.fillStyle = gold;
      g.fillRect(4, -6, 3, 12);
      g.fillStyle = gold;
      g.fillRect(-18, -18, 2, 18);
      g.fillStyle = main;
      g.beginPath();
      g.moveTo(-16, -18);
      g.lineTo(-6, -13);
      g.lineTo(-16, -8);
      g.closePath();
      g.fill();
    });
    TEX[\`siegeTank_\${t}\`] = { img: SPRITES[\`siegeTank_\${t}\`], ready: true };
  }
}
buildSprites();`;

doReplace(buildSpritesAnchor, buildSpritesAddition, 'buildSprites siegeTank');

// 8. Add Siege Tank voting functions and logic before onComment
const siegeVoteFunctions = `// ================= SIEGE TANK AUDIENCE VOTING (EVERY 3 MIN, 20S ROUND) =================
const SIEGE_VOTE_INTERVAL = 180;
const SIEGE_VOTE_DURATION = 20;

function startSiegeVote() {
  if (!S || S.phase !== 'fight') return;
  S.siegeVote = {
    active: true,
    endsAt: gameNow + SIEGE_VOTE_DURATION,
    votes: [
      { top: 0, mid: 0, bot: 0 },
      { top: 0, mid: 0, bot: 0 },
    ],
    voters: new Map(),
  };
  S.siegeNextVoteElapsed = Math.floor((matchLen - S.time) / SIEGE_VOTE_INTERVAL + 1) * SIEGE_VOTE_INTERVAL;
  toastBanner('Mở bỏ phiếu Xe Công Thành! Gõ top, mid hoặc adc');
  addTicker('Mở bỏ phiếu Xe Công Thành trong 20 giây!');
  if (mc.speaker) mcSay('Đã mở đợt bỏ phiếu Xe Công Thành! Hai phe gõ top, mid hoặc adc để chọn đường xuất trận!', 3);
}

function recordSiegeVote(player, targetRoute) {
  if (!S || !S.siegeVote || !S.siegeVote.active) return;
  const lane = (targetRoute === 'adc' || targetRoute === 'bot') ? 'bot' : targetRoute;
  if (lane !== 'top' && lane !== 'mid' && lane !== 'bot') return;

  const voter = S.siegeVote.voters.get(player.id);
  if (!voter) {
    const team = player.side;
    S.siegeVote.voters.set(player.id, { team, lane });
    S.siegeVote.votes[team][lane]++;
  } else {
    if (voter.lane !== lane) {
      S.siegeVote.votes[voter.team][voter.lane] = Math.max(0, S.siegeVote.votes[voter.team][voter.lane] - 1);
      voter.lane = lane;
      S.siegeVote.votes[voter.team][lane]++;
    }
  }
}

function resolveSiegeVote() {
  if (!S || !S.siegeVote || !S.siegeVote.active) return;
  S.siegeVote.active = false;
  const TIE_PRIORITY = ['mid', 'top', 'bot'];
  const announcements = [];

  for (const t of [RED, BLUE]) {
    const tVotes = S.siegeVote.votes[t];
    const total = tVotes.top + tVotes.mid + tVotes.bot;
    if (total <= 0) continue;

    let bestLane = TIE_PRIORITY[0];
    let maxVotes = tVotes[bestLane];
    for (const l of ['top', 'bot']) {
      if (tVotes[l] > maxVotes) {
        maxVotes = tVotes[l];
        bestLane = l;
      }
    }
    spawnSiegeTank(t, bestLane);
    const laneName = ROUTE_LABELS[bestLane].toLowerCase();
    announcements.push(\`Đội \${TEAM_LABEL[t]} đưa Xe Công Thành lên \${laneName}\`);
  }

  if (announcements.length > 0) {
    const text = announcements.join(' · ');
    toastBanner(text);
    addTicker(text);
    if (mc.speaker) mcSay(text, 3);
  }
}

function spawnSiegeTank(side, lane) {
  if (!S || S.phase !== 'fight') return null;
  if (S.units.length >= UNIT_LIMIT) {
    const minionIdx = S.units.findIndex((u) => u.tier === 'soldier' && !u.dead);
    if (minionIdx !== -1) S.units.splice(minionIdx, 1);
  }
  const tank = spawnUnit(side, 'siegeTank', lane, null);
  if (tank) {
    tank.spawnFx = 1.4;
    tank.spawnFxCol = TEAM_COL[side];
    openPortal(tank.x, tank.y, side, true);
    sfx('portal');
  }
  return tank;
}
`;

doReplace(
  `// ================= EVENT HANDLERS (CALLED BY SSE OR TEST PANEL) =================`,
  `${siegeVoteFunctions}\n// ================= EVENT HANDLERS (CALLED BY SSE OR TEST PANEL) =================`,
  'siege vote functions'
);

// 9. Update onComment to record siege vote
doReplace(
  `    for (const u of S.units) {
      if (u.ownerId === p.id && u.t === p.side && !u.dead) {
        u.route = cmd.route;
        u.wpIdx = closestWaypoint(ROUTE_PTS[u.t][u.route], u);
      }
    }
  }`,
  `    for (const u of S.units) {
      if (u.ownerId === p.id && u.t === p.side && !u.dead) {
        u.route = cmd.route;
        u.wpIdx = closestWaypoint(ROUTE_PTS[u.t][u.route], u);
      }
    }
    if (S.siegeVote && S.siegeVote.active && (cmd.route === 'top' || cmd.route === 'mid' || cmd.route === 'bot')) {
      recordSiegeVote(p, cmd.route);
    }
  }`,
  'onComment siege vote recording'
);

// 10. Update newMatch() to initialize siege vote state
doReplace(
  `    fallen: [],
    resultTimer: null,
  };`,
  `    fallen: [],
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
  };`,
  'newMatch siegeVote state'
);

// 11. Update step(dt) to check siege vote schedule and resolution
doReplace(
  `  stepEffects(dt);
  if (S.phase !== 'fight') return;
  drainGiftQueue();`,
  `  stepEffects(dt);
  if (S.phase !== 'fight') return;
  drainGiftQueue();

  // Siege tank vote timer & schedule
  const matchElapsed = matchLen - S.time;
  if (matchElapsed >= S.siegeNextVoteElapsed && (!S.siegeVote || !S.siegeVote.active) && S.time > 30) {
    startSiegeVote();
  }
  if (S.siegeVote && S.siegeVote.active && gameNow >= S.siegeVote.endsAt) {
    resolveSiegeVote();
  }`,
  'step siege vote check'
);

// 12. Update unit attack in step(dt) for siege structure damage bonus
doReplace(
  `          const dragMult = S.buffUntil.drag[u.t] > gameNow ? 1.3 : 1;
          const baronMult = S.buffUntil.baron[u.t] > gameNow ? 1.25 : 1;
          const dmg = u.spec.atk * dragMult * baronMult;`,
  `          const dragMult = S.buffUntil.drag[u.t] > gameNow ? 1.3 : 1;
          const baronMult = S.buffUntil.baron[u.t] > gameNow ? 1.25 : 1;
          const isStructure = target.kind === 'turret' || target.kind === 'nexus';
          const baseAtk = (u.spec.siege && isStructure) ? (u.spec.siegeAtk || u.spec.atk * 3.5) : u.spec.atk;
          const dmg = baseAtk * dragMult * baronMult;`,
  'step siege damage bonus'
);

// 13. Update render() for siege tank marker and boulder projectile
doReplace(
  `    const bw = u.spec.lord ? 68 : u.tier === 'boneDragon' ? 50 : u.tier === 'dragonKnight' ? 38 : 28;`,
  `    const bw = u.spec.lord ? 68 : u.tier === 'boneDragon' ? 50 : (u.tier === 'dragonKnight' || u.tier === 'siegeTank') ? 42 : 28;`,
  'render bw siege tank'
);

doReplace(
  `    if (u.ownerName && (u.tier !== 'dragonKnight' || u.spawnFx > 0)) {`,
  `    if (u.tier === 'siegeTank') {
      ctx.font = '900 13px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#000';
      ctx.strokeText('XE CÔNG THÀNH', 0, by - 8);
      ctx.fillStyle = isRed ? '#fca5a5' : '#7dd3fc';
      ctx.fillText('XE CÔNG THÀNH', 0, by - 8);
    }
    if (u.ownerName && (u.tier !== 'dragonKnight' || u.spawnFx > 0)) {`,
  'render siege tank label'
);

doReplace(
  `    if (pr.kind === 'arrow') {
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke();
    } else {`,
  `    if (pr.kind === 'arrow') {
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke();
    } else if (pr.kind === 'boulder') {
      ctx.fillStyle = '#451a03';
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.beginPath(); ctx.arc(-2, -2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {`,
  'render boulder projectile'
);

// 14. Update updateUI() for unified header row and rotating guide/vote area
const guideSlidesJs = `let guideSlideIdx = 0;
let lastGuideSlideTime = 0;
const GUIDE_SLIDES = [
  'ĐI ĐƯỜNG: top (Trên) · mid (Giữa) · adc (Dưới) · bac (Về thủ)',
  'SĂN BOSS: upatk (Ăn Rồng) · downatk (Ăn Baron)',
  'TRIỆU HỒI: Tặng quà tương ứng để triệu hồi viện binh',
];\n`;

doReplace(
  `function updateUI() {`,
  `${guideSlidesJs}function updateUI() {`,
  'guideSlides definition'
);

const oldUpdateUiTarget = `  const redPct = (S.hp[RED] / S.maxHp) * 100;
  const bluePct = (S.hp[BLUE] / S.maxHp) * 100;
  $('redHpFill').style.width = \`\${redPct}%\`;
  $('blueHpFill').style.width = \`\${bluePct}%\`;
  $('redHpTxt').textContent = \`\${redPct.toFixed(2)}%\`;
  $('blueHpTxt').textContent = \`\${bluePct.toFixed(2)}%\`;

  const sec = Math.max(0, Math.ceil(S.time));
  $('clock').textContent = \`\${Math.floor(sec / 60)}:\${String(sec % 60).padStart(2, '0')}\`;
  $('clock').classList.toggle('hurry', S.phase === 'fight' && sec <= 180);

  const van = (S.totalScore / 10000).toFixed(2);
  const mult = Math.min(8, 1 + Math.floor((S.kills[RED] + S.kills[BLUE]) / 45));
  $('totalPtsTxt').textContent = \`Số điểm: \${van} vạn · 🪙 X\${mult}\`;`;

const newUpdateUiReplacement = `  const redPct = (S.hp[RED] / S.maxHp) * 100;
  const bluePct = (S.hp[BLUE] / S.maxHp) * 100;
  $('redHpFill').style.width = \`\${redPct}%\`;
  $('blueHpFill').style.width = \`\${bluePct}%\`;
  $('redHpTxt').textContent = \`\${Math.ceil(redPct)}%\`;
  $('blueHpTxt').textContent = \`\${Math.ceil(bluePct)}%\`;

  const sec = Math.max(0, Math.ceil(S.time));
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
  }`;

doReplace(oldUpdateUiTarget, newUpdateUiReplacement, 'updateUI header & guide/vote');

// 15. Update jump() and expose methods in window.GAME_API
doReplace(
  `  jump(j) {
    if (!S) return;
    if (j === 3) S.time = Math.min(S.time, 180);
    else if (j === 1.5) S.time = matchLen * 0.5;
    else if (j === 1) S.time = matchLen * 0.66;
    else if (j === 2) S.time = matchLen * 0.33;
  },`,
  `  jump(j) {
    if (!S) return;
    if (S.siegeVote && S.siegeVote.active) S.siegeVote.active = false;
    if (j === 3) S.time = Math.min(S.time, 180);
    else if (j === 1.5) S.time = matchLen * 0.5;
    else if (j === 1) S.time = matchLen * 0.66;
    else if (j === 2) S.time = matchLen * 0.33;
    const newElapsed = matchLen - S.time;
    S.siegeNextVoteElapsed = Math.floor(newElapsed / SIEGE_VOTE_INTERVAL + 1) * SIEGE_VOTE_INTERVAL;
  },`,
  'GAME_API jump vote schedule'
);

doReplace(
  `  newMatch,
  phase() { return S ? S.phase : 'fight'; },`,
  `  newMatch,
  startSiegeVote() { startSiegeVote(); },
  spawnSiegeTank(side, lane) { return spawnSiegeTank(side, lane); },
  phase() { return S ? S.phase : 'fight'; },`,
  'GAME_API startSiegeVote & spawnSiegeTank'
);

// Safe null checks for removed stage buttons
doReplace(
  `// Resolution switcher & Settings modal
$('stageUrlCode').textContent = \`http://lvh.me:\${location.port || 3000}/?view=stage\`;
$('qualitySelect').onchange = (e) => setGraphics(e.target.value);
$('settingsBtn').onclick = () => $('settingsModal').classList.add('on');
$('closeModalBtn').onclick = () => $('settingsModal').classList.remove('on');
$('homeBtn').onclick = () => {
  $('settingsModal').classList.remove('on');
  toastBanner('🏠 Long Ưng Chiến Trường · Đã sẵn sàng chiến đấu!');
};`,
  `// Resolution switcher & Settings modal
if ($('stageUrlCode')) $('stageUrlCode').textContent = \`http://lvh.me:\${location.port || 3000}/?view=stage\`;
if ($('qualitySelect')) $('qualitySelect').onchange = (e) => setGraphics(e.target.value);
if ($('settingsBtn')) $('settingsBtn').onclick = () => $('settingsModal')?.classList.add('on');
if ($('closeModalBtn')) $('closeModalBtn').onclick = () => $('settingsModal')?.classList.remove('on');
if ($('homeBtn')) $('homeBtn').onclick = () => {
  $('settingsModal')?.classList.remove('on');
  toastBanner('Long Ưng Chiến Trường sẵn sàng chiến đấu!');
};`,
  'safe null check for removed operator buttons'
);

doReplace(
  `function setGraphics(value) {
  graphics = value === 'lite' ? 'lite' : 'full';
  $('qualitySelect').value = graphics;
  $('modalQuality').textContent = graphics === 'lite' ? 'Nhẹ (30 FPS)' : 'Chuẩn';
  $('summonBanner').classList.toggle('lite', graphics === 'lite');
}`,
  `function setGraphics(value) {
  graphics = value === 'lite' ? 'lite' : 'full';
  if ($('qualitySelect')) $('qualitySelect').value = graphics;
  if ($('modalQuality')) $('modalQuality').textContent = graphics === 'lite' ? 'Nhẹ (30 FPS)' : 'Chuẩn';
  $('summonBanner')?.classList.toggle('lite', graphics === 'lite');
}`,
  'safe setGraphics null check'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched public/game.html for Phase 1 with 100% assertions satisfied!');
