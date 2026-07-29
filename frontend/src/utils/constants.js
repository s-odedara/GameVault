// 🔥 SECURITY FIX: RAWG_API_KEY yahan se hata diya. Pehle ye
// `import.meta.env.VITE_RAWG_API_KEY` se aata tha — lekin Vite ke saare
// VITE_ variables FINAL BUILD BUNDLE mein bake ho jaate hain, matlab koi
// bhi browser DevTools se ye key nikaal sakta tha. Ab RAWG API sirf
// backend proxy (/api/rawg/...) ke through call hoti hai — key hamesha
// sirf server par rehti hai, kabhi frontend ko nahi bheji jaati.

// 🔥 FIX: Ye pehle hardcoded tha 'http://127.0.0.1:8000/api', jo sirf local
// machine par kaam karta hai. Ab ye .env se VITE_API_URL padhega — deploy
// karte time bas .env me apna real backend URL daal do, code kahin nahi
// badalna padega.
export const DJANGO_API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
export const API_BASE_URL = DJANGO_API_URL; // alias used across pages

// Backend root (no /api) — used for uploaded game cover images (MEDIA_URL)
export const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export const PLATFORM_MAP = {
  pc: { name: 'PC', slug: 'pc' },
  playstation: { name: 'PlayStation', slug: 'playstation' },
  xbox: { name: 'Xbox', slug: 'xbox' },
  nintendo: { name: 'Nintendo', slug: 'nintendo' },
  ios: { name: 'iOS', slug: 'ios' },
  android: { name: 'Android', slug: 'android' },
  mac: { name: 'Apple Macintosh', slug: 'mac' },
  linux: { name: 'Linux', slug: 'linux' },
  web: { name: 'Web', slug: 'web' },
};

// Metacritic score thresholds
export const METACRITIC_THRESHOLDS = {
  HIGH: 75,
  MEDIUM: 50,
};

// Order by options matching RAWG
export const ORDER_OPTIONS = [
  { value: '-added', label: 'Relevance' },
  { value: '-released', label: 'Date added' },
  { value: 'name', label: 'Name' },
  { value: '-released', label: 'Release date' },
  { value: '-metacritic', label: 'Popularity' },
  { value: '-rating', label: 'Average rating' },
];

export const STORE_MAP = {
  '1': 'Steam', '2': 'GamersGate', '3': 'GreenManGaming',
  '4': 'Amazon', '7': 'GOG', '8': 'Origin',
  '11': 'Humble Store', '24': 'Epic Games',
};
