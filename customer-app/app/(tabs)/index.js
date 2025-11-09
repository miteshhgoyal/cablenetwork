// app/(tabs)/channels.js - COMPLETE FILE WITH PROXY TOGGLE + YOUTUBE WITH SOUND
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    Dimensions,
    StatusBar,
    Linking,
    ActivityIndicator,
    Platform,
    FlatList,
    Alert,
    AppState,
    SectionList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/authContext';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { YoutubeView, useYouTubePlayer, useYouTubeEvent } from 'react-native-youtube-bridge';
import { WebView } from 'react-native-webview';

export default function ChannelsScreen() {
    const { channels, user, packagesList, serverInfo, logout, refreshChannels, refreshing } = useAuth();
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Proxy management (DEFAULT OFF)
    const [useProxy, setUseProxy] = useState(false);
    const [proxyAttempted, setProxyAttempted] = useState(false);

    const videoRef = useRef(null);
    const webViewRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
    const [playlistVideoIds, setPlaylistVideoIds] = useState([]);
    const [useWebViewPlayer, setUseWebViewPlayer] = useState(false);
    const [playerMode, setPlayerMode] = useState('auto');
    const [youtubeReady, setYoutubeReady] = useState(false);
    const [currentYoutubeVideoId, setCurrentYoutubeVideoId] = useState(null);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                refreshChannels();
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // ==========================================
    // GROUP CHANNELS BY LANGUAGE
    // ==========================================

    const groupedChannels = useMemo(() => {
        if (!channels || channels.length === 0) return [];

        const languageMap = {};

        channels.forEach((channel) => {
            const languageName = channel.language?.name || 'Unknown';

            if (!languageMap[languageName]) {
                languageMap[languageName] = {
                    title: languageName,
                    data: []
                };
            }

            languageMap[languageName].data.push(channel);
        });

        return Object.values(languageMap).sort((a, b) =>
            a.title.localeCompare(b.title)
        );
    }, [channels]);

    const getRecommendedChannels = () => {
        if (!selectedChannel) return [];

        return channels.filter(ch =>
            ch.language?.name === selectedChannel.language?.name &&
            ch._id !== selectedChannel._id
        ).slice(0, 15);
    };

    // ==========================================
    // STREAM URL ANALYSIS
    // ==========================================

    const analyzeStreamUrl = (url) => {
        if (!url) return { type: 'unknown', isValid: false };

        const urlLower = url.toLowerCase();

        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
            if (urlLower.includes('/live/')) return { type: 'youtube-live', isValid: true };
            if (urlLower.includes('watch?v=')) return { type: 'youtube-video', isValid: true };
            if (urlLower.includes('playlist') || urlLower.includes('list=')) return { type: 'youtube-playlist', isValid: true };
            if (urlLower.includes('/c/') || urlLower.includes('/@')) return { type: 'youtube-channel', isValid: true };
            return { type: 'youtube-video', isValid: true };
        }

        if (urlLower.includes('.m3u8') || urlLower.includes('m3u')) {
            return { type: 'hls', isValid: true };
        }

        if (urlLower.includes('chunklist')) {
            return { type: 'hls', isValid: true };
        }

        if (urlLower.includes('.mp4')) {
            return { type: 'mp4', isValid: true };
        }

        if (url.match(/:\d{4}\//)) {
            return { type: 'iptv', isValid: true };
        }

        if (url.match(/\/\d+\/\d+\/\d+$/)) {
            return { type: 'iptv', isValid: true };
        }

        if (urlLower.includes('rtmp')) {
            return { type: 'rtmp', isValid: true };
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
            return { type: 'stream', isValid: true };
        }

        return { type: 'unknown', isValid: false };
    };

    const extractVideoId = (url) => {
        if (!url) return null;
        const shortRegex = /youtu\.be\/([^?&]+)/;
        const shortMatch = url.match(shortRegex);
        if (shortMatch) return shortMatch[1];
        const watchRegex = /youtube\.com\/watch\?v=([^&]+)/;
        const watchMatch = url.match(watchRegex);
        if (watchMatch) return watchMatch[1];
        const liveRegex = /youtube\.com\/live\/([^?&]+)/;
        const liveMatch = url.match(liveRegex);
        if (liveMatch) return liveMatch[1];
        const embedRegex = /youtube\.com\/embed\/([^?&]+)/;
        const embedMatch = url.match(embedRegex);
        if (embedMatch) return embedMatch[1];
        return null;
    };

    const extractPlaylistId = (url) => {
        if (!url) return null;
        const playlistRegex = /[?&]list=([^&]+)/;
        const match = url.match(playlistRegex);
        return match ? match[1] : null;
    };

    // ==========================================
    // GET CURRENT STREAM URL (WITH PROXY TOGGLE)
    // ==========================================

    const getCurrentStreamUrl = () => {
        if (!selectedChannel) return '';

        // Use proxy only if toggle is ON
        if (useProxy && selectedChannel.proxyUrl && serverInfo?.proxyEnabled) {
            console.log('🔒 Using proxy URL');
            return selectedChannel.proxyUrl;
        }

        console.log('🌐 Using direct URL');
        return selectedChannel.url;
    };

    // ==========================================
    // YOUTUBE PLAYER COMPONENTS (WITH SOUND, NO UNMUTE BUTTON)
    // ==========================================

    const YouTubeVideoPlayer = ({ videoId }) => {
        const player = useYouTubePlayer(videoId, {
            autoplay: true,
            muted: false,  // ✅ Start with sound
            controls: true,
            playsinline: true,
            rel: false,
            modestbranding: true,
        });

        useYouTubeEvent(player, 'ready', () => {
            console.log('✅ YouTube player ready');
            setVideoLoading(false);
            setYoutubeReady(true);
            setVideoError(false);
        });

        useYouTubeEvent(player, 'error', (error) => {
            console.error('❌ YouTube error:', error);
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Error: ${error.message}`);
        });

        useYouTubeEvent(player, 'autoplayBlocked', () => {
            console.warn('⚠️ Autoplay was blocked');
        });

        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                <YoutubeView
                    player={player}
                    style={{ width: '100%', height: 260 }}
                />
            </View>
        );
    };

    const YouTubeLivePlayer = ({ videoId }) => {
        const player = useYouTubePlayer(videoId, {
            autoplay: true,
            muted: false,  // ✅ Start with sound
            controls: true,
            playsinline: true,
            rel: false,
            modestbranding: true,
        });

        useYouTubeEvent(player, 'ready', () => {
            console.log('✅ YouTube live player ready');
            setVideoLoading(false);
            setYoutubeReady(true);
            setVideoError(false);
        });

        useYouTubeEvent(player, 'error', (error) => {
            console.error('❌ YouTube live error:', error);
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Live Error: ${error.message}`);
        });

        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                <View className="absolute top-3 left-3 z-10 bg-red-600 px-3 py-1.5 rounded-full flex-row items-center">
                    <View className="w-2 h-2 bg-white rounded-full mr-2" />
                    <Text className="text-white text-xs font-bold">🔴 LIVE</Text>
                </View>
                <YoutubeView
                    player={player}
                    style={{ width: '100%', height: 260 }}
                />
            </View>
        );
    };

    const YouTubePlaylistPlayer = ({ videoId, playlistId }) => {
        const player = useYouTubePlayer(videoId, {
            autoplay: true,
            muted: false,  // ✅ Start with sound
            controls: true,
            playsinline: true,
            rel: false,
            modestbranding: true,
            loop: true,
            list: playlistId,
            listType: 'playlist',
        });

        useYouTubeEvent(player, 'ready', () => {
            console.log('✅ YouTube playlist player ready');
            setVideoLoading(false);
            setYoutubeReady(true);
            setVideoError(false);
        });

        useYouTubeEvent(player, 'error', (error) => {
            console.error('❌ YouTube playlist error:', error);
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Playlist Error: ${error.message}`);
        });

        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                <YoutubeView
                    player={player}
                    style={{ width: '100%', height: 260 }}
                />
                <View className="absolute top-3 left-3 z-10 bg-purple-600 px-3 py-1.5 rounded-lg">
                    <Text className="text-white text-xs font-bold">📋 PLAYLIST</Text>
                </View>
            </View>
        );
    };

    const YouTubeChannelPlayer = ({ url }) => {
        return (
            <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                <Ionicons name="logo-youtube" size={80} color="#ff0000" />
                <Text className="text-white text-lg font-semibold mt-4 text-center px-6">
                    YouTube Channel Detected
                </Text>
                <Text className="text-gray-400 text-sm mt-2 text-center px-6">
                    Please use a specific video or playlist URL
                </Text>
                <TouchableOpacity
                    className="mt-6 bg-orange-500 px-6 py-3 rounded-lg"
                    onPress={() => Linking.openURL(url)}
                >
                    <Text className="text-white font-semibold">Open in YouTube</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // ==========================================
    // RENDER VIDEO PLAYER BASED ON TYPE
    // ==========================================

    const renderStreamTypeBadge = (type) => {
        const badges = {
            'youtube-video': { icon: 'logo-youtube', color: 'bg-red-600', text: 'YouTube' },
            'youtube-live': { icon: 'radio', color: 'bg-red-600', text: 'YouTube Live' },
            'youtube-playlist': { icon: 'list', color: 'bg-purple-600', text: 'Playlist' },
            'hls': { icon: 'videocam', color: 'bg-blue-600', text: 'HLS Stream' },
            'mp4': { icon: 'film', color: 'bg-green-600', text: 'MP4' },
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
    };

    const renderVideoPlayer = () => {
        if (!selectedChannel) return null;

        const currentUrl = getCurrentStreamUrl();
        const { type, isValid } = analyzeStreamUrl(currentUrl);

        if (!isValid) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        Invalid stream URL
                    </Text>
                    <Text className="text-gray-400 text-center mt-2 px-4 text-sm">
                        {errorMessage || 'The provided URL format is not supported'}
                    </Text>
                </View>
            );
        }

        // YouTube Video
        if (type === 'youtube-video') {
            const videoId = extractVideoId(currentUrl);
            if (!videoId) {
                return (
                    <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">
                            Invalid YouTube URL
                        </Text>
                    </View>
                );
            }
            return (
                <>
                    {renderStreamTypeBadge(type)}
                    <YouTubeVideoPlayer videoId={videoId} />
                </>
            );
        }

        // YouTube Live
        if (type === 'youtube-live') {
            const videoId = extractVideoId(currentUrl);
            if (!videoId) {
                return (
                    <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">
                            Invalid YouTube Live URL
                        </Text>
                    </View>
                );
            }
            return (
                <>
                    {renderStreamTypeBadge(type)}
                    <YouTubeLivePlayer videoId={videoId} />
                </>
            );
        }

        // YouTube Playlist
        if (type === 'youtube-playlist') {
            const videoId = extractVideoId(currentUrl);
            const playlistId = extractPlaylistId(currentUrl);

            if (!videoId || !playlistId) {
                return (
                    <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">
                            Invalid YouTube Playlist URL
                        </Text>
                    </View>
                );
            }
            return (
                <>
                    {renderStreamTypeBadge(type)}
                    <YouTubePlaylistPlayer videoId={videoId} playlistId={playlistId} />
                </>
            );
        }

        // YouTube Channel
        if (type === 'youtube-channel') {
            return (
                <>
                    {renderStreamTypeBadge(type)}
                    <YouTubeChannelPlayer url={currentUrl} />
                </>
            );
        }

        // Regular video streams (HLS, MP4, IPTV, RTMP, etc.)
        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                {renderStreamTypeBadge(type)}

                {videoLoading && (
                    <View className="absolute inset-0 bg-black items-center justify-center z-20">
                        <ActivityIndicator size="large" color="#f97316" />
                        <Text className="text-white mt-3 text-sm">Loading {type.toUpperCase()} stream...</Text>
                    </View>
                )}

                {videoError && (
                    <View className="absolute inset-0 bg-black items-center justify-center z-30">
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">
                            Stream Error
                        </Text>
                        <Text className="text-gray-400 text-center mt-2 px-4 text-sm">
                            {errorMessage || 'Unable to load the stream'}
                        </Text>

                        {serverInfo?.proxyEnabled && !useProxy && !proxyAttempted && (
                            <TouchableOpacity
                                className="mt-4 bg-orange-500 px-6 py-3 rounded-lg"
                                onPress={() => {
                                    setUseProxy(true);
                                    setProxyAttempted(true);
                                    setVideoError(false);
                                    setVideoLoading(true);
                                }}
                            >
                                <Text className="text-white font-semibold">🔒 Try Proxy Connection</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            className="mt-3 bg-gray-700 px-6 py-3 rounded-lg"
                            onPress={() => {
                                setVideoError(false);
                                setVideoLoading(true);
                                setUseProxy(false);
                                setProxyAttempted(false);
                            }}
                        >
                            <Text className="text-white font-semibold">🔄 Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Video
                    ref={videoRef}
                    source={{ uri: currentUrl }}
                    rate={1.0}
                    volume={1.0}
                    isMuted={false}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={isPlaying}
                    isLooping={false}
                    useNativeControls
                    style={{ width: '100%', height: 260 }}
                    onLoad={() => {
                        setVideoLoading(false);
                        setVideoError(false);
                        console.log('✅ Video loaded successfully');
                    }}
                    onError={(error) => {
                        console.error('❌ Video error:', error);
                        setVideoError(true);
                        setVideoLoading(false);
                        setErrorMessage('Failed to load stream. Please check your connection.');
                    }}
                    onLoadStart={() => {
                        setVideoLoading(true);
                        setVideoError(false);
                    }}
                />
            </View>
        );
    };

    // ==========================================
    // CHANNEL SELECTION
    // ==========================================

    const handleChannelPress = (channel) => {
        setSelectedChannel(channel);
        setShowPlayer(true);
        setVideoError(false);
        setVideoLoading(true);
        setUseProxy(false);
        setProxyAttempted(false);
        setYoutubeReady(false);
        setCurrentPlaylistIndex(0);
        setPlaylistVideoIds([]);
        setCurrentYoutubeVideoId(null);
    };

    // ==========================================
    // SEARCH FILTERING
    // ==========================================

    const filteredGroupedChannels = useMemo(() => {
        if (!searchQuery.trim()) return groupedChannels;

        const lowerQuery = searchQuery.toLowerCase();
        return groupedChannels
            .map(group => ({
                ...group,
                data: group.data.filter(channel =>
                    channel.name.toLowerCase().includes(lowerQuery) ||
                    channel.language?.name.toLowerCase().includes(lowerQuery)
                )
            }))
            .filter(group => group.data.length > 0);
    }, [groupedChannels, searchQuery]);

    // ==========================================
    // RENDER FUNCTIONS
    // ==========================================

    const renderChannelItem = ({ item }) => (
        <TouchableOpacity
            className="flex-row items-center p-4 bg-gray-800 mb-2 rounded-lg active:bg-gray-700"
            onPress={() => handleChannelPress(item)}
        >
            <View className="w-12 h-12 bg-orange-500 rounded-lg items-center justify-center mr-3">
                <Ionicons name="tv" size={24} color="white" />
            </View>

            <View className="flex-1">
                <Text className="text-white font-semibold text-base" numberOfLines={1}>
                    {item.name}
                </Text>
                <Text className="text-gray-400 text-sm mt-0.5">
                    {item.language?.name || 'Unknown'}
                </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section }) => (
        <View className="bg-gray-900 px-4 py-3 border-b border-gray-700">
            <Text className="text-orange-500 font-bold text-lg">{section.title}</Text>
        </View>
    );

    // ==========================================
    // MAIN RENDER
    // ==========================================

    if (!user) {
        return (
            <SafeAreaView className="flex-1 bg-black items-center justify-center">
                <Ionicons name="person-circle-outline" size={80} color="#f97316" />
                <Text className="text-white text-xl font-semibold mt-4">Please Login</Text>
                <Text className="text-gray-400 mt-2">You need to login to view channels</Text>
            </SafeAreaView>
        );
    }

    if (!channels || channels.length === 0) {
        return (
            <SafeAreaView className="flex-1 bg-black">
                <StatusBar barStyle="light-content" />
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="tv-outline" size={80} color="#6b7280" />
                    <Text className="text-white text-xl font-semibold mt-4 text-center">
                        No Channels Available
                    </Text>
                    <Text className="text-gray-400 mt-2 text-center">
                        Please check your subscription or contact support
                    </Text>
                    <TouchableOpacity
                        className="mt-6 bg-orange-500 px-6 py-3 rounded-lg"
                        onPress={refreshChannels}
                    >
                        <Text className="text-white font-semibold">Refresh Channels</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-black">
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View className="px-4 py-3 bg-gray-900 border-b border-gray-800">
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-white text-2xl font-bold">📺 Live Channels</Text>
                    <TouchableOpacity onPress={refreshChannels} disabled={refreshing}>
                        <Ionicons
                            name="refresh"
                            size={24}
                            color={refreshing ? '#9ca3af' : '#f97316'}
                        />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View className="bg-gray-800 rounded-lg px-4 py-3 flex-row items-center">
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TouchableOpacity
                        className="flex-1 ml-2"
                        onPress={() => {
                            Alert.prompt(
                                'Search Channels',
                                'Enter channel name or language',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Search', onPress: (text) => setSearchQuery(text || '') }
                                ],
                                'plain-text',
                                searchQuery
                            );
                        }}
                    >
                        <Text className="text-white text-base">
                            {searchQuery || 'Search channels...'}
                        </Text>
                    </TouchableOpacity>
                    {searchQuery !== '' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Channels List */}
            <SectionList
                sections={filteredGroupedChannels}
                keyExtractor={(item) => item._id}
                renderItem={renderChannelItem}
                renderSectionHeader={renderSectionHeader}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={true}
                refreshing={refreshing}
                onRefresh={refreshChannels}
            />

            {/* Video Player Modal */}
            <Modal
                visible={showPlayer}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowPlayer(false)}
            >
                <SafeAreaView className="flex-1 bg-black">
                    <StatusBar barStyle="light-content" />

                    {/* Player Header */}
                    <View className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex-row items-center justify-between">
                        <TouchableOpacity
                            onPress={() => {
                                setShowPlayer(false);
                                setSelectedChannel(null);
                                videoRef.current?.pauseAsync();
                            }}
                            className="flex-row items-center"
                        >
                            <Ionicons name="arrow-back" size={24} color="white" />
                            <Text className="text-white text-lg font-semibold ml-2">Back</Text>
                        </TouchableOpacity>

                        {/* Proxy Toggle */}
                        {serverInfo?.proxyEnabled && (
                            <View className="flex-row items-center">
                                <Text className="text-gray-400 text-sm mr-2">Proxy</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setUseProxy(!useProxy);
                                        setVideoError(false);
                                        setVideoLoading(true);
                                        setProxyAttempted(false);
                                    }}
                                    className={`w-12 h-6 rounded-full justify-center ${useProxy ? 'bg-orange-500' : 'bg-gray-600'}`}
                                >
                                    <View className={`w-5 h-5 rounded-full bg-white ${useProxy ? 'self-end mr-0.5' : 'self-start ml-0.5'}`} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Channel Info */}
                    {selectedChannel && (
                        <View className="px-4 py-3 bg-gray-900">
                            <Text className="text-white text-xl font-bold" numberOfLines={1}>
                                {selectedChannel.name}
                            </Text>
                            <View className="flex-row items-center mt-2">
                                <Ionicons name="language" size={14} color="#9ca3af" />
                                <Text className="text-gray-400 text-sm ml-1.5">
                                    {selectedChannel.language?.name || 'Unknown Language'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Video Player */}
                    <ScrollView className="flex-1">
                        {renderVideoPlayer()}

                        {/* Recommended Channels */}
                        <View className="px-4 py-6">
                            <Text className="text-white text-lg font-bold mb-3">
                                📌 Recommended Channels
                            </Text>
                            {getRecommendedChannels().map((channel) => (
                                <TouchableOpacity
                                    key={channel._id}
                                    className="flex-row items-center p-3 bg-gray-800 mb-2 rounded-lg active:bg-gray-700"
                                    onPress={() => handleChannelPress(channel)}
                                >
                                    <View className="w-10 h-10 bg-orange-500 rounded-lg items-center justify-center mr-3">
                                        <Ionicons name="tv" size={20} color="white" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white font-semibold" numberOfLines={1}>
                                            {channel.name}
                                        </Text>
                                        <Text className="text-gray-400 text-xs mt-0.5">
                                            {channel.language?.name}
                                        </Text>
                                    </View>
                                    <Ionicons name="play-circle" size={24} color="#f97316" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
