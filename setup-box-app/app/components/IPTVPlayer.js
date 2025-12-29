import React, { useRef, useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Dimensions } from 'react-native';
let Video;
let _videoModuleName = null;
try {
  // Prefer expo-video when available
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const mod = require('expo-video');
  Video = mod.Video || mod.default || mod;
  // No need to extract ResizeMode, use string literals
  _videoModuleName = 'expo-video';
} catch (e) {
  try {
    // Fallback to expo-av
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const mod = require('expo-av');
    Video = mod.Video || mod.default || mod;
    // No need to extract ResizeMode, use string literals
    _videoModuleName = 'expo-av';
  } catch (err) {
    // Last resort: leave undefined — we'll guard usage below
    Video = undefined;
    // No need to extract ResizeMode, use string literals
    _videoModuleName = null;
  }
}

// Fallback when ResizeMode is not exported (some versions export strings instead)
const RESIZE_COVER = 'cover';

const isHlsUrl = (u) => typeof u === 'string' && (u.includes('.m3u8') || /chunklist|hls/i.test(u));

const defaultHeaders = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36',
};

const liveBufferConfig = {
  minBufferMs: 15000.0,
  maxBufferMs: 60000.0,
  bufferForPlaybackMs: 2500.0,
  bufferForPlaybackAfterRebufferMs: 5000.0,
};

export default function IPTVPlayer({ streamUrl, style, useNativeControls = false }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [internalSrc, setInternalSrc] = useState(streamUrl ? streamUrl.trim() : null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    setInternalSrc(streamUrl ? streamUrl.trim() : null);
    setAttempts(0);
    setError(null);
    setLoading(true);
  }, [streamUrl]);

  const safeSource = internalSrc ? { uri: internalSrc, overrideFileExtensionAndroid: 'm3u8', headers: defaultHeaders } : null;

  useEffect(() => {
    return () => {
      // cleanup on unmount
      if (videoRef.current) {
        videoRef.current.stopAsync?.().catch(() => {});
        videoRef.current.unloadAsync?.().catch(() => {});
      }
    };
  }, []);

  const handleError = async (e) => {
    console.warn('IPTVPlayer error', e);
    setError(e);
    setLoading(false);

    const msg = (e && (e.error?.message || e.message || JSON.stringify(e))) || '';

    // If ExoPlayer reports BehindLiveWindow, attempt a recovery
    if (msg.includes('BehindLiveWindow') || msg.includes('behindlivewindow')) {
      if (attempts >= 3) return;
      setAttempts(prev => prev + 1);

      // 1) Try an in-place loadAsync recovery if available on the native player
      try {
        if (videoRef.current && typeof videoRef.current.loadAsync === 'function') {
          console.log('[IPTVPlayer] Attempting loadAsync recovery, attempt', attempts + 1);
          try {
            await videoRef.current.loadAsync(
              { uri: internalSrc, overrideFileExtensionAndroid: 'm3u8', headers: defaultHeaders },
              { shouldPlay: true },
              false
            );
            // success
            setLoading(false);
            setError(null);
            return;
          } catch (laErr) {
            console.warn('[IPTVPlayer] loadAsync recovery failed', laErr);
            // fall through to full reload
          }
        }
      } catch (err) {
        console.warn('[IPTVPlayer] loadAsync invocation error', err);
      }

      // 2) Full stop/unload and cache-busted retry (fallback)
      try {
        if (videoRef.current) {
          await videoRef.current.stopAsync().catch(() => {});
          await videoRef.current.unloadAsync().catch(() => {});
        }
      } catch (_) {}

      const sep = internalSrc && internalSrc.includes('?') ? '&' : '?';
      const busted = `${internalSrc || ''}${sep}r=${Date.now()}`;
      console.log('[IPTVPlayer] BehindLiveWindow recovery, retrying with', busted);
      setTimeout(() => {
        setInternalSrc(busted);
        setLoading(true);
        setError(null);
      }, 300);
      return;
    }

    // For other errors we don't auto-retry; show overlay
  };

  if (!safeSource) {
    return (
      <View style={[styles.empty, style]}>
        <Text style={{ color: '#888' }}>No stream URL</Text>
      </View>
    );
  }

  if (!Video) {
    return (
      <View style={[styles.empty, style]}>
        <Text style={{ color: '#f00', textAlign: 'center' }}>
          Video module not available ({_videoModuleName || 'none'}). Install expo-video or expo-av.
        </Text>
      </View>
    );
  }

  const bufferConfig = isHlsUrl(internalSrc) ? liveBufferConfig : undefined;

  return (
    <View style={[styles.container, style]}>
      <Video
        ref={videoRef}
        source={safeSource}
        style={styles.video}
        useNativeControls={useNativeControls}
        resizeMode="cover"
        shouldPlay={true}
        isLooping={false}
        rate={1.0}
        bufferConfig={bufferConfig}
        progressUpdateIntervalMillis={500.0}
        onLoadStart={() => { setLoading(true); setError(null); }}
        onReadyForDisplay={() => { setLoading(false); setError(null); }}
        onError={handleError}
      />

      {loading && (
        <View style={styles.overlayCenter} pointerEvents="none">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      )}

      {error && (
        <View style={styles.overlayCenter} pointerEvents="none">
          <Text style={{ color: 'white' }}>Playback error</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%', backgroundColor: 'black' },
  video: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  overlayCenter: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
});
// import React from 'react';
// import { Video } from 'expo-av';

// const IPTVPlayer = ({ streamUrl }) => (
//   <Video
//     source={{
//       uri: streamUrl,
//       overrideFileExtensionAndroid: 'm3u8',
//     }}
//     style={{ width: '100%', height: 250, backgroundColor: 'black' }}
//     useNativeControls
//     resizeMode="contain"
//     shouldPlay
//   />
// );

// export default IPTVPlayer;