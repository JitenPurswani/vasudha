import { AppText } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  Text,
  Alert as RNAlert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import CropIcon from '../../../assets/images/crop.svg';
import SaplingIcon from '../../../assets/images/sapling.svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchRecommendationsWithSustainability, CropRecommendation, SustainabilityResult } from '@/services/recommendationApi';
import { useCrop } from '@/context/CropContext';

const { width: SCREEN_W } = Dimensions.get('window');

interface CropCardProps {
  item: CropRecommendation;
  isTop?: boolean;
  onSelect?: (cropName: string) => void;
  onSustainabilityPress?: (sustainability: SustainabilityResult) => void;
  userState?: string | null;
}

function CropCard({ item, isTop, onSelect, onSustainabilityPress, userState }: CropCardProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  // Format crop name
  const cropName = item.crop.charAt(0).toUpperCase() + item.crop.slice(1);
  const percent = `${Math.round((item.raw_probability || 0) * 100)}%`;
  const sustainabilityScore = item.sustainability?.sustainability_score ? 
    Math.round(item.sustainability.sustainability_score * 100) : 0;

  // Colors based on score
  const getHeaderColor = (score: number) => {
    if (score >= 0.7) return '#95C0D2';
    if (score >= 0.4) return '#B5D4E0';
    return '#C8DEEA';
  };

  const headerBg = getHeaderColor(item.raw_probability || 0);

  return (
    <TouchableOpacity 
      style={[styles.cardWrap, { backgroundColor: headerBg }]}
      onPress={() => onSelect?.(cropName)}
    >
      {/* Header */}
      <View style={[styles.cardHeader, { backgroundColor: headerBg }]}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.cardTitleRow}>
            <CropIcon width={20} height={20} fill="#186F71" />
            <AppText variant="content" style={styles.cardTitle}>{cropName}</AppText>
          </View>
          {isTop && (
            <View style={styles.cardTagRow}>
              <Ionicons name="trophy-outline" size={14} color="#026365" />
              <AppText variant="content" style={styles.cardTag}>{t('crop.top_recommendation')}</AppText>
            </View>
          )}
        </View>
        <View style={styles.cardHeaderRight}>
          <AppText variant='content' style={styles.cardPercentText}>{percent}</AppText>
          <View style={styles.squircleIcon}>
            <SaplingIcon width={16} height={16} />
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        {/* Sustainability Score */}
        {item.sustainability && (
          <View style={styles.sustainabilityRow}>
            <View style={styles.sustainabilityLeft}>
              <AppText variant="content" bold style={styles.sustainabilityLabel}>
                {t('crop.sustainability_score', { defaultValue: 'Sustainability' })}
              </AppText>
              <View style={styles.scoreContainer}>
                <View style={[styles.scoreBar, { width: `${sustainabilityScore}%` }]} />
              </View>
              <AppText variant="content" style={styles.scoreText}>
                {sustainabilityScore}%
              </AppText>
            </View>
            <TouchableOpacity 
              style={styles.infoButton}
              onPress={() => onSustainabilityPress?.(item.sustainability!)}
            >
              <Ionicons name="information-circle-outline" size={24} color="#186F71" />
            </TouchableOpacity>
          </View>
        )}

        {/* XAI Explanations */}
        <View style={styles.xaiSection}>
          <AppText variant='content' style={styles.xaiTitle}>{t('crop.why_this_crop')}</AppText>
          
          {/* Display XAI feature explanations if available */}
          {item.xai_explanations && item.xai_explanations.length > 0 ? (
            <>
              {item.xai_explanations.slice(0, 3).map((exp, idx) => (
                <AppText key={idx} variant="content" style={styles.xaiText}>
                  • {exp.reason}
                </AppText>
              ))}
            </>
          ) : (
            <>
              {/* Fallback: Show scores if XAI explanations not available */}
              <AppText variant="content" style={styles.xaiText}>
                • Agronomic match: {Math.min(100, Math.max(0, Math.round((item.agronomic_score || 0) * 100)))}%
              </AppText>
              {item.market_score !== null && (
                <AppText variant="content" style={styles.xaiText}>
                  • Market viability: {Math.min(100, Math.max(0, Math.round((item.market_score || 0) * 100)))}%
                </AppText>
              )}
              <AppText variant="content" style={styles.xaiText}>
                • Overall fit: {Math.min(100, Math.max(0, Math.round(((item.final_score || 0) + 1) * 50)))}%
              </AppText>
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity 
            style={styles.marketButton}
            onPress={() => {
              // Always pass state - use userState if available, otherwise pass Maharashtra as default
              const stateToPass = userState || 'Maharashtra';
              console.log(`[Crop Screen] Navigating to market: crop=${item.crop}, state=${stateToPass}`);
              router.push({
                pathname: '/market',
                params: { 
                  crop: item.crop,
                  state: stateToPass,
                  selected: 'true'
                }
              });
            }}
          >
            <Ionicons name="storefront-outline" size={16} color="#FFFFFF" />
            <AppText variant="content" bold style={styles.marketButtonText}>
              {t('crop.market', { defaultValue: 'Market' })}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => onSelect?.(cropName)}
          >
            <AppText variant="content" bold style={styles.selectButtonText}>
              {t('crop.select', { defaultValue: 'Select' })}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Crop() {
  const [mode, setMode] = useState<'seasonal' | 'all_season'>('seasonal');
  const [crops, setCrops] = useState<CropRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);
  
  const [selectedSustainability, setSelectedSustainability] = useState<SustainabilityResult | null>(null);
  const [showSustainabilityModal, setShowSustainabilityModal] = useState(false);
  const [userState, setUserState] = useState<string | null>(null);

  const { t, i18n } = useTranslation();
  const { setSelectedCrop } = useCrop();

  // Get current season
  const getCurrentSeason = useCallback((): "kharif" | "rabi" | "zaid" => {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 10) return "kharif";
    if (month >= 11 || month <= 3) return "rabi";
    return "zaid";
  }, []);

  // Load recommendations
  useEffect(() => {
    let isMounted = true;

    const loadRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get location from AsyncStorage (stored during onboarding)
        const lat = await AsyncStorage.getItem('userLatitude');
        const lon = await AsyncStorage.getItem('userLongitude');
        
        // Try to get user state from AsyncStorage
        const locationStr = await AsyncStorage.getItem('userLocation');
        if (locationStr) {
          try {
            const location = JSON.parse(locationStr);
            setUserState(location.state || null);
          } catch (e) {
            console.error('[Crop Screen] Failed to parse location:', e);
          }
        }

        if (!lat || !lon) {
          console.log('[Crop Screen] No location data found');
          if (isMounted) {
            setError('Location not set. Please complete onboarding first.');
          }
          return;
        }

        const season = getCurrentSeason();
        console.log(`[Crop Screen] Loading crops for lat=${lat}, lon=${lon}, season=${season}, mode=${mode}`);

        const response = await fetchRecommendationsWithSustainability(
          parseFloat(lat),
          parseFloat(lon),
          season,
          mode
        );

        if (!isMounted) return;

        setCrops(response.recommendations.predictions || []);
        setError(null);
        console.log(`[Crop Screen] Success: ${response.recommendations.predictions.length} crops loaded`);
      } catch (err: any) {
        if (!isMounted) return;

        console.error('[Crop Screen] Error:', err);
        let errorMessage = 'Unable to load recommendations. Please try again.';

        if (err.message?.includes('Network')) {
          errorMessage = 'Network error: Unable to connect to backend. Check your connection and IP address.';
        } else if (err.message?.includes('timeout')) {
          errorMessage = 'Request timed out. Backend may be slow. Please try again.';
        } else if (err.message?.includes('Location not set')) {
          errorMessage = 'Location not set. Please complete onboarding first.';
        }

        setError(errorMessage);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRecommendations();
    return () => { isMounted = false; };
  }, [mode, retryKey, getCurrentSeason]);

  // Handle crop selection
  const handleSelectCrop = useCallback((cropName: string) => {
    setSelectedCrop(cropName);
    RNAlert.alert(
      'Crop Selected',
      `${cropName} selected! You can now set your planting date on the Home screen.`,
      [{ text: 'OK' }]
    );
  }, [setSelectedCrop]);

  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" backgroundColor="#DDF1F9" />
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant='header' style={styles.title}>{t('crop.title')}</AppText>
        <AppText variant='content' style={styles.subtitle}>{t('crop.subtitle')}</AppText>

        {/* Mode Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'seasonal' && styles.toggleBtnActive]}
            onPress={() => setMode('seasonal')}
            disabled={loading}
          >
            <AppText variant='content' bold style={[styles.toggleText, mode === 'seasonal' && styles.toggleTextActive]}>
              {t('crop.seasonal')}
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtnSecondary, mode === 'all_season' && styles.toggleBtnActiveSecondary]}
            onPress={() => setMode('all_season')}
            disabled={loading}
          >
            <AppText variant='content' bold style={[styles.toggleTextSecondary, mode === 'all_season' && styles.toggleTextActive]}>
              {t('crop.all_season')}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#186F71" />
            <AppText variant='content' style={styles.loadingText}>
              Loading recommendations...
            </AppText>
          </View>
        )}

        {/* Error */}
        {!loading && error && (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#DC3545" />
            <AppText variant='content' style={styles.errorText}>{error}</AppText>
            <TouchableOpacity style={styles.retryButton} onPress={() => setRetryKey(prev => prev + 1)}>
              <AppText variant='content' bold style={styles.retryButtonText}>
                Retry
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty */}
        {!loading && !error && crops.length === 0 && (
          <View style={styles.centerContainer}>
            <Ionicons name="leaf-outline" size={48} color="#186F71" />
            <AppText variant='content' style={styles.emptyText}>
              No recommendations available
            </AppText>
          </View>
        )}

        {/* Crop Cards */}
        {!loading && !error && crops.length > 0 && crops.map((crop, idx) => (
          <CropCard 
            key={crop.crop} 
            item={crop} 
            isTop={idx === 0}
            userState={userState}
            onSelect={handleSelectCrop}
            onSustainabilityPress={(sust) => {
              setSelectedSustainability(sust);
              setShowSustainabilityModal(true);
            }}
          />
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sustainability Modal */}
      <Modal
        visible={showSustainabilityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSustainabilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="header" style={styles.modalTitle}>
                Sustainability Details
              </AppText>
              <TouchableOpacity onPress={() => setShowSustainabilityModal(false)}>
                <Ionicons name="close" size={28} color="#186F71" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
              {/* Score Display */}
              <View style={styles.scoreSection}>
                <AppText variant="content" bold style={styles.sectionTitle}>
                  Sustainability Score
                </AppText>
                <View style={styles.scoreDisplayRow}>
                  <AppText variant="content" style={styles.scorePercentage}>
                    {Math.round((selectedSustainability?.sustainability_score || 0) * 100)}%
                  </AppText>
                  <View style={styles.scoreBarLarge}>
                    <View 
                      style={[
                        styles.scoreBarFill,
                        { 
                          width: `${Math.round((selectedSustainability?.sustainability_score || 0) * 100)}%`,
                          backgroundColor: '#52C41A'
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>

              {/* Summary */}
              {selectedSustainability?.explanation && (
                <>
                  <AppText variant="content" bold style={[styles.sectionTitle, { marginTop: 20 }]}>
                    Summary
                  </AppText>
                  <AppText variant="content" style={styles.summaryText}>
                    {selectedSustainability.explanation.summary}
                  </AppText>
                </>
              )}

              {/* Details */}
              {selectedSustainability?.explanation?.details && selectedSustainability.explanation.details.length > 0 && (
                <>
                  <AppText variant="content" bold style={[styles.sectionTitle, { marginTop: 20 }]}>
                    Key Points
                  </AppText>
                  {selectedSustainability.explanation.details.map((detail, idx) => (
                    <AppText key={idx} variant="content" style={styles.detailText}>
                      • {detail}
                    </AppText>
                  ))}
                </>
              )}

              {/* Impact Factors */}
              {selectedSustainability?.dimensions && (
                <>
                  <AppText variant="content" bold style={[styles.sectionTitle, { marginTop: 20 }]}>
                    Impact Factors
                  </AppText>
                  
                  <View style={styles.dimensionCard}>
                    <View style={styles.dimensionHeader}>
                      <Ionicons name="water" size={20} color="#2196F3" />
                      <AppText variant="content" bold style={styles.dimensionTitle}>
                        Water Intensity
                      </AppText>
                    </View>
                    <AppText variant="content" style={styles.dimensionCategory}>
                      Category: {selectedSustainability.dimensions.water_intensity.category}
                    </AppText>
                    <AppText variant="content" style={styles.dimensionText}>
                      {selectedSustainability.dimensions.water_intensity.impact}
                    </AppText>
                  </View>

                  <View style={styles.dimensionCard}>
                    <View style={styles.dimensionHeader}>
                      <Ionicons name="leaf" size={20} color="#4CAF50" />
                      <AppText variant="content" bold style={styles.dimensionTitle}>
                        Soil Impact
                      </AppText>
                    </View>
                    <AppText variant="content" style={styles.dimensionCategory}>
                      Category: {selectedSustainability.dimensions.soil_impact.category}
                    </AppText>
                    <AppText variant="content" style={styles.dimensionText}>
                      {selectedSustainability.dimensions.soil_impact.impact}
                    </AppText>
                  </View>

                  <View style={styles.dimensionCard}>
                    <View style={styles.dimensionHeader}>
                      <Ionicons name="flash" size={20} color="#FF9800" />
                      <AppText variant="content" bold style={styles.dimensionTitle}>
                        Cultivation Intensity
                      </AppText>
                    </View>
                    <AppText variant="content" style={styles.dimensionCategory}>
                      Category: {selectedSustainability.dimensions.cultivation_intensity.category}
                    </AppText>
                    <AppText variant="content" style={styles.dimensionText}>
                      {selectedSustainability.dimensions.cultivation_intensity.impact}
                    </AppText>
                  </View>
                </>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowSustainabilityModal(false)}
            >
              <AppText variant="content" bold style={styles.modalCloseText}>
                Close
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  sustainabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BDDBE8',
  },
  sustainabilityLeft: {
    flex: 1,
  },
  sustainabilityLabel: {
    fontSize: 11,
    color: '#186F71',
    marginBottom: 6,
  },
  scoreContainer: {
    height: 6,
    backgroundColor: '#BDDBE8',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  scoreBar: {
    height: '100%',
    backgroundColor: '#52C41A',
    borderRadius: 3,
  },
  scoreText: {
    fontSize: 10,
    color: '#156349',
    fontWeight: '600',
  },
  infoButton: {
    padding: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  marketButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  marketButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  selectButton: {
    flex: 1,
    backgroundColor: '#186F71',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  xaiSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BDDBE8',
  },
  xaiTitle: {
    fontFamily: 'OpenSans',
    fontWeight: '700',
    fontSize: 11,
    color: '#186F71',
    marginBottom: 6,
  },
  xaiText: {
    fontFamily: 'OpenSans',
    fontStyle: 'italic',
    fontSize: 11,
    color: '#186F71',
    marginBottom: 4,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#186F71',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 14,
    color: '#DC3545',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#186F71',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#186F71',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#186F71',
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 20,
  },
  
  // Sustainability Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    color: '#186F71',
    fontWeight: 'bold',
    flex: 1,
  },
  modalBody: {
    flex: 1,
    paddingVertical: 8,
  },
  scoreSection: {
    marginBottom: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#186F71',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  scoreDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scorePercentage: {
    fontSize: 36,
    color: '#52C41A',
    fontWeight: 'bold',
    minWidth: 80,
  },
  scoreBarLarge: {
    flex: 1,
    height: 32,
    backgroundColor: '#E0E0E0',
    borderRadius: 16,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#156349',
    lineHeight: 22,
    marginBottom: 16,
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#52C41A',
  },
  detailText: {
    fontSize: 13,
    color: '#186F71',
    marginBottom: 10,
    lineHeight: 20,
    paddingLeft: 4,
  },
  dimensionCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  dimensionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  dimensionTitle: {
    fontSize: 14,
    color: '#186F71',
    flex: 1,
  },
  dimensionCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  dimensionText: {
    fontSize: 13,
    color: '#156349',
    lineHeight: 20,
  },
  modalCloseButton: {
    backgroundColor: '#186F71',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});