// Generates docs/mass-effect-starfinder-2e-conversion.html from source pack JSON files.
// Usage: node scripts/generate-class-html.mjs

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { flattenEnrichers, indexPacks, summarizeClass } from './doc-helpers.mjs';

const SRC = 'src/packs';
const ICONS_DIR = join('docs', 'images', 'actions');

async function loadIconCss() {
  const names = { OneAction: 'one', TwoActions: 'two', ThreeActions: 'three', Reaction: 'reaction', FreeAction: 'free' };
  let css = '';
  for (const [file, key] of Object.entries(names)) {
    const buf = await readFile(join(ICONS_DIR, `${file}.png`));
    const b64 = buf.toString('base64');
    css += `.ai-${key}{background-image:url("data:image/png;base64,${b64}")}\n`;
  }
  return css;
}

let ICON_CSS = '';

function actionImg(key, alt) {
  return `<span class="action-icon ai-${key}" role="img" aria-label="${alt}" title="${alt}"></span>`;
}

const CLASS_COLORS = {
  SOLDIER:     { accent: '#c41e3a', dark: '#8b1429', text: '#fce4e8' },
  ENGINEER:    { accent: '#0369a1', dark: '#024f82', text: '#e0f2fe' },
  ADEPT:       { accent: '#7c3aed', dark: '#5b21b6', text: '#ede9fe' },
  VANGUARD:    { accent: '#9333ea', dark: '#6b21a8', text: '#f3e8ff' },
  INFILTRATOR: { accent: '#0f766e', dark: '#0a5e58', text: '#ccfbf1' },
  SENTINEL:    { accent: '#b45309', dark: '#854000', text: '#fef3c7' },
};

const CLASS_ROLEPLAY = {
  SOLDIER: {
    combat:    'You hold the line, laying down suppressive fire to keep enemies pinned while your squad maneuvers. You cycle through ammo powers to exploit weaknesses and close the distance when the moment demands it.',
    social:    'You speak plainly and expect the same in return. Diplomacy has its place, but you\'re quick to note when the enemy isn\'t stopping for negotiations.',
    exploring: 'You take point or watch the rear, weapon at low ready. Cover positions, chokepoints, and potential ambush sites register as naturally as breathing.',
    downtime:  'You drill. Weapon maintenance, combat simulations, and physical conditioning are your routine. You might also spend time mentoring newer soldiers or reviewing after-action reports.',
    youMight: [
      'Approach every obstacle as a tactical problem to be solved with superior firepower and positioning.',
      'Keep your squadmates alive through sheer aggression, believing the best defense is overwhelming offense.',
      'Have strong opinions about weapon loadouts and spend downtime calibrating gear.',
    ],
    othersMight: [
      'Respect your combat instincts but wonder if you ever met a problem you didn\'t want to shoot.',
      'Rely on you to hold the line when everything else falls apart.',
      'Assume you\'re always ready for a fight, even in peacetime.',
    ],
  },
  ENGINEER: {
    combat:    'You stand at the edge of the firefight, deploying tech powers and drones to control the battlefield. You disrupt enemy systems and create openings for allies while staying mobile enough to avoid direct engagement.',
    social:    'You prefer facts over feelings and can get lost in technical tangents. You\'re most valuable when someone needs a rapid assessment of a technical threat.',
    exploring: 'You scan everything. Terminals, access panels, and structural details catch your eye. You often find shortcuts or resources others walk right past.',
    downtime:  'You tinker — upgrading equipment, running diagnostics, writing VI subroutines, or prototyping new tech powers. You maintain detailed logs and schematics of everything you\'ve touched.',
    youMight: [
      'See every mechanical system as a puzzle waiting to be solved and every piece of enemy tech as a potential tool.',
      'Pause mid-firefight to admire elegant engineering before destroying it.',
      'Have strong opinions on power-to-weight ratios and optimal system configurations.',
    ],
    othersMight: [
      'Come to you first when something electronic stops working.',
      'Assume you can hack, override, or disable anything given enough time.',
      'Worry you\'ll start disassembling critical equipment out of curiosity.',
    ],
  },
  ADEPT: {
    combat:    'You are the force multiplier. Singularity and throw clear formations while warp shreds through barriers. You prime targets for biotic detonations and look for the moment the battlefield tips in your favor.',
    social:    'You\'re perceptive about intent — emotions sometimes wash over you through your amp. You navigate social situations with patience and read the room better than most.',
    exploring: 'You sense pressure differentials, structural stresses, and gravitational anomalies that warn of danger ahead. Confined spaces don\'t bother you.',
    downtime:  'You meditate and run biotic exercises that look effortless but require intense focus. You study dark energy theory and push your amp\'s calibration to its limits.',
    youMight: [
      'Feel the dark energy currents around you even in peaceful moments, perceiving the world as a lattice of mass and force.',
      'Trust your biotic instincts when logic says otherwise.',
      'Find combat almost meditative — every throw and warp an expression of who you are.',
    ],
    othersMight: [
      'Watch you nervously in confined spaces, wondering if a biotic surge might happen without warning.',
      'Rely on you to shred through enemy defenses that weapons can\'t touch.',
      'Assume you have a more complicated relationship with your own mortality than most.',
    ],
  },
  VANGUARD: {
    combat:    'You are the opening salvo. Charge carries you directly into enemy formations and your shotgun and nova abilities turn the resulting chaos into opportunity. You leave long-range work to others.',
    social:    'You speak your mind without hesitation and have little patience for prolonged negotiation. You\'re honest — sometimes brutally so — and people trust you because of it.',
    exploring: 'You move aggressively through space, comfortable with closeness and proximity that makes others nervous. You\'re often first through the door.',
    downtime:  'You push your physical limits constantly — sparring, conditioning, drilling the muscle memory of combat. You study enemy tactics looking for new angles for Charge.',
    youMight: [
      'Judge every situation by whether to charge in or wait for the perfect moment — and almost always charge.',
      'Feed off the chaos of close-quarters fighting where biotics and a shotgun are the only things that matter.',
      'Run toward gunfire as a reflex rather than a decision.',
    ],
    othersMight: [
      'Worry you\'ll get yourself killed doing something reckless — then watch you emerge from the wreckage unscathed.',
      'Rely on you to break up defensive formations no one else can crack.',
      'Assume your survival instincts are entirely optional to you.',
    ],
  },
  INFILTRATOR: {
    combat:    'You find high ground, eliminate priority targets with precision, and keep enemies off-balance with tech powers and tactical cloak. You engage and disengage faster than anyone can track.',
    social:    'You\'re observant and economical with words. You notice inconsistencies others miss and file them away. You can be charming when needed, but it\'s always a tool.',
    exploring: 'You move quietly and efficiently, gathering information before committing to a path. Guard patterns, camera positions, and emergency exits register automatically.',
    downtime:  'You clean and calibrate weapons with near-ritualistic precision. You review mission data, run scenarios in your head, and prepare for situations you hope never happen.',
    youMight: [
      'See every room as a set of angles, lines of sight, and kill zones before noticing the furniture.',
      'Keep your own counsel — information is ammunition, and you don\'t share either carelessly.',
      'Trust your own assessment over anyone else\'s intel.',
    ],
    othersMight: [
      'Appreciate your precision but find your silences unnerving.',
      'Assume you know things you\'re not sharing.',
      'Rely on you to gather intelligence no one else could safely obtain.',
    ],
  },
  SENTINEL: {
    combat:    'You hold position under fire, using tech armor, overload, and biotic powers to deny ground and protect allies. You don\'t charge — you hold, counter, and let enemies break themselves against you.',
    social:    'You listen more than you talk. When you do share an opinion it\'s measured and well-reasoned. People look to you when they want an honest assessment without emotional noise.',
    exploring: 'You\'re methodical and thorough. You check for hazards, verify exits, and establish fallback positions before the squad moves forward.',
    downtime:  'You review defensive protocols, run threat simulations, and calibrate your medical kit. You want every system performing optimally when it counts.',
    youMight: [
      'Hold the line when everyone else is pulling back, trusting your armor and training to absorb what others can\'t.',
      'Resist surrendering tactical initiative even when the numbers say you should.',
      'Feel personally responsible when a teammate takes damage you could have prevented.',
    ],
    othersMight: [
      'Rely on you as the immovable anchor of any engagement.',
      'Assume your defensive systems can absorb more punishment than any one person should.',
      'Trust you with the rear guard or the most exposed position without hesitation.',
    ],
  },
};

async function loadFeat(packDir, filename) {
  const p = join(SRC, packDir, filename);
  const raw = await readFile(p, 'utf8');
  return JSON.parse(raw);
}


function actionSymbol(actionType, actions) {
  if (actionType === 'reaction') return actionImg('reaction',  'Reaction');
  if (actionType === 'free')     return actionImg('free',      'Free Action');
  if (actionType === 'passive')  return null;
  if (actions === 1)             return actionImg('one',       'One Action');
  if (actions === 2)             return actionImg('two',       'Two Actions');
  if (actions === 3)             return actionImg('three',     'Three Actions');
  return null;
}

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function ordinal(n) {
  if (n === 1)  return '1ST';
  if (n === 2)  return '2ND';
  if (n === 3)  return '3RD';
  if (n === 21) return '21ST';
  if (n === 22) return '22ND';
  if (n === 23) return '23RD';
  return `${n}TH`;
}

function renderFeatEntry(feat) {
  const s = feat.system;
  const sym    = actionSymbol(s.actionType.value, s.actions.value);
  const traits = (s.traits?.value || []).filter(t => t && t !== 'common');
  const prereqs = s.prerequisites.value.map(p => p.value).filter(Boolean);

  const symHtml = sym
    ? `<span class="feat-action-sym">${sym}</span>`
    : '';
  const traitsHtml = traits.length
    ? `<div class="feat-traits">${traits.map(t => `<span class="trait-badge">${t}</span>`).join('')}</div>`
    : '';
  const prereqHtml = prereqs.length
    ? `<p class="feat-prereq"><em>Prerequisites:</em> ${prereqs.join(', ')}</p>`
    : '';

  return `<div class="feat-entry">
  <div class="feat-header">
    <div class="feat-name-line">
      <span class="feat-name">${feat.name}</span>${symHtml}
    </div>
    <div class="feat-level-badge">FEAT ${s.level.value}</div>
  </div>
  ${traitsHtml}${prereqHtml}<div class="feat-description">${s.description.value}</div>
</div>`;
}

function buildAdvancementTable(info) {
  let rows = '';
  for (let lvl = 1; lvl <= 20; lvl++) {
    const parts = info.grants.filter(g => g.level === lvl).map(g =>
      g.item.system.category === 'classfeature' && !g.item._id.startsWith('meProf') ? `<strong>${g.name}</strong>` : g.name);
    if (info.classFeatLevels.has(lvl)) parts.push('Class Feat');
    parts.push(...(info.standard[lvl] ?? []).map(s => `<span class="adv-std">${s}</span>`));
    const cell = parts.length ? parts.join(', ') : '—';
    const rowClass = lvl % 2 === 0 ? ' class="even-row"' : '';
    rows += `<tr${rowClass}><td class="adv-level">${lvl}</td><td>${cell}</td></tr>`;
  }
  return `<table class="advancement-table">
  <thead><tr><th>Level</th><th>Class Features</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function renderSidebar(cls) {
  const classOrder = ['SOLDIER', 'ENGINEER', 'ADEPT', 'VANGUARD', 'INFILTRATOR', 'SENTINEL'];
  const clsIndex = classOrder.indexOf(cls.name) + 1;
  const navItems = classOrder.map(name => {
    const active = name === cls.name;
    return `<a href="#${name.toLowerCase()}" class="sidebar-item${active ? ' sidebar-active' : ''}">${name}</a>`;
  }).join('');
  return `<aside class="class-sidebar">
  <div class="sidebar-badge">${clsIndex}</div>
  <div class="sidebar-label">MASS EFFECT</div>
  <div class="sidebar-section-label">CLASSES</div>
  <nav class="sidebar-nav">${navItems}</nav>
</aside>`;
}

function buildFeatColumns(flatItems, darkColor, accentColor) {
  const bg = darkColor && accentColor
    ? `background:linear-gradient(to right,${darkColor},${accentColor})`
    : 'background:linear-gradient(to right,#2d3748,#4a5568)';
  let html = '';
  let curLevel = null;
  for (const { feat, level } of flatItems) {
    if (level !== curLevel) {
      curLevel = level;
      html += `<div class="level-header-bar" style="${bg}"><span>${ordinal(level)} LEVEL</span></div>`;
    }
    html += renderFeatEntry(feat);
  }
  return `<div class="feats-columns">${html}</div>`;
}

function renderProficiencies(profs) {
  if (!profs?.length) return '';
  const groups = profs.map(({ group, items }) => {
    const itemsHtml = items.map(i => `<div class="prof-item">${i}</div>`).join('');
    return `<div class="prof-group"><div class="prof-group-name">${group}</div>${itemsHtml}</div>`;
  }).join('');
  return `<div class="proficiency-block"><div class="prof-section-title">Initial Proficiencies</div>${groups}</div>`;
}

function renderRoleplay(className) {
  const rp = CLASS_ROLEPLAY[className];
  if (!rp) return '';
  const ctxKeys = [['combat', 'During Combat'], ['social', 'During Social Encounters'], ['exploring', 'While Exploring'], ['downtime', 'In Downtime']];
  const contextHtml = ctxKeys
    .filter(([k]) => rp[k])
    .map(([k, label]) => `<div class="roleplay-item"><span class="roleplay-context">${label}.</span> ${rp[k]}</div>`)
    .join('');
  const mightHtml = rp.youMight
    ? `<div class="might-block"><div class="might-title">You Might...</div><ul class="might-list">${rp.youMight.map(i => `<li>${i}</li>`).join('')}</ul></div>`
    : '';
  const otherHtml = rp.othersMight
    ? `<div class="might-block"><div class="might-title">Others Probably...</div><ul class="might-list">${rp.othersMight.map(i => `<li>${i}</li>`).join('')}</ul></div>`
    : '';
  return `<div class="roleplay-section"><div class="roleplay-header">Roleplaying the ${titleCase(className)}</div>${contextHtml}${mightHtml}${otherHtml}</div>`;
}

function renderClass(cls, info, allFeats, masteryFeats) {
  const colors = CLASS_COLORS[cls.name];
  const keyAbility = info.keyAttributes.join(' or ');
  const { flavor, mechanics } = info;
  const feature = info.signatureFeature;

  const featsByLevel = new Map();
  for (const feat of allFeats) {
    const lvl = feat.system.level.value;
    if (!featsByLevel.has(lvl)) featsByLevel.set(lvl, []);
    featsByLevel.get(lvl).push(feat);
  }
  const levels = [...featsByLevel.keys()].sort((a, b) => a - b);

  // Full feat text lives in the Feats section; the class carries a level index.
  const featIndexRows = levels.map(level => {
    const names = [...featsByLevel.get(level)].sort((a, b) => a.name.localeCompare(b.name))
      .map(f => f.name).join(', ');
    return `<tr><td><strong>${level}</strong></td><td>${names}</td></tr>`;
  }).join('\n');

  const masteryItems = (masteryFeats ?? []).map(f => ({ feat: f, level: f.system.level.value }));
  const masteryColumns = masteryItems.length
    ? buildFeatColumns(masteryItems, colors.dark, colors.accent)
    : '';

  const keyAbilityHtml = keyAbility
    ? `<div class="class-stat-box class-stat-key"><span class="stat-label">Key Attribute</span><div class="stat-value stat-value-key">${keyAbility}</div></div>`
    : '';

  const bonusHtml = `<div class="class-stat-box"><span class="stat-label">Hit Points</span><div class="stat-value">${info.hp} plus your Constitution modifier</div></div>`;
  const featureHtml = feature
    ? `<div class="mech-item"><span class="mech-label">${feature.name}</span><span class="mech-value">${feature.system.description.value.replace(/<\/?p>/g, '').trim()}</span></div>`
    : '';

  const mechItems = mechanics.map(m => {
    const labelMatch = m.match(/<strong>([\s\S]*?)<\/strong>/);
    const label = labelMatch ? labelMatch[1].replace(/:$/, '') : null;
    const body = label
      ? m.replace(/<strong>[\s\S]*?<\/strong>:?\s*/, '').replace(/<\/?p>/g, '').trim()
      : m.replace(/<\/?p>/g, '').trim();
    if (label) return `<div class="mech-item"><span class="mech-label">${label}</span><span class="mech-value">${body}</span></div>`;
    return `<div class="mech-item"><span class="mech-value">${body}</span></div>`;
  }).join('');

  const masterySection = masteryColumns
    ? `\n  <h3 class="section-bar" style="background:#0f2034">Class Mastery</h3>
  <p class="mastery-note">These features are automatically granted at the indicated levels — they are not chosen from the feat list.</p>
  <div class="feats-area">
${masteryColumns}  </div>`
    : '';

  return `<section class="class-section" id="${cls.name.toLowerCase()}">
<div class="class-main">
  <div class="class-name-bar">
    <div class="header-accent-lines"></div>
    <div class="header-content">
      <div>
        <h2 class="class-name">${titleCase(cls.name)}</h2>
        <p class="class-tagline">${feature?.name ?? ''}</p>
      </div>
    </div>
  </div>
  <p class="class-flavor">${flavor}</p>

  <div class="class-info-grid">
    <div class="class-stats-col">
      ${keyAbilityHtml}
      ${bonusHtml}
      ${renderProficiencies(info.proficiencies)}
      <div class="class-feat-note">Class feats available at levels: 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20</div>
    </div>
    <div class="class-mechanics-col">${featureHtml}${mechItems}${renderRoleplay(cls.name)}</div>
  </div>

  <h3 class="section-bar" style="background:#0f2034">Advancement</h3>
  ${buildAdvancementTable(info)}
${masterySection}
  <h3 class="section-bar" style="background:#0f2034">Class Feats</h3>
  <p class="section-intro">${cls.name} feats are listed in full under <strong>Feats → Class Feats → ${titleCase(cls.name)}</strong>. Class feats are available at levels 1, 2, 4, 6, 8, 10, 12, 14, 16, 18 and 20.</p>
  <div class="equipment-subsection"><div class="equipment-table-wrap">
    <table class="data-table"><thead><tr><th>Level</th><th>${titleCase(cls.name)} Feats</th></tr></thead><tbody>${featIndexRows}</tbody></table>
  </div></div>
</div>
</section>`;
}

// ── CSS ────────────────────────────────────────────────────────────────────────

const CSS = `
@font-face{font-family:'Korataki';src:url('fonts/Korataki-Regular.woff2') format('woff2');font-weight:400;font-style:normal}
@font-face{font-family:'MyriadPro';src:url('fonts/MyriadPro-Regular.woff2') format('woff2');font-weight:400;font-style:normal}
@font-face{font-family:'Slider';src:url('fonts/Slider-Regular.woff2') format('woff2');font-weight:400;font-style:normal}
@font-face{font-family:'GoodOT';src:url('fonts/GoodOT.woff2') format('woff2');font-weight:400;font-style:normal}
@font-face{font-family:'GoodOT';src:url('fonts/GoodOT-Bold.woff2') format('woff2');font-weight:700;font-style:normal}
@font-face{font-family:'GoodOT';src:url('fonts/GoodOT-Italic.woff2') format('woff2');font-weight:400;font-style:italic}
@font-face{font-family:'GoodOT-Cond';src:url('fonts/GoodOT-Cond.woff2') format('woff2');font-weight:400;font-style:normal}
@font-face{font-family:'GoodOT-Cond';src:url('fonts/GoodOT-CondBold.woff2') format('woff2');font-weight:700;font-style:normal}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

body{
  font-family:'MyriadPro',sans-serif;
  font-size:9pt;
  line-height:1.5;
  color:#1a1a2e;
  background:#ffffff;
  print-color-adjust:exact;
  -webkit-print-color-adjust:exact;
}

/* N7 stripe — right side, repeats on every PDF page */
.n7-stripe{
  position:fixed;
  top:0;bottom:0;right:0;
  width:62px;
  z-index:10;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:space-between;
  padding:10px 0 10px;
  background:linear-gradient(to right,
    #0d0f1a 0 11px,
    #dcdcdc 11px 13.5px,
    #b91c2a 13.5px 48.5px,
    #dcdcdc 48.5px 51px,
    #0d0f1a 51px 62px
  );
  print-color-adjust:exact;
  -webkit-print-color-adjust:exact;
}
.n7-badge{
  width:38px;
  height:38px;
  flex-shrink:0;
}
.n7-badge img{
  width:100%;
  height:100%;
  object-fit:contain;
  filter:drop-shadow(0 2px 6px rgba(0,0,0,0.9)) drop-shadow(0 0 3px rgba(0,0,0,0.7));
  print-color-adjust:exact;
  -webkit-print-color-adjust:exact;
}
.n7-label{
  writing-mode:vertical-rl;
  transform:rotate(180deg);
  font-family:'Korataki',sans-serif;
  font-size:1.3rem;
  letter-spacing:0.35em;
  color:#ffffff;
  text-shadow:0 0 10px rgba(196,30,58,0.9),0 0 20px rgba(196,30,58,0.5);
  flex:1;
  display:flex;
  align-items:center;
  justify-content:center;
}

.page-wrap{
  max-width:1140px;
  margin:0 auto;
  padding:2rem 80px 2rem 1.5rem;
}

/* ── Title Page ──────────────────────────────────────────── */
.title-page{
  text-align:center;
  padding:5rem 2rem 4rem;
  background:rgba(15,32,52,0.92);
  color:#ffffff;
  margin-bottom:2.5rem;
  page-break-after:always;
}
.title-logo{
  max-width:420px;
  width:80%;
  margin-bottom:1rem;
}
.title-page .title-sub{
  font-family:'Slider',sans-serif;
  font-weight:400;
  font-size:1.4rem;
  letter-spacing:0.2em;
  text-transform:uppercase;
  color:#4a9ed6;
  margin-bottom:2rem;
}
.title-page .title-rule{
  width:8rem;
  height:3px;
  background:#4a9ed6;
  margin:0 auto 2rem;
}
.title-page .title-body{
  font-style:italic;
  font-size:1.1rem;
  max-width:500px;
  margin:0 auto;
  color:#c8d8e8;
  line-height:1.6;
}

/* ── TOC ─────────────────────────────────────────────────── */
.toc{
  background:#ffffff;
  border:1px solid #cbd5e0;
  padding:2rem;
  margin-bottom:3rem;
  page-break-after:always;
}
.toc h2{
  font-family:'Korataki',sans-serif;
  font-weight:400;
  font-size:1.4rem;
  letter-spacing:0.12em;
  text-transform:uppercase;
  color:#0f2034;
  border-bottom:3px solid #0f2034;
  padding-bottom:0.4rem;
  margin-bottom:1.25rem;
}
.toc-list{
  display:flex;
  flex-direction:column;
  gap:0.5rem;
}
.toc-entry{
  display:flex;
  align-items:baseline;
  gap:0.5rem;
}
.toc-dot{
  flex:1;
  border-bottom:1px dotted #a0aec0;
}
.toc-entry a{
  font-family:'Slider',sans-serif;
  font-weight:700;
  font-size:1.1rem;
  letter-spacing:0.06em;
  text-transform:uppercase;
  text-decoration:none;
  color:#0f2034;
  white-space:nowrap;
}
.toc-entry a:hover{color:#4a9ed6}
.toc-pg{
  font-family:'Slider',sans-serif;
  font-size:0.9rem;
  font-weight:700;
  color:#0f2034;
  white-space:nowrap;
}
/* ── Part hierarchy (Character Options / Bestiary / Shield Mechanics) ──────── */
.toc-part{
  font-family:'Korataki',sans-serif;
  font-size:0.95rem;
  letter-spacing:0.1em;
  text-transform:uppercase;
  color:#0f2034;
  border-bottom:2px solid #0f2034;
  padding-bottom:0.2rem;
  margin:1.1rem 0 0.5rem;
}
.toc-part:first-child{margin-top:0}
.toc-entry.sub{padding-left:1.4rem}
.toc-entry.sub a{font-size:0.92rem;font-weight:400;color:#4a5568}
.part-divider{
  page-break-before:always;
  break-before:page;
  background:#0f2034;
  color:#fff;
  padding:1.6rem 1.5rem;
  margin:0 0 1.25rem;
  border-left:6px solid #4a9ed6;
}
.part-divider .part-eyebrow{
  font-family:'GoodOT-Cond',sans-serif;
  font-size:0.72rem;
  letter-spacing:0.22em;
  text-transform:uppercase;
  color:#4a9ed6;
  margin-bottom:0.3rem;
}
.part-divider h2{
  font-family:'Korataki',sans-serif;
  font-size:1.9rem;
  letter-spacing:0.1em;
  text-transform:uppercase;
  margin:0;
}
.part-divider p{
  font-family:'GoodOT-Cond',sans-serif;
  font-size:0.82rem;
  color:rgba(255,255,255,.8);
  margin:0.45rem 0 0;
  max-width:52em;
}
/* Shield Mechanics */
.mech-block{border:1px solid #e2e8f0;border-left:3px solid #4a9ed6;background:#fff;padding:0.6rem 0.8rem;margin:0 0.75rem 0.7rem;font-size:0.76rem;line-height:1.55;color:#1a1a2e}
.mech-block h4{font-family:'Korataki',sans-serif;font-size:0.82rem;letter-spacing:0.06em;text-transform:uppercase;color:#0f2034;margin:0 0 0.3rem}
.mech-block p{margin:0.25rem 0}
.mech-flow{display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem;margin:0.5rem 0.75rem 0.8rem;font-family:'Korataki',sans-serif;font-size:0.78rem;letter-spacing:0.05em}
.mech-step{background:#0f2034;color:#fff;padding:0.3rem 0.7rem;border-radius:3px}
.mech-step.b{background:#7c3aed}.mech-step.s{background:#0369a1}.mech-step.a{background:#b45309}.mech-step.h{background:#c41e3a}
.mech-arrow{color:#718096;font-size:1rem}

/* ── General Feats Section ───────────────────────────────── */
.general-section{
  margin-bottom:2.5rem;
  page-break-before:always;
  overflow:hidden;
}
.general-section .class-main{
  background:#ffffff;
}
.general-pack-header{
  font-family:'Korataki',sans-serif;
  font-weight:400;
  font-size:0.95rem;
  text-transform:uppercase;
  color:#ffffff;
  background:#2d3748;
  padding:0.35rem 0.75rem;
  margin:0.75rem 0 0;
  break-after:avoid;
  page-break-after:avoid;
}

/* ── Class Section ───────────────────────────────────────── */
.class-section{
  margin-bottom:2.5rem;
  page-break-before:always;
  overflow:hidden;
}
.class-main{
  background:#ffffff;
  display:flex;
  flex-direction:column;
}

/* ── Class Header Bar (SF2e texture) ─────────────────────── */
.class-name-bar{
  background-image:url(images/sf2e-class-header.jpg);
  background-size:cover;
  background-position:center;
  position:relative;
  padding:1.25rem 2rem 1rem;
  overflow:hidden;
}
.header-accent-lines{
  position:absolute;
  top:0;left:0;right:0;
  height:5px;
  background:linear-gradient(to right,
    #4dd9d9 0%, #4dd9d9 50%,
    #d94499 50%, #d94499 100%);
}
.header-content{
  display:flex;
  justify-content:space-between;
  align-items:flex-end;
  position:relative;
  z-index:1;
}
.class-name{
  font-family:'Korataki',sans-serif;
  font-weight:400;
  font-size:2.55rem;
  text-transform:uppercase;
  color:#ffffff;
  line-height:0.9;
  margin:0;
}
.class-tagline{
  font-family:'Slider',sans-serif;
  font-weight:400;
  font-size:1rem;
  letter-spacing:0.15em;
  text-transform:uppercase;
  color:rgba(255,255,255,0.65);
  margin-top:0.3rem;
}
.header-chapter{
  font-family:'Slider',sans-serif;
  font-weight:700;
  font-size:0.7rem;
  letter-spacing:0.18em;
  text-transform:uppercase;
  color:rgba(255,255,255,0.5);
  align-self:flex-start;
  padding-top:0.25rem;
}


.class-flavor{
  font-style:italic;
  font-size:0.9rem;
  text-align:center;
  color:#2d3748;
  padding:1rem 3rem;
  background:#f7fafc;
  border-bottom:1px solid #e2e8f0;
  line-height:1.6;
}

/* ── Class Info Grid ─────────────────────────────────────── */
.class-info-grid{
  display:grid;
  grid-template-columns:220px 1fr;
  gap:0;
  border-bottom:1px solid #e2e8f0;
}
.class-stats-col{
  background:#f0f4f8;
  padding:1.25rem;
  border-right:1px solid #e2e8f0;
  display:flex;
  flex-direction:column;
  gap:0.75rem;
}
.class-stat-box{
  background:#ffffff;
  border:1px solid #e2e8f0;
  border-radius:4px;
  padding:0.6rem 0.75rem;
}
.stat-label{
  display:block;
  font-family:'Slider',sans-serif;
  font-weight:700;
  font-size:0.7rem;
  letter-spacing:0.1em;
  text-transform:uppercase;
  color:#718096;
  margin-bottom:0.2rem;
}
.stat-value{
  font-size:0.77rem;
  color:#1a1a2e;
}
.stat-value strong{color:#0f2034}
.class-stat-key{border-left:3px solid #4a9ed6}
.stat-value-key{
  font-family:'GoodOT-Cond',sans-serif;
  font-weight:700;
  font-size:0.9rem;
  color:#0f2034;
  text-transform:uppercase;
  letter-spacing:0.04em;
}
.class-feat-note{
  font-size:0.68rem;
  color:#718096;
  font-style:italic;
  line-height:1.4;
}

.class-mechanics-col{
  padding:1.25rem 1.5rem;
  display:flex;
  flex-direction:column;
  gap:0.4rem;
}
.mech-item{
  font-size:0.8rem;
  line-height:1.5;
}
.mech-label{
  font-family:'Slider',sans-serif;
  font-weight:700;
  font-size:0.77rem;
  letter-spacing:0.04em;
  text-transform:uppercase;
  color:#0f2034;
  margin-right:0.4rem;
}
.mech-value{
  color:#2d3748;
}
.mech-value em{color:#4a5568;font-style:italic}
.mech-value strong{color:#0f2034;font-weight:600}

/* ── Section Bar ─────────────────────────────────────────── */
.section-bar{
  font-family:'Korataki',sans-serif;
  font-weight:400;
  font-size:0.9rem;
  text-transform:uppercase;
  color:#ffffff;
  padding:0.4rem 1.5rem;
  margin:0;
  break-after:avoid;
  page-break-after:avoid;
}

/* ── Advancement Table ───────────────────────────────────── */
.advancement-table{
  width:100%;
  border-collapse:collapse;
  font-size:0.74rem;
}
.advancement-table thead{
  background:#2d3748;
  color:#ffffff;
  font-family:'Korataki',sans-serif;
  font-size:0.78rem;
  letter-spacing:0.1em;
  text-transform:uppercase;
}
.advancement-table th{
  padding:0.35rem 0.75rem;
  text-align:left;
}
.advancement-table td{
  padding:0.22rem 0.75rem;
  border-bottom:1px solid #e2e8f0;
  vertical-align:top;
}
.even-row{background:#f7fafc}
.adv-level{
  font-family:'Korataki',sans-serif;
  font-weight:400;
  width:3.5rem;
  text-align:center;
  color:#0f2034;
}
.adv-std{color:#a0aec0;font-style:italic}

/* ── Action Key ──────────────────────────────────────────── */
.action-key{
  font-family:'GoodOT-Cond',sans-serif;
  font-size:0.71rem;
  letter-spacing:0.05em;
  color:#718096;
  padding:0.4rem 1.5rem;
  background:#f7fafc;
  border-bottom:1px solid #e2e8f0;
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:0.2rem;
}
.action-key .action-icon{width:1em;height:1em;top:0}

/* ── Level Group + Two-Column Feat Layout ────────────────── */
.level-group{
  margin-top:0.25rem;
}
.feats-columns{
  column-count:2;
  column-gap:0.6rem;
  padding:0.75rem;
}

.level-header-bar{
  color:#ffffff;
  font-family:'MyriadPro',sans-serif;
  font-weight:400;
  font-size:0.72rem;
  letter-spacing:0.06em;
  text-transform:uppercase;
  padding:0.3rem 0.75rem;
  margin:0;
  break-after:avoid;
  page-break-after:avoid;
}

/* ── Feat Entry ──────────────────────────────────────────── */
.feat-entry{
  break-inside:avoid;
  page-break-inside:avoid;
  margin:0 0 0.6rem 0;
  padding:0.5rem 0.6rem;
  border:1px solid #e2e8f0;
  border-radius:4px;
  background:#ffffff;
  display:block;
}
.feat-header{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:0.4rem;
  margin-bottom:0.15rem;
}
.feat-name-line{
  display:flex;
  align-items:center;
  gap:0.3rem;
  flex:1;
  flex-wrap:wrap;
}
.feat-name{
  font-family:'GoodOT-Cond',sans-serif;
  font-weight:700;
  font-size:0.97rem;
  text-transform:uppercase;
  letter-spacing:0.04em;
  color:#0f2034;
}
.feat-action-sym{display:inline-flex;align-items:center;gap:0.15rem;margin-left:0.2rem}
.action-icon{
  display:inline-block;
  width:1.1em;
  height:1.1em;
  background-size:contain;
  background-repeat:no-repeat;
  background-position:center;
  vertical-align:middle;
  position:relative;
  top:-0.06em;
  flex-shrink:0;
}
.feat-level-badge{
  font-family:'GoodOT-Cond',sans-serif;
  font-weight:700;
  font-size:0.67rem;
  letter-spacing:0.07em;
  text-transform:uppercase;
  background:#0f2034;
  color:#ffffff;
  padding:0.12rem 0.4rem;
  border-radius:3px;
  white-space:nowrap;
  flex-shrink:0;
}
.feat-traits{
  display:flex;
  flex-wrap:wrap;
  gap:0.2rem;
  margin:0.2rem 0;
}
.trait-badge{
  font-family:'GoodOT-Cond',sans-serif;
  font-weight:600;
  font-size:0.67rem;
  letter-spacing:0.06em;
  text-transform:uppercase;
  background:#4a9ed6;
  color:#ffffff;
  padding:0.1rem 0.35rem;
  border-radius:3px;
}
.feat-prereq{
  font-size:0.72rem;
  color:#4a5568;
  margin:0.15rem 0;
}
.feat-description{
  font-size:0.71rem;
  line-height:1.5;
  color:#1a1a2e;
}
.feat-description p{margin:0.2rem 0}
.feat-description p:first-child{margin-top:0}
.feat-description strong{font-weight:600;color:#0f2034}
.feat-description em{color:#4a5568}
.feat-description ul{margin:0.2rem 0 0.2rem 1.2rem;padding:0}
.feat-description li{margin:0.1rem 0}

/* ── Proficiency Block ───────────────────────────────────── */
.proficiency-block{
  background:#ffffff;
  border:1px solid #e2e8f0;
  border-radius:4px;
  padding:0.5rem 0.75rem;
}
.prof-section-title{
  font-family:'Slider',sans-serif;
  font-weight:700;
  font-size:0.7rem;
  letter-spacing:0.1em;
  text-transform:uppercase;
  color:#0f2034;
  border-bottom:2px solid #0f2034;
  margin-bottom:0.4rem;
  padding-bottom:0.15rem;
}
.prof-group{margin-bottom:0.25rem}
.prof-group-name{
  font-family:'GoodOT-Cond',sans-serif;
  font-weight:700;
  font-size:0.67rem;
  letter-spacing:0.06em;
  text-transform:uppercase;
  color:#4a5568;
  margin-top:0.15rem;
}
.prof-item{
  font-size:0.74rem;
  color:#1a1a2e;
  padding-left:0.5rem;
  line-height:1.35;
}

/* ── Mastery Chain Note ──────────────────────────────────── */
.mastery-note{
  font-size:0.72rem;
  color:#4a5568;
  font-style:italic;
  margin-bottom:0.5rem;
}

/* ── Roleplay Section ────────────────────────────────────── */
.roleplay-section{
  margin-top:0.75rem;
  padding-top:0.6rem;
  border-top:1px solid #e2e8f0;
}
.roleplay-header{
  font-family:'Korataki',sans-serif;
  font-weight:400;
  font-size:0.75rem;
  text-transform:uppercase;
  letter-spacing:0.12em;
  color:#0f2034;
  margin-bottom:0.35rem;
}
.roleplay-item{
  font-size:0.72rem;
  line-height:1.45;
  margin-bottom:0.25rem;
}
.roleplay-context{
  font-family:'GoodOT',sans-serif;
  font-weight:700;
  font-size:0.72rem;
  color:#0f2034;
  margin-right:0.25rem;
}
.might-block{margin-top:0.35rem}
.might-title{
  font-family:'GoodOT',sans-serif;
  font-weight:700;
  font-size:0.72rem;
  color:#0f2034;
  margin-top:0.25rem;
}
.might-list{
  margin:0.1rem 0 0 1rem;
  padding:0;
}
.might-list li{
  font-size:0.71rem;
  color:#2d3748;
  line-height:1.4;
  margin:0.08rem 0;
}

/* ── Print ───────────────────────────────────────────────── */
@media print{
  body{
    font-size:7.5pt;
    print-color-adjust:exact;
    -webkit-print-color-adjust:exact;
  }
  .n7-stripe{
    print-color-adjust:exact;
    -webkit-print-color-adjust:exact;
  }
  .page-wrap{padding:0 80px 0 1.5rem;max-width:none}
  .class-section{page-break-before:always}
  .class-name-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .class-sidebar{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .title-page{page-break-after:always}
  .toc{page-break-after:always}
  .feat-entry{border-color:#ccc;break-inside:avoid;page-break-inside:avoid}
  .advancement-table{break-inside:avoid;page-break-inside:avoid}
  a{color:inherit;text-decoration:none}
  .feats-columns{column-gap:0}
}

/* ── Ancestries ───────────────────────────── */
.ancestry-section,.backgrounds-section,.equipment-section{margin-bottom:2.5rem;page-break-before:always;overflow:hidden}
.ancestry-page{margin-bottom:1.5rem;page-break-before:always;overflow:hidden;background:#fff}
/* Cropped rather than full 21:9 so the mechanics aside clears the first page. */
.ancestry-banner{display:block;width:100%;height:225px;object-fit:cover;object-position:center 42%;border-bottom:3px solid #0f2034}
.ancestry-traitline{display:flex;flex-wrap:wrap;gap:0.15rem;padding:0.3rem 0.75rem;background:#e2e8f0;border-bottom:1px solid #cbd5e0}
.ancestry-trait{font-family:'GoodOT-Cond',sans-serif;font-size:0.58rem;text-transform:uppercase;letter-spacing:0.05em;background:#2d3748;color:#fff;padding:0.05rem 0.3rem;border-radius:2px}
.ancestry-trait.rarity-common{background:#4a5568}
.ancestry-trait.rarity-uncommon{background:#b45309}
.ancestry-trait.rarity-rare{background:#0369a1}
/* Float, not grid: Chrome treats a grid container as monolithic in paged media,
   so the whole two-column block jumped to the next page and orphaned the header. */
.ancestry-layout{border-bottom:1px solid #e2e8f0;padding:0.7rem 0.9rem}
.ancestry-layout::after{content:'';display:block;clear:both}
.ancestry-prose{font-size:0.72rem;line-height:1.5;color:#1a1a2e}
.ancestry-prose p{margin:0 0 0.4rem}
.ancestry-prose ul{margin:0 0 0.45rem 1rem}
.ancestry-prose li{margin-bottom:0.12rem}
.ancestry-prose h4{font-family:'Slider',sans-serif;font-weight:700;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.09em;color:#0f2034;margin:0.55rem 0 0.22rem;border-bottom:1px solid #e2e8f0;padding-bottom:0.1rem}
.ancestry-lead{font-style:italic;color:#2d3748;border-left:3px solid #4a9ed6;padding-left:0.55rem;margin-bottom:0.5rem}
/* The mechanics aside runs 700-950px tall. Letting it fragment keeps the header
   and banner on the same page as the prose; individual abilities stay intact. */
/* Sized so the tallest aside (quarian) still clears the first page: wider column
   means fewer wrapped lines, and the type is a step down from the body text. */
.ancestry-mech{float:right;width:302px;margin:0 0 0.6rem 0.85rem;background:#0f2034;color:#dbe6f2;padding:0.6rem 0.65rem;font-size:0.605rem;line-height:1.4;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.mech-title{font-family:'Korataki',sans-serif;font-size:0.665rem;letter-spacing:0.06em;text-transform:uppercase;color:#fff;border-bottom:2px solid #4a9ed6;padding-bottom:0.16rem;margin-bottom:0.3rem}
.mech-row{margin:0.07rem 0}
.mech-row b{color:#7fc4ef;font-weight:700}
.mech-sep{border:0;border-top:1px solid rgba(255,255,255,.18);margin:0.32rem 0}
.mech-ability{margin:0.24rem 0;break-inside:avoid;page-break-inside:avoid}
.mech-ability .mech-ab-name{font-family:'GoodOT-Cond',sans-serif;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.04em;font-size:0.625rem}
.mech-ability p{margin:0.06rem 0;color:#bccfe2;font-size:0.578rem;line-height:1.36}
.mech-ability ul{margin:0.08rem 0 0.08rem 0.8rem;color:#bccfe2;font-size:0.578rem}
.ancestry-sub{font-family:'Korataki',sans-serif;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.07em;color:#0f2034;padding:0.26rem 0.75rem;background:#e2e8f0;margin:0}
.heritage-block{padding:0.35rem 0.9rem;font-size:0.7rem;line-height:1.45;color:#1a1a2e;break-inside:avoid;page-break-inside:avoid}
.heritage-block p{margin:0 0 0.25rem}
.heritage-name{font-family:'GoodOT-Cond',sans-serif;font-weight:700;font-size:0.75rem;color:#0f2034;text-transform:uppercase;letter-spacing:0.03em}

/* ── Backgrounds ──────────────────────────────────────── */
.section-intro{font-size:0.76rem;color:#4a5568;font-style:italic;padding:0.4rem 1rem;background:#f7fafc;border-bottom:1px solid #e2e8f0}
.backgrounds-table-wrap,.equipment-table-wrap{padding:0.5rem 0.75rem}
.data-table{width:100%;border-collapse:collapse;font-size:0.69rem}
.data-table thead{background:#2d3748;color:#fff;font-family:'Korataki',sans-serif;font-size:0.7rem;letter-spacing:0.07em;text-transform:uppercase}
.data-table th{padding:0.28rem 0.45rem;text-align:left}
.data-table td{padding:0.2rem 0.45rem;border-bottom:1px solid #e2e8f0;vertical-align:top;color:#1a1a2e}
.data-table tr:nth-child(even) td{background:#f7fafc}
.data-table td strong{color:#0f2034;font-weight:600}

/* ── Equipment ────────────────────────────────────────── */
.equipment-subsection{margin-bottom:0.6rem}
.equip-table-title{font-family:'Korataki',sans-serif;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.07em;color:#0f2034;padding:0.28rem 0.75rem;background:#e2e8f0;margin:0}
.trait-key{font-size:0.65rem;color:#718096;font-style:italic;padding:0.2rem 0.75rem;line-height:1.5}
.trait-key strong{color:#4a5568;font-style:normal}

/* ── NPC stat blocks ───────────────────────────────────────────────────────── */
.npc-faction{margin-bottom:0.5rem}
.npc-faction-title{font-family:'Korataki',sans-serif;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.07em;color:#0f2034;padding:0.28rem 0.75rem;background:#e2e8f0;margin:0}
.npc-faction-title .npc-count{float:right;font-family:'GoodOT-Cond',sans-serif;color:#718096;letter-spacing:0}
.npc-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;padding:0.75rem}
.npc-block{border:1px solid #e2e8f0;border-left:3px solid #4a9ed6;border-radius:3px;background:#fff;padding:0.45rem 0.6rem;
  break-inside:avoid;page-break-inside:avoid;font-size:0.68rem;line-height:1.45;color:#1a1a2e}
.npc-head{display:flex;justify-content:space-between;align-items:baseline;gap:0.5rem;
  border-bottom:1px solid #e2e8f0;padding-bottom:0.18rem;margin-bottom:0.24rem}
.npc-name{font-family:'Korataki',sans-serif;font-size:0.8rem;letter-spacing:0.05em;text-transform:uppercase;color:#0f2034}
.npc-level{font-family:'GoodOT-Cond',sans-serif;font-size:0.7rem;font-weight:700;color:#4a9ed6;white-space:nowrap}
.npc-traits{display:flex;flex-wrap:wrap;gap:0.15rem;margin-bottom:0.24rem}
.npc-trait{font-family:'GoodOT-Cond',sans-serif;font-size:0.57rem;text-transform:uppercase;letter-spacing:0.05em;
  background:#2d3748;color:#fff;padding:0.04rem 0.28rem;border-radius:2px}
.npc-trait.rarity-uncommon{background:#b45309}
.npc-trait.rarity-rare{background:#0369a1}
.npc-trait.rarity-unique{background:#7c3aed}
.npc-flavor{font-style:italic;color:#4a5568;font-size:0.645rem;margin:0 0 0.24rem;line-height:1.4}
.npc-line{margin:0.08rem 0}
.npc-line b{color:#0f2034;font-weight:700}
.npc-rule{border:0;border-top:1px solid #e2e8f0;margin:0.26rem 0}
.npc-strike b:first-child{color:#c41e3a}
.npc-ability{margin:0.16rem 0}
.npc-ability .npc-ab-name{color:#0f2034;font-weight:700}
.npc-ability p{margin:0.08rem 0}
.npc-ability hr{display:none}
.npc-block .action-icon{vertical-align:-0.08em}
@media print{
  .ancestry-section,.backgrounds-section,.equipment-section{page-break-before:always}
  .ancestry-page{page-break-before:always}
  .mech-ability{break-inside:avoid;page-break-inside:avoid}
  .heritage-block{break-inside:avoid;page-break-inside:avoid}
  .data-table{break-inside:auto}
}
`;

// ── Class-to-feat mapping ──────────────────────────────────────────────────────

const CLASSES = [
  {
    name: 'SOLDIER',
    classFile: ['me-classes', 'soldier.json'],
    masteryChain: [
      ['me-combat-passives', 'soldier-mastery.json'],
      ['me-combat-passives', 'soldier-mastery-improved.json'],
      ['me-combat-passives', 'soldier-mastery-superior.json'],
    ],
    feats: [
      ['me-combat-passives', 'adrenaline-rush.json'],
      ['me-combat-passives', 'adrenaline-rush-improved.json'],
      ['me-combat-passives', 'adrenaline-rush-master.json'],
      ['me-combat-passives', 'concussive-shot.json'],
      ['me-combat-passives', 'concussive-shot-improved.json'],
      ['me-combat-passives', 'concussive-shot-master.json'],
      ['me-combat-passives', 'concussive-shot-volley.json'],
      ['me-combat-passives', 'frag-grenade-feat.json'],
      ['me-ammo-powers',     'incendiary-feat.json'],
      ['me-ammo-powers',     'disruptor-feat.json'],
      ['me-ammo-powers',     'cryo-feat.json'],
      ['me-class-progressions', 'upgrade-ammo-master.json'],
      ['me-class-progressions', 'soldier-heavy-weapon-training.json'],
      ['me-class-progressions', 'soldier-tactical-reload.json'],
      ['me-class-progressions', 'soldier-devastating-rounds.json'],
      ['me-class-progressions', 'soldier-suppressing-fire.json'],
      ['me-class-progressions', 'soldier-battlefield-commander.json'],
      ['me-class-progressions', 'soldier-legendary-combat.json'],
      ['me-class-progressions', 'soldier-war-machine.json'],
    ],
  },
  {
    name: 'ENGINEER',
    classFile: ['me-classes', 'engineer.json'],
    masteryChain: [
      ['me-combat-passives', 'engineer-mastery.json'],
      ['me-combat-passives', 'engineer-mastery-improved.json'],
      ['me-combat-passives', 'engineer-mastery-superior.json'],
    ],
    feats: [
      ['me-tech-powers', 'incinerate-feat.json'],
      ['me-tech-powers', 'overload-feat.json'],
      ['me-tech-powers', 'cryo-blast-feat.json'],
      ['me-tech-powers', 'combat-drone-feat.json'],
      ['me-tech-powers', 'sabotage-feat.json'],
      ['me-tech-powers', 'sentry-turret-feat.json'],
      ['me-class-progressions', 'upgrade-overload.json'],
      ['me-class-progressions', 'upgrade-incinerate.json'],
      ['me-class-progressions', 'upgrade-combat-drone.json'],
      ['me-class-progressions', 'engineer-system-override.json'],
      ['me-class-progressions', 'engineer-tech-field.json'],
      ['me-class-progressions', 'engineer-overload-network.json'],
      ['me-class-progressions', 'engineer-drone-commander.json'],
      ['me-class-progressions', 'engineer-omni-grenade.json'],
      ['me-class-progressions', 'engineer-network-shutdown.json'],
      ['me-class-progressions', 'engineer-apex-engineer.json'],
    ],
  },
  {
    name: 'ADEPT',
    classFile: ['me-classes', 'adept.json'],
    masteryChain: [
      ['me-combat-passives', 'adept-mastery.json'],
      ['me-combat-passives', 'adept-mastery-improved.json'],
      ['me-combat-passives', 'adept-mastery-superior.json'],
    ],
    feats: [
      ['me-biotic-powers', 'throw-feat.json'],
      ['me-biotic-powers', 'pull-feat.json'],
      ['me-biotic-powers', 'shockwave-feat.json'],
      ['me-biotic-powers', 'warp-feat.json'],
      ['me-biotic-powers', 'singularity-feat.json'],
      ['me-biotic-powers', 'cluster-grenade-feat.json'],
      ['me-class-progressions', 'upgrade-warp.json'],
      ['me-class-progressions', 'upgrade-singularity.json'],
      ['me-class-progressions', 'adept-biotic-resonance.json'],
      ['me-class-progressions', 'adept-warp-field.json'],
      ['me-class-progressions', 'adept-gravity-well.json'],
      ['me-class-progressions', 'adept-biotic-cascade.json'],
      ['me-class-progressions', 'adept-dark-matter.json'],
      ['me-class-progressions', 'adept-ascendant-form.json'],
    ],
  },
  {
    name: 'VANGUARD',
    classFile: ['me-classes', 'vanguard.json'],
    masteryChain: [
      ['me-combat-passives', 'vanguard-mastery.json'],
      ['me-combat-passives', 'vanguard-mastery-improved.json'],
      ['me-combat-passives', 'vanguard-mastery-superior.json'],
    ],
    feats: [
      ['me-biotic-powers', 'pull-feat.json'],
      ['me-biotic-powers', 'charge-feat.json'],
      ['me-biotic-powers', 'shockwave-feat.json'],
      ['me-biotic-powers', 'nova-feat.json'],
      ['me-biotic-powers', 'vanguard-rush-feat.json'],
      ['me-ammo-powers',   'incendiary-feat.json'],
      ['me-ammo-powers',   'cryo-feat.json'],
      ['me-class-progressions', 'upgrade-charge.json'],
      ['me-class-progressions', 'upgrade-nova.json'],
      ['me-class-progressions', 'vanguard-unstoppable-charge.json'],
      ['me-class-progressions', 'vanguard-biotic-warrior.json'],
      ['me-class-progressions', 'vanguard-vanguard-strike.json'],
      ['me-class-progressions', 'vanguard-rampage.json'],
      ['me-class-progressions', 'vanguard-deaths-embrace.json'],
      ['me-class-progressions', 'vanguard-apex-vanguard.json'],
    ],
  },
  {
    name: 'INFILTRATOR',
    classFile: ['me-classes', 'infiltrator.json'],
    masteryChain: [
      ['me-combat-passives', 'infiltrator-mastery.json'],
      ['me-combat-passives', 'infiltrator-mastery-improved.json'],
      ['me-combat-passives', 'infiltrator-mastery-superior.json'],
    ],
    feats: [
      ['me-tech-powers', 'incinerate-feat.json'],
      ['me-tech-powers', 'tactical-cloak-feat.json'],
      ['me-tech-powers', 'sabotage-feat.json'],
      ['me-tech-powers', 'sticky-grenade-feat.json'],
      ['me-ammo-powers', 'disruptor-feat.json'],
      ['me-ammo-powers', 'cryo-feat.json'],
      ['me-class-progressions', 'upgrade-incinerate.json'],
      ['me-class-progressions', 'upgrade-tactical-cloak.json'],
      ['me-class-progressions', 'infiltrator-ghost-protocol.json'],
      ['me-class-progressions', 'infiltrator-assassination-protocol.json'],
      ['me-class-progressions', 'infiltrator-hunters-mark.json'],
      ['me-class-progressions', 'infiltrator-phantom-protocol.json'],
      ['me-class-progressions', 'infiltrator-death-from-above.json'],
      ['me-class-progressions', 'infiltrator-apex-infiltrator.json'],
    ],
  },
  {
    name: 'SENTINEL',
    classFile: ['me-classes', 'sentinel.json'],
    masteryChain: [
      ['me-combat-passives', 'sentinel-mastery.json'],
      ['me-combat-passives', 'sentinel-mastery-improved.json'],
      ['me-combat-passives', 'sentinel-mastery-superior.json'],
    ],
    feats: [
      ['me-biotic-powers', 'throw-feat.json'],
      ['me-biotic-powers', 'warp-feat.json'],
      ['me-biotic-powers', 'lift-grenade-feat.json'],
      ['me-tech-powers',   'armor-feat.json'],
      ['me-tech-powers',   'overload-feat.json'],
      ['me-tech-powers',   'cryo-blast-feat.json'],
      ['me-class-progressions', 'upgrade-overload.json'],
      ['me-class-progressions', 'upgrade-warp.json'],
      ['me-class-progressions', 'sentinel-hybrid-core.json'],
      ['me-class-progressions', 'sentinel-adaptive-defense.json'],
      ['me-class-progressions', 'sentinel-interference-field.json'],
      ['me-class-progressions', 'sentinel-battle-hardened.json'],
      ['me-class-progressions', 'sentinel-sentinels-resolve.json'],
      ['me-class-progressions', 'sentinel-apex-sentinel.json'],
    ],
  },
];

// ── General Feats section renderer ────────────────────────────────────────────

function renderGeneralPacks(featsByPack) {
  // featsByPack: Map of packLabel -> sorted feat array
  let body = '';
  for (const [packLabel, feats] of featsByPack) {
    const sorted = [...feats].sort((a, b) => {
      const d = a.system.level.value - b.system.level.value;
      return d !== 0 ? d : a.name.localeCompare(b.name);
    });
    const items = sorted.map(feat => ({ feat, level: feat.system.level.value }));
    body += `<h4 class="general-pack-header">${packLabel}</h4>\n`;
    body += buildFeatColumns(items, null, null);
  }

  return body;
}

// ── General Feats (powers not assigned to any class) ──────────────────────────

const GENERAL_FEATS = [
  // Biotic Powers
  ['me-biotic-powers', 'lift-feat.json'],
  ['me-biotic-powers', 'lash-feat.json'],
  ['me-biotic-powers', 'slam-feat.json'],
  ['me-biotic-powers', 'reave-feat.json'],
  ['me-biotic-powers', 'stasis-feat.json'],
  ['me-biotic-powers', 'dark-channel-feat.json'],
  ['me-biotic-powers', 'dominate-feat.json'],
  ['me-biotic-powers', 'flare-feat.json'],
  // Tech Powers
  ['me-tech-powers', 'damping-feat.json'],
  ['me-tech-powers', 'neural-shock-feat.json'],
  ['me-tech-powers', 'geth-shield-boost-feat.json'],
  ['me-tech-powers', 'decoy-feat.json'],
  ['me-tech-powers', 'ai-hacking-feat.json'],
  ['me-tech-powers', 'energy-drain-feat.json'],
  ['me-tech-powers', 'defense-drone-feat.json'],
  ['me-tech-powers', 'defense-matrix-feat.json'],
  // Ammo Powers
  ['me-ammo-powers', 'armor-piercing-feat.json'],
  ['me-ammo-powers', 'phasic-feat.json'],
  ['me-ammo-powers', 'shredder-feat.json'],
  ['me-ammo-powers', 'warp-feat.json'],
  // Combat Passives (bonus powers available to any class)
  ['me-combat-passives', 'fortification.json'],
  ['me-combat-passives', 'fortification-improved.json'],
  ['me-combat-passives', 'fortification-master.json'],
];

// ── New-section helpers ────────────────────────────────────────────────────────

async function loadDir(packDir) {
  const dir = join(SRC, packDir);
  try { await readdir(dir); } catch { return []; }
  const files = (await readdir(dir)).filter(f => f.endsWith('.json'));
  const items = [];
  for (const file of files) {
    try { items.push(JSON.parse(await readFile(join(dir, file), 'utf8'))); } catch { /* skip */ }
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

const ABILITY_LABELS = { cha:'Charisma', con:'Constitution', dex:'Dexterity', int:'Intelligence', str:'Strength', wis:'Wisdom' };
const SKILL_LABELS   = { acr:'Acrobatics', arc:'Arcana', ath:'Athletics', cra:'Crafting', dec:'Deception', dip:'Diplomacy', itm:'Intimidation', med:'Medicine', nat:'Nature', occ:'Occultism', prf:'Performance', rel:'Religion', soc:'Society', ste:'Stealth', sur:'Survival', thi:'Thievery' };
const SIZE_LABELS    = { sm:'Small', med:'Medium', lg:'Large', huge:'Huge' };

function abilityLabel(c) { return ABILITY_LABELS[c] ?? c.toUpperCase(); }
function skillLabel(c)   { return SKILL_LABELS[c] ?? c; }

function extractBoosts(obj) {
  const ALL_COUNT = 6;
  const fixed = []; let free = 0;
  for (const key of Object.keys(obj ?? {})) {
    const vals = obj[key].value ?? [];
    if (vals.length >= ALL_COUNT) free += 1;
    else if (vals.length === 1) fixed.push(abilityLabel(vals[0]));
    else if (vals.length > 1) fixed.push(vals.map(abilityLabel).join(' or '));
  }
  // Ancestries with more than one wholly-unconstrained boost read "Two Free", not "Free, Free".
  const NUM = ['', 'free', 'Two Free', 'Three Free', 'Four Free'];
  return free ? [...fixed, NUM[free] ?? `${free} Free`] : fixed;
}
function extractFlaws(obj) {
  const out = [];
  for (const key of Object.keys(obj ?? {})) out.push(...(obj[key].value ?? []).map(abilityLabel));
  return out;
}
function firstPara(html) {
  const m = html?.match(/<p[^>]*>(?:<em>)?([\s\S]*?)(?:<\/em>)?<\/p>/);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

const LANGUAGE_LABELS = {
  taldane:'Common', thessian:'Thessian', khelish:'Khelish', batarian:'Batarian',
  drell:'Drell', elcor:'Elcor', hanar:'Hanar', krogan:'Krogan',
  salarian:'Salarian', turian:'Turian', volus:'Volus', vorcha:'Vorcha',
};
const VISION_LABELS = { 'low-light-vision':'Low-Light Vision', darkvision:'Darkvision' };
const SHORT_VISION  = { 'low-light-vision':'Low-Light', darkvision:'Dark' };
// AoN/SF2e uses "Beliefs" where the pack text still says "Alignment and Religion".
const ANCESTRY_HEADING_MAP = { 'Alignment and Religion':'Beliefs' };

function languageLabel(c) { return LANGUAGE_LABELS[c] ?? titleCase(c); }

// Ancestry descriptions follow one shape: an italic hook and an overview paragraph,
// an <hr/>, then a run of <p><strong>Heading</strong></p> blocks.
function parseAncestryDescription(value) {
  const parts = value.split(/<hr\s*\/?>/);
  const head = parts[0] ?? '';
  const rest = parts.slice(1).join('');
  const paras = [...head.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m => m[1]);
  const flavor = (paras[0] ?? '').replace(/<\/?em>/g, '').trim();
  const overview = paras.slice(1).map(p => `<p>${p}</p>`).join('');
  const sections = [];
  const re = /<p[^>]*><strong>([^<]+)<\/strong><\/p>([\s\S]*?)(?=<p[^>]*><strong>|$)/g;
  let m;
  while ((m = re.exec(rest))) {
    let heading = m[1].trim().replace(/\.\.\.$/, '\u2026');
    heading = ANCESTRY_HEADING_MAP[heading] ?? heading;
    sections.push({ heading, body: m[2].trim() });
  }
  return { flavor, overview, sections };
}

function ancestrySlug(anc) { return anc.system?.slug ?? anc.name.toLowerCase(); }

// The two level-0 entries each ancestry grants are its special abilities, not feats:
// they belong in the mechanics block, and are filtered out of Racial Feats.
function ancestrySpecialNames(ancestries) {
  return new Set(ancestries.flatMap(a => Object.values(a.system?.items ?? {}).map(i => i.name)));
}

function renderAncestryMechanics(anc, ancestryFeats) {
  const s = anc.system;
  const boosts = extractBoosts(s.boosts).map(b => b === 'free' ? 'Free' : b);
  const flaws  = extractFlaws(s.flaws);
  const vision = VISION_LABELS[s.vision];

  const base  = (s.languages?.value ?? []).map(languageLabel).join(', ');
  const pool  = (s.additionalLanguages?.value ?? []).map(languageLabel).join(', ');
  const count = s.additionalLanguages?.count ?? 0;
  const extra = count > 0
    ? `${count} additional language${count === 1 ? '' : 's'}, plus a number of languages equal to your Intelligence modifier (if positive)`
    : 'a number of additional languages equal to your Intelligence modifier (if positive)';
  const langLine = `${base}. You also gain ${extra}, chosen from ${pool}.`;

  const specials = Object.values(s.items ?? {})
    .map(i => ancestryFeats.find(f => f.name === i.name))
    .filter(Boolean)
    .map(f => `<div class="mech-ability"><span class="mech-ab-name">${f.name}</span>${f.system.description.value}</div>`)
    .join('');

  return `<aside class="ancestry-mech">
      <div class="mech-title">${anc.name} Mechanics</div>
      <div class="mech-row"><b>Hit Points</b> ${s.hp}</div>
      <div class="mech-row"><b>Size</b> ${SIZE_LABELS[s.size] ?? s.size}</div>
      <div class="mech-row"><b>Speed</b> ${s.speed} feet</div>
      <div class="mech-row"><b>Attribute Boosts</b> ${boosts.join(', ')}</div>
      <div class="mech-row"><b>Attribute Flaw${flaws.length > 1 ? 's' : ''}</b> ${flaws.length ? flaws.join(', ') : '\u2014'}</div>
      <div class="mech-row"><b>Languages</b> ${langLine}</div>
      <hr class="mech-sep">
      ${vision ? `<div class="mech-ability"><span class="mech-ab-name">${vision}</span><p>You can see in dim light as though it were bright light${s.vision === 'darkvision' ? ', and in darkness as though it were dim light (in black and white only)' : ''}.</p></div>` : ''}
      ${specials}
    </aside>`;
}

function renderAncestryPage(anc, heritageMap, featMap, ancestryFeats) {
  const s = anc.system;
  const slug = ancestrySlug(anc);
  const { flavor, overview, sections } = parseAncestryDescription(s.description.value);

  const rarity = s.traits?.rarity ?? 'common';
  const chips = [rarity, ...(s.traits?.value ?? [])]
    .map(t => `<span class="ancestry-trait${t === rarity ? ` rarity-${rarity}` : ''}">${titleCase(t)}</span>`)
    .join('');

  const prose = overview + sections
    .map(sec => `<h4>${sec.heading}</h4>${sec.body}`)
    .join('');

  const hs = (heritageMap.get(slug) ?? []).sort((a, b) => a.name.localeCompare(b.name));
  const heritagesHtml = hs.length
    ? `<h3 class="ancestry-sub">${anc.name} Heritages</h3>
  ${hs.map(h => `<div class="heritage-block"><span class="heritage-name">${h.name}</span> ${h.system.description.value}</div>`).join('\n  ')}`
    : '';

  // Ancestry feats print in full here, the way the core rulebook does it; the
  // Feats section carries an index back to these pages rather than a second copy.
  const feats = (featMap.get(slug) ?? [])
    .sort((a, b) => (a.system.level.value - b.system.level.value) || a.name.localeCompare(b.name));
  const featsHtml = feats.length
    ? `<h3 class="ancestry-sub" id="feats-${slug}">${anc.name} Feats</h3>
  <p class="section-intro">Take one of these at 1st level and every even level thereafter, provided you meet its level requirement.</p>
  <div class="feats-area">${buildFeatColumns(feats.map(f => ({ feat: f, level: f.system.level.value })), null, null)}</div>`
    : '';

  return `<section class="ancestry-page" id="ancestry-${slug}">
<div class="class-main">
  <div class="class-name-bar"><div class="header-accent-lines"></div><div class="header-content">
    <div>
      <h2 class="class-name">${anc.name}</h2>
      <p class="class-tagline">Ancestry</p>
    </div>
    <div class="header-chapter">Part I \u00b7 Ancestries</div>
  </div></div>
  <img class="ancestry-banner" src="images/ancestries/${slug}.jpg" alt="${anc.name}">
  <div class="ancestry-traitline">${chips}</div>
  <div class="ancestry-layout">
    ${renderAncestryMechanics(anc, ancestryFeats)}
    <div class="ancestry-prose">
      <p class="ancestry-lead">${flavor}</p>
      ${prose}
    </div>
  </div>
  ${heritagesHtml}
  ${featsHtml}
</div>
</section>`;
}

function renderAncestriesSection(ancestries, heritages, ancestryFeats) {
  const heritageMap = new Map();
  for (const h of heritages) {
    const slug = h.system.ancestry?.slug ?? '';
    if (!heritageMap.has(slug)) heritageMap.set(slug, []);
    heritageMap.get(slug).push(h);
  }
  const specialNames = ancestrySpecialNames(ancestries);
  const featMap = new Map();
  for (const f of ancestryFeats) {
    if (specialNames.has(f.name)) continue;
    const traits = (f.system.traits?.value ?? []).filter(t => !['common','uncommon','rare','humanoid','construct'].includes(t));
    for (const t of traits) {
      if (!featMap.has(t)) featMap.set(t, []);
      featMap.get(t).push(f);
    }
  }

  const sorted = [...ancestries].sort((a, b) => a.name.localeCompare(b.name));

  const summaryRows = sorted.map(anc => {
    const s = anc.system;
    const boosts = extractBoosts(s.boosts).map(b => b === 'free' ? 'Free' : b).join(', ');
    const flaws  = extractFlaws(s.flaws).join(', ') || '\u2014';
    return `<tr><td><strong><a href="#ancestry-${ancestrySlug(anc)}">${anc.name}</a></strong></td>`
      + `<td>${s.hp}</td><td>${SIZE_LABELS[s.size] ?? s.size}</td><td>${s.speed} ft</td>`
      + `<td>${boosts}</td><td>${flaws}</td>`
      + `<td>${SHORT_VISION[s.vision] ?? 'Normal'}</td>`
      + `<td>${(heritageMap.get(ancestrySlug(anc)) ?? []).length}</td></tr>`;
  }).join('\n');

  const intro = `<section class="ancestry-section" id="ancestries">
<div class="class-main">
  <div class="class-name-bar"><div class="header-accent-lines"></div><div class="header-content"><div>
    <h2 class="class-name">Ancestries</h2>
    <p class="class-tagline">Playable Species of the Milky Way</p>
  </div></div></div>
  <p class="section-intro">Your ancestry sets your starting Hit Points, size, Speed, attribute boosts and flaw, languages, and any special senses or biology. Choose one heritage at 1st level, then an ancestry feat at 1st level and every even level thereafter. Each species has its own page below, carrying its heritages and its full ancestry feat list.</p>
  <div class="backgrounds-table-wrap">
    <table class="data-table">
      <thead><tr><th>Ancestry</th><th>HP</th><th>Size</th><th>Speed</th><th>Boosts</th><th>Flaw</th><th>Vision</th><th>Herit.</th></tr></thead>
      <tbody>${summaryRows}</tbody>
    </table>
  </div>
</div></section>`;

  const pages = sorted.map(anc => renderAncestryPage(anc, heritageMap, featMap, ancestryFeats)).join('\n');
  return `${intro}\n${pages}`;
}

function renderBackgroundsSection(backgrounds) {
  const rows = [...backgrounds].sort((a,b) => a.name.localeCompare(b.name)).map(bg => {
    const s = bg.system;
    const boosts = extractBoosts(s.boosts).join(', ');
    const skills = (s.trainedSkills?.value ?? []).map(skillLabel).join(', ') || '—';
    const lore   = s.trainedLore ?? '—';
    const desc   = firstPara(s.description.value) || s.description.value.replace(/<[^>]+>/g,'').trim().slice(0,110);
    return `<tr><td><strong>${bg.name}</strong></td><td>${boosts}</td><td>${skills}</td><td>${lore}</td><td>${desc}</td></tr>`;
  }).join('\n');
  return `<section class="backgrounds-section" id="backgrounds">
<div class="class-main">
  <div class="class-name-bar"><div class="header-accent-lines"></div><div class="header-content"><div>
    <h2 class="class-name">Backgrounds</h2>
    <p class="class-tagline">Your history before the fight</p>
  </div></div></div>
  <p class="section-intro">Each background grants two ability boosts, skill training, a Lore skill, and one 1st-level skill feat.</p>
  <div class="backgrounds-table-wrap">
    <table class="data-table">
      <thead><tr><th>Background</th><th>Boosts</th><th>Skill</th><th>Lore</th><th>Description</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div></section>`;
}

const ACTION_KEY_HTML = () => `<div class="action-key">
    ${actionImg('one','One Action')} 1 action &nbsp;·&nbsp;
    ${actionImg('two','Two Actions')} 2 actions &nbsp;·&nbsp;
    ${actionImg('three','Three Actions')} 3 actions &nbsp;·&nbsp;
    ${actionImg('reaction','Reaction')} reaction &nbsp;·&nbsp;
    ${actionImg('free','Free Action')} free action &nbsp;·&nbsp;
    no icon = passive
  </div>`;

function partDivider(id, eyebrow, title, blurb) {
  return `<div class="part-divider" id="${id}">
  <div class="part-eyebrow">${eyebrow}</div>
  <h2>${title}</h2>
  <p>${blurb}</p>
</div>`;
}

// Feats: class feats grouped by class, then racial (ancestry) feats, then
// general & skill feats. Full text lives here; class sections carry an index.
function renderFeatsSection(classFeatSets, ancestryFeats, ancestries, generalByPack) {
  let body = `<h3 class="section-bar" style="background:#0f2034" id="feats-class">Class Feats</h3>`;
  for (const { cls, feats } of classFeatSets) {
    const colors = CLASS_COLORS[cls.name];
    const items = [...feats]
      .sort((a, b) => (a.system.level.value - b.system.level.value) || a.name.localeCompare(b.name))
      .map(f => ({ feat: f, level: f.system.level.value }));
    if (!items.length) continue;
    body += `<h4 class="general-pack-header" style="background:${colors?.dark ?? '#0f2034'}">${titleCase(cls.name)}</h4>\n`;
    body += buildFeatColumns(items, colors?.dark, colors?.accent);
  }

  body += `<h3 class="section-bar" style="background:#0f2034" id="feats-racial">Racial Feats</h3>`;
  body += `<p class="section-intro">Ancestry feats print in full on each species' own page under <strong>Ancestries</strong>, alongside the heritages and special abilities they interact with. This index lists them all by ancestry and level.</p>`;
  const specialNames = ancestrySpecialNames(ancestries);
  const byAnc = new Map();
  for (const f of ancestryFeats) {
    if (specialNames.has(f.name)) continue;
    const traits = f.system?.traits?.value ?? [];
    const anc = ancestries.find(a => traits.includes(a.system?.slug ?? a.name.toLowerCase()));
    if (!anc) continue;
    if (!byAnc.has(anc)) byAnc.set(anc, []);
    byAnc.get(anc).push(f);
  }
  const racialRows = [...byAnc]
    .sort((a, b) => a[0].name.localeCompare(b[0].name))
    .map(([anc, feats]) => {
      const slug = ancestrySlug(anc);
      const listed = [...feats]
        .sort((a, b) => (a.system.level.value - b.system.level.value) || a.name.localeCompare(b.name))
        .map(f => `${f.name} (${f.system.level.value})`)
        .join(', ');
      return `<tr><td><strong><a href="#feats-${slug}">${anc.name}</a></strong></td><td>${listed}</td></tr>`;
    }).join('');
  body += `<div class="equipment-table-wrap"><table class="data-table">
    <thead><tr><th style="width:7rem">Ancestry</th><th>Feats (level)</th></tr></thead>
    <tbody>${racialRows}</tbody>
  </table></div>`;

  body += `<h3 class="section-bar" style="background:#0f2034" id="feats-general">General &amp; Skill Feats</h3>`;
  body += `<p class="section-intro">Powers and feats that appear on two or more class feat lists, or are open to any character meeting the prerequisites.</p>`;
  body += renderGeneralPacks(generalByPack);

  return `<section class="general-section" id="feats">
<div class="class-main">
  <div class="class-name-bar"><div class="header-accent-lines"></div><div class="header-content"><div>
    <h2 class="class-name">Feats</h2>
    <p class="class-tagline">Class · Racial · General &amp; Skill</p>
  </div></div></div>
  ${ACTION_KEY_HTML()}
  ${body}
</div>
</section>`;
}

// ── NPCs ─────────────────────────────────────────────────────────────────────
// me-npcs is organised into faction subfolders, each carrying a _folder.json
// whose name/sort drive the display grouping and order.
async function loadNpcsByFaction() {
  const root = join(SRC, 'me-npcs');
  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); } catch { return []; }
  const factions = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    const files = (await readdir(dir)).filter(f => f.endsWith('.json'));
    let meta = null;
    const npcs = [];
    for (const file of files) {
      let doc;
      try { doc = JSON.parse(await readFile(join(dir, file), 'utf8')); } catch { continue; }
      if (file === '_folder.json') { meta = doc; continue; }
      if (doc?.system?.details) npcs.push(doc);
    }
    if (!npcs.length) continue;
    npcs.sort((a, b) =>
      (a.system.details.level.value - b.system.details.level.value) || a.name.localeCompare(b.name));
    factions.push({ name: meta?.name ?? titleCase(entry.name.replace(/-/g, ' ')), sort: meta?.sort ?? 9e9, npcs });
  }
  return factions.sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name));
}

const NPC_SIZES = { tiny:'Tiny', sm:'Small', med:'Medium', lg:'Large', huge:'Huge', grg:'Gargantuan' };
const SIGN = n => `${n >= 0 ? '+' : ''}${n}`;

function npcGlyph(item) {
  const s = item.system ?? {};
  const type = s.actionType?.value;
  if (type === 'reaction') return actionImg('reaction', 'Reaction');
  if (type === 'free')     return actionImg('free', 'Free Action');
  if (type === 'passive')  return '';
  return { 1: actionImg('one','1 action'), 2: actionImg('two','2 actions'), 3: actionImg('three','3 actions') }[s.actions?.value] ?? '';
}

function npcStrike(strike) {
  const s = strike.system ?? {};
  const traits = s.traits?.value ?? [];
  const rangeTrait = traits.find(t => /^range-increment-\d+$/.test(t));
  const shown = traits.filter(t => t !== rangeTrait);
  if (rangeTrait) shown.unshift(`range increment ${rangeTrait.split('-').pop()} ft`);
  const dmg = Object.values(s.damageRolls ?? {})
    .map(r => `${r.damage} ${r.damageType}`).join(' plus ');
  return `<div class="npc-line npc-strike"><b>${rangeTrait ? 'Ranged' : 'Melee'}</b> `
    + `${actionImg('one','1 action')} ${strike.name} ${SIGN(s.bonus?.value ?? 0)}`
    + `${shown.length ? ` (${shown.join(', ')})` : ''}`
    + `${dmg ? `, <b>Damage</b> ${dmg}` : ''}</div>`;
}

// Authored action descriptions repeat "<p><strong>Name</strong> <glyph></p><hr>" —
// strip that leading header so the name isn't printed twice.
function npcAbilityBody(item) {
  let html = item.system?.description?.value ?? '';
  const m = html.match(/^\s*<p>\s*<strong>([^<]*)<\/strong>[\s\S]*?<\/p>\s*(?:<hr\s*\/?>)?/i);
  if (m && m[1].trim().toLowerCase() === item.name.trim().toLowerCase()) html = html.slice(m[0].length);
  return html.replace(/<span class="action-glyph">[^<]*<\/span>/g, '').trim();
}

function renderNpcBlock(npc) {
  const s = npc.system;
  const lvl = s.details.level.value;
  const items = npc.items ?? [];

  const rarity = s.traits?.rarity ?? 'common';
  const traitTags = [
    rarity !== 'common' ? `<span class="npc-trait rarity-${rarity}">${rarity}</span>` : '',
    `<span class="npc-trait">${NPC_SIZES[s.traits?.size?.value] ?? 'Medium'}</span>`,
    ...(s.traits?.value ?? []).map(t => `<span class="npc-trait">${t}</span>`),
  ].filter(Boolean).join('');

  const skills = Object.entries(s.skills ?? {})
    .map(([k, v]) => `${titleCase(k.replace(/-/g, ' '))} ${SIGN(v.base ?? 0)}`)
    .sort().join(', ');
  const abilities = ['str','dex','con','int','wis','cha']
    .map(a => `${a.charAt(0).toUpperCase() + a.slice(1)} ${SIGN(s.abilities?.[a]?.mod ?? 0)}`).join(', ');

  const gear = items.filter(i => ['weapon','armor','equipment'].includes(i.type)).map(i => i.name);
  const shieldItem = items.find(i => i.flags?.['mass-effect-sf2e-conversion']?.shieldMax);
  const sf = shieldItem?.flags['mass-effect-sf2e-conversion'];

  const strikes = items.filter(i => i.type === 'melee').map(npcStrike).join('');
  const abils = items.filter(i => i.type === 'action').map(i => {
    const body = npcAbilityBody(i);
    return `<div class="npc-ability"><span class="npc-ab-name">${i.name}</span> ${npcGlyph(i)}${body ? ` ${body}` : ''}</div>`;
  }).join('');

  return `<div class="npc-block">
  <div class="npc-head"><span class="npc-name">${npc.name}</span><span class="npc-level">Creature ${lvl}</span></div>
  <div class="npc-traits">${traitTags}</div>
  ${s.details.blurb ? `<p class="npc-flavor">${s.details.blurb}</p>` : ''}
  <div class="npc-line"><b>Perception</b> ${SIGN(s.perception?.mod ?? 0)}${skills ? `; <b>Skills</b> ${skills}` : ''}</div>
  <div class="npc-line">${abilities}</div>
  ${gear.length ? `<div class="npc-line"><b>Items</b> ${gear.join(', ')}</div>` : ''}
  <hr class="npc-rule">
  <div class="npc-line"><b>AC</b> ${s.attributes.ac.value}; ${[['fortitude', 'Fort'], ['reflex', 'Ref'], ['will', 'Will']].filter(([k]) => s.saves?.[k]?.value != null).map(([k, l]) => `<b>${l}</b> ${SIGN(s.saves[k].value)}`).join(', ')}</div>
  <div class="npc-line"><b>HP</b> ${s.attributes.hp.max}${sf ? `; <b>Shields</b> ${sf.shieldMax} (recharge ${sf.shieldRegen}/turn)` : ''}</div>
  <hr class="npc-rule">
  <div class="npc-line"><b>Speed</b> ${s.attributes.speed?.value ?? 25} feet</div>
  ${strikes}${abils}
</div>`;
}

// Creatures and vehicles reuse the NPC stat-block renderer; they're the same
// actor shape, just sourced from different packs.
function renderStatblockGroup(id, heading, blurb, groups) {
  const total = groups.reduce((n, g) => n + g.list.length, 0);
  const body = groups.filter(g => g.list.length).map(g => `<div class="npc-faction">
  ${g.name ? `<h4 class="npc-faction-title">${g.name}<span class="npc-count">${g.list.length}</span></h4>` : ''}
  <div class="npc-grid">${g.list.map(renderNpcBlock).join('\n')}</div>
</div>`).join('\n');
  return `<h3 class="section-bar" style="background:#0f2034" id="${id}">${heading}<span style="float:right;font-family:'GoodOT-Cond',sans-serif;font-size:0.8rem;opacity:.75">${total}</span></h3>
  <p class="section-intro">${blurb}</p>
  ${body}`;
}

function renderBestiarySection(npcFactions, creatures, vehicles) {
  const byLevel = list => [...list].sort((a, b) =>
    (a.system.details.level.value - b.system.details.level.value) || a.name.localeCompare(b.name));

  // Group creatures by their leading creature trait (geth, husk, collector…)
  const CREATURE_GROUPS = [
    ['Reaper Forces', /husk|reaper|collector/i],
    ['Geth', /geth/i],
    ['Mechs', /mech/i],
    ['Wildlife & Other', /.*/],
  ];
  const used = new Set();
  const creatureGroups = CREATURE_GROUPS.map(([name, rx]) => {
    const list = byLevel(creatures.filter(c => {
      if (used.has(c.name)) return false;
      const hay = `${c.name} ${(c.system.traits?.value ?? []).join(' ')}`;
      if (!rx.test(hay)) return false;
      used.add(c.name); return true;
    }));
    return { name, list };
  });

  return `<section class="npc-section" id="bestiary-body">
<div class="class-main">
  <div class="class-name-bar"><div class="header-accent-lines"></div><div class="header-content"><div>
    <h2 class="class-name">Bestiary</h2>
    <p class="class-tagline">NPCs · Creatures · Vehicles</p>
  </div></div></div>
  ${renderStatblockGroup('npcs', 'NPCs',
    'Ready-to-run NPCs grouped by faction, matching the <em>ME NPCs</em> compendium. Shield values are kinetic barriers that absorb damage before Hit Points and recharge at the start of each turn.',
    npcFactions.map(f => ({ name: f.name, list: f.npcs })))}
  ${renderStatblockGroup('creatures', 'Creatures',
    'Hostile lifeforms, synthetics and Reaper constructs from the <em>ME Creatures</em> compendium.',
    creatureGroups)}
  ${renderStatblockGroup('vehicles', 'Vehicles &amp; Ships',
    'Crewed vehicles, gunships and capital ships. Vehicles use the same statblock format; Speed represents tactical movement.',
    [{ name: 'Vehicles', list: byLevel(vehicles.vehicles) }, { name: 'Ships', list: byLevel(vehicles.ships) }])}
</div></section>`;
}

function renderShieldMechanicsSection() {
  return `<section class="equipment-section" id="shield-mechanics-body">
<div class="class-main">
  <div class="class-name-bar"><div class="header-accent-lines"></div><div class="header-content"><div>
    <h2 class="class-name">Shield Mechanics</h2>
    <p class="class-tagline">Barriers · Kinetic Shields · Combat Frames</p>
  </div></div></div>
  <p class="section-intro">Mass Effect layers three depletable defences on top of Hit Points. The module applies them automatically whenever damage is dealt; this section documents the order and the rules governing each layer.</p>

  <h3 class="section-bar" style="background:#0f2034" id="damage-routing">Damage Routing</h3>
  <p class="section-intro">Incoming damage is consumed by each active layer in turn. A layer only passes the remainder on once it is fully depleted.</p>
  <div class="mech-flow">
    <span class="mech-step b">Biotic Barrier</span><span class="mech-arrow">→</span>
    <span class="mech-step s">Kinetic Shield</span><span class="mech-arrow">→</span>
    <span class="mech-step a">Combat Armor Frame</span><span class="mech-arrow">→</span>
    <span class="mech-step h">Hit Points</span>
  </div>
  <div class="mech-block">
    <h4>Token Bars</h4>
    <p>Tokens display a purple <strong>Biotic Barrier</strong> bar and a yellow <strong>Armor Points</strong> bar in addition to the standard HP bar, so every layer is visible at a glance. Both can be turned off in module settings.</p>
  </div>

  <h3 class="section-bar" style="background:#0369a1" id="kinetic-shields">Kinetic Shields</h3>
  <div class="mech-block">
    <h4>Capacity &amp; Recharge</h4>
    <p>A kinetic shield provides <strong>Shield HP</strong> that absorbs damage before anything else except a biotic barrier. The baseline <em>Kinetic Shield</em> carries <strong>30 Shield HP</strong> and recharges <strong>10 HP per turn</strong>. Shield HP Mods raise the maximum; Shield Regen Mods raise the recharge rate. Only one of each may be installed at a time.</p>
    <p>Recharging pauses for <strong>1 round</strong> after the shield takes damage (configurable; Recharge Accelerator mods reduce the delay).</p>
  </div>
  <div class="mech-block">
    <h4>Depletion &amp; Taking Cover</h4>
    <p>When a shield is reduced to 0, it stays offline until its bearer <strong>Takes Cover</strong> — it will not recharge on its own. While a shield is down at the start of a turn the module posts a reminder in chat.</p>
  </div>
  <div class="mech-block">
    <h4>Overload Collapse</h4>
    <p>A single hit dealing more than <strong>50%</strong> of the shield's maximum Shield HP overwhelms the emitter: the shield absorbs only that threshold amount and immediately <strong>collapses to 0</strong>, with the excess carrying through to the next layer. Big alpha strikes therefore punch through shields rather than being soaked by them.</p>
  </div>

  <h3 class="section-bar" style="background:#b45309" id="combat-frames">Combat Armor Frames</h3>
  <div class="mech-block">
    <h4>Ablative Protection</h4>
    <p>Combat frames sit between shields and Hit Points and provide <strong>Armor Points</strong>. Armor Points are <strong>ablative</strong>: they do <em>not</em> regenerate, and when the frame is fully depleted the item is destroyed and must be replaced.</p>
    <table class="data-table" style="margin-top:0.4rem">
      <thead><tr><th>Frame</th><th>Armor Points</th></tr></thead>
      <tbody>
        <tr><td><strong>Light Combat Frame</strong></td><td>20</td></tr>
        <tr><td><strong>Standard Combat Frame</strong></td><td>50</td></tr>
        <tr><td><strong>Heavy Combat Frame</strong></td><td>100</td></tr>
        <tr><td><strong>Titan Combat Frame</strong></td><td>200</td></tr>
      </tbody>
    </table>
  </div>

  <h3 class="section-bar" style="background:#7c3aed" id="biotic-barrier">Biotic Barrier</h3>
  <div class="mech-block">
    <h4>Activation &amp; Capacity</h4>
    <p>A biotic can raise a personal mass effect field as an action. Barrier HP is calculated at activation as <strong>5 × ⌊level ÷ 2⌋</strong> (minimum 5), and it absorbs damage <em>before</em> both shields and Hit Points.</p>
    <p>A barrier does <strong>not</strong> recharge passively. Once depleted it must be reactivated, or refilled by spending actions or using Charge.</p>
  </div>

  <h3 class="section-bar" style="background:#c41e3a" id="ammo-vs-defences">Ammo Powers vs. Defences</h3>
  <p class="section-intro">Ammo powers are the counterplay to the layered defences — each is tuned against a specific layer. All multipliers below are configurable in module settings.</p>
  <div class="equipment-subsection"><div class="equipment-table-wrap">
    <table class="data-table">
      <thead><tr><th>Ammo</th><th>Targets</th><th>Effect</th></tr></thead>
      <tbody>
        <tr><td><strong>Disruptor Rounds</strong></td><td>Kinetic Shields</td><td>Deal <strong>2×</strong> damage to shields</td></tr>
        <tr><td><strong>Warp Rounds</strong></td><td>Biotic Barriers</td><td>Deal <strong>1.5×</strong> damage to barriers; depleting one triggers a dark-energy detonation</td></tr>
        <tr><td><strong>Incendiary Rounds</strong></td><td>Combat Frames</td><td>Burn armor <strong>1.5×</strong> faster; critical hits add persistent fire (1d6)</td></tr>
        <tr><td><strong>Armor-Piercing Rounds</strong></td><td>Combat Frames</td><td><strong>50%</strong> of HP damage bypasses armor entirely</td></tr>
        <tr><td><strong>Phasic Rounds</strong></td><td>Combat Frames</td><td>Bypass frames completely, but total damage is reduced to <strong>60%</strong></td></tr>
        <tr><td><strong>Shredder Rounds</strong></td><td>Hit Points</td><td>Most effective against targets with no shields, barriers or armor</td></tr>
        <tr><td><strong>Cryo Rounds</strong></td><td>Hit Points</td><td>Apply the <strong>Chilled</strong> condition on direct HP damage</td></tr>
      </tbody>
    </table>
  </div></div>
</div></section>`;
}

function renderNpcSection(factions) {
  const total = factions.reduce((n, f) => n + f.npcs.length, 0);
  const groups = factions.map(f => `<div class="npc-faction">
  <h4 class="npc-faction-title">${f.name}<span class="npc-count">${f.npcs.length}</span></h4>
  <div class="npc-grid">${f.npcs.map(renderNpcBlock).join('\n')}</div>
</div>`).join('\n');

  return `<section class="npc-section" id="npcs">
<div class="class-main">
  <div class="class-name-bar"><div class="header-accent-lines"></div><div class="header-content"><div>
    <h2 class="class-name">NPCs</h2>
    <p class="class-tagline">Adversaries &amp; Allies</p>
  </div></div></div>
  <p class="section-intro">${total} ready-to-run NPCs grouped by faction, matching the <em>ME NPCs</em> compendium. Shield values are kinetic barriers that absorb damage before Hit Points and recharge at the start of each turn.</p>
  ${groups}
</div></section>`;
}

// This document targets SF2e, which denominates prices in Credits (stored as sp;
// 1 Credit = 1 sp, 10 sp = 1 gp). Source is authored in PF2e coin, so fold every
// denomination down to a Credit total for display.
function creditPrice(sys) {
  const v = sys?.price?.value;
  if (!v || typeof v !== 'object') return '—';
  const total = (v.pp ?? 0) * 100 + (v.gp ?? 0) * 10 + (v.sp ?? 0) + (v.cp ?? 0) * 0.1;
  if (!total) return '—';
  return `${Math.round(total * 100) / 100} cr`;
}

function weaponTable(weapons, heading) {
  const DTYPE = { piercing:'P', bludgeoning:'B', slashing:'S', electricity:'E', fire:'Fire', cold:'Cold', force:'Force', void:'Void' };
  const rows = [...weapons].sort((a,b) => (a.system.level?.value??0)-(b.system.level?.value??0) || a.name.localeCompare(b.name)).map(w => {
    const s = w.system;
    const dmg   = `${s.damage?.dice??'?'}${s.damage?.die??''}`;
    const dtype = DTYPE[s.damage?.damageType] ?? (s.damage?.damageType ?? '?');
    const range = s.range ?? '—';
    const traits= (s.traits?.value??[]).filter(t=>!['tech','common'].includes(t)).join(', ');
    const price = creditPrice(s);
    return `<tr><td><strong>${w.name}</strong></td><td>${s.level?.value??'?'}</td><td>${s.bulk?.value??'?'}</td><td>${price}</td><td>${dmg} ${dtype}</td><td>${range}ft</td><td>${traits||'—'}</td></tr>`;
  }).join('\n');
  return `<div class="equipment-subsection"><h4 class="equip-table-title">${heading}</h4><div class="equipment-table-wrap">
    <table class="data-table"><thead><tr><th>Name</th><th>Lvl</th><th>Bulk</th><th>Credits</th><th>Damage</th><th>Range</th><th>Traits</th></tr></thead><tbody>${rows}</tbody></table>
  </div></div>`;
}

function armorTable(armors, heading) {
  const rows = [...armors].sort((a,b) => (a.system.level?.value??0)-(b.system.level?.value??0) || a.name.localeCompare(b.name)).map(a => {
    const s = a.system;
    const price = creditPrice(s);
    return `<tr><td><strong>${a.name}</strong></td><td>${s.level?.value??0}</td><td>${s.bulk?.value??'?'}</td><td>${price}</td><td>+${s.acBonus??'?'}</td><td>${s.dexCap??'?'}</td><td>${s.checkPenalty??0}</td><td>${s.speedPenalty??0}</td><td>${s.strength??'?'}</td></tr>`;
  }).join('\n');
  return `<div class="equipment-subsection"><h4 class="equip-table-title">${heading}</h4><div class="equipment-table-wrap">
    <table class="data-table"><thead><tr><th>Name</th><th>Lvl</th><th>Bulk</th><th>Credits</th><th>AC</th><th>Dex Cap</th><th>Check</th><th>Speed</th><th>Str</th></tr></thead><tbody>${rows}</tbody></table>
  </div></div>`;
}

function modTable(mods, heading) {
  const rows = [...mods].sort((a,b) => (a.system.level?.value??0)-(b.system.level?.value??0) || a.name.localeCompare(b.name)).map(m => {
    const s = m.system;
    const price = creditPrice(s);
    const desc  = (s.description?.value??'').replace(/<[^>]+>/g,'').trim().slice(0,100);
    return `<tr><td><strong>${m.name}</strong></td><td>${s.level?.value??'?'}</td><td>${price}</td><td>${desc}</td></tr>`;
  }).join('\n');
  return `<div class="equipment-subsection"><h4 class="equip-table-title">${heading}</h4><div class="equipment-table-wrap">
    <table class="data-table"><thead><tr><th>Mod</th><th>Lvl</th><th>Credits</th><th>Effect</th></tr></thead><tbody>${rows}</tbody></table>
  </div></div>`;
}

function renderEquipmentSection(weapons, armors, weaponMods, armorMods, grenades, shields) {
  const byGroup = { pistol:[], rifle:[], shotgun:[], sniper:[], bomb:[] };
  for (const w of weapons) { const g = w.system.group ?? 'pistol'; (byGroup[g] ?? byGroup.pistol).push(w); }

  const traitKey = `<p class="trait-key"><strong>automatic</strong> Burst: cone Reflex save &nbsp;·&nbsp; <strong>burst-fire</strong> 3 attacks ◆◆, half damage each &nbsp;·&nbsp; <strong>fatal-dX</strong> Crit: die→dX +1 &nbsp;·&nbsp; <strong>kickback</strong> −2 attack unless braced &nbsp;·&nbsp; <strong>scatter-X</strong> Splash within X ft &nbsp;·&nbsp; <strong>unwieldy</strong> 1 Strike/turn &nbsp;·&nbsp; <strong>volley-X</strong> −2 within X ft</p>`;

  // Driven from the me-shields pack so levels/prices can't drift from the data.
  const SHIELD_EFFECTS = {
    'Kinetic Shield': '30 Shield HP; recharges 10 HP/turn',
    'Shield HP Mod - Tier 1': '+10 max HP (→ 40)',
    'Shield HP Mod - Tier 2': '+20 max HP (→ 50)',
    'Shield HP Mod - Tier 3': '+40 max HP (→ 70)',
    'Shield HP Mod - Tier 4': '+70 max HP (→ 100)',
    'Shield Regen Mod - Tier 1': 'Recharge 15 HP/turn',
    'Shield Regen Mod - Tier 2': 'Recharge 20 HP/turn',
    'Shield Regen Mod - Tier 3': 'Recharge 25 HP/turn',
    'Shield Regen Mod - Tier 4': 'Recharge 30 HP/turn',
  };
  const shieldRows = shields
    .filter(s => SHIELD_EFFECTS[s.name])
    .sort((a, b) => (a.system.level?.value ?? 0) - (b.system.level?.value ?? 0) || a.name.localeCompare(b.name))
    .map(s => `<tr><td><strong>${s.name.replace(' - ', ' — ')}</strong></td><td>${s.system.level?.value ?? '?'}</td>`
      + `<td>${creditPrice(s.system)}</td><td>${SHIELD_EFFECTS[s.name]}</td></tr>`)
    .join('\n');

  const frameRows = shields
    .filter(s => /Combat Frame$/.test(s.name))
    .map(s => {
      const ap = (s.system.description?.value ?? '').match(/(\d+)\s*Armor Points?/i)?.[1]
        ?? { 'Light Combat Frame':'20','Standard Combat Frame':'50','Heavy Combat Frame':'100','Titan Combat Frame':'200' }[s.name] ?? '—';
      return `<tr><td><strong>${s.name}</strong></td><td>${ap}</td></tr>`;
    }).join('\n');

  const grenadeEntries = [...grenades].sort((a,b) => (a.system.level?.value??0)-(b.system.level?.value??0)).map(g => {
    const s = g.system;
    const price = creditPrice(s);
    return `<div class="feat-entry"><div class="feat-header"><div class="feat-name-line"><span class="feat-name">${g.name}</span></div><div class="feat-level-badge">LVL ${s.level?.value??'?'} · ${price} · 3 uses</div></div><div class="feat-description">${s.description?.value??''}</div></div>`;
  }).join('\n');

  return `<section class="equipment-section" id="equipment">
<div class="class-main">
  <div class="class-name-bar"><div class="header-accent-lines"></div><div class="header-content"><div>
    <h2 class="class-name">Equipment</h2>
    <p class="class-tagline">Weapons · Armor · Shields · Modifications · Grenades</p>
  </div></div></div>
  <h3 class="section-bar" style="background:#0f2034" id="equip-weapons">Weapons</h3>
  <p class="section-intro">All weapons carry the <strong>tech</strong> trait. Damage type abbreviations: P = piercing, E = electricity, B = bludgeoning, Fire, Cold, Force.</p>
  ${traitKey}
  ${weaponTable(byGroup.pistol,'Pistols &amp; SMGs')}
  ${weaponTable(byGroup.rifle,'Assault Rifles')}
  ${weaponTable(byGroup.shotgun,'Shotguns')}
  ${weaponTable(byGroup.sniper,'Sniper Rifles')}
  ${weaponTable(byGroup.bomb,'Heavy Weapons')}
  <h3 class="section-bar" style="background:#0f2034" id="equip-weapon-mods">Weapon Mods</h3>
  <p class="section-intro">Weapon mods install into a single weapon and provide passive or triggered bonuses. Most weapons accept one mod.</p>
  ${modTable(weaponMods,'Weapon Mods')}
  <h3 class="section-bar" style="background:#0f2034" id="equip-armor">Armor</h3>
  <p class="section-intro">All armors carry the <strong>tech</strong> trait. Heavy armors also carry <strong>bulwark</strong>. Str = Strength score required to avoid the Speed penalty.</p>
  ${armorTable(armors.filter(a=>a.system.category==='light'),'Light Armor')}
  ${armorTable(armors.filter(a=>a.system.category==='medium'),'Medium Armor')}
  ${armorTable(armors.filter(a=>a.system.category==='heavy'),'Heavy Armor')}
  <h3 class="section-bar" style="background:#0f2034" id="equip-armor-mods">Armor Mods</h3>
  <p class="section-intro">Armor mods install into a single suit of armor. Most armors accept one mod.</p>
  ${modTable(armorMods,'Armor Mods')}
  <h3 class="section-bar" style="background:#0f2034" id="equip-shields">Kinetic Shields &amp; Upgrades</h3>
  <p class="section-intro">Shield hardware and its upgrade mods. See <strong>Shield Mechanics</strong> for how these layers behave in play.</p>
  <div class="equipment-subsection"><div class="equipment-table-wrap">
    <table class="data-table"><thead><tr><th>Item</th><th>Lvl</th><th>Credits</th><th>Effect</th></tr></thead><tbody>${shieldRows}</tbody></table>
  </div></div>
  <div class="equipment-subsection"><h4 class="equip-table-title">Combat Frames</h4><div class="equipment-table-wrap">
    <table class="data-table"><thead><tr><th>Frame</th><th>Armor Points</th></tr></thead><tbody>${frameRows}</tbody></table>
  </div></div>
  <h3 class="section-bar" style="background:#0f2034" id="equip-grenades">Grenades</h3>
  <p class="section-intro">Grenades are consumables sold in packs of 3. All require ◆◆ to use unless noted.</p>
  <div class="equipment-table-wrap"><div class="feats-columns">${grenadeEntries}</div></div>
</div></section>`;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  ICON_CSS = await loadIconCss();

  // ── Load all class sections ──────────────────────────────────────────────────
  const generalFeatsByPack = new Map(); // packLabel -> feat[]
  const classSections = [];
  const classFeatSets = [];  // { cls, feats } consumed by the Feats section

  const packIndex = await indexPacks(SRC);
  for (const cls of CLASSES) {
    const info = summarizeClass(await loadFeat(...cls.classFile), packIndex);
    const classSpecificFeats = [];

    for (const [pack, filename] of cls.feats) {
      try {
        const feat = await loadFeat(pack, filename);
        classSpecificFeats.push(feat);
      } catch (e) {
        console.warn(`  WARNING: could not load ${pack}/${filename}: ${e.message}`);
      }
    }

    // Load mastery chain feats for this class
    const masteryFeats = [];
    for (const [pack, filename] of (cls.masteryChain ?? [])) {
      try {
        masteryFeats.push(await loadFeat(pack, filename));
      } catch (e) {
        console.warn(`  WARNING: could not load mastery feat ${pack}/${filename}: ${e.message}`);
      }
    }

    classSpecificFeats.sort((a, b) => {
      const d = a.system.level.value - b.system.level.value;
      return d !== 0 ? d : a.name.localeCompare(b.name);
    });

    classSections.push(renderClass(cls, info, classSpecificFeats, masteryFeats));
    classFeatSets.push({ cls, feats: classSpecificFeats.filter(f => !(f.system?.traits?.value ?? []).includes('progression')) });
  }

  // ── Load explicit General Feats ──────────────────────────────────────────────
  for (const [pack, filename] of GENERAL_FEATS) {
    try {
      const feat = await loadFeat(pack, filename);
      const packLabel = packDisplayName(pack);
      if (!generalFeatsByPack.has(packLabel)) generalFeatsByPack.set(packLabel, []);
      generalFeatsByPack.get(packLabel).push(feat);
    } catch (e) {
      console.warn(`  WARNING: could not load general feat ${pack}/${filename}: ${e.message}`);
    }
  }

  // Sort general packs in display order
  const PACK_ORDER = [
    'Combat Passives', 'Biotic Powers', 'Tech Powers', 'Ammo Powers', 'Class Progressions',
  ];
  const sortedGeneralPacks = new Map(
    [...generalFeatsByPack.entries()].sort(
      (a, b) => (PACK_ORDER.indexOf(a[0]) + 99) - (PACK_ORDER.indexOf(b[0]) + 99)
    )
  );

  // (Feats section is assembled below, once ancestry feats are loaded.)

  // ── Load new packs ─────────────────────────────────────────────────────────
  const [ancestries, heritages, ancestryFeats, backgrounds, weapons, armors, weaponMods, armorMods, grenades, shields, creatures, vehicles, ships] = await Promise.all([
    loadDir('me-ancestries'),
    loadDir('me-heritages'),
    loadDir('me-ancestry-feats'),
    loadDir('me-backgrounds'),
    loadDir('me-weapons'),
    loadDir('me-armors'),
    loadDir('me-weapon-mods'),
    loadDir('me-armor-mods'),
    loadDir('me-grenades'),
    loadDir('me-shields'),
    loadDir('me-creatures'),
    loadDir('me-vehicles'),
    loadDir('me-ships'),
  ]);

  const npcFactions = await loadNpcsByFaction();

  const ancestriesSection  = renderAncestriesSection(ancestries, heritages, ancestryFeats);
  const backgroundsSection = renderBackgroundsSection(backgrounds);
  const equipmentSection   = renderEquipmentSection(weapons, armors, weaponMods, armorMods, grenades, shields);
  const featsSection       = renderFeatsSection(classFeatSets, ancestryFeats, ancestries, sortedGeneralPacks);
  const bestiarySection    = renderBestiarySection(npcFactions, creatures, { vehicles, ships });
  const shieldSection      = renderShieldMechanicsSection();

  const sub = (id, label, pad = '1.4rem', colour = '') =>
    `<div class="toc-entry sub" style="padding-left:${pad}"><a href="#${id}"${colour ? ` style="color:${colour}"` : ''}>${label}</a>`
    + `<span class="toc-dot"></span><span class="toc-pg" id="toc-pg-${id}"${colour ? ` style="color:${colour}"` : ''}>—</span></div>`;

  const tocEntries = [
    `<div class="toc-part">Part I · Character Options</div>`,
    sub('ancestries', 'Ancestries &amp; Heritages'),
    ...[...ancestries].sort((a, b) => a.name.localeCompare(b.name))
      .map(a => sub('ancestry-' + ancestrySlug(a), a.name, '2.6rem')),
    sub('classes', 'Classes'),
    ...CLASSES.map(c => sub(c.name.toLowerCase(), titleCase(c.name), '2.6rem', CLASS_COLORS[c.name].accent)),
    sub('backgrounds', 'Backgrounds'),
    sub('feats', 'Feats'),
    sub('feats-class', 'Class Feats', '2.6rem'),
    sub('feats-racial', 'Racial Feats', '2.6rem'),
    sub('feats-general', 'General &amp; Skill Feats', '2.6rem'),
    sub('equipment', 'Equipment'),
    sub('equip-weapons', 'Weapons', '2.6rem'),
    sub('equip-weapon-mods', 'Weapon Mods', '2.6rem'),
    sub('equip-armor', 'Armor', '2.6rem'),
    sub('equip-armor-mods', 'Armor Mods', '2.6rem'),
    sub('equip-grenades', 'Grenades', '2.6rem'),
    `<div class="toc-part">Part II · Bestiary</div>`,
    sub('npcs', 'NPCs'),
    sub('creatures', 'Creatures'),
    sub('vehicles', 'Vehicles &amp; Ships'),
    `<div class="toc-part">Part III · Shield Mechanics</div>`,
    sub('damage-routing', 'Damage Routing'),
    sub('kinetic-shields', 'Kinetic Shields'),
    sub('combat-frames', 'Combat Armor Frames'),
    sub('biotic-barrier', 'Biotic Barrier'),
    sub('ammo-vs-defences', 'Ammo Powers vs. Defences'),
  ].join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mass Effect Starfinder 2e Conversion</title>
<style>${CSS}${ICON_CSS}</style>
</head>
<body>
<div class="n7-stripe" aria-hidden="true">
  <div class="n7-badge">
    <img src="images/Paragon.png" alt="Paragon">
  </div>
  <div class="n7-label">N7</div>
  <div class="n7-badge" aria-hidden="true"></div>
</div>
<div class="page-wrap">

<div class="title-page">
  <img src="images/MELogo.png" alt="Mass Effect" class="title-logo">
  <div class="title-sub">Starfinder 2e Conversion</div>
  <div class="title-rule"></div>
  <p class="title-body">A complete reference for the Mass Effect conversion — character options for all six classes, a bestiary of ready-to-run NPCs, creatures and vehicles, and the shield, armor and biotic barrier mechanics that drive combat.</p>
</div>

<div class="toc">
  <h2>Contents</h2>
  <div class="toc-list">
    ${tocEntries}
  </div>
</div>

${partDivider('character-options', 'Part I', 'Character Options',
  'Everything needed to build a character: ancestries and heritages, the six classes, backgrounds, the full feat catalogue, and equipment.')}

${ancestriesSection}

${partDivider('classes', 'Part I · Section 2', 'Classes',
  'The six Mass Effect classes. Each entry covers its class feature, advancement and mastery chain, plus an index of its feats — the feats themselves are catalogued under Feats.')}

${classSections.join('')}

${backgroundsSection}

${featsSection}

${equipmentSection}

${partDivider('bestiary', 'Part II', 'Bestiary',
  'Ready-to-run adversaries and allies: faction NPCs, hostile creatures and synthetics, and crewed vehicles and ships.')}

${bestiarySection}

${partDivider('shield-mechanics', 'Part III', 'Shield Mechanics',
  'How biotic barriers, kinetic shields and combat armor frames layer over Hit Points — and how ammo powers cut through them.')}

${shieldSection}

</div>
</body>
</html>`;

  await mkdir('docs', { recursive: true });
  await writeFile('docs/mass-effect-starfinder-2e-conversion.html', flattenEnrichers(html), 'utf8');
  console.log(`✓ Wrote docs/mass-effect-starfinder-2e-conversion.html (${html.length.toLocaleString()} chars)`);
  console.log(`  NPC section: ${npcFactions.length} factions, ${npcFactions.reduce((n,f)=>n+f.npcs.length,0)} stat blocks`);
}

function packDisplayName(pack) {
  const map = {
    'me-combat-passives':   'Combat Passives',
    'me-biotic-powers':     'Biotic Powers',
    'me-tech-powers':       'Tech Powers',
    'me-ammo-powers':       'Ammo Powers',
    'me-class-progressions':'Class Progressions',
  };
  return map[pack] ?? pack;
}

main().catch(err => { console.error(err); process.exit(1); });
