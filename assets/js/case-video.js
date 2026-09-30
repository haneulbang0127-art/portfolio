// 케이스 페이지 영상: 화면에 보일 때만 재생하고, 움직임 줄이기 설정이면 포스터로 멈춰 둔다.
// 버튼으로 직접 멈추거나 재생하면 그 선택을 우선한다.
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('video[data-autoplay]').forEach((video) => {
    const btn = video.parentElement.querySelector('.fx__vbtn');
    let inView = false;
    let userChoice = null; // 'play' | 'pause' | null

    // muted 속성만으로는 일부 브라우저에서 자동재생이 막혀 프로퍼티도 함께 켠다
    video.muted = true;

    const shouldPlay = () => {
      if (!inView) return false;
      if (userChoice) return userChoice === 'play';
      return !reduceMotion.matches;
    };

    const syncButton = () => {
      if (!btn) return;
      const paused = video.paused;
      btn.setAttribute('aria-pressed', String(paused));
      btn.setAttribute('aria-label', paused ? '영상 재생' : '영상 일시정지');
    };

    const update = () => {
      if (shouldPlay()) {
        video.play().catch(() => {
          // 자동재생이 막히면(저전력 모드 등) 포스터가 사라진 빈 칸이 남으니, 처음 상태로 되돌려 포스터를 다시 보여 준다
          if (video.currentTime === 0) video.load();
          syncButton();
        });
      } else if (!video.paused) {
        // 멈춘 영상에 pause()를 부르면 preload="none"이어도 로딩이 시작돼 포스터가 첫 프레임으로 바뀐다
        video.pause();
      }
    };

    video.addEventListener('play', syncButton);
    video.addEventListener('pause', syncButton);

    if (btn) {
      btn.hidden = false;
      syncButton();
      btn.addEventListener('click', () => {
        userChoice = video.paused ? 'play' : 'pause';
        update();
      });
    }

    // 화면에 가까워지면 미리 불러온다 — 재생 시작 전까지 포스터가 유지되고, 재생 순간 빈 칸이 생기지 않는다
    const preloader = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        preloader.disconnect();
        if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
          video.preload = 'auto';
          video.load();
        }
      },
      { rootMargin: '600px 0px' }
    );
    preloader.observe(video);

    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        update();
      },
      { threshold: 0.35 }
    ).observe(video);

    reduceMotion.addEventListener('change', update);
  });
})();
