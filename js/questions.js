/* MARVEL FAMILY FEUD — OFFICIAL QUIZ MASTER BANK (Q01–Q13 + requested audio cues) */
window.QUESTIONS = [
  { id: 1, round: 'standard', image: 'assets/img/q01-hex-town.jpg', imageAlt: 'The Hex around Westview', text: 'What is the name of the town where Wanda creates the Hex in WandaVision?', answer: 'Westview', aliases: ['westview', 'west view'] },
  { id: 2, round: 'standard', image: 'assets/img/q02-celestial-head.jpg', imageAlt: 'The severed celestial head Knowhere', text: "What is the name of the severed celestial head / planet where the Collector's museum is located?", answer: 'Knowhere', aliases: ['knowhere', 'know where', 'nowhere'] },
  { id: 3, round: 'standard', image: 'assets/img/q03-moon-god.jpg', imageAlt: 'Khonshu among desert ruins', text: 'What is the name of the ancient Egyptian moon god served by Marc Spector / Steven Grant?', answer: 'Khonshu', aliases: ['khonshu', 'khonsu'] },
  { id: 4, round: 'standard', image: 'assets/img/q04-yaka-arrow.jpg', imageAlt: 'Yondu with the Yaka Arrow', text: 'What is the name of the whistle-controlled whistling arrow weapon wielded by Yondu Udonta?', answer: 'Yaka Arrow', aliases: ['yaka arrow', 'yaka'] },
  { id: 5, round: 'standard', image: 'assets/img/q05-taxi-buddy.jpg', imageAlt: 'Dopinder in his taxi', text: "What is the name of Deadpool's loyal, getaway taxi-driver buddy?", answer: 'Dopinder', aliases: ['dopinder', 'dopender'] },
  { id: 6, round: 'standard', image: 'assets/img/q06-the-watcher.jpg', imageAlt: 'The cosmic Watcher', text: "In Marvel's What If...?, what is the personal name of the cosmic Watcher who narrates the multiverse?", answer: 'Uatu the Watcher', aliases: ['uatu', 'the watcher'] },
  { id: 7, round: 'standard', image: 'assets/img/q07-pi-office.jpg', imageAlt: 'Jessica Jones private investigator office', text: "What is the official business name of Jessica Jones' private investigator agency?", answer: 'Alias Investigations', aliases: ['alias investigations', 'alias'] },
  { id: 8, round: 'standard', image: 'assets/img/q08-sai-assassin.jpg', imageAlt: 'Elektra Natchios with bladed weapons', text: "What is the name of Matt Murdock's fierce college love interest turned deadly Hand assassin?", answer: 'Elektra Natchios', aliases: ['elektra', 'elektra natchios'] },
  { id: 9, round: 'standard', image: 'assets/img/q09-alien-garden.jpg', imageAlt: 'The Garden, Thanos\' retirement planet', text: 'What peaceful agrarian planet does Thanos retire to after executing his Snap?', answer: 'The Garden (Planet 0259-S)', aliases: ['the garden', 'garden', 'planet 0259-s'] },
  { id: 10, round: 'standard', image: 'assets/img/q10-cosmic-child.jpg', imageAlt: 'Franklin Richards as a child', text: "What is the name of Reed Richards (Mister Fantastic) and Sue Storm (Invisible Woman)'s reality-warping son?", answer: 'Franklin Richards', aliases: ['franklin', 'franklin richards'] },
  { id: 11, round: 'image', image: 'assets/img/q11-red-guardian.jpg', imageAlt: 'Red Guardian in red armor', text: 'What is the real civilian name of Red Guardian?', answer: 'Alexei Shostakov', aliases: ['alexei', 'alexei shostakov', 'alexi shostakov'] },
  { id: 12, round: 'image', image: 'assets/img/q12-void.jpg', imageAlt: 'The Void, Sentry\'s shadow entity', text: "What is the name of the dark psychological entity created from Bob's trauma?", answer: 'The Void', aliases: ['the void', 'void'] },
  { id: 13, round: 'image', image: 'assets/img/q13-cloak.jpg', imageAlt: 'Doctor Strange with the Cloak of Levitation', text: "What is the official name of Doctor Strange's sentient red cape?", answer: 'Cloak of Levitation', aliases: ['cloak of levitation', 'the cloak', 'cloak'] },
  { id: 27, round: 'audio', audio: 'assets/audio/q27.mp4', audioLabel: 'AUDIO TRACK #1 · DIALOGUE CLIP', audioPrompt: "Play dialogue: ‘The power of the sun, in the palm of my hand.’", text: 'Which Spider-Man villain speaks this iconic line?', answer: 'Doctor Octopus (Doc Ock)', aliases: ['doctor octopus', 'doc ock', 'doc octopus', 'otto octavius'] },
  { id: 28, round: 'audio', audio: 'assets/audio/q28.mp4', audioLabel: 'AUDIO TRACK #2 · VILLAIN VOICE CLIP', audioPrompt: 'Play a deep booming villain voice threatening the collider in Into the Spider-Verse.', text: 'Name the villain who opened the dimensional collider.', answer: 'Wilson Fisk / Kingpin', aliases: ['wilson fisk', 'kingpin', 'fisk'] },
  { id: 33, round: 'audio', audio: 'assets/audio/q33.mp4', audioLabel: 'AUDIO TRACK #4 · FAMOUS QUOTE', audioPrompt: "Play audio clip: ‘Dormammu, I've come to bargain.’", text: 'Who is speaking these repeated words to the ruler of the Dark Dimension?', answer: 'Doctor Stephen Strange', aliases: ['doctor strange', 'stephen strange', 'strange'] }
];

window.ROUND_LABEL = { standard: 'STANDARD', image: 'IMAGE ROUND', audio: 'AUDIO ROUND' };
window.HINT_STAGES = 3;
window.maskAnswer = function (answer, stage) {
  var clean = String(answer).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  var words = clean.split(' '), out = [];
  for (var w = 0; w < words.length; w++) {
    var word = words[w].toUpperCase(), n = word.length, keep = {};
    if (stage >= 1 && n > 0) keep[0] = true;
    if (stage >= 2 && n > 1) keep[n - 1] = true;
    if (stage >= 3) for (var i = 1; i < n - 1; i += 3) keep[i] = true;
    var keys = Object.keys(keep); if (n > 1 && keys.length >= n) delete keep[keys[keys.length - 1]];
    out.push({ word: word, keep: keep });
  }
  return out;
};
window.pad2 = function (n) { return String(n).padStart(2, '0'); };
