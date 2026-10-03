/* MARVEL FAMILY FEUD — QUESTION BANK
   Source of truth: official Quiz Master question sheet (curated Q01–Q13).
   Wording, answers and round types are fixed. Do not reword. */

window.QUESTIONS = [
  {
    id: 1,
    round: 'standard',
    image: 'assets/img/q01-hex-town.jpg',
    imageAlt: 'Glowing red energy dome stretching across open countryside with a lone figure standing before it',
    text: 'What is the name of the town where Wanda creates the Hex in WandaVision?',
    answer: 'Westview',
    aliases: ['westview', 'west view', 'westview new jersey', 'westview nj', 'westtown']
  },
  {
    id: 2,
    round: 'standard',
    image: 'assets/img/q02-celestial-head.jpg',
    imageAlt: 'Enormous severed stone head drifting in a green nebula with a small ship alongside it',
    text: "What is the name of the severed celestial head / planet where the Collector's museum is located?",
    answer: 'Knowhere',
    aliases: ['knowwhere', 'know where', 'know-here', 'nowhere', 'the celestial head']
  },
  {
    id: 3,
    round: 'standard',
    image: 'assets/img/q03-moon-god.jpg',
    imageAlt: 'Towering masked figure holding a crescent-topped staff among sunlit desert ruins',
    text: 'What is the name of the ancient Egyptian moon god served by Marc Spector / Steven Grant?',
    answer: 'Khonshu',
    aliases: ['khonshu', 'khonsu', 'khonshuu', 'khonshou', 'khonsou']
  },
  {
    id: 4,
    round: 'standard',
    image: 'assets/img/q04-yaka-arrow.jpg',
    imageAlt: 'Close-up of a blue-skinned man as a red glowing arrow streaks past his face',
    text: 'What is the name of the whistle-controlled whistling arrow weapon wielded by Yondu Udonta?',
    answer: 'Yaka Arrow',
    aliases: ['yaka arrow', 'yaka arrows', 'yaka', 'the yaka arrow', 'yaka-arrow']
  },
  {
    id: 5,
    round: 'standard',
    image: 'assets/img/q05-taxi-buddy.jpg',
    imageAlt: 'Smiling young cab driver at the wheel of a moving car, seen from the passenger seat',
    text: "What is the name of Deadpool's loyal, getaway taxi-driver buddy?",
    answer: 'Dopinder',
    aliases: ['dopinder', 'dopender', 'dopindar']
  },
  {
    id: 6,
    round: 'standard',
    image: 'assets/img/q06-the-watcher.jpg',
    imageAlt: 'Giant pale blue face with glowing white eyes watching from among the stars',
    text: "In Marvel's What If...?, what is the personal name of the cosmic Watcher who narrates the multiverse?",
    answer: 'Uatu the Watcher',
    aliases: ['uatu', 'uatu the watcher', 'uatu watcher', 'the watcher', 'uatu the watcher of the multiverse']
  },
  {
    id: 7,
    round: 'standard',
    image: 'assets/img/q07-pi-office.jpg',
    imageAlt: 'Dim private-investigator office at night with a woman standing beside a seated man',
    text: "What is the official business name of Jessica Jones' private investigator agency?",
    answer: 'Alias Investigations',
    aliases: ['alias investigations', 'alias investigation', 'alias investigations agency', 'alias', 'alias pi agency']
  },
  {
    id: 8,
    round: 'standard',
    image: 'assets/img/q08-sai-assassin.jpg',
    imageAlt: 'Woman in a red and black outfit standing beside a rack of bladed weapons',
    text: "What is the name of Matt Murdock's fierce college love interest turned deadly Hand assassin?",
    answer: 'Elektra Natchios',
    aliases: ['elektra', 'elektra natchios', 'elektra natchos', 'elektra nachios', 'elektra natchios natchios', 'elektra natchios jr']
  },
  {
    id: 9,
    round: 'standard',
    image: 'assets/img/q09-alien-garden.jpg',
    imageAlt: 'Rustic farm hut in a lush green valley under a hazy alien sky',
    text: 'What peaceful agrarian planet does Thanos retire to after executing his Snap?',
    answer: 'The Garden (Planet 0259-S)',
    aliases: ['the garden', 'garden', 'planet 0259-s', '0259-s', '0259', 'the garden planet', 'planet 0259', 'garden planet']
  },
  {
    id: 10,
    round: 'standard',
    image: 'assets/img/q10-cosmic-child.jpg',
    imageAlt: 'Smiling baby held up in front of a blue-suited family',
    text: "What is the name of Reed Richards (Mister Fantastic) and Sue Storm (Invisible Woman)'s reality-warping son?",
    answer: 'Franklin Richards',
    aliases: ['franklin', 'franklin richards', 'frank richards']
  },
  {
    id: 11,
    round: 'image',
    image: 'assets/img/q11-red-guardian.jpg',
    imageAlt: 'Red Guardian — bearded Soviet super-soldier in red armour',
    text: 'What is the real civilian name of Red Guardian?',
    answer: 'Alexei Shostakov',
    aliases: ['alexiei', 'alexei', 'alexiei shostakov', 'alexei shostakov', 'alexi', 'alexi shostakov', 'shostakov', 'alexei shostakoff', 'alexander shostakov', 'alexsei', 'alexsei shostakov']
  },
  {
    id: 12,
    round: 'image',
    image: 'assets/img/q12-void.jpg',
    imageAlt: 'Shadowy silhouettes representing the dark entity born from Bob\u2019s trauma',
    text: "What is the name of the dark psychological entity created from Bob's trauma?",
    answer: 'The Void',
    aliases: ['the void', 'void', 'bob\u2019s void', "bob's void", 'the void entity', 'void entity', 'dark sentry']
  },
  {
    id: 13,
    round: 'image',
    image: 'assets/img/q13-cloak.jpg',
    imageAlt: 'Doctor Strange with a flowing sentient red cape',
    text: "What is the official name of Doctor Strange's sentient red cape?",
    answer: 'Cloak of Levitation',
    aliases: ['cloak of levitation', 'the cloak of levitation', 'cloak', 'levitation cloak', 'strange cloak', "strange's cloak", "doctor strange's cloak", 'the cloak', 'dr strange cloak']
  }
];

window.ROUND_LABEL = { standard: 'STANDARD', image: 'IMAGE ROUND' };

/* --- post-timeout hint ladder (Wordle-style staged letter reveal) ---
   stage 1: first letter of each word
   stage 2: + last letter of each word
   stage 3: + every 3rd interior letter
   A stage never reveals a whole word, so REVEAL ANSWER always has the last move. */
window.HINT_STAGES = 3;

window.maskAnswer = function (answer, stage) {
  var clean = String(answer).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  var words = clean.split(' ');
  var out = [];
  for (var w = 0; w < words.length; w++) {
    var word = words[w].toUpperCase();
    var n = word.length;
    var keep = {};
    if (stage >= 1 && n > 0) keep[0] = true;
    if (stage >= 2 && n > 1) keep[n - 1] = true;
    if (stage >= 3) for (var i = 1; i < n - 1; i += 3) keep[i] = true;

    var revealed = 0;
    for (var k in keep) if (Object.prototype.hasOwnProperty.call(keep, k)) revealed++;
    if (n > 1 && revealed >= n) {
      var keys = [];
      for (var k2 in keep) if (Object.prototype.hasOwnProperty.call(keep, k2)) keys.push(+k2);
      keys.sort(function (a, b) { return b - a; });
      for (var j = 0; j < keys.length; j++) {
        if (keys[j] === 0) continue;
        delete keep[keys[j]];
        break;
      }
    }
    out.push({ word: word, keep: keep });
  }
  return out;
};

window.pad2 = function (n) {
  return String(n).padStart(2, '0');
};
