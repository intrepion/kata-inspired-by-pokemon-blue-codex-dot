export type Element='leaf'|'tide'|'ember'|'neutral';
export interface Species {name:string;type:Element;color:string;accent:string;shape:'bud'|'fin'|'fox'|'moth'|'crab'|'owl'|'snail'|'ram'|'ray'|'dragon'; lore:string;}
export const species:Record<string,Species>={
 spriglet:{name:'Spriglet',type:'leaf',color:'#a5d36d',accent:'#527850',shape:'bud',lore:'It carries a tiny garden on its back. New leaves point toward home.'},
 puddlepip:{name:'Puddlepip',type:'tide',color:'#7bcddd',accent:'#386f9b',shape:'fin',lore:'A shy tidepool swimmer that sings into empty shells.'},
 cindervix:{name:'Cindervix',type:'ember',color:'#efa56d',accent:'#ad554b',shape:'fox',lore:'Its ears glow like warm coals. It guides lost travelers through fog.'},
 mossmoth:{name:'Mossmoth',type:'leaf',color:'#b5c879',accent:'#768c59',shape:'moth',lore:'Each wing is a miniature meadow, dusted with soft golden pollen.'},
 brineclaw:{name:'Brineclaw',type:'tide',color:'#74b2c8',accent:'#457381',shape:'crab',lore:'This patient collector builds towers from sea glass.'},
 ashowl:{name:'Ashowl',type:'ember',color:'#d89a87',accent:'#7e566c',shape:'owl',lore:'It shelters sparks under its wings until sunrise.'},
 pebblune:{name:'Pebblune',type:'neutral',color:'#bdadc9',accent:'#776e92',shape:'snail',lore:'Its moonstone shell remembers the sound of every shore.'},
 fernram:{name:'Fernram',type:'leaf',color:'#92b693',accent:'#476a63',shape:'ram',lore:'Old forests grow wherever its curled antlers touch the ground.'},
 glimmeray:{name:'Glimmeray',type:'tide',color:'#90cdd4',accent:'#547dba',shape:'ray',lore:'A living ribbon of light beneath the water. Sailors follow its glow.'},
 solwyrm:{name:'Solwyrm',type:'ember',color:'#efc577',accent:'#b46e69',shape:'dragon',lore:'Once thought to be a fallen star, it warms the lantern at the world’s edge.'}
};
export const starters=['spriglet','puddlepip','cindervix'];
export const regions=[
 {name:'Dewhaven',subtitle:'A small beginning, a wide horizon',terrain:'meadow',warden:'Iona • The Rootkeeper',team:['mossmoth'],level:3,habitat:['mossmoth','pebblune','spriglet'],story:'Iona: “Strength is knowing when to bend. Bring a spark, or bring patience.”',lesson:'Ember warms Leaf • Leaf drinks Tide • Tide cools Ember'},
 {name:'Glasswater',subtitle:'Where the shore keeps its secrets',terrain:'shore',warden:'Marin • The Tidekeeper',team:['brineclaw','puddlepip'],level:5,habitat:['brineclaw','puddlepip','glimmeray'],story:'Marin: “The tide changes. So should your party. Let the leaves show you a way.”',lesson:'Leaf is strong against Tide. A second companion gives you options.'},
 {name:'Cinderfell',subtitle:'An old forge beneath a violet sky',terrain:'ridge',warden:'Orren • The Hearthkeeper',team:['ashowl','cindervix'],level:7,habitat:['ashowl','cindervix','fernram'],story:'Orren: “A bright flame needs a steady shore. Show me the balance you have learned.”',lesson:'Tide is strong against Ember. Rest at camp before the challenge.'},
 {name:'Starfall Beacon',subtitle:'Every small light belongs to the sky',terrain:'stars',warden:'The Lantern Trial',team:['fernram','glimmeray','solwyrm'],level:9,habitat:['fernram','glimmeray','solwyrm'],story:'The beacon is dark. The three sigils hum in your pocket. Your companions step forward together.',lesson:'The trial holds all three elements. Switch, heal, and save Focus for your strongest moves.'}
];
export interface Move {name:string;type:Element;power:number;cost:number;level:number;status?:boolean;guard?:boolean}
export function moves(id:string):Move[]{return [
 {name:'Nudge',type:'neutral',power:6,cost:0,level:1},
 {name:{leaf:'Briar flick',tide:'Ripple jet',ember:'Cinder dash',neutral:'Moon pulse'}[species[id].type],type:species[id].type,power:10,cost:2,level:1},
 {name:'Shelter',type:'neutral',power:0,cost:1,level:2,guard:true},
 {name:'Lullaby',type:'neutral',power:5,cost:3,level:4,status:true},
 {name:'Wild surge',type:species[id].type,power:18,cost:4,level:6}
 ];}
export function multiplier(attack:Element,defense:Element):number{
 if(attack==='neutral'||defense==='neutral'||attack===defense)return 1;
 return ({leaf:'tide',tide:'ember',ember:'leaf'} as Record<string,string>)[attack]===defense?1.6:0.65;
}
// Hand-authored island, shared road geometry with region-specific illustration.
export const map=[
 '~~~~~~~~~~~~~~~~~~~',
 '~ttt...ttt...tttttt~',
 '~tt....ggg....ttttt~',
 '~......ggg....W...>~',
 '~..H...ggg........~',
 '~.....===.....tt..~',
 '~..S..===..ggg....~',
 '~.....===..ggg..t.~',
 '~..R......ggg..t..~',
 '~.........ggg.....~',
 '~<...........ttttt~',
 '~ttt....ttt...tttt~',
 '~~~~~~~~~~~~~~~~~~~'
].map(row=>row.padEnd(19,'~'));
export function tile(x:number,y:number):string{return map[y]?.[x]??'~';}
export function walkable(x:number,y:number){return !['~','t'].includes(tile(x,y));}
