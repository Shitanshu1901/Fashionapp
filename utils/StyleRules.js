// ─────────────────────────────────────────────────────────────────
// STYLE RULES ENGINE
// Central source of truth for categories, outfit slots, and
// color harmony — all gender-aware.
// ─────────────────────────────────────────────────────────────────

// ── Color logic ───────────────────────────────────────────────────
export const NEUTRAL_COLORS = ['Black', 'White', 'Grey', 'Navy', 'Beige', 'Brown'];

export const ALL_COLORS = [
  'Black', 'White', 'Navy', 'Grey', 'Beige', 'Brown',
  'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Patterned',
];

/**
 * Patterned + Patterned → clash ❌
 * Patterned + vivid     → busy  ❌
 * Patterned + neutral   → clean ✅
 * Neutral   + anything  → safe  ✅
 * Same vivid pair       → loud  ❌
 */
export const areColorsHarmonious = (color1, color2) => {
  if (!color1 || !color2) return true;
  if (color1 === 'Patterned' && color2 === 'Patterned') return false;
  if (color1 === 'Patterned') return NEUTRAL_COLORS.includes(color2);
  if (color2 === 'Patterned') return NEUTRAL_COLORS.includes(color1);
  if (NEUTRAL_COLORS.includes(color1) || NEUTRAL_COLORS.includes(color2)) return true;
  if (color1 === color2) return false;
  return true;
};

// ── Gender-aware upload categories (shown in modal step 1) ────────
export const UPLOAD_CATEGORIES = {
  Men: [
    { label: '👕 Shirt',       value: 'Shirt'       },
    { label: '🥋 Kurta',       value: 'Kurta'       },
    { label: '👖 Pants',       value: 'Pants'       },
    { label: '🧥 Blazer',      value: 'Blazer'      },
    { label: '👟 Shoes',       value: 'Shoes'       },
    { label: '⌚ Accessories', value: 'Accessories' },
  ],
  Women: [
    { label: '👚 Top',         value: 'Top'         },
    { label: '🥻 Kurti',       value: 'Kurti'       },
    { label: '👗 Dress',       value: 'Dress'       },
    { label: '🥻 Saree',       value: 'Saree'       },
    { label: '👖 Pants',       value: 'Pants'       },
    { label: '👘 Skirt',       value: 'Skirt'       },
    { label: '👠 Shoes',       value: 'Shoes'       },
    { label: '👜 Accessories', value: 'Accessories' },
  ],
  Kids: [
    { label: '👕 T-Shirt',     value: 'T-Shirt'     },
    { label: '👗 Dress',       value: 'Dress'       },
    { label: '👖 Pants',       value: 'Pants'       },
    { label: '🩳 Shorts',      value: 'Shorts'      },
    { label: '👟 Shoes',       value: 'Shoes'       },
    { label: '⌚ Accessories', value: 'Accessories' },
  ],
};

// ── Outfit generation slots ───────────────────────────────────────
// Defines which categories fill each of the 3 outfit roles.
// buildSmartOutfit filters the wardrobe by these before picking.
export const OUTFIT_SLOTS = {
  Men: {
    top:    ['Shirt', 'Kurta', 'Blazer'],
    bottom: ['Pants'],
    shoes:  ['Shoes'],
  },
  Women: {
    top:    ['Top', 'Kurti', 'Dress', 'Saree'],
    bottom: ['Pants', 'Skirt'],
    shoes:  ['Shoes'],
  },
  Kids: {
    top:    ['T-Shirt', 'Dress'],
    bottom: ['Pants', 'Shorts'],
    shoes:  ['Shoes'],
  },
};

// ── Analytics categories (shown in the breakdown grid) ───────────
export const ANALYTICS_CATEGORIES = {
  Men:   ['Shirt', 'Kurta', 'Blazer', 'Pants', 'Shoes', 'Accessories'],
  Women: ['Top', 'Kurti', 'Dress', 'Saree', 'Pants', 'Skirt', 'Shoes', 'Accessories'],
  Kids:  ['T-Shirt', 'Dress', 'Pants', 'Shorts', 'Shoes', 'Accessories'],
};

// ── Smart outfit builder ──────────────────────────────────────────
/**
 * Renamed: shirt/pants → top/bottom (gender-neutral).
 * Returns: { top, bottom, shoes }
 * Backward-compat note: LookbookScreen reads both old and new keys.
 */
export const buildSmartOutfit = (tops, bottoms, shoes) => {
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Pass 1: full harmony (top ↔ bottom ↔ shoes)
  for (let i = 0; i < 20; i++) {
    const top    = rand(tops);
    const bottom = rand(bottoms);
    const shoe   = rand(shoes);
    if (
      areColorsHarmonious(top.color, bottom.color) &&
      areColorsHarmonious(bottom.color, shoe.color)
    ) {
      return { top, bottom, shoes: shoe };
    }
  }

  // Pass 2: at least top ↔ bottom harmonise
  for (let i = 0; i < 10; i++) {
    const top    = rand(tops);
    const bottom = rand(bottoms);
    if (areColorsHarmonious(top.color, bottom.color)) {
      return { top, bottom, shoes: rand(shoes) };
    }
  }

  // Pass 3: graceful random fallback (never blocks generation)
  return { top: rand(tops), bottom: rand(bottoms), shoes: rand(shoes) };
};