const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const TROPICAL_GREEN = '#2E8B57';

const SWATCH_COLORS = [
  '#2E8B57', '#F4A460', '#FFD700', '#FF6B35', '#E63946',
  '#1D3557', '#457B9D', '#A8DADC', '#2A9D8F', '#264653',
  '#E9C46A', '#D4A373', '#8338EC', '#3A86FF', '#06D6A0',
  '#EF476F', '#118AB2', '#073B4C'
];

function randomColor() {
  return SWATCH_COLORS[Math.floor(Math.random() * SWATCH_COLORS.length)];
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
  if (type === 'sun' && id) syncSlidersToSun();
  if (type === 'planet' && id) syncSlidersToPlanet();
  if (type === 'moon' && id) syncSlidersToMoon();
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
  sunProps.style.display = selectedType === 'sun' ? 'flex' : 'none';
  planetProps.style.display = (selectedType === 'planet' || selectedType === 'moon') ? 'flex' : 'none';
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

function findValidSunPosition() {
  const { width, height } = getCanvasDimensions();
  const halfX = Math.floor(width / 2);
  const halfY = Math.floor(height / 2);
  const minDistance = width * 0.1;

  function dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  function isValid(x, y) {
    return bodies.suns.every(sun => dist(x, y, sun.x, sun.y) >= minDistance);
  }

  // No other suns: any position works
  if (bodies.suns.length === 0) {
    return {
      x: Math.floor((Math.random() * 2 - 1) * halfX),
      y: Math.floor((Math.random() * 2 - 1) * halfY)
    };
  }

  let best = { x: 0, y: 0, minDist: 0 };
  for (let i = 0; i < 100; i++) {
    const x = Math.floor((Math.random() * 2 - 1) * halfX);
    const y = Math.floor((Math.random() * 2 - 1) * halfY);
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
    trail: [],
    parentId: parentPlanet.id,
    color: randomColor()
  });
  setSelection('moon', moonId);
  document.getElementById('moon-selector').focus();
}

function generateRandomSystem() {
  bodies.suns = [];
  bodies.planets = [];
  bodies.moons = [];
  selectedType = null;
  selectedId = null;

  const { width } = getCanvasDimensions();
  const baseOrbit = Math.min(80, width * 0.15);
  const sunCount = 1 + Math.floor(Math.random() * 3);

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
    const planetCount = Math.floor(Math.random() * 8);
    for (let j = 0; j < planetCount; j++) {
      const planetId = generateId('planet');
      bodies.planets.push({
        id: planetId,
        name: randomName(),
        radius: 8 + Math.random() * 20,
        orbitRadius: baseOrbit + Math.random() * 120 + j * 25,
        orbitSpeed: 0.003 + Math.random() * 0.03,
        ellipticity: Math.floor(Math.random() * 19) * 5,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitTrail: 0,
        trail: [],
        parentId: sunId,
        color: randomColor()
      });
      const moonCount = Math.floor(Math.random() * 3);
      for (let k = 0; k < moonCount; k++) {
        const moonId = generateId('moon');
        bodies.moons.push({
          id: moonId,
          name: randomName(),
          radius: 4 + Math.random() * 6,
          orbitRadius: 25 + Math.random() * 50,
          orbitSpeed: 0.015 + Math.random() * 0.04,
          ellipticity: Math.floor(Math.random() * 5) * 5,
          orbitAngle: Math.random() * Math.PI * 2,
          orbitTrail: 0,
          trail: [],
          parentId: planetId,
          color: randomColor()
        });
      }
    }
  }

  syncSelectors();
  updateDropdownStyles();
  updatePropertyVisibility();
  updateSelectionIndicator();
}

function draw() {
  ctx.fillStyle = '#ffffff';
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
        ctx.strokeStyle = planet.color || TROPICAL_GREEN;
        ctx.globalAlpha = planet.orbitTrail / 100;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(planet.trail[0].x, planet.trail[0].y);
        for (let i = 1; i < planet.trail.length; i++) {
          ctx.lineTo(planet.trail[i].x, planet.trail[i].y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
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
        ctx.strokeStyle = moon.color || TROPICAL_GREEN;
        ctx.globalAlpha = moon.orbitTrail / 100;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(moon.trail[0].x, moon.trail[0].y);
        for (let i = 1; i < moon.trail.length; i++) {
          ctx.lineTo(moon.trail[i].x, moon.trail[i].y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
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
}

function syncSlidersToMoon() {
  const moon = bodies.moons.find(m => m.id === selectedId);
  if (!moon) return;
  document.getElementById('planet-size-slider').value = moon.radius;
  document.getElementById('orbit-slider').value = moon.orbitRadius;
  document.getElementById('speed-slider').value = Math.round(moon.orbitSpeed * 1000);
  document.getElementById('ellipse-slider').value = moon.ellipticity;
  document.getElementById('trail-slider').value = moon.orbitTrail ?? 0;
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
  const sun = getSelectedSun();
  if (sun) sun.radius = Number(e.target.value);
});

document.getElementById('x-slider').addEventListener('input', (e) => {
  const sun = getSelectedSun();
  if (sun) sun.x = Number(e.target.value);
});

document.getElementById('y-slider').addEventListener('input', (e) => {
  const sun = getSelectedSun();
  if (sun) sun.y = Number(e.target.value);
});

// Planet / moon sliders (orbital bodies share these controls)
document.getElementById('planet-size-slider').addEventListener('input', (e) => {
  const body = getSelectedPlanet() || bodies.moons.find(m => m.id === selectedId);
  if (body) body.radius = Number(e.target.value);
});

document.getElementById('orbit-slider').addEventListener('input', (e) => {
  const body = getSelectedPlanet() || bodies.moons.find(m => m.id === selectedId);
  if (body) body.orbitRadius = Number(e.target.value);
});

document.getElementById('speed-slider').addEventListener('input', (e) => {
  const body = getSelectedPlanet() || bodies.moons.find(m => m.id === selectedId);
  if (body) body.orbitSpeed = Number(e.target.value) / 1000;
});

document.getElementById('ellipse-slider').addEventListener('input', (e) => {
  const body = getSelectedPlanet() || bodies.moons.find(m => m.id === selectedId);
  if (body) body.ellipticity = Number(e.target.value);
});

document.getElementById('trail-slider').addEventListener('input', (e) => {
  const body = getSelectedPlanet() || bodies.moons.find(m => m.id === selectedId);
  if (body) {
    body.orbitTrail = Number(e.target.value);
    if (body.orbitTrail === 0) body.trail = [];
  }
});

// Add buttons
document.getElementById('add-sun').addEventListener('click', addSun);
document.getElementById('add-planet').addEventListener('click', addPlanet);
document.getElementById('add-moon').addEventListener('click', addMoon);

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
  SWATCH_COLORS.forEach(color => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.style.backgroundColor = color;
    swatch.setAttribute('aria-label', `Set color to ${color}`);
    swatch.dataset.color = color;
    swatch.addEventListener('click', () => {
      const body = getSelectedBody();
      if (body) body.color = color;
    });
    bar.appendChild(swatch);
  });
}

initSwatchBar();

// Init
initBodies();
updatePositionSliderRange();
syncSelectors();
updateDropdownStyles();
updatePropertyVisibility();
updateSelectionIndicator();
syncSlidersToPlanet();
draw();
