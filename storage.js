import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// expo-file-system is native-only — safe to import on Android/iOS
// On Snack's web preview it will gracefully fall back
let FileSystem = null;
if (Platform.OS !== 'web') {
  try {
    FileSystem = require('expo-file-system');
  } catch (_) {
    // Not available in this environment
  }
}
const WARDROBE_KEY       = '@my_wardrobe_items';
const USER_NAME_KEY      = '@user_name';
const USER_GENDER_KEY    = '@user_gender';
const OUTFIT_HISTORY_KEY = '@outfit_history';
const WORN_ITEMS_KEY     = '@worn_items'; // { [itemId]: timestamp }

export const COOLDOWN_DAYS = 4; // exported so Homescreen can reference it

// ─── WARDROBE ──────────────────────────────────────────────────────

export const getWardrobe = async () => {
  try {
    const json = await AsyncStorage.getItem(WARDROBE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) { return []; }
};

// Copies image to documentDirectory so it survives cache clears & backup
export const addClothingItem = async (item) => {
  try {
    let finalUri = item.imageUri;

    // Copy to permanent storage on device (skipped on web/Snack preview)
    if (FileSystem && FileSystem.documentDirectory) {
      const ext = item.imageUri?.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `wardrobe_${Date.now()}.${ext}`;
      const permanentUri = FileSystem.documentDirectory + fileName;
      try {
        await FileSystem.copyAsync({ from: item.imageUri, to: permanentUri });
        finalUri = permanentUri;
      } catch (_) {
        // Fallback to original URI if copy fails
      }
    }

    const current = await getWardrobe();
    const newItem = {
      ...item,
      id: Date.now().toString(),
      imageUri: finalUri,
      archived: false,
    };
    const updated = [...current, newItem];
    await AsyncStorage.setItem(WARDROBE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('addClothingItem failed:', e);
    return null;
  }
};

export const deleteClothingItem = async (itemId) => {
  try {
    const current = await getWardrobe();
    const item    = current.find(i => i.id === itemId);

    // Delete physical file on device only
    if (
      FileSystem &&
      item?.imageUri?.startsWith(FileSystem.documentDirectory)
    ) {
      await FileSystem.deleteAsync(item.imageUri, { idempotent: true });
    }

    const updated = current.filter(i => i.id !== itemId);
    await AsyncStorage.setItem(WARDROBE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('deleteClothingItem failed:', e);
    return null;
  }
};

export const toggleArchiveItem = async (itemId) => {
  try {
    const current = await getWardrobe();
    const updated = current.map(i =>
      i.id === itemId ? { ...i, archived: !i.archived } : i
    );
    await AsyncStorage.setItem(WARDROBE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) { return null; }
};

// ─── LAUNDRY / WORN ITEMS ──────────────────────────────────────────

export const getWornItems = async () => {
  try {
    const json = await AsyncStorage.getItem(WORN_ITEMS_KEY);
    return json ? JSON.parse(json) : {};
  } catch (e) { return {}; }
};

export const markItemsAsWorn = async (itemIds) => {
  try {
    const current = await getWornItems();
    const now = Date.now();
    const updated = { ...current };
    itemIds.forEach(id => { if (id) updated[id] = now; });
    await AsyncStorage.setItem(WORN_ITEMS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) { return null; }
};

export const clearWornItem = async (itemId) => {
  try {
    const current = await getWornItems();
    const updated = { ...current };
    delete updated[itemId];
    await AsyncStorage.setItem(WORN_ITEMS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) { return null; }
};

// Returns a Set of item IDs currently in cooldown
export const getActiveWornItemIds = async () => {
  try {
    const worn = await getWornItems();
    const cutoff = Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    return new Set(Object.keys(worn).filter(id => worn[id] > cutoff));
  } catch (e) { return new Set(); }
};

// ─── USER PROFILE ──────────────────────────────────────────────────

export const getUserName   = async () => { try { return await AsyncStorage.getItem(USER_NAME_KEY); } catch (e) { return null; } };
export const saveUserName  = async (n) => { try { await AsyncStorage.setItem(USER_NAME_KEY, n); return true; } catch (e) { return false; } };
export const getUserGender = async () => { try { return await AsyncStorage.getItem(USER_GENDER_KEY); } catch (e) { return null; } };
export const saveUserGender = async (g) => { try { await AsyncStorage.setItem(USER_GENDER_KEY, g); return true; } catch (e) { return false; } };

// ─── OUTFIT HISTORY ────────────────────────────────────────────────

export const getOutfitHistory = async () => {
  try {
    const json = await AsyncStorage.getItem(OUTFIT_HISTORY_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) { return []; }
};

export const saveOutfitToHistory = async (outfit, occasion) => {
  try {
    const history = await getOutfitHistory();
    const entry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      occasion, outfit, favorited: false,
    };
    const updated = [entry, ...history];
    await AsyncStorage.setItem(OUTFIT_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) { return null; }
};

export const toggleFavoriteOutfit = async (outfitId) => {
  try {
    const history = await getOutfitHistory();
    const updated = history.map(e =>
      e.id === outfitId ? { ...e, favorited: !e.favorited } : e
    );
    await AsyncStorage.setItem(OUTFIT_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) { return null; }
};

// ─── BACKUP / RESTORE ──────────────────────────────────────────────

export const exportAllData = async () => {
  try {
    const [wardrobe, history, userName, userGender, wornItems] = await Promise.all([
      getWardrobe(), getOutfitHistory(), getUserName(), getUserGender(), getWornItems(),
    ]);

    let wardrobeWithImages = wardrobe;

    // Encode images as base64 only on device (not web)
    if (FileSystem) {
      wardrobeWithImages = await Promise.all(
        wardrobe.map(async (item) => {
          try {
            const base64 = await FileSystem.readAsStringAsync(item.imageUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            return { ...item, imageBase64: base64, imageUri: '__BACKUP__' };
          } catch (_) {
            return item; // Skip if file not readable
          }
        })
      );
    }

    return JSON.stringify({
      version: 2,
      exportDate: new Date().toISOString(),
      app: 'OutfitStyling',
      data: { wardrobe: wardrobeWithImages, history, userName, userGender, wornItems },
    });
  } catch (e) {
    console.error('Export failed:', e);
    return null;
  }
};

export const importAllData = async (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.app !== 'OutfitStyling' || !parsed.data) throw new Error('Invalid file');
    const { wardrobe, history, userName, userGender, wornItems } = parsed.data;

    let restoredWardrobe = wardrobe || [];

    // Restore base64 images back to device storage (not web)
    if (FileSystem) {
      restoredWardrobe = await Promise.all(
        (wardrobe || []).map(async (item) => {
          if (item.imageBase64 && item.imageUri === '__BACKUP__') {
            const fileUri = FileSystem.documentDirectory + `wardrobe_${item.id}.jpg`;
            await FileSystem.writeAsStringAsync(fileUri, item.imageBase64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const { imageBase64, ...rest } = item;
            return { ...rest, imageUri: fileUri };
          }
          return item;
        })
      );
    }

    await AsyncStorage.multiSet([
      [WARDROBE_KEY,         JSON.stringify(restoredWardrobe)],
      [OUTFIT_HISTORY_KEY,   JSON.stringify(history || [])],
      [USER_NAME_KEY,        userName || ''],
      [USER_GENDER_KEY,      userGender || 'Men'],
      [WORN_ITEMS_KEY,       JSON.stringify(wornItems || {})],
    ]);
    return true;
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
};
// Writes the backup JSON string to a file and returns the file path.
// Called by SettingsScreen so it never needs to import expo-file-system directly.
export const saveExportFile = async (jsonData) => {
  try {
    if (!FileSystem || !FileSystem.documentDirectory) return null;
    const dateStr  = new Date().toISOString().split('T')[0];
    const fileName = `OutfitStyling_Backup_${dateStr}.json`;
    const filePath = FileSystem.documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(filePath, jsonData, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return filePath;
  } catch (e) {
    console.error('saveExportFile failed:', e);
    return null;
  }
};

// Reads a file URI as a plain string.
// Used by SettingsScreen to read the DocumentPicker result.
export const readFileAsString = async (uri) => {
  try {
    if (!FileSystem) return null;
    return await FileSystem.readAsStringAsync(uri);
  } catch (e) {
    console.error('readFileAsString failed:', e);
    return null;
  }
};