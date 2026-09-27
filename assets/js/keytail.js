/* ============================================================
   keytail.js — 네비 전환 / 타이핑 / 캐러셀 / 탭 / 카운트업 / 등장 모션
   ============================================================ */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 네비: 히어로를 지나면 흰 배경으로 ---------- */
  const nav = document.getElementById('nav');
  const hero = document.querySelector('.hero');
  if (nav && hero) {
    // 히어로 하단이 네비에 닿는 순간 흰 배경 + 잉크 텍스트로 전환
    const sync = () => {
      const heroBottom = hero.getBoundingClientRect().bottom;
      nav.classList.toggle('is-solid', heroBottom <= nav.offsetHeight + 40);
    };
    sync();
    addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    addEventListener('load', sync);
  }

  /* ---------- 2. 모바일 시트 ---------- */
  const burger = document.getElementById('burger');
  const sheet = document.getElementById('navSheet');
  if (burger && sheet) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? '메뉴 열기' : '메뉴 닫기');
      sheet.hidden = open;
    });
    sheet.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        burger.setAttribute('aria-expanded', 'false');
        sheet.hidden = true;
      }
    });
  }

  /* ---------- 3. 히어로 검색창 타이핑 ---------- */
  const target = document.getElementById('typeTarget');
  const QUESTIONS = [
    '[추천 질문 1 — 예: 어떤 프로젝트를 했나요?]',
    '[추천 질문 2 — 예: 협업은 어떻게 하나요?]',
    '[추천 질문 3 — 예: 지금 관심 있는 주제는?]'
  ];
  if (target) {
    const caret = document.createElement('span');
    caret.className = 'search__caret';
    caret.textContent = '|';
    const text = document.createTextNode('');
    target.append(text, caret);

    if (reduce) {
      text.data = QUESTIONS[0];
    } else {
      let qi = 0, ci = 0, deleting = false;
      const tick = () => {
        const q = QUESTIONS[qi];
        ci += deleting ? -1 : 1;
        text.data = q.slice(0, ci);
        let wait = deleting ? 26 : 52;
        if (!deleting && ci === q.length) { deleting = true; wait = 1900; }
        else if (deleting && ci === 0) { deleting = false; qi = (qi + 1) % QUESTIONS.length; wait = 420; }
        setTimeout(tick, wait);
      };
      setTimeout(tick, 700);
    }
  }

  /* ---------- 4. 프로젝트 캐러셀 ---------- */
  const rail = document.getElementById('rail');
  if (rail) {
    const prev = document.querySelector('[data-rail="prev"]');
    const next = document.querySelector('[data-rail="next"]');
    const step = () => {
      const card = rail.querySelector('.card');
      const gap = parseFloat(getComputedStyle(rail).columnGap) || 10;
      return card ? card.offsetWidth + gap : 320;
    };
    const sync = () => {
      const max = rail.scrollWidth - rail.clientWidth - 2;
      if (prev) prev.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = rail.scrollLeft >= max;
    };
    prev?.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    next?.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
    rail.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    sync();
  }

  /* ---------- 5. 역할 탭 ---------- */
  const tabs = [...document.querySelectorAll('.tab')];
  const tabCopy = document.getElementById('tabCopy');
  const shotQ = document.querySelector('.shot__q');
  const shotLabel = document.querySelector('.shot__label');
  const TAB_DATA = [
    { copy: '[영역 1 설명 — 두세 줄. 누구를 위해, 어떤 문제를 어떻게 다루는지 적습니다.]', q: '[영역 1 대표 캡션]', label: '[영역 1 이미지 1:1]' },
    { copy: '[영역 2 설명 — 두세 줄.]', q: '[영역 2 대표 캡션]', label: '[영역 2 이미지 1:1]' },
    { copy: '[영역 3 설명 — 두세 줄.]', q: '[영역 3 대표 캡션]', label: '[영역 3 이미지 1:1]' },
    { copy: '[영역 4 설명 — 두세 줄.]', q: '[영역 4 대표 캡션]', label: '[영역 4 이미지 1:1]' },
    { copy: '[영역 5 설명 — 두세 줄.]', q: '[영역 5 대표 캡션]', label: '[영역 5 이미지 1:1]' },
    { copy: '[영역 6 설명 — 두세 줄.]', q: '[영역 6 대표 캡션]', label: '[영역 6 이미지 1:1]' }
  ];
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const i = Number(tab.dataset.tab);
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      });
      const d = TAB_DATA[i];
      if (!d) return;
      if (tabCopy) { tabCopy.style.opacity = '0'; setTimeout(() => { tabCopy.textContent = d.copy; tabCopy.style.opacity = '1'; }, 140); }
      if (shotQ) shotQ.textContent = d.q;
      if (shotLabel) shotLabel.textContent = d.label;
    });
  });
  if (tabCopy) tabCopy.style.transition = 'opacity .28s ease';

  /* ---------- 6. 등장 모션 + 차트 + 카운트업 ---------- */
  document.querySelectorAll('.reveal').forEach((el) => {
    if (el.dataset.delay) el.style.setProperty('--d', el.dataset.delay);
  });
  document.querySelectorAll('.chart__bars span').forEach((b, i) => b.style.setProperty('--i', i));

  const countUp = (el) => {
    const to = Number(el.dataset.count) || 0;
    if (reduce) { el.textContent = to.toLocaleString(); return; }
    const dur = 1200, t0 = performance.now();
    const frame = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-in');
      if (el.id === 'chart') el.querySelectorAll('[data-count]').forEach(countUp);
      if (el.classList.contains('chartcard')) el.querySelectorAll('[data-count]').forEach(countUp);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

  document.querySelectorAll('.reveal, #chart').forEach((el) => io.observe(el));
})();
