import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/authContext';
import api from '@/services/api';
// Remove expo-video imports
// import { VideoView, useVideoPlayer } from 'expo-video';
import { Video } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { YoutubeView, useYouTubePlayer, useYouTubeEvent } from 'react-native-youtube-bridge';
import * as Device from 'expo-device';

let TVEventHandler = null;
try {
    TVEventHandler = require('react-native').TVEventHandler;
} catch (e) {
    TVEventHandler = null;
}

const isTV =
    Device.deviceType === Device.DeviceType.TV ||
    Device.modelName?.toLowerCase().includes("tv") ||
    Device.deviceName?.toLowerCase().includes("tv") ||
    Device.brand?.toLowerCase().includes("google");

if (isTV) {
    function assertDefined(name, value) {
        if (value === undefined || value === null) {
            throw new Error(`${name} is undefined at runtime in ChannelsScreen`);
        }
    }
    assertDefined('Ionicons', Ionicons);
    assertDefined('YoutubeView', YoutubeView);
    assertDefined('useYouTubePlayer', useYouTubePlayer);
    assertDefined('useYouTubeEvent', useYouTubeEvent);
    if (Platform.isTV && TVEventHandler) {
        assertDefined('TVEventHandler', TVEventHandler);
    }
}
export default function SeriesScreen() {
    const { isAuthenticated, serverInfo } = useAuth();
    const [series, setSeries] = useState([]);
    const [groupedSeries, setGroupedSeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeries, setSelectedSeries] = useState(null);
    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [useProxy, setUseProxy] = useState(true);
    const [focusedGenre, setFocusedGenre] = useState(0);
    const [focusedShowIndex, setFocusedShowIndex] = useState(0);
    const [proxyAttempted, setProxyAttempted] = useState(false);
    const [bothAttemptsFailed, setBothAttemptsFailed] = useState(false);
    const [currentStreamUrl, setCurrentStreamUrl] = useState('');
    const [showUserMenu, setShowUserMenu] = useState(false);

    const videoRef = useRef(null);
    const tvEventHandler = useRef(null);

    useEffect(() => {
        if (isAuthenticated) fetchSeries();
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }, [isAuthenticated]);

    useEffect(() => {
        if (groupedSeries.length > 0 && groupedSeries[0].data?.length > 0) {
            handleShowChange(groupedSeries[0].data[0]);
        }
    }, [groupedSeries]);

    useEffect(() => {
        if (Platform.isTV) {
            tvEventHandler.current = new TVEventHandler();
            tvEventHandler.current.enable(null, (component, evt) => {
                if (evt.eventType === 'select') {
                    const currentGenre = groupedSeries[focusedGenre];
                    if (currentGenre) {
                        const show = currentGenre.data[focusedShowIndex];
                        if (show) handleShowChange(show);
                    }
                } else if (evt.eventType === 'right') {
                    if (groupedSeries[focusedGenre]?.data.length - 1 > focusedShowIndex)
                        setFocusedShowIndex(focusedShowIndex + 1);
                } else if (evt.eventType === 'left') {
                    if (focusedShowIndex > 0)
                        setFocusedShowIndex(focusedShowIndex - 1);
                } else if (evt.eventType === 'down') {
                    if (focusedGenre < groupedSeries.length - 1) {
                        setFocusedGenre(focusedGenre + 1);
                        setFocusedShowIndex(0);
                    }
                } else if (evt.eventType === 'up') {
                    if (focusedGenre > 0) {
                        setFocusedGenre(focusedGenre - 1);
                        setFocusedShowIndex(0);
                    }
                } else if (evt.eventType === 'menu') {
                    setShowUserMenu(true);
                }
            });
            return () => tvEventHandler.current?.disable();
        }
    }, [focusedGenre, focusedShowIndex, groupedSeries]);

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

    function analyzeStreamUrl(url) {
        if (!url) return { type: 'unknown', isValid: false };
        const u = url.toLowerCase();
        if (u.includes('youtube.com') || u.includes('youtu.be')) {
            if (u.includes('live')) return { type: 'youtube-live', isValid: true };
            if (u.includes('watch?v=')) return { type: 'youtube-video', isValid: true };
            if (u.includes('playlist') || u.includes('list=')) return { type: 'youtube-playlist', isValid: true };
            if (u.includes('/c/') || u.includes('/@')) return { type: 'youtube-channel', isValid: true };
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
        let match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
            url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/) ||
            url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/) ||
            url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    }

    function extractPlaylistId(url) {
        if (!url) return null;
        const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    // Always return an object for Video source, never string.
    function getCurrentStreamUrl() {
        if (!selectedSeries) return { uri: "" };
        const { type } = analyzeStreamUrl(selectedSeries.mediaUrl);
        if (type.startsWith('youtube')) return { uri: "" }; // don't load YouTube URLs in Video
        if (useProxy && selectedSeries.proxyUrl && serverInfo?.proxyEnabled)
            return { uri: selectedSeries.proxyUrl };
        return { uri: selectedSeries.mediaUrl };
    }

    useEffect(() => {
        if (selectedSeries) {
            const newUrl = getCurrentStreamUrl();
            if (JSON.stringify(newUrl) !== currentStreamUrl || !currentStreamUrl) {
                setCurrentStreamUrl(JSON.stringify(newUrl));
                setVideoLoading(true);
                setVideoError(false);
                if (videoRef.current) {
                    videoRef.current.unloadAsync().then(() => {
                        videoRef.current?.loadAsync(newUrl, { shouldPlay: true });
                    });
                }
            }
        }
    }, [useProxy, selectedSeries]);

    useEffect(() => {
        return () => {
            // Cleanup on component unmount
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
            <View className={`${badge.color} px-3 py-1.5 rounded-full flex-row items-center absolute top-3 right-3 z-10`}>
                <Ionicons name={badge.icon} size={14} color="white" />
                <Text className="text-white text-xs font-bold ml-1.5">{badge.text}</Text>
            </View>
        );
    }

    function handleShowChange(show) {
        setSelectedSeries(show);
        setVideoError(false);
        setVideoLoading(true);
        setBothAttemptsFailed(false);
        setProxyAttempted(false);
        setUseProxy(!analyzeStreamUrl(show.mediaUrl).type.startsWith('youtube'));
        if (videoRef.current) videoRef.current.unloadAsync().catch(() => { });
    }

    function YouTubeVideoPlayer({ videoId }) {
        const player = useYouTubePlayer(videoId, { autoplay: true, muted: false, controls: true, playsinline: true, rel: false, modestbranding: true });
        useYouTubeEvent(player, 'ready', () => { setVideoLoading(false); setVideoError(false); setBothAttemptsFailed(false); });
        useYouTubeEvent(player, 'error', err => { setVideoError(true); setVideoLoading(false); setErrorMessage(String(err)); });
        return <View className="w-full h-full bg-black"><YoutubeView player={player} style={{ width: "100%", height: "100%" }} /></View>;
    }

    function YouTubeLivePlayer({ videoId }) {
        const player = useYouTubePlayer(videoId, { autoplay: true, muted: false, controls: true, playsinline: true, rel: false, modestbranding: true });
        useYouTubeEvent(player, 'ready', () => { setVideoLoading(false); setVideoError(false); setBothAttemptsFailed(false); });
        useYouTubeEvent(player, 'error', err => { setVideoError(true); setVideoLoading(false); setErrorMessage(String(err)); });
        return (
            <View className="w-full h-full bg-black relative">
                <View className="absolute top-3 left-3 z-10 bg-red-600 px-3 py-1.5 rounded-full flex-row items-center">
                    <View className="w-2 h-2 bg-white rounded-full mr-2" />
                    <Text className="text-white text-xs font-bold">LIVE</Text>
                </View>
                <YoutubeView player={player} style={{ width: '100%', height: '100%' }} />
            </View>
        );
    }

    function YouTubePlaylistPlayer({ videoId, playlistId }) {
        const player = useYouTubePlayer(videoId, { autoplay: true, muted: false, controls: true, playsinline: true, rel: false, modestbranding: true, loop: true, list: playlistId, listType: 'playlist' });
        useYouTubeEvent(player, 'ready', () => { setVideoLoading(false); setVideoError(false); setBothAttemptsFailed(false); });
        useYouTubeEvent(player, 'error', err => { setVideoError(true); setVideoLoading(false); setErrorMessage(String(err)); });
        return (
            <View className="w-full h-full bg-black relative">
                <YoutubeView player={player} style={{ width: '100%', height: '100%' }} />
                <View className="absolute top-3 left-3 z-10 bg-purple-600 px-3 py-1.5 rounded-lg">
                    <Text className="text-white text-xs font-bold">PLAYLIST</Text>
                </View>
            </View>
        );
    }

    function YouTubeChannelPlayer({ url }) {
        return (
            <View className="w-full h-full bg-black items-center justify-center">
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
            </View>
        );
    }

    function renderVideoPlayer() {
        if (!selectedSeries) return (
            <View className="w-full h-full bg-black items-center justify-center">
                <Ionicons name="play-circle-outline" size={80} color="#6b7280" />
                <Text className="text-white text-xl font-semibold mt-4">No Series Selected</Text>
            </View>
        );
        const currentUrl = getCurrentStreamUrl();
        const { type, isValid } = analyzeStreamUrl(selectedSeries.mediaUrl);

        if (!isValid) return (
            <View className="w-full h-full bg-black items-center justify-center">
                <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid stream URL</Text>
                <Text className="text-gray-400 text-center mt-2 px-4 text-sm">{errorMessage || 'URL format not supported'}</Text>
            </View>
        );
        if (type === 'youtube-video') {
            const videoId = extractVideoId(selectedSeries.mediaUrl);
            if (!videoId) return (
                <View className="w-full h-full bg-black items-center justify-center">
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid YouTube URL</Text>
                </View>
            );
            return (<>{renderStreamTypeBadge(type)}<YouTubeVideoPlayer videoId={videoId} /></>);
        }
        if (type === 'youtube-live') {
            const videoId = extractVideoId(selectedSeries.mediaUrl);
            if (!videoId) return (
                <View className="w-full h-full bg-black items-center justify-center">
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid YouTube Live URL</Text>
                </View>
            );
            return (<>{renderStreamTypeBadge(type)}<YouTubeLivePlayer videoId={videoId} /></>);
        }
        if (type === 'youtube-playlist') {
            const videoId = extractVideoId(selectedSeries.mediaUrl);
            const playlistId = extractPlaylistId(selectedSeries.mediaUrl);
            if (!playlistId) return (
                <View className="w-full h-full bg-black items-center justify-center">
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid Playlist URL</Text>
                </View>
            );
            return (<>{renderStreamTypeBadge(type)}<YouTubePlaylistPlayer videoId={videoId} playlistId={playlistId} /></>);
        }
        if (type === 'youtube-channel')
            return (<>{renderStreamTypeBadge(type)}<YouTubeChannelPlayer url={selectedSeries.mediaUrl} /></>);
        // expo-av for all non-YouTube streams
        if (
            type !== 'youtube-video' &&
            type !== 'youtube-live' &&
            type !== 'youtube-playlist' &&
            type !== 'youtube-channel'
        ) {
            return (
                <View className="w-full h-full bg-black relative">
                    {renderStreamTypeBadge(type)}
                    {videoLoading && (
                        <View className="absolute inset-0 bg-black items-center justify-center z-20">
                            <ActivityIndicator size="large" color="#f97316" />
                            <Text className="text-white mt-3 text-sm">Loading {type.toUpperCase()} stream...</Text>
                            <Text className="text-gray-400 mt-1 text-xs">{useProxy ? 'Using Proxy' : 'Direct Connection'}</Text>
                        </View>
                    )}
                    {videoError && (
                        <View className="absolute inset-0 bg-black/90 items-center justify-center z-30 px-8">
                            <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                            <Text className="text-white text-center mt-4 text-lg font-semibold">Stream Error</Text>
                            <Text className="text-gray-400 text-center mt-2 text-sm">{errorMessage}</Text>
                            {bothAttemptsFailed && (
                                <Text className="text-orange-500 text-center mt-4 text-base font-semibold">Try another series</Text>
                            )}
                            {!bothAttemptsFailed && (
                                <TouchableOpacity className="mt-4 bg-orange-500 px-6 py-3 rounded-lg" onPress={() => { setVideoError(false); setVideoLoading(true); }}>
                                    <Text className="text-white font-semibold">Retry</Text>
                                </TouchableOpacity>
                            )}
                            {serverInfo?.proxyEnabled && !bothAttemptsFailed && (
                                <TouchableOpacity className="mt-3 bg-blue-600 px-6 py-3 rounded-lg" onPress={() => {
                                    setUseProxy(!useProxy);
                                    setVideoError(false);
                                    setVideoLoading(true);
                                    setProxyAttempted(true);
                                }}>
                                    <Text className="text-white font-semibold">{useProxy ? 'Try Direct Connection' : 'Try Proxy Connection'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    <Video
                        ref={videoRef}
                        source={{ uri: currentUrl.uri, headers: currentUrl.headers }}
                        style={{ width: '100%', height: '100%', backgroundColor: 'black' }}
                        useNativeControls
                        resizeMode="contain"
                        shouldPlay
                        onLoadStart={() => setVideoLoading(true)}
                        onReadyForDisplay={() => setVideoLoading(false)}
                        onError={e => {
                            setVideoError(true);
                            setVideoLoading(false);
                            setErrorMessage(
                                'Video Error: ' + (e?.nativeEvent?.error || 'Playback failed')
                            );
                        }}
                        onPlaybackStatusUpdate={status => {
                            if (status.isLoaded) {
                                if (status.isPlaying) {
                                    setVideoLoading(false);
                                    setVideoError(false);
                                    setBothAttemptsFailed(false);
                                }
                            } else if (status.error) {
                                setVideoError(true);
                                setVideoLoading(false);
                                setErrorMessage(
                                    'Video Error: ' + (status.error || 'Playback failed')
                                );
                            }
                        }}
                    />
                    {/* Series Info Overlay */}
                    <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-6">
                        <View className="flex-row items-center">
                            <Image source={{ uri: selectedSeries.verticalUrl }} style={{ width: 56, height: 84, borderRadius: 8, marginRight: 18 }} />
                            <View>
                                <Text className="text-white text-2xl font-bold mb-2">{selectedSeries.title}</Text>
                                <View className="flex-row items-center flex-wrap">
                                    <View className="bg-orange-500 px-3 py-1 rounded-full mr-2 mb-2">
                                        <Text className="text-white font-bold text-xs">{selectedSeries.genre?.name}</Text>
                                    </View>
                                    <View className="bg-gray-700 px-3 py-1 rounded-full mr-2 mb-2">
                                        <Text className="text-gray-200 font-semibold text-xs">{selectedSeries.language?.name}</Text>
                                    </View>
                                    <View className="bg-gray-700 px-3 py-1 rounded-full mb-2 flex-row items-center">
                                        <Text className="text-gray-200 font-semibold text-xs ml-1">{selectedSeries.seasonsCount} Season{selectedSeries.seasonsCount > 1 ? "s" : ""}</Text>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setShowUserMenu(true)} style={{ backgroundColor: '#1f2937', padding: 12, borderRadius: 22, marginLeft: 'auto' }}><Ionicons name="menu" size={24} color="#f97316" /></TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        }
    }

    if (loading) return (
        <View className="flex-1 bg-black items-center justify-center">
            <StatusBar barStyle="light-content" hidden />
            <ActivityIndicator size="large" color="#f97316" />
            <Text className="text-white mt-4 text-base">Loading Web Series...</Text>
        </View>
    );

    if (!series || series.length === 0) return (
        <View className="flex-1 bg-black items-center justify-center">
            <StatusBar barStyle="light-content" hidden />
            <Ionicons name="play-circle-outline" size={80} color="#6b7280" />
            <Text className="text-white text-xl font-semibold mt-4">No Series Available</Text>
            <TouchableOpacity className="mt-6 bg-orange-500 px-6 py-3 rounded-lg" onPress={fetchSeries}>
                <Text className="text-white font-semibold">Refresh Series</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="flex-1 bg-black">
            <StatusBar barStyle="light-content" hidden />
            <View style={{ height: '65%', width: '100%' }}>{renderVideoPlayer()}</View>
            <View style={{ height: '35%', width: '100%' }} className="bg-gray-900">
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 14 }}>
                    {groupedSeries.map((genre, genreIndex) => (
                        <View key={genre.title} className="mb-4">
                            <View className="flex-row items-center justify-between px-6 mb-3">
                                <Text className="text-white text-lg font-bold">{genre.title}</Text>
                                <Text className="text-gray-500 text-sm">{genre.data.length} series</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                                {genre.data.map((show, showIndex) => {
                                    const isFocused = focusedGenre === genreIndex && focusedShowIndex === showIndex;
                                    const isPlaying = selectedSeries?._id === show._id;
                                    return (
                                        <TouchableOpacity
                                            key={show._id}
                                            className={`mr-4 rounded-lg overflow-hidden ${isPlaying ? 'border-2 border-orange-500' : isFocused ? 'border-2 border-orange-500 opacity-80' : ''}`}
                                            style={{ width: 120 }}
                                            onPress={() => handleShowChange(show)}
                                            hasTVPreferredFocus={genreIndex === 0 && showIndex === 0}
                                        >
                                            <View className="relative">
                                                <Image source={{ uri: show.verticalUrl }} style={{ width: "100%", height: 160, backgroundColor: "#222", borderRadius: 10 }} />
                                                {isPlaying && (
                                                    <View className="absolute inset-0 bg-black/30 items-center justify-center">
                                                        <View className="bg-orange-500 rounded-full p-2">
                                                            <Ionicons name="play" size={20} color="white" />
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                            <View className={`p-2 ${isPlaying ? 'bg-orange-500' : 'bg-gray-800'}`}>
                                                <Text className={`font-semibold text-xs ${isPlaying ? 'text-white' : 'text-gray-200'}`} numberOfLines={2}>{show.title}</Text>
                                                <Text className={`text-xs mt-1 ${isPlaying ? 'text-white/80' : 'text-gray-400'}`}>{show.language?.name}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    ))}
                </ScrollView>
            </View>
            {/* User Menu Modal */}
            <Modal visible={showUserMenu} animationType="slide" transparent onRequestClose={() => setShowUserMenu(false)}>
                <View className="flex-1 bg-black/70 justify-end">
                    <View className="bg-gray-900 rounded-t-3xl">
                        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-800">
                            <Text className="text-white text-xl font-bold">Menu</Text>
                            <TouchableOpacity onPress={() => setShowUserMenu(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView className="px-6 py-4" style={{ maxHeight: 400 }}>
                            <View className="bg-gray-800 rounded-xl p-4 mb-4">
                                <View className="flex-row items-center mb-3">
                                    <Ionicons name="play-circle" size={24} color="#f97316" />
                                    <Text className="text-white text-lg font-bold ml-3">Series Library</Text>
                                </View>
                                <View className="flex-row justify-between py-2 border-t border-gray-700">
                                    <Text className="text-gray-400">Total Shows</Text>
                                    <Text className="text-white font-semibold">{series.length}</Text>
                                </View>
                                <View className="flex-row justify-between py-2 border-t border-gray-700">
                                    <Text className="text-gray-400">Genres</Text>
                                    <Text className="text-white font-semibold">{groupedSeries.length}</Text>
                                </View>
                            </View>
                            {serverInfo?.whatsappNumber && (
                                <TouchableOpacity className="bg-green-600 py-4 rounded-xl items-center mb-3" onPress={() => Linking.openURL(`https://wa.me/${serverInfo.whatsappNumber}`).catch(() => Alert.alert('Error', 'Unable to open WhatsApp'))}>
                                    <View className="flex-row items-center">
                                        <Ionicons name="logo-whatsapp" size={20} color="white" />
                                        <Text className="text-white font-bold text-base ml-2">Contact Support</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            {serverInfo?.customButtonLink && serverInfo?.customButtonText && (
                                <TouchableOpacity className="bg-blue-600 py-4 rounded-xl items-center mb-3" onPress={() => Linking.openURL(serverInfo.customButtonLink).catch(() => Alert.alert('Error', 'Unable to open link'))}>
                                    <View className="flex-row items-center">
                                        <Ionicons name="open-outline" size={20} color="white" />
                                        <Text className="text-white font-bold text-base ml-2">{serverInfo.customButtonText}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity className="bg-orange-600 py-4 rounded-xl items-center mb-4" onPress={() => { setShowUserMenu(false); fetchSeries(); }}>
                                <View className="flex-row items-center">
                                    <Ionicons name="refresh" size={20} color="white" />
                                    <Text className="text-white font-bold text-base ml-2">Refresh Series</Text>
                                </View>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
