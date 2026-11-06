import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const SUB_ROOT = process.env.SUB_CACHE_DIR || path.join(os.tmpdir(), 'vintagestream-subs');
const TEXT_CODECS = new Set([
  'subrip', 'srt', 'ass', 'ssa', 'webvtt', 'mov_text', 'text', 'ttml', 'eia_608', 'mini'
]);
const IMAGE_CODECS = new Set([
  'hdmv_pgs_subtitle', 'dvd_subtitle', 'dvb_subtitle', 'pgssub', 'xsub', 'hdmv_text_subtitle'
]);
const TEXT_SUB_EXT = new Set(['.srt', '.vtt', '.ass', '.ssa']);
const VIDEO_EXT = new Set(['.mp4', '.mkv', '.avi', '.webm']);

const LANG_LOOKUP = {
  en: 'eng', eng: 'eng', english: 'eng',
  hi: 'hin', hin: 'hin', hindi: 'hin',
  es: 'spa', spa: 'spa', spanish: 'spa',
  fr: 'fre', fre: 'fre', fra: 'fre', french: 'fre',
  de: 'ger', ger: 'ger', deu: 'ger', german: 'ger',
  it: 'ita', ita: 'ita', italian: 'ita',
  ja: 'jpn', jp: 'jpn', jpn: 'jpn', japanese: 'jpn',
  ko: 'kor', kor: 'kor', korean: 'kor',
  zh: 'chi', chi: 'chi', zho: 'chi', chinese: 'chi',
  ru: 'rus', rus: 'rus', russian: 'rus',
  pt: 'por', por: 'por', portuguese: 'por',
  pl: 'pol', pol: 'pol', polish: 'pol',
  ar: 'ara', ara: 'ara', arabic: 'ara',
  nl: 'dut', dut: 'dut', nld: 'dut', dutch: 'dut',
  sv: 'swe', swe: 'swe', swedish: 'swe',
  tr: 'tur', tur: 'tur', turkish: 'tur',
  th: 'tha', tha: 'tha', thai: 'tha',
  vi: 'vie', vie: 'vie', vietnamese: 'vie'
};

const META_TOKENS = new Set([
  'sdh', 'hi', 'cc', 'forced', 'hearing', 'impaired', 'full',
  'subtitle', 'subtitles', 'subs', 'sub'
]);

const TITLE_STOP = new Set([
  '1080p', '720p', '2160p', '480p', '4k', '8k', '10bit', '8bit',
  'webrip', 'web', 'dl', 'webdl', 'bluray', 'blu', 'ray', 'brrip', 'hdrip',
  'x264', 'x265', 'h264', 'h265', 'hevc', 'av1', 'aac', 'dts', 'ac3', 'ddp',
  'eac3', 'atmos', 'dd', 'ma', 'truehd', 'flac',
  'yts', 'mx', 'gg', 'bz', 'psa', 'bone', 'amzn', 'nf', 'dsnp',
  'multi', 'dual', 'audio', 'esub', 'uncut', 'explicit', 'extended',
  'complete', 'collection', 'repack', 'proper', 'internal'
]);

const extracting = new Map();

export const describeSubtitle = (stream) => {
  const codec = (stream.codec_name || '').toLowerCase();
  const tags = stream.tags || {};
  const language = tags.language || tags.LANGUAGE || 'und';
  const title = tags.title || tags.TITLE || '';
  let kind = 'text';
  if (IMAGE_CODECS.has(codec)) kind = 'image';
  else if (!TEXT_CODECS.has(codec) && codec) kind = 'unknown';
  return {
    index: stream.index,
    source: 'embedded',
    codec,
    language,
    title,
    kind,
    supported: kind === 'text'
  };
};

const cachePath = (id, index) => {
  const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  const safeIndex = String(index).replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(SUB_ROOT, `${safeId}_${safeIndex}.vtt`);
};

const extractVtt = (mediaPath, index, dest) =>
  new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = `${dest}.part`;
    const proc = spawn('ffmpeg', [
      '-hide_banner', '-nostdin', '-y',
      '-i', mediaPath,
      '-map', `0:${index}`,
      '-f', 'webvtt',
      tmp
    ], { stdio: ['ignore', 'ignore', 'pipe'] });

    let errTail = '';
    proc.stderr.on('data', (c) => {
      errTail = (errTail + c.toString()).slice(-1500);
    });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0 && fs.existsSync(tmp) && fs.statSync(tmp).size > 10) {
        fs.renameSync(tmp, dest);
        return resolve(dest);
      }
      try {
        fs.unlinkSync(tmp);
      } catch {
        // ignore
      }
      reject(new Error(errTail.slice(-400) || `ffmpeg subtitle exit ${code}`));
    });
  });

const cacheIsFresh = (dest, sourcePath) => {
  if (!fs.existsSync(dest) || fs.statSync(dest).size <= 10) return false;
  try {
    return fs.statSync(dest).mtimeMs >= fs.statSync(sourcePath).mtimeMs;
  } catch {
    return false;
  }
};

export const getSubtitleVtt = async (id, index, mediaPath) => {
  const dest = cachePath(id, index);
  if (cacheIsFresh(dest, mediaPath)) return dest;
  const key = dest;
  if (extracting.has(key)) return extracting.get(key);
  const work = extractVtt(mediaPath, index, dest).finally(() => extracting.delete(key));
  extracting.set(key, work);
  return work;
};

const readDir = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

const isSubtitleDirName = (name) => /^subs$/i.test(name) || /^subtitles?\b/i.test(name);

const fileIndex = (filePath) => (
  `f${crypto.createHash('sha1').update(path.resolve(filePath)).digest('hex').slice(0, 10)}`
);

const tokensOf = (value) => String(value).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

const episodeKey = (value) => {
  const match = String(value).match(/S(\d{1,2})\s*E(\d{1,3})/i);
  if (!match) return null;
  return `${Number(match[1])}:${Number(match[2])}`;
};

const leadingKey = (value) => {
  const base = path.basename(value);
  const match = base.match(/^(\d{1,2})(?:\D|$)/);
  return match ? String(Number(match[1])) : null;
};

const languageOnlyName = (base) => {
  const tokens = tokensOf(base);
  if (!tokens.length) return false;
  return tokens.every((token) => LANG_LOOKUP[token] || META_TOKENS.has(token) || /^\d{1,2}$/.test(token));
};

const titleTokens = (value) => tokensOf(value).filter((token) => (
  token.length > 1
  && !TITLE_STOP.has(token)
  && !LANG_LOOKUP[token]
  && !META_TOKENS.has(token)
  && !/^(19|20)\d{2}$/.test(token)
  && !/^s\d{1,2}e\d{1,3}$/.test(token)
  && !/^\d+$/.test(token)
));

const sharesTitle = (videoBase, subBase) => {
  const videoTokens = titleTokens(videoBase);
  const subTokens = titleTokens(subBase);
  if (!videoTokens.length || !subTokens.length) return false;
  const shorter = videoTokens.length <= subTokens.length ? videoTokens : subTokens;
  const longer = new Set(videoTokens.length <= subTokens.length ? subTokens : videoTokens);
  const hits = shorter.filter((token) => longer.has(token)).length;
  return hits >= Math.min(2, shorter.length) && hits / shorter.length >= 0.6;
};

const describeExternalFile = (filePath) => {
  const base = path.basename(filePath, path.extname(filePath));
  const tokens = tokensOf(base);
  let language = 'und';
  for (const token of tokens) {
    if (LANG_LOOKUP[token]) {
      language = LANG_LOOKUP[token];
      break;
    }
  }
  let title = '';
  if (tokens.some((token) => token === 'sdh' || token === 'hi' || token === 'cc' || token === 'hearing' || token === 'impaired')) {
    title = 'SDH';
  } else if (tokens.includes('forced')) {
    title = 'Forced';
  } else if (language === 'und') {
    title = 'External';
  }
  return {
    index: fileIndex(filePath),
    source: 'file',
    codec: path.extname(filePath).slice(1).toLowerCase(),
    language,
    title,
    kind: 'text',
    supported: true,
    file: path.resolve(filePath)
  };
};

const collectTextSubs = (dir, depth) => {
  const found = [];
  for (const entry of readDir(dir)) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth > 0 && !/^vodsub/i.test(entry.name)) {
        found.push(...collectTextSubs(full, depth - 1));
      }
      continue;
    }
    if (entry.isFile() && TEXT_SUB_EXT.has(path.extname(entry.name).toLowerCase())) {
      found.push(full);
    }
  }
  return found;
};

const videoCount = (dir) => readDir(dir).filter((entry) => (
  entry.isFile() && VIDEO_EXT.has(path.extname(entry.name).toLowerCase())
)).length;

const belongsToVideo = (videoPath, subPath, alone) => {
  const videoDir = path.dirname(videoPath);
  const videoBase = path.basename(videoPath, path.extname(videoPath));
  const subBase = path.basename(subPath, path.extname(subPath));
  const underVideo = subPath === path.join(videoDir, path.basename(subPath))
    || subPath.startsWith(videoDir + path.sep);

  const videoEpisode = episodeKey(videoBase);
  const subEpisode = episodeKey(subPath);
  if (videoEpisode && subEpisode) return videoEpisode === subEpisode;
  if (videoEpisode && !subEpisode) return false;

  const videoLead = leadingKey(videoBase);
  const subLead = leadingKey(subBase);
  if (videoLead && subLead) return videoLead === subLead;

  const subLower = subBase.toLowerCase();
  const videoLower = videoBase.toLowerCase();
  if (subLower === videoLower || subLower.startsWith(`${videoLower}.`) || subLower.startsWith(`${videoLower} `)) {
    return true;
  }

  if (languageOnlyName(subBase) && underVideo && alone) return true;
  if (path.dirname(subPath) === videoDir && sharesTitle(videoBase, subBase)) return true;

  const parentName = path.basename(path.dirname(subPath));
  if (!isSubtitleDirName(parentName) && (sharesTitle(videoBase, parentName) || parentName.toLowerCase().startsWith(videoLower.slice(0, Math.min(24, videoLower.length))))) {
    return true;
  }
  return false;
};

const disambiguate = (tracks) => {
  const groups = new Map();
  for (const track of tracks) {
    const key = `${track.language}|${track.title}`;
    const list = groups.get(key) || [];
    list.push(track);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.forEach((track, index) => {
      track.title = track.title ? `${track.title} ${index + 1}` : `Track ${index + 1}`;
    });
  }
  return tracks;
};

/**
 * External captions next to a video:
 *   Movie Folder/movie.mkv
 *   Movie Folder/movie.eng.srt
 *   Movie Folder/Subs/eng.srt
 *   Movie Folder/Subs/<episode>/English.srt
 *   Collection/Subtitles/01 English.srt   (sibling of the movie folder)
 */
export const listExternalSubtitles = (mediaPath) => {
  if (!mediaPath) return [];
  const videoDir = path.dirname(mediaPath);
  const parentDir = path.dirname(videoDir);
  const candidates = new Set(collectTextSubs(videoDir, 0));

  for (const entry of readDir(videoDir)) {
    if (entry.isDirectory() && isSubtitleDirName(entry.name)) {
      collectTextSubs(path.join(videoDir, entry.name), 2).forEach((file) => candidates.add(file));
    }
  }
  if (parentDir && parentDir !== videoDir) {
    for (const entry of readDir(parentDir)) {
      if (entry.isDirectory() && isSubtitleDirName(entry.name)) {
        collectTextSubs(path.join(parentDir, entry.name), 2).forEach((file) => candidates.add(file));
      }
    }
  }

  const alone = videoCount(videoDir) === 1;
  const matched = [...candidates]
    .filter((file) => belongsToVideo(mediaPath, file, alone))
    .sort((a, b) => a.localeCompare(b))
    .map(describeExternalFile);

  return disambiguate(matched);
};

export const toPublicSubtitle = (track) => {
  const { file, ...pub } = track;
  return pub;
};

const assertNearVideo = (filePath, mediaPath) => {
  const realFile = fs.realpathSync(filePath);
  const videoDir = fs.realpathSync(path.dirname(mediaPath));
  const boundary = path.dirname(videoDir);
  const rel = path.relative(boundary, realFile);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Subtitle file is outside the movie folder');
  }
  return realFile;
};

export const srtToVtt = (raw) => {
  const text = String(raw).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const body = text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return `WEBVTT\n\n${body.trim()}\n`;
};

const writeVttFile = (dest, contents) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;
  fs.writeFileSync(tmp, contents);
  fs.renameSync(tmp, dest);
  return dest;
};

export const getExternalSubtitleVtt = async (id, index, mediaPath) => {
  const track = listExternalSubtitles(mediaPath).find((item) => item.index === String(index));
  if (!track) {
    const error = new Error('Subtitle file not found');
    error.status = 404;
    throw error;
  }
  const realFile = assertNearVideo(track.file, mediaPath);
  const dest = cachePath(id, track.index);
  if (cacheIsFresh(dest, realFile)) return dest;

  const key = dest;
  if (extracting.has(key)) return extracting.get(key);

  const work = (async () => {
    const ext = path.extname(realFile).toLowerCase();
    if (ext === '.srt' || ext === '.vtt') {
      const raw = fs.readFileSync(realFile);
      const text = raw.toString('utf8');
      const vtt = ext === '.vtt' && /^\uFEFF?WEBVTT/i.test(text) ? text.replace(/^\uFEFF/, '') : srtToVtt(text);
      return writeVttFile(dest, vtt);
    }
    return extractVtt(realFile, 0, dest);
  })().finally(() => extracting.delete(key));

  extracting.set(key, work);
  return work;
};
