import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StatusBar, Linking, ActivityIndicator, Alert, AppState, FlatList, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/authContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Video, ResizeMode } from 'expo-av';
import { YoutubeView, useYouTubePlayer, useYouTubeEvent } from 'react-native-youtube-bridge';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function ChannelsScreen() {
    const { channels, user, packagesList, serverInfo, logout, refreshChannels, refreshing } = useAuth();

    const [selectedChannel, setSelectedChannel] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [showUserInfo, setShowUserInfo] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isFullScreen, setIsFullScreen] = useState(false);

    const [useProxy, setUseProxy] = useState(true);
    const [proxyAttempted, setProxyAttempted] = useState(false);
    const [currentStreamUrl, setCurrentStreamUrl] = useState('');

    const videoRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                refreshChannels();
            }
        });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        const handleOrientation = async () => {
            if (!showPlayer) {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
            }
        };
        handleOrientation();
    }, [showPlayer]);

    const getUserPackage = () => {
        if (!user?.package || !packagesList) return null;
        return packagesList.find(pkg => pkg._id === user.package);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getDaysRemaining = () => {
        if (!user?.expiryDate) return null;
        const endDate = new Date(user.expiryDate);
        const today = new Date();
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const sortedChannels = useMemo(() => {
        if (!channels || channels.length === 0) return [];
        return [...channels].sort((a, b) => (a.lcn || 999999) - (b.lcn || 999999));
    }, [channels]);

    const getRecommendedChannels = () => {
        if (!selectedChannel) return [];
        return channels
            .filter(ch => ch.language?.name === selectedChannel.language?.name && ch._id !== selectedChannel._id)
            .slice(0, 15);
    };

    const analyzeStreamUrl = (url) => {
        if (!url) return { type: 'unknown', isValid: false };
        const urlLower = url.toLowerCase();

        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
            if (urlLower.includes('live')) return { type: 'youtube-live', isValid: true };
            if (urlLower.includes('watch?v=')) return { type: 'youtube-video', isValid: true };
            if (urlLower.includes('playlist') || urlLower.includes('list=')) return { type: 'youtube-playlist', isValid: true };
            if (urlLower.includes('/c/') || urlLower.includes('/@')) return { type: 'youtube-channel', isValid: true };
            return { type: 'youtube-video', isValid: true };
        }

        if (urlLower.includes('.m3u8') || urlLower.includes('m3u')) return { type: 'hls', isValid: true };
        if (urlLower.includes('chunklist')) return { type: 'hls', isValid: true };
        if (urlLower.includes('/hls/')) return { type: 'hls', isValid: true };
        if (urlLower.includes('.mp4')) return { type: 'mp4', isValid: true };
        if (urlLower.match(/\.(mp4|m4v|mov)\?/)) return { type: 'mp4', isValid: true };
        if (urlLower.includes('.mkv')) return { type: 'mkv', isValid: true };
        if (url.match(/:\d{4}/)) return { type: 'iptv', isValid: true };
        if (url.match(/\/live\//)) return { type: 'iptv', isValid: true };
        if (urlLower.includes('rtmp://')) return { type: 'rtmp', isValid: true };
        if (url.startsWith('http://') || url.startsWith('https://')) return { type: 'stream', isValid: true };

        return { type: 'unknown', isValid: false };
    };

    const extractVideoId = (url) => {
        if (!url) return null;
        const shortRegex = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
        const shortMatch = url.match(shortRegex);
        if (shortMatch) return shortMatch[1];

        const watchRegex = /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/;
        const watchMatch = url.match(watchRegex);
        if (watchMatch) return watchMatch[1];

        const liveRegex = /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/;
        const liveMatch = url.match(liveRegex);
        if (liveMatch) return liveMatch[1];

        const embedRegex = /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/;
        const embedMatch = url.match(embedRegex);
        if (embedMatch) return embedMatch[1];

        return null;
    };

    const extractPlaylistId = (url) => {
        if (!url) return null;
        const playlistRegex = /[?&]list=([a-zA-Z0-9_-]+)/;
        const match = url.match(playlistRegex);
        return match ? match[1] : null;
    };

    const getCurrentStreamUrl = () => {
        if (!selectedChannel) return null;

        const { type } = analyzeStreamUrl(selectedChannel.url);

        if (type.startsWith('youtube')) {
            return { uri: selectedChannel.url };
        }

        const baseUrl = useProxy && selectedChannel.proxyUrl && serverInfo?.proxyEnabled
            ? selectedChannel.proxyUrl
            : selectedChannel.url;

        return {
            uri: baseUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': selectedChannel.url.split('/').slice(0, 3).join('/') + '/',
                'Origin': selectedChannel.url.split('/').slice(0, 3).join('/'),
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Accept-Encoding': 'identity',
                'Connection': 'keep-alive'
            }
        };
    };

    useEffect(() => {
        if (selectedChannel && showPlayer) {
            const newUrl = getCurrentStreamUrl();
            const newUrlString = JSON.stringify(newUrl);

            if (newUrlString !== currentStreamUrl && currentStreamUrl !== '') {
                setCurrentStreamUrl(newUrlString);
                setVideoLoading(true);
                setVideoError(false);

                if (videoRef.current) {
                    videoRef.current.unloadAsync().then(() => {
                        videoRef.current?.loadAsync(newUrl, { shouldPlay: true });
                    });
                }
            } else if (currentStreamUrl === '') {
                setCurrentStreamUrl(newUrlString);
            }
        }
    }, [useProxy, selectedChannel]);

    const YouTubeVideoPlayer = ({ videoId }) => {
        const player = useYouTubePlayer(videoId, {
            autoplay: true,
            muted: false,
            controls: true,
            playsinline: true,
            rel: false,
            modestbranding: true
        });

        useYouTubeEvent(player, 'ready', () => {
            setVideoLoading(false);
            setVideoError(false);
        });

        useYouTubeEvent(player, 'error', (error) => {
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Error: ${error.message || 'Unable to play video'}`);
        });

        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                <YoutubeView player={player} style={{ width: '100%', height: 260 }} />
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
            modestbranding: true
        });

        useYouTubeEvent(player, 'ready', () => {
            setVideoLoading(false);
            setVideoError(false);
        });

        useYouTubeEvent(player, 'error', (error) => {
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Live Error: ${error.message || 'Unable to play live stream'}`);
        });

        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                <View className="absolute top-3 left-3 z-10 bg-red-600 px-3 py-1.5 rounded-full flex-row items-center">
                    <View className="w-2 h-2 bg-white rounded-full mr-2" />
                    <Text className="text-white text-xs font-bold">LIVE</Text>
                </View>
                <YoutubeView player={player} style={{ width: '100%', height: 260 }} />
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
            listType: 'playlist'
        });

        useYouTubeEvent(player, 'ready', () => {
            setVideoLoading(false);
            setVideoError(false);
        });

        useYouTubeEvent(player, 'error', (error) => {
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Playlist Error: ${error.message || 'Unable to load playlist'}`);
        });

        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                <YoutubeView player={player} style={{ width: '100%', height: 260 }} />
                <View className="absolute top-3 left-3 z-10 bg-purple-600 px-3 py-1.5 rounded-lg">
                    <Text className="text-white text-xs font-bold">PLAYLIST</Text>
                </View>
            </View>
        );
    };

    const YouTubeChannelPlayer = ({ url }) => (
        <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
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

    const renderStreamTypeBadge = (type) => {
        const badges = {
            'youtube-video': { icon: 'play-circle', color: 'bg-gray-600', text: 'Stream' },
            'youtube-live': { icon: 'play-circle', color: 'bg-gray-600', text: 'Stream' },
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
        const { type, isValid } = analyzeStreamUrl(selectedChannel.url);

        if (!isValid) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid stream URL</Text>
                    <Text className="text-gray-400 text-center mt-2 px-4 text-sm">
                        {errorMessage || 'The provided URL format is not supported'}
                    </Text>
                </View>
            );
        }

        if (type === 'youtube-video') {
            const videoId = extractVideoId(selectedChannel.url);
            if (!videoId) {
                return (
                    <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid YouTube URL</Text>
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

        if (type === 'youtube-live') {
            const videoId = extractVideoId(selectedChannel.url);
            if (!videoId) {
                return (
                    <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid YouTube Live URL</Text>
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

        if (type === 'youtube-playlist') {
            const videoId = extractVideoId(selectedChannel.url);
            const playlistId = extractPlaylistId(selectedChannel.url);

            if (!videoId || !playlistId) {
                return (
                    <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid YouTube Playlist URL</Text>
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

        if (type === 'youtube-channel') {
            return (
                <>
                    {renderStreamTypeBadge(type)}
                    <YouTubeChannelPlayer url={selectedChannel.url} />
                </>
            );
        }

        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
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
                        <Text className="text-white text-center mt-4 text-lg font-semibold">
                            Stream Error
                        </Text>
                        <Text className="text-gray-400 text-center mt-2 px-4 text-sm">
                            {errorMessage || 'Unable to load the stream'}
                        </Text>

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
                    </View>
                )}

                <Video
                    key={currentStreamUrl}
                    ref={videoRef}
                    source={currentUrl}
                    rate={1.0}
                    volume={1.0}
                    isMuted={false}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={true}
                    isLooping={false}
                    useNativeControls
                    style={{ width: '100%', height: 260 }}
                    onLoad={() => {
                        setVideoLoading(false);
                        setVideoError(false);
                    }}
                    onError={(error) => {
                        setVideoError(true);
                        setVideoLoading(false);

                        let msg = 'Failed to load stream.';
                        if (error?.error?.code === -1100) {
                            msg = 'Network error. Check your connection.';
                        } else if (error?.error?.domain === 'AVFoundationErrorDomain') {
                            msg = 'Stream format not supported or unavailable.';
                        }
                        setErrorMessage(msg);
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
                            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                        } else if (fullscreenUpdate === 3) {
                            setIsFullScreen(false);
                            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
                        }
                    }}
                />
            </View>
        );
    };

    const handleChannelPress = (channel) => {
        setSelectedChannel(channel);
        setShowPlayer(true);
        setVideoError(false);
        setVideoLoading(true);

        const { type } = analyzeStreamUrl(channel.url);
        setUseProxy(!type.startsWith('youtube'));
        setProxyAttempted(false);
        setCurrentStreamUrl('');
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout }
            ]
        );
    };

    const filteredChannels = useMemo(() => {
        if (!searchQuery.trim()) return sortedChannels;

        const lowerQuery = searchQuery.toLowerCase();
        return sortedChannels.filter(channel =>
            channel.name.toLowerCase().includes(lowerQuery) ||
            channel.language?.name.toLowerCase().includes(lowerQuery) ||
            channel.lcn?.toString().includes(lowerQuery)
        );
    }, [sortedChannels, searchQuery]);

    const renderChannelItem = ({ item }) => {
        return (
            <TouchableOpacity
                className="bg-gray-800 rounded-lg mb-3 overflow-hidden active:bg-gray-700"
                onPress={() => handleChannelPress(item)}
            >
                {/* Thumbnail Section */}
                <View className="relative" style={{ height: 120 }}>
                    {item.imageUrl ? (
                        <Image
                            source={{ uri: item.imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-full h-full bg-gradient-to-br from-orange-600 to-orange-800 items-center justify-center">
                            <Ionicons name="tv" size={40} color="white" opacity={0.5} />
                        </View>
                    )}

                    {/* LCN Badge Overlay */}
                    <View className="absolute top-2 left-2 bg-black/80 px-2.5 py-1 rounded-md">
                        <Text className="text-white font-bold text-sm">{item.lcn || '?'}</Text>
                    </View>
                </View>

                {/* Channel Info Section */}
                <View className="p-3">
                    <Text className="text-white font-semibold text-base" numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text className="text-gray-400 text-sm mt-1">
                        {item.language?.name || 'Unknown'} • {item.genre?.name || 'General'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

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
                    <TouchableOpacity className="mt-6 bg-orange-500 px-6 py-3 rounded-lg" onPress={refreshChannels}>
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

            <View className="px-4 py-3 bg-gray-900 border-b border-gray-800">
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                        <Text className="text-white text-2xl font-bold">Live Channels</Text>
                        <View className="ml-3 bg-orange-500 px-2 py-1 rounded-full">
                            <Text className="text-white text-xs font-bold">{channels?.length || 0}</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={() => setShowUserInfo(true)} className="mr-3">
                            <Ionicons name="person-circle" size={28} color="#f97316" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={refreshChannels} disabled={refreshing}>
                            <Ionicons name="refresh" size={24} color={refreshing ? '#9ca3af' : '#f97316'} />
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
                    {searchQuery !== '' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={filteredChannels}
                keyExtractor={(item) => item._id}
                renderItem={renderChannelItem}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={refreshChannels}
            />

            {/* Video Player Modal */}
            <Modal
                visible={showPlayer}
                animationType="slide"
                onRequestClose={() => {
                    setShowPlayer(false);
                    setSelectedChannel(null);
                }}
            >
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
                                {selectedChannel?.name || 'Channel'}
                            </Text>
                            <Text className="text-gray-400 text-sm">
                                LCN {selectedChannel?.lcn} • {selectedChannel?.language?.name}
                            </Text>
                        </View>

                        {selectedChannel && !analyzeStreamUrl(selectedChannel.url).type.startsWith('youtube') && serverInfo?.proxyEnabled && (
                            <View className="flex-row items-center bg-gray-800 px-3 py-2 rounded-lg">
                                <Ionicons
                                    name={useProxy ? "shield-checkmark" : "shield-outline"}
                                    size={16}
                                    color={useProxy ? "#f97316" : "#9ca3af"}
                                />
                                <Text className={`text-xs ml-1.5 mr-2 font-semibold ${useProxy ? 'text-orange-500' : 'text-gray-400'}`}>
                                    Proxy
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setUseProxy(!useProxy);
                                        setVideoError(false);
                                        setVideoLoading(true);
                                        setProxyAttempted(false);
                                    }}
                                    className={`w-10 h-5 rounded-full justify-center ${useProxy ? 'bg-orange-500' : 'bg-gray-600'}`}
                                    style={{ padding: 2 }}
                                >
                                    <View className={`w-4 h-4 rounded-full bg-white ${useProxy ? 'self-end' : 'self-start'}`} />
                                </TouchableOpacity>
                            </View>
                        )}

                    </View>

                    {renderVideoPlayer()}

                    <ScrollView className="flex-1">
                        <View className="p-4 bg-gray-900">
                            <View className="flex-row items-center mb-3">
                                <View className="flex-1">
                                    <Text className="text-white text-xl font-bold mb-1">
                                        {selectedChannel?.name}
                                    </Text>
                                    <View className="flex-row items-center">
                                        <View className="bg-orange-500/20 px-2 py-1 rounded mr-2">
                                            <Text className="text-orange-500 text-xs font-semibold">
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
                                </View>
                            </View>

                            {selectedChannel?.packageNames && selectedChannel.packageNames.length > 0 && (
                                <View className="mt-3">
                                    <Text className="text-gray-400 text-sm mb-2">Available in:</Text>
                                    <View className="flex-row flex-wrap">
                                        {selectedChannel.packageNames.map((pkg, index) => (
                                            <View key={index} className="bg-gray-800 px-3 py-1.5 rounded-full mr-2 mb-2">
                                                <Text className="text-white text-xs">{pkg}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* VERTICAL Suggested Channels Section */}
                        {getRecommendedChannels().length > 0 && (
                            <View className="p-4 bg-black">
                                <Text className="text-white text-lg font-bold mb-3">
                                    More {selectedChannel?.language?.name} Channels
                                </Text>

                                {/* Changed from horizontal to vertical scroll */}
                                {getRecommendedChannels().map((channel) => (
                                    <TouchableOpacity
                                        key={channel._id}
                                        className="flex-row bg-gray-800 rounded-lg mb-3 overflow-hidden active:bg-gray-700"
                                        onPress={() => {
                                            setSelectedChannel(channel);
                                            setVideoError(false);
                                            setVideoLoading(true);
                                            const { type } = analyzeStreamUrl(channel.url);
                                            setUseProxy(!type.startsWith('youtube'));
                                            setCurrentStreamUrl('');
                                        }}
                                    >
                                        {/* Thumbnail */}
                                        <View className="relative" style={{ width: 120, height: 90 }}>
                                            {channel.imageUrl ? (
                                                <Image
                                                    source={{ uri: channel.imageUrl }}
                                                    style={{ width: '100%', height: '100%' }}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View className="w-full h-full bg-gradient-to-br from-orange-600 to-orange-800 items-center justify-center">
                                                    <Ionicons name="tv" size={30} color="white" opacity={0.5} />
                                                </View>
                                            )}

                                            {/* LCN Badge */}
                                            <View className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded">
                                                <Text className="text-white font-bold text-xs">{channel.lcn}</Text>
                                            </View>
                                        </View>

                                        {/* Channel Info */}
                                        <View className="flex-1 p-3 justify-center">
                                            <Text className="text-white font-semibold text-base" numberOfLines={2}>
                                                {channel.name}
                                            </Text>
                                            <Text className="text-gray-400 text-xs mt-1">
                                                {channel.genre?.name} • {channel.language?.name}
                                            </Text>
                                        </View>

                                        {/* Arrow Icon */}
                                        <View className="justify-center pr-3">
                                            <Ionicons name="play-circle" size={24} color="#f97316" />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* User Info Modal - unchanged */}
            <Modal visible={showUserInfo} animationType="slide" transparent onRequestClose={() => setShowUserInfo(false)}>
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
                                        <Text className="text-gray-400 text-xs mt-1">{user.subscriberName || 'Subscriber'}</Text>
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
                                            <Text className={`font-bold ${daysRemaining < 7 ? 'text-red-500' : 'text-green-500'}`}>
                                                {daysRemaining} days
                                            </Text>
                                        </View>
                                    )}

                                    <View className="flex-row justify-between py-2">
                                        <Text className="text-gray-400">Total Channels</Text>
                                        <Text className="text-white font-semibold">{channels.length}</Text>
                                    </View>

                                    {user.totalPackages && (
                                        <View className="flex-row justify-between py-2">
                                            <Text className="text-gray-400">Active Packages</Text>
                                            <Text className="text-white font-semibold">{user.totalPackages}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View className="bg-gray-800 rounded-xl p-4 mb-4">
                                <View className="flex-row items-center mb-3 pb-3 border-b border-gray-700">
                                    <View className="bg-blue-500/20 p-2 rounded-full mr-3">
                                        <Ionicons name="phone-portrait" size={20} color="#3b82f6" />
                                    </View>
                                    <Text className="text-white text-base font-semibold">Device Information</Text>
                                </View>

                                <View className="flex-row justify-between items-center py-2 border-b border-gray-700">
                                    <Text className="text-gray-400 text-sm">MAC Address</Text>
                                    <Text className="text-white text-xs font-mono font-semibold">
                                        {user.macAddress || 'N/A'}
                                    </Text>
                                </View>

                                {user.deviceName && (
                                    <View className="flex-row justify-between items-center py-2 border-b border-gray-700">
                                        <Text className="text-gray-400 text-sm">Device Name</Text>
                                        <Text className="text-white text-sm font-semibold" numberOfLines={1}>
                                            {user.deviceName}
                                        </Text>
                                    </View>
                                )}

                                {user.modelName && (
                                    <View className="flex-row justify-between items-center py-2 border-b border-gray-700">
                                        <Text className="text-gray-400 text-sm">Model</Text>
                                        <Text className="text-white text-sm font-semibold" numberOfLines={1}>
                                            {user.modelName}
                                        </Text>
                                    </View>
                                )}

                                {user.osName && user.osVersion && (
                                    <View className="flex-row justify-between items-center py-2">
                                        <Text className="text-gray-400 text-sm">Operating System</Text>
                                        <Text className="text-white text-sm font-semibold">
                                            {user.osName} {user.osVersion}
                                        </Text>
                                    </View>
                                )}

                                {user.deviceType && (
                                    <View className="flex-row justify-between items-center py-2 border-t border-gray-700">
                                        <Text className="text-gray-400 text-sm">Device Type</Text>
                                        <Text className="text-white text-sm font-semibold">
                                            {user.deviceType}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {packagesList && packagesList.length > 0 && (
                                <View className="mb-4">
                                    <Text className="text-white text-lg font-bold mb-3">Your Packages</Text>
                                    {packagesList.map((pkg, index) => (
                                        <View key={index} className="bg-gray-800 rounded-xl p-4 mb-2">
                                            <Text className="text-white font-semibold text-base">{pkg.name}</Text>
                                            <View className="flex-row items-center mt-2">
                                                <Ionicons name="tv" size={16} color="#9ca3af" />
                                                <Text className="text-gray-400 text-sm ml-2">
                                                    {pkg.channelCount || 0} channels
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
