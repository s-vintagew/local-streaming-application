const DIRECT_CONTAINERS = new Set(['.mp4', '.webm', '.m4v']);
const DIRECT_VIDEO = new Set(['h264', 'avc', 'vp8', 'vp9', 'av1']);
const DIRECT_AUDIO = new Set(['aac', 'mp3', 'opus', 'vorbis', 'flac']);

const isTenBit = (stream) => {
  const pix = (stream.pix_fmt || '').toLowerCase();
  const bits = Number(stream.bits_per_raw_sample || 0);
  return pix.includes('10') || pix.includes('12') || bits > 8;
};

export const analyzeProbe = (metadata, extension) => {
  const video = metadata.streams?.find(s => s.codec_type === 'video') || {};
  const audio = metadata.streams?.find(s => s.codec_type === 'audio') || {};
  const ext = (extension || '').toLowerCase();
  const videoCodec = video.codec_name || 'unknown';
  const audioCodec = audio.codec_name || 'unknown';
  const pixFmt = video.pix_fmt || '';
  const tenBit = isTenBit(video);
  const h264 = videoCodec === 'h264' || videoCodec === 'avc';
  const videoDirect = DIRECT_VIDEO.has(videoCodec) && !tenBit;
  const audioDirect = !audio.codec_name || DIRECT_AUDIO.has(audioCodec);
  const containerDirect = DIRECT_CONTAINERS.has(ext);

  let playMode = 'transcode';
  if (videoDirect && containerDirect && audioDirect) {
    playMode = 'original';
  } else if (h264 && !tenBit) {
    playMode = 'transmux';
  }

  return {
    duration: metadata.format?.duration,
    format: metadata.format?.format_name,
    extension: ext,
    width: video.width,
    height: video.height,
    videoCodec,
    audioCodec,
    pixFmt,
    tenBit,
    audioChannels: audio.channels || 0,
    playMode,
    recommendedQuality: playMode === 'transcode' ? '720' : playMode
  };
};
