// Variables used by Scriptable.
// icon-color: deep-blue; icon-glyph: chart-pie;
// Download from your PC's setup page to fill in BASE_URL automatically.
const BASE_URL = "__AI_USAGE_BASE_URL__";
const REFRESH_MINUTES = 5; // Earliest requested refresh; iOS chooses the actual time.
const STALE_SECONDS = 15 * 60;
const COLORS = {text: "f6f8ff", muted: "b7c6e3", green: "50e2cd", yellow: "edc777", red: "f4a0ac"};
// Brand vectors: Lobe Icons, MIT; see assets/LICENSE-lobe-icons.
// BEGIN EMBEDDED ICONS
/*
MIT License

Copyright (c) 2023 LobeHub

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const BRAND_IMAGES = {"claude": "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", "openai": "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"};
// END EMBEDDED ICONS
const decodedIcons = {};

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
    return availableWindows(provider, now).length > 0;
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
function availableWindows(provider, now) {
  return [
    {label: "5h", raw: provider.five_hour, seconds: 18000},
    {label: "7d", raw: provider.seven_day, seconds: 604800},
  ].filter(item => {
    const window = currentWindow(item.raw, now);
    return finite(window.pct) && !(item.label === "5h" && window.pct === 0 && !finite(window.resets_at));
  });
}
function widgetSize(family) {
  const screen = Device.screenSize();
  const width = Math.min(screen.width, screen.height);
  const height = Math.max(screen.width, screen.height);
  const sizes = {320: 141, 375: height <= 667 ? 148 : 155, 390: 158, 393: 158, 402: 162,
    414: height <= 736 ? 159 : 169, 420: 170, 428: 170, 430: 170, 440: 170};
  const small = sizes[width] || 158;
  const wide = small * 2 + (width >= 414 ? 24 : 22);
  return new Size(family === "small" ? small : wide,
    family === "large" || family === "extraLarge" ? wide + 16 : small);
}
function summary(provider, now, offline) {
  const windows = availableWindows(provider, now);
  const primary = windows.find(item => item.label === "7d") || windows[0];
  const pct = primary ? primary.raw.pct : null;
  return {provider, primary, windows, pct,
    remaining: finite(pct) ? Math.max(0, Math.round(100 - pct)) : null,
    previous: offline || !provider.ok || !finite(provider.fetched_at) || now - provider.fetched_at > STALE_SECONDS,
    color: provider.id === "codex" ? "a99bff" : provider.id === "agy" ? "76bcff" : "50e2cd",
    endColor: provider.id === "codex" ? "805cfa" : "529cba"};
}
function clockLabel(providers, now) {
  const dates = providers.map(p => p.fetched_at).filter(finite);
  if (!dates.length) return "未取得";
  const updated = new Date(Math.min(...dates) * 1000);
  const clock = `${String(updated.getHours()).padStart(2, "0")}:${String(updated.getMinutes()).padStart(2, "0")}`;
  return updated.toDateString() === new Date(now * 1000).toDateString() ? `更新 ${clock}`
    : `更新 ${updated.getMonth() + 1}/${updated.getDate()} ${clock}`;
}
function mix(first, second, fraction) {
  const channels = [0, 2, 4].map(i => Math.round(parseInt(first.slice(i, i + 2), 16) * (1 - fraction)
    + parseInt(second.slice(i, i + 2), 16) * fraction).toString(16).padStart(2, "0"));
  return channels.join("");
}
function rounded(ctx, x, y, width, height, radius, color, alpha = 1, stroke = 0) {
  const path = new Path();
  path.addRoundedRect(new Rect(x, y, width, height), radius, radius);
  ctx.addPath(path);
  if (stroke) {
    ctx.setStrokeColor(new Color(color, alpha));
    ctx.setLineWidth(stroke);
    ctx.strokePath();
  } else {
    ctx.setFillColor(new Color(color, alpha));
    ctx.fillPath();
  }
}
function gradient(ctx, x, y, width, height, radius, first, second, alpha = 1) {
  // Scanlines give the native renderer the same gradient as the preview.
  const steps = Math.ceil(height);
  for (let i = 0; i < steps; i++) {
    const line = (i + 0.5) * height / steps;
    const edge = line < radius ? radius - line : line > height - radius ? line - height + radius : 0;
    const inset = edge ? radius - Math.sqrt(Math.max(0, radius * radius - edge * edge)) : 0;
    ctx.setFillColor(new Color(mix(first, second, i / Math.max(1, steps - 1)), alpha));
    // Opaque overlap avoids antialiasing seams between adjacent scanlines.
    const lineHeight = Math.min(height - i * height / steps, height / steps + 1);
    ctx.fillRect(new Rect(x + inset, y + i * height / steps, width - inset * 2, lineHeight));
  }
}
function drawText(ctx, value, x, y, width, height, size, color = COLORS.text, bold = false, align = "left") {
  ctx.setFont(bold ? Font.boldSystemFont(size) : Font.systemFont(size));
  ctx.setTextColor(new Color(color));
  if (align === "right") ctx.setTextAlignedRight();
  else if (align === "center") ctx.setTextAlignedCenter();
  else ctx.setTextAlignedLeft();
  ctx.drawTextInRect(String(value), new Rect(x, y, width, height));
}
function glow(ctx, x, y, radius, color, strength = 0.1) {
  const steps = 40;
  for (let i = steps; i > 0; i--) {
    const r = radius * i / steps;
    ctx.setFillColor(new Color(color, strength * (1 - i / (steps + 3)) / (steps * 0.36)));
    ctx.fillEllipse(new Rect(x - r, y - r, r * 2, r * 2));
  }
}
function logo(ctx, provider, x, y, size) {
  const key = provider.id === "codex" ? "openai" : provider.id === "claude" ? "claude" : null;
  if (key && BRAND_IMAGES[key]) {
    if (!decodedIcons[key]) decodedIcons[key] = Image.fromData(Data.fromBase64String(BRAND_IMAGES[key]));
    ctx.drawImageInRect(decodedIcons[key], new Rect(x, y, size, size));
  } else drawText(ctx, provider.short || provider.name.slice(0, 1), x, y, size, size, size * 0.6, COLORS.text, true, "center");
}
function refreshIcon(ctx, x, y, size) {
  const path = new Path();
  const radius = size * 0.36;
  const cx = x + size / 2, cy = y + size / 2;
  for (let i = 0; i <= 24; i++) {
    const angle = (-45 + i * 300 / 24) * Math.PI / 180;
    const point = new Point(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    if (!i) path.move(point); else path.addLine(point);
  }
  path.move(new Point(x + size * 0.76, y + size * 0.04));
  path.addLine(new Point(x + size * 0.76, y + size * 0.31));
  path.addLine(new Point(x + size * 0.48, y + size * 0.31));
  ctx.addPath(path); ctx.setStrokeColor(new Color(COLORS.muted)); ctx.setLineWidth(0.9); ctx.strokePath();
}
function track(ctx, x, y, width, height, item) {
  rounded(ctx, x, y, width, height, height / 2, "9caadc", 0.22);
  if (!finite(item.pct) || item.pct <= 0) return;
  const filled = width * Math.min(100, Math.max(0, item.pct)) / 100;
  // Small positive values stay visible, but never imply more than the actual allowance.
  gradient(ctx, x, y, filled, height, Math.min(height / 2, filled / 2), item.color, item.endColor);
}
function card(ctx, x, y, width, height, item) {
  gradient(ctx, x, y, width, height, 13, "3a4d65", "14243b");
  rounded(ctx, x + 0.5, y + 0.5, width - 1, height - 1, 13, "c7dcff", 0.24, 0.6);
  // A restrained colored rim matches the reference without tinting the text.
  rounded(ctx, x + 0.8, y + 0.8, width - 1.6, height - 1.6, 13, item.color, 0.12, 0.6);
}
function statusDot(ctx, item, x, y) {
  if (!item.previous) return;
  ctx.setFillColor(new Color(COLORS.yellow)); ctx.fillEllipse(new Rect(x, y, 3, 3));
}
function smallCard(ctx, rect, item) {
  const {x, y, width, height} = rect;
  card(ctx, x, y, width, height, item);
  const iconSize = 22, bodyX = x + 36, bodyWidth = width - 44;
  logo(ctx, item.provider, x + 8, y + (height - iconSize) / 2, iconSize);
  drawText(ctx, item.provider.name === "Antigravity" ? "AGY" : item.provider.name, bodyX, y + 8,
    bodyWidth - 29, 14, 9.5, COLORS.text, true);
  drawText(ctx, finite(item.pct) ? `${Math.round(item.pct)}%` : "--%", bodyX + bodyWidth - 30, y + 7, 30, 16, 11, COLORS.text, true, "right");
  statusDot(ctx, item, bodyX - 5, y + 12);
  track(ctx, bodyX, y + 27, bodyWidth, 3.5, item);
  drawText(ctx, item.previous ? "前回値" : item.primary ? item.primary.label === "7d" ? "週" : "5h" : "未取得", bodyX, y + 35, 23, 11, 6.5, COLORS.muted);
  drawText(ctx, finite(item.remaining) ? `残り ${item.remaining}%` : "取得できません", bodyX + 22, y + 34, bodyWidth - 22, 12, 8, COLORS.muted, false, "right");
}
function ring(ctx, cx, cy, radius, pct, color, endColor) {
  ctx.setStrokeColor(new Color("6b80aa", 0.20)); ctx.setLineWidth(6.5);
  ctx.strokeEllipse(new Rect(cx - radius, cy - radius, radius * 2, radius * 2));
  if (!finite(pct) || pct <= 0) return;
  const angle = Math.PI * 2 * Math.min(100, Math.max(0, pct)) / 100;
  const steps = Math.max(2, Math.ceil(angle * radius / 2));
  const path = new Path();
  for (let i = 0; i < steps; i++) {
    const first = -Math.PI / 2 + angle * i / steps;
    const last = -Math.PI / 2 + angle * (i + 1) / steps;
    if (!i) path.move(new Point(cx + radius * Math.cos(first), cy + radius * Math.sin(first)));
    path.addLine(new Point(cx + radius * Math.cos(last), cy + radius * Math.sin(last)));
  }
  ctx.addPath(path); ctx.setStrokeColor(new Color(color)); ctx.setLineWidth(6.5); ctx.strokePath();
  for (const a of [-Math.PI / 2, -Math.PI / 2 + angle]) {
    ctx.setFillColor(new Color(color));
    ctx.fillEllipse(new Rect(cx + radius * Math.cos(a) - 3.25, cy + radius * Math.sin(a) - 3.25, 6.5, 6.5));
  }
}
function ringCard(ctx, rect, item) {
  const {x, y, width, height} = rect;
  card(ctx, x, y, width, height, item);
  logo(ctx, item.provider, x + 10, y + 8, 16);
  drawText(ctx, item.provider.name, x + 32, y + 8, width - 43, 15, 10, COLORS.text, true);
  statusDot(ctx, item, x + width - 10, y + 13);
  const radius = Math.min(28, (height - 52) / 2);
  const cx = x + width / 2, cy = y + 32 + radius;
  ring(ctx, cx, cy, radius, item.pct, item.color, item.endColor);
  drawText(ctx, finite(item.pct) ? `${Math.round(item.pct)}%` : "--", cx - radius, cy - 12, radius * 2, 24, 20, COLORS.text, true, "center");
  drawText(ctx, item.previous ? "前回値" : item.primary?.label === "7d" ? "週間" : item.primary ? "5時間" : "未取得", cx - radius, cy + 10, radius * 2, 10, 6.5, COLORS.muted, false, "center");
  drawText(ctx, finite(item.remaining) ? `残り ${item.remaining}%` : "使用量なし", x + 5, y + height - 17, width - 10, 12, 9, COLORS.muted, false, "center");
}
function wideCard(ctx, rect, item, now) {
  const {x, y, width, height} = rect;
  card(ctx, x, y, width, height, item);
  const tall = height > 100;
  const iconSize = tall ? 35 : 25;
  const bodyX = x + iconSize + 24, bodyWidth = width - iconSize - 38;
  const blockHeight = tall ? item.windows.length > 1 ? 108 : 84 : 80;
  const top = y + Math.max(10, (height - blockHeight) / 2);
  logo(ctx, item.provider, x + 11, y + (height - iconSize) / 2, iconSize);
  drawText(ctx, item.provider.name, bodyX, top, bodyWidth, 18, tall ? 14 : 11, COLORS.text, true);
  statusDot(ctx, item, bodyX - 6, top + 6);
  const rowY = top + (tall ? 25 : 19);
  drawText(ctx, finite(item.pct) ? `${Math.round(item.pct)}%` : "--%", bodyX, rowY, 70, 32, tall ? 26 : 17, COLORS.text, true);
  drawText(ctx, finite(item.remaining) ? `残り ${item.remaining}%` : "使用量なし", bodyX + 72, rowY + 5, bodyWidth - 72, 23, tall ? 17 : 10, item.color, true, "right");
  const barY = rowY + (tall ? 36 : 25);
  track(ctx, bodyX, barY, bodyWidth, tall ? 7 : 4, item);
  drawText(ctx, item.primary?.label === "7d" ? "週間" : item.primary ? "5時間" : "未取得", bodyX, barY + 10, 42, 13, 8, COLORS.muted);
  const reset = item.primary?.raw.resets_at;
  drawText(ctx, item.previous ? "前回取得した値" : finite(reset) ? `${remaining(reset, now)}後にリセット` : "リセット時刻なし",
    bodyX + 42, barY + 10, bodyWidth - 42, 13, 8, COLORS.muted, false, "right");
  if (tall && item.windows.length > 1) {
    const other = item.windows.find(value => value !== item.primary);
    drawText(ctx, `${other.label}  ${Math.round(other.raw.pct)}%`, bodyX, y + height - 23, bodyWidth, 13, 8, COLORS.muted);
  }
}
function drawScene(result, family, parameter, now) {
  const size = widgetSize(family);
  const small = family === "small";
  const large = family === "large" || family === "extraLarge";
  const providers = visibleProviders(result.data ? result.data.providers : [], parameter, now);
  const visible = providers.slice(0, large ? 3 : 2);
  const ctx = new DrawContext();
  ctx.size = size; ctx.opaque = false; ctx.respectScreenScale = true;
  gradient(ctx, 0, 0, size.width, size.height, 24, "28374f", "131b30");
  glow(ctx, size.width * 0.05, size.height * 0.92, size.width * 0.52, "48e5ea", 0.10);
  glow(ctx, size.width * 0.98, size.height * 0.94, size.width * 0.55, "9b71ff", 0.14);
  rounded(ctx, 0.5, 0.5, size.width - 1, size.height - 1, 24, "c5dcff", 0.45, 0.7);
  const headerY = small ? 12 : 11;
  drawText(ctx, small ? "AI" : "AI 利用状況", 12, headerY, small ? 25 : 130, 19, small ? 11 : 13, COLORS.text, true);
  const updated = result.offline ? "接続失敗" : clockLabel(visible, now);
  drawText(ctx, updated, small ? 37 : size.width - 135, headerY + 2,
    small ? size.width - 66 : 104, 13, small ? 6.8 : 8, result.offline ? COLORS.yellow : COLORS.muted, false, "right");
  refreshIcon(ctx, size.width - 23, headerY + 1, 11);
  if (providers.length > visible.length) drawText(ctx, `+${providers.length - visible.length}`, 12, size.height - 11, 35, 9, 6, COLORS.muted);
  if (!visible.length) {
    drawText(ctx, result.data ? "表示データなし" : "接続できません", 14, size.height * 0.42, size.width - 28, 22, 13, COLORS.text, true, "center");
    drawText(ctx, "Tailscale・PCの起動を確認", 14, size.height * 0.42 + 25, size.width - 28, 17, 8, COLORS.muted, false, "center");
  }
  const padding = small ? 8 : 10, gap = small ? 6 : 8;
  const startY = small ? 33 : 34;
  for (let i = 0; i < visible.length; i++) {
    const item = summary(visible[i], now, result.offline);
    if (small || large) {
      const height = (size.height - startY - 10 - gap * (visible.length - 1)) / visible.length;
      const rect = {x: padding, y: startY + i * (height + gap), width: size.width - padding * 2, height};
      if (small) smallCard(ctx, rect, item); else wideCard(ctx, rect, item, now);
    } else {
      const width = (size.width - padding * 2 - gap * (visible.length - 1)) / visible.length;
      ringCard(ctx, {x: padding + i * (width + gap), y: startY, width, height: size.height - startY - 10}, item);
    }
  }
  return ctx.getImage();
}
function renderWidget(result, family, parameter, now) {
  const widget = new ListWidget();
  widget.setPadding(0, 0, 0, 0);
  widget.backgroundColor = new Color("172135");
  widget.refreshAfterDate = new Date((now + REFRESH_MINUTES * 60) * 1000);
  let url = URLScheme.forRunningScript();
  url += `${url.includes("?") ? "&" : "?"}family=${encodeURIComponent(family)}`;
  if (parameter) url += `&providers=${encodeURIComponent(parameter)}`;
  widget.url = url;
  const image = widget.addImage(drawScene(result, family, parameter, now));
  image.imageSize = widgetSize(family);
  image.resizable = true;
  image.leftAlignImage();
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
