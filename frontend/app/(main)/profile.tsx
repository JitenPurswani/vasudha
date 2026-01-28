import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/services/api';
import { getSoilParams } from '@/services/soilApi'; //

const LANGUAGE_MAP: { [key: string]: string } = {
  en: 'English', hi: 'हिन्दी', mr: 'मराठी', gu: 'ગુજરાતી', ta: 'தமிழ்', te: 'తెలుగు', bn: 'বাংলা', ml: 'മലയാളം', kn: 'ಕನ್ನಡ', pa: 'ਪੰਜਾਬੀ',
};

const ProfileItem = ({ icon, label, value, t }: any) => (
  <View style={styles.profileItem}>
    <View style={styles.iconCircle}>
      <Feather name={icon} size={14} color="#156349" />
    </View>
    <AppText variant='content' style={styles.itemLabel}>{t(`profile.${label.toLowerCase()}`)}</AppText>
    <AppText variant='content' style={styles.itemValue}>{value}</AppText>
  </View>
);

const SoilCard = ({ label, value }: any) => (
  <View style={styles.soilCard}>
    <Text style={styles.soilLabel}>{label}</Text>
    <Text style={styles.soilValue}>{value}</Text>
  </View>
);

const toTitleCase = (str: string) =>
  str ? str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';

export default function Profile() {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const [editVisible, setEditVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingSoil, setIsFetchingSoil] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [profile, setProfile] = useState({
    username: '', languageCode: 'en', districtKey: '', stateKey: '', n: '-', p: '-', k: '-', ph: '-'
  });

  const [editedProfile, setEditedProfile] = useState(profile);

  useEffect(() => {
    loadFullProfile();
  }, []);


  const loadFullProfile = async () => {
    const savedData = await AsyncStorage.getItem('userProfile');
    if (savedData) {
      const data = JSON.parse(savedData);
      const mappedData = {
        username: data.name || 'User',
        languageCode: data.language || 'en',
        districtKey: data.district?.toLowerCase() || '',
        stateKey: data.state?.toLowerCase() || '',
        n: data.n?.toString() || '-',
        p: data.p?.toString() || '-',
        k: data.k?.toString() || '-',
        ph: data.ph?.toString() || '-'
      };
      setProfile(mappedData);
      setEditedProfile(mappedData);
    }
  };

  const handleAutoSoilFetch = async () => {
    if (!editedProfile.districtKey || !editedProfile.stateKey) {
      Alert.alert(t('common.error'), "Please provide location first");
      return;
    }
    setIsFetchingSoil(true);
    try {
      const data = await getSoilParams(editedProfile.districtKey, editedProfile.stateKey); //
      setEditedProfile(prev => ({
        ...prev,
        n: data.N.toString(),
        p: data.P.toString(),
        k: data.K.toString(),
        ph: data.pH.toString(),
      }));
    } catch (error) {
      Alert.alert("Error", "Could not fetch regional soil data");
    } finally {
      setIsFetchingSoil(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        username: editedProfile.username.trim(),
        language: editedProfile.languageCode,
        state: editedProfile.stateKey,
        district: editedProfile.districtKey,
        N: parseFloat(editedProfile.n),
        P: parseFloat(editedProfile.p),
        K: parseFloat(editedProfile.k),
        pH: parseFloat(editedProfile.ph),
      };

      const res = await api.patch('/user/profile', payload); //

      if (res.status === 200) {
        const updated = res.data.profile;

        // Immediate Sync: Language, AsyncStorage, and State
        if (updated.language !== i18n.language) {
          await i18n.changeLanguage(updated.language);
          await AsyncStorage.setItem('user-language', updated.language);
        }

        await AsyncStorage.setItem('userProfile', JSON.stringify(updated));

        setProfile({
          username: updated.name,
          languageCode: updated.language,
          districtKey: updated.district,
          stateKey: updated.state,
          n: updated.n.toString(),
          p: updated.p.toString(),
          k: updated.k.toString(),
          ph: updated.ph.toString()
        });

        setEditVisible(false);
        Alert.alert("Success", t('profile.update_success'));
      }
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || t('profile.update_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayLocation = profile.districtKey && profile.stateKey
    ? `${t(`locations.districts.${profile.stateKey}.${profile.districtKey}`)}, ${t(`locations.states.${profile.stateKey}`)}`
    : t('locations.default_region');

  const handleLogoutPress = () => {
    setLogoutModalVisible(true);
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom+40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="header" style={styles.title} numberOfLines={1}>{t('profile.title')}</AppText>
            <AppText variant="content" style={styles.subtitle} numberOfLines={2}>{t('profile.subtitle')}</AppText>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditVisible(true)}>
            <Feather name="edit" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <ProfileItem icon="user" label="Username" value={profile.username} t={t} />
          <ProfileItem icon="globe" label="Language" value={LANGUAGE_MAP[profile.languageCode] || profile.languageCode} t={t} />
          <ProfileItem icon="map-pin" label="Location" value={displayLocation} t={t} />
        </View>

        <View style={styles.card}>
          <AppText variant="content" bold style={styles.sectionTitle}>{t('profile.soil_params')}</AppText>
          <View style={styles.grid}>
            <SoilCard label="N" value={`${profile.n} kg/ha`} />
            <SoilCard label="P" value={`${profile.p} kg/ha`} />
            <SoilCard label="K" value={`${profile.k} kg/ha`} />
            <SoilCard label="pH" value={profile.ph} />
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogoutPress}
          activeOpacity={0.7}
        >
          <View style={styles.logoutIconContainer}>
            <Feather name="log-out" size={20} color="#DC3545" />
          </View>
          <View style={styles.logoutTextContainer}>
            <AppText variant="content" bold style={styles.logoutTitle}>
              {t('profile.logout')}
            </AppText>
            <AppText style={styles.logoutSubtitle}>
              {t('profile.logout_description') || "Sign out of your session"}
            </AppText>
          </View>
          <Feather name="chevron-right" size={18} color="#DC3545" style={{ opacity: 0.3 }} />
        </TouchableOpacity>
      </ScrollView>
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={styles.alertIconBg}>
              <MaterialCommunityIcons name="logout" size={40} color="#156349" />
            </View>

            <AppText variant="header" style={styles.alertTitle}>{t('profile.logout')}</AppText>
            <AppText variant="content" style={styles.alertMessage}>{t('profile.logout_confirm')}</AppText>

            <View style={styles.alertFooter}>
              <TouchableOpacity
                style={styles.alertCancelBtn}
                onFocus={() => { }}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.alertCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.alertConfirmBtn}
                onPress={() => {
                  setLogoutModalVisible(false);
                  logout();
                }}
              >
                <Text style={styles.alertConfirmText}>{t('profile.logout')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Polished Edit Modal */}
      <Modal visible={editVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderInner}>
              <AppText variant="header" style={styles.modalTitleText}>{t('profile.edit')}</AppText>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#156349" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollArea} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('profile.username')}</Text>
              <TextInput
                value={editedProfile.username}
                onChangeText={(t) => setEditedProfile({ ...editedProfile, username: t })}
                style={styles.modernInput}
              />

              <Text style={styles.inputLabel}>{t('profile.language')}</Text>
              <View style={styles.languageGrid}>
                {Object.entries(LANGUAGE_MAP).map(([code, name]) => (
                  <TouchableOpacity
                    key={code}
                    style={[styles.langChip, editedProfile.languageCode === code && styles.langChipActive]}
                    onPress={() => setEditedProfile({ ...editedProfile, languageCode: code })}
                  >
                    <AppText variant="content" style={[styles.langChipText, editedProfile.languageCode === code && styles.textWhite]}>
                      {name}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>{t('onboarding.location')}</Text>
              <View style={styles.locationFlex}>
                <TextInput
                  value={toTitleCase(editedProfile.stateKey)}
                  onChangeText={(t) => setEditedProfile({ ...editedProfile, stateKey: t.toLowerCase() })}
                  style={[styles.modernInput, { flex: 1, marginRight: 8 }]}
                  placeholder="State"
                />
                <TextInput
                  value={toTitleCase(editedProfile.districtKey)}
                  onChangeText={(t) => setEditedProfile({ ...editedProfile, districtKey: t.toLowerCase() })}
                  style={[styles.modernInput, { flex: 1 }]}
                  placeholder="District"
                />
              </View>

              <View style={styles.soilHeaderContainer}>
                <AppText variant="content" bold style={styles.sectionLabelText}>{t('profile.soil_params')}</AppText>
                <TouchableOpacity style={styles.polishedFetchBtn} onPress={handleAutoSoilFetch} disabled={isFetchingSoil}>
                  {isFetchingSoil ? <ActivityIndicator size="small" color="#156349" /> : (
                    <>
                      <MaterialCommunityIcons name="auto-fix" size={14} color="#156349" />
                      <Text style={styles.fetchBtnText}>{t('onboarding.auto_fetch')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.soilGridContainer}>
                {['n', 'p', 'k', 'ph'].map((key) => (
                  <View key={key} style={styles.soilInputBox}>
                    <Text style={styles.paramLabel}>{key.toUpperCase()}</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={editedProfile[key as keyof typeof profile].toString()}
                      onChangeText={(t) => setEditedProfile({ ...editedProfile, [key]: t })}
                      style={styles.soilInput}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modernCancelBtn} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelText}>{t('profile.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modernSaveBtn} onPress={handleSaveProfile} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{t('profile.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#DDF1F9' },
  container: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  title: { fontSize: 20, color: '#156349', fontWeight: 'bold' },
  subtitle: { fontStyle: 'italic', fontSize: 12, color: '#186F71', marginTop: 4 },
  editBtn: { backgroundColor: '#156349', padding: 12, borderRadius: 25 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 3 },
  profileItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderColor: '#E0E0E0' },
  iconCircle: { backgroundColor: '#EAF6FB', padding: 8, borderRadius: 20, marginRight: 12 },
  itemLabel: { flex: 1, fontSize: 14, color: '#156349', fontWeight: '500' },
  itemValue: { fontSize: 14, color: '#4A6F7C' },
  sectionTitle: { fontSize: 16, color: '#156349', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  soilCard: { width: '48%', backgroundColor: '#EAF6FB', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  soilLabel: { fontSize: 14, fontWeight: '700', color: '#156349', marginBottom: 4 },
  soilValue: { fontSize: 12, color: '#4A6F7C' },

  // Modal Specific
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 28, maxHeight: '90%', overflow: 'hidden' },
  modalHeaderInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitleText: { fontSize: 18, color: '#156349' },
  modalScrollArea: { padding: 20 },
  inputLabel: { fontSize: 12, color: '#156349', fontWeight: 'bold', marginBottom: 6, marginTop: 10 },
  modernInput: { backgroundColor: '#F8FAFB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E8ECEF', color: '#156349' },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  langChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#156349' },
  langChipActive: { backgroundColor: '#156349' },
  langChipText: { fontSize: 12, color: '#156349' },
  textWhite: { color: '#FFF' },
  locationFlex: { flexDirection: 'row', marginBottom: 10 },
  soilHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 10 },
  polishedFetchBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF6FB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  fetchBtnText: { fontSize: 11, color: '#156349', fontWeight: 'bold' },
  soilGridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  soilInputBox: { width: '48%', backgroundColor: '#F8FAFB', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E8ECEF' },
  paramLabel: { fontSize: 10, color: '#156349', fontWeight: 'bold', marginBottom: 2 },
  soilInput: { fontSize: 16, color: '#156349', fontWeight: 'bold' },
  modalFooter: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 12 },
  modernSaveBtn: { flex: 2, backgroundColor: '#156349', padding: 16, borderRadius: 16, alignItems: 'center' },
  modernCancelBtn: { flex: 1, backgroundColor: '#F5F7F8', padding: 16, borderRadius: 16, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold' },
  cancelText: { color: '#156349', fontWeight: 'bold' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  logoutIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EAF6FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  logoutTitle: {
    color: '#156349',
    fontSize: 16,
  },
  logoutSubtitle: {
    color: '#A0A0A0',
    fontSize: 12,
    marginTop: 2,
  },

  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  alertBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 25,
    alignItems: 'center',
    elevation: 10,
  },
  alertIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DDF1F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  alertTitle: {
    fontSize: 22,
    color: '#156349',
    marginBottom: 10,
  },
  alertMessage: {
    textAlign: 'center',
    color: '#4A6F7C',
    lineHeight: 20,
    marginBottom: 30,
  },
  alertFooter: {
    flexDirection: 'row',
    gap: 15,
  },
  alertCancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 15,
    backgroundColor: '#F5F7F8',
    alignItems: 'center',
  },
  alertCancelText: {
    color: '#156349',
    fontWeight: 'bold',
  },
  alertConfirmBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 15,
    backgroundColor: '#156349',
    alignItems: 'center',
  },
  alertConfirmText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});