const CACHE = "durak-online-link-v5-5";
const CORE = [
  "/", "/index.html", "/game.js", "/manifest.webmanifest",
  ...[
    "antique_brass_1k.jpg", "antique_brass_2k.jpg", "brass_height_1k.jpg",
    "button_click.wav", "copper_blues.mp3", "card_deal.wav", "card_faces_52_atlas.jpg", "card_place.wav",
    "cardback_classic_2k.jpg", "cardback_neon_2k.jpg", "cardback_royal_2k.jpg", "cardback_zammler_2k.jpg",
    "cloth_height_2k.jpg", "club_ambience.mp3", "club_emblem.png", "club_icon_192.png", "club_icon_512.png",
    "dark_oak_wall_2k.jpg", "dark_oak_wall_4k.jpg", "durak_display_bold.ttf", "durak_sans.ttf", "durak_sans_bold.ttf",
    "emerald_velvet_2k.jpg", "emerald_velvet_4k.jpg", "evening_lounge.mp3", "golden_waltz.mp3",
    "leather_height_2k.jpg", "midnight_jazz.mp3", "oxblood_leather_2k.jpg", "oxblood_leather_3k.jpg",
    "parquet_floor_2k.jpg", "parquet_floor_4k.jpg", "parquet_height_2k.jpg", "table_felt_4k.jpg",
    "tailored_wool_2k.jpg", "tailored_wool_3k.jpg", "velvet_height_2k.jpg", "wall_height_2k.jpg",
    "walnut_wood_4k.jpg", "your_turn.wav"
  ].map(name => "/assets/" + name)
];
self.addEventListener("install", event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())
));
self.addEventListener("activate", event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/socket.io/")) return;
  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match("/index.html")))
  );
});
