const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const MAX_TRAIL_LENGTH = 80;

function getThemeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#ffffff';
}

const sun = {
  radius: 21.6,
  get color() { return getThemeColor('--sun-color'); }
};

// AU only for Kepler-like orbit speeds (not for orbit radius)
const PLANET_AU = [0.387, 0.723, 1.0, 1.524, 5.203, 9.537, 19.191, 30.069, 39.48];
// revealLevel: 0=Mercury,Venus | 1=Earth | 2=moon | 3=Mars | 4=Jupiter+moons | 5–8=Saturn..Pluto
const planets = [
  { radius: 6, orbitRadius: 44, orbitSpeed: 0.016, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 0, get color() { return getThemeColor('--planet-inner-color'); } },
  { radius: 8, orbitRadius: 52, orbitSpeed: 0.012, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 0, get color() { return getThemeColor('--planet-venus-color'); } },
  { radius: 9, orbitRadius: 60, orbitSpeed: 0.01, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 1, get color() { return getThemeColor('--planet-color'); } },
  { radius: 7, orbitRadius: 68, orbitSpeed: 0.008, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 3, get color() { return getThemeColor('--planet-outer-color'); } },
  { radius: 11, orbitRadius: 76, orbitSpeed: 0.0044, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 4, get color() { return getThemeColor('--planet-jupiter-color'); } },
  { radius: 10, orbitRadius: 84, orbitSpeed: 0.0035, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 5, get color() { return getThemeColor('--planet-saturn-color'); } },
  { radius: 8, orbitRadius: 92, orbitSpeed: 0.003, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 6, get color() { return getThemeColor('--planet-uranus-color'); } },
  { radius: 8, orbitRadius: 100, orbitSpeed: 0.0028, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 7, get color() { return getThemeColor('--planet-neptune-color'); } },
  { radius: 5, orbitRadius: 108, orbitSpeed: 0.0025, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 8, get color() { return getThemeColor('--planet-pluto-color'); } }
];
const middlePlanetIndex = 2;
const MOON_REVEAL_LEVEL = 2;

const MOON_ORBIT_BASE = 28;
const moon = {
  radius: 4,
  orbitRadius: 28,
  orbitRadiusBase: 28,
  orbitSpeed: 0.03,
  speedBase: 0.03,
  ellipticity: 0,
  orbitTilt: 0,
  orbitAngle: Math.random() * Math.PI * 2,
  trailEnabled: true,
  trail: [],
  trailWidth: 2,
  get color() { return getThemeColor('--moon-color'); }
};

const JUPITER_INDEX = 4;
const jupiterMoons = [
  { radius: 3, orbitRadius: 18, orbitRadiusBase: 18, orbitSpeed: 0.08, speedBase: 0.08, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--moon-io-color'); } },
  { radius: 3, orbitRadius: 28, orbitRadiusBase: 28, orbitSpeed: 0.063, speedBase: 0.063, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--moon-europa-color'); } },
  { radius: 4, orbitRadius: 45, orbitRadiusBase: 45, orbitSpeed: 0.05, speedBase: 0.05, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--moon-ganymede-color'); } },
  { radius: 3, orbitRadius: 78, orbitRadiusBase: 78, orbitSpeed: 0.038, speedBase: 0.038, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--moon-callisto-color'); } }
];

let paused = false;
let speedMultiplier = 1;
let revealLevel = 0;
const MAX_REVEAL_LEVEL = 8;
let orbitRadiusScale = 1;
const MAX_STARS = 460;
let starCache = null;
let starCacheSize = null;

function getCanvasDimensions() {
  const area = canvas.parentElement;
  const w = area?.clientWidth || window.innerWidth;
  const h = area?.clientHeight || window.innerHeight;
  return { width: Math.max(1, w), height: Math.max(1, h) };
}

function applyUniformOrbitRadii() {
  const { width, height } = getCanvasDimensions();
  const outerMargin = 24;
  let maxR = Math.min(width, height) / 2 - outerMargin;
  const minR = 36;
  if (maxR < minR + 32) maxR = minR + 32;
  const gap = (maxR - minR) / 8;
  for (let i = 0; i < planets.length; i++) {
    planets[i].orbitRadius = (minR + i * gap) * orbitRadiusScale;
  }
}

function resizeCanvas() {
  const { width, height } = getCanvasDimensions();
  canvas.width = width;
  canvas.height = height;
  starCache = null;
  applyUniformOrbitRadii();
}
orbitRadiusScale = Number(document.getElementById('planet-radius-slider').value) / 115;
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function ellipsePosition(orbitAngle, orbitRadius, ellipticity, orbitTilt = 0) {
  const radiusY = orbitRadius * (1 - ellipticity / 100);
  const u = orbitRadius * Math.cos(orbitAngle);
  const v = radiusY * Math.sin(orbitAngle);
  const cosT = Math.cos(orbitTilt);
  const sinT = Math.sin(orbitTilt);
  return {
    x: u * cosT - v * sinT,
    y: u * sinT + v * cosT
  };
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lightenHex(hex, amount) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darkenHex(hex, amount) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getStars() {
  const { width, height } = getCanvasDimensions();
  if (starCache && starCacheSize && starCacheSize.width === width && starCacheSize.height === height) {
    return starCache;
  }
  const stars = [];
  for (let i = 0; i < MAX_STARS; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      brightness: 0.04 + Math.random() * 0.96,
      radius: 0.4 + Math.random() * 1.6
    });
  }
  starCache = stars;
  starCacheSize = { width, height };
  return stars;
}

function drawStars(ctx, sliderValue) {
  if (sliderValue <= 0) return;
  const count = Math.floor((sliderValue / 100) * MAX_STARS);
  const intensity = sliderValue / 100;
  const stars = getStars();
  const starColor = getThemeColor('--star-color');
  for (let i = 0; i < count; i++) {
    const s = stars[i];
    const alpha = s.brightness * intensity;
    ctx.fillStyle = hexToRgba(starColor, alpha);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius ?? 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTaperedTrail(ctx, trail, color, maxAlpha, bodyRadius) {
  const n = trail.length;
  if (n < 2) return;
  const minWidth = 1;
  const maxWidth = bodyRadius * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < n - 1; i++) {
    const t = (i + 0.5) / n;
    const w = minWidth + (maxWidth - minWidth) * t;
    ctx.strokeStyle = hexToRgba(color, maxAlpha * t);
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(trail[i].x, trail[i].y);
    ctx.lineTo(trail[i + 1].x, trail[i + 1].y);
    ctx.stroke();
  }
}

function draw() {
  const bgColor = getThemeColor('--bg-color');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStars(ctx, Number(document.getElementById('stars-slider').value));

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const sunGradient = ctx.createRadialGradient(
    cx - sun.radius * 0.3, cy - sun.radius * 0.3, 0,
    cx, cy, sun.radius
  );
  sunGradient.addColorStop(0, lightenHex(sun.color, 40));
  sunGradient.addColorStop(0.5, sun.color);
  sunGradient.addColorStop(1, darkenHex(sun.color, 25));
  ctx.fillStyle = sunGradient;
  ctx.beginPath();
  ctx.arc(cx, cy, sun.radius, 0, Math.PI * 2);
  ctx.fill();

  let middlePlanetX = 0, middlePlanetY = 0;
  let jupiterX = 0, jupiterY = 0;

  for (let i = 0; i < planets.length; i++) {
    const p = planets[i];
    if (!paused) {
      p.orbitAngle += p.orbitSpeed * speedMultiplier;
    }
    const offset = ellipsePosition(p.orbitAngle, p.orbitRadius, p.ellipticity, p.orbitTilt);
    const px = cx + offset.x;
    const py = cy + offset.y;
    if (i === middlePlanetIndex) {
      middlePlanetX = px;
      middlePlanetY = py;
    }
    if (i === JUPITER_INDEX) {
      jupiterX = px;
      jupiterY = py;
    }

    if (p.revealLevel <= revealLevel) {
      if (p.trailEnabled) {
        p.trail.push({ x: px, y: py });
        if (p.trail.length > MAX_TRAIL_LENGTH) p.trail.shift();
        if (p.trail.length > 1) {
          drawTaperedTrail(ctx, p.trail, p.color, 0.6, p.radius);
        }
      } else {
        p.trail = [];
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      p.trail = [];
    }
  }

  if (revealLevel >= MOON_REVEAL_LEVEL) {
    if (!paused) {
      moon.orbitAngle += moon.orbitSpeed * speedMultiplier;
    }
    const moonOffset = ellipsePosition(moon.orbitAngle, moon.orbitRadius, moon.ellipticity, moon.orbitTilt);
    const mx = middlePlanetX + moonOffset.x;
    const my = middlePlanetY + moonOffset.y;

    if (moon.trailEnabled) {
      moon.trail.push({ x: mx, y: my });
      if (moon.trail.length > MAX_TRAIL_LENGTH) moon.trail.shift();
      if (moon.trail.length > 1) {
        drawTaperedTrail(ctx, moon.trail, moon.color, 0.6, moon.radius);
      }
    } else {
      moon.trail = [];
    }

    ctx.fillStyle = moon.color;
    ctx.beginPath();
    ctx.arc(mx, my, moon.radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    moon.trail = [];
  }

  if (revealLevel >= 4) {
  jupiterMoons.forEach(jm => {
    if (!paused) {
      jm.orbitAngle += jm.orbitSpeed * speedMultiplier;
    }
    const jmOffset = ellipsePosition(jm.orbitAngle, jm.orbitRadius, jm.ellipticity, jm.orbitTilt);
    const jmx = jupiterX + jmOffset.x;
    const jmy = jupiterY + jmOffset.y;

    if (jm.trailEnabled) {
      jm.trail.push({ x: jmx, y: jmy });
      if (jm.trail.length > MAX_TRAIL_LENGTH) jm.trail.shift();
      if (jm.trail.length > 1) {
        drawTaperedTrail(ctx, jm.trail, jm.color, 0.6, jm.radius);
      }
    } else {
      jm.trail = [];
    }

    ctx.fillStyle = jm.color;
    ctx.beginPath();
    ctx.arc(jmx, jmy, jm.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  }

  requestAnimationFrame(draw);
}

document.getElementById('speed-multiplier-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  speedMultiplier = val / 100;
});

function syncPlanetSpeedsFromSlider() {
  const val = Number(document.getElementById('planet-speed-slider').value);
  const earthSpeed = 0.005 + (val - 5) / 45 * 0.045;
  planets.forEach((p, i) => {
    p.orbitSpeed = earthSpeed / Math.sqrt(PLANET_AU[i]);
  });
}

document.getElementById('planet-speed-slider').addEventListener('input', syncPlanetSpeedsFromSlider);

document.getElementById('moon-speed-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  const mult = (0.01 + (val - 10) / 90 * 0.09) / 0.03;
  moon.orbitSpeed = moon.speedBase * mult;
  jupiterMoons.forEach(jm => { jm.orbitSpeed = jm.speedBase * mult; });
});

document.getElementById('trails-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  const enabled = val > 0;
  planets.forEach(p => {
    p.trailEnabled = enabled;
    if (!enabled) p.trail = [];
  });
  moon.trailEnabled = enabled;
  if (!enabled) moon.trail = [];
  jupiterMoons.forEach(jm => {
    jm.trailEnabled = enabled;
    if (!enabled) jm.trail = [];
  });
});

document.getElementById('planet-radius-slider').addEventListener('input', (e) => {
  orbitRadiusScale = Number(e.target.value) / 115;
  applyUniformOrbitRadii();
});

document.getElementById('moon-radius-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  const mult = val / MOON_ORBIT_BASE;
  moon.orbitRadius = moon.orbitRadiusBase * mult;
  jupiterMoons.forEach(jm => { jm.orbitRadius = jm.orbitRadiusBase * mult; });
});

function updateUiColorsForBg(value) {
  const hex = Math.round(value * 255 / 100).toString(16).padStart(2, '0');
  document.documentElement.style.setProperty('--bg-color', `#${hex}${hex}${hex}`);
  const isLight = value > 50;
  document.documentElement.style.setProperty('--ui-color', isLight ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)');
  document.documentElement.style.setProperty('--ui-hover', isLight ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)');
  document.documentElement.style.setProperty('--ui-track', isLight ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)');
  document.documentElement.style.setProperty('--star-color', isLight ? '#000000' : '#ffffff');
}

document.getElementById('bg-slider').addEventListener('input', (e) => {
  updateUiColorsForBg(Number(e.target.value));
});


function randomHex() {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

document.getElementById('random-colors-btn').addEventListener('click', () => {
  document.documentElement.style.setProperty('--sun-color', randomHex());
  document.documentElement.style.setProperty('--planet-inner-color', randomHex());
  document.documentElement.style.setProperty('--planet-venus-color', randomHex());
  document.documentElement.style.setProperty('--planet-color', randomHex());
  document.documentElement.style.setProperty('--planet-outer-color', randomHex());
  document.documentElement.style.setProperty('--planet-jupiter-color', randomHex());
  document.documentElement.style.setProperty('--planet-saturn-color', randomHex());
  document.documentElement.style.setProperty('--planet-uranus-color', randomHex());
  document.documentElement.style.setProperty('--planet-neptune-color', randomHex());
  document.documentElement.style.setProperty('--planet-pluto-color', randomHex());
  document.documentElement.style.setProperty('--moon-color', randomHex());
  document.documentElement.style.setProperty('--moon-io-color', randomHex());
  document.documentElement.style.setProperty('--moon-europa-color', randomHex());
  document.documentElement.style.setProperty('--moon-ganymede-color', randomHex());
  document.documentElement.style.setProperty('--moon-callisto-color', randomHex());
});

function isClickOnSun(canvasX, canvasY) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  return Math.sqrt((canvasX - cx) ** 2 + (canvasY - cy) ** 2) <= sun.radius;
}

function canvasCoordsFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.slider-float')) return;
  if (e.target === canvas || e.target.closest('#canvas')) {
    const { x, y } = canvasCoordsFromEvent(e);
    if (isClickOnSun(x, y)) {
      paused = !paused;
      return;
    }
  }
  incrementReveal();
});

canvas.addEventListener('mousemove', (e) => {
  const { x, y } = canvasCoordsFromEvent(e);
  canvas.style.cursor = isClickOnSun(x, y) ? 'pointer' : 'default';
});

updateUiColorsForBg(Number(document.getElementById('bg-slider').value));

function incrementReveal() {
  if (revealLevel < MAX_REVEAL_LEVEL) revealLevel++;
}

function syncLinkCrescentHeights() {
  document.querySelectorAll('.link-row').forEach(row => {
    const list = row.querySelector('.link-list');
    const crescent = row.querySelector('.link-crescent');
    if (!list || !crescent) return;
    if (list.classList.contains('visible')) {
      crescent.style.height = `${list.offsetHeight}px`;
    } else {
      crescent.style.height = '';
    }
  });
}

function closeAllLinkPanels() {
  document.querySelectorAll('.link-list').forEach(list => {
    list.classList.remove('visible');
    list.setAttribute('aria-hidden', 'true');
    list.setAttribute('inert', '');
    const cat = list.dataset.category;
    const b = document.getElementById(`link-category-${cat}`);
    if (b) {
      b.setAttribute('aria-expanded', 'false');
      b.classList.remove('active');
    }
  });
}

function openLinkPanel(btn, list) {
  list.classList.add('visible');
  list.removeAttribute('inert');
  list.setAttribute('aria-hidden', 'false');
  btn.setAttribute('aria-expanded', 'true');
  btn.classList.add('active');
}

document.querySelectorAll('.link-category').forEach(btn => {
  btn.addEventListener('click', () => {
    const category = btn.dataset.category;
    const list = document.getElementById(`link-list-${category}`);
    if (!list) return;

    const wasOpen = btn.classList.contains('active') && list.classList.contains('visible');

    if (wasOpen) {
      closeAllLinkPanels();
    } else {
      closeAllLinkPanels();
      openLinkPanel(btn, list);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(syncLinkCrescentHeights);
    });
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const open = document.querySelector('.link-list.visible');
  if (!open) return;
  const cat = open.dataset.category;
  const opener = document.getElementById(`link-category-${cat}`);
  closeAllLinkPanels();
  opener?.focus();
  requestAnimationFrame(() => {
    requestAnimationFrame(syncLinkCrescentHeights);
  });
});

document.querySelectorAll('.link-list').forEach(list => {
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncLinkCrescentHeights).observe(list);
  }
});

window.addEventListener('resize', syncLinkCrescentHeights);

syncPlanetSpeedsFromSlider();

draw();
