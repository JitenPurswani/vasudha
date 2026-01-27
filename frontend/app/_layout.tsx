import '@/i18n';
import { AnekGujarati_700Bold } from '@expo-google-fonts/anek-gujarati';
import {
  AnekMalayalam_700Bold
} from '@expo-google-fonts/anek-malayalam';
import {
  AnekTamil_400Regular,
  AnekTamil_600SemiBold
} from '@expo-google-fonts/anek-tamil';
import { KronaOne_400Regular } from '@expo-google-fonts/krona-one';
import {
  MuktaMalar_700Bold
} from '@expo-google-fonts/mukta-malar';
import {
  NotoSansBengali_400Regular,
  NotoSansBengali_600SemiBold,
  NotoSansBengali_700Bold
} from '@expo-google-fonts/noto-sans-bengali';
import { NotoSansGujarati_400Regular, NotoSansGujarati_800ExtraBold } from '@expo-google-fonts/noto-sans-gujarati';
import {
  OpenSans_400Regular,
  OpenSans_600SemiBold,
  OpenSans_700Bold
} from '@expo-google-fonts/open-sans';
import {
  Poppins_400Regular,
  Poppins_600SemiBold
} from '@expo-google-fonts/poppins';

import { NotoSansGurmukhi_400Regular, NotoSansGurmukhi_600SemiBold, NotoSansGurmukhi_700Bold } from '@expo-google-fonts/noto-sans-gurmukhi';
import { NotoSansKannada_400Regular, NotoSansKannada_600SemiBold, NotoSansKannada_700Bold } from '@expo-google-fonts/noto-sans-kannada';
import {
  NotoSansMalayalam_400Regular,
  NotoSansMalayalam_700Bold
} from '@expo-google-fonts/noto-sans-malayalam';
import {
  NotoSansTelugu_400Regular, NotoSansTelugu_600SemiBold, NotoSansTelugu_700Bold
} from '@expo-google-fonts/noto-sans-telugu';
import { YatraOne_400Regular } from '@expo-google-fonts/yatra-one';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { CropProvider } from '@/context/CropContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'KronaOne': KronaOne_400Regular,
    'OpenSans': OpenSans_400Regular,
    'OpenSans-SemiBold': OpenSans_600SemiBold,
    'OpenSans-Bold': OpenSans_700Bold,
    'YatraOne': YatraOne_400Regular,
    'Poppins': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'MuktaMalar': MuktaMalar_700Bold,
    'AnekTamil-Regular': AnekTamil_400Regular,
    'AnekTamil-Bold': AnekTamil_600SemiBold,
    'NotoSansGujarati-Regular': NotoSansGujarati_400Regular,
    'NotoSansGujarati-Bold': NotoSansGujarati_800ExtraBold,
    'AnekGujarati': AnekGujarati_700Bold,
    'NotoSansBengali-SemiBold': NotoSansBengali_600SemiBold,
    'NotoSansBengali-Regular': NotoSansBengali_400Regular,
    'NotoSansBengali-Bold': NotoSansBengali_700Bold,
    'AnekMalayalam-Bold': AnekMalayalam_700Bold,
    'NotoSansMalayalam-Regular': NotoSansMalayalam_400Regular,
    'NotoSansMalayalam-Bold': NotoSansMalayalam_700Bold,
    'NotoSansTelugu-Regular': NotoSansTelugu_400Regular,
    'NotoSansTelugu-SemiBold': NotoSansTelugu_600SemiBold,
    'NotoSansTelugu-Bold': NotoSansTelugu_700Bold,
    'NotoSansKannada-Regular': NotoSansKannada_400Regular,
    'NotoSansKannada-SemiBold': NotoSansKannada_600SemiBold,
    'NotoSansKannada-Bold': NotoSansKannada_700Bold,
    'NotoSansGurmukhi-Regular': NotoSansGurmukhi_400Regular,
    'NotoSansGurmukhi-SemiBold': NotoSansGurmukhi_600SemiBold,
    'NotoSansGurmukhi-Bold': NotoSansGurmukhi_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }
  return (
    <AuthProvider>
      <CropProvider>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
          </Stack>
        </SafeAreaProvider>
      </CropProvider>
    </AuthProvider>
  );
}