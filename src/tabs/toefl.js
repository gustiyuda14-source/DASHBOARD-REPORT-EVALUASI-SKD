import { genderBadge } from '../utils.js';

let _students = [];

function hasAnyData(students) {
  return students.some(s => Object.values(s.toefl).some(v => v !== null));
}

function buildTable(n) {
  const box = document.getElementById('toeflContent');
  const col = (val) => val == null ? `<td style="color:var(--muted);text-align:center">—</td>` : `<td style="text-align:center;font-weight:600">${val}</td>`;

  let rows = '';
  _students.forEach(s => {
    const d = s.toefl[n];
    rows += `<tr>
      <td><span style="color:${s.color};font-weight:700">${s.nama}</span></td>
      <td>${genderBadge(s.gender)}</td>
      ${d ? `${col(d.total)}<td style="text-align:center;color:#60A5FA;font-weight:600">${d.listening ?? '—'}</td><td style="text-align:center;color:#4ADE80;font-weight:600">${d.reading ?? '—'}</td><td style="text-align:center;color:#FBBF24;font-weight:600">${d.writing ?? '—'}</td>` : `<td colspan="4" style="color:var(--muted);text-align:center;font-size:12px">Belum ada data</td>`}
    </tr>`;
  });

  box.innerHTML = `<table class="rank-table">
    <thead><tr><th>Nama Siswa</th><th>Gender</th><th style="text-align:center">Jumlah Nilai</th><th style="text-align:center;color:#60A5FA">Listening</th><th style="text-align:center;color:#4ADE80">Reading</th><th style="text-align:center;color:#FBBF24">Writing</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function init(students) {
  _students = students;
  const filter = document.getElementById('toeflFilter');
  const box = document.getElementById('toeflContent');
  filter.innerHTML = '';

  if (!hasAnyData(students)) {
    box.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>Data TOEFL belum tersedia.<br>Input nilai via Google Sheets pada sheet <strong>TOEFL</strong>.</p></div>`;
    return;
  }

  const sessions = [...new Set(students.flatMap(s => Object.keys(s.toefl).map(Number).filter(n => s.toefl[n])))].sort((a, b) => a - b);
  if (!sessions.length) { box.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>Belum ada data TOEFL tersedia.</p></div>`; return; }

  sessions.forEach((n, i) => {
    const btn = document.createElement('div');
    btn.className = 'rank-btn' + (i === 0 ? ' active' : '');
    btn.textContent = `TOEFL ${n}`;
    btn.onclick = () => {
      filter.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildTable(n);
    };
    filter.appendChild(btn);
  });
  buildTable(sessions[0]);
}
