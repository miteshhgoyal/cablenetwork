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
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
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

            if (token && savedChannels && savedUser) {
                const parsedChannels = JSON.parse(savedChannels);
                const parsedUser = JSON.parse(savedUser);

                setIsAuthenticated(true);
                setChannels(parsedChannels);
                setUser(parsedUser);
            } else {
                setIsAuthenticated(false);
                setUser(null);
                setChannels([]);
            }
        } catch (error) {
            console.error('❌ Auth check error:', error);
            setIsAuthenticated(false);
            setUser(null);
            setChannels([]);
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
                const { token, subscriber, channels: fetchedChannels } = response.data.data;

                // Save to AsyncStorage
                await AsyncStorage.setItem('token', token);
                await AsyncStorage.setItem('channels', JSON.stringify(fetchedChannels));
                await AsyncStorage.setItem('user', JSON.stringify(subscriber));

                // Update state
                setUser(subscriber);
                setChannels(fetchedChannels);
                setIsAuthenticated(true);

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

    const logout = async () => {
        try {
            await AsyncStorage.multiRemove(['token', 'channels', 'user']);

            setIsAuthenticated(false);
            setChannels([]);
            setUser(null);


            // Only redirect if not already in auth group
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
        isAuthenticated,
        loading,
        login,
        logout,
        checkAuth,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
