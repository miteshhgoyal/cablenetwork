// app/(tabs)/movies.js
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
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/authContext';
import api from '@/services/api';
import { Video, ResizeMode } from 'expo-av';

const { width } = Dimensions.get('window');

export default function MoviesScreen() {
    const { isAuthenticated } = useAuth();
    const [movies, setMovies] = useState([]);
    const [groupedMovies, setGroupedMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [selectedGenre, setSelectedGenre] = useState('all');

    // Video player state
    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isPlaying, setIsPlaying] = useState(true);
    const videoRef = useRef(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchMovies();
        }
    }, [isAuthenticated]);

    const fetchMovies = async () => {
        try {
            setLoading(true);
            const response = await api.get('/customer/movies');

            if (response.data.success) {
                setMovies(response.data.data.movies);

                // Convert grouped object to array format for horizontal scrolling
                const sections = Object.entries(response.data.data.groupedByGenre).map(
                    ([genre, movies]) => ({
                        title: genre,
                        data: movies
                    })
                );
                setGroupedMovies(sections);
            }
        } catch (error) {
            console.error('Fetch movies error:', error);
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

    const genres = useMemo(() => {
        const uniqueGenres = ['all', ...new Set(movies.map(m => m.genre?.name).filter(Boolean))];
        return uniqueGenres;
    }, [movies]);

    const filteredSections = useMemo(() => {
        if (selectedGenre === 'all') return groupedMovies;
        return groupedMovies.filter(section => section.title === selectedGenre);
    }, [groupedMovies, selectedGenre]);

    // ==========================================
    // STREAM URL ANALYSIS
    // ==========================================

    const analyzeStreamUrl = (url) => {
        if (!url) return { type: 'unknown', isValid: false };

        const urlLower = url.toLowerCase();

        if (urlLower.includes('.m3u8') || urlLower.includes('m3u')) {
            return { type: 'hls', isValid: true };
        }

        if (urlLower.includes('chunklist')) {
            return { type: 'hls', isValid: true };
        }

        if (urlLower.includes('.mp4')) {
            return { type: 'mp4', isValid: true };
        }

        if (urlLower.includes('.mkv')) {
            return { type: 'mkv', isValid: true };
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
            return { type: 'stream', isValid: true };
        }

        return { type: 'unknown', isValid: false };
    };

    const renderStreamTypeBadge = (type) => {
        const badges = {
            'hls': { icon: 'videocam', color: 'bg-blue-600', text: 'HLS' },
            'mp4': { icon: 'film', color: 'bg-green-600', text: 'MP4' },
            'mkv': { icon: 'film', color: 'bg-purple-600', text: 'MKV' },
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

    // ==========================================
    // VIDEO PLAYER
    // ==========================================

    const renderVideoPlayer = () => {
        if (!selectedMovie) return null;

        const { type, isValid } = analyzeStreamUrl(selectedMovie.mediaUrl);

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

                        <TouchableOpacity
                            className="mt-3 bg-gray-700 px-6 py-3 rounded-lg"
                            onPress={() => {
                                setVideoError(false);
                                setVideoLoading(true);
                            }}
                        >
                            <Text className="text-white font-semibold">🔄 Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Video
                    ref={videoRef}
                    source={{ uri: selectedMovie.mediaUrl }}
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
                        console.error('❌ Video error:', error);
                        setVideoError(true);
                        setVideoLoading(false);
                        setErrorMessage('Failed to load stream. Please check your connection.');
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
                />
            </View>
        );
    };

    // ==========================================
    // RENDER MOVIE CARD (Vertical)
    // ==========================================

    const renderMovieCard = ({ item }) => (
        <TouchableOpacity
            className="mr-3"
            style={{ width: 140 }}
            onPress={() => {
                setSelectedMovie(item);
                setShowPlayer(true);
                setVideoError(false);
                setVideoLoading(true);
            }}
        >
            <Image
                source={{ uri: item.verticalUrl }}
                className="w-full h-52 rounded-xl bg-gray-800"
                resizeMode="cover"
            />
            <Text className="text-white font-semibold mt-2" numberOfLines={2}>
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

    // ==========================================
    // RENDER GENRE SECTION (Horizontal Scroll)
    // ==========================================

    const renderGenreSection = ({ item: section }) => (
        <View className="mb-6">
            <View className="flex-row items-center justify-between px-4 mb-3">
                <View>
                    <Text className="text-white text-xl font-bold">{section.title}</Text>
                    <View className="h-1 w-12 bg-orange-500 mt-1 rounded-full" />
                </View>
                <Text className="text-gray-400 text-sm">{section.data.length} movies</Text>
            </View>

            <FlatList
                data={section.data}
                renderItem={renderMovieCard}
                keyExtractor={(item) => item._id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
            />
        </View>
    );

    // ==========================================
    // RECOMMENDED MOVIES
    // ==========================================

    const getRecommendedMovies = () => {
        if (!selectedMovie) return [];

        return movies.filter(m =>
            m.genre?.name === selectedMovie.genre?.name &&
            m._id !== selectedMovie._id
        ).slice(0, 10);
    };

    // ==========================================
    // MAIN RENDER
    // ==========================================

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#f97316" />
                <Text className="text-white mt-4 text-base">Loading Movies...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-black">
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View className="px-4 py-3 bg-gray-900 border-b border-gray-800">
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <Text className="text-3xl mr-2">🎬</Text>
                        <Text className="text-white text-2xl font-bold">Movies</Text>
                    </View>
                    <View className="flex-row items-center">
                        <View className="bg-orange-500 px-3 py-1 rounded-full mr-3">
                            <Text className="text-white text-sm font-bold">{movies.length}</Text>
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
            </View>

            {/* Genre Filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="bg-gray-900 border-b border-gray-800"
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            >
                {genres.map((genre) => (
                    <TouchableOpacity
                        key={genre}
                        onPress={() => setSelectedGenre(genre)}
                        className={`px-4 py-2 rounded-full mr-2 ${selectedGenre === genre ? 'bg-orange-500' : 'bg-gray-800'
                            }`}
                    >
                        <Text
                            className={`font-semibold capitalize ${selectedGenre === genre ? 'text-white' : 'text-gray-400'
                                }`}
                        >
                            {genre}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Movies List - Horizontal Scrolling Genres */}
            <FlatList
                data={filteredSections}
                renderItem={renderGenreSection}
                keyExtractor={(item) => item.title}
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
                        <Ionicons name="film-outline" size={64} color="#4b5563" />
                        <Text className="text-gray-400 mt-4 text-base">No movies available</Text>
                    </View>
                }
            />

            {/* Video Player Modal */}
            <Modal
                visible={showPlayer}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => {
                    setShowPlayer(false);
                    setSelectedMovie(null);
                    videoRef.current?.pauseAsync();
                }}
            >
                <SafeAreaView className="flex-1 bg-black">
                    <StatusBar barStyle="light-content" />

                    {/* Header */}
                    <View className="px-4 py-3 bg-gray-900 flex-row items-center justify-between border-b border-gray-800">
                        <TouchableOpacity
                            onPress={() => {
                                setShowPlayer(false);
                                setSelectedMovie(null);
                                videoRef.current?.pauseAsync();
                            }}
                            className="flex-row items-center"
                        >
                            <Ionicons name="arrow-back" size={24} color="white" />
                            <Text className="text-white text-lg font-semibold ml-2">Back</Text>
                        </TouchableOpacity>

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
                    </View>

                    {selectedMovie && (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Video Player */}
                            {renderVideoPlayer()}

                            {/* Movie Details */}
                            <View className="p-4">
                                <Text className="text-white text-2xl font-bold mb-3">
                                    {selectedMovie.title}
                                </Text>

                                <View className="flex-row items-center flex-wrap mb-4">
                                    <View className="bg-orange-500 px-3 py-1 rounded-full mr-2 mb-2">
                                        <Text className="text-white font-semibold text-sm">
                                            {selectedMovie.genre?.name || 'Movie'}
                                        </Text>
                                    </View>
                                    <View className="bg-gray-800 px-3 py-1 rounded-full mr-2 mb-2">
                                        <Text className="text-gray-300 font-medium text-sm">
                                            {selectedMovie.language?.name || 'Unknown'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Horizontal Poster */}
                                <Image
                                    source={{ uri: selectedMovie.horizontalUrl }}
                                    className="w-full h-48 rounded-xl mb-6 bg-gray-800"
                                    resizeMode="cover"
                                />

                                {/* Recommended Movies */}
                                <View>
                                    <Text className="text-white text-lg font-bold mb-3">
                                        📌 More Like This
                                    </Text>
                                    {getRecommendedMovies().map((movie) => (
                                        <TouchableOpacity
                                            key={movie._id}
                                            className="flex-row items-center p-3 bg-gray-800 mb-2 rounded-lg active:bg-gray-700"
                                            onPress={() => {
                                                setSelectedMovie(movie);
                                                setVideoError(false);
                                                setVideoLoading(true);
                                            }}
                                        >
                                            <Image
                                                source={{ uri: movie.verticalUrl }}
                                                className="w-16 h-24 rounded-lg bg-gray-700 mr-3"
                                                resizeMode="cover"
                                            />
                                            <View className="flex-1">
                                                <Text className="text-white font-semibold text-base" numberOfLines={2}>
                                                    {movie.title}
                                                </Text>
                                                <View className="flex-row items-center mt-1">
                                                    <View className="bg-orange-500 px-2 py-0.5 rounded mr-2">
                                                        <Text className="text-white text-xs font-semibold">
                                                            {movie.genre?.name}
                                                        </Text>
                                                    </View>
                                                    <Text className="text-gray-400 text-xs">
                                                        {movie.language?.name}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Ionicons name="play-circle" size={32} color="#f97316" />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
