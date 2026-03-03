import MarketAlertIcon from '@/assets/images/market_alert.svg';
import WeatherAlertIcon from '@/assets/images/weather_alert.svg';
import Alert from '@/components/Alert';
import { AppText } from '@/components/AppText';
import { useNotifications } from '@/context/NotificationContext';
import { NotificationData } from '@/services/notificationApi';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { 
  ActivityIndicator, 
  RefreshControl, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Helper to format relative time
function formatRelativeTime(timestamp: number, t: (key: string, opts?: any) => string): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return t('notifications.just_now');
  if (minutes < 60) return t('notifications.min_ago', { minutes });
  if (hours < 24) return hours > 1 ? t('notifications.hrs_ago', { hours }) : t('notifications.hr_ago', { hours });
  if (days < 7) return days > 1 ? t('notifications.days_ago', { days }) : t('notifications.day_ago', { days });
  return new Date(timestamp).toLocaleDateString();
}

// Get icon based on notification type
function getNotificationIcon(notification: NotificationData) {
  const riskType = notification.source.riskType?.toLowerCase() || '';
  
  if (notification.type === 'market' || riskType.includes('price') || riskType.includes('demand') || riskType.includes('market')) {
    return MarketAlertIcon;
  }
  
  // Climate/weather related
  return WeatherAlertIcon;
}

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { 
    notifications, 
    unreadCount,
    isLoading, 
    refreshNotifications, 
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    addTestNotifications,
  } = useNotifications();

  const handleNotificationPress = (notification: NotificationData) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const hasNotifications = notifications.length > 0;

  return (
    <View style={[styles.container, { paddingTop: 20 }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshNotifications}
            tintColor="#186F71"
            colors={['#186F71']}
          />
        }
      >
        {/* Header with actions */}
        <View style={styles.headerRow}>
          <AppText variant='header' style={styles.pageTitle}>
            {t('notifications.title')}
            {unreadCount > 0 && (
              <Text style={styles.unreadBadge}> ({unreadCount})</Text>
            )}
          </AppText>
          
          {hasNotifications && (
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllAsRead} style={styles.actionButton}>
                  <Ionicons name="checkmark-done" size={18} color="#186F71" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={clearAllNotifications} style={styles.actionButton}>
                <Ionicons name="trash-outline" size={18} color="#666" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Loading state */}
        {isLoading && notifications.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#186F71" />
            <Text style={styles.loadingText}>{t('notifications.checking_alerts')}</Text>
          </View>
        )}

        {/* Empty state */}
        {!isLoading && !hasNotifications && (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#B0BEC5" />
            <Text style={styles.emptyTitle}>{t('notifications.no_notifications_title')}</Text>
            <Text style={styles.emptyText}>
              {t('notifications.no_notifications_desc')}
            </Text>
            <TouchableOpacity 
              onPress={refreshNotifications} 
              style={styles.refreshButton}
            >
              <Ionicons name="refresh" size={18} color="#FFF" />
              <Text style={styles.refreshButtonText}>{t('notifications.check_now')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notification list */}
        {hasNotifications && notifications.map((notification) => (
          <Alert
            key={notification.id}
            IconComponent={getNotificationIcon(notification)}
            title={notification.title}
            description={notification.description}
            time={formatRelativeTime(notification.timestamp, t)}
            severity={notification.severity}
            isRead={notification.read}
            onPress={() => handleNotificationPress(notification)}
            onDismiss={() => clearNotification(notification.id)}
          />
        ))}
        
        {/* Debug: Add test notifications button (only in __DEV__) */}
        {__DEV__ && (
          <TouchableOpacity 
            onPress={addTestNotifications} 
            style={styles.debugButton}
          >
            <Ionicons name="bug" size={16} color="#666" />
            <Text style={styles.debugButtonText}>Add Test Notifications</Text>
          </TouchableOpacity>
        )}
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
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    backgroundColor: '#F2FBFF',
    borderRadius: 8,
  },
  unreadBadge: {
    color: '#E53935',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    color: '#186F71',
    fontFamily: 'OpenSans-Regular',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'OpenSans-Bold',
    color: '#186F71',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'OpenSans-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#186F71',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
    gap: 8,
  },
  refreshButtonText: {
    color: '#FFF',
    fontFamily: 'OpenSans-Bold',
    fontSize: 14,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 20,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  debugButtonText: {
    color: '#666',
    fontFamily: 'OpenSans-Regular',
    fontSize: 12,
  },
});