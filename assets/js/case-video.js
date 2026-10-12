/* 영상은 autoplay 속성으로 재생된다. 이 스크립트는 거들기만 한다.

   하는 일
   - 재생이 아직 안 붙었으면 조용히 몇 번 더 play() 를 시도한다.
   - 탭이 다시 보이면 한 번 더 시도한다.
   - prefers-reduced-motion 이면 자동재생을 끄고 포스터 정지 화면을 보여준다.
   - 재생할 수 있는 소스가 아예 없을 때(error)만 포스터로 바꿔 끼운다.

   하지 않는 일
   - "자동재생이 안 붙었다"는 이유로 영상을 치우지 않는다.
     이전 판은 4초 뒤 <img> 로 바꿔버렸는데, 사파리 저전력 모드처럼 시작이
     늦어지는 환경에서는 브라우저가 재생하려던 영상을 우리가 먼저 없애는 꼴이
     됐다. 늦게라도 붙을 수 있게 그대로 둔다.
   - 화면 밖에서 pause() 하지 않는다. 한 번 멈추면 사파리가 재생 버튼
     오버레이를 띄운다. */
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[data-autoplay]'));
  if (!vids.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    function nudge() {
      if (!v.parentNode || !v.paused) return;
      if (document.visibilityState === 'hidden') return;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});   /* 거부돼도 영상은 그대로 둔다 */
    }

    v.addEventListener('loadeddata', nudge);
    v.addEventListener('canplay', nudge);
    v.addEventListener('canplaythrough', nudge);
    document.addEventListener('visibilitychange', nudge);

    /* 처음 몇 초 동안만 간격을 두고 다시 시도한다 (1·2·4·8·16초) */
    [0, 1000, 2000, 4000, 8000, 16000].forEach(function (ms) { setTimeout(nudge, ms); });

    /* 재생할 소스가 없을 때만 정지 화면으로 */
    v.addEventListener('error', function () { toPoster(v); });
    [].slice.call(v.querySelectorAll('source')).forEach(function (s) {
      s.addEventListener('error', function () {
        if (v.networkState === 3 /* NETWORK_NO_SOURCE */) toPoster(v);
      });
    });
  });
}());
