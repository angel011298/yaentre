// Mascota vestida (única versión). Uso: const O = OUTFIT(); O.fig(pose, "day"|"night", ancho, {tone, face, eyeCls})
// poses: libro bolsa lapiz error dormido pensando calc reloj celebrar probeta · caras: n happy think flat sleep
function OUTFIT(){
var AC='#FC9712',INK='#2E1065',VIO='#6D28D9';
var LILA={base:'#C4B5FD',shade:'#AF9BF7',hi:'#EEE8FF'};
var E=function(t,o){return '<'+t+' '+Object.entries(o).map(function(kv){return kv[0]+'="'+kv[1]+'"'}).join(' ')+'></'+t+'>'};
var P_=function(d,fill,x){return E('path',Object.assign({d:d,fill:fill},x||{}))};
var ln=function(d,c,w){return E('path',{d:d,stroke:c,'stroke-width':w,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'})};
var ci=function(cx,cy,r,fill,x){return E('circle',Object.assign({cx:cx,cy:cy,r:r,fill:fill},x||{}))};
var el=function(cx,cy,rx,ry,fill,x){return E('ellipse',Object.assign({cx:cx,cy:cy,rx:rx,ry:ry,fill:fill},x||{}))};
var rc=function(x,y,w,h,r,fill,o){return E('rect',Object.assign({x:x,y:y,width:w,height:h,rx:r,fill:fill},o||{}))};
var PAL={day:{hood:'#1E1D24',hoodD:'#121116',sleeve:'#2B2A33',bg:'#FBFAFF',avbg:'#EDE9FE',name:'Día',hoodName:'negra'},night:{hood:'#F1E8D0',hoodD:'#DDD0AC',sleeve:'#F9F4E6',bg:'#131119',avbg:'#2A2833',name:'Noche',hoodName:'crema'}};
var JN='#9DB9E4',JD='#7F9ED2',SH='#DDD9EA',SS='#BEB9D0';
var g=function(inner,cls){return cls?'<g class="'+cls+'">'+inner+'</g>':inner};
var headF=function(cx,cy,r,t,face,cls){
 var ex=.34*r,ey=cy+.12*r,my=cy+.56*r,f;
 if(face==='happy')f=g(ln('M'+(cx-ex-5)+' '+(ey+1)+' q5 -7 10 0',INK,3.4)+ln('M'+(cx+ex-5)+' '+(ey+1)+' q5 -7 10 0',INK,3.4),cls)+ln('M'+(cx-7)+' '+(my-1)+' q7 8 14 0',INK,2.8);
 else if(face==='sleep')f=g(ln('M'+(cx-ex-5)+' '+ey+' q5 5 10 0',INK,3.4)+ln('M'+(cx+ex-5)+' '+ey+' q5 5 10 0',INK,3.4),cls)+el(cx,my+1,3,2.4,INK,{opacity:.8});
 else if(face==='think')f=g(el(cx-ex,ey-3,3.8,4.6,INK)+el(cx+ex,ey-3,3.8,4.6,INK),cls)+ln('M'+(cx-5)+' '+my+' h10',INK,2.8);
 else if(face==='flat')f=g(el(cx-ex,ey+1,3.8,3,INK)+el(cx+ex,ey+1,3.8,3,INK),cls)+ln('M'+(cx-5)+' '+(my+2)+' q5 -4 10 0',INK,2.8);
 else f=g(el(cx-ex,ey,3.8,4.6,INK)+el(cx+ex,ey,3.8,4.6,INK),cls)+ln('M'+(cx-5)+' '+my+' q6 4.5 11 -1',INK,2.8);
 return ci(cx,cy,r,t.base)+E('ellipse',{cx:cx-.44*r,cy:cy-.53*r,rx:.31*r,ry:.19*r,transform:'rotate(-28 '+(cx-.44*r)+' '+(cy-.53*r)+')',fill:t.hi,opacity:.9})+f;};
var shoe=function(x){return rc(x,150,36,11,5.5,SH)+rc(x+1,157,34,4,2,SS)};
var jeans=function(){return P_('M37 112 H60 V152 H29 Q26 152 27 148 Z',JN)+P_('M60 112 H83 L93 148 Q94 152 91 152 H60 Z',JN)+ln('M60 114 V151',JD,1.4)};
var hoodBody=function(P){return P_('M31 84 Q31 68 60 68 Q89 68 89 84 L93 112 Q93 121 85 121 H35 Q27 121 27 112 Z',P.hood)+rc(28,112,64,9,4.5,P.hoodD)};
var collar=function(P){return el(60,76,22,8,P.hoodD)+P_('M31 72 Q36 62 60 62 Q84 62 89 72 Q92 84 76 88 Q60 92 44 88 Q28 84 31 72 Z',P.hood)};
var sleeve=function(P,d){return ln(d,P.sleeve,16)};
var pocket=function(P){return P_('M36 96 H84 L88 112 H32 Z',P.hoodD)};
var pocketArms=function(P){return sleeve(P,'M35 80 Q21 96 45 103')+sleeve(P,'M85 80 Q99 96 75 103')};
var holdArms=function(P,t,L,R){
 var sl=sleeve(P,'M35 80 Q'+(L[0]-17)+' '+((80+L[1])/2+6)+' '+L[0]+' '+L[1])+sleeve(P,'M85 80 Q'+(R[0]+17)+' '+((80+R[1])/2+6)+' '+R[0]+' '+R[1]);
 return sl+'@@PROP@@'+ci(L[0]+4.5,L[1]-2,6.5,t.base)+ci(R[0]-4.5,R[1]-2,6.5,t.base)};
var star=function(cx,cy,R,r){var pts=[];for(var i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,rr=i%2?r:R;pts.push((cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1))}return E('polygon',{points:pts.join(' '),fill:AC})};
var PROPS={
 libro:{L:[36,114],R:[84,114],f:'n',svg:function(){return rc(38,101,44,25,3,VIO)+rc(42,105,36,17,2,'#FFFFFF')+rc(58.6,105,2.8,17,0,VIO)}},
 dormido:{L:[45,112],R:[75,112],f:'sleep',svg:function(){return rc(52,100,16,19,3,VIO)+rc(52,100,16,4,2,'#A78BFA')+ln('M68 104 a6 6 0 0 1 0 11',VIO,3.4)}},
 calc:{L:[43,114],R:[77,114],f:'n',svg:function(){return rc(46,98,28,25,4,VIO)+rc(49,101,22,8,2,'#E9E3FF')+[52,60,68].map(function(x){return ci(x,fillY(0),2,x===68?AC:'#FFFFFF')+ci(x,fillY(1),2,x===68?AC:'#FFFFFF')}).join('')}},
 reloj:{L:[43,116],R:[77,116],f:'n',svg:function(){return rc(56.5,94,7,4,2,VIO)+ci(60,110,13,'#FFFFFF',{stroke:VIO,'stroke-width':4})+ln('M60 110 V102 M60 110 L66 114',AC,3)}},
 probeta:{L:[44,116],R:[76,116],f:'n',svg:function(){return P_('M56 98 H64 V108 L74 124 Q75 127 72 127 H48 Q45 127 46 124 L56 108 Z','#FFFFFF',{stroke:VIO,'stroke-width':3,'stroke-linejoin':'round'})+P_('M50 119 H70 L73 124 Q74 126.5 71.5 126.5 H48.5 Q46 126.5 47 124 Z',AC)}}
};
function fillY(i){return i?119:113}
var inner=function(pose,m,o){
 o=o||{};var P=PAL[m],t=o.tone||LILA,cls=o.eyeCls||'';
 var base=el(60,162,36,4.5,'#000000',{opacity:.1})+shoe(20)+shoe(64)+jeans()+hoodBody(P)+collar(P);
 var face=o.face,s=base;
 if(PROPS[pose]){var p=PROPS[pose];face=face||p.f;s+=pocket(P)+holdArms(P,t,p.L,p.R).replace('@@PROP@@',p.svg())}
 else if(pose==='lapiz'||pose==='pensando'){
  face=face||(pose==='lapiz'?'happy':'think');
  var prop=pose==='lapiz'?'<g transform="rotate(12 99 58)">'+rc(95.5,22,7,34,1.5,VIO)+rc(95.5,44,7,4,0,AC)+P_('M95.5 22 L102.5 22 L99 13 Z',INK)+'</g>':ci(106,36,10,'#FFFFFF',{'fill-opacity':.55,stroke:VIO,'stroke-width':4})+ln('M101 44 L99 54',VIO,4.5);
  s+=sleeve(P,'M35 80 Q21 96 45 103')+sleeve(P,'M85 80 Q103 80 99 62')+pocket(P)+prop+ci(99,58,7,t.base)}
 else if(pose==='celebrar'){
  face=face||'happy';
  s+=sleeve(P,'M34 82 Q10 74 17 46')+sleeve(P,'M86 82 Q110 74 103 46')+pocket(P)+ci(17,41,7,t.base)+ci(103,41,7,t.base)+star(60,-4,11,4.8)+ci(18,10,2.6,AC)+ci(104,8,2.6,VIO)+ci(34,-6,2,VIO)+ci(88,-8,2,AC)}
 else{face=face||(pose==='error'?'flat':'n');s+=pocketArms(P)+pocket(P)}
 return s+headF(60,40,32,t,face,cls)};
var fig=function(pose,m,w,o){return '<svg viewBox="-14 -16 148 192" width="'+w+'" height="'+Math.round(w*192/148)+'" aria-hidden="true">'+inner(pose,m,o)+'</svg>'};
var bust=function(m,s,o){o=o||{};return '<svg viewBox="4 -2 112 112" width="'+s+'" height="'+s+'" style="border-radius:50%; display:block; flex:none" aria-hidden="true">'+rc(4,-2,112,112,0,PAL[m].avbg)+inner(o.pose||'bolsa',m,o)+'</svg>'};
var file=function(pose,m){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -16 148 192">'+inner(pose,m)+'</svg>\n'};
var avatarFile=function(m){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 -2 112 112">'+rc(4,-2,112,112,0,PAL[m].avbg)+inner('bolsa',m)+'</svg>\n'};
return {PAL:PAL,LILA:LILA,fig:fig,bust:bust,file:file,avatarFile:avatarFile,inner:inner};
}
module.exports = { OUTFIT };
