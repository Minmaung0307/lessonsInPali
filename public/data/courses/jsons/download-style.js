/* ---------- Helpers ---------- */
function escapeHtml(s="") {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function getYouTubeId(u="") {
  try {
    const m = u.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : "";
  } catch { return ""; }
}

/* ---------- Core renderer ---------- */
function renderLessonFromJson(data, mountEl) {
  if (!mountEl || !data) return;

  // Chapter header (optional)
  let chapterHeader = "";
  if (data.chapterTitle) {
    const st = data.chapterStyle || {};
    const styleStr = [
      st.backgroundColor ? `background:${st.backgroundColor}` : "",
      st.borderLeft      ? `border-left:${st.borderLeft}`     : "",
      st.borderRadius    ? `border-radius:${st.borderRadius}` : "border-radius:50px 0 0 50px",
      "padding:1rem",
      "margin:0 0 1rem",
    ].filter(Boolean).join(";");

    chapterHeader = `
      <div class="card" style="${styleStr}">
        <h3 style="margin:0">${escapeHtml(data.chapterTitle)}</h3>
      </div>
    `;
  }

  // Content blocks
  const blocks = (data.contents || []).map((section) => renderSection(section)).join("");

  mountEl.innerHTML = chapterHeader + blocks;
}

/* ---------- Section renderer ---------- */
function renderSection(sec) {
  const type = (sec.type || "").toLowerCase();

  switch (type) {
    case "heading": {
      const lvl   = Math.min(6, Math.max(1, Number(sec.level || 1)));
      const color = sec.color ? ` style="color:${sec.color}"` : "";
      return `<h${lvl}${color}>${escapeHtml(sec.text || "")}</h${lvl}>`;
    }

    case "text": {
      // If link is provided: make the whole text clickable
      const body = escapeHtml(sec.text || "");
      if (sec.link) {
        const target = sec.external === false ? "" : ` target="_blank" rel="noopener"`;
        return `<p><a href="${sec.link}"${target}>${body}</a></p>`;
      }
      return `<p>${body}</p>`;
    }

    case "list": {
      const ordered = !!sec.ordered;
      const tag = ordered ? "ol" : "ul";
      const items = (sec.items || []).map((it) => {
        const icon = it.icon ? `${escapeHtml(it.icon)} ` : "";
        const text = escapeHtml(String(it.text || ""));
        if (it.link) {
          const target = it.external === false ? "" : ` target="_blank" rel="noopener"`;
          return `<li>${icon}<a href="${it.link}"${target}>${text}</a></li>`;
        }
        return `<li>${icon}${text}</li>`;
      }).join("");
      return `<${tag} class="${ordered ? 'ol' : 'ul'}">${items}</${tag}>`;
    }

    case "video": {
      const url = String(sec.url || "");
      const yid = getYouTubeId(url);
      const title = sec.title ? `<div class="muted" style="margin:.25rem 0 .5rem">${escapeHtml(sec.title)}</div>` : "";
      if (yid) {
        // YouTube embed
        return `
          <div class="card">
            ${title}
            <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px">
              <iframe src="https://www.youtube.com/embed/${yid}" allowfullscreen
                style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"></iframe>
            </div>
          </div>
        `;
      }
      // direct video file
      return `
        <div class="card">
          ${title}
          <video src="${url}" controls style="width:100%;border-radius:12px"></video>
        </div>
      `;
    }

    case "image": {
      const url = String(sec.url || "");
      const alt = escapeHtml(sec.alt || "");
      const cap = sec.caption ? `<div class="muted" style="margin:.25rem 0 0">${escapeHtml(sec.caption)}</div>` : "";
      return `
        <div class="card">
          <img src="${url}" alt="${alt}" style="max-width:100%;height:auto;border-radius:12px" />
          ${cap}
        </div>
      `;
    }

    case "divider":
    case "hr":
      return `<hr class="muted" />`;

    default:
      // Unknown → link or raw text fallback
      if (sec.url) {
        const text = escapeHtml(sec.text || sec.url);
        return `<p><a href="${sec.url}" target="_blank" rel="noopener">${text}</a></p>`;
      }
      return sec.text ? `<p>${escapeHtml(sec.text)}</p>` : "";
  }
}

// somewhere after you fetched the lesson JSON:
const lessonJson = await fetch('/data/lesson-01.json').then(r=>r.json());
const host = document.getElementById('lessonBlocks');
renderLessonFromJson(lessonJson, host);