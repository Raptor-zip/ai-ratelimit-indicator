// Variables used by Scriptable.
// icon-color: deep-blue; icon-glyph: chart-pie;
// Download from your PC's setup page to fill in BASE_URL automatically.
const BASE_URL = "__AI_USAGE_BASE_URL__";
const REFRESH_MINUTES = 5; // Earliest requested refresh; iOS chooses the actual time.
const STALE_SECONDS = 15 * 60;
const COLORS = {text: "f5f7fb", muted: "b4becc", green: "86d9ba", yellow: "eed29a", red: "f3a4ae"};

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
  if (m >= 1440) return `${Math.floor(m / 1440)}日${Math.floor(m % 1440 / 60)}時間`;
  if (m >= 60) return `${Math.floor(m / 60)}時間${m % 60}分`;
  return `${m}分`;
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
  label.minimumScaleFactor = 0.9;
  return label;
}
function bar(window, seconds, now, color, width, height) {
  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  ctx.setFillColor(new Color("ffffff", 0.13));
  ctx.fillRect(new Rect(0, 0, width, height));
  if (finite(window.pct)) {
    ctx.setFillColor(new Color(color));
    ctx.fillRect(new Rect(0, 0, width * Math.max(0, Math.min(100, window.pct)) / 100, height));
  }
  if (finite(window.resets_at) && window.resets_at > now) {
    const ideal = Math.max(0, Math.min(1, 1 - (window.resets_at - now) / seconds));
    ctx.setFillColor(new Color("ffffff"));
    ctx.fillRect(new Rect(Math.min(width - 1, ideal * width), 0, 1, height));
  }
  return ctx.getImage();
}
function availableWindows(provider, now) {
  return [
    {label: "5h", raw: provider.five_hour, seconds: 18000},
    {label: "7d", raw: provider.seven_day, seconds: 604800},
  ].filter(item => {
    const window = currentWindow(item.raw, now);
    return finite(window.pct) && !(item.label === "5h" && window.pct === 0 && !finite(window.resets_at));
  });
}
function contentWidth() {
  // Conservative Home Screen widths in points; allow for older phone layouts.
  const screen = Device.screenSize();
  const width = Math.min(screen.width, screen.height);
  const height = Math.max(screen.width, screen.height);
  const sizes = {320: 141, 375: height <= 667 ? 148 : 155, 390: 158, 393: 158, 402: 162,
    414: height <= 736 ? 159 : 169, 420: 170, 428: 170, 430: 170, 440: 170};
  return (sizes[width] || 158) - 28;
}
function addWindow(parent, label, raw, seconds, now, dim, width, compact, prominent) {
  const window = currentWindow(raw, now);
  const delta = deltaFor(window, seconds, now);
  const color = dim ? COLORS.muted : paceColor(delta);
  const row = parent.addStack();
  row.centerAlignContent();
  const pct = finite(window.pct) ? `${Math.round(window.pct)}%` : "--%";
  text(row, label, compact ? 8 : 9, COLORS.muted);
  row.addSpacer(6);
  text(row, pct, prominent ? 17 : compact ? 10 : 12, dim ? COLORS.muted : COLORS.text, true);
  row.addSpacer();
  if (finite(delta)) text(row, `${paceText(delta)}pt`, compact ? 8 : 9, color);
  parent.addSpacer(compact ? 2 : 3);
  // Source and destination have identical aspect ratios; otherwise WidgetKit
  // letterboxes the image (120x5 -> 120x3 used to shrink bars to 72pt).
  const height = compact ? 3 : 4;
  const image = parent.addImage(bar(window, seconds, now, color, width, height));
  image.imageSize = new Size(width, height);
  image.leftAlignImage();
  image.cornerRadius = 2;
  image.resizable = true;
}
function addProvider(parent, provider, now, offline, width, large, compact) {
  const cell = parent.addStack();
  cell.layoutVertically();
  cell.size = new Size(width, 0);
  const stale = !finite(provider.fetched_at) || now - provider.fetched_at > STALE_SECONDS;
  const dim = offline || stale || !provider.ok;
  const header = cell.addStack();
  const name = provider.name === "Antigravity" ? "AGY" : provider.name;
  text(header, name, compact ? 11 : 12, COLORS.text, true);
  header.addSpacer();
  if (!provider.ok) text(header, ["token_expired", "unauthorized"].includes(provider.error) ? "認証切れ" : "取得失敗", 8, COLORS.yellow);
  else if (stale) text(header, "古いデータ", 8, COLORS.yellow);
  const windows = availableWindows(provider, now);
  cell.addSpacer(compact ? 3 : 4);
  if (!windows.length) text(cell, "使用量を取得できません", 9, COLORS.muted);
  for (let i = 0; i < windows.length; i++) {
    const item = windows[i];
    addWindow(cell, item.label, item.raw, item.seconds, now, dim, width, compact, compact && windows.length === 1);
    if (i + 1 < windows.length) cell.addSpacer(compact ? 3 : 5);
  }
  if (windows.length === 1 && finite(windows[0].raw.resets_at)) {
    cell.addSpacer(3);
    text(cell, `リセットまで ${remaining(windows[0].raw.resets_at, now)}`, 8, COLORS.muted);
  }
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
  const material = new LinearGradient();
  material.colors = [new Color("8995a3", 0.80), new Color("4a5768", 0.88), new Color("263442", 0.94)];
  material.locations = [0, 0.018, 1];
  material.startPoint = new Point(0, 0);
  material.endPoint = new Point(1, 1);
  widget.backgroundGradient = material;
  const small = family === "small";
  const large = family === "large" || family === "extraLarge";
  widget.setPadding(12, 14, 12, 14);
  widget.refreshAfterDate = new Date((now + REFRESH_MINUTES * 60) * 1000);
  let url = URLScheme.forRunningScript();
  url += `${url.includes("?") ? "&" : "?"}family=${encodeURIComponent(family)}`;
  if (parameter) url += `&providers=${encodeURIComponent(parameter)}`;
  widget.url = url;
  const providers = visibleProviders(result.data ? result.data.providers : [], parameter, now);
  const visible = providers.slice(0, small ? 2 : large ? 6 : 4);
  const width = small ? contentWidth() : Math.min(136, contentWidth());
  if (!small) {
    const heading = widget.addStack();
    text(heading, "AI Usage", 9, COLORS.muted);
    heading.addSpacer();
    if (result.offline) text(heading, "接続失敗", 9, COLORS.yellow);
    else if (providers.length > visible.length) text(heading, `+${providers.length - visible.length}`, 9, COLORS.muted);
  }
  widget.addSpacer();
  if (!visible.length) {
    text(widget, result.data ? "表示データなし" : "接続できません", 14, COLORS.text, true);
    widget.addSpacer(6);
    text(widget, result.data ? "Parameter・PCのログインを確認" : "Tailscale・PCの起動を確認", 10, COLORS.muted);
  }
  const step = small ? 1 : 2;
  for (let i = 0; i < visible.length; i += step) {
    const row = widget.addStack();
    row.layoutHorizontally();
    addProvider(row, visible[i], now, result.offline, width, large, small && visible.length > 1);
    if (!small) {
      row.addSpacer();
      if (visible[i + 1]) addProvider(row, visible[i + 1], now, result.offline, width, large, false);
    }
    if (i + step < visible.length) widget.addSpacer(6);
  }
  widget.addSpacer();
  const footer = widget.addStack();
  const dates = visible.map(p => p.fetched_at).filter(finite);
  if (dates.length) {
    const updated = new Date(Math.min(...dates) * 1000);
    const clock = `${String(updated.getHours()).padStart(2, "0")}:${String(updated.getMinutes()).padStart(2, "0")}`;
    const day = updated.toDateString() === new Date(now * 1000).toDateString()
      ? "" : `${updated.getMonth() + 1}/${updated.getDate()} `;
    text(footer, `${result.offline && small ? "接続失敗 · " : ""}更新 ${day}${clock}`, 8, COLORS.muted);
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
