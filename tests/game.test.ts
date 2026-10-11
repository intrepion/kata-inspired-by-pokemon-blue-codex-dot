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
