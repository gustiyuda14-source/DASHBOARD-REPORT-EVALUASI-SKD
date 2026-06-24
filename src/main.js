import Chart from 'chart.js/auto';
import { fetchAllData } from './data.js';
import { isPass, activeTOs } from './utils.js';
import { init as initOverview } from './tabs/overview.js';
import { init as initSiswa, renderProfileByIdx } from './tabs/siswa.js';
import { init as initRanking } from './tabs/ranking.js';
import { init as initKumulatif } from './tabs/kumulatif.js';
import { init as initTOEFL } from './tabs/toefl.js';
import { init as initJASMANI } from './tabs/jasmani.js';
import { init as initPSIKO } from './tabs/psiko.js';

Chart.defaults.color = '#6B7280';
Chart.defaults.font.family = 'Poppins';
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.tooltip.backgroundColor = '#0D1529';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 10;

const TABS = ['overview', 'siswa', 'ranking', 'kumulatif', 'toefl', 'jasmani', 'psiko'];
let _students = [];

window.switchTab = function (id) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', TABS[i] === id));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + id));
};

window.goProfile = function (idx) {
  window.switchTab('siswa');
  renderProfileByIdx(_students, idx);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function updateStats(students) {
  const tos = activeTOs(students);
  const latest = tos.length ? tos[tos.length - 1] : null;
  const withData = students.filter(s => s.skd[latest]);
  const passing = withData.filter(s => isPass(s.skd[latest]));
  const scores = withData.map(s => s.skd[latest].Total);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const topScore = scores.length ? Math.max(...scores) : 0;
  const topStudent = withData.find(s => s.skd[latest]?.Total === topScore);

  document.getElementById('stat-total').textContent = students.length;
  document.getElementById('stat-avg').textContent = avg || '—';
  document.getElementById('stat-avg-sub').textContent = latest ? `dari maks 550 · TO${latest}` : '—';
  document.getElementById('stat-pass').innerHTML = latest ? `${passing.length}<span style="font-size:16px;font-weight:500">/${withData.length}</span>` : '—';
  document.getElementById('stat-pass-sub').textContent = latest ? `berdasarkan hasil TO${latest}` : '—';
  document.getElementById('stat-top').textContent = topScore || '—';
  document.getElementById('stat-top-sub').textContent = topStudent ? `${topStudent.nama} — top performer` : '—';

  const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('hdr-badge').textContent = latest ? `📊 Data TO1 – TO${latest}` : '📊 Data Siswa';
  document.getElementById('hdr-info').textContent = `${students.length} Siswa Terdaftar · ${now}`;
}

async function boot() {
  const overlay = document.getElementById('loading-overlay');
  try {
    _students = await fetchAllData();
    updateStats(_students);
    initOverview(_students);
    initSiswa(_students);
    initRanking(_students);
    initKumulatif(_students);
    initTOEFL(_students);
    initJASMANI(_students);
    initPSIKO(_students);
    overlay.classList.add('hidden');
    setTimeout(() => overlay.remove(), 500);
  } catch (err) {
    overlay.innerHTML = `<div class="error-state"><div style="font-size:48px">⚠️</div><p>Gagal memuat data dari Google Sheets.<br><small>${err.message}</small><br><br><button onclick="location.reload()" style="padding:8px 20px;border-radius:8px;border:1px solid var(--gold);background:transparent;color:var(--gold);cursor:pointer;font-size:13px">Coba Lagi</button></p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', boot);
