import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const loadToken = async () => {
            const token = await SecureStore.getItemAsync('userToken');
            if (token) setUserToken(token);
            setIsLoading(false);
        };
        loadToken();
    }, []);

    const login = async (token: string) => {
        await SecureStore.setItemAsync('userToken', token);
        setUserToken(token);
        router.replace('/(main)/(tabs)/home');
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('userToken');
        setUserToken(null);
        router.replace('/login');
    };

    return (
        <AuthContext.Provider value={{ userToken, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);