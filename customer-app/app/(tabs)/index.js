// app/(tabs)/index.js
import React, { useState, useRef, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/authContext';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import YoutubePlayer from 'react-native-youtube-iframe';

const { width } = Dimensions.get('window');

export default function ChannelsScreen() {
    const { channels, user, packagesList, logout } = useAuth();
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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

    // Get recommended channels (same language as selected)
    const getRecommendedChannels = () => {
        if (!selectedChannel) return [];

        return channels.filter(ch =>
            ch.language?.name === selectedChannel.language?.name &&
            ch._id !== selectedChannel._id
        ).slice(0, 15);
    };

    // ==========================================
    // STREAM URL ANALYSIS (ENHANCED)
    // ==========================================

    const analyzeStreamUrl = (url) => {
        if (!url) return { type: 'unknown', isValid: false };

        const urlLower = url.toLowerCase();

        // YouTube detection
        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
            if (urlLower.includes('/live/')) return { type: 'youtube-live', isValid: true };
            if (urlLower.includes('watch?v=')) return { type: 'youtube-video', isValid: true };
            if (urlLower.includes('playlist')) return { type: 'youtube-playlist', isValid: true };
            if (urlLower.includes('/c/') || urlLower.includes('/@')) return { type: 'youtube-channel', isValid: true };
            return { type: 'youtube-video', isValid: true };
        }

        // HLS/M3U8 detection
        if (urlLower.includes('.m3u8') || urlLower.includes('m3u')) {
            return { type: 'hls', isValid: true };
        }

        // Chunklist detection
        if (urlLower.includes('chunklist')) {
            return { type: 'hls', isValid: true };
        }

        // MP4 detection
        if (urlLower.includes('.mp4')) {
            return { type: 'mp4', isValid: true };
        }

        // IPTV-style URL detection
        if (url.match(/:\d{4}\//) || url.match(/\/live\//)) {
            return { type: 'iptv', isValid: true };
        }

        // RTMP detection
        if (urlLower.includes('rtmp')) {
            return { type: 'rtmp', isValid: true };
        }

        // Generic HTTP/HTTPS stream
        if (url.includes('http://') || url.includes('https://')) {
            return { type: 'stream', isValid: true };
        }

        return { type: 'unknown', isValid: false };
    };

    const getYouTubeType = (url) => {
        if (!url) return null;
        if (url.includes('youtu.be/') || url.includes('youtube.com/watch')) {
            return 'video';
        }
        if (url.includes('youtube.com/live/')) {
            return 'live';
        }
        if (url.includes('youtube.com/playlist') || url.includes('list=')) {
            return 'playlist';
        }
        if (url.includes('youtube.com/c/') || url.includes('youtube.com/@')) {
            return 'channel';
        }
        if (url.includes('youtube.com/user/')) {
            return 'channel';
        }
        return null;
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

    const isIPTVStream = (url) => {
        if (!url) return false;
        const iptvPatterns = [
            /:\d{4}\/\d+\/\d+\/\d+/,
            /\/live\/.*\/.*\//,
            /\/get\.php/,
            /\/play\//,
        ];
        return iptvPatterns.some(pattern => pattern.test(url));
    };

    const isHLS = (url) => {
        if (!url) return false;
        return url.includes('.m3u8') || url.includes('m3u');
    };

    const isMP4 = (url) => {
        if (!url) return false;
        return url.includes('.mp4');
    };

    const isStreamUrl = (url) => {
        if (!url) return false;
        if (getYouTubeType(url)) return false;
        return (url.includes('http://') || url.includes('https://')) && (
            isHLS(url) ||
            isMP4(url) ||
            isIPTVStream(url) ||
            url.includes('stream') ||
            url.includes('rtmp') ||
            url.includes('hls') ||
            url.includes('/live/') ||
            url.includes('chunklist')
        );
    };

    // ==========================================
    // GET OPTIMAL HEADERS FOR ANY URL
    // ==========================================

    const getOptimalHeaders = (url) => {
        if (!url) return {};

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
        };

        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const protocol = urlObj.protocol;

            if (domain.includes('.live') || domain.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
                headers['Referer'] = `${protocol}//${domain}`;
                headers['Origin'] = `${protocol}//${domain}`;
                headers['Host'] = domain;
            }

            if (domain.includes('youtube') || domain.includes('googlevideo')) {
                headers['Referer'] = 'https://www.youtube.com/';
                headers['Origin'] = 'https://www.youtube.com';
            }

            return headers;
        } catch (error) {
            console.log('Error parsing URL headers:', error);
            return headers;
        }
    };

    // ==========================================
    // PLAYER STATE MANAGEMENT
    // ==========================================

    const handleChannelPress = (channel) => {
        if (videoRef.current) {
            videoRef.current.stopAsync().catch(() => { });
        }

        setSelectedChannel(channel);
        setShowPlayer(true);
        setVideoError(false);
        setVideoLoading(true);
        setErrorMessage('');
        setIsPlaying(true);
    };

    const closePlayer = () => {
        if (videoRef.current) {
            videoRef.current.stopAsync().catch(err => {
                console.log('Error stopping video:', err);
            });
        }

        setShowPlayer(false);
        setSelectedChannel(null);
        setVideoError(false);
        setVideoLoading(false);
        setErrorMessage('');
        setIsPlaying(false);
    };

    const openYouTubeApp = (url) => {
        if (!url) return;

        const videoId = extractVideoId(url);
        if (videoId) {
            const youtubeUrl = Platform.OS === 'ios'
                ? `youtube://${videoId}`
                : `vnd.youtube://${videoId}`;

            Linking.openURL(youtubeUrl).catch(() => {
                Linking.openURL(url);
            });
        } else {
            Linking.openURL(url);
        }
    };

    // ==========================================
    // RENDER CHANNEL ITEM (TEXT ONLY)
    // ==========================================

    const renderChannelItem = ({ item }) => (
        <TouchableOpacity
            className="bg-white rounded-lg px-4 py-3.5 mb-2 mx-3 shadow-sm flex-row items-center justify-between active:bg-gray-50"
            onPress={() => handleChannelPress(item)}
            activeOpacity={0.7}
        >
            <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1.5">
                    <View className="bg-orange-500 px-2.5 py-0.5 rounded-md">
                        <Text className="text-white text-xs font-bold">
                            LCN {item.lcn}
                        </Text>
                    </View>
                    <Text className="text-gray-500 text-xs ml-2 font-medium">
                        {item.genre?.name || 'General'}
                    </Text>
                </View>
                <Text className="text-base font-bold text-gray-900 mb-1" numberOfLines={2}>
                    {item.name}
                </Text>
                {item.packageNames && item.packageNames.length > 0 && (
                    <View className="flex-row flex-wrap gap-1 mt-1">
                        {item.packageNames.slice(0, 2).map((pkgName, idx) => (
                            <View key={idx} className="bg-orange-50 px-2 py-0.5 rounded">
                                <Text className="text-xs text-orange-600 font-semibold">
                                    {pkgName}
                                </Text>
                            </View>
                        ))}
                        {item.packageNames.length > 2 && (
                            <View className="bg-gray-100 px-2 py-0.5 rounded">
                                <Text className="text-xs text-gray-600 font-semibold">
                                    +{item.packageNames.length - 2}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
            <Ionicons name="play-circle" size={36} color="#f97316" />
        </TouchableOpacity>
    );

    // ==========================================
    // RENDER RECOMMENDED ITEM
    // ==========================================

    const renderRecommendedItem = ({ item }) => (
        <TouchableOpacity
            className="bg-gray-800 rounded-lg px-3 py-3 mb-2 flex-row items-center justify-between active:bg-gray-700"
            onPress={() => {
                closePlayer();
                setTimeout(() => handleChannelPress(item), 100);
            }}
            activeOpacity={0.7}
        >
            <View className="flex-1 mr-2">
                <View className="flex-row items-center mb-1">
                    <View className="bg-orange-500 px-2 py-0.5 rounded">
                        <Text className="text-white text-xs font-bold">
                            {item.lcn}
                        </Text>
                    </View>
                    <Text className="text-gray-400 text-xs ml-2">
                        {item.genre?.name || 'General'}
                    </Text>
                </View>
                <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                    {item.name}
                </Text>
            </View>
            <Ionicons name="play" size={20} color="#f97316" />
        </TouchableOpacity>
    );

    // ==========================================
    // RENDER LANGUAGE SECTION
    // ==========================================

    const renderLanguageSection = (section) => (
        <View key={section.title} className="mt-3 mb-2">
            <View className="bg-orange-500 px-4 py-3 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                    <Ionicons name="language-outline" size={18} color="white" />
                    <Text className="text-white text-base font-bold ml-3 flex-1">
                        {section.title}
                    </Text>
                </View>
                <View className="bg-orange-600 px-3 py-1.5 rounded-full">
                    <Text className="text-white text-xs font-bold">
                        {section.data.length}
                    </Text>
                </View>
            </View>

            <View className="bg-gray-50 py-2">
                <FlatList
                    data={section.data}
                    renderItem={renderChannelItem}
                    keyExtractor={(item) => item._id}
                    scrollEnabled={false}
                />
            </View>
        </View>
    );

    // ==========================================
    // RENDER STREAM PLAYER
    // ==========================================

    const renderStreamPlayer = () => {
        const streamUrl = selectedChannel.url;
        const headers = getOptimalHeaders(streamUrl);

        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                {videoError ? (
                    <View className="flex-1 items-center justify-center px-6">
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">
                            Stream Failed
                        </Text>
                        <Text className="text-gray-400 text-xs text-center mt-2 px-4 line-clamp-2">
                            {errorMessage || 'Unable to load stream'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                setVideoError(false);
                                setVideoLoading(true);
                                if (videoRef.current) {
                                    videoRef.current.unloadAsync()
                                        .then(() => {
                                            videoRef.current.loadAsync(
                                                {
                                                    uri: streamUrl,
                                                    headers: headers,
                                                    overrideFileExtensionAndroid: 'm3u8',
                                                },
                                                { shouldPlay: true }
                                            );
                                        })
                                        .catch(err => {
                                            console.log('Error reloading:', err);
                                            setVideoError(true);
                                            setVideoLoading(false);
                                        });
                                }
                            }}
                            className="mt-4 bg-orange-600 px-6 py-3 rounded-lg"
                        >
                            <Text className="text-white font-semibold">Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Video
                        ref={videoRef}
                        source={{
                            uri: streamUrl,
                            headers: headers,
                            overrideFileExtensionAndroid: 'm3u8',
                        }}
                        style={{ width: '100%', height: '100%' }}
                        useNativeControls={true}
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping={false}
                        shouldPlay={true}
                        progressUpdateIntervalMillis={500}
                        rate={1.0}
                        volume={1.0}
                        isMuted={false}
                        onLoad={() => {
                            console.log('✅ Video loaded:', streamUrl);
                            setVideoError(false);
                            setVideoLoading(false);
                            setIsPlaying(true);
                        }}
                        onLoadStart={() => {
                            console.log('⏳ Loading stream...');
                            setVideoLoading(true);
                        }}
                        onReadyForDisplay={() => {
                            console.log('✅ Ready for display');
                            setVideoLoading(false);
                        }}
                        onError={(error) => {
                            console.error('❌ Video Error:', error);
                            const errorMsg = error?.error?.message || error?.message || 'Stream failed';
                            setErrorMessage(errorMsg);
                            setVideoError(true);
                            setVideoLoading(false);
                        }}
                        onPlaybackStatusUpdate={(status) => {
                            if (status.error) {
                                console.error('❌ Playback Error:', status.error);
                                setErrorMessage(status.error);
                                setVideoError(true);
                            }
                            if (status.isLoaded) {
                                setIsPlaying(status.isPlaying);
                                if (!status.isPlaying && !status.isBuffering && !videoLoading) {
                                    setVideoLoading(false);
                                }
                            }
                        }}
                        onBuffer={({ isBuffering }) => {
                            if (isBuffering) {
                                console.log('⏳ Buffering...');
                                setVideoLoading(true);
                            } else {
                                setVideoLoading(false);
                            }
                        }}
                    />
                )}
            </View>
        );
    };

    // ==========================================
    // RENDER YOUTUBE VIDEO
    // ==========================================

    const renderYouTubeVideo = () => {
        const videoId = extractVideoId(selectedChannel.url);

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
            <View className="w-full bg-black" style={{ height: 260 }}>
                <YoutubePlayer
                    height={260}
                    videoId={videoId}
                    play={true}
                    onError={(error) => {
                        console.error('❌ YouTube Error:', error);
                        setVideoError(true);
                        setVideoLoading(false);
                    }}
                    onReady={() => {
                        console.log('✅ YouTube ready');
                        setVideoError(false);
                        setVideoLoading(false);
                    }}
                    onChangeState={(state) => {
                        console.log('YouTube state:', state);
                        if (state === 'playing') {
                            setVideoLoading(false);
                            setIsPlaying(true);
                        } else if (state === 'buffering') {
                            setVideoLoading(true);
                        }
                    }}
                    initialPlayerParams={{
                        controls: true,
                        modestbranding: true,
                        rel: false,
                        autoplay: 1,
                        fs: 1,
                        playsinline: 1,
                    }}
                    webViewProps={{
                        androidLayerType: Platform.OS === 'android' ? 'hardware' : undefined,
                    }}
                />
            </View>
        );
    };

    // ==========================================
    // RENDER YOUTUBE LIVE
    // ==========================================

    const renderYouTubeLive = () => {
        const videoId = extractVideoId(selectedChannel.url);

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
            <View className="w-full bg-black" style={{ height: 260 }}>
                <YoutubePlayer
                    height={260}
                    videoId={videoId}
                    play={true}
                    onError={(error) => {
                        console.error('❌ YouTube Live Error:', error);
                        setVideoError(true);
                        setVideoLoading(false);
                    }}
                    onReady={() => {
                        console.log('✅ YouTube Live ready');
                        setVideoError(false);
                        setVideoLoading(false);
                    }}
                    onChangeState={(state) => {
                        if (state === 'playing') {
                            setVideoLoading(false);
                            setIsPlaying(true);
                        } else if (state === 'buffering') {
                            setVideoLoading(true);
                        }
                    }}
                    initialPlayerParams={{
                        controls: true,
                        rel: false,
                        modestbranding: true,
                        autoplay: 1,
                        fs: 1,
                        playsinline: 1,
                    }}
                    webViewProps={{
                        androidLayerType: Platform.OS === 'android' ? 'hardware' : undefined,
                    }}
                />
            </View>
        );
    };

    // ==========================================
    // RENDER YOUTUBE CHANNEL/PLAYLIST
    // ==========================================

    const renderYouTubeChannelOrPlaylist = (isPlaylist) => (
        <View className="w-full bg-black" style={{ height: 260 }}>
            <View className="flex-1 items-center justify-center px-6 gap-4">
                <Ionicons
                    name={isPlaylist ? "list-outline" : "logo-youtube"}
                    size={60}
                    color={isPlaylist ? "#fbbf24" : "#ff0000"}
                />
                <Text className="text-white text-center text-lg font-semibold">
                    {isPlaylist ? 'YouTube Playlist' : 'YouTube Channel'}
                </Text>
                <Text className="text-gray-300 text-sm text-center">
                    Open in YouTube app to view
                </Text>
                <TouchableOpacity
                    onPress={() => openYouTubeApp(selectedChannel.url)}
                    className={`${isPlaylist ? 'bg-yellow-600' : 'bg-red-600'} px-6 py-3 rounded-lg mt-2`}
                >
                    <Text className="text-white font-semibold">Open in YouTube</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // ==========================================
    // RENDER STREAM TYPE BADGE
    // ==========================================

    const renderStreamTypeBadge = () => {
        if (!selectedChannel?.url) return null;

        const analysis = analyzeStreamUrl(selectedChannel.url);
        let color = 'bg-blue-500';
        let icon = 'tv-outline';
        let label = 'Stream';

        switch (analysis.type) {
            case 'youtube-video':
                color = 'bg-red-600';
                icon = 'logo-youtube';
                label = 'YouTube Video';
                break;
            case 'youtube-live':
                color = 'bg-red-600';
                icon = 'radio-outline';
                label = '🔴 YouTube Live';
                break;
            case 'youtube-channel':
                color = 'bg-red-600';
                icon = 'logo-youtube';
                label = 'YouTube Channel';
                break;
            case 'youtube-playlist':
                color = 'bg-red-600';
                icon = 'list-outline';
                label = 'YouTube Playlist';
                break;
            case 'hls':
                color = 'bg-blue-600';
                icon = 'radio-outline';
                label = 'HLS Stream';
                break;
            case 'iptv':
                color = 'bg-purple-600';
                icon = 'server-outline';
                label = 'IPTV Stream';
                break;
            case 'mp4':
                color = 'bg-green-600';
                icon = 'videocam-outline';
                label = 'MP4 Video';
                break;
            case 'rtmp':
                color = 'bg-indigo-600';
                icon = 'radio-outline';
                label = 'RTMP Stream';
                break;
            default:
                color = 'bg-gray-600';
                icon = 'help-circle-outline';
                label = 'Unknown';
        }

        return (
            <View className={`${color} px-3 py-1.5 rounded-lg flex-row items-center`}>
                <Ionicons name={icon} size={14} color="white" />
                <Text className="text-white font-bold text-xs ml-1.5">{label}</Text>
            </View>
        );
    };

    // ==========================================
    // MAIN PLAYER ROUTER
    // ==========================================

    const renderPlayerContent = () => {
        if (!selectedChannel?.url) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        No Stream URL
                    </Text>
                </View>
            );
        }

        const analysis = analyzeStreamUrl(selectedChannel.url);

        if (!analysis.isValid) {
            return (
                <View className="w-full bg-black items-center justify-center px-6" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        Invalid Stream URL
                    </Text>
                    <Text className="text-gray-400 text-xs text-center mt-2">
                        {selectedChannel.url?.substring(0, 80)}
                    </Text>
                </View>
            );
        }

        switch (analysis.type) {
            case 'youtube-video':
                return renderYouTubeVideo();
            case 'youtube-live':
                return renderYouTubeLive();
            case 'youtube-channel':
                return renderYouTubeChannelOrPlaylist(false);
            case 'youtube-playlist':
                return renderYouTubeChannelOrPlaylist(true);
            case 'hls':
            case 'iptv':
            case 'mp4':
            case 'rtmp':
            case 'stream':
                return renderStreamPlayer();
            default:
                return renderStreamPlayer();
        }
    };

    // ==========================================
    // FORMAT HELPERS
    // ==========================================

    const getFormattedExpiryDate = () => {
        if (!user?.expiryDate) return '';
        const date = new Date(user.expiryDate);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(date.getDate()).padStart(2, '0');
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const getDaysRemaining = () => {
        if (!user?.expiryDate) return 0;
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const expiry = new Date(user.expiryDate);
            expiry.setHours(0, 0, 0, 0);
            const diffTime = expiry - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return Math.max(0, diffDays);
        } catch (error) {
            console.error('Error calculating days:', error);
            return 0;
        }
    };

    // ==========================================
    // MAIN RENDER
    // ==========================================

    return (
        <SafeAreaView className="flex-1 bg-gray-100">
            <StatusBar barStyle="light-content" backgroundColor="#f97316" />

            {/* HEADER */}
            <View className="bg-orange-500 px-4 py-4">
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-white text-3xl font-bold flex-1">
                        All Channels
                    </Text>
                    <TouchableOpacity
                        onPress={logout}
                        className="w-11 h-11 bg-orange-600 rounded-full items-center justify-center"
                    >
                        <Ionicons name="log-out-outline" size={22} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Stats Row 1 */}
                <View className="flex-row justify-between mb-2">
                    <View className="flex-row items-center">
                        <Ionicons name="tv-outline" size={16} color="#fef3c7" />
                        <Text className="text-orange-100 text-sm ml-2 font-semibold">
                            {channels.length} Channels
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <Ionicons name="calendar-outline" size={16} color="#fef3c7" />
                        <Text className="text-orange-100 text-sm ml-2 font-semibold">
                            {getDaysRemaining()} days left
                        </Text>
                    </View>
                </View>

                {/* Stats Row 2 */}
                <View className="flex-row justify-between items-center">
                    <Text className="text-orange-100 text-xs">
                        Expires: {getFormattedExpiryDate()}
                    </Text>
                    <View className="flex-row items-center">
                        <Ionicons name="folder-outline" size={16} color="#fef3c7" />
                        <Text className="text-orange-100 text-sm ml-2 font-semibold">
                            {groupedChannels.length} Languages
                        </Text>
                    </View>
                </View>

                {/* Packages */}
                {packagesList.length > 0 && (
                    <View className="pt-2 border-t border-orange-400 border-opacity-40 mt-3">
                        <View className="flex-row flex-wrap gap-2 mt-2">
                            {packagesList.map((pkg, idx) => (
                                <View key={idx} className="bg-orange-600 bg-opacity-40 px-3 py-1.5 rounded-full">
                                    <Text className="text-orange-50 text-xs font-semibold">
                                        {pkg.name} • {pkg.channelCount}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            {/* MAIN CONTENT */}
            {channels.length === 0 ? (
                <View className="flex-1 justify-center items-center px-6">
                    <Ionicons name="tv-outline" size={80} color="#d1d5db" />
                    <Text className="text-gray-500 text-center mt-4 text-lg font-semibold">
                        No channels available
                    </Text>
                    <Text className="text-gray-400 text-center mt-2 text-sm">
                        Contact your provider
                    </Text>
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                >
                    {groupedChannels.map((section) => renderLanguageSection(section))}
                </ScrollView>
            )}

            {/* PLAYER MODAL */}
            <Modal
                visible={showPlayer}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={closePlayer}
            >
                <SafeAreaView className="flex-1 bg-black">
                    <StatusBar barStyle="light-content" backgroundColor="#000" />

                    {/* Header */}
                    <View className="flex-row items-center px-4 py-3 bg-black/90 border-b border-gray-800">
                        <TouchableOpacity onPress={closePlayer} className="flex-row items-center">
                            <Ionicons name="chevron-back" size={24} color="white" />
                            <Text className="text-white ml-2 text-base font-medium">Back</Text>
                        </TouchableOpacity>
                        <Text className="text-white font-bold text-base flex-1 text-center mr-16" numberOfLines={1}>
                            {selectedChannel?.name}
                        </Text>
                    </View>

                    {/* Content */}
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                        {/* Player */}
                        <View className="relative">
                            {renderPlayerContent()}
                            {videoLoading && !videoError && (
                                <View className="absolute inset-0 items-center justify-center bg-black/70 z-10" style={{ height: 260 }}>
                                    <ActivityIndicator size="large" color="#f97316" />
                                    <Text className="text-white mt-3 text-sm">Loading...</Text>
                                </View>
                            )}
                        </View>

                        {/* Info Section */}
                        <View className="p-6">
                            <View className="flex-row items-center mb-4">
                                {renderStreamTypeBadge()}
                                <Text className="text-gray-400 text-sm ml-2">
                                    {selectedChannel?.genre?.name || 'General'}
                                </Text>
                            </View>

                            <Text className="text-white text-2xl font-bold mb-3">
                                {selectedChannel?.name}
                            </Text>

                            {selectedChannel?.language && (
                                <View className="flex-row items-center mb-4 bg-orange-900/30 px-3 py-2.5 rounded-lg">
                                    <Ionicons name="language-outline" size={18} color="#fbbf24" />
                                    <Text className="text-orange-200 text-sm ml-2 font-semibold">
                                        {selectedChannel.language.name}
                                    </Text>
                                </View>
                            )}

                            {selectedChannel?.packageNames && selectedChannel.packageNames.length > 0 && (
                                <View className="mb-4">
                                    <Text className="text-gray-400 text-xs font-semibold mb-2">
                                        AVAILABLE IN:
                                    </Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {selectedChannel.packageNames.map((pkg, idx) => (
                                            <View key={idx} className="bg-orange-600/40 px-3 py-1.5 rounded-lg">
                                                <Text className="text-orange-100 text-xs font-semibold">
                                                    {pkg}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Recommendations */}
                            {getRecommendedChannels().length > 0 && (
                                <View className="mt-6 pt-6 border-t border-gray-700">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text className="text-white text-lg font-bold">
                                            More in {selectedChannel?.language?.name}
                                        </Text>
                                        <Text className="text-gray-400 text-xs">
                                            {getRecommendedChannels().length}
                                        </Text>
                                    </View>
                                    <FlatList
                                        data={getRecommendedChannels()}
                                        renderItem={renderRecommendedItem}
                                        keyExtractor={(item) => item._id}
                                        scrollEnabled={false}
                                    />
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
