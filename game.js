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
