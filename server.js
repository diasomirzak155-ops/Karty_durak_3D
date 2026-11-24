const express=require("express"),http=require("http"),crypto=require("crypto"),fs=require("fs"),path=require("path");
const {Server}=require("socket.io");
const {beats,canThrow,nextPlayerIndex}=require("./game-rules");
const app=express(),server=http.createServer(app),io=new Server(server,{cors:{origin:"*"}});
app.use(express.static(path.join(__dirname,"public")));
const DATA_DIR=process.env.DATA_DIR||__dirname;
fs.mkdirSync(DATA_DIR,{recursive:true});
const DATA=path.join(DATA_DIR,"data.json");
const suits=["♠","♥","♦","♣"],ranks=["6","7","8","9","10","J","Q","K","A"];
let store={profiles:{},friends:{},accounts:{},sessions:{}};
const ACHIEVEMENTS=[{id:"first_win",name:"Первая победа",desc:"Выиграй первую партию",goal:1,field:"wins",reward:500},{id:"wins_5",name:"Уверенная игра",desc:"Одержи 5 побед",goal:5,field:"wins",reward:1500},{id:"wins_10",name:"Опытный игрок",desc:"Одержи 10 побед",goal:10,field:"wins",reward:3000},{id:"wins_25",name:"Тактик",desc:"Одержи 25 побед",goal:25,field:"wins",reward:7500},{id:"wins_50",name:"Мастер стола",desc:"Одержи 50 побед",goal:50,field:"wins",reward:15000},{id:"wins_100",name:"Легенда клуба",desc:"Одержи 100 побед",goal:100,field:"wins",reward:30000},{id:"games_10",name:"Постоянный гость",desc:"Сыграй 10 партий",goal:10,field:"games",reward:2000},{id:"games_50",name:"Свой человек",desc:"Сыграй 50 партий",goal:50,field:"games",reward:10000},{id:"games_100",name:"Душа клуба",desc:"Сыграй 100 партий",goal:100,field:"games",reward:25000},{id:"chips_100k",name:"Богатый запас",desc:"Накопи 100 000 фишек",goal:100000,field:"chips",reward:100000}];
function syncAchievements(p){p.games=Number(p.games)||0;p.wins=Number(p.wins)||0;p.chips=Number(p.chips)||0;p.claimedAchievements=Array.isArray(p.claimedAchievements)?p.claimedAchievements:[];p.achievements=ACHIEVEMENTS.map(a=>({id:a.id,name:a.name,description:a.desc,goal:a.goal,reward:a.reward,progress:Math.min(a.goal,Number(p[a.field])||0),unlocked:(Number(p[a.field])||0)>=a.goal,claimed:p.claimedAchievements.includes(a.id)}));return p;}
try{if(fs.existsSync(DATA))store={...store,...JSON.parse(fs.readFileSync(DATA,"utf8"))}}catch(e){console.error("Data file read error:",e.message)}
let saveTimer=null;
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{let tmp=DATA+".tmp";fs.writeFileSync(tmp,JSON.stringify(store));fs.renameSync(tmp,DATA)}catch(e){console.error("Save error:",e.message)}},150)}
const rooms=new Map();
const deck=(count=36)=>{const selected=count===24?ranks.slice(3):ranks;return suits.flatMap(s=>selected.map(r=>({id:r+s,rank:r,suit:s,value:ranks.indexOf(r)+6})));};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const profile=(uid,d={})=>{uid=String(uid||"").slice(0,80)||"guest";if(!store.profiles[uid])store.profiles[uid]={id:uid,name:String(d.name||"Игрок").slice(0,20),age:Math.max(13,Math.min(99,+d.age||18)),avatar:null,chips:0,wins:0,losses:0,bonusClaimed:false,profileComplete:false,createdAt:Date.now(),games:0,ownedDecks:["classic"],equippedDeck:"classic"};save();syncAchievements(store.profiles[uid]);return store.profiles[uid]};
const roomOf=s=>[...rooms.values()].find(r=>r.players.some(p=>p.id===s.id));
const playerIndex=(r,s)=>r.players.findIndex(p=>p.id===s.id);
function publicRoom(r){return {code:r.code,host:r.host,settings:r.settings,players:r.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar||null,age:p.age,handCount:p.hand.length,online:p.online!==false,gesture:p.gesture||null})),status:r.status,trump:r.trump,trumpCard:r.trumpCard||null,deckCount:r.deck.length,table:r.table,turn:r.turn,attacker:r.attacker,defender:r.defender,phase:r.phase,lastAction:r.lastAction,winner:r.winner};}
const publish=r=>io.to(r.code).emit("room:update",publicRoom(r));
function sendHands(r){r.players.forEach(p=>io.to(p.id).emit("hand:update",p.hand))}
function err(s,m){s.emit("error:message",m)}
function nextActive(r,from,skipDefender=true){return nextPlayerIndex(r.players,from,r.deck.length,skipDefender?r.defender:-1)}
function finishIfNeeded(r){
 if(r.deck.length)return false;
 const alive=r.players.filter(p=>p.hand.length>0);
 if(alive.length<=1){
  r.status="finished";r.phase="finished";
  const winners=r.players.filter(p=>p.hand.length===0);
  const losers=alive;
  r.players.forEach(p=>{const stats=profile(p.uid);stats.games=(Number(stats.games)||0)+1;});
  r.winner=winners.map(p=>p.name).join(", ")||null;
  const pot=r.settings.entry*r.players.length;
  if(winners.length){
   const share=Math.floor(pot/winners.length);
   winners.forEach(p=>{const prof=profile(p.uid);prof.wins++;prof.chips+=share;syncAchievements(prof)});
   losers.forEach(p=>{const prof=profile(p.uid);prof.losses++;syncAchievements(prof)});
  }else{
   // Everyone still has cards: the game is a draw, so return the virtual entry fee.
   r.players.forEach(p=>{const prof=profile(p.uid);prof.chips+=r.settings.entry;syncAchievements(prof)});
  }
  save();
  r.lastAction=losers.length?`${losers[0].name} остался с картами и проиграл. Победители: ${r.winner||"нет"}`:"Ничья! Все игроки закончили одновременно.";
  return true;
 }
 return false;
}
function refill(r){let order=[];for(let n=0;n<r.players.length;n++)order.push((r.attacker+n)%r.players.length);for(const i of order){let p=r.players[i];while(p.hand.length<6&&r.deck.length)p.hand.push(r.deck.shift())}}
function beginRound(r,defenderTook=false){
 if(defenderTook){r.attacker=nextActive(r,r.defender);r.defender=nextActive(r,r.attacker,false)}
 else {r.attacker=nextActive(r,r.defender);r.defender=nextActive(r,r.attacker,false)}
 r.turn=r.attacker;r.phase="attack";r.table=[];refill(r);r.roundLimit=r.players[r.defender]?.hand.length||0;finishIfNeeded(r);
}
function start(r){
 let d=shuffle(deck(r.settings.deckCount));r.trumpCard=d[d.length-1];r.trump=d[d.length-1].suit;r.deck=d;r.players.forEach(p=>p.hand=r.deck.splice(0,6));
 let low=null,idx=0;r.players.forEach((p,i)=>p.hand.forEach(c=>{if(c.suit===r.trump&&(!low||c.value<low.value)){low=c;idx=i}}));
 r.table=[];r.status="playing";r.attacker=idx;r.defender=nextActive(r,idx,false);r.roundLimit=r.players[r.defender]?.hand.length||0;r.turn=idx;r.phase="attack";r.winner=null;r.lastAction="Карты розданы. Начинает игрок с младшим козырем.";
 publish(r);sendHands(r);
}
io.on("connection",s=>{
 let uid=store.sessions[String(s.handshake.auth?.token||"")]||null;s.data.uid=uid;
 const requireAuth=()=>{if(!uid){err(s,"Сначала войди в аккаунт");return false}return true};
 const issueSession=id=>{const token=crypto.randomBytes(32).toString("hex");store.sessions[token]=id;uid=id;s.data.uid=id;save();s.emit("auth:success",{token,username:store.accounts[id].username});s.emit("profile:update",profile(id));};
 s.on("auth:register",d=>{if(uid)return err(s,"Сначала выйди из текущего аккаунта");const username=String(d?.username||"").trim();const normalized=username.toLowerCase();const password=String(d?.password||"");if(!/^[a-zA-Z0-9_]{3,20}$/.test(username))return err(s,"Логин: 3–20 символов, латинские буквы, цифры или _");if(password.length<8||password.length>72)return err(s,"Пароль должен содержать от 8 до 72 символов");if(Object.values(store.accounts).some(a=>a.username.toLowerCase()===normalized))return err(s,"Такой логин уже занят");const id=crypto.randomUUID(),salt=crypto.randomBytes(16).toString("hex"),hash=crypto.scryptSync(password,salt,64).toString("hex");store.accounts[id]={username,salt,hash,createdAt:Date.now()};const p=profile(id,{name:username});p.name=username;p.chips=200000;p.bonusClaimed=true;p.profileComplete=true;save();issueSession(id);});
 s.on("auth:login",d=>{if(uid)return err(s,"Ты уже вошёл в аккаунт");const username=String(d?.username||"").trim().toLowerCase(),password=String(d?.password||"");const account=Object.entries(store.accounts).find(([,a])=>a.username.toLowerCase()===username);if(!account)return err(s,"Неверный логин или пароль");const [id,a]=account;const actual=crypto.scryptSync(password,a.salt,64),expected=Buffer.from(a.hash,"hex");if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return err(s,"Неверный логин или пароль");issueSession(id);});
 s.on("auth:logout",()=>{for(const [token,id] of Object.entries(store.sessions))if(id===uid)delete store.sessions[token];uid=null;s.data.uid=null;save();s.emit("auth:logged-out")});
 s.on("profile:get",d=>{if(!requireAuth())return;let p=profile(uid,d||{});s.emit("profile:update",p)});
 s.on("shop:get",()=>{if(!requireAuth())return;const p=profile(uid);s.emit("shop:update",{chips:p.chips,ownedDecks:p.ownedDecks||["classic"],equippedDeck:p.equippedDeck||"classic",items:[{id:"classic",name:"Классическая",price:0,description:"Традиционная рубашка карт"},{id:"premium",name:"Премиальная",price:25000,description:"Золотая рамка и благородный орнамент"},{id:"neon",name:"Неоновая",price:50000,description:"Яркий неоновый стиль"},{id:"zammler",name:"Zammler Edition",price:100000,description:"Коллекционное оформление клуба"}]})});
 s.on("shop:buy",id=>{if(!requireAuth())return;const items={premium:25000,neon:50000,zammler:100000};if(!Object.prototype.hasOwnProperty.call(items,id))return err(s,"Такого товара нет в магазине");const p=profile(uid);p.ownedDecks=p.ownedDecks||["classic"];if(p.ownedDecks.includes(id))return err(s,"Этот дизайн уже куплен");if(p.chips<items[id])return err(s,"Недостаточно фишек");p.chips-=items[id];p.ownedDecks.push(id);p.equippedDeck=id;save();s.emit("profile:update",p);s.emit("shop:result",{ok:true,message:"Покупка успешна"});s.emit("shop:update",{chips:p.chips,ownedDecks:p.ownedDecks,equippedDeck:p.equippedDeck,items:[{id:"classic",name:"Классическая",price:0,description:"Традиционная рубашка карт"},{id:"premium",name:"Премиальная",price:25000,description:"Золотая рамка и благородный орнамент"},{id:"neon",name:"Неоновая",price:50000,description:"Яркий неоновый стиль"},{id:"zammler",name:"Zammler Edition",price:100000,description:"Коллекционное оформление клуба"}]})});
 s.on("shop:equip",id=>{if(!requireAuth())return;const p=profile(uid);p.ownedDecks=p.ownedDecks||["classic"];if(!p.ownedDecks.includes(id))return err(s,"Сначала купи этот дизайн");p.equippedDeck=id;save();s.emit("profile:update",p);s.emit("shop:result",{ok:true,message:"Оформление применено"})});
 s.on("achievement:claim",id=>{if(!requireAuth())return;const a=ACHIEVEMENTS.find(x=>x.id===id);if(!a)return err(s,"Достижение не найдено");const p=profile(uid);syncAchievements(p);const state=p.achievements.find(x=>x.id===id);if(!state?.unlocked)return err(s,"Сначала выполни условие достижения");if(state.claimed)return err(s,"Награда уже получена");p.claimedAchievements.push(id);p.chips+=a.reward;syncAchievements(p);save();s.emit("profile:update",p);s.emit("achievement:result",{ok:true,message:`Получена награда: ${a.reward.toLocaleString("ru-RU")} фишек`})});

 s.on("profile:update",d=>{if(!requireAuth())return;let p=profile(uid);p.name=String(d.name||p.name).trim().slice(0,20)||"Игрок";if(typeof d.avatar==="string"&&d.avatar.startsWith("data:image/")&&d.avatar.length<120000)p.avatar=d.avatar;p.profileComplete=true;for(const r of rooms.values()){const rp=r.players.find(x=>x.uid===uid);if(rp){rp.name=p.name;rp.avatar=p.avatar;publish(r)}}save();s.emit("profile:update",p)});
 s.on("room:create",d=>{if(!requireAuth())return;
  let code;do{code=crypto.randomBytes(3).toString("hex").toUpperCase()}while(rooms.has(code));let p=profile(uid);
  let r={code,host:s.id,settings:{mode:d.mode==="transfer"?"transfer":"throw",deckCount:+d.deckCount===24?24:36,maxPlayers:Math.max(2,Math.min(6,+d.maxPlayers||2)),entry:Math.max(0,Math.min(10000000,+d.entry||0)),deck:(profile(uid).ownedDecks||["classic"]).includes(d.deck)?d.deck:(profile(uid).equippedDeck||"classic"),gestures:d.gestures!==false},players:[{id:s.id,uid,name:p.name,avatar:p.avatar||null,age:p.age,hand:[],online:true,gesture:null,lastGestureAt:0}],deck:[],table:[],trump:null,status:"lobby",turn:0,attacker:0,defender:1,phase:"lobby",lastAction:"Ожидание игроков",winner:null};
  rooms.set(code,r);s.join(code);s.emit("room:joined",publicRoom(r));publish(r);
 });
 s.on("room:join",code=>{if(!requireAuth())return;
  let r=rooms.get(String(code||"").toUpperCase());if(!r)return err(s,"Комната не найдена");
  const existing=r.players.find(x=>x.uid===uid);
  if(existing){
   if(existing.online!==false)return err(s,"Ты уже за этим столом");
   existing.id=s.id;existing.online=true;existing.name=profile(uid).name;
   if(r.host===existing.previousId)r.host=s.id;
   s.join(r.code);s.emit("room:joined",publicRoom(r));s.emit("hand:update",existing.hand);publish(r);return;
  }
  if(r.status!=="lobby"||r.players.length>=r.settings.maxPlayers)return err(s,"Стол уже заполнен");
  let p=profile(uid);r.players.push({id:s.id,uid,name:p.name,avatar:p.avatar||null,age:p.age,hand:[],online:true,gesture:null,lastGestureAt:0});s.join(r.code);s.emit("room:joined",publicRoom(r));publish(r);
 });
 s.on("room:start",()=>{if(!requireAuth())return;let r=roomOf(s);if(!r||r.host!==s.id)return;if(r.players.length<2)return err(s,"Нужно минимум два игрока");
  for(let p of r.players)if(profile(p.uid).chips<r.settings.entry)return err(s,"Недостаточно фишек у "+p.name);
  r.players.forEach(p=>{profile(p.uid).chips-=r.settings.entry});save();start(r);
 });
 s.on("game:play",id=>{if(!requireAuth())return;
  let r=roomOf(s);if(!r||r.status!=="playing")return;let i=playerIndex(r,s),p=r.players[i];
  if(i<0||i===r.defender)return err(s,"Защитник не может подкидывать");
  if(!["attack","defend","throw"].includes(r.phase))return err(s,"Сейчас нельзя подкидывать — дождись защиты");
  if(r.phase==="attack"&&i!==r.attacker)return err(s,"Первым ходит атакующий");
  if(i===r.defender)return err(s,"Защитник не может подкидывать");
  let ci=p.hand.findIndex(c=>c.id===id);if(ci<0)return;let c=p.hand[ci];
  const ranksOnTable=r.table.flatMap(t=>[t.attack.rank,...(t.defense?[t.defense.rank]:[])]);
  if(r.table.length&& !ranksOnTable.includes(c.rank))return err(s,"Подкидывать можно только карты совпадающего достоинства");
  if(!canThrow(r.table,c,r.roundLimit))return err(s,"Эту карту нельзя подкинуть или достигнут лимит карт");
  p.hand.splice(ci,1);r.table.push({attack:c,by:i,defense:null});r.phase="defend";r.turn=r.defender;r.lastAction=p.name+" атакует";
  publish(r);sendHands(r);
 });
 s.on("game:defend",id=>{if(!requireAuth())return;
  let r=roomOf(s);if(!r||r.status!=="playing"||r.phase!=="defend")return;let i=playerIndex(r,s);
  if(i!==r.defender)return err(s,"Сейчас не твоя защита");
  let p=r.players[i],ci=p.hand.findIndex(c=>c.id===id);if(ci<0)return;let c=p.hand[ci],t=r.table.find(x=>!x.defense);if(!t)return;
  if(!beats(c,t.attack,r.trump))return err(s,"Эта карта не бьёт атаку");
  p.hand.splice(ci,1);t.defense=c;
  if(r.table.every(x=>x.defense)){r.phase="throw";r.turn=r.attacker;r.lastAction=p.name+" отбился. Можно завершить раунд или подкинуть";}
  else {r.phase="defend";r.turn=r.defender;r.lastAction=p.name+" отбивается";}
  publish(r);sendHands(r);
 });
 s.on("game:take",()=>{if(!requireAuth())return;
  let r=roomOf(s);if(!r||r.status!=="playing"||playerIndex(r,s)!==r.defender||r.phase!=="defend"||!r.table.some(t=>!t.defense))return err(s,"Сейчас нельзя брать карты");
  let p=r.players[r.defender];r.table.forEach(t=>{p.hand.push(t.attack);if(t.defense)p.hand.push(t.defense)});
  r.lastAction=p.name+" забирает карты";r.table=[];beginRound(r,true);publish(r);sendHands(r);
 });
 s.on("game:pass",()=>{if(!requireAuth())return;
  let r=roomOf(s);if(!r||r.status!=="playing"||!["throw","defend"].includes(r.phase)||playerIndex(r,s)!==r.attacker)return err(s,"Завершить раунд может атакующий");
  if(r.table.some(t=>!t.defense))return err(s,"Сначала нужно отбиться или забрать карты");
  r.lastAction="Все карты побиты. Следующий раунд";r.table=[];beginRound(r,false);publish(r);sendHands(r);
 });
 s.on("game:transfer",id=>{if(!requireAuth())return;
  let r=roomOf(s);if(!r||r.settings.mode!=="transfer"||r.status!=="playing"||r.phase!=="defend"||playerIndex(r,s)!==r.defender)return err(s,"Перевод сейчас недоступен");
  let p=r.players[r.defender],ci=p.hand.findIndex(c=>c.id===id),t=r.table.find(x=>!x.defense);
  if(ci<0||!t)return;let c=p.hand[ci];if(c.rank!==t.attack.rank)return err(s,"Для перевода нужна карта того же достоинства");
  let ni=nextActive(r,r.defender,false);if(ni===r.defender||r.players[ni].hand.length<r.table.length+1)return err(s,"Следующему игроку не хватает карт для перевода");
  p.hand.splice(ci,1);r.table.push({attack:c,by:r.defender,defense:null});r.defender=ni;r.roundLimit=r.players[ni].hand.length;r.turn=ni;r.phase="defend";r.lastAction=p.name+" переводит атаку на "+r.players[ni].name;publish(r);sendHands(r);
 });
 s.on("player:gesture",kind=>{if(!requireAuth())return;
  const r=roomOf(s);if(!r||r.status==="finished")return;
  const p=r.players.find(x=>x.id===s.id);if(!p)return;
  const allowed=["wave","thumbs","middle","clap"];
  if(!allowed.includes(kind))return err(s,"Неизвестная эмоция");
  if(Date.now()-(p.lastGestureAt||0)<1800)return err(s,"Подожди немного перед следующей эмоцией");
  p.lastGestureAt=Date.now();p.gesture={kind,at:Date.now()};
  io.to(r.code).emit("player:gesture",{playerId:s.id,kind,name:p.name});
  publish(r);
 });
 const sendFriends=()=>{const ids=Array.isArray(store.friends[uid])?store.friends[uid]:[];s.emit("friends:list",ids.map(id=>store.profiles[id]).filter(Boolean).map(p=>({id:p.id,name:p.name,wins:Number(p.wins)||0,online:[...io.sockets.sockets.values()].some(x=>x.data.uid===p.id)})))};
 s.on("friends:get",()=>{if(requireAuth())sendFriends()});
 s.on("friend:add",name=>{if(!requireAuth())return;const clean=String(name||"").trim().slice(0,20);let target=Object.values(store.profiles).find(p=>p.name.toLowerCase()===clean.toLowerCase());if(!target)return err(s,"Игрок не найден");if(target.id===uid)return err(s,"Нельзя добавить самого себя");if(!store.friends[uid])store.friends[uid]=[];if(!store.friends[uid].includes(target.id))store.friends[uid].push(target.id);save();sendFriends()});
 s.on("friend:remove",id=>{if(!requireAuth())return;if(!store.friends[uid])return;store.friends[uid]=store.friends[uid].filter(x=>x!==String(id));save();sendFriends()});
 s.on("disconnect",()=>{let r=roomOf(s);if(!r)return;let p=r.players.find(x=>x.id===s.id);if(p)p.online=false;
  if(r.status==="lobby"){r.players=r.players.filter(x=>x.id!==s.id);if(!r.players.length)rooms.delete(r.code);else{if(r.host===s.id)r.host=r.players[0].id;publish(r)}}else{if(p){p.online=false;p.previousId=p.id;}r.lastAction=(p?.name||"Игрок")+" отключился — можно вернуться по коду комнаты";publish(r)}
 });
});
app.get("/health",(q,res)=>res.json({ok:true,rooms:rooms.size,profiles:Object.keys(store.profiles).length,version:"5.0.0-link.3"}));
const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log("Durak Online 3D link build on "+PORT));
