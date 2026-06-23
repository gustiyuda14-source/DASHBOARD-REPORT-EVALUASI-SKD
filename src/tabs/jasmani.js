import { genderBadge } from '../utils.js';
import { calcJasmani, GRADE_LABELS, GRADE_COLORS } from '../config.js';

let _students = [];

function hasAnyData(students) {
  return students.some(s => Object.values(s.jasmani).some(v => v !== null));
}

function buildTable(n) {
  const box = document.getElementById('jasmaniContent');
  const fields = [
    { key: 'lari12',     label: 'Lari 12 Menit',   color: '#60A5FA', unit: 'm' },
    { key: 'pushup',     label: 'Push Up',           color: '#4ADE80', unit: 'rep' },
    { key: 'pullup',     label: 'Pull Up/Chin Up',   color: '#FBBF24', unit: 'rep' },
    { key: 'situp',      label: 'Sit Up',             color: '#F472B6', unit: 'rep' },
    { key: 'lariAngka8', label: 'Lari Angka 8',      color: '#A78BFA', unit: 'dtk' },
  ];

  let rows = '';
  _students.forEach(s => {
    const d = s.jasmani[n];
    if (!d) {
      rows += `<tr><td><span style="color:${s.color};font-weight:700">${s.nama}</span></td><td>${genderBadge(s.gender)}</td><td colspan="${fields.length + 3}" style="color:var(--muted);text-align:center;font-size:12px">Belum ada data</td></tr>`;
      return;
    }
    const calc = calcJasmani(s.gender, d);
    const gradeColor = calc ? GRADE_COLORS[calc.grade] : 'var(--muted)';
    const gradeLabel = calc ? GRADE_LABELS[calc.grade] : '—';
    const totalScore = calc ? calc.total : '—';

    rows += `<tr>
      <td><span style="color:${s.color};font-weight:700">${s.nama}</span></td>
      <td>${genderBadge(s.gender)}</td>
      ${fields.map(f => {
        const val = d[f.key];
        const itemScore = calc?.scores[f.key];
        const itemColor = itemScore == null ? 'var(--muted)' : itemScore < 41 ? '#EF4444' : itemScore >= 80 ? '#10B981' : '#F59E0B';
        return `<td style="text-align:center"><span style="color:${f.color};font-weight:600">${val ?? '—'}</span>${itemScore != null ? `<br><span style="font-size:10px;color:${itemColor}">${itemScore}pt</span>` : ''}</td>`;
      }).join('')}
      <td style="text-align:center;font-weight:700;color:var(--gold)">${totalScore}</td>
      <td style="text-align:center"><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;color:${gradeColor};border:1px solid ${gradeColor}44;background:${gradeColor}11">${calc?.grade ?? '—'}</span><br><span style="font-size:10px;color:var(--muted)">${gradeLabel}</span></td>
    </tr>`;
  });

  box.innerHTML = `<table class="rank-table">
    <thead><tr>
      <th>Nama Siswa</th><th>Gender</th>
      ${fields.map(f => `<th style="text-align:center;color:${f.color}">${f.label}<br><span style="font-size:10px;font-weight:400">(${f.unit})</span></th>`).join('')}
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
  </div>`;
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
