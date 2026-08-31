// ──────────────────────────────────────────────────────────────
//  Shared agent UI helpers — Hanna and Sisay
// ──────────────────────────────────────────────────────────────
//  Both panels used to write model output with `textContent`, which is
//  safe but renders markdown as literal characters: a full URL sat in
//  the bubble and stretched the panel, and a markdown table came out as
//  a wall of pipes.
//
//  This renders a deliberately SMALL subset — links, bold, italic, code,
//  bullet and numbered lists, and tables — and escapes everything first.
//  Model output goes into innerHTML, so escaping is not optional: escape,
//  then re-introduce only the tags we chose.
// ──────────────────────────────────────────────────────────────

function tgEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Trim a URL for display so it can never stretch the panel. */
function tgPrettyUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    return u.pathname.length > 1 ? host + '/…' : host;
  } catch { return url.length > 32 ? url.slice(0, 30) + '…' : url; }
}

function tgInline(text) {
  let s = text;
  // [label](url) first, so bare-URL matching cannot eat the parenthesised half
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, url) => `<a href="${url}" target="_blank" rel="noopener">${label}</a>`);
  // Bare URLs — shown by host, never in full
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    (_, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener">${tgPrettyUrl(url)}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

/** Markdown table → a real table, in a horizontally scrollable wrapper. */
function tgTable(rows) {
  const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => tgInline(c.trim()));
  const head = cells(rows[0]);
  const body = rows.slice(2).map(cells);          // rows[1] is the --- separator
  return '<div class="ag-tablewrap"><table class="ag-table"><thead><tr>'
    + head.map(h => `<th>${h}</th>`).join('')
    + '</tr></thead><tbody>'
    + body.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('')
    + '</tbody></table></div>';
}

/**
 * Render a model reply. Input is escaped before any markup is added.
 */
function tgRenderMarkdown(raw) {
  const lines = tgEscape(raw == null ? '' : raw).split('\n');
  const out = [];
  let list = null;                                  // 'ul' | 'ol' | null

  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table: a pipe row followed by a --- separator row
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      closeList();
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++]);
      i--;
      out.push(tgTable(rows));
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      const want = ul ? 'ul' : 'ol';
      if (list !== want) { closeList(); out.push(`<${want}>`); list = want; }
      out.push(`<li>${tgInline((ul || ol)[1])}</li>`);
      continue;
    }

    closeList();
    if (line.trim() === '') {
      /*  A blank line BETWEEN two blocks is just a paragraph break, and <p>
          already carries a margin — emitting <br> as well produced a visible
          hole between paragraphs. Only keep the <br> where it is doing real
          work: leading spacing, or a run of blank lines the writer meant. */
      const prev = out[out.length - 1] || '';
      // Nothing emitted yet: a leading blank line would just push the first
      // line down inside the bubble.
      if (!out.length) continue;
      if (/<\/(p|ul|ol|div)>$/.test(prev)) continue;
      out.push('<br>');
      continue;
    }
    out.push(`<p>${tgInline(line)}</p>`);
  }
  closeList();
  return out.join('');
}

/**
 * Paint contextual reply chips into a container.
 *
 * The static openers are the cold start. The moment an agent asks a
 * question back, the guest should be able to tap the answer instead of
 * typing it — otherwise a conversation that ends in "want the links?"
 * forces them to type "yes".
 */
function tgPaintChips(containerId, choices, send, fallbackHtml) {
  const box = document.getElementById(containerId);
  if (!box) return;
  if (!choices || !choices.length) {
    if (fallbackHtml != null) box.innerHTML = fallbackHtml;
    return;
  }
  box.innerHTML = choices.slice(0, 4).map(c => {
    const label = tgEscape(c.label || c.send || '');
    const value = tgEscape(c.send || c.label || '').replace(/'/g, '&#39;');
    return `<button data-send="${value}">${label}</button>`;
  }).join('');
  box.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => send(b.dataset.send));
  });
}

/** Tool definition both agents share, so the wording stays identical. */
const TG_CHOICES_TOOL = {
  name: 'offer_choices',
  description: 'Offer 2–4 tappable replies. Call this WHENEVER your reply ends in a question, '
             + 'so the person can tap an answer instead of typing it. The choices must be direct '
             + 'answers to the question you just asked.',
  input_schema: {
    type: 'object', required: ['choices'],
    properties: {
      choices: {
        type: 'array', minItems: 2, maxItems: 4,
        items: {
          type: 'object', required: ['label', 'send'],
          properties: {
            label: { type: 'string', description: 'Up to 4 words, shown on the chip' },
            send:  { type: 'string', description: 'The message to send if tapped' },
          },
        },
      },
    },
  },
};
