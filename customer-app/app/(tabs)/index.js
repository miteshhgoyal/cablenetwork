import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    Dimensions,
    StatusBar,
    Linking,
    ActivityIndicator,
    Platform,
    FlatList,
    Alert,
    AppState
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/authContext';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';

export default function ChannelsScreen() {
    const { channels, user, packagesList, logout, refreshChannels, refreshing } = useAuth();
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const videoRef = useRef(null);
    const webViewRef = useRef(null);
    const youtubeWebViewRef = useRef(null);
    const youtubePlayerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
    const [playlistVideoIds, setPlaylistVideoIds] = useState([]);
    const [useWebViewPlayer, setUseWebViewPlayer] = useState(false);
    const [webViewError, setWebViewError] = useState(false);
    const [playerMode, setPlayerMode] = useState('auto');
    const [youtubeReady, setYoutubeReady] = useState(false);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                // App came to foreground, refresh channels
                refreshChannels();
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

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

    const getRecommendedChannels = () => {
        if (!selectedChannel) return [];

        return channels.filter(ch =>
            ch.language?.name === selectedChannel.language?.name &&
            ch._id !== selectedChannel._id
        ).slice(0, 15);
    };

    // ==========================================
    // STREAM URL ANALYSIS (ENHANCED)
    // ==========================================

    const analyzeStreamUrl = (url) => {
        if (!url) return { type: 'unknown', isValid: false };

        const urlLower = url.toLowerCase();

        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
            if (urlLower.includes('/live/')) return { type: 'youtube-live', isValid: true };
            if (urlLower.includes('watch?v=')) return { type: 'youtube-video', isValid: true };
            if (urlLower.includes('playlist') || urlLower.includes('list=')) return { type: 'youtube-playlist', isValid: true };
            if (urlLower.includes('/c/') || urlLower.includes('/@')) return { type: 'youtube-channel', isValid: true };
            return { type: 'youtube-video', isValid: true };
        }

        if (urlLower.includes('.m3u8') || urlLower.includes('m3u')) {
            return { type: 'hls', isValid: true };
        }

        if (urlLower.includes('chunklist')) {
            return { type: 'hls', isValid: true };
        }

        if (urlLower.includes('.mp4')) {
            return { type: 'mp4', isValid: true };
        }

        if (url.match(/:\d{4}\//) || url.match(/\/live\//)) {
            return { type: 'iptv', isValid: true };
        }

        if (url.match(/\/\d+\/\d+\/\d+$/)) {
            return { type: 'iptv', isValid: true };
        }

        if (urlLower.includes('rtmp')) {
            return { type: 'rtmp', isValid: true };
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
            return { type: 'stream', isValid: true };
        }

        return { type: 'unknown', isValid: false };
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

    const extractPlaylistId = (url) => {
        if (!url) return null;
        const playlistRegex = /[?&]list=([^&]+)/;
        const match = url.match(playlistRegex);
        return match ? match[1] : null;
    };

    // ==========================================
    // ENHANCED HTML PLAYER - FIXED AUTH
    // ==========================================

    const generateHTMLPlayer = (url) => {
        const isM3U8 = url.includes('.m3u8') || url.includes('m3u');
        let urlDomain = '';
        try {
            urlDomain = new URL(url).origin;
        } catch (e) {
            urlDomain = '';
        }

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Stream Player</title>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; overflow: hidden; }
        #container { position: relative; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
        video { width: 100%; height: 100%; object-fit: contain; background: #000; }
        #loading { display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff; font-size: 16px; text-align: center; z-index: 10; }
        .spinner { border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid #fff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        #error { display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ef4444; text-align: center; padding: 20px; z-index: 10; }
        #error.show { display: block; }
    </style>
</head>
<body>
    <div id="container">
        <div id="loading">
            <div class="spinner"></div>
            <div>Loading stream...</div>
        </div>
        <div id="error">
            <div style="font-size:40px;margin-bottom:10px;">⚠️</div>
            <div id="errorText" style="font-size:14px;"></div>
        </div>
        <video id="video" controls autoplay playsinline webkit-playsinline crossorigin="anonymous"></video>
    </div>

    <script>
        const video = document.getElementById('video');
        const loading = document.getElementById('loading');
        const errorDiv = document.getElementById('error');
        const errorText = document.getElementById('errorText');
        const streamUrl = '${url}';
        const urlDomain = '${urlDomain}';

        function showError(message) {
            loading.style.display = 'none';
            errorDiv.classList.add('show');
            errorText.textContent = message;
            console.error('Player Error:', message);
        }

        function hideLoading() {
            loading.style.display = 'none';
        }

        if (${isM3U8}) {
            

            if (video.canPlayType('application/vnd.apple.mpegurl')) {
                
                video.src = streamUrl;
                video.addEventListener('loadstart', () => { loading.style.display = 'block'; });
                video.addEventListener('canplay', () => { 
                    hideLoading(); 
                    video.play().catch(err => showError('Failed to play: ' + err.message)); 
                });
                video.addEventListener('error', (e) => {
                    const errorMsg = video.error ? 'Error Code: ' + video.error.code : 'Stream error';
                    showError(errorMsg);
                });
            } else if (Hls.isSupported()) {
                
                const hls = new Hls({
                    debug: false,
                    enableWorker: true,
                    lowLatencyMode: true,
                    maxBufferLength: 120,
                    maxMaxBufferLength: 600,
                    fragLoadingTimeOut: 30000,
                    manifestLoadingTimeOut: 20000,
                    levelLoadingTimeOut: 20000,
                    xhrSetup: function(xhr, url) {
                        // ✅ FIX: Enhanced authentication headers for IPTV streams
                        xhr.withCredentials = false;
                        xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');
                        xhr.setRequestHeader('Accept', '*/*');
                        xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.9');
                        xhr.setRequestHeader('Accept-Encoding', 'identity;q=1, *;q=0');
                        
                        if (urlDomain) {
                            xhr.setRequestHeader('Referer', urlDomain + '/');
                            xhr.setRequestHeader('Origin', urlDomain);
                        }
                        
                        xhr.setRequestHeader('Connection', 'keep-alive');
                        xhr.setRequestHeader('Cache-Control', 'no-cache');
                        xhr.setRequestHeader('Pragma', 'no-cache');
                    }
                });

                hls.loadSource(streamUrl);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    
                    hideLoading();
                    video.play().catch(err => showError('Failed to start: ' + err.message));
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS Error:', data);
                    if (data.fatal) {
                        switch(data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                
                                hls.recoverMediaError();
                                break;
                            default:
                                showError('Fatal error: ' + data.type);
                                hls.destroy();
                                break;
                        }
                    }
                });

                window.addEventListener('beforeunload', () => { if (hls) hls.destroy(); });
            } else {
                showError('HLS not supported');
            }
        } else {
            
            video.src = streamUrl;
            video.addEventListener('loadstart', () => { loading.style.display = 'block'; });
            video.addEventListener('canplay', () => { 
                hideLoading(); 
                video.play().catch(err => showError('Failed to play: ' + err.message)); 
            });
            video.addEventListener('error', (e) => {
                const errorMsg = video.error ? 'Error Code: ' + video.error.code : 'Stream error';
                showError(errorMsg);
            });
        }

        video.addEventListener('waiting', () => { loading.style.display = 'block'; });
        video.addEventListener('playing', () => { hideLoading(); });
    </script>
</body>
</html>
        `;
    };

    // ==========================================
    // YOUTUBE WEBVIEW - FIXED AUTOPLAY
    // ==========================================

    const generateYouTubeHTML = (videoId, isPlaylist = false, playlistId = null) => {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube Player</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; overflow: hidden; width: 100vw; height: 100vh; }
        #player-container { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        #player { width: 100%; height: 100%; }
    </style>
</head>
<body>
    <div id="player-container">
        <div id="player"></div>
    </div>

    <script>
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        var player;

        function onYouTubeIframeAPIReady() {
            

            var playerVars = {
                'autoplay': 1,
                'controls': 1,
                'modestbranding': 1,
                'rel': 0,
                'fs': 1,
                'playsinline': 1,
                'enablejsapi': 1,
                'origin': window.location.origin
            };

            if (${isPlaylist} && '${playlistId || ''}') {
                playerVars.list = '${playlistId || ''}';
            }

            player = new YT.Player('player', {
                height: '100%',
                width: '100%',
                videoId: '${videoId}',
                playerVars: playerVars,
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
        }

        function onPlayerReady(event) {
            
            event.target.playVideo();
        }

        function onPlayerStateChange(event) {
            
        }
    </script>
</body>
</html>
        `;
    };

    // ==========================================
    // PLAYER STATE MANAGEMENT
    // ==========================================

    const handleChannelPress = (channel) => {
        if (videoRef.current) {
            videoRef.current.stopAsync().catch(() => { });
        }

        setSelectedChannel(channel);
        setShowPlayer(true);
        setVideoError(false);
        setVideoLoading(true);
        setErrorMessage('');
        setIsPlaying(true);
        setCurrentPlaylistIndex(0);
        setPlaylistVideoIds([]);
        setUseWebViewPlayer(false);
        setWebViewError(false);
        setPlayerMode('auto');
        setYoutubeReady(false); // ✅ RESET YouTube ready state
    };

    const closePlayer = () => {
        if (videoRef.current) {
            videoRef.current.stopAsync().catch(() => { });
        }

        setShowPlayer(false);
        setSelectedChannel(null);
        setVideoError(false);
        setVideoLoading(false);
        setErrorMessage('');
        setIsPlaying(false);
        setCurrentPlaylistIndex(0);
        setPlaylistVideoIds([]);
        setUseWebViewPlayer(false);
        setWebViewError(false);
        setPlayerMode('auto');
        setYoutubeReady(false);
    };

    const switchToWebViewPlayer = () => {

        setPlayerMode('webview');
        setUseWebViewPlayer(true);
        setVideoError(false);
        setVideoLoading(true);
        setWebViewError(false);
    };

    const switchToYouTubeWebView = () => {

        setPlayerMode('youtube-webview');
        setVideoError(false);
        setVideoLoading(true);
        setWebViewError(false);
        setYoutubeReady(false);
    };

    const openYouTubeApp = (url) => {
        if (!url) return;
        const videoId = extractVideoId(url);
        if (videoId) {
            const youtubeUrl = Platform.OS === 'ios'
                ? `youtube://${videoId}`
                : `vnd.youtube://${videoId}`;

            Linking.openURL(youtubeUrl).catch(() => {
                Linking.openURL(url);
            });
        } else {
            Linking.openURL(url);
        }
    };

    // ==========================================
    // YOUTUBE STATE CHANGE - FIXED
    // ==========================================

    const onYouTubeStateChange = useCallback((state) => {


        if (state === 'playing') {
            setVideoLoading(false); // ✅ Hide loading
            setIsPlaying(true);
            setVideoError(false);
            setYoutubeReady(true); // ✅ Mark as ready
        } else if (state === 'buffering') {
            setVideoLoading(true);
        } else if (state === 'ended') {
            const analysis = analyzeStreamUrl(selectedChannel?.url);

            if (analysis.type === 'youtube-playlist' && playlistVideoIds.length > 0) {
                const nextIndex = (currentPlaylistIndex + 1) % playlistVideoIds.length;
                setCurrentPlaylistIndex(nextIndex);
                setVideoLoading(true);
            } else if (analysis.type === 'youtube-video' || analysis.type === 'youtube-live') {
                if (youtubePlayerRef.current) {
                    youtubePlayerRef.current.seekTo(0);
                }
            }
        } else if (state === 'unstarted') {
            setVideoLoading(true);
        }
    }, [selectedChannel, playlistVideoIds, currentPlaylistIndex]);

    // ==========================================
    // RENDER CHANNEL ITEM
    // ==========================================

    const renderChannelItem = ({ item }) => (
        <TouchableOpacity
            className="bg-white rounded-lg px-4 py-3.5 mb-2 mx-3 shadow-sm flex-row items-center justify-between active:bg-gray-50"
            onPress={() => handleChannelPress(item)}
            activeOpacity={0.7}
        >
            <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1.5">
                    <View className="bg-orange-500 px-2.5 py-0.5 rounded-md">
                        <Text className="text-white text-xs font-bold">
                            LCN {item.lcn}
                        </Text>
                    </View>
                    <Text className="text-gray-500 text-xs ml-2 font-medium">
                        {item.genre?.name || 'General'}
                    </Text>
                </View>
                <Text className="text-base font-bold text-gray-900 mb-1" numberOfLines={2}>
                    {item.name}
                </Text>
                {item.packageNames && item.packageNames.length > 0 && (
                    <View className="flex-row flex-wrap gap-1 mt-1">
                        {item.packageNames.slice(0, 2).map((pkgName, idx) => (
                            <View key={idx} className="bg-orange-50 px-2 py-0.5 rounded">
                                <Text className="text-xs text-orange-600 font-semibold">
                                    {pkgName}
                                </Text>
                            </View>
                        ))}
                        {item.packageNames.length > 2 && (
                            <View className="bg-gray-100 px-2 py-0.5 rounded">
                                <Text className="text-xs text-gray-600 font-semibold">
                                    +{item.packageNames.length - 2}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
            <Ionicons name="play-circle" size={36} color="#f97316" />
        </TouchableOpacity>
    );

    const renderRecommendedItem = ({ item }) => (
        <TouchableOpacity
            className="bg-gray-800 rounded-lg px-3 py-3 mb-2 flex-row items-center justify-between active:bg-gray-700"
            onPress={() => {
                closePlayer();
                setTimeout(() => handleChannelPress(item), 100);
            }}
            activeOpacity={0.7}
        >
            <View className="flex-1 mr-2">
                <View className="flex-row items-center mb-1">
                    <View className="bg-orange-500 px-2 py-0.5 rounded">
                        <Text className="text-white text-xs font-bold">
                            {item.lcn}
                        </Text>
                    </View>
                    <Text className="text-gray-400 text-xs ml-2">
                        {item.genre?.name || 'General'}
                    </Text>
                </View>
                <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                    {item.name}
                </Text>
            </View>
            <Ionicons name="play" size={20} color="#f97316" />
        </TouchableOpacity>
    );

    const renderLanguageSection = (section) => (
        <View key={section.title} className="mt-3 mb-2">
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

            <View className="bg-gray-50 py-2">
                <FlatList
                    data={section.data}
                    renderItem={renderChannelItem}
                    keyExtractor={(item) => item._id}
                    scrollEnabled={false}
                />
            </View>
        </View>
    );

    // ==========================================
    // RENDER PLAYERS
    // ==========================================

    const renderWebViewPlayer = () => {
        const streamUrl = selectedChannel.url;
        const htmlContent = generateHTMLPlayer(streamUrl);

        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                <WebView
                    ref={webViewRef}
                    source={{ html: htmlContent }}
                    style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={false}
                    scalesPageToFit={true}
                    scrollEnabled={false}
                    allowsFullscreenVideo={true}
                    originWhitelist={['*']}
                    mixedContentMode="always"
                    onLoad={() => {

                        setVideoLoading(false);
                    }}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('❌ WebView Error:', nativeEvent);
                        setWebViewError(true);
                        setVideoLoading(false);
                    }}
                />
                {webViewError && (
                    <View className="absolute inset-0 items-center justify-center bg-black/90 px-6">
                        <Ionicons name="alert-circle-outline" size={50} color="#ef4444" />
                        <Text className="text-white text-center mt-3 text-base font-semibold">
                            WebView Player Failed
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const renderYouTubeWebViewPlayer = () => {
        const videoId = extractVideoId(selectedChannel.url);
        const playlistId = extractPlaylistId(selectedChannel.url);
        const isPlaylist = playlistId && playlistId.length > 0;

        if (!videoId) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        Invalid YouTube URL
                    </Text>
                </View>
            );
        }

        const htmlContent = generateYouTubeHTML(videoId, isPlaylist, playlistId);

        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                <WebView
                    ref={youtubeWebViewRef}
                    source={{ html: htmlContent }}
                    style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={false}
                    scalesPageToFit={false}
                    scrollEnabled={false}
                    allowsFullscreenVideo={true}
                    originWhitelist={['*']}
                    onLoad={() => {

                        setVideoLoading(false);
                        setYoutubeReady(true); // ✅ Mark ready
                    }}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('❌ YouTube WebView Error:', nativeEvent);
                        setVideoError(true);
                        setVideoLoading(false);
                    }}
                />
            </View>
        );
    };

    const renderStreamPlayer = () => {
        const streamUrl = selectedChannel.url;



        return (
            <View className="w-full bg-black relative" style={{ height: 260 }}>
                {videoError ? (
                    <View className="flex-1 items-center justify-center px-6">
                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                        <Text className="text-white text-center mt-4 text-lg font-semibold">
                            Stream Failed
                        </Text>
                        <Text className="text-gray-400 text-xs text-center mt-2 px-4">
                            {errorMessage || 'Unable to load stream'}
                        </Text>

                        <View className="flex-row gap-3 mt-4 flex-wrap justify-center">
                            <TouchableOpacity
                                onPress={() => {
                                    setVideoError(false);
                                    setVideoLoading(true);
                                    if (videoRef.current) {
                                        videoRef.current.unloadAsync()
                                            .then(() => {
                                                videoRef.current.loadAsync(
                                                    { uri: streamUrl },
                                                    { shouldPlay: true, isLooping: false }
                                                );
                                            })
                                            .catch(err => {

                                                setVideoError(true);
                                                setVideoLoading(false);
                                            });
                                    }
                                }}
                                className="bg-orange-600 px-5 py-2.5 rounded-lg"
                            >
                                <Text className="text-white font-semibold text-sm">Retry</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={switchToWebViewPlayer}
                                className="bg-blue-600 px-5 py-2.5 rounded-lg"
                            >
                                <Text className="text-white font-semibold text-sm">Browser Player</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <Video
                        ref={videoRef}
                        source={{ uri: streamUrl }}
                        style={{ width: '100%', height: '100%' }}
                        useNativeControls={true}
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping={false}
                        shouldPlay={true}
                        progressUpdateIntervalMillis={500}
                        rate={1.0}
                        volume={1.0}
                        isMuted={false}
                        onLoad={(status) => {

                            setVideoError(false);
                            setVideoLoading(false);
                            setIsPlaying(true);
                        }}
                        onLoadStart={() => {

                            setVideoLoading(true);
                        }}
                        onReadyForDisplay={() => {

                            setVideoLoading(false);
                        }}
                        onError={(error) => {
                            console.error('❌ Video Error:', error);
                            const errorMsg = error?.error?.message || error?.message || 'Stream playback failed';
                            setErrorMessage(errorMsg);
                            setVideoError(true);
                            setVideoLoading(false);
                        }}
                        onPlaybackStatusUpdate={(status) => {
                            if (status.error) {
                                console.error('❌ Playback Error:', status.error);
                                setErrorMessage(status.error);
                                setVideoError(true);
                            }
                            if (status.isLoaded) {
                                setIsPlaying(status.isPlaying);
                            }
                        }}
                        onBuffer={({ isBuffering }) => {
                            if (isBuffering) {

                            }
                        }}
                    />
                )}
            </View>
        );
    };

    const renderYouTubeVideo = () => {
        const videoId = extractVideoId(selectedChannel.url);

        if (!videoId) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        Invalid YouTube URL
                    </Text>
                </View>
            );
        }

        return (
            <View className="w-full bg-black" style={{ height: 260 }}>
                <YoutubePlayer
                    ref={youtubePlayerRef}
                    height={260}
                    videoId={videoId}
                    play={isPlaying} // ✅ FIX: Use state instead of hardcoded true
                    forceAndroidAutoplay={true} // ✅ FIX: Force autoplay on Android
                    onError={(error) => {
                        console.error('❌ YouTube Error:', error);
                        switchToYouTubeWebView();
                    }}
                    onReady={() => {

                        setVideoError(false);
                        setVideoLoading(false); // ✅ FIX: Hide loading immediately
                        setYoutubeReady(true); // ✅ FIX: Mark as ready
                    }}
                    onChangeState={onYouTubeStateChange}
                    initialPlayerParams={{
                        controls: true,
                        modestbranding: true,
                        rel: false,
                        loop: true, // ✅ FIX: Enable looping
                        fs: 1,
                        playsinline: 1,
                        playlist: videoId,
                    }}
                    webViewProps={{
                        androidLayerType: Platform.OS === 'android' ? 'hardware' : undefined,
                        allowsFullscreenVideo: true,
                        javaScriptEnabled: true,
                    }}
                />
            </View>
        );
    };

    const renderYouTubeLive = () => {
        const videoId = extractVideoId(selectedChannel.url);

        if (!videoId) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        Invalid YouTube Live URL
                    </Text>
                </View>
            );
        }

        return (
            <View className="w-full bg-black" style={{ height: 260 }}>
                <YoutubePlayer
                    ref={youtubePlayerRef}
                    height={260}
                    videoId={videoId}
                    play={isPlaying} // ✅ FIX
                    forceAndroidAutoplay={true} // ✅ FIX
                    onError={(error) => {
                        console.error('❌ YouTube Live Error:', error);
                        switchToYouTubeWebView();
                    }}
                    onReady={() => {

                        setVideoError(false);
                        setVideoLoading(false); // ✅ FIX
                        setYoutubeReady(true); // ✅ FIX
                    }}
                    onChangeState={onYouTubeStateChange}
                    initialPlayerParams={{
                        controls: true,
                        rel: false,
                        modestbranding: true,
                        fs: 1,
                        playsinline: 1,
                    }}
                    webViewProps={{
                        androidLayerType: Platform.OS === 'android' ? 'hardware' : undefined,
                        allowsFullscreenVideo: true,
                        javaScriptEnabled: true,
                    }}
                />
            </View>
        );
    };

    const renderYouTubePlaylist = () => {
        const playlistId = extractPlaylistId(selectedChannel.url);
        const videoId = extractVideoId(selectedChannel.url);

        if (!playlistId && !videoId) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        Invalid YouTube Playlist URL
                    </Text>
                </View>
            );
        }

        const currentVideoId = playlistVideoIds.length > 0
            ? playlistVideoIds[currentPlaylistIndex]
            : videoId;

        return (
            <View className="w-full bg-black" style={{ height: 260 }}>
                <YoutubePlayer
                    ref={youtubePlayerRef}
                    height={260}
                    videoId={currentVideoId || ''}
                    playList={playlistId}
                    play={isPlaying} // ✅ FIX
                    forceAndroidAutoplay={true} // ✅ FIX
                    onError={(error) => {
                        console.error('❌ YouTube Playlist Error:', error);
                        switchToYouTubeWebView();
                    }}
                    onReady={() => {

                        setVideoError(false);
                        setVideoLoading(false); // ✅ FIX
                        setYoutubeReady(true); // ✅ FIX
                    }}
                    onChangeState={onYouTubeStateChange}
                    initialPlayerParams={{
                        controls: true,
                        rel: false,
                        modestbranding: true,
                        loop: true,
                        fs: 1,
                        playsinline: 1,
                        listType: 'playlist',
                        list: playlistId,
                    }}
                    webViewProps={{
                        androidLayerType: Platform.OS === 'android' ? 'hardware' : undefined,
                        allowsFullscreenVideo: true,
                        javaScriptEnabled: true,
                    }}
                />
                {playlistVideoIds.length > 0 && (
                    <View className="absolute bottom-2 right-2 bg-black/70 px-3 py-1.5 rounded-lg">
                        <Text className="text-white text-xs font-semibold">
                            {currentPlaylistIndex + 1} / {playlistVideoIds.length}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const renderYouTubeChannelOrPlaylist = (isPlaylist) => (
        <View className="w-full bg-black" style={{ height: 260 }}>
            <View className="flex-1 items-center justify-center px-6 gap-4">
                <Ionicons
                    name={isPlaylist ? "list-outline" : "logo-youtube"}
                    size={60}
                    color={isPlaylist ? "#fbbf24" : "#ff0000"}
                />
                <Text className="text-white text-center text-lg font-semibold">
                    {isPlaylist ? 'YouTube Playlist' : 'YouTube Channel'}
                </Text>
                <Text className="text-gray-300 text-sm text-center">
                    Open in YouTube app to view
                </Text>
                <TouchableOpacity
                    onPress={() => openYouTubeApp(selectedChannel.url)}
                    className={`${isPlaylist ? 'bg-yellow-600' : 'bg-red-600'} px-6 py-3 rounded-lg mt-2`}
                >
                    <Text className="text-white font-semibold">Open in YouTube</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStreamTypeBadge = () => {
        if (!selectedChannel?.url) return null;

        const analysis = analyzeStreamUrl(selectedChannel.url);
        let color = 'bg-blue-500';
        let icon = 'tv-outline';
        let label = 'Stream';

        if (playerMode === 'webview') {
            color = 'bg-purple-600';
            icon = 'globe-outline';
            label = 'Browser Player';
        } else if (playerMode === 'youtube-webview') {
            color = 'bg-red-600';
            icon = 'logo-youtube';
            label = '🎥 YouTube Browser';
        } else {
            switch (analysis.type) {
                case 'youtube-video':
                    color = 'bg-red-600';
                    icon = 'logo-youtube';
                    label = 'YouTube Video';
                    break;
                case 'youtube-live':
                    color = 'bg-red-600';
                    icon = 'radio-outline';
                    label = '🔴 YouTube Live';
                    break;
                case 'youtube-channel':
                    color = 'bg-red-600';
                    icon = 'logo-youtube';
                    label = 'YouTube Channel';
                    break;
                case 'youtube-playlist':
                    color = 'bg-red-600';
                    icon = 'list-outline';
                    label = 'YouTube Playlist';
                    break;
                case 'hls':
                    color = 'bg-blue-600';
                    icon = 'radio-outline';
                    label = 'HLS Stream';
                    break;
                case 'iptv':
                    color = 'bg-purple-600';
                    icon = 'server-outline';
                    label = 'IPTV Stream';
                    break;
                case 'mp4':
                    color = 'bg-green-600';
                    icon = 'videocam-outline';
                    label = 'MP4 Video';
                    break;
                default:
                    color = 'bg-gray-600';
                    icon = 'help-circle-outline';
                    label = 'Stream';
            }
        }

        return (
            <View className={`${color} px-3 py-1.5 rounded-lg flex-row items-center`}>
                <Ionicons name={icon} size={14} color="white" />
                <Text className="text-white font-bold text-xs ml-1.5">{label}</Text>
            </View>
        );
    };

    const renderPlayerContent = () => {
        if (!selectedChannel?.url) {
            return (
                <View className="w-full bg-black items-center justify-center" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        No Stream URL
                    </Text>
                </View>
            );
        }

        const analysis = analyzeStreamUrl(selectedChannel.url);

        if (!analysis.isValid) {
            return (
                <View className="w-full bg-black items-center justify-center px-6" style={{ height: 260 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                        Invalid Stream URL
                    </Text>
                </View>
            );
        }

        if (playerMode === 'webview' && (analysis.type === 'hls' || analysis.type === 'iptv' || analysis.type === 'stream')) {
            return renderWebViewPlayer();
        }

        if (playerMode === 'youtube-webview' && analysis.type.startsWith('youtube')) {
            return renderYouTubeWebViewPlayer();
        }

        switch (analysis.type) {
            case 'youtube-video':
                return renderYouTubeVideo();
            case 'youtube-live':
                return renderYouTubeLive();
            case 'youtube-channel':
                return renderYouTubeChannelOrPlaylist(false);
            case 'youtube-playlist':
                return renderYouTubePlaylist();
            case 'hls':
            case 'iptv':
            case 'mp4':
            case 'rtmp':
            case 'stream':
                return renderStreamPlayer();
            default:
                return renderStreamPlayer();
        }
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

    // ==========================================
    // MAIN RENDER
    // ==========================================

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
                            {getDaysRemaining()} days left
                        </Text>
                    </View>
                </View>

                <View className="flex-row justify-between items-center">
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

                {packagesList.length > 0 && (
                    <View className="pt-2 border-t border-orange-400 border-opacity-40 mt-3">
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
                        Contact your provider
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

            {/* PLAYER MODAL */}
            <Modal
                visible={showPlayer}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={closePlayer}
            >
                <SafeAreaView className="flex-1 bg-black">
                    <StatusBar barStyle="light-content" backgroundColor="#000" />

                    <View className="flex-row items-center px-4 py-3 bg-black/90 border-b border-gray-800">
                        <TouchableOpacity onPress={closePlayer} className="flex-row items-center">
                            <Ionicons name="chevron-back" size={24} color="white" />
                            <Text className="text-white ml-2 text-base font-medium">Back</Text>
                        </TouchableOpacity>
                        <Text className="text-white font-bold text-base flex-1 text-center mr-16" numberOfLines={1}>
                            {selectedChannel?.name}
                        </Text>
                    </View>

                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                        <View className="relative">
                            {renderPlayerContent()}
                            {videoLoading && !videoError && !webViewError && !youtubeReady && ( // ✅ FIX: Hide if YouTube ready
                                <View className="absolute inset-0 items-center justify-center bg-black/70 z-10" style={{ height: 260 }}>
                                    <ActivityIndicator size="large" color="#f97316" />
                                    <Text className="text-white mt-3 text-sm">
                                        {playerMode === 'youtube-webview' ? 'Loading YouTube...' : 'Loading stream...'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View className="p-6">
                            <View className="flex-row items-center mb-4">
                                {renderStreamTypeBadge()}
                                <Text className="text-gray-400 text-sm ml-2">
                                    {selectedChannel?.genre?.name || 'General'}
                                </Text>
                            </View>

                            <Text className="text-white text-2xl font-bold mb-3">
                                {selectedChannel?.name}
                            </Text>

                            {selectedChannel?.language && (
                                <View className="flex-row items-center mb-4 bg-orange-900/30 px-3 py-2.5 rounded-lg">
                                    <Ionicons name="language-outline" size={18} color="#fbbf24" />
                                    <Text className="text-orange-200 text-sm ml-2 font-semibold">
                                        {selectedChannel.language.name}
                                    </Text>
                                </View>
                            )}

                            {selectedChannel?.packageNames && selectedChannel.packageNames.length > 0 && (
                                <View className="mb-4">
                                    <Text className="text-gray-400 text-xs font-semibold mb-2">
                                        AVAILABLE IN:
                                    </Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {selectedChannel.packageNames.map((pkg, idx) => (
                                            <View key={idx} className="bg-orange-600/40 px-3 py-1.5 rounded-lg">
                                                <Text className="text-orange-100 text-xs font-semibold">
                                                    {pkg}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {getRecommendedChannels().length > 0 && (
                                <View className="mt-6 pt-6 border-t border-gray-700">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text className="text-white text-lg font-bold">
                                            More in {selectedChannel?.language?.name}
                                        </Text>
                                        <Text className="text-gray-400 text-xs">
                                            {getRecommendedChannels().length}
                                        </Text>
                                    </View>
                                    <FlatList
                                        data={getRecommendedChannels()}
                                        renderItem={renderRecommendedItem}
                                        keyExtractor={(item) => item._id}
                                        scrollEnabled={false}
                                    />
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
