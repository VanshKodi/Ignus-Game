/* MARVEL FAMILY FEUD — OFFICIAL QUIZ MASTER BANK (Q01–Q34)
   The source sheet contains repeated concepts from the original Q01–Q13
   build; this normalized bank keeps the official IDs and removes duplicates. */
window.QUESTIONS = [
  { id: 1, round: 'standard', image: 'assets/img/q01-hex-town.jpg', imageAlt: 'The Hex around Westview', text: 'What is the name of the town where Wanda creates the Hex in WandaVision?', answer: 'Westview', aliases: ['westview', 'west view'] },
  { id: 2, round: 'standard', image: 'assets/img/q02-celestial-head.jpg', imageAlt: 'The severed celestial head Knowhere', text: "What is the name of the severed celestial head / planet where the Collector's museum is located?", answer: 'Knowhere', aliases: ['knowhere', 'know where', 'nowhere'] },
  { id: 3, round: 'standard', text: 'What is the name of the garbage planet ruled by the Grandmaster where Thor is imprisoned?', answer: 'Sakaar', aliases: ['sakaar', 'sakar'] },
  { id: 4, round: 'standard', image: 'assets/img/q03-moon-god.jpg', imageAlt: 'Khonshu among desert ruins', text: 'What is the name of the ancient Egyptian moon god served by Marc Spector / Steven Grant?', answer: 'Khonshu', aliases: ['khonshu', 'khonsu'] },
  { id: 5, round: 'standard', text: 'What is the mystical hidden village where Shang-Chi\'s mother was born?', answer: 'Ta Lo', aliases: ['ta lo', 'talo'] },
  { id: 6, round: 'standard', text: 'What is the name of the glowing, vibranium-enriched plant that gives the Black Panther his powers?', answer: 'Heart-Shaped Herb', aliases: ['heart shaped herb', 'heart-shaped herb', 'heart herb'] },
  { id: 7, round: 'standard', image: 'assets/img/q04-yaka-arrow.jpg', imageAlt: 'Yondu with the Yaka Arrow', text: 'What is the name of the whistle-controlled whistling arrow weapon wielded by Yondu Udonta?', answer: 'Yaka Arrow', aliases: ['yaka arrow', 'yaka'] },
  { id: 8, round: 'standard', text: "What rare, sound-sensitive mineral from Centauri-IV is Yondu's whistling arrow forged from?", answer: 'Yaka', aliases: ['yaka', 'yaka mineral'] },
  { id: 9, round: 'standard', image: 'assets/img/q05-taxi-buddy.jpg', imageAlt: 'Dopinder in his taxi', text: "What is the name of Deadpool's loyal, getaway taxi-driver buddy?", answer: 'Dopinder', aliases: ['dopinder', 'dopender'] },
  { id: 10, round: 'standard', text: "What is the name of the mutant member of X-Force whose mutant superpower is probability manipulation (luck)?", answer: 'Domino (Neena Thurman)', aliases: ['domino', 'neena thurman'] },
  { id: 11, round: 'standard', text: "In Loki Season 2, which fast-food restaurant does Sylvie choose to work at after leaving the TVA?", answer: "McDonald's", aliases: ["mcdonald's", 'mcdonalds', 'mcdonald'] },
  { id: 12, round: 'standard', image: 'assets/img/q06-the-watcher.jpg', imageAlt: 'The cosmic Watcher', text: "In Marvel's What If...?, what is the personal name of the cosmic Watcher who narrates the multiverse?", answer: 'Uatu the Watcher', aliases: ['uatu', 'the watcher'] },
  { id: 13, round: 'standard', image: 'assets/img/q07-pi-office.jpg', imageAlt: 'Jessica Jones private investigator office', text: "What is the official business name of Jessica Jones' private investigator agency?", answer: 'Alias Investigations', aliases: ['alias investigations', 'alias'] },
  { id: 14, round: 'standard', text: 'What is the villain moniker of Kevin Thompson, the mind-controlling antagonist obsessed with Jessica Jones?', answer: 'Kilgrave (The Purple Man)', aliases: ['kilgrave', 'the purple man'] },
  { id: 15, round: 'standard', text: 'What ancient, secretive ninja order serves as the primary antagonistic organization in Daredevil, Iron Fist, and The Defenders?', answer: 'The Hand', aliases: ['the hand', 'hand'] },
  { id: 16, round: 'standard', image: 'assets/img/q08-sai-assassin.jpg', imageAlt: 'Elektra Natchios with bladed weapons', text: "What is the name of Matt Murdock's fierce college love interest turned deadly Hand assassin?", answer: 'Elektra Natchios', aliases: ['elektra', 'elektra natchios'] },
  { id: 17, round: 'standard', text: 'What is the name of Frank Castle\'s former brother-in-arms in the Marine Corps who betrays him and later becomes Jigsaw?', answer: 'Billy Russo (Jigsaw)', aliases: ['billy russo', 'jigsaw'] },
  { id: 18, round: 'standard', text: 'Who serves as the cloaked stonekeeper guarding the Soul Stone on the desolate planet Vormir?', answer: 'Red Skull (Johann Schmidt)', aliases: ['red skull', 'johann schmidt'] },
  { id: 19, round: 'standard', image: 'assets/img/q09-alien-garden.jpg', imageAlt: 'The Garden, Thanos\' retirement planet', text: 'What peaceful agrarian planet does Thanos retire to after executing his Snap?', answer: 'The Garden (Planet 0259-S)', aliases: ['the garden', 'garden', 'planet 0259-s'] },
  { id: 20, round: 'standard', image: 'assets/img/q10-cosmic-child.jpg', imageAlt: 'Franklin Richards as a child', text: "What is the name of Reed Richards (Mister Fantastic) and Sue Storm (Invisible Woman)'s reality-warping son?", answer: 'Franklin Richards', aliases: ['franklin', 'franklin richards'] },
  { id: 21, round: 'standard', text: 'What is the name of the colossal, planet-devouring cosmic entity threatening worlds across the cosmos?', answer: 'Galactus (The Devourer of Worlds)', aliases: ['galactus', 'the devourer of worlds'] },
  { id: 22, round: 'standard', text: 'In Fantastic Four: First Steps, what is the alternate universe designation where their retro-futuristic Earth exists?', answer: 'Earth-828', aliases: ['earth 828', '828'] },
  { id: 23, round: 'image', image: 'assets/img/q23-ironheart.jpg', imageAlt: 'Riri Williams in her Ironheart armor', text: "What is Riri Williams' superhero identity?", answer: 'Ironheart', aliases: ['ironheart', 'riri williams'] },
  { id: 24, round: 'image', image: 'assets/img/q24-us-agent.jpg', imageAlt: 'John Walker in dark tactical U.S. Agent uniform', text: 'What superhero identity does John Walker take on after Captain America?', answer: 'U.S. Agent', aliases: ['us agent', 'u.s. agent', 'john walker'] },
  { id: 25, round: 'image', image: 'assets/img/q11-red-guardian.jpg', imageAlt: 'Red Guardian in red armor', text: 'What is the real civilian name of Red Guardian?', answer: 'Alexei Shostakov', aliases: ['alexei', 'alexei shostakov', 'alexi shostakov'] },
  { id: 26, round: 'image', image: 'assets/img/q12-void.jpg', imageAlt: 'The Void, Sentry\'s shadow entity', text: "What is the name of the dark psychological entity created from Bob's trauma?", answer: 'The Void', aliases: ['the void', 'void'] },
  { id: 27, round: 'audio', text: "Which Spider-Man villain speaks the iconic line, 'The power of the sun, in the palm of my hand.'?", answer: 'Doctor Octopus (Doc Ock)', aliases: ['doctor octopus', 'doc ock', 'otto octavius'] },
  { id: 28, round: 'audio', text: 'Name the villain who opened the dimensional collider in Into the Spider-Verse.', answer: 'Wilson Fisk (Kingpin)', aliases: ['wilson fisk', 'kingpin'] },
  { id: 29, round: 'image', image: 'https://image.idntimes.com/post/20260801/1000357412_0a75d3ec-051c-4e88-b06a-1f4d482208ba.jpg', imageAlt: 'Jean Grey and Sara Grey together', text: "What is the name of Jean Grey's missing older sister?", answer: 'Sara Grey', aliases: ['sara grey', 'sarah grey'] },
  { id: 30, round: 'audio', text: "Name BOTH of Tony Stark's primary AI assistants.", answer: 'J.A.R.V.I.S. and F.R.I.D.A.Y.', aliases: ['jarvis friday', 'jarvis and friday', 'j.a.r.v.i.s. and f.r.i.d.a.y.'] },
  { id: 31, round: 'image', image: 'assets/img/q31-tva.jpg', imageAlt: 'The Time Variance Authority insignia', text: 'Which multiversal organization does this official seal belong to?', answer: 'TVA (Time Variance Authority)', aliases: ['tva', 'time variance authority'] },
  { id: 32, round: 'image', image: 'assets/img/q13-cloak.jpg', imageAlt: 'Doctor Strange with the Cloak of Levitation', text: "What is the official name of Doctor Strange's sentient red cape?", answer: 'Cloak of Levitation', aliases: ['cloak of levitation', 'the cloak', 'cloak'] },
  { id: 33, round: 'audio', text: "Who is speaking the repeated words, 'Dormammu, I've come to bargain,' to the ruler of the Dark Dimension?", answer: 'Doctor Stephen Strange', aliases: ['doctor strange', 'stephen strange', 'strange'] },
  { id: 34, round: 'audio', text: "What tree-like Flora colossus creature speaks exclusively in the phrase, 'I am Groot'?", answer: 'Groot', aliases: ['groot'] }
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
