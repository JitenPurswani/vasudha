import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import Logo from '@/assets/images/logo.svg';
import { AppText } from '@/components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AuthLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerSection}>
        <Logo width={30} height={30} />
        <AppText variant="header" style={styles.logoText}>Vasudha</AppText>
      </View>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DDF1F9',
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    marginTop: 20,
    marginBottom: 10,
    gap: 10,
  },
  logoText: {
    fontSize: 16,
    color: '#186F71',
  },
});