// app/(tabs)/index.js
import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    Modal,
    ScrollView,
    Dimensions,
    StatusBar,
    Linking,
    ActivityIndicator
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

    const handleChannelPress = (channel) => {
        setSelectedChannel(channel);
        setShowPlayer(true);
        setVideoError(false);
        setVideoLoading(false);
    };

    const closePlayer = () => {
        setShowPlayer(false);
        setSelectedChannel(null);
        setVideoError(false);
        setVideoLoading(false);
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

    // ==========================================
    // OPEN YOUTUBE IN APP
    // ==========================================

    const openYouTubeApp = (url) => {
        if (!url) return;

        const youtubeType = getYouTubeType(url);

        if (youtubeType === 'video' || youtubeType === 'live') {
            const videoId = extractVideoId(url);
            if (videoId) {
                const youtubeUrl = `youtube://${videoId}`;
                Linking.openURL(youtubeUrl).catch(() => {
                    Linking.openURL(url);
                });
            }
        } else if (youtubeType === 'channel') {
            Linking.openURL(url);
        } else if (youtubeType === 'playlist') {
            Linking.openURL(url);
        }
    };

    // ==========================================
    // RENDER CHANNEL CARD - FIXED
    // ==========================================

    const renderChannel = ({ item }) => (
        <TouchableOpacity
            className="m-2 bg-white rounded-2xl overflow-hidden shadow-md"
            style={{ width: (width / 2) - 24 }}
            onPress={() => handleChannelPress(item)}
            activeOpacity={0.7}
        >
            <Image
                source={{ uri: item.imageUrl }}
                style={{ width: '100%', height: 110 }}
                resizeMode="cover"
            />
            <View className="p-3">
                <Text className="text-xs font-bold text-orange-600 mb-1">
                    LCN {item.lcn}
                </Text>
                <Text
                    className="text-sm font-semibold text-gray-900"
                    numberOfLines={1}
                >
                    {item.name}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                    {item.genre?.name || 'General'}
                </Text>

                {/* FIXED: Show package names */}
                {item.packageNames && item.packageNames.length > 0 && (
                    <View className="mt-2 flex-row flex-wrap gap-1">
                        {item.packageNames.map((pkgName, idx) => (
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
    // RENDER VIDEO PLAYER (HLS/M3U8 Stream)
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
                        Stream may be offline or URL is invalid
                    </Text>
                </View>
            ) : (
                <Video
                    source={{ uri: selectedChannel.url }}
                    style={{ width: '100%', height: '100%' }}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                    shouldPlay
                    onError={(error) => {
                        console.log('Video error:', error);
                        setVideoError(true);
                    }}
                    onLoad={() => {
                        setVideoError(false);
                        setVideoLoading(false);
                    }}
                    onLoadStart={() => setVideoLoading(true)}
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
                <View className="flex-1 items-center justify-center px-6">
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
                    onError={() => setVideoError(true)}
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
                <View className="flex-1 items-center justify-center px-6 space-y-4">
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
                <View className="flex-1 items-center justify-center px-6">
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
                    onError={() => setVideoError(true)}
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
                <View className="flex-1 items-center justify-center px-6">
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
                </View>
            );
        }
    };

    // ==========================================
    // RENDER CHANNEL TYPE BADGE
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
        }

        return (
            <View className={`${color} px-3 py-1.5 rounded-lg mr-2`}>
                <Text className="text-white font-bold text-xs">{type}</Text>
            </View>
        );
    };

    // Format expiry date - FIXED
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

    // Calculate days remaining - FIXED
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
        <SafeAreaView className="flex-1 bg-gray-50">
            <StatusBar barStyle="light-content" backgroundColor="#f97316" />

            {/* ===== UPDATED HEADER ===== */}
            <View className="bg-orange-500 px-6 py-5">
                {/* Top Row: Title + Logout */}
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-white text-2xl font-bold flex-1">
                        All Channels
                    </Text>
                    <TouchableOpacity
                        onPress={logout}
                        className="w-10 h-10 bg-orange-600 rounded-full items-center justify-center"
                    >
                        <Ionicons name="log-out-outline" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Info Row 1: Channel Count + Expiry */}
                <View className="flex-row justify-between mb-3">
                    <View className="flex-row items-center">
                        <Ionicons name="tv-outline" size={16} color="#fff" />
                        <Text className="text-orange-100 text-sm ml-2 font-semibold">
                            {channels.length} Channels
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <Ionicons name="calendar-outline" size={16} color="#fff" />
                        <Text className="text-orange-100 text-sm ml-2 font-semibold">
                            {getDaysRemaining()} days left
                        </Text>
                    </View>
                </View>

                {/* Info Row 2: Expiry Date */}
                <View className="flex-row justify-between items-center">
                    <Text className="text-orange-100 text-xs">
                        Expires: {getFormattedExpiryDate()}
                    </Text>
                </View>

                {/* FIXED: Show package list */}
                {packagesList.length > 0 && (
                    <View className="mt-3 pt-3 border-t border-orange-400/50 flex-row flex-wrap gap-2">
                        {packagesList.map((pkg, idx) => (
                            <View key={idx} className="bg-orange-600/40 px-2.5 py-1 rounded">
                                <Text className="text-orange-50 text-xs font-semibold">
                                    {pkg.name} • {pkg.channelCount} ch
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Channels Grid */}
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
                <FlatList
                    data={channels}
                    renderItem={renderChannel}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    contentContainerStyle={{ padding: 8, paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Video Player Modal */}
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

                    <ScrollView className="flex-1">
                        {/* Video Player */}
                        {renderPlayerContent()}

                        {/* Loading Indicator */}
                        {videoLoading && (
                            <View className="absolute inset-0 items-center justify-center bg-black/50">
                                <ActivityIndicator size="large" color="#ff9500" />
                            </View>
                        )}

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

                            {/* FIXED: Show package names in modal */}
                            {selectedChannel?.packageNames && selectedChannel.packageNames.length > 0 && (
                                <View className="mb-4">
                                    <Text className="text-gray-300 text-xs font-semibold mb-2">
                                        Available in Packages:
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

                            {selectedChannel?.language && (
                                <View className="flex-row items-center mb-2">
                                    <Ionicons name="language-outline" size={18} color="#9ca3af" />
                                    <Text className="text-gray-400 text-sm ml-2">
                                        {selectedChannel.language.name}
                                    </Text>
                                </View>
                            )}

                            {!selectedChannel?.url && (
                                <View className="mt-4 bg-red-900/30 border border-red-500 rounded-xl p-4">
                                    <Text className="text-red-400 text-sm">
                                        Stream URL not configured
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
