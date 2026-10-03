/* ============================================================
   HOST CONTROL PANEL
   Private surface. Full authority over timer, answers, scoring,
   teams and navigation. Mirrors state to the player screen.
   ============================================================ */

(function () {
  'use strict';

  var Store = window.GameStore;
  var SFX = window.SFX;
  var Q = window.QUESTIONS;
  var pad2 = window.pad2;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------------------------------------------------------
     audio — the host stays quiet while a projector window is
     driving the show, otherwise it becomes the sound source
     --------------------------------------------------------- */
  function playerConnected() { return (Store.connection.playerCount || 0) > 0; }
  function cue(name) {
    if (!Store.state.sound) return;
    if (playerConnected()) return;   // projector owns the audio
    SFX.play(name);
  }

  var toastEl = $('toast');
  var toastTimer = 0;
  function toast(msg, kind) {
    toastEl.textContent = msg;
    toastEl.className = 'toast' + (kind ? ' ' + kind : '');
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2400);
  }

  /* ================= room gate ================= */
  var roomGate = $('host-room-gate');
  var consoleEl = $('main-console');
  var createRoomBtn = $('btn-create-room');
  var reconnectRoomBtn = $('btn-reconnect-room');
  var roomMessage = $('host-room-message');
  var roomCodeEl = $('h-room-code');
  var roomCodeValue = $('h-room-code-value');

  function renderRoomConnection(c) {
    var joined = c.status === 'joined' && !!c.roomCode;
    roomGate.hidden = joined;
    consoleEl.hidden = !joined;
    roomCodeEl.hidden = !joined;
    if (!joined) {
      createRoomBtn.hidden = false;
      createRoomBtn.disabled = false;
    }
    if (joined) {
      roomCodeValue.textContent = c.roomCode;
      roomMessage.textContent = 'Room ready. Share this code with every player screen: ' + c.roomCode;
    } else if (c.status === 'connecting') {
      roomMessage.textContent = 'Connecting to the room server…';
    } else if (c.status === 'connected') {
      roomMessage.textContent = 'Connection ready. Create a room to begin.';
      createRoomBtn.hidden = false;
      createRoomBtn.disabled = false;
    } else if (c.message) {
      roomMessage.textContent = c.message;
      reconnectRoomBtn.hidden = false;
    }
    if (c.status === 'joined') {
      $('h-link-text').textContent = 'PLAYERS · ' + (c.playerCount || 0);
      createRoomBtn.hidden = true;
      reconnectRoomBtn.hidden = true;
    } else if (c.status !== 'connecting') {
      $('h-link-text').textContent = 'ROOM · OFFLINE';
    }
  }
  createRoomBtn.addEventListener('click', function () { createRoomBtn.disabled = true; roomMessage.textContent = 'Creating room…'; Store.createRoom(); });
  reconnectRoomBtn.addEventListener('click', function () { Store.reconnect(); });
  Store.subscribeConnection(renderRoomConnection);

  /* ================= navigator + answer key ================= */
  var navGrid = $('nav-grid');
  var keyList = $('key-list');

  function renderNav(s) {
    var html = '';
    for (var i = 0; i < Q.length; i++) {
      var q = Q[i];
      var qs = s.qState[i];
      var cls = 'nav-btn';
      if (i === s.qIndex) cls += ' current';
      if (qs.skipped) cls += ' skipped';
      else if (qs.resolved) cls += ' done';
      html += '<button class="' + cls + '" data-i="' + i + '" data-round="' + q.round + '" ' +
        'title="' + esc(q.answer) + '">' +
        '<span class="nq">Q' + pad2(q.id) + '</span>' +
        '<span class="nr">' + (q.round === 'image' ? 'IMG' : 'STD') + '</span>' +
        '</button>';
    }
    if (navGrid.innerHTML !== html) navGrid.innerHTML = html;
  }

  navGrid.addEventListener('click', function (e) {
    var btn = e.target.closest('.nav-btn');
    if (!btn) return;
    SFX.unlock();
    Store.goToQuestion(parseInt(btn.getAttribute('data-i'), 10));
    cue('next');
  });

  function renderKey(s) {
    var html = '';
    for (var i = 0; i < Q.length; i++) {
      var q = Q[i];
      html += '<div class="key-row' + (i === s.qIndex ? ' is-current' : '') + '">' +
        '<div class="key-q">Q' + pad2(q.id) + ' · ' + (q.round === 'image' ? 'IMAGE' : 'STANDARD') + ' — ' + esc(q.text) + '</div>' +
        '<div class="key-a">' + esc(q.answer) + '</div>' +
        '<div class="key-alias">ACCEPTS: ' + esc(([q.answer].concat(q.aliases || [])).join(' · ')) + '</div>' +
        '</div>';
    }
    if (keyList.innerHTML !== html) keyList.innerHTML = html;
  }

  /* ================= current question ================= */
  var cText = $('c-text'), cImage = $('c-image'), cAnswer = $('c-answer'), cAliases = $('c-aliases');

  function renderCurrent(s) {
    var q = Q[s.qIndex];
    $('c-index').textContent = 'Q' + pad2(q.id);
    $('c-round').textContent = q.round === 'image' ? 'IMAGE' : 'STANDARD';
    cText.textContent = q.text;
    if (q.image) {
      cImage.hidden = false;
      if (cImage.getAttribute('src') !== q.image) cImage.setAttribute('src', q.image);
      cImage.alt = q.imageAlt || '';
    } else {
      cImage.hidden = true;
      cImage.removeAttribute('src');
    }
    cAnswer.textContent = q.answer;
    cAliases.textContent = (q.aliases || []).join(' · ');
  }

  /* ================= timer ================= */
  var tReadout = $('t-readout'), tTime = $('t-time'), tState = $('t-state');
  var btnStartT = $('btn-start-t'), btnPauseT = $('btn-pause-t'), btnResumeT = $('btn-resume-t'), btnResetT = $('btn-reset-t');

  function renderTimer(s) {
    var t = s.timer;
    var rem = Store.remainingMs(t, Date.now());
    var sec = (t.status === 'ready' || t.status === 'paused')
      ? Store.DURATION_MS / 1000
      : Math.ceil(rem / 1000);
    sec = Math.max(0, Math.min(Store.DURATION_MS / 1000, sec));
    var txt = '00:' + pad2(sec);
    if (tTime.textContent !== txt) tTime.textContent = txt;

    var label = t.status === 'ready' ? 'READY'
      : t.status === 'running' ? 'ACTIVE'
      : t.status === 'paused' ? 'SYSTEM PAUSED'
      : "TIME'S UP";
    if (tState.textContent !== label) tState.textContent = label;
    if (tReadout.getAttribute('data-status') !== t.status) tReadout.setAttribute('data-status', t.status);

    var phase = 'normal';
    if (t.status === 'running') {
      if (rem <= 10000) phase = 'alert';
      else if (rem <= 20000) phase = 'warn';
    } else if (t.status === 'up') phase = 'up';
    else if (t.status === 'paused') phase = 'warn';
    if (tReadout.getAttribute('data-phase') !== phase) tReadout.setAttribute('data-phase', phase);

    btnStartT.textContent = s.phase === 'home' ? 'START FAMILY FEUD' : 'TIMER AUTO-START';
    btnStartT.disabled = s.phase !== 'home';
    btnPauseT.disabled = (t.status !== 'running');
    btnResumeT.disabled = (t.status !== 'paused');
    btnResetT.disabled = (t.status === 'ready');
  }

  btnStartT.addEventListener('click', function () {
    SFX.unlock();
    if (Store.state.phase === 'home' || Store.state.phase === 'cinematic' || Store.state.phase === 'complete') {
      if (Store.state.phase === 'home') { Store.startGame(); return; }
    }
    if (Store.state.phase === 'home') Store.startGame();
  });
  btnPauseT.addEventListener('click', function () { Store.pauseTimer(); cue('pause'); toast('Timer paused'); });
  btnResumeT.addEventListener('click', function () { Store.resumeTimer(); cue('resume'); toast('Timer resumed', 'good'); });
  btnResetT.addEventListener('click', function () { Store.resetTimer(); toast('Timer reset → 00:45 READY'); });

  /* ================= verdict ================= */
  var aVerdict = $('a-verdict'), aAnswerText = $('a-answer-text'), aHint = $('a-hint');
  var btnReveal = $('btn-reveal');
  var btnHint = $('btn-hint'), aHintStage = $('a-hintstage');

  btnReveal.addEventListener('click', function () {
    SFX.unlock();
    Store.revealAnswer();
    cue('reveal');
    toast('Answer revealed on player screen', 'good');
  });

  function giveHint() {
    SFX.unlock();
    var stage = Store.bumpHint();
    if (stage > 0) { cue('hint'); toast('Hint ' + stage + '/' + window.HINT_STAGES + ' sent to the player screen', 'good'); }
    else toast('Hints unlock when the timer hits 00:00', 'bad');
    renderAnswerState(Store.state);
  }

  btnHint.addEventListener('click', giveHint);

  function renderAnswerState(s) {
    var qs = s.qState[s.qIndex];
    var ans = Q[s.qIndex].answer;
    if (aAnswerText.textContent !== ans) aAnswerText.textContent = ans;

    var stage = qs.hintStage || 0;
    var maxStages = window.HINT_STAGES || 3;

    var label = qs.resolved ? 'QUESTION COMPLETE'
      : (s.timer.status === 'up' ? 'TIME\u2019S UP — SCORE THE TEAM' : 'AWAITING ANSWER');
    if (aVerdict.textContent !== label) aVerdict.textContent = label;
    aVerdict.className = 'chip' + (qs.resolved ? ' ok' : '');

    var hint;
    if (qs.resolved) {
      hint = qs.awarded ? 'Awarded ' + (qs.awarded > 0 ? '+' : '') + qs.awarded + ' to the team.'
                        : 'Give the points to whichever team earned it in ASSIGN SCORE.';
    } else if (stage > 0) {
      var stageDetail = stage === 1 ? 'first letters are shown'
        : (stage === 2 ? 'first and last letters are shown' : 'interior letters are shown');
      hint = 'Stage ' + stage + '/' + maxStages + ': ' + stageDetail + ' on the player screen. Select the earning team and assign the points.';
    } else if (s.timer.status === 'up') {
      hint = 'Clock is at 00:00 — GIVE HINT to fix some letters, or reveal the answer.';
    } else {
      hint = 'Select the team that earned the points, then award or deduct them below.';
    }
    if (aHint.textContent !== hint) aHint.textContent = hint;

    var stageTxt = 'STAGE ' + stage + ' / ' + maxStages;
    if (aHintStage.textContent !== stageTxt) aHintStage.textContent = stageTxt;

    btnReveal.disabled = qs.revealed;
    btnHint.disabled = !!qs.resolved || !!qs.revealed ||
      s.timer.status !== 'up' || stage >= maxStages;
  }

  /* ================= navigation ================= */
  var nState = $('n-state');

  $('btn-next').addEventListener('click', function () {
    SFX.unlock(); Store.nextQuestion(); cue('next'); toast('Next question');
  });
  $('btn-prev').addEventListener('click', function () {
    SFX.unlock(); Store.prevQuestion(); cue('next'); toast('Previous question');
  });
  $('btn-reset-q').addEventListener('click', function () {
    SFX.unlock(); Store.resetCurrentQuestion(); Store.resetTimer(); toast('Question reset');
  });
  $('btn-skip').addEventListener('click', function () {
    SFX.unlock(); Store.skipQuestion(); cue('next'); toast('Question skipped', 'bad');
  });

  function renderNavState(s) {
    var qs = s.qState[s.qIndex];
    var txt, cls = 'n-state';
    if (qs.resolved) { txt = 'QUESTION COMPLETE — ' + (qs.awarded ? (qs.awarded > 0 ? '+' : '') + qs.awarded + ' POINTS' : 'NO POINTS ASSIGNED YET'); cls += ' resolved'; }
    else if (s.timer.status === 'up') { txt = "TIME'S UP — SCORE THE TEAM"; cls += ' up'; }
    else if (s.timer.status === 'running') { txt = 'TIMER ACTIVE — HOST IS COUNTING DOWN'; }
    else if (s.timer.status === 'paused') { txt = 'TIMER PAUSED — SYSTEM HOLD'; }
    else { txt = 'READY — TIMER DOES NOT AUTO-START'; }
    if (nState.textContent !== txt) nState.textContent = txt;
    if (nState.className !== cls) nState.className = cls;
  }

  /* ================= teams + scoring ================= */
  var teamList = $('team-list'), activeTeamEl = $('active-team'), teamName = $('team-name');
  var lastAwardEl = $('last-award'), scoreTarget = $('score-target');

  function renderTeams(s) {
    var html = '';
    for (var i = 0; i < s.teams.length; i++) {
      var t = s.teams[i];
      html += '<li><button type="button" class="team-item' + (t.id === s.activeTeamId ? ' active' : '') + '" data-id="' + t.id + '" aria-pressed="' + (t.id === s.activeTeamId ? 'true' : 'false') + '">' +
        '<span class="tick">' + (t.id === s.activeTeamId ? '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : '') + '</span>' +
        '<span class="tn">' + esc(t.name) + '</span>' +
        '<span class="ts">' + t.score + '</span>' +
        '</button></li>';
    }
    if (teamList.innerHTML !== html) teamList.innerHTML = html;

    var a = Store.activeTeam();
    activeTeamEl.textContent = a ? a.name : '—';
    scoreTarget.textContent = a ? ('TARGET · ' + a.name) : '—';
    $('team-count').textContent = s.teams.length + ' TEAMS';

    if (s.lastAward) {
      lastAwardEl.innerHTML = 'Last award: <b>' + esc(s.lastAward.teamName) + ' ' +
        (s.lastAward.delta > 0 ? '+' : '') + s.lastAward.delta + '</b>';
    } else {
      lastAwardEl.textContent = 'No score assigned yet.';
    }
  }

  teamList.addEventListener('click', function (e) {
    var li = e.target.closest('.team-item');
    if (!li) return;
    Store.selectTeam(li.getAttribute('data-id'));
    toast('Active team switched', 'good');
  });

  $('btn-add-team').addEventListener('click', function () {
    var n = teamName.value.trim();
    Store.addTeam(n || undefined);
    teamName.value = '';
    toast('Team added', 'good');
  });
  $('btn-rename-team').addEventListener('click', function () {
    var a = Store.activeTeam();
    if (!a) return;
    var n = teamName.value.trim();
    if (!n) { toast('Type a new name first', 'bad'); return; }
    Store.renameTeam(a.id, n);
    teamName.value = '';
    toast('Team renamed', 'good');
  });
  $('btn-del-team').addEventListener('click', function () {
    var a = Store.activeTeam();
    if (!a) return;
    if (Store.state.teams.length <= 1) { toast('At least one team is required', 'bad'); return; }
    Store.deleteTeam(a.id);
    toast('Team deleted', 'bad');
  });
  teamName.addEventListener('keydown', function (e) { if (e.key === 'Enter') $('btn-add-team').click(); });

  document.querySelectorAll('[data-pts]').forEach(function (b) {
    b.addEventListener('click', function () {
      SFX.unlock();
      var p = parseInt(b.getAttribute('data-pts'), 10);
      Store.awardPoints(p);
      cue('points');
      toast('Awarded +' + p, 'good');
    });
  });
  $('btn-award-custom').addEventListener('click', function () {
    SFX.unlock();
    var p = parseInt($('pts-input').value, 10);
    if (isNaN(p) || p <= 0) { toast('Enter a positive number', 'bad'); return; }
    Store.awardPoints(p); cue('points'); toast('Awarded +' + p, 'good');
  });
  $('btn-deduct-custom').addEventListener('click', function () {
    SFX.unlock();
    var p = parseInt($('pts-input').value, 10);
    if (isNaN(p) || p <= 0) { toast('Enter a positive number', 'bad'); return; }
    Store.awardPoints(-p); cue('incorrect'); toast('Deducted −' + p, 'bad');
  });

  /* ================= header actions ================= */
  var btnSound = $('btn-sound');
  btnSound.addEventListener('click', function () {
    SFX.unlock();
    Store.toggleSound();
  });

  $('btn-player').addEventListener('click', function () {
    try { window.open('index.html', 'ignus-player'); } catch (e) { window.open('index.html'); }
    toast('Player screen opened');
  });

  $('btn-host').addEventListener('click', function () { location.reload(); });

  $('btn-reset-game').addEventListener('click', function () {
    if (!confirm('Reset the whole game back to the home screen? Scores and answers will be cleared.')) return;
    Store.resetGame();
    toast('Game reset', 'bad');
  });
  $('btn-close-room').addEventListener('click', function () {
    if (!confirm('Close this room for all player screens?')) return;
    Store.closeRoom();
    toast('Room closed', 'bad');
  });

  /* ================= keyboard shortcuts ================= */
  window.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    var k = e.key.toLowerCase();
    if (e.code === 'Space') {
      e.preventDefault();
      if (Store.state.timer.status === 'running') { Store.pauseTimer(); cue('pause'); }
      else if (Store.state.timer.status === 'paused') { Store.resumeTimer(); cue('resume'); }
      else if (Store.state.phase === 'home') Store.startGame();
      return;
    }
    if (k === 'r') { Store.revealAnswer(); cue('reveal'); toast('Answer revealed', 'good'); }
    else if (k === 'h') { giveHint(); }
    else if (k === 'n') { Store.nextQuestion(); cue('next'); }
    else if (k === 'p') { Store.prevQuestion(); cue('next'); }
    else if (k === 'c') { Store.markVerdict('correct'); cue('correct'); }
    else if (k === 'x') { Store.markVerdict('incorrect'); cue('incorrect'); }
    else if (k === 's') { Store.startTimer(); cue('start'); }
  });

  /* ================= phase badge + link status ================= */
  var phaseEl = $('h-phase'), linkEl = $('h-link'), linkText = $('h-link-text');
  var lastPhase = null;

  function renderHeader(s) {
    var p = s.phase.toUpperCase();
    if (phaseEl.textContent !== p) phaseEl.textContent = p;
    phaseEl.className = 'chip' + (s.phase === 'playing' ? ' on' : (s.phase === 'complete' ? ' cy' : ''));

    var on = playerConnected();
    var txt = on ? 'PLAYERS · ' + Store.connection.playerCount : (Store.connection.status === 'joined' ? 'PLAYERS · NONE' : 'ROOM · OFFLINE');
    if (linkText.textContent !== txt) linkText.textContent = txt;
    linkEl.className = 'chip ' + (on ? 'on' : 'bad');
    if (s.sound) btnSound.textContent = playerConnected() ? 'SOUND ON (PLAYER)' : 'SOUND ON';
    else btnSound.textContent = 'SOUND OFF';
    btnSound.className = 'btn btn-sm ' + (s.sound ? 'btn-cy' : 'btn-ghost');
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ================= render loop ================= */
  var startGameArmed = false;

  function render() {
    var s = Store.state;

    if (s.phase !== lastPhase) {
      if (lastPhase === null && s.phase !== 'home') startGameArmed = true;
      lastPhase = s.phase;
      if (s.phase === 'cinematic') toast('Cinematic running on the player screen…', 'good');
    }

    renderNav(s);
    renderKey(s);
    renderCurrent(s);
    renderTimer(s);
    renderAnswerState(s);
    renderNavState(s);
    renderTeams(s);
    renderHeader(s);

    // the START button doubles as the game launcher while on the home screen
    if (s.phase === 'home') {
      btnStartT.textContent = 'START FAMILY FEUD';
      btnStartT.disabled = false;
    } else {
      btnStartT.textContent = 'START TIMER';
    }
  }

  Store.subscribe(render);
  render();

  /* expired timer settles here too — the projector may be closed */
  var lastUp = false;
  (function loop() {
    var up = Store.settleExpiredTimer();
    if (up && !lastUp) cue('timesup');
    lastUp = !!up;
    renderTimer(Store.state);
    renderHeader(Store.state);
    requestAnimationFrame(loop);
  })();

  /* any key press unlocks Web Audio on this window */
  ['pointerdown', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function once() { SFX.unlock(); window.removeEventListener(ev, once); }, { once: true });
  });
})();
