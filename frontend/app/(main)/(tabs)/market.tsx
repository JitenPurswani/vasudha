import { AppText } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useRoute } from '@react-navigation/native';
import { fetchMarketEvaluation, fetchMarketForecast } from '@/services/marketApi';
import { adaptMarketCard, adaptDualViewChart, validateChartData } from '@/services/marketAdapter';
import { fetchMarketData } from '@/services/marketDataApi';
import { APIError, NetworkError, TimeoutError } from '@/services/types';

const screenWidth = Dimensions.get("window").width - 64;

export default function Market() {
  const route = useRoute<any>();
  const { t } = useTranslation();

  // ===== DROPDOWN DATA (from API) =====
  const [states, setStates] = useState<string[]>([]);
  const [apmcsByState, setApmcsByState] = useState<Record<string, string[]>>({});
  const [commoditiesByApmc, setCommoditiesByApmc] = useState<Record<string, string[]>>({});
  const [dataLoading, setDataLoading] = useState(true);

  // ===== MANUAL SELECTION STATE (dropdowns update these) =====
  const [manualState, setManualState] = useState<string | null>(null);
  const [manualApmc, setManualApmc] = useState<string | null>(null);
  const [manualCrop, setManualCrop] = useState<string | null>(null);

  // ===== ACTIVE STATE (APIs use these - only set on Evaluate or Redirect) =====
  const [activeState, setActiveState] = useState<string | null>(null);
  const [activeApmc, setActiveApmc] = useState<string | null>(null);
  const [activeCrop, setActiveCrop] = useState<string | null>(null);

  // ===== DROPDOWN OPEN/CLOSE =====
  const [stateOpen, setStateOpen] = useState(false);
  const [apmcOpen, setApmcOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  // APMC search term for filtering APMC list in modal
  const [apmcSearch, setApmcSearch] = useState('');

  // ===== REDIRECT MODE FLAG =====
  const [isRedirectMode, setIsRedirectMode] = useState(false);
  const hasProcessedRedirect = useRef(false);

  // ===== EVALUATION STATE =====
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [marketCard, setMarketCard] = useState<any>(null);

  // ===== FORECAST STATE =====
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [cachedForecast, setCachedForecast] = useState<any>(null);

  // ===== TIME RANGE =====
  const [activeTime, setActiveTime] = useState<'30D' | '60D' | '90D'>('30D');

  // ===== ABORT CONTROLLER FOR CANCELLATION =====
  const abortControllerRef = useRef<AbortController | null>(null);

  // ===== INITIALIZE DROPDOWN DATA =====
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        console.log('[Market] Loading dropdown data...');
        setDataLoading(true);
        const response = await fetchMarketData();
        setStates(response.states);
        setApmcsByState(response.apmcs_by_state);
        setCommoditiesByApmc(response.commodities_by_apmc);
        console.log('[Market] Dropdown data loaded:', response.states.length, 'states');
      } catch (error) {
        console.error('[Market] Failed to load dropdown data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadDropdownData();
  }, []);

  // ===== HANDLE REDIRECT MODE (from Recommendation page) =====
  useEffect(() => {
    // Only process redirect once, after dropdown data is loaded
    if (dataLoading || hasProcessedRedirect.current) return;

    const cropFromRoute = route.params?.crop;
    const stateFromRoute = route.params?.state;

    if (cropFromRoute && stateFromRoute) {
      console.log('[Market] REDIRECT MODE - crop:', cropFromRoute, 'state:', stateFromRoute);
      hasProcessedRedirect.current = true;
      setIsRedirectMode(true);

      // Find first APMC for this state (for redirect only)
      const firstApmc = apmcsByState[stateFromRoute]?.[0] || null;

      // Set BOTH manual and active states immediately
      setManualState(stateFromRoute);
      setManualApmc(firstApmc);
      setManualCrop(cropFromRoute);

      setActiveState(stateFromRoute);
      setActiveApmc(firstApmc);
      setActiveCrop(cropFromRoute);

      // Trigger evaluation automatically for redirect
      runEvaluation(cropFromRoute, stateFromRoute);
    }
  }, [dataLoading, route.params?.crop, route.params?.state, apmcsByState]);

  // ===== CORE EVALUATION FUNCTION =====
  const runEvaluation = useCallback(async (crop: string, state: string) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    console.log('[Market] Running evaluation - crop:', crop, 'state:', state);

    setEvaluationLoading(true);
    setForecastLoading(true);
    setEvaluationError(null);
    setForecastError(null);
    setMarketCard(null);
    setChartData(null);

    try {
      // Fetch evaluation and forecast in parallel
      const [evalResponse, forecastResponse] = await Promise.all([
        fetchMarketEvaluation(crop, state),
        fetchMarketForecast(crop, state),
      ]);

      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log('[Market] Request was aborted, ignoring results');
        return;
      }

      // Process evaluation
      const card = adaptMarketCard(evalResponse);
      setMarketCard(card);

      // Process forecast
      setCachedForecast(forecastResponse);
      const adapted = adaptDualViewChart(forecastResponse, 30);
      if (validateChartData(adapted)) {
        setChartData(adapted);
      }

      console.log('[Market] Evaluation complete');
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.log('[Market] Request cancelled');
        return;
      }

      console.error('[Market] Evaluation error:', error);
      let errorMsg = t('errors.failed_to_load_market');
      if (error instanceof APIError) {
        errorMsg = error.statusCode === 404
          ? t('errors.no_market_data_combo')
          : `${t('common.error')}: ${error.message}`;
      } else if (error instanceof TimeoutError) {
        errorMsg = t('errors.timeout_error');
      } else if (error instanceof NetworkError) {
        errorMsg = t('errors.network_error');
      }
      setEvaluationError(errorMsg);
    } finally {
      setEvaluationLoading(false);
      setForecastLoading(false);
    }
  }, []);

  // ===== HANDLE "EVALUATE MARKET" BUTTON CLICK =====
  const handleEvaluateClick = useCallback(() => {
    if (!manualState || !manualApmc || !manualCrop) {
      setEvaluationError(t('errors.select_state_apmc_commodity'));
      return;
    }

    // Copy manual → active
    setActiveState(manualState);
    setActiveApmc(manualApmc);
    setActiveCrop(manualCrop);

    // Run evaluation with manual values
    runEvaluation(manualCrop, manualState);
  }, [manualState, manualApmc, manualCrop, runEvaluation]);

  // ===== UPDATE CHART WHEN TIME RANGE CHANGES =====
  useEffect(() => {
    if (cachedForecast) {
      const horizon = activeTime === '30D' ? 30 : activeTime === '60D' ? 60 : 90;
      const adapted = adaptDualViewChart(cachedForecast, horizon);
      if (validateChartData(adapted)) {
        setChartData(adapted);
      }
    }
  }, [activeTime, cachedForecast]);

  // ===== DROPDOWN SELECTION HANDLERS (with dependency locking) =====
  const handleStateSelect = useCallback((state: string) => {
    console.log('[Market] State selected:', state);
    setManualState(state);
    // Clear dependent selections (NO auto-select)
    setManualApmc(null);
    setManualCrop(null);
    setStateOpen(false);
  }, []);

  const handleApmcSelect = useCallback((apmc: string) => {
    console.log('[Market] APMC selected:', apmc);
    setManualApmc(apmc);
    // Clear dependent selection (NO auto-select)
    setManualCrop(null);
    setApmcOpen(false);
  }, []);

  const handleCropSelect = useCallback((crop: string) => {
    console.log('[Market] Crop selected:', crop);
    setManualCrop(crop);
    setCropOpen(false);
  }, []);

  // Clear APMC search when APMC modal closes
  useEffect(() => {
    if (!apmcOpen) setApmcSearch('');
  }, [apmcOpen]);

  // ===== CLOSE ALL DROPDOWNS =====
  const closeAllDropdowns = useCallback(() => {
    setStateOpen(false);
    setApmcOpen(false);
    setCropOpen(false);
  }, []);

  // ===== COMPUTED VALUES =====
  const availableApmcs = manualState ? (apmcsByState[manualState] || []) : [];
  const availableCrops = manualApmc ? (commoditiesByApmc[manualApmc] || []) : [];
  // Filter APMCs using search term (case-insensitive)
  const filteredApmcs = availableApmcs.filter(a => a.toLowerCase().includes(apmcSearch.trim().toLowerCase()));
  const canEvaluate = manualState && manualApmc && manualCrop && !evaluationLoading && !forecastLoading;
  const isLoading = evaluationLoading || forecastLoading;

  // ===== RENDER =====
  // Check if any dropdown is open
  const anyDropdownOpen = stateOpen || apmcOpen || cropOpen;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <AppText variant="header" style={styles.title}>{t('market.title')}</AppText>
      <AppText variant="content" style={styles.subtitle}>{t('market.subtitle')}</AppText>

      {/* Loading dropdown data */}
      {dataLoading && (
        <View style={styles.dataLoadingContainer}>
          <ActivityIndicator size="small" color="#156349" />
          <AppText variant="content" style={styles.dataLoadingText}>{t('common.loading', { defaultValue: 'Loading market data...' })}</AppText>
        </View>
      )}

      {/* Dropdowns Row */}
      {!dataLoading && (
        <View style={styles.dropdownsContainer}>
          {/* STATE DROPDOWN */}
          <View style={[styles.dropdownWrapper, { zIndex: 3000 }]}>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                setApmcOpen(false);
                setCropOpen(false);
                setStateOpen(!stateOpen);
              }}
              activeOpacity={0.7}
            >
              <AppText variant="content" bold style={styles.dropdownText} numberOfLines={1} testID='select-state'>
                {manualState || t('market.select_state')}
              </AppText>
              <Feather name={stateOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#156349" />
            </TouchableOpacity>

            {stateOpen && states.length > 0 && (
              <Modal
                visible={stateOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setStateOpen(false)}
              testID='state-selector-scroll'>
                <Pressable style={styles.modalOverlay} onPress={() => setStateOpen(false)}>
                  <View style={[styles.modalDropdown, { top: 140, left: 16, right: 16, maxWidth: (Dimensions.get('window').width - 32) / 3 - 4 }]}>
                    <ScrollView
                      style={styles.dropdownMenu}
                      showsVerticalScrollIndicator={true}
                      bounces={false}
                    >
                      {states.map(state => (
                        <TouchableOpacity
                          key={state}
                          style={styles.dropdownItem}
                          onPress={() => handleStateSelect(state)}
                          activeOpacity={0.6}
                        >
                          <AppText style={[
                            styles.dropdownItemText,
                            manualState === state && styles.dropdownItemTextSelected
                          ]}>
                            {state}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </Pressable>
              </Modal>
            )}
          </View>

          {/* APMC DROPDOWN - Disabled until State selected */}
          <View style={[styles.dropdownWrapper, { zIndex: 2000 }]}>
            <TouchableOpacity
              style={[styles.dropdown, !manualState && styles.dropdownDisabled]}
              onPress={() => {
                if (!manualState) return;
                setStateOpen(false);
                setCropOpen(false);
                setApmcOpen(!apmcOpen);
              }}
              activeOpacity={manualState ? 0.7 : 1}
              disabled={!manualState}
            >
              <AppText
                variant="content"
                bold
                style={[styles.dropdownText, !manualState && styles.dropdownTextDisabled]}
                numberOfLines={1}
              >
                {!manualState ? t('market.select_state_first') : (manualApmc || t('market.select_apmc'))}
              </AppText>
              <Feather
                name={apmcOpen ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={manualState ? "#156349" : "#999"}
              />
            </TouchableOpacity>

            {apmcOpen && manualState && availableApmcs.length > 0 && (
              <Modal
                visible={apmcOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setApmcOpen(false)}
              >
                <Pressable style={styles.modalOverlay} onPress={() => setApmcOpen(false)}>
                  <View style={[styles.modalDropdown, { top: 140, left: 16 + (Dimensions.get('window').width - 32) / 3, maxWidth: (Dimensions.get('window').width - 32) / 3 - 4 }]}>
                    <View style={styles.searchWrapper}>
                      <Feather name="search" size={14} color="#156349" style={styles.searchIcon} />
                      <TextInput
                        placeholder={t('market.search_apmc')}
                        value={apmcSearch}
                        onChangeText={setApmcSearch}
                        style={styles.searchInputRefined}
                        placeholderTextColor="#78909C"
                        returnKeyType="search"
                      />
                      {apmcSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setApmcSearch('')}>
                          <Feather name="x-circle" size={14} color="#78909C" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <ScrollView
                      style={styles.dropdownMenu}
                      showsVerticalScrollIndicator={true}
                      keyboardShouldPersistTaps="handled"
                    >
                      {filteredApmcs.length > 0 ? (
                        filteredApmcs.map(apmc => (
                          <TouchableOpacity
                            key={apmc}
                            style={styles.dropdownItem}
                            onPress={() => handleApmcSelect(apmc)}
                          >
                            <AppText style={[
                              styles.dropdownItemText,
                              manualApmc === apmc && styles.dropdownItemTextSelected
                            ]}>
                              {apmc}
                            </AppText>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.noResultsContainer}>
                          <Feather name="search" size={24} color="#BDDBE8" />
                          <AppText style={styles.noResultsText}>
                            {t('market.no_results') || 'No APMC found'}
                          </AppText>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                </Pressable>
              </Modal>
            )}
          </View>

          {/* CROP DROPDOWN - Disabled until APMC selected */}
          <View style={[styles.dropdownWrapper, { zIndex: 1000 }]}>
            <TouchableOpacity
              style={[styles.dropdown, !manualApmc && styles.dropdownDisabled]}
              onPress={() => {
                if (!manualApmc) return;
                setStateOpen(false);
                setApmcOpen(false);
                setCropOpen(!cropOpen);
              }}
              activeOpacity={manualApmc ? 0.7 : 1}
              disabled={!manualApmc}
            >
              <AppText
                variant="content"
                bold
                style={[styles.dropdownText, !manualApmc && styles.dropdownTextDisabled, { fontSize: 11 }]}
                numberOfLines={1}
              >
                {!manualState ? t('market.select_state_first') : (!manualApmc ? t('market.select_apmc_first') : (manualCrop || t('market.select_commodity')))}
              </AppText>
              <Feather
                name={cropOpen ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={manualApmc ? "#156349" : "#999"}
              />
            </TouchableOpacity>

            {cropOpen && manualApmc && availableCrops.length > 0 && (
              <Modal
                visible={cropOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setCropOpen(false)}
              >
                <Pressable style={styles.modalOverlay} onPress={() => setCropOpen(false)}>
                  <View style={[styles.modalDropdown, { top: 140, right: 16, maxWidth: (Dimensions.get('window').width - 32) / 3 - 4 }]}>
                    <ScrollView
                      style={styles.dropdownMenu}
                      showsVerticalScrollIndicator={true}
                      bounces={false}
                    >
                      {availableCrops.map(crop => (
                        <TouchableOpacity
                          key={crop}
                          style={styles.dropdownItem}
                          onPress={() => handleCropSelect(crop)}
                          activeOpacity={0.6}
                        >
                          <AppText style={[
                            styles.dropdownItemText,
                            manualCrop === crop && styles.dropdownItemTextSelected
                          ]}>
                            {crop}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </Pressable>
              </Modal>
            )}
          </View>
        </View>
      )}

      {/* EVALUATE BUTTON */}
      {!dataLoading && (
        <TouchableOpacity
          style={[styles.evaluateButton, !canEvaluate && styles.evaluateButtonDisabled]}
          onPress={handleEvaluateClick}
          disabled={!canEvaluate}
          activeOpacity={canEvaluate ? 0.7 : 1}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <AppText variant="content" bold style={styles.evaluateButtonText}>
              {t('market.evaluate_button', { defaultValue: 'Evaluate Market' })}
            </AppText>
          )}
        </TouchableOpacity>
      )}

      {/* Selection Summary - shows current selection (manual) OR active evaluation */}
      {(manualCrop && manualState && manualApmc) && (
        <View style={styles.selectionSummary}>
          <AppText variant="content" style={styles.selectionText}>
            {activeCrop && activeState ? (
              // Show what's currently being displayed (evaluated)
              <>{t('market.showing')} <AppText bold>{activeCrop}</AppText> {t('market.in')} <AppText bold>{activeState}</AppText>{activeApmc && <AppText> ({activeApmc})</AppText>}</>
            ) : (
              // Show what's selected but not yet evaluated
              <>{t('market.selected')} <AppText bold>{manualCrop}</AppText> {t('market.in')} <AppText bold>{manualState}</AppText> ({manualApmc}) {t('market.tap_evaluate')}</>
            )}
          </AppText>
        </View>
      )}

      {/* ERROR STATE */}
      {evaluationError && (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={18} color="#DC3545" />
          <AppText variant="content" style={styles.errorText}>{evaluationError}</AppText>
        </View>
      )}

      {/* CURRENT MARKET - Only show when we have data */}
      {marketCard && !evaluationLoading && (
        <>
          <AppText variant="header" style={styles.sectionTitle}>{t('market.current_market')}</AppText>
          <View style={styles.marketCard}>
            <AppText variant="content" bold style={styles.currentPriceLabel}>{t('market.current_price')}</AppText>
            <View style={styles.marketRow}>
              <AppText variant="content" bold style={styles.locationTextMarket}>{marketCard.location}</AppText>
              <AppText variant="content" bold style={styles.priceValueText}>
                {marketCard.price} <AppText variant="content" style={styles.perKgText}>{t('market.per_kg')}</AppText>
              </AppText>
              <View style={styles.trendCapsule}>
                <Feather
                  name={marketCard.isUp ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={marketCard.isUp ? '#28A745' : '#DC3545'}
                />
                <AppText
                  variant="content" bold
                  style={[styles.trendText, { color: marketCard.isUp ? '#28A745' : '#DC3545' }]}
                >
                  {marketCard.trend}
                </AppText>
              </View>
            </View>
            <AppText variant="content" style={styles.lastUpdatedText}>
              {t('common.last_updated', { timestamp: new Date().toLocaleTimeString() })}
            </AppText>
          </View>
        </>
      )}

      {/* LOADING STATE FOR EVALUATION */}
      {evaluationLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#156349" />
          <AppText variant="content" style={styles.loadingText}>{t('market.evaluating_status')}</AppText>
        </View>
      )}

      {/* PRICE TREND (formerly Historical Prices) - Only show when we have chart data */}
      {(chartData || forecastLoading) && (
        <>
          <AppText variant="header" style={styles.sectionTitle}>
            {t('market.price_trend', { defaultValue: 'Price Trend' })}
          </AppText>

          <View style={styles.chartCard}>
            <AppText style={styles.chartDesc}>{t('market.graph_title')}</AppText>

            {/* Time Filters */}
            <View style={styles.timeRow}>
              {["30D", "60D", "90D"].map(label => (
                <TouchableOpacity
                  key={label}
                  onPress={() => setActiveTime(label as '30D' | '60D' | '90D')}
                  style={[styles.timeBtn, activeTime === label && styles.timeBtnActive]}
                >
                  <AppText
                    variant="content" bold
                    style={[styles.timeBtnText, activeTime === label && styles.timeBtnTextActive]}
                  >
                    {label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chart Loading */}
            {forecastLoading && (
              <View style={styles.chartLoadingContainer}>
                <ActivityIndicator size="large" color="#156349" />
                <AppText variant="content" style={styles.chartLoadingText}>{t('common.loading')}</AppText>
              </View>
            )}

            {/* Chart Error */}
            {forecastError && (
              <View style={styles.chartErrorContainer}>
                <Feather name="alert-circle" size={18} color="#DC3545" />
                <AppText variant="content" style={styles.chartErrorText}>{forecastError}</AppText>
              </View>
            )}

            {/* Chart - DO NOT TOUCH THIS LOGIC */}
            {chartData && !forecastLoading && (() => {
              const anchoredHistorical = [...chartData.historicalPrices];
              const anchoredForecast = [...chartData.forecastPrices];

              if (anchoredHistorical.length > 0 && anchoredForecast.length > 0) {
                anchoredHistorical[anchoredHistorical.length - 1] = anchoredForecast[0];
              }

              const histLen = anchoredHistorical.length;
              const foreLen = anchoredForecast.length;
              const totalLen = histLen + foreLen - 1;

              const labels = Array(totalLen).fill("").map((_, i) => {
                if (i === 0) return t('market.past_time', { time: activeTime });
                if (i === histLen - 1) return t('common.today');
                if (i === totalLen - 1) return t('market.next_time', { time: activeTime });
                return "";
              });

              const historicalDataset = Array(totalLen).fill(null);
              anchoredHistorical.forEach((val, i) => {
                historicalDataset[i] = val;
              });

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
                          strokeWidth: 3,
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
                      propsForDots: { r: "0" },
                    }}
                    style={styles.chart}
                    withDots={false}
                    withVerticalLines={false}
                  />

                  {/* Legend */}
                  <View style={styles.legend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: "#156349" }]} />
                      <AppText variant="content" style={styles.legendLabel}>{t('market.past_time', { time: activeTime })}</AppText>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: "#FF9500" }]} />
                      <AppText variant="content" style={styles.legendLabel}>{t('market.next_time', { time: activeTime })}</AppText>
                    </View>
                  </View>
                </View>
              );
            })()}

            <AppText variant="content" style={styles.lastUpdatedText}>
              {t('common.last_updated', { timestamp: new Date().toLocaleTimeString() })}
            </AppText>
          </View>
        </>
      )}

      {/* Empty State - No evaluation yet */}
      {!evaluationLoading && !marketCard && !evaluationError && !isRedirectMode && (
        <View style={styles.emptyState}>
          <Feather name="bar-chart-2" size={48} color="#BDDBE8" />
          <AppText variant="content" style={styles.emptyStateText}>
            {t('market.initial_prompt')}
          </AppText>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DDF1F9",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 120,
  },
  title: {
    fontSize: 15,
    color: '#156349',
    marginTop: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'OpenSans-Bold',
    fontStyle: 'italic',
    fontSize: 11,
    color: '#186F71',
    marginBottom: 16,
  },

  // Data Loading
  dataLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  dataLoadingText: {
    color: '#156349',
    fontSize: 13,
  },

  // Dropdowns Container
  dropdownsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  // Dropdown Wrapper
  dropdownWrapper: {
    flex: 1,
    position: 'relative',
  },

  // Dropdown Button
  dropdown: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 42,
  },
  dropdownDisabled: {
    backgroundColor: '#F0F0F0',
    opacity: 0.7,
  },
  dropdownText: {
    color: '#156349',
    fontSize: 11,
    flex: 1,
  },
  dropdownTextDisabled: {
    color: '#999',
  },

  // Dropdown Menu
  dropdownMenuContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dropdownMenu: {
    maxHeight: 240,
  },
  searchInput: {
    backgroundColor: '#F6F6F6',
    fontSize: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E8E8',
  },
  dropdownItemText: {
    fontSize: 12,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#156349',
    fontWeight: '600',
  },

  // Evaluate Button
  evaluateButton: {
    backgroundColor: '#156349',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  evaluateButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  evaluateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },

  // Selection Summary
  selectionSummary: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#156349',
  },
  selectionText: {
    fontSize: 12,
    color: '#333',
  },

  // Section Title
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#156349",
    marginTop: 8,
    marginBottom: 10,
  },

  // Market Card
  marketCard: {
    backgroundColor: '#BDDBE8',
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.8,
    borderColor: '#186F71',
    elevation: 3,
    marginBottom: 16,
  },
  currentPriceLabel: {
    fontSize: 13,
    color: '#186F71',
    marginBottom: 12,
  },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  locationTextMarket: {
    flex: 1.5,
    fontSize: 11,
    color: '#186F71',
  },
  priceValueText: {
    flex: 1.5,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#186F71',
  },
  perKgText: {
    fontSize: 10,
    fontWeight: 'normal',
  },
  trendCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Loading Container
  loadingContainer: {
    backgroundColor: '#BDDBE8',
    borderRadius: 16,
    padding: 32,
    borderWidth: 0.8,
    borderColor: '#186F71',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 10,
    color: '#186F71',
    fontSize: 12,
  },
  errorContainer: {
    backgroundColor: '#FCE4E4',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DC3545',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#DC3545',
    fontSize: 12,
    flex: 1,
  },
  chartCard: {
    backgroundColor: "#CFE9F1",
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: "#186F71",
    padding: 12,
    marginBottom: 24,
    overflow: "hidden",
  },
  chartDesc: {
    fontSize: 12,
    color: "#4A6F7C",
    marginBottom: 8,
    fontStyle: 'italic',
  },
  chart: {
    borderRadius: 10,
    marginVertical: 8,
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
    borderRadius: 8,
    alignItems: 'center',
  },
  timeBtnActive: {
    backgroundColor: "#186F71",
  },
  timeBtnText: {
    fontSize: 11,
    color: "#156349",
  },
  timeBtnTextActive: {
    color: "#FFFFFF",
  },
  chartLoadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartLoadingText: {
    marginTop: 10,
    color: '#156349',
    fontSize: 12,
  },
  chartErrorContainer: {
    height: 100,
    backgroundColor: '#FCE4E4',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  chartErrorText: {
    color: '#DC3545',
    fontSize: 12,
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 10,
    color: '#156349',
  },
  lastUpdatedText: {
    textAlign: 'right',
    fontSize: 9,
    color: '#186F71',
    opacity: 0.6,
    marginTop: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 13,
    color: '#7A9DA8',
    textAlign: 'center',
    lineHeight: 20,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFB',
    margin: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 36,
  },
  searchIcon: {
    marginRight: 6,
    opacity: 0.6,
  },
  searchInputRefined: {
    flex: 1,
    fontSize: 11,
    color: '#156349',
    height: '100%',
    paddingVertical: 0,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noResultsText: {
    fontSize: 10,
    color: '#78909C',
    textAlign: 'center',
  },
  modalDropdown: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 300,
    overflow: 'hidden',
  }
});
