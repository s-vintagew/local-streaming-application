// Temporary Marvel shelf. Delete this file when the Marvel PR is reverted.

const CATALOG = [
  { phrase: 'iron man 2', order: 3, phase: 'phase-1' },
  { phrase: 'iron man 3', order: 7, phase: 'phase-2' },
  { phrase: 'iron man', order: 1, phase: 'phase-1' },
  { phrase: 'the incredible hulk', order: 2, phase: 'phase-1' },
  { phrase: 'incredible hulk', order: 2, phase: 'phase-1' },
  { phrase: 'thor the dark world', order: 8, phase: 'phase-2' },
  { phrase: 'thor ragnarok', order: 17, phase: 'phase-3' },
  { phrase: 'thor love and thunder', order: 29, phase: 'phase-4' },
  { phrase: 'thor', order: 4, phase: 'phase-1' },
  { phrase: 'captain america the first avenger', order: 5, phase: 'phase-1' },
  { phrase: 'captain america the winter soldier', order: 9, phase: 'phase-2' },
  { phrase: 'captain america civil war', order: 13, phase: 'phase-3' },
  { phrase: 'captain america brave new world', order: 36, phase: 'phase-5' },
  { phrase: 'avengers age of ultron', order: 11, phase: 'phase-2' },
  { phrase: 'avengers infinity war', order: 19, phase: 'phase-3' },
  { phrase: 'avengers endgame', order: 22, phase: 'phase-3' },
  { phrase: 'avengers doomsday', order: 39, phase: 'phase-6' },
  { phrase: 'avengers secret wars', order: 40, phase: 'phase-6' },
  { phrase: 'the avengers', order: 6, phase: 'phase-1' },
  { phrase: 'avengers', order: 6, phase: 'phase-1' },
  { phrase: 'guardians of the galaxy vol 3', order: 34, phase: 'phase-5' },
  { phrase: 'guardians of the galaxy volume 3', order: 34, phase: 'phase-5' },
  { phrase: 'guardians of the galaxy vol 2', order: 15, phase: 'phase-3' },
  { phrase: 'guardians of the galaxy volume 2', order: 15, phase: 'phase-3' },
  { phrase: 'guardians of the galaxy', order: 10, phase: 'phase-2' },
  { phrase: 'ant man and the wasp quantumania', order: 33, phase: 'phase-5' },
  { phrase: 'ant man and the wasp', order: 20, phase: 'phase-3' },
  { phrase: 'ant man', order: 12, phase: 'phase-2' },
  { phrase: 'doctor strange in the multiverse of madness', order: 28, phase: 'phase-4' },
  { phrase: 'doctor strange', order: 14, phase: 'phase-3' },
  { phrase: 'spider man no way home', order: 27, phase: 'phase-4' },
  { phrase: 'spider man far from home', order: 23, phase: 'phase-3' },
  { phrase: 'spider man homecoming', order: 16, phase: 'phase-3' },
  { phrase: 'black panther wakanda forever', order: 30, phase: 'phase-4' },
  { phrase: 'black panther', order: 18, phase: 'phase-3' },
  { phrase: 'captain marvel', order: 21, phase: 'phase-3' },
  { phrase: 'black widow', order: 24, phase: 'phase-4' },
  { phrase: 'shang chi and the legend of the ten rings', order: 25, phase: 'phase-4' },
  { phrase: 'shang chi', order: 25, phase: 'phase-4' },
  { phrase: 'eternals', order: 26, phase: 'phase-4' },
  { phrase: 'the marvels', order: 35, phase: 'phase-5' },
  { phrase: 'deadpool and wolverine', order: 37, phase: 'phase-5' },
  { phrase: 'deadpool wolverine', order: 37, phase: 'phase-5' },
  { phrase: 'deadpool 2', order: 201, phase: 'other' },
  { phrase: 'deadpool', order: 200, phase: 'other' },
  { phrase: 'thunderbolts', order: 38, phase: 'phase-5' },
  { phrase: 'fantastic four first steps', order: 41, phase: 'phase-6' },
  { phrase: 'agents of s h i e l d', order: 100, phase: 'series' },
  { phrase: 'agents of shield', order: 100, phase: 'series' },
  { phrase: 'agent carter', order: 101, phase: 'series' },
  { phrase: 'wandavision', order: 102, phase: 'series' },
  { phrase: 'wanda vision', order: 102, phase: 'series' },
  { phrase: 'the falcon and the winter soldier', order: 103, phase: 'series' },
  { phrase: 'falcon and the winter soldier', order: 103, phase: 'series' },
  { phrase: 'loki', order: 104, phase: 'series' },
  { phrase: 'what if', order: 105, phase: 'series' },
  { phrase: 'hawkeye', order: 106, phase: 'series' },
  { phrase: 'moon knight', order: 107, phase: 'series' },
  { phrase: 'ms marvel', order: 108, phase: 'series' },
  { phrase: 'she hulk', order: 109, phase: 'series' },
  { phrase: 'secret invasion', order: 110, phase: 'series' },
  { phrase: 'your friendly neighborhood spider man', order: 113, phase: 'series' },
  { phrase: 'daredevil born again', order: 114, phase: 'series' },
  { phrase: 'ironheart', order: 116, phase: 'series' },
  { phrase: 'wonder man', order: 117, phase: 'series' },
  { phrase: 'vision quest', order: 118, phase: 'series' },
  { phrase: 'visionquest', order: 118, phase: 'series' },
  { phrase: 'marvel zombies', order: 119, phase: 'series' },
  { phrase: 'jessica jones', order: 202, phase: 'other' },
  { phrase: 'luke cage', order: 203, phase: 'other' },
  { phrase: 'iron fist', order: 204, phase: 'other' },
  { phrase: 'the defenders', order: 205, phase: 'other' },
  { phrase: 'the punisher', order: 206, phase: 'other' },
  { phrase: 'spider noir', order: 207, phase: 'other' },
  { phrase: 'agatha all along', order: 112, phase: 'series' },
  { phrase: 'agatha', order: 112, phase: 'series' },
  { phrase: 'echo', order: 111, phase: 'series' },
  { phrase: 'daredevil', order: 208, phase: 'other' },
  { phrase: 'inhumans', order: 209, phase: 'other' },
  { phrase: 'cloak and dagger', order: 210, phase: 'other' }
];

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesPhrase(haystack, phrase) {
  const body = phrase
    .split(' ')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^a-z0-9]+');
  return new RegExp(`(^|[^a-z0-9])${body}([^a-z0-9]|$)`).test(haystack);
}

function isMarvelFolder(fullPath) {
  return String(fullPath || '')
    .split(/[\\/]/)
    .some((segment) => {
      const name = segment.trim().toLowerCase();
      return name === 'marvel' || name === 'mcu' || name.startsWith('marvel cinematic');
    });
}

export function classifyMarvel(fullPath, ...labels) {
  const blob = normalize(labels.filter(Boolean).join(' '));
  let best = null;
  for (const entry of CATALOG) {
    if (!includesPhrase(blob, entry.phrase)) continue;
    if (!best || entry.phrase.length > best.phrase.length) best = entry;
  }
  if (best) {
    return { marvel: true, order: best.order, phase: best.phase };
  }
  if (isMarvelFolder(fullPath)) {
    return { marvel: true, order: 10000, phase: 'folder' };
  }
  return { marvel: false, order: 10000, phase: null };
}
