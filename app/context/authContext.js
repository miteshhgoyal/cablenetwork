// context/authContext.js
import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
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

    // Single effect: Only check auth on mount, never navigate from here
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                let token = await AsyncStorage.getItem('accessToken');

                if (!token) {
                    token = await AsyncStorage.getItem('token');
                    if (token) {
                        await AsyncStorage.setItem('accessToken', token);
                    }
                }

                const savedUser = await AsyncStorage.getItem('user');

                if (token && savedUser) {
                    // Verify token is still valid with backend
                    try {
                        const response = await api.get('/auth/verify');
                        if (response.data.success) {
                            setUser(JSON.parse(savedUser));
                            setIsAuthenticated(true);
                        } else {
                            // Token invalid, clear everything
                            await tokenService.clearTokens();
                            setIsAuthenticated(false);
                            setUser(null);
                        }
                    } catch (error) {
                        console.error('Token verification failed:', error);
                        // If verification fails, clear tokens
                        await tokenService.clearTokens();
                        setIsAuthenticated(false);
                        setUser(null);
                    }
                } else {
                    setIsAuthenticated(false);
                    setUser(null);
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []); // Empty dependency - run ONLY on mount

    const login = async (credentials) => {
        try {
            const response = await api.post('/auth/login', credentials);

            if (response.data.success) {
                const { token, accessToken, refreshToken, user: userData } = response.data.data;
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
            try {
                await api.post('/auth/logout');
            } catch (err) {
                console.warn('Logout API failed:', err);
            }

            await tokenService.clearTokens();
            await AsyncStorage.removeItem('token');

            setIsAuthenticated(false);
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
            setIsAuthenticated(false);
            setUser(null);
        }
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
