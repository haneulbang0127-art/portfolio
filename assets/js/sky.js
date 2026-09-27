/* ============================================================
   sky.js — 하늘 상태(시계 + 팔레트) + 공통 UI
   ------------------------------------------------------------
   실제 시각과 연동하지 않는다. 로드되면 새벽에서 시작해
   새벽 → 아침 → 한낮 → 오후 → 노을 → 해 질 무렵 → 새벽 으로
   끊김 없이 순환한다. 색은 아래 KEYS 를 보간해서 만든다.
   ============================================================ */

(function () {
  'use strict';

  var sky = document.getElementById('sky');
  var label = document.getElementById('skyPhaseLabel');

  /* ---------- 팔레트 ----------
     zen/up/low/hor : 천정 → 지평선 4단 그라데이션
     lit/shade      : 빛 받는 구름 / 그늘진 구름
     glow           : 햇빛 번짐 색, gpos 는 화면상 위치, gstr 은 세기
     coverA/B       : 층운 띠 / 새털구름 양 (값이 클수록 적다) */

  var KEYS = [
    {
      p: 0.00, name: '새벽의 하늘', phase: 'dawn',
      zen: '#a6bade', up: '#bdc8e4', low: '#d4d6e4', hor: '#f0dfd2',
      lit: '#fcd9a9', shade: '#c9b4c4',
      glow: '#ffd49c', gpos: [-0.42, -0.28], gstr: 0.50,
      coverA: 0.52, coverB: 0.58
    },
    {
      p: 0.16, name: '아침의 하늘', phase: 'dawn',
      zen: '#8fb9e4', up: '#aecfec', low: '#cfe2f4', hor: '#eceef2',
      lit: '#fff6e6', shade: '#c9d6e6',
      glow: '#fff0d4', gpos: [-0.26, 0.18], gstr: 0.34,
      coverA: 0.56, coverB: 0.60
    },
    {
      p: 0.34, name: '한낮의 하늘', phase: 'day',
      zen: '#6aa9e0', up: '#92c3ea', low: '#bcdbf2', hor: '#dcedf8',
      lit: '#ffffff', shade: '#cfe1f1',
      glow: '#ffffff', gpos: [0.06, 0.50], gstr: 0.26,
      coverA: 0.58, coverB: 0.56
    },
    {
      p: 0.52, name: '오후의 하늘', phase: 'day',
      zen: '#7db0e0', up: '#a6cbe9', low: '#cfe0ef', hor: '#ecebe8',
      lit: '#fffaf0', shade: '#c9d8e8',
      glow: '#fff2dc', gpos: [0.28, 0.26], gstr: 0.34,
      coverA: 0.55, coverB: 0.58
    },
    {
      p: 0.70, name: '노을의 하늘', phase: 'dusk',
      zen: '#a3b8da', up: '#b8c3dc', low: '#c8c6dc', hor: '#dccfd6',
      lit: '#faa89a', shade: '#cb9fae',
      glow: '#ffb188', gpos: [0.40, -0.26], gstr: 0.54,
      coverA: 0.47, coverB: 0.54
    },
    {
      p: 0.86, name: '해 질 무렵의 하늘', phase: 'dusk',
      zen: '#8b98bf', up: '#a4a3c2', low: '#bda3bb', hor: '#d9b4b0',
      lit: '#ef958a', shade: '#9b88a8',
      glow: '#ff9c7e', gpos: [0.50, -0.42], gstr: 0.50,
      coverA: 0.50, coverB: 0.56
    }
  ];

  function hex(h) {
    var n = parseInt(h.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  // 색은 미리 풀어 둔다
  KEYS.forEach(function (k) {
    k.rgb = {
      zen: hex(k.zen), up: hex(k.up), low: hex(k.low), hor: hex(k.hor),
      lit: hex(k.lit), shade: hex(k.shade), glow: hex(k.glow)
    };
  });

  function mix3(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  /* 진행도 → 보간된 하늘 상태 (마지막 키는 첫 키로 순환) */
  function paletteAt(p) {
    p = ((p % 1) + 1) % 1;

    var i = KEYS.length - 1;
    for (var k = 0; k < KEYS.length - 1; k++) {
      if (p >= KEYS[k].p && p < KEYS[k + 1].p) { i = k; break; }
    }

    var a = KEYS[i];
    var b = KEYS[(i + 1) % KEYS.length];
    var span = (b.p > a.p ? b.p : b.p + 1) - a.p;
    var t = (p - a.p) / span;
    t = t * t * (3 - 2 * t); // 색이 급하게 꺾이지 않게

    return {
      zen: mix3(a.rgb.zen, b.rgb.zen, t),
      up: mix3(a.rgb.up, b.rgb.up, t),
      low: mix3(a.rgb.low, b.rgb.low, t),
      hor: mix3(a.rgb.hor, b.rgb.hor, t),
      lit: mix3(a.rgb.lit, b.rgb.lit, t),
      shade: mix3(a.rgb.shade, b.rgb.shade, t),
      glow: mix3(a.rgb.glow, b.rgb.glow, t),
      gpos: [lerp(a.gpos[0], b.gpos[0], t), lerp(a.gpos[1], b.gpos[1], t)],
      gstr: lerp(a.gstr, b.gstr, t),
      coverA: lerp(a.coverA, b.coverA, t),
      coverB: lerp(a.coverB, b.coverB, t),
      name: (t < 0.5 ? a : b).name,
      phase: (t < 0.5 ? a : b).phase
    };
  }

  /* ---------- 시계 ---------- */

  function cycleSeconds() {
    var raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--sky-cycle').trim();
    var n = parseFloat(raw);
    if (!n) return 120;
    return raw.indexOf('ms') > -1 ? n / 1000 : n;
  }

  var cycle = cycleSeconds();
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var START = 0.02;              // 새벽에서 시작한다
  var t0 = performance.now();
  var frozen = null;             // SKY_CLOCK.freeze(p) 로 특정 시간대 고정

  // 모션 최소화 설정이어도 멈추지 않는다. 대신 3배 느리게 흐른다.
  var runCycle = reduce ? cycle * 3 : cycle;

  function progressNow() {
    if (frozen !== null) return frozen;
    return (START + ((performance.now() - t0) / 1000) / runCycle) % 1;
  }

  window.SKY_CLOCK = {
    progress: progressNow,
    palette: paletteAt,
    cycle: runCycle,
    reduce: reduce,
    freeze: function (p) {
      frozen = (p === null || p === undefined) ? null : ((p % 1) + 1) % 1;
      tick();
      if (window.SKY_GL) window.SKY_GL.redraw();
    }
  };

  /* ---------- CSS 폴백 상태 + 라벨 ---------- */

  if (sky) {
    document.documentElement.style.setProperty('--sky-delay', '-' + (START * cycle).toFixed(2) + 's');
  }

  function tick() {
    var st = paletteAt(progressNow());

    if (sky && sky.getAttribute('data-phase') !== st.phase) {
      sky.setAttribute('data-phase', st.phase);
    }
    if (label && label.textContent !== st.name) {
      label.textContent = st.name;
    }

    setTimeout(tick, 900);
  }

  tick();

  /* ============================================================
     공통 UI — 모바일 네비
     ============================================================ */

  var burger = document.getElementById('navBurger');
  var menu = document.querySelector('.nav__menu');

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? '메뉴 열기' : '메뉴 닫기');
      menu.classList.toggle('is-open', !open);
    });

    document.addEventListener('click', function (e) {
      if (burger.getAttribute('aria-expanded') !== 'true') return;
      if (menu.contains(e.target) || burger.contains(e.target)) return;
      burger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
    });
  }
})();
