import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  Modal, Alert, SafeAreaView, Dimensions, Platform, StatusBar,
  ActivityIndicator, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location    from 'expo-location';
import * as Haptics     from 'expo-haptics';
import {
  getWardrobe, addClothingItem, deleteClothingItem,
  toggleArchiveItem, saveOutfitToHistory,
  markItemsAsWorn, getActiveWornItemIds, clearWornItem,
  COOLDOWN_DAYS,
} from '../utils/storage';
import { buildSmartOutfit, UPLOAD_CATEGORIES, OUTFIT_SLOTS } from '../utils/StyleRules';
import { WEATHER_API_KEY } from '../config';

const { height, width } = Dimensions.get('window');

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

const ITEM_COLORS = ['Black','White','Navy','Grey','Beige','Brown','Red','Blue','Green','Yellow','Pink','Purple','Patterned'];

export default function Homescreen({ userName, userGender }) {
  // ── Core ─────────────────────────────────────────────
  const [wardrobe, setWardrobe]                 = useState([]);
  const [dailyOutfit, setDailyOutfit]           = useState(null);
  const [outfitSaved, setOutfitSaved]           = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState('Casual');

  // ── Laundry ──────────────────────────────────────────
  const [wornItemIds, setWornItemIds]   = useState(new Set());
  
  // ── Archive ──────────────────────────────────────────
  const [showArchive, setShowArchive]   = useState(false);

  // ── Zoom modal ───────────────────────────────────────
  const [zoomUri, setZoomUri]           = useState(null);
  const [isZoomVisible, setIsZoomVisible] = useState(false);

  // ── Upload modal ─────────────────────────────────────
  const [isUploadVisible, setIsUploadVisible] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState(null);
  const [modalStep, setModalStep]       = useState(1);
  const [tempCategory, setTempCategory] = useState(null);
  const [tempColor, setTempColor]       = useState(null);

  // ── Action modal (replaces simple delete) ────────────
  const [isActionVisible, setIsActionVisible] = useState(false);
  const [itemToAction, setItemToAction]       = useState(null);

  // ── Weather ──────────────────────────────────────────
  const [weather, setWeather]               = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    loadWardrobe();
    loadWornItems();
    fetchWeather();
  }, []);

  const loadWardrobe = async () => {
    const items = await getWardrobe();
    setWardrobe(items || []);
  };

  const loadWornItems = async () => {
    const ids = await getActiveWornItemIds();
    setWornItemIds(ids);
  };

  // ── Weather ──────────────────────────────────────────
  // Around line 84 — fetchWeather
const fetchWeather = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setWeatherLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const res  = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`);
      const data = await res.json();
      if (data.main) setWeather({ temp: Math.round(data.main.temp), condition: data.weather[0].main, city: data.name });
    } catch (_) {
      // Weather is a nice-to-have; silent fail keeps the app working
    } finally {
      setWeatherLoading(false);
    }
  };

  const weatherEmoji = (c) => ({ Clear:'☀️', Clouds:'☁️', Rain:'🌧️', Drizzle:'🌦️', Thunderstorm:'⛈️', Snow:'❄️', Mist:'🌫️', Haze:'🌫️' }[c] || '🌤️');
  const weatherTip   = (t, c) => {
    if (c === 'Rain' || c === 'Drizzle') return 'Carry an umbrella today';
    if (t > 32) return 'Light, breathable fabrics today';
    if (t > 25) return 'Perfect weather for a crisp look';
    if (t > 18) return 'A light layer works well';
    return "Layer up — it's chilly outside";
  };
  const greeting = () => { const h = new Date().getHours(); if (h < 12) return 'Good Morning'; if (h < 17) return 'Good Afternoon'; return 'Good Evening'; };

  // ── Outfit generation (haptics + laundry filter) ─────
  const generateOutfit = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (_) {}

  setOutfitSaved(false);

    const slots = OUTFIT_SLOTS[userGender] || OUTFIT_SLOTS.Men;
    // Exclude archived AND currently worn items
    const eligible = wardrobe.filter(i =>
      i.occasion === selectedOccasion && !i.archived && !wornItemIds.has(i.id)
    );

    const tops    = eligible.filter(i => slots.top.includes(i.category));
    const bottoms = eligible.filter(i => slots.bottom.includes(i.category));
    const shoes   = eligible.filter(i => slots.shoes.includes(i.category));

    if (!tops.length || !bottoms.length || !shoes.length) {
      const fmt = (cats) => cats.length === 1 ? cats[0] : cats.slice(0,-1).join(', ') + ` or ${cats[cats.length-1]}`;
      Alert.alert(
        'Wardrobe Incomplete',
        `For ${selectedOccasion} outfits, add:\n\n` +
        `• 1 ${fmt(slots.top)}\n• 1 ${fmt(slots.bottom)}\n• 1 ${fmt(slots.shoes)}\n\n` +
        (wornItemIds.size > 0 ? `(${wornItemIds.size} item(s) are currently in laundry)` : '')
      );
      return;
    }
    setDailyOutfit(buildSmartOutfit(tops, bottoms, shoes));
  };

  // ── Wear Today (Laundry basket feature) ─────────────
  const handleWearToday = async () => {
    if (!dailyOutfit) return;
    const ids = [dailyOutfit.top?.id, dailyOutfit.bottom?.id, dailyOutfit.shoes?.id].filter(Boolean);
    await markItemsAsWorn(ids);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = await getActiveWornItemIds();
    setWornItemIds(updated);
    setDailyOutfit(null);
    setOutfitSaved(false);
    Alert.alert('Outfit Logged! 🧺', `These items are in laundry for ${COOLDOWN_DAYS} days. The AI won't repeat them.`);
  };

  const handleSaveToLookbook = async () => {
    if (!dailyOutfit || outfitSaved) return;
    await saveOutfitToHistory(dailyOutfit, selectedOccasion);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOutfitSaved(true);
    Alert.alert('Saved to Lookbook! 📖', 'Check the Lookbook tab to view this outfit.');
  };

  // ── Upload flow ──────────────────────────────────────
  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert('Permission Required', 'Allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4,4], quality: 0.7,
    });
    if (!result.canceled) {
      setPendingImageUri(result.assets[0].uri);
      setModalStep(1); setTempCategory(null); setTempColor(null);
      setIsUploadVisible(true);
    }
  };

  const handleCategorySelect = (cat)   => { setTempCategory(cat);   setModalStep(2); };
  const handleColorSelect    = (color) => { setTempColor(color);    setModalStep(3); };

  const handleSaveItem = async (occasion) => {
    const updated = await addClothingItem({
      category: tempCategory, type: tempCategory,
      color: tempColor, occasion, imageUri: pendingImageUri,
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setWardrobe(updated || []);
    setIsUploadVisible(false);
    setPendingImageUri(null); setModalStep(1); setTempCategory(null); setTempColor(null);
  };

  // ── Long-press action modal ───────────────────────────
  const handleLongPress = async (item) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItemToAction(item);
    setIsActionVisible(true);
  };

  const handleToggleArchive = async () => {
    if (!itemToAction) return;
    const updated = await toggleArchiveItem(itemToAction.id);
    setWardrobe(updated || []);
    setIsActionVisible(false); setItemToAction(null);
    // If it was part of current outfit, clear it
    if (dailyOutfit) {
      const ids = [dailyOutfit.top?.id, dailyOutfit.bottom?.id, dailyOutfit.shoes?.id];
      if (ids.includes(itemToAction.id)) { setDailyOutfit(null); setOutfitSaved(false); }
    }
  };

  const handleClearLaundry = async () => {
    if (!itemToAction) return;
    await clearWornItem(itemToAction.id);
    const updated = await getActiveWornItemIds();
    setWornItemIds(updated);
    setIsActionVisible(false); setItemToAction(null);
  };

  const handleDeleteItem = async () => {
    if (!itemToAction) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const updated = await deleteClothingItem(itemToAction.id);
    setWardrobe(updated || []);
    if (dailyOutfit) {
      const ids = [dailyOutfit.top?.id, dailyOutfit.bottom?.id, dailyOutfit.shoes?.id];
      if (ids.includes(itemToAction.id)) { setDailyOutfit(null); setOutfitSaved(false); }
    }
    setIsActionVisible(false); setItemToAction(null);
  };

// ── Computed values ───────────────────────────────────
  const genderCats    = UPLOAD_CATEGORIES[userGender] || UPLOAD_CATEGORIES.Men;
  const allForOcc     = wardrobe.filter(i => i.occasion === selectedOccasion);
  const mainItems     = allForOcc.filter(i => !i.archived);
  const archivedItems = allForOcc.filter(i => i.archived);
  const displayItems  = showArchive ? archivedItems : mainItems;

  // Gender-aware empty state emoji         ← ADD THIS LINE
  const emptyStateEmoji = { Men: '🧥', Women: '👗', Kids: '👕' }[userGender] || '👗';

  // ── Render helpers ────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <Text style={styles.header}>{greeting()}, {userName} ☀️</Text>

      {/* Weather */}
      {weather ? (
        <View style={styles.weatherCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.weatherCity}>{weather.city}</Text>
            <Text style={styles.weatherTip}>{weatherTip(weather.temp, weather.condition)}</Text>
          </View>
          <View style={styles.weatherRight}>
            <Text style={styles.weatherEmoji}>{weatherEmoji(weather.condition)}</Text>
            <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
          </View>
        </View>
      ) : weatherLoading ? (
        <View style={[styles.weatherCard, { justifyContent: 'center' }]}>
          <ActivityIndicator size="small" color="#8A7E72" style={{ marginRight: 10 }} />
          <Text style={styles.weatherCity}>Fetching weather...</Text>
        </View>
      ) : null}

      {/* Occasion tabs */}
      <View style={styles.tabContainer}>
        {['Casual','Office','Party','Gym'].map(occ => (
          <TouchableOpacity
            key={occ}
            style={[styles.tab, selectedOccasion === occ && styles.activeTab]}
            onPress={() => { setSelectedOccasion(occ); setDailyOutfit(null); setOutfitSaved(false); setShowArchive(false); }}
          >
            <Text style={[styles.tabText, selectedOccasion === occ && styles.activeTabText]}>{occ}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Outfit card */}
      <View style={styles.suggestionCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{selectedOccasion} Looks</Text>
          <TouchableOpacity style={styles.generateButton} onPress={generateOutfit}>
            <Text style={styles.generateButtonText}>🪄 Style Me</Text>
          </TouchableOpacity>
        </View>

        {dailyOutfit ? (
          <>
            {/* Outfit pieces — tap to zoom */}
            <View style={styles.outfitDisplay}>
              {[dailyOutfit.top, dailyOutfit.bottom, dailyOutfit.shoes].map((piece, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <Text style={styles.plusSign}>•</Text>}
                  <TouchableOpacity
                    style={styles.outfitPiece}
                    onPress={() => { setZoomUri(piece.imageUri); setIsZoomVisible(true); }}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: piece.imageUri }} style={styles.outfitImage} />
                    {!!piece.color && <Text style={styles.colorTag}>{piece.color}</Text>}
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>

            {/* Action row: Wear Today + Save to Lookbook */}
            <View style={styles.outfitActionRow}>
              <TouchableOpacity style={styles.wearTodayBtn} onPress={handleWearToday}>
                <Text style={styles.wearTodayText}>🧺 Wear Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lookbookBtn, outfitSaved && styles.lookbookBtnSaved]}
                onPress={handleSaveToLookbook}
                disabled={outfitSaved}
              >
                <Text style={[styles.lookbookBtnText, outfitSaved && { color: '#FFF' }]}>
                  {outfitSaved ? '✓ Saved' : '❤️ Save'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.zoomHint}>Tap any piece to zoom in</Text>
          </>
        ) : (
          <Text style={styles.emptyText}>Tap 'Style Me' to synthesize your curated look.</Text>
        )}
      </View>

      {/* Collection header + archive toggle */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          {showArchive ? 'Archive' : 'Collection Manifest'}
          <Text style={styles.sectionCount}> ({displayItems.length})</Text>
        </Text>
        {archivedItems.length > 0 || showArchive ? (
          <TouchableOpacity
            style={[styles.archiveToggle, showArchive && styles.archiveToggleActive]}
            onPress={() => setShowArchive(v => !v)}
          >
            <Text style={[styles.archiveToggleText, showArchive && { color: '#FAF6F0' }]}>
              📦 {showArchive ? 'Back' : `Archive (${archivedItems.length})`}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const renderFooter = () => (
    <TouchableOpacity style={styles.addButton} onPress={pickImage}>
      <Text style={styles.addButtonText}>+ Archive New Piece</Text>
    </TouchableOpacity>
  );

  const renderCard = ({ item }) => {
    const isWorn     = wornItemIds.has(item.id);
    const isArchived = item.archived;
    return (
      <TouchableOpacity
        style={[styles.clothingCard, isWorn && styles.clothingCardWorn]}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.9}
      >
        <View>
          <Image
            source={{ uri: item.imageUri }}
            style={[styles.clothingImage, isWorn && { opacity: 0.4 }]}
          />
          {isWorn && (
            <View style={styles.laundryBadge}>
              <Text style={{ fontSize: 14 }}>🧺</Text>
            </View>
          )}
          {isArchived && (
            <View style={styles.archiveBadge}>
              <Text style={{ fontSize: 11, color: '#FAF6F0', fontWeight: '700' }}>📦</Text>
            </View>
          )}
        </View>
        <Text style={styles.itemCategory}>{item.category}</Text>
        {!!item.color && <Text style={styles.itemColor}>{item.color}</Text>}
        <Text style={styles.holdHint}>{isWorn ? 'in laundry' : 'hold to manage'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={displayItems}
        keyExtractor={(item, i) => item.id || String(i)}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        // AFTER
        ListEmptyComponent={
         <View style={styles.emptyWardrobe}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>
             {showArchive ? '📦' : emptyStateEmoji}
           </Text>
           <Text style={styles.emptyWardrobeText}>
           {showArchive
        ? 'No archived items for this occasion.'
        : `No ${selectedOccasion} pieces yet.\nTap below to add your first item.`}
    </Text>
  </View>
}
      />

      {/* ── Upload modal (3 steps) ── */}
      <Modal visible={isUploadVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.stepRow}>
              {[1,2,3].map(s => <View key={s} style={[styles.stepPill, modalStep >= s && styles.stepPillActive]} />)}
            </View>
            {modalStep === 1 && (
              <>
                <Text style={styles.modalTitle}>Categorize Piece</Text>
                {chunk(genderCats, 2).map((row, i) => (
                  <View key={i} style={styles.buttonRow}>
                    {row.map(cat => (
                      <TouchableOpacity key={cat.value} style={styles.choiceButton} onPress={() => handleCategorySelect(cat.value)}>
                        <Text style={styles.choiceText}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                    {row.length === 1 && <View style={[styles.choiceButton, { opacity: 0 }]} />}
                  </View>
                ))}
              </>
            )}
            {modalStep === 2 && (
              <>
                <Text style={styles.modalTitle}>Pick a Color</Text>
                <View style={styles.colorGrid}>
                  {ITEM_COLORS.map(color => (
                    <TouchableOpacity key={color} style={[styles.colorChip, tempColor === color && styles.colorChipActive]} onPress={() => handleColorSelect(color)}>
                      <Text style={[styles.colorChipText, tempColor === color && styles.colorChipTextActive]}>{color}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            {modalStep === 3 && (
              <>
                <Text style={styles.modalTitle}>Assign Occasion</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.choiceButton} onPress={() => handleSaveItem('Casual')}><Text style={styles.choiceText}>☕ Casual</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.choiceButton} onPress={() => handleSaveItem('Office')}><Text style={styles.choiceText}>💼 Office</Text></TouchableOpacity>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.choiceButton} onPress={() => handleSaveItem('Party')}><Text style={styles.choiceText}>🎉 Party</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.choiceButton} onPress={() => handleSaveItem('Gym')}><Text style={styles.choiceText}>🏋️ Gym</Text></TouchableOpacity>
                </View>
              </>
            )}
            <TouchableOpacity style={{ marginTop: 15 }} onPress={() => setIsUploadVisible(false)}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Action modal (archive / laundry / delete) ── */}
      <Modal visible={isActionVisible} transparent animationType="fade">
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteTitle}>
              {itemToAction?.category}{itemToAction?.color ? ` · ${itemToAction.color}` : ''}
            </Text>
            {!!itemToAction?.imageUri && (
              <Image source={{ uri: itemToAction.imageUri }} style={styles.deletePreview} />
            )}

            {wornItemIds.has(itemToAction?.id) && (
              <TouchableOpacity style={styles.actionOptionBtn} onPress={handleClearLaundry}>
                <Text style={styles.actionOptionText}>✓ Mark as Clean (Remove from Laundry)</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionOptionBtn} onPress={handleToggleArchive}>
              <Text style={styles.actionOptionText}>
                {itemToAction?.archived ? '📦 Restore from Archive' : '📦 Move to Archive'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteConfirm} onPress={handleDeleteItem}>
              <Text style={styles.deleteConfirmText}>🗑️ Remove Permanently</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ paddingVertical: 12 }}
              onPress={() => { setIsActionVisible(false); setItemToAction(null); }}
            >
              <Text style={styles.dismissText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Zoom modal (tap outfit piece) ── */}
      <Modal visible={isZoomVisible} transparent animationType="fade">
        <View style={styles.zoomOverlay}>
          <TouchableOpacity
            style={styles.zoomCloseBtn}
            onPress={() => setIsZoomVisible(false)}
          >
            <Text style={styles.zoomCloseText}>✕</Text>
          </TouchableOpacity>
          {zoomUri && (
            <Image
              source={{ uri: zoomUri }}
              style={styles.zoomImage}
              resizeMode="contain"
            />
          )}
          <Text style={styles.zoomCaption}>Pinch to zoom · Tap ✕ to close</Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#FAF6F0' },
  listContent:   { paddingBottom: 30 },
  headerWrapper: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 15 },
  columnWrapper: { paddingHorizontal: 14 },
  header:        { fontSize: 22, fontWeight: '700', marginBottom: 14, color: '#1A1A1A', letterSpacing: -0.5 },

  weatherCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFEAE2', borderRadius: 16, padding: 14, marginBottom: 16 },
  weatherCity:  { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  weatherTip:   { fontSize: 12, color: '#7A7065', marginTop: 2 },
  weatherRight: { alignItems: 'center', marginLeft: 12 },
  weatherEmoji: { fontSize: 26 },
  weatherTemp:  { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },

  tabContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  tab:          { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#EFEAE2' },
  activeTab:    { backgroundColor: '#1A1A1A' },
  tabText:      { fontWeight: '600', fontSize: 13, color: '#7A7065' },
  activeTabText:{ color: '#FAF6F0' },

  suggestionCard:    { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 24, marginBottom: 20 },
  cardHeaderRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle:         { color: '#FAF6F0', fontSize: 28, fontFamily: 'FashionCalligraphy' },
  generateButton:    { backgroundColor: '#FAF6F0', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 30 },
  generateButtonText:{ color: '#1A1A1A', fontWeight: '700', fontSize: 12 },
  outfitDisplay:     { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#262626', padding: 12, borderRadius: 16, marginBottom: 12 },
  outfitPiece:       { alignItems: 'center' },
  outfitImage:       { width: 72, height: 72, borderRadius: 12 },
  colorTag:          { color: '#A3998E', fontSize: 10, marginTop: 4, fontWeight: '600' },
  plusSign:          { color: '#FAF6F0', fontSize: 16, fontWeight: 'bold' },
  emptyText:         { color: '#A3998E', fontStyle: 'italic', fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  zoomHint:          { color: '#5A5A5A', fontSize: 10, textAlign: 'center', marginTop: 4, opacity: 0.6 },

  outfitActionRow: { flexDirection: 'row', marginBottom: 4 },
  wearTodayBtn:    { flex: 1, backgroundColor: '#2C2C2C', borderRadius: 20, paddingVertical: 10, alignItems: 'center', marginRight: 6 },
  wearTodayText:   { color: '#FAF6F0', fontWeight: '700', fontSize: 13 },
  lookbookBtn:     { flex: 1, backgroundColor: '#FAF6F0', borderRadius: 20, paddingVertical: 10, alignItems: 'center', marginLeft: 6 },
  lookbookBtnSaved:{ backgroundColor: '#4CAF50' },
  lookbookBtnText: { color: '#1A1A1A', fontWeight: '700', fontSize: 13 },

  sectionRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:       { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, color: '#5C4D3C' },
  sectionCount:       { color: '#A3998E', fontWeight: '400' },
  archiveToggle:      { backgroundColor: '#EFEAE2', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  archiveToggleActive:{ backgroundColor: '#1A1A1A' },
  archiveToggleText:  { fontSize: 11, fontWeight: '700', color: '#5C4D3C' },

  clothingCard:     { flex: 1, backgroundColor: '#FFF', margin: 6, padding: 10, borderRadius: 16, alignItems: 'center', borderColor: '#EDE8DF', borderWidth: 1 },
  clothingCardWorn: { borderColor: '#D0C8BF', borderStyle: 'dashed' },
  clothingImage:    { width: height * 0.11, height: height * 0.11, borderRadius: 12, marginBottom: 6 },
  itemCategory:     { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  itemColor:        { fontSize: 10, color: '#8A7E72', marginTop: 2 },
  holdHint:         { fontSize: 9, color: '#D0C8BF', marginTop: 4, fontStyle: 'italic' },
  laundryBadge:     { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 },
  archiveBadge:     { position: 'absolute', top: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 2 },

  emptyWardrobe:     { padding: 30, alignItems: 'center' },
  emptyWardrobeText: { color: '#A3998E', textAlign: 'center', fontSize: 14, lineHeight: 22 },

  addButton:    { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 30, alignItems: 'center', marginHorizontal: 20, marginBottom: Platform.OS === 'android' ? 25 : 15, marginTop: 10 },
  addButtonText:{ color: '#FAF6F0', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FAF6F0', padding: 25, paddingBottom: 35, borderTopLeftRadius: 32, borderTopRightRadius: 32, alignItems: 'center' },
  stepRow:        { flexDirection: 'row', marginBottom: 20 },
  stepPill:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D0C8BF', marginHorizontal: 3 },
  stepPillActive: { backgroundColor: '#1A1A1A', width: 22, borderRadius: 4 },
  modalTitle:     { fontSize: 32, color: '#1A1A1A', marginBottom: 20, fontFamily: 'FashionCalligraphy' },
  buttonRow:      { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  choiceButton:   { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginHorizontal: 6, alignItems: 'center', borderColor: '#E6DFD5', borderWidth: 1 },
  choiceText:     { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  colorGrid:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%', marginBottom: 10 },
  colorChip:      { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, backgroundColor: '#FFF', borderColor: '#E6DFD5', borderWidth: 1, margin: 4 },
  colorChipActive:{ backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  colorChipText:  { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  colorChipTextActive:{ color: '#FAF6F0' },
  dismissText:    { color: '#999', fontSize: 14 },

  deleteOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  deleteModal:       { backgroundColor: '#FAF6F0', borderRadius: 28, padding: 24, alignItems: 'center', width: '100%' },
  deleteTitle:       { fontSize: 24, fontFamily: 'FashionCalligraphy', color: '#1A1A1A', marginBottom: 14 },
  deletePreview:     { width: 100, height: 100, borderRadius: 14, marginBottom: 16 },
  actionOptionBtn:   { backgroundColor: '#EFEAE2', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, width: '100%', alignItems: 'center', marginBottom: 10 },
  actionOptionText:  { color: '#1A1A1A', fontWeight: '600', fontSize: 14 },
  deleteConfirm:     { backgroundColor: '#C0392B', borderRadius: 30, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  deleteConfirmText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  zoomOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  zoomImage:     { width: width, height: width, },
  zoomCloseBtn:  { position: 'absolute', top: 56, right: 24, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  zoomCloseText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  zoomCaption:   { position: 'absolute', bottom: 60, color: 'rgba(255,255,255,0.4)', fontSize: 12 },
});