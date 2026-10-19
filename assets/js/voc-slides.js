/* VOC Solution 슬라이드 — 피그마 1453:110409 의 화면 1~4 (5장)
   좌우 버튼은 영역을 누르면 나타나고, 바깥을 누르거나 Esc 를 누르면 숨는다(터치도 같다).
   버튼·좌우 스와이프로 넘기며, 끝에서는 처음/마지막으로 이어진다. */
(function () {
  var root = document.querySelector('[data-voc-slides]');
  if (!root) return;
  var track = root.querySelector('[data-voc-track]');
  var n = track.children.length, i = 0;

  function go(k) {
    i = (k + n) % n;
    track.style.transform = 'translateX(' + (-100 * i) + '%)';
  }
  function show(on) { root.classList.toggle('is-controls', on); }

  root.querySelector('[data-voc-prev]').addEventListener('click', function (e) { e.stopPropagation(); go(i - 1); });
  root.querySelector('[data-voc-next]').addEventListener('click', function (e) { e.stopPropagation(); go(i + 1); });
  root.addEventListener('click', function () { show(true); });
  document.addEventListener('click', function (e) { if (!root.contains(e.target)) show(false); });
  root.addEventListener('touchstart', function () { show(true); }, { passive: true });
  document.addEventListener('touchstart', function (e) { if (!root.contains(e.target)) show(false); }, { passive: true });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { show(false); return; }
    if (!root.classList.contains('is-controls')) return;
    if (e.key === 'ArrowLeft') go(i - 1);
    if (e.key === 'ArrowRight') go(i + 1);
  });

  /* 좁은 화면 — 좌우로 밀어서 넘기기 */
  var x0 = null, y0 = null;
  root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  root.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { show(true); go(i + (dx < 0 ? 1 : -1)); }
    x0 = y0 = null;
  });
})();
