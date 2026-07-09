import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import * as Haptics        from 'expo-haptics';
import * as Sharing        from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  getWardrobe, getOutfitHistory,
  exportAllData, importAllData,
  saveExportFile, readFileAsString,
  COOLDOWN_DAYS, getActiveWornItemIds,
} from '../utils/storage';
import { ANALYTICS_CATEGORIES, OUTFIT_SLOTS } from '../utils/StyleRules';

const OCCASIONS = ['Casual', 'Office', 'Party', 'Gym'];
const EMOJIS    = { Casual: '☕', Office: '💼', Party: '🎉', Gym: '🏋️' };

export default function SettingsScreen({ userName, userGender, onResetProfile }) {
  const [wardrobe,    setWardrobe]    = useState([]);
  const [history,     setHistory]     = useState([]);
  const [wornCount,   setWornCount]   = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [wb, hist, worn] = await Promise.all([
      getWardrobe(), getOutfitHistory(), getActiveWornItemIds(),
    ]);
    setWardrobe(wb   || []);
    setHistory(hist  || []);
    setWornCount(worn.size);
  };

  // Analytics — counts items by subCategory or category
  const groupedCats = ANALYTICS_CATEGORIES[userGender] || ANALYTICS_CATEGORIES.Men;
  const slots       = OUTFIT_SLOTS[userGender]          || OUTFIT_SLOTS.Men;

  // Count items matching a list of sub-categories in a given occasion
  const countSubCats = (occ, catList) =>
    wardrobe.filter(i => {
      const subCat = i.subCategory || i.category;
      const occ2   = i.occasions || (i.occasion ? [i.occasion] : []);
      return occ2.includes(occ) && catList.includes(subCat) && !i.archived;
    }).length;

  // Count all items for a slot (tops/bottoms/shoes) for an occasion
  const slotCount = (occ, slotName) =>
    wardrobe.filter(i => {
      const subCat   = i.subCategory || i.category;
      const itemSlot = i.slot || slotName;
      const occ2     = i.occasions || (i.occasion ? [i.occasion] : []);
      return occ2.includes(occ) && !i.archived &&
        (itemSlot === slotName || (slots[slotName] || []).includes(subCat));
    }).length;

  const totalItems    = wardrobe.filter(i => !i.archived).length;
  const archivedCount = wardrobe.filter(i =>  i.archived).length;
  const needsRetag    = wardrobe.filter(i => !i.subCategory && !i.archived).length;

  const possibleOutfits = OCCASIONS.reduce((acc, occ) => {
    const t  = slotCount(occ, 'top');
    const b  = slotCount(occ, 'bottom');
    const sh = slotCount(occ, 'shoes');
    return acc + (t > 0 && b > 0 && sh > 0 ? t * b * sh : 0);
  }, 0);

  // ── Export / Import (unchanged from before) ──────────────────────
  const handleExport = async () => {
    setIsExporting(true);
    try {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
      const json = await exportAllData();
      if (!json) { Alert.alert('Export Failed', 'Could not generate backup data.'); return; }
      const filePath = await saveExportFile(json);
      if (!filePath) { Alert.alert('Export Failed', 'Could not write backup file to device.'); return; }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, { mimeType: 'application/json', dialogTitle: 'Save your wardrobe backup' });
      } else {
        Alert.alert('Backup Saved', 'File saved to app storage.');
      }
    } catch (e) {
      Alert.alert('Export Failed', 'Something went wrong. Please try again.');
    } finally { setIsExporting(false); }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      Alert.alert(
        'Restore Backup?',
        'This will replace your current wardrobe and history. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Restore', style: 'destructive',
            onPress: async () => {
              setIsImporting(true);
              try {
                const json    = await readFileAsString(result.assets[0].uri);
                if (!json) { Alert.alert('Restore Failed', 'Could not read the backup file.'); return; }
                const success = await importAllData(json);
                if (success) {
                  await loadData();
                  try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
                  Alert.alert('Restored! ✓', 'Your wardrobe has been fully restored.');
                } else {
                  Alert.alert('Restore Failed', 'Invalid or corrupted backup file.');
                }
              } catch (_) {
                Alert.alert('Restore Failed', 'An unexpected error occurred.');
              } finally { setIsImporting(false); }
            },
          },
        ]
      );
    } catch (_) { Alert.alert('Error', 'Could not open file picker.'); }
  };

  const SectionHeader = ({ title }) => <Text style={styles.sectionHeader}>{title}</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Settings</Text>

        {/* ── Profile ── */}
        <SectionHeader title="PROFILE" />
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View>
              <Text style={styles.profileName}>{userName}</Text>
              <Text style={styles.profileGender}>
                {{ Men: '👔 Men', Women: '👗 Women', Kids: '🧒 Kids' }[userGender] || userGender}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => Alert.alert('Change Profile', 'This will reset your name and wardrobe style setting.',
                [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: onResetProfile }]
              )}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Wardrobe Insights ── */}
        <SectionHeader title="WARDROBE INSIGHTS" />
        <View style={styles.statsRow}>
          {[
            { num: totalItems,    label: 'ACTIVE',    bg: '#1A1A1A', fg: '#FAF6F0', lbl: '#8A7E72' },
            { num: possibleOutfits,label: 'OUTFITS',  bg: '#EFEAE2', fg: '#1A1A1A', lbl: '#7A7065' },
            { num: wornCount,     label: 'LAUNDRY',   bg: '#FFF9E6', fg: '#1A1A1A', lbl: '#7A7065' },
            { num: archivedCount, label: 'ARCHIVED',  bg: '#F5F0EB', fg: '#1A1A1A', lbl: '#7A7065' },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <Text style={[styles.statNum, { color: s.fg }]}>{s.num}</Text>
              <Text style={[styles.statLabel, { color: s.lbl }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {needsRetag > 0 && (
          <View style={styles.retagCard}>
            <Text style={styles.retagText}>
              💡 {needsRetag} item(s) need re-tagging. Long-press any item in Wardrobe to update sub-category.
            </Text>
          </View>
        )}

        {/* Per-occasion breakdown */}
        {OCCASIONS.map(occ => {
          const canGen = slotCount(occ,'top') > 0 && slotCount(occ,'bottom') > 0 && slotCount(occ,'shoes') > 0;
          const totalForOcc = wardrobe.filter(i => {
            const occ2 = i.occasions || (i.occasion ? [i.occasion] : []);
            return occ2.includes(occ) && !i.archived;
          }).length;

          return (
            <View key={occ} style={styles.occasionCard}>
              <View style={styles.occRow}>
                <Text style={styles.occEmoji}>{EMOJIS[occ]}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.occName}>{occ}</Text>
                  <Text style={styles.occCount}>{totalForOcc} pieces</Text>
                </View>
                <View style={[styles.dot, canGen ? styles.dotGreen : styles.dotRed]} />
              </View>

              {/* Group-level chips */}
              <View style={styles.catWrap}>
                {Object.entries(groupedCats).map(([groupName, catList]) => {
                  const c = countSubCats(occ, catList);
                  return (
                    <View key={groupName} style={[styles.catChip, c === 0 && styles.catChipEmpty]}>
                      <Text style={[styles.catNum, c === 0 && { color: '#E74C3C' }]}>{c}</Text>
                      <Text style={[styles.catLbl, c === 0 && { color: '#E74C3C' }]} numberOfLines={1}>
                        {groupName}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Lookbook summary */}
        {history.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Lookbook Summary</Text>
            <View style={styles.profileRow}>
              <Text style={styles.profileGender}>Total saved outfits</Text>
              <Text style={styles.profileName}>{history.length}</Text>
            </View>
            <View style={[styles.profileRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.profileGender}>Favourited outfits</Text>
              <Text style={styles.profileName}>{history.filter(h => h.favorited).length}</Text>
            </View>
          </View>
        )}

        {/* ── Data Management ── */}
        <SectionHeader title="DATA MANAGEMENT" />
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Backup & Restore</Text>
          <Text style={styles.cardSubtext}>
            Backup includes your full wardrobe with photos, outfit history, and profile. Save to Google Drive, WhatsApp, or email.
          </Text>
          <TouchableOpacity style={[styles.backupBtn, isExporting && { opacity: 0.6 }]} onPress={handleExport} disabled={isExporting}>
            {isExporting ? <ActivityIndicator color="#FAF6F0" /> : <Text style={styles.backupBtnText}>⬆️  Export Backup</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.restoreBtn, isImporting && { opacity: 0.6 }]} onPress={handleImport} disabled={isImporting}>
            {isImporting ? <ActivityIndicator color="#1A1A1A" /> : <Text style={styles.restoreBtnText}>⬇️  Import from Backup</Text>}
          </TouchableOpacity>
        </View>

        {/* ── App Info ── */}
        <SectionHeader title="APP" />
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Text style={styles.profileGender}>Version</Text>
            <Text style={styles.profileName}>2.0.0</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileGender}>Laundry cooldown</Text>
            <Text style={styles.profileName}>{COOLDOWN_DAYS} days</Text>
          </View>
          <View style={[styles.profileRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.profileGender}>Curated by</Text>
            <Text style={styles.profileName}>Shitanshu Chokshi</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  inner:     { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 15 },
  header:    { fontSize: 38, fontFamily: 'FashionCalligraphy', color: '#1A1A1A', marginBottom: 24 },
  sectionHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: '#8A7E72', marginBottom: 12, marginTop: 8 },

  card:        { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 16, borderColor: '#EDE8DF', borderWidth: 1 },
  cardLabel:   { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  cardSubtext: { fontSize: 12, color: '#8A7E72', lineHeight: 18, marginBottom: 16 },

  profileRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F2EDE8' },
  profileName:   { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  profileGender: { fontSize: 13, color: '#8A7E72' },
  editBtn:       { backgroundColor: '#EFEAE2', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 14 },
  editBtnText:   { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },

  statsRow:  { flexDirection: 'row', marginBottom: 12 },
  statCard:  { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', marginHorizontal: 3 },
  statNum:   { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 7, letterSpacing: 0.5, fontWeight: '700' },

  retagCard: { backgroundColor: '#FFF9E6', borderRadius: 12, padding: 12, marginBottom: 12, borderColor: '#FFE082', borderWidth: 1 },
  retagText: { fontSize: 12, color: '#8A6D0B', fontWeight: '600' },

  occasionCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 10, borderColor: '#EDE8DF', borderWidth: 1 },
  occRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  occEmoji:     { fontSize: 20 },
  occName:      { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  occCount:     { fontSize: 11, color: '#8A7E72' },
  dot:          { width: 9, height: 9, borderRadius: 5 },
  dotGreen:     { backgroundColor: '#4CAF50' },
  dotRed:       { backgroundColor: '#E74C3C' },
  catWrap:      { flexDirection: 'row', flexWrap: 'wrap' },
  catChip:      { backgroundColor: '#EFEAE2', margin: 2, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center', minWidth: 52 },
  catChipEmpty: { backgroundColor: '#FFF0F0', borderColor: '#FFCCCC', borderWidth: 1 },
  catNum:       { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  catLbl:       { fontSize: 8, fontWeight: '600', color: '#8A7E72', marginTop: 1, textTransform: 'uppercase' },

  backupBtn:     { backgroundColor: '#1A1A1A', borderRadius: 20, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  backupBtnText: { color: '#FAF6F0', fontWeight: '700', fontSize: 14 },
  restoreBtn:    { backgroundColor: '#EFEAE2', borderRadius: 20, paddingVertical: 14, alignItems: 'center' },
  restoreBtnText:{ color: '#1A1A1A', fontWeight: '700', fontSize: 14 },
});