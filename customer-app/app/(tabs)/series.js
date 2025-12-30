import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    Modal,
    Dimensions,
    RefreshControl,
    FlatList,
    StatusBar,
    Alert,
    Linking,
    TextInput,
    AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/authContext';
import api from '@/services/api';
import { Video, ResizeMode } from 'expo-av';
import { YoutubeView, useYouTubePlayer, useYouTubeEvent } from 'react-native-youtube-bridge';
import * as ScreenOrientation from 'expo-screen-orientation';

const { width } = Dimensions.get('window');

export default function SeriesScreen() {
    const { isAuthenticated, serverInfo } = useAuth();
    const [series, setSeries] = useState([]);
    const [groupedSeries, setGroupedSeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedSeries, setSelectedSeries] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [selectedGenre, setSelectedGenre] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isPlaying, setIsPlaying] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const [useProxy, setUseProxy] = useState(true);
    const [currentStreamUrl, setCurrentStreamUrl] = useState(null);

    const videoRef = useRef(null);

    // AppState listener for refresh on app focus
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active' && isAuthenticated) {
                fetchSeries();
            }
        });
        return () => subscription.remove();
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchSeries();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const handleOrientation = async () => {
            if (!showPlayer) {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
                setIsFullScreen(false);
            }
        };
        handleOrientation();
    }, [showPlayer]);

    const fetchSeries = async () => {
        try {
            setLoading(true);
            const response = await api.get('/customer/series');
            if (response.data.success) {
                setSeries(response.data.data.series);
                const sections = Object.entries(response.data.data.groupedByGenre).map(
                    ([genre, seriesData]) => ({
                        title: genre,
                        data: seriesData
                    })
                );
                setGroupedSeries(sections);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load series. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchSeries();
        setRefreshing(false);
    };

    const genres = useMemo(() => {
        const uniqueGenres = ['all', ...new Set(series.map(s => s.genre?.name).filter(Boolean))];
        return uniqueGenres;
    }, [series]);

    const filteredSections = useMemo(() => {
        let sections = groupedSeries;
        if (selectedGenre !== 'all') {
            sections = groupedSeries.filter(section => section.title === selectedGenre);
        }
        if (searchQuery.trim() !== '') {
            const lowerQuery = searchQuery.toLowerCase();
            sections = sections.map(section => ({
                title: section.title,
                data: section.data.filter(item =>
                    item.title.toLowerCase().includes(lowerQuery) ||
                    item.genre?.name.toLowerCase().includes(lowerQuery) ||
                    item.language?.name.toLowerCase().includes(lowerQuery)
                )
            })).filter(section => section.data.length > 0);
        }
        return sections;
    }, [groupedSeries, selectedGenre, searchQuery]);

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

    const getCurrentStreamUrl = (seriesItem, proxyEnabled) => {
        if (!seriesItem) return null;
        const type = analyzeStreamUrl(seriesItem.mediaUrl);

        if (type.type.startsWith('youtube')) {
            return { uri: seriesItem.mediaUrl };
        }

        const baseUrl = proxyEnabled && seriesItem.proxyUrl ? seriesItem.proxyUrl : seriesItem.mediaUrl;

        return {
            uri: baseUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Referer: seriesItem.mediaUrl.split('/').slice(0, 3).join('/'),
                Origin: seriesItem.mediaUrl.split('/').slice(0, 3).join('/'),
                Accept: '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
                'Accept-Encoding': 'identity',
                Connection: 'keep-alive',
            },
        };
    };

    const loadStream = async (seriesItem, proxyEnabled) => {
        setVideoLoading(true);
        setVideoError(false);
        setErrorMessage('');

        const newUrl = getCurrentStreamUrl(seriesItem, proxyEnabled);
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
                    if (proxyEnabled && seriesItem.proxyUrl) {
                        // Try direct connection as fallback
                        setUseProxy(false);
                        loadStream(seriesItem, false);
                    } else {
                        setErrorMessage('Unable to load stream. Please try again.');
                    }
                }
            }
        }
    };

    useEffect(() => {
        if (selectedSeries && showPlayer) {
            const type = analyzeStreamUrl(selectedSeries.mediaUrl);
            if (!type.type.startsWith('youtube')) {
                loadStream(selectedSeries, useProxy);
            }
        }
    }, [selectedSeries, showPlayer, useProxy]);

    const renderStreamTypeBadge = (type) => {
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
    };

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
                <View className="absolute top-3 left-3 z-10 bg-purple-600 px-3 py-1.5 rounded-lg">
                    <Text className="text-white text-xs font-bold">PLAYLIST</Text>
                </View>
                <YoutubeView player={player} style={{ width: '100%', height: 260 }} />
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

    const renderVideoPlayer = () => {
        if (!selectedSeries) return null;

        const currentUrl = getCurrentStreamUrl(selectedSeries, useProxy);
        const { type, isValid } = analyzeStreamUrl(selectedSeries.mediaUrl);

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
            const videoId = extractVideoId(selectedSeries.mediaUrl);
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
            const videoId = extractVideoId(selectedSeries.mediaUrl);
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
            const videoId = extractVideoId(selectedSeries.mediaUrl);
            const playlistId = extractPlaylistId(selectedSeries.mediaUrl);
            if (!playlistId) {
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
                    <YouTubeChannelPlayer url={selectedSeries.mediaUrl} />
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
                        {useProxy && serverInfo?.proxyEnabled && (
                            <Text className="text-gray-400 mt-1 text-xs">Using Proxy Connection</Text>
                        )}
                    </View>
                )}

                {videoError && (
                    <View className="absolute inset-0 bg-black items-center justify-center z-30">
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">Stream Error</Text>
                        <Text className="text-gray-400 text-center mt-2 px-4 text-sm">{errorMessage || 'Unable to load the stream'}</Text>

                        <TouchableOpacity
                            className="mt-4 bg-orange-500 px-6 py-3 rounded-lg"
                            onPress={() => {
                                setVideoError(false);
                                setVideoLoading(true);
                                loadStream(selectedSeries, useProxy);
                            }}
                        >
                            <Text className="text-white font-semibold">Retry</Text>
                        </TouchableOpacity>

                        {serverInfo?.proxyEnabled && selectedSeries.proxyUrl && (
                            <TouchableOpacity
                                className="mt-3 bg-blue-600 px-6 py-3 rounded-lg"
                                onPress={() => {
                                    setUseProxy(!useProxy);
                                    setVideoError(false);
                                    setVideoLoading(true);
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
                    key={currentStreamUrl || 'series-stream'}
                    ref={videoRef}
                    source={currentUrl}
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
                    }}
                    onError={(error) => {
                        setVideoError(true);
                        setVideoLoading(false);
                        let msg = 'Failed to load stream.';
                        if (error?.error?.code === -1100) msg = 'Network error. Check your connection.';
                        else if (error?.error?.domain === 'AVFoundationErrorDomain') msg = 'Stream format not supported or unavailable.';
                        setErrorMessage(msg);

                        // Try direct connection as fallback
                        if (useProxy && selectedSeries.proxyUrl) {
                            setUseProxy(false);
                            loadStream(selectedSeries, false);
                        }
                    }}
                    onLoadStart={() => {
                        setVideoLoading(true);
                        setVideoError(false);
                    }}
                    onPlaybackStatusUpdate={(status) => {
                        if (status.isLoaded) {
                            setIsPlaying(status.isPlaying);
                        }
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

    const handleSeriesPress = (seriesItem) => {
        setSelectedSeries(seriesItem);
        setShowPlayer(true);
        setVideoError(false);
        setVideoLoading(true);

        const { type } = analyzeStreamUrl(seriesItem.mediaUrl);
        setUseProxy(!type.startsWith('youtube'));
        setCurrentStreamUrl(null);
    };

    const renderSeriesCard = ({ item }) => (
        <TouchableOpacity
            className="mr-3"
            style={{ width: 140 }}
            onPress={() => handleSeriesPress(item)}
        >
            <View className="relative">
                <Image
                    source={{ uri: item.verticalUrl }}
                    className="w-full h-52 rounded-xl bg-gray-800"
                    resizeMode="cover"
                />
                <View className="absolute top-2 right-2 bg-orange-500 px-2 py-1 rounded-lg shadow-lg">
                    <Text className="text-white text-xs font-bold">{`S${item.seasonsCount}`}</Text>
                </View>
                <View className="absolute inset-0 items-center justify-center">
                    <View className="bg-black/50 rounded-full p-3">
                        <Ionicons name="play" size={32} color="white" />
                    </View>
                </View>
            </View>
            <Text className="text-white font-semibold mt-2 text-sm" numberOfLines={2}>
                {item.title}
            </Text>
            <View className="flex-row items-center mt-1">
                <Ionicons name="language" size={12} color="#9ca3af" />
                <Text className="text-gray-400 text-xs ml-1">
                    {item.language?.name || 'Unknown'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderGenreSection = ({ item: section }) => (
        <View className="mb-6">
            <View className="flex-row items-center justify-between px-4 mb-3">
                <View>
                    <Text className="text-white text-xl font-bold">{section.title}</Text>
                    <View className="h-1 w-12 bg-orange-500 mt-1 rounded-full" />
                </View>
                <View className="bg-gray-800 px-3 py-1.5 rounded-full">
                    <Text className="text-gray-300 text-xs font-semibold">{section.data.length} shows</Text>
                </View>
            </View>
            <FlatList
                data={section.data}
                renderItem={renderSeriesCard}
                keyExtractor={(item) => item._id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
            />
        </View>
    );

    const getRecommendedSeries = () => {
        if (!selectedSeries) return [];
        return series.filter(s =>
            s.genre?.name === selectedSeries.genre?.name &&
            s._id !== selectedSeries._id
        ).slice(0, 15);
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#f97316" />
                <Text className="text-white mt-4 text-base">Loading Web Series...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-black">
            <StatusBar barStyle="light-content" />
            <View className="px-4 py-3 bg-gray-900 border-b border-gray-800">
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <Text className="text-3xl mr-2">📺</Text>
                        <Text className="text-white text-2xl font-bold">Web Series</Text>
                    </View>
                    <View className="flex-row items-center">
                        <View className="bg-orange-500 px-3 py-1.5 rounded-full mr-3">
                            <Text className="text-white text-sm font-bold">{series.length}</Text>
                        </View>
                        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
                            <Ionicons
                                name="refresh"
                                size={24}
                                color={refreshing ? '#9ca3af' : '#f97316'}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
                <View className="mt-3 bg-gray-800 rounded-lg px-4 py-2 flex-row items-center">
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        placeholder="Search series or genres..."
                        placeholderTextColor="#9ca3af"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="flex-1 ml-2 text-white"
                        returnKeyType="search"
                        autoCorrect={false}
                    />
                    {searchQuery !== '' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <FlatList
                data={filteredSections}
                renderItem={renderGenreSection}
                keyExtractor={item => item.title}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#f97316"
                        colors={['#f97316']}
                    />
                }
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Ionicons name="play-circle-outline" size={64} color="#4b5563" />
                        <Text className="text-gray-400 mt-4 text-base">No series available</Text>
                    </View>
                }
            />
            <Modal
                visible={showPlayer}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => {
                    setShowPlayer(false);
                    setSelectedSeries(null);
                    if (videoRef.current) {
                        videoRef.current.pauseAsync();
                    }
                }}
            >
                <SafeAreaView className="flex-1 bg-black">
                    <StatusBar barStyle="light-content" />
                    <View className="px-4 py-3 bg-gray-900 flex-row items-center justify-between border-b border-gray-800">
                        <TouchableOpacity
                            onPress={() => {
                                setShowPlayer(false);
                                setSelectedSeries(null);
                                if (videoRef.current) {
                                    videoRef.current.pauseAsync();
                                }
                            }}
                            className="flex-row items-center"
                        >
                            <Ionicons name="arrow-back" size={24} color="white" />
                            <Text className="text-white text-lg font-semibold ml-2">Back</Text>
                        </TouchableOpacity>
                        <View className="flex-row items-center">
                            {selectedSeries && !analyzeStreamUrl(selectedSeries.mediaUrl).type.startsWith('youtube') && serverInfo?.proxyEnabled && selectedSeries.proxyUrl && (
                                <View className="flex-row items-center bg-gray-800 px-3 py-2 rounded-lg mr-3">
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
                                        }}
                                        className={`w-10 h-5 rounded-full justify-center ${useProxy ? 'bg-orange-500' : 'bg-gray-600'}`}
                                        style={{ padding: 2 }}
                                    >
                                        <View className={`w-4 h-4 rounded-full bg-white ${useProxy ? 'self-end' : 'self-start'}`} />
                                    </TouchableOpacity>
                                </View>
                            )}
                            {selectedSeries && !analyzeStreamUrl(selectedSeries.mediaUrl).type.startsWith('youtube') && (
                                <TouchableOpacity
                                    onPress={() => {
                                        if (isPlaying) {
                                            videoRef.current?.pauseAsync();
                                        } else {
                                            videoRef.current?.playAsync();
                                        }
                                    }}
                                >
                                    <Ionicons
                                        name={isPlaying ? 'pause' : 'play'}
                                        size={24}
                                        color="white"
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    {selectedSeries && (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {renderVideoPlayer()}
                            <View className="p-4 bg-gray-900">
                                <View className="flex-row items-center justify-between mb-3">
                                    <View className="flex-1 mr-4">
                                        <Text className="text-white text-2xl font-bold mb-2">{selectedSeries.title}</Text>
                                    </View>
                                </View>
                                <View className="flex-row items-center flex-wrap mb-4">
                                    <View className="bg-orange-500 px-3 py-1.5 rounded-full mr-2 mb-2">
                                        <Text className="text-white font-semibold text-sm">{selectedSeries.genre?.name || 'Series'}</Text>
                                    </View>
                                    <View className="bg-gray-800 px-3 py-1.5 rounded-full mr-2 mb-2">
                                        <Text className="text-gray-300 font-medium text-sm">{selectedSeries.language?.name || 'Unknown'}</Text>
                                    </View>
                                    <View className="bg-gray-800 px-3 py-1.5 rounded-full mb-2">
                                        <Text className="text-gray-300 font-medium text-sm">{selectedSeries.seasonsCount} Season{selectedSeries.seasonsCount > 1 ? 's' : ''}</Text>
                                    </View>
                                </View>
                                <Image
                                    source={{ uri: selectedSeries.horizontalUrl }}
                                    className="w-full h-48 rounded-xl mb-6 bg-gray-800"
                                    resizeMode="cover"
                                />
                                {getRecommendedSeries().length > 0 && (
                                    <View>
                                        <View className="flex-row items-center mb-3">
                                            <Text className="text-white text-lg font-bold">More Like This</Text>
                                            <View className="ml-2 bg-orange-500 w-1.5 h-1.5 rounded-full" />
                                        </View>
                                        {getRecommendedSeries().map(show => (
                                            <TouchableOpacity
                                                key={show._id}
                                                className="flex-row items-center p-3 bg-gray-800 mb-2 rounded-xl active:bg-gray-700"
                                                onPress={() => {
                                                    setSelectedSeries(show);
                                                    setVideoError(false);
                                                    setVideoLoading(true);
                                                    const { type } = analyzeStreamUrl(show.mediaUrl);
                                                    setUseProxy(!type.startsWith('youtube'));
                                                    setCurrentStreamUrl(null);
                                                }}
                                            >
                                                <View className="relative">
                                                    <Image
                                                        source={{ uri: show.verticalUrl }}
                                                        className="w-16 h-24 rounded-lg bg-gray-700 mr-3"
                                                        resizeMode="cover"
                                                    />
                                                    <View className="absolute top-1 right-1 bg-orange-500 px-1.5 py-0.5 rounded shadow-lg">
                                                        <Text className="text-white text-xs font-bold">S{show.seasonsCount}</Text>
                                                    </View>
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-white font-semibold text-base" numberOfLines={2}>{show.title}</Text>
                                                    <View className="flex-row items-center mt-1">
                                                        <View className="bg-orange-500/20 px-2 py-0.5 rounded mr-2">
                                                            <Text className="text-orange-500 text-xs font-semibold">{show.genre?.name}</Text>
                                                        </View>
                                                        <Text className="text-gray-400 text-xs">{show.language?.name}</Text>
                                                    </View>
                                                </View>
                                                <View className="bg-orange-500/20 rounded-full p-2">
                                                    <Ionicons name="play" size={24} color="#f97316" />
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
