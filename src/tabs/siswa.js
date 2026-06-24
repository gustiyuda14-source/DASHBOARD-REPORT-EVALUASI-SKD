import Chart from 'chart.js/auto';
import { SKD } from '../config.js';
import { isPass, initials, activeTOs, genderBadge } from '../utils.js';
import { PERSONAL_INSIGHTS } from '../config.js';

let profileCharts = [];

function generateInsight(s, tos) {
  if (PERSONAL_INSIGHTS[s.nama]) return PERSONAL_INSIGHTS[s.nama];
  const latestTO = tos.filter(n => s.skd[n]).pop();
  if (!latestTO) return `Belum ada data tryout untuk ${s.nama}.`;
  const d = s.skd[latestTO];
  const pass = isPass(d);
  const d1 = s.skd[tos[0]];
  let txt = '';
  if (pass) txt += `✅ <strong>${s.nama.split(' ')[0]} lulus semua threshold SKD di Tryout ${latestTO}.</strong> `;
  else {
    const fails = ['TWK', 'TIU', 'TKP'].filter(k => d[k] < SKD[k]);
    txt += `⚠️ <strong>Fokus perkuat ${fails.join(' dan ')}, ${s.nama.split(' ')[0]}.</strong> `;
    fails.forEach(k => txt += `Skor ${k} (${d[k]}) masih di bawah ambang ${SKD[k]}. `);
  }
  if (d1 && !d1.incomplete) {
    const deltas = ['TWK', 'TIU', 'TKP'].map(k => ({ k, v: d[k] - d1[k] }));
    const best = [...deltas].sort((a, b) => b.v - a.v)[0];
    const worst = [...deltas].sort((a, b) => a.v - b.v)[0];
    if (best && best.v > 0) txt += `Sub-sesi terbaik peningkatan sejak TO1: <strong>${best.k} +${best.v} poin</strong>. `;
    if (worst && worst.v < 0) txt += `Sub-sesi yang perlu perhatian: <strong>${worst.k} turun ${worst.v} poin</strong> dibanding TO1. `;
  }
  return txt || `Terus semangat berlatih, ${s.nama.split(' ')[0]}! Setiap tryout adalah kesempatan belajar.`;
}

function renderProfile(students, idx, tos) {
  profileCharts.forEach(c => c.destroy());
  profileCharts = [];
  const s = students[idx];
  const latestTO = tos.filter(n => s.skd[n]).pop();
  const passLatest = latestTO ? isPass(s.skd[latestTO]) : false;

  let toCells = '';
  tos.forEach(n => {
    const d = s.skd[n];
    if (!d) {
      toCells += `<div class="to-cell"><div class="to-label">Tryout ${n}</div><div class="to-total" style="color:var(--muted)">—</div><div class="to-subs">Tidak hadir</div><span class="to-badge badge-skip">Absen</span></div>`;
    } else if (d.incomplete) {
      toCells += `<div class="to-cell"><div class="to-label">Tryout ${n}</div><div class="to-total" style="color:var(--warn)">${d.Total}</div><div class="to-subs">TWK:${d.TWK} · TIU:${d.TIU}<br>TKP:${d.TKP}</div><span class="to-badge badge-incomplete">Tidak Lengkap</span></div>`;
    } else {
      const p = isPass(d);
      const fails = ['TWK', 'TIU', 'TKP'].filter(k => d[k] < SKD[k]);
      toCells += `<div class="to-cell">
        <div class="to-label">Tryout ${n}</div>
        <div class="to-total" style="color:${p ? '#10B981' : '#EF4444'}">${d.Total}</div>
        <div class="to-subs" style="font-size:11px">
          TWK:<b style="color:${d.TWK >= SKD.TWK ? '#10B981' : '#EF4444'}">${d.TWK}</b> ·
          TIU:<b style="color:${d.TIU >= SKD.TIU ? '#10B981' : '#EF4444'}">${d.TIU}</b><br>
          TKP:<b style="color:${d.TKP >= SKD.TKP ? '#10B981' : '#EF4444'}">${d.TKP}</b>
        </div>
        <span class="to-badge ${p ? 'badge-pass' : 'badge-fail'}">${p ? 'Lulus' : 'Gagal' + (fails.length ? ' (' + fails.join(',') + ')' : '')}</span>
      </div>`;
    }
  });

  const toRowCols = Math.min(tos.length, 4);
  document.getElementById('profileContent').innerHTML = `
  <div class="profile-card">
    <div class="profile-header">
      <div class="profile-avatar" style="background:${s.color}22;border:2px solid ${s.color};color:${s.color}">${initials(s.nama)}</div>
      <div class="profile-info">
        <h2 style="color:${s.color}">${s.nama} ${genderBadge(s.gender)}</h2>
        <p>Siswa Bimbel D'Ajiks Akademi &nbsp;·&nbsp;
          ${latestTO ? (passLatest ? `<span style="color:#10B981;font-weight:700">✅ Lulus threshold SKD TO${latestTO}</span>` : `<span style="color:#EF4444;font-weight:700">⚠️ Belum lulus semua threshold TO${latestTO}</span>`) : `<span style="color:var(--muted)">Belum ada data SKD</span>`}
        </p>
      </div>
    </div>
    <div class="to-row" style="grid-template-columns:repeat(${toRowCols},1fr)">${toCells}</div>
    <div class="profile-charts">
      <div class="chart-box"><h3>Tren Skor — TO1 hingga TO${tos[tos.length-1]}</h3><div style="position:relative;height:220px"><canvas id="chartProfile"></canvas></div></div>
      <div class="chart-box"><h3>Profil Sub-Sesi (TO Terbaru)</h3><div style="position:relative;height:220px"><canvas id="chartRadar"></canvas></div></div>
    </div>
    <div class="insight-box">${generateInsight(s, tos)}</div>
  </div>`;

  const totals = tos.map(n => { const d = s.skd[n]; return (d && !d.incomplete) ? d.Total : null; });
  const twks   = tos.map(n => { const d = s.skd[n]; return (d && !d.incomplete) ? d.TWK : null; });
  const tius   = tos.map(n => { const d = s.skd[n]; return (d && !d.incomplete) ? d.TIU : null; });
  const tkps   = tos.map(n => { const d = s.skd[n]; return (d && !d.incomplete) ? d.TKP : null; });
  const labels = tos.map(n => `TO${n}`);

  profileCharts.push(new Chart(document.getElementById('chartProfile'), {
    type: 'line',
    data: { labels, datasets: [
      { label: 'Total', data: totals, borderColor: s.color, backgroundColor: s.color + '22', borderWidth: 2.5, tension: .35, pointRadius: 5, fill: true },
      { label: 'TWK', data: twks, borderColor: '#4F7EF8', borderWidth: 1.5, tension: .35, pointRadius: 3, borderDash: [3, 2] },
      { label: 'TIU', data: tius, borderColor: '#10B981', borderWidth: 1.5, tension: .35, pointRadius: 3, borderDash: [3, 2] },
      { label: 'TKP', data: tkps, borderColor: '#F5B800', borderWidth: 1.5, tension: .35, pointRadius: 3, borderDash: [3, 2] }
    ]},
    options: { responsive: true, maintainAspectRatio: false, spanGaps: false, scales: { y: { min: 0, max: 500, grid: { color: 'rgba(148,163,184,.07)' } }, x: { grid: { color: 'rgba(148,163,184,.07)' } } }, plugins: { legend: { position: 'bottom', labels: { padding: 10, font: { size: 10 } } } } }
  }));

  const dLatest = latestTO ? (s.skd[latestTO] || { TWK: 0, TIU: 0, TKP: 0 }) : { TWK: 0, TIU: 0, TKP: 0 };
  profileCharts.push(new Chart(document.getElementById('chartRadar'), {
    type: 'radar',
    data: { labels: ['TWK (maks 150)', 'TIU (maks 175)', 'TKP (maks 225)'], datasets: [
      { label: `Skor TO${latestTO}`, data: [dLatest.TWK, dLatest.TIU, dLatest.TKP], backgroundColor: s.color + '33', borderColor: s.color, borderWidth: 2, pointBackgroundColor: s.color },
      { label: 'Ambang SKD', data: [65, 80, 166], backgroundColor: 'rgba(245,158,11,.05)', borderColor: '#F59E0B', borderWidth: 1.5, borderDash: [4, 3], pointRadius: 0 }
    ]},
    options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 230, grid: { color: 'rgba(148,163,184,.08)' }, pointLabels: { font: { size: 10 }, color: '#64748B' }, ticks: { stepSize: 50, font: { size: 9 }, backdropColor: 'transparent', color: '#64748B' } } }, plugins: { legend: { position: 'bottom', labels: { padding: 10, font: { size: 10 } } } } }
  }));
}

export function init(students) {
  const tos = activeTOs(students);
  const grid = document.getElementById('studentGrid');
  grid.innerHTML = '';

  students.forEach((s, i) => {
    const latestTO = tos.filter(n => s.skd[n]).pop();
    const btn = document.createElement('div');
    btn.className = 'stu-btn' + (i === 0 ? ' active' : '');
    btn.innerHTML = `<div class="stu-avatar" style="background:${s.color}22;border:2px solid ${s.color}44;color:${s.color}">${initials(s.nama)}</div><div class="stu-name">${s.nama}</div><div class="stu-score">${latestTO ? s.skd[latestTO].Total + ' pts TO' + latestTO : 'Belum ada data'}</div>`;
    btn.onclick = () => {
      document.querySelectorAll('.stu-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProfile(students, i, tos);
    };
    grid.appendChild(btn);
  });

  if (students.length) renderProfile(students, 0, tos);
}

export function renderProfileByIdx(students, idx) {
  const tos = activeTOs(students);
  document.querySelectorAll('.stu-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
  renderProfile(students, idx, tos);
}
