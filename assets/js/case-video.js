/* 영상은 autoplay 속성만으로 재생된다. toss.tech 와 같은 구성이다.
   (autoplay muted loop playsinline, controls 없음, preload="metadata", poster 없음)

   이 스크립트는 거들기만 한다.
   - 무음·반복·인라인·컨트롤 없음을 프로퍼티로도 한 번 더 건다.
     (muted 는 속성만으로 늦게 반영되는 브라우저가 있다)
   - 재생이 아직 안 붙었으면 조용히 몇 번 더 play() 를 시도한다.
   - 탭이 다시 보이면 한 번 더 시도한다.
   - 자동재생이 끝내 막히는 환경을 대비해 첫 입력(클릭·터치·키)을 한 번 듣고
     그때 페이지의 영상을 모두 재생시킨다.
   - 브라우저가 자동재생을 막았다고 알려 오면(NotAllowedError, 아이폰 저전력 모드 등)
     그 영상에만 재생 버튼을 띄운다. 재생이 붙는 순간 버튼은 사라진다.
   - prefers-reduced-motion 이면 자동재생을 끄고 처음부터 재생 버튼을 둔다.

   재생이 되는 동안에는 영상 위에 아무것도 덮지 않는다. */
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[data-autoplay]'));
  if (!vids.length) return;

  vids.forEach(function (v) {
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.controls = false;
    v.playsInline = true;
    v.setAttribute('webkit-playsinline', '');  /* iOS 10 이전 */
  });

  /* 자동재생이 막혔을 때만 보이는 재생 버튼. 영상의 부모(.panel)에 얹는다. */
  function button(v) {
    if (v._playBtn) return v._playBtn;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'vplay';
    b.hidden = true;
    b.setAttribute('aria-label', '영상 재생');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
    b.addEventListener('click', function () { start(v); });
    v.addEventListener('playing', function () { b.hidden = true; });
    v.parentNode.appendChild(b);
    v._playBtn = b;
    return b;
  }

  function start(v) {
    var p = v.play();
    if (p && p.catch) p.catch(function (err) {
      /* AbortError 는 로딩이 끼어든 것뿐이라 다음 시도에 맡긴다 */
      if (err && err.name === 'NotAllowedError') button(v).hidden = false;
    });
  }

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    vids.forEach(function (v) {
      v.removeAttribute('autoplay');
      v.pause();
      button(v).hidden = false;
    });
    return;
  }

  function nudge(v) {
    if (!v.paused || document.visibilityState === 'hidden') return;
    start(v);
  }
  function all() { vids.forEach(nudge); }

  vids.forEach(function (v) {
    ['loadeddata', 'canplay', 'canplaythrough'].forEach(function (e) {
      v.addEventListener(e, function () { nudge(v); });
    });
  });

  [0, 500, 1000, 2000, 4000, 8000, 16000].forEach(function (ms) { setTimeout(all, ms); });
  document.addEventListener('visibilitychange', all);

  /* 자동재생이 막힌 환경의 마지막 보루 — 첫 제스처 한 번으로 전부 푼다 */
  var armed = true;
  function unlock() {
    if (!armed) return;
    armed = false;
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (e) {
      document.removeEventListener(e, unlock, true);
    });
    all();
    setTimeout(all, 300);
  }
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (e) {
    document.addEventListener(e, unlock, true);
  });
}());
