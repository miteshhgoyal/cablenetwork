// app/(tabs)/index.js
import React, { useState, useRef, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    Modal,
    ScrollView,
    Dimensions,
    StatusBar,
    Linking,
    ActivityIndicator,
    Platform,
    FlatList
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

    const handleChannelPress = (channel) => {
        // Stop previous video if playing
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
            videoRef.current.stopAsync().catch(() => { });
        }
        setShowPlayer(false);
        setSelectedChannel(null);
        setVideoError(false);
        setVideoLoading(false);
        setErrorMessage('');
        setIsPlaying(false);
    };

    // ==========================================
    // URL DETECTION & HANDLING
    // ==========================================

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
        // Detect IPTV-style URLs (like xott.live, etc)
        const iptvPatterns = [
            /:\d{4}\/\d+\/\d+\/\d+/,  // Pattern: :8080/56564322/56564323/244915
            /\/live\/.*\/.*\//,        // Pattern: /live/username/password/
            /\/get\.php/,              // Pattern: /get.php
            /\/play\//,                // Pattern: /play/
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

        // YouTube check
        if (getYouTubeType(url)) return false;

        // HTTP/HTTPS stream check
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

    const getStreamHeaders = (url) => {
        const baseHeaders = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        };

        // Add Referer and Origin for certain domains
        if (url.includes('103.175.73') || url.includes('210.89.51')) {
            baseHeaders['Referer'] = 'https://example.com';
            baseHeaders['Origin'] = 'https://example.com';
        }

        return baseHeaders;
    };

    const openYouTubeApp = (url) => {
        if (!url) return;
        const youtubeType = getYouTubeType(url);
        if (youtubeType === 'video' || youtubeType === 'live') {
            const videoId = extractVideoId(url);
            if (videoId) {
                const youtubeUrl = Platform.OS === 'ios'
                    ? `youtube://${videoId}`
                    : `vnd.youtube://${videoId}`;
                Linking.openURL(youtubeUrl).catch(() => {
                    Linking.openURL(url);
                });
            }
        } else {
            Linking.openURL(url);
        }
    };

    // ==========================================
    // RENDER CHANNEL ITEM (TEXT ONLY - NO IMAGE)
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
    // RENDER RECOMMENDED CHANNEL ITEM
    // ==========================================

    const renderRecommendedItem = ({ item }) => (
        <TouchableOpacity
            className="bg-gray-800 rounded-lg px-3 py-3 mb-2 flex-row items-center justify-between active:bg-gray-700"
            onPress={() => {
                handleChannelPress(item);
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
            {/* Language Header */}
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

            {/* Channel List */}
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
    // RENDER STREAM PLAYER (HLS/M3U8/IPTV/MP4)
    // ==========================================

    const renderStreamPlayer = () => {
        const streamUrl = selectedChannel.url;
        const headers = getStreamHeaders(streamUrl);

        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                {videoError ? (
                    <View className="flex-1 items-center justify-center px-6">
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">
                            Unable to load stream
                        </Text>
                        <Text className="text-gray-400 text-sm text-center mt-2 px-4">
                            {errorMessage || 'Stream may be offline, restricted, or URL is invalid'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                setVideoError(false);
                                setVideoLoading(true);
                                if (videoRef.current) {
                                    videoRef.current.unloadAsync().then(() => {
                                        videoRef.current.loadAsync(
                                            {
                                                uri: streamUrl,
                                                headers: headers
                                            },
                                            { shouldPlay: true }
                                        );
                                    });
                                }
                            }}
                            className="mt-4 bg-orange-600 px-6 py-3 rounded-lg"
                        >
                            <Text className="text-white font-semibold">Retry Stream</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <Video
                            ref={videoRef}
                            source={{
                                uri: streamUrl,
                                headers: headers,
                                overrideFileExtensionAndroid: isHLS(streamUrl) ? 'm3u8' : undefined,
                            }}
                            style={{ width: '100%', height: '100%' }}
                            useNativeControls={true}
                            resizeMode={ResizeMode.CONTAIN}
                            isLooping={false}
                            shouldPlay={true}
                            progressUpdateIntervalMillis={500}
                            onError={(error) => {
                                console.error('Video error:', error);
                                const errorMsg = error?.error?.message || error?.message || 'Stream playback failed';
                                setErrorMessage(errorMsg);
                                setVideoError(true);
                                setVideoLoading(false);
                                setIsPlaying(false);
                            }}
                            onLoad={(data) => {
                                console.log('Video loaded successfully:', data);
                                setVideoError(false);
                                setVideoLoading(false);
                                setIsPlaying(true);
                            }}
                            onLoadStart={() => {
                                console.log('Loading video from:', streamUrl);
                                setVideoLoading(true);
                            }}
                            onReadyForDisplay={() => {
                                console.log('Video ready for display');
                                setVideoLoading(false);
                            }}
                            onPlaybackStatusUpdate={(status) => {
                                if (status.error) {
                                    console.error('Playback error:', status.error);
                                    setErrorMessage(status.error);
                                    setVideoError(true);
                                    setVideoLoading(false);
                                }
                                if (status.isLoaded) {
                                    setIsPlaying(status.isPlaying);
                                    if (!status.isPlaying && !status.isBuffering) {
                                        setVideoLoading(false);
                                    }
                                }
                            }}
                            onBuffer={({ isBuffering }) => {
                                setVideoLoading(isBuffering);
                            }}
                        />
                    </>
                )}
            </View>
        );
    };

    // ==========================================
    // RENDER YOUTUBE VIDEO PLAYER (AUTOPLAY)
    // ==========================================

    const renderYouTubeVideoPlayer = () => {
        const videoId = extractVideoId(selectedChannel.url);

        if (!videoId) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        Invalid YouTube Link
                    </Text>
                    <Text className="text-gray-400 text-sm text-center mt-2 px-6">
                        Could not extract video ID from URL
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
                        console.error('YouTube error:', error);
                        setErrorMessage('Unable to load YouTube video');
                        setVideoError(true);
                        setVideoLoading(false);
                    }}
                    onReady={() => {
                        console.log('YouTube player ready');
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
                        } else if (state === 'paused') {
                            setIsPlaying(false);
                        }
                    }}
                    initialPlayerParams={{
                        controls: true,
                        modestbranding: true,
                        rel: false,
                        showinfo: true,
                        iv_load_policy: 3,
                        cc_load_policy: 0,
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

    const renderYouTubeChannelOrPlaylist = () => {
        const youtubeType = getYouTubeType(selectedChannel.url);

        return (
            <View className="w-full bg-black" style={{ height: 260 }}>
                <View className="flex-1 items-center justify-center px-6 gap-4">
                    <Ionicons name="logo-youtube" size={60} color="#ff0000" />
                    <Text className="text-white text-center text-lg font-semibold">
                        {youtubeType === 'channel' ? 'YouTube Channel' : 'YouTube Playlist'}
                    </Text>
                    <Text className="text-gray-300 text-sm text-center">
                        {youtubeType === 'channel'
                            ? 'Open this channel in YouTube app'
                            : 'Open this playlist in YouTube app'}
                    </Text>
                    <TouchableOpacity
                        onPress={() => openYouTubeApp(selectedChannel.url)}
                        className="bg-red-600 px-6 py-3 rounded-lg mt-2"
                    >
                        <Text className="text-white font-semibold">Open in YouTube</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // ==========================================
    // RENDER YOUTUBE LIVE STREAM (AUTOPLAY)
    // ==========================================

    const renderYouTubeLive = () => {
        const videoId = extractVideoId(selectedChannel.url);

        if (!videoId) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        Invalid YouTube Live Link
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
                        console.error('YouTube Live error:', error);
                        setErrorMessage('Unable to load YouTube live stream');
                        setVideoError(true);
                        setVideoLoading(false);
                    }}
                    onReady={() => {
                        console.log('YouTube Live ready');
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
    // MAIN PLAYER SELECTOR
    // ==========================================

    const renderPlayerContent = () => {
        if (!selectedChannel?.url) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        No Stream Available
                    </Text>
                    <Text className="text-gray-400 text-sm text-center mt-2 px-6">
                        This channel does not have a stream URL configured
                    </Text>
                </View>
            );
        }

        const youtubeType = getYouTubeType(selectedChannel.url);

        if (youtubeType === 'video') {
            return renderYouTubeVideoPlayer();
        } else if (youtubeType === 'live') {
            return renderYouTubeLive();
        } else if (youtubeType === 'channel' || youtubeType === 'playlist') {
            return renderYouTubeChannelOrPlaylist();
        } else if (isStreamUrl(selectedChannel.url)) {
            return renderStreamPlayer();
        } else {
            return (
                <View className="w-full bg-black items-center justify-center px-6" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        Unknown Stream Type
                    </Text>
                    <Text className="text-gray-400 text-xs text-center mt-2" selectable>
                        {selectedChannel.url?.substring(0, 80)}...
                    </Text>
                </View>
            );
        }
    };

    // ==========================================
    // RENDER STREAM TYPE BADGE
    // ==========================================

    const renderStreamTypeBadge = () => {
        if (!selectedChannel?.url) return null;

        const youtubeType = getYouTubeType(selectedChannel.url);
        let type = 'Stream';
        let color = 'bg-blue-500';
        let icon = 'tv-outline';

        if (youtubeType === 'video') {
            type = 'YouTube Video';
            color = 'bg-red-600';
            icon = 'logo-youtube';
        } else if (youtubeType === 'live') {
            type = '🔴 YouTube Live';
            color = 'bg-red-600';
            icon = 'radio-outline';
        } else if (youtubeType === 'channel') {
            type = 'YouTube Channel';
            color = 'bg-red-600';
            icon = 'logo-youtube';
        } else if (youtubeType === 'playlist') {
            type = 'YouTube Playlist';
            color = 'bg-red-600';
            icon = 'list-outline';
        } else if (isIPTVStream(selectedChannel.url)) {
            type = 'IPTV Stream';
            color = 'bg-purple-600';
            icon = 'server-outline';
        } else if (isHLS(selectedChannel.url)) {
            type = 'HLS Stream';
            color = 'bg-blue-600';
            icon = 'radio-outline';
        } else if (isMP4(selectedChannel.url)) {
            type = 'MP4 Video';
            color = 'bg-green-600';
            icon = 'videocam-outline';
        }

        return (
            <View className={`${color} px-3 py-1.5 rounded-lg flex-row items-center`}>
                <Ionicons name={icon} size={14} color="white" />
                <Text className="text-white font-bold text-xs ml-1.5">{type}</Text>
            </View>
        );
    };

    // ==========================================
    // FORMAT DATE & DAYS
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
                <View className="flex-row justify-between items-center mb-3">
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
                    <View className="pt-2 border-t border-orange-400 border-opacity-40">
                        <View className="flex-row flex-wrap gap-2 mt-2">
                            {packagesList.map((pkg, idx) => (
                                <View key={idx} className="bg-orange-600 bg-opacity-40 px-3 py-1.5 rounded-full">
                                    <Text className="text-orange-50 text-xs font-semibold">
                                        {pkg.name} • {pkg.channelCount} ch
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
                        Please contact your cable operator
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

            {/* VIDEO PLAYER MODAL */}
            <Modal
                visible={showPlayer}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={closePlayer}
            >
                <SafeAreaView className="flex-1 bg-black">
                    <StatusBar barStyle="light-content" backgroundColor="#000" />

                    {/* Modal Header */}
                    <View className="flex-row items-center px-4 py-3 bg-black/90 border-b border-gray-800">
                        <TouchableOpacity
                            onPress={closePlayer}
                            className="flex-row items-center"
                        >
                            <Ionicons name="chevron-back" size={24} color="white" />
                            <Text className="text-white ml-2 text-base font-medium">Back</Text>
                        </TouchableOpacity>
                        <Text
                            className="text-white font-bold text-base flex-1 text-center mr-16"
                            numberOfLines={1}
                        >
                            {selectedChannel?.name}
                        </Text>
                    </View>

                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                        {/* Video Player */}
                        <View className="relative">
                            {renderPlayerContent()}
                            {videoLoading && !videoError && (
                                <View className="absolute inset-0 items-center justify-center bg-black/70 z-10" style={{ height: 260 }}>
                                    <ActivityIndicator size="large" color="#f97316" />
                                    <Text className="text-white mt-3 text-sm">Loading stream...</Text>
                                </View>
                            )}
                        </View>

                        {/* Channel Info */}
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
                                        AVAILABLE IN PACKAGES:
                                    </Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {selectedChannel.packageNames.map((pkgName, idx) => (
                                            <View key={idx} className="bg-orange-600/40 px-3 py-1.5 rounded-lg">
                                                <Text className="text-orange-100 text-xs font-semibold">
                                                    {pkgName}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Recommended Channels Section */}
                            {getRecommendedChannels().length > 0 && (
                                <View className="mt-6">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text className="text-white text-lg font-bold">
                                            More in {selectedChannel?.language?.name}
                                        </Text>
                                        <Text className="text-gray-400 text-xs">
                                            {getRecommendedChannels().length} channels
                                        </Text>
                                    </View>
                                    <FlatList
                                        data={getRecommendedChannels()}
                                        renderItem={renderRecommendedItem}
                                        keyExtractor={(item) => item._id}
                                        scrollEnabled={false}
                                        contentContainerStyle={{ gap: 0 }}
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
