// services/api.js
import axios from 'axios';
import { tokenService } from './tokenService.js';

// const API_BASE_URL = 'http://192.168.1.66:8000/api';
const API_BASE_URL = 'https://cablenetwork.onrender.com/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    async (config) => {
        const token = await tokenService.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
        if (error.response?.status === 401) {
            await tokenService.clearTokens();
            // Force logout handled by auth context
        }
        return Promise.reject(error);
    }
);

export default api;
