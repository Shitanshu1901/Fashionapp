import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  Modal, Alert, SafeAreaView, Dimensions, Platform, StatusBar,
  ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location    from 'expo-location';
import * as Haptics     from 'expo-haptics';
import {
  getWardrobe, addClothingItem, deleteClothingItem,
  toggleArchiveItem, saveOutfitToHistory,
  markItemsAsWorn, getActiveWornItemIds, clearWornItem,
  updateClothingItem, runMigrationIfNeeded, COOLDOWN_DAYS,
} from '../utils/storage';
import {
  buildSmartOutfit, UPLOAD_CATEGORIES, OUTFIT_SLOTS, ITEM_COLORS,
} from '../utils/StyleRules';
import { WEATHER_API_KEY } from '../config';

const { height, width } = Dimensions.get('window');
const OCCASIONS  = ['Casual', 'Office', 'Party', 'Gym'];
const OCC_ICONS  = { Casual: '☕', Office: '💼', Party: '🎉', Gym: '🏋️' };

export default function Homescreen({ userName, userGender }) {

  // ── Core ──────────────────────────────────────────────────────────
  const [wardrobe, setWardrobe]                 = useState([]);
  const [dailyOutfit, setDailyOutfit]           = useState(null);
  const [outfitSaved, setOutfitSaved]           = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState('Casual');
  const [wornItemIds, setWornItemIds]           = useState(new Set());
  const [showArchive, setShowArchive]           = useState(false);

  // ── Zoom ──────────────────────────────────────────────────────────
  const [zoomUri, setZoomUri]             = useState(null);
  const [isZoomVisible, setIsZoomVisible] = useState(false);

  // ── Upload modal (2-step) ─────────────────────────────────────────
  const [isUploadVisible, setIsUploadVisible] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState(null);
  const [uploadStep, setUploadStep]           = useState(1);
  const [openGroup, setOpenGroup]             = useState(null);
  const [tempSubCat, setTempSubCat]           = useState(null);
  const [tempSlot, setTempSlot]               = useState(null);
  const [tempColor, setTempColor]             = useState(null);
  const [tempOccasions, setTempOccasions]     = useState([]);
  const [tempNotes, setTempNotes]             = useState('');

  // ── Action modal (long-press) ─────────────────────────────────────
  const [isActionVisible, setIsActionVisible] = useState(false);
  const [itemToAction, setItemToAction]       = useState(null);

  // ── Notes edit modal ──────────────────────────────────────────────
  const [isNotesVisible, setIsNotesVisible] = useState(false);
  const [editingItemId, setEditingItemId]   = useState(null);
  const [editingNotes, setEditingNotes]     = useState('');

  // ── Re-tag modal ──────────────────────────────────────────────────
  const [isRetagVisible, setIsRetagVisible]   = useState(false);
  const [retagItemId, setRetagItemId]         = useState(null);
  const [retagOpenGroup, setRetagOpenGroup]   = useState(null);
  const [retagSubCat, setRetagSubCat]         = useState(null);
  const [retagSlot, setRetagSlot]             = useState(null);
  const [retagOccasions, setRetagOccasions]   = useState([]);

  // ── Weather ───────────────────────────────────────────────────────
  const [weather, setWeather]               = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await runMigrationIfNeeded();
      await loadWardrobe();
      await loadWornItems();
      fetchWeather();
    };
    init();
  }, []);

  const loadWardrobe = async () => {
    const items = await getWardrobe();
    setWardrobe(items || []);
  };

  const loadWornItems = async () => {
    const ids = await getActiveWornItemIds();
    setWornItemIds(ids);
  };

  // ── Weather ───────────────────────────────────────────────────────
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
    } finally { setWeatherLoading(false); }
  };

  const weatherEmoji = (c) => ({ Clear:'☀️',Clouds:'☁️',Rain:'🌧️',Drizzle:'🌦️',Thunderstorm:'⛈️',Snow:'❄️',Mist:'🌫️',Haze:'🌫️' }[c] || '🌤️');
  const weatherTip = (t, c) => {
    if (c === 'Rain' || c === 'Drizzle') return 'Carry an umbrella today';
    if (t > 32) return 'Light, breathable fabrics recommended';
    if (t > 25) return 'Perfect weather for a crisp look';
    if (t > 18) return 'A light layer works well today';
    return "Layer up — it's chilly outside";
  };
  const greeting = () => { const h = new Date().getHours(); if (h < 12) return 'Good Morning'; if (h < 17) return 'Good Afternoon'; return 'Good Evening'; };

  // ── Outfit generation ─────────────────────────────────────────────
  const generateOutfit = async () => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
    setOutfitSaved(false);

    const eligible = wardrobe.filter(i => !i.archived && !wornItemIds.has(i.id));
    const result   = buildSmartOutfit(eligible, selectedOccasion, userGender, weather);

    if (!result) {
      Alert.alert(
        'Wardrobe Incomplete',
        `Not enough items tagged for "${selectedOccasion}".\n\n` +
        `Add at least 1 top, 1 bottom, and 1 pair of shoes for this occasion.` +
        (wornItemIds.size > 0 ? `\n\n(${wornItemIds.size} item(s) are in laundry)` : '')
      );
      return;
    }
    setDailyOutfit(result);
  };

  const handleWearToday = async () => {
    if (!dailyOutfit) return;
    const ids = [dailyOutfit.top?.id, dailyOutfit.bottom?.id, dailyOutfit.shoes?.id].filter(Boolean);
    await markItemsAsWorn(ids);
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
    setWornItemIds(await getActiveWornItemIds());
    setDailyOutfit(null); setOutfitSaved(false);
    Alert.alert('Outfit Logged! 🧺', `These items are in laundry for ${COOLDOWN_DAYS} days.`);
  };

  const handleSaveToLookbook = async () => {
    if (!dailyOutfit || outfitSaved) return;
    await saveOutfitToHistory(dailyOutfit, selectedOccasion);
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
    setOutfitSaved(true);
    Alert.alert('Saved to Lookbook! 📖', 'Check the Lookbook tab to view this outfit.');
  };

  // ── Upload flow ───────────────────────────────────────────────────
  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert('Permission Required', 'Allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 4], quality: 0.7,
    });
    if (!result.canceled) {
      setPendingImageUri(result.assets[0].uri);
      setUploadStep(1); setOpenGroup(null); setTempSubCat(null);
      setTempSlot(null); setTempColor(null); setTempOccasions([]); setTempNotes('');
      setIsUploadVisible(true);
    }
  };

  const handleSubCatSelect = (subCat, slot, group) => {
    setTempSubCat(subCat); setTempSlot(slot);
    setOpenGroup(group); setTempColor(null);
  };

  const toggleTempOccasion = (occ) => {
    setTempOccasions(prev =>
      prev.includes(occ) ? prev.filter(o => o !== occ) : [...prev, occ]
    );
  };

  const handleSaveItem = async () => {
    if (!tempOccasions.length) {
      Alert.alert('Select Occasion', 'Pick at least one occasion.');
      return;
    }
    const updated = await addClothingItem({
      subCategory: tempSubCat,
      category:    tempSlot === 'top' ? 'Top' : tempSlot === 'bottom' ? 'Pants' : tempSlot === 'shoes' ? 'Shoes' : tempSubCat,
      slot:        tempSlot,
      color:       tempColor,
      occasions:   tempOccasions,
      notes:       tempNotes,
      imageUri:    pendingImageUri,
    });
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
    setWardrobe(updated || []);
    setIsUploadVisible(false);
    setPendingImageUri(null); setTempSubCat(null); setTempSlot(null);
    setTempColor(null); setTempOccasions([]); setTempNotes(''); setOpenGroup(null);
  };

  // ── Long-press action ─────────────────────────────────────────────
  const handleLongPress = async (item) => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
    setItemToAction(item); setIsActionVisible(true);
  };

  const handleToggleArchive = async () => {
    if (!itemToAction) return;
    const updated = await toggleArchiveItem(itemToAction.id);
    setWardrobe(updated || []);
    if (dailyOutfit) {
      const ids = [dailyOutfit.top?.id, dailyOutfit.bottom?.id, dailyOutfit.shoes?.id];
      if (ids.includes(itemToAction.id)) { setDailyOutfit(null); setOutfitSaved(false); }
    }
    setIsActionVisible(false); setItemToAction(null);
  };

  const handleClearLaundry = async () => {
    if (!itemToAction) return;
    await clearWornItem(itemToAction.id);
    setWornItemIds(await getActiveWornItemIds());
    setIsActionVisible(false); setItemToAction(null);
  };

  const handleOpenNotes = () => {
    setEditingItemId(itemToAction.id);
    setEditingNotes(itemToAction.notes || '');
    setIsActionVisible(false); setIsNotesVisible(true);
  };

  const handleSaveNotes = async () => {
    if (!editingItemId) return;
    const updated = await updateClothingItem(editingItemId, { notes: editingNotes });
    setWardrobe(updated || []);
    setIsNotesVisible(false); setEditingItemId(null); setEditingNotes('');
  };

  const handleOpenRetag = () => {
    if (!itemToAction) return;
    setRetagItemId(itemToAction.id);
    // Pre-fill with existing values so user sees current state
    setRetagSubCat(itemToAction.subCategory || null);
    setRetagSlot(itemToAction.slot || null);
    setRetagOpenGroup(null);
    const existingOccs = itemToAction.occasions ||
      (itemToAction.occasion ? [itemToAction.occasion] : []);
    setRetagOccasions(existingOccs);
    setIsActionVisible(false);
    setIsRetagVisible(true);
  };

  const handleSaveRetag = async () => {
    if (!retagItemId || !retagSubCat) return;
    if (!retagOccasions.length) {
      Alert.alert('Select Occasion', 'Pick at least one occasion for this item.');
      return;
    }
    const updated = await updateClothingItem(retagItemId, {
      subCategory: retagSubCat,
      slot:        retagSlot,
      occasions:   retagOccasions,
    });
    setWardrobe(updated || []);
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
    setIsRetagVisible(false);
    setRetagItemId(null); setRetagSubCat(null);
    setRetagSlot(null); setRetagOpenGroup(null); setRetagOccasions([]);
    Alert.alert('Re-tagged! ✓', 'This item will now appear in smarter outfit suggestions.');
  };

  const handleDeleteItem = async () => {
    if (!itemToAction) return;
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (_) {}
    const updated = await deleteClothingItem(itemToAction.id);
    setWardrobe(updated || []);
    if (dailyOutfit) {
      const ids = [dailyOutfit.top?.id, dailyOutfit.bottom?.id, dailyOutfit.shoes?.id];
      if (ids.includes(itemToAction.id)) { setDailyOutfit(null); setOutfitSaved(false); }
    }
    setIsActionVisible(false); setItemToAction(null);
  };

  // ── Computed ──────────────────────────────────────────────────────
  const genderCats      = UPLOAD_CATEGORIES[userGender] || UPLOAD_CATEGORIES.Men;
  const emptyStateEmoji = { Men: '🧥', Women: '👗', Kids: '👕' }[userGender] || '👗';
  const needsRetag      = wardrobe.filter(i => !i.subCategory && !i.archived);

  const allForOcc = wardrobe.filter(i => {
    const occ = i.occasions || (i.occasion ? [i.occasion] : []);
    return occ.includes(selectedOccasion);
  });
  const mainItems     = allForOcc.filter(i => !i.archived);
  const archivedItems = allForOcc.filter(i =>  i.archived);
  const displayItems  = showArchive ? archivedItems : mainItems;

  // ── Render: grouped accordion for upload modal ────────────────────
  const renderGroupAccordion = () =>
    genderCats.map(group => {
      const isOpen = openGroup === group.group;
      return (
        <View key={group.group} style={{ marginBottom: 8 }}>
          <TouchableOpacity
            style={[styles.groupHeader, isOpen && styles.groupHeaderOpen]}
            onPress={() => setOpenGroup(isOpen ? null : group.group)}
          >
            <Text style={[styles.groupHeaderText, isOpen && { color: '#FAF6F0' }]}>
              {group.group}
            </Text>
            <Text style={{ color: isOpen ? '#FAF6F0' : '#8A7E72', fontSize: 14 }}>
              {isOpen ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {isOpen && (
            <View style={styles.groupItems}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {group.items.map(it => (
                  <TouchableOpacity
                    key={it.value}
                    style={[styles.subCatChip, tempSubCat === it.value && styles.subCatChipActive]}
                    onPress={() => handleSubCatSelect(it.value, group.slot, group.group)}
                  >
                    <Text style={[styles.subCatChipText, tempSubCat === it.value && { color: '#FAF6F0' }]}>
                      {it.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color picker appears after sub-cat selected within this group */}
              {tempSubCat && group.items.some(i => i.value === tempSubCat) && (
                <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: '#EDE8DF', paddingTop: 12 }}>
                  <Text style={styles.colorPickerLabel}>PICK A COLOR</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {ITEM_COLORS.map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[styles.colorChip, tempColor === color && styles.colorChipActive]}
                        onPress={() => setTempColor(color)}
                      >
                        <Text style={[styles.colorChipText, tempColor === color && { color: '#FAF6F0' }]}>
                          {color}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      );
    });

  // ── Render: header ────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <Text style={styles.header}>{greeting()}, {userName} ☀️</Text>

      {/* Re-tag nudge for old items */}
      {needsRetag.length > 0 && (
        <TouchableOpacity
          style={styles.retagBanner}
          onPress={() => Alert.alert(
            'Items Need Re-tagging 💡',
            `${needsRetag.length} older item(s) don't have a sub-category. Long-press any item → "Re-tag" to improve outfit suggestions.`
          )}
        >
          <Text style={styles.retagText}>
            💡 {needsRetag.length} item(s) need re-tagging for smarter outfits
          </Text>
        </TouchableOpacity>
      )}

      {/* Weather widget */}
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
        {OCCASIONS.map(occ => (
          <TouchableOpacity
            key={occ}
            style={[styles.tab, selectedOccasion === occ && styles.activeTab]}
            onPress={() => {
              setSelectedOccasion(occ);
              setDailyOutfit(null); setOutfitSaved(false); setShowArchive(false);
            }}
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
            <View style={styles.outfitDisplay}>
              {(dailyOutfit.isFull
                ? [dailyOutfit.top, dailyOutfit.shoes]
                : [dailyOutfit.top, dailyOutfit.bottom, dailyOutfit.shoes]
              ).filter(Boolean).map((piece, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <Text style={styles.plusSign}>•</Text>}
                  <TouchableOpacity
                    style={styles.outfitPiece}
                    onPress={() => { setZoomUri(piece.imageUri); setIsZoomVisible(true); }}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: piece.imageUri }} style={styles.outfitImage} />
                    <Text style={styles.outfitPieceLabel} numberOfLines={1}>
                      {piece.subCategory || piece.category}
                    </Text>
                    {!!piece.color && <Text style={styles.outfitPieceColor}>{piece.color}</Text>}
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>

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

            {/* Virtual Try-On teaser — Phase 2 prep */}
            <TouchableOpacity
              style={styles.vtoTeaser}
              onPress={() => Alert.alert(
                '👗 Virtual Try-On — Coming Next',
                'Upload your photo and see exactly how this outfit looks on you. This feature is coming in the next update!'
              )}
            >
              <Text style={styles.vtoTeaserText}>✨ Virtual Try-On — Next Update</Text>
            </TouchableOpacity>

            <Text style={styles.zoomHint}>Tap any piece to zoom in</Text>
          </>
        ) : (
          <Text style={styles.emptyText}>Tap 'Style Me' to synthesize your curated look.</Text>
        )}
      </View>

      {/* Section header */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          {showArchive ? 'Archive' : 'Collection'}
          <Text style={styles.sectionCount}> ({displayItems.length})</Text>
        </Text>
        {(archivedItems.length > 0 || showArchive) && (
          <TouchableOpacity
            style={[styles.archiveToggle, showArchive && styles.archiveToggleActive]}
            onPress={() => setShowArchive(v => !v)}
          >
            <Text style={[styles.archiveToggleText, showArchive && { color: '#FAF6F0' }]}>
              📦 {showArchive ? 'Back' : `Archive (${archivedItems.length})`}
            </Text>
          </TouchableOpacity>
        )}
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
    const itemOccs   = item.occasions || (item.occasion ? [item.occasion] : []);
    const displayName = item.subCategory || item.category;
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
          {isWorn     && <View style={styles.laundryBadge}><Text style={{ fontSize: 12 }}>🧺</Text></View>}
          {item.archived && <View style={styles.archiveBadge}><Text style={{ fontSize: 10, color: '#FAF6F0' }}>📦</Text></View>}
          {!!item.notes && <View style={styles.notesBadge}><Text style={{ fontSize: 10 }}>📝</Text></View>}
        </View>
        <Text style={styles.itemCategory} numberOfLines={1}>{displayName}</Text>
        {!!item.color && <Text style={styles.itemColor}>{item.color}</Text>}
        {itemOccs.length > 1 && (
          <Text style={styles.multiOccBadge}>{itemOccs.length} occasions</Text>
        )}
        <Text style={styles.holdHint}>{isWorn ? 'in laundry' : 'hold to manage'}</Text>
      </TouchableOpacity>
    );
  };

  // ── Main render ───────────────────────────────────────────────────
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

      {/* ── Upload modal (2-step) ── */}
      <Modal visible={isUploadVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '92%' }]}>
            {/* Step pills */}
            <View style={styles.stepRow}>
              {[1, 2].map(s => (
                <View key={s} style={[styles.stepPill, uploadStep >= s && styles.stepPillActive]} />
              ))}
            </View>

            {uploadStep === 1 ? (
              <>
                <Text style={styles.modalTitle}>What are you adding?</Text>
                <ScrollView style={{ width: '100%', maxHeight: 370 }} showsVerticalScrollIndicator={false}>
                  {renderGroupAccordion()}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.modalNextBtn, (!tempSubCat || !tempColor) && styles.modalNextBtnDisabled]}
                  onPress={() => { if (tempSubCat && tempColor) setUploadStep(2); }}
                  disabled={!tempSubCat || !tempColor}
                >
                  <Text style={styles.modalNextBtnText}>
                    {!tempSubCat ? 'Select a type above' : !tempColor ? 'Now pick a color' : 'Next — set occasions →'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>When do you wear it?</Text>

                {/* Summary pill */}
                <View style={styles.selectionSummary}>
                  <Text style={styles.selectionSummaryText}>
                    {tempSubCat}  ·  {tempColor}
                  </Text>
                </View>

                {/* Multi-select occasions */}
                <View style={styles.occasionGrid}>
                  {OCCASIONS.map(occ => (
                    <TouchableOpacity
                      key={occ}
                      style={[styles.occChip, tempOccasions.includes(occ) && styles.occChipActive]}
                      onPress={() => toggleTempOccasion(occ)}
                    >
                      <Text style={styles.occChipEmoji}>{OCC_ICONS[occ]}</Text>
                      <Text style={[styles.occChipText, tempOccasions.includes(occ) && { color: '#FAF6F0' }]}>
                        {occ}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Optional notes */}
                <Text style={[styles.colorPickerLabel, { marginTop: 4 }]}>NOTES (OPTIONAL)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="e.g. Bought in Dubai, save for special occasions..."
                  placeholderTextColor="#C0B8B0"
                  value={tempNotes}
                  onChangeText={setTempNotes}
                  multiline
                  maxLength={120}
                />

                <TouchableOpacity
                  style={[styles.modalNextBtn, !tempOccasions.length && styles.modalNextBtnDisabled]}
                  onPress={handleSaveItem}
                  disabled={!tempOccasions.length}
                >
                  <Text style={styles.modalNextBtnText}>
                    {!tempOccasions.length ? 'Select at least one occasion' : '✓ Save to Wardrobe'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setUploadStep(1)} style={{ paddingVertical: 10 }}>
                  <Text style={styles.dismissText}>← Back</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={{ paddingVertical: 10 }} onPress={() => setIsUploadVisible(false)}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Action modal ── */}
      <Modal visible={isActionVisible} transparent animationType="fade">
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteTitle}>
              {itemToAction?.subCategory || itemToAction?.category}
              {itemToAction?.color ? ` · ${itemToAction.color}` : ''}
            </Text>
            {!!itemToAction?.imageUri && (
              <Image source={{ uri: itemToAction.imageUri }} style={styles.deletePreview} />
            )}
            {!!itemToAction?.notes && (
              <Text style={styles.actionNotes}>📝 "{itemToAction.notes}"</Text>
            )}
            
            {/* Re-tag option — shown for all items, highlighted for untagged */}
            <TouchableOpacity
              style={[
                styles.actionOptionBtn,
                !itemToAction?.subCategory && { backgroundColor: '#FFF9E6', borderColor: '#FFE082', borderWidth: 1 }
              ]}
              onPress={handleOpenRetag}
            >
              <Text style={styles.actionOptionText}>
                🏷️ {itemToAction?.subCategory
                  ? `Re-tag (${itemToAction.subCategory})`
                  : 'Re-tag Item — needs updating'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionOptionBtn} onPress={handleOpenNotes}>
              <Text style={styles.actionOptionText}>
                📝 {itemToAction?.notes ? 'Edit Note' : 'Add a Note'}
              </Text>
            </TouchableOpacity>

            {wornItemIds.has(itemToAction?.id) && (
              <TouchableOpacity style={styles.actionOptionBtn} onPress={handleClearLaundry}>
                <Text style={styles.actionOptionText}>✓ Mark as Clean</Text>
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

            <TouchableOpacity style={{ paddingVertical: 12 }}
              onPress={() => { setIsActionVisible(false); setItemToAction(null); }}>
              <Text style={styles.dismissText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Notes edit modal ── */}
      <Modal visible={isNotesVisible} transparent animationType="slide">
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteTitle}>Item Note</Text>
            <TextInput
              style={[styles.notesInput, { width: '100%', marginBottom: 16, minHeight: 80 }]}
              placeholder="e.g. Wore to Rahul's wedding, great for cold evenings..."
              placeholderTextColor="#C0B8B0"
              value={editingNotes}
              onChangeText={setEditingNotes}
              multiline autoFocus maxLength={150}
            />
            <TouchableOpacity style={[styles.modalNextBtn, { width: '100%' }]} onPress={handleSaveNotes}>
              <Text style={styles.modalNextBtnText}>Save Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ paddingVertical: 12 }}
              onPress={() => { setIsNotesVisible(false); setEditingNotes(''); }}>
              <Text style={styles.dismissText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Re-tag modal ── */}
      <Modal visible={isRetagVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '92%' }]}>

            <Text style={styles.modalTitle}>Re-tag Item</Text>
            <Text style={[styles.colorPickerLabel, { marginBottom: 12 }]}>
              PICK A NEW CATEGORY
            </Text>

            <ScrollView
              style={{ width: '100%', maxHeight: 280 }}
              showsVerticalScrollIndicator={false}
            >
              {genderCats.map(group => {
                const isOpen = retagOpenGroup === group.group;
                return (
                  <View key={group.group} style={{ marginBottom: 8 }}>
                    <TouchableOpacity
                      style={[styles.groupHeader, isOpen && styles.groupHeaderOpen]}
                      onPress={() => setRetagOpenGroup(isOpen ? null : group.group)}
                    >
                      <Text style={[styles.groupHeaderText, isOpen && { color: '#FAF6F0' }]}>
                        {group.group}
                      </Text>
                      <Text style={{ color: isOpen ? '#FAF6F0' : '#8A7E72', fontSize: 14 }}>
                        {isOpen ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={styles.groupItems}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                          {group.items.map(it => (
                            <TouchableOpacity
                              key={it.value}
                              style={[
                                styles.subCatChip,
                                retagSubCat === it.value && styles.subCatChipActive,
                              ]}
                              onPress={() => {
                                setRetagSubCat(it.value);
                                setRetagSlot(group.slot);
                              }}
                            >
                              <Text style={[
                                styles.subCatChipText,
                                retagSubCat === it.value && { color: '#FAF6F0' },
                              ]}>
                                {it.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Occasion multi-select */}
            {!!retagSubCat && (
              <>
                <Text style={[styles.colorPickerLabel, { marginTop: 14, marginBottom: 10 }]}>
                  UPDATE OCCASIONS
                </Text>
                <View style={styles.occasionGrid}>
                  {OCCASIONS.map(occ => (
                    <TouchableOpacity
                      key={occ}
                      style={[
                        styles.occChip,
                        retagOccasions.includes(occ) && styles.occChipActive,
                      ]}
                      onPress={() =>
                        setRetagOccasions(prev =>
                          prev.includes(occ)
                            ? prev.filter(o => o !== occ)
                            : [...prev, occ]
                        )
                      }
                    >
                      <Text style={styles.occChipEmoji}>{OCC_ICONS[occ]}</Text>
                      <Text style={[
                        styles.occChipText,
                        retagOccasions.includes(occ) && { color: '#FAF6F0' },
                      ]}>
                        {occ}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity
              style={[
                styles.modalNextBtn,
                (!retagSubCat || !retagOccasions.length) && styles.modalNextBtnDisabled,
              ]}
              onPress={handleSaveRetag}
              disabled={!retagSubCat || !retagOccasions.length}
            >
              <Text style={styles.modalNextBtnText}>
                {!retagSubCat
                  ? 'Select a category above'
                  : !retagOccasions.length
                  ? 'Select at least one occasion'
                  : '✓ Save Re-tag'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ paddingVertical: 12 }}
              onPress={() => {
                setIsRetagVisible(false);
                setRetagItemId(null); setRetagSubCat(null);
                setRetagSlot(null); setRetagOpenGroup(null); setRetagOccasions([]);
              }}
            >
              <Text style={styles.dismissText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Zoom modal ── */}
      <Modal visible={isZoomVisible} transparent animationType="fade">
        <View style={styles.zoomOverlay}>
          <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setIsZoomVisible(false)}>
            <Text style={styles.zoomCloseText}>✕</Text>
          </TouchableOpacity>
          {zoomUri && (
            <Image source={{ uri: zoomUri }} style={styles.zoomImage} resizeMode="contain" />
          )}
          <Text style={styles.zoomCaption}>Tap ✕ to close</Text>
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

  header:     { fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#1A1A1A', letterSpacing: -0.5 },
  retagBanner:{ backgroundColor: '#FFF9E6', borderRadius: 12, padding: 12, marginBottom: 14, borderColor: '#FFE082', borderWidth: 1 },
  retagText:  { fontSize: 12, color: '#8A6D0B', fontWeight: '600' },
  weatherCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFEAE2', borderRadius: 16, padding: 14, marginBottom: 16 },
  weatherCity:  { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  weatherTip:   { fontSize: 12, color: '#7A7065', marginTop: 2 },
  weatherRight: { alignItems: 'center', marginLeft: 12 },
  weatherEmoji: { fontSize: 26 },
  weatherTemp:  { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },

  tabContainer:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  tab:           { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#EFEAE2' },
  activeTab:     { backgroundColor: '#1A1A1A' },
  tabText:       { fontWeight: '600', fontSize: 13, color: '#7A7065' },
  activeTabText: { color: '#FAF6F0' },

  suggestionCard:     { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 24, marginBottom: 20 },
  cardHeaderRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle:          { color: '#FAF6F0', fontSize: 28, fontFamily: 'FashionCalligraphy' },
  generateButton:     { backgroundColor: '#FAF6F0', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 30 },
  generateButtonText: { color: '#1A1A1A', fontWeight: '700', fontSize: 12 },

  outfitDisplay:    { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#262626', padding: 12, borderRadius: 16, marginBottom: 12 },
  outfitPiece:      { alignItems: 'center', flex: 1 },
  outfitImage:      { width: 72, height: 72, borderRadius: 12, marginBottom: 4 },
  outfitPieceLabel: { color: '#FAF6F0', fontSize: 9, fontWeight: '600', textAlign: 'center' },
  outfitPieceColor: { color: '#A3998E', fontSize: 9, marginTop: 1 },
  plusSign:         { color: '#FAF6F0', fontSize: 16, fontWeight: 'bold' },
  emptyText:        { color: '#A3998E', fontStyle: 'italic', fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  zoomHint:         { color: '#5A5A5A', fontSize: 10, textAlign: 'center', marginTop: 4, opacity: 0.6 },

  outfitActionRow:  { flexDirection: 'row', marginBottom: 8 },
  wearTodayBtn:     { flex: 1, backgroundColor: '#2C2C2C', borderRadius: 20, paddingVertical: 10, alignItems: 'center', marginRight: 6 },
  wearTodayText:    { color: '#FAF6F0', fontWeight: '700', fontSize: 13 },
  lookbookBtn:      { flex: 1, backgroundColor: '#FAF6F0', borderRadius: 20, paddingVertical: 10, alignItems: 'center', marginLeft: 6 },
  lookbookBtnSaved: { backgroundColor: '#4CAF50' },
  lookbookBtnText:  { color: '#1A1A1A', fontWeight: '700', fontSize: 13 },

  vtoTeaser:     { backgroundColor: '#2C2C2C', borderRadius: 14, paddingVertical: 9, alignItems: 'center', marginBottom: 6 },
  vtoTeaserText: { color: '#A3998E', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },

  sectionRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:       { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, color: '#5C4D3C' },
  sectionCount:       { color: '#A3998E', fontWeight: '400' },
  archiveToggle:      { backgroundColor: '#EFEAE2', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  archiveToggleActive:{ backgroundColor: '#1A1A1A' },
  archiveToggleText:  { fontSize: 11, fontWeight: '700', color: '#5C4D3C' },

  clothingCard:     { flex: 1, backgroundColor: '#FFF', margin: 6, padding: 10, borderRadius: 16, alignItems: 'center', borderColor: '#EDE8DF', borderWidth: 1 },
  clothingCardWorn: { borderColor: '#D0C8BF', borderStyle: 'dashed' },
  clothingImage:    { width: height * 0.11, height: height * 0.11, borderRadius: 12, marginBottom: 6 },
  itemCategory:     { fontSize: 11, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  itemColor:        { fontSize: 10, color: '#8A7E72', marginTop: 2 },
  multiOccBadge:    { fontSize: 9, color: '#5C4D3C', backgroundColor: '#EFEAE2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginTop: 3, fontWeight: '700' },
  holdHint:         { fontSize: 9, color: '#D0C8BF', marginTop: 4, fontStyle: 'italic' },
  laundryBadge:     { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 },
  archiveBadge:     { position: 'absolute', top: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 2 },
  notesBadge:       { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, paddingHorizontal: 3, paddingVertical: 1 },

  emptyWardrobe:     { padding: 30, alignItems: 'center' },
  emptyWardrobeText: { color: '#A3998E', textAlign: 'center', fontSize: 14, lineHeight: 22 },

  addButton:    { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 30, alignItems: 'center', marginHorizontal: 20, marginBottom: Platform.OS === 'android' ? 25 : 15, marginTop: 10 },
  addButtonText:{ color: '#FAF6F0', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  // Upload modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FAF6F0', padding: 20, paddingBottom: 30, borderTopLeftRadius: 32, borderTopRightRadius: 32, alignItems: 'center', width: '100%' },
  stepRow:        { flexDirection: 'row', marginBottom: 16 },
  stepPill:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D0C8BF', marginHorizontal: 3 },
  stepPillActive: { backgroundColor: '#1A1A1A', width: 22, borderRadius: 4 },
  modalTitle:     { fontSize: 26, color: '#1A1A1A', marginBottom: 14, fontFamily: 'FashionCalligraphy', alignSelf: 'flex-start' },

  groupHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#EFEAE2', borderRadius: 12, marginBottom: 1 },
  groupHeaderOpen:  { backgroundColor: '#1A1A1A' },
  groupHeaderText:  { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  groupItems:       { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 4, borderColor: '#EDE8DF', borderWidth: 1 },
  subCatChip:       { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 20, backgroundColor: '#EFEAE2', borderColor: '#E6DFD5', borderWidth: 1, margin: 3 },
  subCatChipActive: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  subCatChipText:   { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },

  colorPickerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: '#8A7E72', marginBottom: 8, alignSelf: 'flex-start' },
  colorChip:        { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 20, backgroundColor: '#FFF', borderColor: '#E6DFD5', borderWidth: 1, margin: 3 },
  colorChipActive:  { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  colorChipText:    { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },

  selectionSummary:     { backgroundColor: '#EFEAE2', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 14, alignSelf: 'stretch' },
  selectionSummaryText: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },

  occasionGrid:    { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginBottom: 14 },
  occChip:         { width: '48%', flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: '#FFF', borderColor: '#EDE8DF', borderWidth: 1, marginBottom: 8 },
  occChipActive:   { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  occChipEmoji:    { fontSize: 20, marginRight: 10 },
  occChipText:     { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },

  notesInput:   { backgroundColor: '#FFF', borderRadius: 12, padding: 12, fontSize: 13, color: '#1A1A1A', borderColor: '#EDE8DF', borderWidth: 1, width: '100%', marginBottom: 14, minHeight: 52 },
  modalNextBtn: { backgroundColor: '#1A1A1A', borderRadius: 30, paddingVertical: 14, alignItems: 'center', width: '100%', marginTop: 4 },
  modalNextBtnDisabled: { backgroundColor: '#C0B8B0' },
  modalNextBtnText:{ color: '#FAF6F0', fontWeight: '700', fontSize: 14 },
  dismissText:  { color: '#999', fontSize: 14 },

  // Action modal
  deleteOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  deleteModal:       { backgroundColor: '#FAF6F0', borderRadius: 28, padding: 24, alignItems: 'center', width: '100%' },
  deleteTitle:       { fontSize: 22, fontFamily: 'FashionCalligraphy', color: '#1A1A1A', marginBottom: 12 },
  deletePreview:     { width: 100, height: 100, borderRadius: 14, marginBottom: 12 },
  actionNotes:       { fontSize: 12, color: '#8A7E72', fontStyle: 'italic', marginBottom: 12, textAlign: 'center' },
  actionOptionBtn:   { backgroundColor: '#EFEAE2', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, width: '100%', alignItems: 'center', marginBottom: 8 },
  actionOptionText:  { color: '#1A1A1A', fontWeight: '600', fontSize: 14 },
  deleteConfirm:     { backgroundColor: '#C0392B', borderRadius: 30, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  deleteConfirmText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // Zoom modal
  zoomOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  zoomImage:     { width: width, height: width },
  zoomCloseBtn:  { position: 'absolute', top: 56, right: 24, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  zoomCloseText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  zoomCaption:   { position: 'absolute', bottom: 60, color: 'rgba(255,255,255,0.4)', fontSize: 12 },
});