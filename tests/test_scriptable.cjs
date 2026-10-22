const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../scriptable/AI-Usage.js'), 'utf8');
const now = 1_800_000_000;
function provider(id = 'claude', extra = {}) {
  return {id, name: id, ok: true, fetched_at: now - 120,
    five_hour: {pct: 50, resets_at: now + 13500},
    seven_day: {pct: 20, resets_at: now + 300000}, ...extra};
}
function harness({data, status = 200, offline = false, cached, writeFails = false} = {}) {
  let stored = cached && JSON.stringify(cached);
  const labels = [];
  class Stack {
    addStack() {return new Stack();}
    addText(value) {labels.push(value); return {};}
    addDate(value) {return {applyRelativeStyle() {}};}
    addImage() {return {};}
    addSpacer() {}
    setPadding() {}
    centerAlignContent() {}
    layoutVertically() {}
    layoutHorizontally() {}
  }
  class DrawContext {
    setFillColor() {}
    fillRect() {}
    getImage() {return {};}
  }
  const context = vm.createContext({
    console: {log() {}}, ListWidget: Stack, DrawContext,
    Color: class {}, Size: class {}, Rect: class {},
    Font: {boldSystemFont() {}, systemFont() {}},
    URLScheme: {forRunningScript: () => 'scriptable:///run?scriptName=AI%20Usage'},
    FileManager: {local: () => ({documentsDirectory: () => '/cache',
      joinPath: (a, b) => `${a}/${b}`,
      readString() {if (!stored) throw new Error('missing'); return stored;},
      writeString(p, value) {if (writeFails) throw new Error('full'); stored = value;}})},
    Request: class {
      constructor() {this.response = {statusCode: status};}
      async loadJSON() {if (offline) throw new Error('unreachable'); return data;}
    },
  });
  vm.runInContext(source.replace(/await main\(\);\s*$/, '') +
    '\nglobalThis.api = {currentWindow, deltaFor, selectedProviders, loadSnapshot, renderWidget};', context);
  return {api: context.api, labels, stored: () => stored};
}

test('expired windows cannot look like spare capacity and missing resets have no pace', () => {
  const {api} = harness();
  const expired = api.currentWindow({pct: 5, resets_at: now}, now);
  assert.equal(expired.pct, null);
  assert.equal(api.deltaFor(expired, 18000, now), null);
  assert.equal(api.deltaFor({pct: 0, resets_at: null}, 18000, now), null);
  assert.equal(api.deltaFor(provider().five_hour, 18000, now), 25);
});

test('widget parameter filters, orders, and deduplicates accounts', () => {
  const {api} = harness();
  const providers = [provider('claude'), provider('codex'), provider('kimi2')];
  assert.equal(api.selectedProviders(providers, ' Codex,claude,codex,kimi2,missing ').map(p => p.id).join(','), 'codex,claude,kimi2');
});

test('network and auth errors keep the previous snapshot without overwriting it', async () => {
  const cached = {schema_version: 1, providers: [provider()]};
  for (const options of [{offline: true}, {status: 403, data: {error: 'auth'}},
    {status: 200, data: {providers: []}}]) {
    const {api, stored} = harness({...options, cached});
    const result = await api.loadSnapshot();
    assert.equal(result.offline, true);
    assert.equal(result.data.providers[0].fetched_at, now - 120);
    assert.equal(stored(), JSON.stringify(cached));
  }
  assert.equal((await harness({offline: true}).api.loadSnapshot()).data, null);
});

test('fresh data displays even if the local cache cannot be written', async () => {
  const data = {schema_version: 1, providers: [provider()]};
  const {api} = harness({data, writeFails: true});
  const result = await api.loadSnapshot();
  assert.equal(result.offline, false);
  assert.equal(result.data, data);
});

test('all home-screen sizes render and tapping keeps the selected providers', () => {
  for (const family of ['small', 'medium', 'large']) {
    const {api, labels} = harness();
    const data = {schema_version: 1, providers: ['claude', 'codex', 'kimi', 'agy', 'kimi2', 'kimi3'].map(id => provider(id))};
    const widget = api.renderWidget({data, offline: false}, family, 'codex,claude,kimi,agy,kimi2,kimi3', now);
    assert.match(widget.url, /providers=codex%2Cclaude/);
    assert.ok(labels.includes('codex'));
    assert.equal(labels.includes('claude'), family !== 'small');
    assert.equal(labels.includes('kimi2'), family === 'large');
  }
});

test('offline, stale, expired-token and empty states remain distinguishable', () => {
  const {api, labels} = harness();
  api.renderWidget({data: {providers: [provider('claude', {ok: false, error: 'token_expired', fetched_at: now - 90000})]}, offline: true}, 'small', '', now);
  assert.ok(labels.includes('接続失敗'));
  assert.ok(labels.includes('要ログイン'));
  api.renderWidget({data: null, offline: true}, 'medium', '', now);
  assert.ok(labels.includes('接続できません'));
  api.renderWidget({data: {providers: [provider('codex', {fetched_at: now - 1000})]}, offline: false}, 'medium', '', now);
  assert.ok(labels.includes('古いデータ'));
});
