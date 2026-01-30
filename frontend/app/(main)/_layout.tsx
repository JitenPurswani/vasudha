import Logo from '@/assets/images/logo.svg';
import NotificationsIcon from '@/assets/images/notifications.svg';
import ProfileIcon from '@/assets/images/profile.svg';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationProvider, useNotifications } from '@/context/NotificationContext';

function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  
  return (
    <TouchableOpacity onPress={() => router.push('/(main)/notifications')}>
        <View style={styles.iconCircle}>
          <NotificationsIcon width={24} height={24} />
        
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MainLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  /*const handleVoicePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log("Voice search activated");
    };*/
    const isFullPage = pathname.includes('profile') || pathname.includes('notifications');

   const fabBottom = isFullPage ? 20 + insets.bottom : 85 + insets.bottom;
  
  return (
    <NotificationProvider>
    <View style={{flex: 1}}>
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#DDF1F9" },
        headerShadowVisible: false, 
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            <Logo width={30} height={30}/>
            <Text style={styles.brandText}>
              Vasudha
            </Text>
          </View>
        ),
        headerRight: () => (
          <View style={styles.headerRightContainer}>
            <TouchableOpacity onPress={() => router.push('/(main)/profile')}>
              <View style={styles.iconCircle}>
              <ProfileIcon width={24} height={24} />
              </View>
            </TouchableOpacity>
            <NotificationBell />
          </View>
        ),
      }}
    >
      <Stack.Screen name="(tabs)" />
      
      <Stack.Screen 
        name="profile" 
        options={{ 
          presentation: 'modal', 
          headerTitleStyle: { fontFamily: 'KronaOne', fontSize: 16, color: '#186F71' } 
        }} 
      />
      <Stack.Screen 
        name="notifications" 
        options={{ 
          presentation: 'modal', 
          headerTitleStyle: { fontFamily: 'KronaOne', fontSize: 16, color: '#186F71' } 
        }} 
      />
    </Stack>
    {/* <TouchableOpacity 
        style={[styles.fab, { bottom: fabBottom }]} 
        onPress={handleVoicePress}
        activeOpacity={0.8}
      >
        <View style={styles.fabInner}>
          <Ionicons name="mic-outline" size={32} color="#FFFFFF" />
        </View>
      </TouchableOpacity> */}
  </View>
  </NotificationProvider>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  brandText: { 
    fontFamily: 'KronaOne', 
    color: '#186F71', 
    fontSize: 18 
  },
  headerRightContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,              
    marginRight: 15 
  },
  iconCircle: {
    width: 40,            
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2FBFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative', 
  },
  badge: {
    position: 'absolute',
    top: -2,              
    right: -2,
    backgroundColor: '#E53935',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#DDF1F9',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'OpenSans-Bold',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center', 
    zIndex: 99, 
    elevation: 8,
  },
  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 30,
    backgroundColor: '#186F71', 
    justifyContent: 'center',
    alignItems: 'center',
  },
});