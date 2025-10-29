import React, { createContext, useContext, useState, useEffect } from "react";
import { tokenService } from "../services/tokenService.js";
import api from "../services/api.js";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      const savedUser = tokenService.getUser();
      const token = tokenService.getToken();

      if (savedUser && token && !tokenService.isTokenExpired(token)) {
        setUser(savedUser);
      } else {
        tokenService.removeToken();
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post("/auth/login", credentials);
      const { user: userData, token } = response.data.data;

      tokenService.setToken(token);
      tokenService.setUser(userData);
      setUser(userData);

      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      const { user: newUser, token } = response.data.data;

      tokenService.setToken(token);
      tokenService.setUser(newUser);
      setUser(newUser);

      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  };

  const logout = () => {
    tokenService.removeToken();
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
