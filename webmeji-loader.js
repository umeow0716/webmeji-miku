/*!
 * webmeji-miku.js — 只要載入這一個檔案，任何網頁都會出現一隻會走動的 Miku。
 * 不需要任何 HTML / CSS / config / 圖片。所有資源都從 jsDelivr（鎖定原 repo 的某個 commit）載入。
 * 原作：Lars de Rooij — https://github.com/lars-rooij/webmeji （Unlicense / 公有領域）
 *
 * 用法：<script src="https://你的CDN網址/webmeji-loader.js"></script>
 *
 * 進階（全部可省略）：
 *   data-count="3"                生成幾隻（預設 1）
 *   data-config="SHIMEJI_CONFIG"  改成原本的白色小人（預設 MIKU_CONFIG）
 *   data-megumin-base="https://.../assets/megumin/"  惠惠爆裂魔法素材的資料夾網址（預設為本 repo 的 assets/megumin/）
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

  // ═══════════════════════════════════════════════════════════════
  //  💥 爆裂魔法（惠惠）
  //  在每個 .card-body 的第一個 .ms-1 前面插入 💥，
  //  點擊後：惠惠詠唱 8 秒 → 爆炸 → 卡片碎裂飛散。
  // ═══════════════════════════════════════════════════════════════
  function initMegumin() {
    var MG_BASE = (ds.meguminBase || 'https://cdn.jsdelivr.net/gh/umeow0716/webmeji-miku@main/assets/megumin/').replace(/\/?$/, '/');

    // 用到的素材：frame-06 ~ frame-28（frame-01 ~ 05 原腳本沒有引用）
    var frame = function (n) { return MG_BASE + 'frame-' + (n < 10 ? '0' : '') + n + '.webp'; };
    var range = function (a, b) { var r = []; for (var i = a; i <= b; i++) r.push(frame(i)); return r; };
    var STAGES = range(6, 12);                    // 魔法陣 7 階段
    var CAST = range(13, 17);                     // 舉杖 5 張
    var IDLE = [18, 19, 20, 19].map(frame);       // 站立待機
    var BOOM = range(21, 28);                     // 爆炸 8 張

    var STYLE = [
      '#mg-scene{pointer-events:none;position:fixed;inset:0;z-index:2147483000;overflow:hidden}',
      '.mg-cast{position:fixed;pointer-events:none;z-index:10;width:260px;height:240px;overflow:visible}',
      '.mg-cast .mg-actor{position:absolute;left:0;top:0;width:260px;height:240px;max-width:none;object-fit:fill;image-rendering:pixelated;filter:none}',
      '.mg-magic{position:fixed;pointer-events:none;transform:translate(-50%,-50%);z-index:9;width:250px;height:238px;overflow:visible}',
      '.mg-magic .mg-stage{display:block;width:250px;height:238px;max-width:none;opacity:1;object-fit:fill;transform:none;filter:none}',
      '.mg-shard{position:fixed;will-change:transform;transform-origin:center;pointer-events:none}',
      '.mg-burst{position:fixed;border:3px solid #ff9e64;border-radius:50%;width:30px;height:30px;transform:translate(-50%,-50%);box-shadow:0 0 35px 14px #f4512b88;animation:mg-ring .43s ease-out forwards}',
      '.mg-flash{position:fixed;inset:0;background:#fff;animation:mg-flash .29s ease-out forwards}',
      '@keyframes mg-ring{to{width:490px;height:490px;opacity:0}}',
      '@keyframes mg-flash{0%{opacity:.86}100%{opacity:0}}',
      '@media(max-width:510px){.mg-cast{scale:.8}}',
      '.mg-boom{position:fixed;pointer-events:none;z-index:10003;max-width:none;width:min(85vw,455px);height:min(84vh,700px);object-fit:contain;transform:translate(-50%,-72%);image-rendering:auto;filter:drop-shadow(0 0 23px #ff5d1599)}'
    ].join('\n');

    var settings = { gravity: 2100, speed: 3600, margin: 7 };
    var pending = new Set(), particles = new Set(), shattered = new Set();
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    var scene = null;
    function getScene() {
      if (!document.getElementById('mg-style')) {
        var st = document.createElement('style'); st.id = 'mg-style'; st.textContent = STYLE;
        document.head.appendChild(st);
      }
      if (!scene || !scene.isConnected) {
        scene = document.createElement('div'); scene.id = 'mg-scene';
        document.body.appendChild(scene);
      }
      return scene;
    }

    var preloaded = false;
    function preload() {
      if (preloaded) return; preloaded = true;
      STAGES.concat(CAST, IDLE, BOOM).forEach(function (u) { new Image().src = u; });
    }

    function spawn(x, y) {
      var s = getScene();
      var a = document.createElement('div'); a.className = 'mg-burst';
      a.style.left = x + 'px'; a.style.top = y + 'px'; s.append(a);
      setTimeout(function () { a.remove(); }, 450);
      var f = document.createElement('div'); f.className = 'mg-flash'; s.append(f);
      setTimeout(function () { f.remove(); }, 310);
    }

    // 從中心放射狀切成 n 塊的 clip-path
    function polygons(w, h, n) {
      var cx = w / 2, cy = h / 2;
      var angles = Array.from({ length: n }, function (_, i) { return -Math.PI / 2 + i * 2 * Math.PI / n; });
      var rays = angles.map(function (a, i) {
        var dx = Math.cos(a), dy = Math.sin(a);
        var ts = [dx > 0 ? (w - cx) / dx : dx < 0 ? -cx / dx : Infinity, dy > 0 ? (h - cy) / dy : dy < 0 ? -cy / dy : Infinity];
        var t = Math.min.apply(null, ts.filter(function (v) { return v > 0; }));
        var k = .20 + (i % 3) * .10;
        var v = [cx + dx * t * k + (-dy) * 6, cy + dy * t * k + dx * 6];
        var v2 = [cx + dx * t * .62 + dy * 8, cy + dy * t * .62 - dx * 8];
        return { a: a, outer: [cx + dx * t, cy + dy * t], line: [v, v2] };
      });
      function perimeter(p) {
        var x = p[0], y = p[1], eps = 1e-3;
        if (Math.abs(y) < eps) return x;
        if (Math.abs(x - w) < eps) return w + y;
        if (Math.abs(y - h) < eps) return w + h + (w - x);
        return 2 * w + h + (h - y);
      }
      var corners = [[w, 0], [w, h], [0, h], [0, 0]];
      return rays.map(function (start, i) {
        var next = rays[(i + 1) % n], ring = [start.outer];
        var a = perimeter(start.outer), b = perimeter(next.outer), L = 2 * (w + h);
        if (b <= a) b += L;
        corners.forEach(function (c) { var t = perimeter(c); if (t <= a) t += L; if (t > a && t < b) ring.push(c); });
        ring.push(next.outer);
        next.line.slice().reverse().forEach(function (p) { ring.push(p); });
        ring.push([cx, cy]);
        start.line.forEach(function (p) { ring.push(p); });
        var poly = ring.map(function (p) { return (p[0] / w * 100) + '% ' + (p[1] / h * 100) + '%'; }).join(',');
        return { poly: poly, a: (angles[i] + angles[(i + 1) % n] + (i === n - 1 ? 2 * Math.PI : 0)) / 2 };
      });
    }

    function shatter(card) {
      if (card.dataset.mgShattered) return;
      var rect = card.getBoundingClientRect(); if (rect.width < 2 || rect.height < 2) return;
      var s = getScene();
      card.dataset.mgShattered = 'yes'; card.style.visibility = 'hidden'; shattered.add(card);
      spawn(rect.left + rect.width / 2, rect.top + rect.height / 2);
      var count = 5 + Math.floor(Math.random() * 2);
      polygons(rect.width, rect.height, count).forEach(function (sector) {
        var outer = document.createElement('div'); outer.className = 'mg-shard';
        Object.assign(outer.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', clipPath: 'polygon(' + sector.poly + ')' });
        var clone = card.cloneNode(true);
        clone.removeAttribute('data-mg-shattered');
        clone.removeAttribute('id');
        clone.querySelectorAll('[id]').forEach(function (e) { e.removeAttribute('id'); });
        Object.assign(clone.style, { visibility: 'visible', width: '100%', height: '100%', minHeight: '0', margin: '0', boxSizing: 'border-box', pointerEvents: 'none' });
        outer.append(clone); s.append(outer);
        var a = sector.a, speed = settings.speed * (.85 + Math.random() * .25);
        particles.add({
          el: outer, x: 0, y: 0, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          rot: 0, limit: (10 + Math.random() * 5) * (Math.random() < .5 ? -1 : 1),
          age: 0, left: false, right: false, topHit: false, w: rect.width, h: rect.height, startX: rect.left, startY: rect.top
        });
      });
      ensureTick();
    }

    // 只有碎片存在時才跑 requestAnimationFrame
    var ticking = false, previous = 0;
    function ensureTick() { if (ticking) return; ticking = true; previous = 0; requestAnimationFrame(tick); }
    function tick(t) {
      var dt = Math.min(.026, Math.max(0, (t - (previous || t)) / 1000)); previous = t;
      Array.from(particles).forEach(function (p) {
        var steps = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt / 65)), sub = dt / steps;
        for (var j = 0; j < steps; j++) {
          p.vy += settings.gravity * sub; p.x += p.vx * sub; p.y += p.vy * sub;
          var left = p.startX + p.x, top = p.startY + p.y;
          var lx = left + p.w * .5, ly = top + p.h * .5;
          var radius = Math.min(p.w, p.h) * .23;
          if (lx - radius < settings.margin && p.vx < 0 && !p.left) {
            p.left = true; p.x += (settings.margin + radius - lx); p.vx = 32; p.vy *= .15;
          }
          if (lx + radius > innerWidth - settings.margin && p.vx > 0 && !p.right) {
            p.right = true; p.x -= lx + radius - innerWidth + settings.margin; p.vx = -32; p.vy *= .15;
          }
          if (ly - radius < settings.margin && p.vy < 0 && !p.topHit) {
            p.topHit = true; p.y += settings.margin + radius - ly; p.vy = 65; p.vx *= .19;
          }
        }
        p.age += dt;
        var u = Math.min(1, p.age / .5); p.rot = p.limit * (1 - Math.pow(1 - u, 2));
        p.el.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0) rotate(' + p.rot + 'deg)';
        if (p.startY + p.y > innerHeight + p.h || p.age > 7) { p.el.remove(); particles.delete(p); }
      });
      if (particles.size) requestAnimationFrame(tick); else ticking = false;
    }

    function makeCast(card) {
      var s = getScene();
      var r = card.getBoundingClientRect();
      var gap = 14, margin = 10;
      // 8 張角色圖共用 260×240 畫布，實際有像素的範圍是 x 60..196、y 81..200
      var minX = 60, maxX = 196, minY = 81, maxY = 200;
      var vw = innerWidth, vh = innerHeight;
      var onRight = vw - r.right >= maxX - minX + gap + margin;
      var onLeft = r.left >= maxX - minX + gap + margin;
      var side = onRight ? 'right' : onLeft ? 'left' : null;
      var left, top;
      if (side === 'right') left = r.right + gap - minX;
      else if (side === 'left') left = r.left - gap - maxX;
      else {
        var below = vh - r.bottom >= maxY - minY + gap + margin;
        var above = r.top >= maxY - minY + gap + margin;
        if (below) { side = 'bottom'; top = r.bottom + gap - minY; }
        else if (above) { side = 'top'; top = r.top - gap - maxY; }
        else { side = 'right'; left = r.right + gap - minX; }
      }
      if (left === undefined) left = (r.left + r.width / 2) - (minX + maxX) / 2;
      if (top === undefined) top = (r.top + r.height / 2) - (minY + maxY) / 2;
      left = Math.max(margin - minX, Math.min(left, vw - margin - maxX));
      top = Math.max(margin - minY, Math.min(top, vh - margin - maxY));
      var sprite = document.createElement('div'); sprite.className = 'mg-cast';
      sprite.style.left = left + 'px'; sprite.style.top = top + 'px';
      var actor = document.createElement('img'); actor.className = 'mg-actor'; actor.alt = '';
      actor.style.transform = side === 'right' ? 'scaleX(-1)' : 'none'; // 素材面向右，在右側時鏡像面向卡片
      sprite.append(actor); s.append(sprite);
      var center = document.createElement('div'); center.className = 'mg-magic';
      center.style.left = (r.left + r.width / 2) + 'px'; center.style.top = (r.top + r.height / 2) + 'px';
      var stage = document.createElement('img'); stage.className = 'mg-stage'; stage.alt = '';
      center.append(stage); s.append(center);
      return { sprite: sprite, actor: actor, stage: stage, dispose: function () { sprite.remove(); center.remove(); } };
    }

    async function explosion(card) {
      var r = card.getBoundingClientRect();
      var el = document.createElement('img'); el.className = 'mg-boom'; el.alt = '';
      el.style.left = (r.left + r.width / 2) + 'px';
      el.style.top = (r.top + r.height * .68) + 'px';
      getScene().append(el);
      var times = [115, 115, 125, 135, 140, 155, 170, 210];
      var broke = false;
      try {
        for (var i = 0; i < BOOM.length && el.isConnected; i++) {
          el.src = BOOM[i];
          if (i === 4 && !broke) { broke = true; shatter(card); }
          await sleep(times[i]);
        }
        if (!broke) shatter(card);
      } finally { el.remove(); }
    }

    async function cast(card) {
      if (card.dataset.mgShattered || pending.has(card)) return;
      pending.add(card); preload();
      var fx = makeCast(card);
      var lastSource = '', lastStage = -1;
      var setImage = function (src) { if (lastSource !== src) { lastSource = src; fx.actor.src = src; } };
      var setStage = function (i) { if (lastStage !== i) { lastStage = i; fx.stage.src = STAGES[i]; } };
      var started = performance.now();
      try {
        while (fx.sprite.isConnected && performance.now() - started < 8000) {
          var t = performance.now() - started;
          if (t < 2300) {
            setImage(IDLE[Math.floor(t / 145) % IDLE.length]);                          // 站立搖晃
          } else if (t < 3550) {
            setImage(CAST[Math.min(3, Math.floor((t - 2300) / (1250 / 4)))]);           // 舉杖（只播一次）
          } else {
            setImage(CAST[4]);
            if (t >= 3650) setStage(Math.min(6, Math.floor((t - 3650) / 585)));         // 魔法陣依序展開
          }
          await sleep(32);
        }
        var stopped = !fx.sprite.isConnected; fx.dispose();
        if (!stopped) await explosion(card);
      } finally { fx.dispose(); pending.delete(card); }
    }

    // 還原：window.webmejiMegumin.reset()
    function reset() {
      if (scene) scene.querySelectorAll('.mg-cast,.mg-magic,.mg-boom,.mg-shard,.mg-burst,.mg-flash').forEach(function (e) { e.remove(); });
      particles.clear();
      shattered.forEach(function (c) { c.style.visibility = ''; delete c.dataset.mgShattered; });
      shattered.clear();
    }
    window.webmejiMegumin = { reset: reset };

    // 插入 💥：每個 .card-body 內第一個 .ms-1 的前面（同層）
    document.querySelectorAll('.card-body').forEach(function (body) {
      if (body.querySelector('[data-megumin-btn]')) return;      // 已插入過
      var ref = body.querySelector('.ms-1');
      if (!ref || !ref.parentNode) return;
      var ele = document.createElement('div');
      ele.className = 'ms-1 d-flex align-items-center';
      ele.textContent = '💥';
      ele.setAttribute('data-megumin-btn', '');
      ele.title = '爆裂魔法！';
      ele.style.cursor = 'pointer';
      ele.style.userSelect = 'none';                             // 不可選取
      ele.style.webkitUserSelect = 'none';
      ele.style.webkitTouchCallout = 'none';
      var target = body.closest('.card') || body;                // 整張卡片一起炸
      ele.addEventListener('click', function (e) {               // 可點擊
        e.preventDefault(); e.stopPropagation();
        cast(target);
      });
      ref.parentNode.insertBefore(ele, ref);
    });
  }

  function start() {
    Promise.all([css(BASE + 'webmeji.css'), js(BASE + 'config.js')]).then(function () {
      if (!window[CONFIG]) throw new Error('找不到 window.' + CONFIG);
      fix(window[CONFIG], []);
      window.SPAWNING = [];
      for (var i = 0; i < COUNT; i++) window.SPAWNING.push({ id: 'webmeji-' + i, config: CONFIG });
      return loadMain();
    }).catch(function (e) { console.error('[webmeji-loader]', e); })
      .then(function () {
        try { initMegumin(); } catch (e) { console.error('[webmeji-loader] megumin', e); }
      });
  }

  // 等 <body> 存在（載入時機再早也能用）
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
