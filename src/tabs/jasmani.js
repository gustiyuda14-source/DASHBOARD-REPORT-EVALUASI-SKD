import Chart from 'chart.js/auto';
import { genderBadge } from '../utils.js';
import { calcJasmani, GRADE_LABELS, GRADE_COLORS } from '../config.js';

let _students = [];
let _radarChart = null;

const FIELDS = [
  { key: 'lari12',     label: "Lari 12'",        color: '#60A5FA', unit: 'm' },
  { key: 'pushup',     label: 'Push Up',          color: '#4ADE80', unit: 'rep' },
  { key: 'pullup',     label: 'Pull Up/Chin Up',  color: '#FBBF24', unit: 'rep' },
  { key: 'situp',      label: 'Sit Up',           color: '#F472B6', unit: 'rep' },
  { key: 'lariAngka8', label: 'Lari Angka 8',     color: '#A78BFA', unit: 'dtk' },
];

function hasAnyData(students) {
  return students.some(s => Object.values(s.jasmani).some(v => v !== null));
}

function activeEvals(students) {
  return [...new Set(students.flatMap(s => Object.keys(s.jasmani).map(Number).filter(n => s.jasmani[n])))].sort((a, b) => a - b);
}

// ─── VIEW 1: Tabel Nilai ──────────────────────────────────────────────────────
function renderTabel(n) {
  let rows = '';
  _students.forEach(s => {
    const d = s.jasmani[n];
    if (!d) {
      rows += `<tr><td><span style="color:${s.color};font-weight:700">${s.nama}</span></td><td>${genderBadge(s.gender)}</td><td colspan="${FIELDS.length + 3}" style="color:var(--muted);text-align:center;font-size:12px">Belum ada data</td></tr>`;
      return;
    }
    const calc = calcJasmani(s.gender, d);
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

  return `<table class="rank-table">
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
    Skor akhir = (Nilai A [Lari 12'] + Nilai B [rata-rata 4 item lainnya]) / 2.
  </div>`;
}

// ─── VIEW 2: Analisis Individu ────────────────────────────────────────────────
function renderIndividu(evalNum, evals, container) {
  if (_radarChart) { _radarChart.destroy(); _radarChart = null; }

  const withData = _students.filter(s => s.jasmani[evalNum]);
  if (!withData.length) {
    container.innerHTML = `<div class="empty-state"><p style="color:var(--muted)">Tidak ada siswa dengan data pada Evaluasi ${evalNum}.</p></div>`;
    return;
  }

  let selectedIdx = 0;

  function renderStudent(idx) {
    if (_radarChart) { _radarChart.destroy(); _radarChart = null; }
    selectedIdx = idx;
    const s = withData[idx];
    const d = s.jasmani[evalNum];
    const calc = calcJasmani(s.gender, d);

    // Update active state on student buttons
    container.querySelectorAll('.jasIndvBtn').forEach((b, i) => {
      b.style.background = i === idx ? s.color + '33' : 'rgba(255,255,255,.04)';
      b.style.borderColor = i === idx ? s.color : 'rgba(255,255,255,.1)';
      b.style.color = i === idx ? s.color : 'var(--text)';
    });

    const scores = FIELDS.map(f => calc?.scores[f.key] ?? 0);
    const weak   = FIELDS.filter(f => (calc?.scores[f.key] ?? 0) < 41 && calc?.scores[f.key] != null);
    const medium = FIELDS.filter(f => { const v = calc?.scores[f.key]; return v != null && v >= 41 && v < 80; });
    const strong = FIELDS.filter(f => (calc?.scores[f.key] ?? 0) >= 80);

    const gradeColor = calc ? GRADE_COLORS[calc.grade] : 'var(--muted)';
    const gradeLabel = calc ? GRADE_LABELS[calc.grade] : '—';

    // Progress across evaluations
    const evalRows = evals.map(en => {
      const dd = s.jasmani[en];
      if (!dd) return `<span style="color:var(--muted);font-size:11px">Ev.${en}: —</span>`;
      const cc = calcJasmani(s.gender, dd);
      const gc = cc ? GRADE_COLORS[cc.grade] : 'var(--muted)';
      const active = en === evalNum ? `font-weight:700;text-decoration:underline;` : '';
      return `<span style="${active}color:${gc};font-size:11px">Ev.${en}: ${cc?.total ?? '—'}pt (${cc?.grade ?? '—'})</span>`;
    }).join(' &nbsp;·&nbsp; ');

    const radarHtml = `
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <span style="font-size:16px;font-weight:800;color:${s.color}">${s.nama}</span>
          <span>${genderBadge(s.gender)}</span>
          <span style="padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;color:${gradeColor};border:1px solid ${gradeColor}44;background:${gradeColor}11">${calc?.grade ?? '—'} · ${calc?.total ?? '—'}pt — ${gradeLabel}</span>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:16px">${evalRows}</div>
        <canvas id="jasmaniRadarCanvas" height="300"></canvas>
      </div>`;

    const tagList = (items, color, icon) => items.length
      ? items.map(f => `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${color}18;color:${color};border:1px solid ${color}44;margin:2px">${icon} ${f.label}</span>`).join('')
      : `<span style="font-size:11px;color:var(--muted)">Tidak ada</span>`;

    const barRows = FIELDS.map(f => {
      const v = calc?.scores[f.key] ?? 0;
      const raw = d[f.key] ?? '—';
      const barColor = v < 41 ? '#EF4444' : v >= 80 ? '#10B981' : '#F59E0B';
      const pct = Math.min(100, v);
      return `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-size:12px;color:${f.color};font-weight:600">${f.label}</span>
            <span style="font-size:11px;color:var(--muted)">${raw} ${f.unit} → <span style="color:${barColor};font-weight:700">${v}pt</span></span>
          </div>
          <div style="background:rgba(255,255,255,.06);border-radius:4px;height:8px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px;transition:width .4s ease"></div>
          </div>
          ${v < 41 ? `<div style="font-size:10px;color:#EF4444;margin-top:2px">⚠ Di bawah batas minimum TMS — perlu latihan intensif</div>` : ''}
        </div>`;
    }).join('');

    const weakPanel = `
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:20px">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px">Rekomendasi Focus Area</div>
        ${weak.length ? `
        <div style="margin-bottom:12px">
          <div style="font-size:10px;color:#EF4444;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">🚨 Harus Di-Push — Kritis (< 41)</div>
          <div>${tagList(weak, '#EF4444', '▼')}</div>
        </div>` : ''}
        ${medium.length ? `
        <div style="margin-bottom:12px">
          <div style="font-size:10px;color:#F59E0B;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">⚠️ Perlu Ditingkatkan (41–79)</div>
          <div>${tagList(medium, '#F59E0B', '~')}</div>
        </div>` : ''}
        ${strong.length ? `
        <div style="margin-bottom:16px">
          <div style="font-size:10px;color:#10B981;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">✅ Sudah Baik (≥ 80)</div>
          <div>${tagList(strong, '#10B981', '▲')}</div>
        </div>` : ''}
        <div style="border-top:1px solid rgba(255,255,255,.07);padding-top:14px;margin-top:4px">
          <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:10px">Skor Per Sub Indikator</div>
          ${barRows}
        </div>
      </div>`;

    document.getElementById('jasmaniIndvDetail').innerHTML = `
      <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">
        <div style="flex:1;min-width:300px;max-width:460px">${radarHtml}</div>
        <div style="flex:1;min-width:280px">${weakPanel}</div>
      </div>`;

    // Build radar chart
    requestAnimationFrame(() => {
      const canvas = document.getElementById('jasmaniRadarCanvas');
      if (!canvas) return;
      if (_radarChart) { _radarChart.destroy(); _radarChart = null; }
      _radarChart = new Chart(canvas, {
        type: 'radar',
        data: {
          labels: FIELDS.map(f => f.label),
          datasets: [
            {
              label: 'Batas TMS (41)',
              data: Array(5).fill(41),
              borderColor: '#EF444888',
              backgroundColor: 'transparent',
              borderDash: [4, 4],
              borderWidth: 1.5,
              pointRadius: 0,
              order: 99,
            },
            {
              label: 'Target A (80)',
              data: Array(5).fill(80),
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
              pointBackgroundColor: scores.map(v => v < 41 ? '#EF4444' : v >= 80 ? '#10B981' : s.color),
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
              callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} pt` },
            },
          },
        },
      });
    });
  }

  // Student selector buttons
  const btnHtml = withData.map((s, i) => {
    const calc = calcJasmani(s.gender, s.jasmani[evalNum]);
    const gc = calc ? GRADE_COLORS[calc.grade] : 'var(--muted)';
    return `<button class="jasIndvBtn" data-idx="${i}" style="
      cursor:pointer;border:1px solid rgba(255,255,255,.1);border-radius:10px;
      padding:8px 14px;background:rgba(255,255,255,.04);color:var(--text);
      font-size:12px;font-weight:600;text-align:left;transition:all .2s;min-width:120px">
      <span style="color:${s.color}">${s.nama}</span><br>
      <span style="font-size:10px;color:${gc}">${calc?.grade ?? '—'} · ${calc?.total ?? '—'}pt</span>
    </button>`;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Pilih siswa untuk melihat analisis detail:</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${btnHtml}</div>
    </div>
    <div id="jasmaniIndvDetail"></div>`;

  container.querySelectorAll('.jasIndvBtn').forEach(btn => {
    btn.addEventListener('click', () => renderStudent(parseInt(btn.dataset.idx)));
  });

  renderStudent(0);
}

// ─── MAIN INIT ────────────────────────────────────────────────────────────────
export function init(students) {
  _students = students;
  const filter = document.getElementById('jasmaniFilter');
  const box = document.getElementById('jasmaniContent');
  filter.innerHTML = '';

  if (!hasAnyData(students)) {
    box.innerHTML = `<div class="empty-state"><div class="empty-icon">💪</div><p>Data Jasmani belum tersedia.<br>Input nilai via Google Sheets pada sheet <strong>JASMANI</strong>.</p></div>`;
    return;
  }

  const evals = activeEvals(students);
  if (!evals.length) {
    box.innerHTML = `<div class="empty-state"><div class="empty-icon">💪</div><p>Belum ada data Jasmani tersedia.</p></div>`;
    return;
  }

  const views = [
    { id: 'tabel',    label: '📊 Tabel Nilai' },
    { id: 'individu', label: '🕸️ Analisis Individu' },
  ];
  let activeView = 'tabel';
  let activeEval = evals[0];

  const subFilter = document.createElement('div');
  subFilter.className = 'rank-filter';
  subFilter.style.marginBottom = '8px';

  const evalFilter = document.createElement('div');
  evalFilter.className = 'rank-filter';

  function renderView() {
    if (_radarChart && activeView !== 'individu') { _radarChart.destroy(); _radarChart = null; }
    if (activeView === 'tabel') {
      box.innerHTML = renderTabel(activeEval);
    } else {
      box.innerHTML = '';
      renderIndividu(activeEval, evals, box);
    }
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

  evals.forEach((n, i) => {
    const btn = document.createElement('div');
    btn.className = 'rank-btn' + (i === 0 ? ' active' : '');
    btn.textContent = `Evaluasi ${n}`;
    btn.onclick = () => {
      evalFilter.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeEval = n;
      renderView();
    };
    evalFilter.appendChild(btn);
  });

  filter.appendChild(subFilter);
  filter.appendChild(evalFilter);
  renderView();
}
