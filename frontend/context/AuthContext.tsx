import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
    userToken: string | null;
    userId: string | null;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Keys that should be cleared on LOGIN (previous user's crop data only)
// We DON'T clear userProfile here because login.tsx will set the NEW user's profile
const LOGIN_CLEAR_KEYS = [
    'vasudha_selected_crop',
    'vasudha_planting_date',
    'vasudha_active_crops',
    'plantingDate',
];

// Keys that should be cleared on LOGOUT (all user-specific data)
const LOGOUT_CLEAR_KEYS = [
    'userProfile',
    'vasudha_selected_crop',
    'vasudha_planting_date',
    'vasudha_active_crops',
    'plantingDate',
    'userLatitude',
    'userLongitude',
    'vasudha_notifications',
    'vasudha_last_notification_fetch',
];

// Keys that should be preserved across sessions (device-specific)
const DEVICE_KEYS = [
    'user-language',
];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Extract user ID from token
    const extractUserId = (token: string): string | null => {
        try {
            const decoded: any = jwtDecode(token);
            return decoded.sub || decoded.username || null;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        const loadToken = async () => {
            try {
                const token = await SecureStore.getItemAsync('userToken');
                if (token) {
                    setUserToken(token);
                    setUserId(extractUserId(token));
                }
            } catch (error) {
                console.error('[AuthContext] Error loading token:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadToken();
    }, []);

    const login = async (token: string) => {
        try {
            // Clear previous user's CROP data before setting new token
            // This prevents crop data bleeding between users
            // NOTE: We don't clear userProfile here - login.tsx will set the new profile
            await AsyncStorage.multiRemove(LOGIN_CLEAR_KEYS);
            
            await SecureStore.setItemAsync('userToken', token);
            const newUserId = extractUserId(token);
            setUserToken(token);
            setUserId(newUserId);
            
            console.log('[AuthContext] Login successful, userId:', newUserId);
            router.replace('/(main)/(tabs)/home');
        } catch (error) {
            console.error('[AuthContext] Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            console.log('[AuthContext] Starting logout, clearing user data...');
            
            // Clear token from secure store
            await SecureStore.deleteItemAsync('userToken');
            
            // Clear all user-specific data from AsyncStorage
            // This prevents cached data from showing to new users
            await AsyncStorage.multiRemove(LOGOUT_CLEAR_KEYS);
            
            console.log('[AuthContext] Cleared keys:', LOGOUT_CLEAR_KEYS);
            
            setUserToken(null);
            setUserId(null);
            
            router.replace('/login');
        } catch (error) {
            console.error('[AuthContext] Logout error:', error);
            // Still navigate even if there's an error
            router.replace('/login');
        }
    };

    return (
        <AuthContext.Provider value={{ userToken, userId, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};