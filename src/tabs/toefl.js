import Chart from 'chart.js/auto';
import { genderBadge } from '../utils.js';
import { calcTOEFL, TOEFL_ITP_BANDS, TOEFL_MIN_KEDINASAN } from '../config.js';

let _students = [];
let _kumulatifChart = null;

function hasAnyData(s) {
  return s.some(st => Object.values(st.toefl).some(v => v !== null));
}

function activeSessions(students) {
  return [...new Set(students.flatMap(s => Object.keys(s.toefl).map(Number).filter(n => s.toefl[n])))].sort((a, b) => a - b);
}

function itpBadge(itp, grade, label, color) {
  return `<span style="font-weight:700;font-size:15px;color:${color}">${itp}</span>
    <span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;color:${color};border:1px solid ${color}44;background:${color}11;margin-left:4px">${grade} — ${label}</span>`;
}

function sectionCell(val, scaled) {
  const c = scaled == null ? 'var(--muted)' : scaled >= 58 ? '#10B981' : scaled >= 50 ? '#F59E0B' : '#EF4444';
  return `<td style="text-align:center"><span style="color:var(--text);font-weight:600">${val ?? '—'}</span>${scaled != null ? `<br><span style="font-size:10px;color:${c}">ITP: ${scaled}</span>` : ''}</td>`;
}

// ─── VIEW 1: Nilai per sesi ───────────────────────────────────────────────────
function renderNilai(n) {
  let rows = '';
  _students.forEach(s => {
    const d = s.toefl[n];
    if (!d) {
      rows += `<tr><td><span style="color:${s.color};font-weight:700">${s.nama}</span></td><td>${genderBadge(s.gender)}</td><td colspan="5" style="color:var(--muted);text-align:center;font-size:12px">Belum ada data</td></tr>`;
      return;
    }
    const c = calcTOEFL(d);
    rows += `<tr>
      <td><span style="color:${s.color};font-weight:700">${s.nama}</span></td>
      <td>${genderBadge(s.gender)}</td>
      <td style="text-align:center;font-weight:700">${d.total ?? (d.listening != null || d.reading != null || d.writing != null ? [d.listening,d.reading,d.writing].reduce((a,v)=>a+(v||0),0) : '—')}</td>
      ${sectionCell(d.listening, c?.l)}
      ${sectionCell(d.reading,   c?.r)}
      ${sectionCell(d.writing,   c?.w)}
      <td style="text-align:center">${c ? itpBadge(c.itp, c.grade, c.label, c.color) : '<span style="color:var(--muted)">—</span>'}</td>
      <td style="text-align:center">${c ? `<span style="color:${c.passKedinasan ? '#10B981' : '#EF4444'};font-size:12px;font-weight:700">${c.passKedinasan ? '✅ Lulus' : '❌ Belum'}</span>` : '—'}</td>
    </tr>`;
  });

  return `<table class="rank-table">
    <thead><tr>
      <th>Nama Siswa</th><th>Gender</th>
      <th style="text-align:center">Total Mentah</th>
      <th style="text-align:center;color:#60A5FA">Listening</th>
      <th style="text-align:center;color:#4ADE80">Reading</th>
      <th style="text-align:center;color:#FBBF24">Writing</th>
      <th style="text-align:center;color:#C084FC">Skor ITP</th>
      <th style="text-align:center">≥ ${TOEFL_MIN_KEDINASAN}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="font-size:11px;color:var(--muted);margin-top:12px;padding:12px 16px;background:rgba(255,255,255,.03);border-radius:8px;line-height:2">
    <strong style="color:var(--text)">Konversi ke Skala TOEFL ITP (310–677)</strong> — Tiap section (maks 100) dikonversi ke range 31–68, lalu dihitung rata-rata × 10. &nbsp;
    ${TOEFL_ITP_BANDS.map(b => `<span style="color:${b.color}">${b.grade} ≥${b.min} ${b.label}</span>`).join(' &nbsp;·&nbsp; ')}
  </div>`;
}

// ─── VIEW 2: Ranking ─────────────────────────────────────────────────────────
function renderRanking(sessions) {
  const latest = sessions[sessions.length - 1];
  const ranked = _students.map(s => {
    const d = s.toefl[latest];
    const c = d ? calcTOEFL(d) : null;
    return { s, d, c, itp: c?.itp ?? 0 };
  }).sort((a, b) => b.itp - a.itp);

  const passing = ranked.filter(x => x.c?.passKedinasan);
  let rows = '';
  ranked.forEach(({ s, d, c, itp }, i) => {
    const medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '';
    const nc = i < 3 ? `top${i+1}` : 'rank-num';
    if (!d || !c) {
      rows += `<tr><td><span class="rank-num">—</span></td><td><span style="color:${s.color};font-weight:700;opacity:.5">${s.nama}</span></td><td>${genderBadge(s.gender)}</td><td colspan="5" style="color:var(--muted);font-size:12px;text-align:center">Belum ada data TOEFL ${latest}</td></tr>`;
      return;
    }
    const firstSession = sessions[0];
    const first = s.toefl[firstSession] ? calcTOEFL(s.toefl[firstSession]) : null;
    let delta = '—';
    if (first && c) {
      const v = c.itp - first.itp;
      delta = v > 0 ? `<span class="delta-up">▲ +${v}</span>` : v < 0 ? `<span class="delta-dn">▼ ${v}</span>` : `<span class="delta-flat">→ 0</span>`;
    }
    rows += `<tr>
      <td><span class="rank-num ${nc}">${medal}${i+1}</span></td>
      <td><span style="color:${s.color};font-weight:700">${s.nama}</span></td>
      <td>${genderBadge(s.gender)}</td>
      <td style="text-align:center;color:#60A5FA;font-weight:600">${d.listening ?? '—'}<small style="color:var(--muted)"> → ${c.l}</small></td>
      <td style="text-align:center;color:#4ADE80;font-weight:600">${d.reading ?? '—'}<small style="color:var(--muted)"> → ${c.r}</small></td>
      <td style="text-align:center;color:#FBBF24;font-weight:600">${d.writing ?? '—'}<small style="color:var(--muted)"> → ${c.w}</small></td>
      <td style="text-align:center">${itpBadge(c.itp, c.grade, c.label, c.color)}</td>
      <td style="text-align:center"><span style="color:${c.passKedinasan ? '#10B981' : '#EF4444'};font-weight:700;font-size:12px">${c.passKedinasan ? '✅ Lulus' : '❌ Belum'}</span></td>
      <td>${delta}</td>
    </tr>`;
  });

  return `<div style="font-size:13px;color:var(--muted);margin-bottom:12px">Ranking berdasarkan skor ITP terbaru — <strong style="color:var(--text)">TOEFL ${latest}</strong></div>
  <div class="chart-box" style="overflow-x:auto;margin-bottom:16px">
    <table class="rank-table"><thead><tr>
      <th>#</th><th>Nama Siswa</th><th>Gender</th>
      <th style="text-align:center;color:#60A5FA">Listening</th>
      <th style="text-align:center;color:#4ADE80">Reading</th>
      <th style="text-align:center;color:#FBBF24">Writing</th>
      <th style="text-align:center;color:#C084FC">Skor ITP</th>
      <th style="text-align:center">≥ ${TOEFL_MIN_KEDINASAN}</th>
      <th>Δ dari TOEFL ${sessions[0]}</th>
    </tr></thead><tbody>${rows}</tbody></table>
  </div>
  <div class="chart-box" style="padding:16px">
    <div style="font-size:13px;color:var(--muted);line-height:2">
      <strong style="color:var(--text)">📌 Ringkasan TOEFL ${latest}:</strong>
      <strong>${passing.length}</strong> dari <strong>${ranked.filter(x=>x.c).length}</strong> siswa yang hadir mencapai skor ITP ≥ ${TOEFL_MIN_KEDINASAN} (ambang minimum kedinasan).
      ${ranked[0]?.c ? ` Top skor: <strong style="color:${ranked[0].s.color}">${ranked[0].s.nama}</strong> — <strong style="color:#C084FC">${ranked[0].c.itp}</strong> (${ranked[0].c.label}).` : ''}
    </div>
  </div>`;
}

// ─── VIEW 3: Kumulatif ────────────────────────────────────────────────────────
function renderKumulatif(sessions) {
  const box = document.getElementById('toeflContent');
  const stats = _students.map(s => {
    const results = sessions.map(n => s.toefl[n] ? calcTOEFL(s.toefl[n]) : null).filter(Boolean);
    const itps = results.map(r => r.itp);
    const avg = itps.length ? Math.round(itps.reduce((a, b) => a + b, 0) / itps.length) : 0;
    const best = itps.length ? Math.max(...itps) : 0;
    const passCount = results.filter(r => r.passKedinasan).length;
    return { s, results, avg, best, passCount, attended: itps.length };
  }).sort((a, b) => b.avg - a.avg);

  let rows = '';
  stats.forEach(({ s, avg, best, passCount, attended }, i) => {
    const medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '';
    const nc = i < 3 ? `top${i+1}` : 'rank-num';
    const avgBand = TOEFL_ITP_BANDS.find(b => avg >= b.min) || TOEFL_ITP_BANDS[TOEFL_ITP_BANDS.length-1];
    const sessionCells = sessions.map(n => {
      const d = s.toefl[n];
      const c = d ? calcTOEFL(d) : null;
      if (!c) return `<td style="text-align:center;color:var(--muted)">—</td>`;
      return `<td style="text-align:center;color:${c.color};font-weight:600">${c.itp}</td>`;
    }).join('');
    rows += `<tr>
      <td><span class="rank-num ${nc}">${medal}${i+1}</span></td>
      <td><span class="rank-name" onclick="goProfile(${_students.indexOf(s)})"><span class="dot-sm" style="background:${s.color}"></span>${s.nama}</span></td>
      <td>${genderBadge(s.gender)}</td>
      ${sessionCells}
      <td style="text-align:center;color:var(--muted);font-weight:600">${attended}/${sessions.length}</td>
      <td style="text-align:center"><span style="font-weight:700;color:${avgBand.color}">${avg}</span><br><span style="font-size:10px;color:var(--muted)">${avgBand.label}</span></td>
      <td style="text-align:center;color:#10B981;font-weight:600">${best}</td>
      <td style="text-align:center;color:${passCount === attended && attended > 0 ? '#10B981' : passCount > 0 ? '#F59E0B' : '#EF4444'};font-weight:600">${passCount}/${attended}</td>
    </tr>`;
  });

  const avgKelas = stats.length ? Math.round(stats.reduce((a, x) => a + x.avg, 0) / stats.length) : 0;
  const allPass = stats.filter(x => x.passCount === x.attended && x.attended > 0);

  const html = `
  <div class="chart-box" style="overflow-x:auto;margin-bottom:16px">
    <table class="rank-table"><thead><tr>
      <th>#</th><th>Nama Siswa</th><th>Gender</th>
      ${sessions.map(n => `<th style="text-align:center">TOEFL ${n}</th>`).join('')}
      <th style="text-align:center">Ikut</th>
      <th style="text-align:center;color:#C084FC">Rata-rata ITP</th>
      <th style="text-align:center;color:#10B981">Terbaik</th>
      <th style="text-align:center">Lulus/Ikut</th>
    </tr></thead><tbody>${rows}</tbody></table>
  </div>
  <div class="chart-box" style="margin-bottom:16px"><div style="position:relative;height:240px"><canvas id="chartTOEFLKumulatif"></canvas></div></div>
  <div class="chart-box" style="padding:16px;font-size:13px;color:var(--muted);line-height:2">
    <strong style="color:var(--text)">📌 Ringkasan Kumulatif TOEFL (Sesi 1–${sessions[sessions.length-1]}):</strong>
    Rata-rata ITP kelas: <strong style="color:#C084FC">${avgKelas}</strong> — ${(TOEFL_ITP_BANDS.find(b => avgKelas >= b.min) || TOEFL_ITP_BANDS[TOEFL_ITP_BANDS.length-1]).label}.
    ${allPass.length ? `<br>Konsisten lulus (≥${TOEFL_MIN_KEDINASAN}) di semua sesi: ${allPass.map(x=>`<strong style="color:${x.s.color}">${x.s.nama}</strong>`).join(', ')}.` : ''}
    <br><span style="font-size:11px">Ambang minimum kedinasan: ITP ≥ ${TOEFL_MIN_KEDINASAN}. Skor ITP dihitung dari konversi section mentah (maks 100/section) ke skala 310–677.</span>
  </div>`;

  box.innerHTML = html;

  // Render chart after DOM is updated
  if (_kumulatifChart) { _kumulatifChart.destroy(); _kumulatifChart = null; }
  _kumulatifChart = new Chart(document.getElementById('chartTOEFLKumulatif'), {
    type: 'bar',
    data: {
      labels: stats.map(x => x.s.nama),
      datasets: [
        { type: 'line', label: `Ambang Kedinasan (${TOEFL_MIN_KEDINASAN})`, data: Array(stats.length).fill(TOEFL_MIN_KEDINASAN), borderColor: '#F59E0B', borderWidth: 1.5, borderDash: [5,4], pointRadius: 0, fill: false, order: 0 },
        { type: 'bar', label: 'Rata-rata ITP', data: stats.map(x => x.avg), backgroundColor: stats.map(x => x.s.color + 'BB'), borderRadius: 6, borderSkipped: false, order: 1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { padding: 10, font: { size: 11 } } } },
      scales: {
        y: { min: 300, max: 700, grid: { color: 'rgba(255,255,255,.04)' }, ticks: { stepSize: 50 }, title: { display: true, text: 'Skor ITP' } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

// ─── VIEW 4: Analisis Individu ────────────────────────────────────────────────
let _indivChart = null;

function renderIndividu(sessions, container) {
  if (_indivChart) { _indivChart.destroy(); _indivChart = null; }

  const withData = _students.filter(s => sessions.some(n => s.toefl[n]));
  if (!withData.length) {
    container.innerHTML = `<div class="empty-state"><p style="color:var(--muted)">Tidak ada data TOEFL tersedia.</p></div>`;
    return;
  }

  function renderStudent(idx) {
    if (_indivChart) { _indivChart.destroy(); _indivChart = null; }
    const s = withData[idx];

    container.querySelectorAll('.toeflIndvBtn').forEach((b, i) => {
      const isActive = i === idx;
      b.style.background = isActive ? s.color + '33' : 'rgba(255,255,255,.04)';
      b.style.borderColor = isActive ? s.color : 'rgba(255,255,255,.1)';
      b.style.color = isActive ? s.color : 'var(--text)';
    });

    // Latest session with data
    const latestN = [...sessions].reverse().find(n => s.toefl[n]);
    const latest = latestN ? s.toefl[latestN] : null;
    const latestCalc = latest ? calcTOEFL(latest) : null;

    // Progress across all sessions
    const progressHtml = sessions.map(n => {
      const d = s.toefl[n];
      const c = d ? calcTOEFL(d) : null;
      const active = n === latestN ? 'font-weight:700;text-decoration:underline;' : '';
      return c
        ? `<span style="${active}color:${c.color};font-size:11px">TOEFL ${n}: ${c.itp} (${c.grade})</span>`
        : `<span style="color:var(--muted);font-size:11px">TOEFL ${n}: —</span>`;
    }).join(' &nbsp;·&nbsp; ');

    // Radar data: normalize scaled score (31-68) to 0-100
    const norm = v => v == null ? 0 : Math.round((v - 31) / (68 - 31) * 100);
    const scores = latestCalc ? [norm(latestCalc.l), norm(latestCalc.r), norm(latestCalc.w)] : [0, 0, 0];
    const rawScores = latestCalc ? [latestCalc.l, latestCalc.r, latestCalc.w] : [null, null, null];
    const sectionLabels = ['Listening', 'Reading', 'Writing (S&WE)'];
    const sectionColors = ['#60A5FA', '#4ADE80', '#FBBF24'];

    // Thresholds normalized: 45 (ITP450 avg) = (45-31)/(68-31)*100 ≈ 38, 58 (good) = (58-31)/(68-31)*100 ≈ 73
    const normThreshGood = Math.round((58 - 31) / (68 - 31) * 100);
    const normThreshMin  = Math.round((45 - 31) / (68 - 31) * 100);

    const radarHtml = `
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap">
          <span style="font-size:16px;font-weight:800;color:${s.color}">${s.nama}</span>
          ${genderBadge(s.gender)}
          ${latestCalc ? `<span style="padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;color:${latestCalc.color};border:1px solid ${latestCalc.color}44;background:${latestCalc.color}11">${latestCalc.grade} · ITP ${latestCalc.itp} — ${latestCalc.label}</span>
          <span style="font-size:11px;color:${latestCalc.passKedinasan ? '#10B981' : '#EF4444'};font-weight:700">${latestCalc.passKedinasan ? '✅ Lulus Kedinasan' : '❌ Belum Lulus'}</span>` : ''}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:16px">${progressHtml}</div>
        <canvas id="toeflIndvRadar" height="300"></canvas>
      </div>`;

    const barRows = sectionLabels.map((label, i) => {
      const raw = rawScores[i];
      const pct = scores[i];
      const isGood = raw != null && raw >= 58;
      const isOk   = raw != null && raw >= 45 && raw < 58;
      const barColor = raw == null ? 'rgba(255,255,255,.1)' : isGood ? '#10B981' : isOk ? '#F59E0B' : '#EF4444';
      return `
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-size:12px;color:${sectionColors[i]};font-weight:600">${label}</span>
            <span style="font-size:11px;color:var(--muted)">Scaled: <span style="color:${barColor};font-weight:700">${raw ?? '—'}</span> / 68</span>
          </div>
          <div style="background:rgba(255,255,255,.06);border-radius:4px;height:8px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px;transition:width .4s ease"></div>
          </div>
          ${raw != null && raw < 45 ? `<div style="font-size:10px;color:#EF4444;margin-top:2px">⚠ Di bawah threshold kedinasan (min ~45) — perlu latihan intensif</div>` : ''}
        </div>`;
    }).join('');

    // Multi-session trend per section
    const trendRows = sessions.map(n => {
      const d = s.toefl[n];
      const c = d ? calcTOEFL(d) : null;
      if (!c) return '';
      const active = n === latestN ? 'font-weight:700;' : '';
      return `<tr style="${active}">
        <td style="color:var(--muted);font-size:11px">TOEFL ${n}</td>
        <td style="text-align:center;color:#60A5FA;font-size:12px;font-weight:600">${c.l}</td>
        <td style="text-align:center;color:#4ADE80;font-size:12px;font-weight:600">${c.r}</td>
        <td style="text-align:center;color:#FBBF24;font-size:12px;font-weight:600">${c.w}</td>
        <td style="text-align:center;color:${c.color};font-size:12px;font-weight:700">${c.itp}</td>
        <td style="text-align:center;font-size:11px;color:${c.passKedinasan ? '#10B981' : '#EF4444'}">${c.passKedinasan ? '✅' : '❌'}</td>
      </tr>`;
    }).join('');

    const rightPanel = `
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:20px">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px">Analisis Skor Seksi</div>
        ${barRows}
        <div style="border-top:1px solid rgba(255,255,255,.07);padding-top:14px;margin-top:6px">
          <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:10px">Riwayat Semua Sesi</div>
          <table class="rank-table" style="font-size:11px">
            <thead><tr>
              <th>Sesi</th>
              <th style="text-align:center;color:#60A5FA">Listen</th>
              <th style="text-align:center;color:#4ADE80">Read</th>
              <th style="text-align:center;color:#FBBF24">Write</th>
              <th style="text-align:center;color:#C084FC">ITP</th>
              <th style="text-align:center">≥450</th>
            </tr></thead>
            <tbody>${trendRows || '<tr><td colspan="6" style="color:var(--muted);text-align:center">Belum ada data</td></tr>'}</tbody>
          </table>
        </div>
        <div style="margin-top:12px;font-size:11px;color:var(--muted);line-height:1.7;padding:10px;background:rgba(255,255,255,.02);border-radius:8px">
          <strong style="color:var(--text)">Skala ITP:</strong>
          Skor per seksi (scaled 31–68). ITP = rata-rata scaled × 10 (310–677).
          Ambang kedinasan: ITP ≥ 450 (~scaled ≥ 45/seksi).
          <span style="color:#10B981">≥ 58</span> = baik · <span style="color:#F59E0B">45–57</span> = cukup · <span style="color:#EF4444">&lt; 45</span> = perlu push.
        </div>
      </div>`;

    document.getElementById('toeflIndvDetail').innerHTML = `
      <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">
        <div style="flex:1;min-width:300px;max-width:460px">${radarHtml}</div>
        <div style="flex:1;min-width:280px">${rightPanel}</div>
      </div>`;

    requestAnimationFrame(() => {
      const canvas = document.getElementById('toeflIndvRadar');
      if (!canvas || !latestCalc) return;
      if (_indivChart) { _indivChart.destroy(); _indivChart = null; }
      _indivChart = new Chart(canvas, {
        type: 'radar',
        data: {
          labels: sectionLabels,
          datasets: [
            {
              label: 'Threshold Kedinasan (~45)',
              data: Array(3).fill(normThreshMin),
              borderColor: '#F59E0B88',
              backgroundColor: 'transparent',
              borderDash: [4, 4],
              borderWidth: 1.5,
              pointRadius: 0,
              order: 99,
            },
            {
              label: 'Baik (58)',
              data: Array(3).fill(normThreshGood),
              borderColor: '#10B98166',
              backgroundColor: '#10B98108',
              borderDash: [6, 3],
              borderWidth: 1.5,
              pointRadius: 0,
              order: 98,
            },
            {
              label: s.nama,
              data: scores,
              borderColor: s.color,
              backgroundColor: s.color + '22',
              borderWidth: 2.5,
              pointBackgroundColor: scores.map((v, i) => {
                const raw = rawScores[i];
                return raw == null ? '#6B7280' : raw >= 58 ? '#10B981' : raw >= 45 ? '#F59E0B' : '#EF4444';
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
              min: 0,
              max: 100,
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
                  if (ctx.datasetIndex === 2) {
                    const raw = rawScores[ctx.dataIndex];
                    return ` ${ctx.dataset.label}: ${raw ?? '—'} (scaled)`;
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

  const btnHtml = withData.map((s, i) => {
    const latestN = [...sessions].reverse().find(n => s.toefl[n]);
    const c = latestN ? calcTOEFL(s.toefl[latestN]) : null;
    return `<button class="toeflIndvBtn" data-idx="${i}" style="
      cursor:pointer;border:1px solid rgba(255,255,255,.1);border-radius:10px;
      padding:8px 14px;background:rgba(255,255,255,.04);color:var(--text);
      font-size:12px;font-weight:600;text-align:left;transition:all .2s;min-width:120px">
      <span style="color:${s.color}">${s.nama}</span><br>
      <span style="font-size:10px;color:${c?.color ?? 'var(--muted)'}">ITP ${c?.itp ?? '—'} · ${c?.grade ?? '—'}</span>
    </button>`;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Pilih siswa untuk melihat analisis TOEFL detail:</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${btnHtml}</div>
    </div>
    <div id="toeflIndvDetail"></div>`;

  container.querySelectorAll('.toeflIndvBtn').forEach(btn => {
    btn.addEventListener('click', () => renderStudent(parseInt(btn.dataset.idx)));
  });

  renderStudent(0);
}

// ─── MAIN INIT ────────────────────────────────────────────────────────────────
export function init(students) {
  _students = students;
  const filter = document.getElementById('toeflFilter');
  const box = document.getElementById('toeflContent');
  filter.innerHTML = '';

  if (!hasAnyData(students)) {
    box.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>Data TOEFL belum tersedia.<br>Input nilai via Google Sheets pada sheet <strong>TOEFL</strong>.</p></div>`;
    return;
  }

  const sessions = activeSessions(students);
  if (!sessions.length) { box.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>Belum ada data TOEFL tersedia.</p></div>`; return; }

  const views = [
    { id: 'nilai',    label: '📊 Nilai per Sesi' },
    { id: 'ranking',  label: '🏆 Ranking' },
    { id: 'kumulatif',label: '📋 Kumulatif' },
    { id: 'individu', label: '🔍 Analisis Individu' },
  ];
  let activeView = 'nilai';
  let activeSession = sessions[0];

  const subFilter = document.createElement('div');
  subFilter.className = 'rank-filter';
  subFilter.style.marginBottom = '8px';

  const sessionFilter = document.createElement('div');
  sessionFilter.className = 'rank-filter';

  function renderView() {
    if (_kumulatifChart) { _kumulatifChart.destroy(); _kumulatifChart = null; }
    if (_indivChart && activeView !== 'individu') { _indivChart.destroy(); _indivChart = null; }
    if (activeView === 'nilai') {
      box.innerHTML = renderNilai(activeSession);
    } else if (activeView === 'ranking') {
      box.innerHTML = renderRanking(sessions);
    } else if (activeView === 'kumulatif') {
      renderKumulatif(sessions);
    } else {
      box.innerHTML = '';
      renderIndividu(sessions, box);
    }
    sessionFilter.style.display = activeView === 'nilai' ? 'flex' : 'none';
  }

  views.forEach(v => {
    const btn = document.createElement('div');
    btn.className = 'rank-btn' + (v.id === activeView ? ' active' : '');
    btn.textContent = v.label;
    btn.onclick = () => {
      subFilter.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeView = v.id;
      renderView();
    };
    subFilter.appendChild(btn);
  });

  sessions.forEach((n, i) => {
    const btn = document.createElement('div');
    btn.className = 'rank-btn' + (i === 0 ? ' active' : '');
    btn.textContent = `TOEFL ${n}`;
    btn.onclick = () => {
      sessionFilter.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSession = n;
      renderView();
    };
    sessionFilter.appendChild(btn);
  });

  filter.appendChild(subFilter);
  filter.appendChild(sessionFilter);
  renderView();
}
