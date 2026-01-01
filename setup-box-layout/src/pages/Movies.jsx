import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Film,
  Tv,
  PlayCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Maximize2,
} from "lucide-react";

const PLAYER_HEIGHT = 480;

const dummyMovies = [
  {
    _id: "1",
    title: "Inception",
    genre: { name: "Action" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    proxyUrl: "",
    verticalUrl:
      "https://via.placeholder.com/240x360/111827/ffffff?text=Inception",
  },
  {
    _id: "2",
    title: "The Dark Knight",
    genre: { name: "Action" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/test_001/stream.m3u8",
    proxyUrl: "",
    verticalUrl:
      "https://via.placeholder.com/240x360/111827/ffffff?text=Dark+Knight",
  },
  {
    _id: "3",
    title: "Interstellar",
    genre: { name: "Sci-Fi" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    proxyUrl: "",
    verticalUrl:
      "https://via.placeholder.com/240x360/111827/ffffff?text=Interstellar",
  },
  {
    _id: "4",
    title: "Spirited Away",
    genre: { name: "Animation" },
    language: { name: "Japanese" },
    mediaUrl: "https://test-streams.mux.dev/test_001/stream.m3u8",
    proxyUrl: "",
    verticalUrl:
      "https://via.placeholder.com/240x360/111827/ffffff?text=Spirited+Away",
  },
  {
    _id: "5",
    title: "Oppenheimer",
    genre: { name: "Drama" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    proxyUrl: "",
    verticalUrl:
      "https://via.placeholder.com/240x360/111827/ffffff?text=Oppenheimer",
  },
  {
    _id: "6",
    title: "Dune Part 2",
    genre: { name: "Sci-Fi" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/test_001/stream.m3u8",
    proxyUrl: "",
    verticalUrl:
      "https://via.placeholder.com/240x360/111827/ffffff?text=Dune+Part+2",
  },
  {
    _id: "7",
    title: "Godzilla Minus One",
    genre: { name: "Action" },
    language: { name: "Japanese" },
    mediaUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    proxyUrl: "",
    verticalUrl:
      "https://via.placeholder.com/240x360/111827/ffffff?text=Godzilla",
  },
  {
    _id: "8",
    title: "Barbie",
    genre: { name: "Comedy" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/test_001/stream.m3u8",
    proxyUrl: "",
    verticalUrl:
      "https://via.placeholder.com/240x360/111827/ffffff?text=Barbie",
  },
  {
    _id: "9",
    title: "John Wick 4",
    genre: { name: "Action" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    proxyUrl: "",
    verticalUrl:
      "https://via.placeholder.com/240x360/111827/ffffff?text=John+Wick+4",
  },
  {
    _id: "10",
    title: "Everything Everywhere",
    genre: { name: "Sci-Fi" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/test_001/stream.m3u8",
    proxyUrl: "",
    verticalUrl:
      "https://via.placeholder.com/240x360/111827/ffffff?text=Everything",
  },
  {
    _id: "11",
    title: "Parasite",
    genre: { name: "Thriller" },
    language: { name: "Korean" },
    mediaUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    proxyUrl: "",
    verticalUrl:
      "https://via.placeholder.com/240x360/111827/ffffff?text=Parasite",
  },
  {
    _id: "12",
    title: "The Banshees",
    genre: { name: "Drama" },
    language: { name: "English" },
    mediaUrl: "https://test-streams.mux.dev/test_001/stream.m3u8",
    proxyUrl: "",
    verticalUrl:
      "https://via.placeholder.com/240x360/111827/ffffff?text=Banshees",
  },
];

const MoviesDummy = () => {
  const [movies] = useState(dummyMovies);
  const [groupedMovies, setGroupedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [useProxy, setUseProxy] = useState(true);
  const [currentStreamUrl, setCurrentStreamUrl] = useState(null);
  const [focusedGenre, setFocusedGenre] = useState(0);
  const [focusedMovieIndex, setFocusedMovieIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const videoRef = useRef(null);

  // Group movies by genre
  useEffect(() => {
    const byGenre = movies.reduce((acc, movie) => {
      const g = movie.genre?.name || "Others";
      if (!acc[g]) acc[g] = [];
      acc[g].push(movie);
      return acc;
    }, {});
    const sections = Object.entries(byGenre).map(([title, data]) => ({
      title,
      data,
    }));
    setGroupedMovies(sections);
    setLoading(false);
  }, [movies]);

  // Auto-select first movie
  useEffect(() => {
    if (groupedMovies.length > 0 && groupedMovies[0]?.data?.length > 0) {
      const firstMovie = groupedMovies[0].data[0];
      handleMovieChange(firstMovie);
    }
  }, [groupedMovies.length]);

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

  const getCurrentStreamUrl = (movie, proxyEnabled) => {
    if (!movie) return null;
    const type = analyzeStreamUrl(movie.mediaUrl);
    if (type.type.startsWith("youtube")) return movie.mediaUrl;
    const baseUrl =
      proxyEnabled && movie.proxyUrl ? movie.proxyUrl : movie.mediaUrl;
    return baseUrl;
  };

  const handleMovieChange = (movie) => {
    setSelectedMovie(movie);
    setVideoError(false);
    setVideoLoading(true);
    const type = analyzeStreamUrl(movie.mediaUrl);
    setUseProxy(!type.type.startsWith("youtube"));
    const url = getCurrentStreamUrl(movie, !type.type.startsWith("youtube"));
    setCurrentStreamUrl(url);
    setTimeout(() => setVideoLoading(false), 1200);
  };

  const debouncedHandleMovieChange = useMemo(
    () => (movie) => handleMovieChange(movie),
    []
  );

  const handleNavigateRight = useCallback(() => {
    const currentGenre = groupedMovies[focusedGenre];
    if (currentGenre && focusedMovieIndex < currentGenre.data.length - 1) {
      const nextIndex = focusedMovieIndex + 1;
      setFocusedMovieIndex(nextIndex);
      debouncedHandleMovieChange(currentGenre.data[nextIndex]);
    }
  }, [
    focusedGenre,
    focusedMovieIndex,
    groupedMovies,
    debouncedHandleMovieChange,
  ]);

  const handleNavigateLeft = useCallback(() => {
    if (focusedMovieIndex > 0) {
      const prevIndex = focusedMovieIndex - 1;
      setFocusedMovieIndex(prevIndex);
      const currentGenre = groupedMovies[focusedGenre];
      debouncedHandleMovieChange(currentGenre.data[prevIndex]);
    }
  }, [
    focusedGenre,
    focusedMovieIndex,
    groupedMovies,
    debouncedHandleMovieChange,
  ]);

  const handleNavigateDown = useCallback(() => {
    if (focusedGenre < groupedMovies.length - 1) {
      const nextGenreIndex = focusedGenre + 1;
      setFocusedGenre(nextGenreIndex);
      setFocusedMovieIndex(0);
      const nextGenre = groupedMovies[nextGenreIndex];
      if (nextGenre?.data[0]) debouncedHandleMovieChange(nextGenre.data[0]);
    }
  }, [focusedGenre, groupedMovies, debouncedHandleMovieChange]);

  const handleNavigateUp = useCallback(() => {
    if (focusedGenre > 0) {
      const prevGenreIndex = focusedGenre - 1;
      setFocusedGenre(prevGenreIndex);
      setFocusedMovieIndex(0);
      const prevGenre = groupedMovies[prevGenreIndex];
      if (prevGenre?.data[0]) debouncedHandleMovieChange(prevGenre.data[0]);
    }
  }, [focusedGenre, groupedMovies, debouncedHandleMovieChange]);

  const handleOkButton = () => {
    setShowGrid(false);
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
    if (!selectedMovie) {
      return (
        <div
          className="w-full h-full bg-gray-900 flex flex-col items-center justify-center rounded-xl"
          style={{ height: isFullscreen ? "100vh" : PLAYER_HEIGHT }}
        >
          <Film className="w-20 h-20 text-gray-500 mb-4" />
          <p className="text-xl font-semibold text-gray-300">
            Select a movie to play
          </p>
        </div>
      );
    }

    const { type, isValid } = analyzeStreamUrl(selectedMovie.mediaUrl);

    if (!isValid) {
      return (
        <div
          className="w-full h-full bg-gray-900 flex flex-col items-center justify-center rounded-xl p-8 text-center"
          style={{ height: isFullscreen ? "100vh" : PLAYER_HEIGHT }}
        >
          <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
          <p className="text-xl font-semibold text-white mb-2">
            Invalid Stream
          </p>
          <p className="text-gray-400 text-sm">Please select another movie</p>
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
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            <p className="text-lg text-white">Loading stream...</p>
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls
          autoPlay
          muted
          src={currentStreamUrl || undefined}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-lg text-white">Loading movies...</p>
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
            <h1 className="text-4xl font-bold">Movies</h1>
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

        {/* Movies Grid */}
        {!isFullscreen && showGrid && (
          <div className="space-y-10">
            {groupedMovies.map((genre, genreIndex) => (
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
                    {genre.data.length} movies
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {genre.data.map((movie, movieIndex) => {
                    const isFocused =
                      focusedGenre === genreIndex &&
                      focusedMovieIndex === movieIndex;
                    const isPlaying = selectedMovie?._id === movie._id;
                    return (
                      <button
                        key={movie._id}
                        className={`group relative rounded-xl overflow-hidden transition-all hover:scale-105 ${
                          isPlaying
                            ? "border-3 border-orange-500 shadow-lg shadow-orange-500/30"
                            : isFocused
                            ? "border-2 border-yellow-400 ring-4 ring-yellow-400/30 scale-105"
                            : "border border-gray-700 hover:border-gray-600"
                        }`}
                        onClick={() => debouncedHandleMovieChange(movie)}
                      >
                        <div className="relative">
                          <img
                            src={
                              movie.verticalUrl ||
                              "https://via.placeholder.com/300x450/1a1a1a/ffffff?text=Movie"
                            }
                            alt={movie.title}
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
                            {movie.title}
                          </h3>
                          <div className="flex gap-2 text-xs text-gray-400">
                            <span>{movie.genre?.name}</span>
                            <span>•</span>
                            <span>{movie.language?.name}</span>
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
              Show Movies
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoviesDummy;
