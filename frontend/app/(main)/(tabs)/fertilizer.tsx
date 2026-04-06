import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StatusBar,
  Image,
  Modal,
  Linking,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { useActiveCrops } from '@/context/ActiveCropsContext';
import { getSoilParams } from '@/services/soilApi';
import {
  fetchFertilizerRecommendation,
  FertilizerRequest,
  FertilizerResponseData,
  FertilizerRecommendation,
  ToolInfo,
  ApplicationMethod,
} from '@/services/fertilizerApi';
import {
  translateFertilizerName,
  translateReleaseSpeed,
  translateBenefit,
  translateNote,
  translateMethodName,
  translateMethodDescription,
  translateMethodWhenToUse,
  translateToolName,
  translateRainfallReason,
  translateTimingAdvice,
  translateRainfallClassification,
  translateSummary,
  getFromPrefix,
} from '@/services/fertilizerI18n';

// ─── Tool image map (static requires) ─────────────────────────
const TOOL_IMAGES: Record<string, any> = {
  garden_hoe: require('@/assets/images/fertlizer_tools/garden_hoe.png'),
  cultivator: require('@/assets/images/fertlizer_tools/cultivator.png'),
  seed_drill_fertilizer: require('@/assets/images/fertlizer_tools/seed_driller.png'),
  hand_spreader: require('@/assets/images/fertlizer_tools/hand_spreader.png'),
  fertilizer_basket: require('@/assets/images/fertlizer_tools/fertlizer_basket.png'),
  wheelbarrow: require('@/assets/images/fertlizer_tools/wheelbarrow.png'),
  hand_duster: require('@/assets/images/fertlizer_tools/hand_duster.png'),
  khurpi: require('@/assets/images/fertlizer_tools/khurpi.png'),
  fertilizer_ring_applicator: require('@/assets/images/fertlizer_tools/ring_applicator.png'),
  spade: require('@/assets/images/fertlizer_tools/spade.png'),
  rotavator: require('@/assets/images/fertlizer_tools/rotavator.png'),
  plough: require('@/assets/images/fertlizer_tools/plough.png'),
  knapsack_sprayer: require('@/assets/images/fertlizer_tools/knapsack_sprayer.png'),
  battery_sprayer: require('@/assets/images/fertlizer_tools/battery_operated_sprayer.png'),
  measuring_cup: require('@/assets/images/fertlizer_tools/measuring_cup.png'),
  venturi_injector: require('@/assets/images/fertlizer_tools/venturi_injector.png'),
  fertilizer_tank: require('@/assets/images/fertlizer_tools/fertilizer_mixing_tank.png'),
  dosing_pump: require('@/assets/images/fertlizer_tools/dosing_pimp.png'),
};

const FALLBACK_IMAGE = require('@/assets/images/fertilizer.png');

function getToolImage(toolId: string) {
  return TOOL_IMAGES[toolId] || FALLBACK_IMAGE;
}

// ─── Severity color helpers ────────────────────────────────────
function severityColor(sev: string): string {
  switch (sev) {
    case 'high': return '#D32F2F';
    case 'moderate': return '#F57C00';
    case 'low': return '#388E3C';
    default: return '#757575';
  }
}

function severityBg(sev: string): string {
  switch (sev) {
    case 'high': return '#FFEBEE';
    case 'moderate': return '#FFF3E0';
    case 'low': return '#E8F5E9';
    default: return '#F5F5F5';
  }
}

// ─── Season detection ──────────────────────────────────────────
function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 10) return 'kharif';
  if (month >= 11 || month <= 3) return 'rabi';
  return 'zaid';
}

// ═══════════════════════════════════════════════════════════════
// FLIP CARD COMPONENT
// ═══════════════════════════════════════════════════════════════
interface FlipCardProps {
  tool: ToolInfo;
  method: ApplicationMethod;
  onClose: () => void;
}

function FlipCard({ tool, method, onClose }: FlipCardProps) {
  const { t } = useTranslation();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [flipSide, setFlipSide] = React.useState<'purchase' | 'usage' | null>(null);

  const flipToFront = useCallback(() => {
    Animated.spring(flipAnim, {
      toValue: 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(false);
    setFlipSide(null);
  }, [flipAnim]);

  const flipToBack = useCallback((side: 'purchase' | 'usage') => {
    setFlipSide(side);
    setIsFlipped(true);
    Animated.spring(flipAnim, {
      toValue: 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [flipAnim]);

  // Front: visible 0→89°, hidden at 90°+
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 90, 180],
    outputRange: ['0deg', '90deg', '90deg'],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 89, 90],
    outputRange: [1, 1, 0],
  });

  // Back: hidden until 90°, then 90→0°
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 90, 180],
    outputRange: ['90deg', '90deg', '0deg'],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <View style={styles.flipContainer}>
      {/* ── FRONT FACE ── */}
      <Animated.View
        style={[
          styles.flipCard,
          styles.flipCardFront,
          {
            transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }],
            opacity: frontOpacity,
          },
        ]}
        pointerEvents={isFlipped ? 'none' : 'auto'}
      >
        <AppText variant="header" style={styles.modalTitle}>
          {t('fertilizer.have_tool')}
        </AppText>

        <View style={styles.toolImageBox}>
          <Image
            source={getToolImage(tool.id)}
            style={styles.modalToolImage}
            resizeMode="contain"
          />
        </View>

        <AppText style={styles.toolNameText}>{translateToolName(tool.id, tool.name)}</AppText>

        <View style={styles.modalButtonsRow}>
          <TouchableOpacity
            style={styles.modalNoButton}
            onPress={() => flipToBack('purchase')}
          >
            <AppText style={styles.modalNoText}>{t('fertilizer.no')}</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalYesButton}
            onPress={() => flipToBack('usage')}
          >
            <AppText style={styles.modalYesText}>{t('fertilizer.yes')}</AppText>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── BACK FACE ── */}
      <Animated.View
        style={[
          styles.flipCard,
          styles.flipCardBack,
          {
            transform: [{ perspective: 1000 }, { rotateY: backInterpolate }],
            opacity: backOpacity,
          },
        ]}
        pointerEvents={isFlipped ? 'auto' : 'none'}
      >
        {flipSide === 'purchase' ? (
          /* ── PURCHASE LINKS (No) ── */
          <>
            <AppText variant="header" style={styles.modalTitle}>
              {t('fertilizer.purchase_options')}
            </AppText>

            <View style={styles.toolImageBox}>
              <Image
                source={getToolImage(tool.id)}
                style={styles.modalToolImage}
                resizeMode="contain"
              />
            </View>

            <AppText style={styles.toolNameText}>{translateToolName(tool.id, tool.name)}</AppText>

            <View style={styles.purchaseLinksColumn}>
              {tool.purchase_links?.amazon_in ? (
                <TouchableOpacity
                  style={styles.purchaseLink}
                  onPress={() => Linking.openURL(tool.purchase_links.amazon_in)}
                >
                  <Ionicons name="cart-outline" size={16} color="#186F71" />
                  <AppText style={styles.purchaseLinkText}>Amazon</AppText>
                  <Ionicons name="open-outline" size={14} color="#186F71" />
                </TouchableOpacity>
              ) : null}
              {tool.purchase_links?.flipkart ? (
                <TouchableOpacity
                  style={styles.purchaseLink}
                  onPress={() => Linking.openURL(tool.purchase_links.flipkart)}
                >
                  <Ionicons name="cart-outline" size={16} color="#186F71" />
                  <AppText style={styles.purchaseLinkText}>Flipkart</AppText>
                  <Ionicons name="open-outline" size={14} color="#186F71" />
                </TouchableOpacity>
              ) : null}
              {tool.purchase_links?.indiamart ? (
                <TouchableOpacity
                  style={styles.purchaseLink}
                  onPress={() => Linking.openURL(tool.purchase_links.indiamart)}
                >
                  <Ionicons name="cart-outline" size={16} color="#186F71" />
                  <AppText style={styles.purchaseLinkText}>IndiaMart</AppText>
                  <Ionicons name="open-outline" size={14} color="#186F71" />
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        ) : (
          /* ── USAGE GUIDE (Yes) ── */
          <>
            <AppText variant="header" style={styles.modalTitle}>
              {t('fertilizer.how_to_use')}
            </AppText>

            <View style={styles.toolImageBox}>
              <Image
                source={getToolImage(tool.id)}
                style={styles.modalToolImage}
                resizeMode="contain"
              />
            </View>

            <AppText style={styles.toolNameText}>{translateToolName(tool.id, tool.name)}</AppText>

            <AppText style={styles.methodDescription} numberOfLines={2}>
              {translateMethodWhenToUse(method.method_id)}
            </AppText>

            <TouchableOpacity
              style={styles.videoButton}
              onPress={() => {
                if (tool.video_url) Linking.openURL(tool.video_url);
              }}
            >
              <Ionicons name="play-circle" size={22} color="#fff" />
              <AppText style={styles.videoButtonText}>{t('fertilizer.watch_tutorial')}</AppText>
            </TouchableOpacity>
          </>
        )}

        {/* BACK button to flip back */}
        <TouchableOpacity style={styles.flipBackButton} onPress={flipToFront}>
          <Ionicons name="arrow-back" size={16} color="#186F71" />
          <AppText style={styles.flipBackText}>{t('fertilizer.back')}</AppText>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════
export default function Fertilizer() {
  const { t } = useTranslation();
  const { primaryCrop, getCropGrowthState } = useActiveCrops();

  // State
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [responseData, setResponseData] = React.useState<FertilizerResponseData | null>(null);

  // Info modal state
  const [showInfoModal, setShowInfoModal] = React.useState(false);
  const [selectedRec, setSelectedRec] = React.useState<FertilizerRecommendation | null>(null);

  // Tool modal state
  const [showToolModal, setShowToolModal] = React.useState(false);
  const [selectedTool, setSelectedTool] = React.useState<ToolInfo | null>(null);
  const [selectedMethod, setSelectedMethod] = React.useState<ApplicationMethod | null>(null);

  // ─── Fetch recommendation ──────────────────────────────────
  const fetchRecommendation = useCallback(async () => {
    const crop = primaryCrop;
    if (!crop) {
      setError(t('fertilizer.no_active_crop'));
      return;
    }

    setLoading(true);
    setError(null);
    setResponseData(null);

    try {
      // Growth state for daysSincePlanting
      const growthState = getCropGrowthState(crop);
      const cropAgeDays = growthState.daysSincePlanting;

      // Fetch soil data
      const district = crop.location?.district || '';
      const state = crop.location?.state || '';
      let soilN = 40, soilP = 20, soilK = 35, soilPH = 6.5;

      if (district && state) {
        try {
          const soilParams = await getSoilParams(district, state);
          soilN = parseFloat(soilParams.N) || 40;
          soilP = parseFloat(soilParams.P) || 20;
          soilK = parseFloat(soilParams.K) || 35;
          soilPH = parseFloat(soilParams.pH) || 6.5;
        } catch (soilErr: any) {
          console.warn('[Fertilizer] Soil API fallback:', soilErr.message);
        }
      }

      const request: FertilizerRequest = {
        crop: crop.cropKey,
        lat: crop.latitude,
        lon: crop.longitude,
        crop_age_days: cropAgeDays,
        current_n: soilN,
        current_p: soilP,
        current_k: soilK,
        current_ph: soilPH,
        season: getCurrentSeason(),
      };

      const response = await fetchFertilizerRecommendation(request);

      if (response.status === 'success' && response.data) {
        setResponseData(response.data);
      } else {
        setError(response.error || t('errors.failed_get_recommendations'));
      }
    } catch (err: any) {
      console.error('[Fertilizer] Error:', err);
      setError(err.message || t('fertilizer.something_went_wrong'));
    } finally {
      setLoading(false);
    }
  }, [primaryCrop, getCropGrowthState]);

  // Collect all recommendations
  const allRecommendations: FertilizerRecommendation[] = React.useMemo(() => {
    if (!responseData) return [];
    return [
      ...(responseData.recommendations.organic || []),
      ...(responseData.recommendations.chemical_supplements || []),
      ...(responseData.recommendations.ph_amendments || []),
    ];
  }, [responseData]);

  // Tool modal helpers
  const openToolModal = useCallback((tool: ToolInfo, method: ApplicationMethod) => {
    setSelectedTool(tool);
    setSelectedMethod(method);
    setShowToolModal(true);
  }, []);

  const closeToolModal = useCallback(() => {
    setShowToolModal(false);
    setSelectedTool(null);
    setSelectedMethod(null);
  }, []);

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Title */}
        <AppText variant="header" style={styles.title}>
          {t('fertilizer.title')}
        </AppText>
        <AppText style={styles.subtitle}>
          {t('fertilizer.subtitle')}
        </AppText>

        {/* Active crop info */}
        {primaryCrop && (
          <View style={styles.cropInfoCard}>
            <Ionicons name="leaf" size={16} color="#1C6E6B" />
            <AppText style={styles.cropInfoText}>
              {primaryCrop.displayName} — {t('fertilizer.day_label', { day: getCropGrowthState(primaryCrop).daysSincePlanting })}
            </AppText>
          </View>
        )}

        {/* Get Recommendations Button */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={[styles.primaryButton, loading && { opacity: 0.6 }]}
            onPress={fetchRecommendation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <AppText style={styles.buttonText}>
                {t('fertilizer.get_recommendations')}
              </AppText>
            )}
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={18} color="#D32F2F" />
            <AppText style={styles.errorText}>{error}</AppText>
          </View>
        )}

        {/* ─── Recommendation Cards ─── */}
        {allRecommendations.map((rec, idx) => (
          <View key={`${rec.fertilizer_id}-${idx}`} style={styles.card}>
            {/* Card Header */}
            <View style={[
              styles.cardHeader,
              rec.type === 'organic' ? styles.cardHeaderOrganic :
              rec.type === 'chemical' ? styles.cardHeaderChemical :
              styles.cardHeaderPh
            ]}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons
                  name={rec.type === 'organic' ? 'leaf-outline' : rec.type === 'chemical' ? 'flask-outline' : 'water-outline'}
                  size={16}
                  color="#1C6E6B"
                />
                <AppText bold style={styles.cardTitle}>
                  {translateFertilizerName(rec.display_name)}
                </AppText>
              </View>
              <View style={styles.cardHeaderRight}>
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={() => {
                    setSelectedRec(rec);
                    setShowInfoModal(true);
                  }}
                >
                  <Ionicons name="information-circle-outline" size={24} color="#186F71" />
                </TouchableOpacity>
                <View style={[
                  styles.typeBadge,
                  rec.type === 'organic' ? styles.typeBadgeOrganic :
                  rec.type === 'chemical' ? styles.typeBadgeChemical :
                  styles.typeBadgePh
                ]}>
                  <AppText style={styles.typeBadgeText}>
                    {rec.type === 'organic' ? `🌿 ${t('fertilizer.type_organic')}` : rec.type === 'chemical' ? `⚗️ ${t('fertilizer.type_chemical')}` : `⚖️ ${t('fertilizer.type_ph')}`}
                  </AppText>
                </View>
              </View>
            </View>

            {/* Card Body */}
            <View style={styles.cardBody}>
              <View style={styles.row}>
                <AppText bold style={styles.label}>{t('fertilizer.quantity_label')}: </AppText>
                <AppText style={styles.value}>{rec.quantity_kg_ha} kg/ha</AppText>
              </View>

              <View style={styles.row}>
                <AppText bold style={styles.label}>{t('fertilizer.release_label')}: </AppText>
                <AppText style={styles.value}>{translateReleaseSpeed(rec.release_speed)}</AppText>
              </View>

              {rec.rainfall_adjustment !== 1.0 && (
                <View style={styles.row}>
                  <AppText bold style={styles.label}>{t('fertilizer.rainfall_adj_label')}: </AppText>
                  <AppText style={styles.value}>
                    ×{rec.rainfall_adjustment} ({getFromPrefix()} {rec.original_quantity_kg_ha} kg/ha)
                  </AppText>
                </View>
              )}

              {/* Nutrients supplied */}
              <View style={styles.nutrientRow}>
                {Object.entries(rec.nutrient_supplied_kg_ha).map(([n, val]) => (
                  <View key={n} style={styles.nutrientChip}>
                    <AppText style={styles.nutrientChipText}>
                      {n}: {val} kg/ha
                    </AppText>
                  </View>
                ))}
              </View>

              {/* Benefits */}
              {rec.benefits.length > 0 && (
                <View style={styles.benefitsBox}>
                  {rec.benefits.map((b, i) => (
                    <View key={i} style={styles.benefitRow}>
                      <Ionicons name="checkmark-circle" size={12} color="#388E3C" />
                      <AppText style={styles.benefitText}>{translateBenefit(b)}</AppText>
                    </View>
                  ))}
                </View>
              )}

              {/* Notes */}
              {rec.notes ? (
                <AppText style={styles.noteText}>💡 {translateNote(rec.notes)}</AppText>
              ) : null}

              {/* ─── Application Methods & Tools ─── */}
              {rec.application_methods.map((method) => (
                <View key={method.method_id} style={styles.methodSection}>
                  <AppText bold style={styles.methodTitle}>
                    {translateMethodName(method.method_id)}
                  </AppText>
                  <AppText style={styles.methodDesc}>{translateMethodDescription(method.method_id)}</AppText>

                  <View style={styles.watchHereContainer}>
                    <AppText style={styles.note}>
                      {t('fertilizer.unsure_apply')}
                    </AppText>
                    </View>

                  <View style={styles.applicationRow}>
                    {method.tools.map((tool) => (
                      <TouchableOpacity
                        key={tool.id}
                        style={styles.applicationItem}
                        onPress={() => openToolModal(tool, method)}
                      >
                        <View style={styles.iconBox}>
                          <Image
                            source={getToolImage(tool.id)}
                            style={styles.toolImage}
                            resizeMode="contain"
                          />
                        </View>
                        <AppText style={styles.iconText}>{translateToolName(tool.id, tool.name)}</AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ─── Fertilizer Info Detail Modal ─── */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalHeader}>
              <AppText variant="header" style={styles.infoModalTitle}>
                {t('fertilizer.why_this_fertilizer')}
              </AppText>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Ionicons name="close" size={28} color="#186F71" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.infoModalBody} showsVerticalScrollIndicator={true}>
              {selectedRec && responseData && (
                <>
                  {/* Fertilizer Name & Type */}
                  <View style={styles.infoSection}>
                    <View style={styles.infoFertHeader}>
                      <Ionicons
                        name={selectedRec.type === 'organic' ? 'leaf-outline' : selectedRec.type === 'chemical' ? 'flask-outline' : 'water-outline'}
                        size={24}
                        color={selectedRec.type === 'organic' ? '#4CAF50' : selectedRec.type === 'chemical' ? '#2196F3' : '#FF9800'}
                      />
                      <View style={{ flex: 1 }}>
                        <AppText variant="content" bold style={styles.infoFertName}>
                          {translateFertilizerName(selectedRec.display_name)}
                        </AppText>
                        <AppText style={styles.infoFertType}>
                          {selectedRec.type === 'organic' ? `🌿 ${t('fertilizer.type_organic_full')}` : selectedRec.type === 'chemical' ? `⚗️ ${t('fertilizer.type_chemical_full')}` : `⚖️ ${t('fertilizer.type_ph_full')}`}
                        </AppText>
                      </View>
                    </View>
                  </View>

                  {/* Crop & Stage Context */}
                  <AppText variant="content" bold style={styles.infoSectionTitle}>
                    {t('fertilizer.crop_context')}
                  </AppText>
                  <View style={styles.infoDimensionCard}>
                    <View style={styles.infoDimensionHeader}>
                      <Ionicons name="leaf" size={20} color="#4CAF50" />
                      <AppText variant="content" bold style={styles.infoDimensionTitle}>
                        {t('fertilizer.stage_label', { crop: responseData.crop.charAt(0).toUpperCase() + responseData.crop.slice(1), stage: responseData.stage.name.charAt(0).toUpperCase() + responseData.stage.name.slice(1) })}
                      </AppText>
                    </View>
                    <AppText style={styles.infoDimensionCategory}>
                      {t('fertilizer.growth_day_range', { start: responseData.stage.start_day, end: responseData.stage.end_day })}
                    </AppText>
                    <AppText style={styles.infoDimensionText}>
                      {translateSummary(responseData.summary, responseData)}
                    </AppText>
                  </View>

                  {/* No Deficit Alert - Show when all nutrients are optimal */}
                  {!Object.entries(responseData.severity).some(([, sev]) => sev !== 'none') && (
                    <View style={{ backgroundColor: '#E8F5E9', borderLeftWidth: 4, borderLeftColor: '#4CAF50', padding: 16, marginVertical: 12, borderRadius: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" style={{ marginRight: 8 }} />
                        <AppText variant="content" bold style={{ color: '#2E7D32', fontSize: 16 }}>
                          {t('fert_data.summary.no_deficit')}
                        </AppText>
                      </View>
                    </View>
                  )}

                  {/* Nutrient Deficits Detected or No Deficit */}
                  {Object.entries(responseData.severity).some(([, sev]) => sev !== 'none') ? (
                    <>
                      <AppText variant="content" bold style={styles.infoSectionTitle}>
                        {t('fertilizer.nutrient_deficits')}
                      </AppText>
                      {Object.entries(responseData.severity)
                        .filter(([, sev]) => sev !== 'none')
                        .map(([nutrient, sev]) => (
                      <View key={nutrient} style={[
                        styles.infoDimensionCard,
                        { borderLeftColor: severityColor(sev) }
                      ]}>
                        <View style={styles.infoDimensionHeader}>
                          <Ionicons
                            name={sev === 'high' ? 'alert-circle' : sev === 'moderate' ? 'warning' : 'checkmark-circle'}
                            size={20}
                            color={severityColor(sev)}
                          />
                          <AppText variant="content" bold style={styles.infoDimensionTitle}>
                            {t('fertilizer.deficit_label', { nutrient: nutrient.toUpperCase() })}
                          </AppText>
                        </View>
                        <AppText style={styles.infoDimensionCategory}>
                          {t('fertilizer.severity_label', { severity: sev.charAt(0).toUpperCase() + sev.slice(1) })}
                        </AppText>
                        <AppText style={styles.infoDimensionText}>
                          {t('fertilizer.deficit_description', { amount: responseData.deficit_kg_ha[nutrient], nutrient: nutrient.toUpperCase() })}
                        </AppText>
                      </View>
                    ))}
                    </>
                  ) : (
                    <View style={[styles.infoDimensionCard, { borderLeftColor: '#4CAF50' }]}>
                      <View style={styles.infoDimensionHeader}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <AppText variant="content" bold style={styles.infoDimensionTitle}>
                          {t('fert_data.summary.no_deficit')}
                        </AppText>
                      </View>
                      <AppText style={styles.infoDimensionText}>
                        {translateSummary(responseData.summary, responseData)}
                      </AppText>
                    </View>
                  )}

                  {/* This Fertilizer Supplies */}
                  <AppText variant="content" bold style={styles.infoSectionTitle}>
                    {t('fertilizer.what_supplies')}
                  </AppText>
                  <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                      <AppText variant="content" bold style={styles.infoLabel}>{t('fertilizer.quantity_detail')}</AppText>
                      <AppText style={styles.infoValue}>{selectedRec.quantity_kg_ha} kg/ha</AppText>
                    </View>
                    <View style={styles.infoRow}>
                      <AppText variant="content" bold style={styles.infoLabel}>{t('fertilizer.release_speed')}</AppText>
                      <AppText style={styles.infoValue}>{translateReleaseSpeed(selectedRec.release_speed)}</AppText>
                    </View>
                    {selectedRec.rainfall_adjustment !== 1.0 && (
                      <View style={styles.infoRow}>
                        <AppText variant="content" bold style={styles.infoLabel}>{t('fertilizer.rainfall_adjusted')}</AppText>
                        <AppText style={styles.infoValue}>
                          ×{selectedRec.rainfall_adjustment} ({getFromPrefix()} {selectedRec.original_quantity_kg_ha} kg/ha)
                        </AppText>
                      </View>
                    )}

                    <View style={styles.infoNutrientRow}>
                      {Object.entries(selectedRec.nutrient_supplied_kg_ha).map(([n, val]) => (
                        <View key={n} style={styles.infoNutrientChip}>
                          <AppText style={styles.infoNutrientChipText}>
                            {n.toUpperCase()}: {val} kg/ha
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Benefits */}
                  {selectedRec.benefits.length > 0 && (
                    <>
                      <AppText variant="content" bold style={styles.infoSectionTitle}>
                        {t('fertilizer.benefits')}
                      </AppText>
                      <View style={styles.infoSection}>
                        {selectedRec.benefits.map((b, i) => (
                          <View key={i} style={styles.infoBenefitRow}>
                            <Ionicons name="checkmark-circle" size={16} color="#388E3C" />
                            <AppText style={styles.infoBenefitText}>{translateBenefit(b)}</AppText>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {/* Rainfall Context */}
                  <AppText variant="content" bold style={styles.infoSectionTitle}>
                    {t('fertilizer.rainfall_context')}
                  </AppText>
                  <View style={[
                    styles.infoDimensionCard,
                    { borderLeftColor: '#2196F3' }
                  ]}>
                    <View style={styles.infoDimensionHeader}>
                      <Ionicons name="rainy" size={20} color="#2196F3" />
                      <AppText variant="content" bold style={styles.infoDimensionTitle}>
                        {t('fertilizer.weekly_rainfall', { amount: responseData.rainfall_context.weekly_rainfall_mm })}
                      </AppText>
                    </View>
                    <AppText style={styles.infoDimensionCategory}>
                      {t('fertilizer.classification_label', { classification: translateRainfallClassification(responseData.rainfall_context.classification) })}
                    </AppText>
                    <AppText style={styles.infoDimensionText}>
                      {translateRainfallReason(responseData.rainfall_context.reason)}
                    </AppText>
                    <AppText style={[styles.infoDimensionText, { marginTop: 6, fontStyle: 'italic' }]}>
                      {translateTimingAdvice(responseData.rainfall_context.classification)}
                    </AppText>
                  </View>

                  {/* Notes */}
                  {selectedRec.notes ? (
                    <>
                      <AppText variant="content" bold style={styles.infoSectionTitle}>
                        {t('fertilizer.notes')}
                      </AppText>
                      <View style={[styles.infoSection, { borderLeftWidth: 4, borderLeftColor: '#FF9800', paddingLeft: 12 }]}>
                        <AppText style={styles.infoDimensionText}>
                          💡 {translateNote(selectedRec.notes)}
                        </AppText>
                      </View>
                    </>
                  ) : null}

                  {/* Priority explanation */}
                  <AppText variant="content" bold style={styles.infoSectionTitle}>
                    {t('fertilizer.priority_strategy')}
                  </AppText>
                  <View style={styles.infoSection}>
                    <AppText style={styles.infoDimensionText}>
                      {responseData.organic_first
                        ? `🌿 ${t('fertilizer.organic_first_explanation')}`
                        : t('fertilizer.balanced_explanation')}
                    </AppText>
                    <AppText style={[styles.infoDimensionCategory, { marginTop: 6 }]}>
                      {t('fertilizer.priority_label', { priority: responseData.priority })}
                    </AppText>
                  </View>

                  <View style={{ height: 30 }} />
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.infoModalCloseButton}
              onPress={() => setShowInfoModal(false)}
            >
              <AppText variant="content" bold style={styles.infoModalCloseText}>
                {t('fertilizer.close')}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Tool Flip-Card Modal ─── */}
      <Modal
        visible={showToolModal}
        transparent
        animationType="fade"
        onRequestClose={closeToolModal}
      >
        <TouchableWithoutFeedback onPress={closeToolModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View>
                {selectedTool && selectedMethod && (
                  <FlipCard
                    tool={selectedTool}
                    method={selectedMethod}
                    onClose={closeToolModal}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const CARD_WIDTH = 290;
const CARD_HEIGHT = 340;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#DDF1F9',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  /* ─── Title ─── */
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
  },

  /* ─── Crop info ─── */
  cropInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#BDDBE8FA',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  cropInfoText: {
    fontSize: 12,
    color: '#1C6E6B',
    fontWeight: '600',
  },

  /* ─── Button ─── */
  buttonWrapper: {
    alignItems: 'center',
    marginVertical: 16,
  },
  primaryButton: {
    backgroundColor: '#1C6E6B',
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 10,
    elevation: 4,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },

  /* ─── Error ─── */
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    flex: 1,
  },

  /* ─── Summary Banner ─── */
  summaryBanner: {
    backgroundColor: '#E2F3E4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 11,
    color: '#2E7D32',
    lineHeight: 16,
    marginBottom: 8,
  },
  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  severityBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  rainfallRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  rainfallText: {
    fontSize: 10,
    color: '#186F71',
    flex: 1,
    lineHeight: 14,
  },

  /* ─── Card ─── */
  card: {
    backgroundColor: '#E9F5FB',
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#8FBAC6',
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: '#9FC4D4',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderOrganic: {
    backgroundColor: '#A5D6A7',
  },
  cardHeaderChemical: {
    backgroundColor: '#9FC4D4',
  },
  cardHeaderPh: {
    backgroundColor: '#FFCC80',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoButton: {
    padding: 2,
  },
  cardTitle: {
    fontSize: 13,
    color: '#1C6E6B',
  },
  typeBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeOrganic: {
    backgroundColor: '#C8E6C9',
  },
  typeBadgeChemical: {
    backgroundColor: '#B3E5FC',
  },
  typeBadgePh: {
    backgroundColor: '#FFE0B2',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1C6E6B',
  },
  cardBody: {
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#1C6E6B',
  },
  value: {
    fontSize: 12,
    color: '#1C6E6B',
  },

  /* ─── Nutrients ─── */
  nutrientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 6,
  },
  nutrientChip: {
    backgroundColor: '#D1ECF1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nutrientChipText: {
    fontSize: 10,
    color: '#0C5460',
    fontWeight: '600',
  },

  /* ─── Benefits ─── */
  benefitsBox: {
    marginTop: 6,
    marginBottom: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  benefitText: {
    fontSize: 10,
    color: '#2E7D32',
  },
  noteText: {
    fontSize: 10,
    color: '#5D4037',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 6,
  },

  /* ─── Method section ─── */
  methodSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#B0D4DE',
    paddingTop: 10,
  },
  methodTitle: {
    fontSize: 12,
    color: '#186F71',
    marginBottom: 2,
  },
  methodDesc: {
    fontSize: 10,
    color: '#37474F',
    marginBottom: 6,
  },
  note: {
    fontSize: 10,
    color: '#186F71',
    fontStyle: 'italic',
  },
  watchHereContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },

  /* ─── Tool icons row ─── */
  applicationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  applicationItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBox: {
    width: 90,
    height: 90,
    borderRadius: 18,
    backgroundColor: '#D9EEF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconText: {
    fontSize: 9,
    textAlign: 'center',
    color: '#1C6E6B',
    marginTop: 2,
  },
  toolImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },

  /* ─── Modal Overlay ─── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ─── Flip Card ─── */
  flipContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  flipCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backfaceVisibility: 'hidden',
  },
  flipCardFront: {
    backgroundColor: '#F2FBFF',
    borderWidth: 0.5,
    borderColor: '#186F71',
  },
  flipCardBack: {
    backgroundColor: '#F2FBFF',
    borderWidth: 0.5,
    borderColor: '#186F71',
  },

  /* ─── Modal content (shared) ─── */
  modalTitle: {
    fontSize: 14,
    color: '#186F71',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  toolImageBox: {
    width: 100,
    height: 100,
    backgroundColor: '#C8E6F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalToolImage: {
    width: 75,
    height: 75,
  },
  toolNameText: {
    fontSize: 12,
    color: '#186F71',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 8,
  },

  /* ─── Yes / No buttons ─── */
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 40,
  },
  modalNoButton: {
    flex: 1,
    backgroundColor: '#B5D4E0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalNoText: {
    color: '#186F71',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalYesButton: {
    flex: 1,
    backgroundColor: '#186F71',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalYesText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  /* ─── Purchase links (back/No) ─── */
  purchaseLinksColumn: {
    width: '100%',
    gap: 8,
    marginVertical: 4,
  },
  purchaseLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E0F2F1',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  purchaseLinkText: {
    flex: 1,
    fontSize: 13,
    color: '#186F71',
    fontWeight: '600',
  },

  /* ─── Usage guide (back/Yes) ─── */
  methodDescription: {
    fontSize: 11,
    color: '#37474F',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 16,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#186F71',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  videoButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },

  /* ─── Flip-back button ─── */
  flipBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  flipBackText: {
    color: '#186F71',
    fontSize: 12,
    fontWeight: '600',
  },

  /* ─── Info Modal (sustainability-style) ─── */
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  infoModalContent: {
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
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    marginBottom: 16,
  },
  infoModalTitle: {
    fontSize: 20,
    color: '#186F71',
    fontWeight: 'bold',
    flex: 1,
  },
  infoModalBody: {
    flex: 1,
    paddingVertical: 8,
  },
  infoModalCloseButton: {
    backgroundColor: '#186F71',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  infoModalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
  },

  /* ─── Info Modal Content Styles ─── */
  infoSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  infoSectionTitle: {
    fontSize: 16,
    color: '#186F71',
    marginBottom: 12,
    marginTop: 20,
    fontWeight: 'bold',
  },
  infoFertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoFertName: {
    fontSize: 18,
    color: '#186F71',
  },
  infoFertType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#186F71',
  },
  infoValue: {
    fontSize: 13,
    color: '#156349',
  },
  infoNutrientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  infoNutrientChip: {
    backgroundColor: '#D1ECF1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  infoNutrientChipText: {
    fontSize: 12,
    color: '#0C5460',
    fontWeight: '600',
  },
  infoBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoBenefitText: {
    fontSize: 13,
    color: '#2E7D32',
    flex: 1,
    lineHeight: 20,
  },
  infoDimensionCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoDimensionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoDimensionTitle: {
    fontSize: 14,
    color: '#186F71',
    flex: 1,
  },
  infoDimensionCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  infoDimensionText: {
    fontSize: 13,
    color: '#156349',
    lineHeight: 20,
  },
});