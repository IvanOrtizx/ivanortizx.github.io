/**
 * Super Muffler Inc. - website contacts back office
 * -------------------------------------------------
 * Every contact sent from the website form lands as a new row (newest on top)
 * in the "Contacts" tab of this Google Sheet. Optionally emails the shop.
 *
 * Setup (once):
 *   1. Open the Google Sheet > Extensions > Apps Script, paste this file.
 *   2. Run  setup  (authorize when asked).
 *   3. Deploy > New deployment > Web app
 *        Execute as: Me    |    Who has access: Anyone
 *      Copy the Web app URL (ends in /exec) into js/config.js -> formEndpoint.
 *   4. Optional: put the shop's email in NOTIFY_EMAILS below and deploy a new version.
 */

const SETTINGS = {
  SHEET_NAME: 'Contacts',
  // Who gets an email for each new contact. Comma separated. Leave '' to turn emails off.
  NOTIFY_EMAILS: '',
  TIMEZONE: 'America/Los_Angeles',
  SHOP_NAME: 'Super Muffler Inc.'
};

const HEADERS = [
  'Received', 'Status', 'Name', 'Phone', 'Email', 'Vehicle', 'Service', 'Message',
  'Contact by', 'Language', 'Heard about us', 'Offers opt-in', 'Consent', 'Consent text',
  'Page', 'Referrer', 'UTM source', 'UTM medium', 'UTM campaign', 'Notes', 'ID'
];
const STATUSES = ['New', 'Contacted', 'Came in', 'Customer', 'Not interested', 'Spam'];
const COL = name => HEADERS.indexOf(name) + 1;

/* ------------------------------------------------------------------ */
/*  Web endpoints                                                      */
/* ------------------------------------------------------------------ */
function doGet() {
  return json_({ ok: true, service: SETTINGS.SHOP_NAME + ' contacts' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const p = (e && e.parameter) || {};
    if (p.company) return json_({ ok: true });                       // bot trap

    const name = clean_(p.name, 80);
    const digits = String(p.phone || '').replace(/\D/g, '');
    if (name.length < 2 || digits.length < 10 || digits.length > 11) return json_({ ok: false, error: 'invalid' });
    if (p.consent !== 'yes') return json_({ ok: false, error: 'consent' });

    // ignore double taps: same phone within 2 minutes
    const cache = CacheService.getScriptCache();
    if (cache.get('p' + digits)) return json_({ ok: true, duplicate: true });
    cache.put('p' + digits, '1', 120);

    const lead = {
      received: new Date(),
      status: 'New',
      name: name,
      phone: formatPhone_(digits),
      email: clean_(p.email, 120),
      vehicle: clean_(p.vehicle, 80),
      service: clean_(p.service, 60),
      message: clean_(p.message, 1000),
      contactPref: clean_(p.contactPref, 10),
      lang: p.lang === 'es' ? 'Spanish' : 'English',
      source: clean_(p.source, 40),
      offers: p.offers === 'yes' ? 'Yes' : 'No',
      consent: 'Yes',
      consentText: clean_(p.consentText, 400),
      page: clean_(p.page, 200),
      referrer: clean_(p.referrer, 200),
      utmSource: clean_(p.utm_source, 80),
      utmMedium: clean_(p.utm_medium, 80),
      utmCampaign: clean_(p.utm_campaign, 80),
      id: Utilities.getUuid().slice(0, 8)
    };

    lock.waitLock(15000);
    const sheet = getSheet_();
    sheet.insertRowBefore(2);
    const row = sheet.getRange(2, 1, 1, HEADERS.length);
    row.setValues([[
      lead.received, lead.status, lead.name, lead.phone, lead.email, lead.vehicle, lead.service, lead.message,
      lead.contactPref, lead.lang, lead.source, lead.offers, lead.consent, lead.consentText,
      lead.page, lead.referrer, lead.utmSource, lead.utmMedium, lead.utmCampaign, '', lead.id
    ]]);
    row.setFontWeight('normal').setFontColor('#1b1e25').setBackground(null).setWrap(false);
    sheet.getRange(2, COL('Received')).setNumberFormat('yyyy-mm-dd h:mm am/pm');
    sheet.getRange(2, COL('Status')).setDataValidation(statusRule_());
    SpreadsheetApp.flush();
    lock.releaseLock();

    notify_(lead, sheet);
    return json_({ ok: true, id: lead.id });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  } finally {
    try { lock.releaseLock(); } catch (e) { /* already released */ }
  }
}

/* ------------------------------------------------------------------ */
/*  Sheet setup and menu                                              */
/* ------------------------------------------------------------------ */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Super Muffler')
    .addItem('Mark selected rows as Contacted', 'markContacted')
    .addItem('Send a test contact', 'sendTestContact')
    .addSeparator()
    .addItem('Set up / repair the sheet', 'setup')
    .addToUi();
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(SETTINGS.TIMEZONE);
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());

  let sheet = ss.getSheetByName(SETTINGS.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SETTINGS.SHEET_NAME, 0);
  const blank = ss.getSheets().filter(s => s.getName() !== SETTINGS.SHEET_NAME && s.getLastRow() === 0);
  blank.forEach(s => { if (ss.getSheets().length > 1) ss.deleteSheet(s); });

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setFontColor('#ffffff').setBackground('#0c1a3d').setVerticalAlignment('middle');
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(3);
  sheet.setRowHeight(1, 32);

  const widths = { Received: 150, Status: 120, Name: 160, Phone: 130, Email: 200, Vehicle: 170, Service: 200, Message: 280, 'Consent text': 260, Page: 200, Referrer: 180, Notes: 240 };
  HEADERS.forEach((h, i) => sheet.setColumnWidth(i + 1, widths[h] || 110));

  const last = Math.max(sheet.getMaxRows(), 500);
  if (sheet.getMaxRows() < last) sheet.insertRowsAfter(sheet.getMaxRows(), last - sheet.getMaxRows());
  sheet.getRange(2, COL('Received'), last - 1, 1).setNumberFormat('yyyy-mm-dd h:mm am/pm');
  sheet.getRange(2, COL('Status'), last - 1, 1).setDataValidation(statusRule_());

  // colours by status (range starts at row 1 so new rows inserted at the top stay covered)
  const all = sheet.getRange(1, 1, last, HEADERS.length);
  const s = 'B';
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$' + s + '1="New"').setBackground('#fde8e7').setRanges([all]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$' + s + '1="Contacted"').setBackground('#fff6d6').setRanges([all]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=OR($' + s + '1="Came in",$' + s + '1="Customer")').setBackground('#e3f4e9').setRanges([all]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=OR($' + s + '1="Not interested",$' + s + '1="Spam")').setFontColor('#8a8f9c').setRanges([all]).build()
  ]);

  sheet.getRange(1, COL('Status')).setNote('New = not contacted yet. Change it after calling the customer.');
  sheet.getRange(1, COL('Notes')).setNote('Free space for the shop: what was quoted, when they are coming in, etc.');
  return 'Ready';
}

function markContacted() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== SETTINGS.SHEET_NAME) return;
  const sel = sheet.getActiveRangeList();
  if (!sel) return;
  sel.getRanges().forEach(r => {
    for (let i = r.getRow(); i < r.getRow() + r.getNumRows(); i++) {
      if (i > 1) sheet.getRange(i, COL('Status')).setValue('Contacted');
    }
  });
}

function sendTestContact() {
  const res = doPost({ parameter: {
    name: 'Test Contact', phone: '(805) 555-0123', email: '', vehicle: '2015 Silverado 1500',
    service: 'Muffler or exhaust repair', message: 'This is a test from the Apps Script menu.',
    contactPref: 'Call', source: 'Other', consent: 'yes', consentText: 'Test', offers: 'no', lang: 'en',
    page: 'apps-script-test'
  } });
  SpreadsheetApp.getActive().toast(res.getContent(), 'Test contact');
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function getSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SETTINGS.SHEET_NAME);
  if (!sheet) { setup(); sheet = ss.getSheetByName(SETTINGS.SHEET_NAME); }
  return sheet;
}

function statusRule_() {
  return SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
}

// trims, limits length and blocks spreadsheet formulas
function clean_(v, max) {
  let s = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max || 200);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function formatPhone_(d) {
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : d;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function esc_(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function notify_(lead, sheet) {
  const to = (SETTINGS.NOTIFY_EMAILS || '').trim();
  if (!to) return;
  try {
    const rows = [
      ['Name', lead.name], ['Phone', lead.phone], ['Email', lead.email], ['Vehicle', lead.vehicle],
      ['Needs', lead.service], ['Message', lead.message], ['Contact by', lead.contactPref],
      ['Language', lead.lang], ['Heard about us', lead.source], ['Offers opt-in', lead.offers]
    ].filter(r => r[1]);
    const tel = lead.phone.replace(/\D/g, '');
    const html =
      '<div style="font-family:Arial,sans-serif;font-size:15px;color:#1b1e25">' +
      '<p style="margin:0 0 12px"><strong>New contact from the website.</strong></p>' +
      '<table cellpadding="6" style="border-collapse:collapse">' +
      rows.map(r => '<tr><td style="color:#555b68;border-bottom:1px solid #eee">' + esc_(r[0]) + '</td><td style="border-bottom:1px solid #eee">' + esc_(r[1]) + '</td></tr>').join('') +
      '</table>' +
      '<p style="margin:16px 0"><a href="tel:+1' + tel + '" style="background:#d7261e;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Call ' + esc_(lead.phone) + '</a></p>' +
      '<p style="margin:0;color:#555b68">All contacts: <a href="' + sheet.getParent().getUrl() + '">open the sheet</a></p>' +
      '</div>';
    const msg = {
      to: to,
      subject: 'New website contact: ' + lead.name + (lead.service ? ' (' + lead.service + ')' : ''),
      htmlBody: html,
      name: SETTINGS.SHOP_NAME + ' website'
    };
    if (lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) msg.replyTo = lead.email;
    MailApp.sendEmail(msg);
  } catch (err) {
    console.error('Email failed: ' + err);
  }
}
