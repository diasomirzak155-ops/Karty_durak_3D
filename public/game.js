import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const tokenKey="durak_account_token";let accountToken=localStorage.getItem(tokenKey);const socket=io({auth:{token:accountToken||""}}),$=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString("ru-RU");
let room=null,hand=[],selectedCard=null,transferMode=false,profile=null,scene,camera,renderer,clock,tableGroup,cardGroup,cardMeshes=[],musicOn=false,audioCtx=null,animationMixers=[];
const assetBase="/assets/",textureLoader=new THREE.TextureLoader(),assetTextures={},faceTextures={},bumpTextures={};
const mobileTextureVariants={"parquet_floor_4k.jpg":"parquet_floor_2k.jpg","oxblood_leather_3k.jpg":"oxblood_leather_2k.jpg","emerald_velvet_4k.jpg":"emerald_velvet_2k.jpg","dark_oak_wall_4k.jpg":"dark_oak_wall_2k.jpg","tailored_wool_3k.jpg":"tailored_wool_2k.jpg","antique_brass_2k.jpg":"antique_brass_1k.jpg"};
const bumpVariants={"parquet_floor_4k.jpg":"parquet_height_2k.jpg","oxblood_leather_3k.jpg":"leather_height_2k.jpg","emerald_velvet_4k.jpg":"velvet_height_2k.jpg","dark_oak_wall_4k.jpg":"wall_height_2k.jpg","tailored_wool_3k.jpg":"cloth_height_2k.jpg","antique_brass_2k.jpg":"brass_height_1k.jpg"};
function repeatTexture(name,x=1,y=1){const t=loadTexture(name);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(x,y);return t;}
function repeatBump(name,x=1,y=1){const file=bumpVariants[name]||name;if(!bumpTextures[file]){bumpTextures[file]=textureLoader.load(assetBase+file);bumpTextures[file].colorSpace=THREE.NoColorSpace;}const t=bumpTextures[file];t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(x,y);return t;}
if(localStorage.getItem("durak_sfx_volume"))$("volume").value=localStorage.getItem("durak_sfx_volume");
const ambientMusic=new Audio(assetBase+(localStorage.getItem("durak_music_track")||"golden_waltz.mp3"));ambientMusic.loop=true;ambientMusic.preload="auto";ambientMusic.volume=(Number(localStorage.getItem("durak_music_volume")??28)/100)*.24;
const musicTrackFiles={"club_ambience.mp3":"club_ambience.mp3","evening_lounge.mp3":"evening_lounge.mp3","midnight_jazz.mp3":"midnight_jazz.mp3","golden_waltz.mp3":"golden_waltz.mp3","copper_blues.mp3":"copper_blues.mp3"};
const soundFiles={place:assetBase+"card_place.wav",deal:assetBase+"card_deal.wav",click:assetBase+"button_click.wav",turn:assetBase+"your_turn.wav"};
function playSfx(kind){try{const a=new Audio(soundFiles[kind]);a.volume=(+$("volume").value/100)*.7;a.play().catch(()=>{})}catch(e){}}
function loadTexture(name){const quality=$("graphics")?.value||"medium";if(quality!=="high")name=mobileTextureVariants[name]||name;if(!assetTextures[name]){assetTextures[name]=textureLoader.load(assetBase+name);assetTextures[name].colorSpace=THREE.SRGBColorSpace;assetTextures[name].anisotropy=renderer?.capabilities?.getMaxAnisotropy?.()||8;assetTextures[name].minFilter=THREE.LinearMipmapLinearFilter;assetTextures[name].magFilter=THREE.LinearFilter;}return assetTextures[name]}
function atlasFace(card){
 const key=(card?.suit||"?")+(card?.rank||"?");if(faceTextures[key])return faceTextures[key];
 const c=document.createElement("canvas");c.width=512;c.height=736;const x=c.getContext("2d");x.scale(2,2);
 x.fillStyle="#f8f2e4";x.fillRect(0,0,256,368);
 x.strokeStyle="#b79a62";x.lineWidth=7;x.strokeRect(5,5,246,358);x.strokeStyle="#e2d2ad";x.lineWidth=2;x.strokeRect(13,13,230,342);
 const red="♥♦".includes(card?.suit),ink=red?"#a9222a":"#17231d";
 x.fillStyle=ink;x.textAlign="left";x.font="bold 48px Georgia";x.fillText(card?.rank||"?",24,62);x.font="46px Georgia";x.fillText(card?.suit||"?",25,108);
 x.save();x.translate(256,368);x.rotate(Math.PI);x.textAlign="left";x.font="bold 48px Georgia";x.fillText(card?.rank||"?",24,62);x.font="46px Georgia";x.fillText(card?.suit||"?",25,108);x.restore();
 x.textAlign="center";x.textBaseline="middle";x.fillStyle=ink;
 const rank=card?.rank||"";if(["J","Q","K"].includes(rank)){
  x.font="bold 118px Georgia";x.fillText(rank,128,180);
  x.font="62px Georgia";x.fillText(card?.suit||"",128,263);
 }else{
  const n=Math.max(1,Math.min(10,parseInt(rank,10)||1)),positions=[[128,185],[128,112],[128,258],[78,135],[178,135],[78,235],[178,235],[78,82],[178,82],[78,288]];
  x.font="52px Georgia";for(let i=0;i<n;i++){const q=positions[i];x.fillText(card?.suit||"",q[0],q[1]);}
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer?.capabilities?.getMaxAnisotropy?.()||8;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;faceTextures[key]=t;return t;
}
socket.on("connect",()=>{if(accountToken){socket.emit("profile:get",{});const invite=new URLSearchParams(location.search).get("room");if(invite&&/^[A-F0-9]{6}$/i.test(invite)){ $("roomCode").value=invite.toUpperCase();socket.emit("room:join",invite.toUpperCase());history.replaceState({},"",location.pathname);}}else openModal("authModal")});
socket.on("auth:success",d=>{accountToken=d.token;localStorage.setItem(tokenKey,accountToken);location.reload()});
socket.on("auth:logged-out",()=>{localStorage.removeItem(tokenKey);location.reload()});
socket.on("profile:update",p=>{profile=p;renderAchievements();if($("deck"))$("deck").value=p.equippedDeck||"classic";$("chips").textContent=fmt(p.chips);$("playerName").value=p.name||"Игрок";if(p.avatar){$("avatarPreview").innerHTML=`<img alt="Аватарка" src="${p.avatar}" style="width:72px;height:72px;object-fit:cover;border-radius:50%;border:2px solid #c6a65e">`;}if(!p.profileComplete)openModal("profileModal");});
socket.on("room:joined",r=>{try{screen.orientation?.lock?.("portrait").catch(()=>{})}catch(e){}room=r;$("lobby").classList.add("hidden");$("game").classList.remove("hidden");if(!renderer)init3D();renderRoom();});
socket.on("room:update",r=>{if(room&&r.lastAction&&r.lastAction!==room.lastAction)feed(r.lastAction);if(room&&r.turn!==undefined&&r.turn!==room.turn&&r.status==="playing")feed((r.players[r.turn]?.name||"Игрок")+" ходит");if(room&&(r.phase!==room.phase||r.turn!==room.turn)){selectedCard=null;transferMode=false}room=r;renderRoom()});
socket.on("hand:update",h=>{hand=h;if(selectedCard&&!hand.some(c=>c.id===selectedCard)){selectedCard=null;transferMode=false}renderHand();if(room)renderRoom();});
socket.on("player:gesture",d=>{const i=room?.players.findIndex(p=>p.id===d.playerId)??-1;feed(`${d.name}: ${({wave:"показывает приветствие 👋",thumbs:"показывает 👍",middle:"показывает жест",clap:"аплодирует 👏"})[d.kind]||"эмоция"}`)});
socket.on("error:message",toast);
socket.on("shop:update",data=>{const root=$("shopList");if(!root)return;root.innerHTML=data.items.map(item=>{const owned=data.ownedDecks.includes(item.id),equipped=data.equippedDeck===item.id;return `<div style="padding:12px 0;border-bottom:1px solid #ffffff20"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><b>${item.name}</b><b>${item.price?fmt(item.price)+" ✦":"Бесплатно"}</b></div><p class="muted small">${item.description}</p><button class="${owned?"secondary":""}" data-shop-action="${item.id}" ${equipped?"disabled":""}>${equipped?"Надето":owned?"Применить":"Купить"}</button></div>`}).join("");root.querySelectorAll("[data-shop-action]").forEach(btn=>btn.onclick=()=>{const id=btn.dataset.shopAction;if(data.ownedDecks.includes(id))socket.emit("shop:equip",id);else socket.emit("shop:buy",id)})});
socket.on("shop:result",r=>toast(r.message));

function openModal(id){$(id).classList.remove("hidden")}
function closeModal(id){$(id).classList.add("hidden")}
let authMode="login";
function setAuthMode(mode){authMode=mode;$ ("authTitle").textContent=mode==="register"?"СОЗДАТЬ АККАУНТ":"ВОЙТИ В АККАУНТ";$ ("authSubmit").textContent=mode==="register"?"Зарегистрироваться":"Войти";$ ("authSwitch").textContent=mode==="register"?"Уже есть аккаунт? Войти":"Нет аккаунта? Зарегистрироваться";$ ("authHint").textContent=mode==="register"?"Логин 3–20 символов. Пароль от 8 символов. SMS и почта не нужны.":"Введи свой логин и пароль, чтобы продолжить."}
$("authSwitch").onclick=()=>setAuthMode(authMode==="login"?"register":"login");
$("authSubmit").onclick=()=>{const username=$("authUsername").value.trim(),password=$("authPassword").value;if(authMode==="register")socket.emit("auth:register",{username,password});else socket.emit("auth:login",{username,password})};
$("logout").onclick=()=>socket.emit("auth:logout");setAuthMode("login");
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
["profileOpen","createOpen","joinOpen","settingsOpen"].forEach((id,i)=>$(id).onclick=()=>openModal(["profileModal","createModal","joinModal","settingsModal"][i]));
$("achievementsOpen").onclick=()=>{renderAchievements();openModal("achievementsModal")};
$("shopOpen").onclick=()=>{openModal("shopModal");$("shopList").textContent="Загрузка магазина…";socket.emit("shop:get")};
function renderAchievements(){const root=$("achievementsList");if(!root)return;const items=profile?.achievements||[];if(!items.length){root.innerHTML="<p>Сыграй первую партию, чтобы начать открывать достижения.</p>";return}root.innerHTML=items.map(a=>{const pct=Math.round((a.progress/Math.max(1,a.goal))*100);const action=a.claimed?'<button class="secondary" disabled>Получено</button>':a.unlocked?`<button data-claim-achievement="${a.id}">Забрать награду</button>`:'<span class="muted small">Награда закрыта</span>';return `<div style="padding:10px 0;border-bottom:1px solid #ffffff18"><div style="display:flex;justify-content:space-between;gap:12px"><b>${a.unlocked?"🏆":"🔒"} ${a.name}</b><span class="muted small">${a.unlocked?"Открыто":pct+"%"}</span></div><div class="muted small">${a.description}</div><div style="height:7px;background:#ffffff18;border-radius:8px;overflow:hidden;margin-top:7px"><div style="height:100%;width:${pct}%;background:#c6a65e"></div></div><div class="muted small">${fmt(a.progress)} / ${fmt(a.goal)} · Награда: ${fmt(a.reward)} ✦</div><div style="margin-top:8px">${action}</div></div>`}).join("");root.querySelectorAll('[data-claim-achievement]').forEach(b=>b.onclick=()=>socket.emit("achievement:claim",b.dataset.claimAchievement))};
socket.on("achievement:result",r=>toast(r.message));
socket.on("friends:list",rows=>{const root=$("friendsList");if(!root)return;if(!rows.length){root.innerHTML="<p class=\"muted\">Пока нет друзей. Добавь игрока по имени.</p>";return}root.innerHTML=rows.map(p=>{const n=String(p.name||"Игрок").replace(/[&<>\"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[ch]));return `<div style=\"display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #ffffff18\"><div><b>${n}</b><div class=\"muted small\">${p.online?"🟢 В сети":"⚪ Не в сети"} · 🏆 ${fmt(p.wins)} побед</div></div><button class=\"secondary\" data-friend-remove=\"${String(p.id).replace(/[^a-zA-Z0-9_-]/g,"")}\">Удалить</button></div>`}).join("");root.querySelectorAll("[data-friend-remove]").forEach(b=>b.onclick=()=>socket.emit("friend:remove",b.dataset.friendRemove))});
$("avatarFile").onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>8*1024*1024){toast("Фото слишком большое. Выбери файл до 8 МБ.");return}const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas"),scale=Math.min(1,256/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);profileAvatar=c.toDataURL("image/jpeg",.76);$("avatarPreview").innerHTML=`<img alt="Предпросмотр аватарки" src="${profileAvatar}" style="width:72px;height:72px;object-fit:cover;border-radius:50%;border:2px solid #c6a65e">`};img.src=reader.result};reader.readAsDataURL(f)};
let profileAvatar=null;
$("saveProfile").onclick=()=>{socket.emit("profile:update",{name:$("playerName").value,avatar:profileAvatar||profile?.avatar||""});closeModal("profileModal");toast("Профиль сохранён")};
$("create").onclick=()=>{socket.emit("room:create",{maxPlayers:$("maxPlayers").value,mode:$("mode").value,entry:$("entry").value,deck:$("deck").value,deckCount:$("deckSize").value});closeModal("createModal")};
$("join").onclick=()=>{socket.emit("room:join",$("roomCode").value.trim().toUpperCase());closeModal("joinModal")};
$("entry").oninput=()=>$("entryValue").textContent=fmt($("entry").value);
$("volume").oninput=()=>{$("volumeValue").textContent=$("volume").value+"%";localStorage.setItem("durak_sfx_volume",$("volume").value)};
$("musicTrack").value=localStorage.getItem("durak_music_track")||"golden_waltz.mp3";$("musicVolume").value=localStorage.getItem("durak_music_volume")??28;$("musicVolumeValue").textContent=$("musicVolume").value+"%";$("musicVolume").oninput=()=>{ambientMusic.volume=(+$("musicVolume").value/100)*.24;$("musicVolumeValue").textContent=$("musicVolume").value+"%";localStorage.setItem("durak_music_volume",$("musicVolume").value)};
$("musicTrack").onchange=()=>{localStorage.setItem("durak_music_track",$("musicTrack").value);const wasPlaying=musicOn;ambientMusic.pause();const file=musicTrackFiles[$("musicTrack").value]||"golden_waltz.mp3";ambientMusic.src=assetBase+file;ambientMusic.load();if(wasPlaying)ambientMusic.play().catch(()=>toast("Не удалось включить выбранную музыку"));};
$("rulesOpen").onclick=()=>openModal("rulesModal");
$("graphics").onchange=()=>{if(!renderer)return;const q=$("graphics").value;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,q==="high"?2:q==="medium"?1.35:1));renderer.shadowMap.enabled=q!=="low";resize()};
$("start").onclick=()=>socket.emit("room:start");

$("mainAction").onclick=()=>{if(!room||room.status!=="playing")return;const me=room.players.findIndex(p=>p.id===socket.id);if(me===room.defender&&room.phase==="defend"){if(transferMode&&selectedCard){socket.emit("game:transfer",selectedCard);transferMode=false;selectedCard=null}else socket.emit("game:take")}else if(me===room.attacker&&room.phase==="throw"){socket.emit("game:pass");selectedCard=null}};
$("leave").onclick=()=>location.href=location.pathname;$("copyCode").onclick=async()=>{if(!room?.code)return;const inviteUrl=new URL(location.pathname,location.origin);inviteUrl.searchParams.set("room",room.code);const message="Заходи в мой стол Дурака Онлайн: "+inviteUrl.href;try{if(navigator.share)await navigator.share({title:"Приглашение в Дурака Онлайн",text:"Присоединяйся к моей игре!",url:inviteUrl.href});else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);toast("Ссылка-приглашение скопирована. Отправь её другу!")}else toast(message)}catch(e){if(e?.name!=="AbortError")toast("Ссылка: "+inviteUrl.href)}};
$("friend").onclick=()=>{openModal("friendsModal");socket.emit("friends:get")};
$("friendsOpen").onclick=()=>{openModal("friendsModal");socket.emit("friends:get")};
$("friendAdd").onclick=()=>{const n=$("friendName").value.trim();if(!n)return toast("Введи имя игрока");socket.emit("friend:add",n);$("friendName").value=""};
$("gesture").onclick=()=>socket.emit("player:gesture",$("gestureType").value);
$("music").onclick=toggleMusic;$("soundToggle").onclick=toggleMusic;
function toast(s){$("toast").textContent=s;$("sceneMessage").textContent=s;feed(s)}
function feed(message){if(/ход|атак|защит|взял|перев|побед/i.test(message))playSfx("place");const box=$("activity");if(!box)return;const item=document.createElement("div");item.className="activity-item";item.textContent=message;box.prepend(item);while(box.children.length>5)box.lastChild.remove();setTimeout(()=>item.remove(),6500)}
function toggleMusic(){musicOn=!musicOn;if(musicOn){ambientMusic.volume=(+$("musicVolume").value/100)*.24;ambientMusic.play().catch(()=>{musicOn=false;toast("Нажми ещё раз, чтобы включить музыку")})}else ambientMusic.pause();$("music").textContent=musicOn?"Выключить музыку":"Включить музыку"}
function canvasTexture(base,grain=0.12,lines=false){let c=document.createElement("canvas");c.width=c.height=512;let x=c.getContext("2d");x.fillStyle=base;x.fillRect(0,0,512,512);for(let i=0;i<18000;i++){let v=Math.random()*255,a=Math.random()*grain;x.fillStyle=`rgba(${v},${v},${v},${a})`;let s=Math.random()*2+0.3;x.fillRect(Math.random()*512,Math.random()*512,s,s)}if(lines){x.strokeStyle="#ffffff0a";for(let i=0;i<40;i++){x.beginPath();x.moveTo(0,i*14);x.bezierCurveTo(120,i*14+8,350,i*14-8,512,i*14);x.stroke()}}let t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t}
function woodTexture(){let c=document.createElement("canvas");c.width=1024;c.height=512;let x=c.getContext("2d");let g=x.createLinearGradient(0,0,1024,512);g.addColorStop(0,"#5a351e");g.addColorStop(.5,"#9a6338");g.addColorStop(1,"#3d2417");x.fillStyle=g;x.fillRect(0,0,1024,512);for(let i=0;i<170;i++){x.strokeStyle=`rgba(25,10,3,${Math.random()*.22})`;x.lineWidth=Math.random()*5+1;x.beginPath();let y=Math.random()*512;x.moveTo(0,y);x.bezierCurveTo(280,y-35,700,y+30,1024,y+Math.random()*30);x.stroke()}let t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function mat(color,rough=.55,metal=0){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function roundedCardMaterial(suit,rank,back=false){let c=document.createElement("canvas");c.width=512;c.height=768;let x=c.getContext("2d");x.scale(2,2);x.fillStyle=back?"#102c29":"#f6f0df";x.fillRect(0,0,256,384);if(back){x.strokeStyle="#d5b46d";x.lineWidth=7;x.strokeRect(15,15,226,354);x.strokeStyle="#e6c77e";x.lineWidth=2;for(let i=0;i<7;i++){x.beginPath();x.arc(128,192,30+i*18,0,Math.PI*2);x.stroke()}x.fillStyle="#e9cf91";x.font="bold 28px Georgia";x.textAlign="center";x.fillText("DURAK",128,200)}else{x.strokeStyle="#b7a578";x.lineWidth=5;x.strokeRect(7,7,242,370);let red="♥♦".includes(suit);x.fillStyle=red?"#bd202b":"#151b1b";x.font="bold 54px Georgia";x.fillText(rank,28,65);x.font="58px Georgia";x.fillText(suit,28,125);x.font="bold 115px Georgia";x.textAlign="center";x.fillText(suit,128,245);x.save();x.translate(256,384);x.rotate(Math.PI);x.textAlign="left";x.font="bold 54px Georgia";x.fillText(rank,28,65);x.font="58px Georgia";x.fillText(suit,28,125);x.restore()}let t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function init3D(){
 const canvas=$("world");scene=new THREE.Scene();scene.background=new THREE.Color("#153326");
 camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(0,23,18);camera.lookAt(0,1.1,0);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.shadowMap.enabled=false;renderer.info.autoReset=true;
 clock=new THREE.Clock();scene.add(new THREE.HemisphereLight(0xffffff,0x52685b,2.1));
 const light=new THREE.DirectionalLight(0xffffff,1.4);light.position.set(-4,12,7);scene.add(light);
 tableGroup=new THREE.Group();scene.add(tableGroup);buildTable();cardGroup=new THREE.Group();scene.add(cardGroup);
 window.addEventListener("resize",resize);resize();renderer.setAnimationLoop(tick)
}
function buildTable(){
 const wood=new THREE.Mesh(new THREE.BoxGeometry(18.5,.42,21.5),new THREE.MeshStandardMaterial({map:loadTexture("walnut_wood_4k.jpg"),roughness:.68}));wood.position.y=1.10;tableGroup.add(wood);
 const felt=new THREE.Mesh(new THREE.PlaneGeometry(18.15,21.15),new THREE.MeshStandardMaterial({map:loadTexture("table_felt_4k.jpg"),roughness:1}));felt.rotation.x=-Math.PI/2;felt.position.y=1.325;tableGroup.add(felt);
 const edge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(18.1,.02,21.1)),new THREE.LineBasicMaterial({color:0xbba06a}));edge.position.y=1.34;tableGroup.add(edge);
}
function disposeGroup(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.map&&!Object.values(assetTextures).includes(m.map)&&!Object.values(faceTextures).includes(m.map))m.map.dispose();m.dispose()})}});group.clear()}
function rebuildAvatars(){
 const layer=$("seatLayer");if(!layer||!room)return;layer.innerHTML="";
 const me=room.players.findIndex(p=>p.id===socket.id);const others=room.players.map((p,i)=>({p,i})).filter(x=>x.i!==me);
 const spots=["top-center","top-left","top-right","left-mid","right-mid","left-low","right-low"];
 const add=(player,isMe,spot)=>{const seat=document.createElement("div");seat.className="player-seat "+spot+(isMe?" self-seat":"");
 const img=document.createElement("img");img.className="player-avatar";img.alt="Аватарка игрока";img.src=player.avatar||"/assets/club_icon_192.png";
 const name=document.createElement("span");name.className="player-name";name.textContent=player.name||"Игрок";
 const status=document.createElement("i");status.className="player-status"+(player.online?" online":"");
 seat.append(img,name,status);layer.appendChild(seat)};
 if(me>=0)add(room.players[me],true,"bottom-center");
 others.forEach((x,i)=>add(x.p,false,spots[i]||"top-center"));
}
function cardMesh(card,back=false){let geo=new THREE.BoxGeometry(.78,.025,1.12);let backName=({classic:"cardback_classic_2k.jpg",premium:"cardback_royal_2k.jpg",neon:"cardback_neon_2k.jpg",zammler:"cardback_zammler_2k.jpg"})[room?.settings?.deck]||"cardback_classic_2k.jpg";let backTex=loadTexture(backName),faceTex=back?backTex:atlasFace(card);let m=new THREE.Mesh(geo,[mat("#d8d0b9",.35),mat("#d8d0b9",.35),mat("#d8d0b9",.35),mat("#d8d0b9",.35),new THREE.MeshStandardMaterial({map:faceTex,roughness:.45}),new THREE.MeshStandardMaterial({map:backTex,roughness:.45})]);m.castShadow=true;m.receiveShadow=true;return m}
function animateCardTo(mesh,x,y,z,rz=0){playSfx("deal");mesh.position.set(x,y+1.1,z);mesh.rotation.set(-Math.PI/2,0,rz);mesh.userData.target=new THREE.Vector3(x,y,z);mesh.userData.targetRotation=rz;mesh.userData.delay=Math.random()*.07}
function renderTableCards(){
 disposeGroup(cardGroup);cardMeshes=[];if(!room)return;
 const cards=room.table||[];
 cards.forEach((t,i)=>{
  const col=i%2,row=Math.floor(i/2),x=(col-.5)*1.28,z=row*1.28-.95;
  const a=cardMesh(t.attack);animateCardTo(a,x-.43,1.43,z,(i%2?-.025:.025));cardGroup.add(a);cardMeshes.push(a);
  if(t.defense){const b=cardMesh(t.defense);animateCardTo(b,x+.43,1.47,z,.045);cardGroup.add(b);cardMeshes.push(b);}
  else{const slot=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(.78,1.12)),new THREE.LineBasicMaterial({color:0xe3c47e,transparent:true,opacity:.72}));slot.rotation.x=-Math.PI/2;slot.position.set(x+.43,1.385,z);cardGroup.add(slot);}
 });
 // Deck stack and the exposed trump card remain on the table until the deck is empty.
 if(room.deckCount>0){
  const count=Math.min(7,Math.ceil(room.deckCount/6));
  for(let i=0;i<count;i++){const back=cardMesh(null,true);back.position.set(-3.55,1.39+i*.018,-2.05);back.rotation.set(-Math.PI/2,0,-.10);back.castShadow=true;cardGroup.add(back);cardMeshes.push(back);}
 }
 if(room.trumpCard){
  const trump=cardMesh(room.trumpCard);trump.position.set(-3.55,1.385,-2.72);trump.rotation.set(-Math.PI/2,0,-.10);trump.castShadow=true;cardGroup.add(trump);cardMeshes.push(trump);
 }
}
function renderRoom(){if(!room)return;$("roomLabel").textContent="СТОЛ "+room.code;$("roomStatus").textContent=room.players.length+"/"+room.settings.maxPlayers+" игроков";$("deckCount").textContent="Колода: "+room.deckCount;$("trump").textContent="Козырь: "+(room.trump||"—");$("turn").textContent=room.status==="playing"?"Ход: "+(room.players[room.turn]?.name||"—"):"Ожидание игроков";$("start").disabled=room.status!=="lobby"||room.players.length<2;$("start").textContent=room.status==="playing"?"Партия идёт":"Начать игру";$("sceneMessage").textContent=room.lastAction||"Ожидание игроков";$("turnFeed").textContent=room.lastAction||"Ожидание игроков";$("deckPile").style.opacity=room.deckCount?"1":".35";$("deckPile").innerHTML=""+(room.deckCount||0)+"<span class='pile-label'>Колода</span>";const tc=room.trumpCard;$("trumpPile").innerHTML=tc?tc.rank+tc.suit+"<span class='pile-label'>Козырь</span>":(room.trump||"—")+"<span class='pile-label'>Козырь</span>";const me=room.players.findIndex(p=>p.id===socket.id);const defending=me===room.defender&&room.phase==="defend";const canFinish=me===room.attacker&&room.phase==="throw";const showAction=room.status==="playing"&&(defending||canFinish);$("mainAction").textContent=defending?(transferMode?"Перевести":"Взять карты"):"Бито · следующий раунд";$("mainAction").style.display=showAction?"inline-block":"none";$("mainAction").disabled=defending&&transferMode&&!selectedCard;$("gesture").style.display=room.status==="playing"?"inline-block":"none";rebuildAvatars();renderTableCards();renderHand()}
function renderHand(){$("hand").innerHTML="";const suitOrder={"♠":0,"♣":1,"♦":2,"♥":3};const rankOrder={"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14};hand.sort((a,b)=>(suitOrder[a.suit]??9)-(suitOrder[b.suit]??9)||(rankOrder[a.rank]??0)-(rankOrder[b.rank]??0));hand.forEach(c=>{let el=document.createElement("button");el.className="card "+("♥♦".includes(c.suit)?"red":"")+(selectedCard===c.id?" selected":"");el.innerHTML="<span>"+c.rank+"</span><span class='suit'>"+c.suit+"</span><span class='bottomrank'>"+c.rank+"</span>";el.onclick=()=>{playSfx("click");selectedCard=c.id;document.querySelectorAll("#hand .card").forEach(x=>x.classList.remove("selected"));el.classList.add("selected");if(!room||room.status!=="playing")return;const me=room.players.findIndex(p=>p.id===socket.id);if(me===room.defender&&room.phase==="defend"){const openAttack=room.table.find(t=>!t.defense)?.attack;if(room.settings.mode==="transfer"&&openAttack&&c.rank===openAttack.rank){transferMode=true;renderRoom();toast("Карта подходит для перевода. Нажми «Перевести».")}else{transferMode=false;socket.emit("game:defend",c.id)}}else if(me!==room.defender&&((room.phase==="attack"&&me===room.attacker)||room.phase==="defend"||room.phase==="throw")){socket.emit("game:play",c.id)}};$("hand").appendChild(el)})}
function resize(){if(!renderer)return;const w=$("world").clientWidth,h=$("world").clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(0,w<h?25:20,w<h?19:17);camera.fov=w<h?39:36;camera.lookAt(0,1.1,0);camera.updateProjectionMatrix();}
function tick(){
 if(!renderer)return;const dt=Math.min(clock.getDelta(),.04);
 cardMeshes.forEach(m=>{if(m.userData.target){m.userData.delay=Math.max(0,(m.userData.delay||0)-dt);if(!m.userData.delay){m.position.lerp(m.userData.target,1-Math.exp(-dt*10));m.rotation.z+=(m.userData.targetRotation-m.rotation.z)*(1-Math.exp(-dt*10));}}});
 renderer.render(scene,camera)
}
