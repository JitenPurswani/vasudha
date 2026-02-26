import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StatusBar,
  Image,
  Modal,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';

export default function Fertilizer() {
  const { t } = useTranslation();
  const [showRecommendations, setShowRecommendations] = React.useState(false);
  const [showToolModal, setShowToolModal] = React.useState(false);
  const [selectedTool, setSelectedTool] = React.useState<string | null>(null);
  const [showPurchaseOptions, setShowPurchaseOptions] = React.useState(false);
  const [showUsageGuide, setShowUsageGuide] = React.useState(false);
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
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setShowRecommendations(true)}
          >
            <AppText style={styles.buttonText}>
              Get Fertilizer Recommendations
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Cards */}
        {showRecommendations && fertilizers.map((item, index) => (
          <View key={index} style={styles.card}>

            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="leaf-outline" size={16} color="#1C6E6B" />
                <AppText bold style={styles.cardTitle}>
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
                <AppText bold style={styles.label}>Quantity: </AppText>
                <AppText style={styles.value}>{item.quantity}</AppText>
              </View>

              <View style={styles.row}>
                <AppText bold style={styles.label}>Method: </AppText>
                <AppText style={styles.value}>{item.method}</AppText>
              </View>

              <View style={styles.watchHereContainer}>
                <AppText style={styles.note}>
                  Unsure how to apply? Watch here
                </AppText>
                <Ionicons name="play" size={12} color="#186F71" style={styles.playIcon} />
              </View>

              {/* Application Icons */}
              <View style={styles.applicationRow}>
                <TouchableOpacity
                  style={styles.applicationItem}
                  onPress={() => {
                    setSelectedTool('backpack');
                    setShowToolModal(true);
                  }}
                >
                  <View style={styles.iconBox}>
                    <Image
                      source={require('@/assets/images/backpack_sprayer.png')}
                      style={styles.toolImage}
                      resizeMode="contain"
                    />
                  </View>
                  <AppText style={styles.iconText}>
                    Backpack Fertilizer Sprayer
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.applicationItem}
                  onPress={() => {
                    setSelectedTool('liquid');
                    setShowToolModal(true);
                  }}
                >
                  <View style={styles.iconBox}>
                    <Image
                      source={require('@/assets/images/liquid_sprayer.png')}
                      style={styles.toolImage}
                      resizeMode="contain"
                    />
                  </View>
                  <AppText style={styles.iconText}>
                    Liquid Fertilizer Sprayer
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.applicationItem}
                  onPress={() => {
                    setSelectedTool('seeder');
                    setShowToolModal(true);
                  }}
                >
                  <View style={styles.iconBox}>
                    <Image
                      source={require('@/assets/images/seeder_roller.png')}
                      style={styles.toolImage}
                      resizeMode="contain"
                    />
                  </View>
                  <AppText style={styles.iconText}>
                    Seeder with Roller
                  </AppText>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        ))}  

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Tool Modal */}
      <Modal
        visible={showToolModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowToolModal(false);
          setShowPurchaseOptions(false);
          setShowUsageGuide(false);
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setShowToolModal(false);
            setShowPurchaseOptions(false);
            setShowUsageGuide(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                {!showPurchaseOptions && !showUsageGuide ? (
                  <>
                    <AppText variant="header" style={styles.modalTitle}>
                      Do you have this tool?
                    </AppText>

                    <View style={styles.toolImageBox}>
                      <Image
                        source={
                          selectedTool === 'backpack'
                            ? require('@/assets/images/backpack_sprayer.png')
                            : selectedTool === 'liquid'
                            ? require('@/assets/images/liquid_sprayer.png')
                            : require('@/assets/images/seeder_roller.png')
                        }
                        style={styles.modalToolImage}
                        resizeMode="contain"
                      />
                    </View>

                    <AppText style={styles.toolNameText}>
                      {selectedTool === 'backpack'
                        ? 'Backpack Fertilizer Sprayer'
                        : selectedTool === 'liquid'
                        ? 'Liquid Fertilizer Sprayer'
                        : 'Seeder with Roller'}
                    </AppText>

                    <View style={styles.modalButtonsRow}>
                      <TouchableOpacity
                        style={styles.modalNoButton}
                        onPress={() => setShowPurchaseOptions(true)}
                      >
                        <AppText style={styles.modalNoText}>No</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.modalYesButton}
                        onPress={() => setShowUsageGuide(true)}
                      >
                        <AppText style={styles.modalYesText}>Yes</AppText>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : showUsageGuide ? (
                  <>
                    <AppText variant="header" style={styles.modalTitle}>
                      Usage Guide
                    </AppText>

                    <View style={styles.toolImageBox}>
                      <Image
                        source={
                          selectedTool === 'backpack'
                            ? require('@/assets/images/backpack_sprayer.png')
                            : selectedTool === 'liquid'
                            ? require('@/assets/images/liquid_sprayer.png')
                            : require('@/assets/images/seeder_roller.png')
                        }
                        style={styles.modalToolImage}
                        resizeMode="contain"
                      />
                    </View>

                    <AppText style={styles.toolNameText}>
                      {selectedTool === 'backpack'
                        ? 'Backpack Fertilizer Sprayer'
                        : selectedTool === 'liquid'
                        ? 'Liquid Fertilizer Sprayer'
                        : 'Seeder with Roller'}
                    </AppText>

                    <TouchableOpacity
                      style={styles.learnMoreButton}
                      onPress={() => {
                        Linking.openURL('https://www.youtube.com/results?search_query=fertilizer+application+guide');
                      }}
                    >
                      <AppText style={styles.learnMoreText}>
                        Learn how to use this tool
                      </AppText>
                      <Ionicons name="play" size={18} color="#186F71" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <AppText variant="header" style={styles.modalTitle}>
                      Purchase Options
                    </AppText>

                    <View style={styles.toolImageBox}>
                      <Image
                        source={
                          selectedTool === 'backpack'
                            ? require('@/assets/images/backpack_sprayer.png')
                            : selectedTool === 'liquid'
                            ? require('@/assets/images/liquid_sprayer.png')
                            : require('@/assets/images/seeder_roller.png')
                        }
                        style={styles.modalToolImage}
                        resizeMode="contain"
                      />
                    </View>

                    <AppText style={styles.toolNameText}>
                      {selectedTool === 'backpack'
                        ? 'Backpack Fertilizer Sprayer'
                        : selectedTool === 'liquid'
                        ? 'Liquid Fertilizer Sprayer'
                        : 'Seeder with Roller'}
                    </AppText>

                    <View style={styles.purchaseLinksRow}>
                      <TouchableOpacity
                        style={styles.purchaseLink}
                        onPress={() => Linking.openURL('https://amazon.in')}
                      >
                        <AppText style={styles.purchaseLinkText}>Amazon</AppText>
                        <Ionicons name="open-outline" size={14} color="#186F71" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.purchaseLink}
                        onPress={() => Linking.openURL('https://flipkart.com')}
                      >
                        <AppText style={styles.purchaseLinkText}>Flipkart</AppText>
                        <Ionicons name="open-outline" size={14} color="#186F71" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.purchaseLink}
                        onPress={() => Linking.openURL('https://alibaba.com')}
                      >
                        <AppText style={styles.purchaseLinkText}>Alibaba</AppText>
                        <Ionicons name="open-outline" size={14} color="#186F71" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#DDF1F9',
  },

  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  /* Title */
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
    color: '#186F71',
    marginBottom: 14,
    fontStyle: 'italic',
  },

  watchHereContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },

  playIcon: {
    marginTop: -10,
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

  toolImage: {
    width: 50,
    height: 50,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    width: 280,
    height: 320,
    backgroundColor: '#F2FBFF',
    borderWidth: 0.5,
    borderColor: '#186F71',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },

  modalTitle: {
    fontSize: 14,
    color: '#186F71',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },

  toolImageBox: {
    width: 110,
    height: 110,
    backgroundColor: '#C8E6F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },

  modalToolImage: {
    width: 80,
    height: 80,
  },

  toolNameText: {
    fontSize: 13,
    color: '#186F71',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 12,
  },

  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
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

  purchaseLinksRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },

  purchaseLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  purchaseLinkText: {
    fontSize: 14,
    color: '#186F71',
    fontWeight: '600',
  },

  backButton: {
    width: '100%',
    backgroundColor: '#B5D4E0',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },

  backButtonText: {
    color: '#186F71',
    fontSize: 13,
    fontWeight: 'bold',
  },

  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginVertical: 0,
  },

  learnMoreText: {
    flex: 1,
    fontSize: 14,
    color: '#186F71',
    fontStyle: 'italic',
    fontWeight: '600',
    textAlign: 'center',
  },
});