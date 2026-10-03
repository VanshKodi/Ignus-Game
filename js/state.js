/* MARVEL FAMILY FEUD — SHARED STATE STORE + TIMESTAMP TIMER
   Works over file:// and http:// via localStorage polling + BroadcastChannel. */

(function () {
  'use strict';

  var KEY = 'ignus-mff-state-v1';
  var CHANNEL = 'ignus-mff-v1';
  var DURATION_MS = 45000;

  /* ---------------- default state ---------------- */

  function defaultQuestionState() {
    return {
      revealed: false,      // answer shown on player screen
      verdict: null,        // 'correct' | 'incorrect'
      accepted: false,      // marked correct by the host
      resolved: false,      // QUESTION COMPLETE state
      awarded: 0,           // points awarded for this question
      skipped: false,
      hintStage: 0          // post-timeout hint ladder, 0..window.HINT_STAGES
    };
  }

  function defaultState() {
    var qs = {};
    for (var i = 0; i < window.QUESTIONS.length; i++) qs[i] = defaultQuestionState();

    return {
      v: 1,
      rev: 1,
      updatedAt: Date.now(),
      phase: 'home',            // home | cinematic | playing | complete
      qIndex: 0,
      timer: {
        status: 'ready',        // ready | running | paused | up
        durationMs: DURATION_MS,
        startedAt: null,        // epoch ms of current running segment
        elapsedBefore: 0        // ms already consumed by previous segments
      },
      teams: [
        { id: 't1', name: 'TEAM A', score: 0 },
        { id: 't2', name: 'TEAM B', score: 0 },
        { id: 't3', name: 'TEAM C', score: 0 },
        { id: 't4', name: 'TEAM D', score: 0 }
      ],
      activeTeamId: 't1',
      qState: qs,
      sound: true,
      boardFocus: false,        // scoreboard prominence (between questions / after scoring)
      lastAward: null,          // { teamId, teamName, delta }
      introRunAt: 0             // when the cinematic started (player derives phases from it)
    };
  }

  /* ---------------- storage ---------------- */

  var state = null;
  var listeners = [];
  var memoryOnly = false;

  function readRaw() {
    if (memoryOnly) return null;
    try { return window.localStorage.getItem(KEY); } catch (e) { memoryOnly = true; return null; }
  }

  function writeRaw(s) {
    if (memoryOnly) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { memoryOnly = true; }
  }

  function load() {
    var raw = readRaw();
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1) return null;
      return migrate(parsed);
    } catch (e) {
      return null;
    }
  }

  function migrate(s) {
    var def = defaultState();
    if (!s.qState) s.qState = {};
    for (var i = 0; i < window.QUESTIONS.length; i++) {
      if (!s.qState[i]) s.qState[i] = defaultQuestionState();
      else {
        var d = defaultQuestionState();
        for (var k in d) if (typeof s.qState[i][k] === 'undefined') s.qState[i][k] = d[k];
      }
    }
    if (!s.teams || !s.teams.length) s.teams = def.teams;
    if (!s.activeTeamId) s.activeTeamId = s.teams[0].id;
    if (!s.timer) s.timer = def.timer;
    if (typeof s.sound === 'undefined') s.sound = true;
    if (typeof s.boardFocus === 'undefined') s.boardFocus = false;
    return s;
  }

  state = load() || defaultState();

  /* ---------------- sync ---------------- */

  var bc = null;
  try { bc = new BroadcastChannel(CHANNEL); } catch (e) { bc = null; }
  if (bc) {
    bc.onmessage = function (ev) {
      var s = ev && ev.data;
      if (s && typeof s.rev === 'number' && (!state || s.rev > state.rev)) {
        state = migrate(s);
        emit();
      }
    };
  }

  // polling fallback — reliable across file:// windows where storage events don't fire
  setInterval(function () {
    var raw = readRaw();
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed.rev === 'number' && parsed.rev > state.rev) {
        state = migrate(parsed);
        emit();
      }
    } catch (e) { /* ignore */ }
  }, 220);

  function emit() {
    for (var i = 0; i < listeners.length; i++) listeners[i](state);
  }

  function commit(mutator) {
    mutator(state);
    state.rev = (state.rev || 0) + 1;
    state.updatedAt = Date.now();
    writeRaw(state);
    if (bc) { try { bc.postMessage(state); } catch (e) { /* ignore */ } }
    emit();
  }

  /* ---------------- timer engine (timestamp based) ---------------- */

  function elapsedMs(t, now) {
    var base = t.elapsedBefore || 0;
    if (t.status === 'running' && t.startedAt) base += (now || Date.now()) - t.startedAt;
    return base;
  }

  function remainingMs(t, now) {
    return Math.max(0, (t.durationMs || DURATION_MS) - elapsedMs(t, now));
  }

  function remainingSeconds(t, now) {
    return Math.ceil(remainingMs(t, now) / 1000);
  }

  function startTimer() {
    commit(function (s) {
      if (s.timer.status === 'running') return;
      if (s.timer.status === 'up') return;
      if (s.timer.status === 'paused') {
        s.timer.startedAt = Date.now();
        s.timer.status = 'running';
        return;
      }
      // ready -> running
      s.timer.elapsedBefore = 0;
      s.timer.startedAt = Date.now();
      s.timer.status = 'running';
    });
  }

  function pauseTimer() {
    commit(function (s) {
      if (s.timer.status !== 'running') return;
      s.timer.elapsedBefore = elapsedMs(s.timer, Date.now());
      s.timer.startedAt = null;
      s.timer.status = 'paused';
    });
  }

  function resumeTimer() {
    commit(function (s) {
      if (s.timer.status !== 'paused') return;
      s.timer.startedAt = Date.now();
      s.timer.status = 'running';
    });
  }

  function resetTimer() {
    commit(function (s) {
      s.timer.status = 'ready';
      s.timer.startedAt = null;
      s.timer.elapsedBefore = 0;
      s.qState[s.qIndex].hintStage = 0;
    });
  }

  // called from the rAF loop; idempotent, safe from either window
  function settleExpiredTimer() {
    if (state.phase !== 'playing') return;
    var t = state.timer;
    if (t.status === 'running' && remainingMs(t, Date.now()) <= 0) {
      commit(function (s) {
        if (s.timer.status !== 'running') return;
        s.timer.elapsedBefore = s.timer.durationMs;
        s.timer.startedAt = null;
        s.timer.status = 'up';
      });
      return true; // caller should fire the TIME'S UP cue
    }
    return false;
  }

  /* ---------------- phase / navigation ---------------- */

  function startGame() {
    commit(function (s) {
      s.phase = 'cinematic';
      s.introRunAt = Date.now();
      s.qIndex = 0;
      resetTimerIn(s);
      s.boardFocus = false;
      s.lastAward = null;
      for (var i = 0; i < window.QUESTIONS.length; i++) s.qState[i] = defaultQuestionState();
    });
  }

  function finishCinematic() {
    commit(function (s) {
      if (s.phase === 'cinematic') s.phase = 'playing';
      resetTimerIn(s);
      s.boardFocus = false;
    });
  }

  function resetTimerIn(s) {
    s.timer.status = 'ready';
    s.timer.startedAt = null;
    s.timer.elapsedBefore = 0;
    if (s.qState[s.qIndex]) s.qState[s.qIndex].hintStage = 0;
  }

  /* post-timeout hint ladder — only after the clock hits 00:00 */
  function hintStage() {
    var qs = state.qState[state.qIndex];
    return qs ? (qs.hintStage || 0) : 0;
  }

  function bumpHint() {
    var qs = state.qState[state.qIndex];
    if (!qs) return 0;
    var max = window.HINT_STAGES || 3;
    if (state.phase !== 'playing') return qs.hintStage || 0;
    if (state.timer.status !== 'up') return qs.hintStage || 0;
    if (qs.resolved || qs.revealed) return qs.hintStage || 0;
    if ((qs.hintStage || 0) >= max) return qs.hintStage || 0;
    var next = Math.min(max, (qs.hintStage || 0) + 1);
    commit(function (s) {
      if (s.qState[s.qIndex]) s.qState[s.qIndex].hintStage = next;
    });
    return next;
  }

  function goToQuestion(idx, opts) {
    idx = Math.max(0, Math.min(window.QUESTIONS.length - 1, idx));
    commit(function (s) {
      s.qIndex = idx;
      resetTimerIn(s);
      s.boardFocus = false;
      s.lastAward = null;
      if (s.phase === 'home' || s.phase === 'cinematic') s.phase = 'playing';
      if (s.phase === 'complete') s.phase = 'playing';
      if (opts && opts.clear) s.qState[idx] = defaultQuestionState();
    });
  }

  function nextQuestion() {
    var i = state.qIndex;
    if (i >= window.QUESTIONS.length - 1) {
      commit(function (s) {
        s.phase = 'complete';
        resetTimerIn(s);
        s.boardFocus = true;
      });
      return;
    }
    goToQuestion(i + 1, { clear: true });
  }

  function prevQuestion() { goToQuestion(state.qIndex - 1, { clear: true }); }

  function resetCurrentQuestion() {
    var i = state.qIndex;
    commit(function (s) {
      s.qState[i] = defaultQuestionState();
      resetTimerIn(s);
      s.lastAward = null;
    });
  }

  function skipQuestion() {
    var i = state.qIndex;
    commit(function (s) {
      s.qState[i].skipped = true;
      s.qState[i].resolved = true;
      s.qState[i].revealed = true;
    });
    nextQuestion();
  }

  function resetGame() {
    commit(function (s) {
      var def = defaultState();
      s.phase = 'home';
      s.qIndex = 0;
      s.timer = def.timer;
      s.qState = def.qState;
      s.boardFocus = false;
      s.lastAward = null;
      s.introRunAt = 0;
      for (var i = 0; i < s.teams.length; i++) s.teams[i].score = 0;
    });
  }

  /* ---------------- verdict + reveal ---------------- */

  function revealAnswer() {
    var i = state.qIndex;
    commit(function (s) {
      s.qState[i].revealed = true;
    });
  }

  function markVerdict(kind) { // 'correct' | 'incorrect'
    var i = state.qIndex;
    commit(function (s) {
      s.qState[i].verdict = kind;
      s.qState[i].revealed = true;
      s.qState[i].resolved = true;
      if (kind === 'correct') s.qState[i].accepted = true;
      s.boardFocus = true;
    });
  }

  function awardPoints(delta) {
    var team = activeTeam();
    if (!team) return;
    commit(function (s) {
      var t = null;
      for (var i = 0; i < s.teams.length; i++) if (s.teams[i].id === s.activeTeamId) t = s.teams[i];
      if (!t) return;
      t.score += delta;
      s.qState[s.qIndex].awarded = (s.qState[s.qIndex].awarded || 0) + delta;
      s.lastAward = { teamId: t.id, teamName: t.name, delta: delta, at: Date.now() };
      s.boardFocus = true;
    });
  }

  /* ---------------- teams ---------------- */

  function activeTeam() {
    for (var i = 0; i < state.teams.length; i++) {
      if (state.teams[i].id === state.activeTeamId) return state.teams[i];
    }
    return state.teams[0] || null;
  }

  function addTeam(name) {
    commit(function (s) {
      var id = 't' + Date.now().toString(36);
      s.teams.push({ id: id, name: name || ('TEAM ' + String.fromCharCode(65 + s.teams.length)), score: 0 });
      s.activeTeamId = id;
    });
  }

  function renameTeam(id, name) {
    commit(function (s) {
      for (var i = 0; i < s.teams.length; i++) if (s.teams[i].id === id) s.teams[i].name = name;
    });
  }

  function deleteTeam(id) {
    commit(function (s) {
      if (s.teams.length <= 1) return;
      var idx = -1;
      for (var i = 0; i < s.teams.length; i++) if (s.teams[i].id === id) idx = i;
      if (idx < 0) return;
      s.teams.splice(idx, 1);
      if (s.activeTeamId === id) s.activeTeamId = s.teams[0].id;
    });
  }

  function selectTeam(id) {
    commit(function (s) { s.activeTeamId = id; });
  }

  function setTeamScore(id, score) {
    commit(function (s) {
      for (var i = 0; i < s.teams.length; i++) if (s.teams[i].id === id) s.teams[i].score = score;
    });
  }

  function toggleSound() {
    commit(function (s) { s.sound = !s.sound; });
  }

  function setBoardFocus(v) {
    commit(function (s) { s.boardFocus = !!v; });
  }

  /* ---------------- public API ---------------- */

  window.GameStore = {
    KEY: KEY,
    DURATION_MS: DURATION_MS,
    defaultQuestionState: defaultQuestionState,
    get state() { return state; },
    defaultState: defaultState,
    subscribe: function (fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    commit: commit,
    reload: function () { var s = load(); if (s && s.rev >= state.rev) { state = s; emit(); } },

    remainingMs: remainingMs,
    remainingSeconds: remainingSeconds,
    elapsedMs: elapsedMs,
    settleExpiredTimer: settleExpiredTimer,

    startTimer: startTimer,
    pauseTimer: pauseTimer,
    resumeTimer: resumeTimer,
    resetTimer: resetTimer,
    hintStage: hintStage,
    bumpHint: bumpHint,

    startGame: startGame,
    finishCinematic: finishCinematic,
    goToQuestion: goToQuestion,
    nextQuestion: nextQuestion,
    prevQuestion: prevQuestion,
    resetCurrentQuestion: resetCurrentQuestion,
    skipQuestion: skipQuestion,
    resetGame: resetGame,

    revealAnswer: revealAnswer,
    markVerdict: markVerdict,
    awardPoints: awardPoints,

    activeTeam: activeTeam,
    addTeam: addTeam,
    renameTeam: renameTeam,
    deleteTeam: deleteTeam,
    selectTeam: selectTeam,
    setTeamScore: setTeamScore,
    toggleSound: toggleSound,
    setBoardFocus: setBoardFocus
  };
})();
