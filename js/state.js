/* Server-authoritative room store. The public API intentionally mirrors the
   original local store so the host controls and player renderer stay small. */
(function () {
  'use strict';

  var DURATION_MS = 45000;
  var ROOM_KEY = 'ignus-mff-room-v1';
  var isHost = document.body.classList.contains('host');
  var listeners = [], connectionListeners = [], socket = null, reconnectTimer = 0;
  var connection = { status: 'offline', role: isHost ? 'host' : 'player', roomCode: '', playerCount: 0, message: '' };

  function defaultQuestionState() { return { revealed: false, verdict: null, accepted: false, resolved: false, awarded: 0, skipped: false, hintStage: 0 }; }
  function defaultState() {
    var qState = {}; for (var i = 0; i < window.QUESTIONS.length; i++) qState[i] = defaultQuestionState();
    return { v: 1, rev: 0, updatedAt: Date.now(), phase: 'home', qIndex: 0, timer: { status: 'ready', durationMs: DURATION_MS, startedAt: null, elapsedBefore: 0 }, teams: [{ id: 't1', name: 'TEAM A', score: 0 }, { id: 't2', name: 'TEAM B', score: 0 }, { id: 't3', name: 'TEAM C', score: 0 }, { id: 't4', name: 'TEAM D', score: 0 }], activeTeamId: 't1', qState: qState, sound: true, boardFocus: false, lastAward: null, introRunAt: 0 };
  }
  var state = defaultState();
  function emit() { listeners.slice().forEach(function (fn) { fn(state); }); }
  function setConnection(next) { for (var k in next) connection[k] = next[k]; connectionListeners.slice().forEach(function (fn) { fn(connection); }); }
  function emitError(msg) { setConnection({ status: 'error', message: msg }); }
  function wsUrl() { return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'; }
  function savedRoom() { try { return JSON.parse(sessionStorage.getItem(ROOM_KEY) || 'null'); } catch (e) { return null; } }
  function saveRoom(roomCode, hostToken) { try { sessionStorage.setItem(ROOM_KEY, JSON.stringify({ roomCode: roomCode, hostToken: hostToken })); } catch (e) {} }
  function clearRoom() { try { sessionStorage.removeItem(ROOM_KEY); } catch (e) {} }

  function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
    setConnection({ status: 'connecting', message: '' });
    try { socket = new WebSocket(wsUrl()); } catch (e) { setConnection({ status: 'offline', message: 'Unable to connect to the room server.' }); scheduleReconnect(); return; }
    socket.onopen = function () {
      var saved = savedRoom();
      setConnection({ status: 'connected', message: '' });
      if (isHost && saved && saved.hostToken) socket.send(JSON.stringify({ type: 'host_reconnect', roomCode: saved.roomCode, hostToken: saved.hostToken }));
      else if (!isHost && saved && saved.roomCode) socket.send(JSON.stringify({ type: 'join_room', roomCode: saved.roomCode }));
    };
    socket.onmessage = function (event) {
      var msg; try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (msg.type === 'room_created') { saveRoom(msg.roomCode, msg.hostToken); setConnection({ status: 'joined', roomCode: msg.roomCode }); return; }
      if (msg.type === 'room_reconnected' || msg.type === 'joined_room') { saveRoom(msg.roomCode, isHost ? savedRoom().hostToken : ''); setConnection({ status: 'joined', roomCode: msg.roomCode }); return; }
      if (msg.type === 'state' && msg.state && msg.rev >= state.rev) { state = msg.state; setConnection({ status: 'joined', roomCode: msg.roomCode, playerCount: msg.playerCount || 0 }); emit(); return; }
      if (msg.type === 'host_offline') { setConnection({ status: 'disconnected', message: msg.message }); return; }
      if (msg.type === 'error') { if (msg.code === 'ROOM_CLOSED' || msg.code === 'ROOM_NOT_FOUND') clearRoom(); emitError(msg.message); }
    };
    socket.onclose = function () { setConnection({ status: 'disconnected', message: 'Connection lost. Reconnecting…' }); scheduleReconnect(); };
    socket.onerror = function () { setConnection({ status: 'offline', message: 'Room connection failed.' }); };
  }
  function scheduleReconnect() { clearTimeout(reconnectTimer); reconnectTimer = setTimeout(connect, 1500); }
  function send(message) { if (!socket || socket.readyState !== WebSocket.OPEN) { emitError('Not connected to a room.'); return false; } socket.send(JSON.stringify(message)); return true; }
  function command(name, args) { if (!isHost) return false; return send({ type: 'command', command: name, args: args || {} }); }
  function remainingMs(t, now) { var base = t.elapsedBefore || 0; if (t.status === 'running' && t.startedAt) base += (now || Date.now()) - t.startedAt; return Math.max(0, (t.durationMs || DURATION_MS) - base); }
  function elapsedMs(t, now) { return (t.elapsedBefore || 0) + (t.status === 'running' && t.startedAt ? (now || Date.now()) - t.startedAt : 0); }
  function activeTeam() { for (var i = 0; i < state.teams.length; i++) if (state.teams[i].id === state.activeTeamId) return state.teams[i]; return state.teams[0] || null; }

  window.GameStore = {
    DURATION_MS: DURATION_MS, defaultQuestionState: defaultQuestionState,
    get state() { return state; }, get connection() { return connection; },
    subscribe: function (fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    subscribeConnection: function (fn) { connectionListeners.push(fn); fn(connection); return function () { var i = connectionListeners.indexOf(fn); if (i >= 0) connectionListeners.splice(i, 1); }; },
    createRoom: function () { connect(); var wait = setInterval(function () { if (socket && socket.readyState === WebSocket.OPEN) { clearInterval(wait); send({ type: 'create_room' }); } }, 50); setTimeout(function () { clearInterval(wait); }, 5000); },
    joinRoom: function (code) { code = String(code || '').replace(/[^a-z0-9]/gi, '').toUpperCase(); if (code.length !== 6) { emitError('Enter the 6-character room code.'); return false; } saveRoom(code, ''); connect(); var wait = setInterval(function () { if (socket && socket.readyState === WebSocket.OPEN) { clearInterval(wait); send({ type: 'join_room', roomCode: code }); } }, 50); setTimeout(function () { clearInterval(wait); }, 5000); return true; },
    reconnect: function () { if (socket) try { socket.close(); } catch (e) {} connect(); },
    closeRoom: function () { if (isHost) send({ type: 'close_room' }); clearRoom(); },
    leaveRoom: function () { clearRoom(); if (socket) socket.close(); state = defaultState(); setConnection({ status: 'offline', roomCode: '' }); emit(); },
    remainingMs: remainingMs, elapsedMs: elapsedMs,
    settleExpiredTimer: function () { return false; },
    startTimer: function () { command('startTimer'); }, pauseTimer: function () { command('pauseTimer'); }, resumeTimer: function () { command('resumeTimer'); }, resetTimer: function () { command('resetTimer'); }, hintStage: function () { var q = state.qState[state.qIndex]; return q ? q.hintStage || 0 : 0; }, bumpHint: function () { command('bumpHint'); return state.qState[state.qIndex].hintStage || 0; },
    startGame: function () { command('startGame'); }, finishCinematic: function () { command('finishCinematic'); }, goToQuestion: function (i, opts) { command('goToQuestion', { index: i, clear: !!(opts && opts.clear) }); }, nextQuestion: function () { command('nextQuestion'); }, prevQuestion: function () { command('prevQuestion'); }, resetCurrentQuestion: function () { command('resetCurrentQuestion'); }, skipQuestion: function () { command('skipQuestion'); }, resetGame: function () { command('resetGame'); },
    revealAnswer: function () { command('revealAnswer'); }, markVerdict: function (kind) { command('markVerdict', { kind: kind }); }, awardPoints: function (delta) { command('awardPoints', { delta: delta }); },
    activeTeam: activeTeam, addTeam: function (name) { command('addTeam', { name: name }); }, renameTeam: function (id, name) { command('renameTeam', { id: id, name: name }); }, deleteTeam: function (id) { command('deleteTeam', { id: id }); }, selectTeam: function (id) { command('selectTeam', { id: id }); }, setTeamScore: function () {}, toggleSound: function () { command('toggleSound'); }, setBoardFocus: function (v) { command('setBoardFocus', { value: v }); }
  };
  connect();
})();
