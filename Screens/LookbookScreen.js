import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet, SafeAreaView,
  Platform, StatusBar, TouchableOpacity, Modal, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { getOutfitHistory, toggleFavoriteOutfit, getWardrobe } from '../utils/storage';
import { areColorsHarmonious } from '../utils/StyleRules';

const OCCASION_COLORS = {
  Casual: '#EFEAE2', Office: '#E8EFF9', Party: '#F9E8F3', Gym: '#E8F9EA',
};
const ITEM_COLORS = [
  'Black','White','Navy','Grey','Beige','Brown',
  'Red','Blue','Green','Yellow','Pink','Purple','Patterned',
];

export default function LookbookScreen({ userGender }) {
  const [history, setHistory]           = useState([]);
  const [stealVisible, setStealVisible] = useState(false);
  const [showFavOnly, setShowFavOnly]   = useState(false);
  const [refPhoto, setRefPhoto]         = useState(null);
  const [pickedColors, setPickedColors] = useState([]);
  const [matchResults, setMatchResults] = useState(null);
  const [wardrobe, setWardrobe]         = useState([]);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    const h = await getOutfitHistory();
    setHistory(h);
  };

  const handleFavorite = async (id) => {
    try { await Haptics.selectionAsync(); } catch (_) {}
    const updated = await toggleFavoriteOutfit(id);
    setHistory(updated);
  };

  const openStealLook = async () => {
    const wb = await getWardrobe();
    setWardrobe(wb.filter(i => !i.archived));
    setRefPhoto(null); setPickedColors([]); setMatchResults(null);
    setStealVisible(true);
  };

  const pickRefPhoto = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 5], quality: 0.7,
    });
    if (!result.canceled) {
      setRefPhoto(result.assets[0].uri);
      setPickedColors([]); setMatchResults(null);
    }
  };

  const togglePickedColor = (color) => {
    setPickedColors(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : prev.length < 3 ? [...prev, color] : prev
    );
    setMatchResults(null);
  };

  const findMatches = () => {
    if (!pickedColors.length) {
      Alert.alert('Pick Colors', 'Select 1–3 dominant colors from the reference photo.');
      return;
    }
    const matches = wardrobe.filter(item =>
      item.color && pickedColors.some(c => areColorsHarmonious(item.color, c))
    );
    setMatchResults(matches);
  };

  const getPieces = (outfit) => {
    if (!outfit) return [null, null, null];
    const top   = outfit.top    || outfit.shirt;
    const bot   = outfit.bottom || outfit.pants;
    const shoe  = outfit.shoes;
    if (outfit.isFull) return [top, null, shoe];
    return [top, bot, shoe];
  };

  const displayHistory = showFavOnly ? history.filter(h => h.favorited) : history;

  const renderHistoryItem = ({ item }) => {
    const [top, bot, shoe] = getPieces(item.outfit);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: OCCASION_COLORS[item.occasion] || '#EFEAE2' }]}>
            <Text style={styles.badgeText}>{item.occasion}</Text>
          </View>
          <Text style={styles.dateText}>{item.date}</Text>
          <TouchableOpacity onPress={() => handleFavorite(item.id)} style={styles.heartBtn}>
            <Text style={{ fontSize: 20 }}>{item.favorited ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.outfitRow}>
          {[top, bot, shoe].map((piece, idx) => (
            <View key={idx} style={[styles.pieceWrapper, !piece && { opacity: 0 }]}>
              {piece?.imageUri
                ? <Image source={{ uri: piece.imageUri }} style={styles.pieceImage} />
                : <View style={styles.piecePlaceholder} />}
              {!!piece?.color    && <Text style={styles.pieceColor}>{piece.color}</Text>}
              {!!piece?.subCategory && <Text style={styles.pieceCategory}>{piece.subCategory}</Text>}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={displayHistory}
        keyExtractor={item => item.id}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.header}>Lookbook</Text>
            <Text style={styles.subheader}>Your curated outfit history</Text>
            <View style={styles.lookbookActions}>
              <TouchableOpacity
                style={[styles.actionChip, showFavOnly && styles.actionChipActive]}
                onPress={() => setShowFavOnly(v => !v)}
              >
                <Text style={[styles.actionChipText, showFavOnly && { color: '#FAF6F0' }]}>
                  ❤️ {showFavOnly ? 'Favourites only' : 'Favourites'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stealBtn} onPress={openStealLook}>
                <Text style={styles.stealBtnText}>📸 Steal the Look</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 64, marginBottom: 20 }}>{showFavOnly ? '🤍' : '📖'}</Text>
            <Text style={styles.emptyTitle}>
              {showFavOnly ? 'No Favourites Yet' : 'Your Lookbook is Empty'}
            </Text>
            <Text style={styles.emptySubtext}>
              {showFavOnly
                ? 'Tap ❤️ on any saved outfit to favourite it.'
                : 'Generate an outfit on the Wardrobe tab and tap ❤️ Save.'}
            </Text>
          </View>
        }
      />

      {/* ── Steal the Look modal ── */}
      <Modal visible={stealVisible} animationType="slide">
        <SafeAreaView style={styles.stealContainer}>
          <View style={styles.stealHeader}>
            <Text style={styles.stealTitle}>Steal the Look</Text>
            <TouchableOpacity onPress={() => setStealVisible(false)}>
              <Text style={styles.stealClose}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={matchResults || []}
            keyExtractor={(item, i) => item.id || String(i)}
            numColumns={3}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            ListHeaderComponent={
              <View>
                <TouchableOpacity style={styles.refPhotoBox} onPress={pickRefPhoto}>
                  {refPhoto
                    ? <Image source={{ uri: refPhoto }} style={styles.refPhoto} />
                    : (
                      <>
                        <Text style={{ fontSize: 40 }}>📸</Text>
                        <Text style={styles.refPhotoHint}>Tap to upload a reference photo</Text>
                        <Text style={[styles.refPhotoHint, { fontSize: 11, marginTop: 4 }]}>
                          Screenshot from Instagram, Pinterest, etc.
                        </Text>
                      </>
                    )}
                </TouchableOpacity>

                {!!refPhoto && (
                  <>
                    <Text style={styles.stealStep}>What colors do you see in this look?</Text>
                    <Text style={[styles.stealStep, { fontSize: 11, color: '#A3998E', marginTop: 2, marginBottom: 10 }]}>
                      Pick up to 3 dominant colors
                    </Text>
                    <View style={styles.colorGrid}>
                      {ITEM_COLORS.map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[styles.colorChip, pickedColors.includes(color) && styles.colorChipActive]}
                          onPress={() => togglePickedColor(color)}
                        >
                          <Text style={[styles.colorChipText, pickedColors.includes(color) && { color: '#FAF6F0' }]}>
                            {color}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity style={styles.findMatchesBtn} onPress={findMatches}>
                      <Text style={styles.findMatchesBtnText}>
                        🔍 Find Matches in My Wardrobe
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {matchResults !== null && (
                  <Text style={styles.stealStep}>
                    {matchResults.length > 0
                      ? `Found ${matchResults.length} matching pieces:`
                      : 'No items match these colors yet — add more clothes!'}
                  </Text>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.matchCard}>
                <Image source={{ uri: item.imageUri }} style={styles.matchImage} />
                <Text style={styles.matchCat} numberOfLines={1}>
                  {item.subCategory || item.category}
                </Text>
                {!!item.color && <Text style={styles.matchColor}>{item.color}</Text>}
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#FAF6F0' },
  listContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 15, paddingBottom: 30 },
  headerBlock: { marginBottom: 20 },
  header:      { fontSize: 38, fontFamily: 'FashionCalligraphy', color: '#1A1A1A', marginBottom: 2 },
  subheader:   { fontSize: 13, color: '#8A7E72', marginBottom: 16 },

  lookbookActions: { flexDirection: 'row', marginBottom: 4 },
  actionChip:      { backgroundColor: '#EFEAE2', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, marginRight: 8 },
  actionChipActive:{ backgroundColor: '#1A1A1A' },
  actionChipText:  { fontSize: 12, fontWeight: '700', color: '#5C4D3C' },
  stealBtn:        { backgroundColor: '#1A1A1A', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14 },
  stealBtnText:    { fontSize: 12, fontWeight: '700', color: '#FAF6F0' },

  card:       { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 14, borderColor: '#EDE8DF', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  badge:      { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginRight: 8 },
  badgeText:  { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  dateText:   { flex: 1, fontSize: 12, color: '#8A7E72' },
  heartBtn:   { padding: 4 },

  outfitRow:        { flexDirection: 'row', justifyContent: 'space-around' },
  pieceWrapper:     { alignItems: 'center', flex: 1 },
  pieceImage:       { width: 82, height: 82, borderRadius: 12, marginBottom: 5 },
  piecePlaceholder: { width: 82, height: 82, borderRadius: 12, backgroundColor: '#EFEAE2', marginBottom: 5 },
  pieceColor:       { fontSize: 10, color: '#8A7E72', fontWeight: '600' },
  pieceCategory:    { fontSize: 9, color: '#C0B8B0', marginTop: 1 },

  emptyState:   { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyTitle:   { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  emptySubtext: { fontSize: 14, color: '#8A7E72', textAlign: 'center', lineHeight: 24 },

  stealContainer: { flex: 1, backgroundColor: '#FAF6F0' },
  stealHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EDE8DF' },
  stealTitle:     { fontSize: 28, fontFamily: 'FashionCalligraphy', color: '#1A1A1A' },
  stealClose:     { fontSize: 14, color: '#999', fontWeight: '600' },
  refPhotoBox:    { height: 200, backgroundColor: '#EFEAE2', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  refPhoto:       { width: '100%', height: '100%' },
  refPhotoHint:   { fontSize: 13, color: '#8A7E72', marginTop: 10, fontWeight: '600' },
  stealStep:      { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  colorGrid:       { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  colorChip:       { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#FFF', borderColor: '#E6DFD5', borderWidth: 1, margin: 3 },
  colorChipActive: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  colorChipText:   { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },

  findMatchesBtn:     { backgroundColor: '#1A1A1A', borderRadius: 20, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  findMatchesBtnText: { color: '#FAF6F0', fontWeight: '700', fontSize: 14 },

  matchCard:  { flex: 1, margin: 4, backgroundColor: '#FFF', borderRadius: 12, padding: 8, alignItems: 'center', borderColor: '#EDE8DF', borderWidth: 1 },
  matchImage: { width: '100%', aspectRatio: 1, borderRadius: 8, marginBottom: 5 },
  matchCat:   { fontSize: 9, fontWeight: '700', color: '#1A1A1A' },
  matchColor: { fontSize: 9, color: '#8A7E72' },
});