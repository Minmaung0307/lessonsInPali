/*! Lesson UI Kit (vanilla) — extended for id/class/data attributes */
(function(){
  const STYLE_ID = 'lesson-ui-kit-styles';
  const css = `/* existing CSS kept unchanged */`;
  function ensureCSS(){
    if (!document.getElementById(STYLE_ID)){
      const s=document.createElement('style');
      s.id=STYLE_ID;
      s.textContent=css;
      document.head.appendChild(s);
    }
  }

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function applyTokens(html, tokens){
    if (!Array.isArray(tokens)||!tokens.length) return html;
    let out=html;
    tokens.forEach(t=>{
      const text=String(t.text||t);
      const rx=new RegExp('\\b'+text.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')+'\\b','g');
      out = out.replace(rx, m=>{
        if (t.type==='mark') return `<mark class="lu-mark">${esc(m)}</mark>`;
        return `<span class="lu-kbd">${esc(m)}</span>`;
      });
    });
    return out;
  }

  function el(tag, attrs={}, html){
    const n=document.createElement(tag);
    for(const k in attrs){
      const v=attrs[k];
      if(v==null) continue;
      if(k==='class') n.className=v;
      else if(k==='style' && typeof v==='object') Object.assign(n.style,v);
      else if(k.startsWith('on') && typeof v==='function') n.addEventListener(k.slice(2),v);
      else n.setAttribute(k,v);
    }
    if(html!=null) n.innerHTML=html;
    return n;
  }

  // helpers for id/class/data pass-through
  function joinClass(){
    return Array.from(arguments).filter(Boolean).join(' ');
  }
  function dataAttrs(obj){
    const out={};
    if(!obj||typeof obj!=='object') return out;
    for(const k in obj){
      const v=obj[k];
      if(v!=null) out['data-'+k]=String(v);
    }
    return out;
  }

  function toHtml(txt,tokens){ return applyTokens(esc(txt||'').replace(/\n/g,'<br>'),tokens); }

  // === Block renderers ===
  const R={
    hero(b){
      const wrap=el('div',{id:b.id,class:joinClass('lu-card','lu-hero',b.class),...dataAttrs(b.data)});
      const top=el('div',{class:'lu-hero-top'});
      const icons=el('div',{class:'lu-hero-icons'});
      (b.icons||[]).forEach(ic=>{
        const c=el('div',{style:{width:'180px',height:'180px',borderRadius:'50%',background:ic.bg||'#9fc7dd',display:'flex',alignItems:'center',justifyContent:'center'}}, ic.html||`<span style="font-size:52px">💠</span>`);
        icons.appendChild(c);
      });
      top.appendChild(icons);
      const bottom=el('div',{class:'lu-hero-bottom'});
      bottom.appendChild(el('div',{class:'lu-badge'},esc(b.badge||'1.0')));
      bottom.appendChild(el('div',{class:'lu-title'},esc(b.title||'Lesson Title')));
      wrap.appendChild(top);wrap.appendChild(bottom);
      return wrap;
    },

    tip(b){
      const cls=joinClass('lu-tip',b.variant||b.style||'important',b.class);
      const wrap=el('div',{id:b.id,class:cls,...dataAttrs(b.data)});
      const title=el('div',{class:'lu-tip-title'},esc(b.title||'TIP'));
      const body=el('div',{class:'lu-leftbar'},toHtml(b.text,b.tokens));
      wrap.appendChild(title);wrap.appendChild(body);
      return wrap;
    },

    nerdNote(b){
      const wrap=el('div',{id:b.id,class:joinClass('lu-note',b.class),...dataAttrs(b.data)});
      wrap.appendChild(el('div',{class:'lu-gutter'}));
      const bub=el('div',{class:'lu-bubble'},b.iconHtml||'👓');
      wrap.appendChild(bub);
      wrap.appendChild(el('div',{class:'lu-content'},`<div class="lu-h2">${esc(b.title||'NERD NOTE')}</div><div class="lu-text">${toHtml(b.text,b.tokens)}</div>`));
      return wrap;
    },

    pauseBlock(b){
      const wrap=el('div',{id:b.id,class:joinClass('lu-pause',b.class),...dataAttrs(b.data)});
      wrap.appendChild(el('div',{class:'lu-dot'},b.badge||'⏸'));
      wrap.appendChild(el('div',{class:'lu-title'},esc(b.title||'PAUSE')));
      wrap.appendChild(el('div',{class:'lu-ask'},toHtml(b.question)));
      const link=el('a',{href:'#',class:'lu-toggle'},esc(b.toggleLabel||'Show Answer'));
      const ans=el('div',{class:'lu-text lu-hidden'},toHtml(b.answer));
      link.addEventListener('click',e=>{
        e.preventDefault();
        const hidden=ans.classList.toggle('lu-hidden');
        link.textContent=hidden?(b.toggleLabel||'Show Answer'):(b.hideLabel||'Hide Answer');
      });
      wrap.appendChild(link);wrap.appendChild(ans);
      return wrap;
    },

    proTip(b){
      const row=el('div',{id:b.id,class:joinClass('lu-protip',b.class),...dataAttrs(b.data)});
      row.appendChild(el('div',{class:'lu-diamond'},b.iconHtml||'💎'));
      const a=el('a',{href:'#',class:'lu-toggle'},esc(b.title||'SHOW PRO TIP'));
      row.appendChild(a);
      const card=el('div',{class:'lu-card lu-hidden'},toHtml(b.text,b.tokens));
      a.addEventListener('click',e=>{
        e.preventDefault();
        const hidden=card.classList.toggle('lu-hidden');
        a.textContent=hidden?(b.title||'SHOW PRO TIP'):(b.hideTitle||'HIDE PRO TIP');
      });
      const wrap=el('div');
      wrap.appendChild(row);wrap.appendChild(card);
      return wrap;
    },

    text(b){ return el('div',{id:b.id,class:joinClass('lu-text',b.class),...dataAttrs(b.data)},toHtml(b.text,b.tokens)); },
    h1(b){ return el('h3',{id:b.id,class:joinClass('lu-h1',b.class),...dataAttrs(b.data)},esc(b.text||'')); },
    h2(b){ return el('h4',{id:b.id,class:joinClass('lu-h2',b.class),...dataAttrs(b.data)},esc(b.text||'')); },
    hr(b){ return el('div',{id:b.id,class:joinClass('lu-hr',b.class),...dataAttrs(b.data)}); },
    code(b){ const pre=el('pre',{id:b.id,class:joinClass('lu-code',b.class),...dataAttrs(b.data)}); pre.innerHTML=esc(b.code||''); return pre; },
    html(b){ return el('div',{id:b.id,class:b.class,...dataAttrs(b.data)},b.html||''); }
  };

  function renderBlocks(container,blocks,opts={}){
    ensureCSS();
    const host=(typeof container==='string')?document.querySelector(container):container;
    if(!host) return;
    const arr=Array.isArray(blocks)?blocks:(blocks&&blocks.blocks)||[];
    const frag=document.createDocumentFragment();
    const stack=el('div',{class:'lu-stack'});
    if(opts.accent) stack.style.setProperty('--lu-accent',opts.accent);
    arr.forEach(b=>{
      if(!b||!b.type) return;
      const fn=R[b.type]||R.text;
      stack.appendChild(fn(b));
    });
    frag.appendChild(stack);
    host.appendChild(frag);
  }

  window.LessonUI={ render:renderBlocks };
})();