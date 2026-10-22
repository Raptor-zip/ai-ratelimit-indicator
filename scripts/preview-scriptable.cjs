#!/usr/bin/env node
// Development preview of the real Scriptable source. Flex layout approximates
// WidgetKit; it is useful for geometry review, not an iOS screenshot substitute.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const now = 1800000000;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
class Size {constructor(width, height) {Object.assign(this, {width, height});}}
class Rect {constructor(x, y, width, height) {Object.assign(this, {x, y, width, height});}}
class Color {
  constructor(hex, alpha = 1) {this.css = `#${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;}
}
class Stack {
  constructor(type = 'stack') {this.type = type; this.children = []; this.direction = 'row';}
  addStack() {const child = new Stack(); this.children.push(child); return child;}
  addText(value) {const child = {type: 'text', value}; this.children.push(child); return child;}
  addImage(value) {const child = {type: 'image', value, leftAlignImage() {}}; this.children.push(child); return child;}
  addSpacer(value) {this.children.push({type: 'spacer', value});}
  setPadding(...values) {this.padding = values;}
  layoutVertically() {this.direction = 'column';}
  layoutHorizontally() {this.direction = 'row';}
  centerAlignContent() {this.center = true;}
}
class ListWidget extends Stack {constructor() {super(); this.direction = 'column';}}
class DrawContext {
  constructor() {this.rects = [];}
  setFillColor(color) {this.color = color.css;}
  fillRect(rect) {this.rects.push({rect, color: this.color});}
  getImage() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.size.width}" height="${this.size.height}">${this.rects.map(({rect: r, color}) => `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${color}"/>`).join('')}</svg>`;
  }
}
function render(node) {
  if (node.type === 'text') return `<span style="font-size:${node.font.size}px;font-weight:${node.font.weight};color:${node.textColor.css}">${escape(node.value)}</span>`;
  if (node.type === 'image') return `<img alt="" src="data:image/svg+xml;base64,${Buffer.from(node.value).toString('base64')}" style="width:${node.imageSize.width}px;height:${node.imageSize.height}px;border-radius:${node.cornerRadius || 0}px;align-self:flex-start">`;
  if (node.type === 'spacer') return node.value === undefined ? '<i style="flex:1"></i>' : `<i style="flex:none;width:${node.value}px;height:${node.value}px"></i>`;
  const size = node.size;
  const gradient = node.backgroundGradient;
  const material = gradient ? `background:linear-gradient(135deg,${gradient.colors.map((color, i) => `${color.css} ${gradient.locations[i] * 100}%`).join(',')});` : '';
  return `<div class="stack" style="${material}flex-direction:${node.direction};${node.center ? 'align-items:center;' : ''}${size?.width ? `width:${size.width}px;flex:none;` : ''}${node.padding ? `padding:${node.padding.map(n => n + 'px').join(' ')};` : ''}">${node.children.map(render).join('')}</div>`;
}
const source = fs.readFileSync(path.join(__dirname, '../scriptable/AI-Usage.js'), 'utf8').replace(/await main\(\);\s*$/, '');
function widget(providers, family, screenWidth = 390, offline = false) {
  const context = vm.createContext({ListWidget, DrawContext, Color, Size, Rect, LinearGradient: class {}, Point: Size,
    Device: {screenSize: () => new Size(screenWidth, 844)},
    URLScheme: {forRunningScript: () => 'scriptable:///run?scriptName=AI'},
    Font: {systemFont: size => ({size, weight: 400}), boldSystemFont: size => ({size, weight: 650})}});
  vm.runInContext(source + '\nglobalThis.renderWidget = renderWidget;', context);
  return render(context.renderWidget({data: {providers}, offline}, family, '', now));
}
const base = (id, extra = {}) => ({id, name: id === 'claude' ? 'Claude' : 'Codex', ok: true, fetched_at: now - 120,
  five_hour: {pct: null}, seven_day: {pct: id === 'claude' ? 21 : 23, resets_at: now + (id === 'claude' ? 266400 : 583200)}, ...extra});
const screenshotState = [base('claude', {ok: false, error: 'token_expired', five_hour: {pct: 0}}), base('codex')];
const allWindows = [base('claude', {five_hour: {pct: 42, resets_at: now + 7200}}), base('codex', {five_hour: {pct: 68, resets_at: now + 3600}})];
const cases = [
  ['画像の状態 · 小158pt', screenshotState, 'small', 158, 390],
  ['両方の枠あり · 小158pt', allWindows, 'small', 158, 390],
  ['小さい画面 · 小141pt', allWindows, 'small', 141, 320],
  ['大きい画面 · 小170pt', screenshotState, 'small', 170, 440],
  ['接続失敗', screenshotState, 'small', 158, 390, true],
  ['使用量なし', [base('claude', {seven_day: null}), base('codex', {seven_day: null})], 'small', 158, 390],
  ['中サイズ', allWindows, 'medium', 338, 390],
];
const page = `<!doctype html><meta charset="utf-8"><title>Scriptable layout review</title>
<style>*{box-sizing:border-box}body{margin:0;padding:30px;background:#aaa697;font:13px system-ui;color:#24282f}
main{display:flex;align-items:start;flex-wrap:wrap;gap:28px;max-width:1100px}.case p{margin:0 0 12px}
.widget{border-radius:24px;overflow:hidden;background:linear-gradient(135deg,#394556e6,#1b2431f2);box-shadow:inset 0 1px 0 #ffffff55,0 8px 28px #17212b22}
.widget>.stack{width:100%;height:100%}.stack{display:flex;min-width:0;flex-shrink:0}.stack>span{white-space:nowrap;line-height:1.2;flex:none}
.stack>img{display:block;flex:none}.stack>i{display:block;min-width:0;min-height:0}
aside{margin-top:30px;max-width:900px;line-height:1.6}</style>
<main>${cases.map(([label, providers, family, width, screenWidth, offline]) => `<section class="case"><p>${escape(label)}</p><div class="widget" style="width:${width}px;height:${family === 'small' ? width : 158}px">${widget(providers, family, screenWidth, offline)}</div></section>`).join('')}</main>
<aside>実際のScriptableコードをブラウザのFlexboxで近似した開発用プレビュー。フォント・制約解決・背景合成はWidgetKitと異なるため、iPhone実機での確認も必要です。</aside>`;
const output = process.argv[2] || '/tmp/ai-usage-review/layout.html';
fs.writeFileSync(output, page);
console.log(output);
