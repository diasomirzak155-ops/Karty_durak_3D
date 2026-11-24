const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const must = (condition, message) => { if (!condition) throw new Error(message); };
const html = read('public/index.html');
const js = read('public/game.js');
const server = read('server.js');
const sw = read('public/sw.js');
const requiredAssets = [
  "parquet_floor_4k.jpg", "oxblood_leather_3k.jpg", "emerald_velvet_4k.jpg",
  "dark_oak_wall_4k.jpg", "antique_brass_2k.jpg", "tailored_wool_3k.jpg", "parquet_floor_2k.jpg", "oxblood_leather_2k.jpg", "emerald_velvet_2k.jpg", "dark_oak_wall_2k.jpg", "tailored_wool_2k.jpg", "antique_brass_1k.jpg", "parquet_height_2k.jpg", "leather_height_2k.jpg", "velvet_height_2k.jpg", "wall_height_2k.jpg", "cloth_height_2k.jpg", "brass_height_1k.jpg", "durak_sans.ttf", "durak_sans_bold.ttf", "durak_display_bold.ttf",
  'table_felt_4k.jpg', 'walnut_wood_4k.jpg', 'card_faces_52_atlas.jpg',
  'cardback_classic_2k.jpg', 'cardback_royal_2k.jpg', 'cardback_neon_2k.jpg',
  'cardback_zammler_2k.jpg', 'club_ambience.mp3', 'card_deal.wav',
  'card_place.wav', 'button_click.wav', 'your_turn.wav', 'club_emblem.png', 'evening_lounge.mp3', 'midnight_jazz.mp3', 'golden_waltz.mp3', 'copper_blues.mp3'
];
for (const file of requiredAssets) {
  const full = path.join(root, 'public', 'assets', file);
  must(fs.existsSync(full) && fs.statSync(full).size > 1000, `Missing/empty asset: ${file}`);
}
must(requiredAssets.every(file => sw.includes('\"' + file + '\"')), 'A required asset is missing from offline cache list');
must(html.includes('id="musicTrack"'), 'Music track selector is missing');
must(js.includes('musicTrackFiles') && js.includes('ambientMusic.load()'), 'Music track switching is missing');
must(html.includes('id="mainAction"'), 'Missing single context action');
must(!html.includes('id="pass"'), 'Old separate pass button still exists');
must(!js.includes('$("pass")'), 'Client still references removed pass button');
must(js.includes('"Взять карты"') && js.includes('"Перевести"') && js.includes('"Бито · следующий раунд"'), 'Context action labels are incomplete');
must(html.includes('Королевская игра — скоро'), 'Unimplemented royal mode must be marked unavailable');
must(server.includes('p.chips=200000') && server.includes('p.bonusClaimed=true') && server.includes('auth:register'), 'Registration bonus must be granted once when account is created');
must(server.includes('version:"5.0.6"'), 'Server health version mismatch');
must(server.includes('hashSessionToken') && server.includes('sessionFormat:"sha256-v1"'), 'Session tokens must be stored as hashes with legacy migration');
must(server.includes('loadSupabaseStore') && server.includes('persistSupabaseStore') && server.includes('/rest/v1/durak_state'), 'Supabase persistent storage integration is missing');
must(server.includes('apikey:SUPABASE_SECRET_KEY') && server.includes('SUPABASE_SECRET_KEY.startsWith(\"eyJ\")'), 'Supabase secret-key and legacy service-role handling is missing');
must(fs.existsSync(path.join(root, 'supabase', 'schema.sql')), 'Supabase SQL schema is missing');
must(read('render.yaml').includes('plan: free') && read('render.yaml').includes('SUPABASE_SECRET_KEY') && read('render.yaml').includes('REQUIRE_SUPABASE'), 'Render free deployment must require Supabase persistent storage');
must(server.includes('healthCheckPath: /health') || read('render.yaml').includes('healthCheckPath: /health'), 'Render health check is missing');
must(html.includes('id="rulesOpen"') && html.includes('id="rulesModal"'), 'Rules section is missing');
must(html.includes('id="musicVolume"'), 'Independent music volume control is missing');
must(js.includes('durak_music_volume') && js.includes('durak_music_track'), 'Music preferences are not persisted');
must(js.includes('userData.head.rotation.y') && js.includes('userData.legs.forEach'), 'Human character idle animation is missing');
must(server.includes('ACHIEVEMENTS=') && server.includes('syncAchievements'), 'Server-side achievement progression is missing');
must(server.includes('achievement:claim') && server.includes('claimedAchievements') && server.includes('p.chips+=a.reward'), 'One-time server-validated achievement rewards are missing');
must(js.includes('data-claim-achievement') && js.includes('achievement:claim'), 'Achievement reward claim UI is missing');
must(html.includes('id="achievementsOpen"') && html.includes('id="achievementsList"'), 'Achievements UI is missing');
must(js.includes('function renderAchievements()'), 'Achievements renderer is missing');
must(!html.includes('leaderboardOpen') && !server.includes('leaderboard:get') && !js.includes('leaderboard:update'), 'Unwanted global leaderboard must be removed');
must(server.includes('p.chips=200000') && server.includes('auth:register'), 'Welcome bonus must be granted once during registration');
must(server.includes('crypto.scryptSync') && server.includes('timingSafeEqual') && server.includes('auth:login'), 'Secure username/password authentication is missing');
must(html.includes('id="authModal"') && html.includes('id="authUsername"') && html.includes('id="authPassword"'), 'Username/password login UI is missing');
must(js.includes('durak_account_token') && js.includes('auth:register') && js.includes('auth:login'), 'Persistent account session client flow is missing');
must(html.includes('id="shopOpen"') && html.includes('id="shopList"'), 'Cosmetic shop UI is missing');
must(server.includes('shop:buy') && server.includes('shop:equip') && server.includes('ownedDecks'), 'Server-validated cosmetic shop is missing');
must(js.includes('shop:update') && js.includes('shop:buy') && js.includes('shop:equip'), 'Cosmetic shop client flow is missing');
must(html.includes('id="friendsOpen"') && html.includes('id="friendsList"'), 'Friends UI is missing');
must(server.includes('friends:get') && server.includes('friend:remove') && server.includes('friend:add'), 'Friends server flow is missing');
must(js.includes('friends:list') && js.includes('friends:get') && js.includes('friend:remove'), 'Friends client flow is missing');
must(js.includes('URLSearchParams(location.search).get("room")') && js.includes('room:join'), 'Direct room-link auto join is missing');
must(js.includes('navigator.share') && js.includes('inviteUrl.href'), 'Shareable room invitation link is missing');
must(html.includes('Пригласить по ссылке'), 'Invite-by-link button is missing');
console.log(`Smoke check passed: ${requiredAssets.length} assets, achievements progression/UI, profile bonus, cosmetic shop, achievements, no global leaderboard, friends management, private room links, and compact 5.0 settings.`);
