import { AppText } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import CropIcon from '../../../assets/images/crop.svg';
import SaplingIcon from '../../../assets/images/sapling.svg';
import { fetchRecommendations } from '@/services/api';
import { adaptBackendResponse } from '@/services/adapter';
import { CropCard as CropCardType, APIError, NetworkError, TimeoutError } from '@/services/types';

const { width: SCREEN_W } = Dimensions.get('window');

function CropCard({ item, isTop }: { item: CropCardType; isTop?: boolean }) {
  
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
  const [crops, setCrops] = useState<CropCardType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0); // Force re-fetch on retry

  const { t, i18n } = useTranslation();

  // Determine current season (default to 'kharif' - can be enhanced later)
  const getCurrentSeason = (): "kharif" | "rabi" | "zaid" => {
    const month = new Date().getMonth() + 1; // 1-12
    // Rough season mapping: kharif (Jun-Oct), rabi (Nov-Mar), zaid (Apr-May)
    if (month >= 6 && month <= 10) return "kharif";
    if (month >= 11 || month <= 3) return "rabi";
    return "zaid";
  };

  // Fetch on mount, when mode changes, or when retry is triggered
  useEffect(() => {
    let isMounted = true;

    const loadRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        const season = getCurrentSeason();
        
        // Temporary fallback coordinates - Replace with actual location service
        // Default to a central Indian location (India Gate, Delhi) for demo
        // TODO: Integrate with expo-location service for real coordinates
        const defaultLat = 28.6129;
        const defaultLon = 77.2295;

        const response = await fetchRecommendations({
          lat: defaultLat,
          lon: defaultLon,
          season,
          mode,
        });

        // Only update state if component is still mounted
        if (!isMounted) return;

        const adapted = adaptBackendResponse(response);
        setCrops(adapted.crops);
        setError(null);
      } catch (err) {
        // Only update state if component is still mounted
        if (!isMounted) return;

        // Log error for debugging
        console.error("[Crop Screen] API Error:", err);
        console.error("[Crop Screen] Error type:", typeof err);
        console.error("[Crop Screen] Error name:", (err as any)?.name);
        console.error("[Crop Screen] Error message:", err instanceof Error ? err.message : String(err));

        // Handle different error types
        // Check error name first (more reliable in React Native)
        let errorMessage = "Unable to load recommendations. Please try again.";
        
        if (err && typeof err === 'object') {
          const errorName = (err as any).name;
          const errorMsg = err instanceof Error ? err.message : String(err);

          if (errorName === "APIError" || errorMsg.includes("API request failed") || errorMsg.includes("Invalid response")) {
            errorMessage = errorMsg || "Failed to fetch recommendations. Please try again.";
          } else if (errorName === "NetworkError" || errorMsg.includes("Network error") || errorMsg.includes("fetch") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("Failed to connect")) {
            errorMessage = "Network error: Unable to connect to backend server.\n\nMake sure:\n1. Backend is running on port 8000\n2. Check API_URL in .env file matches your machine's IP\n3. Both devices are on same network";
          } else if (errorName === "TimeoutError" || errorMsg.includes("timed out") || errorMsg.includes("timeout")) {
            errorMessage = "Request timed out. Backend may be slow or unreachable. Please try again.";
          } else if (errorName === "AbortError") {
            // Request was cancelled, ignore
            return;
          } else {
            // Generic error - show user-friendly message with hint
            errorMessage = "Unable to load recommendations. Please check your connection and try again.";
          }
        }
        
        setError(errorMessage);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRecommendations();

    // Cleanup: prevent state updates if component unmounts or mode changes
    return () => {
      isMounted = false;
    };
  }, [mode, retryKey]);

  const handleRetry = () => {
    setRetryKey(prev => prev + 1); // Trigger useEffect to re-run
  };

  const handleModeChange = (newMode: 'seasonal' | 'all') => {
    setMode(newMode);
    // loadRecommendations will be called by useEffect
  };

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
            onPress={() => handleModeChange('seasonal')}
            disabled={loading}
          >
            <AppText variant='content' bold style={[styles.toggleText, mode === 'seasonal' && styles.toggleTextActive]}>{t('crop.seasonal')}</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtnSecondary, mode === 'all' && styles.toggleBtnActiveSecondary]}
            onPress={() => handleModeChange('all')}
            disabled={loading}
          >
            <AppText variant='content' bold style={[styles.toggleTextSecondary, mode === 'all' && styles.toggleTextActive]}>{t('crop.all_season')}</AppText>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#186F71" />
            <AppText variant='content' style={styles.loadingText}>
              Loading recommendations...
            </AppText>
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#DC3545" />
            <AppText variant='content' style={styles.errorText}>{error}</AppText>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <AppText variant='content' bold style={styles.retryButtonText}>
                Retry
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && crops.length === 0 && (
          <View style={styles.centerContainer}>
            <Ionicons name="leaf-outline" size={48} color="#186F71" />
            <AppText variant='content' style={styles.emptyText}>
              No recommendations available for your location.
            </AppText>
            <AppText variant='content' style={styles.emptySubtext}>
              Try selecting a different season or mode.
            </AppText>
          </View>
        )}

        {/* Crop Cards */}
        {!loading && !error && crops.length > 0 && crops.map((crop, idx) => (
          <CropCard key={crop.id} item={crop} isTop={idx === 0} />
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
});