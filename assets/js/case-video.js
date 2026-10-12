/* 영상은 autoplay 속성으로 재생된다. 이 스크립트가 하는 일.

   재생 중이 아닐 때는 영상 위를 포스터(.sol__cover)로 덮는다.
   사파리는 자동재생을 막으면 영상을 흐리게 깔고 가운데에 재생 버튼을 얹는다.
   그 버튼은 UA 섀도우 DOM 이라 CSS 로 확실히 지울 수 없다. 그래서 숨기려
   들지 않고 그냥 위를 덮는다.

   덮개는 지우지 않고 계속 들고 있는다. 재생이 붙으면 걷고, 멈추면 다시 덮는다.
   잠깐 재생됐다가 브라우저가 멈추는 경우에도 흐린 화면이 드러나지 않는다.

   그 밖에
   - 재생이 안 붙었으면 조용히 몇 번 더 play() 를 시도한다. 영상을 지우지는
     않는다. 늦게라도 붙을 수 있기 때문이다.
   - 패널을 누르면 재생을 시도한다. 보이는 버튼은 두지 않는다.
   - prefers-reduced-motion 이면 자동재생을 끄고 덮개를 그대로 둔다. */
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[data-autoplay]'));
  if (!vids.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  vids.forEach(function (v) {
    var panel = v.parentNode;
    var cover = panel ? panel.querySelector('.sol__cover') : null;

    if (reduce) { v.removeAttribute('autoplay'); v.pause(); return; }   /* 덮개 유지 */

    var last = -1;

    function sync() {
      if (!cover) return;
      /* 시간이 실제로 흐르고 있을 때만 걷는다 */
      var t = v.currentTime;
      var running = !v.paused && !v.ended && v.readyState >= 2 && t > 0;
      cover.classList.toggle('is-gone', running);
      last = t;
    }

    function nudge() {
      if (!v.paused || document.visibilityState === 'hidden') return;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});   /* 거부돼도 덮개가 가려 준다 */
      sync();
    }

    ['playing', 'timeupdate', 'pause', 'waiting', 'stalled', 'ended', 'emptied']
      .forEach(function (e) { v.addEventListener(e, sync); });
    ['loadeddata', 'canplay', 'canplaythrough'].forEach(function (e) { v.addEventListener(e, nudge); });
    document.addEventListener('visibilitychange', nudge);

    /* 처음 몇 초 동안 간격을 두고 다시 시도 */
    [0, 500, 1000, 2000, 4000, 8000, 16000].forEach(function (ms) { setTimeout(nudge, ms); });

    /* 눌러서 재생 — 보이는 버튼은 없다 */
    if (panel) panel.addEventListener('click', nudge);

    sync();
  });
}());
