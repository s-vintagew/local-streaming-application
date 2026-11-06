import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';

const STREAM_BASE = import.meta.env.VITE_STREAM_BASE || '/stream';

export const directStreamUrl = (id) => {
  const path = `${STREAM_BASE}?id=${encodeURIComponent(id)}&resolution=original`;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = window.location.origin;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
};

const playerHref = (player, streamUrl) => {
  const android = /android/i.test(navigator.userAgent);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (android) {
    const parsed = new URL(streamUrl);
    const scheme = parsed.protocol.replace(':', '');
    const pkg = player === 'mpv' ? 'is.xyz.mpv' : 'org.videolan.vlc';
    return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=${scheme};package=${pkg};action=android.intent.action.VIEW;end`;
  }
  if (player === 'vlc' && ios) {
    return `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(streamUrl)}`;
  }
  if (player === 'vlc') return `vlc://${streamUrl}`;
  return `mpv://${encodeURIComponent(streamUrl)}`;
};

export default function ExternalPlayerButton({ mediaId, variant = 'button', className = '' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 220;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    setMenuPos({ top: rect.bottom + 8, left });
    setCopied(false);
    setOpen(true);
  };

  const openPlayer = (player) => {
    const streamUrl = directStreamUrl(mediaId);
    window.location.assign(playerHref(player, streamUrl));
    setOpen(false);
  };

  const copyLink = async () => {
    const streamUrl = directStreamUrl(mediaId);
    try {
      await navigator.clipboard.writeText(streamUrl);
    } catch {
      const input = document.createElement('textarea');
      input.value = streamUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
  };

  const itemClass = 'flex w-full items-center gap-3 px-4 py-2 text-left text-gray-200 hover:bg-gray-800 transition';

  return (
    <div ref={rootRef} className={className} onClick={(event) => event.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className={variant === 'icon'
          ? 'w-10 h-10 rounded-full bg-gray-800 text-gray-300 flex items-center justify-center hover:bg-brand-red hover:text-white transition-colors shadow-sm'
          : variant === 'plain'
            ? 'text-white hover:text-brand-red flex items-center transition'
            : 'flex items-center space-x-2 bg-gray-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition-colors border border-gray-700'}
        title="Open in an external player"
      >
        <ExternalLink size={variant === 'button' ? 20 : variant === 'plain' ? 24 : 18} />
        {variant === 'button' && <span>Open in player</span>}
      </button>
      {open && menuPos && (
        <div
          className="fixed z-50 w-[220px] bg-gray-900 rounded-lg py-2 shadow-2xl border border-gray-800"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <button type="button" onClick={() => openPlayer('mpv')} className={itemClass}>
            MPV
          </button>
          <button type="button" onClick={() => openPlayer('vlc')} className={itemClass}>
            VLC
          </button>
          <button type="button" onClick={copyLink} className={itemClass}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Link copied' : 'Copy link'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
