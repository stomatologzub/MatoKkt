document.documentElement.classList.add('js');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const desktopPointer = matchMedia('(hover: hover) and (pointer: fine)');
const mobile = matchMedia('(max-width: 800px)');

// The form still creates a local file. No message is sent to a server.
const form = document.querySelector('#booking');
if (form) {
  const status = document.querySelector('#form-status');
  const submit = form.querySelector('[type=submit]');
  const originalLabel = submit.innerHTML;
  form.addEventListener('invalid', () => {
    status.textContent = 'Skontroluj označené polia. Potrebujeme meno, platný e-mail, akciu, miesto a termín.';
  }, true);
  form.addEventListener('input', event => {
    event.target.removeAttribute('aria-invalid');
    event.target.setCustomValidity?.('');
    if (form.dataset.state === 'ready') {
      delete form.dataset.state;
      submit.innerHTML = originalLabel;
      status.textContent = '';
    }
  });
  form.addEventListener('invalid', event => event.target.setAttribute('aria-invalid', 'true'), true);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const blank = [...form.querySelectorAll('[required]')].find(field => !field.value.trim());
    if (blank) blank.setCustomValidity('Doplň toto pole, prosím.');
    if (!form.reportValidity()) return;
    let url;
    let link;
    try {
      submit.disabled = true;
      form.setAttribute('aria-busy', 'true');
      const data = new FormData(form);
      const labels = {name:'Meno / produkcia',email:'E-mail',event:'Akcia',location:'Miesto',date:'Termín',service:'Služba',details:'Podrobnosti'};
      const text = 'DOPYT PRE MAŤA — TECHNIK FESTIVALOV\n\n' + Object.entries(labels).map(([key,label]) => label + ': ' + String(data.get(key) || '').trim()).join('\n\n');
      url = URL.createObjectURL(new Blob(['\uFEFF', text], {type:'text/plain;charset=utf-8'}));
      link = document.createElement('a');
      link.href = url;
      link.download = 'dopyt-pre-mata.txt';
      document.body.append(link);
      link.click();
      form.dataset.state = 'ready';
      submit.textContent = 'Stiahnuť zadanie znova ↓';
      status.textContent = 'Súbor je pripravený a sťahovanie bolo spustené. Maťovi zatiaľ nič nebolo odoslané.';
    } catch {
      status.textContent = 'Súbor sa nepodarilo pripraviť. Údaje zostali vo formulári; skús to znova.';
    } finally {
      link?.remove();
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
      submit.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#site-nav');
function setMenu(open, restoreFocus = false) {
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.querySelector('span').textContent = open ? 'Zavrieť' : 'Menu';
  document.querySelector('header').classList.toggle('menu-open', open);
  nav.inert = mobile.matches && !open;
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false, true);
});
document.addEventListener('click', event => {
  if (!event.target.closest('header') && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false);
});
nav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
mobile.addEventListener('change', () => setMenu(false));
setMenu(false);

const cardPaths = [
  '<path d="M5 29h38M9 29V12h30v17M15 12V5h18v7M16 29v10m16-10v10M8 39h32"/>',
  '<path d="M9 6v9a8 8 0 0 0 16 0v-2a8 8 0 0 1 16 0v10a8 8 0 0 1-16 0v-1M5 6h8m24 29h8M9 2v4m32 29v8"/>',
  '<rect x="15" y="4" width="18" height="25" rx="9"/><path d="M9 21a15 15 0 0 0 30 0M24 36v8m-9 0h18M20 11h8m-8 6h8"/>',
  '<path d="m15 6 22 10-9 20L6 26ZM29 5l8 11 8-1M10 31l-3 9m13-5-1 10M25 24l-4 3"/>',
  '<path d="M4 24h7l5-14 8 28 7-22 5 8h8"/>',
  '<rect x="6" y="12" width="36" height="27" rx="3"/><path d="M17 12V6h14v6M6 22h36M17 19v6m14-6v6M13 39v5m22-5v5"/>'
];
document.querySelectorAll('.route-grid article').forEach((card, index) => {
  const small = card.querySelector('small');
  const number = small?.textContent.split('/')[0].trim();
  if (number) {
    const stamp = document.createElement('span');
    stamp.className = 'service-number';
    stamp.setAttribute('aria-hidden', 'true');
    stamp.textContent = number;
    card.prepend(stamp);
  }
  card.insertAdjacentHTML('afterbegin', '<svg class="service-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+cardPaths[index % cardPaths.length]+'</svg>');
});

// Progressive reveals: without JavaScript, all content remains visible.
const revealNodes = document.querySelectorAll('.page-intro>h2,.page-intro>.eyebrow,.page-title,.route-grid article,.quote-grid blockquote,.booking-banner,.profile,.joke-stats article,.backstage-console,.booking-form');
const reveals = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      reveals.unobserve(entry.target);
    }
  });
}, {threshold:.08, rootMargin:'0px 0px -25px 0px'}) : null;
if (!motion.matches && reveals) revealNodes.forEach((node, index) => {
  node.classList.add('reveal');
  node.style.setProperty('--reveal-delay', (node.matches('article,blockquote') ? index % 3 * 70 : 0)+'ms');
  reveals.observe(node);
});

// Three small, keyboard-accessible backstage jokes.
const kktButton = document.querySelector('.kkt-button');
const responses = ['Potvrdené produkciou. Bez pečiatky.', 'Technika funguje. Maťo sa ešte načítava.', 'Reklamácie prijíma najbližší kábel.'];
let responseIndex = 0;
kktButton?.addEventListener('click', () => {
  document.querySelector('.kkt-reply').textContent = responses[responseIndex++ % responses.length];
  if (!motion.matches) kktButton.animate([{transform:'rotate(-5deg) scale(1)'},{transform:'rotate(3deg) scale(1.06)'},{transform:'rotate(-5deg) scale(1)'}], {duration:400});
});
document.querySelectorAll('.quote-grid blockquote').forEach(quote => {
  const button = document.createElement('button');
  button.className = 'quote-secret';
  button.type = 'button';
  button.textContent = 'Poznámka produkcie ↗';
  button.setAttribute('aria-expanded', 'false');
  const note = document.createElement('span');
  note.className = 'secret-note';
  note.textContent = 'Toto nebolo v technickom rideri.';
  note.id = 'secret-'+[...document.querySelectorAll('.quote-grid blockquote')].indexOf(quote);
  button.setAttribute('aria-controls', note.id);
  quote.append(button,note);
  button.addEventListener('click', () => button.setAttribute('aria-expanded', String(button.getAttribute('aria-expanded') !== 'true')));
});
let chaos = 42;
document.querySelector('.chaos-button')?.addEventListener('click', () => {
  chaos = chaos >= 100 ? 7 : Math.min(100, chaos+19);
  document.querySelector('#chaos-value').textContent = chaos+' %';
  document.querySelector('.chaos-track span').style.transform = 'scaleX('+chaos/100+')';
  document.querySelector('#chaos-status').textContent = chaos === 100 ? '100 %. Maťo tvrdí, že to je súčasť plánu.' : chaos === 7 ? 'Reštart. Kábel bol celý čas odpojený.' : 'Ďalší kábel. Ďalšia otázka pre produkciu.';
});

// Pointer effects never run on touch devices or with reduced motion enabled.
document.querySelectorAll('.route-grid article,.magnetic').forEach(element => {
  let frame = 0;
  element.addEventListener('pointermove', event => {
    if (!desktopPointer.matches || motion.matches || event.pointerType === 'touch') return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const box = element.getBoundingClientRect();
      const x = (event.clientX-box.left)/box.width-.5;
      const y = (event.clientY-box.top)/box.height-.5;
      element.style.transform = element.matches('.magnetic') ? `translate(${x*9}px,${y*7}px)` : `perspective(1000px) rotateX(${-y*3}deg) rotateY(${x*3}deg) translateY(-4px)`;
    });
  });
  element.addEventListener('pointerleave', () => { cancelAnimationFrame(frame); element.style.transform = ''; });
});
const hero = document.querySelector('.hero');
let heroFrame = 0;
hero?.addEventListener('pointermove', event => {
  if (!desktopPointer.matches || motion.matches || mobile.matches) return;
  cancelAnimationFrame(heroFrame);
  heroFrame = requestAnimationFrame(() => {
    const box = hero.getBoundingClientRect();
    hero.style.setProperty('--pointer-x', ((event.clientX-box.left)/box.width-.5)*12+'px');
    hero.style.setProperty('--pointer-y', ((event.clientY-box.top)/box.height-.5)*8+'px');
  });
});
hero?.addEventListener('pointerleave', () => {
  cancelAnimationFrame(heroFrame);
  hero.style.setProperty('--pointer-x','0px'); hero.style.setProperty('--pointer-y','0px');
});

// A single visible-only animation loop. Widths are cached, not measured per frame.
const bands = [...document.querySelectorAll('.marquee')].map(element => ({
  element, track:element.querySelector('.marquee-track'), width:0, offset:0,
  visible:false, paused:false, hovering:false, speed:1
}));
let bandFrame = 0;
let previousTime = 0;
let direction = 1;
let scrollVelocity = 0;
let lastScrollY = scrollY;
let lastScrollTime = performance.now();
function scheduleBands() {
  if (!bandFrame && !motion.matches && !document.hidden && bands.some(band => band.visible && !band.paused)) bandFrame = requestAnimationFrame(animateBands);
}
function animateBands(time) {
  bandFrame = 0;
  const dt = Math.min((time-(previousTime || time))/1000,.05);
  previousTime = time;
  scrollVelocity *= Math.exp(-dt*4);
  bands.forEach(band => {
    if (!band.visible || band.paused || !band.width) return;
    const target = direction*(band.hovering ? .2 : 1)*(1+Math.min(scrollVelocity/1800,2));
    band.speed += (target-band.speed)*(1-Math.exp(-dt*6));
    band.offset = (band.offset+dt*55*band.speed+band.width)%band.width;
    band.track.style.transform = `translate3d(${-band.offset}px,0,0)`;
  });
  scheduleBands();
}
const bandObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => { const band=bands.find(item => item.element === entry.target); band.visible=entry.isIntersecting; });
  scheduleBands();
});
const bandResize = new ResizeObserver(() => bands.forEach(band => {
  band.width = band.track.firstElementChild.getBoundingClientRect().width;
  band.offset %= band.width || 1;
}));
bands.forEach(band => {
  bandObserver.observe(band.element);
  bandResize.observe(band.track.firstElementChild);
  band.element.addEventListener('pointerenter', () => { if (desktopPointer.matches) band.hovering = true; });
  band.element.addEventListener('pointerleave', () => { band.hovering = false; });
  const button=band.element.querySelector('.marquee-toggle');
  button.addEventListener('click', () => {
    band.paused = !band.paused;
    button.setAttribute('aria-pressed',String(band.paused));
    button.setAttribute('aria-label',band.paused ? 'Spustiť pohyb' : 'Pozastaviť pohyb');
    scheduleBands();
  });
});
let scrollFrame = 0;
addEventListener('scroll', () => {
  const now=performance.now();
  const delta=scrollY-lastScrollY;
  if (Math.abs(delta)>1) direction=delta>0 ? 1 : -1;
  scrollVelocity=Math.abs(delta)/Math.max((now-lastScrollTime)/1000,.016);
  lastScrollY=scrollY; lastScrollTime=now;
  if (!scrollFrame) scrollFrame=requestAnimationFrame(() => {
    scrollFrame=0;
    document.querySelector('header').classList.toggle('is-scrolled',scrollY>25);
    if (hero && !motion.matches && !mobile.matches && scrollY < innerHeight*1.5) hero.style.setProperty('--parallax',Math.min(scrollY*.07,55)+'px');
  });
  scheduleBands();
}, {passive:true});
function stopBands() { cancelAnimationFrame(bandFrame); bandFrame=0; previousTime=0; }
document.addEventListener('visibilitychange', () => { stopBands(); scheduleBands(); });
motion.addEventListener('change', () => {
  stopBands();
  if (motion.matches) {
    revealNodes.forEach(node => node.classList.add('is-visible'));
    bands.forEach(band => { band.track.style.transform='none'; band.offset=0; });
  }
  scheduleBands();
});
