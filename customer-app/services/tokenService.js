import AsyncStorage from '@react-native-async-storage/async-storage';

export const tokenService = {
    getToken: async () => {
        try {
            return await AsyncStorage.getItem('accessToken');
        } catch (error) {
            console.error('Error getting access token:', error);
            return null;
        }
    },

    setToken: async (token) => {
        try {
            await AsyncStorage.setItem('accessToken', token);
        } catch (error) {
            console.error('Error setting access token:', error);
        }
    },

    getRefreshToken: async () => {
        try {
            return await AsyncStorage.getItem('refreshToken');
        } catch (error) {
            console.error('Error getting refresh token:', error);
            return null;
        }
    },

    setRefreshToken: async (token) => {
        try {
            await AsyncStorage.setItem('refreshToken', token);
        } catch (error) {
            console.error('Error setting refresh token:', error);
        }
    },

    clearTokens: async () => {
        try {
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        } catch (error) {
            console.error('Error clearing tokens:', error);
        }
    }
};
