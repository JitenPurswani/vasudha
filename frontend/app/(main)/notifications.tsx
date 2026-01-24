import MarketAlertIcon from '@/assets/images/market_alert.svg';
import WeatherAlertIcon from '@/assets/images/weather_alert.svg';
import Alert from '@/components/Alert';
import { AppText } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export default function Notifications() {
  const insets = useSafeAreaInsets();

  const notificationsData = [
    {
      id: '1',
      title: 'Strong winds expected',
      description: 'Avoid spraying and protect saplings',
      icon: WeatherAlertIcon,
      time: '10 min ago',
    },
    {
      id: '2',
      title: 'Heavy Rainfall Expected in next 24 hours',
      description: 'Prepare for proper drainage',
      icon: WeatherAlertIcon,
      time: '3 hrs ago',
    },
    {
      id: '3',
      title: 'Market Alert',
      description: 'Price of Rice in Kalyan APMC crossed ₹2000 per kg', 
      icon: MarketAlertIcon, 
      time: '3 hrs ago',
    },
  ];
  const {t}=useTranslation();
  return (
    <View style={[styles.container, { paddingTop: 20 }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant='header' style={ styles.pageTitle }>{t('notifications.title')}</AppText>
        
        {notificationsData.map((item) => (
          <Alert
            key={item.id}
            IconComponent={item.icon}
            title={item.title}
            description={item.description}
            time={item.time} 
          />
        ))}
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
    fontFamily: 'KronaOne',
  },
  pageTitle: {
    fontSize: 15,
    color: '#156349',
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,   },
});