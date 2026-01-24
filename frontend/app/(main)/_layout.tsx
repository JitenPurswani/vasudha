import Logo from '@/assets/images/logo.svg';
import NotificationsIcon from '@/assets/images/notifications.svg';
import ProfileIcon from '@/assets/images/profile.svg';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
            <TouchableOpacity onPress={() => router.push('/(main)/notifications')}>
              <View style={styles.iconCircle}>
              <NotificationsIcon width={24} height={24} />
              </View>
            </TouchableOpacity>
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
    gap: 15, 
    marginRight: 15 
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2FBFF',
    justifyContent: 'center',
    alignItems: 'center',
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