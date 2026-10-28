(() => {
  'use strict';
  const root = document.querySelector('#festival-game');
  if (!root) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = selector => root.querySelector(selector);
  const shuffle = values => {
    const result = [...values];
    for (let i=result.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1));
      [result[i],result[j]] = [result[j],result[i]];
    }
    return result;
  };
  const svg = (content, className='') => `<svg class="${className}" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
  const plug = svg('<path d="M20 50h25m0-15v30h23V35Zm23 8h13m-13 14h13M10 50h10"/><path d="M24 44v12m8-12v12"/>');
  const socket = svg('<circle cx="50" cy="50" r="27"/><circle cx="42" cy="43" r="3"/><circle cx="58" cy="43" r="3"/><circle cx="50" cy="58" r="3"/><path d="M25 18h50v64H25Z"/>');
  const lamp = svg('<path d="m25 29 39-9 11 38-39 10ZM33 28l-7-14m40 8 12-9M39 69l-6 15m27-20 9 15M50 62v29m-12 0h24"/><path d="m40 40 23-5m-20 15 23-5"/>');
  const equipmentArt = [
    svg('<rect x="22" y="8" width="56" height="81" rx="5"/><circle cx="50" cy="32" r="12"/><circle cx="50" cy="65" r="18"/><circle cx="50" cy="65" r="6"/><path d="M30 94h40"/>'),
    svg('<rect x="8" y="32" width="84" height="52" rx="4"/><path d="M8 47h84M30 31V18h40v13M21 41v13m58-13v13M20 84v9m59-9v9M17 61h14m38 0h14"/>'),
    svg('<path d="M22 9v82m56-82v82M22 13l56 24-56 25 56 25M22 37l56-24M22 62l56-25M22 87l56-25M12 91h76"/>'),
    svg('<path d="M50 14v71M25 93l25-8 25 8M50 28h29M79 20v27"/><rect x="73" y="8" width="12" height="30" rx="6"/><path d="M36 21h14"/>'),
    svg('<rect x="12" y="19" width="76" height="65" rx="4"/><path d="M19 31h62M19 49h62M19 67h62M25 25v12m12-12v12m12-12v12M25 43v12m12-12v12m12-12v12M25 61v12m12-12v12m12-12v12"/><circle cx="72" cy="43" r="2"/><circle cx="72" cy="61" r="2"/>'),
    svg('<rect x="9" y="43" width="82" height="43" rx="4"/><path d="M9 58h82M28 43V31h44v12M23 54v9m54-9v9"/><path d="M27 25a13 13 0 1 1 26 0 8 8 0 1 1-16 0M53 25h18m-5-6v12M22 86v7m56-7v7"/>')
  ];
  const equipmentNames = ['reproduktor','technický case','konštrukciu','mikrofón','rack','káblový case'];
  const cableNames = {A:'FIALOVÝ',B:'TYRKYSOVÝ',C:'JANTÁROVÝ'};
  const quips = ['Maťo je kkt.','Keby som vzduch, tak tam neprejdem.','Nemá prečo to nefungovať.','Kto zobral ten kábel?','Stage stojí. Zatiaľ.','To nie je chyba. To je feature.','Maťo, kde si?!'];

  // One wall-clock deadline: throttled/background tabs never grant extra time.
  class FestivalClock {
    constructor(onTick) { this.onTick=onTick; this.interval=null; this.deadline=0; }
    start() { this.deadline=Date.now()+30000; this.resume(); }
    resume() { this.stop(); this.tick(); if (this.deadline>Date.now()) this.interval=setInterval(()=>this.tick(),100); }
    tick() { this.onTick(Math.max(0,this.deadline-Date.now())); }
    stop() { clearInterval(this.interval); this.interval=null; }
  }
  class PersonalRecord {
    constructor() {
      this.value=0; this.available=true;
      try { this.value=this.read(); } catch { this.available=false; }
    }
    read() {
      const value=Number(localStorage.getItem('mato-festival-record') || 0);
      return Number.isSafeInteger(value) && value>=0 ? value : 0;
    }
    save(score) {
      try { this.value=Math.max(this.value,this.read()); } catch { this.available=false; }
      const improved=score>this.value;
      this.value=Math.max(this.value,score);
      if (improved) {
        try { localStorage.setItem('mato-festival-record',String(this.value)); } catch { this.available=false; }
      }
      return improved;
    }
  }

  class FestivalGame {
    constructor() {
      this.shell=$('.game-shell'); this.view=$('.game-view');
      this.lobby=this.view.innerHTML; this.record=new PersonalRecord();
      this.clock=new FestivalClock(ms=>this.tick(ms));
      this.jobs=new Set(); this.state={phase:'idle',score:0,completed:0,remaining:30};
      this.drag=null; this.suppressClickUntil=0; this.lastQuip=0;
      root.addEventListener('click',event=>this.click(event));
      root.addEventListener('pointerdown',event=>this.pointerDown(event));
      root.addEventListener('pointermove',event=>this.pointerMove(event));
      root.addEventListener('pointerup',event=>this.pointerUp(event));
      root.addEventListener('pointercancel',()=>this.cancelDrag());
      root.addEventListener('lostpointercapture',()=>this.cancelDrag());
      root.addEventListener('keydown',event=>{
        if (event.key==='Escape' && this.state.phase==='cables') {
          this.cancelDrag(); this.state.selected=null; this.updateSelection();
        }
      });
      this.resize=new ResizeObserver(()=>this.drawConnections());
      this.resize.observe(this.view);
      document.addEventListener('visibilitychange',()=>{ if (this.active) this.clock.tick(); });
      addEventListener('pagehide',()=>this.clock.stop());
      addEventListener('pageshow',()=>{ if (this.active) this.clock.resume(); });
      $('[data-action="start"]').disabled=false;
      this.updateHud();
    }
    get active() { return ['cables','lights-preview','lights','find','transition'].includes(this.state.phase); }
    schedule(callback,ms) {
      const id=setTimeout(()=>{this.jobs.delete(id);callback();},ms);
      this.jobs.add(id); return id;
    }
    cancelJobs() { this.jobs.forEach(clearTimeout); this.jobs.clear(); }
    phase(value) { this.state.phase=value; this.shell.dataset.phase=value; }
    radio(text) { $('.game-radio').textContent='Vysielačka: '+text; this.lastQuip=Date.now(); }
    focus(selector) { const target=$(selector); if (target) target.focus({preventScroll:true}); }
    showBoard() {
      const box=this.shell.getBoundingClientRect();
      if (box.top<70 || box.top>innerHeight*.45) this.shell.scrollIntoView({block:'start',behavior:'instant'});
    }
    setView(markup) { this.cancelDrag(); this.view.innerHTML=markup; }
    updateHud() {
      const {score,remaining,completed,phase}=this.state;
      $('.game-hud [data-score]').textContent=score;
      $('[data-time]').innerHTML=remaining+' <small>s</small>';
      $('[data-record]').textContent=this.record.value;
      $('[data-progress]').textContent=completed+' / 3 HOTOVÉ';
      $('[data-task]').textContent=['KÁBLE','ZAPNI STAGE','NÁJDI MAŤA'][Math.min(completed,2)];
      $('.game-hud').hidden=!this.active;
      $('.game-steps').hidden=!this.active;
      this.shell.classList.toggle('time-critical',this.active && remaining<=5);
      $('.game-steps').querySelectorAll('li').forEach((step,index)=>{
        step.classList.toggle('is-done',index<completed);
        step.classList.toggle('is-current',index===completed);
        if (index===completed) step.setAttribute('aria-current','step'); else step.removeAttribute('aria-current');
      });
      $('[data-storage-note]').hidden=this.record.available;
      this.shell.dataset.score=score; this.shell.dataset.completed=completed;
      this.shell.dataset.phase=phase;
    }
    tick(ms) {
      if (!this.active) return;
      const seconds=Math.ceil(ms/1000);
      if (seconds!==this.state.remaining) {
        this.state.remaining=seconds; this.updateHud();
        if (seconds===5) this.radio('Posledných 5 sekúnd. Maťo, kde si?!');
      }
      if (!ms) { this.finish(false); return; }
      if (Date.now()-this.lastQuip>6500) this.radio(quips[Math.floor(Math.random()*quips.length)]);
    }
    ensureLive(phase) {
      if (!this.active) return false;
      this.clock.tick();
      return this.active && this.state.phase===phase;
    }
    start() {
      if (this.active) return;
      this.cancelJobs(); this.clock.stop(); this.cancelDrag();
      this.state={phase:'cables',score:0,completed:0,remaining:30,selected:null,connected:[],sequence:shuffle([0,1,2]),lit:[],hiddenIndex:Math.floor(Math.random()*6),winnerClicks:0};
      this.suppressClickUntil=0;
      this.phase('cables'); this.renderCables(); this.updateHud();
      this.radio('Kto zobral ten kábel? Spoj písmená A, B, C.');
      this.clock.start(); this.focus('[data-cable]');this.showBoard();
    }
    exit() {
      this.clock.stop(); this.cancelJobs(); this.cancelDrag();
      this.state={phase:'idle',score:0,completed:0,remaining:30};
      this.phase('idle'); this.view.innerHTML=this.lobby;
      $('[data-action="start"]').disabled=false; this.updateHud();
      this.radio('Stage stojí. Zatiaľ.');
      this.focus('[data-action="start"]');
    }
    mistake(text,element) {
      this.state.score=Math.max(0,this.state.score-10); this.updateHud(); this.radio(text);
      if (!reducedMotion.matches && element) element.animate([{transform:'translateX(0)'},{transform:'translateX(-6px) rotate(-2deg)'},{transform:'translateX(5px) rotate(2deg)'},{transform:'translateX(0)'}],{duration:330});
    }
    completeTask() {
      if (!this.active || this.state.phase==='transition') return;
      this.state.completed++; this.state.score+=100;
      if (this.state.completed===3) { this.finish(true); return; }
      this.phase('transition'); this.updateHud();
      this.view.querySelectorAll('button').forEach(button=>button.disabled=true);
      this.radio(this.state.completed===1 ? 'Káble zapojené. Prekvapivo správne. +100 bodov.' : 'Stage svieti. Teraz nájdi Maťa. +100 bodov.');
      this.schedule(()=>{
        if (!this.ensureLive('transition')) return;
        if (this.state.completed===1) this.renderLights(); else this.renderFind();
      },450);
    }
    taskHeading(number,title,instructions) {
      return `<div class="game-task-heading"><span class="game-tag">ÚLOHA ${number} / 3</span><h3 tabindex="-1">${title}</h3><p>${instructions}</p></div>`;
    }
    renderCables() {
      this.setView(this.taskHeading(1,'KÁBLE. ŽIADNA MÁGIA.','Potiahni kábel do rozhrania s rovnakým písmenom. Alebo klikni na kábel a potom na rozhranie.')+
        `<div class="cable-board"><svg class="cable-lines" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true"><g class="connected-lines"></g><path class="drag-line" hidden/></svg><div class="cable-column"><span class="cable-column-label">ZO STAGEU</span>${['A','B','C'].map(key=>`<button class="cable-end cable-${key}" type="button" data-cable="${key}" aria-pressed="false" aria-label="Vybrať kábel ${key}, ${cableNames[key].toLowerCase()}"><span class="cable-letter">${key}</span><span class="cable-name">${cableNames[key]}</span>${plug}</button>`).join('')}</div><div class="cable-column socket-column"><span class="cable-column-label">DO RACKU</span>${shuffle(['A','B','C']).map(key=>`<button class="cable-socket cable-${key}" type="button" data-socket="${key}" aria-label="Pripojiť do rozhrania ${key}, ${cableNames[key].toLowerCase()}">${socket}<span class="cable-name">${cableNames[key]}</span><span class="cable-letter">${key}</span></button>`).join('')}</div></div><p class="game-task-tip">Farby nestačia? Sleduj písmená. Escape zruší výber kábla.</p>`);
    }
    updateSelection() {
      root.querySelectorAll('[data-cable]').forEach(button=>button.setAttribute('aria-pressed',String(this.state.selected===button.dataset.cable)));
    }
    selectCable(key) {
      if (!this.ensureLive('cables') || this.state.connected.includes(key)) return;
      this.state.selected=key; this.updateSelection();
      this.radio('Kábel '+key+' vybraný. Teraz rozhranie '+key+'.');
    }
    connect(key) {
      if (!this.ensureLive('cables') || this.state.connected.includes(key)) return;
      if (!this.state.selected) { this.radio('Najprv vyber kábel naľavo. Maťo by tiež najprv hľadal kábel.'); return; }
      const selected=this.state.selected;
      if (selected!==key) { this.mistake('Maťo, nefázuj sa! −10 bodov.', $(`[data-cable="${selected}"]`)); return; }
      this.state.connected.push(key); this.state.selected=null;
      [ $(`[data-cable="${key}"]`), $(`[data-socket="${key}"]`) ].forEach(button=>{button.classList.add('is-connected');button.disabled=true;});
      this.updateSelection(); this.drawConnections(); this.radio('Kábel '+key+' sedí. Ešte stále nič nehorí.');
      if (this.state.connected.length===3) this.completeTask(); else this.focus('[data-cable]:not(:disabled)');
    }
    point(element,box) {
      const rect=element.getBoundingClientRect();
      return {x:((rect.left+rect.width/2-box.left)/box.width)*1000,y:((rect.top+rect.height/2-box.top)/box.height)*400};
    }
    curve(a,b) { const bend=Math.max(35,Math.abs(b.x-a.x)*.45);return `M${a.x},${a.y} C${a.x+bend},${a.y} ${b.x-bend},${b.y} ${b.x},${b.y}`; }
    drawConnections() {
      const board=$('.cable-board'); if (!board || !this.state.connected) return;
      const box=board.getBoundingClientRect(); if (!box.width || !box.height) return;
      $('.connected-lines').innerHTML=this.state.connected.map(key=>`<path class="cable-${key}" d="${this.curve(this.point($(`[data-cable="${key}"]`),box),this.point($(`[data-socket="${key}"]`),box))}"/>`).join('');
    }
    pointerDown(event) {
      const button=event.target.closest('[data-cable]');
      if (!button || button.disabled || (event.pointerType==='mouse' && event.button!==0)) return;
      this.selectCable(button.dataset.cable);
      if (this.state.phase!=='cables') return;
      this.drag={button,key:button.dataset.cable,id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,box:$('.cable-board').getBoundingClientRect()};
      button.setPointerCapture(event.pointerId);
    }
    pointerMove(event) {
      const drag=this.drag; if (!drag || drag.id!==event.pointerId) return;
      if (Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6) drag.moved=true;
      if (!drag.moved) return;
      event.preventDefault();
      const path=$('.drag-line'); if (!path) return;
      path.removeAttribute('hidden'); path.setAttribute('class','drag-line cable-'+drag.key);
      path.setAttribute('d',this.curve(this.point(drag.button,drag.box),{x:(event.clientX-drag.box.left)/drag.box.width*1000,y:(event.clientY-drag.box.top)/drag.box.height*400}));
    }
    pointerUp(event) {
      const drag=this.drag; if (!drag || drag.id!==event.pointerId) return;
      const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-socket]');
      if (drag.moved) this.suppressClickUntil=performance.now()+300;
      this.cancelDrag();
      if (drag.moved && target && root.contains(target)) this.connect(target.dataset.socket);
    }
    cancelDrag() {
      const drag=this.drag; this.drag=null;
      if (drag?.button.hasPointerCapture(drag.id)) drag.button.releasePointerCapture(drag.id);
      $('.drag-line')?.setAttribute('hidden','');
    }
    renderLights() {
      this.phase('lights-preview'); this.state.lit=[];
      this.setView(this.taskHeading(2,'ZAPNI STAGE. V PORADÍ.','Zapamätaj si krátku sekvenciu. Potom zapni reflektory v rovnakom poradí.')+
        `<div class="light-stage"><div class="stage-truss"></div><div class="spotlights">${[0,1,2].map(index=>`<button class="spotlight" type="button" data-lamp="${index}" disabled aria-label="Reflektor ${index+1}" aria-pressed="false"><span class="light-beam" aria-hidden="true"></span>${lamp}<span class="lamp-number">${index+1}</span></button>`).join('')}</div><div class="stage-platform"><span>MAŤO / LIVE</span><i></i><i></i><i></i></div></div><div class="sequence-bar"><p class="sequence-caption">Sleduj reflektory…</p><button class="game-secondary" type="button" data-action="replay-lights" disabled>Zopakovať poradie</button></div>`);
      this.updateHud(); this.focus('.game-task-heading h3');this.showBoard();this.previewSequence();
    }
    previewSequence() {
      if (!this.active) return;
      this.phase('lights-preview'); this.state.lit=[];
      root.querySelectorAll('[data-lamp]').forEach(button=>{button.disabled=true;button.classList.remove('is-lit','is-error','is-flashing');button.setAttribute('aria-pressed','false');});
      $('[data-action="replay-lights"]').disabled=true;
      $('.sequence-caption').textContent='Sleduj: '+this.state.sequence.map(index=>index+1).join(' → ');
      this.radio('Zapamätaj si poradie reflektorov: '+this.state.sequence.map(index=>index+1).join(', ')+'.');
      this.state.sequence.forEach((index,step)=>{
        this.schedule(()=>{if (this.ensureLive('lights-preview')) $(`[data-lamp="${index}"]`).classList.add('is-flashing');},250+step*570);
        this.schedule(()=>{if (this.state.phase==='lights-preview') $(`[data-lamp="${index}"]`)?.classList.remove('is-flashing');},650+step*570);
      });
      this.schedule(()=>{
        if (!this.ensureLive('lights-preview')) return;
        this.phase('lights');
        root.querySelectorAll('[data-lamp]').forEach(button=>button.disabled=false);
        $('[data-action="replay-lights"]').disabled=false;
        $('.sequence-caption').textContent='Teraz ty. Zapni 3 reflektory v správnom poradí.';
        this.radio('Teraz ty. Reflektory čakajú na správne poradie.'); this.focus('[data-lamp]');
      },2050);
    }
    pressLamp(index) {
      if (!this.ensureLive('lights')) return;
      const expected=this.state.sequence[this.state.lit.length];
      if (index!==expected) {
        this.mistake('Nemá prečo to nefungovať. −10 bodov. Pozri si poradie znova.',$('.light-stage'));
        root.querySelectorAll('[data-lamp]').forEach(button=>button.classList.add('is-error'));
        this.phase('lights-preview');
        root.querySelectorAll('[data-lamp]').forEach(button=>button.disabled=true);
        $('[data-action="replay-lights"]').disabled=true;
        this.schedule(()=>{if (this.ensureLive('lights-preview')) this.previewSequence();},600);
        return;
      }
      this.state.lit.push(index);
      const button=$(`[data-lamp="${index}"]`);
      button.classList.remove('is-error'); button.classList.add('is-lit');button.setAttribute('aria-pressed','true');button.disabled=true;
      $('.sequence-caption').textContent=this.state.lit.length+' / 3 reflektory zapnuté.';
      this.radio('Reflektor '+(index+1)+' zapnutý. '+this.state.lit.length+' z 3.');
      if (this.state.lit.length===3) this.completeTask();
      else this.focus('[data-lamp]:not(:disabled)');
    }
    renderFind() {
      this.phase('find');
      this.setView(this.taskHeading(3,'NÁJDI MAŤA. FAKT TU BOL.','Pozri za vybavenie. Maťo niekde vykúka. Klikni naňho alebo prezri miesto pomocou klávesnice.')+
        `<div class="backstage-scene"><div class="scene-tape" aria-hidden="true">BACKSTAGE / LEN PRE CREW</div><div class="equipment-grid">${equipmentArt.map((art,index)=>`<button class="equipment" type="button" data-equipment="${index}" aria-label="Prezrieť ${equipmentNames[index]}">${index===this.state.hiddenIndex ? '<img class="mato-peek" src="assets/mato-portrait.png" alt="" width="1536" height="1024">' : ''}<span class="equipment-art">${art}</span><span class="equipment-label">0${index+1} / ${['SPEAKER','CASE','TRUSS','MIC','RACK','CABLES'][index]}</span></button>`).join('')}</div><div class="scene-floor" aria-hidden="true"></div></div><p class="game-task-tip">Hľadaj čierne vlasy a fialový odlesk. Nie každá vec v backstagei je Maťo.</p>`);
      this.updateHud();this.radio('Maťo, kde si?!');this.focus('.game-task-heading h3');this.showBoard();
    }
    find(index,element) {
      if (!this.ensureLive('find')) return;
      if (index!==this.state.hiddenIndex) {this.mistake('Keby som vzduch, tak tam neprejdem. −10 bodov.',element);return;}
      element.classList.add('mato-found'); this.completeTask();
    }
    finish(won) {
      if (!this.active) return;
      this.clock.stop(); this.cancelJobs();this.cancelDrag();
      if (won) this.state.score+=this.state.remaining*5;
      else this.state.remaining=0;
      this.state.newRecord=this.record.save(this.state.score);
      this.phase(won?'won':'lost'); this.updateHud();this.renderResult(won);
      this.radio(won ? 'Maťo je kkt. Ale stage zachránil.' : 'Maťo povedal, že to bude fungovať. Nefungovalo.');
      this.focus('.game-result h3');
    }
    renderResult(won) {
      const {score,remaining,completed,newRecord}=this.state;
      const confetti=won?'<div class="game-confetti" aria-hidden="true">'+Array.from({length:18},(_,i)=>`<i style="--i:${i};--left:${(i*37)%100}%;--delay:${i%5*.12}s">${i%3===0?svg('<path d="m57 8-31 47h23l-6 37 31-47H51Z"/>'):i%3===1?svg('<path d="M20 15v35a15 15 0 0 0 30 0V35a15 15 0 0 1 30 0v50"/>'):lamp}</i>`).join('')+'</div>':'';
      this.setView(`<div class="game-result ${won?'result-won':'result-lost'}">${confetti}<span class="game-tag">${won?'SYSTEM RESTORED / CREW LEGEND':'NO POWER / NO FESTIVAL'}</span><h3 tabindex="-1">${won?'FESTIVAL<br>ZACHRÁNENÝ!':'FESTIVAL<br>JE V RITI.'}</h3><p class="result-description">${won?'Maťo je kkt, ale bez neho by nehrala ani jedna kapela.':'Maťo povedal, že to bude fungovať. Nefungovalo.'}</p>${won?'<button type="button" class="winner-mato" data-action="greet-mato" aria-label="Pozdraviť Maťa"><img src="assets/mato-portrait.png" alt="Ilustrovaný Maťo" width="1536" height="1024"><span>MAŤO / STAGE RESCUER ↗</span></button>':'<div class="blackout-stage" aria-hidden="true">'+lamp+lamp+lamp+'<span>NO SIGNAL</span></div>'}<div class="result-stats"><div><span>VÝSLEDOK</span><strong data-final-score>${score}</strong></div><div><span>ZOSTÁVAJÚCI ČAS</span><strong data-final-time>${remaining} s</strong></div><div><span>${won?'ČASOVÝ BONUS':'ÚLOHY HOTOVÉ'}</span><strong>${won?'+'+remaining*5:completed+' / 3'}</strong></div></div>${newRecord?'<p class="new-record">NOVÝ REKORD!</p>':''}<div class="game-result-actions"><button class="primary" type="button" data-action="start">${won?'HRAŤ ZNOVA':'SKÚSIŤ ZNOVA'} <span aria-hidden="true">↗</span></button><a class="game-secondary" href="#services" data-action="back">SPÄŤ NA WEB</a></div></div>`);
    }
    secret() {
      if (this.state.phase!=='won') return;
      this.state.winnerClicks++;
      if (this.state.winnerClicks<5) {
        if (!reducedMotion.matches) $('.winner-mato').animate([{transform:'rotate(0)'},{transform:'rotate(-3deg)'},{transform:'rotate(0)'}],{duration:220});
        return;
      }
      this.phase('secret');
      this.setView(`<div class="game-result result-secret"><span class="game-tag">TAJNÝ ACHIEVEMENT ODOMKNUTÝ</span><div class="secret-badge" aria-hidden="true">${svg('<path d="M50 5 62 12 75 12 82 25 94 32 94 47 98 59 87 70 82 84 67 87 55 96 42 90 27 90 20 77 8 70 8 55 3 43 14 32 19 18 34 15Z"/><path d="m31 51 13 13 25-29"/>')}</div><h3 tabindex="-1">OFICIÁLNE<br>CERTIFIKOVANÝ KKT</h3><p>Pečiatka produkcie. Platí na všetky festivaly, ktoré o tom nevedia.</p><button class="primary" type="button" data-action="result">SPÄŤ K VÝSLEDKU <span aria-hidden="true">↗</span></button></div>`);
      this.radio('Tajný achievement odomknutý. Produkcia popiera akúkoľvek zodpovednosť.');
      this.focus('.game-result h3');
    }
    click(event) {
      const button=event.target.closest('button,a[data-action]'); if (!button || !root.contains(button) || button.disabled) return;
      if (button.hasAttribute('data-cable')) {
        if (event.detail===0 || performance.now()>=this.suppressClickUntil) this.selectCable(button.dataset.cable);
      } else if (button.hasAttribute('data-socket')) this.connect(button.dataset.socket);
      else if (button.hasAttribute('data-lamp')) this.pressLamp(Number(button.dataset.lamp));
      else if (button.hasAttribute('data-equipment')) this.find(Number(button.dataset.equipment),button);
      else switch (button.dataset.action) {
        case 'start': this.start();break;
        case 'exit': this.exit();break;
        case 'replay-lights': if (this.ensureLive('lights')) this.previewSequence();break;
        case 'greet-mato': this.secret();break;
        case 'result': if (this.state.phase==='secret') {this.state.winnerClicks=0;this.phase('won');this.renderResult(true);this.focus('.game-result h3');}break;
        case 'back': {
          event.preventDefault();this.exit();
          const heading=document.querySelector('#services h2');heading.tabIndex=-1;heading.focus({preventScroll:true});
          document.querySelector('#services').scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth'});break;
        }
      }
    }
  }
  new FestivalGame();
})();
