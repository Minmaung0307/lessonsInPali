function renderLessonHero(sec) {
  const radius = sec.radius ?? 12;
  const topH   = sec.top?.height ?? 200;
  const bandH  = sec.band?.height ?? 140;

  // container
  const wrap = document.createElement('section');
  wrap.className = 'lesson-hero';
  wrap.style.cssText = `
    position:relative; overflow:hidden; border-radius:${radius}px;
    box-shadow:0 8px 20px rgba(0,0,0,.12); background:#fff;`;

  // ---- TOP area (icons) ----
  const top = document.createElement('div');
  top.style.cssText = `
    position:relative; height:${topH}px; background:${sec.top?.bg || '#345a6a'};
  `;
  (sec.top?.icons || []).forEach(ic => {
    const d = document.createElement('div');
    const size = ic.size || 160;
    d.style.cssText = `
      position:absolute; left:${ic.x || 0}px; top:${ic.y || 0}px;
      width:${size}px; height:${size}px; border-radius:50%;
      background:${ic.bg || '#cfe8fa'}; opacity:${ic.opacity ?? 1};
      display:grid; place-items:center;
      ${ic.ringWidth ? `box-shadow:0 0 0 ${ic.ringWidth}px ${ic.ring};` : ''}
      border:${(ic.ringWidth ? 0 : (ic.ring ? 1 : 0))}px solid ${ic.ring || 'transparent'};
    `;
    if (ic.src) {
      const img = document.createElement('img');
      img.src = ic.src;
      img.alt = '';
      img.style.cssText = `
        width:${Math.round(size*0.48)}px; height:${Math.round(size*0.48)}px; object-fit:contain; opacity:.95;
        filter:drop-shadow(0 1px 0 rgba(0,0,0,.15));
      `;
      d.appendChild(img);
    }
    top.appendChild(d);
  });
  wrap.appendChild(top);

  // ---- BOTTOM band (badge + title) ----
  const band = document.createElement('div');
  band.style.cssText = `
    position:relative; height:${bandH}px; background:${sec.band?.bg || '#d2d6d9'};
    display:flex; align-items:center; padding-left:${(sec.badge?.offsetX ?? 24) + (sec.badge?.size ?? 140) + 24}px;
  `;

  // badge (circle + outer ring)
  if (sec.badge) {
    const b = sec.badge;
    const S = b.size || 140;
    const left = b.offsetX ?? 24;
    const topPos = -Math.round(S * 0.35) + (b.offsetY ?? 0); // top section ထဲကို တိုက်ဝင်အောင်

    // outer ring
    if (b.ring && b.ringWidth) {
      const ring = document.createElement('div');
      const rSize = S + b.ringWidth * 2;
      ring.style.cssText = `
        position:absolute; left:${left - b.ringWidth}px;
        top:${topH + topPos - b.ringWidth}px;
        width:${rSize}px; height:${rSize}px; border-radius:50%;
        background:${b.ring};
        filter:drop-shadow(0 4px 10px rgba(0,0,0,.15));
      `;
      band.appendChild(ring);
    }

    // main circle
    const c = document.createElement('div');
    c.style.cssText = `
      position:absolute; left:${left}px; top:${topH + topPos}px;
      width:${S}px; height:${S}px; border-radius:50%;
      background:${b.bg || '#2e70b2'}; color:${b.color || '#fff'};
      display:grid; place-items:center; font-weight:800; font-size:${Math.round(S*0.34)}px;
      text-shadow:0 2px 0 rgba(0,0,0,.15);
    `;
    c.textContent = b.text || '';
    band.appendChild(c);
  }

  // title
  if (sec.title) {
    const t = document.createElement('h1');
    t.textContent = sec.title.text || '';
    t.style.cssText = `
      margin:0; font-size:${sec.title.fontSize || 44}px; font-weight:${sec.title.weight || 800};
      color:${sec.title.color || '#2e70b2'};
      -webkit-text-stroke:${sec.title.strokeWidth || 0}px ${sec.title.stroke || 'transparent'};
      text-shadow:0 2px 0 rgba(255,255,255,.35);
    `;
    band.appendChild(t);
  }

  wrap.appendChild(band);
  return wrap.outerHTML;
}