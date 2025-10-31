import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// const API_BASE_URL = 'http://192.168.1.66:8000/api';
const API_BASE_URL = 'https://cablenetwork.onrender.com/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('accessToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Error getting token:', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Handle 401 - clear tokens
        if (error.response?.status === 401) {
            try {
                await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
            } catch (err) {
                console.error('Error clearing tokens:', err);
            }
        }

        // Handle network errors with better message
        if (!error.response) {
            console.error('Network Error:', error.message);
            return Promise.reject({
                message: 'Network error - Check your connection and API URL',
                original: error,
            });
        }

        return Promise.reject(error);
    }
);

export default api;