// Logo, íconos y colores. Uso: const L = LIB(); L.glyph(primario, acento, hueco)
// gotaInner/face/casualInner/avatarCasual son de versiones anteriores (personaje sin ropa): no usar.
function LIB(){
const V={100:'#EDE9FE',200:'#DDD6FE',300:'#C4B5FD',400:'#A78BFA',500:'#8B5CF6',600:'#7C3AED',700:'#6D28D9',800:'#5B21B6',900:'#4C1D95',950:'#2E1065'};
const AC='#FC9712',INK='#2E1065',MID='#7431E3';
const T={ink:'#131119',ink2:'#4B4958',ink3:'#6B6878',line:'#E1E1E5',bg:'#F6F5FA',bg25:'#FBFAFF',dark:'#131119',dark2:'#1F1E26',dark3:'#2A2833'};
const FD="font-family:'Outfit', sans-serif",FB="font-family:'Inter', sans-serif",FM="font-family:'JetBrains Mono', monospace";
const gam=c=>{c=c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055;return Math.round(Math.min(1,Math.max(0,c))*255)};
const o2l=(L,C,H)=>{const a=C*Math.cos(H*Math.PI/180),b=C*Math.sin(H*Math.PI/180);const l=(L+0.3963377774*a+0.2158037573*b)**3,m=(L-0.1055613458*a-0.0638541728*b)**3,s=(L-0.0894841775*a-1.2914855480*b)**3;return [4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.7076147010*s]};
const okhex=(L,C,H)=>{let c=C;for(let i=0;i<80;i++){const r=o2l(L,c,H);if(r.every(v=>v>=-0.0005&&v<=1.0005))return '#'+r.map(gam).map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();c*=0.97}return '#888888'};
const tone=(h,fix)=>fix||{base:okhex(.81,.095,h),shade:okhex(.69,.1,h),hi:okhex(.93,.04,h)};
const SUBJ=[{n:'Matemáticas',h:294,fix:{base:'#C4B5FD',shade:'#AF9BF7',hi:'#EEE8FF'},prop:'calc'},{n:'Español',h:350,prop:'libro'},{n:'Física',h:250,prop:'reloj'},{n:'Química',h:190,prop:'probeta'},{n:'Biología',h:145,prop:'lupa'},{n:'Historia',h:80,prop:'libro'},{n:'Geografía',h:225,prop:'lupa'},{n:'Habilidades',h:25,prop:'lapiz'}];
SUBJ.forEach(s=>{s.t=tone(s.h,s.fix)});
const LILA=SUBJ[0].t;
const eye=(x,y,rx,ry,ink)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${ink}"></ellipse>`;
const arc=(d,w,ink)=>`<path d="${d}" stroke="${ink}" stroke-width="${w}" fill="none" stroke-linecap="round"></path>`;
const face=(e,ink)=>{
 if(e==='sleep')return arc('M43 48 q5 -6 10 0',3.6,ink)+arc('M67 48 q5 -6 10 0',3.6,ink)+`<ellipse cx="60" cy="63" rx="3.2" ry="2.6" fill="${ink}" opacity="0.8"></ellipse>`;
 if(e==='happy')return arc('M43 50 q5 -8 10 0',3.6,ink)+arc('M67 50 q5 -8 10 0',3.6,ink)+arc('M52 62 q8 8 16 0',3,ink);
 if(e==='flat')return eye(48,49,4.4,3,ink)+eye(72,49,4.4,3,ink)+arc('M54 66 q6 -4.5 12 0',2.8,ink);
 if(e==='think')return eye(50,43,4.2,5.4,ink)+eye(74,43,4.2,5.4,ink)+arc('M54 63 h12',2.8,ink);
 return eye(48,47,4.4,5.6,ink)+eye(72,47,4.4,5.6,ink)+arc('M54 62 q6 4.5 12 0',2.8,ink)};
const D=V[700];
const PR={
libro:`<rect x="30" y="100" width="60" height="28" rx="4" fill="${D}"></rect><rect x="35" y="105" width="50" height="18" rx="2" fill="#FFFFFF"></rect><rect x="58.5" y="105" width="3" height="18" fill="${D}"></rect>`,
lapiz:`<g transform="rotate(14 104 62)"><rect x="100" y="22" width="8" height="42" rx="2" fill="${D}"></rect><rect x="100" y="22" width="8" height="7" fill="${AC}"></rect><path d="M100 64 L108 64 L104 73 Z" fill="${INK}"></path></g>`,
taza:`<rect x="47" y="102" width="26" height="22" rx="4" fill="${D}"></rect><path d="M73 107 a7 7 0 0 1 0 12" stroke="${D}" stroke-width="3.6" fill="none"></path><rect x="47" y="102" width="26" height="5" rx="2" fill="${V[400]}"></rect>`,
lupa:`<circle cx="106" cy="46" r="13" fill="#FFFFFF" fill-opacity="0.5" stroke="${D}" stroke-width="4"></circle><path d="M97 56 L90 66" stroke="${D}" stroke-width="5" stroke-linecap="round"></path>`,
calc:`<rect x="42" y="98" width="36" height="32" rx="5" fill="${D}"></rect><rect x="46" y="102" width="28" height="9" rx="2" fill="#E9E3FF"></rect><circle cx="51" cy="118" r="2.2" fill="#FFFFFF"></circle><circle cx="60" cy="118" r="2.2" fill="#FFFFFF"></circle><circle cx="69" cy="118" r="2.2" fill="${AC}"></circle><circle cx="51" cy="125" r="2.2" fill="#FFFFFF"></circle><circle cx="60" cy="125" r="2.2" fill="#FFFFFF"></circle><circle cx="69" cy="125" r="2.2" fill="${AC}"></circle>`,
reloj:`<rect x="55" y="92" width="10" height="5" rx="2" fill="${D}"></rect><circle cx="60" cy="113" r="16" fill="#FFFFFF" stroke="${D}" stroke-width="4"></circle><path d="M60 113 V104 M60 113 L67 117" stroke="${AC}" stroke-width="3.4" stroke-linecap="round"></path>`,
probeta:`<path d="M54 98 h12 M56 98 v12 l-9 15 a3 3 0 0 0 3 4.5 h20 a3 3 0 0 0 3 -4.5 l-9 -15 v-12" stroke="${D}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"></path><path d="M51 121 h18 l4 6 a2 2 0 0 1 -1.8 3 h-22.4 a2 2 0 0 1 -1.8 -3 z" fill="${AC}"></path>`,
estrella:`<polygon points="60,-12 63.5,-4 72,-3 65.5,3 67.5,11 60,6.5 52.5,11 54.5,3 48,-3 56.5,-4" fill="${AC}"></polygon><circle cx="22" cy="14" r="3" fill="${AC}"></circle><circle cx="100" cy="10" r="3" fill="${V[500]}"></circle><circle cx="12" cy="36" r="2.2" fill="${V[500]}"></circle>`
};
const POSES={
libro:{f:'n',pr:'libro',a:[[45,86,32,112],[75,86,88,112]]},
lapiz:{f:'happy',pr:'lapiz',a:[[45,86,34,120],[75,86,104,62]]},
dormido:{f:'sleep',pr:'taza',a:[[45,86,46,112],[75,86,74,112]]},
pensando:{f:'think',pr:'lupa',a:[[45,86,34,120],[75,86,94,64]]},
calc:{f:'n',pr:'calc',a:[[45,86,41,116],[75,86,79,116]]},
reloj:{f:'flat',pr:'reloj',a:[[45,86,45,116],[75,86,75,116]]},
celebrar:{f:'happy',pr:'estrella',a:[[45,84,20,48],[75,84,100,48]]},
probeta:{f:'n',pr:'probeta',a:[[45,86,46,120],[75,86,74,120]]},
error:{f:'flat',pr:'libro',a:[[45,88,36,124],[75,88,84,124]]}
};
const BODY='M40 84 Q40 72 60 72 Q80 72 80 84 L81 122 Q81 132 77 147 Q76 152 70.5 152 Q65 152 64.5 147 L62.5 132 Q60 128 57.5 132 L55.5 147 Q55 152 49.5 152 Q44 152 43 147 Q39 132 39 122 Z';
const gotaInner=(t,pose,ink,faceO)=>{const P=POSES[pose]||POSES.libro;const e=faceO||P.f;
 const arm=a=>{const L_=a[0]<60;const mx=L_?Math.min(a[2]-6,30):Math.max(a[2]+6,90),my=(a[1]+a[3])/2+4;return '<path d="M'+a[0]+' '+a[1]+' Q'+mx+' '+my+' '+a[2]+' '+a[3]+'" stroke="'+t.base+'" stroke-width="13" fill="none" stroke-linecap="round"></path>'};
 return '<ellipse cx="60" cy="155" rx="28" ry="4.5" fill="#000000" opacity="0.09"></ellipse><path d="'+BODY+'" fill="'+t.base+'"></path><circle cx="60" cy="44" r="32" fill="'+t.base+'"></circle><ellipse cx="46" cy="27" rx="10" ry="6" transform="rotate(-28 46 27)" fill="'+t.hi+'" opacity="0.85"></ellipse><g transform="translate(0 -2)">'+face(e,ink)+'</g>'+PR[P.pr]+P.a.map(arm).join('')};
const gotaSvg=(t,pose,w,faceO)=>`<svg viewBox="-14 -16 148 192" width="${w}" height="${Math.round(w*192/148)}" aria-hidden="true">${gotaInner(t,pose,INK,faceO)}</svg>`;
const sw=(d,w,c)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"></path>`;
const glyph=(p,a,h)=>'<path d="M22.5 76 A34 34 0 1 1 77.5 76 Z" fill="'+p+'"></path><ellipse cx="40" cy="52" rx="4.8" ry="6" fill="'+h+'"></ellipse><ellipse cx="60" cy="52" rx="4.8" ry="6" fill="'+h+'"></ellipse><path d="M44 63 q6 5 12 0" stroke="'+h+'" stroke-width="3.4" fill="none" stroke-linecap="round"></path><path d="M80 78 L91 65" stroke="'+p+'" stroke-width="14" fill="none" stroke-linecap="round"></path><circle cx="91" cy="64" r="8.5" fill="'+p+'"></circle><rect x="12" y="76" width="76" height="9" rx="4.5" fill="'+a+'"></rect><rect x="19" y="68" width="14" height="12" rx="6" fill="'+p+'"></rect>';
const glyphS=(p,a,h)=>'<path d="M20 74 A36 36 0 1 1 80 74 Z" fill="'+p+'"></path><ellipse cx="38" cy="50" rx="7" ry="8.5" fill="'+h+'"></ellipse><ellipse cx="62" cy="50" rx="7" ry="8.5" fill="'+h+'"></ellipse><path d="M84 77 L92 63" stroke="'+p+'" stroke-width="13" fill="none" stroke-linecap="round"></path><circle cx="92" cy="62" r="8" fill="'+p+'"></circle><rect x="8" y="74" width="84" height="12" rx="6" fill="'+a+'"></rect>';
const svg=(inner,s)=>`<svg viewBox="0 0 100 100" width="${s}" height="${s}" aria-hidden="true">${inner}</svg>`;
const lockH=(p,a,h,txt,s)=>`<div style="display:flex; align-items:center; gap:${Math.round(s*.2)}px">${svg(glyph(p,a,h),s)}<span style="${FD}; font-weight:700; font-size:${Math.round(s*.7)}px; letter-spacing:-0.02em; color:${txt}; line-height:1">YaEntre</span></div>`;
const lockV=(p,a,h,txt,s)=>`<div style="display:flex; flex-direction:column; align-items:center; gap:${Math.round(s*.08)}px">${svg(glyph(p,a,h),s)}<span style="${FD}; font-weight:700; font-size:${Math.round(s*.46)}px; letter-spacing:-0.02em; color:${txt}; line-height:1">YaEntre</span></div>`;
const serious=(txt,a,s)=>`<div style="display:inline-flex; flex-direction:column; gap:${Math.round(s*.1)}px"><span style="${FD}; font-weight:700; font-size:${s}px; letter-spacing:-0.02em; color:${txt}; line-height:1">YaEntre</span><span style="display:block; height:${Math.round(s*.13)}px; border-radius:${s}px; background:${a}"></span></div>`;
const appIcon=(s,r,inner,mk)=>`<div style="width:${s}px; height:${s}px; border-radius:${r}; background:linear-gradient(135deg, ${V[600]} 0%, ${V[700]} 100%); display:flex; align-items:center; justify-content:center; flex:none">${svg((mk||glyph)('#FFFFFF',AC,MID),Math.round(s*(inner||.74)))}</div>`;
const IC={
home:'<path d="M3 11l9-8 9 8"></path><path d="M5 10v10h5v-6h4v6h5V10"></path>',
book:'<path d="M5 20a2 2 0 0 1 2-2h12V4H7a2 2 0 0 0-2 2z"></path><path d="M9 8h6"></path>',
target:'<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1" fill="currentColor"></circle>',
chart:'<path d="M5 20v-7M12 20V5M19 20v-10"></path>',
flame:'<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"></path>',
clock:'<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
check:'<path d="M5 12l5 5 9-10"></path>',
x:'<path d="M6 6l12 12M18 6L6 18"></path>',
lock:'<rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path>',
user:'<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
sliders:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"></path><circle cx="16" cy="7" r="2"></circle><circle cx="8" cy="17" r="2"></circle>',
bell:'<path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4z"></path><path d="M10 21h4"></path>',
search:'<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path>',
calendar:'<rect x="4" y="5" width="16" height="16" rx="2"></rect><path d="M4 10h16M8 3v4M16 3v4"></path>',
play:'<path d="M8 5l11 7-11 7z"></path>',
trophy:'<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8"></path>',
bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 0 0-4-10z"></path>',
flag:'<path d="M5 21V4M5 4h12l-2 4 2 4H5"></path>',
plus:'<path d="M12 5v14M5 12h14"></path>',
arrow:'<path d="M5 12h14M13 6l6 6-6 6"></path>',
door:'<path d="M6 21V4h9v17M3 21h18"></path><circle cx="12" cy="12.5" r="0.8" fill="currentColor"></circle>'
};
const icon=(n,s,c)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:${c}" aria-hidden="true">${IC[n]}</svg>`;
const HOOD='#3B3846',HOOD_D='#2B2834',DEN=okhex(.6,.075,255),DEN_D=okhex(.48,.075,255),STR='#F6F5FA';
const headL=(cx,cy,r)=>'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+LILA.base+'"></circle><ellipse cx="'+(cx-r*.44)+'" cy="'+(cy-r*.53)+'" rx="'+(r*.31)+'" ry="'+(r*.19)+'" transform="rotate(-28 '+(cx-r*.44)+' '+(cy-r*.53)+')" fill="'+LILA.hi+'" opacity="0.9"></ellipse>';
const stroke=(d,c,w)=>'<path d="'+d+'" stroke="'+c+'" stroke-width="'+w+'" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>';
const phones=(y)=>stroke('M36 '+y+' Q60 '+(y+24)+' 84 '+y,AC,3.5)+'<ellipse cx="36" cy="'+y+'" rx="5.5" ry="7.5" transform="rotate(-18 36 '+y+')" fill="'+AC+'"></ellipse><ellipse cx="84" cy="'+y+'" rx="5.5" ry="7.5" transform="rotate(18 84 '+y+')" fill="'+AC+'"></ellipse>';
const strings=stroke('M55 80 L54 95',STR,2)+stroke('M65 80 L66 95',STR,2)+'<circle cx="54" cy="96" r="1.9" fill="'+STR+'"></circle><circle cx="66" cy="96" r="1.9" fill="'+STR+'"></circle>';
const chill=(ink,e)=>e==='happy'?face('happy',ink):e==='down'?eye(48,52,4.2,4.6,ink)+eye(72,52,4.2,4.6,ink)+arc('M55 64 q5 3 10 0',2.6,ink):eye(48,46,4.4,3.4,ink)+eye(72,46,4.4,3.4,ink)+arc('M54 60 q6 4.5 12 0',2.8,ink);
const standBase='<ellipse cx="60" cy="156" rx="32" ry="4.5" fill="#000000" opacity="0.09"></ellipse><path d="M38 112 H82 L86 146 Q86 150 82 150 H64.5 L61.5 128 Q60 125 58.5 128 L55.5 150 H38 Q34 150 34 146 Z" fill="'+DEN+'"></path>'+stroke('M46 122 L44 144',DEN_D,1.6)+stroke('M74 122 L76 144',DEN_D,1.6)+stroke('M36 144 H55',DEN_D,2)+stroke('M65 144 H84',DEN_D,2)+'<rect x="31" y="146" width="27" height="10" rx="5" fill="#FFFFFF"></rect><rect x="62" y="146" width="27" height="10" rx="5" fill="#FFFFFF"></rect><rect x="31" y="153" width="27" height="3" rx="1.5" fill="#D9D6E3"></rect><rect x="62" y="153" width="27" height="3" rx="1.5" fill="#D9D6E3"></rect><path d="M32 86 Q32 70 60 70 Q88 70 88 86 L90 114 Q90 120 84 120 H36 Q30 120 30 114 Z" fill="'+HOOD+'"></path><rect x="31" y="112" width="58" height="8" rx="4" fill="'+HOOD_D+'"></rect>';
const pocket='<path d="M44 98 H76 Q80 98 81 103 L82 110 H38 L39 103 Q40 98 44 98 Z" fill="'+HOOD_D+'"></path>';
const collar='<ellipse cx="60" cy="74" rx="27" ry="8" fill="'+HOOD_D+'"></ellipse>';
const casualInner=(pose)=>{
 if(pose==='sentado')return '<ellipse cx="60" cy="156" rx="42" ry="5" fill="#000000" opacity="0.09"></ellipse><path d="M34 86 Q34 70 60 70 Q86 70 86 86 L88 124 H32 Z" fill="'+HOOD+'"></path>'+collar+'<path d="M22 140 Q22 126 40 126 H80 Q98 126 98 140 V146 Q98 152 92 152 H28 Q22 152 22 146 Z" fill="'+DEN+'"></path><rect x="27" y="112" width="30" height="38" rx="14" fill="'+DEN+'"></rect><rect x="63" y="112" width="30" height="38" rx="14" fill="'+DEN+'"></rect>'+stroke('M42 128 V146',DEN_D,1.6)+stroke('M78 128 V146',DEN_D,1.6)+'<rect x="25" y="145" width="34" height="11" rx="5.5" fill="#FFFFFF"></rect><rect x="61" y="145" width="34" height="11" rx="5.5" fill="#FFFFFF"></rect>'+stroke('M40 84 Q28 100 49 104',HOOD,15)+stroke('M80 84 Q92 100 71 104',HOOD,15)+'<rect x="50" y="86" width="20" height="30" rx="4" fill="#1F1E26"></rect><rect x="52.5" y="89" width="15" height="23" rx="2" fill="'+V[300]+'"></rect><circle cx="50" cy="104" r="6.5" fill="'+LILA.base+'"></circle><circle cx="70" cy="104" r="6.5" fill="'+LILA.base+'"></circle>'+headL(60,44,32)+chill(INK,'down')+phones(72);
 const wave=pose==='saludo';
 return standBase+stroke('M38 82 Q24 100 46 106',HOOD,15)+(wave?stroke('M82 82 Q100 76 101 52',HOOD,15)+'<circle cx="101" cy="45" r="7.5" fill="'+LILA.base+'"></circle>':stroke('M82 82 Q96 100 74 106',HOOD,15))+pocket+collar+strings+headL(60,44,32)+chill(INK,wave?'happy':'n')+phones(72)};
const casualSvg=(pose,w)=>'<svg viewBox="-14 -16 148 192" width="'+w+'" height="'+Math.round(w*192/148)+'" aria-hidden="true">'+casualInner(pose)+'</svg>';
const avatarCasual=(s,id,bg)=>'<svg viewBox="0 0 100 100" width="'+s+'" height="'+s+'" style="border-radius:50%; flex:none; display:block" aria-label="Avatar con hoodie"><defs><linearGradient id="cg'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C3AED"></stop><stop offset="1" stop-color="#6D28D9"></stop></linearGradient><radialGradient id="ch'+id+'" cx="36%" cy="28%" r="78%"><stop offset="0" stop-color="#EEE8FF"></stop><stop offset="0.5" stop-color="#CFC2FD"></stop><stop offset="1" stop-color="#B3A0F8"></stop></radialGradient></defs><rect width="100" height="100" fill="'+(bg||'url(#cg'+id+')')+'"></rect><path d="M14 100 V88 Q14 66 50 66 Q86 66 86 88 V100 Z" fill="'+HOOD+'"></path><path d="M27 71 Q50 86 73 71 Q72 63 50 62 Q28 63 27 71 Z" fill="'+HOOD_D+'"></path>'+stroke('M45 76 L44 90',STR,1.8)+stroke('M55 76 L56 90',STR,1.8)+'<circle cx="50" cy="40" r="27" fill="url(#ch'+id+')"></circle><ellipse cx="40" cy="26" rx="8.5" ry="5" transform="rotate(-28 40 26)" fill="#FFFFFF" opacity="0.4"></ellipse>'+eye(42,45,2.6,2.2,INK)+eye(58,45,2.6,2.2,INK)+arc('M47 53 q3 2.2 6 0',1.8,INK)+stroke('M27 66 Q50 84 73 66',AC,3)+'<ellipse cx="27" cy="64" rx="4.5" ry="6.5" transform="rotate(-18 27 64)" fill="'+AC+'"></ellipse><ellipse cx="73" cy="64" rx="4.5" ry="6.5" transform="rotate(18 73 64)" fill="'+AC+'"></ellipse></svg>';
return {V,AC,INK,MID,T,FD,FB,FM,okhex,SUBJ,LILA,face,gotaInner,gotaSvg,glyph,glyphS,svg,lockH,lockV,serious,appIcon,IC,icon,casualInner,casualSvg,avatarCasual,HOOD,HOOD_D,DEN,DEN_D};
}
module.exports = { LIB };
