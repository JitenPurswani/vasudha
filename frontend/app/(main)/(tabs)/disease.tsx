import { AppText } from '@/components/AppText';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
export default function Disease() {
  const {t}=useTranslation();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  async function takePhoto() {
    if (Platform.OS === 'web') {
      Alert.alert('Not supported', 'Camera capture is not supported on web in this flow.');
      return;
    }

    let ImagePickerModule: any;
    try {
      // dynamic require so the app doesn't fail to build if the package isn't installed
      ImagePickerModule = require('expo-image-picker');
    } catch (err) {
      Alert.alert('Missing dependency', 'Please run: expo install expo-image-picker');
      return;
    }

    try {
      const { status } = await ImagePickerModule.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is required to take pictures.');
        return;
      }

      const result = await ImagePickerModule.launchCameraAsync({ quality: 0.8, allowsEditing: false });
      if (!result.canceled) {
        const uri = result.assets?.[0]?.uri ?? (result as any).uri;
        if (uri) setImageUri(uri);
      }
    } catch (e) {
      console.warn('Camera error', e);
    }
  }
  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" backgroundColor="#DDF1F9" />
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="header" style={styles.title}>{t('disease.title')}</AppText>
        <AppText variant="content" style={styles.subtitle}>{t('disease.subtitle')}</AppText>

        {/* Photo box (tap to take picture or view preview) */}
        <TouchableOpacity
          style={styles.photoBox}
          activeOpacity={0.8}
          onPress={() => (imageUri ? setShowPreview(true) : takePhoto())}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photoImage} />
          ) : (
            <MaterialIcons name="photo-camera" size={45} color="#058172" />
          )}
        </TouchableOpacity>

        {/* Buttons */}
        <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.8}>
          <AppText variant='content' bold style={styles.uploadText}>{t('disease.upload')}</AppText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.retakeBtn} activeOpacity={0.8} onPress={takePhoto}>
          <Text style={styles.retakeText}>{imageUri ? t('disease.retake') : t('disease.click_picture')}</Text>
        </TouchableOpacity>

        {/* Preview modal */}
        <Modal visible={showPreview} animationType="fade" transparent={true} onRequestClose={() => setShowPreview(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Image source={{ uri: imageUri ?? undefined }} style={styles.previewImage} />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalBtn} onPress={() => { setShowPreview(false); }}>
                  <AppText variant='content' style={styles.modalBtnText}>{t('disease.close')}</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalRetake]} onPress={() => { setShowPreview(false); takePhoto(); }}>
                  <AppText style={[styles.modalBtnText, { color: '#fff' }]}>{t('disease.retake')}</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Diagnosis label */}
        <AppText variant='header' style={styles.diagnosisLabel}>{t('disease.diagnosis')}</AppText>

        {/* Diagnosis card (header + body) */}
        <View style={styles.diagnosisCard}>
          <View style={styles.diagnosisHeader}>
            <MaterialCommunityIcons name="bug" size={20} color="#186F71" style={{ marginRight: 8 }} />
            <AppText variant='content' bold style={styles.diagnosisTitle}>Powdery Mildew</AppText>
          </View>
          <View style={styles.diagnosisInner}>
            <AppText variant='content' bold style={styles.treatmentTitle}>Treatment suggestions</AppText>
            <AppText variant='content' style={styles.treatmentText}>• Apply Tricyclazole 75 WP at 0.6 g/L</AppText>
            <AppText variant='content' style={styles.treatmentText}>• Reduce Nitrogen fertilizer till infection subsides</AppText>
            <AppText variant='content' style={styles.treatmentText}>• Prune infected leaves using sterilized tools</AppText>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#DDF1F9',
  },
  content: {
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 20,
    
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
    width: '95%',
  },
  photoBox: {
    width: 248,
    height: 214,
    backgroundColor: '#BDDBE8',
    borderWidth: 0.5,
    borderColor: '#09583E',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'cover',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 420,
    resizeMode: 'contain',
    backgroundColor: '#000',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F2F2F2',
  },
  modalBtnText: {
    color: '#186F71',
    fontWeight: '700',
  },
  modalRetake: {
    backgroundColor: '#186F71',
  },
  uploadBtn: {
    width: 180,
    height: 40,
    backgroundColor: '#186F71',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  uploadText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  retakeBtn: {
    width: 180,
    height: 40,
    backgroundColor: '#BDDBE8',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  retakeText: {
    color: '#186F71',
    fontWeight: '700',
    fontSize: 12,
  },
  diagnosisCard: {
    width: 320,
    backgroundColor: '#BDDBE8',
    borderWidth: 0.5,
    borderColor: '#09583E',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'flex-start',
    marginTop: 4,
    alignSelf: 'center',
  },
  diagnosisTitle: {
    fontFamily: 'OpenSans-Bold',
    fontWeight: '500',
    fontSize: 15,
    color: '#186F71',
    marginBottom: 0,
    
  },
  diagnosisInner: {
    width: '100%',
    backgroundColor: '#E7F8FF',
    padding: 14,
  },
  treatmentTitle: {
    fontFamily: 'OpenSans-Bold',
    
    fontWeight: '700',
    fontSize: 12,
    color: '#186F71',
    marginBottom: 10,
  },
  treatmentText: {
    fontFamily: 'OpenSans',
    fontStyle: 'italic',
    fontSize: 11,
    color: '#186F71',
    marginBottom: 2,
    lineHeight: 20,
  },
  diagnosisHeader: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#CFEFF4',
    flexDirection: 'row',
    alignItems: 'center',
  },
  diagnosisLabel: {
    fontFamily: 'KronaOne',
    fontSize: 15,
    lineHeight: 18,
    color: '#156349',
    alignSelf: 'flex-start',
    marginLeft: 20,
    right:16,
    marginTop: 12,
    marginBottom: 10,
  }
});