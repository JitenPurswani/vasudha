import { AppText } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import CropIcon from '../../../assets/images/crop.svg';
import SaplingIcon from '../../../assets/images/sapling.svg';

const { width: SCREEN_W } = Dimensions.get('window');

const DATA = [
  {
    id: 'rice',
    title: 'Rice',
    percent: '60%',
    percentNum: 60,
    headerBg: '#95C0D2',
    why: [
      'Soil pH (7.2) is ideal for rice cultivation',
      'Rainfall is adequate for supporting rice cultivation',
      'High market demand in your region',
    ],
  },
  {
    id: 'tomato',
    title: 'Tomato',
    percent: '30%',
    percentNum: 30,
    headerBg: '#BDDBE8',
    why: [
      'Soil pH (7.2) is ideal for tomato cultivation',
      'Rainfall is adequate for supporting tomato cultivation',
      'High market demand in your region',
    ],
  },
  {
    id: 'maize',
    title: 'Maize',
    percent: '20%',
    percentNum: 20,
    headerBg: '#BDDBE8',
    why: [
      'Soil pH (7.2) is ideal for maize cultivation',
      'Rainfall is adequate for supporting maize cultivation',
      'High market demand in your region',
    ],
  },
];

// Subset for seasonal recommendations (example set; adjust as needed)
const SEASONAL_DATA = [DATA[0], DATA[1]];

function CropCard({ item, isTop }: { item: typeof DATA[number]; isTop?: boolean }) {
  
  const { t, i18n } = useTranslation();
  return (
    <View style={styles.cardWrap}>
      <View style={[styles.cardHeader, { backgroundColor: item.headerBg }]}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.cardTitleRow}>
            <CropIcon width={20} height={20} fill="#186F71" />
            <AppText variant="content" style={styles.cardTitle}>{t('crops.' + item.title.toLowerCase())}</AppText>
          </View>
          {isTop && (
            <View style={styles.cardTagRow}>
              <Ionicons name="trophy-outline" size={14} color="#026365" />
              <AppText variant="content" style={styles.cardTag}>{t('crop.top_recommendation')}</AppText>
            </View>
          )}
        </View>
        <View style={styles.cardHeaderRight}>
          <AppText variant='content' style={styles.cardPercentText}>{item.percent}</AppText>
          <View style={styles.squircleIcon}>
            <SaplingIcon width={16} height={16} />
          </View>
        </View>
      </View>
      <View style={styles.cardBody}>
        <AppText variant='content' style={styles.whyTitle}>{t('crop.why_this_crop')}</AppText>
        {item.why.map((w, i) => (
          <AppText variant="content" key={i} style={styles.whyText}>• {w}</AppText>
        ))}
      </View>
    </View>
  );
}

export default function Crop() {
  const [mode, setMode] = useState<'seasonal' | 'all'>('seasonal');

  const { t, i18n } = useTranslation();
  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" backgroundColor="#DDF1F9" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header row removed (logo and icons) */}

        <AppText variant='header' style={styles.title}>{t('crop.title')}</AppText>
        <AppText variant='content' style={styles.subtitle}>{t('crop.subtitle')}</AppText>

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'seasonal' && styles.toggleBtnActive]}
            onPress={() => setMode('seasonal')}
          >
            <AppText variant='content' bold style={[styles.toggleText, mode === 'seasonal' && styles.toggleTextActive]}>{t('crop.seasonal')}</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtnSecondary, mode === 'all' && styles.toggleBtnActiveSecondary]}
            onPress={() => setMode('all')}
          >
            <AppText variant='content' bold style={[styles.toggleTextSecondary, mode === 'all' && styles.toggleTextActive]}>{t('crop.all_season')}</AppText>
          </TouchableOpacity>
        </View>

        {/* Cards */}
        {(mode === 'seasonal' ? SEASONAL_DATA : DATA).map((d, idx) => (
          <CropCard key={d.id} item={d} isTop={idx === 0} />
        ))}

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
    paddingTop: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
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
    width: '100%'
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center', 
    textAlign: 'center',
    alignItems: 'center',
    width: '100%',
    marginVertical: 18,
    gap: 12, 
  },
  toggleBtn: {
    minWidth: 120, 
    height: 40,
    backgroundColor: 'rgba(189, 219, 232, 0.8)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#186F71',
    borderWidth: 0.5,
  },
  toggleBtnActive: {
    backgroundColor: '#186F71',
  },
  toggleText: {
    color: '#156349',
    fontWeight: '600',
    fontSize: 12,
  },
  toggleBtnSecondary: {
    width: 120,
    height: 40,
    backgroundColor: 'rgba(189, 219, 232, 0.8)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#186F71',
    borderWidth: 0.5,
  },
  toggleBtnActiveSecondary: {
    backgroundColor: '#186F71',
  },
  toggleTextSecondary: {
    color: '#156349',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center'
  },
  toggleTextActive: {
    color: '#fff',
  },
  cardWrap: {
    width: Math.min(320, SCREEN_W - 40),
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: '#09583E',
  },
  cardHeader: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  cardHeaderRight: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  squircleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DDF1F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'OpenSans',
    fontWeight: '800',
    fontSize: 14,
    color: '#186F71',
    marginLeft: 6,
  },
  cardTag: {
    fontFamily: 'OpenSans',
    fontStyle: 'italic',
    fontSize: 10,
    color: '#026365',
    marginLeft: 8,
  },
  cardPercentWrap: {
    justifyContent: 'center',
  },
  cardPercent: {
    justifyContent: 'center',
  },
  cardPercentText: {
    backgroundColor: '#DDF1F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 12,
    color: '#186F71',
  },
  cardBody: {
    backgroundColor: '#E7F8FF',
    padding: 14,
  },
  whyTitle: {
    fontFamily: 'OpenSans',
    fontWeight: '700',
    fontSize: 11,
    color: '#186F71',
    marginBottom: 6,
  },
  whyText: {
    fontFamily: 'OpenSans',
    fontStyle: 'italic',
    fontSize: 11,
    color: '#186F71',
    marginBottom: 6,
  },
});