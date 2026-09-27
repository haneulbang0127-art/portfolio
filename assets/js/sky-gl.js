/* ============================================================
   sky-gl.js — 하늘 렌더러 (WebGL)
   ------------------------------------------------------------
   · 색은 sky.js 의 팔레트를 보간해서 받아온다 (실사 파스텔 톤).
   · 구름은 절차적 노이즈를 가로로 늘여 층운·새털구름 띠를 만들고,
     빛 방향으로 한 번 더 샘플링해 스스로 음영을 만든다.
   · 원근 투영이라 구름이 지평선 쪽으로 자연스럽게 모인다.
   · WebGL 을 못 쓰면 조용히 CSS 하늘(sky.css)로 남는다.
   ============================================================ */

(function () {
  'use strict';

  var canvas = document.getElementById('skyCanvas');
  var skyEl = document.getElementById('sky');
  var clock = window.SKY_CLOCK;

  if (!canvas || !skyEl || !clock) return;

  /* ---------- 셰이더 ---------- */

  var VERT = [
    'attribute vec2 aPos;',
    'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',

    'uniform vec2  uRes;',
    'uniform float uTime;',
    'uniform vec3  uZen, uUp, uLow, uHor;',   // 천정 → 지평선
    'uniform vec3  uLit, uShade, uGlow;',     // 구름 밝은 면 / 그늘 / 햇빛 번짐
    'uniform vec2  uGlowPos;',
    'uniform float uGlowStr;',
    'uniform vec2  uCover;',                  // x = 층운, y = 새털구름

    /* ---- 노이즈 ---- */
    'float hash21(vec2 p){',
    '  p = fract(p * vec2(123.34, 345.45));',
    '  p += dot(p, p + 34.345);',
    '  return fract(p.x * p.y);',
    '}',

    'float vnoise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),',
    '             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);',
    '}',

    'const mat2 ROT = mat2(1.62, 1.18, -1.18, 1.62);',

    'float fbm5(vec2 p){',
    '  float v = 0.0, a = 0.5;',
    '  for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = ROT * p; a *= 0.5; }',
    '  return v;',
    '}',

    'float fbm3(vec2 p){',
    '  float v = 0.0, a = 0.5;',
    '  for (int i = 0; i < 3; i++){ v += a * vnoise(p); p = ROT * p; a *= 0.5; }',
    '  return v;',
    '}',

    /* ---- 하늘 그라데이션 ---- */
    'vec3 skyGrad(float h){',
    '  vec3 c = mix(uHor, uLow, smoothstep(0.00, 0.34, h));',
    '  c = mix(c, uUp,  smoothstep(0.28, 0.68, h));',
    '  c = mix(c, uZen, smoothstep(0.60, 1.00, h));',
    '  return c;',
    '}',

    /* 파스텔이 흰색으로 뭉치지 않도록 더하기 대신 스크린 합성 */
    'vec3 screenBlend(vec3 base, vec3 add){',
    '  return vec3(1.0) - (vec3(1.0) - base) * (vec3(1.0) - clamp(add, 0.0, 1.0));',
    '}',

    'void main(){',
    '  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;',
    '  float yy = uv.y + 0.46;',                        // 0 = 수평선
    '  float h = clamp(yy / 0.98, 0.0, 1.0);',
    '  vec3 col = skyGrad(h);',

    /* 햇빛 번짐 — 부드러운 광원, 원반은 없다 */
    '  float gd = length((uv - uGlowPos) * vec2(0.82, 1.30));',
    '  col = screenBlend(col, uGlow * uGlowStr * exp(-gd * gd * 1.7));',
    '  float hz = yy * 2.4;',
    '  col = screenBlend(col, uGlow * uGlowStr * 0.30 * exp(-hz * hz));',

    /* ---- 구름 ----
       수평선으로 갈수록 압축되는 원근 좌표를 만들고,
       노이즈를 가로로 늘여 층운·새털구름 띠를 만든다. */
    '  if (yy > 0.012) {',
    '    float persp = min(1.0 / max(yy, 0.055), 16.0);',
    /*   로그 원근 — 화면 위쪽에도 구름 결이 남고, 아래로 갈수록 촘촘해진다 */
    '    vec2 cp = vec2(uv.x * (2.4 + persp * 0.5), 3.0 * log(1.0 + persp * 1.7))',
    '              + vec2(uTime * 0.160, uTime * 0.045);',

    '    vec2 sunH = normalize(vec2(uGlowPos.x, 0.7));',

    /*   층운 띠 */
    '    vec2 pA = vec2(cp.x * 0.5, cp.y);',
    '    float nA = fbm5(pA) * 0.86 + fbm3(pA * 3.4) * 0.14;',   // 가는 결
    '    float nS = fbm3(pA + sunH * 0.32);',
    '    float dA = smoothstep(uCover.x, uCover.x + 0.26, nA);',

    /*   높은 새털구름 */
    '    vec2 pB = vec2(cp.x * 0.3, cp.y) * 1.7 + vec2(uTime * 0.100, 0.0);',
    '    float dB = smoothstep(uCover.y, uCover.y + 0.28, fbm3(pB)) * 0.5;',

    '    float lightAmt = clamp(0.5 + (nA - nS) * 2.4, 0.0, 1.0);',
    '    vec3 cc = mix(uShade, uLit, lightAmt);',
    '    cc = mix(cc, uLit, exp(-gd * gd * 1.1) * 0.5);',

    '    float fade = smoothstep(0.012, 0.08, yy);',
    '    float alpha = clamp((dA + dB * 0.8) * fade, 0.0, 1.0);',
    '    col = mix(col, cc, alpha);',
    '  }',

    /* 수평선 아래 — 옅은 안개 띠 */
    '  float below = smoothstep(0.014, -0.03, yy);',
    '  col = mix(col, mix(col, uHor, 0.5) * 0.95, below);',

    /* 대기 헤이즈 한 겹 + 디더 */
    '  col = mix(col, vec3(1.0), 0.025);',
    '  col += (hash21(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;',

    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  /* ---------- WebGL 준비 ---------- */

  var opts = { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' };
  var gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  if (!gl) return;

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('[sky-gl]', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[sky-gl]', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  function loc(n) { return gl.getUniformLocation(prog, n); }
  var U = {
    res: loc('uRes'), time: loc('uTime'),
    zen: loc('uZen'), up: loc('uUp'), low: loc('uLow'), hor: loc('uHor'),
    lit: loc('uLit'), shade: loc('uShade'), glow: loc('uGlow'),
    gpos: loc('uGlowPos'), gstr: loc('uGlowStr'), cover: loc('uCover')
  };

  /* ---------- 해상도 ---------- */

  var SCALE = 0.8;
  var w = 0, h = 0;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    var nw = Math.max(2, Math.round(canvas.clientWidth * dpr * SCALE));
    var nh = Math.max(2, Math.round(canvas.clientHeight * dpr * SCALE));
    if (nw === w && nh === h) return;
    w = nw; h = nh;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.res, w, h);
  }

  /* ---------- 렌더 ---------- */

  var FRAME = clock.reduce ? 1000 / 10 : 1000 / 30;
  var last = -1e9;
  var t0 = performance.now();
  var lost = false;

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    lost = true;
    skyEl.classList.remove('sky--gl', 'sky--gl-ready');
  });

  var frames = 0;

  function draw(now) {
    frames++;
    var s = clock.palette(clock.progress());

    resize();
    gl.uniform1f(U.time, (now - t0) / 1000);
    gl.uniform3fv(U.zen, s.zen);
    gl.uniform3fv(U.up, s.up);
    gl.uniform3fv(U.low, s.low);
    gl.uniform3fv(U.hor, s.hor);
    gl.uniform3fv(U.lit, s.lit);
    gl.uniform3fv(U.shade, s.shade);
    gl.uniform3fv(U.glow, s.glow);
    gl.uniform2f(U.gpos, s.gpos[0], s.gpos[1]);
    gl.uniform1f(U.gstr, s.gstr);
    gl.uniform2f(U.cover, s.coverA, s.coverB);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop(now) {
    if (lost) return;
    if (now - last >= FRAME) {
      last = now;
      draw(now);
    }
    requestAnimationFrame(loop);
  }

  /* rAF 가 아예 돌지 않는 환경(자신을 백그라운드로 보고하는 임베드 뷰 등)이
     있어서, 한동안 그려지지 않으면 타이머로 대신 그린다.
     일반 브라우저에서는 rAF 가 last 를 계속 갱신하므로 이 경로는 타지 않는다. */
  function watchdog() {
    if (lost) return;
    var now = performance.now();
    if (now - last > 400) {
      last = now;
      draw(now);
    }
  }

  window.SKY_GL = {
    redraw: function () { draw(performance.now()); },
    stats: function () { return { frames: frames, lastDraw: last }; }
  };

  /* ---------- 시작 ---------- */

  // 첫 프레임은 동기로 — 백그라운드 탭에서 로드돼도 하늘이 준비된다
  draw(performance.now());
  skyEl.classList.add('sky--gl');
  setTimeout(function () { skyEl.classList.add('sky--gl-ready'); }, 900);

  // 조건 없이 시작한다. rAF 가 도는 환경이면 rAF 가, 아니면 워치독이 그린다.
  requestAnimationFrame(loop);
  setInterval(watchdog, 200);

  window.addEventListener('resize', function () {
    if (!lost) draw(performance.now());
  });
})();
