/* 화면에 가까워지면 그때 영상을 불러와 재생한다.
   IntersectionObserver 가 뜨지 않는 상황(문서가 숨겨진 채 스크롤되는 등)에도
   동작하도록 위치 계산으로 직접 판단한다. */
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[data-autoplay]'));
  if (!vids.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MARGIN = 200;

  function load(v) {
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    [].forEach.call(v.querySelectorAll('source[data-src]'), function (s) {
      s.src = s.dataset.src;
      s.removeAttribute('data-src');
    });
    v.load();
  }

  function near(v) {
    var r = v.getBoundingClientRect();
    var h = window.innerHeight || document.documentElement.clientHeight;
    return r.bottom > -MARGIN && r.top < h + MARGIN;
  }

  function sync() {
    vids.forEach(function (v) {
      if (near(v)) {
        load(v);
        if (!reduce && v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
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
