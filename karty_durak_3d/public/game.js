import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const uidKey="durak_player_uid";let playerUid=localStorage.getItem(uidKey);if(!playerUid){playerUid=(crypto.randomUUID?crypto.randomUUID():("p"+Date.now()+Math.random().toString(16).slice(2)));localStorage.setItem(uidKey,playerUid)}const socket=io({auth:{uid:playerUid}}),$=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString("ru-RU");
let room=null,hand=[],selectedCard=null,transferMode=false,profile=null,scene,camera,renderer,clock,tableGroup,cardGroup,playersGroup,avatarMeshes=[],cardMeshes=[],musicOn=false,audioCtx=null,animationMixers=[];
socket.on("connect",()=>socket.emit("profile:get",{name:$("playerName").value,age:$("age").value}));
socket.on("profile:update",p=>{profile=p;$("chips").textContent=fmt(p.chips);$("playerName").value=p.name;$("age").value=p.age});
socket.on("room:joined",r=>{room=r;$("lobby").classList.add("hidden");$("game").classList.remove("hidden");if(!renderer)init3D();renderRoom();});
socket.on("room:update",r=>{room=r;renderRoom()});
socket.on("hand:update",h=>{hand=h;renderHand();});
socket.on("player:gesture",d=>{const i=room?.players.findIndex(p=>p.id===d.playerId)??-1;if(i>=0)applyGesture(avatarMeshes[i],d.kind);toast(`${d.name}: ${({wave:"приветствует",thumbs:"показывает 👍",middle:"показывает средний палец",clap:"аплодирует"})[d.kind]||"эмоция"}`)});
socket.on("error:message",toast);
$("saveProfile").onclick=()=>socket.emit("profile:update",{name:$("playerName").value,age:$("age").value});
$("create").onclick=()=>socket.emit("room:create",{maxPlayers:$("maxPlayers").value,mode:$("mode").value,entry:$("entry").value,deck:$("deck").value});
$("join").onclick=()=>socket.emit("room:join",$("roomCode").value.trim().toUpperCase());
$("start").onclick=()=>socket.emit("room:start");$("take").onclick=()=>socket.emit("game:take");$("pass").onclick=()=>socket.emit("game:pass");if($("transfer"))$("transfer").onclick=()=>{transferMode=!transferMode;toast(transferMode?"Выбери карту для перевода":"Режим перевода выключен")};
$("leave").onclick=()=>location.reload();$("copyCode").onclick=()=>navigator.clipboard?.writeText(room.code).then(()=>toast("Код скопирован: "+room.code));
$("friend").onclick=()=>{let n=prompt("Имя игрока");if(n)socket.emit("friend:add",n)};
$("gesture").onclick=()=>{const kind=$("gestureType").value;socket.emit("player:gesture",kind)};
$("music").onclick=$("soundToggle").onclick=toggleMusic;
function toast(s){$("toast").textContent=s;$("sceneMessage").textContent=s}
function toggleMusic(){musicOn=!musicOn;if(musicOn){try{audioCtx=new AudioContext();let master=audioCtx.createGain();master.gain.value=(+$("volume").value/100)*.025;master.connect(audioCtx.destination);[110,164.8,220,261.6].forEach((f,i)=>{let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type="sine";o.frequency.value=f;g.gain.value=.2;o.connect(g);g.connect(master);o.start()})}catch(e){}}else if(audioCtx){audioCtx.close();audioCtx=null}$("music").textContent=musicOn?"Выключить музыку":"Включить музыку"}
function canvasTexture(base,grain=0.12,lines=false){let c=document.createElement("canvas");c.width=c.height=512;let x=c.getContext("2d");x.fillStyle=base;x.fillRect(0,0,512,512);for(let i=0;i<18000;i++){let v=Math.random()*255,a=Math.random()*grain;x.fillStyle=`rgba(${v},${v},${v},${a})`;let s=Math.random()*2+0.3;x.fillRect(Math.random()*512,Math.random()*512,s,s)}if(lines){x.strokeStyle="#ffffff0a";for(let i=0;i<40;i++){x.beginPath();x.moveTo(0,i*14);x.bezierCurveTo(120,i*14+8,350,i*14-8,512,i*14);x.stroke()}}let t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t}
function woodTexture(){let c=document.createElement("canvas");c.width=1024;c.height=512;let x=c.getContext("2d");let g=x.createLinearGradient(0,0,1024,512);g.addColorStop(0,"#5a351e");g.addColorStop(.5,"#9a6338");g.addColorStop(1,"#3d2417");x.fillStyle=g;x.fillRect(0,0,1024,512);for(let i=0;i<170;i++){x.strokeStyle=`rgba(25,10,3,${Math.random()*.22})`;x.lineWidth=Math.random()*5+1;x.beginPath();let y=Math.random()*512;x.moveTo(0,y);x.bezierCurveTo(280,y-35,700,y+30,1024,y+Math.random()*30);x.stroke()}let t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function mat(color,rough=.55,metal=0){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function roundedCardMaterial(suit,rank,back=false){let c=document.createElement("canvas");c.width=256;c.height=384;let x=c.getContext("2d");x.fillStyle=back?"#102c29":"#f6f0df";x.fillRect(0,0,256,384);if(back){x.strokeStyle="#d5b46d";x.lineWidth=7;x.strokeRect(15,15,226,354);x.strokeStyle="#e6c77e";x.lineWidth=2;for(let i=0;i<7;i++){x.beginPath();x.arc(128,192,30+i*18,0,Math.PI*2);x.stroke()}x.fillStyle="#e9cf91";x.font="bold 28px Georgia";x.textAlign="center";x.fillText("DURAK",128,200)}else{x.strokeStyle="#b7a578";x.lineWidth=5;x.strokeRect(7,7,242,370);let red="♥♦".includes(suit);x.fillStyle=red?"#bd202b":"#151b1b";x.font="bold 54px Georgia";x.fillText(rank,28,65);x.font="58px Georgia";x.fillText(suit,28,125);x.font="bold 115px Georgia";x.textAlign="center";x.fillText(suit,128,245);x.save();x.translate(256,384);x.rotate(Math.PI);x.textAlign="left";x.font="bold 54px Georgia";x.fillText(rank,28,65);x.font="58px Georgia";x.fillText(suit,28,125);x.restore()}let t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function init3D(){const canvas=$("world");scene=new THREE.Scene();scene.background=new THREE.Color("#07140f");scene.fog=new THREE.FogExp2("#07140f",.025);
 camera=new THREE.PerspectiveCamera(37,1,.1,100);camera.position.set(0,10.8,15.8);camera.lookAt(0,1.1,0);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 clock=new THREE.Clock();scene.add(new THREE.HemisphereLight(0xc8e7dc,0x1a120b,2.0));
 let key=new THREE.DirectionalLight(0xffe0b0,3.3);key.position.set(-6,12,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-15;key.shadow.camera.right=15;key.shadow.camera.top=15;key.shadow.camera.bottom=-15;scene.add(key);
 let rim=new THREE.PointLight(0x5aa8ff,45,18);rim.position.set(7,5,-7);scene.add(rim);
 let floor=new THREE.Mesh(new THREE.CircleGeometry(24,96),new THREE.MeshStandardMaterial({color:"#111d17",roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-.18;floor.receiveShadow=true;scene.add(floor);
 tableGroup=new THREE.Group();scene.add(tableGroup);buildTable();playersGroup=new THREE.Group();scene.add(playersGroup);cardGroup=new THREE.Group();scene.add(cardGroup);
 window.addEventListener("resize",resize);resize();renderer.setAnimationLoop(tick)}
function buildTable(){let wood=new THREE.Mesh(new THREE.CylinderGeometry(6.3,6.15,.48,96),new THREE.MeshStandardMaterial({map:woodTexture(),roughness:.32,metalness:.04}));wood.position.y=1.05;wood.castShadow=true;wood.receiveShadow=true;tableGroup.add(wood);
 let felt=new THREE.Mesh(new THREE.CylinderGeometry(5.92,5.92,.06,96),new THREE.MeshStandardMaterial({map:canvasTexture("#14563c",.1,true),roughness:.94}));felt.position.y=1.31;felt.receiveShadow=true;tableGroup.add(felt);
 let gold=new THREE.Mesh(new THREE.TorusGeometry(6.02,.075,12,100),new THREE.MeshStandardMaterial({color:"#c59b54",metalness:.78,roughness:.24}));gold.rotation.x=Math.PI/2;gold.position.y=1.34;tableGroup.add(gold);
 for(let i=0;i<8;i++){let a=i*Math.PI/4;let leg=new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,1.15,16),mat("#4a2c1a",.35));leg.position.set(Math.cos(a)*4.7,.48,Math.sin(a)*4.7);leg.castShadow=true;tableGroup.add(leg)}
 // stitched felt border
 let ring=new THREE.Mesh(new THREE.TorusGeometry(5.75,.018,6,120),mat("#d0b478",.7,.3));ring.rotation.x=Math.PI/2;ring.position.y=1.35;tableGroup.add(ring)}
function makeAvatar(index,total,name){
 const g=new THREE.Group();
 const skin=mat(["#c58f70","#a96f53","#d4a17f","#8d5c43"][index%4],.72),shirt=mat(["#243d55","#6b3428","#314b37","#4b355e","#8a6a35","#28505a"][index%6],.66),pants=mat("#242b2d",.86),shoe=mat("#151918",.48),hair=mat(["#30251f","#171615","#60452e"][index%3],.92);
 const sphere=(parent,r,material,pos,scale)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,28,20),material);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m};
 const capsule=(parent,a,b,r,material,r2=r)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r,d.length(),16),material);m.position.copy(A.clone().add(B).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());m.castShadow=true;m.receiveShadow=true;parent.add(m);sphere(parent,r2,material,a);sphere(parent,r,material,b);return m};
 // Chair and detailed body silhouette
 const chair=new THREE.Group(),wood=mat("#51331f",.42);const seat=new THREE.Mesh(new THREE.BoxGeometry(1.3,.15,1.08),mat("#38271c",.55));seat.position.y=1.12;chair.add(seat);const back=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.25,.16),wood);back.position.set(0,1.77,-.49);chair.add(back);
 for(const x of [-.52,.52])for(const z of [-.42,.42]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,1.05,12),wood);leg.position.set(x,.55,z);chair.add(leg)}g.add(chair);
 // torso, neck, head, ears, nose, eyebrows and hair
 sphere(g,.53,shirt,[0,1.86,0],[.76,1.02,.53]);
 const collar=new THREE.Mesh(new THREE.TorusGeometry(.18,.045,10,28),mat("#d0c5ad",.8));collar.position.set(0,2.34,.02);g.add(collar);
 capsule(g,[0,2.27,0],[0,2.51,0],.13,skin);
 sphere(g,.39,skin,[0,2.79,.015],[.94,1.08,.9]);
 sphere(g,.395,hair,[0,3.02,-.045],[1.02,.48,1.02]);
 sphere(g,.19,hair,[-.28,2.99,.12],[.72,.7,.7]);sphere(g,.19,hair,[.28,2.99,.12],[.72,.7,.7]);
 for(const x of [-.385,.385])sphere(g,.105,skin,[x,2.78,0],[.7,1,1]);
 sphere(g,.055,skin,[0,2.75,.37],[.8,1.25,1.5]);
 const eyeMat=mat("#18120f",.35),brow=mat("#38271e",.8);
 for(const x of [-.145,.145]){sphere(g,.045,mat("#f2e6d5",.55),[x,2.83,.338],[1,.8,.45]);sphere(g,.023,eyeMat,[x,2.83,.36],[1,1,.5]);capsule(g,[x-.07,2.91,.34],[x+.07,2.92,.34],.018,brow)}
 const mouth=new THREE.Mesh(new THREE.TorusGeometry(.075,.014,8,20,Math.PI),mat("#713d36",.8));mouth.position.set(0,2.65,.35);mouth.rotation.z=Math.PI;g.add(mouth);
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
 for(const x of [-.23,.23]){capsule(g,[x,1.23,0],[x*1.1,.63,.04],.18,pants,.145);capsule(g,[x*1.1,.63,.04],[x*1.1,.23,.25],.14,pants,.12);sphere(g,.17,shoe,[x*1.1,.14,.4],[1,.58,1.55])}
 // subtle shirt buttons
 for(let y=1.92;y<2.22;y+=.12)sphere(g,.018,mat("#c7b58d",.35,.25),[0,y,.265]);
 const angle=-Math.PI/2+index*2*Math.PI/Math.max(total,2),radius=8.15;
 g.position.set(Math.cos(angle)*radius,0,Math.sin(angle)*radius);g.rotation.y=-angle+Math.PI/2;
 g.userData={arms,name,baseY:0,gesture:0,gestureKind:"idle",angle,phase:index*.8};return g;
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
function makeNameTag(player){const c=document.createElement("canvas");c.width=512;c.height=128;const x=c.getContext("2d");x.fillStyle="#07140fe8";x.strokeStyle=player.online?"#d2ad65":"#777777";x.lineWidth=5;x.roundRect(5,5,502,118,28);x.fill();x.stroke();x.fillStyle=player.online?"#f5dfae":"#b2b2b2";x.font="bold 38px Manrope,Arial";x.textAlign="center";x.fillText(player.name.slice(0,20),256,78);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));sprite.scale.set(2.25,.56,1);sprite.position.set(0,3.55,0);return sprite}
function disposeGroup(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.map)m.map.dispose();m.dispose()})}});group.clear()}
function rebuildAvatars(){disposeGroup(playersGroup);avatarMeshes=[];if(!room)return;room.players.forEach((p,i)=>{let a=makeAvatar(i,room.players.length,p.name);a.add(makeNameTag(p));playersGroup.add(a);avatarMeshes.push(a);if(p.gesture&&Date.now()-p.gesture.at<2200)applyGesture(a,p.gesture.kind)})}
function cardMesh(card,back=false){let geo=new THREE.BoxGeometry(.78,.025,1.12);let m=new THREE.Mesh(geo,[mat("#d8d0b9",.35),mat("#d8d0b9",.35),mat("#d8d0b9",.35),mat("#d8d0b9",.35),new THREE.MeshStandardMaterial({map:roundedCardMaterial(card?.suit,card?.rank,back),roughness:.45}),mat("#eee8d8",.4)]);m.castShadow=true;m.receiveShadow=true;return m}
function animateCardTo(mesh,x,y,z,rz=0){mesh.position.set(x,y+1.1,z);mesh.rotation.set(-Math.PI/2,0,rz);mesh.userData.target=new THREE.Vector3(x,y,z);mesh.userData.targetRotation=rz;mesh.userData.delay=Math.random()*.07}
function renderTableCards(){disposeGroup(cardGroup);cardMeshes=[];if(!room)return;let cards=room.table||[];cards.forEach((t,i)=>{let x=((i%3)-1)*1.35,z=Math.floor(i/3)*.8-.2;let a=cardMesh(t.attack);animateCardTo(a,x,1.43,z,(i%2-.5)*.1);cardGroup.add(a);cardMeshes.push(a);if(t.defense){let b=cardMesh(t.defense);animateCardTo(b,x+.25,1.47,z-.18,.12);cardGroup.add(b);cardMeshes.push(b)}});if(room.status==="lobby"){for(let i=0;i<Math.min(room.players.length*2,8);i++){let b=cardMesh(null,true);animateCardTo(b,Math.sin(i)*1.6,1.42,Math.cos(i)*1.5,i*.4);cardGroup.add(b)}}}
function renderRoom(){if(!room)return;$("roomLabel").textContent="СТОЛ "+room.code;$("roomStatus").textContent=room.players.length+"/"+room.settings.maxPlayers+" игроков";$("roomCode").value=room.code;$("deckCount").textContent="Колода: "+room.deckCount;$("trump").textContent="Козырь: "+(room.trump||"—");$("turn").textContent=room.status==="playing"?"Ход: "+(room.players[room.turn]?.name||"—"):"Ожидание игроков";$("start").disabled=room.status!=="lobby"||room.players.length<2;$("start").textContent=room.status==="playing"?"Партия идёт":"Начать игру";$("sceneMessage").textContent=room.lastAction||"Ожидание игроков";rebuildAvatars();renderTableCards();renderHand()}
function renderHand(){$("hand").innerHTML="";hand.forEach(c=>{let el=document.createElement("button");el.className="card "+("♥♦".includes(c.suit)?"red":"");el.innerHTML="<span>"+c.rank+"</span><span class='suit'>"+c.suit+"</span><span class='bottomrank'>"+c.rank+"</span>";el.onclick=()=>{selectedCard=c.id;document.querySelectorAll("#hand .card").forEach(x=>x.classList.remove("selected"));el.classList.add("selected");if(room&&room.status==="playing"&&room.players[room.defender]?.id===socket.id&&room.phase==="defend"){if(transferMode){socket.emit("game:transfer",c.id);transferMode=false}else socket.emit("game:defend",c.id)}else if(room&&room.status==="playing"&&(room.players[room.turn]?.id===socket.id||(["throw","defend"].includes(room.phase)&&room.players[room.defender]?.id!==socket.id)))socket.emit("game:play",c.id);};$("hand").appendChild(el)})}
function resize(){if(!renderer)return;let w=$("world").clientWidth,h=$("world").clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
function tick(){
 if(!renderer)return;
 const dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime;
 camera.position.x=Math.sin(t*.12)*.18;camera.position.y=10.8+Math.sin(t*.2)*.06;camera.lookAt(0,1.05,0);
 tableGroup.rotation.y=Math.sin(t*.08)*.008;
 cardMeshes.forEach(m=>{if(m.userData.target){m.userData.delay=Math.max(0,(m.userData.delay||0)-dt);if(!m.userData.delay){m.position.lerp(m.userData.target,1-Math.exp(-dt*8));m.rotation.z+=(m.userData.targetRotation-m.rotation.z)*(1-Math.exp(-dt*8));}}});
 avatarMeshes.forEach((a,i)=>{
  a.position.y=Math.sin(t*1.7+a.userData.phase)*.018;
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
