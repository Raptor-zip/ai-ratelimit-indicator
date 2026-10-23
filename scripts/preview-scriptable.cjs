#!/usr/bin/env node
// Serialize the production DrawContext commands to SVG; native fonts can differ.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
class Size {constructor(width, height) {Object.assign(this, {width, height});}}
class Rect {constructor(x, y, width, height) {Object.assign(this, {x, y, width, height});}}
class Point {constructor(x, y) {Object.assign(this, {x, y});}}
class Color {constructor(hex, alpha = 1) {this.css = `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${alpha})`;}}
class DrawingPath {
  constructor() {this.value = '';}
  move(p) {this.value += `M${p.x},${p.y} `;}
  addLine(p) {this.value += `L${p.x},${p.y} `;}
  addRoundedRect(r, rx, ry) {
    this.value += `M${r.x + rx},${r.y} H${r.x + r.width - rx} Q${r.x + r.width},${r.y} ${r.x + r.width},${r.y + ry} V${r.y + r.height - ry} Q${r.x + r.width},${r.y + r.height} ${r.x + r.width - rx},${r.y + r.height} H${r.x + rx} Q${r.x},${r.y + r.height} ${r.x},${r.y + r.height - ry} V${r.y + ry} Q${r.x},${r.y} ${r.x + rx},${r.y} Z `;
  }
}
class DrawContext {
  constructor() {this.elements = []; this.texts = []; this.icons = []; this.align = 'left';}
  setFillColor(color) {this.fill = color.css;}
  setStrokeColor(color) {this.stroke = color.css;}
  setLineWidth(width) {this.lineWidth = width;}
  setFont(font) {this.font = font;}
  setTextColor(color) {this.textColor = color.css;}
  setTextAlignedLeft() {this.align = 'left';}
  setTextAlignedRight() {this.align = 'right';}
  setTextAlignedCenter() {this.align = 'center';}
  fillRect(r) {this.elements.push(`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${this.fill}"/>`);}
  ellipse(r, attributes) {this.elements.push(`<ellipse cx="${r.x + r.width / 2}" cy="${r.y + r.height / 2}" rx="${r.width / 2}" ry="${r.height / 2}" ${attributes}/>`);}
  fillEllipse(r) {this.ellipse(r, `fill="${this.fill}"`);}
  strokeEllipse(r) {this.ellipse(r, `fill="none" stroke="${this.stroke}" stroke-width="${this.lineWidth}"`);}
  addPath(p) {this.pendingPath = p.value;}
  fillPath() {this.elements.push(`<path d="${this.pendingPath}" fill="${this.fill}"/>`);}
  strokePath() {this.elements.push(`<path d="${this.pendingPath}" fill="none" stroke="${this.stroke}" stroke-width="${this.lineWidth}"/>`);}
  drawImageInRect(image, r) {this.icons.push(r); this.elements.push(`<image href="data:image/png;base64,${image.data}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"/>`);}
  drawTextInRect(value, r) {
    this.texts.push({value, rect: r, font: this.font});
    const x = this.align === 'right' ? r.x + r.width : this.align === 'center' ? r.x + r.width / 2 : r.x;
    const anchor = this.align === 'right' ? 'end' : this.align === 'center' ? 'middle' : 'start';
    this.elements.push(`<text x="${x}" y="${r.y + this.font.size * 0.94}" fill="${this.textColor}" font-family="-apple-system,BlinkMacSystemFont,Arial,sans-serif" font-size="${this.font.size}" font-weight="${this.font.weight}" text-anchor="${anchor}">${escape(value)}</text>`);
  }
  getImage() {return {size: this.size, texts: this.texts, icons: this.icons,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${this.size.width}" height="${this.size.height}" viewBox="0 0 ${this.size.width} ${this.size.height}"><defs><clipPath id="frame"><rect width="${this.size.width}" height="${this.size.height}" rx="24"/></clipPath></defs><g clip-path="url(#frame)">${this.elements.join('')}</g></svg>`};}
}
class ListWidget {
  constructor() {this.images = [];}
  setPadding() {}
  addImage(source) {const image = {source, leftAlignImage() {this.alignment = 'left';}}; this.images.push(image); return image;}
}
const source = fs.readFileSync(path.join(__dirname, '../scriptable/AI-Usage.js'), 'utf8').replace(/await main\(\);\s*$/, '');
function runtime(extra = {}, screen = {width: 390, height: 844}) {
  const context = vm.createContext({ListWidget, DrawContext, Color, Size, Rect, Point, Path: DrawingPath,
    Image: {fromData: data => ({data})}, Data: {fromBase64String: data => data},
    Device: {screenSize: () => screen}, URLScheme: {forRunningScript: () => 'scriptable:///run?scriptName=AI%20Usage'},
    Font: {systemFont: size => ({size, weight: 400}), boldSystemFont: size => ({size, weight: 650})}, ...extra});
  vm.runInContext(source + '\nglobalThis.api = {currentWindow, deltaFor, selectedProviders, visibleProviders, availableWindows, summary, widgetSize, loadSnapshot, renderWidget, drawScene};', context);
  return context.api;
}
module.exports = {runtime};
if (require.main === module) {
  const now = 1800000000;
  const base = (id, pct, extra = {}) => ({id, name: id === 'claude' ? 'Claude' : 'Codex', ok: true, fetched_at: now - 120,
    five_hour: {pct: null}, seven_day: {pct, resets_at: now + 583200}, ...extra});
  const reference = [base('claude', 3), base('codex', 27)];
  const current = [base('claude', 21, {ok: false, error: 'token_expired'}), base('codex', 26)];
  const cases = [
    ['小 · 参考画像の3% / 27%', reference, 'small', 390, 2],
    ['中 · 左右のリング', reference, 'medium', 390, 1.5],
    ['大 · 横長のカード', reference, 'large', 390, 1.15],
    ['小141pt · 最小サイズ', reference, 'small', 320, 1.5],
    ['前回値・認証期限切れ', current, 'small', 390, 1.5],
    ['通信失敗', current, 'small', 390, 1.5, true],
    ['データなし', [], 'small', 390, 1.5, true],
  ];
  const html = cases.map(([label, providers, family, screenWidth, scale, offline]) => {
    const image = runtime({}, {width: screenWidth, height: 844}).drawScene({data: {providers}, offline: !!offline}, family, '', now);
    return `<section><p>${escape(label)}</p><img alt="${escape(label)}" width="${image.size.width * scale}" height="${image.size.height * scale}" src="data:image/svg+xml;base64,${Buffer.from(image.svg).toString('base64')}"></section>`;
  }).join('');
  const page = `<!doctype html><meta charset="utf-8"><title>Widget reference review</title>
<style>*{box-sizing:border-box}body{margin:0;padding:32px;color:#d9e6ff;font:13px system-ui;
background:radial-gradient(at 5% 80%,#51657988,transparent 55%),radial-gradient(at 95% 30%,#8073a766,transparent 50%),#172137}
main{display:flex;align-items:start;flex-wrap:wrap;gap:30px;max-width:1400px}p{margin:0 0 14px}img{display:block;filter:drop-shadow(0 10px 18px #0003)}
aside{margin-top:24px;color:#aabbd6;max-width:1000px;line-height:1.6}</style><main>${html}</main>
<aside>Scriptable本体のDrawContext描画命令から生成したプレビュー。座標・色・図形は共通です。フォントと最終的なOSの合成はiPhone実機と異なります。</aside>`;
  const output = process.argv[2] || '/tmp/ai-usage-review/layout.html';
  fs.writeFileSync(output, page); console.log(output);
}
