/*!
 * webmeji-miku.js — 只要載入這一個檔案，任何網頁都會出現一隻會走動的 Miku。
 * 不需要任何 HTML / CSS / config / 圖片。所有資源都從 jsDelivr（鎖定原 repo 的某個 commit）載入。
 * 原作：Lars de Rooij — https://github.com/lars-rooij/webmeji （Unlicense / 公有領域）
 *
 * 用法：<script src="https://你的CDN網址/webmeji-loader.js"></script>
 *
 * 進階（全部可省略）：
 *   data-count="3"            生成幾隻（預設 1）
 *   data-config="SHIMEJI_CONFIG"  改成原本的白色小人（預設 MIKU_CONFIG）
 */
(function () {
  'use strict';
  if (window.__webmejiLoader) return;
  window.__webmejiLoader = true;

  var BASE = 'https://cdn.jsdelivr.net/gh/lars-rooij/webmeji@1300e8dd8a12daa646ef272d271fbe8bd25b6748/';
  var ds = (document.currentScript && document.currentScript.dataset) || {};
  var CONFIG = ds.config || 'MIKU_CONFIG';
  var COUNT = Math.max(1, parseInt(ds.count || 1, 10) || 1);

  function css(href) {
    return new Promise(function (ok, no) {
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = href; l.onload = ok;
      l.onerror = function () { no(new Error('載入失敗: ' + href)); };
      document.head.appendChild(l);
    });
  }
  function js(src) {
    return new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok;
      s.onerror = function () { no(new Error('載入失敗: ' + src)); };
      document.head.appendChild(s);
    });
  }

  var ABS = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
  function fix(node, seen) {
    if (!node || typeof node !== 'object' || seen.indexOf(node) > -1) return;
    seen.push(node);
    Object.keys(node).forEach(function (k) {
      var v = node[k];
      if (typeof v === 'string' && /\.(png|gif|webp|jpe?g|svg)$/i.test(v) && !ABS.test(v)) node[k] = BASE + v.replace(/^\.?\//, '');
      else if (v && typeof v === 'object') fix(v, seen);
    });
  }

  // webmeji.js 用 window.addEventListener('DOMContentLoaded') 啟動；
  // 動態載入時事件早已觸發，所以攔截 handler，載入完再手動呼叫。
  function loadMain() {
    var proto = EventTarget.prototype, orig = proto.addEventListener, caught = [];
    proto.addEventListener = function (type, fn) {
      if (type === 'DOMContentLoaded' && document.readyState !== 'loading' &&
          (this === window || this === document)) { caught.push(fn); return; }
      return orig.apply(this, arguments);
    };
    function restore() { proto.addEventListener = orig; }
    return js(BASE + 'webmeji.js').then(function () {
      restore();
      caught.forEach(function (fn) {
        var ev = new Event('DOMContentLoaded');
        typeof fn === 'function' ? fn.call(window, ev) : fn && fn.handleEvent && fn.handleEvent(ev);
      });
    }, function (e) { restore(); throw e; });
  }

  function start() {
    for(const ele of document.querySelectorAll(".list-group-item")) {
      if(!ele.innerText.includes('data-bs-target="#contentModal"')) continue;

      ele.remove();
    }
    Promise.all([css(BASE + 'webmeji.css'), js(BASE + 'config.js')]).then(function () {
      if (!window[CONFIG]) throw new Error('找不到 window.' + CONFIG);
      fix(window[CONFIG], []);
      window.SPAWNING = [];
      for (var i = 0; i < COUNT; i++) window.SPAWNING.push({ id: 'webmeji-' + i, config: CONFIG });
      return loadMain();
    }).catch(function (e) { console.error('[webmeji-loader]', e); });
  }

  // 等 <body> 存在（載入時機再早也能用）
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
