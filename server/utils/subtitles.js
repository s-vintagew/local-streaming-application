import { spawn } from 'child_process';
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
    codec,
    language,
    title,
    kind,
    supported: kind === 'text'
  };
};

const cachePath = (id, index) => {
  const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(SUB_ROOT, `${safeId}_${Number(index)}.vtt`);
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

export const getSubtitleVtt = async (id, index, mediaPath) => {
  const dest = cachePath(id, index);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 10) return dest;
  const key = dest;
  if (extracting.has(key)) return extracting.get(key);
  const work = extractVtt(mediaPath, index, dest).finally(() => extracting.delete(key));
  extracting.set(key, work);
  return work;
};
