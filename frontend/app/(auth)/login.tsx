import React, { useState } from 'react';
import {
  StyleSheet, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      alert(t('login.error_missing_fields') || "Please enter both username and password");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.post('/login', {
        username: username,
        password: password
      });

      if (response.data && response.data.token) {
        // Build user profile with the actual username being logged in
        const userProfile = {
          name: username,
          ...response.data.profile 
        };
        
        // Save user profile FIRST (before login navigates away)
        // login() no longer clears userProfile, only crop data
        await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
        
        // Apply user's language preference from profile
        if (response.data.profile && response.data.profile.language) {
          const userLanguage = response.data.profile.language;
          await i18n.changeLanguage(userLanguage);
          await AsyncStorage.setItem('user-language', userLanguage);
        }
        
        // Now call login - this clears old CROP data and navigates to home
        await login(response.data.token);
      }
    } catch (error: any) {
      console.error("[Login Error]", error);
      const errorMsg = error.response?.data?.detail || t('login.error_unauthorized');
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <View style={[styles.mainContainer, { paddingBottom: insets.bottom }]}>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

          <View style={styles.formCard}>
            <AppText variant="content" bold style={styles.welcomeText}>
              {t('login.welcome')}
            </AppText>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="person" size={20} color="#186F71" />
                <AppText variant="header" style={styles.label}>{t('login.username')}</AppText>
              </View>
              <TextInput
                style={[styles.input, focusedInput === 'username' && styles.activeBorder]}
                placeholder={t('login.username_input')}
                placeholderTextColor="#78909C"
                value={username}
                onFocus={() => setFocusedInput('username')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <MaterialCommunityIcons name="lock" size={20} color="#186F71" />
                <AppText variant="header" style={styles.label}>{t('login.password')}</AppText>
              </View>
              <View style={[styles.passwordWrapper, focusedInput === 'password' && styles.activeBorder]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('login.password_input')}
                  placeholderTextColor="#78909C"
                  value={password}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  onChangeText={setPassword}
                  secureTextEntry={secureText}
                />
                <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
                  <Feather name={secureText ? "eye-off" : "eye"} size={18} color="#186F71" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.continueBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <AppText variant="content" bold style={styles.continueBtnText}>
                  {t('login.submit')}
                </AppText>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkContainer}
              onPress={() => router.push('/onboarding')}
            >
              <AppText variant="content" style={styles.linkText}>
                {t('login.new_user')} <AppText bold style={{ color: '#186F71', fontSize: 11 }}>{t('login.create_account')}</AppText>
              </AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#DDF1F9' },
  scrollContent: { paddingHorizontal: 28, flexGrow: 1, padding: 80 },
  formCard: { width: '100%' },
  welcomeText: { fontSize: 20, color: '#186F71', textAlign: 'center', marginBottom: 60 },
  inputGroup: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  label: { fontSize: 12, color: '#186F71' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: '#186F71',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#186F71'
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: '#186F71',
    borderRadius: 14,
  },
  passwordInput: { flex: 1, padding: 14, fontSize: 14, color: '#186F71' },
  eyeIcon: { paddingRight: 14 },
  activeBorder: { borderColor: '#186F71', borderWidth: 1.5, backgroundColor: '#ffffffe8' },
  continueBtn: {
    backgroundColor: '#186F71',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    marginTop: 40,
  },
  continueBtnText: { color: '#FFF', fontSize: 18, alignSelf: 'center' },
  linkContainer: { marginTop: 25, alignItems: 'center' },
  linkText: { color: '#186F71', fontSize: 11, textAlign: 'center' },
});