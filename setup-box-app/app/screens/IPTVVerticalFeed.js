import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import VerticalFeedScreen from './VerticalFeedScreen';
import fetchChannels from '../utils/iptv';

const DEFAULT_PLAYLIST = 'http://103.175.73.12:8080/live/1/1_0.m3u8';

export default function IPTVVerticalFeed({ playlistUrl, streamUrl, ...props }) {
  // Accept either `playlistUrl` or `streamUrl` (alias) and fall back to default
   {console.log(`video props debug qqqqq ${streamUrl}`)}
  const effectivePlaylist = (typeof playlistUrl === 'string' && playlistUrl) || (typeof streamUrl === 'string' && streamUrl) || DEFAULT_PLAYLIST;
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    console.log('[IPTVVerticalFeed] loading playlist:', effectivePlaylist);
    fetchChannels(effectivePlaylist)
      .then(items => {
        if (!mounted) return;
        const rawList = (items || []).map(i => i.url).filter(Boolean);
        // dedupe exact duplicates
        const deduped = Array.from(new Set(rawList));
        if (deduped.length !== rawList.length) {
          console.warn('[IPTVVerticalFeed] duplicate URLs detected; deduping', { rawCount: rawList.length, uniqueCount: deduped.length });
        }
        if (deduped.length === 1 && deduped[0] === effectivePlaylist) {
          console.warn('[IPTVVerticalFeed] playlist parsed to a single media stream (likely a media playlist) — only one unique stream found', deduped[0]);
        }
        console.log(`Fetched ${deduped.length} unique channels from playlist ${effectivePlaylist}`, deduped.slice(0,20));
        setUrls(deduped);
      })
      .catch(e => { if (mounted) setErr(e); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [effectivePlaylist]);

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
      <ActivityIndicator color="#f97316" />
    </View>
  );

  if (err) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
      <Text style={{ color: 'white' }}>Failed to load channels</Text>
      <Text style={{ color: '#ccc', marginTop: 8 }}>{String(err)}</Text>
    </View>
  );

  if (!urls || urls.length === 0) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
      <Text style={{ color: 'white' }}>No channels found in playlist</Text>
    </View>
  );
   {console.log(`video props debug qqqqq ${streamUrl}`)}
   {console.log(`video props debug qqqqq ${urls}`)}

  return (
    <VerticalFeedScreen videos={urls} />
  );
}
