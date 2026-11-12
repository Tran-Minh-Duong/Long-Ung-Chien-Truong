const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadGame() {
  const html = fs.readFileSync(path.resolve(__dirname, '../public/game.html'), 'utf8');
  const source = html.match(/<script>\s*(\(\(\) => \{[\s\S]*?)<\/script>/)?.[1];
  assert(source?.trimEnd().endsWith('})();'), 'Game script closure found');
  const noop = () => {};
  const storage = new Map();
  const elements = new Map();
  const context = new Proxy({}, {
    get(_target, method) {
      if (method === 'createRadialGradient' || method === 'createLinearGradient') return () => ({ addColorStop: noop });
      if (method === 'measureText') return (text) => ({ width: String(text).length * 8 });
      return noop;
    },
  });
  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        style: {},
        classList: { add: noop, remove: noop, toggle: noop },
        textContent: '',
        innerHTML: '',
        dataset: {},
        clientWidth: 1080,
        clientHeight: 1920,
        addEventListener: noop,
        setAttribute: noop,
        getContext: () => context,
        querySelector: (selector) => element(id + selector),
      });
    }
    return elements.get(id);
  }
  const game = {
    URL,
    URLSearchParams,
    location: { search: '?embed=1&mute=1', protocol: 'http:' },
    document: {
      documentElement: element('html'),
      getElementById: element,
      createElement: () => ({ getContext: () => context }),
      fonts: { ready: { then: noop } },
    },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    matchMedia: () => ({ matches: false }),
    addEventListener: noop,
    Image: class {},
    setTimeout: () => 1,
    clearTimeout: noop,
    setInterval: () => 1,
    performance: { now: () => 0 },
    element,
  };
  game.window = game;
  const hooks = `
    Object.defineProperty(globalThis, 'state', { get: () => S });
    Object.assign(globalThis, { step, updateUI, applyDamage, spawnUnit, UNIT_LIMIT, pt });
  `;
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, hooks + '})();'), game, { filename: 'game.html' });
  return game;
}

module.exports = { loadGame };
