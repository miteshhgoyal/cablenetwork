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
    const [user, setUser] = useState(null);
    const [channels, setChannels] = useState([]);
    const [packagesList, setPackagesList] = useState([]);
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
            console.log('🔍 Checking authentication...');

            const token = await AsyncStorage.getItem('token');
            const savedChannels = await AsyncStorage.getItem('channels');
            const savedUser = await AsyncStorage.getItem('user');
            const savedPackages = await AsyncStorage.getItem('packagesList');
            const savedServerInfo = await AsyncStorage.getItem('serverInfo');

            console.log('Token exists:', !!token);
            console.log('Saved user exists:', !!savedUser);
            console.log('Saved channels exists:', !!savedChannels);

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

                // Start security monitoring with error handling
                try {
                    const intervalId = startSecurityMonitoring();
                    setSecurityIntervalId(intervalId);
                    console.log('🔒 Security monitoring started');
                } catch (securityError) {
                    console.warn('⚠️ Security monitoring failed:', securityError);
                    // Continue anyway - don't fail authentication
                }

                console.log('✅ User authenticated from storage');
            } else {
                console.log('❌ Authentication failed - missing data');
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

            console.log('📡 Attempting login with partner code...');
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

                console.log('💾 Saving authentication data...');

                // Save to AsyncStorage FIRST (most critical)
                try {
                    await AsyncStorage.setItem('token', token);
                    await AsyncStorage.setItem('channels', JSON.stringify(fetchedChannels));
                    await AsyncStorage.setItem('user', JSON.stringify(subscriber));
                    await AsyncStorage.setItem('packagesList', JSON.stringify(fetchedPackages || []));

                    if (fetchedServerInfo) {
                        await AsyncStorage.setItem('serverInfo', JSON.stringify(fetchedServerInfo));
                    }

                    console.log('✅ Authentication data saved to AsyncStorage');
                } catch (storageError) {
                    console.error('❌ AsyncStorage save error:', storageError);
                    throw new Error('Failed to save authentication data');
                }

                // Update state AFTER successful storage
                setUser(subscriber);
                setChannels(fetchedChannels);
                setPackagesList(fetchedPackages || []);
                setServerInfo(fetchedServerInfo || null);
                setIsAuthenticated(true);

                console.log('✅ Login successful - state updated');

                // ========================================
                // SECURITY & LOCATION (NON-BLOCKING)
                // ========================================
                // These run in background and don't block login

                // Security check (with error handling)
                try {
                    console.log('🔒 Checking device security...');
                    const securityCheck = await checkDeviceSecurity();

                    if (securityCheck.isVPNActive) {
                        // Use setTimeout to avoid blocking
                        setTimeout(() => {
                            Alert.alert(
                                '⚠️ VPN Detected',
                                'VPN is active. This may affect streaming quality.',
                                [{ text: 'OK' }]
                            );
                        }, 500);
                    }
                } catch (securityError) {
                    console.warn('⚠️ Security check failed:', securityError);
                    // Don't fail login if security check fails
                }

                // Location tracking (with error handling)
                try {
                    console.log('📍 Requesting location permissions...');
                    const locationPermission = await requestLocationPermissions();

                    if (locationPermission.success) {
                        console.log('📍 Starting location tracking...');
                        await startLocationTracking();
                    } else {
                        console.warn('⚠️ Location permission denied');
                    }
                } catch (locationError) {
                    console.warn('⚠️ Location tracking failed:', locationError);
                    // Don't fail login if location tracking fails
                }

                // Start security monitoring (with error handling)
                try {
                    console.log('🔒 Starting security monitoring...');
                    const intervalId = startSecurityMonitoring();
                    setSecurityIntervalId(intervalId);
                } catch (monitoringError) {
                    console.warn('⚠️ Security monitoring failed:', monitoringError);
                    // Don't fail login if monitoring fails
                }

                return { success: true };
            } else {
                return { success: false, message: 'Login failed' };
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            console.error('Error response:', error.response?.data);

            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Invalid partner code'
            };
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

            console.log('🔄 Refreshing channels...');
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

                console.log('✅ Channels refreshed successfully');
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
            console.log('🚪 Logging out...');

            // Stop location tracking (with error handling)
            try {
                await stopLocationTracking();
                console.log('📍 Location tracking stopped');
            } catch (locationError) {
                console.warn('⚠️ Failed to stop location tracking:', locationError);
            }

            // Stop security monitoring (with error handling)
            try {
                stopSecurityMonitoring(securityIntervalId);
                setSecurityIntervalId(null);
                console.log('🔒 Security monitoring stopped');
            } catch (securityError) {
                console.warn('⚠️ Failed to stop security monitoring:', securityError);
            }

            // Clear AsyncStorage
            await AsyncStorage.multiRemove(['token', 'channels', 'user', 'packagesList', 'serverInfo']);

            // Reset state
            setIsAuthenticated(false);
            setChannels([]);
            setUser(null);
            setPackagesList([]);
            setServerInfo(null);

            // Navigate to login
            const inAuthGroup = segments[0] === '(auth)';
            if (!inAuthGroup) {
                router.replace('/(auth)/signin');
            }

            console.log('✅ Logout successful');
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
