import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  Dimensions,
  FlatList,
  Platform,
  View,
  Text,
  Pressable,
  StyleSheet,
  Share,
  ActivityIndicator,
  Image as RNImage,
} from 'react-native';

import { Video } from 'expo-av';

// Use expo-image when available, else RN Image
let ImageComp;
try { ImageComp = require('expo-image').Image; } catch (e) { ImageComp = RNImage; }

const { height, width } = Dimensions.get('window');

const SAMPLE_VIDEOS = [
  // replace with your URLs or import from assets/data
  'http://103.175.73.12:8080/live/1/1_0.m3u8',
  'https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
];

// Use a working icon (local asset or a reliable remote icon)
const SHARE_ICON = 'https://cdn-icons-png.flaticon.com/512/786/786205.png';

const VideoTile = ({ uri, index, visibleIndex, pauseOverride, onShare, onSelect }) => {
  {console.log(`video props debug qqqqq ${uri}`)}
  const videoRef = useRef(null);
  const [playerKey, setPlayerKey] = useState(0); // Used to force re-mount
  const [isError, setIsError] = useState(false);

  // Force a remount when the uri changes to ensure the player loads the new stream
  useEffect(() => {
    setPlayerKey(k => k + 1);
  }, [uri]);

  useEffect(() => {
    // when visibility changes to this index, seek to 0
    if (visibleIndex === index) {
      try { videoRef.current?.seek?.(0); } catch (e) {}
    }
  }, [visibleIndex, index]);

  const isPlaying = visibleIndex === index && !pauseOverride;

  const handlePlaybackStatusUpdate = (status) => {
    try {
      console.log('[VideoTile] playback status', {
        uri,
        isPlaying: status?.isPlaying,
        isMuted: status?.isMuted,
        volume: status?.volume,
        positionMillis: status?.positionMillis,
        didJustFinish: status?.didJustFinish,
        error: status?.error,
      });
    } catch (e) {}

    if (status && status.error) {
      console.warn('tile video error', status.error);
      handleRemount();
    }

    if (status && status.didJustFinish && !status.isLooping) {
      console.log('Stream ended unexpectedly. Remounting...');
      handleRemount();
    }
  };

  const handleRemount = useCallback(() => {
    setIsError(true);
    setTimeout(() => {
      setPlayerKey(prev => prev + 1);
      setIsError(false);
    }, 1000);
  }, []);

  // Control playback explicitly via the Video ref to ensure reliable start/stop
  useEffect(() => {
    let mounted = true;
    const ctrl = async () => {
      const ref = videoRef.current;
      if (!ref || typeof ref.playAsync !== 'function') return;
      try {
        if (isPlaying) {
          await ref.playAsync();
        } else {
          await ref.pauseAsync();
        }
      } catch (e) {
        if (mounted) console.warn('[VideoTile] play/pause error', e);
      }
    };
    ctrl();
    return () => { mounted = false; };
  }, [isPlaying, playerKey]);

  useEffect(() => {
    if (!isError && isPlaying) {
      console.log('[VideoTile] Loading URL:', uri);
    }
  }, [uri, isPlaying, isError]);
  {console.log(`video props debug qqqqq ${uri}`)}
  return (
       
     <View style={[styles.tile, { height: Platform.OS === 'android' ? height : height }]}> 
      {!isError && (
          <Video
            key={uri + '::' + playerKey}
            ref={videoRef}
            source={{ uri: uri }}
            style={styles.video}
            shouldPlay={false}
            isMuted={false}
            volume={1.0}
            resizeMode={'cover'}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
      )}
      {isError && <View style={styles.center}><Text style={{color:'white'}}>Recovering stream...</Text></View>}

      <Pressable onPress={() => onSelect && onSelect(index, uri)} style={styles.overlay} />

      <Pressable style={styles.shareButton} onPress={() => onShare(uri)}>
        <ImageComp source={{ uri: SHARE_ICON }} style={styles.shareIcon} />
        <Text style={styles.shareText}>Share</Text>
      </Pressable>
    </View>
  );
};

export default function VerticalFeedScreen({ videos = SAMPLE_VIDEOS }) {
  console.log('[VerticalFeedScreen] incoming videos prop:', videos && videos.length ? videos.slice(0,10) : videos);
  const bottom = useBottomTabBarHeight();
  const [allVideos, setAllVideos] = useState(videos);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [pauseOverride, setPauseOverride] = useState(false);

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 80 });

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (!viewableItems || viewableItems.length === 0) return;
    const last = viewableItems[viewableItems.length - 1];
    const newIndex = typeof last.index === 'number' ? last.index : Number(last.key);
    if (!Number.isNaN(newIndex)) setVisibleIndex(newIndex);
  }).current;

  const fetchMore = () => {
    // placeholder: duplicate list to simulate more — only when there is more than one unique stream
    try {
      const uniq = Array.from(new Set(allVideos));
      if (uniq.length <= 1) {
        console.log('[VerticalFeedScreen] fetchMore skipped: only one unique stream available');
        return;
      }
    } catch (e) {}
    setAllVideos(prev => [...prev, ...prev.slice(0, 3)]);
  };

  const togglePause = () => setPauseOverride(p => !p);

  const onShare = async (uri) => {
    setPauseOverride(true);
    try {
      await Share.share({ title: 'Share video', message: uri });
    } catch (e) {}
    setTimeout(() => setPauseOverride(false), 500);
  };

  // Handler to jump to a channel when clicked
  const handleSelectChannel = (idx, uri) => {
    console.log('[VerticalFeedScreen] channel selected', { idx, uri });
    setVisibleIndex(idx);
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <FlatList
        data={allVideos}
        keyExtractor={(item, idx) => (typeof item === 'string' ? item : String(idx))}
        pagingEnabled
        decelerationRate={'fast'}
        snapToInterval={Platform.OS === 'android' ? height - bottom : undefined}
        showsVerticalScrollIndicator={false}
        initialNumToRender={1}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfigRef.current}
        onEndReachedThreshold={0.3}
        onEndReached={fetchMore}
        renderItem={({ item, index }) => (
          <VideoTile
            key={typeof item === 'string' ? item : String(index)}
            uri={item}
            index={index}
            visibleIndex={visibleIndex}
            pauseOverride={pauseOverride}
            onShare={onShare}
            onSelect={(i, u) => handleSelectChannel(i, u)}
          />
        )}
      />

      {pauseOverride && (
        <Pressable style={styles.pauseIndicator} onPress={togglePause}>
          <Text style={{ color: 'white', fontSize: 18 }}>Paused</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width },
  video: { width, height },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'black', opacity: 0.001 },
  shareButton: { position: 'absolute', right: 12, bottom: Platform.OS === 'android' ? 70 : 100, alignItems: 'center' },
  shareIcon: { width: 28, height: 28, tintColor: 'white' },
  shareText: { color: 'white', fontSize: 12, marginTop: 6 },
  pauseIndicator: { position: 'absolute', top: height / 2 - 20, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
