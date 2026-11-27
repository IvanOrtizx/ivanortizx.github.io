import { CONFIG } from './config.js?v=1';
import { ES, DYN } from './i18n.js?v=1';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
};

/* ---------------- language ---------------- */
const EN = {};
function snapshot() {
  $$('[data-i18n]').forEach(el => { EN[el.dataset.i18n] ??= el.textContent; });
  $$('[data-i18n-html]').forEach(el => { EN[el.dataset.i18nHtml] ??= el.innerHTML; });
  $$('[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.split(';').forEach(p => {
    const [attr, key] = p.split(':'); EN[key] ??= el.getAttribute(attr);
  }));
}
let lang = 'en';
const t = k => DYN[lang][k] ?? DYN.en[k] ?? k;
function applyLang(next) {
  lang = next === 'es' ? 'es' : 'en';
  const dict = lang === 'es' ? ES : EN;
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach(el => { const v = dict[el.dataset.i18n] ?? EN[el.dataset.i18n]; if (v != null) el.textContent = v; });
  $$('[data-i18n-html]').forEach(el => { const v = dict[el.dataset.i18nHtml] ?? EN[el.dataset.i18nHtml]; if (v != null) el.innerHTML = v; });
  $$('[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.split(';').forEach(p => {
    const [attr, key] = p.split(':'); const v = dict[key] ?? EN[key]; if (v != null) el.setAttribute(attr, v);
  }));
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  $$('.add').forEach(syncAddLabel);
  store.set('sp-lang', lang);
}

/* ---------------- dates ---------------- */
function todayLA() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: CONFIG.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return p; // YYYY-MM-DD
}
function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  const parts = new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' }).formatToParts(d);
  const g = k => (parts.find(p => p.type === k) || {}).value;
  return lang === 'es' ? `${g('weekday')} ${g('day')} de ${g('month')}` : `${g('weekday')}, ${g('month')} ${g('day')}`;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function api(params) {
  const res = await fetch(CONFIG.api, { method: 'POST', body: new URLSearchParams(params) });
  if (!res.ok) throw new Error('http ' + res.status);
  return res.json();
}
// returns 'free' | 'busy' | 'unknown'
async function checkDate(iso) {
  if (!CONFIG.api) return 'unknown';
  try {
    const data = await api({ action: 'availability', date: iso });
    if (data && data.ok) return data.available ? 'free' : 'busy';
  } catch { /* fall through */ }
  return 'unknown';
}

/* ---------------- header ---------------- */
function initMenu() {
  const btn = $('#menuBtn'), nav = $('#nav');
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  $$('a', nav).forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }));
}

/* ---------------- items: cards <-> form ---------------- */
const itemBox = v => $(`#itemChecks input[value="${v}"]`);
function syncAddLabel(btn) {
  const on = btn.getAttribute('aria-pressed') === 'true';
  btn.textContent = on ? t('added') : t('add');
}
function initCards() {
  $$('.card').forEach(card => {
    const v = card.dataset.item;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'add'; btn.dataset.item = v; btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', '');
    btn.addEventListener('click', () => {
      const box = itemBox(v); box.checked = !box.checked; box.dispatchEvent(new Event('change', { bubbles: true }));
    });
    $('.card-body', card).append(btn);
    syncAddLabel(btn);
    btn.removeAttribute('aria-label');
  });
  $('#itemChecks').addEventListener('change', e => {
    const v = e.target.value;
    const btn = $(`.add[data-item="${v}"]`);
    if (btn) { btn.setAttribute('aria-pressed', String(e.target.checked)); syncAddLabel(btn); }
    $('#itemChecks').classList.remove('invalid');
  });
}

/* ---------------- date checker (hero) ---------------- */
function setFormDate(iso) { const f = $('#fDate'); if (f && !f.value) f.value = iso; else if (f) f.value = iso; }
function initDateCheck() {
  const min = todayLA();
  ['#dcDate', '#fDate', '#chatDate'].forEach(s => { const el = $(s); if (el) el.min = min; });
  $('#dateCheck').addEventListener('submit', async e => {
    e.preventDefault();
    const out = $('#dcOut'), iso = $('#dcDate').value;
    if (!iso) { out.textContent = t('dcEmpty'); return; }
    if (iso < min) { out.textContent = t('dcPast'); return; }
    out.textContent = '…';
    const r = await checkDate(iso);
    const key = r === 'free' ? 'dcFree' : r === 'busy' ? 'dcBusy' : 'dcPreview';
    out.innerHTML = `${esc(t(key).replace('{d}', fmtDate(iso)))} <a href="#request">${esc(t('dcLink'))}</a>`;
    setFormDate(iso);
  });
}

/* ---------------- chat assistant ---------------- */
function initChat() {
  const fab = $('#chatFab'), box = $('#chat'), log = $('#chatLog');
  const say = (html, me = false) => {
    const m = document.createElement('div'); m.className = 'msg' + (me ? ' me' : ''); m.innerHTML = html;
    log.append(m); log.scrollTop = log.scrollHeight; return m;
  };
  const open = (v) => {
    box.hidden = !v; fab.setAttribute('aria-expanded', String(v));
    if (v && !log.children.length) say(esc(t('chatHi')));
    if (v) $('#chatDate').focus();
  };
  fab.addEventListener('click', () => open(box.hidden));
  $('#chatX').addEventListener('click', () => { open(false); fab.focus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) { open(false); fab.focus(); } });
  $('#chatForm').addEventListener('submit', async e => {
    e.preventDefault();
    const iso = $('#chatDate').value;
    if (!iso || iso < todayLA()) { say(esc(t(iso ? 'dcPast' : 'chatNoDate'))); return; }
    say(esc(t('chatAsk').replace('{d}', fmtDate(iso))), true);
    const typing = say('…');
    const r = await checkDate(iso);
    const key = r === 'free' ? 'chatFree' : r === 'busy' ? 'chatBusy' : 'chatPreview';
    typing.innerHTML = `${esc(t(key).replace('{d}', fmtDate(iso)))}<div class="opts"><a href="#request" data-go>${esc(t('chatForm'))}</a><a href="sms:${CONFIG.phone}">${esc(t('chatText'))}</a></div>`;
    $('[data-go]', typing).addEventListener('click', () => { setFormDate(iso); open(false); });
  });
}

/* ---------------- gallery ---------------- */
function initGallery() {
  const dlg = $('#lightbox'), img = $('img', dlg);
  $$('.g').forEach(g => g.addEventListener('click', () => {
    const src = $('img', g); img.src = src.src; img.alt = src.alt; dlg.showModal();
  }));
  $('.lb-x', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
}

/* ---------------- request form ---------------- */
function initForm() {
  const form = $('#reqForm'), msg = $('#formMsg'), btn = $('#reqBtn');
  const started = Date.now();
  const fail = (el, key) => { if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); } msg.textContent = t(key); msg.hidden = false; return false; };
  form.addEventListener('input', e => e.target.removeAttribute('aria-invalid'));

  function validate() {
    $$('[aria-invalid]', form).forEach(el => el.removeAttribute('aria-invalid'));
    msg.hidden = true;
    const v = id => $(id).value.trim();
    if (v('#fName').length < 2) return fail($('#fName'), 'errName');
    const digits = v('#fPhone').replace(/\D/g, '');
    if (!(digits.length === 10 || (digits.length === 11 && digits[0] === '1'))) return fail($('#fPhone'), 'errPhone');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('#fEmail'))) return fail($('#fEmail'), 'errEmail');
    if (!v('#fDate') || v('#fDate') < todayLA()) return fail($('#fDate'), 'errDate');
    if (!v('#fStart')) return fail($('#fStart'), 'errStart');
    if (!v('#fType')) return fail($('#fType'), 'errType');
    if (v('#fAddr').length < 3) return fail($('#fAddr'), 'errAddr');
    if (!$$('#itemChecks input:checked').length) { $('#itemChecks').classList.add('invalid'); $('#itemChecks input').focus(); msg.textContent = t('errItems'); msg.hidden = false; return false; }
    if (!$('#fConsent').checked) return fail($('#fConsent'), 'errConsent');
    return true;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate()) return;
    const fd = new FormData(form);
    if (fd.get('company') || Date.now() - started < 2500) { done(); return; } // bot
    const label = btn.textContent; btn.disabled = true; btn.textContent = t('sending');
    const items = $$('#itemChecks input:checked').map(i => i.closest('label').textContent.trim());
    const payload = {
      action: 'request', name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'),
      eventDate: fd.get('eventDate'), startTime: fd.get('startTime'), endTime: fd.get('endTime') || '',
      eventType: fd.get('eventType'), guests: fd.get('guests') || '', address: fd.get('address'), place: fd.get('place'),
      items: items.join(', '), notes: fd.get('notes') || '', consent: 'yes', consentText: $('#fConsent').nextElementSibling.textContent,
      lang, page: location.href
    };
    try {
      if (CONFIG.api) {
        const data = await api(payload);
        if (!data || data.ok === false) throw new Error('rejected');
      } else {
        await new Promise(r => setTimeout(r, 700)); // preview mode
      }
      done();
    } catch {
      msg.textContent = t('errSend'); msg.hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  });

  function done() {
    form.hidden = true; const d = $('#reqDone'); d.hidden = false; d.focus();
  }
  $('#reqAgain').addEventListener('click', () => {
    form.reset(); $$('.add').forEach(b => { b.setAttribute('aria-pressed', 'false'); syncAddLabel(b); });
    $('#reqDone').hidden = true; form.hidden = false; $('#fName').focus();
  });
}

/* ---------------- boot ---------------- */
snapshot();
initCards();
const q = new URLSearchParams(location.search).get('lang');
applyLang(q || store.get('sp-lang') || ((navigator.language || '').startsWith('es') ? 'es' : 'en'));
$$('.lang button').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang)));
initMenu();
initDateCheck();
initChat();
initGallery();
initForm();
