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
    TextInput,
    Linking,
    TVEventHandler,
    Platform
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/authContext';
import api from '@/services/api';
import { Video, ResizeMode } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { YoutubeView, useYouTubePlayer, useYouTubeEvent } from 'react-native-youtube-bridge';

// ADD ASSERTIONS RIGHT AFTER IMPORTS
function assertDefined(name, value) {
    if (value === undefined || value === null) {
        throw new Error(`${name} is undefined at runtime in MoviesScreen`);
    }
}

assertDefined('Ionicons', Ionicons);
assertDefined('Video', Video);
assertDefined('ResizeMode', ResizeMode);
assertDefined('YoutubeView', YoutubeView);
assertDefined('useYouTubePlayer', useYouTubePlayer);
assertDefined('useYouTubeEvent', useYouTubeEvent);
assertDefined('TVEventHandler', TVEventHandler);

const { width } = Dimensions.get('window');

export default function MoviesScreen() {
    const { isAuthenticated, serverInfo } = useAuth();
    const [movies, setMovies] = useState([]);
    const [groupedMovies, setGroupedMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isPlaying, setIsPlaying] = useState(true);

    const [useProxy, setUseProxy] = useState(true);
    const [proxyAttempted, setProxyAttempted] = useState(false);
    const [bothAttemptsFailed, setBothAttemptsFailed] = useState(false);
    const [currentStreamUrl, setCurrentStreamUrl] = useState('');

    const [focusedGenre, setFocusedGenre] = useState(0);
    const [focusedMovieIndex, setFocusedMovieIndex] = useState(0);

    const videoRef = useRef(null);
    const tvEventHandler = useRef(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchMovies();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }, []);

    // Auto-start first movie on mount
    useEffect(() => {
        if (groupedMovies.length > 0 && groupedMovies[0].data.length > 0) {
            const firstMovie = groupedMovies[0].data[0];
            handleMovieChange(firstMovie);
        }
    }, [groupedMovies]);

    // TV Remote Control Handler
    useEffect(() => {
        if (Platform.isTV) {
            tvEventHandler.current = new TVEventHandler();
            tvEventHandler.current.enable(null, (component, evt) => {
                if (evt && evt.eventType === 'select') {
                    const currentGenre = groupedMovies[focusedGenre];
                    if (currentGenre) {
                        const movie = currentGenre.data[focusedMovieIndex];
                        if (movie) {
                            handleMovieChange(movie);
                        }
                    }
                } else if (evt && evt.eventType === 'right') {
                    handleNavigateRight();
                } else if (evt && evt.eventType === 'left') {
                    handleNavigateLeft();
                } else if (evt && evt.eventType === 'up') {
                    handleNavigateUp();
                } else if (evt && evt.eventType === 'down') {
                    handleNavigateDown();
                } else if (evt && evt.eventType === 'menu') {
                    setShowUserMenu(true);
                }
            });

            return () => {
                if (tvEventHandler.current) {
                    tvEventHandler.current.disable();
                }
            };
        }
    }, [focusedGenre, focusedMovieIndex, groupedMovies]);

    const handleNavigateRight = () => {
        const currentGenre = groupedMovies[focusedGenre];
        if (currentGenre && focusedMovieIndex < currentGenre.data.length - 1) {
            setFocusedMovieIndex(focusedMovieIndex + 1);
        }
    };

    const handleNavigateLeft = () => {
        if (focusedMovieIndex > 0) {
            setFocusedMovieIndex(focusedMovieIndex - 1);
        }
    };

    const handleNavigateDown = () => {
        if (focusedGenre < groupedMovies.length - 1) {
            setFocusedGenre(focusedGenre + 1);
            setFocusedMovieIndex(0);
        }
    };

    const handleNavigateUp = () => {
        if (focusedGenre > 0) {
            setFocusedGenre(focusedGenre - 1);
            setFocusedMovieIndex(0);
        }
    };

    const fetchMovies = async () => {
        try {
            setLoading(true);
            const response = await api.get('/customer/movies');
            if (response.data.success) {
                setMovies(response.data.data.movies);
                const sections = Object.entries(response.data.data.groupedByGenre).map(
                    ([genre, movies]) => ({
                        title: genre,
                        data: movies
                    })
                );
                setGroupedMovies(sections);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load movies. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMovies();
        setRefreshing(false);
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
    };

    const extractPlaylistId = (url) => {
        if (!url) return null;
        const playlistRegex = /[?&]list=([a-zA-Z0-9_-]+)/;
        const match = url.match(playlistRegex);
        return match ? match[1] : null;
    };

    const getCurrentStreamUrl = () => {
        if (!selectedMovie) return null;
        const { type } = analyzeStreamUrl(selectedMovie.mediaUrl);

        if (type.startsWith('youtube')) {
            return { uri: selectedMovie.mediaUrl };
        }

        const baseUrl = useProxy && selectedMovie.proxyUrl && serverInfo?.proxyEnabled
            ? selectedMovie.proxyUrl
            : selectedMovie.mediaUrl;

        return {
            uri: baseUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': selectedMovie.mediaUrl.split('/').slice(0, 3).join('/') + '/',
                'Origin': selectedMovie.mediaUrl.split('/').slice(0, 3).join('/'),
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
        if (selectedMovie) {
            const newUrl = getCurrentStreamUrl();
            const newUrlString = JSON.stringify(newUrl);
            if (newUrlString !== currentStreamUrl || !currentStreamUrl) {
                setCurrentStreamUrl(newUrlString);
                setVideoLoading(true);
                setVideoError(false);

                if (videoRef.current) {
                    videoRef.current.unloadAsync().then(() => {
                        videoRef.current?.loadAsync(newUrl, { shouldPlay: true });
                    });
                } else if (currentStreamUrl) {
                    setCurrentStreamUrl(newUrlString);
                }
            }
        }
    }, [useProxy, selectedMovie]);

    useEffect(() => {
        return () => {
            // Cleanup on component unmount
            if (videoRef.current) {
                videoRef.current.unloadAsync().catch(() => {
                    console.log('Error unloading video on unmount');
                });
            }

            // Reset state
            setSelectedMovie(null);
            setVideoLoading(false);
            setVideoError(false);
            setIsPlaying(false);
        };
    }, []);

    const handleStreamError = () => {
        if (!proxyAttempted && serverInfo?.proxyEnabled) {
            setProxyAttempted(true);
            setUseProxy(!useProxy);
            setVideoError(false);
            setVideoLoading(true);
        } else {
            setBothAttemptsFailed(true);
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage('Unable to load stream with both proxy and direct connection. Please switch to another movie using remote control.');
        }
    };

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
            setBothAttemptsFailed(false);
        });

        useYouTubeEvent(player, 'error', (error) => {
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Error: ${error.message || 'Unable to play video'}`);
        });

        return (
            <View className="w-full h-full bg-black">
                <YoutubeView player={player} style={{ width: '100%', height: '100%' }} />
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
            setBothAttemptsFailed(false);
        });

        useYouTubeEvent(player, 'error', (error) => {
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Live Error: ${error.message || 'Unable to play live stream'}`);
        });

        return (
            <View className="w-full h-full bg-black relative">
                <View className="absolute top-3 left-3 z-10 bg-red-600 px-3 py-1.5 rounded-full flex-row items-center">
                    <View className="w-2 h-2 bg-white rounded-full mr-2" />
                    <Text className="text-white text-xs font-bold">LIVE</Text>
                </View>
                <YoutubeView player={player} style={{ width: '100%', height: '100%' }} />
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
            setBothAttemptsFailed(false);
        });

        useYouTubeEvent(player, 'error', (error) => {
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Playlist Error: ${error.message || 'Unable to load playlist'}`);
        });

        return (
            <View className="w-full h-full bg-black relative">
                <YoutubeView player={player} style={{ width: '100%', height: '100%' }} />
                <View className="absolute top-3 left-3 z-10 bg-purple-600 px-3 py-1.5 rounded-lg">
                    <Text className="text-white text-xs font-bold">PLAYLIST</Text>
                </View>
            </View>
        );
    };

    const YouTubeChannelPlayer = ({ url }) => (
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

    const renderVideoPlayer = () => {
        if (!selectedMovie) {
            return (
                <View className="w-full h-full bg-black items-center justify-center">
                    <Ionicons name="film-outline" size={80} color="#6b7280" />
                    <Text className="text-white text-xl font-semibold mt-4">No Movie Selected</Text>
                </View>
            );
        }

        const currentUrl = getCurrentStreamUrl();
        const { type, isValid } = analyzeStreamUrl(selectedMovie.mediaUrl);

        if (!isValid) {
            return (
                <View className="w-full h-full bg-black items-center justify-center">
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid stream URL</Text>
                    <Text className="text-gray-400 text-center mt-2 px-4 text-sm">
                        {errorMessage || 'The provided URL format is not supported'}
                    </Text>
                </View>
            );
        }

        if (type === 'youtube-video') {
            const videoId = extractVideoId(selectedMovie.mediaUrl);
            if (!videoId) {
                return (
                    <View className="w-full h-full bg-black items-center justify-center">
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
            const videoId = extractVideoId(selectedMovie.mediaUrl);
            if (!videoId) {
                return (
                    <View className="w-full h-full bg-black items-center justify-center">
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
            const videoId = extractVideoId(selectedMovie.mediaUrl);
            const playlistId = extractPlaylistId(selectedMovie.mediaUrl);
            if (!playlistId) {
                return (
                    <View className="w-full h-full bg-black items-center justify-center">
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
                    <YouTubeChannelPlayer url={selectedMovie.mediaUrl} />
                </>
            );
        }

        return (
            <View className="w-full h-full bg-black relative">
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
                    <View className="absolute inset-0 bg-black/90 items-center justify-center z-30 px-8">
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">
                            Stream Unavailable
                        </Text>
                        <Text className="text-gray-400 text-center mt-2 text-sm">
                            {errorMessage}
                        </Text>
                        {bothAttemptsFailed && (
                            <Text className="text-orange-500 text-center mt-4 text-base font-semibold">
                                Use remote control to switch movies
                            </Text>
                        )}
                        {!bothAttemptsFailed && (
                            <TouchableOpacity
                                className="mt-4 bg-orange-500 px-6 py-3 rounded-lg"
                                onPress={() => {
                                    setVideoError(false);
                                    setVideoLoading(true);
                                }}
                            >
                                <Text className="text-white font-semibold">Retry</Text>
                            </TouchableOpacity>
                        )}
                        {serverInfo?.proxyEnabled && !bothAttemptsFailed && (
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
                    useNativeControls={false}
                    style={{ width: '100%', height: '100%' }}
                    onLoad={() => {
                        setVideoLoading(false);
                        setVideoError(false);
                        setBothAttemptsFailed(false);
                    }}
                    onError={(error) => {
                        handleStreamError();
                    }}
                    onLoadStart={() => {
                        setVideoLoading(true);
                        setVideoError(false);
                    }}
                />

                {/* Movie Info Overlay */}
                <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6">
                    <View className="flex-row items-start">
                        <Image
                            source={{ uri: selectedMovie.verticalUrl }}
                            className="w-24 h-36 rounded-lg bg-gray-800 mr-4"
                            resizeMode="cover"
                        />
                        <View className="flex-1">
                            <Text className="text-white text-2xl font-bold mb-2" numberOfLines={2}>
                                {selectedMovie.title}
                            </Text>
                            <View className="flex-row items-center flex-wrap">
                                <View className="bg-orange-500 px-3 py-1 rounded-full mr-2 mb-2">
                                    <Text className="text-white font-bold text-xs">{selectedMovie.genre?.name}</Text>
                                </View>
                                <View className="bg-gray-700 px-3 py-1 rounded-full mr-2 mb-2">
                                    <Text className="text-gray-200 font-semibold text-xs">{selectedMovie.language?.name}</Text>
                                </View>
                                <View className="bg-gray-700 px-3 py-1 rounded-full mb-2 flex-row items-center">
                                    <Ionicons name="star" size={12} color="#f59e0b" />
                                    <Text className="text-gray-200 font-semibold text-xs ml-1">HD</Text>
                                </View>
                            </View>
                        </View>

                        {/* Menu Button */}
                        <TouchableOpacity
                            onPress={() => setShowUserMenu(true)}
                            className="bg-gray-800/80 p-3 rounded-full ml-2"
                        >
                            <Ionicons name="menu" size={24} color="#f97316" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const handleMovieChange = (movie) => {
        setSelectedMovie(movie);
        setVideoError(false);
        setVideoLoading(true);
        setBothAttemptsFailed(false);
        setProxyAttempted(false);

        const { type } = analyzeStreamUrl(movie.mediaUrl);
        setUseProxy(!type.startsWith('youtube'));

        if (videoRef.current) {
            videoRef.current.unloadAsync().catch(() => { });
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-black items-center justify-center">
                <StatusBar barStyle="light-content" hidden />
                <ActivityIndicator size="large" color="#f97316" />
                <Text className="text-white mt-4 text-base">Loading Movies...</Text>
            </View>
        );
    }

    if (!movies || movies.length === 0) {
        return (
            <View className="flex-1 bg-black items-center justify-center">
                <StatusBar barStyle="light-content" hidden />
                <Ionicons name="film-outline" size={80} color="#6b7280" />
                <Text className="text-white text-xl font-semibold mt-4">No Movies Available</Text>
                <TouchableOpacity
                    className="mt-6 bg-orange-500 px-6 py-3 rounded-lg"
                    onPress={fetchMovies}
                >
                    <Text className="text-white font-semibold">Refresh Movies</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-black">
            <StatusBar barStyle="light-content" hidden />

            {/* Video Player - Full Width Top Section (65%) */}
            <View style={{ height: '65%', width: '100%' }}>
                {renderVideoPlayer()}
            </View>

            {/* Genre-based Horizontal Categories - Bottom Section (35%) */}
            <View style={{ height: '35%', width: '100%' }} className="bg-gray-900">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 12 }}
                >
                    {groupedMovies.map((genre, genreIndex) => (
                        <View key={genre.title} className="mb-4">
                            <View className="flex-row items-center justify-between px-6 mb-3">
                                <Text className="text-white text-lg font-bold">
                                    {genre.title}
                                </Text>
                                <Text className="text-gray-500 text-sm">
                                    {genre.data.length} movies
                                </Text>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 24 }}
                            >
                                {genre.data.map((movie, movieIndex) => {
                                    const isFocused = focusedGenre === genreIndex && focusedMovieIndex === movieIndex;
                                    const isPlaying = selectedMovie?._id === movie._id;

                                    return (
                                        <TouchableOpacity
                                            key={movie._id}
                                            className={`mr-4 rounded-lg overflow-hidden ${isPlaying
                                                    ? 'border-2 border-orange-500'
                                                    : isFocused
                                                        ? 'border-2 border-orange-500 opacity-80'
                                                        : ''
                                                }`}
                                            style={{ width: 120 }}
                                            onPress={() => handleMovieChange(movie)}
                                            hasTVPreferredFocus={genreIndex === 0 && movieIndex === 0}
                                        >
                                            <View className="relative">
                                                <Image
                                                    source={{ uri: movie.verticalUrl }}
                                                    className="w-full h-44 bg-gray-800"
                                                    resizeMode="cover"
                                                />
                                                {isPlaying && (
                                                    <View className="absolute inset-0 bg-black/50 items-center justify-center">
                                                        <View className="bg-orange-500 rounded-full p-2">
                                                            <Ionicons name="play" size={24} color="white" />
                                                        </View>
                                                    </View>
                                                )}
                                                {!isPlaying && (
                                                    <View className="absolute inset-0 items-center justify-center">
                                                        <View className="bg-black/40 rounded-full p-2">
                                                            <Ionicons name="play" size={20} color="white" />
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                            <View className={`p-2 ${isPlaying ? 'bg-orange-500' : 'bg-gray-800'}`}>
                                                <Text
                                                    className={`font-semibold text-xs ${isPlaying ? 'text-white' : 'text-gray-200'}`}
                                                    numberOfLines={2}
                                                >
                                                    {movie.title}
                                                </Text>
                                                <Text className={`text-xs mt-1 ${isPlaying ? 'text-white/80' : 'text-gray-400'}`}>
                                                    {movie.language?.name}
                                                </Text>
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
            <Modal
                visible={showUserMenu}
                animationType="slide"
                transparent
                onRequestClose={() => setShowUserMenu(false)}
            >
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
                                    <Ionicons name="film" size={24} color="#f97316" />
                                    <Text className="text-white text-lg font-bold ml-3">Movies Library</Text>
                                </View>
                                <View className="flex-row justify-between py-2 border-t border-gray-700">
                                    <Text className="text-gray-400">Total Movies</Text>
                                    <Text className="text-white font-semibold">{movies.length}</Text>
                                </View>
                                <View className="flex-row justify-between py-2 border-t border-gray-700">
                                    <Text className="text-gray-400">Genres</Text>
                                    <Text className="text-white font-semibold">{groupedMovies.length}</Text>
                                </View>
                            </View>

                            {serverInfo?.whatsappNumber && (
                                <TouchableOpacity
                                    className="bg-green-600 py-4 rounded-xl items-center mb-3"
                                    onPress={() => {
                                        const url = `https://wa.me/${serverInfo.whatsappNumber}`;
                                        Linking.openURL(url).catch(() => {
                                            Alert.alert('Error', 'Unable to open WhatsApp');
                                        });
                                    }}
                                >
                                    <View className="flex-row items-center">
                                        <Ionicons name="logo-whatsapp" size={20} color="white" />
                                        <Text className="text-white font-bold text-base ml-2">Contact Support</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {serverInfo?.customButtonLink && serverInfo?.customButtonText && (
                                <TouchableOpacity
                                    className="bg-blue-600 py-4 rounded-xl items-center mb-3"
                                    onPress={() => {
                                        Linking.openURL(serverInfo.customButtonLink).catch(() => {
                                            Alert.alert('Error', 'Unable to open link');
                                        });
                                    }}
                                >
                                    <View className="flex-row items-center">
                                        <Ionicons name="open-outline" size={20} color="white" />
                                        <Text className="text-white font-bold text-base ml-2">
                                            {serverInfo.customButtonText}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                className="bg-orange-600 py-4 rounded-xl items-center mb-4"
                                onPress={() => {
                                    setShowUserMenu(false);
                                    onRefresh();
                                }}
                            >
                                <View className="flex-row items-center">
                                    <Ionicons name="refresh" size={20} color="white" />
                                    <Text className="text-white font-bold text-base ml-2">Refresh Movies</Text>
                                </View>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
