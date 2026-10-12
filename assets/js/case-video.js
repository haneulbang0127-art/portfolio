/* 영상은 autoplay 속성으로 바로 재생된다.
   여기서는 두 가지만 거든다.
   1) 화면 밖으로 나가면 멈추고 다시 들어오면 이어서 재생해
      보이지 않는 동안 디코딩이 도는 것을 막는다.
   2) Safari 저전력 모드처럼 자동재생이 거부되는 환경에서는
      사용자의 첫 입력 때 한 번 더 재생을 시도한다. */
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[data-autoplay]'));
  if (!vids.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    vids.forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); });
    return;
  }

  var MARGIN = 200;
  var blocked = false;           /* 자동재생이 거부된 적이 있는가 */

  function near(v) {
    var r = v.getBoundingClientRect();
    var h = window.innerHeight || document.documentElement.clientHeight;
    return r.bottom > -MARGIN && r.top < h + MARGIN;
  }

  function tryPlay(v) {
    var p = v.play();
    if (p && p.catch) p.catch(function () { blocked = true; armGesture(); });
  }

  function sync() {
    vids.forEach(function (v) {
      if (near(v)) { if (v.paused) tryPlay(v); }
      else if (!v.paused) v.pause();
    });
  }

  /* 첫 입력 한 번만 듣는다 — 거부됐을 때만 건다 */
  var armed = false;
  function onGesture() {
    armed = false;
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (e) {
      document.removeEventListener(e, onGesture);
    });
    vids.forEach(function (v) { if (near(v) && v.paused) v.play().catch(function () {}); });
  }
  function armGesture() {
    if (armed) return;
    armed = true;
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (e) {
      document.addEventListener(e, onGesture, { once: true, passive: true });
    });
  }

  /* rAF 는 문서가 숨겨지면 멈춘다 — setTimeout 으로 스로틀한다 */
  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    setTimeout(function () { queued = false; sync(); }, 80);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('visibilitychange', sync);
  vids.forEach(function (v) { v.addEventListener('canplay', function () { if (near(v) && v.paused) tryPlay(v); }); });
  sync();
}());
