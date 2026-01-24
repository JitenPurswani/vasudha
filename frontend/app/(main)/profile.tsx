import { AppText } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const ProfileItem = ({ icon, label, value, t }) => (
  <View style={styles.profileItem}>
    <View style={styles.iconCircle}>
      <Feather name={icon} size={14} color="#156349" />
    </View>
    <AppText variant='content' style={styles.itemLabel}>{t(`profile.${label.toLowerCase()}`)}</AppText>
    <AppText variant='content' style={styles.itemValue}>{value}</AppText>
  </View>
);

const SoilCard = ({ label, value }) => (
  <View style={styles.soilCard}>
    <Text style={styles.soilLabel}>{label}</Text>
    <Text style={styles.soilValue}>{value}</Text>
  </View>
);
export default function Profile() {
  const [editVisible, setEditVisible] = useState(false);
  const [profile, setProfile] = useState({
  username: 'abc_xyz',
  language: 'English',
  location: 'Kalyan, Maharashtra',
});
const {t}=useTranslation();

const [editedProfile, setEditedProfile] = useState(profile);

  return (
    <View style={{ flex: 1, backgroundColor: '#DDF1F9' }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <AppText variant="header" style={styles.title}>{t('profile.title')}</AppText>
          <AppText variant="content" style={styles.subtitle}>{t('profile.subtitle')}</AppText>
        </View>

        <TouchableOpacity style={styles.editBtn}  onPress={() => setEditVisible(true)}>
          <Feather name="edit-2" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Profile Fields */}
      <View style={styles.card}>
        <ProfileItem icon="user" label="Username" value={profile.username} t={t} />
        <ProfileItem icon="globe" label="Language" value={profile.language} t={t} />
        <ProfileItem icon="map-pin" label="Location" value={profile.location} t={t} />

      </View>

      {/* Soil Parameters */}
      <View style={styles.card}>
        <AppText variant="content" bold style={styles.sectionTitle}>{t('profile.soil_params')}</AppText>

        <View style={styles.grid}>
          <SoilCard label="N" value="120 kg/ha" />
          <SoilCard label="P" value="180 kg/ha" />
          <SoilCard label="K" value="200 kg/ha" />
          <SoilCard label="pH" value="6.5" />
        </View>
      </View>

    </ScrollView>
    <Modal
  visible={editVisible}
  animationType="slide"
  transparent
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalCard}>
      <AppText variant='content' bold style={styles.modalTitle}>{t('profile.edit')}</AppText>

      <TextInput
      value={editedProfile.username}
      onChangeText={(text) =>
       setEditedProfile({ ...editedProfile, username: text })
      }
      style={styles.input}
      />
      <TextInput
      value={editedProfile.language}
      onChangeText={(text) =>
       setEditedProfile({ ...editedProfile, language: text })
      }
      style={styles.input}
      />

      <TextInput
      value={editedProfile.location}
      onChangeText={(text) =>
      setEditedProfile({ ...editedProfile, location: text })
      }
      style={styles.input}
      />

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => {
          setProfile(editedProfile);
          setEditVisible(false)
        }}
      >
        <AppText variant='content' bold style={{ color: '#fff' }}>{t('profile.save')}</AppText>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
</View>

    
  );
  
}



/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#DDF1F9',
    padding: 16,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 15,
    color: '#156349',
    marginTop: 12,
    alignSelf: 'flex-start',
    marginLeft: 2,
    width: 500,
  },
  subtitle: {
    fontFamily: 'OpenSans-Bold',
    fontStyle: 'italic',
    fontSize: 11,
    color: '#186F71',
    marginBottom: 12,
    alignSelf: 'flex-start',
    marginLeft: 12,
    width: '100%',
  },
  editBtn: {
    backgroundColor: '#156349',
    padding: 10,
    borderRadius: 20,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    elevation: 3,
  },

  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: '#E0E0E0',
  },

  iconCircle: {
    backgroundColor: '#EAF6FB',
    padding: 6,
    borderRadius: 20,
    marginRight: 10,
  },

  itemLabel: {
    flex: 1,
    fontSize: 14,
    color: '#156349',
    fontWeight: '500',
  },

  itemValue: {
    fontSize: 13,
    color: '#4A6F7C',
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#156349',
    marginBottom: 12,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  soilCard: {
    width: '48%',
    backgroundColor: '#EAF6FB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },

  soilLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#156349',
    marginBottom: 4,
  },

  soilValue: {
    fontSize: 12,
    color: '#4A6F7C',
  },
   tabs: {
    height: 60,          // Adjust based on tab bar height
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.4)',
  justifyContent: 'center',
},

modalCard: {
  backgroundColor: '#fff',
  margin: 20,
  padding: 20,
  borderRadius: 16,
},

modalTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#156349',
  marginBottom: 12,
},

input: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  padding: 10,
  marginBottom: 16,
},

saveBtn: {
  backgroundColor: '#156349',
  padding: 12,
  borderRadius: 10,
  alignItems: 'center',
},

});
