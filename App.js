import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, ActivityIndicator,
  SafeAreaView, Dimensions, TouchableOpacity, Platform, StatusBar,
} from 'react-native';
import { useFonts, GreatVibes_400Regular } from '@expo-google-fonts/great-vibes';
import * as Haptics from 'expo-haptics';
import Homescreen          from './Screens/Homescreen';
import LookbookScreen      from './Screens/LookbookScreen';
import TravelCapsuleScreen from './Screens/TravelCapsuleScreen';
import SettingsScreen      from './Screens/SettingsScreen';
import ProfileSetupScreen  from './Screens/ProfileSetupScreen';
import { getUserName, getUserGender } from './utils/storage';

const { height } = Dimensions.get('window');

// Dynamic wardrobe icon based on gender
const wardrobeIcon = (gender) =>
  ({ Men: '🧥', Women: '👗', Kids: '👕' }[gender] || '👗');

export default function App() {
  const [fontsLoaded]               = useFonts({ FashionCalligraphy: GreatVibes_400Regular });
  const [appState, setAppState]     = useState('splash');
  const [userName, setUserName]     = useState('');
  const [userGender, setUserGender] = useState('Men');
  const [activeTab, setActiveTab]   = useState('home');

  useEffect(() => {
    const timer = setTimeout(async () => {
      const storedName   = await getUserName();
      const storedGender = await getUserGender();
      if (storedName) {
        setUserName(storedName);
        setUserGender(storedGender || 'Men');
        setAppState('main');
      } else {
        setAppState('profileSetup');
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleTabPress = async (key) => {
    try { await Haptics.selectionAsync(); } catch (_) {}
    setActiveTab(key);
  };

  // ── Splash ─────────────────────────────────────────────
  if (!fontsLoaded || appState === 'splash') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.welcomeWrapper}>
          <Text style={styles.welcomeSubtitle}>W E L C O M E   T O</Text>
          <Text style={styles.appTitleMain}>Outfit Styling</Text>
          <View style={styles.imageFrame}>
            <Image
              source={require('./assets/Main.png')}
              style={styles.fashionImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.footerContainer}>
            <Text style={styles.creditLabel}>App Curated by</Text>
            <Text style={styles.designerName}>Shitanshu Chokshi</Text>
            <ActivityIndicator size="small" color="#111" style={{ marginTop: 25 }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Profile Setup (first launch) ───────────────────────
  if (appState === 'profileSetup') {
    return (
      <ProfileSetupScreen
        onComplete={(name, gender) => {
          setUserName(name);
          setUserGender(gender);
          setAppState('main');
        }}
      />
    );
  }

  // ── Main App ───────────────────────────────────────────
  const TABS = [
    { key: 'home',     label: 'Wardrobe', emoji: wardrobeIcon(userGender) },
    { key: 'lookbook', label: 'Lookbook', emoji: '❤️'  },
    { key: 'capsule',  label: 'Capsule',  emoji: '✈️'  },
    { key: 'settings', label: 'Settings', emoji: '⚙️'  },
  ];

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Screens */}
      <View style={{ flex: 1 }}>
        {activeTab === 'home'     && (
          <Homescreen userName={userName} userGender={userGender} />
        )}
        {activeTab === 'lookbook' && (
          <LookbookScreen userGender={userGender} />
        )}
        {activeTab === 'capsule'  && (
          <TravelCapsuleScreen userGender={userGender} />
        )}
        {activeTab === 'settings' && (
          <SettingsScreen
            userName={userName}
            userGender={userGender}
            onResetProfile={() => {
              setAppState('profileSetup');
              setActiveTab('home');
            }}
          />
        )}
      </View>

      {/* Bottom Tab Bar — no react-native-safe-area-context needed */}
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabEmoji, !active && styles.tabEmojiInactive]}>
                {tab.emoji}
              </Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {active && <View style={styles.tabDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#FAF6F0' },
  mainWrapper: { flex: 1, backgroundColor: '#FAF6F0' },

  // ── Splash ──
  welcomeWrapper: {
    flex: 1, alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: height * 0.06,
  },
  welcomeSubtitle: {
    fontSize: 12, fontWeight: '600', color: '#8A7E72', letterSpacing: 4, marginTop: 10,
  },
  appTitleMain: {
    fontSize: 54, color: '#1A1A1A', textAlign: 'center',
    marginTop: 4, fontFamily: 'FashionCalligraphy',
  },
  imageFrame: {
    width: '85%', height: height * 0.45, borderRadius: 40,
    overflow: 'hidden', elevation: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  fashionImage:    { width: '100%', height: '100%' },
  footerContainer: { alignItems: 'center', width: '100%' },
  creditLabel: {
    fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 2, color: '#8A7E72', marginBottom: 2,
  },
  designerName: {
    fontSize: 16, fontWeight: '700',
    letterSpacing: 0.5, color: '#1A1A1A', fontFamily: 'serif',
  },

  // ── Tab Bar ──
  // FIX: uses Platform.OS directly — no react-native-safe-area-context needed
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FAF6F0',
    borderTopWidth: 1,
    borderTopColor: '#EDE8DF',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 16 : 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  tabItem:          { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabEmoji:         { fontSize: 20 },
  tabEmojiInactive: { opacity: 0.28 },
  tabLabel: {
    fontSize: 9, color: '#A3998E', marginTop: 3,
    fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase',
  },
  tabLabelActive: { color: '#1A1A1A' },
  tabDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#1A1A1A', marginTop: 3,
  },
});