export const CSV_URLS = {
  skd:     'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhtiMS4y1P7A9gNnSuUVgf29r3Hmc4rWfABDsxPQGN0pPPwiftwXrcZ83F47DH2vR4b8REjL_DSO1M/pub?gid=999999&single=true&output=csv',
  toefl:   'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhtiMS4y1P7A9gNnSuUVgf29r3Hmc4rWfABDsxPQGN0pPPwiftwXrcZ83F47DH2vR4b8REjL_DSO1M/pub?gid=888888&single=true&output=csv',
  jasmani: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhtiMS4y1P7A9gNnSuUVgf29r3Hmc4rWfABDsxPQGN0pPPwiftwXrcZ83F47DH2vR4b8REjL_DSO1M/pub?gid=1116711241&single=true&output=csv',
  psiko:   'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhtiMS4y1P7A9gNnSuUVgf29r3Hmc4rWfABDsxPQGN0pPPwiftwXrcZ83F47DH2vR4b8REjL_DSO1M/pub?gid=100001&single=true&output=csv'
};

export const SKD  = { TWK: 65, TIU: 80, TKP: 166, Total: 311 };
export const MAX  = { TWK: 150, TIU: 175, TKP: 225, Total: 550 };

export const COLORS = [
  '#60A5FA','#F472B6','#2DD4BF','#FBBF24','#A78BFA','#4ADE80',
  '#FB923C','#F87171','#A3E635','#F43F5E','#6366F1','#E879F9','#22D3EE'
];

export const JASMANI_STANDARDS = {
  L: {
    lari12:     { max: 3444, min: 1349, inverted: false },
    pushup:     { max: 42,   min: 1,    inverted: false },
    pullup:     { max: 17,   min: 1,    inverted: false },
    situp:      { max: 40,   min: 1,    inverted: false },
    lariAngka8: { max: 16.2, min: 26.1, inverted: true  },
  },
  P: {
    lari12:     { max: 3095, min: 1013, inverted: false },
    pushup:     { max: 37,   min: 1,    inverted: false },
    pullup:     { max: 72,   min: 1,    inverted: false },
    situp:      { max: 50,   min: 1,    inverted: false },
    lariAngka8: { max: 17.6, min: 27.5, inverted: true  },
  },
};

// Grade: A≥80 (Baik Sekali), B 61-79 (Cukup), C 41-60 (Kurang), TMS <41 atau salah satu item <41
export function calcJasmani(gender, data) {
  const std = JASMANI_STANDARDS[gender] || JASMANI_STANDARDS.L;
  const score = (key, val) => {
    if (val == null || val <= 0) return null;
    const r = std[key];
    if (r.inverted) {
      if (val <= r.max) return 100;
      if (val >= r.min) return 1;
      return Math.round(1 + ((r.min - val) / (r.min - r.max)) * 99);
    }
    if (val >= r.max) return 100;
    if (val <= r.min) return 1;
    return Math.round(1 + ((val - r.min) / (r.max - r.min)) * 99);
  };
  const s = {
    lari12:     score('lari12',     data.lari12),
    pushup:     score('pushup',     data.pushup),
    pullup:     score('pullup',     data.pullup),
    situp:      score('situp',      data.situp),
    lariAngka8: score('lariAngka8', data.lariAngka8),
  };
  const defined = Object.values(s).filter(v => v !== null);
  if (!defined.length) return null;
  const nilaiA = s.lari12 ?? 0;
  const bItems = [s.pushup, s.pullup, s.situp, s.lariAngka8].filter(v => v !== null);
  const nilaiB = bItems.length ? bItems.reduce((a, b) => a + b, 0) / bItems.length : 0;
  const total = Math.round((nilaiA + nilaiB) / 2);
  const isTms = Object.values(s).some(v => v !== null && v < 41);
  const grade = isTms ? 'TMS' : total >= 80 ? 'A' : total >= 61 ? 'B' : total >= 41 ? 'C' : 'TMS';
  return { scores: s, nilaiA, nilaiB: Math.round(nilaiB), total, grade };
}

export const GRADE_LABELS = { A: 'Baik Sekali', B: 'Cukup / Batas Aman', C: 'Kurang / Rawan', TMS: 'Tidak Memenuhi Syarat' };
export const GRADE_COLORS = { A: '#10B981', B: '#F59E0B', C: '#FB923C', TMS: '#EF4444' };

export const PERSONAL_INSIGHTS = {
  'GITA':       `🏆 <strong>GITA adalah top performer kelas!</strong> Skor TO4 (464) tertinggi secara konsisten sejak TO1. TWK naik tajam dari 90 → 135 — sangat kompetitif untuk seleksi IPDN.`,
  'PUTU CINTA': `⚡ <strong>Perjalanan luar biasa, PUTU CINTA!</strong> Perkembangan signifikan dari TO1 ke TO3 (410) membuktikan kerja keras. Fokus naikkan TIU agar konsisten di atas ambang 80.`,
  'EHUD':       `📉 <strong>Volatilitas TIU perlu dijaga, EHUD.</strong> TIU fluktuatif — sempat jatuh ke 40 lalu naik ke 100. Total membaik 319 → 367. Kunci: konsistensi antar sesi.`,
  'DILLAH':     `⚠️ <strong>TIU perlu buffer lebih, DILLAH.</strong> TIU TO4 tepat di angka 80 — pas di ambang. TWK terus naik dan TKP stabil. Fokus: naikkan TIU ke 95+.`,
  'FAJAR':      `🎯 <strong>FAJAR punya skor terbaik kelas di TO2 (457)!</strong> Fluktuasi antar tryout perlu ditelusuri. Konsistensi adalah kunci menuju hari H.`
};
