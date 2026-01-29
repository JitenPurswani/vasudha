import HumidityIcon from '@/assets/images/humidity.svg';
import RainIcon from '@/assets/images/rain.svg';
import SaplingIcon from '@/assets/images/sapling.svg';
import SceneryHeader from '@/assets/images/scenery_home.svg';
import WindIcon from '@/assets/images/wind.svg';
import { AppText } from '@/components/AppText';
import { getFont } from '@/constants/Typography';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { format, differenceInDays, addDays } from 'date-fns';
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { jwtDecode } from 'jwt-decode';
import { fetchWeather, WeatherResponse } from '@/services/weatherApi';
import { useCrop } from '@/context/CropContext';
import { useActiveCrops, CropGrowthState, ActiveCrop } from '@/context/ActiveCropsContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { fetchNearbyMarketPrices, NearbyMarketPrice } from '@/services/marketApi';

const WeatherStatItem = ({ Icon, value, label }: any) => {
  const displayValue = value && String(value).trim() !== '' ? value : '-';

  return (
    <View style={styles.statBox}>
      {Icon && <Icon width={24} height={24} />}
      <Text style={[styles.kronaFont, styles.statValue]}>{displayValue}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
};

// Market Price Card Component
const MarketPriceCard = ({ item }: { item: NearbyMarketPrice }) => {
  const { t } = useTranslation();
  const trendColor = item.price_change_percent >= 0 ? '#28A745' : '#DC3545';
  const trendIcon = item.price_change_percent >= 0 ? 'trending-up' : 'trending-down';
  
  return (
    <View style={styles.marketCard}>
      <View style={styles.marketCardHeader}>
        <Text style={styles.marketName} numberOfLines={1}>{item.apmc}</Text>
        <View style={[styles.trendBadge, { backgroundColor: trendColor + '20' }]}>
          <Feather name={trendIcon} size={12} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]}>
            {item.price_change_percent >= 0 ? '+' : ''}{item.price_change_percent.toFixed(1)}%
          </Text>
        </View>
      </View>
      <View style={styles.marketCardBody}>
        <Text style={styles.commodityName}>{item.commodity}</Text>
        <Text style={styles.priceText}>₹{item.current_price.toLocaleString()}/q</Text>
      </View>
      <Text style={styles.marketDate}>
        {t('common.as_of', { defaultValue: 'As of' })} {item.date}
      </Text>
    </View>
  );
};

// Crop History Modal Component
const CropHistoryModal = ({ 
  visible, 
  onClose, 
  crops, 
  onSelectCrop 
}: { 
  visible: boolean; 
  onClose: () => void; 
  crops: ActiveCrop[];
  onSelectCrop: (crop: ActiveCrop) => void;
}) => {
  const { t } = useTranslation();
  
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.historyModalOverlay}>
        <View style={styles.historyModalContent}>
          <View style={styles.historyModalHeader}>
            <AppText variant="header" style={styles.historyModalTitle}>
              {t('home.crop.crop_history', { defaultValue: 'Your Crops' })}
            </AppText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color="#156349" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.historyModalList}>
            {crops.length === 0 ? (
              <View style={styles.noCropsContainer}>
                <SaplingIcon height={48} width={48} />
                <AppText variant="content" style={styles.noCropsText}>
                  {t('home.crop.no_crops_yet', { defaultValue: 'No crops yet. Select a crop from recommendations!' })}
                </AppText>
              </View>
            ) : (
              crops.map((crop) => (
                <TouchableOpacity 
                  key={crop.id} 
                  style={styles.historyItem}
                  onPress={() => onSelectCrop(crop)}
                >
                  <View style={styles.historyItemLeft}>
                    <SaplingIcon height={20} width={20} />
                    <View style={styles.historyItemInfo}>
                      <Text style={styles.historyItemName}>{crop.displayName}</Text>
                      <Text style={styles.historyItemDate}>
                        {t('home.crop.planted_on', { defaultValue: 'Planted' })}: {format(new Date(crop.plantingDate), 'MMM dd, yyyy')}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: crop.status === 'active' ? '#28A74520' : '#78909C20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: crop.status === 'active' ? '#28A745' : '#78909C' }
                    ]}>
                      {crop.status === 'active' ? t('common.active', { defaultValue: 'Active' }) : crop.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.addCropButton}
            onPress={onClose}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.addCropButtonText}>
              {t('home.crop.add_new_crop', { defaultValue: 'Add New Crop' })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function Home() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { selectedCrop, plantingDate, setPlantingDate, isLoading: cropLoading } = useCrop();
  const { activeCrops, primaryCrop, getCropGrowthState, getCropProfile, refreshUserData, isLoading: activeCropsLoading } = useActiveCrops();
  const { userId } = useAuth();
  const router = useRouter();

  const [userName, setUserName] = useState('User');
  const [currentDate, setCurrentDate] = useState('');
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [growthState, setGrowthState] = useState<CropGrowthState | null>(null);
  
  // Market prices state
  const [marketPrices, setMarketPrices] = useState<NearbyMarketPrice[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [userState, setUserState] = useState<string | null>(null);

  const [showPlantingDateModal, setShowPlantingDateModal] = useState(false);
  const [tempPlantingDate, setTempPlantingDate] = useState<Date>(
    plantingDate || new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCropHistoryModal, setShowCropHistoryModal] = useState(false);

  const currentContentFont = getFont('content', i18n.language);
  
  // Refresh user data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshAll = async () => {
        console.log('[Home] Screen focused, refreshing data...');
        
        // Refresh active crops data for current user
        await refreshUserData();
        
        // Refresh user profile
        const savedData = await AsyncStorage.getItem('userProfile');
        if (savedData) {
          const data = JSON.parse(savedData);
          setUserName(data.name || 'Farmer');
          setUserState(data.state || null);
          console.log('[Home] Loaded user profile:', data.name);
        } else {
          // Fallback to JWT if no profile
          const token = await SecureStore.getItemAsync('userToken');
          if (token) {
            try {
              const decoded: any = jwtDecode(token);
              setUserName(decoded.sub || 'Farmer');
              console.log('[Home] Loaded username from JWT:', decoded.sub);
            } catch (e) {
              setUserName('Farmer');
            }
          } else {
            setUserName('Farmer');
          }
        }
      };
      
      refreshAll();
    }, [refreshUserData])
  );

  // Fetch weather on component mount
  useEffect(() => {
    const loadWeather = async () => {
      try {
        setWeatherLoading(true);
        setWeatherError(null);

        // Get stored location coordinates
        const lat = await AsyncStorage.getItem('userLatitude');
        const lon = await AsyncStorage.getItem('userLongitude');

        if (!lat || !lon) {
          console.log('[Home] No location data found in storage');
          setWeatherError('Location not set. Please complete onboarding first.');
          setWeatherLoading(false);
          return;
        }

        console.log(`[Home] Loading weather for lat=${lat}, lon=${lon}`);

        const weatherData = await fetchWeather(parseFloat(lat), parseFloat(lon), 'kharif');
        setWeather(weatherData);
        console.log('[Home] Weather loaded successfully:', weatherData);
      } catch (error: any) {
        console.error('[Home] Weather fetch error:', error);
        setWeatherError(error.message || 'Failed to load weather');
      } finally {
        setWeatherLoading(false);
      }
    };

    loadWeather();
  }, []);

  useEffect(() => {
    const date = format(new Date(), 'EEEE, dd MMM yyyy');
    setCurrentDate(date);
  }, []);

  // Load market prices when user has a primary crop and state
  useEffect(() => {
    const loadMarketPrices = async () => {
      if (!primaryCrop || !userState) {
        setMarketPrices([]);
        return;
      }

      try {
        setMarketLoading(true);
        setMarketError(null);
        
        // Get market name for the crop
        const cropName = primaryCrop.displayName || primaryCrop.cropKey;
        console.log(`[Home] Fetching market prices for ${cropName} in ${userState}`);
        
        const prices = await fetchNearbyMarketPrices(userState, cropName, 3);
        setMarketPrices(prices);
        console.log(`[Home] Loaded ${prices.length} market prices`);
      } catch (error: any) {
        console.error('[Home] Market prices error:', error);
        setMarketError(error.message || 'Failed to load market prices');
        setMarketPrices([]);
      } finally {
        setMarketLoading(false);
      }
    };

    loadMarketPrices();
  }, [primaryCrop, userState]);

  // Calculate growth state when primary crop changes
  useEffect(() => {
    if (primaryCrop) {
      const state = getCropGrowthState(primaryCrop);
      setGrowthState(state);
    } else {
      setGrowthState(null);
    }
  }, [primaryCrop, getCropGrowthState]);

  // Calculate days since/to planting with better formatting
  const getDaysPlantingInfo = useCallback(() => {
    if (!plantingDate) return null;

    const today = new Date();
    const days = differenceInDays(today, plantingDate);

    if (days > 0) {
      if (days === 1) {
        return { label: t('home.crop.planting_yesterday'), days, dateStr: format(plantingDate, 'MMM dd, yyyy') };
      }
      return { label: t('home.crop.days_since', { days }), days, dateStr: format(plantingDate, 'MMM dd, yyyy') };
    } else if (days < 0) {
      const absDays = Math.abs(days);
      if (absDays === 1) {
        return { label: t('home.crop.planting_tomorrow'), days, dateStr: format(plantingDate, 'MMM dd, yyyy') };
      }
      return { label: t('home.crop.days_to', { days: absDays }), days, dateStr: format(plantingDate, 'MMM dd, yyyy') };
    } else {
      return { label: t('home.crop.planting_today'), days: 0, dateStr: format(plantingDate, 'MMM dd, yyyy') };
    }
  }, [plantingDate, t]);

  // Handle date picker change
  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Enforce 7-day window
      const today = new Date();
      const daysDiff = differenceInDays(selectedDate, today);

      if (Math.abs(daysDiff) > 7) {
        RNAlert.alert(
          'Invalid Date',
          'Planting date must be within 7 days (past or future)',
          [{ text: 'OK' }]
        );
        return;
      }

      setTempPlantingDate(selectedDate);
    }
  };

  // Confirm planting date
  const handleConfirmPlantingDate = async () => {
    setPlantingDate(tempPlantingDate);
    await AsyncStorage.setItem('plantingDate', tempPlantingDate.toISOString());
    setShowPlantingDateModal(false);
  };

  const daysInfo = getDaysPlantingInfo();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 0 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerWrapper}>
          <View style={styles.imageContainer}>
            <SceneryHeader width="100%" height={200} preserveAspectRatio="xMidYMid slice" />
          </View>

          <View style={styles.textOverlay}>
            <AppText variant="content" style={styles.welcomeText}>
              {t('home.greeting')} <Text style={styles.nameText}>{userName}</Text>
            </AppText>
            <AppText variant="content" style={styles.dateText}>
              {currentDate}
            </AppText>
          </View>
        </View>

        <View style={styles.contentPadding}>
          {/* Weather Section */}
          <AppText variant="header" style={styles.sectionTitle}>
            {t('home.sections.weather')}
          </AppText>

          {weatherLoading ? (
            <View style={styles.weatherLoadingContainer}>
              <ActivityIndicator size="large" color="#186F71" />
              <AppText variant="content" style={styles.weatherLoadingText}>
                {t('common.loading', { defaultValue: 'Loading weather...' })}
              </AppText>
            </View>
          ) : weatherError ? (
            <View style={styles.weatherErrorContainer}>
              <Ionicons name="alert-circle" size={32} color="#DC3545" />
              <AppText variant="content" style={styles.weatherErrorText}>
                {weatherError}
              </AppText>
            </View>
          ) : weather ? (
            <>
              <ImageBackground
                source={require('@/assets/images/weather_gradient.png')}
                style={styles.weatherCard}
                imageStyle={{ borderRadius: 20 }}
              >
                <View style={styles.weatherInfo}>
                  <AppText variant="content" bold style={styles.weatherLabel}>
                    {t('home.weather.temperature')}
                  </AppText>
                  <View style={styles.tempContainer}>
                    <AppText variant="content" bold style={styles.tempText}>
                      {weather.temperature_celsius ? `${Math.round(weather.temperature_celsius)}°C` : '-'}
                    </AppText>
                  </View>
                  <AppText variant="content" style={styles.locationText}>
                    {weather.district && weather.state 
                      ? `${weather.district}, ${weather.state}`
                      : weather.district || weather.state || t('locations.default_region')}
                  </AppText>
                </View>
              </ImageBackground>

              <View style={styles.statsRow}>
                <WeatherStatItem
                  key="humidity"
                  label={t('home.weather.humidity')}
                  value={weather.humidity_percent ? `${Math.round(weather.humidity_percent)}%` : '-'}
                  Icon={HumidityIcon}
                />
                <WeatherStatItem
                  key="rainfall"
                  label={t('home.weather.precipitation')}
                  value={weather.avg_seasonal_rainfall_mm ? `${Math.round(weather.avg_seasonal_rainfall_mm)} mm` : '-'}
                  Icon={RainIcon}
                />
                <WeatherStatItem
                  key="wind"
                  label={t('home.weather.wind_speed', { defaultValue: 'Wind Speed' })}
                  value={weather.wind_speed_kmh ? `${Math.round(weather.wind_speed_kmh)} km/h` : '-'}
                  Icon={WindIcon}
                />
              </View>

              <AppText variant="content" style={styles.lastUpdatedText}>
                {t('common.last_updated', { timestamp: format(new Date(), 'hh:mm a, dd/MM/yyyy') })}
              </AppText>
            </>
          ) : null}

          {/* Current Crop Section - Show if primary crop exists */}
          {primaryCrop && growthState && (
            <>
              <AppText variant="header" style={styles.sectionTitle}>
                {t('home.sections.crop')}
              </AppText>
              <TouchableOpacity
                style={styles.cropCardExpanded}
                onPress={() => router.push('/(main)/(tabs)/crop')}
              >
                {/* Top row: Crop name and stage badge */}
                <View style={styles.cropHeader}>
                  <View style={styles.cropNameRow}>
                    <SaplingIcon height={22} width={22} />
                    <AppText variant="content" bold style={styles.cropName}>
                      {primaryCrop.displayName}
                    </AppText>
                  </View>
                  {growthState.currentStage && (
                    <View style={styles.stageBadge}>
                      <MaterialCommunityIcons name="leaf" size={14} color="#fff" />
                      <Text style={styles.stageBadgeText}>
                        {growthState.currentStage.name}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${Math.min(100, growthState.progressPercent)}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.round(growthState.progressPercent)}%
                  </Text>
                </View>

                {/* Stats row */}
                <View style={styles.cropStatsRow}>
                  <View style={styles.cropStatItem}>
                    <Ionicons name="calendar-outline" size={16} color="#186F71" />
                    <Text style={styles.cropStatText}>
                      {t('home.crop.day_n', { n: growthState.daysSincePlanting })}
                    </Text>
                  </View>
                  <View style={styles.cropStatItem}>
                    <Ionicons name="time-outline" size={16} color="#186F71" />
                    <Text style={styles.cropStatText}>
                      {growthState.daysRemaining > 0 
                        ? t('home.crop.days_to_harvest', { days: growthState.daysRemaining })
                        : t('home.crop.ready_to_harvest')}
                    </Text>
                  </View>
                </View>

                {/* Stage tip */}
                {growthState.currentStage?.description && (
                  <View style={styles.stageTipContainer}>
                    <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#F7B035" />
                    <Text style={styles.stageTipText}>
                      {growthState.currentStage.description}
                    </Text>
                  </View>
                )}

                {/* Next stage indicator */}
                {growthState.nextStage && growthState.daysToNextStage > 0 && (
                  <View style={styles.nextStageRow}>
                    <Feather name="arrow-right" size={14} color="#78909C" />
                    <Text style={styles.nextStageText}>
                      {t('home.crop.next_stage', { 
                        stage: growthState.nextStage.name, 
                        days: growthState.daysToNextStage 
                      })}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Show "View All Crops" if user has multiple crops - opens history modal */}
              {activeCrops.length > 1 && (
                <TouchableOpacity 
                  style={styles.moreCropsLink}
                  onPress={() => setShowCropHistoryModal(true)}
                >
                  <Text style={styles.moreCropsText}>
                    {t('home.crop.view_all_crops', { count: activeCrops.length })}
                  </Text>
                  <Feather name="chevron-right" size={16} color="#186F71" />
                </TouchableOpacity>
              )}
            </>
          )}

          {/* No crop selected - New users or users without crops */}
          {!primaryCrop && !activeCropsLoading && (
            <>
              <AppText variant="header" style={styles.sectionTitle}>
                {t('home.sections.crop')}
              </AppText>
              <TouchableOpacity
                style={styles.noCropCard}
                onPress={() => router.push('/(main)/(tabs)/crop')}
              >
                <SaplingIcon height={24} width={24} />
                <AppText variant="content" style={styles.noCropText}>
                  {t('home.crop.tap_to_select')}
                </AppText>
                <Feather name="chevron-right" size={20} color="#186F71" />
              </TouchableOpacity>
            </>
          )}

          {/* Market Prices Section - Show if user has a crop selected */}
          {primaryCrop && (
            <>
              <AppText variant="header" style={styles.sectionTitle}>
                {t('home.sections.market', { defaultValue: 'Market Prices' })}
              </AppText>
              
              {marketLoading ? (
                <View style={styles.marketLoadingContainer}>
                  <ActivityIndicator size="small" color="#186F71" />
                  <AppText variant="content" style={styles.marketLoadingText}>
                    {t('common.loading_markets', { defaultValue: 'Loading nearby markets...' })}
                  </AppText>
                </View>
              ) : marketError ? (
                <View style={styles.marketErrorContainer}>
                  <Ionicons name="alert-circle-outline" size={24} color="#78909C" />
                  <AppText variant="content" style={styles.marketErrorText}>
                    {t('home.market.no_data', { defaultValue: 'Market data unavailable for your crop' })}
                  </AppText>
                </View>
              ) : marketPrices.length > 0 ? (
                <>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.marketCardsContainer}
                  >
                    {marketPrices.map((item, index) => (
                      <MarketPriceCard key={`${item.apmc}-${index}`} item={item} />
                    ))}
                  </ScrollView>
                  <TouchableOpacity 
                    style={styles.viewMoreMarkets}
                    onPress={() => router.push({
                      pathname: '/market',
                      params: { crop: primaryCrop.displayName, state: userState }
                    })}
                  >
                    <Text style={styles.viewMoreMarketsText}>
                      {t('home.market.view_more', { defaultValue: 'View detailed market analysis' })}
                    </Text>
                    <Feather name="arrow-right" size={14} color="#186F71" />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.marketErrorContainer}>
                  <Ionicons name="storefront-outline" size={24} color="#78909C" />
                  <AppText variant="content" style={styles.marketErrorText}>
                    {t('home.market.no_nearby', { defaultValue: 'No nearby market data found' })}
                  </AppText>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Crop History Modal */}
      <CropHistoryModal
        visible={showCropHistoryModal}
        onClose={() => {
          setShowCropHistoryModal(false);
          router.push('/(main)/(tabs)/crop');
        }}
        crops={activeCrops}
        onSelectCrop={(crop) => {
          setShowCropHistoryModal(false);
          // Navigate to crop details or set as primary
          router.push('/(main)/(tabs)/crop');
        }}
      />

      {/* Planting Date Modal */}
      <Modal
        visible={showPlantingDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlantingDateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <AppText variant="header" style={styles.modalTitle}>
              {t('home.crop.select_planting_date')}
            </AppText>
            <AppText variant="content" style={styles.modalSubtitle}>
              {t('home.crop.date_window_note')}
            </AppText>

            {showDatePicker && (
              <DateTimePicker
                value={tempPlantingDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={addDays(new Date(), 7)}
                minimumDate={addDays(new Date(), -7)}
              />
            )}

            {!showDatePicker && (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <AppText variant="content" bold style={styles.dateButtonText}>
                    {format(tempPlantingDate, 'MMM dd, yyyy')}
                  </AppText>
                </TouchableOpacity>

                <AppText variant="content" style={styles.selectedDateInfo}>
                  {format(tempPlantingDate, 'EEEE')} - {daysInfo?.label}
                </AppText>
              </>
            )}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPlantingDateModal(false)}
              >
                <AppText variant="content" bold style={styles.cancelButtonText}>
                  {t('common.cancel')}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmPlantingDate}
              >
                <AppText variant="content" bold style={styles.confirmButtonText}>
                  {t('common.confirm')}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DDF1F9',
  },
  kronaFont: {
    fontFamily: 'KronaOne',
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
    fontFamily: 'OpenSans-Regular',
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
  weatherLoadingContainer: {
    backgroundColor: '#BDDBE8',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  weatherLoadingText: {
    marginTop: 12,
    color: '#186F71',
    fontSize: 14,
  },
  weatherErrorContainer: {
    backgroundColor: '#BDDBE8',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderColor: '#DC3545',
    borderWidth: 1,
  },
  weatherErrorText: {
    marginTop: 12,
    color: '#DC3545',
    fontSize: 12,
    textAlign: 'center',
  },
  weatherCard: {
    width: '108%',
    padding: 16,
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
    fontSize: 12,
    fontFamily: 'OpenSans-Bold',
    marginBottom: 2,
  },
  tempContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  tempText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'KronaOne',
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'OpenSans-Regular',
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#BDDBE8',
    borderRadius: 16,
    borderColor: '#186F71',
    borderWidth: 0.8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 75,
  },
  statValue: {
    fontSize: 11,
    color: '#186F71',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 9,
    color: '#186F71',
    opacity: 0.7,
  },
  cropCard: {
    flexDirection: 'row',
    backgroundColor: '#BDDBE8',
    borderRadius: 15,
    padding: 15,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: '#186F71',
    borderWidth: 0.8,
    elevation: 5,
    shadowColor: '#042f30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cropCardExpanded: {
    backgroundColor: '#BDDBE8',
    borderRadius: 15,
    padding: 15,
    borderColor: '#186F71',
    borderWidth: 0.8,
    elevation: 5,
    shadowColor: '#042f30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cropNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#186F71',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  stageBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'OpenSans-Bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#186F71',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'OpenSans-Bold',
    color: '#186F71',
    minWidth: 35,
  },
  cropStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cropStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cropStatText: {
    fontSize: 12,
    color: '#186F71',
    fontFamily: 'OpenSans-Regular',
  },
  stageTipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(247, 176, 53, 0.15)',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
    gap: 8,
  },
  stageTipText: {
    flex: 1,
    fontSize: 11,
    color: '#5D4037',
    fontFamily: 'OpenSans-Regular',
    lineHeight: 16,
  },
  nextStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  nextStageText: {
    fontSize: 11,
    color: '#78909C',
    fontFamily: 'OpenSans-Italic',
  },
  moreCropsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 4,
  },
  moreCropsText: {
    fontSize: 12,
    color: '#186F71',
    fontFamily: 'OpenSans-Bold',
  },
  noCropCard: {
    flexDirection: 'row',
    backgroundColor: '#BDDBE8',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#186F71',
    borderWidth: 0.8,
    borderStyle: 'dashed',
    gap: 10,
  },
  noCropText: {
    fontSize: 14,
    color: '#186F71',
    fontFamily: 'OpenSans-Regular',
  },
  cropInfoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cropInfoRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cropName: { fontSize: 16, fontFamily: 'OpenSans-Bold', color: '#186F71' },
  cropNameOld: { fontSize: 14, fontFamily: 'OpenSans-Bold', color: '#186F71' },
  cropDays: { fontSize: 12, color: '#186F71' },
  lastUpdatedText: {
    textAlign: 'right',
    fontSize: 10,
    color: '#186F71',
    fontFamily: 'OpenSans-Italic',
    marginTop: 8,
    opacity: 0.6,
    paddingRight: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    color: '#156349',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#78909C',
    marginBottom: 20,
  },
  dateButton: {
    backgroundColor: '#BDDBE8',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderColor: '#186F71',
    borderWidth: 1,
    marginBottom: 12,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#186F71',
  },
  selectedDateInfo: {
    fontSize: 12,
    color: '#78909C',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#BDDBE8',
    borderColor: '#186F71',
    borderWidth: 1,
  },
  cancelButtonText: {
    color: '#186F71',
  },
  confirmButton: {
    backgroundColor: '#186F71',
  },
  confirmButtonText: {
    color: '#fff',
  },
  // Market Section Styles
  marketLoadingContainer: {
    backgroundColor: '#BDDBE8',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  marketLoadingText: {
    color: '#186F71',
    fontSize: 12,
  },
  marketErrorContainer: {
    backgroundColor: '#BDDBE8',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderColor: '#186F71',
    borderWidth: 0.5,
    borderStyle: 'dashed',
  },
  marketErrorText: {
    color: '#78909C',
    fontSize: 12,
    textAlign: 'center',
  },
  marketCardsContainer: {
    paddingRight: 20,
    gap: 12,
  },
  marketCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12,
    width: 160,
    elevation: 3,
    shadowColor: '#042f30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  marketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  marketName: {
    fontSize: 12,
    fontFamily: 'OpenSans-Bold',
    color: '#186F71',
    flex: 1,
    marginRight: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontFamily: 'OpenSans-Bold',
  },
  marketCardBody: {
    marginBottom: 6,
  },
  commodityName: {
    fontSize: 11,
    color: '#78909C',
    fontFamily: 'OpenSans-Regular',
  },
  priceText: {
    fontSize: 16,
    fontFamily: 'OpenSans-Bold',
    color: '#156349',
    marginTop: 2,
  },
  marketDate: {
    fontSize: 9,
    color: '#A0A0A0',
    fontFamily: 'OpenSans-Regular',
  },
  viewMoreMarkets: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 4,
  },
  viewMoreMarketsText: {
    fontSize: 12,
    color: '#186F71',
    fontFamily: 'OpenSans-SemiBold',
  },
  // Crop History Modal Styles
  historyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  historyModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  historyModalTitle: {
    fontSize: 18,
    color: '#156349',
  },
  historyModalList: {
    maxHeight: 300,
  },
  noCropsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  noCropsText: {
    color: '#78909C',
    fontSize: 13,
    textAlign: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemName: {
    fontSize: 14,
    fontFamily: 'OpenSans-Bold',
    color: '#186F71',
  },
  historyItemDate: {
    fontSize: 11,
    color: '#78909C',
    fontFamily: 'OpenSans-Regular',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'OpenSans-Bold',
  },
  addCropButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#186F71',
    borderRadius: 12,
    padding: 14,
    marginTop: 15,
    gap: 8,
  },
  addCropButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'OpenSans-Bold',
  },
});