/* 영상은 autoplay 속성만으로 재생된다. toss.tech 와 같은 구성이다.
   (preload="metadata", poster 없음, <source> 에 type 없음, 덮개 없음)

   이 스크립트는 거들기만 한다.
   - 재생이 아직 안 붙었으면 조용히 몇 번 더 play() 를 시도한다.
   - 탭이 다시 보이면 한 번 더 시도한다.
   - 자동재생이 끝내 막히는 환경을 대비해 첫 입력(클릭·터치·키)을 한 번 듣고
     그때 페이지의 영상을 모두 재생시킨다. 보이는 버튼은 두지 않는다.
   - prefers-reduced-motion 이면 자동재생을 끈다.

   영상 위에 무엇도 덮지 않는다. 덮개를 깔았더니 재생이 되는지조차 확인할 수
   없었고, 토스와 다른 유일한 지점이기도 했다. */
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[data-autoplay]'));
  if (!vids.length) return;

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    vids.forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); });
    return;
  }

  function nudge(v) {
    if (!v.paused || document.visibilityState === 'hidden') return;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
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
