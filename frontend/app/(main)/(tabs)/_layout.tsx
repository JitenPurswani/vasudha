
import { Tabs } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CropIcon from '../../../assets/images/crop.svg';
import HomeIcon from '../../../assets/images/home.svg';
import MarketIcon from '../../../assets/images/market.svg';
import FertilizerIcon from '../../../assets/images/fertilizericon.svg';

function TabItem({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.tabItemContainer}>
      {focused && <View style={styles.topIndicator} />}
      <View style={styles.iconWrapper}>{children}</View>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex:1 }}>
    <Tabs
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#BDDBE8',
          height: 60 + insets.bottom,
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: '#186F71',
        tabBarInactiveTintColor: '#186F71',
        tabBarLabelStyle: { 
          fontSize: 12, 
          fontFamily: 'OpenSans-SemiBold',
          marginBottom: insets.bottom > 0 ? insets.bottom : 10 
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabItem focused={focused}>
              <HomeIcon width={23} height={23} fill={color} />
            </TabItem>
          ),
        }}
      />
      <Tabs.Screen
        name="crop"
        options={{
          title: 'Crop',
          tabBarIcon: ({ focused, color }) => (
            <TabItem focused={focused}>
              <CropIcon width={24} height={24} fill={color} />
            </TabItem>
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ focused, color }) => (
            <TabItem focused={focused}>
              <MarketIcon width={24} height={24} fill={color} />
            </TabItem>
          ),
        }}
      />
      <Tabs.Screen
        name="fertilizer"
        options={{
          title: 'Fertilizer',
          tabBarIcon: ({ focused, color }) => (
            <TabItem focused={focused}>
              <FertilizerIcon width={30} height={30} fill={color}/>
            </TabItem>
          ),
        }}
      />
    </Tabs>
      </View>
  );
}

const styles = StyleSheet.create({
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  topIndicator: {
    position: 'absolute',
    top: -5, 
    height: 4, 
    width: '180%',
    borderRadius: 10,
    backgroundColor: '#186F71',
  },
  iconWrapper: {
    marginTop: 10, 
  },

});