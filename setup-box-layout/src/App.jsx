import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

// Pages
import Login from "./pages/Login.jsx";
import Movies from "./pages/Movies.jsx";
import Series from "./pages/Series.jsx";
import Channels from "./pages/Channels.jsx";
import Doc from "./pages/Doc.jsx";
import "./App.css";

import { Film, Tv, PlayCircle, LogIn, BookOpen } from "lucide-react";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/channels", icon: Tv, label: "Channels" },
    { path: "/movies", icon: Film, label: "Movies" },
    { path: "/series", icon: PlayCircle, label: "Series" },
    { path: "/doc", icon: BookOpen, label: "Docs" },
    { path: "/login", icon: LogIn, label: "Login" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-3 z-40 w-14 flex-col gap-2 hover:w-20 group/sidebar transition-all duration-300">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="relative p-2.5 rounded-xl transition-all flex items-center justify-center group/item hover:bg-orange-500/20 hover:scale-105 active:scale-95"
              title={label}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? "text-orange-400" : "text-gray-400"
                } transition-colors`}
              />
              {isActive && (
                <div className="absolute inset-0 bg-orange-500/30 rounded-xl -m-0.5" />
              )}
              <span
                className={`absolute left-full ml-2 px-2 py-1 bg-gray-800 text-xs font-bold rounded text-orange-400 whitespace-nowrap opacity-0 invisible group-hover/sidebar:opacity-100 group-hover/sidebar:visible transition-all pointer-events-none ${
                  isActive
                    ? "!opacity-100 !visible bg-orange-500/90 text-white"
                    : ""
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl px-4 py-3 z-40 flex gap-2 shadow-2xl">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                isActive
                  ? "bg-orange-500/30 text-orange-400 scale-110"
                  : "hover:bg-gray-800 text-gray-400 hover:scale-105 active:scale-95"
              }`}
              title={label}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

const AppContent = () => (
  <>
    <Sidebar />
    <div className="md:ml-20 pt-4 pb-20 md:pb-4 min-h-screen">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/series" element={<Series />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/doc" element={<Doc />} />
        <Route path="/" element={<Navigate to="/channels" replace />} />
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 md:ml-20">
              <div className="text-center max-w-sm">
                <h1 className="text-2xl md:text-4xl font-bold mb-4 text-orange-500">
                  Page Not Found
                </h1>
                <p className="text-gray-400 mb-6">Page doesn't exist.</p>
                <button
                  onClick={() => (window.location.href = "/channels")}
                  className="bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-xl font-bold text-sm md:text-lg shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                  Go to Channels
                </button>
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  </>
);

const App = () => {
  useEffect(() => {
    const handleWheel = (e) => {
      if (document.activeElement?.type === "number") {
        document.activeElement.blur();
      }
    };
    document.addEventListener("wheel", handleWheel);
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <Router>
      <div className="App min-h-screen bg-gray-900">
        <AppContent />
      </div>
    </Router>
  );
};

export default App;
