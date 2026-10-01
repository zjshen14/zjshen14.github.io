import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync(new URL('../src/utils/analytics.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const id = 'G-C3GVZS8SKD';
const key = 'devlog-analytics-consent-v1';
function page({ choice, expired = false, host = 'zjshen14.github.io', gpc = false, storageUnavailable = false } = {}) {
  const events = {};
  const scripts = [];
  const cookieWrites = [];
  const storage = new Map();
  let reloads = 0;
  if (choice) storage.set(key, JSON.stringify({value: choice, expires: Date.now() + (expired ? -1000 : 10000)}));
  const button = name => ({ addEventListener: (_, fn) => events[name] = fn, focus() {}, disabled: false });
  const accept = button('accept');
  const reject = button('reject');
  const settings = button('settings');
  const banner = { hidden: true, querySelector: selector => selector.includes('accept') ? accept : reject };
  const document = {
    referrer: 'https://example.com/private/path?token=secret',
    querySelector: () => banner,
    querySelectorAll: () => [settings],
    createElement: () => ({}),
    head: { appendChild: script => scripts.push(script) },
    get cookie() { return '_ga=old; _ga_C3GVZS8SKD=old; theme=dark'; },
    set cookie(value) { cookieWrites.push(value); }
  };
  const window = {
    location: {
      hostname: host, pathname: '/zh/blog/example/',
      href: `https://${host}/zh/blog/example/?token=secret&utm_source=hn&utm_campaign=qwen_3090#private`,
      reload() { reloads++; }
    },
    addEventListener: (_, fn) => events.storage = fn
  };
  const localStorage = {
    getItem(k) { if (storageUnavailable) throw Error('blocked'); return storage.get(k); },
    setItem(k, v) { if (storageUnavailable) throw Error('blocked'); storage.set(k, v); }
  };
  const context = vm.createContext({ exports: {}, URL, document, window, navigator: {globalPrivacyControl:gpc}, localStorage });
  vm.runInContext(code, context);
  context.exports.initAnalytics(id, 'zjshen14.github.io');
  return { events, scripts, cookieWrites, window, banner, accept, storage, get reloads() { return reloads; }, api: context.exports };
}

test('unknown consent loads no external script and declining remains local', () => {
  const p = page();
  assert.equal(p.banner.hidden, false);
  assert.equal(p.scripts.length, 0);
  assert.equal(p.window.dataLayer, undefined);
  p.events.reject();
  assert.equal(p.scripts.length, 0);
  assert.equal(p.window.dataLayer, undefined);
  assert.equal(JSON.parse(p.storage.get(key)).value, 'denied');
});
test('opt-in loads exactly once with ads denied and sanitized page/referrer', () => {
  const p = page();
  p.events.accept();
  p.events.accept();
  assert.equal(p.scripts.length, 1);
  assert.equal(p.scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${id}`);
  const commands = p.window.dataLayer.map(args => Array.from(args));
  assert.equal(commands[0][2].analytics_storage, 'granted');
  for (const ad of ['ad_storage','ad_user_data','ad_personalization']) assert.equal(commands[0][2][ad], 'denied');
  const config = commands.find(c => c[0] === 'config')[2];
  assert.equal(config.page_location, 'https://zjshen14.github.io/zh/blog/example/?utm_source=hn&utm_campaign=qwen_3090');
  assert.equal(config.page_referrer, 'https://example.com/');
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.user_id, undefined);
});
test('saved consent is respected but expired consent requires a new choice', () => {
  assert.equal(page({choice:'granted'}).scripts.length, 1);
  assert.equal(page({choice:'denied'}).scripts.length, 0);
  const expired = page({choice:'granted', expired:true});
  assert.equal(expired.scripts.length, 0);
  assert.equal(expired.banner.hidden, false);
});
test('a visitor can opt in after declining on the same page', () => {
  const p = page();
  p.events.reject();
  p.events.settings();
  p.events.accept();
  assert.equal(p.scripts.length, 1);
  assert.equal(p.window[`ga-disable-${id}`], false);
});
test('withdrawal disables hits, clears only GA cookies and reloads', () => {
  const p = page({choice:'granted'});
  p.events.settings();
  assert.equal(p.banner.hidden, false);
  p.events.reject();
  assert.equal(p.window[`ga-disable-${id}`], true);
  assert.equal(p.reloads, 1);
  assert.ok(p.cookieWrites.some(c => c.startsWith('_ga=;')));
  assert.ok(p.cookieWrites.every(c => c.startsWith('_ga')));
  assert.equal(p.window.dataLayer.length, 4); // no withdrawal tracking or consent ping
});
test('privacy signal, blocked storage and development hosts do not implicitly enable tracking', () => {
  const p = page({choice:'granted',gpc:true});
  assert.equal(p.scripts.length, 0);
  assert.equal(p.accept.disabled, true);
  p.events.accept();
  assert.equal(p.scripts.length, 0);
  assert.equal(page({storageUnavailable:true}).scripts.length, 0);
  assert.equal(page({choice:'granted',host:'localhost'}).scripts.length, 0);
});
test('withdrawal in another tab also stops this tab', () => {
  const p = page({choice:'granted'});
  p.events.storage({key, newValue:JSON.stringify({value:'denied'})});
  assert.equal(p.window[`ga-disable-${id}`], true);
  assert.equal(p.reloads, 1);
});
test('arbitrary and personal-looking campaign values are excluded', () => {
  const p = page();
  assert.equal(p.api.analyticsPageURL('https://zjshen14.github.io/en/?email=me@example.com&utm_source=me@example.com&utm_medium=social#secret'), 'https://zjshen14.github.io/en/?utm_medium=social');
});
