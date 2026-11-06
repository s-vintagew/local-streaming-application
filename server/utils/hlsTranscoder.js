import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const HLS_ROOT = process.env.HLS_CACHE_DIR || path.join(os.tmpdir(), 'vintagestream-hls');
const VAAPI_DEVICE = process.env.VAAPI_DEVICE || '/dev/dri/renderD128';

const jobs = new Map();
let startSeq = 0;
let startChain = Promise.resolve();

export class JobCancelled extends Error {
  constructor(reason = 'cancelled') {
    super(reason);
    this.cancelled = true;
  }
}

export const sessionKey = (id, resolution) => {
  const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  const safeRes = String(resolution || '720').replace(/[^a-zA-Z0-9]/g, '');
  return `${safeId}_${safeRes}`;
};

export const getSessionDir = (id, resolution) =>
  path.join(HLS_ROOT, sessionKey(id, resolution));

let vaapiDisabled = process.env.HLS_DISABLE_VAAPI === '1';

const vaapiUsable = () => !vaapiDisabled && fs.existsSync(VAAPI_DEVICE);

const killProc = (proc) => {
  if (!proc || proc.killed) return;
  try {
    proc.kill('SIGKILL');
  } catch {
    // already gone
  }
};

const killJob = (key) => {
  const job = jobs.get(key);
  if (!job) return;
  killProc(job.proc);
  jobs.delete(key);
};

const killAllJobs = () => {
  for (const key of [...jobs.keys()]) {
    const dir = jobs.get(key)?.dir;
    killJob(key);
    if (dir) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }
};

const seekArgs = (startTime) => {
  const t = Math.max(0, Number(startTime) || 0);
  return t >= 0.5 ? ['-ss', t.toFixed(3)] : [];
};

const buildArgs = ({ mediaPath, dir, resolution, useVaapi, startTime = 0 }) => {
  const playlist = path.join(dir, 'index.m3u8');
  const segment = path.join(dir, 'seg%05d.ts');
  const seek = seekArgs(startTime);
  const hlsTail = [
    '-sn',
    '-avoid_negative_ts', 'make_zero',
    '-f', 'hls',
    '-hls_time', '4',
    '-hls_playlist_type', 'event',
    '-hls_flags', 'independent_segments',
    '-hls_list_size', '0',
    '-hls_segment_filename', segment,
    playlist
  ];

  if (resolution === 'transmux') {
    return [
      '-hide_banner', '-nostdin', '-y',
      ...seek,
      '-i', mediaPath,
      '-map', '0:v:0',
      '-map', '0:a:0?',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-ac', '2',
      '-ar', '44100',
      '-b:a', '128k',
      ...hlsTail
    ];
  }

  const height = Number.parseInt(resolution, 10) || 720;
  const maxHeight = Number(process.env.HLS_MAX_HEIGHT || 720);
  const wanted = [480, 720, 1080].includes(height) ? height : 720;
  const safeHeight = Math.min(wanted, maxHeight) >= 720 ? 720 : 480;

  if (useVaapi) {
    // Software decode (handles 10-bit HEVC), then VAAPI encode. Full hwaccel
    // decode+scale failed on this Picasso APU with Invalid argument.
    return [
      '-hide_banner', '-nostdin', '-y',
      '-init_hw_device', `vaapi=va:${VAAPI_DEVICE}`,
      '-filter_hw_device', 'va',
      ...seek,
      '-i', mediaPath,
      '-map', '0:v:0',
      '-map', '0:a:0?',
      '-vf', `format=nv12,hwupload,scale_vaapi=w=-2:h=${safeHeight}`,
      '-c:v', 'h264_vaapi',
      '-b:v', safeHeight >= 1080 ? '4M' : safeHeight >= 720 ? '2500k' : '1200k',
      '-maxrate', safeHeight >= 1080 ? '5M' : safeHeight >= 720 ? '3M' : '1500k',
      '-c:a', 'aac',
      '-ac', '2',
      '-ar', '44100',
      '-b:a', '128k',
      ...hlsTail
    ];
  }

  return [
    '-hide_banner', '-nostdin', '-y',
    ...seek,
    '-i', mediaPath,
    '-map', '0:v:0',
    '-map', '0:a:0?',
    '-vf', `scale=-2:${safeHeight}`,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-crf', '26',
    '-maxrate', safeHeight >= 1080 ? '5M' : safeHeight >= 720 ? '3M' : '1500k',
    '-bufsize', safeHeight >= 1080 ? '10M' : safeHeight >= 720 ? '6M' : '3M',
    '-pix_fmt', 'yuv420p',
    '-g', '48',
    '-c:a', 'aac',
    '-ac', '2',
    '-ar', '44100',
    '-b:a', '128k',
    ...hlsTail
  ];
};

const spawnFfmpeg = (args, dir) => {
  const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  proc._stderrTail = '';
  proc.stderr.on('data', (chunk) => {
    proc._stderrTail = (proc._stderrTail + chunk.toString()).slice(-2000);
  });
  proc.on('exit', (code) => {
    if (code && code !== 0 && code !== 255) {
      console.error(`HLS ffmpeg exited ${code}: ${proc._stderrTail.slice(-400)}`);
    }
  });
  return proc;
};

const waitForPlaylist = (dir, proc, { timeoutMs = 45000, isStale } = {}) =>
  new Promise((resolve, reject) => {
    const playlist = path.join(dir, 'index.m3u8');
    const started = Date.now();
    const tick = () => {
      if (isStale?.()) {
        killProc(proc);
        return reject(new JobCancelled('superseded'));
      }
      if (proc.killed || (proc.exitCode !== null && proc.exitCode !== undefined && proc.exitCode !== 0)) {
        return reject(new Error(proc._stderrTail?.slice(-500) || 'ffmpeg exited before HLS playlist'));
      }
      if (fs.existsSync(playlist)) {
        try {
          const txt = fs.readFileSync(playlist, 'utf8');
          if (txt.includes('.ts')) return resolve(playlist);
        } catch {
          // still writing
        }
      }
      if (Date.now() - started > timeoutMs) {
        killProc(proc);
        return reject(new Error('Timed out waiting for first HLS segment'));
      }
      setTimeout(tick, 250);
    };
    tick();
  });

const runHlsJob = async ({ id, resolution, mediaPath, startTime = 0, isStale }) => {
  if (isStale?.()) throw new JobCancelled('superseded');

  const key = sessionKey(id, resolution);
  const dir = getSessionDir(id, resolution);
  const start = Math.max(0, Number(startTime) || 0);
  const existing = jobs.get(key);
  const alive = existing && existing.proc.exitCode === null && !existing.proc.killed;
  const sameWindow = alive && Math.abs((existing.startTime || 0) - start) < 3;

  if (sameWindow && jobs.size === 1) {
    if (fs.existsSync(path.join(dir, 'index.m3u8'))) return { key, dir, job: existing };
    await waitForPlaylist(dir, existing.proc, { isStale });
    return { key, dir, job: existing };
  }

  killAllJobs();
  if (isStale?.()) throw new JobCancelled('superseded');

  fs.mkdirSync(dir, { recursive: true });

  const tryVaapi = resolution !== 'transmux' && vaapiUsable();
  const spawnJob = (useVaapi) => {
    const proc = spawnFfmpeg(buildArgs({ mediaPath, dir, resolution, useVaapi, startTime: start }), dir);
    const job = { proc, dir, id, resolution, vaapi: useVaapi, startTime: start };
    jobs.set(key, job);
    return { proc, job };
  };

  let { proc, job } = spawnJob(tryVaapi);

  try {
    await waitForPlaylist(dir, proc, { isStale });
    return { key, dir, job };
  } catch (err) {
    if (err.cancelled) throw err;
    if (tryVaapi && !isStale?.()) {
      vaapiDisabled = true;
      console.warn(`VAAPI HLS failed, disabling VAAPI for this process: ${err.message}`);
      killAllJobs();
      fs.mkdirSync(dir, { recursive: true });
      ({ proc, job } = spawnJob(false));
      await waitForPlaylist(dir, proc, { isStale });
      return { key, dir, job };
    }
    throw err;
  }
};

export const ensureHlsJob = (opts) => {
  const mySeq = ++startSeq;
  const isStale = () => mySeq !== startSeq || Boolean(opts.isAborted?.());
  const work = startChain.then(() => runHlsJob({ ...opts, isStale }));
  startChain = work.catch(() => {});
  return work;
};

export const resolveHlsFile = (session, file) => {
  if (!/^[a-zA-Z0-9_-]+$/.test(session || '')) return null;
  const base = path.basename(file);
  if (!/^(index\.m3u8|seg\d+\.ts)$/.test(base)) return null;
  const full = path.join(HLS_ROOT, session, base);
  const rel = path.relative(HLS_ROOT, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return full;
};
