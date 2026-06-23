import { SKD } from '../config.js';
import { isPass, activeTOs, genderBadge } from '../utils.js';

let _students = [];

function buildRanking(n) {
  const ranked = _students.map(s => ({ s, d: s.skd[n] })).filter(x => x.d && !x.d.incomplete).sort((a, b) => b.d.Total - a.d.Total);
  const skipped = _students.filter(s => { const d = s.skd[n]; return !d || d.incomplete; });
  const tb = document.getElementById('rankBody');
  tb.innerHTML = '';

  ranked.forEach(({ s, d }, i) => {
    const pass = isPass(d);
    const d1 = s.skd[1];
    let deltaTxt = '—';
    if (d1 && !d1.incomplete) {
      const v = d.Total - d1.Total;
      deltaTxt = v > 0 ? `<span class="delta-up">▲ +${v}</span>` : v < 0 ? `<span class="delta-dn">▼ ${v}</span>` : `<span class="delta-flat">→ 0</span>`;
    }
    const nc = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : 'rank-num';
    const medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '';
    tb.innerHTML += `<tr>
      <td><span class="rank-num ${nc}">${medal}${i + 1}</span></td>
      <td><span class="rank-name" onclick="goProfile(${_students.indexOf(s)})"><span class="dot-sm" style="background:${s.color}"></span>${s.nama}</span></td>
      <td>${genderBadge(s.gender)}</td>
      <td class="${d.TWK >= SKD.TWK ? 'cell-pass' : 'cell-fail'}">${d.TWK}</td>
      <td class="${d.TIU >= SKD.TIU ? 'cell-pass' : 'cell-fail'}">${d.TIU}</td>
      <td class="${d.TKP >= SKD.TKP ? 'cell-pass' : 'cell-fail'}">${d.TKP}</td>
      <td class="total-col" style="color:${pass ? '#10B981' : '#EF4444'}">${d.Total}</td>
      <td><span class="${pass ? 'status-lulus' : 'status-gagal'}">${pass ? '✅ Lulus' : '❌ Gagal'}</span></td>
      <td>${deltaTxt}</td>
    </tr>`;
  });

  skipped.forEach(s => {
    const d = s.skd[n];
    tb.innerHTML += `<tr><td><span class="rank-num">—</span></td><td><span class="rank-name" style="opacity:.5">${s.nama}</span></td><td>${genderBadge(s.gender)}</td><td colspan="6" style="color:var(--muted);font-size:12px">${d?.incomplete ? 'Tidak Lengkap' : 'Tidak Hadir'}</td><td>—</td></tr>`;
  });

  const passing = ranked.filter(x => isPass(x.d));
  const top = ranked[0];
  document.getElementById('rankInsights').innerHTML = `<div style="font-size:13px;color:var(--muted);line-height:2">
    <b style="color:var(--text)">📌 Ringkasan Tryout ${n}:</b>
    <strong>${passing.length}</strong> dari <strong>${ranked.length}</strong> siswa yang hadir lulus seluruh threshold SKD IPDN.
    ${top ? ` Top skor: <strong style="color:${top.s.color}">${top.s.nama}</strong> dengan <strong>${top.d.Total} poin</strong>.` : ''}
    <br>${skipped.length > 0 ? `Tidak hadir/tidak lengkap: ${skipped.map(s => `<strong>${s.nama}</strong>`).join(', ')}.` : 'Semua siswa hadir.'}
    <br><span style="font-size:11px">Klik nama siswa untuk melihat profil lengkap.</span>
  </div>`;
}

export function init(students) {
  _students = students;
  const tos = activeTOs(students);
  if (!tos.length) return;

  const filter = document.getElementById('rankTOFilter');
  filter.innerHTML = '';
  const latest = tos[tos.length - 1];
  tos.forEach(n => {
    const btn = document.createElement('div');
    btn.className = 'rank-btn' + (n === latest ? ' active' : '');
    btn.textContent = n === latest ? `✨ Tryout ${n} (Terbaru)` : `Tryout ${n}`;
    btn.onclick = () => {
      filter.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildRanking(n);
    };
    filter.appendChild(btn);
  });
  buildRanking(latest);
}
