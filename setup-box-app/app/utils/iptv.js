// Lightweight M3U parser - avoids adding external deps
export async function fetchChannels(url) {
  if (!url) return [];
  try {
    const res = await fetch(url, { method: 'GET' });
    const txt = await res.text();
    const lines = txt.split(/\r?\n/).map(l => l.trim());
    const items = [];
    let lastMeta = null;
    const base = (() => {
      try { return new URL(url).origin + new URL(url).pathname.replace(/[^/]+$/, ''); } catch (e) { return null; }
    })();

    const parseAttrs = (attrStr) => {
      const attrs = {};
      // key="value" or key=value
      const re = /([A-Za-z0-9_-]+)=(?:"([^"]*)"|([^,\s]*))/g;
      let m;
      while ((m = re.exec(attrStr))) {
        attrs[m[1]] = m[2] ?? m[3] ?? '';
      }
      return attrs;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (line.startsWith('#EXTINF')) {
        // Example: #EXTINF:-1 tvg-id="..." tvg-logo="...",Channel Name
        const after = line.substring('#EXTINF:'.length);
        const commaIdx = after.indexOf(',');
        const metaPart = commaIdx !== -1 ? after.substring(0, commaIdx) : after;
        const titlePart = commaIdx !== -1 ? after.substring(commaIdx + 1).trim() : '';
        const attrs = parseAttrs(metaPart);
        lastMeta = { title: titlePart, attrs };
        continue;
      }
      if (line.startsWith('#')) continue;
      // Non-comment, non-empty: treat as URL for previous EXTINF
      let urlLine = line;
      // Resolve relative URLs against the playlist base if possible
      if (base && !/^(https?:)?\/\//i.test(urlLine)) {
        try { urlLine = new URL(urlLine, base).toString(); } catch (e) { /* leave as-is */ }
      }
      if (lastMeta) {
        const item = {
          name: lastMeta.title || lastMeta.attrs.tvg_name || lastMeta.attrs.title || 'Unknown',
          url: urlLine,
          logo: lastMeta.attrs['tvg-logo'] || lastMeta.attrs.logo || lastMeta.attrs.logo_url || null,
          group: lastMeta.attrs.group || lastMeta.attrs['group-title'] || null,
          tvg: {
            id: lastMeta.attrs['tvg-id'] || null,
            name: lastMeta.attrs['tvg-name'] || null,
            logo: lastMeta.attrs['tvg-logo'] || null,
          },
          raw: lastMeta,
        };
        items.push(item);
        lastMeta = null;
      } else {
        // orphan URL - add minimally
        items.push({ name: urlLine, url: urlLine, logo: null, group: null, tvg: {}, raw: null });
      }
    }
    // Heuristic: if this playlist appears to be a media playlist (contains .ts segments)
    // and does NOT contain any .m3u8 items, return the original playlist URL as a single stream
    try {
      const hasSegment = items.some(it => /\.ts(\?|$)/i.test(it.url));
      const hasM3u8 = items.some(it => /\.m3u8(\?|$)/i.test(it.url));
      if (hasSegment && !hasM3u8) {
        return [{ name: url, url }];
      }
    } catch (e) {
      // ignore
    }

    return items;
  } catch (e) {
    console.warn('fetchChannels error', e);
    return [];
  }
}

export default fetchChannels;
// import { parse } from 'iptv-playlist-parser';
// import axios from 'axios';

// export const fetchChannels = async (url) => {
//   const response = await axios.get(url);
//   const playlist = parse(response.data);
//   return playlist.items; // [{ name, url, tvgLogo, ... }]
// };