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
