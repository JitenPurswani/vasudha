import { AppText } from '@/components/AppText';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { getSoilParams } from '@/services/soilApi';
import { getFont } from '@/constants/Typography';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';

const toBackendKey = (text: string) =>
    text.toLowerCase()
        .trim()
        .replace(/\s+district/gi, '')
        .replace(/[\s-]+/g, '_')
        .replace(/[^\w]/g, '');

const toTitleCase = (text: string) =>
    text.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

export default function OnboardingScreen() {
    const [isFetchingSoil, setIsFetchingSoil] = useState(false);
    const [soilFetched, setSoilFetched] = useState(false);
    const [soilManualEdit, setSoilManualEdit] = useState(false);
    const [fetchedSoil, setFetchedSoil] = useState<{ N: string, P: string, K: string, pH: string } | null>(null);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t, i18n } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [secureTextPassword, setSecureTextPassword] = useState(true);
    const [secureTextConfirm, setSecureTextConfirm] = useState(true);
    const [hasReport, setHasReport] = useState<boolean | null>(true);
    const [unit, setUnit] = useState<'kg/ha' | 'ppm'>('kg/ha');
    const currentContentFont = getFont('content', i18n.language);
    const [soilValues, setSoilValues] = useState({
        N: '', P: '', K: '', pH: ''
    });
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('English');

    const [district, setDistrict] = useState('');
    const [stateName, setStateName] = useState('');
    const [districtDisplay, setDistrictDisplay] = useState('');
    const [stateNameDisplay, setStateNameDisplay] = useState('');

    const getTranslatedDistrict = () => {
        const key = `locations.districts.${stateName}.${district}`;
        const translated = t(key);
        return translated !== key ? translated : toTitleCase(district);
    };
    const getTranslatedState = () => {
        const key = `locations.states.${stateName}`;
        const translated = t(key);
        return translated !== key ? translated : toTitleCase(stateName);
    };
    const [isFetching, setIsFetching] = useState(false);
    const [locationFetched, setLocationFetched] = useState(false);
    const [manualEdit, setManualEdit] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Clear soil values when location changes
    useEffect(() => {
        if (district || stateName) {
            setSoilFetched(false);
            setFetchedSoil(null);
            setSoilValues({ N: '', P: '', K: '', pH: '' });
            setSoilManualEdit(false);
        }
    }, [district, stateName]);

    const languages = [
        { label: 'English', native: 'English', code: 'en' },
        { label: 'Hindi', native: 'हिन्दी', code: 'hi' },
        { label: 'Marathi', native: 'मराठी', code: 'mr' },
        { label: 'Gujarati', native: 'ગુજરાતી', code: 'gu' },
        { label: 'Bengali', native: 'বাংলা', code: 'bn' },
        { label: 'Tamil', native: 'தமிழ்', code: 'ta' },
        { label: 'Malayalam', native: 'മലയാളം', code: 'ml' },
        { label: 'Telugu', native: 'తెలుగు', code: 'te' },
        { label: 'Kannada', native: 'ಕನ್ನಡ', code: 'kn' },
        { label: 'Punjabi', native: 'ਪੰਜਾਬੀ', code: 'pa' },
    ];

    const handleInputChange = (key: string, value: string) => {
        setSoilValues(prev => ({ ...prev, [key]: value }));
    };

    // Fetch soil params from soil agent
    const fetchSoilParams = async () => {
        if (!district || !stateName) {
            alert('Please enter/select your district and state first.');
            return;
        }
        setIsFetchingSoil(true);
        try {
            const data = await getSoilParams(toTitleCase(district), toTitleCase(stateName));
            setFetchedSoil(data);
            setSoilValues(data);
            setSoilFetched(true);
            setSoilManualEdit(false);
        } catch (e: any) {
            alert(e.message || 'Could not fetch soil parameters.');
        } finally {
            setIsFetchingSoil(false);
        }
    };

    const editFetchedSoil = () => {
        setSoilManualEdit(true);
    };

    const handleLanguageSelect = async (langCode: string, langLabel: string) => {
        await i18n.changeLanguage(langCode);
        await AsyncStorage.setItem('user-language', langCode);
        setSelectedLanguage(langLabel);
        setLanguageModalVisible(false);
    };

    const handleContinue = async () => {
        // 1. SANITIZATION: Trim whitespace from credentials
        const cleanUsername = username.trim();
        const cleanPassword = password.trim();

        // 2. FRONTEND VALIDATION: Match Backend Restrictions
        // Username: 3-20 alphanumeric/underscores
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(cleanUsername)) {
            alert(t('onboarding.username_hint'));
            return;
        }

        // Password: Min 8 chars, 1 Upper, 1 Lower, 1 Number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(cleanPassword)) {
            alert(t('onboarding.pw_hint'));
            return;
        }

        if (cleanPassword !== confirmPassword.trim()) {
            alert(t('onboarding.password_mismatch'));
            return;
        }

        setIsSubmitting(true);
        console.log(`[Onboarding] Attempting registration for: ${cleanUsername}`);

        try {
            // Geocoding Logic
            if (!locationFetched && district && stateName) {
                try {
                    const query = `${toTitleCase(district)}, ${toTitleCase(stateName)}, India`;
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
                        { headers: { 'User-Agent': 'Vasudha-App' } }
                    );
                    const results = await response.json();
                    if (results && results[0]) {
                        const { lat, lon } = results[0];
                        await AsyncStorage.setItem('userLatitude', String(lat));
                        await AsyncStorage.setItem('userLongitude', String(lon));
                    }
                } catch (geocodeError) {
                    console.error('[Onboarding] Geocoding error:', geocodeError);
                }
            }

            // 3. PAYLOAD SYNC: Ensure keys (N, P, K, pH) match backend UpdateProfileSchema
            const payload = {
                username: cleanUsername,
                password: cleanPassword,
                state: stateName,
                district: district,
                language: i18n.language,
                N: parseFloat(soilValues.N) || 0,
                P: parseFloat(soilValues.P) || 0,
                K: parseFloat(soilValues.K) || 0,
                pH: parseFloat(soilValues.pH) || 0,
            };

            const response = await api.post('/register', payload);
            if (response.status === 200 || response.status === 201) {
                router.replace('/(auth)/login');
            }

        } catch (error: any) {
            if (error.response && error.response.status === 422) {
                // Parse Pydantic validation errors into readable strings
                const validationErrors = error.response.data.detail;
                const errorMessages = validationErrors.map((err: any) => {
                    return `${err.loc[1]}: ${err.msg}`;
                }).join('\n');
                alert(errorMessages);
            } else {
                const msg = error.response?.data?.detail || "Registration failed";
                alert(msg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchLocation = async () => {
        setIsFetching(true);
        setLocationError(null);

        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                setLocationError("Permission denied");
                return;
            }

            let userLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = userLocation.coords;

            // Store location coordinates for use in Home page
            await AsyncStorage.setItem('userLatitude', String(latitude));
            await AsyncStorage.setItem('userLongitude', String(longitude));
            console.log(`[Onboarding] Stored location: lat=${latitude}, lon=${longitude}`);

            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1&accept-language=en`,
                { headers: { 'User-Agent': 'Vasudha-App' } }
            );

            const data = await response.json();

            if (data && data.address) {
                const addr = data.address;
                const toKey = (text: string) => text.toLowerCase().trim().replace(/[\s-]+/g, '_').replace(/[^\w]/g, '');
                const rawDistrict = addr.state_district || addr.county || addr.city || "";
                const rawState = addr.state || "";

                const cleanedDistrict = rawDistrict.replace(" District", "");

                const dKey = toBackendKey(cleanedDistrict);
                const sKey = toBackendKey(rawState);
                setDistrict(dKey);
                setStateName(sKey);

                setDistrictDisplay(toTitleCase(dKey));
                setStateNameDisplay(toTitleCase(sKey));
                setLocationFetched(true);
                setManualEdit(false);
            }
        } catch (error) {
            setLocationError("Could not auto-fetch. Please enter manually.");
            setManualEdit(true);
        } finally {
            setIsFetching(false);
        }
    };
    const getPasswordStrength = (pw: string) => {
        if (!pw) return { score: 0, label: '', color: '#E0E0E0' };
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;

        switch (score) {
            case 1: return { score: 1, label: t('onboarding.weak'), color: '#FF4D4D' };
            case 2: return { score: 2, label: t('onboarding.fair'), color: '#FFA500' };
            case 3: return { score: 3, label: t('onboarding.good'), color: '#FFD700' };
            case 4: return { score: 4, label: t('onboarding.strong'), color: '#28A745' };
            default: return { score: 0, label: '', color: '#E0E0E0' };
        }
    };

    return (
        <View style={[styles.mainContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <KeyboardAwareScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
                enableOnAndroid={true}
                extraScrollHeight={Platform.OS === 'ios' ? 50 : 100}
            >
                <View style={styles.welcomeSection}>
                    <AppText variant="content" bold style={styles.welcomeTitle}>
                        {t('onboarding.welcome')}
                    </AppText>
                    <AppText variant="content" style={styles.welcomeSubtitle}>
                        {t('onboarding.set_up')}
                    </AppText>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Ionicons name="person" size={20} color="#186F71" />
                            <AppText variant="header" style={styles.label}>{t('onboarding.username')}</AppText>
                        </View>
                        <TextInput
                            style={[{ fontFamily: currentContentFont }, styles.input, focusedInput === 'username' && styles.activeBorder]}
                            placeholder={t('onboarding.username_input')}
                            value={username}
                            onFocus={() => setFocusedInput('username')}
                            onBlur={() => setFocusedInput(null)}
                            onChangeText={setUsername}
                            placeholderTextColor="#78909C"
                        />
                        <AppText style={styles.hintText}>{t('onboarding.username_hint')}</AppText>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <MaterialCommunityIcons name="lock" size={20} color="#186F71" />
                            <AppText variant="header" style={styles.label}>{t('onboarding.password')}</AppText>
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
                                secureTextEntry={secureTextPassword}
                            />
                            <TouchableOpacity onPress={() => setSecureTextPassword(!secureTextPassword)} style={styles.eyeIcon}>
                                <Feather name={secureTextPassword ? "eye-off" : "eye"} size={18} color="#186F71" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.strengthContainerRow}>
                            <View style={styles.strengthBarWrapper}>
                                {[1, 2, 3, 4].map((index) => {
                                    const strength = getPasswordStrength(password);
                                    return (
                                        <View
                                            key={index}
                                            style={[
                                                styles.strengthSegment,
                                                index <= strength.score && { backgroundColor: strength.color }
                                            ]}
                                        />
                                    );
                                })}
                            </View>

                            {password.length > 0 && (
                                <AppText style={[styles.strengthTextSide, { color: getPasswordStrength(password).color }]}>
                                    {getPasswordStrength(password).label}
                                </AppText>
                            )}
                        </View>

                        <AppText style={styles.hintText}>{t('onboarding.pw_hint')}</AppText>
                    </View>
                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <MaterialCommunityIcons name="lock-check" size={20} color="#186F71" />
                            <AppText variant="header" style={styles.label}>{t('onboarding.confirm_password')}</AppText>
                        </View>
                        <View style={[styles.passwordWrapper, focusedInput === 'confirm' && styles.activeBorder]}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder={t('onboarding.confirm_password_input')}
                                placeholderTextColor="#78909C"
                                value={confirmPassword}
                                onFocus={() => setFocusedInput('confirm')}
                                onBlur={() => setFocusedInput(null)}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={secureTextConfirm}
                            />
                            <TouchableOpacity onPress={() => setSecureTextConfirm(!secureTextConfirm)} style={styles.eyeIcon}>
                                <Feather name={secureTextConfirm ? "eye-off" : "eye"} size={18} color="#186F71" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Ionicons name="globe-outline" size={20} color="#186F71" />
                            <AppText variant="header" style={styles.label}>{t('onboarding.language')}</AppText>
                        </View>
                        <TouchableOpacity style={styles.dropdown} onPress={() => setLanguageModalVisible(true)}>
                            <AppText variant="content" style={styles.dropdownText}>{selectedLanguage}</AppText>
                            <Ionicons name="chevron-down" size={20} color="#186F71" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Feather name="map-pin" size={20} color="#186F71" />
                            <AppText variant="header" style={styles.label}>{t("onboarding.location")}</AppText>
                        </View>

                        {(locationFetched || !!locationError) && (
                            <View style={styles.locationCard}>
                                <View style={styles.locationCardRow}>
                                    <Feather
                                        name={locationError ? "alert-circle" : "check-circle"}
                                        size={16}
                                        color={locationError ? "#D9534F" : "#28A745"}
                                    />
                                    <AppText variant="content" style={styles.locationCardText}>
                                        {locationError ? locationError : t('onboarding.location_fetch')}
                                    </AppText>
                                </View>
                                {!locationError && (
                                    <View style={styles.locationActionRow}>
                                        <TouchableOpacity
                                            style={[styles.locationActionBtn, !manualEdit && styles.locationActionBtnActive]}
                                            onPress={() => setManualEdit(false)}
                                        >
                                            <AppText variant="content" bold style={[styles.locationActionText, !manualEdit && styles.textWhite]}>
                                                {t('onboarding.use_this')}
                                            </AppText>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.locationActionBtn, manualEdit && styles.locationActionBtnActive]}
                                            onPress={() => setManualEdit(true)}
                                        >
                                            <AppText variant="content" bold style={[styles.locationActionText, manualEdit && styles.textWhite]}>
                                                {t('onboarding.edit')}
                                            </AppText>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.stackedLocationContainer}>
                            <TextInput
                                style={[styles.input, focusedInput === "district" && styles.activeBorder, !manualEdit && locationFetched && styles.disabledInput, { marginBottom: 10 }]}
                                placeholder={t("onboarding.district")}
                                value={(manualEdit || !locationFetched) ? districtDisplay : getTranslatedDistrict()}
                                onChangeText={(text) => {
                                    setDistrictDisplay(text);
                                }}
                                editable={manualEdit || !locationFetched}
                                onFocus={() => setFocusedInput("district")}
                                onBlur={() => {
                                    setFocusedInput(null);
                                    const key = toBackendKey(districtDisplay);
                                    setDistrict(key);
                                    setDistrictDisplay(toTitleCase(key));
                                }}
                                placeholderTextColor="#78909C"
                            />
                            <TextInput
                                style={[styles.input, focusedInput === "state" && styles.activeBorder, !manualEdit && locationFetched && styles.disabledInput]}
                                placeholder={t("onboarding.state")}
                                value={(manualEdit || !locationFetched) ? stateNameDisplay : getTranslatedState()}
                                onChangeText={(text) => {
                                    setStateNameDisplay(text);
                                }}
                                editable={manualEdit || !locationFetched}
                                onFocus={() => setFocusedInput("state")}
                                onBlur={() => {
                                    setFocusedInput(null);
                                    const key = toBackendKey(stateNameDisplay);
                                    setStateName(key);
                                    setStateNameDisplay(toTitleCase(key));
                                }}
                                placeholderTextColor="#78909C"
                            />
                        </View>

                        {!locationFetched && (
                            <TouchableOpacity onPress={fetchLocation} disabled={isFetching} style={[styles.fetchBtn, { marginTop: 10 }]}>
                                {isFetching ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <View style={styles.btnContent}>
                                        <Feather name="navigation" size={18} color="#FFF" />
                                        <AppText variant="content" bold style={styles.fetchText}>{t("onboarding.auto_fetch")}</AppText>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    <AppText variant="header" style={styles.questionText}>{t('onboarding.soil_report_availability')}</AppText>
                    <View style={styles.toggleRow}>
                        <TouchableOpacity style={[styles.toggleBtn, hasReport === true && styles.toggleBtnActive]} onPress={() => setHasReport(true)}>
                            <AppText variant="content" style={[styles.toggleText, hasReport === true && styles.textWhite, { fontWeight: 'bold' }]}>{t('onboarding.yes')}</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toggleBtn, hasReport === false && styles.toggleBtnActive]} onPress={() => setHasReport(false)}>
                            <AppText variant='content' style={[styles.toggleText, hasReport === false && styles.textWhite, { fontWeight: 'bold' }]}>{t('onboarding.no')}</AppText>
                        </TouchableOpacity>
                    </View>

                    {hasReport && (
                        <View style={styles.soilSection}>
                            <View style={styles.labelRow}>
                                <MaterialCommunityIcons name="flask-outline" size={20} color="#186F71" />
                                <AppText variant="header" style={styles.label}>{t('onboarding.soil_params')}</AppText>
                            </View>
                            <View style={styles.unitContainer}>
                                <TouchableOpacity style={[styles.unitTab, unit === 'kg/ha' && styles.unitTabActive]} onPress={() => setUnit('kg/ha')}>
                                    <AppText variant='content' style={[styles.unitTabText, unit === 'kg/ha' && styles.textWhite, { fontWeight: "bold" }]}>kg/ha</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.unitTab, unit === 'ppm' && styles.unitTabActive]} onPress={() => setUnit('ppm')}>
                                    <AppText variant='content' style={[styles.unitTabText, unit === 'ppm' && styles.textWhite, { fontWeight: "bold" }]}>ppm</AppText>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.grid}>
                                {['N', 'P', 'K', 'pH'].map((param) => (
                                    <View key={param} style={styles.gridItem}>
                                        <TextInput
                                            style={[styles.gridInput, focusedInput === param && styles.activeGridBorder, { fontFamily: getFont('content', i18n.language) }]}
                                            placeholder={param}
                                            placeholderTextColor="#15634950"
                                            keyboardType="numeric"
                                            textAlign="center"
                                            value={soilValues[param as keyof typeof soilValues]}
                                            onFocus={() => setFocusedInput(param)}
                                            onBlur={() => setFocusedInput(null)}
                                            onChangeText={(val) => handleInputChange(param, val)}
                                        />
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {!hasReport && (
                        <View style={{ marginBottom: 20 }}>
                            {!soilFetched && (
                                <TouchableOpacity onPress={fetchSoilParams} disabled={isFetchingSoil} style={[styles.fetchBtn, { marginTop: 10 }]}>
                                    {isFetchingSoil ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <View style={styles.btnContent}>
                                            <MaterialCommunityIcons name="flask-outline" size={18} color="#FFF" />
                                            <AppText variant="content" bold style={styles.fetchText}>{t('onboarding.fetch_soil_params')}</AppText>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}

                            {soilFetched && fetchedSoil && (
                                <View style={styles.locationCard}>
                                    <View style={styles.locationCardRow}>
                                        <Feather name="check-circle" size={16} color="#28A745" />
                                        <AppText variant="content" style={styles.locationCardText}>
                                            {t('onboarding.soil_params_fetched')}
                                        </AppText>
                                    </View>
                                    <View style={styles.locationActionRow}>
                                        <TouchableOpacity
                                            style={[styles.locationActionBtn, !soilManualEdit && styles.locationActionBtnActive]}
                                            onPress={() => setSoilManualEdit(false)}
                                        >
                                            <AppText variant="content" bold style={[styles.locationActionText, !soilManualEdit && styles.textWhite]}>
                                                {t('onboarding.use_this')}
                                            </AppText>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.locationActionBtn, soilManualEdit && styles.locationActionBtnActive]}
                                            onPress={editFetchedSoil}
                                        >
                                            <AppText variant="content" bold style={[styles.locationActionText, soilManualEdit && styles.textWhite]}>
                                                {t('onboarding.edit')}
                                            </AppText>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            <View style={styles.soilSection}>
                                <View style={styles.labelRow}>
                                    <MaterialCommunityIcons name="flask-outline" size={20} color="#186F71" />
                                    <AppText variant="header" style={styles.label}>{t('onboarding.soil_params')}</AppText>
                                </View>
                                <View style={styles.grid}>
                                    {['N', 'P', 'K', 'pH'].map((param) => (
                                        <View key={param} style={styles.gridItem}>
                                            <TextInput
                                                style={[styles.gridInput, focusedInput === param && styles.activeGridBorder, soilFetched && !soilManualEdit && styles.disabledInput, { fontFamily: getFont('content', i18n.language) }]}
                                                placeholder={param}
                                                placeholderTextColor="#15634950"
                                                keyboardType="numeric"
                                                textAlign="center"
                                                value={soilValues[param as keyof typeof soilValues]}
                                                onFocus={() => setFocusedInput(param)}
                                                onBlur={() => setFocusedInput(null)}
                                                onChangeText={(val) => handleInputChange(param, val)}
                                                editable={!soilFetched || soilManualEdit}
                                            />
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.continueBtn, isSubmitting && { opacity: 0.7 }]}
                        onPress={handleContinue}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <ActivityIndicator color="#FFF" /> : <AppText variant='content' bold style={styles.continueBtnText}>{t('onboarding.continue')}</AppText>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkContainer} onPress={() => router.push('/login')}>
                        <AppText variant="content" style={styles.linkText}>
                            {t('onboarding.already_have_account')}{' '}
                            <AppText bold style={{ color: '#186F71', fontSize: 11 }}>{t('onboarding.login_here')}</AppText>
                        </AppText>
                    </TouchableOpacity>
                </View>
            </KeyboardAwareScrollView>

            <Modal visible={isLanguageModalVisible} transparent={true} animationType="slide" onRequestClose={() => setLanguageModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setLanguageModalVisible(false)} />
                <View style={styles.modalContent}>
                    <View style={styles.modalHandle} />
                    <AppText variant="header" style={styles.modalTitle}>{t('onboarding.language')}</AppText>
                    <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                        {languages.map((lang) => (
                            <TouchableOpacity key={lang.code} style={styles.languageOption} onPress={() => handleLanguageSelect(lang.code, lang.native)}>
                                <View>
                                    <AppText variant="content" bold={i18n.language === lang.code} style={styles.optionText}>{lang.native}</AppText>
                                    {lang.code !== 'en' && <AppText variant="content" style={styles.englishSublabel}>{lang.label}</AppText>}
                                </View>
                                {i18n.language === lang.code && <Ionicons name="checkmark-circle" size={20} color="#186F71" />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#DDF1F9' },
    scrollContent: { paddingHorizontal: 28 },
    welcomeSection: { alignItems: 'center', marginBottom: 35 },
    welcomeTitle: { fontSize: 22, color: '#186F71', textAlign: 'center', width: 400, fontWeight: 'bold' },
    welcomeSubtitle: { fontSize: 15, color: '#186F71', marginTop: 8, textAlign: 'center' },
    form: { width: '100%' },
    inputGroup: { marginBottom: 16 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    label: { fontSize: 12, color: '#186F71' },
    input: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#186F71', borderRadius: 14, padding: 14, fontSize: 15, color: '#186F71' },
    activeBorder: { borderColor: '#186F71', borderWidth: 1.5, backgroundColor: '#ffffffe8' },
    disabledInput: { backgroundColor: 'rgba(24, 111, 113, 0.05)', opacity: 0.8 },
    passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#186F71', borderRadius: 14 },
    passwordInput: { flex: 1, padding: 14, fontSize: 14, color: '#186F71' },
    eyeIcon: { paddingRight: 14 },
    dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#186F71', borderRadius: 14, padding: 14 },
    dropdownText: { fontSize: 14, color: '#186F71' },
    stackedLocationContainer: { width: '100%', marginTop: 10 },
    locationCard: { backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: "rgba(24,111,113,0.25)", borderRadius: 14, padding: 12, marginBottom: 12 },
    locationCardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    locationCardText: { fontSize: 11, color: "#186F71", flex: 1, opacity: 0.9 },
    locationActionRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 10 },
    locationActionBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#186F71", backgroundColor: "rgba(189, 219, 232, 0.7)", alignItems: "center" },
    locationActionBtnActive: { backgroundColor: "#186F71" },
    locationActionText: { fontSize: 12, color: "#186F71" },
    fetchBtn: { backgroundColor: '#186F71', borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
    btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    fetchText: { color: '#FFF', fontSize: 15 },
    questionText: { textAlign: 'center', fontSize: 12, color: '#186F71', marginVertical: 20 },
    toggleRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 25 },
    toggleBtn: { paddingVertical: 12, width: 100, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#186F71', backgroundColor: 'rgba(189, 219, 232, 0.8)' },
    toggleBtnActive: { backgroundColor: '#186F71' },
    toggleText: { color: '#186F71', fontSize: 16 },
    textWhite: { color: '#FFF' },
    soilSection: { marginTop: 10 },
    unitContainer: { flexDirection: 'row', alignSelf: 'center', backgroundColor: 'rgba(189, 219, 232, 0.8)', borderRadius: 10, borderWidth: 1, borderColor: '#186F71', marginBottom: 20, overflow: 'hidden' },
    unitTab: { paddingVertical: 6, paddingHorizontal: 20 },
    unitTabActive: { backgroundColor: '#186F71' },
    unitTabText: { fontSize: 12, color: '#186F71' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridItem: { width: '47%', marginBottom: 15 },
    gridInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#186F71', borderRadius: 12, padding: 15, textAlign: 'center', fontSize: 16, color: '#186F71' },
    activeGridBorder: { borderColor: '#186F71', borderWidth: 1.5, backgroundColor: 'rgba(216, 235, 244, 0.2)' },
    continueBtn: { backgroundColor: '#186F71', borderRadius: 10, height: 50, width: 180, alignSelf: 'center', margin: 20, justifyContent: 'center', alignItems: 'center' },
    continueBtnText: { color: '#FFF', fontSize: 18 },
    linkContainer: { marginTop: 15, alignItems: 'center', paddingBottom: 20 },
    linkText: { color: '#186F71', fontSize: 11, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
    modalContent: { backgroundColor: '#DDF1F9', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 24, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 40 : 24, position: 'absolute', bottom: 0, width: '100%', maxHeight: '70%' },
    modalHandle: { width: 40, height: 5, backgroundColor: 'rgba(24, 111, 113, 0.2)', borderRadius: 10, alignSelf: 'center', marginBottom: 15 },
    modalScrollView: { width: '100%' },
    modalTitle: { fontSize: 18, color: '#186F71', marginBottom: 20, textAlign: 'center' },
    languageOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(24, 111, 113, 0.1)' },
    optionText: { fontSize: 16, color: '#186F71' },
    englishSublabel: { fontSize: 10, color: '#186F71', opacity: 0.6, marginTop: -2 },
    strengthContainerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 8, // Space between segments and the label
    },
    strengthBarWrapper: {
        flex: 1, // Takes up remaining space
        flexDirection: 'row',
        height: 6,
    },
    strengthSegment: {
        flex: 1,
        height: '100%',
        borderRadius: 3,
        marginHorizontal: 2,
        backgroundColor: 'rgba(24, 111, 113, 0.1)',
    },
    strengthTextSide: {
        fontSize: 11,
        fontFamily: 'OpenSans-Bold',
        minWidth: 55, // Ensures the label doesn't jump when text changes
        textAlign: 'right',
    },
    hintText: {
        fontSize: 10,
        color: '#186F71',
        marginTop: 4,
        opacity: 0.8,
        fontFamily: 'OpenSans-Regular',
    },
});