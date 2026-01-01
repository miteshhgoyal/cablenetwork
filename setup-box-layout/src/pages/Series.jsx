import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Film,
  PlayCircle,
  AlertCircle,
  Loader2,
  Menu,
  X,
  RefreshCw,
  Phone,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Maximize2,
} from "lucide-react";

const PLAYER_HEIGHT = 480;

const dummySeries = [
  {
    _id: "1",
    title: "Breaking Bad",
    genre: { name: "Drama" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    verticalUrl:
      "https://via.placeholder.com/240x360/2D3748/ffffff?text=Breaking+Bad",
    seasonsCount: 5,
  },
  {
    _id: "2",
    title: "Stranger Things",
    genre: { name: "Sci-Fi" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/test_001/stream.m3u8",
    verticalUrl:
      "https://via.placeholder.com/240x360/2D3748/ffffff?text=Stranger+Things",
    seasonsCount: 4,
  },
  {
    _id: "3",
    title: "The Mandalorian",
    genre: { name: "Sci-Fi" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    verticalUrl:
      "https://via.placeholder.com/240x360/2D3748/ffffff?text=Mandalorian",
    seasonsCount: 3,
  },
  {
    _id: "4",
    title: "Attack on Titan",
    genre: { name: "Anime" },
    language: { name: "Japanese" },
    mediaUrl: "https://test-streams.mux.dev/test_001/stream.m3u8",
    verticalUrl:
      "https://via.placeholder.com/240x360/2D3748/ffffff?text=Attack+on+Titan",
    seasonsCount: 4,
  },
  {
    _id: "5",
    title: "The Boys",
    genre: { name: "Action" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    verticalUrl:
      "https://via.placeholder.com/240x360/2D3748/ffffff?text=The+Boys",
    seasonsCount: 4,
  },
  {
    _id: "6",
    title: "Squid Game",
    genre: { name: "Thriller" },
    language: { name: "Korean" },
    mediaUrl: "https://test-streams.mux.dev/test_001/stream.m3u8",
    verticalUrl:
      "https://via.placeholder.com/240x360/2D3748/ffffff?text=Squid+Game",
    seasonsCount: 2,
  },
  {
    _id: "7",
    title: "The Witcher",
    genre: { name: "Fantasy" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    verticalUrl:
      "https://via.placeholder.com/240x360/2D3748/ffffff?text=The+Witcher",
    seasonsCount: 3,
  },
  {
    _id: "8",
    title: "Arcane",
    genre: { name: "Animation" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/test_001/stream.m3u8",
    verticalUrl:
      "https://via.placeholder.com/240x360/2D3748/ffffff?text=Arcane",
    seasonsCount: 2,
  },
  {
    _id: "9",
    title: "House of Dragon",
    genre: { name: "Fantasy" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    verticalUrl:
      "https://via.placeholder.com/240x360/2D3748/ffffff?text=House+of+Dragon",
    seasonsCount: 2,
  },
  {
    _id: "10",
    title: "One Piece",
    genre: { name: "Anime" },
    language: { name: "Japanese" },
    mediaUrl: "https://test-streams.mux.dev/test_001/stream.m3u8",
    verticalUrl:
      "https://via.placeholder.com/240x360/2D3748/ffffff?text=One+Piece",
    seasonsCount: 20,
  },
];

const SeriesDummy = () => {
  const [series, setSeries] = useState(dummySeries);
  const [groupedSeries, setGroupedSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [useProxy, setUseProxy] = useState(true);
  const [currentStreamUrl, setCurrentStreamUrl] = useState(null);
  const [focusedGenre, setFocusedGenre] = useState(0);
  const [focusedShowIndex, setFocusedShowIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const videoRef = useRef(null);

  // Group series by genre
  useEffect(() => {
    setTimeout(() => {
      const byGenre = series.reduce((acc, show) => {
        const g = show.genre?.name || "Others";
        if (!acc[g]) acc[g] = [];
        acc[g].push(show);
        return acc;
      }, {});
      const sections = Object.entries(byGenre).map(([title, data]) => ({
        title,
        data,
      }));
      setGroupedSeries(sections);
      setLoading(false);
    }, 800);
  }, []);

  // Auto-select first series
  useEffect(() => {
    if (groupedSeries.length > 0 && groupedSeries[0]?.data?.length > 0) {
      handleShowChange(groupedSeries[0].data[0]);
    }
  }, [groupedSeries.length]);

  // Fullscreen handling
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

  const analyzeStreamUrl = (url) => {
    if (!url) return { type: "unknown", isValid: false };
    const urlLower = url.toLowerCase();
    if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
      return { type: "youtube-video", isValid: true };
    }
    if (urlLower.includes(".m3u8") || urlLower.includes("m3u"))
      return { type: "hls", isValid: true };
    if (urlLower.includes(".mp4")) return { type: "mp4", isValid: true };
    if (url.startsWith("http://") || url.startsWith("https://"))
      return { type: "stream", isValid: true };
    return { type: "unknown", isValid: false };
  };

  const getCurrentStreamUrl = (show, proxyEnabled) => {
    if (!show) return null;
    const type = analyzeStreamUrl(show.mediaUrl);
    if (type.type.startsWith("youtube")) return show.mediaUrl;
    return proxyEnabled && show.proxyUrl ? show.proxyUrl : show.mediaUrl;
  };

  const handleShowChange = (show) => {
    setSelectedSeries(show);
    setVideoError(false);
    setVideoLoading(true);
    const type = analyzeStreamUrl(show.mediaUrl);
    setUseProxy(!type.type.startsWith("youtube"));
    const url = getCurrentStreamUrl(show, !type.type.startsWith("youtube"));
    setCurrentStreamUrl(url);
    setTimeout(() => setVideoLoading(false), 1200);
  };

  const debouncedHandleShowChange = useMemo(
    () => (show) => handleShowChange(show),
    []
  );

  const handleNavigateRight = useCallback(() => {
    const currentGenre = groupedSeries[focusedGenre];
    if (currentGenre && focusedShowIndex < currentGenre.data.length - 1) {
      const nextIndex = focusedShowIndex + 1;
      setFocusedShowIndex(nextIndex);
      debouncedHandleShowChange(currentGenre.data[nextIndex]);
    }
  }, [
    focusedGenre,
    focusedShowIndex,
    groupedSeries,
    debouncedHandleShowChange,
  ]);

  const handleNavigateLeft = useCallback(() => {
    if (focusedShowIndex > 0) {
      const prevIndex = focusedShowIndex - 1;
      setFocusedShowIndex(prevIndex);
      const currentGenre = groupedSeries[focusedGenre];
      debouncedHandleShowChange(currentGenre.data[prevIndex]);
    }
  }, [
    focusedGenre,
    focusedShowIndex,
    groupedSeries,
    debouncedHandleShowChange,
  ]);

  const handleNavigateDown = useCallback(() => {
    if (focusedGenre < groupedSeries.length - 1) {
      const nextGenreIndex = focusedGenre + 1;
      setFocusedGenre(nextGenreIndex);
      setFocusedShowIndex(0);
      const nextGenre = groupedSeries[nextGenreIndex];
      if (nextGenre?.data[0]) debouncedHandleShowChange(nextGenre.data[0]);
    }
  }, [focusedGenre, groupedSeries, debouncedHandleShowChange]);

  const handleNavigateUp = useCallback(() => {
    if (focusedGenre > 0) {
      const prevGenreIndex = focusedGenre - 1;
      setFocusedGenre(prevGenreIndex);
      setFocusedShowIndex(0);
      const prevGenre = groupedSeries[prevGenreIndex];
      if (prevGenre?.data[0]) debouncedHandleShowChange(prevGenre.data[0]);
    }
  }, [focusedGenre, groupedSeries, debouncedHandleShowChange]);

  const handleOkButton = () => {
    setShowGrid(false);
  };

  const fetchSeries = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const renderStreamTypeBadge = (type) => {
    const badges = {
      "youtube-video": "YouTube",
      hls: "HLS",
      mp4: "MP4",
      stream: "Stream",
    };
    return (
      <div className="absolute top-2 right-2 bg-orange-500 px-2 py-1 rounded-lg text-xs font-bold text-white">
        {badges[type] || "Stream"}
      </div>
    );
  };

  const renderVideoPlayer = () => {
    if (!selectedSeries) {
      return (
        <div
          className="w-full h-full bg-gray-900 flex flex-col items-center justify-center rounded-xl p-12"
          style={{ height: isFullscreen ? "100vh" : PLAYER_HEIGHT }}
        >
          <PlayCircle className="w-24 h-24 text-gray-500 mb-6" />
          <p className="text-2xl font-semibold text-gray-300">
            Select a series to play
          </p>
        </div>
      );
    }

    const { type, isValid } = analyzeStreamUrl(selectedSeries.mediaUrl);

    if (!isValid) {
      return (
        <div
          className="w-full h-full bg-gray-900 flex flex-col items-center justify-center rounded-xl p-12 text-center"
          style={{ height: isFullscreen ? "100vh" : PLAYER_HEIGHT }}
        >
          <AlertCircle className="w-20 h-20 text-red-400 mb-6" />
          <p className="text-2xl font-semibold text-white mb-4">
            Invalid Stream
          </p>
          <p className="text-gray-400 text-lg">Please select another series</p>
        </div>
      );
    }

    return (
      <div
        className="relative bg-black rounded-xl overflow-hidden shadow-2xl"
        style={{ height: isFullscreen ? "100vh" : PLAYER_HEIGHT }}
      >
        {renderStreamTypeBadge(type)}

        {videoLoading && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
            <Loader2 className="w-16 h-16 text-orange-500 animate-spin mb-6" />
            <p className="text-2xl text-white mb-2">Loading series...</p>
            <p className="text-gray-400 text-lg">
              {useProxy ? "Proxy" : "Direct"}
            </p>
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls
          autoPlay
          muted
          src={currentStreamUrl}
        />

        {/* Series Info Bar */}
        {selectedSeries && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 p-6">
            <div className="flex items-center gap-4">
              <img
                src={selectedSeries.verticalUrl}
                alt={selectedSeries.title}
                className="w-20 h-28 rounded-lg flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white truncate mb-2">
                  {selectedSeries.title}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-orange-500 px-3 py-1 rounded-full text-sm font-semibold text-white">
                    {selectedSeries.genre?.name}
                  </span>
                  <span className="bg-gray-700 px-3 py-1 rounded-full text-sm text-gray-200">
                    {selectedSeries.language?.name}
                  </span>
                  <span className="bg-gray-700 px-3 py-1 rounded-full text-sm text-gray-200">
                    {selectedSeries.seasonsCount} Seasons
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowUserMenu(true)}
                className="p-3 bg-gray-800/50 hover:bg-gray-700 rounded-xl"
              >
                <Menu className="w-6 h-6 text-orange-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-6" />
          <p className="text-2xl text-white font-semibold">Loading series...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Film className="w-8 h-8 text-orange-500" />
            <h1 className="text-4xl font-bold">Web Series</h1>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-xl"
            title="Fullscreen"
          >
            <Maximize2 className="w-6 h-6" />
          </button>
        </div>

        {/* Video Player */}
        <div className="mb-8">{renderVideoPlayer()}</div>

        {/* OK Button */}
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

        {/* Series Grid */}
        {!isFullscreen && showGrid && (
          <div className="space-y-10">
            {groupedSeries.map((genre, genreIndex) => (
              <div key={genre.title}>
                <div className="flex items-center justify-between mb-6">
                  <h2
                    className={`text-2xl font-bold ${
                      focusedGenre === genreIndex
                        ? "text-orange-500"
                        : "text-white"
                    }`}
                  >
                    {genre.title}
                  </h2>
                  <span className="text-gray-400 text-lg">
                    {genre.data.length} series
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {genre.data.map((show, showIndex) => {
                    const isFocused =
                      focusedGenre === genreIndex &&
                      focusedShowIndex === showIndex;
                    const isPlaying = selectedSeries?._id === show._id;
                    return (
                      <button
                        key={show._id}
                        className={`group relative rounded-xl overflow-hidden transition-all hover:scale-105 ${
                          isPlaying
                            ? "border-3 border-orange-500 shadow-lg shadow-orange-500/30"
                            : isFocused
                            ? "border-2 border-yellow-400 ring-4 ring-yellow-400/30 scale-105"
                            : "border border-gray-700 hover:border-gray-600"
                        }`}
                        onClick={() => debouncedHandleShowChange(show)}
                      >
                        <div className="relative">
                          <img
                            src={
                              show.verticalUrl ||
                              "https://via.placeholder.com/300x450/1a1a1a/ffffff?text=Series"
                            }
                            alt={show.title}
                            className="w-full h-64 object-cover bg-gray-800"
                          />
                          {isPlaying && (
                            <div className="absolute inset-0 bg-orange-500/30 flex items-center justify-center">
                              <PlayCircle className="w-16 h-16 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-gray-800">
                          <h3
                            className={`font-semibold text-sm mb-2 line-clamp-2 ${
                              isPlaying ? "text-orange-400" : "text-white"
                            }`}
                          >
                            {show.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{show.genre?.name}</span>
                            <span>•</span>
                            <span>{show.language?.name}</span>
                            <span className="ml-auto text-orange-400 font-semibold">
                              {show.seasonsCount}s
                            </span>
                          </div>
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
              Show Series
            </button>
          </div>
        )}
      </div>

      {/* User Menu Modal */}
      {showUserMenu && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">Series Menu</h2>
              <button
                onClick={() => setShowUserMenu(false)}
                className="p-2 hover:bg-gray-800 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Stats */}
            <div className="bg-gray-800 rounded-2xl p-6 mb-8">
              <div className="flex items-center mb-6">
                <PlayCircle className="w-10 h-10 text-orange-500 mr-4" />
                <h3 className="text-xl font-bold">Library Stats</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between py-3">
                  <span className="text-gray-400">Total Series</span>
                  <span className="text-2xl font-bold text-white">
                    {series.length}
                  </span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-gray-400">Genres</span>
                  <span className="text-2xl font-bold text-orange-500">
                    {groupedSeries.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <button
                onClick={() => {
                  window.open("https://wa.me/1234567890", "_blank");
                  setShowUserMenu(false);
                }}
                className="w-full bg-green-600 hover:bg-green-700 py-5 px-6 rounded-2xl flex items-center justify-center gap-3 font-bold text-xl text-white transition-all"
              >
                <MessageCircle className="w-7 h-7" />
                Contact Support
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  fetchSeries();
                }}
                className="w-full bg-orange-600 hover:bg-orange-700 py-5 px-6 rounded-2xl flex items-center justify-center gap-3 font-bold text-xl text-white transition-all"
              >
                <RefreshCw className="w-7 h-7" />
                Refresh Series
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeriesDummy;
