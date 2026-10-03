/* ============================================================
   PLAYER / PROJECTOR SCREEN
   Renders home → cinematic → questions → final results.
   Holds no host controls and never renders answers until the
   host has explicitly revealed them.
   ============================================================ */

(function () {
  'use strict';

  var Store = window.GameStore;
  var SFX = window.SFX;
  var Q = window.QUESTIONS;
  var pad2 = window.pad2;

  var $ = function (id) { return document.getElementById(id); };
  function roundLabel(round) { return window.ROUND_LABEL[round] || 'STANDARD'; }

  var screens = {
    home: $('screen-home'),
    cinematic: $('screen-cinematic'),
    playing: $('screen-game'),
    complete: $('screen-complete')
  };

  /* Room connection is managed by GameStore; this screen is read-only. */

  /* ---------------------------------------------------------
     audio gating — the projector plays the show; the host
     panel stays silent while a projector is connected
     --------------------------------------------------------- */
  function soundOn() { return !!Store.state.sound; }
  function cue(name) { if (soundOn()) SFX.play(name); }

  /* ---------------------------------------------------------
     screen switching
     --------------------------------------------------------- */
  function showScreen(name) {
    for (var k in screens) {
      if (!screens.hasOwnProperty(k)) continue;
      var el = screens[k];
      var on = (k === name);
      el.hidden = !on;
      el.classList.toggle('on', on);
    }
    document.body.setAttribute('data-phase', name);
  }

  /* ---------------------------------------------------------
     HOME
     --------------------------------------------------------- */
  var roomCodeInput = $('room-code');
  var joinRoomButton = $('btn-join-room');
  var roomJoinMessage = $('room-join-message');
  joinRoomButton.addEventListener('click', function () {
    var code = roomCodeInput.value.trim();
    if (Store.joinRoom(code)) { joinRoomButton.disabled = true; roomJoinMessage.textContent = 'Connecting to room ' + code.toUpperCase() + '…'; }
  });
  roomCodeInput.addEventListener('input', function () { roomCodeInput.value = roomCodeInput.value.replace(/[^a-z0-9]/gi, '').toUpperCase(); });
  roomCodeInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') joinRoomButton.click(); });
  Store.subscribeConnection(function (c) {
    var joined = c.status === 'joined' && !!c.roomCode;
    if (joined) { roomCodeInput.value = c.roomCode; roomJoinMessage.textContent = 'ROOM ' + c.roomCode + ' LINKED · WAITING FOR HOST'; joinRoomButton.disabled = true; }
    else if (c.status === 'connecting') roomJoinMessage.textContent = 'Connecting to the room server…';
    else if (c.status === 'connected') { roomJoinMessage.textContent = 'Ask the host for the six-character room code.'; joinRoomButton.disabled = false; }
    else if (c.message) { roomJoinMessage.textContent = c.message; joinRoomButton.disabled = false; }
    $('home-status-text').textContent = joined ? 'ROOM ' + c.roomCode + ' LINKED' : 'ROOM LINK STANDBY';
  });
  $('btn-open-host').addEventListener('click', function () {
    try { window.open('host.html', 'ignus-host'); } catch (e) { location.href = 'host.html'; }
  });

  /* =========================================================
     CINEMATIC — Clique network activation
     Recreated with canvas particles + the high-res CLIQUE
     logo asset. No stretched GIF. ~5.0s total.
     ========================================================= */
  var CINE = {
    P1: 0, P1_END: 600,          // system initialisation
    P2: 600, P2_END: 1450,       // protocol detected — particles converge
    P3: 1450, P3_END: 2250,      // energy build
    P4: 2250, P4_END: 3300,      // logo materialisation
    P5: 3300, P5a: 3300, P5b: 3750, P5c: 4200,
    OUT: 4750, END: 5050
  };

  var fx = $('fx-canvas');
  var fctx = fx.getContext('2d');
  var copyEl = $('cine-copy');
  var progressEl = $('cine-progress');
  var lines = copyEl.querySelectorAll('.cine-line');

  var logoImg = new Image();
  logoImg.src = 'assets/clique-logo-alpha.png';

  var W = 0, H = 0, DPR = 1;
  var particles = [];
  var targets = [];
  var logoReady = false;
  var logoTargetsReady = false;
  var startAt = 0;
  var cineRaf = 0;
  var lastLine = -1;
  var logoBox = { w: 0, h: 0, x: 0, y: 0 };
  var sparks = [];
  var nodes = [];

  function sizeCanvas() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = fx.clientWidth; H = fx.clientHeight;
    fx.width = Math.max(1, Math.round(W * DPR));
    fx.height = Math.max(1, Math.round(H * DPR));
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layoutLogo();
  }

  function layoutLogo() {
    var w = Math.max(250, Math.min(350, W * 0.19));
    var h = w; // source is square
    logoBox = { w: w, h: h, x: (W - w) / 2, y: (H - h) / 2 - H * 0.03 };
  }

  /* sample the real logo asset into particle targets */
  function buildTargets() {
    if (!logoReady || logoTargetsReady) return;
    var N = 320;
    var oc = document.createElement('canvas');
    oc.width = N; oc.height = N;
    var octx = oc.getContext('2d', { willReadFrequently: true });
    try {
      octx.drawImage(logoImg, 0, 0, N, N);
      var data = octx.getImageData(0, 0, N, N).data;
      targets = [];
      var step = 2;
      for (var y = 0; y < N; y += step) {
        for (var x = 0; x < N; x += step) {
          var i = (y * N + x) * 4;
          var lum = Math.max(data[i], data[i + 1], data[i + 2]);
          if (lum > 46) {
            targets.push([
              logoBox.x + (x / N) * logoBox.w,
              logoBox.y + (y / N) * logoBox.h
            ]);
          }
        }
      }
      logoTargetsReady = targets.length > 80;
    } catch (e) {
      logoTargetsReady = false;
    }
  }

  function seedScene() {
    particles = [];
    var count = W < 900 ? 520 : 1050;
    var cx = W / 2, cy = H / 2;
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var r = Math.max(W, H) * (0.42 + Math.random() * 0.55);
      particles.push({
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        tx: cx, ty: cy,
        ox: cx + Math.cos(a) * r,
        oy: cy + Math.sin(a) * r,
        vx: 0, vy: 0,
        size: 0.7 + Math.random() * 1.9,
        hue: Math.random(),
        d: Math.random(),
        assigned: false
      });
    }

    // faint circuit nodes / technical traces
    nodes = [];
    for (var n = 0; n < 26; n++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        len: 40 + Math.random() * 190,
        horiz: Math.random() > 0.5,
        p: Math.random(),
        sp: 0.15 + Math.random() * 0.5
      });
    }

    sparks = [];
    for (var s = 0; s < 40; s++) {
      sparks.push({ x: Math.random() * W, y: Math.random() * H, a: Math.random(), sp: 0.2 + Math.random() * 0.8 });
    }
  }

  function assignTargets() {
    if (!logoTargetsReady) return;
    for (var i = 0; i < particles.length; i++) {
      var t = targets[i % targets.length];
      particles[i].tx = t[0] + (Math.random() - 0.5) * 2.4;
      particles[i].ty = t[1] + (Math.random() - 0.5) * 2.4;
      particles[i].assigned = true;
    }
  }

  function setLine(idx) {
    if (idx === lastLine) return;
    lastLine = idx;
    for (var i = 0; i < lines.length; i++) {
      var el = lines[i];
      el.classList.remove('show', 'hide');
      if (i === idx) {
        void el.offsetWidth;
        el.classList.add('show');
      } else if (i < idx) {
        void el.offsetWidth;
        el.classList.add('hide');
      }
    }
  }

  var cued = {};
  function cineCue(name) {
    if (cued[name]) return;
    cued[name] = true;
    cue(name);
  }

  function drawCine(t) {
    var cx = W / 2, cy = H / 2;
    fctx.clearRect(0, 0, W, H);

    // base
    var bg = fctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75);
    bg.addColorStop(0, '#070a0d');
    bg.addColorStop(1, '#010203');
    fctx.fillStyle = bg;
    fctx.fillRect(0, 0, W, H);

    var pAll = Math.min(1, t / CINE.END);

    /* ---- technical grid (phase 1) ---- */
    var gridA = Math.min(1, t / 520) * 0.5;
    fctx.save();
    fctx.globalAlpha = gridA * (t > CINE.P5 ? Math.max(0, 1 - (t - CINE.P5) / 900) : 1);
    fctx.strokeStyle = 'rgba(90,190,235,0.10)';
    fctx.lineWidth = 1;
    var gs = 66;
    fctx.beginPath();
    for (var gx = (W % gs) / 2; gx < W; gx += gs) { fctx.moveTo(gx, 0); fctx.lineTo(gx, H); }
    for (var gy = (H % gs) / 2; gy < H; gy += gs) { fctx.moveTo(0, gy); fctx.lineTo(W, gy); }
    fctx.stroke();
    fctx.restore();

    /* ---- circuit traces ---- */
    fctx.save();
    for (var i = 0; i < nodes.length; i++) {
      var nd = nodes[i];
      var grow = Math.min(1, Math.max(0, (t - 80) / 900));
      fctx.globalAlpha = 0.3 * grow * (1 - Math.max(0, (t - CINE.P4) / 1600));
      fctx.strokeStyle = 'rgba(120,215,245,0.85)';
      fctx.lineWidth = 1;
      var L = nd.len * grow;
      fctx.beginPath();
      if (nd.horiz) { fctx.moveTo(nd.x, nd.y); fctx.lineTo(nd.x + L, nd.y); }
      else { fctx.moveTo(nd.x, nd.y); fctx.lineTo(nd.x, nd.y + L); }
      fctx.stroke();
      fctx.fillStyle = 'rgba(140,230,255,0.95)';
      fctx.beginPath();
      fctx.arc(nd.horiz ? nd.x + L : nd.x, nd.horiz ? nd.y : nd.y + L, 2, 0, Math.PI * 2);
      fctx.fill();
    }
    fctx.restore();

    /* ---- energy core (phase 3+) ---- */
    if (t > CINE.P3 - 300) {
      var coreP = Math.min(1, Math.max(0, (t - (CINE.P3 - 300)) / 900));
      var coreFade = t > CINE.P5 ? Math.max(0, 1 - (t - CINE.P5) / 700) : 1;
      var rr = 30 + coreP * 150;
      var pulse = 1 + Math.sin(t / 150) * 0.07;
      fctx.save();
      fctx.globalCompositeOperation = 'lighter';
      var core = fctx.createRadialGradient(cx, cy, 0, cx, cy, rr * pulse);
      core.addColorStop(0, 'rgba(200,245,255,' + (0.5 * coreP * coreFade) + ')');
      core.addColorStop(0.35, 'rgba(60,185,235,' + (0.28 * coreP * coreFade) + ')');
      core.addColorStop(1, 'rgba(30,110,180,0)');
      fctx.fillStyle = core;
      fctx.beginPath(); fctx.arc(cx, cy, rr * pulse, 0, Math.PI * 2); fctx.fill();

      // expanding rings
      for (var rI = 0; rI < 3; rI++) {
        var ph = ((t / 900) + rI / 3) % 1;
        fctx.globalAlpha = (1 - ph) * 0.5 * coreP * coreFade;
        fctx.strokeStyle = 'rgba(120,220,255,0.9)';
        fctx.lineWidth = 1.4;
        fctx.beginPath();
        fctx.arc(cx, cy, 20 + ph * 240, 0, Math.PI * 2);
        fctx.stroke();
      }
      fctx.restore();
    }

    /* ---- particles ---- */
    var conv = Math.min(1, Math.max(0, (t - CINE.P2) / (CINE.P4_END - CINE.P2)));
    var snap = Math.min(1, Math.max(0, (t - CINE.P4) / (CINE.P4_END - CINE.P4)));

    fctx.save();
    for (var p = 0; p < particles.length; p++) {
      var pt = particles[p];
      var ease = conv * conv;
      var tx = pt.ox + (cx - pt.ox) * ease;
      var ty = pt.oy + (cy - pt.oy) * ease;

      if (pt.assigned && snap > 0) {
        var stag = Math.min(1, Math.max(0, (snap - pt.d * 0.45) / 0.55));
        var se = 1 - Math.pow(1 - stag, 3);
        tx = tx + (pt.tx - tx) * se;
        ty = ty + (pt.ty - ty) * se;
      }

      // swirl while converging
      var sw = (1 - snap) * 34 * (1 - ease);
      var ang = t / 700 + p;
      tx += Math.cos(ang) * sw * 0.35;
      ty += Math.sin(ang) * sw * 0.35;

      var alpha = 0.18 + ease * 0.7;
      if (t < CINE.P2) alpha *= Math.min(1, t / CINE.P2);
      if (snap >= 1) alpha = 0.95;
      if (t > CINE.OUT) alpha *= Math.max(0, 1 - (t - CINE.OUT) / 300);

      var col = snap > 0.5
        ? (pt.hue > 0.82 ? '255,255,255' : '150,235,255')
        : (pt.hue > 0.72 ? '255,190,120' : '110,215,250');

      fctx.fillStyle = 'rgba(' + col + ',' + alpha + ')';
      var sz = pt.size * (snap > 0.6 ? 0.85 : 1);
      fctx.fillRect(tx, ty, sz, sz);
    }
    fctx.restore();

    /* ---- drifting sparks ---- */
    fctx.save();
    for (var s = 0; s < sparks.length; s++) {
      var sp = sparks[s];
      sp.x += Math.cos(t / 1400 + s) * sp.sp;
      sp.y += Math.sin(t / 1700 + s * 1.7) * sp.sp;
      if (sp.x < 0) sp.x += W; if (sp.x > W) sp.x -= W;
      if (sp.y < 0) sp.y += H; if (sp.y > H) sp.y -= H;
      var sa = (0.25 + Math.abs(Math.sin(t / 500 + s)) * 0.5) * (t < CINE.OUT ? 1 : 0);
      fctx.fillStyle = 'rgba(160,235,255,' + sa + ')';
      fctx.fillRect(sp.x, sp.y, 1.6, 1.6);
    }
    fctx.restore();

    /* ---- logo materialisation ---- */
    if (logoReady && t > CINE.P4 - 120) {
      var lp = Math.min(1, Math.max(0, (t - (CINE.P4 - 120)) / 780));
      var breathe = 1 + Math.sin(t / 420) * 0.008;
      var lw = logoBox.w * breathe, lh = logoBox.h * breathe;
      var lx = (W - lw) / 2, ly = (H - lh) / 2 - H * 0.03;
      var flick = lp < 0.75 ? (Math.random() > (0.25 + lp * 0.9) ? 1 : 0.35) : 1;

      fctx.save();
      fctx.globalAlpha = Math.pow(lp, 1.5) * flick;
      // glow
      fctx.shadowColor = 'rgba(70,200,245,0.85)';
      fctx.shadowBlur = 40 * lp;
      // glitch slice while forming
      if (lp < 0.92 && Math.random() > 0.62) {
        var gy = ly + Math.random() * lh;
        var gh = 6 + Math.random() * 22;
        var gOff = (Math.random() - 0.5) * 26 * (1 - lp);
        fctx.drawImage(logoImg, 0, (gy - ly) / lh * 1080, 1080, (gh / lh) * 1080, lx + gOff, gy, lw, gh);
        fctx.drawImage(logoImg, 0, 0, 1080, 1080, lx, ly, lw, lh);
      } else {
        fctx.drawImage(logoImg, lx, ly, lw, lh);
      }
      fctx.restore();

      // scanning line across the mark while it forms
      if (lp < 1) {
        fctx.save();
        fctx.globalAlpha = (1 - lp) * 0.8;
        var sy = ly + (lh * lp);
        var grad = fctx.createLinearGradient(lx, 0, lx + lw, 0);
        grad.addColorStop(0, 'rgba(90,215,255,0)');
        grad.addColorStop(0.5, 'rgba(190,245,255,1)');
        grad.addColorStop(1, 'rgba(90,215,255,0)');
        fctx.fillStyle = grad;
        fctx.fillRect(lx, sy, lw, 2);
        fctx.restore();
      }
    }

    /* ---- HUD frame during the intro ---- */
    fctx.save();
    fctx.globalAlpha = 0.55 * Math.min(1, t / 400);
    fctx.strokeStyle = 'rgba(95,200,240,0.55)';
    fctx.lineWidth = 1;
    var m = 34, seg = 46;
    var corners = [
      [m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]
    ];
    for (var c = 0; c < corners.length; c++) {
      var cc = corners[c];
      fctx.beginPath();
      fctx.moveTo(cc[0] + cc[2] * seg, cc[1]);
      fctx.lineTo(cc[0], cc[1]);
      fctx.lineTo(cc[0], cc[1] + cc[3] * seg);
      fctx.stroke();
    }
    fctx.restore();

    // crosshair ticks around the logo
    if (t > CINE.P4 - 200) {
      var ha = Math.min(1, Math.max(0, (t - (CINE.P4 - 200)) / 600));
      fctx.save();
      fctx.globalAlpha = 0.5 * ha;
      fctx.strokeStyle = 'rgba(120,225,255,0.9)';
      fctx.lineWidth = 1;
      var bw = logoBox.w * 1.16, bh = logoBox.h * 1.16;
      var bx = (W - bw) / 2, by = (H - bh) / 2 - H * 0.03;
      var arm = 20;
      [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]].forEach(function (k) {
        fctx.beginPath();
        fctx.moveTo(k[0] + k[2] * arm, k[1]); fctx.lineTo(k[0], k[1]); fctx.lineTo(k[0], k[1] + k[3] * arm);
        fctx.stroke();
      });
      fctx.restore();
    }

    /* ---- exit flash ---- */
    if (t > CINE.OUT) {
      var op = (t - CINE.OUT) / (CINE.END - CINE.OUT);
      fctx.save();
      fctx.globalAlpha = Math.min(1, op);
      fctx.fillStyle = '#000';
      fctx.fillRect(0, 0, W, H);
      fctx.globalAlpha = Math.max(0, 1 - op) * 0.85;
      fctx.fillStyle = 'rgba(190,245,255,1)';
      fctx.fillRect(0, H / 2 - 1, W, 2);
      fctx.restore();
    }

    progressEl.style.width = (pAll * 100).toFixed(1) + '%';
  }

  function cineTick() {
    var s = Store.state;
    if (s.phase !== 'cinematic') { stopCinematic(); return; }

    var t = Date.now() - startAt;

    // copy beats
    if (t < CINE.P1_END) setLine(0);
    else if (t < CINE.P2_END) setLine(1);
    else if (t < CINE.P4) setLine(2);
    else if (t < CINE.P5b) setLine(3);
    else if (t < CINE.P5c) setLine(4);
    else setLine(5);

    if (t > CINE.P1 && t < CINE.P1_END) cineCue('init');
    if (t > CINE.P2 && t < CINE.P2_END) cineCue('detect');
    if (t > CINE.P3 && t < CINE.P3_END) cineCue('build');
    if (t > CINE.P4 && t < CINE.P4 + 400) cineCue('materialise');
    if (t > CINE.P5c && t < CINE.P5c + 400) cineCue('online');

    buildTargets();
    if (t > CINE.P4 - 60) assignTargets();

    drawCine(t);

    if (t >= CINE.END) {
      Store.finishCinematic();
      return;
    }
    cineRaf = requestAnimationFrame(cineTick);
  }

  function startCinematic() {
    showScreen('cinematic');
    cued = {};
    lastLine = -1;
    startAt = Store.state.introRunAt || Date.now();
    if (Date.now() - startAt > CINE.END + 4000) startAt = Date.now();
    sizeCanvas();
    seedScene();
    logoTargetsReady = false;
    targets = [];
    if (logoImg.complete && logoImg.naturalWidth) { logoReady = true; buildTargets(); }
    else {
      logoReady = false;
      logoImg.onload = function () { logoReady = true; buildTargets(); };
    }
    assignTargets();
    cancelAnimationFrame(cineRaf);
    cineRaf = requestAnimationFrame(cineTick);
  }

  function stopCinematic() {
    cancelAnimationFrame(cineRaf);
    cineRaf = 0;
  }

  window.addEventListener('resize', function () {
    if (Store.state.phase === 'cinematic') sizeCanvas();
  });

  /* =========================================================
     REVEAL SEQUENCE
     ========================================================= */
  var revealEl = $('reveal');
  var seqEls = revealEl.querySelectorAll('.rv');
  var answerEl = $('reveal-answer');
  var revealTimers = [];
  var revealRunning = false;

  function runReveal(text) {
    revealTimers.forEach(clearTimeout);
    revealTimers = [];
    revealRunning = true;
    revealEl.hidden = false;
    for (var i = 0; i < seqEls.length; i++) seqEls[i].classList.remove('on');
    answerEl.classList.remove('on');
    answerEl.textContent = '';

    var beats = [0, 480, 1000];
    beats.forEach(function (b, i) {
      revealTimers.push(setTimeout(function () {
        for (var k = 0; k < seqEls.length; k++) seqEls[k].classList.toggle('on', k === i);
        if (i > 0) cue('reveal');
      }, b));
    });

    revealTimers.push(setTimeout(function () {
      answerEl.textContent = text;
      answerEl.classList.add('on');
      cue('reveal');
    }, 1460));

    revealTimers.push(setTimeout(function () {
      revealEl.hidden = true;
      revealRunning = false;
      for (var k = 0; k < seqEls.length; k++) seqEls[k].classList.remove('on');
      // a reveal queued while this one was running can now play
      renderResult(Store.state);
    }, 3050));
  }

  /* an in-flight overlay must never carry over to the next question */
  function cancelReveal() {
    if (!revealRunning) return;
    revealTimers.forEach(clearTimeout);
    revealTimers = [];
    revealRunning = false;
    revealEl.hidden = true;
    answerEl.classList.remove('on');
    answerEl.textContent = '';
    for (var k = 0; k < seqEls.length; k++) seqEls[k].classList.remove('on');
  }

  /* =========================================================
     GAME RENDER
     ========================================================= */
  var qNum = $('q-num'), qType = $('q-type'), qText = $('q-text');
  var qFigure = $('q-figure'), qImage = $('q-image');
  var qAudioWrap = $('q-audio-wrap'), qAudioLabel = $('q-audio-label'), qAudio = $('q-audio');
  var qFrameTag = qFigure.querySelector('.q-frame-tag');
  var qStage = $('q-stage');
  var qHint = $('q-hint'), qHintTiles = $('q-hint-tiles'), qHintLevel = $('q-hint-level');
  var hdRound = $('hd-round'), hdIndex = $('hd-index');
  var statusLine = $('status-line'), statusTeam = $('status-team'), statusRound = $('status-round');
  var resultEl = $('result'), resultTag = resultEl.querySelector('.result-tag');
  var resultAnswer = $('result-answer');
  var resultAward = $('result-award'), resultPoints = $('result-points'), resultTeam = $('result-team');
  var clock = $('clock'), clockTime = $('clock-time'), clockState = $('clock-state'), clockFill = $('clock-fill');
  var board = $('board'), boardList = $('board-list');

  var lastQuestionKey = '';
  var lastRevealedShown = false;
  var pendingReveal = null;

  function renderQuestion(s) {
    var idx = s.qIndex;
    var q = Q[idx];
    var key = idx + '|' + q.text;
    if (key !== lastQuestionKey) {
      lastQuestionKey = key;
      qNum.textContent = 'QUESTION ' + pad2(q.id);
      qText.textContent = q.text;

      qType.textContent = roundLabel(q.round);
      hdRound.textContent = roundLabel(q.round).replace(' ROUND', '');

      if (q.image) {
        qFigure.hidden = false;
        qStage.classList.add('has-image');
        qFrameTag.textContent = q.round === 'image' ? 'IMAGE INTEL' : 'HINT INTEL';
        if (qImage.getAttribute('src') !== q.image) {
          qImage.setAttribute('src', q.image);
          qImage.alt = q.imageAlt || '';
        }
      } else {
        qFigure.hidden = true;
        qStage.classList.remove('has-image');
        qImage.removeAttribute('src');
      }
      if (q.audio && qAudioWrap && qAudio) {
        qAudioWrap.hidden = false;
        qAudioLabel.textContent = q.audioLabel || 'AUDIO CUE';
        if (qAudio.getAttribute('src') !== q.audio) {
          qAudio.setAttribute('src', q.audio);
          qAudio.load();
          var playAudio = qAudio.play();
          if (playAudio && playAudio.catch) playAudio.catch(function () { /* browser autoplay policy */ });
        }
      } else if (qAudioWrap && qAudio) {
        qAudioWrap.hidden = true;
        qAudio.pause();
        qAudio.removeAttribute('src');
      }
      hdIndex.textContent = 'Q' + pad2(q.id) + ' / ' + Q.length;

      // replay the stage entrance
      qStage.style.animation = 'none';
      void qStage.offsetWidth;
      qStage.style.animation = '';
      lastRevealedShown = false;
      pendingReveal = null;
      cancelReveal();
    }
  }

  /* ---- post-timeout hint ladder: Wordle-style letter tiles ---- */
  var lastHintKey = '';

  function renderHint(s) {
    var qs = s.qState[s.qIndex];
    var q = Q[s.qIndex];
    var stage = qs.hintStage || 0;
    if (!(stage > 0 && !qs.resolved && !qs.revealed)) {
      if (!qHint.hidden) {
        qHint.hidden = true;
        qHintTiles.innerHTML = '';
        lastHintKey = '';
      }
      return;
    }
    var key = s.qIndex + '|' + stage + '|' + q.answer;
    if (key === lastHintKey) return;
    lastHintKey = key;

    qHint.hidden = false;
    qHintLevel.textContent = stage;
    var masked = window.maskAnswer(q.answer, stage);
    var html = '';
    for (var w = 0; w < masked.length; w++) {
      if (w) html += '<span class="q-tile-gap"></span>';
      html += '<span class="q-word">';
      var word = masked[w].word, keep = masked[w].keep;
      for (var i = 0; i < word.length; i++) {
        html += keep[i] ? '<i class="q-tile on fresh">' + esc(word.charAt(i)) + '</i>'
                        : '<i class="q-tile"></i>';
      }
      html += '</span>';
    }
    qHintTiles.innerHTML = html;
  }

  function renderResult(s) {
    var qs = s.qState[s.qIndex];
    var q = Q[s.qIndex];
    var show = !!(qs.revealed || qs.resolved);

    if (show) {
      resultEl.hidden = false;
      resultTag.textContent = qs.resolved ? 'QUESTION COMPLETE' : 'ANSWER DECLASSIFIED';
      resultAnswer.textContent = q.answer;

      if (qs.awarded) {
        resultAward.hidden = false;
        resultPoints.textContent = (qs.awarded > 0 ? '+' : '') + qs.awarded;
        resultTeam.textContent = (s.lastAward && s.lastAward.teamId) ? s.lastAward.teamName : '';
      } else {
        resultAward.hidden = true;
      }
    } else {
      resultEl.hidden = true;
      resultAward.hidden = true;
    }

    // queue the reveal overlay exactly once per reveal; if another reveal is
    // still on screen it plays as soon as that one finishes
    if (qs.revealed && !lastRevealedShown) pendingReveal = q.answer;
    else pendingReveal = null;
    if (!qs.revealed) {
      lastRevealedShown = false;
      // a reset/retract must close an overlay that is still animating
      if (revealRunning) cancelReveal();
    }

    if (pendingReveal !== null && !revealRunning) {
      var txt = pendingReveal;
      pendingReveal = null;
      lastRevealedShown = true;
      runReveal(txt);
    }
  }

  function renderBoard(s) {
    var html = '';
    for (var i = 0; i < s.teams.length; i++) {
      var t = s.teams[i];
      var active = t.id === s.activeTeamId;
      html += '<li class="' + (active ? 'active' : '') + '">' +
        '<span class="bn">' + esc(t.name) + '</span>' +
        '<span class="bs">' + t.score + '</span></li>';
    }
    if (boardList.innerHTML !== html) boardList.innerHTML = html;
    board.classList.toggle('focus', !!s.boardFocus);
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderStatus(s) {
    var qs = s.qState[s.qIndex];
    var line;
    if (s.phase === 'complete') line = 'PHASE COMPLETE';
    else if (qs.resolved) line = 'QUESTION RESOLVED';
    else if (s.timer.status === 'up') line = 'AWAITING ANSWER';
    else if (s.timer.status === 'running') line = 'COUNTDOWN ACTIVE';
    else if (s.timer.status === 'paused') line = 'HOLD — SYSTEM PAUSED';
    else line = 'AWAITING HOST';
    if (statusLine.textContent !== line) statusLine.textContent = line;
    statusLine.classList.toggle('hot', s.timer.status === 'up' || qs.resolved);

    var team = Store.activeTeam();
    var tn = team ? team.name : '—';
    if (statusTeam.textContent !== tn) statusTeam.textContent = tn;

    var round = roundLabel(Q[s.qIndex].round);
    if (statusRound.textContent !== round) statusRound.textContent = round;
  }

  /* =========================================================
     TIMER RENDER (timestamp driven, rAF)
     ========================================================= */
  var lastWhole = null;
  var lastStatus = null;
  var lastWarnFired = {};

  function renderClock(s) {
    var t = s.timer;
    var rem = Store.remainingMs(t, Date.now());
    var sec = Math.ceil(rem / 1000);
    if (t.status === 'ready' || t.status === 'paused') sec = Math.ceil(Store.DURATION_MS / 1000);
    sec = Math.max(0, Math.min(Store.DURATION_MS / 1000, sec));
    var txt = '00:' + pad2(sec);
    if (clockTime.textContent !== txt) clockTime.textContent = txt;

    var state = t.status;
    var label = state === 'ready' ? 'READY'
      : state === 'running' ? 'ACTIVE'
      : state === 'paused' ? 'SYSTEM PAUSED'
      : "TIME'S UP";
    if (clockState.textContent !== label) clockState.textContent = label;

    if (lastStatus !== state) {
      clock.setAttribute('data-status', state);
      if (state === 'running') cue('start');
      if (state === 'paused') cue('pause');
      if (state === 'ready') lastWarnFired = {};
      lastStatus = state;
    }

    // visual urgency phase
    var phase = 'normal';
    if (state === 'running') {
      if (rem <= 10000) phase = 'alert';
      else if (rem <= 20000) phase = 'warn';
    } else if (state === 'up') phase = 'up';
    else if (state === 'paused') phase = 'warn';
    if (clock.getAttribute('data-phase') !== phase) clock.setAttribute('data-phase', phase);

    // progress fill
    var frac = t.status === 'ready' ? 1 : (rem / t.durationMs);
    clockFill.style.transform = 'scaleX(' + Math.max(0, Math.min(1, frac)) + ')';

    // second-boundary cues
    if (state === 'running') {
      if (lastWhole === null) lastWhole = sec;
      else if (sec !== lastWhole) {
        lastWhole = sec;
        if (rem > 0) cue(sec <= 10 ? 'tick' : (rem <= 20000 && sec % 5 === 0 ? 'warn' : 'tick'));
      }
      if (rem <= 10000 && !lastWarnFired.t10) { lastWarnFired.t10 = true; }
      if (rem > 10000) lastWarnFired.t10 = false;
    } else if (state === 'up') {
      if (lastWhole !== 0) { lastWhole = 0; cue('timesup'); }
    } else {
      lastWhole = null;
    }
  }

  /* =========================================================
     FINAL RESULTS
     ========================================================= */
  var finalList = $('final-list');
  function renderComplete(s) {
    var teams = s.teams.slice().sort(function (a, b) { return b.score - a.score; });
    var html = '';
    for (var i = 0; i < teams.length; i++) {
      html += '<li><span class="rank">' + pad2(i + 1) + '</span>' +
        '<span class="name">' + esc(teams[i].name) + '</span>' +
        '<span class="score">' + teams[i].score + '</span></li>';
    }
    if (finalList.innerHTML !== html) finalList.innerHTML = html;
  }

  /* =========================================================
     MAIN RENDER + RAF
     ========================================================= */
  var lastPhase = null;
  var completeCued = false;

  function render() {
    var s = Store.state;

    // phase transitions
    if (s.phase !== lastPhase) {
      if (s.phase === 'cinematic') { startCinematic(); }
      else if (s.phase === 'home') { stopCinematic(); showScreen('home'); completeCued = false; }
      else if (s.phase === 'playing') { stopCinematic(); showScreen('playing'); }
      else if (s.phase === 'complete') {
        stopCinematic(); showScreen('complete');
        if (!completeCued) { completeCued = true; cue('complete'); }
      }
      lastPhase = s.phase;
      lastQuestionKey = '';
      lastRevealedShown = false;
    }

    if (s.phase === 'playing') {
      renderQuestion(s);
      renderResult(s);
      renderHint(s);
      renderStatus(s);
      // expired timer settles from the loop; only this window plays the cue
      if (Store.settleExpiredTimer()) cue('timesup');
    }
    if (s.phase === 'complete') renderComplete(s);
    renderBoard(s);
    renderClock(s);
  }

  Store.subscribe(function () { render(); });

  // first paint
  if (Store.state.phase === 'cinematic') startCinematic();
  render();

  (function loop() {
    Store.settleExpiredTimer();
    renderClock(Store.state);
    requestAnimationFrame(loop);
  })();

  // ambient sound unlock on any first interaction
  ['pointerdown', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function once() {
      SFX.unlock();
      window.removeEventListener(ev, once);
    }, { once: true });
  });
})();
