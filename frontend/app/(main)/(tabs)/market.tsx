import { AppText } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { fetchMarketEvaluation, fetchMarketForecast } from '@/services/marketApi';
import { adaptMarketCard, adaptDualViewChart, validateChartData } from '@/services/marketAdapter';
import { APIError, NetworkError, TimeoutError } from '@/services/types';

const screenWidth = Dimensions.get("window").width - 64;

// Default state (Maharashtra) for market data
const DEFAULT_STATE = "Maharashtra";

export default function Market() {
  const [cropOpen, setCropOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('Rice');
  const { t, i18n } = useTranslation();

  const crops = ['Rice', 'Wheat', 'Maize', 'Cotton'];

  // Market evaluation state
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [marketCard, setMarketCard] = useState<any>(null);

  // Market forecast state
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);

  // Active time range
  const [activeTime, setActiveTime] = useState<'30D' | '60D' | '90D'>('30D');

  // Cached forecast data (to avoid re-fetching when switching time ranges)
  const [cachedForecast, setCachedForecast] = useState<any>(null);

  // Fetch market evaluation when crop changes
  useEffect(() => {
    const fetchEvaluation = async () => {
      setEvaluationLoading(true);
      setEvaluationError(null);
      try {
        console.log(`[Market Screen] Fetching evaluation for crop=${selectedCrop}, state=${DEFAULT_STATE}`);
        const response = await fetchMarketEvaluation(selectedCrop, DEFAULT_STATE);
        const card = adaptMarketCard(response);
        console.log(`[Market Screen] Evaluation success:`, card);
        setMarketCard(card);
      } catch (error) {
        console.error(`[Market Screen] Evaluation error:`, error);
        let errorMsg = "Failed to load market data";
        if (error instanceof APIError) {
          errorMsg = error.statusCode === 404 
            ? "No market data available for this crop"
            : `Error: ${error.message}`;
        } else if (error instanceof TimeoutError) {
          errorMsg = "Market data request timed out";
        } else if (error instanceof NetworkError) {
          errorMsg = "Network error loading market data";
        }
        setEvaluationError(errorMsg);
        setMarketCard(null);
      } finally {
        setEvaluationLoading(false);
      }
    };

    fetchEvaluation();
  }, [selectedCrop]);

  // Fetch market forecast when crop changes
  useEffect(() => {
    const fetchForecast = async () => {
      setForecastLoading(true);
      setForecastError(null);
      try {
        console.log(`[Market Screen] Fetching forecast for crop=${selectedCrop}, state=${DEFAULT_STATE}`);
        const response = await fetchMarketForecast(selectedCrop, DEFAULT_STATE);
        console.log(`[Market Screen] Forecast response:`, response);
        setCachedForecast(response);

        // Adapt for current active time
        const adapted = adaptDualViewChart(response, activeTime === '30D' ? 30 : activeTime === '60D' ? 60 : 90);
        console.log(`[Market Screen] Adapted chart data:`, adapted);
        if (validateChartData(adapted)) {
          setChartData(adapted);
        } else {
          console.error(`[Market Screen] Chart data validation failed`);
          setForecastError("Chart data validation failed");
        }
      } catch (error) {
        console.error(`[Market Screen] Forecast error:`, error);
        let errorMsg = "Failed to load price forecast";
        if (error instanceof APIError) {
          errorMsg = error.statusCode === 404
            ? "Insufficient market history for this crop"
            : `Error: ${error.message}`;
        } else if (error instanceof TimeoutError) {
          errorMsg = "Forecast request timed out";
        } else if (error instanceof NetworkError) {
          errorMsg = "Network error loading forecast";
        }
        setForecastError(errorMsg);
        setChartData(null);
      } finally {
        setForecastLoading(false);
      }
    };

    fetchForecast();
  }, [selectedCrop]);

  // Update chart when active time changes (using cached data)
  useEffect(() => {
    if (cachedForecast) {
      const horizon = activeTime === '30D' ? 30 : activeTime === '60D' ? 60 : 90;
      const adapted = adaptDualViewChart(cachedForecast, horizon);
      if (validateChartData(adapted)) {
        setChartData(adapted);
      }
    }
  }, [activeTime]);

  return (
    <ScrollView style={{ backgroundColor: "#DDF1F9" }}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 80,
      }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled>

      {/* Header */}
      <AppText variant="header" style={styles.title}>{t('market.title')}</AppText>
      <AppText variant="content" style={styles.subtitle}>{t('market.subtitle')}</AppText>

      {/* Filters */}
      <View style={styles.filterRow}>
        <View style={[styles.dropdown, styles.locationBox]}>
          <Feather name="map-pin" size={16} color="#156349" />
          <AppText variant="content" bold style={styles.dropdownText}>{t('locations.default_region')}</AppText>
        </View>
        <View style={styles.cropWrapper}>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setCropOpen(!cropOpen)}
            activeOpacity={0.7}>
            <AppText variant='content' bold style={styles.dropdownText}>{t('crops.'+selectedCrop.toLowerCase())}</AppText>

            <Feather
              name={cropOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#156349"
            />
          </TouchableOpacity>

          {cropOpen && (
            <View style={styles.dropdownMenu}>
              {crops.map(crop => (
                <TouchableOpacity
                  key={crop}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedCrop(crop);
                    setCropOpen(false);
                  }}
                >
                  <AppText style={styles.dropdownItemText}>{t('crops.'+crop.toLowerCase())}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

      </View>

      {/* Current Market */}

      <AppText variant='header' style={ styles.sectionTitle }>{t('market.current_market')}</AppText>

      {evaluationLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#156349" />
          <AppText variant='content' style={styles.loadingText}>{t('common.loading')}</AppText>
        </View>
      )}

      {evaluationError && (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={20} color="#DC3545" />
          <AppText variant='content' style={styles.errorText}>{evaluationError}</AppText>
        </View>
      )}

      {marketCard && !evaluationLoading && (
        <View style={styles.marketCard}>
          {/* Current Price */}
          <AppText variant='content' bold style={styles.currentPriceLabel}>{t('market.current_price')}</AppText>

          <View style={styles.marketRow}>
            <AppText variant='content' bold style={styles.locationTextMarket}>{marketCard.location}</AppText>

            <AppText variant='content' bold style={styles.priceValueText}>
              {marketCard.price} <AppText variant='content' style={styles.perKgText}>{t('market.per_kg')}</AppText>
            </AppText>

            <View style={styles.trendCapsule}>
              <Feather
                name={marketCard.isUp ? 'trending-up' : 'trending-down'}
                size={16}
                color={marketCard.isUp ? '#28A745' : '#DC3545'}
              />
              <AppText
              variant='content' bold
                style={[
                  styles.trendText,
                  { color: marketCard.isUp ? '#28A745' : '#DC3545' },
                ]}
              >
                {marketCard.trend}
              </AppText>
            </View>
          </View>

          <AppText variant='content' style={styles.lastUpdatedText}>
            {t('common.last_updated', { timestamp: new Date().toLocaleTimeString() })}
          </AppText>
        </View>
      )}


      {/* Historical Prices */}
      <AppText variant='header' style={ styles.sectionTitle }>{t('market.historical_prices')}</AppText>

      <View style={styles.chartCard}>
        <AppText style={styles.chartDesc}>
          {t('market.graph_title')}
        </AppText>

        {/* Time Filters */}
        <View style={styles.timeRow}>
          {["30D", "60D", "90D"].map(label => (
            <TouchableOpacity
              key={label}
              onPress={() => setActiveTime(label as '30D' | '60D' | '90D')}
              style={[
                styles.timeBtn,
                activeTime === label && styles.timeBtnActive,
              ]}
            >
              <AppText
              variant='content' bold
                style={[
                  styles.timeBtnText,
                  activeTime === label && styles.timeBtnTextActive,
                ]}
              >
                {label}
              </AppText>
            </TouchableOpacity>
          ))}        
          </View>

        {/* Loading State */}
        {forecastLoading && (
          <View style={styles.chartLoadingContainer}>
            <ActivityIndicator size="large" color="#156349" />
            <AppText variant='content' style={styles.chartLoadingText}>{t('common.loading')}</AppText>
          </View>
        )}

        {/* Error State */}
        {forecastError && (
          <View style={styles.chartErrorContainer}>
            <Feather name="alert-circle" size={20} color="#DC3545" />
            <AppText variant='content' style={styles.chartErrorText}>{forecastError}</AppText>
          </View>
        )}

        {/* Chart */}
        {/* Chart */}
{chartData && !forecastLoading && (() => {
  const anchoredHistorical = [...chartData.historicalPrices];
  const anchoredForecast = [...chartData.forecastPrices];

  // 1. Ensure visual continuity: Historical ends exactly where Forecast begins
  if (anchoredHistorical.length > 0 && anchoredForecast.length > 0) {
    anchoredHistorical[anchoredHistorical.length - 1] = anchoredForecast[0];
  }

  const histLen = anchoredHistorical.length;
  const foreLen = anchoredForecast.length;
  // Total unique points on the X-axis (they share the 'Today' point)
  const totalLen = histLen + foreLen - 1;

  // 2. Build labels based on the shared point
  const labels = Array(totalLen).fill("").map((_, i) => {
    if (i === 0) return `Past ${activeTime}`;
    if (i === histLen - 1) return "Today";
    if (i === totalLen - 1) return `Next ${activeTime}`;
    return "";
  });

  // 3. Create datasets with nulls to prevent "ghost" lines
  // Historical line: Values from 0 to 'Today', then null
  const historicalDataset = Array(totalLen).fill(null);
  anchoredHistorical.forEach((val, i) => {
    historicalDataset[i] = val;
  });

  // Forecast line: null until 'Today', then actual values
  const forecastDataset = Array(totalLen).fill(null);
  anchoredForecast.forEach((val, i) => {
    forecastDataset[i + (histLen - 1)] = val;
  });

  return (
    <View pointerEvents="box-none">
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: historicalDataset,
              color: () => "#156349",
              strokeWidth: 3, // Slightly thicker for better visibility
            },
            {
              data: forecastDataset,
              color: () => "#FF9500",
              strokeWidth: 3,
            },
          ],
        }}
        width={screenWidth}
        height={220}
        yAxisLabel="₹"
        fromZero={false}
        segments={4}
        chartConfig={{
          backgroundColor: "#CFE9F1",
          backgroundGradientFrom: "#CFE9F1",
          backgroundGradientTo: "#CFE9F1",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(21, 99, 73, ${opacity})`,
          labelColor: () => "#156349",
          propsForDots: {
            r: "0", // Keeps dots hidden as per your original design
          },
        }}
        style={styles.chart}
        withDots={false}
        withVerticalLines={false}
      />

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#156349" }]} />
          <AppText variant='content' style={styles.legendLabel}>Past {activeTime}</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#FF9500" }]} />
          <AppText variant='content' style={styles.legendLabel}>Next {activeTime}</AppText>
        </View>
      </View>
    </View>
  );
})()}

        <AppText variant='content' style={styles.lastUpdatedText}>{t('common.last_updated', { timestamp: new Date().toLocaleTimeString() })}</AppText>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#DDF1F9"
  },
  kronaFont: {
    fontFamily: 'KronaOne'
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
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cropWrapper: {
    width: '48%',
    position: 'relative'
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 2,
  },

  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 2,
    elevation: 4,
    zIndex: 1000,
    overflow: 'hidden',
  },

  dropdownItem: {
    padding: 12,
    borderBottomWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  dropdownText: {
    color: '#156349',
    fontSize: 14,
    fontFamily: 'OpenSans-SemiBold',
    flex: 1,
    marginHorizontal: 10,
  },
  dropdownItemText: {
    color: '#156349',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#156349",
    marginVertical: 10,
  },
  card: {
    backgroundColor: "#CFE9F1",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  marketName: {
    fontWeight: "600",
    color: "#156349",
    marginBottom: 6,
  },
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
    marginBottom: 2,
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
  locationBox: {
    width: '48%',
    pointerEvents: 'none',
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(24,111,113,0.2)',
    marginVertical: 12,
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#156349",
  },
  unit: {
    fontSize: 12,
    fontWeight: "400",
  },
  badgePositive: {
    backgroundColor: "#DFF5E1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeNegative: {
    backgroundColor: "#FBE1E1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chartCard: {
    backgroundColor: "#CFE9F1",
    borderRadius: 16,
    borderWidth: 0.8,
    borderColor: "#186F71",
    padding: 12,
    marginBottom: 40,
    overflow: "hidden",
  },
  chartDesc: {
    fontSize: 13,
    color: "#4A6F7C",
    marginBottom: 8,
    fontStyle: 'italic'
  },
  chart: {
    borderRadius: 12,
    marginVertical: 8,
  },
  updated: {
    textAlign: "center",
    fontSize: 11,
    color: "#4A6F7C",
    marginTop: 6,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  timeBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timeBtnActive: {
    backgroundColor: "#186F71",
    borderColor: "#186F71",
  },
  timeBtnText: {
    fontSize: 12,
    color: "#156349",
    fontFamily: 'OpenSans-SemiBold',
  },
  timeBtnTextActive: {
    color: "#FFFFFF",
  },
  // Loading states
  loadingContainer: {
    backgroundColor: '#BDDBE8',
    borderRadius: 20,
    padding: 40,
    borderWidth: 0.8,
    borderColor: '#186F71',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    color: '#186F71',
    fontSize: 12,
  },
  chartLoadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartLoadingText: {
    marginTop: 12,
    color: '#156349',
    fontSize: 12,
  },
  // Error states
  errorContainer: {
    backgroundColor: '#FCE4E4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DC3545',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#DC3545',
    fontSize: 12,
    flex: 1,
  },
  chartErrorContainer: {
    height: 120,
    backgroundColor: '#FCE4E4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC3545',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    flexDirection: 'row',
    gap: 12,
  },
  chartErrorText: {
    color: '#DC3545',
    fontSize: 12,
    flex: 1,
  },
  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    color: '#156349',
    fontFamily: 'OpenSans-Regular',
  },
});
