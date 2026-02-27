import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';

export default function Fertilizer() {
  const { t } = useTranslation();
  const fertilizers = [
    {
      name: 'Urea',
      quantity: '50 kg/ha',
      method: 'Manual Spread',
    },
    {
      name: 'Urea',
      quantity: '50 kg/ha',
      method: 'Manual Spread',
    },
  ];

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

        {/* Center Button */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity style={styles.primaryButton}>
            <AppText style={styles.buttonText}>
              Get Fertilizer Recommendations
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Cards */}
        {fertilizers.map((item, index) => (
          <View key={index} style={styles.card}>

            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="leaf-outline" size={16} color="#1C6E6B" />
                <AppText style={styles.cardTitle}>
                  {item.name}
                </AppText>
              </View>

              <View style={styles.infoCircle}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#1C6E6B"
                />
              </View>
            </View>

            {/* Card Body */}
            <View style={styles.cardBody}>

              <View style={styles.row}>
                <AppText style={styles.label}>Quantity:</AppText>
                <AppText style={styles.value}>{item.quantity}</AppText>
              </View>

              <View style={styles.row}>
                <AppText style={styles.label}>Method:</AppText>
                <AppText style={styles.value}>{item.method}</AppText>
              </View>

              <AppText style={styles.note}>
                Ensure 100% uptake / Match here
              </AppText>

              {/* Application Icons */}
              <View style={styles.applicationRow}>
                <View style={styles.applicationItem}>
                  <View style={styles.iconBox}>
                    <Ionicons name="water-outline" size={24} color="#1C6E6B" />
                  </View>
                  <AppText style={styles.iconText}>
                    Backpack Fertilizer Sprayer
                  </AppText>
                </View>

                <View style={styles.applicationItem}>
                  <View style={styles.iconBox}>
                    <Ionicons name="flask-outline" size={24} color="#1C6E6B" />
                  </View>
                  <AppText style={styles.iconText}>
                    Liquid Fertilizer Sprayer
                  </AppText>
                </View>

                <View style={styles.applicationItem}>
                  <View style={styles.iconBox}>
                    <Ionicons name="construct-outline" size={24} color="#1C6E6B" />
                  </View>
                  <AppText style={styles.iconText}>
                    Seeder with Roller
                  </AppText>
                </View>
              </View>

            </View>
          </View>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#D4E6EE', // softer blue like screenshot
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  /* Title */
  title: {
    fontSize: 15,
    color: '#1C6E6B',
  },

  subtitle: {
    fontSize: 11,
    color: '#4F8A8B',
    marginTop: 4,
  },

  /* Button */
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
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },

  /* Card */
  card: {
    backgroundColor: '#E9F5FB',
    borderRadius: 12,
    marginTop: 18,
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

  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  cardTitle: {
    fontSize: 13,
    color: '#1C6E6B',
  },

  infoCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D9EEF6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardBody: {
    padding: 14,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  label: {
    fontSize: 12,
    color: '#1C6E6B',
  },

  value: {
    fontSize: 12,
    color: '#1C6E6B',
  },

  note: {
    fontSize: 10,
    color: '#6C7A89',
    marginBottom: 14,
  },

  applicationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  applicationItem: {
    width: '30%',
    alignItems: 'center',
  },

  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#D9EEF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },

  iconText: {
    fontSize: 9,
    textAlign: 'center',
    color: '#1C6E6B',
  },
});