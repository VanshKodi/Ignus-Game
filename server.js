const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { WebSocketServer } = require('ws');

const root = path.resolve(__dirname);
const port = Number(process.env.PORT) || 3000;
const rooms = new Map();
const ROOM_CODE_LENGTH = 6;
const ROOM_GRACE_MS = 60_000;
const DURATION_MS = 45_000;
const QUESTIONS_COUNT = 13;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function send(res, status, body, contentType) { res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' }); res.end(body); }
function safeFilePath(urlPath) {
  let decoded; try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  if (decoded === '/') decoded = '/index.html';
  if (decoded === '/host' || decoded === '/host/') decoded = '/host.html';
  const filePath = path.resolve(root, `.${decoded}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) return null;
  return filePath;
}
function questionState() { return { revealed: false, verdict: null, accepted: false, resolved: false, awarded: 0, skipped: false, hintStage: 0 }; }
function defaultState() {
  const qState = {}; for (let i = 0; i < QUESTIONS_COUNT; i++) qState[i] = questionState();
  return { v: 1, rev: 1, updatedAt: Date.now(), phase: 'home', qIndex: 0, timer: { status: 'ready', durationMs: DURATION_MS, startedAt: null, elapsedBefore: 0 }, teams: [{ id: 't1', name: 'TEAM A', score: 0 }, { id: 't2', name: 'TEAM B', score: 0 }, { id: 't3', name: 'TEAM C', score: 0 }, { id: 't4', name: 'TEAM D', score: 0 }], activeTeamId: 't1', qState, sound: true, boardFocus: false, lastAward: null, introRunAt: 0 };
}
function elapsedMs(timer, now = Date.now()) { return (timer.elapsedBefore || 0) + (timer.status === 'running' && timer.startedAt ? now - timer.startedAt : 0); }
function settle(state) {
  if (state.phase === 'cinematic' && state.introRunAt && Date.now() - state.introRunAt >= 5050) {
    state.phase = 'playing';
    state.timer = { status: 'running', durationMs: DURATION_MS, startedAt: Date.now(), elapsedBefore: 0 };
    state.rev++;
    state.updatedAt = Date.now();
    return true;
  }
  if (state.phase === 'playing' && state.timer.status === 'ready') {
    state.timer.startedAt = Date.now();
    state.timer.status = 'running';
    state.rev++;
    state.updatedAt = Date.now();
    return true;
  }
  if (state.phase === 'playing' && state.timer.status === 'running' && elapsedMs(state.timer) >= state.timer.durationMs) { state.timer.elapsedBefore = state.timer.durationMs; state.timer.startedAt = null; state.timer.status = 'up'; state.rev++; state.updatedAt = Date.now(); return true; }
  return false;
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function makeCode() { let code; do { code = ''; for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]; } while (rooms.has(code)); return code; }
function token() { return crypto.randomBytes(24).toString('hex'); }
function snapshot(room) { settle(room.state); return { type: 'state', roomCode: room.code, rev: room.state.rev, state: clone(room.state), playerCount: room.players.size }; }
function sendJson(ws, message) { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message)); }
function broadcast(room) { const message = snapshot(room); if (room.host) sendJson(room.host, message); for (const player of room.players) sendJson(player, message); }
function error(ws, code, message) { sendJson(ws, { type: 'error', code, message }); }
function getRoom(code) { return rooms.get(String(code || '').trim().toUpperCase()); }

function mutate(room, command, args = {}) {
  const s = room.state; const q = () => s.qState[s.qIndex];
  const resetTimer = () => { s.timer = { status: 'ready', durationMs: DURATION_MS, startedAt: null, elapsedBefore: 0 }; if (q()) q().hintStage = 0; };
  switch (command) {
    case 'startGame': s.phase = 'cinematic'; s.introRunAt = Date.now(); s.qIndex = 0; resetTimer(); s.boardFocus = false; s.lastAward = null; Object.keys(s.qState).forEach(i => { s.qState[i] = questionState(); }); break;
    case 'finishCinematic': if (s.phase === 'cinematic') s.phase = 'playing'; resetTimer(); s.boardFocus = false; break;
    case 'startTimer': if (s.timer.status === 'ready') { s.timer.startedAt = Date.now(); s.timer.status = 'running'; } else if (s.timer.status === 'paused') { s.timer.startedAt = Date.now(); s.timer.status = 'running'; } break;
    case 'pauseTimer': if (s.timer.status === 'running') { s.timer.elapsedBefore = elapsedMs(s.timer); s.timer.startedAt = null; s.timer.status = 'paused'; } break;
    case 'resumeTimer': if (s.timer.status === 'paused') { s.timer.startedAt = Date.now(); s.timer.status = 'running'; } break;
    case 'resetTimer': resetTimer(); break;
    case 'bumpHint': if (s.phase === 'playing' && s.timer.status === 'up' && !q().resolved && !q().revealed) q().hintStage = Math.min(3, (q().hintStage || 0) + 1); break;
    case 'goToQuestion': { const idx = Math.max(0, Math.min(QUESTIONS_COUNT - 1, Number(args.index) || 0)); s.qIndex = idx; resetTimer(); s.boardFocus = false; s.lastAward = null; if (s.phase === 'home' || s.phase === 'cinematic' || s.phase === 'complete') s.phase = 'playing'; if (args.clear) s.qState[idx] = questionState(); break; }
    case 'nextQuestion': if (s.qIndex >= QUESTIONS_COUNT - 1) { s.phase = 'complete'; resetTimer(); s.boardFocus = true; } else { s.qIndex++; resetTimer(); s.boardFocus = false; s.lastAward = null; s.qState[s.qIndex] = questionState(); } break;
    case 'prevQuestion': s.qIndex = Math.max(0, s.qIndex - 1); resetTimer(); s.boardFocus = false; s.lastAward = null; s.qState[s.qIndex] = questionState(); break;
    case 'resetCurrentQuestion': s.qState[s.qIndex] = questionState(); resetTimer(); s.lastAward = null; break;
    case 'skipQuestion': q().skipped = true; q().resolved = true; q().revealed = true; if (s.qIndex >= QUESTIONS_COUNT - 1) { s.phase = 'complete'; s.boardFocus = true; } else { s.qIndex++; resetTimer(); s.qState[s.qIndex] = questionState(); } break;
    case 'resetGame': Object.assign(s, defaultState()); break;
    case 'revealAnswer': q().revealed = true; break;
    case 'markVerdict': q().verdict = args.kind === 'correct' ? 'correct' : 'incorrect'; q().revealed = true; q().resolved = true; q().accepted = args.kind === 'correct'; s.boardFocus = true; break;
    case 'awardPoints': { const team = s.teams.find(t => t.id === s.activeTeamId); const delta = Number(args.delta); if (!team || !Number.isFinite(delta)) break; team.score += delta; q().awarded = (q().awarded || 0) + delta; s.lastAward = { teamId: team.id, teamName: team.name, delta, at: Date.now() }; s.boardFocus = true; break; }
    case 'addTeam': { const id = `t${Date.now().toString(36)}`; s.teams.push({ id, name: String(args.name || `TEAM ${String.fromCharCode(65 + s.teams.length)}`).slice(0, 40), score: 0 }); s.activeTeamId = id; break; }
    case 'renameTeam': { const team = s.teams.find(t => t.id === args.id); if (team && args.name) team.name = String(args.name).slice(0, 40); break; }
    case 'deleteTeam': { if (s.teams.length <= 1) break; const i = s.teams.findIndex(t => t.id === args.id); if (i >= 0) { s.teams.splice(i, 1); if (s.activeTeamId === args.id) s.activeTeamId = s.teams[0].id; } break; }
    case 'selectTeam': if (s.teams.some(t => t.id === args.id)) s.activeTeamId = args.id; break;
    case 'toggleSound': s.sound = !s.sound; break;
    case 'setBoardFocus': s.boardFocus = !!args.value; break;
    default: return false;
  }
  s.rev++; s.updatedAt = Date.now(); return true;
}
function removeRoom(room) { if (rooms.get(room.code) !== room) return; rooms.delete(room.code); for (const player of room.players) { sendJson(player, { type: 'error', code: 'ROOM_CLOSED', message: 'The host closed this room.' }); player.close(); } }

const server = http.createServer((req, res) => {
  if (req.url === '/health') { send(res, 200, JSON.stringify({ status: 'ok', rooms: rooms.size }), 'application/json; charset=utf-8'); return; }
  const filePath = safeFilePath((req.url || '/').split('?')[0]);
  if (!filePath) { send(res, 403, 'Forbidden', 'text/plain; charset=utf-8'); return; }
  fs.stat(filePath, (statError, stat) => { if (statError || !stat.isFile()) { send(res, 404, 'Not found', 'text/plain; charset=utf-8'); return; } const contentType = types[path.extname(filePath).toLowerCase()] || 'application/octet-stream'; res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': contentType.startsWith('text/') ? 'no-cache' : 'public, max-age=3600' }); if (req.method === 'HEAD') { res.end(); return; } fs.createReadStream(filePath).pipe(res); });
});
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => { if (new URL(req.url, `http://${req.headers.host}`).pathname !== '/ws') { socket.destroy(); return; } wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws)); });
wss.on('connection', ws => {
  ws.on('message', raw => {
    let message; try { message = JSON.parse(raw.toString()); } catch { error(ws, 'BAD_MESSAGE', 'Invalid message.'); return; }
    if (message.type === 'create_room') { if (ws.room) return error(ws, 'ALREADY_JOINED', 'This connection already belongs to a room.'); const room = { code: makeCode(), hostToken: token(), host: ws, players: new Set(), state: defaultState(), cleanup: null }; rooms.set(room.code, room); ws.room = room; ws.role = 'host'; sendJson(ws, { type: 'room_created', roomCode: room.code, hostToken: room.hostToken }); broadcast(room); return; }
    if (message.type === 'host_reconnect') { const room = getRoom(message.roomCode); if (!room || room.hostToken !== message.hostToken) return error(ws, 'ROOM_NOT_FOUND', 'Room not found or host token is invalid.'); if (room.cleanup) { clearTimeout(room.cleanup); room.cleanup = null; } if (room.host && room.host !== ws) room.host.close(); room.host = ws; ws.room = room; ws.role = 'host'; sendJson(ws, { type: 'room_reconnected', roomCode: room.code }); broadcast(room); return; }
    if (message.type === 'join_room') { const room = getRoom(message.roomCode); if (!room) return error(ws, 'ROOM_NOT_FOUND', 'That room code is not available.'); room.players.add(ws); ws.room = room; ws.role = 'player'; sendJson(ws, { type: 'joined_room', roomCode: room.code }); broadcast(room); return; }
    if (!ws.room) return error(ws, 'NOT_JOINED', 'Join a room first.');
    if (message.type === 'close_room') { if (ws.role !== 'host') return error(ws, 'HOST_ONLY', 'Only the host can close the room.'); const room = ws.room; removeRoom(room); ws.close(); return; }
    if (message.type === 'command') { if (ws.role !== 'host') return error(ws, 'HOST_ONLY', 'Only the host can control the game.'); if (!mutate(ws.room, message.command, message.args)) return error(ws, 'UNKNOWN_COMMAND', 'Unknown game command.'); broadcast(ws.room); }
  });
  ws.on('close', () => { const room = ws.room; if (!room) return; if (ws.role === 'player') { room.players.delete(ws); broadcast(room); return; } if (room.host === ws) { room.host = null; room.cleanup = setTimeout(() => removeRoom(room), ROOM_GRACE_MS); for (const player of room.players) sendJson(player, { type: 'host_offline', message: 'Waiting for the host to reconnect.' }); } });
});
setInterval(() => { for (const room of rooms.values()) if (settle(room.state)) broadcast(room); }, 500);
server.listen(port, '0.0.0.0', () => console.log(`IGNUS Marvel Family Feud listening on port ${port}`));
