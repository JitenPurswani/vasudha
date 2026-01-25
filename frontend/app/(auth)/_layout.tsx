import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import Logo from '@/assets/images/logo.svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AuthLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerSection}>
        <Logo width={30} height={30} />
        <Text style={styles.logoText}>Vasudha</Text>
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
    fontFamily: 'KronaOne'
  },
});