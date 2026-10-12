/* 영상은 autoplay 속성으로 바로 재생된다. 이 스크립트가 하는 일은 두 가지다.

   1) 재생을 몇 번 더 밀어준다.
      데이터가 덜 찼을 때 play() 가 거부되는 일이 있어 잠깐 간격으로 재시도한다.

   2) 끝내 거부되면 포스터 이미지로 바꿔 끼운다.
      사파리는 자동재생을 막으면 화면을 흐리게 깔고 재생 버튼을 얹는다.
      버튼 자체는 CSS 로 지워두었지만, 흐려진 채 멈춘 영상을 두느니
      또렷한 정지 화면을 보여주는 편이 낫다.
      prefers-reduced-motion 을 켠 사용자에게도 같은 정지 화면을 준다.

   화면 밖에서 일시정지하는 로직은 넣지 않는다.
   pause() 를 한 번 부르면 사파리가 그 재생 버튼 오버레이를 띄워버린다.

   탭이 숨겨져 있으면 어느 브라우저든 자동재생을 막는다.
   그건 거부로 치지 않고, 다시 보일 때 재시도한다. */
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[data-autoplay]'));
  if (!vids.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GAP = 400;      /* 재시도 간격 */
  var LIMIT = 8;      /* 화면이 보이는 동안의 재시도 횟수 — 약 3초 */

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

    var denied = 0;
    var pending = null;

    function hidden() { return document.visibilityState === 'hidden'; }

    function attempt() {
      if (!v.parentNode || !v.paused) return;
      if (hidden()) return;                 /* 숨겨진 탭은 원래 막힌다 — 거부로 세지 않는다 */
      var p = v.play();
      if (!p || !p.catch) return;
      p.catch(function () {
        if (hidden()) return;
        if (++denied >= LIMIT) { toPoster(v); return; }
        clearTimeout(pending);
        pending = setTimeout(attempt, GAP);
      });
    }

    v.addEventListener('loadeddata', attempt);
    v.addEventListener('canplay', attempt);
    v.addEventListener('playing', function () { denied = 0; clearTimeout(pending); });
    v.addEventListener('error', function () { toPoster(v); });
    /* <source> 가 전부 실패하면 video 가 아니라 source 에서 error 가 난다 */
    [].slice.call(v.querySelectorAll('source')).forEach(function (s) {
      s.addEventListener('error', function () {
        if (v.networkState === 3 /* NETWORK_NO_SOURCE */) toPoster(v);
      });
    });
    document.addEventListener('visibilitychange', function () { denied = 0; attempt(); });

    attempt();
  });
}());
