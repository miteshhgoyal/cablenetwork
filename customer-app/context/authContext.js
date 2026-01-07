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
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                const savedChannels = await AsyncStorage.getItem('channels');
                const savedPackages = await AsyncStorage.getItem('packagesList');
                const savedServerInfo = await AsyncStorage.getItem('serverInfo');

                if (savedChannels) setChannels(JSON.parse(savedChannels));
                if (savedPackages) setPackagesList(JSON.parse(savedPackages));
                if (savedServerInfo) {
                    setServerInfo(JSON.parse(savedServerInfo));
                } else {
                    setServerInfo({
                        proxyEnabled: true,
                        apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
                    });
                }

                refreshChannels().catch(console.error);
            } else {
                setIsAuthenticated(false);
                setSubscriptionStatus(null);
                setServerInfo({
                    proxyEnabled: true,
                    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
                });
            }
        } catch (error) {
            console.error('Auth check error:', error);
            setIsAuthenticated(false);
            setServerInfo({
                proxyEnabled: true,
                apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
            });
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

                const updatedUserData = response.data.data;
                const currentUser = await AsyncStorage.getItem('user');
                const parsedUser = currentUser ? JSON.parse(currentUser) : {};

                const mergedUser = {
                    ...parsedUser,
                    expiryDate: updatedUserData.expiryDate,
                    subscriberName: updatedUserData.subscriberName,
                    status: updatedUserData.status,
                    daysRemaining: updatedUserData.daysRemaining,
                    totalPackages: updatedUserData.totalPackages,
                    macAddress: updatedUserData.macAddress || parsedUser.macAddress
                };

                setUser(mergedUser);
                await AsyncStorage.setItem('user', JSON.stringify(mergedUser));

                return { valid: true, data: updatedUserData };
            } else {
                const statusCode = response.data.code;
                setSubscriptionStatus(statusCode);

                const userData = response.data.data;
                const currentUser = await AsyncStorage.getItem('user');
                const parsedUser = currentUser ? JSON.parse(currentUser) : {};

                const mergedUser = {
                    ...parsedUser,
                    expiryDate: userData?.expiryDate || parsedUser.expiryDate,
                    subscriberName: userData?.subscriberName || parsedUser.subscriberName,
                    status: userData?.status || statusCode,
                    totalPackages: userData?.totalPackages,
                    macAddress: userData?.macAddress || parsedUser.macAddress
                };

                setUser(mergedUser);
                await AsyncStorage.setItem('user', JSON.stringify(mergedUser));

                return {
                    valid: false,
                    code: statusCode,
                    message: response.data.message,
                    data: userData
                };
            }
        } catch (error) {
            console.error('Status check error:', error);

            if (error.response?.status === 403 || error.response?.status === 401) {
                const errorData = error.response?.data;
                const statusCode = errorData?.code || 'EXPIRED';
                const userData = errorData?.data;

                setSubscriptionStatus(statusCode);

                if (userData) {
                    const currentUser = await AsyncStorage.getItem('user');
                    const parsedUser = currentUser ? JSON.parse(currentUser) : {};

                    const mergedUser = {
                        ...parsedUser,
                        expiryDate: userData.expiryDate || parsedUser.expiryDate,
                        subscriberName: userData.subscriberName || parsedUser.subscriberName,
                        status: userData.status || statusCode,
                        totalPackages: userData.totalPackages,
                        macAddress: userData.macAddress || parsedUser.macAddress
                    };

                    setUser(mergedUser);
                    await AsyncStorage.setItem('user', JSON.stringify(mergedUser));
                }

                return {
                    valid: false,
                    code: statusCode,
                    message: errorData?.message,
                    data: userData
                };
            }

            return { valid: false, error: error.message };
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
                deviceName: deviceInfo.deviceName,
                customMac: customDeviceInfo.customMac || null
            });

            if (!response.data.success) {
                return {
                    success: false,
                    code: response.data.code,
                    message: response.data.message,
                    data: response.data.data
                };
            }

            const { token, subscriber, channels, packagesList, serverInfo } = response.data.data;

            await AsyncStorage.setItem('accessToken', token);
            await AsyncStorage.setItem('user', JSON.stringify(subscriber));
            await AsyncStorage.setItem('channels', JSON.stringify(channels));
            await AsyncStorage.setItem('packagesList', JSON.stringify(packagesList));
            await AsyncStorage.setItem('serverInfo', JSON.stringify(serverInfo));

            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setIsAuthenticated(true);
            setUser(subscriber);
            setChannels(channels);
            setPackagesList(packagesList);
            setServerInfo(serverInfo);
            setSubscriptionStatus('ACTIVE');

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);

            if (error.response?.data) {
                return {
                    success: false,
                    code: error.response.data.code,
                    message: error.response.data.message,
                    data: error.response.data.data
                };
            }

            return {
                success: false,
                message: error.message || 'Login failed'
            };
        }
    };

    const fetchOttContent = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken');
            if (!token) return;

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
            console.error('OTT content fetch error:', error);
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
                const { subscriber, channels: fetchedChannels, packagesList: fetchedPackages, serverInfo: fetchedServerInfo } = response.data.data;

                const currentUser = await AsyncStorage.getItem('user');
                const parsedUser = currentUser ? JSON.parse(currentUser) : {};

                const enrichedSubscriber = {
                    ...parsedUser,
                    ...subscriber,
                    modelName: parsedUser.modelName,
                    brand: parsedUser.brand,
                    manufacturer: parsedUser.manufacturer,
                    osName: parsedUser.osName,
                    osVersion: parsedUser.osVersion,
                    deviceType: parsedUser.deviceType,
                    appVersion: parsedUser.appVersion,
                    buildVersion: parsedUser.buildVersion,
                    deviceName: parsedUser.deviceName,
                };

                setUser(enrichedSubscriber);
                setChannels(fetchedChannels);
                setPackagesList(fetchedPackages);

                if (fetchedServerInfo) {
                    setServerInfo(fetchedServerInfo);
                    await AsyncStorage.setItem('serverInfo', JSON.stringify(fetchedServerInfo));
                }

                await AsyncStorage.setItem('user', JSON.stringify(enrichedSubscriber));
                await AsyncStorage.setItem('channels', JSON.stringify(fetchedChannels));
                await AsyncStorage.setItem('packagesList', JSON.stringify(fetchedPackages));

                return { success: true };
            }
        } catch (error) {
            console.error('Refresh channels error:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                await checkSubscriptionStatus();
            }
            return { success: false, error: error.message };
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