'use strict';
const {Game,score,label,kind,combos,canAttach}=Hoola;
const $=id=>document.getElementById(id);
let game,selected=new Set(),timer,round=0,record={played:0,wins:0},recorded=false,sortByRank=false,busy=false,epoch=0;
const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
const activeFlights=new Set();
try{const saved=JSON.parse(localStorage.getItem('hoola-record'));if(saved&&Number.isInteger(saved.played)&&Number.isInteger(saved.wins))record=saved;}catch{}
function cardHTML(c){return `<span>${label(c).slice(1)}</span><span class="suit">${Hoola.suits[c.suit]}</span><span class="bottom">${label(c)}</span>`;}
function tile(c){return `<span data-tile="${c.id}" class="tile ${c.suit%2?'red':''}">${label(c)}</span>`;}
function say(message){$('status').textContent=message;}
function start(starter=0){epoch++;busy=false;for(const flight of activeFlights)flight.cancel();activeFlights.clear();clearTimeout(timer);document.querySelectorAll('dialog[open]').forEach(d=>d.close());game=new Game(Math.random,starter);selected.clear();recorded=false;round++;render();schedule();}
function schedule(){clearTimeout(timer);if(!busy&&game.phase!=='ended'&&game.turn!==0)timer=setTimeout(()=>transition(()=>game.aiStep()),650);}
function render(){const mine=!busy&&game.turn===0&&game.phase!=='ended',play=mine&&game.phase==='play',draw=mine&&game.phase==='draw';const hand=game.players[0].hand;selected=new Set([...selected].filter(id=>hand.some(c=>c.id===id)));const cards=hand.filter(c=>selected.has(c.id));$('record').textContent=`ROUND ${String(round).padStart(2,'0')} · ${record.wins}승 / ${record.played}판`;
$('opponents').innerHTML=[1,2,3].map(i=>{const p=game.players[i];return `<div data-player="${i}" class="opponent ${game.turn===i&&game.phase!=='ended'?'active':''}"><div class="player-name"><span class="avatar">${['','S','J','H'][i]}</span>${p.name}${game.turn===i&&game.phase!=='ended'?' · 차례':''}</div><small>COMPUTER · ${p.hand.length}장 · ${p.registered?'등록':'미등록'}</small><div class="mini-hand">${p.hand.map(c=>`<span data-back="${c.id}" class="mini-back"></span>`).join('')}</div></div>`;}).join('');
$('stock').textContent=game.stock.length;const top=game.discards.at(-1);$('discard-pile').innerHTML=top?cardHTML(top):'';$('discard-pile').className=`card ${top?.suit%2?'red':''}`;$('discard-pile').disabled=!draw||!game.thanksOptions().length;$('draw').disabled=!draw;$('turn-label').textContent=game.phase==='ended'?'라운드 종료':mine?'● 당신의 차례':`${game.player.name} 님이 생각하고 있어요`;
$('meld-count').textContent=game.melds.length;$('melds').innerHTML=game.melds.length?game.melds.map((m,i)=>`<button class="meld-group" data-meld="${i}" aria-label="${game.players[m.owner].name}의 ${m.cards.map(label).join(' ')} 묶음에 붙이기" ${!(play&&game.players[0].registered&&cards.length===1&&canAttach(m,cards[0]))?'disabled':''}><small>${game.players[m.owner].name}</small>${m.cards.map(tile).join('')}</button>`).join(''):'<div class="empty">아직 등록된 카드가 없어요. 첫 조합을 내려놓아 보세요.</div>';
$('hand-count').textContent=`${hand.length}장`;$('registration').textContent=game.players[0].registered?'등록 완료 ·':'미등록 ·';$('score').textContent=`${score(hand)}점`;
$('hand').innerHTML=hand.map(c=>`<button class="card ${c.suit%2?'red':''} ${selected.has(c.id)?'selected':''}" data-card="${c.id}" aria-label="${label(c)}" aria-pressed="${selected.has(c.id)}" ${!play?'disabled':''}>${cardHTML(c)}</button>`).join('');
$('thanks').disabled=!draw||!game.thanksOptions().length;$('meld').disabled=!play||!kind(cards);$('discard').disabled=!play||cards.length!==1;$('stop').disabled=!draw||score(hand)>10;$('hint').disabled=!play;$('claim').hidden=!mine||!game.special();$('claim').textContent=game.special()+' 선언';
$('sort').disabled=busy;$('hand').setAttribute('aria-busy',String(busy));
$('log').innerHTML=game.log.map(t=>`<li>${t}</li>`).join('');say(game.phase==='ended'?game.result.reason:!mine?'컴퓨터가 플레이 중입니다. 잠시 기다려 주세요.':draw?'중앙 더미에서 카드를 받으세요. 가능한 경우 땡큐나 스톱을 선택할 수 있어요.':cards.length?`${cards.map(label).join(' · ')} 선택됨 · 등록, 묶음에 붙이기 또는 1장 버리기`:'카드를 선택하세요. 7은 혼자 등록할 수 있어요.');
if(game.result&&!recorded&&!busy){recorded=true;record.played++;if(game.result.winners.includes(0))record.wins++;try{localStorage.setItem('hoola-record',JSON.stringify(record));}catch{}$('result-title').textContent=game.result.winners.includes(0)?'잘했어요. 당신의 승리!':`${game.result.winners.map(i=>game.players[i].name).join(', ')} 님의 승리`;$('result-reason').textContent=game.result.reason;$('result-scores').innerHTML=game.players.map((p,i)=>`<div class="result-row"><b>${game.result.winners.includes(i)?'✓ ':''}${p.name}</b><span>${score(p.hand)}점</span><small>${p.hand.map(label).join(' · ')||'남은 카드 없음'}</small></div>`).join('');$('result-dialog').showModal();$('record').textContent=`ROUND ${String(round).padStart(2,'0')} · ${record.wins}승 / ${record.played}판`;}}
function positions(){
 const map=new Map();
 const put=(card,zone,element,hidden=false)=>{if(element)map.set(card.id,{card,zone,element,hidden,rect:element.getBoundingClientRect()});};
 game.players.forEach((p,i)=>p.hand.forEach(c=>put(c,`hand-${i}`,document.querySelector(i===0?`[data-card="${c.id}"]`:`[data-back="${c.id}"]`),i!==0)));
 game.melds.forEach((m,i)=>m.cards.forEach(c=>put(c,`meld-${i}`,$('melds').querySelector(`[data-tile="${c.id}"]`))));
 game.stock.forEach(c=>put(c,'stock',$('draw'),true));
 const top=game.discards.at(-1);if(top)put(top,'discard',$('discard-pile'));
 return map;
}
async function flyCard(from,to,index){
 const ghost=document.createElement('div');
 const concealed=to.hidden;
 ghost.className=`card flying-card ${concealed?'back':to.card.suit%2?'red':''}`;
 ghost.setAttribute('aria-hidden','true');
 ghost.innerHTML=concealed?'<span>H</span>':cardHTML(to.card);
 const width=74,height=102;
 const origin={x:from.rect.left+from.rect.width/2-width/2,y:from.rect.top+from.rect.height/2-height/2};
 const dx=to.rect.left+to.rect.width/2-width/2-origin.x;
 const dy=to.rect.top+to.rect.height/2-height/2-origin.y;
 Object.assign(ghost.style,{left:origin.x+'px',top:origin.y+'px'});
 document.body.append(ghost);
 to.element.classList.add('card-arriving');
 const startScale=Math.max(.38,Math.min(1,from.rect.width/width));
 const endScale=Math.max(.38,Math.min(1,to.rect.width/width));
 const tilt=dx>=0?9:-9;
 const flight=ghost.animate([
  {transform:`translate(0,0) rotate(${-tilt}deg) scale(${startScale})`,opacity:.8},
  {transform:`translate(${dx*.46}px,${dy*.46-38}px) rotate(${tilt}deg) scale(1.08)`,opacity:1,offset:.46},
  {transform:`translate(${dx}px,${dy}px) rotate(0deg) scale(${endScale*1.05})`,opacity:1,offset:.88},
  {transform:`translate(${dx}px,${dy}px) rotate(0deg) scale(${endScale})`,opacity:1}
 ],{duration:560,delay:index*95,easing:'cubic-bezier(.22,.61,.36,1)',fill:'both'});
 activeFlights.add(flight);
 try{await flight.finished;}catch{}finally{activeFlights.delete(flight);ghost.remove();to.element.classList.remove('card-arriving');}
}
async function transition(fn){
 if(busy)return;
 const token=epoch;
 const actor=game.player.name;
 const actorIndex=game.turn;
 const before=positions();
 if(!fn())return;
 busy=true;selected.clear();render();
 document.querySelectorAll('[data-player]').forEach(el=>el.classList.toggle('active',Number(el.dataset.player)===actorIndex));
 const after=positions();
 const moves=[...after.values()].filter(to=>before.has(to.card.id)&&before.get(to.card.id).zone!==to.zone);
 const event=game.log.find(t=>t.startsWith(actor+' ·'));
 say(event||`${actor} 님이 카드를 내려놓았습니다.`);
 $('turn-label').textContent=event||`${actor}의 차례`;
 try{
  if(!motionQuery.matches)await Promise.all(moves.map((to,i)=>flyCard(before.get(to.card.id),to,i)));
 }finally{
  if(token===epoch){busy=false;render();schedule();}
 }
}
function action(fn){if(busy||game.turn!==0||game.phase==='ended')return;return transition(fn);}
$('draw').onclick=()=>action(()=>game.draw());$('hand').onclick=e=>{const b=e.target.closest('[data-card]');if(busy||!b||b.disabled)return;const id=Number(b.dataset.card);selected.has(id)?selected.delete(id):selected.add(id);render();$('hand').querySelector(`[data-card="${id}"]`)?.focus({preventScroll:true});};
$('meld').onclick=()=>action(()=>game.meld([...selected]));$('discard').onclick=()=>action(()=>game.discard([...selected][0]));$('melds').onclick=e=>{const b=e.target.closest('[data-meld]');if(b&&!b.disabled)action(()=>game.attach([...selected][0],Number(b.dataset.meld)));};$('stop').onclick=()=>action(()=>game.stop());$('claim').onclick=()=>action(()=>game.claim());
function thanks(){if(busy||game.turn!==0||game.phase!=='draw')return;const options=game.thanksOptions();if(!options.length)return;$('thanks-options').innerHTML=options.map((m,i)=>`<button data-option="${i}">${m.cards.map(tile).join(' ')} 등록하기</button>`).join('');$('thanks-options').onclick=e=>{const b=e.target.closest('[data-option]');if(!b)return;$('thanks-dialog').close();action(()=>game.thanks(options[Number(b.dataset.option)].cards.map(c=>c.id)));};$('thanks-dialog').showModal();}
$('thanks').onclick=thanks;$('discard-pile').onclick=thanks;$('hint').onclick=()=>{if(busy)return;const m=combos(game.players[0].hand)[0];if(m){selected=new Set(m.cards.map(c=>c.id));render();say('이 조합을 등록할 수 있어요. 「선택 카드 등록」을 누르세요.');return;}if(game.players[0].registered)for(const c of game.players[0].hand){const idx=game.melds.findIndex(m=>canAttach(m,c));if(idx>=0){selected=new Set([c.id]);render();say('선택한 카드를 밝게 표시된 등록 묶음에 붙이세요.');return;}}say('지금은 등록·붙이기가 어렵네요. 필요 없는 카드 1장을 골라 버리세요.');};
$('sort').onclick=()=>{if(busy)return;sortByRank=!sortByRank;game.players[0].hand.sort(sortByRank?(a,b)=>a.rank-b.rank||a.suit-b.suit:(a,b)=>a.suit-b.suit||a.rank-b.rank);render();};$('rules').onclick=()=>$('rules-dialog').showModal();$('new').onclick=()=>{if(game.phase==='ended')start(game.result.winners[0]);else $('new-dialog').showModal();};$('confirm-new').onclick=()=>start();$('again').onclick=()=>start(game.result.winners[0]);document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());start();
