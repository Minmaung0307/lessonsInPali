
/*! Lesson UI Kit (vanilla) — supports hero, section, tip (important/warning/success),
   nerdNote, pauseBlock, proTip, code, video, lists, inline tokens, and generic text.
   Usage:
     LessonUI.render('#lessonBlocks', blocksArrayOrObjectWithBlocks);
*/
(function(){
  const STYLE_ID = 'lesson-ui-kit-styles';
  const css = `
  /* ======== Lesson UI Kit base ======== */
  .lu-stack{display:flex;flex-direction:column;gap:.75rem}
  .lu-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 1px 2px rgba(16,24,40,.04);padding:14px}
  .lu-hero{border-radius:16px;overflow:hidden}
  .lu-hero .lu-hero-top{background:#36586a;color:#e8f1f6;padding:26px}
  .lu-hero .lu-hero-icons{display:flex;gap:24px;flex-wrap:wrap;align-items:center}
  .lu-hero .lu-hero-bottom{background:#d4d7da;padding:18px 20px;display:flex;align-items:center;gap:16px}
  .lu-hero .lu-badge{min-width:92px;height:92px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:#2f6fa5;color:#fff;font-weight:800;font-size:28px;border:6px solid #c9d3dd}
  .lu-hero .lu-title{font-size:38px;font-weight:800;line-height:1.1;color:#1e3c57}

  .lu-h1{font-size:26px;font-weight:800;margin:.25rem 0;color:var(--lu-accent,#1e3a8a)}
  .lu-h2{font-size:20px;font-weight:700;margin:.25rem 0;color:var(--lu-accent,#1f4b7a)}
  .lu-text{font-size:16px;line-height:1.6}
  .lu-hr{height:1px;background:linear-gradient(90deg,#0000,#c7cdd4,#0000);border:0;margin:.5rem 0}

  .lu-list{padding-left:1.25rem}
  .lu-list li{margin:.25rem 0}
  .lu-dlist .lu-dl{display:flex;gap:.5rem;align-items:center}
  .lu-dl .btn{margin-left:auto}

  .btn{background:#155e75;color:#fff;border:1px solid #0e4a5f;border-radius:10px;padding:.5rem .75rem;cursor:pointer}
  .btn.ghost{background:#fff;color:#0e4a5f}
  .btn[href]{text-decoration:none;display:inline-flex;align-items:center;gap:.35rem}
  .btn.small{padding:.25rem .5rem;font-size:.9rem;border-radius:8px}

  .lu-tip{position:relative;border-radius:12px;border:1px solid #e5e7eb;background:#fafafa;padding:14px 16px}
  .lu-tip .lu-tip-title{display:inline-block;font-weight:800;margin-bottom:.35rem;border:3px solid currentColor;
    padding:.15rem .5rem;border-radius:6px}
  .lu-tip .lu-leftbar{border-left:8px solid currentColor;padding-left:12px}
  .lu-tip.important{color:#1e6aa7}
  .lu-tip.warning{color:#a15a00;background:#fffaf0;border-color:#ffe8bd}
  .lu-tip.success{color:#127a3a;background:#f1fbf4;border-color:#ccebd7}

  .lu-note{position:relative;padding:14px 16px;border-radius:12px;border:1px solid #e5e7eb;background:#f7f7f7}
  .lu-note .lu-gutter{position:absolute;left:0;top:8px;bottom:8px;width:22px;border-radius:8px;background:#3b7b3b}
  .lu-note .lu-bubble{position:absolute;left:-22px;top:22px;width:78px;height:78px;border-radius:50%;background:#4f9460;
    display:flex;align-items:center;justify-content:center;color:#fff;font-size:34px;box-shadow:0 1px 2px rgba(16,24,40,.12)}
  .lu-note .lu-content{margin-left:18px}

  .lu-pause{position:relative;padding:14px 16px;border-radius:12px;border:1px solid #e5e7eb;background:#f7f7f7}
  .lu-pause .lu-dot{position:absolute;left:-22px;top:20px;width:78px;height:78px;border-radius:50%;background:#2f6fa5;color:#fff;
    display:flex;align-items:center;justify-content:center;font:700 38px/1.1 ui-sans-serif,system-ui}
  .lu-pause .lu-title{font-weight:800;color:#1f4980}
  .lu-pause .lu-ask{border-top:1px solid #cbd5e1;margin:.5rem 0;padding-top:.5rem}
  .lu-pause .lu-toggle{color:#1f4980;text-decoration:underline;cursor:pointer}
  .lu-hidden{display:none !important}

  .lu-protip{position:relative;padding:14px 16px;border-radius:999px;border:1px solid #e5e7eb;background:#f7f7f7;display:flex;align-items:center;gap:12px}
  .lu-protip .lu-diamond{width:78px;height:78px;border-radius:50%;background:#2f6fa5;color:#fff;display:flex;align-items:center;justify-content:center;font-size:36px}
  .lu-protip .lu-toggle{font-weight:800;color:#1f4b7a;text-decoration:underline;cursor:pointer}
  .lu-protip + .lu-card{margin-top:.5rem}

  .lu-code{background:#fbfaf9;border:1px solid #eee;border-radius:10px;padding:14px 16px;font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;line-height:1.6;overflow:auto}
  .lu-code .kw{color:#8f2b8f;font-weight:600}
  .lu-code .fn{color:#2c7bb6}
  .lu-code .op{color:#476582}
  .lu-code .cm{color:#8590a2;font-style:italic}
  .lu-kbd{display:inline-block;padding:.05rem .4rem;border:1px solid #d1d5db;border-radius:.4rem;background:#fff;color:#a33; font-weight:700}
  mark.lu-mark{background:#fce7f3;padding:.05rem .2rem;border-radius:.2rem}

  .lu-media{border-radius:12px;overflow:hidden}
  .lu-media iframe,.lu-media video{width:100%;height:100%;border:0;display:block}
  `;
  function ensureCSS(){
    if (!document.getElementById(STYLE_ID)){
      const s=document.createElement('style'); s.id=STYLE_ID; s.textContent = css; document.head.appendChild(s);
    }
  }

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  // Inline tokens (kbd/mark/badge)
  function applyTokens(html, tokens){
    if (!Array.isArray(tokens) || !tokens.length) return html;
    let out = html;
    tokens.forEach(t=>{
      const text = String(t.text || t);
      const rx = new RegExp('\\b'+text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','g');
      if (t.type === 'mark'){
        out = out.replace(rx, m=> `<mark class="lu-mark">${esc(m)}</mark>`);
      } else { // default kbd
        out = out.replace(rx, m=> `<span class="lu-kbd">${esc(m)}</span>`);
      }
    });
    return out;
  }

  // Trivial syntax highlighting (best-effort)
  function highlight(code, lang){
    let s = esc(code);
    // comments
    s = s.replace(/(\/\/.*?$)/gm, '<span class="cm">$1</span>');
    s = s.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="cm">$1</span>');
    // strings
    s = s.replace(/(&quot;.*?&quot;|'.*?'|`.*?`)/g, '<span class="op">$1</span>');
    // keywords
    const kw = '\\b(const|let|var|function|return|if|else|for|while|class|new|import|export|await|async|try|catch|throw)\\b';
    s = s.replace(new RegExp(kw,'g'), '<span class="kw">$1</span>');
    // HTML tags
    s = s.replace(/(&lt;\/?)([a-zA-Z0-9\-]+)(.*?&gt;)/g, '$1<span class="fn">$2</span>$3');
    return s;
  }

  function el(tag, attrs={}, html){
    const n = document.createElement(tag);
    for (const k in attrs){
      const v = attrs[k];
      if (v==null) continue;
      if (k==='class') n.className = v;
      else if (k==='style' && typeof v==='object') Object.assign(n.style, v);
      else if (k.startsWith('on') && typeof v==='function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    if (html!=null) n.innerHTML = html;
    return n;
  }

  // === Block renderers ===
  const R = {
    hero(b){
      const wrap = el('div', {class:'lu-card lu-hero'});
      const top = el('div', {class:'lu-hero-top'});
      const icons = el('div', {class:'lu-hero-icons'});
      (b.icons||[]).forEach(ic=>{
        const c = el('div', {style:{width:'180px',height:'180px',borderRadius:'50%',background: ic.bg||'#9fc7dd',display:'flex',alignItems:'center',justifyContent:'center'}}, ic.html || `<span style="font-size:52px">💠</span>`);
        icons.appendChild(c);
      });
      top.appendChild(icons);
      const bottom = el('div', {class:'lu-hero-bottom'});
      const badge = el('div', {class:'lu-badge'}, esc(b.number || '1.0'));
      const title = el('div', {class:'lu-title'}, esc(b.title || 'Lesson Title'));
      bottom.appendChild(badge); bottom.appendChild(title);
      wrap.appendChild(top); wrap.appendChild(bottom);
      return wrap;
    },
    h1(b){ return el('h3',{class:'lu-h1'}, esc(b.text||'')); },
    h2(b){ return el('h4',{class:'lu-h2'}, esc(b.text||'')); },
    hr(){ return el('div',{class:'lu-hr'}); },
    text(b){
      const html = applyTokens(esc(b.text||'').replace(/\n/g,'<br>'), b.tokens);
      return el('div',{class:'lu-text'}, html);
    },
    list(b){
      const isOl = b.ordered;
      const n = el(isOl?'ol':'ul', {class:'lu-list'});
      (b.items||[]).forEach(it=>{
        // item could be string or {text, href}
        if (typeof it === 'string'){ n.appendChild(el('li',{}, esc(it))); }
        else {
          const t = esc(it.text||'');
          const a = it.href ? `<a href="${esc(it.href)}" target="_blank" rel="noopener">${t}</a>` : t;
          n.appendChild(el('li',{}, a));
        }
      });
      return n;
    },
    downloads(b){
      const wrap = el('div',{class:'lu-card lu-dlist'});
      (b.items||[]).forEach(it=>{
        const row = el('div',{class:'lu-dl'});
        row.appendChild(el('div',{}, esc(it.name||'')));
        if (it.href){
          row.appendChild(el('a',{class:'btn small', href: it.href, download: ''}, 'Download'));
        }
        wrap.appendChild(row);
      });
      return wrap;
    },
    video(b){
      const yid = (b.url||'').match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
      if (yid){
        const box = el('div',{class:'lu-media', style:{position:'relative',paddingBottom:'56.25%',height:'0'}});
        const ifr = el('iframe',{src:`https://www.youtube.com/embed/${yid[1]}`, allow:'accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share', allowfullscreen:''});
        ifr.style.position='absolute'; ifr.style.inset='0';
        box.appendChild(ifr); return box;
      }
      const v = el('div',{class:'lu-media', style:{position:'relative',paddingBottom:'56.25%',height:'0'}});
      const vd = el('video',{src:b.url||'', controls:''}); vd.style.position='absolute'; vd.style.inset='0';
      v.appendChild(vd); return v;
    },
    tip(b){
      const cl = `lu-tip ${b.variant||'important'}`;
      const wrap = el('div',{class:cl});
      const title = el('div',{class:'lu-tip-title'}, esc(b.title||'IMPORTANT'));
      const body = el('div',{class:'lu-leftbar'}, applyTokens(esc(b.text||''), b.tokens));
      wrap.appendChild(title); wrap.appendChild(body); return wrap;
    },
    nerdNote(b){
      const wrap = el('div',{class:'lu-note'});
      wrap.appendChild(el('div',{class:'lu-gutter'}));
      const bub = el('div',{class:'lu-bubble'}, b.iconHtml || '👓');
      wrap.appendChild(bub);
      wrap.appendChild(el('div',{class:'lu-content'}, `<div class="lu-h2">${esc(b.title||'NERD NOTE')}</div><div class="lu-text">${applyTokens(esc(b.text||''), b.tokens)}</div>`));
      return wrap;
    },
    pause(b){
      const wrap = el('div',{class:'lu-pause'});
      wrap.appendChild(el('div',{class:'lu-dot'}, '?'));
      wrap.appendChild(el('div',{class:'lu-title'}, esc(b.title||'PAUSE')));
      wrap.appendChild(el('div',{class:'lu-ask'}, esc(b.question||'')));
      const link = el('a',{href:'#', class:'lu-toggle'}, esc(b.toggleLabel||'Show Answer'));
      const ans = el('div',{class:'lu-text lu-hidden'} , esc(b.answer||''));
      link.addEventListener('click', (e)=>{ e.preventDefault(); const on = !ans.classList.contains('lu-hidden'); ans.classList.toggle('lu-hidden', on); link.textContent = on ? (b.toggleLabel||'Show Answer') : (b.hideLabel||'Hide Answer'); });
      wrap.appendChild(link); wrap.appendChild(ans); return wrap;
    },
    proTip(b){
      const row = el('div',{class:'lu-protip'});
      row.appendChild(el('div',{class:'lu-diamond'}, b.iconHtml || '💎'));
      const a = el('a',{href:'#', class:'lu-toggle'}, esc(b.title||'SHOW PRO TIP'));
      row.appendChild(a);
      const card = el('div',{class:'lu-card lu-hidden'}, applyTokens(esc(b.text||''), b.tokens));
      a.addEventListener('click', (e)=>{ e.preventDefault(); const vis = card.classList.toggle('lu-hidden'); a.textContent = vis ? (b.title||'SHOW PRO TIP') : (b.hideTitle||'HIDE PRO TIP'); });
      const wrap = el('div'); wrap.appendChild(row); wrap.appendChild(card); return wrap;
    },
    code(b){
      const pre = el('pre',{class:'lu-code'});
      pre.innerHTML = highlight(b.code||'', b.lang);
      return pre;
    },
    html(b){
      return el('div',{}, b.html||'');
    }
  };

  function renderBlocks(container, blocks){
    ensureCSS();
    const host = (typeof container==='string') ? document.querySelector(container) : container;
    if (!host) return;
    const arr = Array.isArray(blocks) ? blocks : (blocks && blocks.blocks) || [];
    const frag = document.createDocumentFragment();
    const stack = el('div',{class:'lu-stack'});
    arr.forEach(b=>{
      if (!b || !b.type) return;
      const fn = R[b.type] || R.text;
      const node = fn(b);
      stack.appendChild(node);
    });
    frag.appendChild(stack);
    host.appendChild(frag);
  }

  // Public API
  window.LessonUI = {
    render: renderBlocks
  };
})();