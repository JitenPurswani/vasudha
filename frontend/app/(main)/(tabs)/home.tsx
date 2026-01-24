import AlertIcon from '@/assets/images/alert.svg';
import HumidityIcon from '@/assets/images/humidity.svg';
import RainIcon from '@/assets/images/rain.svg';
import SaplingIcon from '@/assets/images/sapling.svg';
import SceneryHeader from '@/assets/images/scenery_home.svg';
import WindIcon from '@/assets/images/wind.svg';
import Alert from '@/components/Alert';
import { AppText } from '@/components/AppText';
import { getFont } from '@/constants/Typography';
import { Feather, Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const WeatherStatItem = ({ Icon, value, label }: any) => {
  const displayValue = value && String(value).trim() !== "" ? value : "-";

  return (
    <View style={styles.statBox}>
      {Icon && <Icon width={24} height={24} />}
      <Text style={[styles.kronaFont, styles.statValue]}>{displayValue}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
};

export default function Home() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const [userName, setUserName] = useState('User');
  const [currentDate, setCurrentDate] = useState('');

    const currentContentFont = getFont('content',i18n.language);
  const weatherStats = [
    { id: '1', label: t('home.weather.precipitation'), value: '80%', Icon: RainIcon },
    { id: '2', label: t('home.weather.humidity'), value: '10%', Icon: HumidityIcon },
    { id: '3', label: t('home.weather.wind_speed'), value: '10 km/h', Icon: WindIcon },
  ];

  const marketData = [
    { id: '1', location: 'Kalyan APMC', price: '2500', trend: '+6%', isUp: true },
    { id: '2', location: 'Thane APMC', price: '1500', trend: '-10%', isUp: false },
  ];

  const alertsData = [
    {
      id: '1',
      title: 'Strong winds expected',
      description: 'Avoid spraying and protect saplings',
      icon: AlertIcon,
    },
    {
      id: '2',
      title: 'Heavy Rainfall Expected in next 24 hours',
      description: 'Prepare for proper drainage',
      icon: AlertIcon,
    }
  ];

  useEffect(() => {
    const date = format(new Date(), 'EEEE, dd MMM yyyy');
    setCurrentDate(date);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 0 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrapper}>
          <View style={styles.imageContainer}>
            <SceneryHeader width="100%" height={200} preserveAspectRatio="xMidYMid slice" />
          </View>

          <View style={styles.textOverlay}>
            <AppText variant="content" style={styles.welcomeText}>
              {t('home.greeting')} <Text style={styles.nameText}>{userName}</Text>
            </AppText>
            <AppText variant='content' style={styles.dateText}>{currentDate}</AppText>
          </View>
        </View>

        <View style={styles.contentPadding}>
          <AppText variant='header' style={styles.sectionTitle}>{t('home.sections.weather')}</AppText>

          <ImageBackground
            source={require('@/assets/images/weather_gradient.png')}
            style={styles.weatherCard}
            imageStyle={{ borderRadius: 20 }}
          >
            <View style={styles.weatherInfo}>
              <AppText variant='content' bold style={styles.weatherLabel}>{t('home.weather.temperature')}</AppText>
              <View style={styles.tempContainer}>
                <AppText variant="content" bold style={styles.tempText}>22{"\u00B0"}C</AppText>
              </View>
              <AppText variant='content' style={styles.locationText}>{t('locations.default_region')}</AppText>
            </View>
          </ImageBackground>

          <View style={styles.statsRow}>
            {weatherStats.map((stat) => (
              <WeatherStatItem key={stat.id} {...stat} />
            ))}
          </View>

          <AppText variant='content' style={styles.lastUpdatedText}>
            {t('common.last_updated', { timestamp: '11.00 am, 25/12/2025' })}
          </AppText>

          <AppText variant="header" style={styles.sectionTitle}>{t('home.sections.alerts')}</AppText>
          {alertsData.map((item) => (
            <Alert
              key={item.id}
              IconComponent={item.icon}
              title={item.title}
              description={item.description}
            />
          ))}

          <AppText variant='header' style={styles.sectionTitle}>{t('home.sections.crop')}</AppText>
          <View style={styles.cropCard}>
            <View style={styles.cropInfoLeft}>
              <SaplingIcon height={20} width={20} />
              <AppText variant='content' style={styles.cropName}>Tomato</AppText>
            </View>
            <View style={styles.cropInfoRight}>
              <Ionicons name="time-outline" size={20} color="#186F71" />
              <Text style={styles.cropDays}>{t('home.crop.days_since', { days: 7 })}</Text>
            </View>
          </View>

          <AppText variant='header' style={styles.sectionTitle}>{t('home.sections.market')}</AppText>
          <View style={styles.marketCard}>
            <AppText variant='content' style={styles.currentPriceLabel}>Current Price</AppText>

            {marketData.map((item) => (
              <View key={item.id} style={styles.marketRow}>
                <AppText variant='content' style={styles.locationTextMarket}>{item.location}</AppText>
                
                <AppText variant='content' style={styles.priceValueText}>
                  ₹{item.price} <Text style={styles.perKgText}>{t('market.per_kg')}</Text>
                </AppText>

                <View style={styles.trendCapsule}>
                  <Feather 
                    name={item.isUp ? "trending-up" : "trending-down"} 
                    size={16} 
                    color={item.isUp ? "#28A745" : "#DC3545"} 
                  />
                  <AppText variant='content' style={[styles.trendText, { color: item.isUp ? "#28A745" : "#DC3545" }]}>
                    {item.trend}
                  </AppText>
                </View>
              </View>
            ))}
          </View>

          <AppText variant='content' style={styles.lastUpdatedText}>{t('common.last_updated', { timestamp: '11.00 am, 25/12/2025' })}
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DDF1F9',
  },
  kronaFont: {
    fontFamily: 'KronaOne'
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingBottom: 200,
  },
  headerWrapper: {
    width: '100%',
    height: 200,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    overflow: 'hidden',
  },
  textOverlay: {
    position: 'absolute',
    top: 15,
    left: 20,
    zIndex: 1,
  },
  welcomeText: {
    fontSize: 26,
    color: '#156349',
    fontFamily: 'OpenSans-Regular',
  },
  nameText: {
    fontFamily: 'OpenSans-Bold',
    color: '#186F71',
  },
  dateText: {
    fontSize: 12,
    color: '#156349',
    marginTop: 2,
    fontFamily: 'OpenSans-Regular'
  },
  contentPadding: {
    paddingHorizontal: 20,
    marginTop: -15,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#156349',
    marginBottom: 12,
    marginTop: 10,
    paddingTop: 28,
  },
  weatherCard: {
    width: '108%', 
    padding: 24,
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#042f30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  weatherInfo: {
    justifyContent: 'center',
  },
  weatherLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'OpenSans-Bold',
    marginBottom: 4,
  },
  tempContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  tempText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: 'KronaOne',
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'OpenSans-Regular',
    opacity: 0.9,
  },
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 15, 
    gap: 10 
  },
  statBox: { 
    flex: 1, 
    backgroundColor: '#BDDBE8', 
    borderRadius: 16, 
    borderColor: '#186F71', 
    borderWidth: 0.8, 
    paddingVertical: 15, 
    alignItems: 'center', 
    minHeight: 85 
  },
  statValue: { 
    fontSize: 12, 
    color: '#186F71', 
    marginTop: 6 
  },
  statLabel: { 
    fontSize: 10, 
    color: '#186F71', 
    opacity: 0.7 
  },
  cropCard: {
    flexDirection: 'row',
    backgroundColor: '#BDDBE8',
    borderRadius: 15,
    padding: 15,
    justifyContent: 'space-between',
    alignItems: 'center',
    opacity: 0.9,
    borderColor: '#186F71',
    borderWidth: 0.8,
    elevation: 5,
    shadowColor: '#042f30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cropInfoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cropInfoRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cropName: { fontSize: 14, fontFamily: 'OpenSans-Bold', color: '#186F71' },
  cropDays: { fontSize: 12, color: '#186F71' },
  marketCard: {
    backgroundColor: '#BDDBE8',
    borderRadius: 20,
    padding: 20,
    borderWidth: 0.8,
    borderColor: '#186F71',
    elevation: 5,
    shadowColor: '#042f30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  currentPriceLabel: {
    fontSize: 14,
    fontFamily: 'OpenSans-Bold',
    color: '#186F71',
    marginBottom: 15,
  },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  locationTextMarket: {
    flex: 1.5,
    fontSize: 12,
    color: '#186F71',
    fontFamily: 'OpenSans-Regular',
  },
  priceValueText: {
    flex: 1.5,
    fontSize: 12,
    fontFamily: 'OpenSans-Bold',
    color: '#186F71',
    marginLeft: 12,
  },
  perKgText: {
    fontSize: 12,
    fontFamily: 'OpenSans-Italic',
    fontWeight: 'normal',
  },
  trendCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)', 
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
    gap: 5,
    minWidth: 75,
    justifyContent: 'center',
  },
  trendText: {
    fontSize: 12,
    fontFamily: 'OpenSans-Bold',
  },
  lastUpdatedText: {
    textAlign: 'right',
    fontSize: 10,
    color: '#186F71',
    fontFamily: 'OpenSans-Italic',
    marginTop: 8,
    opacity: 0.6,
    paddingRight: 5,
  },
});