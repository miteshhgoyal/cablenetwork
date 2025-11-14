// context/authContext.js
import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import api from "../services/api";
import * as Device from 'expo-device';
import { Alert } from 'react-native';

// Import location and security services
import {
    startLocationTracking,
    stopLocationTracking,
    requestLocationPermissions
} from '../services/locationService';
import {
    checkDeviceSecurity,
    startSecurityMonitoring,
    stopSecurityMonitoring
} from '../services/securityService';

export const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    // User & Channels State
    const [user, setUser] = useState(null);
    const [channels, setChannels] = useState([]);
    const [packagesList, setPackagesList] = useState([]);

    // OTT Content State (Movies & Series)
    const [movies, setMovies] = useState([]);
    const [series, setSeries] = useState([]);
    const [groupedMovies, setGroupedMovies] = useState([]);
    const [groupedSeries, setGroupedSeries] = useState([]);

    // App State
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [serverInfo, setServerInfo] = useState(null);
    const [securityIntervalId, setSecurityIntervalId] = useState(null);

    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // ✅ FIX: Check for 'accessToken' (consistent key)
            const token = await AsyncStorage.getItem('accessToken');
            const savedChannels = await AsyncStorage.getItem('channels');
            const savedUser = await AsyncStorage.getItem('user');
            const savedPackages = await AsyncStorage.getItem('packagesList');
            const savedServerInfo = await AsyncStorage.getItem('serverInfo');

            // Load cached OTT content
            const savedMovies = await AsyncStorage.getItem('movies');
            const savedSeries = await AsyncStorage.getItem('series');
            const savedGroupedMovies = await AsyncStorage.getItem('groupedMovies');
            const savedGroupedSeries = await AsyncStorage.getItem('groupedSeries');

            if (token && savedChannels && savedUser) {
                const parsedChannels = JSON.parse(savedChannels);
                const parsedUser = JSON.parse(savedUser);
                const parsedPackages = savedPackages ? JSON.parse(savedPackages) : [];
                const parsedServerInfo = savedServerInfo ? JSON.parse(savedServerInfo) : null;

                setIsAuthenticated(true);
                setChannels(parsedChannels);
                setUser(parsedUser);
                setPackagesList(parsedPackages);
                setServerInfo(parsedServerInfo);

                // Load OTT content if available
                if (savedMovies) setMovies(JSON.parse(savedMovies));
                if (savedSeries) setSeries(JSON.parse(savedSeries));
                if (savedGroupedMovies) setGroupedMovies(JSON.parse(savedGroupedMovies));
                if (savedGroupedSeries) setGroupedSeries(JSON.parse(savedGroupedSeries));

                // Fetch fresh OTT content in background
                fetchOttContent();
            } else {
                setIsAuthenticated(false);
                setUser(null);
                setChannels([]);
                setPackagesList([]);
                setServerInfo(null);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    const login = async (partnerCode) => {
        try {
            const macAddress = Device.modelId || Device.osBuildId || "UNKNOWN_DEVICE";
            const deviceName = Device.deviceName || "User Device";

            const response = await api.post('/customer/login', {
                partnerCode: partnerCode.trim(),
                macAddress,
                deviceName
            });

            if (response.data.success) {
                const { token, subscriber, channels: fetchedChannels, packagesList: fetchedPackages, serverInfo: fetchedServerInfo } = response.data.data;

                // ✅ FIX: Save with 'accessToken' key to match api.js and tokenService
                await AsyncStorage.setItem('accessToken', token);  // Changed from 'token'
                await AsyncStorage.setItem('channels', JSON.stringify(fetchedChannels));
                await AsyncStorage.setItem('user', JSON.stringify(subscriber));
                await AsyncStorage.setItem('packagesList', JSON.stringify(fetchedPackages));

                if (fetchedServerInfo) {
                    await AsyncStorage.setItem('serverInfo', JSON.stringify(fetchedServerInfo));
                }

                // Update state
                setUser(subscriber);
                setChannels(fetchedChannels);
                setPackagesList(fetchedPackages);
                setServerInfo(fetchedServerInfo || null);
                setIsAuthenticated(true);

                // Fetch OTT content
                await fetchOttContent();

                return { success: true };
            } else {
                return {
                    success: false,
                    code: response.data.code || null,
                    message: response.data.message || 'Login failed'
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                code: error.response?.data?.code || null,
                message: error.response?.data?.message || error.message || 'Invalid partner code'
            };
        }
    };

    // Fetch OTT Content (Movies & Series)
    const fetchOttContent = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            // Fetch Movies
            const moviesResponse = await api.get('/customer/movies', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (moviesResponse.data.success) {
                const { movies: fetchedMovies, groupedByGenre: groupedMoviesByGenre } = moviesResponse.data.data;

                // Convert grouped object to array for SectionList
                const moviesSections = Object.entries(groupedMoviesByGenre).map(
                    ([genre, movies]) => ({ title: genre, data: movies })
                );

                setMovies(fetchedMovies);
                setGroupedMovies(moviesSections);

                // Cache to AsyncStorage
                await AsyncStorage.setItem('movies', JSON.stringify(fetchedMovies));
                await AsyncStorage.setItem('groupedMovies', JSON.stringify(moviesSections));
            }

            // Fetch Series
            const seriesResponse = await api.get('/customer/series', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (seriesResponse.data.success) {
                const { series: fetchedSeries, groupedByGenre: groupedSeriesByGenre } = seriesResponse.data.data;

                const seriesSections = Object.entries(groupedSeriesByGenre).map(
                    ([genre, series]) => ({ title: genre, data: series })
                );

                setSeries(fetchedSeries);
                setGroupedSeries(seriesSections);

                // Cache to AsyncStorage
                await AsyncStorage.setItem('series', JSON.stringify(fetchedSeries));
                await AsyncStorage.setItem('groupedSeries', JSON.stringify(seriesSections));
            }
        } catch (error) {
            console.error('❌ Fetch OTT content error:', error);
        }
    };

    const refreshChannels = async () => {
        try {
            setRefreshing(true);

            const token = await AsyncStorage.getItem('token');

            if (!token) {
                console.warn('⚠️ No token found for refresh');
                return { success: false, message: 'Not authenticated' };
            }

            const response = await api.get('/customer/refresh-channels', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                const {
                    subscriber,
                    channels: fetchedChannels,
                    packagesList: fetchedPackages,
                    serverInfo: fetchedServerInfo
                } = response.data.data;

                // Save to AsyncStorage
                await AsyncStorage.setItem('channels', JSON.stringify(fetchedChannels));
                await AsyncStorage.setItem('user', JSON.stringify(subscriber));
                await AsyncStorage.setItem('packagesList', JSON.stringify(fetchedPackages || []));

                if (fetchedServerInfo) {
                    await AsyncStorage.setItem('serverInfo', JSON.stringify(fetchedServerInfo));
                }

                // Update state
                setUser(subscriber);
                setChannels(fetchedChannels);
                setPackagesList(fetchedPackages || []);
                setServerInfo(fetchedServerInfo || null);

                // Also refresh OTT content
                await fetchOttContent();

                return { success: true };
            } else {
                return { success: false, message: 'Refresh failed' };
            }
        } catch (error) {
            console.error('❌ Refresh error:', error);

            if (error.response?.status === 401) {
                console.warn('⚠️ Session expired - logging out');
                await logout();
                return { success: false, message: 'Session expired' };
            }

            return {
                success: false,
                message: error.response?.data?.message || 'Failed to refresh'
            };
        } finally {
            setRefreshing(false);
        }
    };

    const logout = async () => {
        try {
            // Stop services
            try {
                await stopLocationTracking();
            } catch (locationError) {
                console.warn('Failed to stop location tracking:', locationError);
            }

            try {
                stopSecurityMonitoring(securityIntervalId);
                setSecurityIntervalId(null);
            } catch (securityError) {
                console.warn('Failed to stop security monitoring:', securityError);
            }

            // ✅ FIX: Clear 'accessToken' instead of 'token'
            await AsyncStorage.multiRemove([
                'accessToken',  // Changed from 'token'
                'channels',
                'user',
                'packagesList',
                'serverInfo',
                'movies',
                'series',
                'groupedMovies',
                'groupedSeries'
            ]);

            // Reset state
            setIsAuthenticated(false);
            setChannels([]);
            setUser(null);
            setPackagesList([]);
            setServerInfo(null);
            setMovies([]);
            setSeries([]);
            setGroupedMovies([]);
            setGroupedSeries([]);

            // Navigate to login
            router.replace('/auth/signin');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    const value = {
        // User & Auth
        user,
        isAuthenticated,
        loading,
        refreshing,

        // Channels
        channels,
        packagesList,
        serverInfo,

        // OTT Content (Movies & Series)
        movies,
        series,
        groupedMovies,
        groupedSeries,

        // Functions
        login,
        logout,
        checkAuth,
        refreshChannels,
        fetchOttContent,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
