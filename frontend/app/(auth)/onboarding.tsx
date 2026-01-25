import { AppText } from '@/components/AppText';
import { getFont } from '@/constants/Typography';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t, i18n } = useTranslation();
    const [username, setUsername] = useState('');
    const [hasReport, setHasReport] = useState<boolean | null>(true);
    const [unit, setUnit] = useState<'kg/ha' | 'ppm'>('kg/ha');
    const currentContentFont = getFont('content', i18n.language);
    const [soilValues, setSoilValues] = useState({
        N: '', P: '', K: '', pH: ''
    });
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const languages = [
        { label: 'English', native: 'English', code: 'en' },
        { label: 'Hindi', native: 'हिन्दी', code: 'hi' },
        { label: 'Marathi', native: 'मराठी', code: 'mr' },
        { label: 'Gujarati', native: 'ગુજરાતી', code: 'gu' },
        { label: 'Bengali', native: 'বাংলা', code: 'bn' },
        { label: 'Tamil', native: 'தமிழ்', code: 'ta' },
        { label: 'Malayalam', native: 'മലയാളം', code: 'ml' },
        { label: 'Telugu', native: 'తెలుగు', code: 'te'},
        { label: 'Kannada', native: 'ಕನ್ನಡ', code: 'kn'},
        { label: 'Punjabi', native: 'ਪੰਜਾਬੀ', code: 'pa'},
    ];
    const handleInputChange = (key: string, value: string) => {
        setSoilValues(prev => ({ ...prev, [key]: value }));
    };
    const handleLanguageSelect = async (langCode: string, langLabel: string) => {
        await i18n.changeLanguage(langCode);
        await AsyncStorage.setItem('user-language', langCode);
        setSelectedLanguage(langLabel);
        setLanguageModalVisible(false);
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
                    <AppText variant="content" bold style={[{ fontWeight: "bold" }, styles.welcomeTitle]}>
                        {t('onboarding.welcome')}
                    </AppText>
                    <AppText variant="content" style={styles.welcomeSubtitle}>{t('onboarding.set_up')}</AppText>
                </View>

                <View style={styles.form}>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Ionicons name="person" size={20} color="#186F71" />
                            <AppText variant="header" style={styles.label}>{t('onboarding.username')}</AppText>
                        </View>
                        <TextInput
                            style={[
                                { fontFamily: currentContentFont },
                                styles.input,
                                focusedInput === 'username' && styles.activeBorder
                            ]}
                            placeholder={t('onboarding.username_input')}
                            value={username}
                            onFocus={() => setFocusedInput('username')}
                            onBlur={() => setFocusedInput(null)}
                            onChangeText={setUsername}
                            placeholderTextColor="#78909C"
                        />
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
                    <Modal
                        visible={isLanguageModalVisible}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setLanguageModalVisible(false)}
                    >
                        <Pressable
                            style={styles.modalOverlay}
                            onPress={() => setLanguageModalVisible(false)}
                        />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHandle} />

                            <AppText variant="header" style={styles.modalTitle}>
                                {t('onboarding.language')}
                            </AppText>

                            <ScrollView
                                style={styles.modalScrollView}
                                showsVerticalScrollIndicator={false}
                            >
                                {languages.map((lang) => (
    <TouchableOpacity
        key={lang.code}
        style={styles.languageOption}
        onPress={() => handleLanguageSelect(lang.code, lang.native)}
    >
        <View>
            <AppText variant="content" bold={i18n.language === lang.code} style={styles.optionText}>
                {lang.native}
            </AppText>
            {lang.code !== 'en' && (
                <AppText variant="content" style={styles.englishSublabel}>
                    {lang.label}
                </AppText>
            )}
        </View>
        {i18n.language === lang.code && (
            <Ionicons name="checkmark-circle" size={20} color="#186F71" />
        )}
    </TouchableOpacity>
))}
                            </ScrollView>
                        </View>
                    </Modal>
                    <AppText variant="header" style={styles.questionText}>
                        {t('onboarding.soil_report_availability')}
                    </AppText>
                    <View style={styles.toggleRow}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, hasReport === true && styles.toggleBtnActive]}
                            onPress={() => setHasReport(true)}
                        >
                            <AppText variant="content" style={[{ fontWeight: 'bold' }, styles.toggleText, hasReport === true && styles.textWhite]}>{t('onboarding.yes')}</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, hasReport === false && styles.toggleBtnActive]}
                            onPress={() => setHasReport(false)}
                        >
                            <AppText variant='content' style={[{ fontWeight: 'bold' }, styles.toggleText, hasReport === false && styles.textWhite]}>{t('onboarding.no')}</AppText>
                        </TouchableOpacity>
                    </View>

                    {hasReport && (
                        <View style={styles.soilSection}>
                            <View style={styles.labelRow}>
                                <MaterialCommunityIcons name="flask-outline" size={20} color="#186F71" />
                                <AppText variant="header" style={styles.label}>{t('onboarding.soil_params')}</AppText>
                            </View>

                            <View style={styles.unitContainer}>
                                <TouchableOpacity
                                    style={[styles.unitTab, unit === 'kg/ha' && styles.unitTabActive]}
                                    onPress={() => setUnit('kg/ha')}
                                >
                                    <AppText variant='content' style={[{ fontWeight: "bold" }, styles.unitTabText, unit === 'kg/ha' && styles.textWhite]}>kg/ha</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.unitTab, unit === 'ppm' && styles.unitTabActive]}
                                    onPress={() => setUnit('ppm')}
                                >
                                    <AppText variant='content' style={[{ fontWeight: "bold" }, styles.unitTabText, unit === 'ppm' && styles.textWhite]}>ppm</AppText>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.grid}>
                                {['N', 'P', 'K', 'pH'].map((param) => (
                                    <View key={param} style={styles.gridItem}>
                                        <TextInput
                                            style={[
                                                styles.openSansBold,
                                                {
                                                    fontFamily: getFont('content', i18n.language),
                                                    paddingVertical: i18n.language === 'en' ? 14 : 10
                                                },
                                                styles.gridInput,
                                                focusedInput === param && styles.activeGridBorder
                                            ]}
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

                    <TouchableOpacity
                        style={styles.continueBtn}
                        activeOpacity={0.8}
                        onPress={() => router.replace('/(main)/(tabs)/home')}
                    >
                        <AppText variant='content' style={[{ fontWeight: "bold" }, styles.continueBtnText]}>{t('onboarding.continue')}</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity 
  style={styles.linkContainer} 
  onPress={() => router.push('/login')} 
>
  <AppText variant="content" style={styles.linkText}>
    {t('onboarding.already_have_account')}{' '}
    <AppText bold style={{ color: '#186F71' }}>
      {t('onboarding.login_here')}
    </AppText>
  </AppText>
</TouchableOpacity>
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
}
const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#DDF1F9',
    },

    scrollContent: {
        paddingHorizontal: 28
    },

    kronaFont: {
        fontFamily: 'KronaOne'
    },
    openSans: { fontFamily: 'OpenSans' },
    openSansBold: { fontFamily: 'OpenSans-Bold' },

    welcomeSection: { alignItems: 'center', marginBottom: 35 },
    welcomeTitle: { fontSize: 22, color: '#186F71', textAlign: 'center', width: 400 },
    welcomeSubtitle: { fontSize: 15, color: '#186F71', marginTop: 8, textAlign: 'center' },

    form: { width: '100%' },
    inputGroup: { marginBottom: 22 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    label: { fontSize: 12, color: '#186F71' },
    input: {
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderWidth: 1,
        borderColor: '#186F71',
        borderRadius: 14,
        padding: 14,
        fontSize: 14,
        color: '#186F71',
        paddingLeft: 16,
    },
    activeBorder: {
        borderColor: '#186F71',
        borderWidth: 1.5,
        backgroundColor: '#ffffffe8',
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderWidth: 1,
        borderColor: '#186F71',
        borderRadius: 14,
        padding: 14,
    },
    dropdownText: { fontSize: 14, color: '#186F71', },
    activeGridBorder: {
        borderColor: '#186F71',
        borderWidth: 1.5,
        backgroundColor: 'rgba(216, 235, 244, 0.2)',
    },
    questionText: { textAlign: 'center', fontSize: 12, color: '#186F71', marginVertical: 20 },
    toggleRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 25 },
    toggleBtn: {
        paddingVertical: 12,
        width: 100,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#186F71',
        backgroundColor: 'rgba(189, 219, 232, 0.8)',
    },
    toggleBtnActive: { backgroundColor: '#186F71' },
    toggleText: { color: '#186F71', fontSize: 16 },
    textWhite: { color: '#FFF' },

    soilSection: { marginTop: 10 },
    unitContainer: {
        flexDirection: 'row',
        alignSelf: 'center',
        backgroundColor: 'rgba(189, 219, 232, 0.8)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#186F71',
        marginBottom: 20,
        overflow: 'hidden'
    },
    unitTab: { paddingVertical: 6, paddingHorizontal: 20 },
    unitTabActive: { backgroundColor: '#186F71' },
    unitTabText: { fontSize: 12, color: '#186F71' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridItem: { width: '47%', marginBottom: 15 },
    gridInput: {
        backgroundColor: 'rgba(189, 219, 232, 0.8)',
        borderWidth: 1,
        borderColor: '#186F71',
        borderRadius: 12,
        padding: 15,
        textAlign: 'center',
        fontSize: 16,
        color: '#186F71',
    },
    continueBtn: {
        backgroundColor: '#186F71',
        shadowColor: 'rgba(45,106,107,0.2)',
        shadowRadius: 4,
        elevation: 2,
        borderRadius: 10,
        height: 50,
        width: 180,
        alignSelf: 'center',
        margin: 20,
        padding: 10,
    },
    continueBtnText: { color: '#FFF', fontSize: 18, alignSelf: 'center' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalContent: {
        backgroundColor: '#DDF1F9',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingHorizontal: 24,
        paddingTop: 12, 
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        position: 'absolute',
        bottom: 0,
        width: '100%',
        maxHeight: '70%', 
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(24, 111, 113, 0.2)',
        borderRadius: 10,
        alignSelf: 'center',
        marginBottom: 15,
    },
    modalScrollView: {
        width: '100%',
    },
        modalTitle: {
        fontSize: 18,
        color: '#186F71',
        marginBottom: 20,
        textAlign: 'center',
    },
    languageOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(24, 111, 113, 0.1)',
    },
    optionText: {
        fontSize: 16,
        color: '#186F71',
    },
    selectedOptionText: {
        fontFamily: 'OpenSans-Bold',
        color: '#186F71',
    },
    englishSublabel: {
    fontSize: 10,
    color: '#186F71',
    opacity: 0.6,
    marginTop: -2,
},
linkContainer: { 
  marginTop: 15, 
  alignItems: 'center',
  paddingBottom: 20 
},
linkText: { 
  color: '#186F71', 
  fontSize: 10,
  textAlign: 'center'
},
});