import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const tokenKey="durak_account_token";let accountToken=localStorage.getItem(tokenKey);const socket=io({auth:{token:accountToken||""}}),$=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString("ru-RU");
let room=null,hand=[],selectedCard=null,transferMode=false,profile=null,scene,camera,renderer,clock,tableGroup,cardGroup,playersGroup,avatarMeshes=[],cardMeshes=[],musicOn=false,audioCtx=null,animationMixers=[];
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
function loadTexture(name){const quality=$("graphics")?.value||"medium";if(quality!=="high")name=mobileTextureVariants[name]||name;if(!assetTextures[name]){assetTextures[name]=textureLoader.load(assetBase+name);assetTextures[name].colorSpace=THREE.SRGBColorSpace;assetTextures[name].anisotropy=renderer?.capabilities?.getMaxAnisotropy?.()||4;}return assetTextures[name]}
function atlasFace(card){
 const key=(card?.suit||"?")+(card?.rank||"?");if(faceTextures[key])return faceTextures[key];
 const c=document.createElement("canvas");c.width=256;c.height=368;const x=c.getContext("2d");
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
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer?.capabilities?.getMaxAnisotropy?.()||4;faceTextures[key]=t;return t;
}
socket.on("connect",()=>{if(accountToken){socket.emit("profile:get",{});const invite=new URLSearchParams(location.search).get("room");if(invite&&/^[A-F0-9]{6}$/i.test(invite)){ $("roomCode").value=invite.toUpperCase();socket.emit("room:join",invite.toUpperCase());history.replaceState({},"",location.pathname);}}else openModal("authModal")});
socket.on("auth:success",d=>{accountToken=d.token;localStorage.setItem(tokenKey,accountToken);location.reload()});
socket.on("auth:logged-out",()=>{localStorage.removeItem(tokenKey);location.reload()});
socket.on("profile:update",p=>{profile=p;renderAchievements();if($("deck"))$("deck").value=p.equippedDeck||"classic";$("chips").textContent=fmt(p.chips);$("playerName").value=p.name||"Игрок";if(p.avatar){$("avatarPreview").innerHTML=`<img alt="Аватарка" src="${p.avatar}" style="width:72px;height:72px;object-fit:cover;border-radius:50%;border:2px solid #c6a65e">`;}if(!p.profileComplete)openModal("profileModal");});
socket.on("room:joined",r=>{try{screen.orientation?.lock?.("portrait").catch(()=>{})}catch(e){}room=r;$("lobby").classList.add("hidden");$("game").classList.remove("hidden");if(!renderer)init3D();renderRoom();});
socket.on("room:update",r=>{if(room&&r.lastAction&&r.lastAction!==room.lastAction)feed(r.lastAction);if(room&&r.turn!==undefined&&r.turn!==room.turn&&r.status==="playing")feed((r.players[r.turn]?.name||"Игрок")+" ходит");if(room&&(r.phase!==room.phase||r.turn!==room.turn)){selectedCard=null;transferMode=false}room=r;renderRoom()});
socket.on("hand:update",h=>{hand=h;if(selectedCard&&!hand.some(c=>c.id===selectedCard)){selectedCard=null;transferMode=false}renderHand();if(room)renderRoom();});
socket.on("player:gesture",d=>{const i=room?.players.findIndex(p=>p.id===d.playerId)??-1;if(i>=0)applyGesture(avatarMeshes[i],d.kind);feed(`${d.name}: ${({wave:"показывает приветствие 👋",thumbs:"показывает 👍",middle:"показывает жест",clap:"аплодирует 👏"})[d.kind]||"эмоция"}`)});
socket.on("error:message",toast);
socket.on("shop:update",data=>{const root=$("shopList");if(!root)return;root.innerHTML=data.items.map(item=>{const owned=data.ownedDecks.includes(item.id),equipped=data.equippedDeck===item.id;return `<div style="padding:12px 0;border-bottom:1px solid #ffffff20"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><b>${item.name}</b><b>${item.price?fmt(item.price)+" ✦":"Бесплатно"}</b></div><p class="muted small">${item.description}</p><button class="${owned?"secondary":""}" data-shop-action="${item.id}" ${equipped?"disabled":""}>${equipped?"Надето":owned?"Применить":"Купить"}</button></div>`}).join("");root.querySelectorAll("[data-shop-action]").forEach(btn=>btn.onclick=()=>{const id=btn.dataset.shopAction;if(data.ownedDecks.includes(id))socket.emit("shop:equip",id);else socket.emit("shop:buy",id)})});
socket.on("shop:result",r=>toast(r.message));

function openModal(id){$(id).classList.remove("hidden")}
function closeModal(id){$(id).classList.add("hidden")}
let authMode="login";
function setAuthMode(mode){authMode=mode;$ ("authTitle").textContent=mode==="register"?"СОЗДАТЬ АККАУНТ":"ВОЙТИ В АККАУНТ";$ ("authSubmit").textContent=mode==="register"?"Зарегистрироваться":"Войти";$ ("authSwitch").textContent=mode==="register"?"Уже есть аккаунт? Войти":"Нет аккаунта? Зарегистрироваться";$ ("authHint").textContent=mode==="register"?"Создай новый логин и пароль. За новый аккаунт сразу начислим 200 000 фишек. SMS и почта не нужны.":"Введи свой логин и пароль, чтобы продолжить. Забыл пароль? Создай новый аккаунт с другим логином и получи 200 000 фишек снова."}
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
$("graphics").onchange=()=>{if(!renderer)return;const q=$("graphics").value;renderer.setPixelRatio(Math.min(devicePixelRatio,q==="high"?1.6:q==="medium"?1.2:1));renderer.shadowMap.enabled=q!=="low";resize()};
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
function roundedCardMaterial(suit,rank,back=false){let c=document.createElement("canvas");c.width=256;c.height=384;let x=c.getContext("2d");x.fillStyle=back?"#102c29":"#f6f0df";x.fillRect(0,0,256,384);if(back){x.strokeStyle="#d5b46d";x.lineWidth=7;x.strokeRect(15,15,226,354);x.strokeStyle="#e6c77e";x.lineWidth=2;for(let i=0;i<7;i++){x.beginPath();x.arc(128,192,30+i*18,0,Math.PI*2);x.stroke()}x.fillStyle="#e9cf91";x.font="bold 28px Georgia";x.textAlign="center";x.fillText("DURAK",128,200)}else{x.strokeStyle="#b7a578";x.lineWidth=5;x.strokeRect(7,7,242,370);let red="♥♦".includes(suit);x.fillStyle=red?"#bd202b":"#151b1b";x.font="bold 54px Georgia";x.fillText(rank,28,65);x.font="58px Georgia";x.fillText(suit,28,125);x.font="bold 115px Georgia";x.textAlign="center";x.fillText(suit,128,245);x.save();x.translate(256,384);x.rotate(Math.PI);x.textAlign="left";x.font="bold 54px Georgia";x.fillText(rank,28,65);x.font="58px Georgia";x.fillText(suit,28,125);x.restore()}let t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function init3D(){const canvas=$("world");scene=new THREE.Scene();scene.background=new THREE.Color("#07140f");scene.fog=new THREE.FogExp2("#07140f",.025);
 camera=new THREE.PerspectiveCamera(42,1,.1,120);camera.position.set(0,14.2,21.5);camera.lookAt(0,1.05,0);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 clock=new THREE.Clock();scene.add(new THREE.HemisphereLight(0xc8e7dc,0x1a120b,2.0));
 let key=new THREE.DirectionalLight(0xffe0b0,3.3);key.position.set(-6,12,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-15;key.shadow.camera.right=15;key.shadow.camera.top=15;key.shadow.camera.bottom=-15;scene.add(key);
 let rim=new THREE.PointLight(0x5aa8ff,45,18);rim.position.set(7,5,-7);scene.add(rim);
 let floor=new THREE.Mesh(new THREE.CircleGeometry(24,128),new THREE.MeshStandardMaterial({map:repeatTexture("parquet_floor_4k.jpg",5,5),bumpMap:repeatBump("parquet_floor_4k.jpg",5,5),bumpScale:.045,roughness:.78}));floor.rotation.x=-Math.PI/2;floor.position.y=-.18;floor.receiveShadow=true;scene.add(floor);
 // Private card-club interior: dark oak walls, brass trim and warm sconces.
 const wallMat=new THREE.MeshStandardMaterial({map:repeatTexture("dark_oak_wall_4k.jpg",6,2),bumpMap:repeatBump("dark_oak_wall_4k.jpg",6,2),bumpScale:.035,roughness:.88,side:THREE.BackSide});
 const wall=new THREE.Mesh(new THREE.CylinderGeometry(19,19,12,96,1,true),wallMat);wall.position.y=5.75;wall.receiveShadow=true;scene.add(wall);
 const wallBase=new THREE.Mesh(new THREE.TorusGeometry(18.9,.09,10,128),new THREE.MeshStandardMaterial({map:repeatTexture("antique_brass_2k.jpg",8,1),metalness:.72,roughness:.3}));wallBase.rotation.x=Math.PI/2;wallBase.position.y=.22;scene.add(wallBase);
 for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*18.65,z=Math.sin(a)*18.65;const trim=new THREE.Mesh(new THREE.BoxGeometry(.12,8.8,.12),new THREE.MeshStandardMaterial({map:loadTexture("antique_brass_2k.jpg"),metalness:.72,roughness:.28}));trim.position.set(x,5.2,z);trim.rotation.y=-a;scene.add(trim);}
 for(let i=0;i<4;i++){const a=i*Math.PI/2,x=Math.cos(a)*16.9,z=Math.sin(a)*16.9;const lamp=new THREE.Group();lamp.position.set(x,4.65,z);lamp.rotation.y=-a;const mount=new THREE.Mesh(new THREE.BoxGeometry(.34,.5,.16),new THREE.MeshStandardMaterial({map:loadTexture("antique_brass_2k.jpg"),metalness:.7,roughness:.3}));lamp.add(mount);const glow=new THREE.Mesh(new THREE.SphereGeometry(.18,16,12),new THREE.MeshStandardMaterial({color:0xffd99a,emissive:0xffa33a,emissiveIntensity:1.4,roughness:.25}));glow.position.z=.12;lamp.add(glow);const light=new THREE.PointLight(0xffbd70,18,10);light.position.z=.3;lamp.add(light);scene.add(lamp);}
 tableGroup=new THREE.Group();scene.add(tableGroup);buildTable();playersGroup=new THREE.Group();scene.add(playersGroup);cardGroup=new THREE.Group();scene.add(cardGroup);
 window.addEventListener("resize",resize);resize();renderer.setAnimationLoop(tick)}
function buildTable(){let wood=new THREE.Mesh(new THREE.CylinderGeometry(6.3,6.15,.48,96),new THREE.MeshStandardMaterial({map:loadTexture("walnut_wood_4k.jpg"),roughness:.32,metalness:.04}));wood.position.y=1.05;wood.castShadow=true;wood.receiveShadow=true;tableGroup.add(wood);
 let felt=new THREE.Mesh(new THREE.CylinderGeometry(5.92,5.92,.06,96),new THREE.MeshStandardMaterial({map:loadTexture("table_felt_4k.jpg"),roughness:.94}));felt.position.y=1.31;felt.receiveShadow=true;tableGroup.add(felt);
 let gold=new THREE.Mesh(new THREE.TorusGeometry(6.02,.075,12,100),new THREE.MeshStandardMaterial({map:repeatTexture("antique_brass_2k.jpg",2,1),metalness:.78,roughness:.24}));gold.rotation.x=Math.PI/2;gold.position.y=1.34;tableGroup.add(gold);
 let velvetBand=new THREE.Mesh(new THREE.TorusGeometry(6.22,.14,14,120),new THREE.MeshStandardMaterial({map:repeatTexture("emerald_velvet_4k.jpg",3,1),bumpMap:repeatBump("emerald_velvet_4k.jpg",3,1),bumpScale:.025,roughness:.9}));velvetBand.rotation.x=Math.PI/2;velvetBand.position.y=1.08;tableGroup.add(velvetBand);
 for(let i=0;i<8;i++){let a=i*Math.PI/4;let leg=new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,1.15,16),mat("#4a2c1a",.35));leg.position.set(Math.cos(a)*4.7,.48,Math.sin(a)*4.7);leg.castShadow=true;tableGroup.add(leg)}
 // stitched felt border
 let ring=new THREE.Mesh(new THREE.TorusGeometry(5.75,.018,6,120),mat("#d0b478",.7,.3));ring.rotation.x=Math.PI/2;ring.position.y=1.35;tableGroup.add(ring)}
function makeAvatar(index,total,name){
 const g=new THREE.Group();
 const skin=mat(["#c58f70","#a96f53","#d4a17f","#8d5c43"][index%4],.72),shirt=new THREE.MeshStandardMaterial({map:repeatTexture("tailored_wool_3k.jpg",2,2),bumpMap:repeatBump("tailored_wool_3k.jpg",2,2),bumpScale:.018,color:["#243d55","#6b3428","#314b37","#4b355e","#8a6a35","#28505a"][index%6],roughness:.82}),pants=mat("#242b2d",.86),shoe=mat("#151918",.48),hair=mat(["#30251f","#171615","#60452e"][index%3],.92);
 const sphere=(parent,r,material,pos,scale)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,28,20),material);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m};
 const capsule=(parent,a,b,r,material,r2=r)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r,d.length(),16),material);m.position.copy(A.clone().add(B).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());m.castShadow=true;m.receiveShadow=true;parent.add(m);sphere(parent,r2,material,a);sphere(parent,r,material,b);return m};
 // Chair and detailed body silhouette
 const chair=new THREE.Group(),wood=new THREE.MeshStandardMaterial({map:repeatTexture("dark_oak_wall_4k.jpg",1,1),roughness:.48});const leather=new THREE.MeshStandardMaterial({map:repeatTexture("oxblood_leather_3k.jpg",1,1),bumpMap:repeatBump("oxblood_leather_3k.jpg",1,1),bumpScale:.04,roughness:.48});const seat=new THREE.Mesh(new THREE.BoxGeometry(1.3,.15,1.08),leather);seat.position.y=1.12;chair.add(seat);const back=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.25,.16),wood);back.position.set(0,1.77,-.49);chair.add(back);
 for(const x of [-.52,.52])for(const z of [-.42,.42]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,1.05,12),wood);leg.position.set(x,.55,z);chair.add(leg)}g.add(chair);
 // torso, neck, head, ears, nose, eyebrows and hair
 const torso=sphere(g,.53,shirt,[0,1.86,0],[.76,1.02,.53]);
 const collar=new THREE.Mesh(new THREE.TorusGeometry(.18,.045,10,28),mat("#d0c5ad",.8));collar.position.set(0,2.34,.02);g.add(collar);
 capsule(g,[0,2.27,0],[0,2.51,0],.13,skin);
 const head=new THREE.Group();head.position.set(0,2.78,0);g.add(head);
 sphere(head,.39,skin,[0,.01,.015],[.94,1.08,.9]);
 sphere(head,.395,hair,[0,.24,-.045],[1.02,.48,1.02]);
 sphere(head,.19,hair,[-.28,.21,.12],[.72,.7,.7]);sphere(head,.19,hair,[.28,.21,.12],[.72,.7,.7]);
 for(const x of [-.385,.385])sphere(head,.105,skin,[x,0,0],[.7,1,1]);
 sphere(head,.055,skin,[0,-.03,.37],[.8,1.25,1.5]);
 const eyeMat=mat("#18120f",.35),brow=mat("#38271e",.8);
 for(const x of [-.145,.145]){sphere(head,.045,mat("#f2e6d5",.55),[x,.05,.338],[1,.8,.45]);sphere(head,.023,eyeMat,[x,.05,.36],[1,1,.5]);capsule(head,[x-.07,.13,.34],[x+.07,.14,.34],.018,brow)}
 const mouth=new THREE.Mesh(new THREE.TorusGeometry(.075,.014,8,20,Math.PI),mat("#713d36",.8));mouth.position.set(0,-.13,.35);mouth.rotation.z=Math.PI;head.add(mouth);
 // articulated arms: shoulder/elbow pivots + five finger groups per hand
 const arms=[];
 for(const side of [-1,1]){
  const shoulder=new THREE.Group();shoulder.position.set(side*.43,2.16,0);g.add(shoulder);
  capsule(shoulder,[0,0,0],[side*.28,-.28,.37],.145,shirt,.12);
  const elbow=new THREE.Group();elbow.position.set(side*.28,-.28,.37);shoulder.add(elbow);
  capsule(elbow,[0,0,0],[-side*.06,-.27,.43],.105,shirt,.085);
  const wrist=new THREE.Group();wrist.position.set(-side*.06,-.27,.43);elbow.add(wrist);
  sphere(wrist,.125,skin,[0,0,0],[1,.72,1.05]);
  const fingers=[];
  for(let k=0;k<4;k++){
   const x=(k-1.5)*.067,root=new THREE.Group();root.position.set(x,-.015,.065);wrist.add(root);
   const len=[.14,.18,.17,.13][k];capsule(root,[0,0,0],[0,-len*.56,.025],.027,skin,.023);
   const joint=new THREE.Group();joint.position.set(0,-len*.56,.025);root.add(joint);capsule(joint,[0,0,0],[0,-len*.48,.015],.022,skin,.018);
   fingers.push({root,joint,k});
  }
  const thumb=new THREE.Group();thumb.position.set(side*.105,-.005,.025);wrist.add(thumb);capsule(thumb,[0,0,0],[side*.09,-.08,.06],.035,skin,.028);capsule(thumb,[side*.09,-.08,.06],[side*.14,-.15,.09],.028,skin,.023);
  arms.push({shoulder,elbow,wrist,fingers,thumb,side});
 }
 // Legs with knees and shoes
 const legs=[];for(const x of [-.23,.23]){const legGroup=new THREE.Group();legGroup.position.set(x,1.23,0);g.add(legGroup);capsule(legGroup,[0,0,0],[x*.1,-.60,.04],.18,pants,.145);capsule(legGroup,[x*.1,-.60,.04],[x*.1,-1.0,.25],.14,pants,.12);sphere(legGroup,.17,shoe,[x*.1,-1.09,.4],[1,.58,1.55]);legs.push(legGroup)}
 // subtle shirt buttons
 for(let y=1.92;y<2.22;y+=.12)sphere(g,.018,mat("#c7b58d",.35,.25),[0,y,.265]);
 const angle=-Math.PI/2+index*2*Math.PI/Math.max(total,2),radius=8.15;
 g.position.set(Math.cos(angle)*radius,0,Math.sin(angle)*radius);g.rotation.y=-angle+Math.PI/2;
 g.userData={arms,legs,head,torso,name,baseY:0,gesture:0,gestureKind:"idle",angle,phase:index*.8};return g;
}
function applyGesture(avatar,kind){
 if(!avatar)return;
 avatar.userData.gesture=2.4;avatar.userData.gestureKind=kind;
 avatar.userData.arms.forEach((arm,i)=>{
  arm.fingers.forEach(({root,joint,k})=>{
   const isMiddle=kind==="middle"&&k===1;
   const isThumbs=kind==="thumbs";
   const extended=kind==="wave"||isMiddle||(isThumbs&&k===0);
   root.rotation.x=extended?-.08:.82;
   joint.rotation.x=extended?-.08:.88;
   root.rotation.z=(k-1.5)*.035;
  });
  arm.thumb.rotation.x=kind==="thumbs"?-.9:(kind==="middle"?.35:.25);
  arm.thumb.rotation.z=kind==="thumbs"?-.45:arm.side*.3;
 });
}
function makeNameTag(player){const c=document.createElement("canvas");c.width=512;c.height=128;const x=c.getContext("2d");const draw=()=>{x.clearRect(0,0,512,128);x.fillStyle="#07140fe8";x.strokeStyle=player.online?"#d2ad65":"#777777";x.lineWidth=5;x.roundRect(5,5,502,118,28);x.fill();x.stroke();if(player.avatar){x.save();x.beginPath();x.arc(65,64,43,0,Math.PI*2);x.clip();if(player._avatarImage)x.drawImage(player._avatarImage,22,21,86,86);else{x.fillStyle="#6c806e";x.fillRect(22,21,86,86)}x.restore()}x.fillStyle=player.online?"#f5dfae":"#b2b2b2";x.font="bold 34px DurakSans,Arial";x.textAlign=player.avatar?"left":"center";x.fillText(player.name.slice(0,20),player.avatar?130:256,78)};draw();const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;if(player.avatar){const im=new Image();im.onload=()=>{player._avatarImage=im;draw();tex.needsUpdate=true};im.src=player.avatar}const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));sprite.scale.set(2.55,.64,1);sprite.position.set(0,3.55,0);return sprite}
function disposeGroup(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.map&&!Object.values(assetTextures).includes(m.map)&&!Object.values(faceTextures).includes(m.map))m.map.dispose();m.dispose()})}});group.clear()}
function rebuildAvatars(){disposeGroup(playersGroup);avatarMeshes=[];if(!room)return;room.players.forEach((p,i)=>{let a=makeAvatar(i,room.players.length,p.name);a.add(makeNameTag(p));playersGroup.add(a);avatarMeshes.push(a);if(p.gesture&&Date.now()-p.gesture.at<2200)applyGesture(a,p.gesture.kind)})}
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
function resize(){if(!renderer)return;const w=$("world").clientWidth,h=$("world").clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(0,w<h?14.2:11.8,w<h?21.5:17.8);camera.fov=w<h?42:38;camera.updateProjectionMatrix();}
function tick(){
 if(!renderer)return;
 const dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime;
 camera.position.x=Math.sin(t*.12)*.18;camera.position.y=10.8+Math.sin(t*.2)*.06;camera.lookAt(0,1.05,0);
 tableGroup.rotation.y=Math.sin(t*.08)*.008;
 cardMeshes.forEach(m=>{if(m.userData.target){m.userData.delay=Math.max(0,(m.userData.delay||0)-dt);if(!m.userData.delay){m.position.lerp(m.userData.target,1-Math.exp(-dt*8));m.rotation.z+=(m.userData.targetRotation-m.rotation.z)*(1-Math.exp(-dt*8));}}});
 avatarMeshes.forEach((a,i)=>{
  a.position.y=Math.sin(t*1.7+a.userData.phase)*.018;
  const phase=t*1.15+a.userData.phase;a.userData.torso.scale.y=1+Math.sin(phase)*.012;a.userData.torso.rotation.z=Math.sin(phase*.55)*.012;a.userData.head.rotation.y=Math.sin(t*.48+a.userData.phase)*.075;a.userData.head.rotation.x=Math.sin(t*.72+a.userData.phase)*.018;a.userData.legs.forEach((leg,j)=>{leg.rotation.x=Math.sin(t*.8+a.userData.phase+j*Math.PI)*.018});
  const active=a.userData.gesture>0,kind=a.userData.gestureKind;
  if(active)a.userData.gesture=Math.max(0,a.userData.gesture-dt);
  a.userData.arms.forEach((arm,j)=>{
   arm.shoulder.rotation.z=active?(kind==="wave"?Math.sin(t*12+j*2)*.55:(kind==="middle"?-.48:(kind==="thumbs"?-.35:Math.sin(t*9+j)*.24))):Math.sin(t*1.3+i+j)*.025;
   arm.shoulder.rotation.x=active&&kind==="middle"?-.22:Math.sin(t*.8+i)*.012;
   if(!active){arm.fingers.forEach(({root,joint})=>{root.rotation.x+=(0-root.rotation.x)*(1-Math.exp(-dt*3));joint.rotation.x+=(0-joint.rotation.x)*(1-Math.exp(-dt*3))});arm.thumb.rotation.x+=(.25-arm.thumb.rotation.x)*(1-Math.exp(-dt*3));}
  });
 });
 renderer.render(scene,camera)
}
