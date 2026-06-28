import Chart from 'chart.js/auto';
import { SKD, MAX } from '../config.js';
import { isPass, initials, activeTOs, genderBadge } from '../utils.js';
import { PERSONAL_INSIGHTS } from '../config.js';

let _students = [];
let _radarChart = null;

const SUB = [
  { key: 'TWK', label: 'TWK — Wawasan Kebangsaan', color: '#4F7EF8', min: SKD.TWK, max: MAX.TWK },
  { key: 'TIU', label: 'TIU — Intelegensia Umum',  color: '#10B981', min: SKD.TIU, max: MAX.TIU },
  { key: 'TKP', label: 'TKP — Karakteristik Pribadi', color: '#F5B800', min: SKD.TKP, max: MAX.TKP },
];
const GOOD_PCT = 0.72; // ≥72% of max = "sudah baik"

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
    const fails = SUB.filter(sub => d[sub.key] < sub.min).map(sub => sub.key);
    txt += `⚠️ <strong>Fokus perkuat ${fails.join(' dan ')}, ${s.nama.split(' ')[0]}.</strong> `;
    fails.forEach(k => {
      const sub = SUB.find(s => s.key === k);
      txt += `Skor ${k} (${d[k]}) masih di bawah ambang ${sub.min}. `;
    });
  }
  if (d1 && !d1.incomplete) {
    const deltas = SUB.map(sub => ({ k: sub.key, v: d[sub.key] - d1[sub.key] }));
    const best = [...deltas].sort((a, b) => b.v - a.v)[0];
    const worst = [...deltas].sort((a, b) => a.v - b.v)[0];
    if (best?.v > 0) txt += `Peningkatan terbaik sejak TO1: <strong>${best.k} +${best.v}</strong>. `;
    if (worst?.v < 0) txt += `Perlu perhatian: <strong>${worst.k} turun ${worst.v}</strong> dari TO1. `;
  }
  return txt || `Terus semangat, ${s.nama.split(' ')[0]}! Setiap tryout adalah kesempatan belajar.`;
}

function renderProfile(students, idx, tos) {
  if (_radarChart) { _radarChart.destroy(); _radarChart = null; }
  const s = students[idx];

  // Update button active state
  document.querySelectorAll('.stu-btn').forEach((b, i) => {
    const isActive = i === idx;
    b.style.background   = isActive ? s.color + '33' : 'rgba(255,255,255,.04)';
    b.style.borderColor  = isActive ? s.color : 'rgba(255,255,255,.1)';
    b.style.color        = isActive ? s.color : 'var(--text)';
  });

  const latestTO = tos.filter(n => s.skd[n]).pop();
  const d = latestTO && !s.skd[latestTO]?.incomplete ? s.skd[latestTO] : null;
  const pass = d ? isPass(d) : false;

  // Normalize to 0-100 for radar
  const norm = (key, val) => val == null ? 0 : Math.round((val / MAX[key]) * 100);
  const scores = SUB.map(sub => d ? norm(sub.key, d[sub.key]) : 0);
  const normMin = SUB.map(sub => Math.round((sub.min / sub.max) * 100));
  const normGood = SUB.map(sub => Math.round(GOOD_PCT * 100));

  // Focus categories
  const critical = d ? SUB.filter(sub => d[sub.key] < sub.min) : [];
  const medium   = d ? SUB.filter(sub => d[sub.key] >= sub.min && d[sub.key] < sub.max * GOOD_PCT) : [];
  const good     = d ? SUB.filter(sub => d[sub.key] >= sub.max * GOOD_PCT) : [];

  const statusColor = pass ? '#10B981' : '#EF4444';
  const statusLabel = pass ? '✅ Lulus Semua Threshold' : '❌ Belum Lulus SKD';

  // TO history compact
  const toHistory = tos.map(n => {
    const dd = s.skd[n];
    if (!dd) return `<span style="color:var(--muted);font-size:10px">TO${n}: —</span>`;
    const p = isPass(dd);
    const isCurrent = n === latestTO;
    return `<span style="color:${p ? '#10B981' : '#EF4444'};font-size:10px;${isCurrent ? 'font-weight:700;text-decoration:underline' : ''}">TO${n}: ${dd.Total}</span>`;
  }).join(' &nbsp;·&nbsp; ');

  // ── Left: radar card
  const radarCard = `
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:20px;flex:1;min-width:300px;max-width:460px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap">
        <span style="font-size:16px;font-weight:800;color:${s.color}">${s.nama}</span>
        ${genderBadge(s.gender)}
        <span style="padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;color:${statusColor};border:1px solid ${statusColor}44;background:${statusColor}11">${statusLabel}</span>
      </div>
      ${d ? `<div style="font-size:11px;color:var(--gold);font-weight:600;margin-bottom:4px">TO${latestTO}: TWK ${d.TWK} · TIU ${d.TIU} · TKP ${d.TKP} · Total ${d.Total}</div>` : ''}
      <div style="font-size:10px;color:var(--muted);margin-bottom:16px">${toHistory}</div>
      <canvas id="skdIndvRadar" height="290"></canvas>
    </div>`;

  // ── Right: focus + bars
  const tagList = (items, color, icon) => items.length
    ? items.map(sub => `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${color}18;color:${color};border:1px solid ${color}44;margin:2px">${icon} ${sub.key}</span>`).join('')
    : `<span style="font-size:11px;color:var(--muted)">Tidak ada</span>`;

  const barRows = [
    ...SUB.map(sub => {
      const val = d?.[sub.key] ?? 0;
      const pct = Math.min(100, Math.round((val / sub.max) * 100));
      const isBelow = val < sub.min;
      const isGood  = val >= sub.max * GOOD_PCT;
      const barColor = isBelow ? '#EF4444' : isGood ? '#10B981' : '#F59E0B';
      return `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-size:12px;color:${sub.color};font-weight:600">${sub.key}</span>
            <span style="font-size:11px;color:var(--muted)">${val} / ${sub.max} &nbsp;<span style="color:${barColor};font-weight:700">(${pct}%)</span></span>
          </div>
          <div style="background:rgba(255,255,255,.06);border-radius:4px;height:8px;overflow:hidden;position:relative">
            <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px"></div>
            <div style="position:absolute;top:0;left:${Math.round((sub.min / sub.max) * 100)}%;width:2px;height:100%;background:#F59E0B88"></div>
          </div>
          ${isBelow ? `<div style="font-size:10px;color:#EF4444;margin-top:2px">⚠ Di bawah ambang ${sub.min} — harus ditingkatkan</div>` : ''}
        </div>`;
    }),
    // Total bar
    (() => {
      const val = d?.Total ?? 0;
      const pct = Math.min(100, Math.round((val / MAX.Total) * 100));
      const barColor = pass ? '#10B981' : '#EF4444';
      return `
        <div style="margin-bottom:4px;padding-top:8px;border-top:1px solid rgba(255,255,255,.07)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-size:12px;color:var(--gold);font-weight:700">Total SKD</span>
            <span style="font-size:11px;color:var(--muted)">${val} / ${MAX.Total} &nbsp;<span style="color:${barColor};font-weight:700">(${pct}%)</span></span>
          </div>
          <div style="background:rgba(255,255,255,.06);border-radius:4px;height:8px;overflow:hidden;position:relative">
            <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px"></div>
            <div style="position:absolute;top:0;left:${Math.round((SKD.Total / MAX.Total) * 100)}%;width:2px;height:100%;background:#F59E0B88"></div>
          </div>
        </div>`;
    })(),
  ].join('');

  const rightCard = `
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:20px;flex:1;min-width:280px">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px">Rekomendasi Focus Area</div>
      ${critical.length ? `
      <div style="margin-bottom:12px">
        <div style="font-size:10px;color:#EF4444;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">🚨 Harus Di-Push — Di Bawah Threshold</div>
        <div>${tagList(critical, '#EF4444', '▼')}</div>
      </div>` : ''}
      ${medium.length ? `
      <div style="margin-bottom:12px">
        <div style="font-size:10px;color:#F59E0B;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">⚠️ Perlu Ditingkatkan (Aman tapi Belum Kuat)</div>
        <div>${tagList(medium, '#F59E0B', '~')}</div>
      </div>` : ''}
      ${good.length ? `
      <div style="margin-bottom:16px">
        <div style="font-size:10px;color:#10B981;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">✅ Sudah Baik (≥ ${Math.round(GOOD_PCT * 100)}% Maks)</div>
        <div>${tagList(good, '#10B981', '▲')}</div>
      </div>` : ''}
      ${!d ? `<div style="color:var(--muted);font-size:12px;margin-bottom:16px">Belum ada data SKD.</div>` : ''}
      <div style="border-top:1px solid rgba(255,255,255,.07);padding-top:12px">
        <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:10px">Skor Per Sub Sesi</div>
        ${barRows}
      </div>
      <div style="margin-top:12px;padding:10px;background:rgba(255,255,255,.02);border-radius:8px;font-size:11px;color:var(--muted);line-height:1.7">
        ${generateInsight(s, tos)}
      </div>
    </div>`;

  document.getElementById('profileContent').innerHTML = `
    <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">
      ${radarCard}
      ${rightCard}
    </div>`;

  // Build radar chart
  requestAnimationFrame(() => {
    const canvas = document.getElementById('skdIndvRadar');
    if (!canvas) return;
    if (_radarChart) { _radarChart.destroy(); _radarChart = null; }
    _radarChart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: ['TWK (maks 150)', 'TIU (maks 175)', 'TKP (maks 225)'],
        datasets: [
          {
            label: 'Threshold SKD',
            data: normMin,
            borderColor: '#F59E0B88',
            backgroundColor: 'transparent',
            borderDash: [4, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            order: 99,
          },
          {
            label: `Target Kuat (${Math.round(GOOD_PCT * 100)}%)`,
            data: Array(3).fill(Math.round(GOOD_PCT * 100)),
            borderColor: '#10B98166',
            backgroundColor: '#10B98108',
            borderDash: [6, 3],
            borderWidth: 1.5,
            pointRadius: 0,
            order: 98,
          },
          {
            label: `TO${latestTO ?? '—'}`,
            data: scores,
            borderColor: s.color,
            backgroundColor: s.color + '22',
            borderWidth: 2.5,
            pointBackgroundColor: scores.map((v, i) => {
              if (!d) return '#6B7280';
              return d[SUB[i].key] < SUB[i].min ? '#EF4444'
                   : d[SUB[i].key] >= SUB[i].max * GOOD_PCT ? '#10B981'
                   : '#F59E0B';
            }),
            pointBorderColor: '#fff',
            pointRadius: 6,
            pointHoverRadius: 8,
            order: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { stepSize: 25, color: '#6B7280', font: { size: 10 }, backdropColor: 'transparent' },
            grid: { color: 'rgba(255,255,255,0.07)' },
            angleLines: { color: 'rgba(255,255,255,0.1)' },
            pointLabels: { color: '#D1D5DB', font: { size: 11, weight: '600' } },
          },
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: '#9CA3AF', font: { size: 11 }, padding: 12 } },
          tooltip: {
            callbacks: {
              label: ctx => {
                if (ctx.datasetIndex === 2 && d) {
                  const sub = SUB[ctx.dataIndex];
                  return ` ${sub.key}: ${d[sub.key]} / ${sub.max}`;
                }
                return ` ${ctx.dataset.label}`;
              },
            },
          },
        },
      },
    });
  });
}

export function init(students) {
  _students = students;
  const tos = activeTOs(students);
  const grid = document.getElementById('studentGrid');
  grid.innerHTML = '';
  grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px';

  students.forEach((s, i) => {
    const latestTO = tos.filter(n => s.skd[n]).pop();
    const d = latestTO ? s.skd[latestTO] : null;
    const pass = d && !d.incomplete ? isPass(d) : null;
    const statusColor = pass === true ? '#10B981' : pass === false ? '#EF4444' : 'var(--muted)';

    const btn = document.createElement('button');
    btn.className = 'stu-btn';
    btn.style.cssText = `
      cursor:pointer;border:1px solid rgba(255,255,255,.1);border-radius:10px;
      padding:8px 14px;background:rgba(255,255,255,.04);color:var(--text);
      font-size:12px;font-weight:600;text-align:left;transition:all .2s;min-width:120px`;
    btn.innerHTML = `
      <span style="color:${s.color}">${s.nama}</span><br>
      <span style="font-size:10px;color:${statusColor}">${d && !d.incomplete ? (pass ? '✅ Lulus' : '❌ Gagal') + ' · TO' + latestTO + ': ' + d.Total + 'pt' : 'Belum ada data'}</span>`;
    btn.onclick = () => renderProfile(students, i, tos);
    grid.appendChild(btn);
  });

  if (students.length) renderProfile(students, 0, tos);
}

export function renderProfileByIdx(students, idx) {
  const tos = activeTOs(students);
  renderProfile(students, idx, tos);
}
