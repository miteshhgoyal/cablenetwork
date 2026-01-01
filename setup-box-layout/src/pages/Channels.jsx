import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Tv,
  PlayCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Menu,
  X,
  RefreshCw,
  User,
  LogOut,
  Phone,
  MessageCircle,
  Film,
  List,
  Youtube,
  Clock,
  Package,
  Maximize2,
} from "lucide-react";

const dummyChannels = [
  // News
  {
    id: 1,
    name: "CNN USA",
    lcn: 1,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "News" },
    language: { name: "English" },
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: 2,
    name: "BBC News",
    lcn: 2,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "News" },
    language: { name: "English" },
    url: "https://example.com/stream.m3u8",
  },
  {
    id: 3,
    name: "Fox News",
    lcn: 3,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "News" },
    language: { name: "English" },
    url: "https://example.com/fox.m3u8",
  },
  {
    id: 4,
    name: "NDTV India",
    lcn: 4,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "News" },
    language: { name: "Hindi" },
    url: "https://example.com/ndtv.m3u8",
  },
  // Sports
  {
    id: 5,
    name: "ESPN Sports",
    lcn: 5,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Sports" },
    language: { name: "English" },
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: 6,
    name: "Star Sports",
    lcn: 6,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Sports" },
    language: { name: "Hindi" },
    url: "https://example.com/starsports.mp4",
  },
  {
    id: 7,
    name: "NBC Sports",
    lcn: 7,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Sports" },
    language: { name: "English" },
    url: "https://example.com/nbc.m3u8",
  },
  // Entertainment
  {
    id: 8,
    name: "HBO Max",
    lcn: 8,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Entertainment" },
    language: { name: "English" },
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: 9,
    name: "Netflix Originals",
    lcn: 9,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Entertainment" },
    language: { name: "English" },
    url: "https://example.com/netflix.m3u8",
  },
  {
    id: 10,
    name: "Zee TV",
    lcn: 10,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Entertainment" },
    language: { name: "Hindi" },
    url: "https://example.com/zee.mp4",
  },
  // Movies
  {
    id: 11,
    name: "HBO Movies",
    lcn: 11,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Movies" },
    language: { name: "English" },
    url: "https://example.com/hbo-movies.m3u8",
  },
  {
    id: 12,
    name: "Sony Pix",
    lcn: 12,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Movies" },
    language: { name: "English" },
    url: "https://example.com/sonypix.mp4",
  },
  // Music
  {
    id: 13,
    name: "MTV Music",
    lcn: 13,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Music" },
    language: { name: "English" },
    url: "https://example.com/mtv.m3u8",
  },
  {
    id: 14,
    name: "VH1 Classic",
    lcn: 14,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Music" },
    language: { name: "English" },
    url: "https://example.com/vh1.mp4",
  },
  // Kids
  {
    id: 15,
    name: "Cartoon Network",
    lcn: 15,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Kids" },
    language: { name: "English" },
    url: "https://example.com/cartoon.mp4",
  },
  {
    id: 16,
    name: "Disney Channel",
    lcn: 16,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Kids" },
    language: { name: "English" },
    url: "https://example.com/disney.m3u8",
  },
  // Documentary
  {
    id: 17,
    name: "Discovery Channel",
    lcn: 17,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Documentary" },
    language: { name: "English" },
    url: "https://example.com/discovery.m3u8",
  },
  {
    id: 18,
    name: "National Geographic",
    lcn: 18,
    imageUrl: "/api/placeholder/120/90",
    genre: { name: "Documentary" },
    language: { name: "English" },
    url: "https://example.com/natgeo.mp4",
  },
];

const dummyUser = {
  name: "John Doe",
  subscriberName: "Premium User",
  packageName: "Multi-Package",
  expiryDate: "2026-06-01",
  package: "premium",
};

const dummyPackages = [
  { id: 1, name: "Basic Package", channelCount: 100 },
  { id: 2, name: "Premium Package", channelCount: 500 },
  { id: 3, name: "Ultimate Package", channelCount: 1000 },
  { id: 4, name: "Sports Pack", channelCount: 200 },
  { id: 5, name: "Kids Pack", channelCount: 150 },
];

const ChannelsPage = () => {
  const [channels, setChannels] = useState(dummyChannels);
  const [selectedChannel, setSelectedChannel] = useState(dummyChannels[0]);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [focusedCategory, setFocusedCategory] = useState(0);
  const [focusedChannelIndex, setFocusedChannelIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true); // New state for hiding grid

  const videoRef = useRef(null);

  const channelsByLanguage = useMemo(() => {
    const grouped = channels.reduce((acc, channel) => {
      const lang = channel.language?.name || "English";
      if (!acc[lang]) acc[lang] = [];
      acc[lang].push(channel);
      return acc;
    }, {});
    Object.keys(grouped).forEach((lang) => {
      grouped[lang].sort((a, b) => (a.lcn ?? 999999) - (b.lcn ?? 999999));
    });
    return Object.entries(grouped).map(([language, channels]) => ({
      language,
      channels,
    }));
  }, [channels]);

  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;

    if (!document.fullscreenElement) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "msfullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  const handleNavigateRight = useCallback(() => {
    const currentCategory = channelsByLanguage[focusedCategory];
    if (
      currentCategory &&
      focusedChannelIndex < currentCategory.channels.length - 1
    ) {
      const nextIndex = focusedChannelIndex + 1;
      setFocusedChannelIndex(nextIndex);
      handleChannelChange(currentCategory.channels[nextIndex]);
    }
  }, [focusedCategory, focusedChannelIndex, channelsByLanguage]);

  const handleNavigateLeft = useCallback(() => {
    if (focusedChannelIndex > 0) {
      const prevIndex = focusedChannelIndex - 1;
      setFocusedChannelIndex(prevIndex);
      const currentCategory = channelsByLanguage[focusedCategory];
      handleChannelChange(currentCategory.channels[prevIndex]);
    }
  }, [focusedCategory, focusedChannelIndex, channelsByLanguage]);

  const handleNavigateDown = useCallback(() => {
    if (focusedCategory < channelsByLanguage.length - 1) {
      setFocusedCategory(focusedCategory + 1);
      setFocusedChannelIndex(0);
      const nextCategory = channelsByLanguage[focusedCategory + 1];
      if (nextCategory?.channels[0])
        handleChannelChange(nextCategory.channels[0]);
    }
  }, [focusedCategory, channelsByLanguage]);

  const handleNavigateUp = useCallback(() => {
    if (focusedCategory > 0) {
      setFocusedCategory(focusedCategory - 1);
      setFocusedChannelIndex(0);
      const prevCategory = channelsByLanguage[focusedCategory - 1];
      if (prevCategory?.channels[0])
        handleChannelChange(prevCategory.channels[0]);
    }
  }, [focusedCategory, channelsByLanguage]);

  const handleChannelChange = (channel) => {
    setSelectedChannel(channel);
    setVideoError(false);
    setVideoLoading(true);
    setTimeout(() => setVideoLoading(false), 1500);
  };

  const handleOkButton = () => {
    setShowGrid(false); // Hide channel grid/suggestions
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysRemaining = () => {
    const endDate = new Date(dummyUser.expiryDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Tv className="w-8 h-8 text-orange-500" />
            <h1 className="text-4xl font-bold">Live Channels</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-3 bg-gray-800 hover:bg-gray-700 rounded-xl"
              title="Fullscreen"
            >
              <Maximize2 className="w-6 h-6" />
            </button>
            <button
              onClick={() => setShowUserInfo(true)}
              className="p-3 bg-gray-800 hover:bg-gray-700 rounded-xl"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Video Player - Full viewport height when fullscreen */}
        <div className="mb-8">
          <div
            className="relative bg-black rounded-xl overflow-hidden shadow-2xl"
            style={{ height: isFullscreen ? "100vh" : "480px" }}
          >
            {videoLoading && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
                <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                <p className="text-lg text-white">Loading stream...</p>
              </div>
            )}

            {videoError ? (
              <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-center p-8">
                <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                <h3 className="text-xl font-bold mb-2">Stream Error</h3>
                <p className="text-gray-400 mb-6 max-w-md">
                  {errorMessage || "Unable to load the stream"}
                </p>
                <button
                  onClick={() => setVideoError(false)}
                  className="bg-orange-500 hover:bg-orange-600 px-8 py-3 rounded-xl font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  muted
                  poster={selectedChannel?.imageUrl}
                >
                  <source
                    src={selectedChannel?.url}
                    type="application/x-mpegURL"
                  />
                </video>

                {/* Channel Info Overlay */}
                {selectedChannel && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 p-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedChannel.imageUrl}
                        alt={selectedChannel.name}
                        className="w-20 h-16 rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-orange-500 px-3 py-1 rounded-full text-sm font-bold">
                            {selectedChannel.lcn}
                          </span>
                          <h2 className="text-xl font-bold">
                            {selectedChannel.name}
                          </h2>
                        </div>
                        <div className="flex gap-2">
                          <span className="bg-gray-700 px-3 py-1 rounded-full text-sm">
                            {selectedChannel.genre?.name}
                          </span>
                          <span className="bg-gray-700 px-3 py-1 rounded-full text-sm">
                            {selectedChannel.language?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* OK Button - Hide Grid */}
        {!isFullscreen && showGrid && (
          <div className="flex justify-center mb-4">
            <button
              onClick={handleOkButton}
              className="bg-orange-500 hover:bg-orange-600 px-12 py-4 rounded-xl font-bold text-lg shadow-2xl flex items-center gap-2"
            >
              OK
            </button>
          </div>
        )}

        {/* Navigation Controls */}
        {!isFullscreen && showGrid && (
          <div className="flex justify-center mb-8 gap-3 p-4 bg-gray-800 rounded-xl">
            <button
              onClick={handleNavigateUp}
              className="p-3 hover:bg-gray-700 rounded-xl"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <button
              onClick={handleNavigateDown}
              className="p-3 hover:bg-gray-700 rounded-xl"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <button
              onClick={handleNavigateLeft}
              className="p-3 hover:bg-gray-700 rounded-xl"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNavigateRight}
              className="p-3 hover:bg-gray-700 rounded-xl"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Channels Grid */}
        {!isFullscreen && showGrid && (
          <div className="space-y-10">
            {channelsByLanguage.map(({ language, channels }, categoryIndex) => (
              <div key={language}>
                <div className="flex items-center justify-between mb-6">
                  <h2
                    className={`text-2xl font-bold ${
                      focusedCategory === categoryIndex
                        ? "text-orange-500"
                        : "text-white"
                    }`}
                  >
                    {language}
                  </h2>
                  <span className="text-gray-400 text-lg">
                    {channels.length} channels
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {channels.map((channel, channelIndex) => {
                    const isFocused =
                      categoryIndex === focusedCategory &&
                      channelIndex === focusedChannelIndex;
                    const isPlaying = selectedChannel?.id === channel.id;
                    return (
                      <button
                        key={channel.id}
                        onClick={() => handleChannelChange(channel)}
                        className={`group relative rounded-xl overflow-hidden transition-all hover:scale-105 ${
                          isPlaying
                            ? "border-3 border-orange-500 shadow-lg shadow-orange-500/30"
                            : isFocused
                            ? "border-2 border-yellow-400 ring-4 ring-yellow-400/30 scale-105"
                            : "border border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={channel.imageUrl}
                            alt={channel.name}
                            className="w-full h-32 object-cover bg-gray-800"
                          />
                          {isPlaying && (
                            <div className="absolute inset-0 bg-orange-500/30 flex items-center justify-center">
                              <PlayCircle className="w-12 h-12 text-white" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 bg-orange-500 px-2 py-1 rounded-lg text-xs font-bold">
                            {channel.lcn}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-800">
                          <h3
                            className={`font-semibold text-sm mb-2 line-clamp-2 ${
                              isPlaying ? "text-orange-400" : "text-white"
                            }`}
                          >
                            {channel.name}
                          </h3>
                          <p className="text-xs text-gray-400">
                            {channel.genre?.name || "General"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show message when grid hidden */}
        {!showGrid && !isFullscreen && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-400 mb-4">Now playing fullscreen</p>
            <button
              onClick={() => setShowGrid(true)}
              className="bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-xl"
            >
              Show Channels
            </button>
          </div>
        )}
      </div>

      {/* User Info Modal */}
      {showUserInfo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Account Info</h2>
              <button
                onClick={() => setShowUserInfo(false)}
                className="p-2 hover:bg-gray-800 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Profile */}
            <div className="bg-gray-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mr-4">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{dummyUser.name}</h3>
                  <p className="text-gray-400">{dummyUser.subscriberName}</p>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="bg-gray-800 rounded-2xl p-6 mb-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Package</span>
                  <span className="font-semibold">{dummyUser.packageName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Expiry Date</span>
                  <span className="font-semibold">
                    {formatDate(dummyUser.expiryDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Days Left</span>
                  <span
                    className={`font-bold ${
                      getDaysRemaining() <= 7
                        ? "text-red-500"
                        : "text-green-500"
                    }`}
                  >
                    {getDaysRemaining()} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Channels</span>
                  <span className="font-semibold text-orange-500">
                    {channels.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Packages */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-4">Your Packages</h3>
              <div className="space-y-3">
                {dummyPackages.map((pkg) => (
                  <div key={pkg.id} className="bg-gray-800 rounded-xl p-4">
                    <h4 className="font-semibold mb-2">{pkg.name}</h4>
                    <div className="flex items-center text-gray-400 text-sm">
                      <Tv className="w-4 h-4 mr-2" />
                      <span>{pkg.channelCount} channels</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Logout */}
            <button
              className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-xl font-bold flex items-center justify-center gap-3"
              onClick={() => setShowUserInfo(false)}
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelsPage;
