import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    Modal,
    StatusBar,
    Alert,
    Linking,
    Dimensions,
    AppState,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/authContext';
import api from '@/services/api';
import { Video, ResizeMode } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { YoutubeView, useYouTubePlayer, useYouTubeEvent } from 'react-native-youtube-bridge';

const { height: windowHeight } = Dimensions.get('window');
const PLAYER_HEIGHT = Math.max(240, Math.floor(windowHeight * 0.65));

export default function SeriesScreen() {
    const { isAuthenticated, serverInfo } = useAuth();

    // Main states
    const [series, setSeries] = useState([]);
    const [groupedSeries, setGroupedSeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeries, setSelectedSeries] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showRecommendations, setShowRecommendations] = useState(false);

    // Video states
    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isPlaying, setIsPlaying] = useState(true);
    const [useProxy, setUseProxy] = useState(true);
    const [proxyAttempted, setProxyAttempted] = useState(false);
    const [bothAttemptsFailed, setBothAttemptsFailed] = useState(false);
    const [currentStreamUrl, setCurrentStreamUrl] = useState(null);

    // Navigation states (touch-friendly)
    const [focusedGenre, setFocusedGenre] = useState(0);
    const [focusedShowIndex, setFocusedShowIndex] = useState(0);

    const videoRef = useRef(null);

    // Fetch series
    useEffect(() => {
        if (isAuthenticated) fetchSeries();
    }, [isAuthenticated]);

    // Safe auto-start after series load
    useEffect(() => {
        if (groupedSeries.length > 0 && groupedSeries[0]?.data?.length > 0) {
            handleShowChange(groupedSeries[0].data[0]);
        }
    }, [groupedSeries.length]);

    // AppState refresh
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                fetchSeries();
            }
        });
        return () => subscription?.remove();
    }, []);

    async function fetchSeries() {
        try {
            setLoading(true);
            const response = await api.get('/customer/series');
            if (response.data.success) {
                setSeries(response.data.data.series);
                setGroupedSeries(
                    Object.entries(response.data.data.groupedByGenre).map(([genre, shows]) => ({
                        title: genre,
                        data: shows
                    }))
                );
            }
        } catch {
            Alert.alert('Error', 'Failed to load series. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    const analyzeStreamUrl = (url) => {
        if (!url) return { type: 'unknown', isValid: false };
        const urlLower = url.toLowerCase();

        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
            if (urlLower.includes('live')) return { type: 'youtube-live', isValid: true };
            if (urlLower.includes('watch?v=')) return { type: 'youtube-video', isValid: true };
            if (urlLower.includes('playlist') || urlLower.includes('list=')) return { type: 'youtube-playlist', isValid: true };
            if (urlLower.includes('/c/') || urlLower.includes('/@') || urlLower.includes('/channel/')) return { type: 'youtube-channel', isValid: true };
            return { type: 'youtube-video', isValid: true };
        }

        if (urlLower.includes('.m3u8') || urlLower.includes('m3u')) return { type: 'hls', isValid: true };
        if (urlLower.includes('chunklist')) return { type: 'hls', isValid: true };
        if (urlLower.includes('/hls/')) return { type: 'hls', isValid: true };

        if (urlLower.includes('.mp4')) return { type: 'mp4', isValid: true };
        if (urlLower.match(/\\.(mp4|m4v|mov)\\?/)) return { type: 'mp4', isValid: true };

        if (urlLower.includes('.mkv')) return { type: 'mkv', isValid: true };

        if (url.match(/:\d{4}/)) return { type: 'iptv', isValid: true };
        if (url.match(/\/live\//)) return { type: 'iptv', isValid: true };

        if (urlLower.includes('rtmp://')) return { type: 'rtmp', isValid: true };

        if (url.startsWith('http://') || url.startsWith('https://')) return { type: 'stream', isValid: true };

        return { type: 'unknown', isValid: false };
    };

    const extractVideoId = (url) => {
        if (!url) return null;
        const patterns = [
            /youtu\.be\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    };

    const extractPlaylistId = (url) => {
        if (!url) return null;
        const playlistRegex = /[?&]list=([a-zA-Z0-9_-]+)/;
        const match = url.match(playlistRegex);
        return match ? match[1] : null;
    };

    const getCurrentStreamUrl = (show, proxyEnabled) => {
        if (!show) return null;
        const type = analyzeStreamUrl(show.mediaUrl);

        if (type.type.startsWith('youtube')) {
            return { uri: show.mediaUrl };
        }

        const baseUrl = proxyEnabled && show.proxyUrl && serverInfo?.proxyEnabled ? show.proxyUrl : show.mediaUrl;

        console.log('Series Stream Load:', {
            showName: show.title,
            streamType: type.type,
            isProxy: useProxy && !!show.proxyUrl,
            finalUrl: baseUrl.substring(0, 100) + '...'
        });

        return {
            uri: baseUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Referer: show.mediaUrl.split('/').slice(0, 3).join('/'),
                Origin: show.mediaUrl.split('/').slice(0, 3).join('/'),
                Accept: '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
                'Accept-Encoding': 'identity',
                Connection: 'keep-alive',
            },
        };
    };

    const loadStream = async (show, proxyEnabled) => {
        setVideoLoading(true);
        setVideoError(false);
        setErrorMessage('');

        const newUrl = getCurrentStreamUrl(show, proxyEnabled);
        const newUrlString = JSON.stringify(newUrl);

        if (newUrlString !== currentStreamUrl) {
            setCurrentStreamUrl(newUrlString);

            if (videoRef.current) {
                try {
                    await videoRef.current.unloadAsync();
                    await videoRef.current.loadAsync(newUrl, { shouldPlay: true });
                } catch (error) {
                    setVideoError(true);
                    setVideoLoading(false);
                    if (proxyEnabled && show.proxyUrl) {
                        loadStream(show, false);
                    } else {
                        setErrorMessage('No stream available');
                    }
                }
            }
        }
    };

    // Auto load stream when series changes
    useEffect(() => {
        if (selectedSeries) {
            loadStream(selectedSeries, true);
        }
    }, [selectedSeries]);

    // 🔥 BULLETPROOF CLEANUP
    useEffect(() => {
        return () => {
            console.log('🔴 SeriesScreen UNMOUNT - Cleaning up video');

            if (videoRef.current) {
                try {
                    videoRef.current.pauseAsync?.();
                    videoRef.current.stopAsync?.();
                    videoRef.current.unloadAsync();
                    videoRef.current.setOnPlaybackStatusUpdate(null);
                } catch (e) {
                    console.log('Series video cleanup error:', e);
                }
            }

            setSelectedSeries(null);
            setVideoLoading(false);
            setVideoError(false);
            setCurrentStreamUrl(null);
        };
    }, []);

    const handleStreamError = () => {
        if (!proxyAttempted && serverInfo?.proxyEnabled) {
            setProxyAttempted(true);
            setUseProxy(!useProxy);
            setVideoError(false);
            setVideoLoading(true);
        } else {
            setBothAttemptsFailed(true);
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage('Unable to load stream with both proxy and direct connection. Please switch to another series.');
        }
    };

    // COMPLETE YouTube Players (ALL types)
    const YouTubeVideoPlayer = ({ videoId }) => {
        const player = useYouTubePlayer(videoId, {
            autoplay: true,
            muted: false,
            controls: true,
            playsinline: true,
            rel: false,
            modestbranding: true,
        });

        useYouTubeEvent(player, 'ready', () => {
            setVideoLoading(false);
            setVideoError(false);
            setBothAttemptsFailed(false);
        });

        useYouTubeEvent(player, 'error', (error) => {
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Error: ${error.message || 'Unable to play video'}`);
        });

        return (
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                <YoutubeView player={player} style={{ width: '100%', height: PLAYER_HEIGHT }} />
                {selectedSeries && (
                    <Image
                        source={{ uri: selectedSeries.verticalUrl || 'https://via.placeholder.com/60x60/FF6B35/FFFFFF?text=SERIES' }}
                        style={{ position: 'absolute', bottom: 16, right: 16, width: 60, height: 60, opacity: 0.7, zIndex: 10 }}
                        resizeMode="contain"
                    />
                )}
            </View>
        );
    };

    const YouTubeLivePlayer = ({ videoId }) => {
        const player = useYouTubePlayer(videoId, {
            autoplay: true,
            muted: false,
            controls: true,
            playsinline: true,
            rel: false,
            modestbranding: true,
        });

        useYouTubeEvent(player, 'ready', () => {
            setVideoLoading(false);
            setVideoError(false);
            setBothAttemptsFailed(false);
        });

        useYouTubeEvent(player, 'error', (error) => {
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Live Error: ${error.message || 'Unable to play live stream'}`);
        });

        return (
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                <View className="absolute top-3 left-3 z-10 bg-red-600 px-3 py-1.5 rounded-full flex-row items-center">
                    <View className="w-2 h-2 bg-white rounded-full mr-2" />
                    <Text className="text-white text-xs font-bold">LIVE</Text>
                </View>
                <YoutubeView player={player} style={{ width: '100%', height: PLAYER_HEIGHT }} />
                {selectedSeries && (
                    <Image
                        source={{ uri: selectedSeries.verticalUrl || 'https://via.placeholder.com/60x60/FF6B35/FFFFFF?text=SERIES' }}
                        style={{ position: 'absolute', bottom: 16, right: 16, width: 60, height: 60, opacity: 0.7, zIndex: 10 }}
                        resizeMode="contain"
                    />
                )}
            </View>
        );
    };

    const YouTubePlaylistPlayer = ({ videoId, playlistId }) => {
        const player = useYouTubePlayer(videoId, {
            autoplay: true,
            muted: false,
            controls: true,
            playsinline: true,
            rel: false,
            modestbranding: true,
            loop: true,
            list: playlistId,
            listType: 'playlist',
        });

        useYouTubeEvent(player, 'ready', () => {
            setVideoLoading(false);
            setVideoError(false);
            setBothAttemptsFailed(false);
        });

        useYouTubeEvent(player, 'error', (error) => {
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Playlist Error: ${error.message || 'Unable to load playlist'}`);
        });

        return (
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                <View className="absolute top-3 left-3 z-10 bg-purple-600 px-3 py-1.5 rounded-lg">
                    <Text className="text-white text-xs font-bold">PLAYLIST</Text>
                </View>
                <YoutubeView player={player} style={{ width: '100%', height: PLAYER_HEIGHT }} />
                {selectedSeries && (
                    <Image
                        source={{ uri: selectedSeries.verticalUrl || 'https://via.placeholder.com/60x60/FF6B35/FFFFFF?text=SERIES' }}
                        style={{ position: 'absolute', bottom: 16, right: 16, width: 60, height: 60, opacity: 0.7, zIndex: 10 }}
                        resizeMode="contain"
                    />
                )}
            </View>
        );
    };

    const YouTubeChannelPlayer = ({ url }) => (
        <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
            <Ionicons name="logo-youtube" size={80} color="#ff0000" />
            <Text className="text-white text-lg font-semibold mt-4 text-center px-6">
                YouTube Channel Detected
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center px-6">
                Please use a specific video or playlist URL
            </Text>
            <TouchableOpacity className="mt-6 bg-orange-500 px-6 py-3 rounded-lg" onPress={() => Linking.openURL(url)}>
                <Text className="text-white font-semibold">Open in YouTube</Text>
            </TouchableOpacity>
            {selectedSeries && (
                <Image
                    source={{ uri: selectedSeries.verticalUrl }}
                    style={{
                        position: 'absolute',
                        bottom: 16,
                        right: 16,
                        width: 60,
                        height: 60,
                        opacity: 0.7,
                        zIndex: 10,
                    }}
                    resizeMode="contain"
                />
            )}
        </View>
    );

    const renderStreamTypeBadge = (type) => {
        const badges = {
            'youtube-video': { icon: 'play-circle', color: 'bg-gray-600', text: 'Stream' },
            'youtube-live': { icon: 'radio', color: 'bg-red-600', text: 'LIVE' },
            'youtube-playlist': { icon: 'list', color: 'bg-purple-600', text: 'Playlist' },
            'youtube-channel': { icon: 'logo-youtube', color: 'bg-red-500', text: 'Channel' },
            'hls': { icon: 'videocam', color: 'bg-blue-600', text: 'HLS Stream' },
            'mp4': { icon: 'film', color: 'bg-green-600', text: 'MP4' },
            'mkv': { icon: 'film', color: 'bg-purple-600', text: 'MKV' },
            'iptv': { icon: 'tv', color: 'bg-indigo-600', text: 'IPTV' },
            'rtmp': { icon: 'cloud-upload', color: 'bg-pink-600', text: 'RTMP' },
            'stream': { icon: 'play-circle', color: 'bg-gray-600', text: 'Stream' },
        };
        const badge = badges[type] || { icon: 'help-circle', color: 'bg-gray-600', text: 'Unknown' };
        return (
            <View className={`${badge.color} px-3 py-1.5 rounded-full flex-row items-center absolute top-3 right-3 z-10`}>
                <Ionicons name={badge.icon} size={14} color="white" />
                <Text className="text-white text-xs font-bold ml-1.5">{badge.text}</Text>
            </View>
        );
    };

    const renderVideoPlayer = () => {
        if (!selectedSeries) {
            return (
                <View className="w-full h-full bg-black items-center justify-center min-h-[240px]">
                    <Ionicons name="tv-outline" size={120} color="#6b7280" />
                    <Text className="text-white text-2xl font-semibold mt-6">No Series Selected</Text>
                </View>
            );
        }

        const currentUrl = getCurrentStreamUrl(selectedSeries, useProxy);
        const { type, isValid } = analyzeStreamUrl(selectedSeries.mediaUrl);

        if (!isValid) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
                    <Ionicons name="alert-circle-outline" size={80} color="#ef4444" />
                    <Text className="text-white text-center mt-6 text-xl font-semibold">Invalid stream URL</Text>
                    <Text className="text-gray-400 text-center mt-2 px-8 text-base">
                        {errorMessage || 'The provided URL format is not supported'}
                    </Text>
                </View>
            );
        }

        // COMPLETE YouTube handling
        if (type === 'youtube-video') {
            const videoId = extractVideoId(selectedSeries.mediaUrl);
            if (!videoId) {
                return (
                    <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
                        <Ionicons name="alert-circle-outline" size={80} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid YouTube URL</Text>
                    </View>
                );
            }
            return <YouTubeVideoPlayer videoId={videoId} />;
        }

        if (type === 'youtube-live') {
            const videoId = extractVideoId(selectedSeries.mediaUrl);
            if (!videoId) {
                return (
                    <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
                        <Ionicons name="alert-circle-outline" size={80} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid YouTube Live URL</Text>
                    </View>
                );
            }
            return <YouTubeLivePlayer videoId={videoId} />;
        }

        if (type === 'youtube-playlist') {
            const videoId = extractVideoId(selectedSeries.mediaUrl);
            const playlistId = extractPlaylistId(selectedSeries.mediaUrl);
            if (!videoId || !playlistId) {
                return (
                    <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
                        <Ionicons name="alert-circle-outline" size={80} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid YouTube Playlist URL</Text>
                    </View>
                );
            }
            return <YouTubePlaylistPlayer videoId={videoId} playlistId={playlistId} />;
        }

        if (type === 'youtube-channel') {
            return <YouTubeChannelPlayer url={selectedSeries.mediaUrl} />;
        }

        // expo-av Player for non-YouTube streams (COMPLETE)
        return (
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                {renderStreamTypeBadge(type)}

                {videoLoading && (
                    <View className="absolute inset-0 bg-black items-center justify-center z-20">
                        <ActivityIndicator size="large" color="#f97316" />
                        <Text className="text-white mt-3 text-sm">Loading {type.toUpperCase()} stream...</Text>
                        <Text className="text-gray-400 mt-1 text-xs">
                            {useProxy ? 'Using Proxy Connection' : 'Direct Connection'}
                        </Text>
                    </View>
                )}

                {videoError && (
                    <View className="absolute inset-0 bg-black items-center justify-center z-30">
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">Stream Error</Text>
                        <Text className="text-gray-400 text-center mt-2 px-4 text-sm">
                            {errorMessage || 'Unable to load the stream'}
                        </Text>
                        {bothAttemptsFailed ? (
                            <Text className="text-orange-500 text-center mt-4 text-base font-semibold px-6">
                                Please switch to another series
                            </Text>
                        ) : (
                            <>
                                <TouchableOpacity
                                    className="mt-4 bg-orange-500 px-6 py-3 rounded-lg"
                                    onPress={() => {
                                        setVideoError(false);
                                        setVideoLoading(true);
                                    }}
                                >
                                    <Text className="text-white font-semibold">Retry</Text>
                                </TouchableOpacity>
                                {serverInfo?.proxyEnabled && (
                                    <TouchableOpacity
                                        className="mt-3 bg-blue-600 px-6 py-3 rounded-lg"
                                        onPress={() => {
                                            setUseProxy(!useProxy);
                                            setVideoError(false);
                                            setVideoLoading(true);
                                            setProxyAttempted(true);
                                        }}
                                    >
                                        <Text className="text-white font-semibold">
                                            {useProxy ? 'Try Direct Connection' : 'Try Proxy Connection'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                )}

                <Video
                    key={currentStreamUrl || 'stream'}
                    ref={videoRef}
                    source={getCurrentStreamUrl(selectedSeries, useProxy)}
                    rate={1.0}
                    volume={1.0}
                    isMuted={false}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay
                    isLooping={false}
                    useNativeControls
                    style={{ width: '100%', height: PLAYER_HEIGHT }}
                    onLoad={() => {
                        setVideoLoading(false);
                        setVideoError(false);
                    }}
                    onError={(e) => {
                        setVideoError(true);
                        setVideoLoading(false);
                        let msg = 'Failed to load stream.';
                        if (e?.error?.code === -1100) msg = 'Network error. Check your connection.';
                        else if (e?.error?.domain === 'AVFoundationErrorDomain')
                            msg = 'Stream format not supported or unavailable.';
                        setErrorMessage(msg);
                        loadStream(selectedSeries, false);
                    }}
                    onLoadStart={() => setVideoLoading(true)}
                    onPlaybackStatusUpdate={(status) => {
                        if (status.isLoaded) {
                            if (status.isPlaying) {
                                setVideoLoading(false);
                                setVideoError(false);
                                setBothAttemptsFailed(false);
                            } else if (status.error) {
                                setVideoError(true);
                                setVideoLoading(false);
                                setErrorMessage(`Video Error: ${status.error}. Playback failed`);
                            }
                        }
                    }}
                />
                {selectedSeries && (
                    <Image
                        source={{ uri: selectedSeries.verticalUrl || 'https://via.placeholder.com/80x80/FF6B35/FFFFFF?text=SERIES' }}
                        style={{
                            position: 'absolute',
                            bottom: 20,
                            right: 20,
                            width: 80,
                            height: 80,
                            opacity: 0.7,
                            zIndex: 10,
                        }}
                        resizeMode="contain"
                    />
                )}

                {/* Series Info Overlay */}
                <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-6">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-4">
                            <Text className="text-white text-2xl font-bold mb-2" numberOfLines={2}>
                                {selectedSeries.title}
                            </Text>
                            <View className="flex-row items-center flex-wrap">
                                <View className="bg-orange-500 px-3 py-1.5 rounded-full mr-3 mb-2">
                                    <Text className="text-white font-bold text-sm">{selectedSeries.genre?.name}</Text>
                                </View>
                                <View className="bg-gray-700 px-3 py-1.5 rounded-full mr-3 mb-2">
                                    <Text className="text-gray-200 font-semibold text-sm">{selectedSeries.language?.name}</Text>
                                </View>
                                <View className="bg-gray-700 px-3 py-1.5 rounded-full mb-2">
                                    <Text className="text-gray-200 font-semibold text-sm">
                                        {selectedSeries.seasonsCount} Season{selectedSeries.seasonsCount > 1 ? 's' : ''}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View className="flex-row items-center space-x-2">
                            <TouchableOpacity className="bg-gray-800/80 p-3 rounded-full" onPress={() => setShowUserMenu(true)}>
                                <Ionicons name="menu" size={28} color="#f97316" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    function handleShowChange(show) {
        setSelectedSeries(show);
        setVideoError(false);
        setVideoLoading(true);
        setBothAttemptsFailed(false);
        setProxyAttempted(false);

        const type = analyzeStreamUrl(show.mediaUrl);
        setUseProxy(!type.type.startsWith('youtube'));

        if (videoRef.current) {
            videoRef.current.unloadAsync().catch(console.error);
        }
    }

    const debouncedHandleShowChange = useMemo(
        () => require('lodash.debounce')(handleShowChange, 200),
        []
    );

    if (loading) {
        return (
            <View className="flex-1 bg-black items-center justify-center min-h-screen">
                <StatusBar barStyle="light-content" hidden />
                <ActivityIndicator size="large" color="#f97316" />
                <Text className="text-white mt-6 text-xl">Loading Web Series...</Text>
            </View>
        );
    }

    if (!series || series.length === 0) {
        return (
            <SafeAreaView className="flex-1 bg-black items-center justify-center min-h-screen">
                <StatusBar barStyle="light-content" hidden />
                <Ionicons name="play-circle-outline" size={120} color="#6b7280" />
                <Text className="text-white text-2xl font-semibold mt-6">No Series Available</Text>
                <TouchableOpacity className="mt-8 bg-orange-500 px-12 py-4 rounded-lg" onPress={fetchSeries}>
                    <Text className="text-white font-bold text-lg">Refresh Series</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <View className="flex-1 bg-black min-h-screen">
            <StatusBar barStyle="light-content" hidden />

            {/* Video player container */}
            <View style={{ height: PLAYER_HEIGHT, width: '100%', minHeight: 240 }}>
                {renderVideoPlayer()}
            </View>

            {/* Series browser */}
            <View style={{ height: '35%', width: '100%', minHeight: 200 }} className="bg-gray-900">
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
                    {groupedSeries.map((genre, genreIndex) => (
                        <View key={genre.title} className="mb-6">
                            <View className="flex-row items-center justify-between px-6 mb-4">
                                <Text className={`text-xl font-bold ${focusedGenre === genreIndex ? 'text-orange-500' : 'text-white'}`}>
                                    {genre.title}
                                </Text>
                                <Text className="text-gray-400 text-base">{genre.data.length} series</Text>
                            </View>
                            <FlatList
                                data={genre.data}
                                keyExtractor={item => item._id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 24 }}
                                renderItem={({ item: show, index: showIndex }) => {
                                    const isFocused = focusedGenre === genreIndex && focusedShowIndex === showIndex;
                                    const isPlaying = selectedSeries?._id === show._id;
                                    return (
                                        <TouchableOpacity
                                            key={show._id}
                                            className={`mr-4 rounded-xl overflow-hidden ${isPlaying
                                                ? 'border-4 border-orange-500 shadow-2xl'
                                                : isFocused
                                                    ? 'border-2 border-yellow-500 shadow-lg scale-105'
                                                    : 'shadow-md'
                                                }`}
                                            style={{ width: 160 }}
                                            onPress={() => debouncedHandleShowChange(show)}
                                        >
                                            <View className="relative">
                                                <Image
                                                    source={{ uri: show.verticalUrl }}
                                                    className="w-full h-48 bg-gray-800"
                                                    resizeMode="cover"
                                                />
                                                <View className="absolute inset-0 items-center justify-center">
                                                    <View className={`rounded-full p-4 ${isPlaying ? 'bg-orange-500' : 'bg-black/50'}`}>
                                                        <Ionicons
                                                            name="play"
                                                            size={isPlaying ? 32 : 24}
                                                            color="white"
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                            <View className={`p-3 ${isPlaying ? 'bg-orange-500' : 'bg-gray-800'}`}>
                                                <Text className={`font-bold text-sm ${isPlaying ? 'text-white' : 'text-gray-100'}`} numberOfLines={2}>
                                                    {show.title}
                                                </Text>
                                                <Text className={`text-xs mt-1 ${isPlaying ? 'text-white/80' : 'text-gray-400'}`}>
                                                    {show.genre?.name} • {show.language?.name}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                                initialNumToRender={8}
                                windowSize={5}
                                removeClippedSubviews={true}
                            />
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* User Menu Modal */}
            <Modal visible={showUserMenu} animationType="slide" transparent onRequestClose={() => setShowUserMenu(false)}>
                <View className="flex-1 bg-black/80 justify-end">
                    <View className="bg-gray-900 rounded-t-3xl">
                        <View className="flex-row items-center justify-between px-8 py-6 border-b border-gray-800">
                            <Text className="text-white text-2xl font-bold">Series Menu</Text>
                            <TouchableOpacity onPress={() => setShowUserMenu(false)}>
                                <Ionicons name="close-circle" size={32} color="white" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView className="px-8 py-6" style={{ maxHeight: 400 }}>
                            <View className="bg-gray-800/50 rounded-2xl p-6 mb-6">
                                <View className="flex-row items-center mb-4">
                                    <Ionicons name="play-circle" size={32} color="#f97316" />
                                    <Text className="text-white text-xl font-bold ml-4">Series Library</Text>
                                </View>
                                <View className="flex-row justify-between py-3 border-t border-gray-700">
                                    <Text className="text-gray-400 text-lg">Total Shows</Text>
                                    <Text className="text-white font-bold text-xl">{series.length}</Text>
                                </View>
                                <View className="flex-row justify-between py-3 border-t border-gray-700">
                                    <Text className="text-gray-400 text-lg">Genres</Text>
                                    <Text className="text-white font-bold text-xl">{groupedSeries.length}</Text>
                                </View>
                            </View>

                            {serverInfo?.whatsappNumber && (
                                <TouchableOpacity className="bg-green-600 py-6 rounded-2xl items-center mb-4"
                                    onPress={() => Linking.openURL(`https://wa.me/${serverInfo.whatsappNumber}`).catch(() => Alert.alert('Error', 'Unable to open WhatsApp'))}>
                                    <View className="flex-row items-center">
                                        <Ionicons name="logo-whatsapp" size={28} color="white" />
                                        <Text className="text-white font-bold text-xl ml-4">Contact Support</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity className="bg-orange-600 py-6 rounded-2xl items-center mb-6"
                                onPress={() => {
                                    setShowUserMenu(false);
                                    fetchSeries();
                                }}>
                                <View className="flex-row items-center">
                                    <Ionicons name="refresh" size={28} color="white" />
                                    <Text className="text-white font-bold text-xl ml-4">Refresh Series</Text>
                                </View>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
