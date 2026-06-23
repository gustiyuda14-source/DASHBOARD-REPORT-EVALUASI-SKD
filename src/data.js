import { CSV_URLS, COLORS } from './config.js';

function parseCSVText(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const cols = [];
    let inQuote = false, cur = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function buildHeaders(row1, row2) {
  let group = '';
  return row1.map((cell, i) => {
    if (cell) group = cell;
    return { group, sub: (row2[i] || '').trim() };
  });
}

function intOrNull(val) {
  const s = (val || '').trim();
  if (s === '' || s === '0' && false) return null; // keep 0 as valid
  const n = parseInt(s);
  return isNaN(n) ? null : n;
}

function parseSKD(rows) {
  const headers = buildHeaders(rows[0], rows[1]);
  return rows.slice(2).filter(r => r[0]).map((row, idx) => {
    const s = { nama: row[0].trim(), gender: row[1].trim(), color: COLORS[idx] || '#888', skd: {}, toefl: {}, jasmani: {}, psiko: {} };
    headers.forEach((h, i) => {
      const m = h.group.match(/^TRYOUT (\d+)$/);
      if (!m || !h.sub || h.sub === 'TOTAL') return;
      const n = parseInt(m[1]);
      if (!s.skd[n]) s.skd[n] = {};
      s.skd[n][h.sub] = intOrNull(row[i]);
    });
    Object.keys(s.skd).forEach(n => {
      const t = s.skd[n];
      const allNull = t.TWK == null && t.TIU == null && t.TKP == null;
      if (allNull) { s.skd[n] = null; return; }
      const incomplete = t.TWK == null || t.TIU == null || t.TKP == null;
      s.skd[n] = { TWK: t.TWK ?? 0, TIU: t.TIU ?? 0, TKP: t.TKP ?? 0 };
      s.skd[n].Total = s.skd[n].TWK + s.skd[n].TIU + s.skd[n].TKP;
      if (incomplete) s.skd[n].incomplete = true;
    });
    return s;
  });
}

function mergeTOEFL(students, rows) {
  const headers = buildHeaders(rows[0], rows[1]);
  const map = Object.fromEntries(students.map(s => [s.nama, s]));
  rows.slice(2).filter(r => r[0]).forEach(row => {
    const s = map[row[0].trim()];
    if (!s) return;
    headers.forEach((h, i) => {
      const m = h.group.match(/^TOEFL (\d+)$/);
      if (!m || !h.sub || h.sub === 'JUMLAH NILAI') return;
      const n = parseInt(m[1]);
      if (!s.toefl[n]) s.toefl[n] = {};
      s.toefl[n][h.sub.toLowerCase().replace(/ /g, '_')] = intOrNull(row[i]);
    });
    Object.keys(s.toefl).forEach(n => {
      const t = s.toefl[n];
      const vals = [t.listening, t.reading, t.writing];
      if (vals.every(v => v == null)) { s.toefl[n] = null; return; }
      s.toefl[n].total = vals.reduce((a, v) => a + (v || 0), 0);
    });
  });
}

function mergeJASMANI(students, rows) {
  const headers = buildHeaders(rows[0], rows[1]);
  const map = Object.fromEntries(students.map(s => [s.nama, s]));
  const fieldMap = { 'LARI 12 MENIT': 'lari12', 'PUSH UP': 'pushup', 'PULL UP/CHIN UP': 'pullup', 'SIT UP': 'situp', 'LARI ANGKA 8': 'lariAngka8' };
  rows.slice(2).filter(r => r[0]).forEach(row => {
    const s = map[row[0].trim()];
    if (!s) return;
    headers.forEach((h, i) => {
      const m = h.group.match(/^EVALUASI (\d+)$/);
      if (!m || !h.sub) return;
      const n = parseInt(m[1]);
      const key = fieldMap[h.sub] || h.sub;
      if (!s.jasmani[n]) s.jasmani[n] = {};
      s.jasmani[n][key] = intOrNull(row[i]);
    });
    Object.keys(s.jasmani).forEach(n => {
      const allNull = Object.values(s.jasmani[n]).every(v => v == null);
      if (allNull) s.jasmani[n] = null;
    });
  });
}

function mergePSIKO(students, rows) {
  const headers = buildHeaders(rows[0], rows[1]);
  const map = Object.fromEntries(students.map(s => [s.nama, s]));
  rows.slice(2).filter(r => r[0]).forEach(row => {
    const s = map[row[0].trim()];
    if (!s) return;
    headers.forEach((h, i) => {
      const m = h.group.match(/^TRYOUT (\d+)$/);
      if (!m || !h.sub) return;
      const n = parseInt(m[1]);
      if (!s.psiko[n]) s.psiko[n] = {};
      s.psiko[n][h.sub.toLowerCase()] = intOrNull(row[i]);
    });
    Object.keys(s.psiko).forEach(n => {
      const allNull = Object.values(s.psiko[n]).every(v => v == null);
      if (allNull) s.psiko[n] = null;
    });
  });
}

export async function fetchAllData() {
  const [skdText, toeflText, jasmaniText, psikoText] = await Promise.all(
    Object.values(CSV_URLS).map(url => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.text(); }))
  );
  const students = parseSKD(parseCSVText(skdText));
  mergeTOEFL(students, parseCSVText(toeflText));
  mergeJASMANI(students, parseCSVText(jasmaniText));
  mergePSIKO(students, parseCSVText(psikoText));
  return students;
}
