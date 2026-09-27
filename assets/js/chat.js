/* ============================================================
   chat.js — 면접관용 질의응답 인터페이스
   답변 데이터는 data/answers.js 에서 가져온다.
   ============================================================ */

(function () {
  'use strict';

  var form = document.getElementById('composer');
  var input = document.getElementById('composerInput');
  var send = document.getElementById('composerSend');
  var reset = document.getElementById('composerReset');
  var chips = document.getElementById('chips');
  var list = document.getElementById('chatList');
  var scroll = document.getElementById('chatScroll');

  if (!form || !input || !list) return;

  var DATA = window.HANEUL_ANSWERS || { fallback: '답변 데이터를 불러오지 못했어요.', entries: [] };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var busy = false;
  var typeRAF = null;
  var fillRAF = null;

  /* ---------- 유틸 ---------- */

  function autoGrow() {
    // height 를 0 으로 눌러 실제 콘텐츠 높이를 정확히 측정한다
    input.style.height = '0px';
    input.style.height = Math.min(input.scrollHeight, 132) + 'px';
  }

  function syncSend() {
    send.disabled = busy || input.value.trim().length === 0;
  }

  function toBottom() {
    if (!scroll) return;
    scroll.scrollTo({ top: scroll.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function startChat() {
    if (document.body.classList.contains('is-chatting')) return;
    document.body.classList.add('is-chatting');
    if (reset) reset.hidden = false;
  }

  /* ---------- 메시지 ---------- */

  function addUser(text) {
    var li = document.createElement('li');
    li.className = 'msg msg--user';

    var bubble = document.createElement('div');
    bubble.className = 'msg__bubble';
    bubble.textContent = text;

    li.appendChild(bubble);
    list.appendChild(li);
    toBottom();
  }

  function addBotShell() {
    var li = document.createElement('li');
    li.className = 'msg msg--bot';

    var avatar = document.createElement('div');
    avatar.className = 'msg__avatar';
    avatar.setAttribute('aria-hidden', 'true');

    var bubble = document.createElement('div');
    bubble.className = 'msg__bubble';
    bubble.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';

    li.appendChild(avatar);
    li.appendChild(bubble);
    list.appendChild(li);
    toBottom();

    return bubble;
  }

  /* ---------- 답변 찾기 ---------- */

  function findAnswer(question) {
    var q = question.toLowerCase().replace(/\s+/g, '');
    var entries = DATA.entries || [];

    for (var i = 0; i < entries.length; i++) {
      var kws = entries[i].keywords || [];
      for (var j = 0; j < kws.length; j++) {
        if (q.indexOf(String(kws[j]).toLowerCase().replace(/\s+/g, '')) > -1) {
          return entries[i].answer;
        }
      }
    }
    return DATA.fallback;
  }

  /* ---------- 답변 출력 (타이핑) ---------- */

  function typeOut(el, text, done) {
    if (reduceMotion) {
      el.textContent = text;
      if (done) done();
      return;
    }

    el.textContent = '';

    // 시간 기반 진행 — 프레임이 밀려도 총 소요시간이 일정하다
    var cps = text.length > 220 ? 150 : 110; // 초당 글자 수
    var t0 = performance.now();

    (function step(now) {
      var shown = Math.min(Math.round(((now - t0) / 1000) * cps), text.length);
      if (el.textContent.length !== shown) {
        el.textContent = text.slice(0, shown);
        toBottom();
      }

      if (shown < text.length) {
        typeRAF = requestAnimationFrame(step);
      } else {
        typeRAF = null;
        if (done) done();
      }
    })(t0);
  }

  function respond(question) {
    var bubble = addBotShell();
    var answer = findAnswer(question);
    var wait = 480 + Math.random() * 420;

    setTimeout(function () {
      typeOut(bubble, answer, function () {
        busy = false;
        syncSend();
      });
    }, reduceMotion ? 0 : wait);
  }

  /* ---------- 전송 ---------- */

  function submit() {
    var text = input.value.trim();
    if (!text || busy) return;

    busy = true;
    startChat();
    addUser(text);

    input.value = '';
    autoGrow();
    syncSend();

    if (chips) {
      Array.prototype.forEach.call(chips.children, function (c) {
        c.classList.remove('is-picked');
      });
    }

    respond(text);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submit();
  });

  input.addEventListener('input', function () {
    autoGrow();
    syncSend();
  });

  input.addEventListener('keydown', function (e) {
    var isEnter = e.key === 'Enter' || e.keyCode === 13;
    if (isEnter && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      submit();
    }
  });

  /* ---------- 추천 질문 → 자동 입력 ---------- */

  function fill(text, chip) {
    if (busy) return;

    if (fillRAF) cancelAnimationFrame(fillRAF);

    if (chips) {
      Array.prototype.forEach.call(chips.children, function (c) {
        c.classList.toggle('is-picked', c === chip);
      });
    }

    input.focus({ preventScroll: true });

    if (reduceMotion) {
      input.value = text;
      autoGrow();
      syncSend();
      return;
    }

    input.value = '';

    var cps = 38; // 초당 글자 수
    var t0 = performance.now();

    (function step(now) {
      var shown = Math.min(Math.round(((now - t0) / 1000) * cps), text.length);

      if (input.value.length !== shown) {
        input.value = text.slice(0, shown);
        autoGrow();
        syncSend();
      }

      if (shown < text.length) {
        fillRAF = requestAnimationFrame(step);
      } else {
        fillRAF = null;
        input.setSelectionRange(text.length, text.length);
      }
    })(t0);
  }

  if (chips) {
    chips.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      fill(chip.dataset.q || chip.textContent.trim(), chip);
    });
  }

  /* ---------- 초기화 ---------- */

  if (reset) {
    reset.addEventListener('click', function () {
      if (fillRAF) cancelAnimationFrame(fillRAF);
      if (typeRAF) cancelAnimationFrame(typeRAF);
      busy = false;
      list.innerHTML = '';
      input.value = '';
      autoGrow();
      syncSend();
      document.body.classList.remove('is-chatting');
      reset.hidden = true;

      if (chips) {
        Array.prototype.forEach.call(chips.children, function (c) {
          c.classList.remove('is-picked');
        });
      }
    });
  }

  /* ---------- 인사말 ---------- */

  if (DATA.greeting) {
    startChat();
    typeOut(addBotShell(), DATA.greeting);
  }

  autoGrow();
  syncSend();

  // 웹폰트 로드 후 한 번 더 맞춘다
  requestAnimationFrame(autoGrow);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(autoGrow);
  }
  window.addEventListener('resize', autoGrow);
})();
