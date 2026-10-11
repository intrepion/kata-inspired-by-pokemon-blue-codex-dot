import {species,starters,regions,moves,multiplier,tile,walkable} from './data';
export interface Companion {id:number;species:string;level:number;xp:number;hp:number;focus:number;drowsy:number;guard:boolean}
export interface Battle {kind:'wild'|'warden'|'rival';enemies:Companion[];enemy:number;active:number;turn:number;region:number;log:string[]}
export interface State {version:1;seed:number;nextId:number;region:number;x:number;y:number;party:Companion[];storage:Companion[];seen:string[];caught:string[];nets:number;potions:number;coins:number;sigils:number;rival:boolean;ended:boolean;steps:number;battle:Battle|null;message:string}
export type Command={type:'walk';dx:number;dy:number}|{type:'interact'}|{type:'encounter'}|{type:'challenge'}|{type:'rival'}|{type:'rest'}|{type:'buy';item:'net'|'potion'}|{type:'attack';move:number}|{type:'capture'}|{type:'potion'}|{type:'switch';index:number}|{type:'retreat'}|{type:'lead';index:number}|{type:'exchange';index:number;slot:number};
export const SANCTUARY_CAPACITY=1000;
export const maxHp=(c:Companion)=>28+c.level*7;
export const maxFocus=(c:Companion)=>10+c.level*2;
function makeCompanion(s:State,speciesId:string,level:number):Companion{const c={id:s.nextId++,species:speciesId,level,xp:0,hp:0,focus:0,drowsy:0,guard:false};c.hp=maxHp(c);c.focus=maxFocus(c);return c;}
export function newGame(starter:string,seed=20261011):State {
 if(!starters.includes(starter))throw Error('Unknown starter');
 const s:State={version:1,seed:seed>>>0,nextId:1,region:0,x:5,y:4,party:[],storage:[],seen:[starter],caught:[starter],nets:8,potions:4,coins:90,sigils:0,rival:false,ended:false,steps:0,battle:null,message:'Welcome to Dewhaven. Visit the Rootkeeper in the northeast. Grass shelters wild companions.'};
 s.party.push(makeCompanion(s,starter,2));return s;
}
function random(s:State):number{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function record(s:State,id:string){if(!s.seen.includes(id))s.seen.push(id);}
function startBattle(s:State,kind:Battle['kind']){
 const r=regions[s.region];
 const ids=kind==='wild'?[r.habitat[Math.floor(random(s)*r.habitat.length)]]:kind==='rival'?['pebblune']:r.team;
 const level=kind==='wild'?Math.max(2,r.level-1):kind==='rival'?2:r.level;
 s.battle={kind,enemies:ids.map(id=>makeCompanion(s,id,level)),enemy:0,active:s.party.findIndex(c=>c.hp>0),turn:0,region:s.region,log:[kind==='wild'?`A wild ${species[ids[0]].name} emerges!`:kind==='rival'?'Lio: “Let’s see how far we’ve come!”':r.story]};
 ids.forEach(id=>record(s,id));
}
function log(s:State,text:string){s.battle!.log=[...s.battle!.log,text].slice(-6);}
function damage(s:State,attacker:Companion,defender:Companion,move:number,enemy=false){
 const m=moves(attacker.species)[move];attacker.focus-=m.cost;
 if(m.guard){attacker.guard=true;log(s,`${species[attacker.species].name} shelters. Next hit is halved.`);return;}
 const effect=multiplier(m.type,species[defender.species].type);
 const amount=Math.max(1,Math.round((m.power+attacker.level*2)*effect*(attacker.drowsy>0?0.6:1)*(defender.guard?0.5:1)*(enemy?0.65:1)));
 defender.hp=Math.max(0,defender.hp-amount);defender.guard=false;
 if(attacker.drowsy>0)attacker.drowsy--;
 if(m.status&&defender.hp>0)defender.drowsy=2;
 log(s,`${species[attacker.species].name} · ${m.name} → ${amount}${effect>1?' · strong!':effect<1?' · resisted':''}${m.status?' · drowsy for 2 attacks':''}`);
}
function gainXp(s:State){
 for(const c of s.party){if(c.hp<=0)continue;c.xp+=20+s.battle!.enemies.reduce((sum,e)=>sum+e.level*8,0);
 while(c.level<20&&c.xp>=c.level*18){c.xp-=c.level*18;c.level++;c.hp=Math.min(maxHp(c),c.hp+12);c.focus=Math.min(maxFocus(c),c.focus+4);}
 }
}
function win(s:State){
 const b=s.battle!;gainXp(s);s.coins+=b.kind==='wild'?18:60;
 if(b.kind==='warden'){if(b.region===3){s.ended=true;s.message='The lantern lives again. Every companion’s light joins yours. The islands remember your kindness. Thank you for playing Tidebound!';}else{s.sigils=Math.max(s.sigils,b.region+1);s.message=`${regions[b.region].warden} grants a sigil. The eastern crossing is open. Rest, then follow the road.`;}}
 else if(b.kind==='rival'){s.rival=true;s.message='Lio: “You listen to your companions. I’ll meet you at the beacon. Take these nets.”';s.nets+=3;}
 else s.message='A good lesson. Your healthy companions gained experience and you found 18 shells.';
 s.battle=null;
}
function healParty(s:State){for(const c of s.party){c.hp=maxHp(c);c.focus=maxFocus(c);c.drowsy=0;c.guard=false;}}
function recover(s:State){s.battle=null;healParty(s);s.x=4;s.y=4;s.message='The campkeepers carried you home. All companions are rested. Your collection and sigils are safe.';}
function enemyTurn(s:State){
 const b=s.battle!;b.turn++;const player=s.party[b.active];const foe=b.enemies[b.enemy];
 const options=moves(foe.species).map((m,i)=>({m,i})).filter(({m})=>m.level<=foe.level&&m.cost<=foe.focus&&!m.guard&&!m.status);
 if(foe.hp<=0||player.hp<=0)return;
 const move=options[random(s)<0.55?options.length-1:0].i;
 damage(s,foe,player,move,true);
 if(!s.party.some(c=>c.hp>0)){recover(s);return;}
 if(player.hp<=0)log(s,`${species[player.species].name} needs rest. Choose a healthy companion; the forced switch is free.`);
}
function afterAttack(s:State){const b=s.battle!;if(b.enemies[b.enemy].hp===0){
 log(s,`${species[b.enemies[b.enemy].species].name} is resting.`);b.enemy++;
 if(b.enemy>=b.enemies.length){win(s);return;}
 log(s,`${species[b.enemies[b.enemy].species].name} steps forward.`);
 }enemyTurn(s);}
export function near(s:State,x:number,y:number){return Math.abs(s.x-x)+Math.abs(s.y-y)<=1;}
export function captureOdds(c:Companion){return Math.min(0.9,Math.max(0.25,0.25+(1-c.hp/maxHp(c))*0.65));}
export function act(state:State,command:Command):State{
 const s:State=structuredClone(state);const b=s.battle;
 if(b){
 const player=s.party[b.active];
 if(command.type==='switch'){
 const next=s.party[command.index];if(!next||next.hp<=0||command.index===b.active)return state;
 const forced=player.hp<=0;b.active=command.index;log(s,`${species[next.species].name} takes the lead.`);
 if(!forced)enemyTurn(s);return s;
 }
 if(command.type==='potion'){
 if(s.potions<=0||player.hp<=0||player.hp===maxHp(player))return state;
 s.potions--;player.hp=Math.min(maxHp(player),player.hp+35);log(s,'A tonic restores 35 health.');enemyTurn(s);return s;
 }
 if(command.type==='retreat'){
 if(player.hp<=0)return state;
 s.battle=null;s.x=5;s.y=4;s.message='You return to the camp trail. Challenges wait until you are ready.';return s;
 }
 if(command.type==='capture'){
 if(b.kind!=='wild'||s.nets<=0||player.hp<=0)return state;
 if(s.party.length===3&&s.storage.length>=SANCTUARY_CAPACITY){s.message='The sanctuary is full (1,000 companions). Your net was not spent.';log(s,s.message);return s;}
 s.nets--;const foe=b.enemies[b.enemy];
 if(random(s)<captureOdds(foe)){
 foe.drowsy=0;foe.guard=false;(s.party.length<3?s.party:s.storage).push(foe);
 if(!s.caught.includes(foe.species))s.caught.push(foe.species);
 s.message=`${species[foe.species].name} trusts you! ${s.party.length===3&&s.storage.includes(foe)?'It is safe in the sanctuary.':'It joined your party.'}`;s.battle=null;
 }else{log(s,'The net opens. Try again after weakening your new friend.');enemyTurn(s);}return s;
 }
 if(command.type==='attack'){
 const m=moves(player.species)[command.move];
 if(!m||player.hp<=0||m.level>player.level||m.cost>player.focus)return state;
 damage(s,player,b.enemies[b.enemy],command.move);afterAttack(s);return s;
 }
 return state;
 }
 if(command.type==='walk'){
 if(!Number.isInteger(command.dx)||!Number.isInteger(command.dy)||Math.abs(command.dx)+Math.abs(command.dy)!==1)return state;
 const x=s.x+command.dx,y=s.y+command.dy,t=tile(x,y);
 if(t==='>'){
 if(s.region===3){s.message='The beacon stands at the end of the world. Find the lantern trial.';return s;}
 if(s.sigils<=s.region){s.message='The crossing needs this island’s sigil. Visit the warden to the northeast.';return s;}
 s.region++;s.x=2;s.y=10;s.message=`Welcome to ${regions[s.region].name}. ${regions[s.region].lesson}`;return s;
 }
 if(t==='<'){
 if(s.region>0){s.region--;s.x=16;s.y=3;s.message=`Back in ${regions[s.region].name}.`;return s;}return state;
 }
 if(!walkable(x,y))return state;s.x=x;s.y=y;s.steps++;
 if(t==='g'&&random(s)<0.22)startBattle(s,'wild');return s;
 }
 if(command.type==='interact'){
 if(near(s,3,4))return act(s,{type:'rest'});
 if(near(s,13,3))return act(s,{type:'challenge'});
 if(near(s,3,8)&&s.region===0)return act(s,{type:'rival'});
 s.message=near(s,3,6)?'The trader offers nets for 15 shells and tonics for 20. Open Camp to shop.':'Walk into tall grass to meet companions. The camp is west; the warden is northeast.';return s;
 }
 if(command.type==='rest'){
 if(!near(s,3,4))return state;healParty(s);s.nets=Math.max(3,s.nets);s.potions=Math.max(2,s.potions);s.message='Rested at camp. Health and Focus restored. Emergency supplies topped up: 3 nets and 2 tonics.';return s;
 }
 if(command.type==='buy'){
 if(!near(s,3,6)||!['net','potion'].includes(command.item))return state;
 const price=command.item==='net'?15:20;if(s.coins<price)return state;s.coins-=price;
 if(command.item==='net')s.nets++;else s.potions++;s.message='Supplies packed. Safe travels!';return s;
 }
 if(command.type==='lead'){
 const next=s.party[command.index];if(!next||next.hp<=0||command.index===0)return state;
 [s.party[0],s.party[command.index]]=[next,s.party[0]];s.message=`${species[next.species].name} leads the party.`;return s;
 }
 if(command.type==='exchange'){
 if(!near(s,3,4))return state;const stored=s.storage[command.index],member=s.party[command.slot];if(!stored||!member)return state;
 s.storage[command.index]=member;s.party[command.slot]=stored;healParty(s);s.message='The sanctuary keeper rearranged and rested your party.';return s;
 }
 if(command.type==='challenge'){
 if(!near(s,13,3)||s.sigils<s.region||s.ended||s.region<3&&s.sigils>s.region)return state;
 startBattle(s,'warden');return s;
 }
 if(command.type==='rival'){
 if(s.region!==0||!near(s,3,8)||s.rival)return state;startBattle(s,'rival');return s;
 }
 if(command.type==='encounter'){startBattle(s,'wild');return s;}
 return state;
}
export const encodeSave=(s:State)=>JSON.stringify(s);
function object(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function integer(n:unknown,min:number,max:number):n is number{return typeof n==='number'&&Number.isInteger(n)&&n>=min&&n<=max;}
function validCompanion(value:unknown):value is Companion{
 if(!object(value)||typeof value.species!=='string'||!Object.hasOwn(species,value.species))return false;
 return integer(value.id,1,1000000000)&&integer(value.level,1,20)&&integer(value.xp,0,1000000)&&integer(value.hp,0,28+Number(value.level)*7)&&integer(value.focus,0,10+Number(value.level)*2)&&integer(value.drowsy,0,2)&&typeof value.guard==='boolean';
}
function validList(value:unknown):value is string[]{return Array.isArray(value)&&value.length<=10&&value.every(id=>typeof id==='string'&&Object.hasOwn(species,id))&&new Set(value).size===value.length;}
export function decodeSave(raw:string|null):State|null{
 try{
 if(!raw||raw.length>2000000)return null;const v:unknown=JSON.parse(raw);
 if(!object(v)||v.version!==1||!integer(v.seed,0,4294967295)||!integer(v.nextId,1,1000000000)||!integer(v.region,0,3)||!integer(v.x,1,17)||!integer(v.y,1,11)||!walkable(v.x,v.y))return null;
 if(!Array.isArray(v.party)||v.party.length<1||v.party.length>3||!v.party.every(validCompanion)||!v.party.some(c=>c.hp>0)||!Array.isArray(v.storage)||v.storage.length>SANCTUARY_CAPACITY||!v.storage.every(validCompanion))return null;
 if(!validList(v.seen)||!validList(v.caught)||typeof v.rival!=='boolean'||typeof v.ended!=='boolean'||typeof v.message!=='string'||v.message.length>2000||!integer(v.sigils,0,3)||v.region>v.sigils||v.ended&&v.sigils!==3)return null;
 for(const key of ['nets','potions','coins','steps'])if(!integer(v[key],0,1000000000))return null;
 const seen=v.seen;const companions=[...v.party,...v.storage];const owned=new Set(companions.map(c=>c.species));
 if(v.caught.length!==owned.size||!v.caught.every(id=>owned.has(id)&&seen.includes(id)))return null;
 const all=[...companions];
 if(v.battle!==null){
 const b=v.battle;if(!object(b)||typeof b.kind!=='string'||!['wild','warden','rival'].includes(b.kind)||!Array.isArray(b.enemies)||!b.enemies.length||b.enemies.length>3||!b.enemies.every(validCompanion)||!integer(b.enemy,0,b.enemies.length-1)||!integer(b.active,0,v.party.length-1)||!integer(b.turn,0,1000000000)||b.region!==v.region||!Array.isArray(b.log)||b.log.length>6||!b.log.every(l=>typeof l==='string'&&l.length<=2000))return null;
 if(b.enemies.slice(b.enemy).some(c=>c.hp===0)||b.enemies.slice(0,b.enemy).some(c=>c.hp!==0)||b.enemies.some(c=>!seen.includes(c.species)))return null;
 if(b.kind==='wild'&&b.enemies.length!==1||b.kind==='rival'&&(v.rival||v.region!==0)||b.kind==='warden'&&(v.ended||v.region<3&&v.sigils>v.region))return null;
 all.push(...b.enemies);
 }
 if(new Set(all.map(c=>c.id)).size!==all.length||all.some(c=>c.id>=Number(v.nextId)))return null;
 return v as unknown as State;
 }catch{return null;}
}
