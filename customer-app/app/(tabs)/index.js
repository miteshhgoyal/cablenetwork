import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    StatusBar,
    Linking,
    ActivityIndicator,
    Alert,
    AppState,
    FlatList,
    TextInput,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/authContext';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import {
    YoutubeView,
    useYouTubePlayer,
    useYouTubeEvent,
} from 'react-native-youtube-bridge';
import * as ScreenOrientation from 'expo-screen-orientation';


// Watermark Component
const WatermarkOverlay = () => {
    return (
        <View
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                pointerEvents: 'none',
                zIndex: 1,
            }}
        >
            <Text
                style={{
                    color: 'rgba(255, 255, 255, 0.15)',
                    fontSize: 28,
                    fontWeight: 'bold',
                    transform: [{ rotate: '-45deg' }],
                    textShadowColor: 'rgba(0, 0, 0, 0.3)',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 2,
                }}
            >
                Online IPTV Hub
            </Text>
        </View>
    );
};

export default function ChannelsScreen() {
    const {
        channels,
        user,
        packagesList,
        serverInfo,
        logout,
        refreshChannels,
        refreshing,
    } = useAuth();

    const [selectedChannel, setSelectedChannel] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [showUserInfo, setShowUserInfo] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [currentStreamUrl, setCurrentStreamUrl] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const videoRef = useRef(null);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                refreshChannels();
            }
        });
        return () => subscription?.remove();
    }, []);

    useEffect(() => {
        const handleOrientation = async () => {
            if (!showPlayer) {
                await ScreenOrientation.lockAsync(
                    ScreenOrientation.OrientationLock.PORTRAIT
                );
            }
        };
        handleOrientation();
    }, [showPlayer]);

    const getUserPackage = () => {
        if (!user?.package || !packagesList) return null;
        return packagesList.find(pkg => pkg.id === user.package) || null;
    };

    const formatDate = dateString => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getDaysRemaining = () => {
        if (!user?.expiryDate) return null;
        const endDate = new Date(user.expiryDate);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Group channels by language or genre
    const groupedChannels = useMemo(() => {
        if (!channels || channels.length === 0) return [];

        // Group by language first, then genre
        const languageGroups = {};
        const genreGroups = {};

        channels.forEach(channel => {
            const lang = channel.language?.name || 'Unknown';
            const genre = channel.genre?.name || 'General';

            if (!languageGroups[lang]) {
                languageGroups[lang] = [];
            }
            languageGroups[lang].push(channel);

            if (!genreGroups[genre]) {
                genreGroups[genre] = [];
            }
            genreGroups[genre].push(channel);
        });

        // Convert to sections format like movies
        const sections = [];

        // Add language sections
        Object.entries(languageGroups).forEach(([lang, items]) => {
            if (items.length > 0) {
                sections.push({
                    title: `${lang} Channels`,
                    data: items.slice(0, 20), // Limit per section
                    type: 'language',
                    count: items.length
                });
            }
        });

        // Add genre sections
        Object.entries(genreGroups).forEach(([genre, items]) => {
            if (items.length > 0) {
                sections.push({
                    title: `${genre}`,
                    data: items.slice(0, 20),
                    type: 'genre',
                    count: items.length
                });
            }
        });

        return sections;
    }, [channels]);

    const sortedChannels = useMemo(() => {
        if (!channels || channels.length === 0) return [];
        return [...channels].sort((a, b) =>
            (a.lcn ?? 999999) - (b.lcn ?? 999999)
        );
    }, [channels]);

    const categories = useMemo(() => {
        const langs = [...new Set(channels?.map(ch => ch.language?.name).filter(Boolean))];
        const genres = [...new Set(channels?.map(ch => ch.genre?.name).filter(Boolean))];
        return ['all', ...langs.slice(0, 5), ...genres.slice(0, 5)];
    }, [channels]);

    const filteredSections = useMemo(() => {
        let sections = groupedChannels;

        if (selectedCategory !== 'all') {
            sections = sections.filter(section =>
                section.title.toLowerCase().includes(selectedCategory.toLowerCase())
            );
        }

        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            sections = sections.map(section => ({
                ...section,
                data: section.data.filter(channel =>
                    channel.name.toLowerCase().includes(lowerQuery) ||
                    channel.language?.name?.toLowerCase().includes(lowerQuery) ||
                    channel.lcn?.toString().includes(lowerQuery) ||
                    channel.genre?.name?.toLowerCase().includes(lowerQuery)
                )
            })).filter(section => section.data.length > 0);
        }

        return sections;
    }, [groupedChannels, selectedCategory, searchQuery]);

    const getRecommendedChannels = () => {
        if (!selectedChannel || !channels || channels.length === 0) return [];
        const currentLanguage = selectedChannel.language?.name?.toLowerCase();
        const currentGenre = selectedChannel.genre?.name?.toLowerCase();
        const currentId = selectedChannel.id;

        // First priority: Same language AND genre
        const sameLanguageGenre = channels.filter(ch => {
            if (!ch || ch.id === currentId) return false;
            const lang = ch.language?.name?.toLowerCase();
            const genre = ch.genre?.name?.toLowerCase();
            return lang === currentLanguage && genre === currentGenre;
        });

        // Second priority: Same language, different genre
        const sameLanguage = channels.filter(ch => {
            if (!ch || ch.id === currentId) return false;
            const lang = ch.language?.name?.toLowerCase();
            const genre = ch.genre?.name?.toLowerCase();
            return lang === currentLanguage && genre !== currentGenre;
        });

        // Third priority: Same genre, different language
        const sameGenre = channels.filter(ch => {
            if (!ch || ch.id === currentId) return false;
            const lang = ch.language?.name?.toLowerCase();
            const genre = ch.genre?.name?.toLowerCase();
            return genre === currentGenre && lang !== currentLanguage;
        });

        // Combine and limit to 20
        return [...sameLanguageGenre, ...sameLanguage, ...sameGenre].slice(0, 20);
    };

    const analyzeStreamUrl = url => {
        if (!url) return { type: 'unknown', isValid: false };
        const urlLower = url.toLowerCase();

        // YouTube detection
        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
            if (urlLower.includes('live')) return { type: 'youtube-live', isValid: true };
            if (urlLower.includes('watch?v')) return { type: 'youtube-video', isValid: true };
            if (urlLower.includes('playlist') || urlLower.includes('list')) return { type: 'youtube-playlist', isValid: true };
            if (urlLower.includes('c/') || urlLower.includes('channel')) return { type: 'youtube-channel', isValid: true };
            return { type: 'youtube-video', isValid: true };
        }

        // HLS streams
        if (urlLower.includes('.m3u8') || urlLower.includes('m3u') || urlLower.includes('chunklist') || urlLower.includes('hls')) {
            return { type: 'hls', isValid: true };
        }

        // Direct video files
        if (urlLower.includes('.mp4') || urlLower.match(/\.mp4|m4v|mov/)) return { type: 'mp4', isValid: true };
        if (urlLower.includes('.mkv')) return { type: 'mkv', isValid: true };

        // Other streams
        if (url.match('.m3u8') || url.match('live') || urlLower.includes('rtmp')) {
            return { type: 'iptv', isValid: true };
        }

        if (url.startsWith('http') || url.startsWith('https')) {
            return { type: 'stream', isValid: true };
        }

        return { type: 'unknown', isValid: false };
    };

    const extractVideoId = url => {
        if (!url) return null;
        const shortRegex = /youtu\.be\/([a-zA-Z0-9-_]{11})/;
        const shortMatch = url.match(shortRegex);
        if (shortMatch) return shortMatch[1];

        const watchRegex = /youtube\.com\/watch\?v=([a-zA-Z0-9-_]{11})/;
        const watchMatch = url.match(watchRegex);
        if (watchMatch) return watchMatch[1];

        const liveRegex = /youtube\.com\/live\/([a-zA-Z0-9-_]{11})/;
        const liveMatch = url.match(liveRegex);
        if (liveMatch) return liveMatch[1];

        const embedRegex = /youtube\.com\/embed\/([a-zA-Z0-9-_]{11})/;
        const embedMatch = url.match(embedRegex);
        if (embedMatch) return embedMatch[1];

        return null;
    };

    const getCurrentStreamUrl = (channel, useProxy) => {
        if (!channel) return null;
        const type = analyzeStreamUrl(channel.url);
        if (type.type.startsWith('youtube')) {
            return { uri: channel.url };
        }
        const baseUrl = useProxy ? channel.proxyUrl : channel.url;
        return {
            uri: baseUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': channel.url.split('/').slice(0, 3).join('/'),
                'Origin': channel.url.split('/').slice(0, 3).join('/'),
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Accept-Encoding': 'identity',
                'Connection': 'keep-alive',
            },
        };
    };

    const loadStream = async (channel, useProxy) => {
        setVideoLoading(true);
        setVideoError(false);
        setErrorMessage('');

        const newUrl = getCurrentStreamUrl(channel, useProxy);
        const newUrlString = JSON.stringify(newUrl);

        if (newUrlString !== currentStreamUrl) {
            setCurrentStreamUrl(newUrlString);
        }

        if (videoRef.current) {
            try {
                await videoRef.current.unloadAsync();
                await videoRef.current.loadAsync(newUrl, { shouldPlay: true });
            } catch (error) {
                setVideoError(true);
                setVideoLoading(false);
                if (useProxy && channel.proxyUrl) {
                    // Fallback to direct connection
                    loadStream(channel, false);
                } else {
                    setErrorMessage('No stream available');
                }
            }
        }
    };

    useEffect(() => {
        if (selectedChannel && showPlayer) {
            // Always start with proxy
            loadStream(selectedChannel, true);
        }
    }, [selectedChannel, showPlayer]);

    // YouTube Player Components (same as original)
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
        });

        useYouTubeEvent(player, 'error', error => {
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Error: ${error.message}. Unable to play video`);
        });

        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                <YoutubeView player={player} style={{ width: '100%', height: 260 }} />
            </View>
        );
    };

    const renderStreamTypeBadge = type => {
        const badges = {
            'youtube-video': { icon: 'play-circle', color: 'bg-gray-600', text: 'Stream' },
            'youtube-live': { icon: 'play-circle', color: 'bg-gray-600', text: 'Stream' },
            'youtube-playlist': { icon: 'list', color: 'bg-purple-600', text: 'Playlist' },
            'hls': { icon: 'videocam', color: 'bg-blue-600', text: 'HLS Stream' },
            'mp4': { icon: 'film', color: 'bg-green-600', text: 'MP4' },
            'iptv': { icon: 'tv', color: 'bg-indigo-600', text: 'IPTV' },
            'rtmp': { icon: 'cloud-upload', color: 'bg-pink-600', text: 'RTMP' },
            'stream': { icon: 'play-circle', color: 'bg-gray-600', text: 'Stream' },
        };

        const badge = badges[type] || { icon: 'help-circle', color: 'bg-gray-600', text: 'Unknown' };
        return (
            <View className={`absolute top-3 right-3 z-10 ${badge.color} px-3 py-1.5 rounded-full flex-row items-center`}>
                <Ionicons name={badge.icon} size={14} color="white" />
                <Text className="text-white text-xs font-bold ml-1.5">{badge.text}</Text>
            </View>
        );
    };

    const renderVideoPlayer = () => {
        if (!selectedChannel) return null;

        const type = analyzeStreamUrl(selectedChannel.url);
        if (!type.isValid) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid stream URL</Text>
                    <Text className="text-gray-400 text-center mt-2 px-4 text-sm">
                        The provided URL format is not supported
                    </Text>
                </View>
            );
        }

        // Simplified - handle main stream types
        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                {/* Watermark on video player */}
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        pointerEvents: 'none',
                        zIndex: 5,
                    }}
                >
                    <Text
                        style={{
                            color: 'rgba(255, 255, 255, 0.12)',
                            fontSize: 22,
                            fontWeight: 'bold',
                            transform: [{ rotate: '-45deg' }],
                            textShadowColor: 'rgba(0, 0, 0, 0.4)',
                            textShadowOffset: { width: 1, height: 1 },
                            textShadowRadius: 3,
                        }}
                    >
                        Online IPTV Hub
                    </Text>
                </View>
                {renderStreamTypeBadge(type.type)}

                {videoLoading && (
                    <View className="absolute inset-0 bg-black items-center justify-center z-20">
                        <ActivityIndicator size="large" color="#f97316" />
                        <Text className="text-white mt-3 text-sm">
                            Loading {type.type.toUpperCase()} stream...
                        </Text>
                        <Text className="text-gray-400 mt-1 text-xs">Using Proxy Connection</Text>
                    </View>
                )}

                {videoError && (
                    <View className="absolute inset-0 bg-black items-center justify-center z-30">
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">Stream Error</Text>
                        <Text className="text-gray-400 text-center mt-2 px-4 text-sm">
                            {errorMessage || 'Unable to load the stream'}
                        </Text>
                        <TouchableOpacity
                            className="mt-4 bg-orange-500 px-6 py-3 rounded-lg"
                            onPress={() => {
                                setVideoError(false);
                                loadStream(selectedChannel, true);
                            }}
                        >
                            <Text className="text-white font-semibold">Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Video
                    key={currentStreamUrl}
                    ref={videoRef}
                    source={getCurrentStreamUrl(selectedChannel, true)}
                    rate={1.0}
                    volume={1.0}
                    isMuted={false}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay
                    isLooping={false}
                    useNativeControls
                    style={{ width: '100%', height: 260 }}
                    onLoad={() => {
                        setVideoLoading(false);
                        setVideoError(false);
                    }}
                    onError={error => {
                        setVideoError(true);
                        setVideoLoading(false);
                        let msg = 'Failed to load stream.';
                        if (error?.error?.code === -1100) {
                            msg = 'Network error. Check your connection.';
                        } else if (error?.error?.domain === 'AVFoundationErrorDomain') {
                            msg = 'Stream format not supported or unavailable.';
                        }
                        setErrorMessage(msg);
                        // Fallback to direct
                        loadStream(selectedChannel, false);
                    }}
                    onLoadStart={() => {
                        setVideoLoading(true);
                        setVideoError(false);
                    }}
                    onFullscreenUpdate={async ({ fullscreenUpdate }) => {
                        if (fullscreenUpdate === 0) {
                            await ScreenOrientation.unlockAsync();
                        } else if (fullscreenUpdate === 1) {
                            setIsFullScreen(true);
                            await ScreenOrientation.lockAsync(
                                ScreenOrientation.OrientationLock.LANDSCAPE
                            );
                        } else if (fullscreenUpdate === 3) {
                            setIsFullScreen(false);
                            await ScreenOrientation.lockAsync(
                                ScreenOrientation.OrientationLock.PORTRAIT
                            );
                        }
                    }}
                />
            </View>
        );
    };

    const handleChannelPress = channel => {
        setSelectedChannel(channel);
        setShowPlayer(true);
        setVideoError(false);
        setVideoLoading(true);
        const type = analyzeStreamUrl(channel.url);
        loadStream(channel, !type.type.startsWith('youtube'));
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout },
            ]
        );
    };

    const renderChannelCard = ({ item }) => (
        <TouchableOpacity
            className="mr-3"
            style={{ width: 140 }}
            onPress={() => handleChannelPress(item)}
            activeOpacity={0.7}
        >
            <View className="relative">
                <Image
                    source={{ uri: item.imageUrl }}
                    className="w-full h-52 rounded-xl bg-gray-800"
                    resizeMode="cover"
                />
                <View className="absolute inset-0 items-center justify-center">
                    <View className="bg-black/50 rounded-full p-3">
                        <Ionicons name="play" size={32} color="white" />
                    </View>
                </View>
                {item.lcn && (
                    <View className="absolute bottom-2 left-2 bg-orange-500/90 px-2 py-1 rounded-lg">
                        <View className="flex-row items-center">
                            <Ionicons name="tv" size={12} color="white" />
                            <Text className="text-white text-xs font-bold ml-1">LCN {item.lcn}</Text>
                        </View>
                    </View>
                )}
            </View>
            <Text className="text-white font-semibold mt-2 text-sm" numberOfLines={2}>
                {item.name}
            </Text>
            <View className="flex-row items-center mt-1">
                <Ionicons name="language" size={12} color="#9ca3af" />
                <Text className="text-gray-400 text-xs ml-1">
                    {item.language?.name || 'Unknown'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderCategorySection = ({ item: section }) => (
        <View className="mb-6">
            <View className="flex-row items-center justify-between px-4 mb-3">
                <View className="flex-row items-center">
                    <Text className="text-white text-xl font-bold">{section.title}</Text>
                    <View className="h-1 w-12 bg-orange-500 mt-1 rounded-full ml-2" />
                </View>
                <View className="bg-gray-800 px-3 py-1.5 rounded-full">
                    <Text className="text-gray-300 text-xs font-semibold">
                        {section.data.length} channels
                    </Text>
                </View>
            </View>
            <FlatList
                data={section.data}
                renderItem={renderChannelCard}
                keyExtractor={item => item.id ? String(item.id) : String(item.lcn)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
            />
        </View>
    );

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

    const userPackage = getUserPackage();
    const daysRemaining = getDaysRemaining();

    return (
        <SafeAreaView className="flex-1 bg-black">
            <StatusBar barStyle="light-content" />

            {/* Watermark Overlay */}
            <WatermarkOverlay />

            {/* Header + Search */}
            <View className="px-4 py-3 bg-gray-900 border-b border-gray-800">
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                        <Text className="text-white text-2xl font-bold">Live Channels</Text>
                        <View className="ml-3 bg-orange-500 px-2 py-1 rounded-full">
                            <Text className="text-white text-xs font-bold">
                                {channels?.length || 0}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={() => setShowUserInfo(true)} className="mr-3">
                            <Ionicons name="person-circle" size={28} color="#f97316" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={refreshChannels} disabled={refreshing}>
                            <Ionicons
                                name="refresh"
                                size={24}
                                color={refreshing ? '#9ca3af' : '#f97316'}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="bg-gray-800 rounded-lg px-4 py-3 flex-row items-center">
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        placeholder="Search channels..."
                        placeholderTextColor="#9ca3af"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="flex-1 ml-2 text-white"
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Grouped Channels List */}
            <FlatList
                data={filteredSections}
                renderItem={renderCategorySection}
                keyExtractor={item => item.title}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Ionicons name="tv-outline" size={64} color="#4b5563" />
                        <Text className="text-gray-400 mt-4 text-base">No channels found</Text>
                    </View>
                }
            />

            {/* Player Modal */}
            <Modal visible={showPlayer} animationType="slide" onRequestClose={() => {
                setShowPlayer(false);
                setSelectedChannel(null);
            }}>
                <SafeAreaView className="flex-1 bg-black">
                    <StatusBar barStyle="light-content" />
                    <View className="flex-row items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
                        <TouchableOpacity
                            onPress={() => {
                                setShowPlayer(false);
                                setSelectedChannel(null);
                            }}
                        >
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <View className="flex-1 mx-4">
                            <Text className="text-white font-bold text-lg" numberOfLines={1}>
                                {selectedChannel?.name}
                            </Text>
                            <Text className="text-gray-400 text-sm">
                                LCN {selectedChannel?.lcn} • {selectedChannel?.language?.name}
                            </Text>
                        </View>
                    </View>

                    {renderVideoPlayer()}

                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    >
                        <View className="p-4 bg-gray-900">
                            <View className="flex-row items-center mb-3">
                                <View className="flex-1">
                                    <Text className="text-white text-xl font-bold mb-1">
                                        {selectedChannel?.name}
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row items-center flex-wrap mb-4">
                                <View className="bg-orange-500 px-3 py-1.5 rounded-full mr-2 mb-2">
                                    <Text className="text-white text-xs font-semibold">
                                        LCN {selectedChannel?.lcn}
                                    </Text>
                                </View>
                                <Text className="text-gray-400 text-sm">
                                    {selectedChannel?.language?.name}
                                </Text>
                                <Text className="text-gray-600 mx-2">•</Text>
                                <Text className="text-gray-400 text-sm">
                                    {selectedChannel?.genre?.name}
                                </Text>
                            </View>

                            {selectedChannel?.packageNames?.length > 0 && (
                                <View className="mt-3">
                                    <Text className="text-gray-400 text-sm mb-2">Available in</Text>
                                    <View className="flex-row flex-wrap">
                                        {selectedChannel.packageNames.map(pkg => (
                                            <View key={pkg} className="bg-gray-800 px-3 py-1.5 rounded-full mr-2 mb-2">
                                                <Text className="text-white text-xs">{pkg}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* More Like This - Improved Recommendations */}
                            {getRecommendedChannels().length > 0 && (
                                <View className="mt-6 mb-8">
                                    <View className="flex-row items-center justify-between mb-4">
                                        <View className="flex-row items-center">
                                            <Ionicons name="list" size={22} color="#f97316" />
                                            <Text className="text-white text-lg font-bold ml-2">
                                                More Like This
                                            </Text>
                                        </View>
                                        <View className="bg-orange-500/20 px-3 py-1.5 rounded-full">
                                            <Text className="text-orange-500 text-xs font-bold">
                                                {getRecommendedChannels().length} channels
                                            </Text>
                                        </View>
                                    </View>

                                    <Text className="text-gray-400 text-sm mb-3">
                                        {selectedChannel?.language?.name} • {selectedChannel?.genre?.name}
                                    </Text>

                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ paddingRight: 16 }}
                                    >
                                        {getRecommendedChannels().map(channel => (
                                            <TouchableOpacity
                                                key={channel.id}
                                                className="mr-3"
                                                style={{ width: 140 }}
                                                onPress={() => {
                                                    setSelectedChannel(channel);
                                                    setVideoError(false);
                                                    setVideoLoading(true);
                                                    const type = analyzeStreamUrl(channel.url);
                                                    loadStream(channel, !type.type.startsWith('youtube'));
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View className="relative">
                                                    <Image
                                                        source={{ uri: channel.imageUrl }}
                                                        className="w-full h-52 rounded-xl bg-gray-800"
                                                        resizeMode="cover"
                                                    />
                                                    <View className="absolute inset-0 items-center justify-center">
                                                        <View className="bg-black/50 rounded-full p-3">
                                                            <Ionicons name="play" size={32} color="white" />
                                                        </View>
                                                    </View>
                                                    {channel.lcn && (
                                                        <View className="absolute bottom-2 left-2 bg-orange-500/90 px-2 py-1 rounded-lg">
                                                            <View className="flex-row items-center">
                                                                <Ionicons name="tv" size={12} color="white" />
                                                                <Text className="text-white text-xs font-bold ml-1">LCN {channel.lcn}</Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                    {channel.language?.name === selectedChannel?.language?.name &&
                                                        channel.genre?.name === selectedChannel?.genre?.name && (
                                                            <View className="absolute top-2 right-2 bg-green-500/90 px-2 py-1 rounded-lg">
                                                                <Text className="text-white text-xs font-bold">Match</Text>
                                                            </View>
                                                        )}
                                                </View>
                                                <Text className="text-white font-semibold mt-2 text-sm" numberOfLines={2}>
                                                    {channel.name}
                                                </Text>
                                                <View className="flex-row items-center mt-1 flex-wrap">
                                                    <View className="bg-orange-500/20 px-2 py-0.5 rounded mr-1 mb-1">
                                                        <Text className="text-orange-500 text-xs font-semibold">
                                                            {channel.genre?.name}
                                                        </Text>
                                                    </View>
                                                    <View className="flex-row items-center">
                                                        <Ionicons name="language" size={10} color="#9ca3af" />
                                                        <Text className="text-gray-400 text-xs ml-1">
                                                            {channel.language?.name}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* User Info Modal - Same as original */}
            <Modal visible={showUserInfo} animationType="slide" transparent={false} onRequestClose={() => setShowUserInfo(false)}>
                {/* User info modal content - same as your original */}
                <View className="flex-1 bg-black/70 justify-end">
                    <View className="bg-gray-900 rounded-t-3xl">
                        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-800">
                            <Text className="text-white text-xl font-bold">Account Info</Text>
                            <TouchableOpacity onPress={() => setShowUserInfo(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView className="px-6 py-4" style={{ maxHeight: 500 }}>
                            <View className="bg-gray-800 rounded-xl p-4 mb-4">
                                <View className="flex-row items-center mb-4">
                                    <View className="w-16 h-16 bg-orange-500 rounded-full items-center justify-center mr-4">
                                        <Ionicons name="person" size={32} color="white" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white text-lg font-bold">{user.name}</Text>
                                        <Text className="text-gray-400 text-xs mt-1">
                                            {user.subscriberName} Subscriber
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View className="border-t border-gray-700 pt-3 space-y-2">
                                <View className="flex-row justify-between py-2">
                                    <Text className="text-gray-400">Package</Text>
                                    <Text className="text-white font-semibold">
                                        {user.packageName || 'Multi-Package'}
                                    </Text>
                                </View>
                                <View className="flex-row justify-between py-2">
                                    <Text className="text-gray-400">Expiry Date</Text>
                                    <Text className="text-white font-semibold">
                                        {formatDate(user.expiryDate)}
                                    </Text>
                                </View>
                                {daysRemaining !== null && (
                                    <View className="flex-row justify-between py-2">
                                        <Text className="text-gray-400">Days Remaining</Text>
                                        <Text
                                            className={`font-bold ${daysRemaining <= 7 ? 'text-red-500' : 'text-green-500'
                                                }`}
                                        >
                                            {daysRemaining}
                                        </Text>
                                    </View>
                                )}
                                <View className="flex-row justify-between py-2">
                                    <Text className="text-gray-400">Total Channels</Text>
                                    <Text className="text-white font-semibold">{channels.length}</Text>
                                </View>
                                <View className="flex-row justify-between py-2">
                                    <Text className="text-gray-400">Active Packages</Text>
                                    <Text className="text-white font-semibold">{user.totalPackages}</Text>
                                </View>
                            </View>

                            <View className="bg-gray-800 rounded-xl p-4 mb-4">
                                <View className="flex-row items-center mb-3 pb-3 border-b border-gray-700">
                                    <View className="bg-blue-500/20 p-2 rounded-full mr-3">
                                        <Ionicons name="phone-portrait" size={20} color="#3b82f6" />
                                    </View>
                                    <Text className="text-white text-base font-semibold">
                                        Device Information
                                    </Text>
                                </View>
                                <View className="flex-row justify-between items-center py-2 border-b border-gray-700">
                                    <Text className="text-gray-400 text-sm">MAC Address</Text>
                                    <Text className="text-white text-xs font-mono font-semibold">
                                        {user.macAddress || 'NA'}
                                    </Text>
                                </View>
                                <View className="flex-row justify-between items-center py-2 border-b border-gray-700">
                                    <Text className="text-gray-400 text-sm">Device Name</Text>
                                    <Text className="text-white text-sm font-semibold" numberOfLines={1}>
                                        {user.deviceName}
                                    </Text>
                                </View>
                                <View className="flex-row justify-between items-center py-2 border-b border-gray-700">
                                    <Text className="text-gray-400 text-sm">Model</Text>
                                    <Text className="text-white text-sm font-semibold" numberOfLines={1}>
                                        {user.modelName}
                                    </Text>
                                </View>
                                <View className="flex-row justify-between items-center py-2 border-b border-gray-700">
                                    <Text className="text-gray-400 text-sm">Operating System</Text>
                                    <Text className="text-white text-sm font-semibold">
                                        {user.osName} {user.osVersion}
                                    </Text>
                                </View>
                                <View className="flex-row justify-between items-center py-2 border-t border-gray-700">
                                    <Text className="text-gray-400 text-sm">Device Type</Text>
                                    <Text className="text-white text-sm font-semibold">
                                        {user.deviceType}
                                    </Text>
                                </View>
                            </View>

                            {packagesList && packagesList.length > 0 && (
                                <View>
                                    <Text className="text-white text-lg font-bold mb-3">Your Packages</Text>
                                    {packagesList.map((pkg) => (
                                        <View
                                            key={pkg.id || pkg.name}
                                            className="bg-gray-800 rounded-xl p-4 mb-2"
                                        >
                                            <Text className="text-white font-semibold text-base">{pkg.name}</Text>
                                            <View className="flex-row items-center mt-2">
                                                <Ionicons name="tv" size={16} color="#9ca3af" />
                                                <Text className="text-gray-400 text-sm ml-2">
                                                    {pkg.channelCount} channels
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <TouchableOpacity
                                className="bg-red-600 py-4 rounded-xl items-center mb-4"
                                onPress={handleLogout}
                            >
                                <View className="flex-row items-center">
                                    <Ionicons name="log-out" size={20} color="white" />
                                    <Text className="text-white font-bold text-base ml-2">Logout</Text>
                                </View>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>


        </SafeAreaView>
    );
}