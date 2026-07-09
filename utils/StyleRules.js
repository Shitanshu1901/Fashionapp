// ─────────────────────────────────────────────────────────────────────
// StyleRules.js — Phase 2
// Full sub-category tree, occasion-locked rules, weather filtering,
// smart outfit builder
// ─────────────────────────────────────────────────────────────────────

export const NEUTRAL_COLORS = ['Black', 'White', 'Grey', 'Navy', 'Beige', 'Brown'];

export const areColorsHarmonious = (c1, c2) => {
  if (!c1 || !c2) return true;
  if (c1 === 'Patterned' && c2 === 'Patterned') return false;
  if (c1 === 'Patterned') return NEUTRAL_COLORS.includes(c2);
  if (c2 === 'Patterned') return NEUTRAL_COLORS.includes(c1);
  if (NEUTRAL_COLORS.includes(c1) || NEUTRAL_COLORS.includes(c2)) return true;
  if (c1 === c2) return false;
  return true;
};

export const ITEM_COLORS = [
  'Black', 'White', 'Navy', 'Grey', 'Beige', 'Brown',
  'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Patterned',
];

// ── Upload categories — grouped accordion structure ───────────────────
export const UPLOAD_CATEGORIES = {
  Men: [
    {
      group: 'Tops', slot: 'top',
      items: [
        { label: 'T-Shirt (Round neck)',        value: 'T-Shirt Round Neck'  },
        { label: 'T-Shirt (Polo)',              value: 'T-Shirt Polo'        },
        { label: 'Casual shirt (Half sleeve)',  value: 'Casual Shirt Half'   },
        { label: 'Casual shirt (Full sleeve)',  value: 'Casual Shirt Full'   },
        { label: 'Formal shirt',               value: 'Formal Shirt'        },
        { label: 'Kurta',                      value: 'Kurta'               },
        { label: 'Hoodie / Sweatshirt',        value: 'Hoodie'              },
        { label: 'Vest / Tank',                value: 'Vest'                },
      ],
    },
    {
      group: 'Outerwear', slot: 'top',
      items: [
        { label: 'Blazer',          value: 'Blazer' },
        { label: 'Jacket',          value: 'Jacket' },
        { label: 'Suit / Sherwani', value: 'Suit'   },
      ],
    },
    {
      group: 'Bottoms', slot: 'bottom',
      items: [
        { label: 'Jeans',             value: 'Jeans'           },
        { label: 'Chinos',            value: 'Chinos'          },
        { label: 'Formal trousers',   value: 'Formal Trousers' },
        { label: 'Track pants',       value: 'Track Pants'     },
        { label: 'Cargo',             value: 'Cargo'           },
        { label: 'Shorts',            value: 'Shorts'          },
      ],
    },
    {
      group: 'Shoes', slot: 'shoes',
      items: [
        { label: 'Sneakers',          value: 'Sneakers'     },
        { label: 'Formal shoes',      value: 'Formal Shoes' },
        { label: 'Loafers',           value: 'Loafers'      },
        { label: 'Sandals / Slippers',value: 'Sandals'      },
        { label: 'Sports shoes',      value: 'Sports Shoes' },
      ],
    },
    {
      group: 'Accessories', slot: 'accessory',
      items: [
        { label: 'Watch',       value: 'Watch'      },
        { label: 'Belt',        value: 'Belt'       },
        { label: 'Cap / Hat',   value: 'Cap'        },
        { label: 'Sunglasses',  value: 'Sunglasses' },
      ],
    },
  ],

  Women: [
    {
      group: 'Western tops', slot: 'top',
      items: [
        { label: 'T-Shirt',         value: 'T-Shirt'   },
        { label: 'Crop top',        value: 'Crop Top'  },
        { label: 'Blouse / Shirt',  value: 'Blouse'    },
        { label: 'Tank top',        value: 'Tank Top'  },
      ],
    },
    {
      group: 'Ethnic tops', slot: 'top',
      items: [
        { label: 'Kurti (Casual)',  value: 'Kurti Casual'  },
        { label: 'Kurti (Formal)',  value: 'Kurti Formal'  },
        { label: 'Salwar suit',     value: 'Salwar Suit'   },
      ],
    },
    {
      group: 'Dresses', slot: 'full',
      items: [
        { label: 'Casual dress',  value: 'Casual Dress'  },
        { label: 'Formal dress',  value: 'Formal Dress'  },
        { label: 'Party dress',   value: 'Party Dress'   },
        { label: 'Maxi dress',    value: 'Maxi Dress'    },
      ],
    },
    {
      group: 'Ethnic full outfit', slot: 'full',
      items: [
        { label: 'Saree',     value: 'Saree'    },
        { label: 'Lehenga',   value: 'Lehenga'  },
        { label: 'Anarkali',  value: 'Anarkali' },
      ],
    },
    {
      group: 'Outerwear', slot: 'top',
      items: [
        { label: 'Jacket',          value: 'Jacket'   },
        { label: 'Blazer',          value: 'Blazer'   },
        { label: 'Cardigan / Shrug',value: 'Cardigan' },
      ],
    },
    {
      group: 'Bottoms', slot: 'bottom',
      items: [
        { label: 'Jeans',     value: 'Jeans'    },
        { label: 'Trousers',  value: 'Trousers' },
        { label: 'Skirt',     value: 'Skirt'    },
        { label: 'Shorts',    value: 'Shorts'   },
        { label: 'Leggings',  value: 'Leggings' },
        { label: 'Palazzo',   value: 'Palazzo'  },
      ],
    },
    {
      group: 'Shoes', slot: 'shoes',
      items: [
        { label: 'Heels',             value: 'Heels'        },
        { label: 'Flats / Ballerinas',value: 'Flats'        },
        { label: 'Sneakers',          value: 'Sneakers'     },
        { label: 'Sandals / Slippers',value: 'Sandals'      },
        { label: 'Sports shoes',      value: 'Sports Shoes' },
      ],
    },
    {
      group: 'Accessories', slot: 'accessory',
      items: [
        { label: 'Dupatta / Scarf',   value: 'Dupatta'    },
        { label: 'Handbag / Clutch',  value: 'Handbag'    },
        { label: 'Jewellery',         value: 'Jewellery'  },
        { label: 'Sunglasses',        value: 'Sunglasses' },
      ],
    },
  ],

  Kids: [
    {
      group: 'Tops', slot: 'top',
      items: [
        { label: 'T-Shirt (Round neck)',  value: 'T-Shirt Round Neck' },
        { label: 'T-Shirt (Polo)',        value: 'T-Shirt Polo'       },
        { label: 'Shirt',                 value: 'Shirt'              },
        { label: 'Hoodie / Sweatshirt',   value: 'Hoodie'             },
        { label: 'Vest',                  value: 'Vest'               },
      ],
    },
    {
      group: 'Bottoms', slot: 'bottom',
      items: [
        { label: 'Jeans',       value: 'Jeans'       },
        { label: 'Track pants', value: 'Track Pants' },
        { label: 'Shorts',      value: 'Shorts'      },
        { label: 'Cargo',       value: 'Cargo'       },
      ],
    },
    {
      group: 'Dresses / Full outfits', slot: 'full',
      items: [
        { label: 'Casual dress / Frock',    value: 'Casual Dress'  },
        { label: 'Party dress',             value: 'Party Dress'   },
        { label: 'Ethnic (Kurta / Lehenga)',value: 'Ethnic Outfit' },
      ],
    },
    {
      group: 'Shoes', slot: 'shoes',
      items: [
        { label: 'Sneakers',     value: 'Sneakers'     },
        { label: 'School shoes', value: 'School Shoes' },
        { label: 'Sandals',      value: 'Sandals'      },
        { label: 'Sports shoes', value: 'Sports Shoes' },
      ],
    },
    {
      group: 'Accessories', slot: 'accessory',
      items: [
        { label: 'Cap / Hat',      value: 'Cap' },
        { label: 'Bag / Backpack', value: 'Bag' },
      ],
    },
  ],
};

// ── Outfit slots — includes backward-compat old category names ─────────
export const OUTFIT_SLOTS = {
  Men: {
    top: [
      'T-Shirt Round Neck','T-Shirt Polo','Casual Shirt Half','Casual Shirt Full',
      'Formal Shirt','Kurta','Hoodie','Vest','Blazer','Jacket','Suit',
      'Shirt','T-Shirt', // ← backward compat
    ],
    bottom: ['Jeans','Chinos','Formal Trousers','Track Pants','Cargo','Shorts','Pants'],
    shoes:  ['Sneakers','Formal Shoes','Loafers','Sandals','Sports Shoes','Shoes'],
    accessory: ['Watch','Belt','Cap','Sunglasses','Accessories'],
  },
  Women: {
    top: [
      'T-Shirt','Crop Top','Blouse','Tank Top',
      'Kurti Casual','Kurti Formal','Salwar Suit',
      'Jacket','Blazer','Cardigan',
      'Top','Kurti', // ← backward compat
    ],
    full: [
      'Casual Dress','Formal Dress','Party Dress','Maxi Dress',
      'Saree','Lehenga','Anarkali',
      'Dress', // ← backward compat
    ],
    bottom: ['Jeans','Trousers','Skirt','Shorts','Leggings','Palazzo','Pants'],
    shoes:  ['Heels','Flats','Sneakers','Sandals','Sports Shoes','Shoes'],
    accessory: ['Dupatta','Handbag','Jewellery','Sunglasses','Accessories'],
  },
  Kids: {
    top:    ['T-Shirt Round Neck','T-Shirt Polo','Shirt','Hoodie','Vest','T-Shirt'],
    full:   ['Casual Dress','Party Dress','Ethnic Outfit','Dress'],
    bottom: ['Jeans','Track Pants','Shorts','Cargo','Pants'],
    shoes:  ['Sneakers','School Shoes','Sandals','Sports Shoes','Shoes'],
    accessory: ['Cap','Bag','Accessories'],
  },
};

// ── Occasion-locked style rules ────────────────────────────────────────
// preferred: use these sub-categories when available for this occasion
// blocked: never use these for this occasion (even if user tagged them)
export const OCCASION_RULES = {
  Men: {
    Office: {
      top:    ['Formal Shirt','Casual Shirt Full','T-Shirt Polo','Blazer','Kurta','Suit','Shirt'],
      bottom: ['Formal Trousers','Chinos','Pants'],
      shoes:  ['Formal Shoes','Loafers','Shoes'],
      blocked: ['T-Shirt Round Neck','Vest','Hoodie','Track Pants','Shorts','Cargo','Sports Shoes','Sandals'],
    },
    Gym: {
      top:    ['T-Shirt Round Neck','T-Shirt Polo','Vest','Hoodie','T-Shirt'],
      bottom: ['Track Pants','Shorts'],
      shoes:  ['Sports Shoes','Sneakers'],
      blocked: ['Formal Shirt','Blazer','Suit','Formal Trousers','Formal Shoes','Loafers','Chinos','Jeans','Cargo'],
    },
    Party: {
      top:    ['Formal Shirt','Kurta','Blazer','Suit','Casual Shirt Full','T-Shirt Polo','Jacket','Shirt'],
      bottom: ['Jeans','Chinos','Formal Trousers','Pants'],
      shoes:  ['Formal Shoes','Loafers','Sneakers','Shoes'],
      blocked: ['Track Pants','Shorts','Cargo','Vest','Sports Shoes','Sandals','Hoodie'],
    },
    Casual: { top: null, bottom: null, shoes: null, blocked: [] },
  },
  Women: {
    Office: {
      top:    ['Blouse','Kurti Formal','Salwar Suit','Blazer','T-Shirt','Top','Kurti'],
      full:   ['Formal Dress','Casual Dress','Saree','Anarkali','Dress'],
      bottom: ['Trousers','Jeans','Palazzo','Skirt','Pants'],
      shoes:  ['Heels','Flats','Sandals','Shoes'],
      blocked: ['Crop Top','Tank Top','Shorts','Leggings','Sports Shoes','Sneakers'],
    },
    Gym: {
      top:    ['T-Shirt','Tank Top','Crop Top'],
      full:   [],
      bottom: ['Shorts','Leggings'],
      shoes:  ['Sports Shoes','Sneakers'],
      blocked: ['Heels','Saree','Lehenga','Anarkali','Party Dress','Formal Dress','Blazer','Cardigan','Palazzo'],
    },
    Party: {
      top:    ['Blouse','Crop Top','Kurti Formal','T-Shirt'],
      full:   ['Party Dress','Maxi Dress','Saree','Lehenga','Anarkali','Dress'],
      bottom: ['Jeans','Skirt','Trousers','Palazzo'],
      shoes:  ['Heels','Flats','Sandals','Shoes'],
      blocked: ['Sports Shoes','Sneakers','Leggings','Shorts','Hoodie'],
    },
    Casual: { top: null, full: null, bottom: null, shoes: null, blocked: [] },
  },
  Kids: {
    Gym: {
      top:    ['T-Shirt Round Neck','T-Shirt Polo','Vest','T-Shirt'],
      full:   [],
      bottom: ['Track Pants','Shorts'],
      shoes:  ['Sports Shoes','Sneakers'],
      blocked: ['School Shoes','Party Dress','Ethnic Outfit','Sandals'],
    },
    Party: {
      top:    ['T-Shirt Polo','Shirt','T-Shirt'],
      full:   ['Party Dress','Ethnic Outfit','Dress'],
      bottom: ['Jeans','Cargo'],
      shoes:  ['Sneakers','School Shoes','Sandals','Shoes'],
      blocked: ['Track Pants','Shorts'],
    },
    Office: { top: null, bottom: null, shoes: null, full: null, blocked: [] },
    Casual: { top: null, bottom: null, shoes: null, full: null, blocked: [] },
  },
};

// ── Analytics categories (grouped for Settings screen) ────────────────
export const ANALYTICS_CATEGORIES = {
  Men: {
    'Tops':       ['T-Shirt Round Neck','T-Shirt Polo','Casual Shirt Half','Casual Shirt Full','Formal Shirt','Kurta','Hoodie','Vest','Shirt','T-Shirt'],
    'Outerwear':  ['Blazer','Jacket','Suit'],
    'Bottoms':    ['Jeans','Chinos','Formal Trousers','Track Pants','Cargo','Shorts','Pants'],
    'Shoes':      ['Sneakers','Formal Shoes','Loafers','Sandals','Sports Shoes','Shoes'],
    'Accessories':['Watch','Belt','Cap','Sunglasses','Accessories'],
  },
  Women: {
    'Western Tops': ['T-Shirt','Crop Top','Blouse','Tank Top','Top'],
    'Ethnic Tops':  ['Kurti Casual','Kurti Formal','Salwar Suit','Kurti'],
    'Dresses':      ['Casual Dress','Formal Dress','Party Dress','Maxi Dress','Dress'],
    'Ethnic Full':  ['Saree','Lehenga','Anarkali'],
    'Outerwear':    ['Jacket','Blazer','Cardigan'],
    'Bottoms':      ['Jeans','Trousers','Skirt','Shorts','Leggings','Palazzo','Pants'],
    'Shoes':        ['Heels','Flats','Sneakers','Sandals','Sports Shoes','Shoes'],
    'Accessories':  ['Dupatta','Handbag','Jewellery','Sunglasses','Accessories'],
  },
  Kids: {
    'Tops':         ['T-Shirt Round Neck','T-Shirt Polo','Shirt','Hoodie','Vest','T-Shirt'],
    'Dresses/Full': ['Casual Dress','Party Dress','Ethnic Outfit','Dress'],
    'Bottoms':      ['Jeans','Track Pants','Shorts','Cargo','Pants'],
    'Shoes':        ['Sneakers','School Shoes','Sandals','Sports Shoes','Shoes'],
    'Accessories':  ['Cap','Bag','Accessories'],
  },
};

// ── Weather exclusions ─────────────────────────────────────────────────
export const getWeatherExclusions = (temp, condition) => {
  const excl = new Set();
  if (temp > 32) {
    ['Hoodie','Suit','Blazer','Jacket','Cardigan','Casual Shirt Full',
     'Formal Shirt','Formal Trousers'].forEach(i => excl.add(i));
  } else if (temp > 27) {
    ['Hoodie','Suit'].forEach(i => excl.add(i));
  }
  if (condition === 'Rain' || condition === 'Drizzle') {
    ['Sandals','Flats'].forEach(i => excl.add(i));
  }
  return excl;
};

// ── Derive the slot for any item (old or new) ─────────────────────────
export const getItemSlot = (item, userGender) => {
  if (item.slot) return item.slot;
  const subCat = item.subCategory || item.category;
  const slots  = OUTFIT_SLOTS[userGender] || OUTFIT_SLOTS.Men;
  if (slots.top?.includes(subCat))      return 'top';
  if (slots.bottom?.includes(subCat))   return 'bottom';
  if (slots.full?.includes(subCat))     return 'full';
  if (slots.shoes?.includes(subCat))    return 'shoes';
  if (slots.accessory?.includes(subCat))return 'accessory';
  return 'top';
};

// ── Smart outfit builder ───────────────────────────────────────────────
// Takes the full eligible wardrobe (not archived, not worn)
// Handles all filtering, rules, weather, and color harmony internally
// Returns: { top, bottom, shoes, isFull } or null if not enough items
export const buildSmartOutfit = (eligibleWardrobe, occasion, userGender, weather) => {
  const slots        = OUTFIT_SLOTS[userGender] || OUTFIT_SLOTS.Men;
  const rules        = OCCASION_RULES[userGender]?.[occasion] || { blocked: [] };
  const weatherExcl  = weather
    ? getWeatherExclusions(weather.temp, weather.condition)
    : new Set();
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];

  // Filter by occasion — support both old string and new array format
  const forOcc = eligibleWardrobe.filter(item => {
    const occ = item.occasions || (item.occasion ? [item.occasion] : []);
    return occ.includes(occasion);
  });

  // Get items for a specific slot with all rules applied
  const getSlotItems = (slotName) => {
    const slotCats = slots[slotName] || [];

    let items = forOcc.filter(item => {
      const subCat   = item.subCategory || item.category;
      const itemSlot = item.slot || getItemSlot(item, userGender);
      return itemSlot === slotName || slotCats.includes(subCat);
    });

    // Weather exclusions (graceful: only exclude if items remain)
    const afterWeather = items.filter(i => !weatherExcl.has(i.subCategory || i.category));
    if (afterWeather.length > 0) items = afterWeather;

    // Blocked list (graceful: only block if items remain)
    if (rules.blocked?.length) {
      const notBlocked = items.filter(i => !rules.blocked.includes(i.subCategory || i.category));
      if (notBlocked.length > 0) items = notBlocked;
    }

    // Preferred list for this occasion + slot (graceful: only prefer if items remain)
    if (rules[slotName]) {
      const preferred = items.filter(i => rules[slotName].includes(i.subCategory || i.category));
      if (preferred.length > 0) return preferred;
    }

    return items;
  };

  // Women / Kids: try full outfit first (50/50 if both options available)
  if (slots.full) {
    const fullItems = getSlotItems('full');
    const shoes     = getSlotItems('shoes');
    if (fullItems.length > 0 && shoes.length > 0) {
      // Use full if no tops available, or randomly 50% of time
      const tops = getSlotItems('top');
      if (tops.length === 0 || Math.random() > 0.5) {
        return { top: rand(fullItems), bottom: null, shoes: rand(shoes), isFull: true };
      }
    }
  }

  const tops    = getSlotItems('top');
  const bottoms = getSlotItems('bottom');
  const shoes   = getSlotItems('shoes');

  if (!tops.length || !bottoms.length || !shoes.length) return null;

  // Pass 1: full color harmony (up to 20 attempts)
  for (let i = 0; i < 20; i++) {
    const top = rand(tops), bottom = rand(bottoms), shoe = rand(shoes);
    if (areColorsHarmonious(top.color, bottom.color) &&
        areColorsHarmonious(bottom.color, shoe.color)) {
      return { top, bottom, shoes: shoe, isFull: false };
    }
  }

  // Pass 2: at least top + bottom harmonious
  for (let i = 0; i < 10; i++) {
    const top = rand(tops), bottom = rand(bottoms);
    if (areColorsHarmonious(top.color, bottom.color)) {
      return { top, bottom, shoes: rand(shoes), isFull: false };
    }
  }

  // Pass 3: random fallback (never blocks generation)
  return { top: rand(tops), bottom: rand(bottoms), shoes: rand(shoes), isFull: false };
};