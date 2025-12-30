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
    Platform,
    Dimensions,
    AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/authContext';
import api from '@/services/api';
import { Video, ResizeMode } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { YoutubeView, useYouTubePlayer, useYouTubeEvent } from 'react-native-youtube-bridge';
import * as Device from 'expo-device';

let TVEventHandler = null;
try {
    TVEventHandler = require('react-native').TVEventHandler;
} catch (e) {
    TVEventHandler = null;
}

const isTV = Device.deviceType === Device.DeviceType.TV ||
    Device.modelName?.toLowerCase().includes("tv") ||
    Device.deviceName?.toLowerCase().includes("tv") ||
    Device.brand?.toLowerCase().includes("google") ||
    Platform.isTV;

if (isTV) {
    function assertDefined(name, value) {
        if (value === undefined || value === null) {
            throw new Error(`${name} is undefined at runtime in SeriesScreen`);
        }
    }
    assertDefined('Ionicons', Ionicons);
    assertDefined('Video', Video);
    assertDefined('ResizeMode', ResizeMode);
    assertDefined('YoutubeView', YoutubeView);
    assertDefined('useYouTubePlayer', useYouTubePlayer);
    assertDefined('useYouTubeEvent', useYouTubeEvent);
    if (Platform.isTV && TVEventHandler) {
        assertDefined('TVEventHandler', TVEventHandler);
    }
}

// TV-optimized player height (65% of screen)
const { height: windowHeight } = Dimensions.get('window');
const PLAYER_HEIGHT = Math.max(240, Math.floor(windowHeight * 0.65));

export default function SeriesScreen() {
    const { isAuthenticated, serverInfo } = useAuth();
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
    const [useProxy, setUseProxy] = useState(true);
    const [proxyAttempted, setProxyAttempted] = useState(false);
    const [bothAttemptsFailed, setBothAttemptsFailed] = useState(false);
    const [currentStreamUrl, setCurrentStreamUrl] = useState(null);

    // TV Navigation states
    const [focusedGenre, setFocusedGenre] = useState(0);
    const [focusedShowIndex, setFocusedShowIndex] = useState(0);
    const [isGenreFocused, setIsGenreFocused] = useState(true);

    const videoRef = useRef(null);
    const tvEventHandler = useRef(null);

    // Fetch series
    useEffect(() => {
        if (isAuthenticated) fetchSeries();
    }, [isAuthenticated]);

    // Always landscape for TV
    useEffect(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }, []);

    // Auto-start first series on mount
    useEffect(() => {
        if (groupedSeries.length > 0 && groupedSeries[0].data?.length > 0) {
            handleShowChange(groupedSeries[0].data[0]);
        }
    }, [groupedSeries]);

    // AppState refresh
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                fetchSeries();
            }
        });
        return () => subscription?.remove();
    }, []);

    // TV Remote Handler - Enhanced
    useEffect(() => {
        if (isTV && TVEventHandler && typeof TVEventHandler.enable === 'function') {
            tvEventHandler.current = new TVEventHandler();
            tvEventHandler.current.enable(null, (component, evt) => {
                console.log('TV Series Event:', evt);

                // SELECT/OK button
                if (evt.eventType === 'select') {
                    if (isGenreFocused) {
                        setIsGenreFocused(false);
                        setFocusedShowIndex(0);
                        const currentGenre = groupedSeries[focusedGenre];
                        if (currentGenre?.data[0]) {
                            debouncedHandleShowChange(currentGenre.data[0]);
                        }
                    } else {
                        const currentGenre = groupedSeries[focusedGenre];
                        const show = currentGenre?.data[focusedShowIndex];
                        if (show) {
                            debouncedHandleShowChange(show);
                        }
                    }
                    return;
                }

                // Navigation
                if (evt.eventType === 'right') handleNavigateRight();
                else if (evt.eventType === 'left') handleNavigateLeft();
                else if (evt.eventType === 'down') handleNavigateDown();
                else if (evt.eventType === 'up') handleNavigateUp();
                else if (evt.eventType === 'menu') setShowUserMenu(true);
                else if (evt.eventType === 'back') {
                    if (!isGenreFocused) {
                        setIsGenreFocused(true);
                        return;
                    }
                }
            });

            return () => {
                if (tvEventHandler.current) {
                    tvEventHandler.current.disable();
                }
            };
        }
    }, [isGenreFocused, focusedGenre, focusedShowIndex, groupedSeries]);

    const handleNavigateRight = useCallback(() => {
        const currentGenre = groupedSeries[focusedGenre];
        if (currentGenre && focusedShowIndex < currentGenre.data.length - 1) {
            const nextIndex = focusedShowIndex + 1;
            setFocusedShowIndex(nextIndex);
            debouncedHandleShowChange(currentGenre.data[nextIndex]);
        }
    }, [focusedGenre, focusedShowIndex, groupedSeries]);

    const handleNavigateLeft = useCallback(() => {
        if (focusedShowIndex > 0) {
            const prevIndex = focusedShowIndex - 1;
            setFocusedShowIndex(prevIndex);
            const currentGenre = groupedSeries[focusedGenre];
            debouncedHandleShowChange(currentGenre.data[prevIndex]);
        }
    }, [focusedGenre, focusedShowIndex, groupedSeries]);

    const handleNavigateDown = useCallback(() => {
        if (isGenreFocused) {
            if (focusedGenre < groupedSeries.length - 1) {
                setFocusedGenre(focusedGenre + 1);
            }
        } else {
            if (focusedGenre < groupedSeries.length - 1) {
                setFocusedGenre(focusedGenre + 1);
                setFocusedShowIndex(0);
                const nextGenre = groupedSeries[focusedGenre + 1];
                if (nextGenre?.data[0]) {
                    debouncedHandleShowChange(nextGenre.data[0]);
                }
            }
        }
    }, [isGenreFocused, focusedGenre, groupedSeries]);

    const handleNavigateUp = useCallback(() => {
        if (isGenreFocused) {
            if (focusedGenre > 0) {
                setFocusedGenre(focusedGenre - 1);
            }
        } else {
            if (focusedGenre > 0) {
                setFocusedGenre(focusedGenre - 1);
                setFocusedShowIndex(0);
                const prevGenre = groupedSeries[focusedGenre - 1];
                if (prevGenre?.data[0]) {
                    debouncedHandleShowChange(prevGenre.data[0]);
                }
            }
        }
    }, [isGenreFocused, focusedGenre, groupedSeries]);

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

    // Enhanced streaming functions (same as TV Channels/Movies)
    function analyzeStreamUrl(url) {
        if (!url) return { type: 'unknown', isValid: false };
        const u = url.toLowerCase();
        if (u.includes('youtube.com') || u.includes('youtu.be')) {
            if (u.includes('live')) return { type: 'youtube-live', isValid: true };
            if (u.includes('watch?v=')) return { type: 'youtube-video', isValid: true };
            if (u.includes('playlist') || u.includes('list=')) return { type: 'youtube-playlist', isValid: true };
            if (u.includes('/c/') || u.includes('/@') || u.includes('/channel/')) return { type: 'youtube-channel', isValid: true };
            return { type: 'youtube-video', isValid: true };
        }
        if (u.includes('.m3u8') || u.includes('m3u') || u.includes('chunklist') || u.includes('/hls/')) return { type: 'hls', isValid: true };
        if (u.includes('.mp4') || url.match(/\.(mp4|m4v|mov)\?/)) return { type: 'mp4', isValid: true };
        if (u.includes('.mkv')) return { type: 'mkv', isValid: true };
        if (url.match(/:\d{4}/) || url.match(/\/live\//)) return { type: 'iptv', isValid: true };
        if (u.includes('rtmp://')) return { type: 'rtmp', isValid: true };
        if (url.startsWith('http://') || url.startsWith('https://')) return { type: 'stream', isValid: true };
        return { type: 'unknown', isValid: false };
    }

    function extractVideoId(url) {
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
    }

    function extractPlaylistId(url) {
        if (!url) return null;
        const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    const getCurrentStreamUrl = (show, proxyEnabled) => {
        if (!show) return null;
        const type = analyzeStreamUrl(show.mediaUrl);

        if (type.type.startsWith('youtube')) {
            return { uri: show.mediaUrl };
        }

        const baseUrl = proxyEnabled && show.proxyUrl && serverInfo?.proxyEnabled ? show.proxyUrl : show.mediaUrl;

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

    // Get recommended items based on currently playing
    const getRecommendedItems = useCallback(() => {
        if (!selectedChannel && !selectedMovie && !selectedSeries) return [];

        const currentItem = selectedChannel || selectedMovie || selectedSeries;
        const allItems = channels || movies || series || [];

        // Filter recommendations (same language/genre, exclude current)
        return allItems
            .filter(item => item.id !== currentItem?.id)
            .filter(item =>
                item.language?.name === currentItem.language?.name ||
                item.genre?.name === currentItem.genre?.name ||
                Math.abs((item.lcn || 999) - (currentItem.lcn || 999)) < 20
            )
            .slice(0, 8); // Top 8 recommendations
    }, [channels, movies, series, selectedChannel, selectedMovie, selectedSeries]);

    // Handle recommendation selection
    const handleRecommendationSelect = useCallback((item) => {
        if (item === selectedChannel) {
            setShowRecommendations(false);
            return;
        }

        // Play recommendation
        if (selectedChannel) debouncedHandleChannelChange(item);
        else if (selectedMovie) debouncedHandleMovieChange(item);
        else if (selectedSeries) debouncedHandleShowChange(item);

        setShowRecommendations(false);
    }, [selectedChannel, selectedMovie, selectedSeries]);

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
                    setVideoLoading(false);
                    setVideoError(false);
                } catch (error) {
                    setVideoError(true);
                    setVideoLoading(false);
                    if (proxyEnabled && show.proxyUrl) {
                        setUseProxy(false);
                        loadStream(show, false);
                    } else {
                        setErrorMessage('Unable to load stream. Please try another episode.');
                    }
                }
            }
        }
    };

    useEffect(() => {
        if (selectedSeries) {
            const type = analyzeStreamUrl(selectedSeries.mediaUrl);
            if (!type.type.startsWith('youtube')) {
                loadStream(selectedSeries, useProxy);
            }
        }
    }, [selectedSeries, useProxy]);

    function handleStreamError() {
        if (!proxyAttempted && serverInfo?.proxyEnabled) {
            setProxyAttempted(true);
            setUseProxy(!useProxy);
            setVideoError(false);
            setVideoLoading(true);
        } else {
            setBothAttemptsFailed(true);
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage('Both proxy and direct stream failed. Please try another show.');
        }
    }

    function renderStreamTypeBadge(type) {
        const badges = {
            'youtube-video': { icon: 'play-circle', color: 'bg-gray-600', text: 'Stream' },
            'youtube-live': { icon: 'play-circle', color: 'bg-gray-600', text: 'Stream' },
            'youtube-playlist': { icon: 'list', color: 'bg-purple-600', text: 'Playlist' },
            'hls': { icon: 'videocam', color: 'bg-blue-600', text: 'HLS Stream' },
            'mp4': { icon: 'film', color: 'bg-green-600', text: 'MP4' },
            'mkv': { icon: 'film', color: 'bg-purple-600', text: 'MKV' },
            'iptv': { icon: 'tv', color: 'bg-indigo-600', text: 'IPTV' },
            'rtmp': { icon: 'cloud-upload', color: 'bg-pink-600', text: 'RTMP' },
            'stream': { icon: 'play-circle', color: 'bg-gray-600', text: 'Stream' }
        };
        const badge = badges[type] || { icon: 'help-circle', color: 'bg-gray-600', text: 'Unknown' };
        return (
            <View className={`${badge.color} px-4 py-2 rounded-full flex-row items-center absolute top-4 right-4 z-10`}>
                <Ionicons name={badge.icon} size={20} color="white" />
                <Text className="text-white text-sm font-bold ml-2">{badge.text}</Text>
            </View>
        );
    }

    function YouTubeVideoPlayer({ videoId }) {
        const player = useYouTubePlayer(videoId, {
            autoplay: true, muted: false, controls: true,
            playsinline: true, rel: false, modestbranding: true
        });
        useYouTubeEvent(player, 'ready', () => {
            setVideoLoading(false);
            setVideoError(false);
            setBothAttemptsFailed(false);
        });
        useYouTubeEvent(player, 'error', err => {
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Error: ${String(err)}`);
        });
        return (
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                <YoutubeView player={player} style={{ width: "100%", height: PLAYER_HEIGHT }} />
                {/* OnlineIptvHUb Watermark */}
                {selectedSeries && (
                    <Image
                        source={{ uri: selectedSeries.verticalUrl || 'https://via.placeholder.com/60x60/FF6B35/FFFFFF?text=IPTV' }}
                        style={{ position: 'absolute', bottom: 16, right: 16, width: 60, height: 60, opacity: 0.7, zIndex: 10 }}
                        resizeMode="contain"
                    />
                )}
            </View>
        );
    }

    // Similar YouTubeLivePlayer, YouTubePlaylistPlayer, YouTubeChannelPlayer with watermarks...

    function renderVideoPlayer() {
        if (!selectedSeries) return (
            <View className="w-full h-full bg-black items-center justify-center">
                <Ionicons name="tv-outline" size={120} color="#6b7280" />
                <Text className="text-white text-2xl font-semibold mt-6">No Series Selected</Text>
            </View>
        );

        const currentUrl = getCurrentStreamUrl(selectedSeries, useProxy);
        const { type, isValid } = analyzeStreamUrl(selectedSeries.mediaUrl);

        if (!isValid) return (
            <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
                <Ionicons name="alert-circle-outline" size={80} color="#ef4444" />
                <Text className="text-white text-center mt-6 text-xl font-semibold">Invalid Stream URL</Text>
                <Text className="text-gray-400 text-center mt-2 px-8 text-base">
                    {errorMessage || 'URL format not supported'}
                </Text>
            </View>
        );

        if (type === 'youtube-video') {
            const videoId = extractVideoId(selectedSeries.mediaUrl);
            if (!videoId) return (
                <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
                    <Ionicons name="alert-circle-outline" size={80} color="#ef4444" />
                    <Text className="text-white text-center mt-6 text-xl font-semibold">Invalid YouTube URL</Text>
                </View>
            );
            return <>{renderStreamTypeBadge(type)}<YouTubeVideoPlayer videoId={videoId} /></>;
        }

        // YouTube Live, Playlist, Channel (implement similar patterns)
        if (type === 'youtube-live') {
            const videoId = extractVideoId(selectedSeries.mediaUrl);
            return videoId ? (
                <>
                    {renderStreamTypeBadge(type)}
                    <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                        <View className="absolute top-4 left-4 z-10 bg-red-600 px-4 py-2 rounded-full flex-row items-center">
                            <View className="w-3 h-3 bg-white rounded-full mr-2" />
                            <Text className="text-white text-sm font-bold">LIVE</Text>
                        </View>
                        <YoutubeView player={useYouTubePlayer(videoId, { autoplay: true, muted: false, controls: true, playsinline: true, rel: false, modestbranding: true })} style={{ width: '100%', height: PLAYER_HEIGHT }} />
                        {/* Watermark */}
                        {selectedSeries && (
                            <Image source={{ uri: selectedSeries.verticalUrl }} style={{ position: 'absolute', bottom: 16, right: 16, width: 60, height: 60, opacity: 0.7, zIndex: 10 }} resizeMode="contain" />
                        )}
                    </View>
                </>
            ) : null;
        }

        // Native Video Player for non-YouTube
        return (
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                {renderStreamTypeBadge(type)}

                {videoLoading && (
                    <View className="absolute inset-0 bg-black items-center justify-center z-20">
                        <ActivityIndicator size="large" color="#f97316" />
                        <Text className="text-white mt-4 text-lg">Loading {type.toUpperCase()}...</Text>
                        <Text className="text-gray-400 mt-2 text-sm">
                            {useProxy ? 'Proxy Connection' : 'Direct Connection'}
                        </Text>
                    </View>
                )}

                {videoError && (
                    <View className="absolute inset-0 bg-black/95 items-center justify-center z-30 px-8">
                        <Ionicons name="alert-circle-outline" size={80} color="#ef4444" />
                        <Text className="text-white text-center mt-6 text-xl font-semibold">Stream Error</Text>
                        <Text className="text-gray-400 text-center mt-3 px-6 text-base">{errorMessage}</Text>
                        {bothAttemptsFailed ? (
                            <Text className="text-orange-500 text-center mt-6 text-lg font-semibold">
                                Use remote to switch series
                            </Text>
                        ) : (
                            <>
                                <TouchableOpacity className="mt-6 bg-orange-500 px-8 py-4 rounded-lg"
                                    onPress={() => { setVideoError(false); setVideoLoading(true); }}>
                                    <Text className="text-white font-bold text-lg">Retry</Text>
                                </TouchableOpacity>
                                {serverInfo?.proxyEnabled && (
                                    <TouchableOpacity className="mt-4 bg-blue-600 px-8 py-4 rounded-lg"
                                        onPress={() => {
                                            setUseProxy(!useProxy);
                                            setVideoError(false);
                                            setVideoLoading(true);
                                            setProxyAttempted(true);
                                        }}>
                                        <Text className="text-white font-bold text-lg">
                                            {useProxy ? 'Direct' : 'Proxy'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                )}

                <Video
                    ref={videoRef}
                    source={currentUrl}
                    rate={1.0} volume={1.0} isMuted={false}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay
                    useNativeControls
                    style={{ width: '100%', height: PLAYER_HEIGHT }}
                    onLoadStart={() => { setVideoLoading(true); setVideoError(false); }}
                    onReadyForDisplay={() => setVideoLoading(false)}
                    onError={(e) => {
                        setVideoError(true);
                        setVideoLoading(false);
                        let msg = 'Stream failed to load.';
                        if (e?.error?.code === -1100) msg = 'Network error.';
                        else if (e?.error?.domain === 'AVFoundationErrorDomain') msg = 'Unsupported format.';
                        setErrorMessage(msg);
                        if (useProxy && selectedSeries?.proxyUrl) loadStream(selectedSeries, false);
                    }}
                    onPlaybackStatusUpdate={(status) => {
                        if (status.isLoaded) {
                            if (status.isPlaying) {
                                setVideoLoading(false);
                                setVideoError(false);
                                setBothAttemptsFailed(false);
                            }
                        } else if (status.error) {
                            setVideoError(true);
                            setVideoLoading(false);
                            setErrorMessage(`Video Error: ${status.error || 'Playback failed'}`);
                        }
                    }}
                />

                {/* OnlineIptvHUb Watermark - Always visible */}
                {selectedSeries && (
                    <Image
                        source={{ uri: selectedSeries.verticalUrl || 'https://via.placeholder.com/80x80/FF6B35/FFFFFF?text=IPTV' }}
                        style={{ position: 'absolute', bottom: 20, right: 20, width: 80, height: 80, opacity: 0.7, zIndex: 10 }}
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
                                <View className="bg-orange-500 px-4 py-2 rounded-full mr-3 mb-2">
                                    <Text className="text-white font-bold text-sm">{selectedSeries.genre?.name}</Text>
                                </View>
                                <View className="bg-gray-700 px-4 py-2 rounded-full mr-3 mb-2">
                                    <Text className="text-gray-200 font-semibold text-sm">{selectedSeries.language?.name}</Text>
                                </View>
                                <View className="bg-gray-700 px-4 py-2 rounded-full mb-2">
                                    <Text className="text-gray-200 font-semibold text-sm">
                                        {selectedSeries.seasonsCount} Season{selectedSeries.seasonsCount > 1 ? 's' : ''}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View className="flex-row items-center space-x-3">
                            <TouchableOpacity className="bg-gray-800/80 p-4 rounded-full"
                                onPress={() => setShowRecommendations(!showRecommendations)}>
                                <Ionicons name={showRecommendations ? "eye-off" : "eye"} size={28} color="#f97316" />
                            </TouchableOpacity>
                            <TouchableOpacity className="bg-gray-800/80 p-4 rounded-full"
                                onPress={() => setShowUserMenu(true)}>
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

    // Cleanup
    useEffect(() => {
        return () => {
            if (videoRef.current) {
                videoRef.current.unloadAsync().catch(() => {
                    console.log('Error unloading video on unmount');
                });
            }
            setSelectedSeries(null);
            setVideoLoading(false);
            setVideoError(false);
        };
    }, []);

    if (loading) return (
        <View className="flex-1 bg-black items-center justify-center">
            <StatusBar barStyle="light-content" hidden />
            <ActivityIndicator size="large" color="#f97316" />
            <Text className="text-white mt-6 text-xl">Loading Web Series...</Text>
        </View>
    );

    if (!series || series.length === 0) return (
        <SafeAreaView className="flex-1 bg-black items-center justify-center">
            <StatusBar barStyle="light-content" hidden />
            <Ionicons name="play-circle-outline" size={120} color="#6b7280" />
            <Text className="text-white text-2xl font-semibold mt-6">No Series Available</Text>
            <TouchableOpacity className="mt-8 bg-orange-500 px-12 py-4 rounded-lg" onPress={fetchSeries}>
                <Text className="text-white font-bold text-lg">Refresh Series</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );

    return (
        <View className="flex-1 bg-black">
            <StatusBar barStyle="light-content" hidden />

            {/* 65% VIDEO PLAYER */}
            <View style={{ height: PLAYER_HEIGHT, width: '100%' }}>
                {renderVideoPlayer()}
            </View>

            {/* 35% SERIES BROWSER */}
            <View style={{ height: '35%', width: '100%' }} className="bg-gray-900">
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
                    {groupedSeries.map((genre, genreIndex) => (
                        <View key={genre.title} className="mb-6">
                            <View className="flex-row items-center justify-between px-6 mb-4">
                                <Text className={`text-xl font-bold ${isGenreFocused && focusedGenre === genreIndex ? 'text-orange-500' : 'text-white'
                                    }`}>
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
                                            hasTVPreferredFocus={genreIndex === 0 && showIndex === 0}
                                        >
                                            <View className="relative">
                                                <Image
                                                    source={{ uri: show.verticalUrl }}
                                                    className="w-full h-48 bg-gray-800"
                                                    resizeMode="cover"
                                                />
                                                <View className="absolute inset-0 items-center justify-center">
                                                    <View className={`rounded-full p-4 ${isPlaying ? 'bg-orange-500' : 'bg-black/50'
                                                        }`}>
                                                        <Ionicons
                                                            name="play"
                                                            size={isPlaying ? 32 : 24}
                                                            color="white"
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                            <View className={`p-3 ${isPlaying ? 'bg-orange-500' : 'bg-gray-800'}`}>
                                                <Text className={`font-bold text-sm ${isPlaying ? 'text-white' : 'text-gray-100'
                                                    }`} numberOfLines={2}>
                                                    {show.title}
                                                </Text>
                                                <Text className={`text-xs mt-1 ${isPlaying ? 'text-white/80' : 'text-gray-400'
                                                    }`}>
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

            {/* Recommendations Overlay */}
            {showRecommendations && (
                <View className="absolute bottom-40 left-0 right-0 bg-black/90 p-6 z-30 rounded-t-3xl">
                    <TouchableOpacity className="absolute top-4 right-4 p-2" onPress={() => setShowRecommendations(false)}>
                        <Ionicons name="close-circle" size={32} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-2xl font-bold mb-6 text-center">Recommended Series</Text>
                    {/* Recommendations Overlay - FULL FlatList IMPLEMENTATION */}
                    {showRecommendations && (
                        <View className="absolute bottom-40 left-0 right-0 bg-black/95 p-8 z-30 rounded-t-3xl border-t-4 border-orange-500/50 shadow-2xl">
                            <View className="flex-row items-center justify-between mb-8">
                                <Text className="text-white text-3xl font-bold">Recommended</Text>
                                <TouchableOpacity
                                    onPress={() => setShowRecommendations(false)}
                                    className="p-3 rounded-full bg-gray-800/50"
                                >
                                    <Ionicons name="close-circle" size={36} color="#f97316" />
                                </TouchableOpacity>
                            </View>

                            {/* RECOMMENDATIONS FLATLIST - TV OPTIMIZED */}
                            <FlatList
                                data={getRecommendedItems()} // Use your recommended items function
                                keyExtractor={(item) => item.id ? String(item.id) : String(Math.random())}
                                horizontal={false} // Vertical for overlay
                                showsHorizontalScrollIndicator={false}
                                showsVerticalScrollIndicator={true}
                                contentContainerStyle={{
                                    paddingHorizontal: 12,
                                    paddingBottom: 20,
                                    maxHeight: 300, // Limit height
                                }}
                                renderItem={({ item, index }) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        className={`mb-4 mr-4 rounded-2xl overflow-hidden shadow-xl transform transition-all ${selectedItem?.id === item.id
                                            ? 'border-4 border-orange-500 scale-105 shadow-orange-500/50'
                                            : index === 0
                                                ? 'border-2 border-yellow-400 shadow-yellow-400/30 scale-102'
                                                : 'border border-gray-700 hover:border-gray-600'
                                            }`}
                                        style={{ width: 200, height: 280 }}
                                        onPress={() => handleRecommendationSelect(item)}
                                        hasTVPreferredFocus={index === 0}
                                    >
                                        {/* Thumbnail */}
                                        <View className="relative h-48 bg-gradient-to-br from-gray-800 to-gray-900">
                                            <Image
                                                source={{ uri: item.imageUrl || item.verticalUrl || item.logo || 'https://via.placeholder.com/200x150/333/999?text=TV' }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                            {/* Play Indicator */}
                                            <View className="absolute inset-0 items-center justify-center bg-black/40">
                                                <View className={`rounded-full p-4 ${selectedItem?.id === item.id ? 'bg-orange-500 shadow-2xl' : 'bg-white/20'
                                                    }`}>
                                                    <Ionicons
                                                        name="play"
                                                        size={selectedItem?.id === item.id ? 32 : 24}
                                                        color="white"
                                                    />
                                                </View>
                                            </View>
                                            {/* Stream Type Badge */}
                                            <View className="absolute top-4 right-4 bg-orange-500 px-3 py-1.5 rounded-full">
                                                <Text className="text-white text-xs font-bold capitalize">
                                                    {item.type || 'live'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Content Info */}
                                        <View className={`p-4 h-32 justify-between ${selectedItem?.id === item.id ? 'bg-orange-500/10 border-t-2 border-orange-400' : 'bg-gray-900/50'
                                            }`}>
                                            {/* Title & Number */}
                                            <View className="flex-row items-center justify-between mb-2">
                                                <Text className={`font-bold text-base ${selectedItem?.id === item.id ? 'text-white' : 'text-gray-100'
                                                    }`} numberOfLines={1}>
                                                    {item.name || item.title}
                                                </Text>
                                                <View className={`px-3 py-1 rounded-full ${selectedItem?.id === item.id ? 'bg-white/20' : 'bg-gray-700'
                                                    }`}>
                                                    <Text className={`text-xs font-bold ${selectedItem?.id === item.id ? 'text-white' : 'text-gray-300'
                                                        }`}>
                                                        {item.lcn || item.number || 'HD'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Genre/Language */}
                                            <View className="flex-row items-center space-x-2 mb-2">
                                                <View className="px-2 py-1 bg-gray-700/50 rounded-lg">
                                                    <Text className={`text-xs ${selectedItem?.id === item.id ? 'text-orange-300' : 'text-gray-400'
                                                        }`}>
                                                        {item.genre?.name || item.genre}
                                                    </Text>
                                                </View>
                                                <View className="px-2 py-1 bg-gray-700/50 rounded-lg">
                                                    <Text className={`text-xs ${selectedItem?.id === item.id ? 'text-orange-300' : 'text-gray-400'
                                                        }`}>
                                                        {item.language?.name || item.lang}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Action Button */}
                                            <TouchableOpacity
                                                className={`w-full py-2 rounded-xl items-center justify-center ${selectedItem?.id === item.id
                                                    ? 'bg-white/20 border border-white/40'
                                                    : 'bg-gray-800/50 border border-gray-600 hover:bg-gray-700'
                                                    }`}
                                                onPress={() => handleRecommendationSelect(item)}
                                            >
                                                <Text className={`font-bold text-sm ${selectedItem?.id === item.id ? 'text-white' : 'text-gray-200'
                                                    }`}>
                                                    {selectedItem?.id === item.id ? 'NOW PLAYING' : 'WATCH NOW'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                initialNumToRender={6}
                                maxToRenderPerBatch={4}
                                windowSize={10}
                                removeClippedSubviews={true}
                                getItemLayout={(data, index) => ({
                                    length: 300,
                                    offset: 300 * index,
                                    index,
                                })}
                                ListFooterComponent={
                                    <View className="h-6" />
                                }
                            />
                        </View>
                    )}

                </View>
            )}

            {/* Enhanced User Menu Modal */}
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

                            {serverInfo?.customButtonLink && serverInfo?.customButtonText && (
                                <TouchableOpacity className="bg-blue-600 py-6 rounded-2xl items-center mb-4"
                                    onPress={() => Linking.openURL(serverInfo.customButtonLink).catch(() => Alert.alert('Error', 'Unable to open link'))}>
                                    <View className="flex-row items-center">
                                        <Ionicons name="open-outline" size={28} color="white" />
                                        <Text className="text-white font-bold text-xl ml-4">{serverInfo.customButtonText}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity className="bg-orange-600 py-6 rounded-2xl items-center mb-6"
                                onPress={() => { setShowUserMenu(false); fetchSeries(); }}>
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
