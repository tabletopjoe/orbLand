const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const TROPICAL_GREEN = '#2E8B57';
let canvasBgColor = '#ffffff';

// ROYGBV: 6 rows × 9 shades each (light to dark)
const SWATCH_ROWS = [
  // Red
  ['#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#E53935', '#D32F2F', '#B71C1C'],
  // Orange
  ['#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726', '#FF9800', '#FB8C00', '#F57C00', '#E65100'],
  // Yellow
  ['#FFFDE7', '#FFF9C4', '#FFF59D', '#FFF176', '#FFEE58', '#FFEB3B', '#FDD835', '#F9A825', '#F57F17'],
  // Green
  ['#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#43A047', '#388E3C', '#2E7D32'],
  // Blue
  ['#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1976D2', '#0D47A1'],
  // Violet
  ['#F3E5F5', '#E1BEE7', '#CE93D8', '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#7B1FA2', '#4A148C']
];

const ALL_SWATCH_COLORS = SWATCH_ROWS.flat();

function randomColor() {
  return ALL_SWATCH_COLORS[Math.floor(Math.random() * ALL_SWATCH_COLORS.length)];
}

// Simple random name generator: 2–3 syllables, CVC or CV pattern
const CONSONANTS = 'bcdfghjklmnpqrstvwxz';
const VOWELS = 'aeiou';
function randomName() {
  const syllableCount = 2 + Math.floor(Math.random() * 2);
  let name = '';
  for (let i = 0; i < syllableCount; i++) {
    name += CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    name += VOWELS[Math.floor(Math.random() * VOWELS.length)];
    if (Math.random() > 0.5) {
      name += CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    }
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Bodies data
const bodies = {
  suns: [],
  planets: [],
  moons: []
};
let selectedType = null;  // 'sun' | 'planet' | 'moon'
let selectedId = null;
let selectedAt = null;
/** When set, sliders/swatch drive all bodies in this group instead of selection */
let applyAllTarget = null;  // { type: 'sun' } | { type: 'planet', sunId } | { type: 'moon', planetId }

const SELECTION_HIGHLIGHT_DURATION = 400;

function lerpColor(hex1, hex2, t) {
  const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getSelectionHighlight(bodyId, bodyType, bodyColor) {
  if (!selectedAt || selectedId !== bodyId || selectedType !== bodyType) return null;
  const elapsed = Date.now() - selectedAt;
  if (elapsed >= SELECTION_HIGHLIGHT_DURATION) return null;
  const progress = elapsed / SELECTION_HIGHLIGHT_DURATION;
  return {
    flash: lerpColor('#ffffff', bodyColor || TROPICAL_GREEN, progress),
    pulse: 1 + 0.2 * Math.sin(progress * Math.PI)
  };
}

function generateId(type) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function initBodies() {
  const sunId = generateId('sun');
  const planetId = generateId('planet');
  bodies.suns.push({
    id: sunId,
    name: randomName(),
    radius: 40,
    x: 0, y: 0,
    color: randomColor()
  });
  bodies.planets.push({
    id: planetId,
    name: randomName(),
    radius: 12,
    orbitRadius: 120,
    orbitSpeed: 0.01,
    ellipticity: 0,
    orbitAngle: 0,
    orbitTrail: 0,
    orbitTrailWidth: 2,
    trail: [],
    parentId: sunId,
    color: randomColor()
  });
  selectedType = 'planet';
  selectedId = planetId;
}

function setSelection(type, id) {
  selectedType = type;
  selectedId = id;
  selectedAt = (type && id) ? Date.now() : null;
  syncSelectors();
  updateDropdownStyles();
  updatePropertyVisibility();
  updateSelectionIndicator();
  updateApplyAllButtons();
  updateRemoveButtons();
  if (type === 'sun' && id) syncSlidersToSun();
  if (type === 'planet' && id) syncSlidersToPlanet();
  if (type === 'moon' && id) syncSlidersToMoon();
  if (applyAllTarget?.type === 'sun') syncSlidersToFirstSun();
  if (applyAllTarget?.type === 'planet') syncSlidersToFirstPlanetInGroup();
  if (applyAllTarget?.type === 'moon') syncSlidersToFirstMoonInGroup();
}

function updateSelectionIndicator() {
  const el = document.getElementById('selection-indicator');
  if (!el) return;
  if (!selectedType || !selectedId) {
    el.textContent = 'Selected: —';
    return;
  }
  const typeLabel = selectedType.charAt(0).toUpperCase() + selectedType.slice(1);
  let name = '';
  if (selectedType === 'sun') name = bodies.suns.find(s => s.id === selectedId)?.name || '';
  if (selectedType === 'planet') name = bodies.planets.find(p => p.id === selectedId)?.name || '';
  if (selectedType === 'moon') name = bodies.moons.find(m => m.id === selectedId)?.name || '';
  el.textContent = `Selected: ${typeLabel} ${name}`;
}

function getFilteredPlanets() {
  if (selectedType === 'sun' && selectedId) {
    return bodies.planets.filter(p => p.parentId === selectedId);
  }
  return bodies.planets;
}

function getFilteredMoons() {
  if (selectedType === 'planet' && selectedId) {
    return bodies.moons.filter(m => m.parentId === selectedId);
  }
  return bodies.moons;
}

/** Sun whose planets the "Apply All" button affects; null if no context */
function getContextSunIdForPlanets() {
  if (selectedType === 'sun' && selectedId) return selectedId;
  const planet = getSelectedPlanet();
  if (planet) return planet.parentId;
  const moon = bodies.moons.find(m => m.id === selectedId);
  if (moon) {
    const p = getPlanetById(moon.parentId);
    return p ? p.parentId : null;
  }
  return null;
}

/** Planet whose moons the "Apply All" button affects; null if no context */
function getContextPlanetIdForMoons() {
  if (selectedType === 'planet' && selectedId) return selectedId;
  const moon = bodies.moons.find(m => m.id === selectedId);
  return moon ? moon.parentId : null;
}

function syncSelectors() {
  const sunSelect = document.getElementById('sun-selector');
  const planetSelect = document.getElementById('planet-selector');
  const moonSelect = document.getElementById('moon-selector');
  sunSelect.innerHTML = '<option value="">— Suns —</option>' +
    bodies.suns.map(s => `<option value="${s.id}" ${selectedType === 'sun' && s.id === selectedId ? 'selected' : ''}>${s.name}</option>`).join('');
  const planets = getFilteredPlanets();
  planetSelect.innerHTML = '<option value="">— Planets —</option>' +
    planets.map(p => `<option value="${p.id}" ${selectedType === 'planet' && p.id === selectedId ? 'selected' : ''}>${p.name}</option>`).join('');
  const moons = getFilteredMoons();
  moonSelect.innerHTML = '<option value="">— Moons —</option>' +
    moons.map(m => `<option value="${m.id}" ${selectedType === 'moon' && m.id === selectedId ? 'selected' : ''}>${m.name}</option>`).join('');
}

function updateDropdownStyles() {
  const sunSelect = document.getElementById('sun-selector');
  const planetSelect = document.getElementById('planet-selector');
  const moonSelect = document.getElementById('moon-selector');
  sunSelect.classList.toggle('selected', selectedType === 'sun');
  planetSelect.classList.toggle('selected', selectedType === 'planet');
  moonSelect.classList.toggle('selected', selectedType === 'moon');
}

function updatePropertyVisibility() {
  const sunProps = document.getElementById('sun-properties');
  const planetProps = document.getElementById('planet-properties');
  const showSunProps = selectedType === 'sun' || applyAllTarget?.type === 'sun';
  const showPlanetProps = selectedType === 'planet' || selectedType === 'moon' || applyAllTarget?.type === 'planet' || applyAllTarget?.type === 'moon';
  sunProps.style.display = showSunProps ? 'flex' : 'none';
  planetProps.style.display = showPlanetProps ? 'flex' : 'none';
}

// Canvas sizing — full viewport minus control panel (20vw + 25px margin)
function getCanvasDimensions() {
  const panelWidth = window.innerWidth * 0.2 + 25;
  return {
    width: Math.floor(window.innerWidth - panelWidth),
    height: window.innerHeight
  };
}

function updatePositionSliderRange() {
  const { width, height } = getCanvasDimensions();
  const halfX = Math.floor(width / 2);
  const halfY = Math.floor(height / 2);
  const xSlider = document.getElementById('x-slider');
  const ySlider = document.getElementById('y-slider');
  if (xSlider && ySlider) {
    xSlider.min = -halfX;
    xSlider.max = halfX;
    xSlider.step = Math.max(1, Math.floor(width / 60));
    ySlider.min = -halfY;
    ySlider.max = halfY;
    ySlider.step = Math.max(1, Math.floor(height / 60));
    // Clamp sun positions to new range
    bodies.suns.forEach(sun => {
      sun.x = Math.max(-halfX, Math.min(halfX, sun.x));
      sun.y = Math.max(-halfY, Math.min(halfY, sun.y));
    });
    if (selectedType === 'sun') syncSlidersToSun();
  }
}

function resizeCanvas() {
  const { width, height } = getCanvasDimensions();
  canvas.width = width;
  canvas.height = height;
  updatePositionSliderRange();
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function getSelectedPlanet() {
  return bodies.planets.find(p => p.id === selectedId);
}

function getSelectedSun() {
  return bodies.suns.find(s => s.id === selectedId);
}

/** Parent sun when adding a planet: use selected sun, or derive from selected planet/moon */
function getParentSunForNewPlanet() {
  const sun = getSelectedSun();
  if (sun) return sun;
  const planet = getSelectedPlanet();
  if (planet) return getSunById(planet.parentId);
  const moon = bodies.moons.find(m => m.id === selectedId);
  if (moon) {
    const moonPlanet = getPlanetById(moon.parentId);
    return moonPlanet ? getSunById(moonPlanet.parentId) : null;
  }
  return bodies.suns[0];
}

/** Parent planet when adding a moon: use selected planet, or derive from selected moon */
function getParentPlanetForNewMoon() {
  const planet = getSelectedPlanet();
  if (planet) return planet;
  const moon = bodies.moons.find(m => m.id === selectedId);
  if (moon) return getPlanetById(moon.parentId);
  return bodies.planets[0];
}

function getSunById(id) {
  return bodies.suns.find(s => s.id === id);
}

function getPlanetById(id) {
  return bodies.planets.find(p => p.id === id);
}

function getPlanetPosition(planet) {
  const parentSun = getSunById(planet.parentId);
  if (!parentSun) return null;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const orbitCx = cx + parentSun.x;
  const orbitCy = cy + parentSun.y;
  const radiusY = planet.orbitRadius * (1 - planet.ellipticity / 100);
  return {
    x: orbitCx + planet.orbitRadius * Math.cos(planet.orbitAngle),
    y: orbitCy + radiusY * Math.sin(planet.orbitAngle)
  };
}

function getMoonPosition(moon) {
  const parentPlanet = getPlanetById(moon.parentId);
  if (!parentPlanet) return null;
  const parentSun = getSunById(parentPlanet.parentId);
  if (!parentSun) return null;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const orbitCx = cx + parentSun.x;
  const orbitCy = cy + parentSun.y;
  const pRadiusY = parentPlanet.orbitRadius * (1 - parentPlanet.ellipticity / 100);
  const planetX = orbitCx + parentPlanet.orbitRadius * Math.cos(parentPlanet.orbitAngle);
  const planetY = orbitCy + pRadiusY * Math.sin(parentPlanet.orbitAngle);
  const radiusY = moon.orbitRadius * (1 - moon.ellipticity / 100);
  return {
    x: planetX + moon.orbitRadius * Math.cos(moon.orbitAngle),
    y: planetY + radiusY * Math.sin(moon.orbitAngle)
  };
}

const SUN_EDGE_MARGIN = 50;

function findValidSunPosition() {
  const { width, height } = getCanvasDimensions();
  const halfX = Math.floor(width / 2);
  const halfY = Math.floor(height / 2);
  const minDistance = width * 0.1;
  const maxX = halfX - SUN_EDGE_MARGIN;
  const minX = -halfX + SUN_EDGE_MARGIN;
  const maxY = halfY - SUN_EDGE_MARGIN;
  const minY = -halfY + SUN_EDGE_MARGIN;

  function dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  function isValid(x, y) {
    return bodies.suns.every(sun => dist(x, y, sun.x, sun.y) >= minDistance);
  }

  function randomInRange(min, max) {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return Math.floor(lo + Math.random() * (hi - lo + 1));
  }

  // No other suns: position within margin of edge
  if (bodies.suns.length === 0) {
    return { x: randomInRange(minX, maxX), y: randomInRange(minY, maxY) };
  }

  let best = { x: 0, y: 0, minDist: 0 };
  for (let i = 0; i < 100; i++) {
    const x = randomInRange(minX, maxX);
    const y = randomInRange(minY, maxY);
    if (isValid(x, y)) return { x, y };
    const minDist = Math.min(...bodies.suns.map(s => dist(x, y, s.x, s.y)));
    if (minDist > best.minDist) best = { x, y, minDist };
  }
  return { x: best.x, y: best.y };
}

function addSun() {
  const pos = findValidSunPosition();
  const sunId = generateId('sun');
  bodies.suns.push({
    id: sunId,
    name: randomName(),
    radius: 40,
    x: pos.x,
    y: pos.y,
    color: randomColor()
  });
  setSelection('sun', sunId);
}

function addPlanet() {
  const parentSun = getParentSunForNewPlanet();
  if (!parentSun) return;
  const planetId = generateId('planet');
  const { width } = getCanvasDimensions();
  const baseOrbit = Math.min(80, width * 0.15);
  bodies.planets.push({
    id: planetId,
    name: randomName(),
    radius: 12,
    orbitRadius: baseOrbit + Math.random() * 80,
    orbitSpeed: 0.005 + Math.random() * 0.02,
    ellipticity: 0,
    orbitAngle: Math.random() * Math.PI * 2,
    orbitTrail: 0,
    orbitTrailWidth: 2,
    trail: [],
    parentId: parentSun.id,
    color: randomColor()
  });
  setSelection('planet', planetId);
  document.getElementById('planet-selector').focus();
}

function addMoon() {
  const parentPlanet = getParentPlanetForNewMoon();
  if (!parentPlanet) return;
  const moonId = generateId('moon');
  bodies.moons.push({
    id: moonId,
    name: randomName(),
    radius: 6,
    orbitRadius: 30 + Math.random() * 40,
    orbitSpeed: 0.02 + Math.random() * 0.03,
    ellipticity: 0,
    orbitAngle: Math.random() * Math.PI * 2,
    orbitTrail: 0,
    orbitTrailWidth: 2,
    trail: [],
    parentId: parentPlanet.id,
    color: randomColor()
  });
  setSelection('moon', moonId);
  document.getElementById('moon-selector').focus();
}

function removeSelectedSun() {
  const sun = getSelectedSun();
  if (!sun) return;
  const planetIds = bodies.planets.filter(p => p.parentId === sun.id).map(p => p.id);
  bodies.suns = bodies.suns.filter(s => s.id !== sun.id);
  bodies.planets = bodies.planets.filter(p => p.parentId !== sun.id);
  bodies.moons = bodies.moons.filter(m => !planetIds.includes(m.parentId));
  if (applyAllTarget?.type === 'sun' || (applyAllTarget?.type === 'planet' && applyAllTarget.sunId === sun.id)) applyAllTarget = null;
  setSelection(null, null);
  document.getElementById('sun-selector').value = '';
  document.getElementById('planet-selector').value = '';
  document.getElementById('moon-selector').value = '';
}

function removeSelectedPlanet() {
  const planet = getSelectedPlanet();
  if (!planet) return;
  bodies.planets = bodies.planets.filter(p => p.id !== planet.id);
  bodies.moons = bodies.moons.filter(m => m.parentId !== planet.id);
  if (applyAllTarget?.type === 'moon' && applyAllTarget.planetId === planet.id) applyAllTarget = null;
  setSelection(null, null);
  document.getElementById('planet-selector').value = '';
  document.getElementById('moon-selector').value = '';
}

function removeSelectedMoon() {
  const moon = bodies.moons.find(m => m.id === selectedId);
  if (!moon) return;
  bodies.moons = bodies.moons.filter(m => m.id !== moon.id);
  if (applyAllTarget?.type === 'moon' && applyAllTarget.planetId === moon.parentId) applyAllTarget = null;
  setSelection(null, null);
  document.getElementById('moon-selector').value = '';
}

function generateRandomSystem() {
  bodies.suns = [];
  bodies.planets = [];
  bodies.moons = [];
  selectedType = null;
  selectedId = null;
  applyAllTarget = null;

  const { width } = getCanvasDimensions();
  const baseOrbit = Math.min(80, width * 0.15);
  const sunCount = 1 + Math.floor(Math.random() * 5);

  for (let i = 0; i < sunCount; i++) {
    const pos = findValidSunPosition();
    const sunId = generateId('sun');
    bodies.suns.push({
      id: sunId,
      name: randomName(),
      radius: 30 + Math.random() * 30,
      x: pos.x,
      y: pos.y,
      color: randomColor()
    });
    const planetCount = Math.floor(Math.random() * 10);
    for (let j = 0; j < planetCount; j++) {
      const planetId = generateId('planet');
      const planetColor = randomColor();
      bodies.planets.push({
        id: planetId,
        name: randomName(),
        radius: 8 + Math.random() * 20,
        orbitRadius: baseOrbit + Math.random() * 120 + j * 25,
        orbitSpeed: 0.003 + Math.random() * 0.03,
        ellipticity: Math.floor(Math.random() * 19) * 5,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitTrail: Math.random() < 0.5 ? 100 : 0,
        orbitTrailWidth: 1 + Math.floor(Math.random() * 24),
        trail: [],
        parentId: sunId,
        color: planetColor
      });
      const moonCount = Math.floor(Math.random() * 5);
      for (let k = 0; k < moonCount; k++) {
        const moonId = generateId('moon');
        const moonColor = randomColor();
        bodies.moons.push({
          id: moonId,
          name: randomName(),
          radius: 4 + Math.random() * 6,
          orbitRadius: 25 + Math.random() * 50,
          orbitSpeed: 0.015 + Math.random() * 0.04,
          ellipticity: Math.floor(Math.random() * 5) * 5,
          orbitAngle: Math.random() * Math.PI * 2,
          orbitTrail: Math.random() < 0.5 ? 100 : 0,
          orbitTrailWidth: 1 + Math.floor(Math.random() * 24),
          trail: [],
          parentId: planetId,
          color: moonColor
        });
      }
    }
  }

  syncSelectors();
  updateDropdownStyles();
  updatePropertyVisibility();
  updateSelectionIndicator();
  updateApplyAllButtons();
  updateRemoveButtons();
}

function drawTaperedTrail(ctx, trail, color, maxAlpha, lineWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const n = trail.length;
  for (let i = 0; i < n - 1; i++) {
    const t = (i + 1) / n;
    ctx.globalAlpha = maxAlpha * t * t;
    ctx.beginPath();
    ctx.moveTo(trail[i].x, trail[i].y);
    ctx.lineTo(trail[i + 1].x, trail[i + 1].y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.fillStyle = canvasBgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Draw suns at their positions
  bodies.suns.forEach(sun => {
    const highlight = getSelectionHighlight(sun.id, 'sun', sun.color);
    const color = highlight ? highlight.flash : (sun.color || TROPICAL_GREEN);
    const radius = highlight ? sun.radius * highlight.pulse : sun.radius;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + sun.x, cy + sun.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw planets (orbit their parent sun)
  bodies.planets.forEach(planet => {
    const parentSun = getSunById(planet.parentId);
    if (!parentSun) return;
    const orbitCx = cx + parentSun.x;
    const orbitCy = cy + parentSun.y;
    planet.orbitAngle += planet.orbitSpeed;
    const radiusY = planet.orbitRadius * (1 - planet.ellipticity / 100);
    const px = orbitCx + planet.orbitRadius * Math.cos(planet.orbitAngle);
    const py = orbitCy + radiusY * Math.sin(planet.orbitAngle);
    if (planet.orbitTrail > 0) {
      planet.trail = planet.trail || [];
      planet.trail.push({ x: px, y: py });
      const maxLen = Math.floor((planet.orbitTrail / 100) * 150);
      if (planet.trail.length > maxLen) planet.trail.shift();
      if (planet.trail.length > 1) {
        drawTaperedTrail(ctx, planet.trail, planet.color || TROPICAL_GREEN, planet.orbitTrail / 100, Math.max(1, Math.min(planet.radius * 2, planet.orbitTrailWidth ?? 2)));
      }
    } else {
      planet.trail = [];
    }
    const highlight = getSelectionHighlight(planet.id, 'planet', planet.color);
    const color = highlight ? highlight.flash : (planet.color || TROPICAL_GREEN);
    const radius = highlight ? planet.radius * highlight.pulse : planet.radius;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw moons (orbit their parent planet)
  bodies.moons.forEach(moon => {
    const parentPlanet = getPlanetById(moon.parentId);
    if (!parentPlanet) return;
    const parentSun = getSunById(parentPlanet.parentId);
    if (!parentSun) return;
    const orbitCx = cx + parentSun.x;
    const orbitCy = cy + parentSun.y;
    const pRadiusY = parentPlanet.orbitRadius * (1 - parentPlanet.ellipticity / 100);
    const planetX = orbitCx + parentPlanet.orbitRadius * Math.cos(parentPlanet.orbitAngle);
    const planetY = orbitCy + pRadiusY * Math.sin(parentPlanet.orbitAngle);
    moon.orbitAngle += moon.orbitSpeed;
    const radiusY = moon.orbitRadius * (1 - moon.ellipticity / 100);
    const mx = planetX + moon.orbitRadius * Math.cos(moon.orbitAngle);
    const my = planetY + radiusY * Math.sin(moon.orbitAngle);
    if (moon.orbitTrail > 0) {
      moon.trail = moon.trail || [];
      moon.trail.push({ x: mx, y: my });
      const maxLen = Math.floor((moon.orbitTrail / 100) * 150);
      if (moon.trail.length > maxLen) moon.trail.shift();
      if (moon.trail.length > 1) {
        drawTaperedTrail(ctx, moon.trail, moon.color || TROPICAL_GREEN, moon.orbitTrail / 100, Math.max(1, Math.min(moon.radius * 2, moon.orbitTrailWidth ?? 2)));
      }
    } else {
      moon.trail = [];
    }
    const highlight = getSelectionHighlight(moon.id, 'moon', moon.color);
    const color = highlight ? highlight.flash : (moon.color || TROPICAL_GREEN);
    const radius = highlight ? moon.radius * highlight.pulse : moon.radius;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx, my, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(draw);
}

function getBodyAtPoint(canvasX, canvasY) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  function dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  // Check moons first (smallest), then planets, then suns
  for (const moon of bodies.moons) {
    const pos = getMoonPosition(moon);
    if (pos && dist(canvasX, canvasY, pos.x, pos.y) <= moon.radius) {
      return { type: 'moon', id: moon.id };
    }
  }
  for (const planet of bodies.planets) {
    const pos = getPlanetPosition(planet);
    if (pos && dist(canvasX, canvasY, pos.x, pos.y) <= planet.radius) {
      return { type: 'planet', id: planet.id };
    }
  }
  for (const sun of bodies.suns) {
    const sx = cx + sun.x;
    const sy = cy + sun.y;
    if (dist(canvasX, canvasY, sx, sy) <= sun.radius) {
      return { type: 'sun', id: sun.id };
    }
  }
  return null;
}

function handleCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (e.clientX - rect.left) * scaleX;
  const canvasY = (e.clientY - rect.top) * scaleY;
  const hit = getBodyAtPoint(canvasX, canvasY);
  if (hit) {
    setSelection(hit.type, hit.id);
  }
}

canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (e.clientX - rect.left) * scaleX;
  const canvasY = (e.clientY - rect.top) * scaleY;
  canvas.style.cursor = getBodyAtPoint(canvasX, canvasY) ? 'pointer' : 'default';
});

function syncSlidersToSun() {
  const sun = getSelectedSun();
  if (!sun) return;
  document.getElementById('size-slider').value = sun.radius;
  document.getElementById('x-slider').value = sun.x;
  document.getElementById('y-slider').value = sun.y;
}

function syncSlidersToPlanet() {
  const body = getSelectedPlanet();
  if (!body) return;
  document.getElementById('planet-size-slider').value = body.radius;
  document.getElementById('orbit-slider').value = body.orbitRadius;
  document.getElementById('speed-slider').value = Math.round(body.orbitSpeed * 1000);
  document.getElementById('ellipse-slider').value = body.ellipticity;
  document.getElementById('trail-slider').value = body.orbitTrail ?? 0;
  const trailWidthSlider = document.getElementById('trail-width-slider');
  const maxWidth = Math.max(1, Math.floor(body.radius * 2));
  trailWidthSlider.min = 1;
  trailWidthSlider.max = maxWidth;
  trailWidthSlider.value = Math.min(body.orbitTrailWidth ?? 2, maxWidth);
}

function syncSlidersToMoon() {
  const moon = bodies.moons.find(m => m.id === selectedId);
  if (!moon) return;
  document.getElementById('planet-size-slider').value = moon.radius;
  document.getElementById('orbit-slider').value = moon.orbitRadius;
  document.getElementById('speed-slider').value = Math.round(moon.orbitSpeed * 1000);
  document.getElementById('ellipse-slider').value = moon.ellipticity;
  document.getElementById('trail-slider').value = moon.orbitTrail ?? 0;
  const trailWidthSlider = document.getElementById('trail-width-slider');
  const maxWidth = Math.max(1, Math.floor(moon.radius * 2));
  trailWidthSlider.min = 1;
  trailWidthSlider.max = maxWidth;
  trailWidthSlider.value = Math.min(moon.orbitTrailWidth ?? 2, maxWidth);
}

function syncSlidersToFirstSun() {
  const sun = bodies.suns[0];
  if (!sun) return;
  document.getElementById('size-slider').value = sun.radius;
  document.getElementById('x-slider').value = sun.x;
  document.getElementById('y-slider').value = sun.y;
}

function syncSlidersToFirstPlanetInGroup() {
  if (!applyAllTarget || applyAllTarget.type !== 'planet') return;
  const first = bodies.planets.find(p => p.parentId === applyAllTarget.sunId);
  if (!first) return;
  document.getElementById('planet-size-slider').value = first.radius;
  document.getElementById('orbit-slider').value = first.orbitRadius;
  document.getElementById('speed-slider').value = Math.round(first.orbitSpeed * 1000);
  document.getElementById('ellipse-slider').value = first.ellipticity;
  document.getElementById('trail-slider').value = first.orbitTrail ?? 0;
  const trailWidthSlider = document.getElementById('trail-width-slider');
  const maxWidth = Math.max(1, ...bodies.planets.filter(p => p.parentId === applyAllTarget.sunId).map(p => Math.floor(p.radius * 2)));
  trailWidthSlider.min = 1;
  trailWidthSlider.max = maxWidth;
  trailWidthSlider.value = Math.min(first.orbitTrailWidth ?? 2, maxWidth);
}

function syncSlidersToFirstMoonInGroup() {
  if (!applyAllTarget || applyAllTarget.type !== 'moon') return;
  const first = bodies.moons.find(m => m.parentId === applyAllTarget.planetId);
  if (!first) return;
  document.getElementById('planet-size-slider').value = first.radius;
  document.getElementById('orbit-slider').value = first.orbitRadius;
  document.getElementById('speed-slider').value = Math.round(first.orbitSpeed * 1000);
  document.getElementById('ellipse-slider').value = first.ellipticity;
  document.getElementById('trail-slider').value = first.orbitTrail ?? 0;
  const trailWidthSlider = document.getElementById('trail-width-slider');
  const maxWidth = Math.max(1, ...bodies.moons.filter(m => m.parentId === applyAllTarget.planetId).map(m => Math.floor(m.radius * 2)));
  trailWidthSlider.min = 1;
  trailWidthSlider.max = maxWidth;
  trailWidthSlider.value = Math.min(first.orbitTrailWidth ?? 2, maxWidth);
}

// Selector change handlers — only one can be selected at a time
document.getElementById('sun-selector').addEventListener('change', (e) => {
  const id = e.target.value || null;
  setSelection(id ? 'sun' : null, id);
});

document.getElementById('planet-selector').addEventListener('change', (e) => {
  const id = e.target.value || null;
  setSelection(id ? 'planet' : null, id);
});

document.getElementById('moon-selector').addEventListener('change', (e) => {
  const id = e.target.value || null;
  setSelection(id ? 'moon' : null, id);
});

// Sun sliders
document.getElementById('size-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  if (applyAllTarget?.type === 'sun') {
    bodies.suns.forEach(s => s.radius = val);
  } else {
    const sun = getSelectedSun();
    if (sun) sun.radius = val;
  }
});

document.getElementById('x-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  if (applyAllTarget?.type === 'sun') {
    bodies.suns.forEach(s => s.x = val);
  } else {
    const sun = getSelectedSun();
    if (sun) sun.x = val;
  }
});

document.getElementById('y-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  if (applyAllTarget?.type === 'sun') {
    bodies.suns.forEach(s => s.y = val);
  } else {
    const sun = getSelectedSun();
    if (sun) sun.y = val;
  }
});

// Planet / moon sliders (orbital bodies share these controls)
function getOrbitalSliderTargets() {
  if (applyAllTarget?.type === 'planet')
    return bodies.planets.filter(p => p.parentId === applyAllTarget.sunId);
  if (applyAllTarget?.type === 'moon')
    return bodies.moons.filter(m => m.parentId === applyAllTarget.planetId);
  const body = getSelectedPlanet() || bodies.moons.find(m => m.id === selectedId);
  return body ? [body] : [];
}

document.getElementById('planet-size-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  getOrbitalSliderTargets().forEach(body => { body.radius = val; });
});

document.getElementById('orbit-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  getOrbitalSliderTargets().forEach(body => { body.orbitRadius = val; });
});

document.getElementById('speed-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value) / 1000;
  getOrbitalSliderTargets().forEach(body => { body.orbitSpeed = val; });
});

document.getElementById('ellipse-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  getOrbitalSliderTargets().forEach(body => { body.ellipticity = val; });
});

document.getElementById('trail-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  getOrbitalSliderTargets().forEach(body => {
    body.orbitTrail = val;
    if (val === 0) body.trail = [];
  });
});

document.getElementById('trail-width-slider').addEventListener('input', (e) => {
  const targets = getOrbitalSliderTargets();
  const val = Number(e.target.value);
  targets.forEach(body => {
    const maxWidth = Math.floor(body.radius * 2);
    body.orbitTrailWidth = Math.max(1, Math.min(maxWidth, val));
  });
});

// Apply-all buttons: toggle mode where sliders affect all bodies in the group
function enterApplyAllMode(type, sunId, planetId) {
  applyAllTarget = type === 'sun' ? { type: 'sun' } : type === 'planet' ? { type: 'planet', sunId } : { type: 'moon', planetId };
  updatePropertyVisibility();
  updateApplyAllButtons();
  if (applyAllTarget.type === 'sun') syncSlidersToFirstSun();
  if (applyAllTarget.type === 'planet') syncSlidersToFirstPlanetInGroup();
  if (applyAllTarget.type === 'moon') syncSlidersToFirstMoonInGroup();
}

function exitApplyAllMode() {
  applyAllTarget = null;
  updatePropertyVisibility();
  updateApplyAllButtons();
  if (selectedType === 'sun' && selectedId) syncSlidersToSun();
  if (selectedType === 'planet' && selectedId) syncSlidersToPlanet();
  if (selectedType === 'moon' && selectedId) syncSlidersToMoon();
}

function updateApplyAllButtons() {
  const sunBtn = document.getElementById('sun-left-btn');
  const planetBtn = document.getElementById('planet-left-btn');
  const moonBtn = document.getElementById('moon-left-btn');
  sunBtn.disabled = bodies.suns.length === 0;
  const contextSunId = getContextSunIdForPlanets();
  const planetTargets = contextSunId ? bodies.planets.filter(p => p.parentId === contextSunId) : [];
  planetBtn.disabled = !contextSunId || planetTargets.length === 0;
  const contextPlanetId = getContextPlanetIdForMoons();
  const moonTargets = contextPlanetId ? bodies.moons.filter(m => m.parentId === contextPlanetId) : [];
  moonBtn.disabled = !contextPlanetId || moonTargets.length === 0;
  sunBtn.classList.toggle('apply-all-active', applyAllTarget?.type === 'sun');
  planetBtn.classList.toggle('apply-all-active', applyAllTarget?.type === 'planet');
  moonBtn.classList.toggle('apply-all-active', applyAllTarget?.type === 'moon');
}

function updateRemoveButtons() {
  document.getElementById('remove-sun').disabled = selectedType !== 'sun';
  document.getElementById('remove-planet').disabled = selectedType !== 'planet';
  document.getElementById('remove-moon').disabled = selectedType !== 'moon';
}

document.getElementById('sun-left-btn').addEventListener('click', () => {
  if (bodies.suns.length === 0) return;
  if (applyAllTarget?.type === 'sun') return exitApplyAllMode();
  enterApplyAllMode('sun');
});

document.getElementById('planet-left-btn').addEventListener('click', () => {
  const contextSunId = getContextSunIdForPlanets();
  if (!contextSunId || bodies.planets.filter(p => p.parentId === contextSunId).length === 0) return;
  if (applyAllTarget?.type === 'planet' && applyAllTarget.sunId === contextSunId) return exitApplyAllMode();
  enterApplyAllMode('planet', contextSunId);
});

document.getElementById('moon-left-btn').addEventListener('click', () => {
  const contextPlanetId = getContextPlanetIdForMoons();
  if (!contextPlanetId || bodies.moons.filter(m => m.parentId === contextPlanetId).length === 0) return;
  if (applyAllTarget?.type === 'moon' && applyAllTarget.planetId === contextPlanetId) return exitApplyAllMode();
  enterApplyAllMode('moon', null, contextPlanetId);
});

// Add / remove buttons
document.getElementById('add-sun').addEventListener('click', addSun);
document.getElementById('add-planet').addEventListener('click', addPlanet);
document.getElementById('add-moon').addEventListener('click', addMoon);
document.getElementById('remove-sun').addEventListener('click', removeSelectedSun);
document.getElementById('remove-planet').addEventListener('click', removeSelectedPlanet);
document.getElementById('remove-moon').addEventListener('click', removeSelectedMoon);

document.getElementById('clear-selection').addEventListener('click', () => {
  setSelection(null, null);
  document.getElementById('sun-selector').value = '';
  document.getElementById('planet-selector').value = '';
  document.getElementById('moon-selector').value = '';
});

document.getElementById('generate-random').addEventListener('click', generateRandomSystem);

// Swatch bar
function getSelectedBody() {
  if (selectedType === 'sun') return getSelectedSun();
  if (selectedType === 'planet') return getSelectedPlanet();
  if (selectedType === 'moon') return bodies.moons.find(m => m.id === selectedId);
  return null;
}

function initSwatchBar() {
  const bar = document.getElementById('swatch-bar');
  bar.innerHTML = '';
  SWATCH_ROWS.forEach(colors => {
    const row = document.createElement('div');
    row.className = 'swatch-row';
    colors.forEach(color => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'swatch';
      swatch.style.backgroundColor = color;
      swatch.setAttribute('aria-label', `Set color to ${color}`);
      swatch.dataset.color = color;
      swatch.addEventListener('click', () => {
        if (applyAllTarget?.type === 'sun') {
          bodies.suns.forEach(s => s.color = color);
        } else if (applyAllTarget?.type === 'planet') {
          bodies.planets.filter(p => p.parentId === applyAllTarget.sunId).forEach(p => p.color = color);
        } else if (applyAllTarget?.type === 'moon') {
          bodies.moons.filter(m => m.parentId === applyAllTarget.planetId).forEach(m => m.color = color);
        } else {
          const body = getSelectedBody();
          if (body) body.color = color;
        }
      });
      row.appendChild(swatch);
    });
    bar.appendChild(row);
  });
}

initSwatchBar();

function initDesignToggle() {
  const btn = document.getElementById('design-toggle');
  const controls = document.getElementById('design-controls');
  btn.addEventListener('click', () => {
    const visible = controls.style.display !== 'none';
    controls.style.display = visible ? 'none' : 'flex';
    btn.textContent = visible ? 'Show Design' : 'Hide Design';
  });
}
initDesignToggle();

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  btn.addEventListener('click', () => {
    const isDark = canvasBgColor === '#000000';
    canvasBgColor = isDark ? '#ffffff' : '#000000';
    btn.textContent = isDark ? 'Dark' : 'Light';
    const dark = canvasBgColor === '#000000';
    document.documentElement.classList.toggle('dark-mode', dark);
    document.body.classList.toggle('dark-mode', dark);
    draw();
  });
}
initThemeToggle();

// Init
initBodies();
updatePositionSliderRange();
syncSelectors();
updateDropdownStyles();
updatePropertyVisibility();
updateSelectionIndicator();
updateApplyAllButtons();
updateRemoveButtons();
syncSlidersToPlanet();
draw();
