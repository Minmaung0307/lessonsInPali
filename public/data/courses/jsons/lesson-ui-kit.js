
/*! Lesson UI Kit (vanilla JS) — drop-in library
 *  Exposes: window.LessonUI.render(container, blocks)
 *  Each block is a JSON object with { type, ...props }
 *  v1.0
 */
(function(){
  const STYLE_ID = 'lesson-ui-kit-styles';

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const css = `
      .lui-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;box-shadow:0 2px 6px rgba(0,0,0,.06);}
      .lui-stack{display:flex;flex-direction:column;gap:.5rem}
      .lui-row{display:flex;align-items:center;gap:.5rem}
      .lui-muted{color:#6b7280}
      .lui-hr{height:1px;background:#d1d5db;border:0;margin:.5rem 0}
      .lui-badge{display:inline-block;border-radius:999px;padding:.15rem .5rem;font-size:.8rem;font-weight:600}
      .lui-kbd{display:inline-block;border-radius:6px;border:1px solid #e5c9c9;background:#fff4f4;font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;padding:.05rem .35rem}
      .lui-code{background:#f7f7f8;border-radius:12px;border:1px solid #ececec;padding:12px 14px;overflow:auto;font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;font-size:14px;line-height:1.6}
      .lui-token{display:inline-block;border-radius:8px;border:1px solid #e6b7b7;background:#fff0f0;padding:.05rem .35rem}
      .lui-callout{position:relative;padding:16px 16px 16px 18px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb}
      .lui-callout .lui-leftbar{position:absolute;left:0;top:0;bottom:0;width:8px;border-radius:12px 0 0 12px;background:#2e70b2}
      .lui-callout .lui-floater{position:absolute;left:-26px;top:18px;width:56px;height:56px;border-radius:50%;background:#2e70b2;display:grid;place-items:center;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.12)}
      .lui-callout h4{margin:.15rem 0 .35rem;font-size:1.1rem}
      .lui-toggle{cursor:pointer;text-decoration:underline;text-underline-offset:3px;color:#2e70b2;font-weight:700}
      .lui-hidden{display:none}
      /* hero */
      .lesson-hero{background:#fff}
    `;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  const esc = (s)=>String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  function renderLessonHero(sec){
    const radius = sec.radius ?? 12;
    const topH   = sec.top?.height ?? 200;
    const bandH  = sec.band?.height ?? 140;

    const wrap = document.createElement('section');
    wrap.className = 'lesson-hero';
    wrap.style.cssText = `position:relative;overflow:hidden;border-radius:${radius}px;box-shadow:0 8px 20px rgba(0,0,0,.12);`;

    const top = document.createElement('div');
    top.style.cssText = `position:relative;height:${topH}px;background:${sec.top?.bg || '#345a6a'};`;
    (sec.top?.icons || []).forEach(ic => {
      const d = document.createElement('div');
      const size = ic.size || 160;
      d.style.cssText = `position:absolute;left:${ic.x||0}px;top:${ic.y||0}px;width:${size}px;height:${size}px;border-radius:50%;background:${ic.bg||'#cfe8fa'};opacity:${ic.opacity??1};display:grid;place-items:center;${ic.ringWidth?`box-shadow:0 0 0 ${ic.ringWidth}px ${ic.ring};`:''}`;
      if (ic.src){
        const img = document.createElement('img');
        img.src = ic.src; img.alt = ''; img.style.cssText = `width:${Math.round(size*0.48)}px;height:${Math.round(size*0.48)}px;object-fit:contain;`;
        d.appendChild(img);
      }
      top.appendChild(d);
    });
    wrap.appendChild(top);

    const band = document.createElement('div');
    band.style.cssText = `position:relative;height:${bandH}px;background:${sec.band?.bg || '#d2d6d9'};display:flex;align-items:center;padding-left:${(sec.badge?.offsetX ?? 24) + (sec.badge?.size ?? 140) + 24}px;`;

    if (sec.badge){
      const b = sec.badge; const S=b.size||140; const left=b.offsetX??24; const topPos=-Math.round(S*.35)+(b.offsetY??0);
      if (b.ring && b.ringWidth){
        const ring=document.createElement('div');
        const rSize=S+b.ringWidth*2;
        ring.style.cssText=`position:absolute;left:${left-b.ringWidth}px;top:${topH+topPos-b.ringWidth}px;width:${rSize}px;height:${rSize}px;border-radius:50%;background:${b.ring};filter:drop-shadow(0 4px 10px rgba(0,0,0,.15));`;
        band.appendChild(ring);
      }
      const c=document.createElement('div');
      c.style.cssText=`position:absolute;left:${left}px;top:${topH+topPos}px;width:${S}px;height:${S}px;border-radius:50%;background:${b.bg||'#2e70b2'};color:${b.color||'#fff'};display:grid;place-items:center;font-weight:800;font-size:${Math.round(S*0.34)}px;`;
      c.textContent=b.text||''; band.appendChild(c);
    }

    if (sec.title){
      const t=document.createElement('h1');
      t.textContent=sec.title.text||'';
      t.style.cssText=`margin:0;font-size:${sec.title.fontSize||44}px;font-weight:${sec.title.weight||800};color:${sec.title.color||'#2e70b2'};-webkit-text-stroke:${sec.title.strokeWidth||0}px ${sec.title.stroke||'transparent'};text-shadow:0 2px 0 rgba(255,255,255,.35);`;
      band.appendChild(t);
    }
    wrap.appendChild(band);
    return wrap;
  }

  function renderCallout(b){
    const div=document.createElement('div');
    div.className='lui-callout';
    const bar=document.createElement('span'); bar.className='lui-leftbar'; bar.style.background=b.barColor||b.color||'#2e70b2';
    const body=document.createElement('div'); body.className='lui-stack'; body.style.marginLeft='8px';
    if (b.icon){
      const f=document.createElement('span'); f.className='lui-floater';
      f.style.background=b.color||'#2e70b2';
      f.innerHTML=`<img src="${esc(b.icon)}" style="width:28px;height:28px;opacity:.95" alt="">`;
      div.appendChild(f);
    }
    if (b.title){
      const h=document.createElement('h4');
      h.textContent=b.title;
      h.style.color=b.color||'#2e70b2';
      body.appendChild(h);
    }
    (b.items||[]).forEach(p=>{
      const el=document.createElement('div');
      el.innerHTML=esc(p).replace(/\n/g,'<br>');
      body.appendChild(el);
    });
    div.append(bar, body);
    return div;
  }

  function renderPause(b){
    const box=document.createElement('div');
    box.className='lui-callout';
    const bar=document.createElement('span'); bar.className='lui-leftbar'; bar.style.background=b.color||'#2e70b2';
    const icon=document.createElement('span'); icon.className='lui-floater'; icon.style.background=b.color||'#2e70b2';
    icon.innerHTML=`<img src="${esc(b.icon || '/img/ic-question.svg')}" alt="" style="width:28px;height:28px">`;
    const inner=document.createElement('div'); inner.className='lui-stack'; inner.style.marginLeft='8px';
    const h=document.createElement('h4'); h.textContent=b.title||'PAUSE'; h.style.color=b.color||'#2e70b2';
    const hr=document.createElement('div'); hr.className='lui-hr';
    const q=document.createElement('div'); q.textContent=b.question||''; q.style.margin='6px 0';
    const link=document.createElement('a'); link.href='javascript:void(0)'; link.className='lui-toggle'; link.textContent=b.toggleLabel || 'Show Answer';
    const ans=document.createElement('div'); ans.className='lui-hidden'; ans.style.marginTop='6px'; ans.innerHTML=esc(b.answer||'');
    link.addEventListener('click', ()=>{ ans.classList.toggle('lui-hidden'); link.textContent = ans.classList.contains('lui-hidden') ? (b.toggleLabel||'Show Answer') : (b.toggleHide||'Hide Answer'); });
    inner.append(h, hr, q, link, ans);
    box.append(bar, icon, inner);
    return box;
  }

  function renderProTip(b){
    const out=document.createElement('div'); out.className='lui-callout';
    const bar=document.createElement('span'); bar.className='lui-leftbar'; bar.style.background=b.color||'#2e70b2';
    const icon=document.createElement('span'); icon.className='lui-floater'; icon.style.background=b.color||'#2e70b2';
    icon.innerHTML=`<img src="${esc(b.icon || '/img/ic-diamond.svg')}" alt="" style="width:26px;height:26px">`;
    const link=document.createElement('a'); link.href='javascript:void(0)'; link.className='lui-toggle'; link.textContent=b.label||'SHOW PRO TIP';
    const body=document.createElement('div'); body.className='lui-hidden'; body.style.marginTop='10px'; body.innerHTML=esc(b.text||'').replace(/\n/g,'<br>');
    link.addEventListener('click', ()=>{ body.classList.toggle('lui-hidden'); link.textContent = body.classList.contains('lui-hidden') ? (b.label||'SHOW PRO TIP') : (b.hideLabel||'HIDE PRO TIP'); });
    const inner=document.createElement('div'); inner.append(link, body);
    out.append(bar, icon, inner);
    return out;
  }

  function renderCode(b){
    const pre=document.createElement('pre'); pre.className='lui-code';
    let code = String(b.code||'');
    (b.highlight||[]).forEach(tok=>{
      const re=new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')}\\b`,'g');
      code = code.replace(re, m=>`<span class="lui-token">${esc(m)}</span>`);
    });
    pre.innerHTML = code;
    return pre;
  }

  const renderers = {
    lessonHero : renderLessonHero,
    infoTip    : renderCallout,
    warningTip : (b)=>{ b.color=b.color||'#d97706'; return renderCallout(b); },
    successTip : (b)=>{ b.color=b.color||'#17803d'; return renderCallout(b); },
    toolTip    : (b)=>{ b.color=b.color||'#374151'; return renderCallout(b); },
    nerdNote   : renderCallout,
    pauseBlock : renderPause,
    proTip     : renderProTip,
    codeBlock  : renderCode
  };

  function render(container, blocks){
    injectStyles();
    const host = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!host) return;
    (blocks||[]).forEach(b=>{
      const fn = renderers[b.type];
      if (!fn) return;
      host.appendChild(fn(b));
    });
  }

  function renderOne(block){
    injectStyles();
    const fn = renderers[block?.type];
    if (!fn) return '';
    return fn(block);
  }

  window.LessonUI = { render, renderOne, renderers };
})();
