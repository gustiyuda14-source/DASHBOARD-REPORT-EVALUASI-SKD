import Chart from 'chart.js/auto';
import { isPass, activeTOs } from '../utils.js';

let chart = null;

export function init(students) {
  const tos = activeTOs(students);

  const stats = students.map(s => {
    const scores = tos.map(n => s.skd[n]).filter(d => d && !d.incomplete);
    const totals = scores.map(d => d.Total);
    const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
    return { s, scores, totals, avg, best: totals.length ? Math.max(...totals) : 0, worst: totals.length ? Math.min(...totals) : 0, passCount: scores.filter(d => isPass(d)).length, attended: totals.length };
  }).sort((a, b) => b.avg - a.avg);

  // Build table head
  document.getElementById('kumulatifHead').innerHTML = `<tr><th>#</th><th>Nama Siswa</th>${tos.map(n => `<th style="text-align:center">TO ${n}</th>`).join('')}<th style="text-align:center">Ikut</th><th style="text-align:center">Rata-rata</th><th style="text-align:center">Terbaik</th><th style="text-align:center">Terendah</th><th style="text-align:center">Lulus/Ikut</th></tr>`;

  let rows = '';
  stats.forEach(({ s, avg, best, worst, passCount, attended }, i) => {
    const nc = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : 'rank-num';
    const medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '';
    const toCells = tos.map(n => {
      const d = s.skd[n];
      if (!d) return `<td style="color:var(--muted);text-align:center;font-size:12px">—</td>`;
      if (d.incomplete) return `<td style="color:var(--warn);text-align:center;font-size:12px">${d.Total}<sup>*</sup></td>`;
      const p = isPass(d);
      return `<td class="total-col" style="color:${p ? '#10B981' : '#EF4444'};text-align:center">${d.Total}</td>`;
    }).join('');
    const pctColor = passCount === attended && attended > 0 ? '#10B981' : passCount > 0 ? '#F59E0B' : '#EF4444';
    const consistency = attended === 0 ? '—' : passCount === attended ? 'Konsisten' : passCount === 0 ? 'Perlu Kerja Keras' : `${Math.round(passCount / attended * 100)}%`;
    rows += `<tr>
      <td><span class="rank-num ${nc}">${medal}${i + 1}</span></td>
      <td><span class="rank-name" onclick="goProfile(${students.indexOf(s)})"><span class="dot-sm" style="background:${s.color}"></span>${s.nama}</span></td>
      ${toCells}
      <td style="text-align:center;color:var(--muted);font-weight:600">${attended}/${tos.length}</td>
      <td class="total-col" style="color:var(--gold);text-align:center;font-size:16px">${avg}</td>
      <td style="text-align:center;color:#10B981;font-weight:600">${best}</td>
      <td style="text-align:center;color:#EF4444;font-weight:600">${worst}</td>
      <td style="text-align:center"><span style="color:${pctColor};font-weight:700;font-size:12px">${consistency}</span></td>
    </tr>`;
  });
  document.getElementById('kumulatifBody').innerHTML = rows;

  if (chart) chart.destroy();
  chart = new Chart(document.getElementById('chartKumulatif'), {
    type: 'bar',
    data: {
      labels: stats.map(x => x.s.nama),
      datasets: [
        { type: 'line', label: 'Ambang Min (311)', data: Array(stats.length).fill(311), borderColor: '#F59E0B', borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0, fill: false, order: 0 },
        { type: 'bar', label: 'Rata-rata Skor', data: stats.map(x => x.avg), backgroundColor: stats.map(x => x.s.color + 'BB'), borderRadius: 6, borderSkipped: false, order: 1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { padding: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: c => c.dataset.type === 'line' ? 'Ambang Min: 311' : `Rata-rata: ${c.parsed.y} poin` } } },
      scales: { y: { min: 50, max: 510, grid: { color: 'rgba(255,255,255,.04)' }, ticks: { stepSize: 50 }, title: { display: true, text: 'Rata-rata Skor Total' } }, x: { grid: { display: false }, ticks: { font: { size: 11 } } } }
    }
  });

  const top = stats[0];
  const avgKelas = Math.round(stats.reduce((a, x) => a + x.avg, 0) / stats.length);
  const allPassAll = stats.filter(x => x.passCount === x.attended && x.attended > 0);
  const neverPass = stats.filter(x => x.passCount === 0 && x.attended > 0);
  document.getElementById('kumulatifInsights').innerHTML = `<div style="font-size:13px;color:var(--muted);line-height:2">
    <b style="color:var(--text)">📌 Ringkasan Kumulatif (TO1 – TO${tos[tos.length-1]}):</b>
    Rata-rata tertinggi: <strong style="color:${top.s.color}">${top.s.nama}</strong> — <strong>${top.avg} poin</strong> dari ${top.attended} tryout.
    Rata-rata kelas: <strong style="color:var(--gold)">${avgKelas} poin</strong>.
    ${allPassAll.length ? `<br>Lulus di semua tryout: ${allPassAll.map(x => `<strong style="color:${x.s.color}">${x.s.nama}</strong>`).join(', ')}.` : ''}
    ${neverPass.length ? `<br>Belum pernah lulus threshold: ${neverPass.map(x => `<strong style="color:${x.s.color}">${x.s.nama}</strong>`).join(', ')} — perlu perhatian lebih intensif.` : ''}
    <br><span style="font-size:11px;color:rgba(107,114,128,.7)"><sup>*</sup> Tryout tidak lengkap tidak dihitung dalam rata-rata. Klik nama siswa untuk profil lengkap.</span>
  </div>`;
}
