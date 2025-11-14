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
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);

    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken');
            const savedUser = await AsyncStorage.getItem('user');

            if (token && savedUser) {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                setIsAuthenticated(true);

                // Set API token
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                // Load cached channels
                const savedChannels = await AsyncStorage.getItem('channels');
                if (savedChannels) {
                    setChannels(JSON.parse(savedChannels));
                }

                // ✅ CHECK STATUS FROM DB
                await checkSubscriptionStatus();
            } else {
                setIsAuthenticated(false);
                setSubscriptionStatus(null);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

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

                // ✅ UPDATE USER DATA WITH LATEST FROM DB
                const updatedUserData = response.data.data;
                const currentUser = await AsyncStorage.getItem('user');
                const parsedUser = currentUser ? JSON.parse(currentUser) : {};

                // Merge with existing user data
                const mergedUser = {
                    ...parsedUser,
                    expiryDate: updatedUserData.expiryDate,
                    subscriberName: updatedUserData.subscriberName,
                    status: updatedUserData.status,
                    daysRemaining: updatedUserData.daysRemaining
                };

                // Update state and storage
                setUser(mergedUser);
                await AsyncStorage.setItem('user', JSON.stringify(mergedUser));



                return { valid: true, data: updatedUserData };
            } else {
                // EXPIRED or INACTIVE
                setSubscriptionStatus(response.data.code);

                // ✅ UPDATE USER DATA EVEN IF EXPIRED (to show expiry date)
                const expiredUserData = response.data.data;
                const currentUser = await AsyncStorage.getItem('user');
                const parsedUser = currentUser ? JSON.parse(currentUser) : {};

                const mergedUser = {
                    ...parsedUser,
                    expiryDate: expiredUserData.expiryDate,
                    subscriberName: expiredUserData.subscriberName,
                    status: expiredUserData.status,
                    macAddress: expiredUserData.macAddress
                };

                setUser(mergedUser);
                await AsyncStorage.setItem('user', JSON.stringify(mergedUser));



                return {
                    valid: false,
                    code: response.data.code,
                    data: expiredUserData
                };
            }
        } catch (error) {
            console.error('Status check failed:', error);

            if (error.response?.status === 401 || error.response?.status === 403) {
                await logout();
                return { valid: false, needsLogin: true };
            }

            // ✅ Don't log out on network errors - use cached data
            return { valid: false };
        }
    };

    const collectDeviceInfo = async (customInfo = {}) => {
        return {
            macAddress: customInfo.macAddress || Device.modelId || Device.osBuildId || "UNKNOWN_DEVICE",
            deviceName: customInfo.deviceName || Device.deviceName || "Unknown Device",
            modelName: Device.modelName || "Unknown Model",
            brand: Device.brand || "Unknown",
            manufacturer: Device.manufacturer || "Unknown",
            osName: Device.osName || "Unknown OS",
            osVersion: Device.osVersion || "Unknown",
            platformApiLevel: Device.platformApiLevel || null,
            deviceType: Device.deviceType === 1 ? 'Phone' : 'Tablet',
            isDevice: Device.isDevice,
            appVersion: Application.nativeApplicationVersion || "1.0.0",
            buildVersion: Application.nativeBuildVersion || "1",
        };
    };

    const login = async (partnerCode, customDeviceInfo = {}) => {
        try {
            const deviceInfo = await collectDeviceInfo(customDeviceInfo);

            const response = await api.post('/customer/login', {
                partnerCode: partnerCode.trim(),
                macAddress: deviceInfo.macAddress,
                deviceName: deviceInfo.deviceName
            });



            // ✅ Check if login was successful
            if (!response.data.success) {
                return {
                    success: false,
                    code: response.data.code,
                    message: response.data.message
                };
            }

            // ✅ Extract data
            const token = response.data.data?.token;
            const subscriber = response.data.data?.subscriber;
            const fetchedChannels = response.data.data?.channels || [];
            const fetchedPackages = response.data.data?.packagesList || [];
            const fetchedServerInfo = response.data.data?.serverInfo || {};




            // ✅ Validate
            if (!token) {
                console.error('❌ No token in response!');
                return {
                    success: false,
                    message: 'Authentication failed - no token received'
                };
            }

            if (!subscriber) {
                console.error('❌ No subscriber data in response!');
                return {
                    success: false,
                    message: 'Authentication failed - no subscriber data'
                };
            }

            // ✅ Save to AsyncStorage
            await AsyncStorage.setItem('accessToken', token);
            await AsyncStorage.setItem('user', JSON.stringify(subscriber));
            await AsyncStorage.setItem('channels', JSON.stringify(fetchedChannels));
            await AsyncStorage.setItem('packagesList', JSON.stringify(fetchedPackages));
            await AsyncStorage.setItem('serverInfo', JSON.stringify(fetchedServerInfo));



            // Set API header
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            // ✅ Update state BEFORE navigation
            setUser(subscriber);
            setChannels(fetchedChannels);
            setPackagesList(fetchedPackages);
            setServerInfo(fetchedServerInfo);
            setIsAuthenticated(true);
            setSubscriptionStatus('ACTIVE'); // ✅ Set immediately

            // Fetch OTT content in background
            fetchOttContent();

            // ✅ NAVIGATE IMMEDIATELY

            setTimeout(() => {
                router.replace('/(tabs)');
            }, 300);

            return { success: true };

        } catch (error) {
            console.error('❌ Login error:', error);
            console.error('❌ Error response:', error.response?.data);

            if (error.response?.data) {
                return {
                    success: false,
                    code: error.response.data.code,
                    message: error.response.data.message
                };
            }

            return {
                success: false,
                message: error.message || 'Login failed - network error'
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
                setMovies(moviesResponse.data.data.movies || []);
                const grouped = Object.entries(moviesResponse.data.data.groupedByGenre || {}).map(
                    ([genre, movies]) => ({ title: genre, data: movies })
                );
                setGroupedMovies(grouped);
            }

            // Fetch series
            const seriesResponse = await api.get('/customer/series', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (seriesResponse.data.success) {
                setSeries(seriesResponse.data.data.series || []);
                const grouped = Object.entries(seriesResponse.data.data.groupedByGenre || {}).map(
                    ([genre, series]) => ({ title: genre, data: series })
                );
                setGroupedSeries(grouped);
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
                'serverInfo'
            ]);

            delete api.defaults.headers.common['Authorization'];

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
                subscriptionStatus,
                login,
                logout,
                checkAuth,
                refreshChannels,
                fetchOttContent,
                checkSubscriptionStatus
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
