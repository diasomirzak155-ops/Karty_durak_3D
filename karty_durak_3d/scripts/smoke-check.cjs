const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const must = (condition, message) => { if (!condition) throw new Error(message); };
const html = read('public/index.html');
const js = read('public/game.js');
const server = read('server.js');
const requiredAssets = [
  'table_felt_4k.jpg', 'walnut_wood_4k.jpg', 'card_faces_52_atlas.jpg',
  'cardback_classic_2k.jpg', 'cardback_royal_2k.jpg', 'cardback_neon_2k.jpg',
  'cardback_zammler_2k.jpg', 'club_ambience.wav', 'card_deal.wav',
  'card_place.wav', 'button_click.wav', 'your_turn.wav', 'club_emblem.png'
];
for (const file of requiredAssets) {
  const full = path.join(root, 'public', 'assets', file);
  must(fs.existsSync(full) && fs.statSync(full).size > 1000, `Missing/empty asset: ${file}`);
}
must(html.includes('id="mainAction"'), 'Missing single context action');
must(!html.includes('id="pass"'), 'Old separate pass button still exists');
must(!js.includes('$("pass")'), 'Client still references removed pass button');
must(js.includes('"Взять карты"') && js.includes('"Перевести"') && js.includes('"Бито · следующий раунд"'), 'Context action labels are incomplete');
must(html.includes('Королевская игра — скоро'), 'Unimplemented royal mode must be marked unavailable');
must(server.includes('profileComplete=true') && server.includes('p.chips+=1000000'), 'One-time profile bonus flow missing');
must(server.includes('version:"4.3.0"'), 'Server health version is not 4.3.0');
console.log(`Smoke check passed: ${requiredAssets.length} assets, single action button, profile bonus, and v4.3 server marker.`);
