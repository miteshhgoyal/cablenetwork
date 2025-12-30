import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Modal,
    ScrollView,
    StatusBar,
    Linking,
    ActivityIndicator,
    Alert,
    AppState,
    FlatList,
    Platform,
    Dimensions,
} from 'react-native';
import { useAuth } from '@/context/authContext';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { YoutubeView, useYouTubePlayer, useYouTubeEvent } from 'react-native-youtube-bridge';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Device from 'expo-device';

let TVEventHandler = null;
try {
    TVEventHandler = require('react-native').TVEventHandler;
} catch (e) {
    TVEventHandler = null;
}

const { height: windowHeight } = Dimensions.get('window');
const PLAYER_HEIGHT = Math.max(240, Math.floor(windowHeight * 0.65));

export default function Index() {
    console.log('Platform.isTV:', Platform.isTV);

    const { channels, user, packagesList, serverInfo, logout, refreshChannels, refreshing } = useAuth();

    // Core states
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [showUserInfo, setShowUserInfo] = useState(false);
    const [showRecommendations, setShowRecommendations] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [useProxy, setUseProxy] = useState(true);
    const [proxyAttempted, setProxyAttempted] = useState(false);
    const [bothAttemptsFailed, setBothAttemptsFailed] = useState(false);
    const [currentStreamUrl, setCurrentStreamUrl] = useState(null);

    // FIXED: Reliable TV Detection with useRef
    const isTV = useRef(
        Device.deviceType === Device.DeviceType.TV ||
        Platform.isTV ||
        Device.modelName?.toLowerCase().includes('tv') ||
        Device.deviceName?.toLowerCase().includes('tv') ||
        Device.brand?.toLowerCase().includes('google')
    ).current;

    // TV Navigation states
    const [focusedCategory, setFocusedCategory] = useState(0);
    const [focusedChannelIndex, setFocusedChannelIndex] = useState(0);
    const [isCategoryFocused, setIsCategoryFocused] = useState(true);
    const [channelNumberInput, setChannelNumberInput] = useState('');

    const videoRef = useRef(null);
    const tvEventHandler = useRef(null);
    const channelNumberTimeout = useRef(null);

    // Group channels by language
    const channelsByLanguage = useMemo(() => {
        if (!channels || channels.length === 0) return [];

        const grouped = channels.reduce((acc, channel) => {
            const lang = channel.language?.name || 'Other';
            if (!acc[lang]) acc[lang] = [];
            acc[lang].push(channel);
            return acc;
        }, {});

        Object.keys(grouped).forEach(lang => {
            grouped[lang].sort((a, b) => (a.lcn ?? 999999) - (b.lcn ?? 999999));
        });

        return Object.entries(grouped).map(([language, channels]) => ({
            language,
            channels
        }));
    }, [channels]);

    // FIXED: Safe auto-start after channels load
    useEffect(() => {
        if (channelsByLanguage.length > 0 && channelsByLanguage[0]?.channels?.length > 0) {
            const firstChannel = channelsByLanguage[0].channels[0];
            handleChannelChange(firstChannel);
        }
    }, [channelsByLanguage.length]);

    // FIXED: Delayed orientation lock for TV
    useEffect(() => {
        const initOrientation = async () => {
            try {
                if (!isTV) {
                    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                }
            } catch (error) {
                console.log('Channels orientation lock failed:', error);
            }
        };
        const timeoutId = setTimeout(initOrientation, 1000); // 1s delay prevents TV crash
        return () => clearTimeout(timeoutId);
    }, []);

    // FIXED: Safe TV Remote Handler with proper cleanup
    useEffect(() => {
        if (!isTV || !TVEventHandler) return;

        const handler = new TVEventHandler();
        tvEventHandler.current = handler;

        handler.enable(null, (component, evt) => {
            console.log('TV Channels Event:', evt);

            // Handle number key input (0-9)
            if (evt.eventType === 'keyDown' && evt.eventKeyAction === 0 && /[0-9]/.test(evt.eventKey)) {
                handleChannelNumberInput(evt.eventKey);
                return;
            }

            // Handle SELECT/OK button
            if (evt.eventType === 'select') {
                if (isCategoryFocused) {
                    setIsCategoryFocused(false);
                    setFocusedChannelIndex(0);
                    const currentCategory = channelsByLanguage[focusedCategory];
                    if (currentCategory?.channels[0]) {
                        debouncedHandleChannelChange(currentCategory.channels[0]);
                    }
                } else {
                    const currentCategory = channelsByLanguage[focusedCategory];
                    const channel = currentCategory?.channels[focusedChannelIndex];
                    if (channel) {
                        debouncedHandleChannelChange(channel);
                    }
                }
                return;
            }

            // Navigation
            if (evt.eventType === 'right') handleNavigateRight();
            else if (evt.eventType === 'left') handleNavigateLeft();
            else if (evt.eventType === 'down') handleNavigateDown();
            else if (evt.eventType === 'up') handleNavigateUp();
            else if (evt.eventType === 'menu') setShowUserInfo(true);
            else if (evt.eventType === 'back') {
                if (!isCategoryFocused) {
                    setIsCategoryFocused(true);
                    return;
                }
            }
        });

        return () => {
            if (handler && handler.disable) {
                handler.disable();
            }
            tvEventHandler.current = null;
        };
    }, [isCategoryFocused, focusedCategory, focusedChannelIndex, channelsByLanguage]);

    const handleNavigateRight = useCallback(() => {
        const currentCategory = channelsByLanguage[focusedCategory];
        if (currentCategory && focusedChannelIndex < currentCategory.channels.length - 1) {
            const nextIndex = focusedChannelIndex + 1;
            setFocusedChannelIndex(nextIndex);
            const nextChannel = currentCategory.channels[nextIndex];
            if (nextChannel) {
                debouncedHandleChannelChange(nextChannel);
            }
        }
    }, [focusedCategory, focusedChannelIndex, channelsByLanguage]);

    const handleNavigateLeft = useCallback(() => {
        const currentCategory = channelsByLanguage[focusedCategory];
        if (currentCategory && focusedChannelIndex > 0) {
            const prevIndex = focusedChannelIndex - 1;
            setFocusedChannelIndex(prevIndex);
            const prevChannel = currentCategory.channels[prevIndex];
            if (prevChannel) {
                debouncedHandleChannelChange(prevChannel);
            }
        }
    }, [focusedCategory, focusedChannelIndex, channelsByLanguage]);

    const handleNavigateDown = useCallback(() => {
        if (isCategoryFocused) {
            if (focusedCategory < channelsByLanguage.length - 1) {
                setFocusedCategory(focusedCategory + 1);
            }
        } else {
            if (focusedCategory < channelsByLanguage.length - 1) {
                setFocusedCategory(focusedCategory + 1);
                setFocusedChannelIndex(0);
                const nextCategory = channelsByLanguage[focusedCategory + 1];
                if (nextCategory?.channels[0]) {
                    debouncedHandleChannelChange(nextCategory.channels[0]);
                }
            }
        }
    }, [isCategoryFocused, focusedCategory, channelsByLanguage]);

    const handleNavigateUp = useCallback(() => {
        if (isCategoryFocused) {
            if (focusedCategory > 0) {
                setFocusedCategory(focusedCategory - 1);
            }
        } else {
            if (focusedCategory > 0) {
                setFocusedCategory(focusedCategory - 1);
                setFocusedChannelIndex(0);
                const prevCategory = channelsByLanguage[focusedCategory - 1];
                if (prevCategory?.channels[0]) {
                    debouncedHandleChannelChange(prevCategory.channels[0]);
                }
            }
        }
    }, [isCategoryFocused, focusedCategory, channelsByLanguage]);

    const handleChannelNumberInput = useCallback((digit) => {
        setChannelNumberInput(prev => {
            const newInput = prev + digit;
            if (channelNumberTimeout.current) {
                clearTimeout(channelNumberTimeout.current);
            }
            channelNumberTimeout.current = setTimeout(() => {
                playChannelByNumber(newInput);
                setChannelNumberInput('');
            }, 1000);
            return newInput;
        });
    }, []);

    const playChannelByNumber = useCallback((numberStr) => {
        const lcn = parseInt(numberStr, 10);
        if (isNaN(lcn)) return;

        for (let catIdx = 0; catIdx < channelsByLanguage.length; catIdx++) {
            const category = channelsByLanguage[catIdx];
            const chIdx = category.channels.findIndex(ch => ch.lcn == lcn);
            if (chIdx !== -1) {
                setFocusedCategory(catIdx);
                setFocusedChannelIndex(chIdx);
                setIsCategoryFocused(false);
                debouncedHandleChannelChange(category.channels[chIdx]);
                return;
            }
        }
        setErrorMessage(`Channel ${lcn} not found`);
    }, [channelsByLanguage]);

    // AppState listener
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                refreshChannels();
            }
        });
        return () => subscription?.remove();
    }, []);

    const getUserPackage = () => {
        if (!user?.package || !packagesList) return null;
        return packagesList.find((pkg) => pkg.id === user.package) || null;
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
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

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
        if (urlLower.match(/\\.(mp4|m4v|mov)\\?/)) return { type: 'mp4', isValid: true };

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

    const getCurrentStreamUrl = (channel, proxyEnabled) => {
        if (!channel) return null;
        const type = analyzeStreamUrl(channel.url);

        if (type.type.startsWith('youtube')) {
            return { uri: channel.url };
        }

        const baseUrl = proxyEnabled && channel.proxyUrl && serverInfo?.proxyEnabled ? channel.proxyUrl : channel.url;

        console.log('Stream Load:', {
            channelName: channel.name,
            streamType: type.type,
            isProxy: useProxy && !!channel.proxyUrl,
            finalUrl: baseUrl.substring(0, 100) + '...'
        });

        return {
            uri: baseUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Referer: channel.url.split('/').slice(0, 3).join('/'),
                Origin: channel.url.split('/').slice(0, 3).join('/'),
                Accept: '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
                'Accept-Encoding': 'identity',
                Connection: 'keep-alive',
            },
        };
    };

    const loadStream = async (channel, proxyEnabled) => {
        setVideoLoading(true);
        setVideoError(false);
        setErrorMessage('');

        const newUrl = getCurrentStreamUrl(channel, proxyEnabled);
        const newUrlString = JSON.stringify(newUrl);

        if (newUrlString !== currentStreamUrl) {
            setCurrentStreamUrl(newUrlString);

            if (videoRef.current) {
                try {
                    await videoRef.current.unloadAsync();
                    await videoRef.current.loadAsync(newUrl, { shouldPlay: true });
                } catch (error) {
                    setVideoError(true);
                    setVideoLoading(false);
                    if (proxyEnabled) {
                        loadStream(channel, false);
                    } else {
                        setErrorMessage('No stream available');
                    }
                }
            }
        }
    };

    // Auto load stream when channel changes
    useEffect(() => {
        if (selectedChannel) {
            loadStream(selectedChannel, true);
        }
    }, [selectedChannel]);

    // 🔥 BULLETPROOF CLEANUP - Stops ALL video/audio on unmount
    useEffect(() => {
        return () => {
            console.log('🔴 ChannelsScreen UNMOUNT - Cleaning up video');

            // Stop ALL video playback
            if (videoRef.current) {
                try {
                    videoRef.current.pauseAsync?.();
                    videoRef.current.stopAsync?.();
                    videoRef.current.unloadAsync();
                    videoRef.current.setOnPlaybackStatusUpdate(null);
                } catch (e) {
                    console.log('Video cleanup error:', e);
                }
            }

            // Clear timeouts
            if (channelNumberTimeout.current) {
                clearTimeout(channelNumberTimeout.current);
            }

            // Reset states
            setSelectedChannel(null);
            setVideoLoading(false);
            setVideoError(false);
            setCurrentStreamUrl(null);
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
            setErrorMessage('Unable to load stream with both proxy and direct connection. Please switch to another channel using remote control.');
        }
    };

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
            setBothAttemptsFailed(false);
        });

        useYouTubeEvent(player, 'error', (error) => {
            setVideoError(true);
            setVideoLoading(false);
            setErrorMessage(`YouTube Error: ${error.message || 'Unable to play video'}`);
        });

        return (
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                <YoutubeView player={player} style={{ width: '100%', height: PLAYER_HEIGHT }} />
                {selectedChannel && (
                    <Image
                        source={{ uri: selectedChannel.imageUrl }}
                        style={{
                            position: 'absolute',
                            bottom: 16,
                            right: 16,
                            width: 60,
                            height: 60,
                            opacity: 0.7,
                            zIndex: 10,
                        }}
                        resizeMode="contain"
                    />
                )}
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
            modestbranding: true,
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
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                <View className="absolute top-3 left-3 z-10 bg-red-600 px-3 py-1.5 rounded-full flex-row items-center">
                    <View className="w-2 h-2 bg-white rounded-full mr-2" />
                    <Text className="text-white text-xs font-bold">LIVE</Text>
                </View>
                <YoutubeView player={player} style={{ width: '100%', height: PLAYER_HEIGHT }} />
                {selectedChannel && (
                    <Image
                        source={{ uri: selectedChannel.imageUrl }}
                        style={{
                            position: 'absolute',
                            bottom: 16,
                            right: 16,
                            width: 60,
                            height: 60,
                            opacity: 0.7,
                            zIndex: 10,
                        }}
                        resizeMode="contain"
                    />
                )}
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
            listType: 'playlist',
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
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                <View className="absolute top-3 left-3 z-10 bg-purple-600 px-3 py-1.5 rounded-lg">
                    <Text className="text-white text-xs font-bold">PLAYLIST</Text>
                </View>
                <YoutubeView player={player} style={{ width: '100%', height: PLAYER_HEIGHT }} />
                {selectedChannel && (
                    <Image
                        source={{ uri: selectedChannel.imageUrl }}
                        style={{
                            position: 'absolute',
                            bottom: 16,
                            right: 16,
                            width: 60,
                            height: 60,
                            opacity: 0.7,
                            zIndex: 10,
                        }}
                        resizeMode="contain"
                    />
                )}
            </View>
        );
    };

    const YouTubeChannelPlayer = ({ url }) => (
        <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
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
            {selectedChannel && (
                <Image
                    source={{ uri: selectedChannel.imageUrl }}
                    style={{
                        position: 'absolute',
                        bottom: 16,
                        right: 16,
                        width: 60,
                        height: 60,
                        opacity: 0.7,
                        zIndex: 10,
                    }}
                    resizeMode="contain"
                />
            )}
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
            'stream': { icon: 'play-circle', color: 'bg-gray-600', text: 'Stream' },
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
        if (!selectedChannel) {
            return (
                <View className="w-full h-full bg-black items-center justify-center min-h-[240px]">
                    <Ionicons name="tv-outline" size={80} color="#6b7280" />
                    <Text className="text-white text-xl font-semibold mt-4">No Channel Selected</Text>
                </View>
            );
        }

        const currentUrl = getCurrentStreamUrl(selectedChannel, useProxy);
        const { type, isValid } = analyzeStreamUrl(selectedChannel.url);

        if (!isValid) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
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
                    <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid YouTube URL</Text>
                    </View>
                );
            }
            return <YouTubeVideoPlayer videoId={videoId} />;
        }

        if (type === 'youtube-live') {
            const videoId = extractVideoId(selectedChannel.url);
            if (!videoId) {
                return (
                    <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid YouTube Live URL</Text>
                    </View>
                );
            }
            return <YouTubeLivePlayer videoId={videoId} />;
        }

        if (type === 'youtube-playlist') {
            const videoId = extractVideoId(selectedChannel.url);
            const playlistId = extractPlaylistId(selectedChannel.url);
            if (!videoId || !playlistId) {
                return (
                    <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">Invalid YouTube Playlist URL</Text>
                    </View>
                );
            }
            return <YouTubePlaylistPlayer videoId={videoId} playlistId={playlistId} />;
        }

        if (type === 'youtube-channel') {
            return <YouTubeChannelPlayer url={selectedChannel.url} />;
        }

        // expo-av Player for all non-YouTube streams
        return (
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
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
                        <Text className="text-white text-center mt-4 text-lg font-semibold">Stream Error</Text>
                        <Text className="text-gray-400 text-center mt-2 px-4 text-sm">
                            {errorMessage || 'Unable to load the stream'}
                        </Text>
                        {bothAttemptsFailed ? (
                            <Text className="text-orange-500 text-center mt-4 text-base font-semibold px-6">
                                Use remote control to switch channels
                            </Text>
                        ) : (
                            <>
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
                            </>
                        )}
                    </View>
                )}

                <Video
                    key={currentStreamUrl || 'stream'}
                    ref={videoRef}
                    source={getCurrentStreamUrl(selectedChannel, true)}
                    rate={1.0}
                    volume={1.0}
                    isMuted={false}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay
                    isLooping={false}
                    useNativeControls
                    style={{ width: '100%', height: PLAYER_HEIGHT }}
                    onLoad={() => {
                        setVideoLoading(false);
                        setVideoError(false);
                    }}
                    onError={(e) => {
                        setVideoError(true);
                        setVideoLoading(false);
                        let msg = 'Failed to load stream.';
                        if (e?.error?.code === -1100) msg = 'Network error. Check your connection.';
                        else if (e?.error?.domain === 'AVFoundationErrorDomain')
                            msg = 'Stream format not supported or unavailable.';
                        setErrorMessage(msg);
                        loadStream(selectedChannel, false);
                    }}
                    onLoadStart={() => setVideoLoading(true)}
                    onPlaybackStatusUpdate={(status) => {
                        if (status.isLoaded) {
                            if (status.isPlaying) {
                                setVideoLoading(false);
                                setVideoError(false);
                                setBothAttemptsFailed(false);
                            } else if (status.error) {
                                setVideoError(true);
                                setVideoLoading(false);
                                setErrorMessage(`Video Error: ${status.error}. Playback failed`);
                            }
                        }
                    }}
                />
                {selectedChannel && (
                    <Image
                        source={{ uri: selectedChannel.imageUrl }}
                        style={{
                            position: 'absolute',
                            bottom: 16,
                            right: 16,
                            width: 60,
                            height: 60,
                            opacity: 0.7,
                            zIndex: 10,
                        }}
                        resizeMode="contain"
                    />
                )}
            </View>
        );
    };

    const handleChannelChange = (channel) => {
        setSelectedChannel(channel);
        setVideoError(false);
        setVideoLoading(true);
        setBothAttemptsFailed(false);
        setProxyAttempted(false);

        const type = analyzeStreamUrl(channel.url);
        setUseProxy(!type.type.startsWith('youtube'));

        if (videoRef.current) {
            videoRef.current.unloadAsync().catch(console.error);
        }
    };

    const debouncedHandleChannelChange = useMemo(
        () => require('lodash.debounce')(handleChannelChange, 200),
        []
    );

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
        ]);
    };

    const handleWhatsAppLink = (number) => {
        const url = `https://wa.me/${number}`;
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open WhatsApp'));
    };

    const handleCustomLink = (url) => {
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open link'));
    };

    if (!user || !channels || channels.length === 0) {
        return (
            <View className="flex-1 bg-black items-center justify-center min-h-screen">
                <StatusBar barStyle="light-content" hidden />
                <Ionicons name="tv-outline" size={80} color="#6b7280" />
                <Text className="text-white text-xl font-semibold mt-4">No Channels Available</Text>
                <Text className="text-gray-400 mt-2">Please check your subscription</Text>
                <TouchableOpacity
                    className="mt-6 bg-orange-500 px-6 py-3 rounded-lg"
                    onPress={refreshChannels}
                    hasTVPreferredFocus={isTV}
                >
                    <Text className="text-white font-semibold">Refresh Channels</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const userPackage = getUserPackage();
    const daysRemaining = getDaysRemaining();

    return (
        <View className="flex-1 bg-black min-h-screen">
            <StatusBar barStyle="light-content" hidden />

            {/* Channel Number Input Overlay */}
            {channelNumberInput && (
                <View style={{
                    position: 'absolute',
                    top: 60,
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                    zIndex: 100,
                    pointerEvents: 'none'
                }}>
                    <View style={{
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        borderRadius: 16,
                        paddingHorizontal: 32,
                        paddingVertical: 18,
                        borderWidth: 2,
                        borderColor: '#f97316',
                    }}>
                        <Text style={{
                            color: '#fff',
                            fontSize: 48,
                            fontWeight: 'bold',
                            letterSpacing: 4,
                            textAlign: 'center',
                        }}>{channelNumberInput}</Text>
                        <Text style={{
                            color: '#f97316',
                            fontSize: 16,
                            textAlign: 'center',
                            marginTop: 4,
                        }}>Enter Channel Number</Text>
                    </View>
                </View>
            )}

            {/* FIXED: Safe video player container */}
            <View style={{ height: PLAYER_HEIGHT, width: '100%', minHeight: 240 }}>
                {renderVideoPlayer()}
            </View>

            {/* FIXED: Safe channels browser container */}
            <View style={{ height: '35%', width: '100%', minHeight: 200 }} className="bg-gray-900">
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
                    {channelsByLanguage.map((category, categoryIndex) => (
                        <View key={category.language} className="mb-4">
                            <View className="flex-row items-center justify-between px-6 mb-3">
                                <Text className={`text-lg font-bold ${isCategoryFocused && focusedCategory === categoryIndex
                                    ? 'bg-orange-500 px-2 rounded'
                                    : ''
                                    }`}>
                                    {category.language}
                                </Text>
                                <Text className="text-gray-500 text-sm">{category.channels.length} channels</Text>
                            </View>
                            <FlatList
                                data={category.channels}
                                keyExtractor={(item) => item.id ? String(item.id) : String(item.lcn)}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 24 }}
                                renderItem={({ item: channel, index: channelIndex }) => {
                                    const isFocused = focusedCategory === categoryIndex && focusedChannelIndex === channelIndex;
                                    const isPlaying = selectedChannel?.id === channel.id;
                                    return (
                                        <TouchableOpacity
                                            key={channel.id}
                                            className={`mr-4 rounded-lg p-3 ${isPlaying
                                                ? 'bg-orange-500'
                                                : isFocused
                                                    ? 'bg-gray-700 border-2 border-orange-500'
                                                    : 'bg-gray-800'
                                                }`}
                                            style={{ width: 140 }}
                                            onPress={() => debouncedHandleChannelChange(channel)}
                                            hasTVPreferredFocus={categoryIndex === 0 && channelIndex === 0 && isTV}
                                        >
                                            {(() => {
                                                const thumb = channel.imageUrl || channel.logo || channel.image || channel.thumbnail || channel.poster || channel.thumb || null;
                                                return thumb ? (
                                                    <Image
                                                        source={{ uri: thumb }}
                                                        style={{ width: 100, height: 84, borderRadius: 8, marginBottom: 8, backgroundColor: '#111' }}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View style={{ width: 100, height: 84, borderRadius: 8, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                                        <Ionicons name="tv-outline" size={36} color="#6b7280" />
                                                    </View>
                                                );
                                            })()}
                                            <View className="flex-row items-center justify-between mb-2">
                                                <View className={`px-2 py-1 rounded ${isPlaying ? 'bg-white/20' : 'bg-gray-700'
                                                    }`}>
                                                    <Text className={`text-xs font-bold ${isPlaying ? 'text-white' : 'text-gray-300'
                                                        }`}>
                                                        {channel.lcn}
                                                    </Text>
                                                </View>
                                                {isPlaying && (
                                                    <Ionicons name="play-circle" size={20} color="white" />
                                                )}
                                            </View>
                                            <Text className={`font-semibold ${isPlaying ? 'text-white' : 'text-gray-200'}`} numberOfLines={2} style={{ fontSize: 13 }}>
                                                {channel.name}
                                            </Text>
                                            <Text className={`text-xs mt-1 ${isPlaying ? 'text-white/70' : 'text-gray-400'}`}>
                                                {channel.genre?.name || 'General'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                }}
                                initialNumToRender={6}
                                windowSize={3}
                                removeClippedSubviews={true}
                            />
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Channel Info Overlay */}
            {selectedChannel && (
                <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                            <View className="flex-row items-center mb-2">
                                <View className="bg-orange-500 px-3 py-1 rounded mr-3">
                                    <Text className="text-white font-bold text-sm">LCN {selectedChannel.lcn}</Text>
                                </View>
                                <Text className="text-white text-2xl font-bold flex-1" numberOfLines={1}>
                                    {selectedChannel.name}
                                </Text>
                            </View>
                            <Text className="text-gray-300 text-sm">
                                {selectedChannel.language?.name} {selectedChannel.genre?.name}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowRecommendations(!showRecommendations)}
                            className="bg-gray-800/80 p-3 rounded-full"
                        >
                            <Ionicons
                                name={showRecommendations ? "eye-off" : "eye"}
                                size={28}
                                color="#f97316"
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Recommendations Section */}
            {showRecommendations && (
                <View className="absolute bottom-40 left-0 right-0 bg-black/90 p-4 z-20">
                    <TouchableOpacity
                        onPress={() => setShowRecommendations(false)}
                        className="absolute top-2 right-2 p-2"
                    >
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-lg font-bold mb-3">Recommended Channels</Text>
                </View>
            )}

            {/* User Info Modal */}
            <Modal
                visible={showUserInfo}
                animationType="slide"
                transparent
                onRequestClose={() => setShowUserInfo(false)}
            >
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

                            <View className="bg-gray-800 rounded-xl p-4 mb-4 mt-4">
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
        </View>
    );
}
