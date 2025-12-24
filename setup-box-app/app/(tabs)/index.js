import 'react-native-css-interop/dist/runtime';
import '../globals.css';
import React, { useState, useRef, useMemo, useEffect } from 'react';
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
    TextInput,
    Platform,
    Dimensions,
} from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/authContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Video, ResizeMode  } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
// Lazy / guarded import for optional native module `react-native-youtube-bridge`
let YoutubeView = null;
let useYouTubePlayer = null;
let useYouTubeEvent = null;
try {
    // try require to avoid build-time crash if native module is missing in dev client
    // support both ESM and CJS shapes
    const _yt = require('react-native-youtube-bridge');
    YoutubeView = _yt?.YoutubeView || _yt?.default || _yt;
    useYouTubePlayer = _yt?.useYouTubePlayer || null;
    useYouTubeEvent = _yt?.useYouTubeEvent || null;
} catch (e) {
    console.warn('react-native-youtube-bridge not available:', e?.message || e);
}
import debounce from 'lodash.debounce';
let TVEventHandler = null;
try {
    TVEventHandler = require('react-native').TVEventHandler;
} catch (e) {
    TVEventHandler = null;
}

function assertDefined(name, value) {
    if (value === undefined || value === null) {
        // Warn instead of throwing so the app won't crash during startup
        console.warn(`${name} is undefined at runtime in ChannelsScreen`);
    }
}

function startLiveTranscode(channel, inputUrl) {
    const channelDir = path.join(LIVE_HLS_DIR, channel);
    if (!fs.existsSync(channelDir)) fs.mkdirSync(channelDir, { recursive: true });

    // Prevent multiple FFmpeg processes for the same channel
    const lockFile = path.join(channelDir, 'ffmpeg.lock');
    if (fs.existsSync(lockFile)) return;

    fs.writeFileSync(lockFile, 'running');

    const ffmpeg = spawn('ffmpeg', [
        '-i', inputUrl,                // <-- your live stream URL here
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-f', 'hls',
        '-hls_time', '6',
        '-hls_list_size', '6',
        '-hls_flags', 'delete_segments',
        '-hls_segment_filename', `${channelDir}/segment_%03d.ts`,
        `${channelDir}/output.m3u8`
    ]);

    ffmpeg.stderr.on('data', data => console.log(`[FFmpeg ${channel}]: ${data}`));
    ffmpeg.on('close', code => {
        console.log(`[FFmpeg ${channel}] exited with code ${code}`);
        fs.unlinkSync(lockFile);
    });
}

    assertDefined('Ionicons', Ionicons);
    // Optional native modules are guarded; do not crash if missing
    assertDefined('YoutubeView', YoutubeView);
    assertDefined('useYouTubePlayer', useYouTubePlayer);
    assertDefined('useYouTubeEvent', useYouTubeEvent);
if (Platform.isTV && TVEventHandler) {
    assertDefined('TVEventHandler', TVEventHandler);
}

// Player height scales to 65% of the window height so it fits large TV screens
const windowHeight = Dimensions.get('window').height;
const PLAYER_HEIGHT = Math.max(240, Math.floor(windowHeight * 0.65)); // min fallback

export default function Index() {
        // Prefetch stream when channel is focused (not playing)
        useEffect(() => {
            if (!channelsByLanguage || channelsByLanguage.length === 0) return;
            const currentCategory = channelsByLanguage[focusedCategory];
            if (!currentCategory) return;
            const channel = currentCategory.channels[focusedChannelIndex];
            if (!channel) return;
            const isPlaying = selectedChannel?._id === channel._id;
            if (!isPlaying) {
                const { type } = analyzeStreamUrl(channel.url);
                if (!type.startsWith('youtube')) {
                    let urlToPrefetch = (serverInfo?.proxyEnabled && channel.proxyUrl) ? channel.proxyUrl : channel.url;
                    fetch(urlToPrefetch, { method: 'GET', headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Referer': channel.url.split('/').slice(0, 3).join('/') + '/',
                        'Origin': channel.url.split('/').slice(0, 3).join('/'),
                        'Accept': '*/*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Accept-Encoding': 'identity',
                        'Connection': 'keep-alive'
                    }}).catch(() => {});
                }
            }
        }, [focusedCategory, focusedChannelIndex, channelsByLanguage, selectedChannel, serverInfo]);
    console.log('Platform.isTV:', Platform.isTV);
    const { channels, user, packagesList, serverInfo, logout, refreshChannels, refreshing } = useAuth();

    const [selectedChannel, setSelectedChannel] = useState(null);
    const [showChannelList, setShowChannelList] = useState(false);
    const [showUserInfo, setShowUserInfo] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [useProxy, setUseProxy] = useState(true);
    const [proxyAttempted, setProxyAttempted] = useState(false);
    const [bothAttemptsFailed, setBothAttemptsFailed] = useState(false);
    const [currentStreamUrl, setCurrentStreamUrl] = useState('');
    const [focusedCategory, setFocusedCategory] = useState(0);
    const [focusedChannelIndex, setFocusedChannelIndex] = useState(0);
    const [isCategoryFocused, setIsCategoryFocused] = useState(true);
    const [channelNumberInput, setChannelNumberInput] = useState('');
    const channelNumberTimeout = useRef(null);

    const videoRef = useRef(null);
    const tvEventHandler = useRef(null);
    const lastProbeKeyRef = useRef({ key: null, ts: 0 });
    const lastRecoverKeyRef = useRef({ key: null, ts: 0 });

    const safeStringify = (value) => {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return String(value);
        }
    };

    const probeHlsStream = async (uri, headers = {}) => {
        // Avoid spamming logs for the same URL, but allow re-probe after a short time
        const probeKey = `${uri}`;
        const now = Date.now();
        if (lastProbeKeyRef.current.key === probeKey && now - lastProbeKeyRef.current.ts < 8000) return;
        lastProbeKeyRef.current = { key: probeKey, ts: now };

        try {
            console.log('[HLS Probe] start', { uri });
            const res = await fetch(uri, { method: 'GET', headers });
            const contentType = res.headers?.get?.('content-type');
            const text = await res.text();
            const head = text.slice(0, 400);
            const firstLines = text.split(/\r?\n/).slice(0, 12);

            console.log('[HLS Probe] playlist', {
                status: res.status,
                contentType,
                startsWithExtM3U: head.includes('#EXTM3U'),
                firstLines,
            });

            // Try to locate first segment and probe it
            const segmentLine = firstLines.find((l) => l && !l.startsWith('#'));
            if (!segmentLine) return;

            let segmentUrl = segmentLine.trim();
            if (!/^https?:\/\//i.test(segmentUrl)) {
                const base = uri.split('/').slice(0, -1).join('/') + '/';
                segmentUrl = base + segmentUrl.replace(/^\.\//, '');
            }

            const segRes = await fetch(segmentUrl, { method: 'GET', headers });
            const segType = segRes.headers?.get?.('content-type');
            console.log('[HLS Probe] first-segment', {
                segmentUrl: segmentUrl.slice(0, 120),
                status: segRes.status,
                contentType: segType,
            });
        } catch (e) {
            console.log('[HLS Probe] error', e?.message || safeStringify(e));
        }
    };

    const maybeRecoverStream = (currentUri, currentHeaders) => {
        if (!currentUri) return;
        const key = `${currentUri}`;
        const now = Date.now();
        if (lastRecoverKeyRef.current.key === key && now - lastRecoverKeyRef.current.ts < 5000) {
            return;
        }
        lastRecoverKeyRef.current = { key, ts: now };

        // Proxy URLs are like /api/proxy/m3u8?url=... (no .m3u8 extension on the path)
        if (typeof currentUri === 'string' && currentUri.toLowerCase().includes('m3u8')) {
            probeHlsStream(currentUri, currentHeaders || {});
        }

        handleStreamError();
    };

    // Group channels by language
    const channelsByLanguage = useMemo(() => {
        if (!channels || channels.length === 0) return [];

        const grouped = channels.reduce((acc, channel) => {
            const lang = channel.language?.name || 'Other';
            if (!acc[lang]) {
                acc[lang] = [];
            }
            acc[lang].push(channel);
            return acc;
        }, {});

        Object.keys(grouped).forEach(lang => {
            grouped[lang].sort((a, b) => (a.lcn || 999999) - (b.lcn || 999999));
        });

        return Object.entries(grouped).map(([language, channels]) => ({
            language,
            channels
        }));
    }, [channels]);

    // Auto-start default channel (if set) or fallback on mount
    useEffect(() => {
        if (!packagesList || !user?.package || !channels || channels.length === 0) return;
        const userPackage = packagesList.find(pkg => pkg._id === user.package);
        let defaultChannel = null;
        if (userPackage) {
            // Try defaultChannelId
            if (userPackage.defaultChannelId) {
                defaultChannel = channels.find(c => c._id === (userPackage.defaultChannelId._id || userPackage.defaultChannelId));
            }
            // Fallback: lowest LCN in package
            if (!defaultChannel && userPackage.channels && userPackage.channels.length > 0) {
                const packageChannels = channels.filter(c => userPackage.channels.includes(c._id));
                if (packageChannels.length > 0) {
                    defaultChannel = packageChannels.reduce((min, c) => (c.lcn < min.lcn ? c : min), packageChannels[0]);
                }
            }
        }
        // Final fallback: first channel in all channels
        if (!defaultChannel && channels.length > 0) {
            defaultChannel = channels[0];
        }
        if (defaultChannel) {
            handleChannelChange(defaultChannel);
        }
    }, [channels, packagesList, user?.package]);

    // TV Remote Control Handler
    useEffect(() => {
        if (TVEventHandler && typeof TVEventHandler === 'function') {
            tvEventHandler.current = new TVEventHandler();
            tvEventHandler.current.enable(null, (component, evt) => {
                // Number key input
                if (evt && evt.eventType === 'keyDown' && evt.eventKeyAction === 0 && /^[0-9]$/.test(evt.eventKey)) {
                    handleChannelNumberInput(evt.eventKey);
                    return;
                }
                // OK/Select button toggles channel list overlay
                if (evt && evt.eventType === 'select') {
                    setShowChannelList((prev) => !prev);
                    return;
                }
                // Navigation keys
                if (showChannelList) {
                    if (evt && evt.eventType === 'right') {
                        // Next channel in current category
                        const currentCategory = channelsByLanguage[focusedCategory];
                        if (currentCategory && focusedChannelIndex < currentCategory.channels.length - 1) {
                            setFocusedChannelIndex(focusedChannelIndex + 1);
                        }
                    } else if (evt && evt.eventType === 'left') {
                        // Previous channel in current category
                        if (focusedChannelIndex > 0) {
                            setFocusedChannelIndex(focusedChannelIndex - 1);
                        }
                    } else if (evt && evt.eventType === 'down') {
                        // Next category
                        if (focusedCategory < channelsByLanguage.length - 1) {
                            setFocusedCategory(focusedCategory + 1);
                            setFocusedChannelIndex(0);
                        }
                    } else if (evt && evt.eventType === 'up') {
                        // Previous category
                        if (focusedCategory > 0) {
                            setFocusedCategory(focusedCategory - 1);
                            setFocusedChannelIndex(0);
                        }
                    } else if (evt && evt.eventType === 'menu') {
                        setShowUserInfo(true);
                    } else if (evt && evt.eventType === 'back') {
                        setShowChannelList(false);
                    }
                } else {
                    // When channel list is not open, allow quick next/prev channel
                    if (evt && evt.eventType === 'right') {
                        handleNavigateRight();
                    } else if (evt && evt.eventType === 'left') {
                        handleNavigateLeft();
                    } else if (evt && evt.eventType === 'up') {
                        handleNavigateUp();
                    } else if (evt && evt.eventType === 'down') {
                        handleNavigateDown();
                    } else if (evt && evt.eventType === 'menu') {
                        setShowUserInfo(true);
                    } else if (evt && evt.eventType === 'back') {
                        if (!isCategoryFocused) setIsCategoryFocused(true);
                    }
                }
            });
            return () => {
                if (tvEventHandler.current) {
                    tvEventHandler.current.disable();
                }
            };
        }
    }, [isCategoryFocused, focusedCategory, focusedChannelIndex, channelsByLanguage, showChannelList]);

    const handleNavigateRight = () => {
        const currentCategory = channelsByLanguage[focusedCategory];
        if (currentCategory && focusedChannelIndex < currentCategory.channels.length - 1) {
            const nextIndex = focusedChannelIndex + 1;
            setFocusedChannelIndex(nextIndex);
            const nextChannel = currentCategory.channels[nextIndex];
            if (nextChannel) {
                debouncedHandleChannelChange(nextChannel);
            }
        }
    };

    const handleNavigateLeft = () => {
        const currentCategory = channelsByLanguage[focusedCategory];
        if (currentCategory && focusedChannelIndex > 0) {
            const prevIndex = focusedChannelIndex - 1;
            setFocusedChannelIndex(prevIndex);
            const prevChannel = currentCategory.channels[prevIndex];
            if (prevChannel) {
                debouncedHandleChannelChange(prevChannel);
            }
        }
    };
    // Channel List Overlay
    const renderChannelListOverlay = () => {
        if (!showChannelList) return null;
        return (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,10,0.96)', zIndex: 100, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: '90%', maxHeight: '80%', backgroundColor: '#18181b', borderRadius: 18, padding: 16 }}>
                    <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>Channel List</Text>
                    <ScrollView style={{ maxHeight: 400 }}>
                        {channelsByLanguage.map((category, catIdx) => (
                            <View key={category.language} style={{ marginBottom: 16 }}>
                                <Text style={{ color: focusedCategory === catIdx ? '#f97316' : '#fff', fontWeight: 'bold', fontSize: 18, marginBottom: 6 }}>{category.language}</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                    {category.channels.map((channel, chIdx) => {
                                        const isFocused = focusedCategory === catIdx && focusedChannelIndex === chIdx;
                                        const isPlaying = selectedChannel?._id === channel._id;
                                        return (
                                            <View key={channel._id} style={{ margin: 4 }}>
                                                <TouchableOpacity
                                                    style={{
                                                        backgroundColor: isPlaying ? '#f97316' : isFocused ? '#333' : '#222',
                                                        borderRadius: 8,
                                                        padding: 10,
                                                        minWidth: 120,
                                                        borderWidth: isFocused ? 2 : 0,
                                                        borderColor: isFocused ? '#f97316' : 'transparent',
                                                    }}
                                                    onPress={() => {
                                                        setShowChannelList(false);
                                                        setFocusedCategory(catIdx);
                                                        setFocusedChannelIndex(chIdx);
                                                        debouncedHandleChannelChange(channel);
                                                    }}
                                                >
                                                    <Text style={{ color: '#fff', fontWeight: isPlaying ? 'bold' : 'normal', fontSize: 16 }}>{channel.name}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                    <Text style={{ color: '#aaa', fontSize: 14, marginTop: 10 }}>Use arrow keys to navigate, OK to close, Back to exit</Text>
                </View>
            </View>
        );
    };

    // const handleNavigateDown = () => {
    //     if (focusedCategory < channelsByLanguage.length - 1) {
    //         setFocusedCategory(focusedCategory + 1);
    //         setFocusedChannelIndex(0);
    //     }
    // };
    const handleNavigateDown = () => {
    if (isCategoryFocused) {
        if (focusedCategory < channelsByLanguage.length - 1) {
            setFocusedCategory(focusedCategory + 1);
        }
    } else {
        // setFocusedCategory(focusedCategory + 1);
        //     setFocusedChannelIndex(0);
        // Move to next category and focus its first channel
        if (focusedCategory < channelsByLanguage.length - 1) {
            setFocusedCategory(focusedCategory + 1);
            setFocusedChannelIndex(0);
            // Optionally: auto-play first channel in new category
            const nextCategory = channelsByLanguage[focusedCategory + 1];
            if (nextCategory && nextCategory.channels[0]) {
                debouncedHandleChannelChange(nextCategory.channels[0]);
            }
        }
    }
};

        const handleNavigateUp = () => {
        if (isCategoryFocused) {
            if (focusedCategory > 0) {
                setFocusedCategory(focusedCategory - 1);
            }
        } else {
            // Move to previous category and focus its first channel
            if (focusedCategory > 0) {
                setFocusedCategory(focusedCategory - 1);
                setFocusedChannelIndex(0);
                // Optionally: auto-play first channel in new category
                const prevCategory = channelsByLanguage[focusedCategory - 1];
                if (prevCategory && prevCategory.channels[0]) {
                    debouncedHandleChannelChange(prevCategory.channels[0]);
                }
            }
        }
    };

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                refreshChannels();
            }
        });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }, []);

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
        if (urlLower.includes('hls')) return { type: 'hls', isValid: true };
        if (urlLower.includes('.mp4')) return { type: 'mp4', isValid: true };
        if (urlLower.match(/\.(mp4|m4v|mov)\?/)) return { type: 'mp4', isValid: true };
        if (urlLower.includes('.mkv')) return { type: 'mkv', isValid: true };
        if (url.match(/:\d{4}/)) return { type: 'iptv', isValid: true };
        if (url.match(/live/)) return { type: 'iptv', isValid: true };
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
        if (!selectedChannel) return null;
        const { type: originalType } = analyzeStreamUrl(selectedChannel.url);

        if (originalType.startsWith('youtube')) {
            return { uri: selectedChannel.url };
        }

        // Adaptive: try to use lower-quality stream if available
        let baseUrl = useProxy && selectedChannel.proxyUrl && serverInfo?.proxyEnabled
            ? selectedChannel.proxyUrl
            : selectedChannel.url;

        // If channel has a 'lowQualityUrl' property, use it if loading is slow or user requests
        if (selectedChannel.lowQualityUrl && videoLoading) {
            baseUrl = selectedChannel.lowQualityUrl;
        }

        const { type: resolvedType } = analyzeStreamUrl(baseUrl);

        console.log('[Stream Load]', {
            channelName: selectedChannel.name,
            streamType: resolvedType,
            isProxy: useProxy && !!selectedChannel.proxyUrl,
            finalUrl: baseUrl.substring(0, 100),
        });

        const source = {
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

        // On Android, ExoPlayer infers HLS mainly via file extension.
        // Proxy endpoints like /api/proxy/m3u8?url=... don't end with .m3u8, so inference can fail.
        const looksLikeProxyM3u8 =
            typeof baseUrl === 'string' &&
            (baseUrl.includes('/proxy/m3u8') || baseUrl.includes('proxy/m3u8') || baseUrl.includes('m3u8?'));

        if (Platform.OS === 'android' && (resolvedType === 'hls' || looksLikeProxyM3u8)) {
            source.overrideFileExtensionAndroid = 'm3u8';
        }

        return source;
    };

    // Enhanced: Pre-validate stream URL before playback for non-YouTube streams
    useEffect(() => {
        // Always attempt playback, even if validation fails, and ensure error overlays are shown
        const validateAndPlay = async () => {
            setVideoError(false);
            setVideoLoading(true);
            setErrorMessage("");
            setBothAttemptsFailed(false);
            if (!selectedChannel) return;
            const { type } = analyzeStreamUrl(selectedChannel.url);
            // For YouTube, skip validation
            if (type.startsWith('youtube')) {
                setCurrentStreamUrl(selectedChannel.url);
                setVideoLoading(false);
                return;
            }
            // For HLS/other streams, try to validate, but always attempt playback
            let urlToPlay = useProxy && selectedChannel.proxyUrl && serverInfo?.proxyEnabled
                ? selectedChannel.proxyUrl
                : selectedChannel.url;
            setCurrentStreamUrl(urlToPlay);
            try {
                // Try to fetch the playlist (GET, not HEAD)
                const res = await fetch(urlToPlay, { method: 'GET', headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': selectedChannel.url.split('/').slice(0, 3).join('/') + '/',
                    'Origin': selectedChannel.url.split('/').slice(0, 3).join('/'),
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Accept-Encoding': 'identity',
                    'Connection': 'keep-alive'
                }});
                if (!res.ok) {
                    // Show error, but still try playback
                    setErrorMessage(`Stream URL responded with status ${res.status}. Attempting playback anyway.`);
                }
            } catch (e) {
                // Show error, but still try playback
                setErrorMessage('Could not validate stream URL. Attempting playback anyway.');
            }
            setVideoLoading(false);
        };
        validateAndPlay();
    }, [useProxy, selectedChannel]);

    useEffect(() => {
        return () => {
            // Cleanup on component unmount
            // if (videoRef.current) {
            //     videoRef.current.unloadAsync().catch(() => {
            //         console.log('Error unloading video on unmount');
            //     });
            // }

            // Also reset state
            setSelectedChannel(null);
            setVideoLoading(false);
            setVideoError(false);
        };
    }, []);

    const handleStreamError = () => {
        // Only toggle proxy if it will actually change the URL.
        const canUseProxyUrl = !!(serverInfo?.proxyEnabled && selectedChannel?.proxyUrl);
        const wouldChangeUrl = canUseProxyUrl; // proxy toggle affects base URL only if proxyUrl exists

        if (!proxyAttempted && wouldChangeUrl) {
            setProxyAttempted(true);
            setUseProxy((prev) => !prev);
            setVideoError(false);
            setVideoLoading(true);
            return;
        }

        setBothAttemptsFailed(true);
        setVideoError(true);
        setVideoLoading(false);
        setErrorMessage(
            wouldChangeUrl
                ? 'Unable to load stream with both proxy and direct connection. Please switch to another channel.'
                : 'Unable to load stream. This URL may be blocked, expired, or not a valid HLS stream.'
        );
    };

    // Use refs for player instance and playing state to avoid stale closures and re-renders
    const ytPlayerRef = useRef(null);
    const ytIsPlayingRef = useRef(true);
    const [ytForceUpdate, setYtForceUpdate] = useState(0); // for triggering rerender if needed
    const YouTubeVideoPlayer = ({ videoId }) => {
        const player = useYouTubePlayer(videoId, {
            autoplay: true,
            muted: false,
            controls: true,
            playsinline: true,
            rel: false,
            modestbranding: true,
            quality: 'hd1080',
        });

        useEffect(() => {
            ytPlayerRef.current = player;
        }, [player]);

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

        useYouTubeEvent(player, 'stateChange', (event) => {
            // 1 = playing, 2 = paused
            ytIsPlayingRef.current = event.data === 1;
            setYtForceUpdate(x => x + 1); // force rerender if needed
        });

        return (
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                <YoutubeView player={player} style={{ width: '100%', height: 260 }} />
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
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                <View className="absolute top-3 left-3 z-10 bg-red-600 px-3 py-1.5 rounded-full flex-row items-center">
                    <View className="w-2 h-2 bg-white rounded-full mr-2" />
                    <Text className="text-white text-xs font-bold">LIVE</Text>
                </View>
                <YoutubeView player={player} style={{ width: '100%', height: 260 }} />
            </View>
        );
    };


        const handleChannelNumberInput = (digit) => {
            setChannelNumberInput(prev => {
                const newInput = prev + digit;
                // Reset timer
                if (channelNumberTimeout.current) clearTimeout(channelNumberTimeout.current);
                channelNumberTimeout.current = setTimeout(() => {
                    playChannelByNumber(newInput);
                    setChannelNumberInput('');
                }, 1000); 
                return newInput;
            });
        };

        const playChannelByNumber = (numberStr) => {
            const lcn = parseInt(numberStr, 10);
            if (isNaN(lcn)) return;
            for (let catIdx = 0; catIdx < channelsByLanguage.length; catIdx++) {
                const category = channelsByLanguage[catIdx];
                const chIdx = category.channels.findIndex(ch => ch.lcn === lcn);
                if (chIdx !== -1) {
                    setFocusedCategory(catIdx);
                    setFocusedChannelIndex(chIdx);
                    setIsCategoryFocused(false);
                    debouncedHandleChannelChange(category.channels[chIdx]);
                    return;
                }
            }
            setErrorMessage(`Channel ${lcn} not found`);
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
            <View className="w-full bg-black relative" style={{ height: PLAYER_HEIGHT }}>
                <YoutubeView player={player} style={{ width: '100%', height: 260 }} />
                <View className="absolute top-3 left-3 z-10 bg-purple-600 px-3 py-1.5 rounded-lg">
                    <Text className="text-white text-xs font-bold">PLAYLIST</Text>
                </View>
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
            <TouchableOpacity
                className="mt-6 bg-orange-500 px-6 py-3 rounded-lg"
                onPress={() => Linking.openURL(url)}
            >
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

    useEffect(() => {
        if (TVEventHandler && typeof TVEventHandler === 'function') {
            tvEventHandler.current = new TVEventHandler();
            tvEventHandler.current.enable(null, (component, evt) => {
                // Number key input
                if (evt && evt.eventType === 'keyDown' && evt.eventKeyAction === 0 && /^[0-9]$/.test(evt.eventKey)) {
                    handleChannelNumberInput(evt.eventKey);
                    return;
                }
                // OK/Select button
                if (evt && evt.eventType === 'select') {
                    // If YouTube channel is selected and player is ready, toggle play/pause
                    const currentChannel = channelsByLanguage[focusedCategory]?.channels[focusedChannelIndex];
                    const isYouTube = currentChannel && analyzeStreamUrl(currentChannel.url).type.startsWith('youtube');
                    if (isYouTube && ytPlayerRef.current) {
                        if (ytIsPlayingRef.current && ytPlayerRef.current.pauseVideo) {
                            ytPlayerRef.current.pauseVideo();
                        } else if (!ytIsPlayingRef.current && ytPlayerRef.current.playVideo) {
                            ytPlayerRef.current.playVideo();
                        }
                        return;
                    }
                    setShowChannelList((prev) => !prev);
                    return;
                }
                // Navigation keys
                if (showChannelList) {
                    if (evt && evt.eventType === 'right') {
                        // Next channel in current category
                        const currentCategory = channelsByLanguage[focusedCategory];
                        if (currentCategory && focusedChannelIndex < currentCategory.channels.length - 1) {
                            setFocusedChannelIndex(focusedChannelIndex + 1);
                        }
                    } else if (evt && evt.eventType === 'left') {
                        // Previous channel in current category
                        if (focusedChannelIndex > 0) {
                            setFocusedChannelIndex(focusedChannelIndex - 1);
                        }
                    } else if (evt && evt.eventType === 'down') {
                        // Next category
                        if (focusedCategory < channelsByLanguage.length - 1) {
                            setFocusedCategory(focusedCategory + 1);
                            setFocusedChannelIndex(0);
                        }
                    } else if (evt && evt.eventType === 'up') {
                        // Previous category
                        if (focusedCategory > 0) {
                            setFocusedCategory(focusedCategory - 1);
                            setFocusedChannelIndex(0);
                        }
                    } else if (evt && evt.eventType === 'menu') {
                        setShowUserInfo(true);
                    } else if (evt && evt.eventType === 'back') {
                        setShowChannelList(false);
                    }
                } else {
                    // When channel list is not open, allow quick next/prev channel
                    if (evt && evt.eventType === 'right') {
                        handleNavigateRight();
                    } else if (evt && evt.eventType === 'left') {
                        handleNavigateLeft();
                    } else if (evt && evt.eventType === 'up') {
                        handleNavigateUp();
                    } else if (evt && evt.eventType === 'down') {
                        handleNavigateDown();
                    } else if (evt && evt.eventType === 'menu') {
                        setShowUserInfo(true);
                    } else if (evt && evt.eventType === 'back') {
                        if (!isCategoryFocused) setIsCategoryFocused(true);
                    }
                }
            });
            return () => {
                if (tvEventHandler.current) {
                    tvEventHandler.current.disable();
                }
            };
        }
    }, [isCategoryFocused, focusedCategory, focusedChannelIndex, channelsByLanguage, showChannelList]);
    // --- RENDER VIDEO PLAYER FUNCTION ---
    const renderVideoPlayer = () => {
        if (!selectedChannel) return (
            <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 18 }}>No channel selected</Text>
            </View>
        );
        const { type, videoId, playlistId } = analyzeStreamUrl(selectedChannel.url);

        if (type === 'youtube-video' || type === 'youtube-live') {
            return (
                <>
                    {renderStreamTypeBadge(type)}
                    <YouTubeVideoPlayer videoId={videoId} />
                </>
            );
        }
        if (type === 'youtube-playlist') {
            if (!playlistId) {
                return (
                    <View className="w-full bg-black items-center justify-center" style={{ height: PLAYER_HEIGHT }}>
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
        // expo-av Player for all non-YouTube streams
        // Ensure currentUrl is always a valid object for Video source
        let videoSource = currentStreamUrl;
        if (!videoSource) {
            videoSource = {
                uri: selectedChannel.url,
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                },
            };
        } else if (typeof videoSource === 'string') {
            // If currentStreamUrl is a string, treat as uri
            videoSource = {
                uri: videoSource,
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                },
            };
        }
        return (
            <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: 'black', position: 'relative' }}>
                {renderStreamTypeBadge(type)}

                {videoLoading && (
                    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                        <ActivityIndicator size="large" color="#f97316" />
                    </View>
                )}

                {(videoError || errorMessage) && (
                    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text style={{ color: 'white', textAlign: 'center', marginTop: 16, fontSize: 18, fontWeight: 'bold' }}>
                            Stream Error
                        </Text>
                        <Text style={{ color: '#ccc', textAlign: 'center', marginTop: 8, fontSize: 14 }}>
                            {errorMessage || 'Unable to load the stream'}
                        </Text>
                        {bothAttemptsFailed && (
                            <Text style={{ color: '#f97316', textAlign: 'center', marginTop: 16, fontSize: 16, fontWeight: 'bold', paddingHorizontal: 24 }}>
                                Use remote control to switch channels
                            </Text>
                        )}
                    </View>
                )}

                {console.log('video props debug', { uri: videoSource?.uri, currentStreamUrlType: typeof currentStreamUrl })}
                <Video
                    ref={videoRef}
                    source={videoSource}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    useNativeControls={false}
                    resizeMode="cover"
                    shouldPlay={true}
                    isLooping={false}
                    bufferConfig={{
                        minBufferMs: 500.5,
                        maxBufferMs: 8000.5,
                        bufferForPlaybackMs: 500.5,
                        bufferForPlaybackAfterRebufferMs: 400.5,
                    }}
                    // Force fractional values to ensure bridge sends Doubles on Android
                    progressUpdateIntervalMillis={250.5}
                    positionMillis={0.1}
                    rate={1.01}
                    volume={1.01}
                    onLoadStart={() => setVideoLoading(true)}
                    onReadyForDisplay={() => {
                        setVideoLoading(false);
                        // Try explicit play in case shouldPlay doesn't start in release builds
                        if (videoRef.current && videoRef.current.playAsync) {
                            videoRef.current.playAsync().catch((err) => {
                                console.warn('playAsync failed onReadyForDisplay', err);
                            });
                        }
                    }}
                    onError={e => {
                        console.warn('Video onError', e);
                        // Automatic fallback: if proxy was used, try direct connection; else, show error
                        if (!proxyAttempted && useProxy && selectedChannel?.proxyUrl && serverInfo?.proxyEnabled) {
                            setProxyAttempted(true);
                            setUseProxy(false);
                            setVideoError(false);
                            setVideoLoading(true);
                            setErrorMessage('');
                        } else {
                            setVideoError(true);
                            setVideoLoading(false);
                            setErrorMessage('Unable to load the stream. This URL may be blocked, expired, or not a valid HLS stream.');
                            setBothAttemptsFailed(true);
                        }
                    }}
                    onPlaybackStatusUpdate={status => {
                        if (status.isLoaded) {
                            if (!status.isPlaying && !status.isBuffering && videoRef.current?.playAsync) {
                                videoRef.current.playAsync().catch(() => {});
                            }
                            if (status.isPlaying) {
                                setVideoLoading(false);
                            }
                        }
                    }}
                />

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
            </View>
        );
    };

    const handleChannelChange = (channel) => {
        setSelectedChannel(channel);
        setVideoError(false);
        setVideoLoading(true);
        setBothAttemptsFailed(false);
        setProxyAttempted(false);

        const { type } = analyzeStreamUrl(channel.url);
        setUseProxy(!type.startsWith('youtube'));

        console.log('[Channel Change]', { lcn: channel.lcn, name: channel.name, useProxy: !type.startsWith('youtube') });

        // Force playback shortly after changing channel to improve reliability in release builds
        setTimeout(() => {
            if (videoRef.current && videoRef.current.playAsync) {
                videoRef.current.playAsync().catch(err => {
                    console.warn('playAsync failed after channel change', err);
                });
            }
        }, 600);

        // if (videoRef.current) {
        //     videoRef.current.unloadAsync().catch(() => { });
        // }
    };

    const debouncedHandleChannelChange = useMemo(
    () => debounce(handleChannelChange, 200),
    []
);

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

    const handleWhatsAppLink = (number) => {
        const url = `https://wa.me/${number}`;
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Unable to open WhatsApp');
        });
    };

    const handleCustomLink = (url) => {
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Unable to open link');
        });
    };

    // --- ADD THIS DEBUG BLOCK AT THE TOP OF THE COMPONENT, after useAuth() ---
    useEffect(() => {
        console.log('DEBUG user:', user);
        console.log('DEBUG channels:', channels);
        console.log('DEBUG packagesList:', packagesList);
        console.log('DEBUG serverInfo:', serverInfo);
    }, [user, channels, packagesList, serverInfo]);

    // --- ADD THIS BLOCK BEFORE THE MAIN RETURN STATEMENT ---
    if (!user && !user?.name) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 20, marginBottom: 10 }}>User not loaded</Text>
                <Text style={{ color: 'gray', fontSize: 14, marginBottom: 10 }}>Check authentication and API</Text>
                <Text style={{ color: 'gray', fontSize: 14 }}>Auth state: {JSON.stringify({ user, channels, packagesList, serverInfo })}</Text>
            </View>
        );
    }
    if (!channels || channels.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 20, marginBottom: 10 }}>No Channels Loaded</Text>
                <Text style={{ color: 'gray', fontSize: 14, marginBottom: 10 }}>Check channel API and network</Text>
                <Text style={{ color: 'gray', fontSize: 14 }}>Auth state: {JSON.stringify({ user, channels, packagesList, serverInfo })}</Text>
            </View>
        );
    }

    const userPackage = getUserPackage();
    const daysRemaining = getDaysRemaining();

    return (
        <View className="flex-1 bg-black">
            {renderChannelListOverlay()}
            <StatusBar barStyle="light-content" hidden />

            {/* Channel Number Input Overlay - render at root level */}
            {channelNumberInput !== '' && (
                <View
                    style={{
                        position: 'absolute',
                        top: 60,
                        left: 0,
                        right: 0,
                        alignItems: 'center',
                        zIndex: 100,
                    }}
                    pointerEvents="none"
                >
                    <View
                        style={{
                            backgroundColor: 'rgba(0,0,0,0.85)',
                            borderRadius: 16,
                            paddingHorizontal: 32,
                            paddingVertical: 18,
                            borderWidth: 2,
                            borderColor: '#f97316',
                        }}
                    >
                        <Text
                            style={{
                                color: '#fff',
                                fontSize: 48,
                                fontWeight: 'bold',
                                letterSpacing: 4,
                                textAlign: 'center',
                            }}
                        >
                            {channelNumberInput}
                        </Text>
                        <Text
                            style={{
                                color: '#f97316',
                                fontSize: 16,
                                textAlign: 'center',
                                marginTop: 4,
                            }}
                        >
                            Enter Channel Number
                        </Text>
                    </View>
                </View>
            )}

            {/* Video Player - Full Width Top Section (65%) */}
            <View style={{ height: PLAYER_HEIGHT, width: '100%' }}>
                {renderVideoPlayer()}

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
                                    {selectedChannel.language?.name} • {selectedChannel.genre?.name}
                                </Text>
                            </View>

                            {/* User Info Button */}
                            <TouchableOpacity
                                onPress={() => setShowUserInfo(true)}
                                className="bg-gray-800/80 p-3 rounded-full"
                            >
                                <Ionicons name="person-circle" size={28} color="#f97316" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Language-based Horizontal Categories - Bottom Section (35%) */}
            <View style={{ height: '35%', width: '100%' }} className="bg-gray-900">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 12 }}
                >
                    {channelsByLanguage.map((category, categoryIndex) => (
                        <View key={category.language} className="mb-4">
                            <View className="flex-row items-center justify-between px-6 mb-3">
                                <Text
  className={`text-white text-lg font-bold ${isCategoryFocused && focusedCategory === categoryIndex ? 'bg-orange-500 px-2 rounded' : ''}`}
>
  {category.language}
</Text>
                                <Text className="text-gray-500 text-sm">
                                    {category.channels.length} channels
                                </Text>
                            </View>
                            <FlatList
                                data={category.channels}
                                keyExtractor={item => item._id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 24 }}
                                renderItem={({ item: channel, index: channelIndex }) => {
                                    const isFocused = focusedCategory === categoryIndex && focusedChannelIndex === channelIndex;
                                    const isPlaying = selectedChannel?._id === channel._id;


                                    return (
                                        <TouchableOpacity
                                            key={channel._id}
                                            className={`mr-4 rounded-lg p-3 ${isPlaying
                                                ? 'bg-orange-500'
                                                : isFocused
                                                    ? 'bg-gray-700 border-2 border-orange-500'
                                                    : 'bg-gray-800'
                                                }`}
                                            style={{ width: 140 }}
                                            onPress={() => debouncedHandleChannelChange(channel)}
                                            hasTVPreferredFocus={categoryIndex === 0 && channelIndex === 0}
                                        >
                                        {(() => {
                                            const thumb = channel.imageUrl || channel.logo || channel.image || channel.thumbnail || channel.poster || channel.thumb || null;

                                            return thumb ? (
                                                <Image
                                                    source={{ uri: thumb }}
                                                    style={{
                                                        width: '100%',
                                                        height: 84,
                                                        borderRadius: 8,
                                                        marginBottom: 8,
                                                        backgroundColor: '#111',
                                                    }}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View
                                                    style={{
                                                        width: '100%',
                                                        height: 84,
                                                        borderRadius: 8,
                                                        backgroundColor: '#111',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginBottom: 8,
                                                    }}
                                                >
                                                    <Ionicons name="tv-outline" size={36} color="#6b7280" />
                                                </View>
                                            );
                                        })()}

                                            <View className="flex-row items-center justify-between mb-2">
                                                <View className={`px-2 py-1 rounded ${isPlaying ? 'bg-white/20' : 'bg-gray-700'}`}>
                                                    <Text className={`text-xs font-bold ${isPlaying ? 'text-white' : 'text-gray-300'}`}>
                                                        {channel.lcn}
                                                    </Text>
                                                </View>
                                                {isPlaying && (
                                                    <Ionicons name="play-circle" size={20} color="white" />
                                                )}
                                            </View>
                                            <Text
                                                className={`font-semibold ${isPlaying ? 'text-white' : 'text-gray-200'}`}
                                                numberOfLines={2}
                                                style={{ fontSize: 13 }}
                                            >
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
                            {/* User Info */}
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
                                        <Text className="text-white font-semibold">{formatDate(user.expiryDate)}</Text>
                                    </View>

                                    {daysRemaining !== null && (
                                        <View className="flex-row justify-between py-2">
                                            <Text className="text-gray-400">Days Remaining</Text>
                                            <Text className={`font-bold ${daysRemaining <= 7 ? 'text-red-500' : 'text-green-500'}`}>
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

                            {/* Device Info */}
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
                                        <Text className="text-white text-sm font-semibold">{user.deviceType}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Packages List */}
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

                            {/* Support Buttons */}
                            {serverInfo?.whatsappNumber && (
                                <TouchableOpacity
                                    className="bg-green-600 py-4 rounded-xl items-center mb-3"
                                    onPress={() => handleWhatsAppLink(serverInfo.whatsappNumber)}
                                >
                                    <View className="flex-row items-center">
                                        <Ionicons name="logo-whatsapp" size={20} color="white" />
                                        <Text className="text-white font-bold text-base ml-2">Contact Support</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/*  Key Action*/}
                            {serverInfo?.customButtonLink && serverInfo?.customButtonText && (
                                <TouchableOpacity
                                    className="bg-blue-600 py-4 rounded-xl items-center mb-3"
                                    onPress={() => handleCustomLink(serverInfo.customButtonLink)}
                                >
                                    <View className="flex-row items-center">
                                        <Ionicons name="open-outline" size={20} color="white" />
                                        <Text className="text-white font-bold text-base ml-2">
                                            {serverInfo.customButtonText}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Logout Button */}
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
