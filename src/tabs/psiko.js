import { genderBadge } from '../utils.js';

let _students = [];

function hasAnyData(students) {
  return students.some(s => Object.values(s.psiko).some(v => v !== null));
}

function buildTable(n) {
  const box = document.getElementById('psikoContent');
  const fields = [
    { key: 'kecerdasan',  label: 'Kecerdasan',  color: '#60A5FA' },
    { key: 'kecermatan',  label: 'Kecermatan',  color: '#4ADE80' },
    { key: 'kepribadian', label: 'Kepribadian', color: '#F472B6' }
  ];

  let rows = '';
  _students.forEach(s => {
    const d = s.psiko[n];
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
  const filter = document.getElementById('psikoFilter');
  const box = document.getElementById('psikoContent');
  filter.innerHTML = '';

  if (!hasAnyData(students)) {
    box.innerHTML = `<div class="empty-state"><div class="empty-icon">🧠</div><p>Data Psiko belum tersedia.<br>Input nilai via Google Sheets pada sheet <strong>PSIKO</strong>.</p></div>`;
    return;
  }

  const sessions = [...new Set(students.flatMap(s => Object.keys(s.psiko).map(Number).filter(n => s.psiko[n])))].sort((a, b) => a - b);
  if (!sessions.length) { box.innerHTML = `<div class="empty-state"><div class="empty-icon">🧠</div><p>Belum ada data Psiko tersedia.</p></div>`; return; }

  sessions.forEach((n, i) => {
    const btn = document.createElement('div');
    btn.className = 'rank-btn' + (i === 0 ? ' active' : '');
    btn.textContent = `Tryout ${n}`;
    btn.onclick = () => {
      filter.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildTable(n);
    };
    filter.appendChild(btn);
  });
  buildTable(sessions[0]);
}
