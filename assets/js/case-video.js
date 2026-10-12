/* 영상은 autoplay 속성으로 바로 재생된다.
   여기서는 화면 밖으로 나가면 멈추고 다시 들어오면 이어서 재생해
   보이지 않는 동안 디코딩이 도는 것을 막는다. */
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[data-autoplay]'));
  if (!vids.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { vids.forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); }); return; }

  var MARGIN = 200;
  function near(v) {
    var r = v.getBoundingClientRect();
    var h = window.innerHeight || document.documentElement.clientHeight;
    return r.bottom > -MARGIN && r.top < h + MARGIN;
  }

  function sync() {
    vids.forEach(function (v) {
      if (near(v)) {
        if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      } else if (!v.paused) {
        v.pause();
      }
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
  sync();
})();
