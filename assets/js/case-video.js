/* Solution 패널의 모션은 애니메이션 WebP 이미지다.

   비디오 요소를 쓰지 않는 이유.
   사파리·iOS 는 자동재생을 정책으로 막는 경우가 있어(저전력 모드 등) 영상이
   멈춘 채 흐린 화면과 재생 버튼이 남는다. 그 버튼은 UA 섀도우 DOM 이라
   CSS 로 확실히 지울 수도 없다. 이미지는 그 정책의 대상이 아니라 언제나
   움직이고, 버튼도 생기지 않는다.

   그래서 이 스크립트가 할 일은 하나뿐이다.
   prefers-reduced-motion 을 켠 사용자에게는 움직이지 않는 정지본으로 바꾼다.
   애니메이션 이미지는 멈출 수 없으므로 아예 다른 파일로 교체한다. */
(function () {
  var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!mq) return;

  function apply() {
    var imgs = [].slice.call(document.querySelectorAll('img.sol__anim[data-still]'));
    imgs.forEach(function (img) {
      var still = img.getAttribute('data-still');
      var moving = img.getAttribute('data-moving') || img.getAttribute('src');
      if (!img.getAttribute('data-moving')) img.setAttribute('data-moving', moving);
      var want = mq.matches ? still : img.getAttribute('data-moving');
      if (img.getAttribute('src') !== want) img.setAttribute('src', want);
    });
  }

  apply();
  if (mq.addEventListener) mq.addEventListener('change', apply);
  else if (mq.addListener) mq.addListener(apply);
}());
