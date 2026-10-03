/* MARVEL FAMILY FEUD — WEB AUDIO SFX
   All sounds are synthesised (no audio files) so the game works fully offline.
   Every cue degrades to silence if Web Audio is unavailable. */

(function () {
  'use strict';

  var ctx = null;
  var master = null;
  var enabled = true;

  function ac() {
    if (ctx) return ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  // call on first user gesture
  function unlock() {
    var c = ac();
    if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} }
  }

  function on() { return enabled; }
  function setEnabled(v) { enabled = !!v; }

  function tone(opts) {
    var c = ac();
    if (!c || !enabled) return;
    var t0 = c.currentTime + (opts.delay || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.f0, t0);
    if (opts.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.f1), t0 + (opts.dur || 0.2));
    var vol = opts.vol == null ? 0.22 : opts.vol;
    var atk = opts.atk == null ? 0.008 : opts.atk;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.dur || 0.2));
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + (opts.dur || 0.2) + 0.05);
  }

  function noise(opts) {
    var c = ac();
    if (!c || !enabled) return;
    var dur = opts.dur || 0.3;
    var t0 = c.currentTime + (opts.delay || 0);
    var frames = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, frames, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1);
    var src = c.createBufferSource();
    src.buffer = buf;
    var filt = c.createBiquadFilter();
    filt.type = opts.filter || 'bandpass';
    filt.frequency.value = opts.freq || 1400;
    filt.Q.value = opts.q || 1;
    var g = c.createGain();
    var vol = opts.vol == null ? 0.18 : opts.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (opts.atk || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  var cues = {
    init: function () {
      tone({ type: 'sine', f0: 160, f1: 420, dur: 0.5, vol: 0.14, atk: 0.03 });
      noise({ dur: 0.45, freq: 700, vol: 0.05, filter: 'lowpass' });
    },
    detect: function () {
      tone({ type: 'triangle', f0: 520, f1: 760, dur: 0.24, vol: 0.14 });
      tone({ type: 'sine', f0: 260, dur: 0.3, vol: 0.08, delay: 0.04 });
    },
    build: function () {
      tone({ type: 'sawtooth', f0: 90, f1: 640, dur: 0.85, vol: 0.1, atk: 0.15 });
      noise({ dur: 0.9, freq: 1800, vol: 0.07, atk: 0.3 });
    },
    materialise: function () {
      tone({ type: 'sine', f0: 1200, f1: 300, dur: 0.5, vol: 0.16 });
      tone({ type: 'triangle', f0: 300, f1: 900, dur: 0.35, vol: 0.1, delay: 0.02 });
      noise({ dur: 0.3, freq: 3200, vol: 0.09, filter: 'highpass' });
    },
    online: function () {
      tone({ type: 'sine', f0: 523, dur: 0.16, vol: 0.14 });
      tone({ type: 'sine', f0: 784, dur: 0.16, vol: 0.14, delay: 0.11 });
      tone({ type: 'sine', f0: 1046, dur: 0.3, vol: 0.15, delay: 0.22 });
    },
    start: function () {
      tone({ type: 'square', f0: 880, dur: 0.09, vol: 0.12 });
      tone({ type: 'sine', f0: 1320, dur: 0.14, vol: 0.1, delay: 0.07 });
    },
    tick: function (urgent) {
      tone({ type: 'square', f0: urgent ? 1500 : 1050, dur: 0.045, vol: urgent ? 0.13 : 0.07 });
    },
    warn: function () {
      tone({ type: 'sawtooth', f0: 700, f1: 500, dur: 0.16, vol: 0.1 });
    },
    pause: function () {
      tone({ type: 'sine', f0: 620, f1: 300, dur: 0.2, vol: 0.12 });
    },
    resume: function () {
      tone({ type: 'sine', f0: 320, f1: 620, dur: 0.2, vol: 0.12 });
    },
    timesup: function () {
      tone({ type: 'sawtooth', f0: 400, f1: 90, dur: 1.0, vol: 0.2, atk: 0.01 });
      tone({ type: 'square', f0: 200, f1: 60, dur: 1.1, vol: 0.12, atk: 0.02 });
      noise({ dur: 0.6, freq: 320, vol: 0.1, filter: 'lowpass', atk: 0.01 });
    },
    hint: function () {
      tone({ type: 'square', f0: 1180, dur: 0.06, vol: 0.11 });
      tone({ type: 'square', f0: 1560, dur: 0.07, vol: 0.1, delay: 0.09 });
      tone({ type: 'sine', f0: 780, dur: 0.18, vol: 0.1, delay: 0.17 });
    },
    reveal: function () {
      noise({ dur: 0.35, freq: 2600, vol: 0.1, filter: 'bandpass', q: 3 });
      tone({ type: 'sine', f0: 660, f1: 990, dur: 0.28, vol: 0.12, delay: 0.14 });
      tone({ type: 'sine', f0: 1320, dur: 0.3, vol: 0.14, delay: 0.34 });
    },
    correct: function () {
      tone({ type: 'triangle', f0: 784, dur: 0.14, vol: 0.16 });
      tone({ type: 'triangle', f0: 988, dur: 0.14, vol: 0.16, delay: 0.1 });
      tone({ type: 'triangle', f0: 1319, dur: 0.34, vol: 0.18, delay: 0.2 });
    },
    incorrect: function () {
      tone({ type: 'sawtooth', f0: 220, f1: 150, dur: 0.3, vol: 0.16 });
      tone({ type: 'square', f0: 146, f1: 110, dur: 0.36, vol: 0.12, delay: 0.06 });
    },
    points: function () {
      tone({ type: 'square', f0: 1046, dur: 0.07, vol: 0.11 });
      tone({ type: 'square', f0: 1568, dur: 0.14, vol: 0.12, delay: 0.07 });
    },
    next: function () {
      noise({ dur: 0.28, freq: 1800, vol: 0.1, filter: 'highpass', atk: 0.005 });
      tone({ type: 'sine', f0: 420, f1: 900, dur: 0.26, vol: 0.12 });
    },
    complete: function () {
      [523, 659, 784, 1046, 1318].forEach(function (f, i) {
        tone({ type: 'triangle', f0: f, dur: 0.5, vol: 0.15, delay: i * 0.11 });
      });
    }
  };

  function play(name) {
    try {
      if (!enabled) return;
      var fn = cues[name];
      if (fn) fn();
    } catch (e) { /* audio must never break the game */ }
  }

  window.SFX = {
    play: play,
    unlock: unlock,
    on: on,
    setEnabled: setEnabled
  };
})();
