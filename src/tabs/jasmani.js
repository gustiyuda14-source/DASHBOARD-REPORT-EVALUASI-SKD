import Chart from 'chart.js/auto';
import { genderBadge } from '../utils.js';
import { calcJasmani, GRADE_LABELS, GRADE_COLORS } from '../config.js';

let _students = [];
let _radarChart = null;

const FIELDS = [
  { key: 'lari12',     label: 'Lari 12\'',        color: '#60A5FA', unit: 'm' },
  { key: 'pushup',     label: 'Push Up',           color: '#4ADE80', unit: 'rep' },
  { key: 'pullup',     label: 'Pull Up/Chin Up',   color: '#FBBF24', unit: 'rep' },
  { key: 'situp',      label: 'Sit Up',            color: '#F472B6', unit: 'rep' },
  { key: 'lariAngka8', label: 'Lari Angka 8',      color: '#A78BFA', unit: 'dtk' },
];

function hasAnyData(students) {
  return students.some(s => Object.values(s.jasmani).some(v => v !== null));
}

function buildTable(n) {
  const box = document.getElementById('jasmaniContent');

  let rows = '';
  const studentCalcs = [];

  _students.forEach(s => {
    const d = s.jasmani[n];
    if (!d) {
      rows += `<tr><td><span style="color:${s.color};font-weight:700">${s.nama}</span></td><td>${genderBadge(s.gender)}</td><td colspan="${FIELDS.length + 3}" style="color:var(--muted);text-align:center;font-size:12px">Belum ada data</td></tr>`;
      return;
    }
    const calc = calcJasmani(s.gender, d);
    studentCalcs.push({ s, d, calc });
    const gradeColor = calc ? GRADE_COLORS[calc.grade] : 'var(--muted)';
    const gradeLabel = calc ? GRADE_LABELS[calc.grade] : '—';
    const totalScore = calc ? calc.total : '—';

    rows += `<tr>
      <td><span style="color:${s.color};font-weight:700">${s.nama}</span></td>
      <td>${genderBadge(s.gender)}</td>
      ${FIELDS.map(f => {
        const val = d[f.key];
        const itemScore = calc?.scores[f.key];
        const itemColor = itemScore == null ? 'var(--muted)' : itemScore < 41 ? '#EF4444' : itemScore >= 80 ? '#10B981' : '#F59E0B';
        return `<td style="text-align:center"><span style="color:${f.color};font-weight:600">${val ?? '—'}</span>${itemScore != null ? `<br><span style="font-size:10px;color:${itemColor}">${itemScore}pt</span>` : ''}</td>`;
      }).join('')}
      <td style="text-align:center;font-weight:700;color:var(--gold)">${totalScore}</td>
      <td style="text-align:center"><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;color:${gradeColor};border:1px solid ${gradeColor}44;background:${gradeColor}11">${calc?.grade ?? '—'}</span><br><span style="font-size:10px;color:var(--muted)">${gradeLabel}</span></td>
    </tr>`;
  });

  box.innerHTML = `
    <table class="rank-table">
      <thead><tr>
        <th>Nama Siswa</th><th>Gender</th>
        ${FIELDS.map(f => `<th style="text-align:center;color:${f.color}">${f.label}<br><span style="font-size:10px;font-weight:400">(${f.unit})</span></th>`).join('')}
        <th style="text-align:center;color:var(--gold)">Skor Akhir</th>
        <th style="text-align:center">Grade</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="font-size:11px;color:var(--muted);margin-top:12px;padding:12px 16px;background:rgba(255,255,255,.03);border-radius:8px;line-height:1.8">
      <strong style="color:var(--text)">Standar Penilaian POLRI SAMAPTA v2025</strong> &nbsp;·&nbsp;
      <span style="color:#10B981">A ≥ 80 — Baik Sekali</span> &nbsp;·&nbsp;
      <span style="color:#F59E0B">B 61–79 — Cukup / Batas Aman</span> &nbsp;·&nbsp;
      <span style="color:#FB923C">C 41–60 — Kurang / Rawan</span> &nbsp;·&nbsp;
      <span style="color:#EF4444">TMS &lt; 41 atau salah satu item &lt; 41</span><br>
      Skor per item: interpolasi linear antara nilai minimum dan maksimum berdasarkan gender.
      Skor akhir = (Nilai A [Lari 12'] + Nilai B [rata-rata 4 item lainnya]) / 2.
    </div>

    <div id="jasmaniRadarSection" style="margin-top:32px">
      <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px">Analisis Sub Indikator — Spider Chart</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:20px">Skor per item (0–100). Zona merah &lt; 41 = area yang harus di-push. Zona hijau ≥ 80 = sudah baik.</div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">
        <div style="flex:1;min-width:320px;max-width:520px;background:rgba(255,255,255,.03);border-radius:12px;padding:20px">
          <canvas id="jasmaniRadarChart" height="340"></canvas>
        </div>
        <div style="flex:1;min-width:280px" id="jasmaniWeakness"></div>
      </div>
    </div>
  `;

  buildRadarChart(studentCalcs);
  buildWeaknessPanel(studentCalcs);
}

function buildRadarChart(studentCalcs) {
  if (_radarChart) { _radarChart.destroy(); _radarChart = null; }
  const canvas = document.getElementById('jasmaniRadarChart');
  if (!canvas || !studentCalcs.length) return;

  const labels = FIELDS.map(f => f.label);

  // Zone reference datasets
  const zoneMin = { label: 'Batas TMS (41)', data: Array(5).fill(41), borderColor: '#EF444488', backgroundColor: 'transparent', borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0, order: 99 };
  const zoneTarget = { label: 'Target A (80)', data: Array(5).fill(80), borderColor: '#10B98166', backgroundColor: '#10B98108', borderDash: [6, 3], borderWidth: 1.5, pointRadius: 0, order: 98 };

  const datasets = [zoneMin, zoneTarget, ...studentCalcs.map(({ s, calc }) => {
    const scores = FIELDS.map(f => calc?.scores[f.key] ?? 0);
    const hex = s.color;
    return {
      label: s.nama,
      data: scores,
      borderColor: hex,
      backgroundColor: hex + '22',
      borderWidth: 2,
      pointBackgroundColor: scores.map(v => v < 41 ? '#EF4444' : v >= 80 ? '#10B981' : hex),
      pointBorderColor: '#fff',
      pointRadius: 5,
      pointHoverRadius: 7,
      order: 0,
    };
  })];

  _radarChart = new Chart(canvas, {
    type: 'radar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20, color: '#6B7280', font: { size: 10 }, backdropColor: 'transparent' },
          grid: { color: 'rgba(255,255,255,0.07)' },
          angleLines: { color: 'rgba(255,255,255,0.1)' },
          pointLabels: { color: '#D1D5DB', font: { size: 11, weight: '600' } },
        },
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#9CA3AF', font: { size: 11 }, padding: 12 },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} pt`,
          },
        },
      },
    },
  });
}

function buildWeaknessPanel(studentCalcs) {
  const el = document.getElementById('jasmaniWeakness');
  if (!el) return;

  if (!studentCalcs.length) { el.innerHTML = ''; return; }

  const cards = studentCalcs.map(({ s, calc }) => {
    if (!calc) return '';
    const weak   = FIELDS.filter(f => (calc.scores[f.key] ?? 0) < 41);
    const medium = FIELDS.filter(f => { const v = calc.scores[f.key]; return v != null && v >= 41 && v < 80; });
    const strong = FIELDS.filter(f => (calc.scores[f.key] ?? 0) >= 80);

    const gradeColor = GRADE_COLORS[calc.grade];

    const tagList = (items, color, icon) => items.length
      ? items.map(f => `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:${color}18;color:${color};border:1px solid ${color}44;margin:2px">${icon} ${f.label}</span>`).join('')
      : `<span style="font-size:11px;color:var(--muted)">—</span>`;

    return `
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="color:${s.color};font-weight:700;font-size:13px">${s.nama}</span>
          <span style="font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;color:${gradeColor};border:1px solid ${gradeColor}44;background:${gradeColor}11">${calc.grade} · ${calc.total}pt</span>
        </div>
        ${weak.length ? `
        <div style="margin-bottom:8px">
          <div style="font-size:10px;color:#EF4444;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">🚨 Harus Di-Push (< 41)</div>
          <div>${tagList(weak, '#EF4444', '▼')}</div>
        </div>` : ''}
        ${medium.length ? `
        <div style="margin-bottom:8px">
          <div style="font-size:10px;color:#F59E0B;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">⚠️ Perlu Ditingkatkan (41–79)</div>
          <div>${tagList(medium, '#F59E0B', '~')}</div>
        </div>` : ''}
        ${strong.length ? `
        <div>
          <div style="font-size:10px;color:#10B981;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">✅ Sudah Baik (≥ 80)</div>
          <div>${tagList(strong, '#10B981', '▲')}</div>
        </div>` : ''}
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">Rekomendasi Focus Area</div>
    ${cards}
  `;
}

export function init(students) {
  _students = students;
  const filter = document.getElementById('jasmaniFilter');
  const box = document.getElementById('jasmaniContent');
  filter.innerHTML = '';

  if (!hasAnyData(students)) {
    box.innerHTML = `<div class="empty-state"><div class="empty-icon">💪</div><p>Data Jasmani belum tersedia.<br>Input nilai via Google Sheets pada sheet <strong>JASMANI</strong>.</p></div>`;
    return;
  }

  const evals = [...new Set(students.flatMap(s => Object.keys(s.jasmani).map(Number).filter(n => s.jasmani[n])))].sort((a, b) => a - b);
  if (!evals.length) { box.innerHTML = `<div class="empty-state"><div class="empty-icon">💪</div><p>Belum ada data Jasmani tersedia.</p></div>`; return; }

  evals.forEach((n, i) => {
    const btn = document.createElement('div');
    btn.className = 'rank-btn' + (i === 0 ? ' active' : '');
    btn.textContent = `Evaluasi ${n}`;
    btn.onclick = () => {
      filter.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildTable(n);
    };
    filter.appendChild(btn);
  });
  buildTable(evals[0]);
}
