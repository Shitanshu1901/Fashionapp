import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Platform, StatusBar, Image, ScrollView, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { getWardrobe, getActiveWornItemIds } from '../utils/storage';
import { OUTFIT_SLOTS, NEUTRAL_COLORS, areColorsHarmonious } from '../utils/StyleRules';

const OCCASIONS = [
  { key: 'Casual', label: '☕ Casual' },
  { key: 'Office', label: '💼 Office' },
  { key: 'Party',  label: '🎉 Party'  },
  { key: 'Gym',    label: '🏋️ Gym'   },
];

const sortByNeutrality = (arr) =>
  [...arr].sort((a, b) => {
    const aN = NEUTRAL_COLORS.includes(a.color) ? 0 : 1;
    const bN = NEUTRAL_COLORS.includes(b.color) ? 0 : 1;
    return aN - bN;
  });

const buildCapsule = (wardrobe, userGender, occasion, days, wornIds) => {
  const slots = OUTFIT_SLOTS[userGender] || OUTFIT_SLOTS.Men;
  const pool  = wardrobe.filter(i =>
    i.occasion === occasion && !i.archived && !wornIds.has(i.id)
  );

  const tops    = pool.filter(i => slots.top.includes(i.category));
  const bottoms = pool.filter(i => slots.bottom.includes(i.category));
  const shoes   = pool.filter(i => slots.shoes.includes(i.category));

  if (!tops.length || !bottoms.length || !shoes.length) return null;

  // Pick most neutral bottoms (2 max)
  const capsuleBottoms = sortByNeutrality(bottoms).slice(0, 2);
  // Pick most neutral shoe
  const capsuleShoe = sortByNeutrality(shoes)[0];

  // Pick tops that harmonize with at least one chosen bottom
  const validTops = sortByNeutrality(
    tops.filter(top => capsuleBottoms.some(b => areColorsHarmonious(top.color, b.color)))
  );
  // Fallback: use any tops if no harmonious ones found
  const topPool = validTops.length ? validTops : sortByNeutrality(tops);
  const capsuleTops = topPool.slice(0, Math.max(days, 2));

  const totalPieces   = capsuleTops.length + capsuleBottoms.length + 1;
  const combinations  = capsuleTops.length * capsuleBottoms.length;

  return { tops: capsuleTops, bottoms: capsuleBottoms, shoe: capsuleShoe, totalPieces, combinations };
};

export default function TravelCapsuleScreen({ userGender }) {
  const [selectedOccasion, setSelectedOccasion] = useState('Casual');
  const [days, setDays]           = useState(4);
  const [capsule, setCapsule]     = useState(null);
  const [wardrobe, setWardrobe]   = useState([]);
  const [wornIds, setWornIds]     = useState(new Set());

  useEffect(() => {
    const load = async () => {
      const [wb, worn] = await Promise.all([getWardrobe(), getActiveWornItemIds()]);
      setWardrobe(wb || []);
      setWornIds(worn);
    };
    load();
  }, []);

  const generate = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (_) {}
  
    const result = buildCapsule(wardrobe, userGender, selectedOccasion, days, wornIds);
    if (!result) {
      Alert.alert('Not Enough Items', `Add more ${selectedOccasion} clothes to generate a travel capsule.`);
      return;
    }
    setCapsule(result);
  };

  const ImageRow = ({ items, label }) => (
    <View style={styles.capsuleRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
        {items.map((item, i) => (
          <View key={i} style={styles.capsuleItem}>
            <Image source={{ uri: item.imageUri }} style={styles.capsuleImage} />
            <Text style={styles.capsuleCat}>{item.category}</Text>
            {!!item.color && <Text style={styles.capsuleColor}>{item.color}</Text>}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Travel{'\n'}Capsule</Text>
        <Text style={styles.subheader}>Pack smarter, not more.</Text>

        {/* Occasion picker */}
        <Text style={styles.label}>OCCASION</Text>
        <View style={styles.occasionRow}>
          {OCCASIONS.map(occ => (
            <TouchableOpacity
              key={occ.key}
              style={[styles.occChip, selectedOccasion === occ.key && styles.occChipActive]}
              onPress={() => { setSelectedOccasion(occ.key); setCapsule(null); }}
            >
              <Text style={[styles.occChipText, selectedOccasion === occ.key && { color: '#FAF6F0' }]}>
                {occ.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Days picker */}
        <Text style={styles.label}>TRIP LENGTH</Text>
        <View style={styles.daysRow}>
          <TouchableOpacity
            style={styles.dayBtn}
            onPress={() => { if (days > 1) { setDays(d => d - 1); setCapsule(null); } }}
          >
            <Text style={styles.dayBtnText}>−</Text>
          </TouchableOpacity>
          <View style={styles.daysDisplay}>
            <Text style={styles.daysNumber}>{days}</Text>
            <Text style={styles.daysUnit}>days</Text>
          </View>
          <TouchableOpacity
            style={styles.dayBtn}
            onPress={() => { if (days < 14) { setDays(d => d + 1); setCapsule(null); } }}
          >
            <Text style={styles.dayBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Generate button */}
        <TouchableOpacity style={styles.generateBtn} onPress={generate}>
          <Text style={styles.generateBtnText}>✈️ Build My Capsule</Text>
        </TouchableOpacity>

        {/* Results */}
        {capsule && (
          <View style={styles.results}>
            {/* Summary card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{capsule.totalPieces}</Text>
                <Text style={styles.summaryLabel}>PIECES</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{capsule.combinations}</Text>
                <Text style={styles.summaryLabel}>OUTFITS</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{days}</Text>
                <Text style={styles.summaryLabel}>DAYS</Text>
              </View>
            </View>

            <Text style={styles.resultsCaption}>
              These {capsule.totalPieces} pieces create {capsule.combinations} outfit combinations —
              more than enough for your {days}-day trip.
            </Text>

            <ImageRow items={capsule.tops}    label={`👕 Tops (${capsule.tops.length})`} />
            <ImageRow items={capsule.bottoms} label={`👖 Bottoms (${capsule.bottoms.length})`} />
            <ImageRow items={[capsule.shoe]}  label="👟 Shoes (1 pair)" />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  inner: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 15,
  },
  header:   { fontSize: 44, fontFamily: 'FashionCalligraphy', color: '#1A1A1A', lineHeight: 52, marginBottom: 4 },
  subheader:{ fontSize: 13, color: '#8A7E72', marginBottom: 28 },
  label:    { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: '#8A7E72', marginBottom: 12 },

  occasionRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 28 },
  occChip:     { backgroundColor: '#EFEAE2', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 14, margin: 4 },
  occChipActive:{ backgroundColor: '#1A1A1A' },
  occChipText: { fontSize: 13, fontWeight: '600', color: '#5C4D3C' },

  daysRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  dayBtn:      { width: 52, height: 52, backgroundColor: '#EFEAE2', borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  dayBtnText:  { fontSize: 24, fontWeight: '300', color: '#1A1A1A' },
  daysDisplay: { alignItems: 'center', marginHorizontal: 30 },
  daysNumber:  { fontSize: 52, fontWeight: '800', color: '#1A1A1A', lineHeight: 60 },
  daysUnit:    { fontSize: 12, color: '#8A7E72', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },

  generateBtn:     { backgroundColor: '#1A1A1A', borderRadius: 30, paddingVertical: 18, alignItems: 'center', marginBottom: 28 },
  generateBtnText: { color: '#FAF6F0', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  results:         { },
  summaryCard:     { backgroundColor: '#1A1A1A', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 14 },
  summaryItem:     { alignItems: 'center' },
  summaryNum:      { fontSize: 36, fontWeight: '800', color: '#FAF6F0' },
  summaryLabel:    { fontSize: 10, color: '#8A7E72', fontWeight: '700', letterSpacing: 1 },
  summaryDivider:  { width: 1, height: 40, backgroundColor: '#333' },
  resultsCaption:  { fontSize: 13, color: '#7A7065', lineHeight: 20, marginBottom: 24, textAlign: 'center' },

  capsuleRow:   { marginBottom: 24 },
  rowLabel:     { fontSize: 12, fontWeight: '700', color: '#1A1A1A', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  rowScroll:    { },
  capsuleItem:  { width: 110, marginRight: 12, backgroundColor: '#FFF', borderRadius: 16, padding: 10, alignItems: 'center', borderColor: '#EDE8DF', borderWidth: 1 },
  capsuleImage: { width: 88, height: 88, borderRadius: 10, marginBottom: 6 },
  capsuleCat:   { fontSize: 11, fontWeight: '700', color: '#1A1A1A' },
  capsuleColor: { fontSize: 10, color: '#8A7E72', marginTop: 2 },
});