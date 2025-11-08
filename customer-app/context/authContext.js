// context/authContext.js
import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import api from "../services/api";
import * as Device from 'expo-device';

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
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [serverInfo, setServerInfo] = useState(null);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const savedChannels = await AsyncStorage.getItem('channels');
            const savedUser = await AsyncStorage.getItem('user');
            const savedPackages = await AsyncStorage.getItem('packagesList');
            const savedServerInfo = await AsyncStorage.getItem('serverInfo');

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
            } else {
                setIsAuthenticated(false);
                setUser(null);
                setChannels([]);
                setPackagesList([]);
                setServerInfo(null);
            }
        } catch (error) {
            console.error('❌ Auth check error:', error);
            setIsAuthenticated(false);
            setUser(null);
            setChannels([]);
            setPackagesList([]);
            setServerInfo(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (partnerCode) => {
        try {
            const macAddress = Device.modelId || Device.osBuildId || 'UNKNOWN_DEVICE';
            const deviceName = Device.deviceName || 'User Device';

            const response = await api.post(`/customer/login`, {
                partnerCode: partnerCode.trim(),
                macAddress,
                deviceName
            });

            if (response.data.success) {
                const {
                    token,
                    subscriber,
                    channels: fetchedChannels,
                    packagesList: fetchedPackages,
                    serverInfo: fetchedServerInfo
                } = response.data.data;

                // Save to AsyncStorage
                await AsyncStorage.setItem('token', token);
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

                setIsAuthenticated(true);

                console.log('✅ Login successful with proxy support:', fetchedServerInfo?.proxyEnabled);

                return { success: true };
            } else {
                return { success: false, message: 'Login failed' };
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            console.error('Error details:', error.response?.data);
            return {
                success: false,
                message: error.response?.data?.message || 'Invalid partner code'
            };
        }
    };

    // UPDATED: Refresh channels with proxy info
    const refreshChannels = async () => {
        try {
            setRefreshing(true);

            const token = await AsyncStorage.getItem('token');

            if (!token) {
                return { success: false, message: 'Not authenticated' };
            }

            const response = await api.get('/customer/refresh-channels', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {
                const {
                    subscriber,
                    channels: fetchedChannels,
                    packagesList: fetchedPackages,
                    serverInfo: fetchedServerInfo
                } = response.data.data;

                // Update AsyncStorage
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

                console.log('✅ Channels refreshed with proxy support');

                return { success: true };
            } else {
                return { success: false, message: 'Refresh failed' };
            }
        } catch (error) {
            console.error('❌ Refresh error:', error);

            // If token expired, logout
            if (error.response?.status === 401) {
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
            await AsyncStorage.multiRemove(['token', 'channels', 'user', 'packagesList', 'serverInfo']);

            setIsAuthenticated(false);
            setChannels([]);
            setUser(null);
            setPackagesList([]);
            setServerInfo(null);

            const inAuthGroup = segments[0] === '(auth)';
            if (!inAuthGroup) {
                router.replace('/(auth)/signin');
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
        }
    };

    const value = {
        user,
        channels,
        packagesList,
        serverInfo,
        isAuthenticated,
        loading,
        refreshing,
        login,
        logout,
        checkAuth,
        refreshChannels,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
