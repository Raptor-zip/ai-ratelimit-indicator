// Variables used by Scriptable.
// icon-color: deep-blue; icon-glyph: chart-pie;
// Download from your PC's setup page to fill in BASE_URL automatically.
const BASE_URL = "__AI_USAGE_BASE_URL__";
const REFRESH_MINUTES = 5; // Earliest requested refresh; iOS chooses the actual time.
const STALE_SECONDS = 15 * 60;
const COLORS = {text: "f4f5f8", muted: "9da9bc", green: "68d6ac", yellow: "f2c66d", red: "ff8190"};

function finite(value) { return typeof value === "number" && Number.isFinite(value); }
function currentWindow(window, now) {
  window = window || {};
  if (finite(window.resets_at) && window.resets_at <= now) return {pct: null, resets_at: window.resets_at};
  return window;
}
function deltaFor(window, seconds, now) {
  if (!finite(window.pct) || !finite(window.resets_at) || window.resets_at <= now) return null;
  const ideal = Math.max(0, Math.min(100, (1 - (window.resets_at - now) / seconds) * 100));
  return window.pct - ideal;
}
function paceText(delta) {
  if (!finite(delta)) return "--";
  const n = Math.round(delta);
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}
function paceColor(delta) {
  if (!finite(delta)) return COLORS.muted;
  return Math.round(delta) >= 20 ? COLORS.red : Math.round(delta) >= 1 ? COLORS.yellow : COLORS.green;
}
function remaining(reset, now) {
  if (!finite(reset)) return "--";
  if (reset <= now) return "更新待ち";
  const m = Math.ceil((reset - now) / 60);
  if (m >= 1440) return `${Math.floor(m / 1440)}d${Math.floor(m % 1440 / 60)}h`;
  if (m >= 60) return `${Math.floor(m / 60)}h${m % 60}m`;
  return `${m}m`;
}
function selectedProviders(providers, parameter) {
  const ids = parameter.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!ids.length) return providers;
  return [...new Set(ids)].map(id => providers.find(p => p.id === id)).filter(Boolean);
}
function visibleProviders(providers, parameter, now) {
  return selectedProviders(providers, parameter).filter(provider => {
    if (provider.id !== "agy" && !/^kimi\d*$/.test(provider.id)) return true;
    // Optional providers should occupy space only while they have usable data.
    if (!provider.ok || !finite(provider.fetched_at) || now - provider.fetched_at > STALE_SECONDS) return false;
    return [provider.five_hour, provider.seven_day]
      .some(window => finite(currentWindow(window, now).pct));
  });
}
function validSnapshot(data) {
  return data && data.schema_version === 1 && Array.isArray(data.providers)
    && data.providers.every(p => p && typeof p.id === "string" && typeof p.name === "string");
}
function cachePath(fm) {
  let hash = 0;
  for (const c of BASE_URL) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  return fm.joinPath(fm.documentsDirectory(), `ai-usage-${hash >>> 0}.json`);
}
async function loadSnapshot() {
  const fm = FileManager.local();
  const path = cachePath(fm);
  try {
    const request = new Request(`${BASE_URL}/api/usage`);
    request.timeoutInterval = 8;
    request.headers = {Accept: "application/json"};
    const data = await request.loadJSON();
    if (!request.response || request.response.statusCode !== 200 || !validSnapshot(data)) throw new Error("Invalid response");
    try { fm.writeString(path, JSON.stringify(data)); } catch (e) { console.log(`Cache write: ${e}`); }
    return {data, offline: false};
  } catch (e) {
    console.log(`AI Usage: ${e}`);
    try {
      const data = JSON.parse(fm.readString(path));
      if (validSnapshot(data)) return {data, offline: true};
    } catch (ignored) {}
    return {data: null, offline: true};
  }
}
function text(parent, value, size, color = COLORS.text, bold = false) {
  const label = parent.addText(value);
  label.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  label.textColor = new Color(color);
  label.lineLimit = 1;
  label.minimumScaleFactor = 0.7;
  return label;
}
function bar(window, seconds, now, color) {
  const ctx = new DrawContext();
  ctx.size = new Size(120, 5);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  ctx.setFillColor(new Color("334057"));
  ctx.fillRect(new Rect(0, 0, 120, 5));
  if (finite(window.pct)) {
    ctx.setFillColor(new Color(color));
    ctx.fillRect(new Rect(0, 0, 120 * Math.max(0, Math.min(100, window.pct)) / 100, 5));
  }
  if (finite(window.resets_at) && window.resets_at > now) {
    const ideal = Math.max(0, Math.min(1, 1 - (window.resets_at - now) / seconds));
    ctx.setFillColor(new Color("ffffff"));
    ctx.fillRect(new Rect(Math.min(118, ideal * 120), 0, 2, 5));
  }
  return ctx.getImage();
}
function addWindow(parent, label, raw, seconds, now, dim, detailed, compact = false) {
  const window = currentWindow(raw, now);
  const delta = deltaFor(window, seconds, now);
  const color = dim ? COLORS.muted : paceColor(delta);
  const row = parent.addStack();
  row.centerAlignContent();
  const pct = finite(window.pct) ? `${Math.round(window.pct)}%` : "--%";
  text(row, `${label} ${pct}  ${paceText(delta)}`, compact ? 9 : detailed ? 12 : 10, color);
  row.addSpacer();
  text(row, remaining(window.resets_at, now), detailed ? 10 : 8, COLORS.muted);
  parent.addSpacer(compact ? 1 : 2);
  const image = parent.addImage(bar(window, seconds, now, color));
  image.imageSize = new Size(detailed ? 130 : 120, compact ? 3 : 4);
  image.resizable = true;
}
function addProvider(parent, provider, now, offline, detailed, large, compact = false) {
  const cell = parent.addStack();
  cell.layoutVertically();
  const stale = !finite(provider.fetched_at) || now - provider.fetched_at > STALE_SECONDS;
  const dim = offline || stale || !provider.ok;
  const header = cell.addStack();
  const name = provider.name === "Antigravity" ? "AGY" : provider.name;
  text(header, name, compact ? 11 : detailed ? 16 : 12, dim ? COLORS.muted : COLORS.text, true);
  header.addSpacer();
  if (!provider.ok) text(header, ["token_expired", "unauthorized"].includes(provider.error) ? "要ログイン" : "取得失敗", 8, COLORS.yellow);
  else if (stale) text(header, "古いデータ", 8, COLORS.yellow);
  cell.addSpacer(compact ? 1 : detailed ? 8 : 3);
  addWindow(cell, "5h", provider.five_hour, 18000, now, dim, detailed, compact);
  cell.addSpacer(compact ? 2 : detailed ? 7 : 3);
  addWindow(cell, "7d", provider.seven_day, 604800, now, dim, detailed, compact);
  if (large) {
    for (const scope of (provider.scoped || []).slice(0, 2)) {
      cell.addSpacer(4);
      const window = currentWindow(scope, now);
      text(cell, `${scope.label}  ${finite(window.pct) ? Math.round(window.pct) + "%" : "--%"}`, 9, COLORS.muted);
    }
  }
  return cell;
}
function renderWidget(result, family, parameter, now) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("172131");
  const small = family === "small";
  const large = family === "large" || family === "extraLarge";
  widget.setPadding(small ? 8 : 10, small ? 10 : 12, small ? 8 : 10, small ? 10 : 12);
  widget.refreshAfterDate = new Date((now + REFRESH_MINUTES * 60) * 1000);
  let url = URLScheme.forRunningScript();
  url += `${url.includes("?") ? "&" : "?"}family=${encodeURIComponent(family)}`;
  if (parameter) url += `&providers=${encodeURIComponent(parameter)}`;
  widget.url = url;
  const providers = visibleProviders(result.data ? result.data.providers : [], parameter, now);
  const visible = providers.slice(0, small ? 2 : large ? 6 : 4);
  const compact = small && visible.length > 1;
  const heading = widget.addStack();
  text(heading, "AI USAGE", 10, COLORS.muted, true);
  heading.addSpacer();
  if (result.offline) text(heading, "接続失敗", 9, COLORS.yellow);
  else if (providers.length > visible.length) text(heading, `+${providers.length - visible.length}`, 9, COLORS.muted);
  widget.addSpacer(compact ? 4 : small ? 10 : 5);
  if (!visible.length) {
    text(widget, result.data ? "表示データなし" : "接続できません", 14, COLORS.text, true);
    widget.addSpacer(6);
    text(widget, result.data ? "Parameter・PCのログインを確認" : "Tailscale・PCの起動を確認", 10, COLORS.muted);
  }
  const step = small ? 1 : 2;
  for (let i = 0; i < visible.length; i += step) {
    const row = widget.addStack();
    row.layoutHorizontally();
    addProvider(row, visible[i], now, result.offline, small && !compact, large, compact);
    if (!small) {
      row.addSpacer();
      if (visible[i + 1]) addProvider(row, visible[i + 1], now, result.offline, false, large);
    }
    if (i + step < visible.length) widget.addSpacer(compact ? 5 : large ? 12 : 7);
  }
  widget.addSpacer();
  const footer = widget.addStack();
  const dates = visible.map(p => p.fetched_at).filter(finite);
  if (dates.length) {
    text(footer, "取得 ", 8, COLORS.muted);
    const date = footer.addDate(new Date(Math.min(...dates) * 1000));
    date.applyRelativeStyle();
    date.font = Font.systemFont(8);
    date.textColor = new Color(COLORS.muted);
  } else text(footer, "タップで再接続", 8, COLORS.muted);
  return widget;
}
async function main() {
  const parameter = String(args.widgetParameter || args.queryParameters.providers || "");
  const result = await loadSnapshot();
  const requestedFamily = config.widgetFamily || args.queryParameters.family;
  const family = ["small", "medium", "large", "extraLarge"].includes(requestedFamily) ? requestedFamily : "medium";
  const widget = renderWidget(result, family, parameter, Date.now() / 1000);
  Script.setWidget(widget);
  if (!config.runsInWidget) {
    if (family === "small") await widget.presentSmall();
    else if (family === "large") await widget.presentLarge();
    else await widget.presentMedium();
  }
  Script.complete();
}

await main();
