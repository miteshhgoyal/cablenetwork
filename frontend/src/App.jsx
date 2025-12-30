import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import Navbar from "./components/layout/Navbar.jsx";

// Auth Pages
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";

import LoadingSpinner from "./components/common/LoadingSpinner.jsx";
import "./App.css";
import Dashboard from "./pages/Dashboard.jsx";
import Categories from "./pages/Categories.jsx";
import Channels from "./pages/Channels.jsx";
import Subscribers from "./pages/Subscribers.jsx";
import Packages from "./pages/Packages.jsx";
import Resellers from "./pages/Resellers.jsx";
import Ott from "./pages/Ott.jsx";
import Credit from "./pages/Credit.jsx";
import Profile from "./pages/Profile.jsx";
import Distributors from "./pages/Distributors.jsx";

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (user) {
    // Redirect based on user role
    const redirectPaths = {
      admin: "/admin/dashboard",
      distributor: "/distributor/dashboard",
      reseller: "/reseller/dashboard",
    };
    return <Navigate to={redirectPaths[user.role] || "/dashboard"} replace />;
  }

  return children;
};

const App = () => {
  // FIX: Disable number input scroll globally
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
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            {/* Distributor Routes */}
            <Route
              path="/distributor/dashboard"
              element={
                <ProtectedRoute allowedRoles={["distributor"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/distributor/categories"
              element={
                <ProtectedRoute allowedRoles={["distributor"]}>
                  <Categories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/distributor/channels"
              element={
                <ProtectedRoute allowedRoles={["distributor"]}>
                  <Channels />
                </ProtectedRoute>
              }
            />
            <Route
              path="/distributor/subscribers"
              element={
                <ProtectedRoute allowedRoles={["distributor"]}>
                  <Subscribers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/distributor/packages"
              element={
                <ProtectedRoute allowedRoles={["distributor"]}>
                  <Packages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/distributor/resellers"
              element={
                <ProtectedRoute allowedRoles={["distributor"]}>
                  <Resellers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/distributor/ott"
              element={
                <ProtectedRoute allowedRoles={["distributor"]}>
                  <Ott />
                </ProtectedRoute>
              }
            />
            <Route
              path="/distributor/credit"
              element={
                <ProtectedRoute allowedRoles={["distributor"]}>
                  <Credit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/distributor/profile"
              element={
                <ProtectedRoute allowedRoles={["distributor"]}>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Reseller Routes */}
            <Route
              path="/reseller/dashboard"
              element={
                <ProtectedRoute allowedRoles={["reseller"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reseller/subscribers"
              element={
                <ProtectedRoute allowedRoles={["reseller"]}>
                  <Subscribers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reseller/packages"
              element={
                <ProtectedRoute allowedRoles={["reseller"]}>
                  <Packages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reseller/profile"
              element={
                <ProtectedRoute allowedRoles={["reseller"]}>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reseller/credit"
              element={
                <ProtectedRoute allowedRoles={["reseller"]}>
                  <Credit />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Categories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/channels"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Channels />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subscribers"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Subscribers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/packages"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Packages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/resellers"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Resellers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/distributors"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Distributors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ott"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Ott />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/credit"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Credit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/profile"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Default Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route
              path="/unauthorized"
              element={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                      Unauthorized
                    </h1>
                    <p className="text-gray-600">
                      You don't have permission to access this page.
                    </p>
                  </div>
                </div>
              }
            />
            <Route
              path="*"
              element={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                      Page Not Found
                    </h1>
                    <p className="text-gray-600">
                      The page you're looking for doesn't exist.
                    </p>
                  </div>
                </div>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
