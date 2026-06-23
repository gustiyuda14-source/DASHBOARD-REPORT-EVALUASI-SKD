import { SKD } from './config.js';

export function isPass(d) {
  return d && !d.incomplete && d.TWK >= SKD.TWK && d.TIU >= SKD.TIU && d.TKP >= SKD.TKP;
}

export function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2);
}

export function delta(val) {
  if (val > 0) return `<span class="delta-up">▲ +${val}</span>`;
  if (val < 0) return `<span class="delta-dn">▼ ${val}</span>`;
  return `<span class="delta-flat">→ 0</span>`;
}

export function numOrDash(val) {
  return val == null ? '—' : val;
}

export function passClass(val, min) {
  if (val == null) return '';
  return val >= min ? 'cell-pass' : 'cell-fail';
}

export function genderBadge(g) {
  return g === 'P'
    ? `<span class="gender-badge-p">♀ P</span>`
    : `<span class="gender-badge-l">♂ L</span>`;
}

export function getLatestTO(student) {
  const keys = Object.keys(student.skd).map(Number).filter(n => student.skd[n]).sort((a,b) => b - a);
  return keys.length ? keys[0] : null;
}

export function activeTOs(students) {
  const set = new Set();
  students.forEach(s => Object.keys(s.skd).forEach(n => { if (s.skd[n]) set.add(parseInt(n)); }));
  return [...set].sort((a, b) => a - b);
}
