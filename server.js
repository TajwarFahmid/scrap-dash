const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const rooms = new Map();
const files = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
const stations = [{x:75,y:75},{x:825,y:75},{x:75,y:505},{x:825,y:505},{x:450,y:70},{x:830,y:290},{x:450,y:510},{x:70,y:290}];
const blocks = [{x:330,y:105,w:155,h:48},{x:520,y:205,w:62,h:142},{x:305,y:300,w:132,h:55},{x:595,y:410,w:132,h:46},{x:130,y:260,w:72,h:98},{x:690,y:275,w:65,h:70}];
const partNames = ['Coil','Gear','Battery'];
const playerColors = ['#ee8063','#76a6bd','#8aa66a','#d7ad45','#b685bd','#5da89a','#e19451','#8696ca'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function send(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>12000)reject(new Error('Request too large'));});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{});}catch{reject(new Error('Invalid JSON'));}});});}
function roomSnapshot(room,playerId){return {code:room.code,hostId:room.hostId,phase:room.phase,round:room.round,roundTime:room.roundTime,players:room.players.map(p=>({id:p.id,name:p.name,color:p.color,x:p.x,y:p.y,station:p.station,parts:p.parts,carry:p.carry,stun:p.stun,score:p.score})),pickups:room.pickups.map(o=>({...o})),winner:room.winner,matchWinner:room.matchWinner,timeout:room.timeout,playerId};}
function spawnPickups(){const result=[];for(let type=0;type<3;type++)for(let i=0;i<5;i++){let spot;let attempts=0;do{spot={x:48+Math.random()*804,y:40+Math.random()*500};attempts++;}while(attempts<200&&(blocks.some(b=>spot.x>b.x-20&&spot.x<b.x+b.w+20&&spot.y>b.y-20&&spot.y<b.y+b.h+20)||stations.some(s=>distance(spot,s)<130)));result.push({...spot,type,id:randomUUID()});}return result;}
function resetRound(room){room.phase='playing';room.roundTime=150;room.tickCount=0;room.winner=null;room.timeout=false;room.pickups=spawnPickups();room.players.forEach((p,i)=>{p.x=p.station.x;p.y=p.station.y;p.parts=[false,false,false];p.carry=null;p.stun=0;p.bumpCooldown=0;p.lastInput={dx:0,dy:0};p.pendingSearch=false;p.pendingBump=false;});}
function finishRound(room,winners,timeout){if(room.phase!=='playing')return;room.phase='roundOver';room.timeout=timeout;winners.forEach(p=>p.score++);room.winner=winners.map(p=>p.name);room.matchWinner=winners.find(p=>p.score>=2)?.name||null;}
function applyInteract(room,p){if(p.carry===null){const i=room.pickups.findIndex(o=>distance(o,p)<27&&!p.parts[o.type]);if(i>=0){p.carry=room.pickups[i].type;room.pickups.splice(i,1);}}else if(distance(p,p.station)<48){p.parts[p.carry]=true;p.carry=null;if(p.parts.every(Boolean))finishRound(room,[p],false);}}
function move(p,dx,dy){if(p.stun>0)return;if(!dx&&!dy)return;const m=Math.hypot(dx,dy)||1,pace=6.6*(p.carry!==null?0.7:1);dx=dx/m*pace;dy=dy/m*pace;const x=clamp(p.x+dx,18,882),y=clamp(p.y+dy,18,562);if(!blocks.some(b=>x>b.x-14&&x<b.x+b.w+14&&y>b.y-14&&y<b.y+b.h+14)){p.x=x;p.y=y;}}
function tickRoom(room){if(room.phase!=='playing')return;room.tickCount++;if(room.tickCount%20===0)room.roundTime--;for(const p of room.players){if(p.stun>0)p.stun--;if(p.bumpCooldown>0)p.bumpCooldown--;move(p,p.lastInput?.dx||0,p.lastInput?.dy||0);if(p.pendingSearch){p.pendingSearch=false;applyInteract(room,p);}if(p.pendingBump){p.pendingBump=false;if(p.bumpCooldown===0&&p.stun===0){p.bumpCooldown=60;for(const other of room.players){if(other!==p&&distance(p,other)<54){const a=Math.atan2(other.y-p.y,other.x-p.x);other.x=clamp(other.x+Math.cos(a)*68,18,882);other.y=clamp(other.y+Math.sin(a)*68,18,562);other.stun=38;}}}}}
  for(let i=0;i<room.players.length;i++)for(let j=i+1;j<room.players.length;j++){const a=room.players[i],b=room.players[j],d=distance(a,b);if(d>0&&d<23){const force=(23-d)/2,angle=Math.atan2(b.y-a.y,b.x-a.x);a.x-=Math.cos(angle)*force;a.y-=Math.sin(angle)*force;b.x+=Math.cos(angle)*force;b.y+=Math.sin(angle)*force;}}
  if(room.roundTime<=0){const high=Math.max(...room.players.map(p=>p.parts.filter(Boolean).length));finishRound(room,room.players.filter(p=>p.parts.filter(Boolean).length===high),true);}}
setInterval(()=>{for(const room of rooms.values()){for(const p of room.players){if(Date.now()-p.seenAt>15000){room.players=room.players.filter(q=>q!==p);if(p.id===room.hostId)room.hostId=room.players[0]?.id||null;}}if(room.phase==='playing')tickRoom(room);if(!room.players.length)rooms.delete(room.code);}},1000/20);
async function api(req,res,url){
