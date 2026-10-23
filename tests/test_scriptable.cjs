const assert = require('node:assert/strict');
const {test} = require('node:test');
const {runtime} = require('../scripts/preview-scriptable.cjs');
const now = 1_800_000_000;
function provider(id = 'claude', extra = {}) {
  return {id, name: id, ok: true, fetched_at: now - 120,
    five_hour: {pct: 50, resets_at: now + 13500},
    seven_day: {pct: 20, resets_at: now + 300000}, ...extra};
}
function harness({data, status = 200, offline = false, cached, writeFails = false} = {}) {
  let stored = cached && JSON.stringify(cached);
  const api = runtime({console: {log() {}},
    FileManager: {local: () => ({documentsDirectory: () => '/cache', joinPath: (a, b) => `${a}/${b}`,
      readString() {if (!stored) throw new Error('missing'); return stored;},
      writeString(p, value) {if (writeFails) throw new Error('full'); stored = value;}})},
    Request: class {constructor() {this.response = {statusCode: status};}
      async loadJSON() {if (offline) throw new Error('unreachable'); return data;}}});
  return {api, stored: () => stored};
}
test('expired windows do not imply spare capacity and missing resets have no pace', () => {
  const api = runtime();
  const expired = api.currentWindow({pct: 5, resets_at: now}, now);
  assert.equal(expired.pct, null);
  assert.equal(api.deltaFor(expired, 18000, now), null);
  assert.equal(api.deltaFor({pct: 0, resets_at: null}, 18000, now), null);
});
test('widget parameter orders and deduplicates accounts', () => {
  const api = runtime();
  const providers = [provider(), provider('codex'), provider('kimi2')];
  assert.equal(api.selectedProviders(providers, 'codex,claude,codex,kimi2,missing').map(p => p.id).join(','), 'codex,claude,kimi2');
});
test('network and auth errors retain previous snapshot without overwriting it', async () => {
  const cached = {schema_version: 1, providers: [provider()]};
  for (const options of [{offline: true}, {status: 403, data: {error: 'auth'}}, {data: {providers: []}}]) {
    const {api, stored} = harness({...options, cached});
    const result = await api.loadSnapshot();
    assert.equal(result.offline, true);
    assert.equal(result.data.providers[0].fetched_at, now - 120);
    assert.equal(stored(), JSON.stringify(cached));
  }
  assert.equal((await harness({offline: true}).api.loadSnapshot()).data, null);
});
test('fresh data displays even if the cache cannot be written', async () => {
  const data = {schema_version: 1, providers: [provider()]};
  const result = await harness({data, writeFails: true}).api.loadSnapshot();
  assert.equal(result.offline, false);
  assert.equal(result.data, data);
});
test('weekly usage is the main value, with five-hour fallback and remaining clamped at zero', () => {
  const api = runtime();
  const weekly = api.summary(provider('codex'), now, false);
  assert.equal(weekly.primary.label, '7d');
  assert.equal(weekly.pct, 20);
  assert.equal(weekly.remaining, 80);
  assert.equal(api.summary(provider('codex', {seven_day: null}), now, false).primary.label, '5h');
  assert.equal(api.summary(provider('claude', {seven_day: {pct: 105}}), now, false).remaining, 0);
  assert.equal(api.summary(provider('claude', {seven_day: null, five_hour: null}), now, false).remaining, null);
});
test('optional providers hide failed, stale, missing and expired usage; zero is valid', () => {
  const api = runtime();
  for (const id of ['kimi', 'kimi2', 'kimi3', 'agy']) {
    for (const extra of [{ok: false}, {fetched_at: now - 1000}, {five_hour: null, seven_day: null},
      {five_hour: {pct: 0, resets_at: null}, seven_day: null},
      {five_hour: {pct: 10, resets_at: now - 1}, seven_day: null}]) {
      assert.equal(api.visibleProviders([provider(id, extra)], '', now).length, 0);
    }
    assert.equal(api.visibleProviders([provider(id, {five_hour: null, seven_day: {pct: 0}})], '', now).length, 1);
  }
});
test('all sizes use an opaque full-bleed background instead of a fixed-size content image', () => {
  const api = runtime();
  for (const family of ['small', 'medium', 'large']) {
    const widget = api.renderWidget({data: {providers: [provider(), provider('codex')]}, offline: false}, family, 'codex,claude', now);
    assert.match(widget.url, /providers=codex%2Cclaude/);
    assert.match(widget.url, new RegExp(`family=${family}`));
    assert.equal(widget.images.length, 0);
    assert.ok(widget.backgroundImage);
    assert.equal(widget.backgroundImage.opaque, true);
    assert.ok(widget.backgroundImage.svg.includes('x="0" y="0"'));
    // No second outer frame; rounded borders belong only to the inner cards.
    assert.equal(widget.backgroundImage.svg.includes('M24.5,0.5'), false);
  }
});
test('small card design includes both brand icons, percentages and actual remaining capacity', () => {
  const image = runtime().drawScene({data: {providers: [provider('claude', {seven_day: {pct: 3}}),
    provider('codex', {seven_day: {pct: 27}})]}, offline: false}, 'small', '', now);
  const labels = image.texts.map(text => text.value);
  for (const label of ['claude', 'codex', '3%', '27%', '残り 97%', '残り 73%']) assert.ok(labels.includes(label));
  assert.equal(image.icons.length, 2);
});
test('hidden providers do not age the update time and cached values are marked as previous', () => {
  const api = runtime();
  const image = api.drawScene({data: {providers: [provider(), provider('codex'),
    provider('agy', {ok: false, fetched_at: now - 90000})]}, offline: false}, 'small', '', now);
  assert.equal(image.texts.some(text => text.value === 'agy'), false);
  assert.equal(image.texts.some(text => text.value.includes('/')), false);
  assert.equal(api.summary(provider('claude', {ok: false}), now, false).previous, true);
});
test('smallest screen and unknown-data states keep text rectangles within the image', () => {
  for (const screenWidth of [320, 375, 390, 402, 440]) {
    const api = runtime({}, {width: screenWidth, height: 844});
    for (const family of ['small', 'medium', 'large']) {
      for (const providers of [[], [provider()], [provider(), provider('codex')],
        [provider('claude', {five_hour: null, seven_day: null}), provider('codex')]]) {
        const image = api.drawScene({data: {providers}, offline: true}, family, '', now);
        for (const {rect: r} of image.texts) {
          assert.ok(r.x >= 0 && r.y >= 0 && r.width > 0 && r.height > 0);
          assert.ok(r.x + r.width <= image.size.width + 0.01);
          assert.ok(r.y + r.height <= image.size.height + 0.01);
        }
      }
    }
  }
});
