const assert = require('node:assert/strict');
const { loadGame } = require('./game-test-runtime.cjs');

const game = loadGame();
const api = game.GAME_API;
const result = () => game.element('result').dataset.winner;
const clock = () => game.element('clock').textContent;

api.newMatch();
const dragon = game.state.bosses.drag;
game.applyDamage(0, null, { kind: 'boss', ref: dragon }, 400);
game.applyDamage(1, null, { kind: 'boss', ref: dragon }, 750);
game.step(0.02);
assert.equal(dragon.contested, true);
assert.equal(dragon.leadSide, 1);
for (let i = 0; i < 36; i++) game.step(0.1);
assert.equal(dragon.contested, false, 'Actual damage expires from the contest window');

api.newMatch();
const turret = game.state.turrets[0];
const boss = game.state.bosses.drag;
api.testMoment('turret');
api.testMoment('boss');
api.testMoment('lord');
assert.deepEqual(Array.from(game.state.mapEvents, (event) => event.kind), ['turret', 'boss', 'lord']);
assert.equal(turret.hp, turret.maxHp, 'Previewing a turret event leaves the turret intact');
assert.equal(boss.hp, boss.maxHp, 'Previewing a boss event leaves the boss intact');
assert.equal(boss.alive, true);
game.applyDamage(0, null, { kind: 'boss', ref: boss }, boss.hp);
assert.equal(boss.alive, false);
api.testBossContest('drag');
assert.equal(boss.alive, false, 'A contest preview never revives a slain boss');

function reachOvertime() {
  api.newMatch();
  api.startSiegeVote();
  game.state.time = 0.01;
  game.step(0.02);
  assert.equal(game.state.overtime, true, 'Equal live nexuses trigger overtime');
  assert.equal(game.state.overtimeLeft, 60, 'The full minute starts after regulation');
  assert.equal(game.state.siegeVote.active, false);
  game.updateUI();
  assert.equal(clock(), 'HP 01:00');
  return game.state.overtimeObjective;
}

const objective = reachOvertime();
assert.equal(objective.hp, 4500);
objective.hp = 1;
const soldier = game.spawnUnit(0, 'soldier', 'mid', null, { x: objective.x - 57, y: objective.y });
soldier.cd = 0;
game.step(0.02);
game.step(0.15);
assert.equal(result(), '0', 'A regular mid-lane soldier can win by destroying the objective');
assert.equal(api.phase(), 'result');
assert.equal(game.state.overtime, false);
api.testOvertimeEnd('blue');
assert.equal(result(), '0', 'A finished match cannot announce another outcome');

reachOvertime();
game.applyDamage(1, null, { kind: 'nexus', ref: 0 }, game.state.hp[0]);
assert.equal(result(), '1', 'A nexus kill can win overtime');

reachOvertime();
game.state.overtimeLeft = 0.01;
game.step(0.02);
assert.equal(result(), 'draw', 'Overtime expiration is a draw');
assert.equal(game.element('result').querySelector('.w').textContent, 'KẾT QUẢ HÒA!');
assert.equal(game.state.overtimeObjective, null);
api.newMatch();
assert.equal(game.state.resultAnnounced, false);
assert.equal(game.state.siegeVote.active, false);
assert.equal(clock(), '30:00');
console.log('Phase 2 passed: boss damage, harmless previews and all three overtime outcomes.');

