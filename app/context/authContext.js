// context/authContext.js
import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import api, { tokenService } from "../services/api";

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
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!isAuthenticated && !inAuthGroup) {
            router.replace('/(auth)/signin');
        } else if (isAuthenticated && inAuthGroup) {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, loading, segments]);

    const checkAuth = async () => {
        try {
            // Check for accessToken (new standard)
            let token = await AsyncStorage.getItem('accessToken');

            // Fallback to old 'token' key for existing users
            if (!token) {
                token = await AsyncStorage.getItem('token');
                if (token) {
                    // Migrate to new key
                    await AsyncStorage.setItem('accessToken', token);
                }
            }

            const savedUser = await AsyncStorage.getItem('user');

            if (token && savedUser) {
                setIsAuthenticated(true);
                setUser(JSON.parse(savedUser));
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        try {
            const response = await api.post('/auth/login', credentials);

            if (response.data.success) {
                const { token, accessToken, refreshToken, user: userData } = response.data.data;

                // Store with accessToken key (use token if accessToken not provided)
                const tokenToStore = accessToken || token;

                if (tokenToStore) {
                    await AsyncStorage.setItem('accessToken', tokenToStore);
                }

                if (refreshToken) {
                    await AsyncStorage.setItem('refreshToken', refreshToken);
                }

                await AsyncStorage.setItem('user', JSON.stringify(userData));

                setUser(userData);
                setIsAuthenticated(true);

                return { success: true };
            } else {
                return { success: false, message: response.data.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);

            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Login failed',
            };
        }
    };

    const logout = async () => {
        try {
            // Call logout API
            try {
                await api.post('/auth/logout');
            } catch (err) {
                console.warn('Logout API failed:', err);
            }

            // Clear all tokens
            await tokenService.clearTokens();
            // Also clear old token key
            await AsyncStorage.removeItem('token');

            setIsAuthenticated(false);
            setUser(null);
            router.replace('/(auth)/signin');
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout anyway
            setIsAuthenticated(false);
            setUser(null);
            router.replace('/(auth)/signin');
        }
    };

    const value = {
        user,
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
