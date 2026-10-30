(function(root){
'use strict';
const suits=['♠','♥','♣','♦'];
const points=c=>c.rank===7?14:c.rank;
const score=cards=>cards.reduce((n,c)=>n+points(c),0);
const label=c=>`${suits[c.suit]}${({1:'A',11:'J',12:'Q',13:'K'})[c.rank]||c.rank}`;
function ordered(cards){
 if(!cards.length||!cards.every(c=>c.suit===cards[0].suit))return null;
 for(const first of cards){let seq=[];for(let i=0;i<cards.length;i++){const c=cards.find(c=>c.rank===(first.rank-1+i)%13+1);if(!c)break;seq.push(c);}if(seq.length===cards.length)return seq;}
 return null;
}
function kind(cards){if(new Set(cards.map(c=>c.id)).size!==cards.length)return null;if(cards.length===1&&cards[0].rank===7)return 'run';if(cards.length<3)return null;if(cards.length<=4&&cards.every(c=>c.rank===cards[0].rank))return 'set';return ordered(cards)?'run':null;}
function canAttach(m,c){if(m.cards.some(x=>x.id===c.id))return false;return m.kind==='set'?m.cards.length<4&&c.rank===m.cards[0].rank:!!ordered([...m.cards,c]);}
function combos(hand,required){let found=[];for(let mask=1;mask<1<<hand.length;mask++){const cards=hand.filter((_,i)=>mask&(1<<i));if(required&&(!cards.some(c=>c.id===required.id)||cards.length!==3))continue;const k=kind(cards);if(k)found.push({cards,kind:k});}return found.sort((a,b)=>score(b.cards)-score(a.cards));}
class Game{
 constructor(random=Math.random,starter=0){this.players=['나','서준','지우','하린'].map(name=>({name,hand:[],registered:false}));this.stock=suits.flatMap((_,suit)=>Array.from({length:13},(_,i)=>({id:suit*13+i,rank:i+1,suit})));for(let i=51;i>0;i--){const j=Math.floor(random()*(i+1));[this.stock[i],this.stock[j]]=[this.stock[j],this.stock[i]];}for(let i=0;i<7;i++)for(const p of this.players)p.hand.push(this.stock.pop());this.discards=[this.stock.pop()];this.melds=[];this.turn=starter;this.phase='draw';this.log=['새 라운드 · 7장씩 카드를 나눴습니다.'];this.result=null;this.sort();}
 get player(){return this.players[this.turn];}
 sort(){for(const p of this.players)p.hand.sort((a,b)=>a.suit-b.suit||a.rank-b.rank);}
 note(t){this.log.unshift(t);this.log=this.log.slice(0,30);}
 check(){if(!this.player.hand.length){this.end([this.turn],'모든 카드를 내려놓았습니다');return true;}return false;}
 end(winners,reason){this.result={winners,reason,scores:this.players.map(p=>score(p.hand))};this.phase='ended';this.note(reason);}
 low(reason,knocker=-1){const scores=this.players.map(p=>score(p.hand));let min=Math.min(...scores);let winners=scores.flatMap((s,i)=>s===min?[i]:[]);if(knocker>=0&&winners.some(i=>i!==knocker))winners=winners.filter(i=>i!==knocker);this.end(winners,reason+(knocker>=0&&!winners.includes(knocker)?' · 스톱 실패':''));}
 draw(){if(this.phase!=='draw'||!this.stock.length)return false;this.player.hand.push(this.stock.pop());this.phase='play';this.note(`${this.player.name} · 카드 1장 받기`);this.sort();return true;}
 thanksOptions(){const c=this.discards.at(-1);return this.phase==='draw'&&c?combos([...this.player.hand,c],c):[];}
 thanks(ids){const option=this.thanksOptions().find(m=>m.cards.every(c=>ids.includes(c.id))&&ids.length===m.cards.length);if(!option)return false;this.player.hand.push(this.discards.pop());this.phase='play';this.note(`${this.player.name} · 땡큐!`);return this.meld(option.cards.map(c=>c.id));}
 meld(ids){if(this.phase!=='play')return false;const cards=this.player.hand.filter(c=>ids.includes(c.id));const k=kind(cards);if(!k||cards.length!==ids.length)return false;this.player.hand=this.player.hand.filter(c=>!ids.includes(c.id));this.player.registered=true;this.melds.push({kind:k,cards:k==='run'?ordered(cards):cards,owner:this.turn});this.note(`${this.player.name} · ${cards.map(label).join(' ')} 등록`);this.check();return true;}
 attach(id,index){if(this.phase!=='play'||!this.player.registered)return false;const c=this.player.hand.find(c=>c.id===id),m=this.melds[index];if(!c||!m||!canAttach(m,c))return false;m.cards.push(c);if(m.kind==='run')m.cards=ordered(m.cards);this.player.hand=this.player.hand.filter(x=>x.id!==id);this.note(`${this.player.name} · ${label(c)} 붙이기`);this.check();return true;}
 discard(id){if(this.phase!=='play')return false;const c=this.player.hand.find(c=>c.id===id);if(!c)return false;this.player.hand=this.player.hand.filter(x=>x.id!==id);this.discards.push(c);this.note(`${this.player.name} · ${label(c)} 버리기`);if(this.check())return true;if(!this.stock.length){this.low('더미 소진 · 남은 점수 비교');return true;}this.turn=(this.turn+1)%4;this.phase='draw';return true;}
 stop(){if(this.phase!=='draw'||score(this.player.hand)>10)return false;this.low(`${this.player.name}의 스톱`,this.turn);return true;}
 special(){const h=this.player.hand;const sum=h.reduce((s,c)=>s+c.rank,0);if(h.filter(c=>c.rank===7).length===4)return '행운의 7';if(this.phase==='draw'&&!this.player.registered&&h.length===7&&(sum<=15||sum>=83))return sum<=15?'소팡':'대팡';return null;}
 claim(){const reason=this.special();if(this.phase==='ended'||!reason)return false;this.end([this.turn],reason);return true;}
 aiStep(){
  if(this.phase==='ended')return false;
  if(this.special())return this.claim();
  if(this.phase==='draw'){
   if(score(this.player.hand)<=5)return this.stop();
   const option=this.thanksOptions()[0];
   return option?this.thanks(option.cards.map(c=>c.id)):this.draw();
  }
  const meld=combos(this.player.hand)[0];
  if(meld)return this.meld(meld.cards.map(c=>c.id));
  if(this.player.registered)for(const c of this.player.hand)for(let i=0;i<this.melds.length;i++)if(canAttach(this.melds[i],c))return this.attach(c.id,i);
  const utility=c=>points(c)-this.player.hand.filter(x=>x.id!==c.id&&(x.rank===c.rank||(x.suit===c.suit&&[1,12].includes(Math.abs(x.rank-c.rank))))).length*4;
  return this.discard([...this.player.hand].sort((a,b)=>utility(b)-utility(a))[0].id);
 }
 ai(){const turn=this.turn;while(this.phase!=='ended'&&this.turn===turn){if(!this.aiStep())break;}}

}
const api={Game,kind,ordered,canAttach,combos,score,label,suits};if(typeof module!=='undefined')module.exports=api;else root.Hoola=api;
})(typeof window!=='undefined'?window:globalThis);
