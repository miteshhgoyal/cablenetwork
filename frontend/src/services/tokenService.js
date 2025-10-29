const TOKEN_KEY = 'appointment_token';
const USER_KEY = 'appointment_user';

export const tokenService = {
    getToken: () => {
        return localStorage.getItem(TOKEN_KEY);
    },

    setToken: (token) => {
        localStorage.setItem(TOKEN_KEY, token);
    },

    removeToken: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },

    isTokenExpired: (token) => {
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            return payload.exp < currentTime;
        } catch {
            return true;
        }
    },

    setUser: (user) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    getUser: () => {
        const user = localStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
    },

    getUserRole: () => {
        const user = tokenService.getUser();
        return user?.role || null;
    }
};
