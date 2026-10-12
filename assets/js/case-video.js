/* 영상은 autoplay 속성으로 바로 재생된다. 이 스크립트가 하는 일은 두 가지다.

   1) 재생이 실제로 붙었는지 지켜보고, 안 붙으면 다시 시도한다.
   2) 끝내 안 붙으면 포스터 이미지로 바꿔 끼운다.
      사파리는 자동재생을 막으면 화면을 흐리게 깔고 재생 버튼을 얹는다.
      버튼은 CSS 로도 지워두었지만, 멈춘 영상을 두느니 또렷한 정지 화면이 낫다.

   이벤트가 아니라 폴링으로 본다. 자동재생이 잠깐 붙었다가 브라우저가 조용히
   멈추는 경우에는 play() 거부도, error 도 나지 않아서 이벤트만으로는 못 잡는다.

   느린 회선에서 성급하게 정지 화면으로 바꾸지 않도록, 버퍼가 찰 때까지
   (readyState < 3) 는 실패로 세지 않는다.

   화면 밖에서 일시정지하는 로직은 넣지 않는다.
   pause() 를 한 번 부르면 사파리가 그 재생 버튼 오버레이를 띄워버린다. */
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[data-autoplay]'));
  if (!vids.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TICK = 500;      /* 확인 간격 */
  var LIMIT = 8;       /* 준비가 끝난 뒤의 실패 허용 횟수 — 약 4초 */
  var CAP = 60;        /* 전체 상한 — 약 30초. 그 전에 버퍼가 안 차면 포기 */

  /* 영상 자리에 포스터를 그대로 끼운다. 크기와 object-fit 은 클래스가 가지고 있다 */
  function toPoster(v) {
    if (!v.poster || v.getAttribute('data-still') || !v.parentNode) return;
    v.setAttribute('data-still', '1');
    var img = new Image();
    img.className = v.className;
    img.src = v.poster;
    img.alt = v.getAttribute('aria-label') || '';
    img.decoding = 'async';
    if (v.width) img.width = v.width;
    if (v.height) img.height = v.height;
    v.parentNode.replaceChild(img, v);
  }

  vids.forEach(function (v) {
    if (reduce) { v.removeAttribute('autoplay'); v.pause(); toPoster(v); return; }

    var fails = 0, ticks = 0, timer = null, last = -1;

    function hidden() { return document.visibilityState === 'hidden'; }
    function stop() { clearInterval(timer); timer = null; }

    function playing() {
      /* 멈춤 플래그만 믿지 않고 시간이 실제로 흐르는지 본다 */
      if (v.paused || v.ended) return false;
      var t = v.currentTime;
      var moved = t > last;
      last = t;
      return moved || t > 0;
    }

    function attempt() {
      if (!v.parentNode || hidden()) return;
      var p = v.play();
      if (p && p.catch) p.catch(function () { fails++; });
    }

    timer = setInterval(function () {
      if (!v.parentNode) { stop(); return; }
      if (hidden()) return;                 /* 숨겨진 탭은 원래 막힌다 — 세지 않는다 */
      if (++ticks > CAP) { stop(); toPoster(v); return; }

      if (playing()) { stop(); return; }    /* 붙었다 — 할 일 끝 */

      /* 아직 버퍼가 안 찼으면 기다린다 (느린 회선) */
      if (v.readyState < 3) { attempt(); return; }

      if (++fails > LIMIT) { stop(); toPoster(v); return; }
      attempt();
    }, TICK);

    v.addEventListener('error', function () { stop(); toPoster(v); });
    /* <source> 가 전부 실패하면 video 가 아니라 source 에서 error 가 난다 */
    [].slice.call(v.querySelectorAll('source')).forEach(function (s) {
      s.addEventListener('error', function () {
        if (v.networkState === 3 /* NETWORK_NO_SOURCE */) { stop(); toPoster(v); }
      });
    });
    document.addEventListener('visibilitychange', function () { if (!hidden()) attempt(); });

    attempt();
  });
}());
