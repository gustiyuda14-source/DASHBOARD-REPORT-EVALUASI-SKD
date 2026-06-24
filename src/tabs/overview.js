import Chart from 'chart.js/auto';
import { SKD, MAX } from '../config.js';
import { isPass, activeTOs } from '../utils.js';

let charts = {};

function destroyAll() {
  Object.values(charts).forEach(c => c && c.destroy());
  charts = {};
}

function buildTrend(students, tos) {
  const labels = tos.map(n => `Tryout ${n}`);
  const datasets = students.map(s => ({
    label: s.nama,
    data: tos.map(n => s.skd[n] ? s.skd[n].Total : null),
    borderColor: s.color, backgroundColor: s.color + '22', borderWidth: 2,
    pointBackgroundColor: s.color, pointRadius: 4, pointHoverRadius: 7, tension: .35, spanGaps: false
  }));
  datasets.push({ label: 'Ambang Min (311)', data: tos.map(() => 311), borderColor: '#F59E0B', borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0, fill: false });
  charts.trend = new Chart(document.getElementById('chartTrend'), {
    type: 'line', data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: { y: { min: 50, max: 510, grid: { color: 'rgba(148,163,184,.07)' }, ticks: { stepSize: 50 }, title: { display: true, text: 'Skor Total' } }, x: { grid: { color: 'rgba(148,163,184,.07)' } } },
      plugins: { legend: { position: 'right', labels: { padding: 12, font: { size: 11 } } } }
    }
  });
}

function buildSubCharts(students, toNum) {
  ['TWK', 'TIU', 'TKP'].forEach(key => charts[key] && charts[key].destroy());
  const names = students.map(s => s.nama.split(' ')[0]);
  const get = k => students.map(s => { const d = s.skd[toNum]; return (d && !d.incomplete) ? d[k] : null; });
  const mkColor = (vals, min, color) => vals.map(v => v === null ? 'rgba(148,163,184,0.12)' : v >= min ? color + 'DD' : 'rgba(239,68,68,0.75)');

  const opts = (key, min, max, color) => ({
    type: 'bar',
    data: {
      labels: names, datasets: [
        { type: 'line', label: 'Ambang Min', data: Array(names.length).fill(min), borderColor: '#F59E0B', borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0, fill: false, order: 0 },
        { type: 'bar', data: get(key), backgroundColor: mkColor(get(key), min, color), borderRadius: 4, borderSkipped: false, order: 1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.dataset.type === 'line' ? `Ambang: ${min}` : `${c.parsed.y} / ${max}` } } },
      scales: { y: { min: 0, max, grid: { color: 'rgba(148,163,184,.07)' } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } }
    }
  });

  charts.TWK = new Chart(document.getElementById('chartTWK'), opts('TWK', 65, 150, '#4F7EF8'));
  charts.TIU = new Chart(document.getElementById('chartTIU'), opts('TIU', 80, 175, '#10B981'));
  charts.TKP = new Chart(document.getElementById('chartTKP'), opts('TKP', 166, 225, '#F5B800'));
}

function buildSubFilter(students, tos) {
  const filter = document.getElementById('subTOFilter');
  filter.innerHTML = '';
  tos.forEach((n, i) => {
    const btn = document.createElement('div');
    btn.className = 'rank-btn' + (i === 0 ? ' active' : '');
    btn.textContent = `Tryout ${n}`;
    btn.onclick = () => {
      filter.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildSubCharts(students, n);
    };
    filter.appendChild(btn);
  });
}

function buildClassTable(students, tos) {
  const thead = document.getElementById('classTableHead');
  const tbody = document.getElementById('classTableBody');
  thead.innerHTML = `<tr><th>Siswa</th><th>Gender</th>${tos.map(n => `<th>TO${n} Total</th><th>TO${n} Status</th>`).join('')}<th>Trend</th></tr>`;
  tbody.innerHTML = '';
  students.forEach(s => {
    let cells = `<td><span style="color:${s.color};font-weight:700">${s.nama}</span></td>`;
    cells += `<td>${s.gender === 'P' ? '<span class="gender-badge-p">♀ P</span>' : '<span class="gender-badge-l">♂ L</span>'}</td>`;
    tos.forEach(n => {
      const d = s.skd[n];
      if (!d) { cells += `<td style="color:var(--muted)">—</td><td><span class="status-skip">Absen</span></td>`; return; }
      if (d.incomplete) { cells += `<td style="color:var(--warn)">${d.Total}</td><td><span class="badge-incomplete" style="padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700">Tdk Lengkap</span></td>`; return; }
      const pass = isPass(d);
      cells += `<td class="total-col" style="color:${pass ? '#10B981' : '#EF4444'}">${d.Total}</td><td><span class="${pass ? 'status-lulus' : 'status-gagal'}">${pass ? 'Lulus' : 'Gagal'}</span></td>`;
    });
    const d1 = s.skd[tos[0]], dLast = s.skd[tos[tos.length - 1]];
    let trend = '—';
    if (d1 && dLast && !d1.incomplete) {
      const v = dLast.Total - d1.Total;
      trend = v > 0 ? `<span class="delta-up">▲ +${v}</span>` : v < 0 ? `<span class="delta-dn">▼ ${v}</span>` : `<span class="delta-flat">→ 0</span>`;
    }
    cells += `<td>${trend}</td>`;
    const row = document.createElement('tr');
    row.innerHTML = cells;
    tbody.appendChild(row);
  });
}

export function init(students) {
  destroyAll();
  const tos = activeTOs(students);
  if (!tos.length) return;
  buildTrend(students, tos);
  buildSubFilter(students, tos);
  buildSubCharts(students, tos[0]);
  buildClassTable(students, tos);
}
