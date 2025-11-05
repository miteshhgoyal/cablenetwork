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

    const handleChannelPress = (channel) => {
        setSelectedChannel(channel);
        setShowPlayer(true);
        setVideoError(false);
        setVideoLoading(false);
        setErrorMessage('');
    };

    const closePlayer = () => {
        setShowPlayer(false);
        setSelectedChannel(null);
        setVideoError(false);
        setVideoLoading(false);
        setErrorMessage('');
    };

    // ==========================================
    // YOUTUBE DETECTION & EXTRACTION
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

    const isHLS = (url) => {
        return url?.includes('.m3u8') || url?.includes('m3u');
    };

    const isStreamUrl = (url) => {
        return url?.includes('http') && (url?.includes('.mp4') ||
            url?.includes('.m3u8') ||
            url?.includes('stream') ||
            url?.includes('rtmp'));
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
    // RENDER CHANNEL CARD
    // ==========================================

    const renderChannelCard = ({ item }) => (
        <TouchableOpacity
            className="bg-white rounded-xl overflow-hidden shadow-sm flex-1 mx-1 mb-3"
            onPress={() => handleChannelPress(item)}
            activeOpacity={0.7}
        >
            <Image
                source={{ uri: item.imageUrl }}
                className="w-full h-24 bg-gray-200"
                resizeMode="cover"
            />
            <View className="p-3">
                <Text className="text-xs font-bold text-orange-600 tracking-wide">
                    LCN {item.lcn}
                </Text>
                <Text className="text-sm font-bold text-gray-900 mt-1 mb-1" numberOfLines={1}>
                    {item.name}
                </Text>
                <Text className="text-xs text-gray-500 mb-2">
                    {item.genre?.name || 'General'}
                </Text>

                {item.packageNames && item.packageNames.length > 0 && (
                    <View className="flex-row flex-wrap gap-1">
                        {item.packageNames.slice(0, 2).map((pkgName, idx) => (
                            <View key={idx} className="bg-orange-100 px-2 py-0.5 rounded">
                                <Text className="text-xs text-orange-700 font-semibold">
                                    {pkgName}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
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

            {/* Grid Items */}
            <View className="bg-gray-50 px-2 py-3">
                <FlatList
                    data={section.data}
                    renderItem={renderChannelCard}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    scrollEnabled={false}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                />
            </View>
        </View>
    );

    // ==========================================
    // RENDER STREAM PLAYER
    // ==========================================

    const renderStreamPlayer = () => (
        <View className="w-full bg-black" style={{ height: 260 }}>
            {videoError ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        Unable to load stream
                    </Text>
                    <Text className="text-gray-400 text-sm text-center mt-2">
                        {errorMessage || 'Stream may be offline or URL is invalid'}
                    </Text>
                    <TouchableOpacity
                        onPress={() => {
                            setVideoError(false);
                            setVideoLoading(true);
                            if (videoRef.current) {
                                videoRef.current.loadAsync({
                                    uri: selectedChannel.url,
                                    headers: {
                                        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36'
                                    }
                                });
                            }
                        }}
                        className="mt-4 bg-orange-600 px-6 py-2 rounded-lg"
                    >
                        <Text className="text-white font-semibold">Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <Video
                    ref={videoRef}
                    source={{
                        uri: selectedChannel.url,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36'
                        }
                    }}
                    style={{ width: '100%', height: '100%' }}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                    shouldPlay={true}
                    progressUpdateIntervalMillis={1000}
                    onError={(error) => {
                        console.error('Video error:', error);
                        setErrorMessage(error?.message || 'Stream playback failed');
                        setVideoError(true);
                    }}
                    onLoad={() => {
                        setVideoError(false);
                        setVideoLoading(false);
                    }}
                    onLoadStart={() => setVideoLoading(true)}
                    onBuffer={({ isBuffering }) => {
                        setVideoLoading(isBuffering);
                    }}
                    onPlaybackStatusUpdate={(status) => {
                        if (status.error) {
                            console.error('Playback error:', status.error);
                            setErrorMessage(status.error);
                            setVideoError(true);
                        }
                    }}
                />
            )}
        </View>
    );

    // ==========================================
    // RENDER YOUTUBE VIDEO PLAYER
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
                    }}
                    onReady={() => {
                        setVideoError(false);
                        setVideoLoading(false);
                    }}
                    onChangeState={(state) => {
                        if (state === 'playing') {
                            setVideoLoading(false);
                        } else if (state === 'buffering') {
                            setVideoLoading(true);
                        }
                    }}
                    initialPlayerParams={{
                        controls: true,
                        modestbranding: false,
                        rel: false,
                        showinfo: true,
                        iv_load_policy: 3,
                        cc_load_policy: 0
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
                        className="bg-red-600 px-6 py-2 rounded-lg mt-2"
                    >
                        <Text className="text-white font-semibold">Open in YouTube</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // ==========================================
    // RENDER YOUTUBE LIVE STREAM
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
                    }}
                    onReady={() => {
                        setVideoError(false);
                        setVideoLoading(false);
                    }}
                    onChangeState={(state) => {
                        if (state === 'playing') {
                            setVideoLoading(false);
                        }
                    }}
                    initialPlayerParams={{
                        controls: true,
                        rel: false,
                        modestbranding: true
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
        } else if (isHLS(selectedChannel.url) || isStreamUrl(selectedChannel.url)) {
            return renderStreamPlayer();
        } else {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        Unknown Stream Type
                    </Text>
                    <Text className="text-gray-400 text-sm text-center mt-2">
                        URL: {selectedChannel.url?.substring(0, 50)}...
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

        if (youtubeType === 'video') {
            type = 'YouTube Video';
            color = 'bg-red-600';
        } else if (youtubeType === 'live') {
            type = '🔴 Live';
            color = 'bg-red-600';
        } else if (youtubeType === 'channel') {
            type = 'YouTube Channel';
            color = 'bg-red-600';
        } else if (youtubeType === 'playlist') {
            type = 'YouTube Playlist';
            color = 'bg-red-600';
        } else if (isHLS(selectedChannel.url)) {
            type = 'HLS Stream';
            color = 'bg-blue-600';
        } else if (selectedChannel.url.includes('.mp4')) {
            type = 'MP4 Video';
            color = 'bg-green-600';
        }

        return (
            <View className={`${color} px-3 py-1.5 rounded-lg mr-2`}>
                <Text className="text-white font-bold text-xs">{type}</Text>
            </View>
        );
    };

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
                            {getDaysRemaining()} days
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
                        Contact your cable operator
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
                            <Text className="text-white ml-2 text-base">Back</Text>
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
                        <View>
                            {renderPlayerContent()}
                            {videoLoading && (
                                <View className="absolute inset-0 items-center justify-center bg-black/50 z-10" style={{ height: 260 }}>
                                    <ActivityIndicator size="large" color="#ff9500" />
                                </View>
                            )}
                        </View>

                        {/* Channel Info */}
                        <View className="p-6">
                            <View className="flex-row items-center mb-4">
                                {renderStreamTypeBadge()}
                                <Text className="text-gray-400 text-sm">
                                    {selectedChannel?.genre?.name || 'General'}
                                </Text>
                            </View>

                            <Text className="text-white text-2xl font-bold mb-3">
                                {selectedChannel?.name}
                            </Text>

                            {selectedChannel?.language && (
                                <View className="flex-row items-center mb-4 bg-orange-900/30 px-3 py-2 rounded-lg">
                                    <Ionicons name="language-outline" size={18} color="#fbbf24" />
                                    <Text className="text-orange-200 text-sm ml-2 font-semibold">
                                        {selectedChannel.language.name}
                                    </Text>
                                </View>
                            )}

                            {selectedChannel?.packageNames && selectedChannel.packageNames.length > 0 && (
                                <View className="mb-4">
                                    <Text className="text-gray-300 text-xs font-semibold mb-2">
                                        Available Packages:
                                    </Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {selectedChannel.packageNames.map((pkgName, idx) => (
                                            <View key={idx} className="bg-orange-600/50 px-3 py-1.5 rounded">
                                                <Text className="text-orange-100 text-xs font-semibold">
                                                    {pkgName}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {!selectedChannel?.url && (
                                <View className="mt-4 bg-red-900/30 border border-red-500 rounded-lg p-4">
                                    <Text className="text-red-400 text-sm">
                                        ⚠️ Stream URL not configured
                                    </Text>
                                </View>
                            )}

                            {selectedChannel?.url && isStreamUrl(selectedChannel.url) && (
                                <View className="mt-4 p-3 bg-gray-900 rounded-lg">
                                    <Text className="text-gray-400 text-xs" selectable>
                                        Stream: {selectedChannel.url.substring(0, 60)}...
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
