import { AppText } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  View
} from 'react-native';
export default function FertilizerRecommendation() {
  const {t}=useTranslation();
  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" backgroundColor="#DDF1F9" />
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="header" style={styles.title}>{t('fertilizer.title')}</AppText>
        <AppText variant="content" style={styles.subtitle}>{t('fertilizer.subtitle')}</AppText>

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
});