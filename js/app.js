// diana — site behaviour: theme + language toggles, filters, lightbox,
// and the CMS-driven gallery (art/gallery.json). Loaded at end of <body>.

(() => {
  const $  = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const root = document.documentElement;

  /* ── strings that live in JS, not in the DOM ── */
  const T = {
    en: { title:"diana — draws stuff, makes it move", dark:"dark", light:"light",
          empty:"drop art here", of:(a,b)=>`— ${a} of ${b}`,
          langBtn:"עב", langAria:"עבור לעברית" },
    he: { title:"דיאנה — מציירת, ומזיזה", dark:"כהה", light:"בהיר",
          empty:"כאן ייכנס ציור", of:(a,b)=>`— ${a} מתוך ${b}`,
          langBtn:"EN", langAria:"Switch to English" }
  };
  const lang = () => root.lang === 'he' ? 'he' : 'en';

  /* ── theme ── */
  const themeBtn = $('#themeBtn'), themeLbl = $('#themeLbl');
  // initial theme is applied pre-paint by the head script (saved choice → system)
  const syncTheme = () => {
    const dark = root.dataset.theme === 'dark';
    themeLbl.textContent = dark ? T[lang()].light : T[lang()].dark;
    themeBtn.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  };
  themeBtn.onclick = () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    syncTheme();
  };

  /* ── language ── */
  const langBtn = $('#langBtn'), langLbl = $('#langLbl');
  const setLang = l => {
    root.lang = l;
    root.dir = l === 'he' ? 'rtl' : 'ltr';
    try { localStorage.setItem('lang', l); } catch (e) {}
    document.title = T[l].title;
    $$('[data-en]').forEach(el => { el.innerHTML = el.dataset[l]; });
    $$('.tile').forEach(t => t.dataset.empty = T[l].empty);
    langLbl.textContent = T[l].langBtn;
    langBtn.setAttribute('aria-label', T[l].langAria);
    syncTheme();
    if (lb.hasAttribute('open')) paint();
  };
  langBtn.onclick = () => setLang(lang() === 'he' ? 'en' : 'he');

  /* ── missing art → placeholder ── */
  const miss = img => img.closest('.tile, .photo')?.classList.add('empty');
  const watchImg = img => {
    img.addEventListener('error', () => miss(img));
    if (img.complete && img.naturalWidth === 0) miss(img);
  };
  $$('.photo img').forEach(watchImg);   // hero photo is static; tiles are watched after render

  /* ── reveal on scroll ── */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .1 });
  $$('.rv').forEach((el, i) => { el.style.transitionDelay = `${Math.min(i % 5, 4) * 60}ms`; io.observe(el); });

  /* ── filters ── */
  $$('.filter').forEach(f => f.onclick = () => {
    $$('.filter').forEach(o => o.setAttribute('aria-pressed', String(o === f)));
    $$('.tile').forEach(t => t.hidden = f.dataset.cat !== 'all' && t.dataset.cat !== f.dataset.cat);
  });

  /* ── lightbox ── */
  const lb = $('#lb'), lbImg = $('#lbImg'), lbTitle = $('#lbTitle'), lbMeta = $('#lbMeta'), lbDesc = $('#lbDesc');
  let idx = 0, list = [];
  const live = () => $$('.tile').filter(t => !t.hidden && !t.classList.contains('empty'));
  function paint(){
    const t = list[idx]; if (!t) return;
    const img = t.querySelector('img');
    lbImg.src = img.src; lbImg.alt = img.alt;
    lbTitle.textContent = t.querySelector('figcaption').textContent;
    lbMeta.textContent = T[lang()].of(idx + 1, list.length);
    const desc = t.dataset.desc || '';
    lbDesc.textContent = desc;
    lbDesc.hidden = !desc;
  }
  const open = t => {
    list = live(); idx = list.indexOf(t); if (idx < 0) return;
    paint(); lb.setAttribute('open',''); $('#lbClose').focus();
    document.body.style.overflow = 'hidden';
  };
  const close = () => { lb.removeAttribute('open'); document.body.style.overflow = ''; };
  const step = d => { idx = (idx + d + list.length) % list.length; paint(); };

  function wireTiles(){
    $$('#grid .tile').forEach(t => {
      const img = t.querySelector('img');
      if (img) watchImg(img);
      t.onclick = () => !t.classList.contains('empty') && open(t);
      t.onkeydown = e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!t.classList.contains('empty')) open(t); }
      };
    });
  }
  $('#lbClose').onclick = close;
  $('#lbPrev').onclick = () => step(-1);
  $('#lbNext').onclick = () => step(1);
  lb.onclick = e => { if (e.target === lb) close(); };
  addEventListener('keydown', e => {
    if (!lb.hasAttribute('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft')  step(root.dir === 'rtl' ? 1 : -1);
    if (e.key === 'ArrowRight') step(root.dir === 'rtl' ? -1 : 1);
  });

  /* ── gallery from the CMS (art/gallery.json, edited at /admin) ── */
  const grid = $('#grid');
  const okCat = c => c === 'draw' || c === 'anim' || c === 'sketch';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
  const pad = n => String(n).padStart(2, '0');

  function tileHTML(item, i){
    const cat  = okCat(item.category) ? item.category : 'draw';
    const en   = esc(item.title || '');
    const he   = esc(item.title_he || item.title || '');
    const desc = esc((item.description || '').replace(/\s+/g, ' ').trim());
    const cap  = lang() === 'he' ? he : en;
    const alt  = esc(item.description || item.title || 'Artwork');
    const loop = cat === 'anim' ? '<span class="loop">LOOP</span>' : '';
    return `<figure class="tile" data-cat="${cat}" data-desc="${desc}" tabindex="0">`
         + `<span class="frame">${pad(i + 1)}</span>${loop}`
         + `<img src="${esc(item.image)}" alt="${alt}">`
         + `<figcaption data-en="${en}" data-he="${he}">${cap}</figcaption>`
         + `</figure>`;
  }

  async function renderGallery(){
    let items = [];
    try {
      const res = await fetch('art/gallery.json', { cache: 'no-store' });
      if (res.ok) { const data = await res.json(); if (Array.isArray(data.items)) items = data.items; }
    } catch (e) { /* missing/offline → empty state below */ }

    if (!items.length){
      grid.innerHTML = `<figure class="tile empty" data-empty="${esc(T[lang()].empty)}"><img alt=""></figure>`;
    } else {
      grid.innerHTML = items.filter(it => it && it.image).map(tileHTML).join('');
      wireTiles();
    }
    grid.setAttribute('aria-busy', 'false');
  }

  /* ── boot ── */
  const year = new Date().getFullYear();
  $$('[data-en]').forEach(el => {
    el.dataset.en = el.dataset.en.replace('2026', year);
    el.dataset.he = el.dataset.he.replace('2026', year);
  });
  setLang(root.lang === 'he' ? 'he' : 'en');
  renderGallery();
})();
