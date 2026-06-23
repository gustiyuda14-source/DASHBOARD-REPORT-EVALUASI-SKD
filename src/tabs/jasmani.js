import { genderBadge } from '../utils.js';

let _students = [];

function hasAnyData(students) {
  return students.some(s => Object.values(s.jasmani).some(v => v !== null));
}

function buildTable(n) {
  const box = document.getElementById('jasmaniContent');
  const fields = [
    { key: 'lari12',     label: 'Lari 12 Menit', color: '#60A5FA' },
    { key: 'pushup',     label: 'Push Up',        color: '#4ADE80' },
    { key: 'pullup',     label: 'Pull Up/Chin Up', color: '#FBBF24' },
    { key: 'situp',      label: 'Sit Up',          color: '#F472B6' },
    { key: 'lariAngka8', label: 'Lari Angka 8',   color: '#A78BFA' }
  ];

  let rows = '';
  _students.forEach(s => {
    const d = s.jasmani[n];
    rows += `<tr>
      <td><span style="color:${s.color};font-weight:700">${s.nama}</span></td>
      <td>${genderBadge(s.gender)}</td>
      ${d ? fields.map(f => `<td style="text-align:center;color:${f.color};font-weight:600">${d[f.key] ?? '—'}</td>`).join('') : `<td colspan="${fields.length}" style="color:var(--muted);text-align:center;font-size:12px">Belum ada data</td>`}
    </tr>`;
  });

  box.innerHTML = `<table class="rank-table">
    <thead><tr>
      <th>Nama Siswa</th><th>Gender</th>
      ${fields.map(f => `<th style="text-align:center;color:${f.color}">${f.label}</th>`).join('')}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
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
