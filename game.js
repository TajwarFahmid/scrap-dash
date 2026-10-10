(() => {
  const canvas = document.querySelector('#yard');
  const ctx = canvas.getContext('2d');
  const gameScreen = document.querySelector('#gameScreen');
  const colors = ['#ee8063', '#76a6bd', '#8aa66a', '#d7ad45'];
  const names = ['Junkyard Jess', 'Bolt', 'Moss', 'Pip'];
  const initials = ['J', 'B', 'M', 'P'];
  const partNames = ['Coil', 'Gear', 'Battery'];
  const partColors = ['#e97759', '#6f8e69', '#e6bf56'];
  const stations = [{x:95,y:100},{x:805,y:100},{x:95,y:480},{x:805,y:480}];
  const keys = new Set();
  let players = [], pickups = [], round = 1, roundTime = 150, timerId, frameId, ended = false, running = false;
  let networkSession=null, networkPoll=null, networkSend=null, networkSearch=false, networkBump=false;
  const blocks = [{x:330,y:105,w:155,h:48},{x:520,y:205,w:62,h:142},{x:305,y:300,w:132,h:55},{x:595,y:410,w:132,h:46},{x:130,y:260,w:72,h:98},{x:690,y:275,w:65,h:70}];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function makeRound(){
    networkSession=null;
    ended=false; roundTime=150; pickups=[];
    players=names.map((name,i)=>({name,initial:initials[i],color:colors[i],x:stations[i].x,y:stations[i].y,station:stations[i],parts:[false,false,false],carry:null,speed:i===0?2.35:0.95,angle:-Math.PI/2,stun:0,bumpCooldown:0,bot:i!==0,brain:0,target:null,actionWait:0,score:players[i]?.score||0}));
    for(let t=0;t<3;t++)for(let n=0;n<5;n++){
      let spot; do{spot={x:55+Math.random()*790,y:45+Math.random()*490};}while(blocks.some(b=>spot.x>b.x-20&&spot.x<b.x+b.w+20&&spot.y>b.y-20&&spot.y<b.y+b.h+20)||stations.some(s=>dist(spot,s)<130));
      pickups.push({...spot,type:t});
    }
    document.querySelector('#roundLabel').textContent=`ROUND ${round} / 3`;
    document.querySelector('#roundBanner').classList.remove('show');
    syncPanel();
    clearInterval(timerId);timerId=setInterval(()=>{if(!running||ended)return;roundTime--;document.querySelector('#timer').textContent=`${String(Math.floor(roundTime/60)).padStart(2,'0')}:${String(roundTime%60).padStart(2,'0')}`;if(roundTime<=0)finishRound(null,true);},1000);
    document.querySelector('#timer').textContent='02:30';
  }
  function syncPanel(){
    document.querySelector('#scoreList').innerHTML=players.map((p,i)=>`<div class="score-row ${i===0?'me':''}"><span class="score-avatar" style="background:${p.color}">${p.initial}</span><span class="score-name">${p.name}</span><span class="score-parts">${p.parts.filter(Boolean).length}/3 · ${p.score}★</span></div>`).join('');
    const me=players[0];
    document.querySelector('#carryStatus').textContent=me?.carry===null||me?.carry===undefined?'HANDS FREE · E TO SEARCH':`CARRYING: ${partNames[me.carry].toUpperCase()} · E TO INSTALL`;
  }
  function bump(attacker){if(!attacker||ended||attacker.stun>0||attacker.bumpCooldown>0)return;attacker.bumpCooldown=150;for(const p of players){if(p===attacker||dist(attacker,p)>54)continue;const a=Math.atan2(p.y-attacker.y,p.x-attacker.x);p.x=clamp(p.x+Math.cos(a)*74,20,880);p.y=clamp(p.y+Math.sin(a)*74,20,560);p.stun=52;}}
  function move(p,dx,dy){if(!dx&&!dy)return;const mag=Math.hypot(dx,dy)||1,pace=p.speed*(p.carry!==null?0.7:1);dx=dx/mag*pace;dy=dy/mag*pace;p.angle=Math.atan2(dy,dx);let nx=clamp(p.x+dx,18,882),ny=clamp(p.y+dy,18,562);if(!blocks.some(b=>nx>b.x-14&&nx<b.x+b.w+14&&ny>b.y-14&&ny<b.y+b.h+14)){p.x=nx;p.y=ny;}}
  function interact(p){if(p===players[0]&&!keys.has('e'))return;if(p.carry===null){const idx=pickups.findIndex(o=>dist(o,p)<27&&!p.parts[o.type]);if(idx>=0){p.carry=pickups[idx].type;pickups.splice(idx,1);if(p===players[0])syncPanel();}}else if(dist(p,p.station)<48){p.parts[p.carry]=true;p.carry=null;if(p===players[0])syncPanel();if(p.parts.every(Boolean))finishRound(p,false);}}
  function updatePrompt(){const me=players[0];if(!me)return;const nearby=pickups.find(o=>dist(o,me)<32&&!me.parts[o.type]);const text=me.carry!==null?(dist(me,me.station)<55?'E  INSTALL PART':`CARRYING ${partNames[me.carry].toUpperCase()} · SLOWER`):nearby?`E  SEARCH FOR ${partNames[nearby.type].toUpperCase()}`:'HANDS FREE · FIND A SCRAP HEAP';document.querySelector('#carryStatus').textContent=text;}
  function botStep(p){if(p.stun>0){p.stun--;return;}if(p.bumpCooldown>0)p.bumpCooldown--;const rival=players.find(q=>q!==p&&dist(p,q)<35);if(rival&&Math.random()<.012)bump(p);p.brain--;if(p.brain<=0){p.brain=18+Math.random()*18;if(p.carry!==null)p.target=p.station;else{const need=p.parts.map((v,i)=>v?null:i).filter(v=>v!==null);const options=pickups.filter(o=>need.includes(o.type));p.target=options.sort((a,b)=>dist(a,p)-dist(b,p))[0]||p.station;}}
    if(!p.target)return;const dx=p.target.x-p.x,dy=p.target.y-p.y;if(Math.hypot(dx,dy)<22){p.actionWait++;if(p.actionWait>=26){interact(p);p.actionWait=0;p.brain=0;}}else{p.actionWait=0;move(p,dx,dy);}
  }
  function draw(){
    ctx.clearRect(0,0,900,580);ctx.fillStyle='#dce5c7';ctx.fillRect(0,0,900,580);
    ctx.strokeStyle='#bac8a7';ctx.lineWidth=1;for(let x=0;x<900;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,580);ctx.stroke();}for(let y=0;y<580;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke();}
    ctx.fillStyle='#cad4b5';ctx.fillRect(0,0,900,12);ctx.fillRect(0,568,900,12);ctx.fillRect(0,0,12,580);ctx.fillRect(888,0,12,580);
    blocks.forEach((b,i)=>{ctx.fillStyle=i%2?'#88967a':'#a2a38a';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#727c69';ctx.fillRect(b.x,b.y+b.h-7,b.w,7);ctx.fillStyle='#e0d9bb';ctx.font='8px monospace';ctx.fillText(['CRATE 07','ENGINE','OLD TIRES','SCRAP','PALLET','DRUM'][i],b.x+8,b.y+17);});
    players.forEach((p,i)=>{ctx.fillStyle=p.color+'50';ctx.fillRect(p.station.x-33,p.station.y-27,66,54);ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.strokeRect(p.station.x-33,p.station.y-27,66,54);ctx.fillStyle='#263328';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText(i===0?'YOUR STATION':`${p.initial.toUpperCase()}'S STATION`,p.station.x,p.station.y-34);p.parts.forEach((has,j)=>{ctx.fillStyle=has?partColors[j]:'#f3efe4';ctx.strokeStyle=partColors[j];ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.station.x-18+j*18,p.station.y+14,5,0,Math.PI*2);ctx.fill();ctx.stroke();});});
    pickups.forEach(drawScrapHeap);
    players.forEach((p,i)=>drawFigure(p,i));
  }
  function drawScrapHeap(o){
    ctx.fillStyle='#26332822';ctx.beginPath();ctx.ellipse(o.x,o.y+9,22,9,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#89957a';ctx.beginPath();ctx.moveTo(o.x-20,o.y+5);ctx.lineTo(o.x-15,o.y-8);ctx.lineTo(o.x-3,o.y-15);ctx.lineTo(o.x+8,o.y-12);ctx.lineTo(o.x+20,o.y-3);ctx.lineTo(o.x+18,o.y+8);ctx.closePath();ctx.fill();
    ctx.fillStyle='#a7a58c';ctx.fillRect(o.x-15,o.y-2,13,8);ctx.fillStyle='#717e6b';ctx.save();ctx.translate(o.x+9,o.y-6);ctx.rotate(-.35);ctx.fillRect(-8,-4,16,8);ctx.restore();
    ctx.fillStyle='#d4cfb7';ctx.beginPath();ctx.arc(o.x-9,o.y-9,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6d7967';ctx.fillRect(o.x+3,o.y+3,11,3);
    ctx.save();ctx.translate(o.x,o.y-3);ctx.fillStyle=partColors[o.type];ctx.strokeStyle='#263328';ctx.lineWidth=2;
    if(o.type===0){ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#89957a';ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();}
    if(o.type===1){ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#89957a';ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();ctx.stroke();for(let a=0;a<6;a++){ctx.save();ctx.rotate(a*Math.PI/3);ctx.fillStyle=partColors[o.type];ctx.fillRect(-2,-12,4,5);ctx.restore();}}
    if(o.type===2){ctx.fillRect(-5,-8,10,16);ctx.strokeRect(-5,-8,10,16);ctx.fillRect(-2,-11,4,3);ctx.fillStyle='#f3e7b1';ctx.fillRect(-2,-5,4,5);}
    ctx.restore();ctx.fillStyle='#485441';ctx.font='7px monospace';ctx.textAlign='center';ctx.fillText('SEARCH',o.x,o.y+21);
  }
  function drawFigure(p,i){
    const moving=p.moving||(p===players[0]&&(keys.has('w')||keys.has('a')||keys.has('s')||keys.has('d')||keys.has('arrowup')||keys.has('arrowdown')||keys.has('arrowleft')||keys.has('arrowright'))) || (p.bot&&p.target&&dist(p,p.target)>20);
    const step=moving?Math.sin(performance.now()/75)*3:0,face=p.angle||-Math.PI/2;
    ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#2633282b';ctx.beginPath();ctx.ellipse(0,13,12,5,0,0,Math.PI*2);ctx.fill();
    ctx.rotate(face+Math.PI/2);
    ctx.strokeStyle='#394339';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-4,6);ctx.lineTo(-5+step,13);ctx.moveTo(4,6);ctx.lineTo(5-step,13);ctx.stroke();
    ctx.strokeStyle='#d6b99c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,-1);ctx.lineTo(-11,5-step);ctx.moveTo(8,-1);ctx.lineTo(11,5+step);ctx.stroke();
    ctx.fillStyle=p.color;ctx.strokeStyle='#344136';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-8,-7,16,16,5);ctx.fill();ctx.stroke();
    ctx.fillStyle='#d8b797';ctx.beginPath();ctx.ellipse(0,-11,6,7,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#465347';ctx.beginPath();ctx.arc(0,-13,6,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle='#263328';ctx.beginPath();ctx.arc(2,-11,1,0,Math.PI*2);ctx.fill();
    if(p.carry!==null){ctx.fillStyle=partColors[p.carry];ctx.beginPath();ctx.arc(12,-5,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#263328';ctx.lineWidth=1.5;ctx.stroke();}
    if(p.stun>0){ctx.fillStyle='#f5c95c';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('✦',0,-25);}
    ctx.restore();ctx.fillStyle='#263328';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText(i===0?'YOU':p.initial.toUpperCase(),p.x,p.y+25);
    if(i===0){ctx.strokeStyle='#263328';ctx.setLineDash([3,3]);ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,22,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
  }
  function loop(){if(!running)return;const me=players[0];if(me&&!ended&&!networkSession){if(me.stun>0)me.stun--;if(me.bumpCooldown>0)me.bumpCooldown--;let dx=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0),dy=(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);if(me.stun===0)move(me,dx,dy);for(const p of players.slice(1))botStep(p);for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){const a=players[i],b=players[j],d=dist(a,b);if(d>0&&d<24){const push=(24-d)/2,ang=Math.atan2(b.y-a.y,b.x-a.x);a.x-=Math.cos(ang)*push;a.y-=Math.sin(ang)*push;b.x+=Math.cos(ang)*push;b.y+=Math.sin(ang)*push;}}}if(me&&!ended)updatePrompt();draw();frameId=requestAnimationFrame(loop);}
