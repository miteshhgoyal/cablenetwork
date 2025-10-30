import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api, { setLogoutCallback } from '@/services/api';
import { tokenService } from '@/services/tokenService';

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

    useEffect(() => {
        checkAuth();

        // Register logout callback for API interceptor
        setLogoutCallback(() => {
            handleForceLogout();
        });

        return () => {
            // Cleanup if needed
            setLogoutCallback(null);
        };
    }, []);

    const checkAuth = async () => {
        try {
            const token = await tokenService.getToken();
            const refreshToken = await tokenService.getRefreshToken();

            if (token && refreshToken) {
                setIsAuthenticated(true);

                // Load user data from storage
                const storedUser = await AsyncStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                } else {
                    // Optionally fetch user from /auth/me
                    try {
                        const response = await api.get('/auth/me');
                        if (response.data.success) {
                            setUser(response.data.data);
                            await AsyncStorage.setItem('user', JSON.stringify(response.data.data));
                        }
                    } catch (err) {
                        console.log('Could not fetch user profile');
                    }
                }
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            await tokenService.clearTokens();
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (userData) => {
        try {
            const { accessToken, refreshToken, user } = userData;

            if (!accessToken || !refreshToken) {
                throw new Error('Missing tokens');
            }

            // Store tokens
            await tokenService.setToken(accessToken);
            await tokenService.setRefreshToken(refreshToken);

            // Store user
            if (user) {
                setUser(user);
                await AsyncStorage.setItem('user', JSON.stringify(user));
            }

            setIsAuthenticated(true);
            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: error.message || 'Failed to save login data' };
        }
    };

    const handleForceLogout = async () => {
        console.log('🔴 Force logout triggered by token expiration');

        await tokenService.clearTokens();
        await AsyncStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);

        // Use replace to prevent back navigation
        setTimeout(() => {
            router.replace('/(auth)/signin');
        }, 100);
    };

    const logout = async () => {
        try {
            // Call backend logout
            const refreshToken = await tokenService.getRefreshToken();
            if (refreshToken) {
                await api.post('/auth/logout', { refreshToken }).catch((err) => {
                    console.log('Backend logout failed:', err.message);
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await tokenService.clearTokens();
            await AsyncStorage.removeItem('user');
            setUser(null);
            setIsAuthenticated(false);

            // Navigate to signin
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
