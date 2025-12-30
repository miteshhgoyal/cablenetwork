import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
    Platform,
    AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/authContext';
import api from '@/services/api';
import { Video, ResizeMode } from 'expo-av';
import { YoutubeView, useYouTubePlayer, useYouTubeEvent } from 'react-native-youtube-bridge';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Device from 'expo-device';

console.log("TV Movies Screen - FULL PRODUCTION READY");

let TVEventHandler = null;
try {
    TVEventHandler = require('react-native').TVEventHandler;
} catch (e) {
    TVEventHandler = null;
}

const isTV = Device.deviceType === Device.DeviceType.TV ||
    Device.modelName?.toLowerCase().includes("tv") ||
    Device.deviceName?.toLowerCase().includes("tv") ||
    Device.brand?.toLowerCase().includes("google") ||
    Platform.isTV;

if (isTV) {
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
    if (Platform.isTV && TVEventHandler) {
        assertDefined('TVEventHandler', TVEventHandler);
    }
}

const { height: windowHeight } = Dimensions.get('window');
const PLAYER_HEIGHT = Math.max(240, Math.floor(windowHeight * 0.65));

export default function MoviesScreen() {
    const { isAuthenticated, serverInfo } = useAuth();

    // Main states
    const [movies, setMovies] = useState([]);
    const [groupedMovies, setGroupedMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showRecommendations, setShowRecommendations] = useState(false);

    // Video states
    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isPlaying, setIsPlaying] = useState(true);
    const [useProxy, setUseProxy] = useState(true);
    const [proxyAttempted, setProxyAttempted] = useState(false);
    const [bothAttemptsFailed, setBothAttemptsFailed] = useState(false);
    const [currentStreamUrl, setCurrentStreamUrl] = useState(null);

    // TV Navigation states
    const [focusedGenre, setFocusedGenre] = useState(0);
    const [focusedMovieIndex, setFocusedMovieIndex] = useState(0);
    const [isGenreFocused, setIsGenreFocused] = useState(true);
    const [recommendedFocusedIndex, setRecommendedFocusedIndex] = useState(0);

    const videoRef = useRef(null);
    const tvEventHandler = useRef(null);

    // Fetch movies
    useEffect(() => {
        if (isAuthenticated) {
            fetchMovies();
        }
    }, [isAuthenticated]);

    // Always landscape for TV
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

    // AppState refresh
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                fetchMovies();
            }
        });
        return () => subscription?.remove();
    }, []);

    // TV Remote Handler
    useEffect(() => {
        if (isTV && TVEventHandler && typeof TVEventHandler.enable === 'function') {
            tvEventHandler.current = new TVEventHandler();
            tvEventHandler.current.enable(null, (component, evt) => {
                console.log('TV Movies Event:', evt);

                if (evt.eventType === 'select') {
                    if (showRecommendations) {
                        // Recommendations navigation
                        const recommendations = getRecommendedMovies();
                        if (recommendedFocusedIndex < recommendations.length) {
                            handleRecommendationSelect(recommendations[recommendedFocusedIndex]);
                        }
                        return;
                    }

                    if (isGenreFocused) {
                        setIsGenreFocused(false);
                        setFocusedMovieIndex(0);
                        const currentGenre = groupedMovies[focusedGenre];
                        if (currentGenre?.data[0]) {
                            debouncedHandleMovieChange(currentGenre.data[0]);
                        }
                    } else {
                        const currentGenre = groupedMovies[focusedGenre];
                        const movie = currentGenre?.data[focusedMovieIndex];
                        if (movie) {
                            debouncedHandleMovieChange(movie);
                        }
                    }
                    return;
                }

                if (evt.eventType === 'right') handleNavigateRight();
                else if (evt.eventType === 'left') handleNavigateLeft();
                else if (evt.eventType === 'down') handleNavigateDown();
                else if (evt.eventType === 'up') handleNavigateUp();
                else if (evt.eventType === 'menu') setShowUserMenu(true);
                else if (evt.eventType === 'back') {
                    if (!isGenreFocused) {
                        setIsGenreFocused(true);
                        return;
                    }
                    if (showRecommendations) {
                        setShowRecommendations(false);
                        return;
                    }
                }
            });

            return () => {
                if (tvEventHandler.current) {
                    tvEventHandler.current.disable();
                }
            };
        }
    }, [isGenreFocused, focusedGenre, focusedMovieIndex, groupedMovies, showRecommendations, recommendedFocusedIndex]);

    const handleNavigateRight = useCallback(() => {
        const currentGenre = groupedMovies[focusedGenre];
        if (currentGenre && focusedMovieIndex < currentGenre.data.length - 1) {
            const nextIndex = focusedMovieIndex + 1;
            setFocusedMovieIndex(nextIndex);
            debouncedHandleMovieChange(currentGenre.data[nextIndex]);
        }
    }, [focusedGenre, focusedMovieIndex, groupedMovies]);

    const handleNavigateLeft = useCallback(() => {
        if (focusedMovieIndex > 0) {
            const prevIndex = focusedMovieIndex - 1;
            setFocusedMovieIndex(prevIndex);
            const currentGenre = groupedMovies[focusedGenre];
            debouncedHandleMovieChange(currentGenre.data[prevIndex]);
        }
    }, [focusedGenre, focusedMovieIndex, groupedMovies]);

    const handleNavigateDown = useCallback(() => {
        if (isGenreFocused) {
            if (focusedGenre < groupedMovies.length - 1) {
                setFocusedGenre(focusedGenre + 1);
            }
        } else {
            if (focusedGenre < groupedMovies.length - 1) {
                setFocusedGenre(focusedGenre + 1);
                setFocusedMovieIndex(0);
                const nextGenre = groupedMovies[focusedGenre + 1];
                if (nextGenre?.data[0]) {
                    debouncedHandleMovieChange(nextGenre.data[0]);
                }
            }
        }
    }, [isGenreFocused, focusedGenre, groupedMovies]);

    const handleNavigateUp = useCallback(() => {
        if (isGenreFocused) {
            if (focusedGenre > 0) {
                setFocusedGenre(focusedGenre - 1);
            }
        } else {
            if (focusedGenre > 0) {
                setFocusedGenre(focusedGenre - 1);
                setFocusedMovieIndex(0);
                const prevGenre = groupedMovies[focusedGenre - 1];
                if (prevGenre?.data[0]) {
                    debouncedHandleMovieChange(prevGenre.data[0]);
                }
            }
        }
    }, [isGenreFocused, focusedGenre, groupedMovies]);

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

    // Streaming functions
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

    const getCurrentStreamUrl = (movie, proxyEnabled) => {
        if (!movie) return null;
        const type = analyzeStreamUrl(movie.mediaUrl);

        if (type.type.startsWith('youtube')) {
            return { uri: movie.mediaUrl };
        }

        const baseUrl = proxyEnabled && movie.proxyUrl && serverInfo?.proxyEnabled ? movie.proxyUrl : movie.mediaUrl;

        return {
            uri: baseUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Referer: movie.mediaUrl.split('/').slice(0, 3).join('/'),
                Origin: movie.mediaUrl.split('/').slice(0, 3).join('/'),
                Accept: '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
                'Accept-Encoding': 'identity',
                Connection: 'keep-alive',
            },
        };
    };

    const loadStream = async (movie, proxyEnabled) => {
        setVideoLoading(true);
        setVideoError(false);
        setErrorMessage('');

        const newUrl = getCurrentStreamUrl(movie, proxyEnabled);
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
                    if (proxyEnabled && movie.proxyUrl) {
                        setUseProxy(false);
                        loadStream(movie, false);
                    } else {
                        setErrorMessage('Unable to load stream. Please try another movie.');
                    }
                }
            }
        }
    };

    useEffect(() => {
        if (selectedMovie) {
            const type = analyzeStreamUrl(selectedMovie.mediaUrl);
            if (!type.type.startsWith('youtube')) {
                loadStream(selectedMovie, useProxy);
            }
        }
    }, [selectedMovie, useProxy]);

    const handleMovieChange = (movie) => {
        setSelectedMovie(movie);
        setVideoError(false);
        setVideoLoading(true);
        setBothAttemptsFailed(false);
        setProxyAttempted(false);

        const type = analyzeStreamUrl(movie.mediaUrl);
        setUseProxy(!type.type.startsWith('youtube'));

        if (videoRef.current) {
            videoRef.current.unloadAsync().catch(console.error);
        }
    };

    const debouncedHandleMovieChange = useMemo(
        () => require('lodash.debounce')(handleMovieChange, 200),
        []
    );

    // RECOMMENDATIONS FUNCTIONS
    const getRecommendedMovies = useCallback(() => {
        if (!selectedMovie || movies.length === 0) return [];

        return movies
            .filter(movie => movie._id !== selectedMovie._id)
            .filter(movie =>
                movie.genre?.name === selectedMovie.genre?.name ||
                movie.language?.name === selectedMovie.language?.name
            )
            .sort((a, b) => {
                if (a.genre?.name === selectedMovie.genre?.name && b.genre?.name !== selectedMovie.genre?.name) return -1;
                if (b.genre?.name === selectedMovie.genre?.name && a.genre?.name !== selectedMovie.genre?.name) return 1;
                return a.title.localeCompare(b.title);
            })
            .slice(0, 12);
    }, [movies, selectedMovie]);

    const handleRecommendationSelect = useCallback((movie) => {
        debouncedHandleMovieChange(movie);
        setShowRecommendations(false);
    }, []);

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
            'stream': { icon: 'play-circle', color: 'bg-gray-600', text: 'Stream' },
        };
        const badge = badges[type] || { icon: 'help-circle', color: 'bg-gray-600', text: 'Unknown' };
        return (
            <View className={`${badge.color} px-3 py-1.5 rounded-full flex-row items-center absolute top-3 right-3 z-10`}>
                <Ionicons name={badge.icon} size={20} color="white" />
                <Text className="text-white text-sm font-bold ml-1.5">{badge.text}</Text>
            </View>
        );
    };

    const YouTubeVideoPlayer = ({ videoId }) => {
        const player = useYouTubePlayer(videoId, {
            autoplay: true, muted: false, controls: true, playsinline: true, rel: false, modestbranding: true
        });

        useYouTubeEvent(player, 'ready', () => {
            setVideoLoading(false); setVideoError(false); setBothAttemptsFailed(false);
        });
        useYouTubeEvent(player, 'error', (error) => {
            setVideoError(true); setVideoLoading(false);
            setErrorMessage(`YouTube Error: ${error.message || 'Unable to play video'}`);
        });

        return (
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                <YoutubeView player={player} style={{ width: '100%', height: PLAYER_HEIGHT }} />
                {selectedMovie && (
                    <Image
                        source={{ uri: selectedMovie.verticalUrl || 'https://via.placeholder.com/60x60/FF6B35/FFFFFF?text=IPTV' }}
                        style={{ position: 'absolute', bottom: 16, right: 16, width: 60, height: 60, opacity: 0.7, zIndex: 10 }}
                        resizeMode="contain"
                    />
                )}
            </View>
        );
    };

    const renderVideoPlayer = () => {
        if (!selectedMovie) {
            return (
                <View className="w-full h-full bg-black items-center justify-center">
                    <Ionicons name="film-outline" size={120} color="#6b7280" />
                    <Text className="text-white text-2xl font-semibold mt-6">No Movie Selected</Text>
                </View>
            );
        }

        const currentUrl = getCurrentStreamUrl(selectedMovie, useProxy);
        const { type, isValid } = analyzeStreamUrl(selectedMovie.mediaUrl);

        if (!isValid) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
                    <Ionicons name="alert-circle-outline" size={80} color="#ef4444" />
                    <Text className="text-white text-center mt-6 text-xl font-semibold">Invalid Movie URL</Text>
                    <Text className="text-gray-400 text-center mt-2 px-8 text-base">
                        {errorMessage || 'The provided URL format is not supported'}
                    </Text>
                </View>
            );
        }

        if (type === 'youtube-video') {
            const videoId = extractVideoId(selectedMovie.mediaUrl);
            return videoId ? <YouTubeVideoPlayer videoId={videoId} /> : null;
        }

        return (
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                {renderStreamTypeBadge(type)}

                {videoLoading && (
                    <View className="absolute inset-0 bg-black items-center justify-center z-20">
                        <ActivityIndicator size="large" color="#f97316" />
                        <Text className="text-white mt-4 text-lg">Loading {type.toUpperCase()}...</Text>
                        <Text className="text-gray-400 mt-2 text-sm">
                            {useProxy ? 'Proxy Connection' : 'Direct Connection'}
                        </Text>
                    </View>
                )}

                {videoError && (
                    <View className="absolute inset-0 bg-black/95 items-center justify-center z-30 px-8">
                        <Ionicons name="alert-circle-outline" size={80} color="#ef4444" />
                        <Text className="text-white text-center mt-6 text-xl font-semibold">Stream Error</Text>
                        <Text className="text-gray-400 text-center mt-3 px-6 text-base">{errorMessage}</Text>
                        {bothAttemptsFailed ? (
                            <Text className="text-orange-500 text-center mt-6 text-lg font-semibold">
                                Use remote to switch movies
                            </Text>
                        ) : (
                            <>
                                <TouchableOpacity className="mt-6 bg-orange-500 px-8 py-4 rounded-lg" onPress={() => {
                                    setVideoError(false); setVideoLoading(true);
                                }}>
                                    <Text className="text-white font-bold text-lg">Retry</Text>
                                </TouchableOpacity>
                                {serverInfo?.proxyEnabled && (
                                    <TouchableOpacity className="mt-4 bg-blue-600 px-8 py-4 rounded-lg" onPress={() => {
                                        setUseProxy(!useProxy); setVideoError(false); setVideoLoading(true);
                                    }}>
                                        <Text className="text-white font-bold text-lg">
                                            {useProxy ? 'Direct' : 'Proxy'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                )}

                <Video
                    ref={videoRef}
                    source={currentUrl}
                    rate={1.0} volume={1.0} isMuted={false}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={isPlaying} isLooping={false}
                    useNativeControls
                    style={{ width: '100%', height: PLAYER_HEIGHT }}
                    onLoad={() => { setVideoLoading(false); setVideoError(false); }}
                    onError={(e) => {
                        setVideoError(true); setVideoLoading(false);
                        let msg = 'Stream failed to load.';
                        if (e?.error?.code === -1100) msg = 'Network error.';
                        else if (e?.error?.domain === 'AVFoundationErrorDomain') msg = 'Unsupported format.';
                        setErrorMessage(msg);
                        if (useProxy && selectedMovie?.proxyUrl) loadStream(selectedMovie, false);
                    }}
                    onLoadStart={() => { setVideoLoading(true); setVideoError(false); }}
                    onPlaybackStatusUpdate={(status) => {
                        if (status.isLoaded) setIsPlaying(status.isPlaying);
                    }}
                />

                {selectedMovie && (
                    <Image
                        source={{ uri: selectedMovie.verticalUrl || 'https://via.placeholder.com/80x80/FF6B35/FFFFFF?text=IPTV' }}
                        style={{ position: 'absolute', bottom: 20, right: 20, width: 80, height: 80, opacity: 0.7, zIndex: 10 }}
                        resizeMode="contain"
                    />
                )}

                <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-6">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-4">
                            <Text className="text-white text-2xl font-bold mb-2" numberOfLines={2}>
                                {selectedMovie.title}
                            </Text>
                            <View className="flex-row items-center flex-wrap">
                                <View className="bg-orange-500 px-3 py-1.5 rounded-full mr-3 mb-2">
                                    <Text className="text-white font-bold text-sm">{selectedMovie.genre?.name}</Text>
                                </View>
                                <View className="bg-gray-700 px-3 py-1.5 rounded-full mr-3 mb-2">
                                    <Text className="text-gray-200 font-semibold text-sm">{selectedMovie.language?.name}</Text>
                                </View>
                            </View>
                        </View>
                        <View className="flex-row items-center space-x-2">
                            <TouchableOpacity className="bg-gray-800/80 p-3 rounded-full" onPress={() => setShowRecommendations(!showRecommendations)}>
                                <Ionicons name={showRecommendations ? "eye-off" : "eye"} size={28} color="#f97316" />
                            </TouchableOpacity>
                            <TouchableOpacity className="bg-gray-800/80 p-3 rounded-full" onPress={() => setShowUserMenu(true)}>
                                <Ionicons name="menu" size={28} color="#f97316" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 bg-black items-center justify-center">
                <StatusBar barStyle="light-content" hidden />
                <ActivityIndicator size="large" color="#f97316" />
                <Text className="text-white mt-6 text-xl">Loading Movies...</Text>
            </View>
        )
    }
    if (!movies || movies.length === 0) {
        return (
            <SafeAreaView className="flex-1 bg-black items-center justify-center">
                <StatusBar barStyle="light-content" hidden />
                <Ionicons name="film-outline" size={120} color="#6b7280" />
                <Text className="text-white text-2xl font-semibold mt-6">No Movies Available</Text>
                <TouchableOpacity className="mt-8 bg-orange-500 px-12 py-4 rounded-lg" onPress={fetchMovies}>
                    <Text className="text-white font-bold text-lg">Refresh Movies</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <View className="flex-1 bg-black">
            <StatusBar barStyle="light-content" hidden />

            {/* 65% VIDEO PLAYER */}
            <View style={{ height: PLAYER_HEIGHT, width: '100%' }}>
                {renderVideoPlayer()}
            </View>

            {/* 35% MOVIE BROWSER */}
            <View style={{ height: '35%', width: '100%' }} className="bg-gray-900">
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
                    {groupedMovies.map((genre, genreIndex) => (
                        <View key={genre.title} className="mb-6">
                            <View className="flex-row items-center justify-between px-6 mb-4">
                                <Text className={`text-xl font-bold ${isGenreFocused && focusedGenre === genreIndex ? 'text-orange-500' : 'text-white'}`}>
                                    {genre.title}
                                </Text>
                                <Text className="text-gray-400 text-base">{genre.data.length} movies</Text>
                            </View>
                            <FlatList
                                data={genre.data}
                                keyExtractor={item => item._id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 24 }}
                                renderItem={({ item: movie, index: movieIndex }) => {
                                    const isFocused = focusedGenre === genreIndex && focusedMovieIndex === movieIndex;
                                    const isPlaying = selectedMovie?._id === movie._id;
                                    return (
                                        <TouchableOpacity
                                            key={movie._id}
                                            className={`mr-4 rounded-xl overflow-hidden ${isPlaying
                                                ? 'border-4 border-orange-500 shadow-2xl'
                                                : isFocused
                                                    ? 'border-2 border-yellow-500 shadow-lg scale-105'
                                                    : 'shadow-md'
                                                }`}
                                            style={{ width: 160 }}
                                            onPress={() => debouncedHandleMovieChange(movie)}
                                            hasTVPreferredFocus={genreIndex === 0 && movieIndex === 0}
                                        >
                                            <View className="relative">
                                                <Image
                                                    source={{ uri: movie.verticalUrl }}
                                                    className="w-full h-48 bg-gray-800"
                                                    resizeMode="cover"
                                                />
                                                <View className="absolute inset-0 items-center justify-center">
                                                    <View className={`rounded-full p-4 ${isPlaying ? 'bg-orange-500' : 'bg-black/50'}`}>
                                                        <Ionicons
                                                            name="play"
                                                            size={isPlaying ? 32 : 24}
                                                            color="white"
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                            <View className={`p-3 ${isPlaying ? 'bg-orange-500' : 'bg-gray-800'}`}>
                                                <Text className={`font-bold text-sm ${isPlaying ? 'text-white' : 'text-gray-100'}`} numberOfLines={2}>
                                                    {movie.title}
                                                </Text>
                                                <Text className={`text-xs mt-1 ${isPlaying ? 'text-white/80' : 'text-gray-400'}`}>
                                                    {movie.genre?.name} • {movie.language?.name}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                                initialNumToRender={8}
                                windowSize={5}
                                removeClippedSubviews={true}
                            />
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* FULL RECOMMENDATIONS OVERLAY */}
            {showRecommendations && (
                <View className="absolute bottom-40 left-0 right-0 bg-black/95 p-8 z-30 rounded-t-3xl border-t-4 border-orange-500/50 shadow-2xl max-h-[50vh]">
                    <View className="flex-row items-center justify-between mb-8">
                        <View className="flex-row items-center">
                            <Ionicons name="sparkles" size={36} color="#f97316" />
                            <Text className="text-white text-3xl font-bold ml-3">Recommended Movies</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowRecommendations(false)}
                            className="p-3 rounded-full bg-gray-800/50 hover:bg-gray-700"
                        >
                            <Ionicons name="close-circle" size={36} color="#f97316" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={getRecommendedMovies()}
                        keyExtractor={(item) => item._id ? String(item._id) : String(Math.random())}
                        horizontal={false}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={true}
                        contentContainerStyle={{
                            paddingHorizontal: 16,
                            paddingBottom: 24,
                        }}
                        style={{ maxHeight: 320 }}
                        renderItem={({ item: movie, index }) => {
                            const isFocused = recommendedFocusedIndex === index;
                            const isPlaying = selectedMovie?._id === movie._id;

                            return (
                                <TouchableOpacity
                                    key={movie._id}
                                    className={`mb-6 mr-6 rounded-2xl overflow-hidden shadow-2xl transform transition-all ${isPlaying
                                        ? 'border-4 border-orange-500 scale-110 shadow-orange-500/50 bg-orange-500/5'
                                        : isFocused
                                            ? 'border-4 border-yellow-400 scale-105 shadow-yellow-400/50 bg-yellow-500/5'
                                            : 'border-2 border-gray-700 hover:border-gray-500 hover:scale-102'
                                        }`}
                                    style={{ width: 220, height: 320 }}
                                    onPress={() => handleRecommendationSelect(movie)}
                                    hasTVPreferredFocus={index === 0}
                                >
                                    <View className="relative h-64 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
                                        <Image
                                            source={{ uri: movie.verticalUrl || 'https://via.placeholder.com/220x264/333/999?text=MOVIE' }}
                                            className="w-full h-full"
                                            resizeMode="cover"
                                        />

                                        <View className="absolute inset-0 bg-black/40 items-center justify-center">
                                            <View className={`rounded-full p-5 shadow-2xl ${isPlaying ? 'bg-orange-500 shadow-orange-500/50' : 'bg-white/30 hover:bg-white/50'
                                                }`}>
                                                <Ionicons
                                                    name="play"
                                                    size={isPlaying ? 36 : 28}
                                                    color="white"
                                                />
                                            </View>
                                        </View>

                                        <View className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 rounded-full shadow-lg">
                                            <Text className="text-white text-xs font-bold uppercase tracking-wider">
                                                HD Movie
                                            </Text>
                                        </View>
                                    </View>

                                    <View className={`p-5 h-56 justify-between ${isPlaying ? 'bg-gradient-to-b from-orange-500/20 to-orange-600/10 border-t-4 border-orange-400'
                                        : isFocused ? 'bg-gradient-to-b from-yellow-500/10 to-yellow-600/5 border-t-2 border-yellow-400'
                                            : 'bg-gray-900/70'
                                        }`}>
                                        <View className="space-y-2 mb-3">
                                            <Text
                                                className={`font-black text-lg tracking-tight ${isPlaying ? 'text-white' : isFocused ? 'text-yellow-100' : 'text-gray-100'
                                                    }`}
                                                numberOfLines={2}
                                            >
                                                {movie.title}
                                            </Text>

                                            <View className="flex-row flex-wrap gap-2">
                                                <View className={`px-3 py-1.5 rounded-full ${isPlaying ? 'bg-white/20' : 'bg-gray-700/50'
                                                    }`}>
                                                    <Text className={`text-xs font-bold ${isPlaying ? 'text-white' : 'text-gray-300'
                                                        }`}>
                                                        {movie.genre?.name || 'Action'}
                                                    </Text>
                                                </View>
                                                <View className={`px-3 py-1.5 rounded-full ${isPlaying ? 'bg-white/20' : 'bg-gray-700/50'
                                                    }`}>
                                                    <Text className={`text-xs font-bold ${isPlaying ? 'text-white' : 'text-gray-300'
                                                        }`}>
                                                        {movie.language?.name || 'English'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            className={`w-full py-3 rounded-xl items-center justify-center shadow-lg transform transition-all ${isPlaying
                                                ? 'bg-white/30 border-2 border-white/50 shadow-white/20 hover:bg-white/40'
                                                : isFocused
                                                    ? 'bg-yellow-400/80 border-2 border-yellow-500 shadow-yellow-500/30 hover:bg-yellow-500'
                                                    : 'bg-gray-800/70 border-2 border-gray-600 hover:bg-gray-700 hover:border-gray-500 shadow-gray-500/30'
                                                }`}
                                            onPress={() => handleRecommendationSelect(movie)}
                                        >
                                            <Text className={`font-bold text-base tracking-wide ${isPlaying ? 'text-white' : isFocused ? 'text-gray-900' : 'text-gray-200'
                                                }`}>
                                                {isPlaying ? 'NOW PLAYING' : 'PLAY MOVIE'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        initialNumToRender={5}
                        maxToRenderPerBatch={3}
                        windowSize={8}
                        removeClippedSubviews={true}
                        getItemLayout={(data, index) => ({
                            length: 340,
                            offset: 340 * index,
                            index,
                        })}
                        ListFooterComponent={
                            <View className="h-8 w-full bg-gradient-to-t from-black/50 to-transparent" />
                        }
                        ListEmptyComponent={
                            <View className="items-center justify-center py-12">
                                <Ionicons name="star-outline" size={64} color="#f97316" />
                                <Text className="text-gray-400 text-xl mt-4 text-center">No recommendations yet</Text>
                                <Text className="text-gray-500 text-sm mt-2 text-center px-8">
                                    Play more movies to get personalized suggestions
                                </Text>
                            </View>
                        }
                    />
                </View>
            )}

            {/* User Menu Modal */}
            <Modal visible={showUserMenu} animationType="slide" transparent onRequestClose={() => setShowUserMenu(false)}>
                <View className="flex-1 bg-black/80 justify-end">
                    <View className="bg-gray-900 rounded-t-3xl">
                        <View className="flex-row items-center justify-between px-8 py-6 border-b border-gray-800">
                            <Text className="text-white text-2xl font-bold">Movies Menu</Text>
                            <TouchableOpacity onPress={() => setShowUserMenu(false)}>
                                <Ionicons name="close-circle" size={32} color="white" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView className="px-8 py-6" style={{ maxHeight: 400 }}>
                            <View className="bg-gray-800/50 rounded-2xl p-6 mb-6">
                                <View className="flex-row items-center mb-4">
                                    <Ionicons name="film" size={32} color="#f97316" />
                                    <Text className="text-white text-xl font-bold ml-4">Movies Library</Text>
                                </View>
                                <View className="flex-row justify-between py-3 border-t border-gray-700">
                                    <Text className="text-gray-400 text-lg">Total Movies</Text>
                                    <Text className="text-white font-bold text-xl">{movies.length}</Text>
                                </View>
                                <View className="flex-row justify-between py-3 border-t border-gray-700">
                                    <Text className="text-gray-400 text-lg">Genres</Text>
                                    <Text className="text-white font-bold text-xl">{groupedMovies.length}</Text>
                                </View>
                            </View>

                            {serverInfo?.whatsappNumber && (
                                <TouchableOpacity className="bg-green-600 py-6 rounded-2xl items-center mb-4" onPress={() => {
                                    Linking.openURL(`https://wa.me/${serverInfo.whatsappNumber}`).catch(() => Alert.alert('Error', 'Unable to open WhatsApp'));
                                }}>
                                    <View className="flex-row items-center">
                                        <Ionicons name="logo-whatsapp" size={28} color="white" />
                                        <Text className="text-white font-bold text-xl ml-4">Contact Support</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity className="bg-orange-600 py-6 rounded-2xl items-center mb-6" onPress={() => {
                                setShowUserMenu(false);
                                onRefresh();
                            }}>
                                <View className="flex-row items-center">
                                    <Ionicons name="refresh" size={28} color="white" />
                                    <Text className="text-white font-bold text-xl ml-4">Refresh Movies</Text>
                                </View>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
