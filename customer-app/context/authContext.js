// context/authContext.js
import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from "../services/api";
import * as Device from 'expo-device';
import * as Application from 'expo-application';

export const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    // States
    const [user, setUser] = useState(null);
    const [channels, setChannels] = useState([]);
    const [packagesList, setPackagesList] = useState([]);
    const [movies, setMovies] = useState([]);
    const [series, setSeries] = useState([]);
    const [groupedMovies, setGroupedMovies] = useState([]);
    const [groupedSeries, setGroupedSeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [serverInfo, setServerInfo] = useState(null);

    // ✅ NEW: Subscription status
    const [subscriptionStatus, setSubscriptionStatus] = useState(null); // 'ACTIVE', 'EXPIRED', 'INACTIVE'

    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken');
            const savedUser = await AsyncStorage.getItem('user');
            const savedChannels = await AsyncStorage.getItem('channels');

            if (token && savedUser) {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                setIsAuthenticated(true);

                if (savedChannels) {
                    setChannels(JSON.parse(savedChannels));
                }

                // ✅ CHECK SUBSCRIPTION STATUS FROM DB
                await checkSubscriptionStatus();
            } else {
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    // ✅ CHECK SUBSCRIPTION STATUS FROM BACKEND
    const checkSubscriptionStatus = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken');
            if (!token) {
                setSubscriptionStatus(null);
                return { valid: false, needsLogin: true };
            }

            const response = await api.get('/customer/check-status', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success && response.data.code === 'ACTIVE') {
                setSubscriptionStatus('ACTIVE');

                // Update user data
                const updatedUser = { ...user, ...response.data.data };
                setUser(updatedUser);
                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

                return {
                    valid: true,
                    data: response.data.data
                };
            } else {
                // EXPIRED or INACTIVE
                setSubscriptionStatus(response.data.code); // 'EXPIRED' or 'INACTIVE'
                return {
                    valid: false,
                    code: response.data.code,
                    data: response.data.data,
                    needsLogin: false
                };
            }
        } catch (error) {
            console.error('Status check failed:', error);

            if (error.response?.status === 401 || error.response?.status === 403) {
                await logout();
                return { valid: false, needsLogin: true };
            }

            return { valid: false, needsLogin: false };
        }
    };

    // Device info collection
    const collectDeviceInfo = async (customInfo = {}) => {
        return {
            macAddress: customInfo.macAddress || Device.modelId || Device.osBuildId || "UNKNOWN_DEVICE",
            deviceName: customInfo.deviceName || Device.deviceName || "Unknown Device",
            modelName: customInfo.modelName || Device.modelName || "Unknown Model",
            brand: customInfo.brand || Device.brand || "Unknown",
            manufacturer: customInfo.manufacturer || Device.manufacturer || "Unknown",
            osName: customInfo.osName || Device.osName || "Unknown OS",
            osVersion: customInfo.osVersion || Device.osVersion || "Unknown",
            platformApiLevel: customInfo.platformApiLevel || Device.platformApiLevel || null,
            deviceType: customInfo.deviceType || (Device.deviceType === 1 ? 'Phone' : 'Tablet'),
            isDevice: Device.isDevice,
            appVersion: customInfo.appVersion || Application.nativeApplicationVersion || "1.0.0",
            buildVersion: customInfo.buildVersion || Application.nativeBuildVersion || "1",
        };
    };

    const login = async (partnerCode, customDeviceInfo = {}) => {
        try {
            const deviceInfo = await collectDeviceInfo(customDeviceInfo);

            const response = await api.post('/customer/login', {
                partnerCode: partnerCode.trim(),
                ...deviceInfo
            });

            if (response.data.success) {
                const {
                    token,
                    data: {
                        subscriber,
                        channels: fetchedChannels,
                        packagesList: fetchedPackages,
                        serverInfo: fetchedServerInfo
                    }
                } = response.data;

                // Save data
                await AsyncStorage.setItem('accessToken', token);
                await AsyncStorage.setItem('user', JSON.stringify(subscriber));
                await AsyncStorage.setItem('channels', JSON.stringify(fetchedChannels));
                await AsyncStorage.setItem('packagesList', JSON.stringify(fetchedPackages));
                await AsyncStorage.setItem('serverInfo', JSON.stringify(fetchedServerInfo || {}));

                // Update state
                setUser(subscriber);
                setChannels(fetchedChannels);
                setPackagesList(fetchedPackages);
                setServerInfo(fetchedServerInfo);
                setIsAuthenticated(true);
                setSubscriptionStatus('ACTIVE'); // Successful login means active

                // Fetch OTT content
                await fetchOttContent();

                return { success: true };
            } else {
                return {
                    success: false,
                    code: response.data.code,
                    message: response.data.message
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                code: error.response?.data?.code,
                message: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const fetchOttContent = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken');
            if (!token) return;

            // Fetch movies
            const moviesResponse = await api.get('/customer/movies', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (moviesResponse.data.success) {
                setMovies(moviesResponse.data.data.movies);
                setGroupedMovies(Object.entries(moviesResponse.data.data.groupedByGenre).map(
                    ([genre, movies]) => ({ title: genre, data: movies })
                ));
            }

            // Fetch series
            const seriesResponse = await api.get('/customer/series', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (seriesResponse.data.success) {
                setSeries(seriesResponse.data.data.series);
                setGroupedSeries(Object.entries(seriesResponse.data.data.groupedByGenre).map(
                    ([genre, series]) => ({ title: genre, data: series })
                ));
            }
        } catch (error) {
            console.error('Fetch OTT error:', error);
        }
    };

    const refreshChannels = async () => {
        try {
            setRefreshing(true);
            const token = await AsyncStorage.getItem('accessToken');
            if (!token) return { success: false };

            const response = await api.get('/customer/refresh-channels', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                const { subscriber, channels: fetchedChannels, packagesList: fetchedPackages } = response.data.data;

                setUser(subscriber);
                setChannels(fetchedChannels);
                setPackagesList(fetchedPackages);

                await AsyncStorage.setItem('user', JSON.stringify(subscriber));
                await AsyncStorage.setItem('channels', JSON.stringify(fetchedChannels));
                await AsyncStorage.setItem('packagesList', JSON.stringify(fetchedPackages));

                return { success: true };
            }
        } catch (error) {
            console.error('Refresh error:', error);
            if (error.response?.status === 401) {
                await logout();
            }
        } finally {
            setRefreshing(false);
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.multiRemove([
                'accessToken',
                'user',
                'channels',
                'packagesList',
                'serverInfo',
                'movies',
                'series'
            ]);

            setIsAuthenticated(false);
            setUser(null);
            setChannels([]);
            setPackagesList([]);
            setSubscriptionStatus(null);
            setMovies([]);
            setSeries([]);

            router.replace('/(auth)/signin');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                loading,
                refreshing,
                channels,
                packagesList,
                serverInfo,
                movies,
                series,
                groupedMovies,
                groupedSeries,
                subscriptionStatus, // ✅ NEW
                login,
                logout,
                checkAuth,
                refreshChannels,
                fetchOttContent,
                checkSubscriptionStatus // ✅ NEW
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
