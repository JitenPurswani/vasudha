import { AppText } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width - 64;

export default function Market() {
  const [cropOpen, setCropOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('Rice');
  const { t, i18n } = useTranslation();

  const crops = ['Rice', 'Wheat', 'Maize', 'Cotton'];
  const marketData = [
    { id: '1', location: 'Kalyan APMC', price: '2500', trend: '+6%', isUp: true, type: 'current' },
    { id: '2', location: 'Thane APMC', price: '1500', trend: '-10%', isUp: false, type: 'current' },
    { id: '3', location: 'Panvel APMC', price: '1800', trend: '+3%', isUp: true, type: 'nearby' },
  ];
  const prices = [2100, 2300, 2200, 2600, 2400, 2800];
  const labels = ["1", "5", "10", "15", "20", "25"];
  const [activeTime, setActiveTime] = useState('30D');

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

      <View style={styles.marketCard}>
        {/* Current Price */}
        <AppText variant='content' bold style={styles.currentPriceLabel}>{t('market.current_price')}</AppText>

        {marketData
          .filter(item => item.type === 'current')
          .map(item => (
            <View key={item.id} style={styles.marketRow}>
              <AppText variant='content' bold style={styles.locationTextMarket}>{item.location}</AppText>

              <AppText variant='content' bold style={styles.priceValueText}>
                ₹{item.price} <AppText variant='content' style={styles.perKgText}>per kg</AppText>
              </AppText>

              <View style={styles.trendCapsule}>
                <Feather
                  name={item.isUp ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={item.isUp ? '#28A745' : '#DC3545'}
                />
                <AppText
                variant='content' bold
                  style={[
                    styles.trendText,
                    { color: item.isUp ? '#28A745' : '#DC3545' },
                  ]}
                >
                  {item.trend}
                </AppText>
              </View>
            </View>
          ))}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Nearby Markets */}
        <AppText variant='content' bold style={styles.currentPriceLabel}>{t('market.nearby_markets')}</AppText>

        {marketData
          .filter(item => item.type === 'nearby')
          .map(item => (
            <View key={item.id} style={styles.marketRow}>
              <AppText variant='content' bold style={styles.locationTextMarket}>{item.location}</AppText>

              <AppText variant='content' bold style={styles.priceValueText}>
                ₹{item.price} <AppText variant='content' style={styles.perKgText}>{t('market.per_kg')}</AppText>
              </AppText>

              <View style={styles.trendCapsule}>
                <Feather
                  name={item.isUp ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={item.isUp ? '#28A745' : '#DC3545'}
                />
                <AppText
                variant='content' bold
                  style={[
                    styles.trendText,
                    { color: item.isUp ? '#28A745' : '#DC3545' },
                  ]}
                >
                  {item.trend}
                </AppText>
              </View>
            </View>
          ))}

        <AppText variant='content' style={styles.lastUpdatedText}>
          {t('common.last_updated', { timestamp: '11.00 am, 25/12/2025' })}
        </AppText>
      </View>


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
              onPress={() => setActiveTime(label)}
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

        {/* Chart */}
        <View pointerEvents="box-none">
          <LineChart
            data={{
              labels,
              datasets: [{ data: prices }],
            }}
            width={screenWidth}
            height={200}
            yAxisLabel="₹"
            chartConfig={{
              backgroundColor: "#CFE9F1",
              backgroundGradientFrom: "#CFE9F1",
              backgroundGradientTo: "#CFE9F1",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(21, 99, 73, ${opacity})`,
              labelColor: () => "#156349",
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#156349",
              },
            }}
            style={styles.chart}
          />
        </View>
        <AppText variant='content' style={styles.lastUpdatedText}>{t('common.last_updated', { timestamp: '11.00 am, 25/12/2025' })}</AppText>
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
});
