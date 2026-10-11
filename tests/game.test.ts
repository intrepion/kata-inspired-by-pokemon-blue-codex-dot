import {map} from '../src/data';
import {describe,it,expect} from 'vitest';
import {newGame,act,encodeSave,decodeSave,type State} from '../src/game';
describe('expedition commands',()=>{
 it('starts a seeded expedition with one healthy starter and supplies',()=>{
  const s=newGame('spriglet',42); expect(s.party[0].species).toBe('spriglet'); expect(s.nets).toBe(8); expect(s.region).toBe(0);
 });
});
it('an attack costs focus and advances exactly one enemy response; invalid moves do nothing',()=>{
 let s=newGame('cindervix',1); s=act(s,{type:'encounter'}); const before=s.party[0].focus;
 s=act(s,{type:'attack',move:1}); expect(s.party[0].focus).toBe(before-2); expect(s.battle?.turn).toBe(1);
 const same=act(s,{type:'attack',move:99}); expect(same).toEqual(s);
});
it('capture consumes one net, bounds odds and preserves a fourth companion in sanctuary',()=>{
 let s=newGame('spriglet',7);for(let i=0;i<3;i++){
 s=act(s,{type:'encounter'});s.battle!.enemies[0].hp=1;s.seed=1;const n=s.nets;
 s=act(s,{type:'capture'});expect(s.nets).toBe(n-1);expect(s.battle).toBeNull();
 }expect(s.party).toHaveLength(3);expect(s.storage).toHaveLength(1);expect(s.caught).toContain(s.storage[0].species);
});
it('free forced switches, voluntary turns, potion costs and total defeat recover safely',()=>{
 let s=newGame('spriglet',1);s=act(s,{type:'encounter'});s.battle!.enemies[0].hp=1;s=act(s,{type:'capture'});s=act(s,{type:'encounter'});
 const turn=s.battle!.turn;s=act(s,{type:'switch',index:1});expect(s.battle!.turn).toBe(turn+1);
 s.party[1].hp=0;const forced=s.battle!.turn;s=act(s,{type:'switch',index:0});expect(s.battle!.turn).toBe(forced);
 s.party[0].hp=1;s=act(s,{type:'potion'});expect(s.potions).toBe(3);expect(s.party[0].hp).toBeGreaterThan(1);
 s.party.forEach(c=>c.hp=1);s.party[1].hp=0;s=act(s,{type:'attack',move:0});expect(s.battle).toBeNull();expect(s.party[0].hp).toBeGreaterThan(1);expect(s.x).toBe(4);
});
it('camp transactions are atomic; gates require sigils and rest replenishes emergency supplies',()=>{
 let s=newGame('spriglet',1);s.x=3;s.y=6;
 s=act(s,{type:'buy',item:'net'});expect(s.coins).toBe(75);expect(s.nets).toBe(9);
 s.coins=0;expect(act(s,{type:'buy',item:'potion'})).toEqual(s);
 s.x=16;s.y=3;s=act(s,{type:'walk',dx:1,dy:0});expect(s.region).toBe(0);
 s.sigils=1;s=act(s,{type:'walk',dx:1,dy:0});expect(s.region).toBe(1);
 s.x=3;s.y=4;s.nets=0;s.potions=0;s=act(s,{type:'rest'});expect(s.nets).toBe(3);expect(s.potions).toBe(2);
});
it('battle saves resume deterministically; corrupt and inconsistent collections are rejected',()=>{
 const s=act(newGame('puddlepip',9),{type:'encounter'});
 const restored=decodeSave(encodeSave(s));expect(restored).toEqual(s);
 expect(act(restored!,{type:'attack',move:1})).toEqual(act(s,{type:'attack',move:1}));
 expect(decodeSave('{')).toBeNull();expect(decodeSave('{"version":99}')).toBeNull();
 const bad=structuredClone(s);bad.caught=[];expect(decodeSave(encodeSave(bad))).toBeNull();
});
it.each(['spriglet','puddlepip','cindervix'])('the full campaign is winnable from %s without paid resources',starter=>{
 let s=newGame(starter,12);
 for(let region=0;region<4;region++){
 s.region=region;s.x=3;s.y=4;s=act(s,{type:'rest'});
 // Train through real battle commands, using the default move and camp rest.
 for(let i=0;i<12;i++){
 s=act(s,{type:'encounter'});for(let turn=0;s.battle&&turn<100;turn++)s=act(s,{type:'attack',move:s.party[0].focus>=2?1:0});
 s.x=3;s.y=4;s=act(s,{type:'rest'});
 }
 s.x=13;s.y=3;s=act(s,{type:'challenge'});expect(s.battle?.kind).toBe('warden');
 for(let turn=0;s.battle&&turn<100;turn++)s=act(s,{type:'attack',move:s.party[0].focus>=4&&s.party[0].level>=6?4:s.party[0].focus>=2?1:0});
 expect(s.battle).toBeNull();expect(s.sigils).toBe(Math.min(region+1,3));
 }expect(s.ended).toBe(true);
 const coins=s.coins;expect(act(s,{type:'challenge'}).coins).toBe(coins);
});
it('status lasts two attacks and shelter halves exactly one incoming hit',()=>{
 let s=newGame('spriglet',1);s.party[0].level=4;s.party[0].hp=56;s.party[0].focus=18;s=act(s,{type:'encounter'});
 s=act(s,{type:'attack',move:3});expect(s.battle!.enemies[0].drowsy).toBe(1);
 s=act(s,{type:'attack',move:2});expect(s.battle!.enemies[0].drowsy).toBe(0);expect(s.party[0].guard).toBe(false);
});
it('elemental strengths change damage, and zero focus still permits a free move',()=>{
 const start=newGame('cindervix',1);const leaf=act(start,{type:'encounter'});leaf.battle!.enemies[0].species='spriglet';
 const tide=structuredClone(leaf);tide.battle!.enemies[0].species='puddlepip';
 const strong=act(leaf,{type:'attack',move:1}),weak=act(tide,{type:'attack',move:1});
 expect(strong.battle!.enemies[0].hp).toBe(20);expect(weak.battle!.enemies[0].hp).toBe(33);
 leaf.party[0].focus=0;expect(act(leaf,{type:'attack',move:1})).toEqual(leaf);expect(act(leaf,{type:'attack',move:0}).battle!.turn).toBe(1);
});
it('invalid saves never crash and duplicates, illegal HP, positions and battle indices are rejected',()=>{
 const s=act(newGame('spriglet'),{type:'encounter'});
 for(const mutate of [(x:State)=>x.party[0].hp=999,(x:State)=>x.x=0,(x:State)=>x.battle!.enemy=99,(x:State)=>x.storage.push({...x.party[0]}),(x:State)=>x.seed=-1]){
 const invalid=structuredClone(s);mutate(invalid);expect(decodeSave(encodeSave(invalid))).toBeNull();}
 for(const raw of ['null','[]','{}','42','"hello"'])expect(decodeSave(raw)).toBeNull();
});
it('failed capture spends one item and one turn; fainted actors and trainer captures cannot act',()=>{
 let s=act(newGame('spriglet',123456),{type:'encounter'});s.seed=1000;const n=s.nets;
 s=act(s,{type:'capture'});expect(s.nets).toBe(n-1);expect(s.battle!.turn).toBe(1);
 s.party[0].hp=0;expect(act(s,{type:'attack',move:0})).toEqual(s);expect(act(s,{type:'capture'})).toEqual(s);
 let w=newGame('spriglet');w.x=13;w.y=3;w=act(w,{type:'challenge'});expect(act(w,{type:'capture'})).toEqual(w);
});
it('rejects corrupt future enemies and non-string battle kinds',()=>{
 let s=newGame('puddlepip');s.region=1;s.sigils=1;s.x=13;s.y=3;s=act(s,{type:'challenge'});
 s.battle!.enemies[1].hp=0;expect(decodeSave(encodeSave(s))).toBeNull();
 const invalid=act(newGame('spriglet'),{type:'encounter'});(invalid.battle as unknown as {kind:unknown}).kind=['wild'];expect(decodeSave(encodeSave(invalid))).toBeNull();
});
it('drowsy reduces exactly two attacks and shelter halves only the next hit',()=>{
 let base=act(newGame('spriglet',1),{type:'encounter'});base.party[0].level=4;base.party[0].hp=56;base.party[0].focus=18;
 base.battle!.enemies[0].species='pebblune';base.battle!.enemies[0].level=5;base.battle!.enemies[0].hp=63;base.battle!.enemies[0].focus=20;base.seed=1;
 const normal=act(base,{type:'attack',move:0});expect(normal.party[0].hp).toBe(43);
 let protectedState=act(base,{type:'attack',move:2});expect(protectedState.party[0].hp).toBe(49);protectedState.seed=1;
 protectedState=act(protectedState,{type:'attack',move:0});expect(protectedState.party[0].hp).toBe(36);
 let drowsy=act(base,{type:'attack',move:3});expect(drowsy.party[0].hp).toBe(48);drowsy.seed=1;
 drowsy=act(drowsy,{type:'attack',move:0});expect(drowsy.party[0].hp).toBe(40);drowsy.seed=1;
 drowsy=act(drowsy,{type:'attack',move:0});expect(drowsy.party[0].hp).toBe(27);
});
it('full sanctuary blocks capture without item loss or a turn, and its maximum valid save round trips',()=>{
 let s=newGame('spriglet');s.party.push({...s.party[0],id:s.nextId++},{...s.party[0],id:s.nextId++});
 for(let i=0;i<1000;i++)s.storage.push({...s.party[0],id:s.nextId++});
 s=act(s,{type:'encounter'});const after=act(s,{type:'capture'});expect(after.nets).toBe(8);expect(after.battle!.turn).toBe(0);expect(after.storage).toHaveLength(1000);expect(decodeSave(encodeSave(after))).toEqual(after);
});
function fight(s:State):State{for(let turn=0;s.battle&&turn<100;turn++){const active=s.party[s.battle.active];s=act(s,{type:'attack',move:active.level>=6&&active.focus>=4?4:active.focus>=2?1:0});}return s;}
function walk(s:State,dx:number,dy:number,count:number){for(let i=0;i<count;i++){s=act(s,{type:'walk',dx,dy});if(s.battle)s=fight(s);}return s;}
function toCamp(s:State){s=walk(s,0,s.y>5?-1:1,Math.abs(s.y-5));s=walk(s,s.x>3?-1:1,0,Math.abs(s.x-3));s=walk(s,0,-1,1);return act(s,{type:'rest'});}
it.each(['spriglet','puddlepip','cindervix'])('command-driven crossings and campaign saves complete from %s',starter=>{
 let s=newGame(starter,42);
 for(let r=0;r<4;r++){
 expect(s.region).toBe(r);s=toCamp(s);
 for(let training=0;training<12;training++){s=fight(act(s,{type:'encounter'}));s=toCamp(s);}
 // Safe road from camp, no coordinate or sigil assignments.
 s=walk(s,0,1,1);s=walk(s,1,0,10);s=walk(s,0,-1,2);expect([s.x,s.y]).toEqual([13,3]);
 s=fight(act(s,{type:'challenge'}));expect(s.sigils).toBe(Math.min(3,r+1));expect(decodeSave(encodeSave(s))).toEqual(s);
 if(r<3){s=walk(s,1,0,4);expect(s.region).toBe(r+1);expect([s.x,s.y]).toEqual([2,10]);}
 }expect(s.ended).toBe(true);
});
it('all map rows share visible geometry and gate positions',()=>{
 expect(map).toHaveLength(13);for(const row of map)expect(row.length).toBe(19);
 expect(map[3][17]).toBe('>');expect(map[3][13]).toBe('W');expect(map[10][1]).toBe('<');
});
it('battle ignores movement, healing, purchases and exploration commands; inspection has no command',()=>{
 const s=act(newGame('spriglet'),{type:'encounter'});
 for(const c of [{type:'walk',dx:1,dy:0},{type:'rest'},{type:'buy',item:'net'},{type:'lead',index:0},{type:'challenge'},{type:'encounter'}] as const)expect(act(s,c)).toEqual(s);
});
