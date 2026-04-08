const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

/** Slider at 100% maps to this many stored trail points (higher = heavier). */
const TRAIL_LENGTH_MAX = 200;
/** Current cap from trails slider (0 = trails off). */
let trailMaxLength = TRAIL_LENGTH_MAX;
/** Draw every Nth segment along the trail (fewer strokes, similar look). */
const TRAIL_DRAW_STRIDE = 2;

const sun = {
  radius: 21.6
};

// AU only for Kepler-like orbit speeds (not for orbit radius)
const PLANET_AU = [0.387, 0.723, 1.0, 1.524, 5.203, 9.537, 19.191, 30.069, 39.48];
const PLANET_COLOR_VARS = [
  '--planet-inner-color',
  '--planet-venus-color',
  '--planet-color',
  '--planet-outer-color',
  '--planet-jupiter-color',
  '--planet-saturn-color',
  '--planet-uranus-color',
  '--planet-neptune-color',
  '--planet-pluto-color'
];
// revealLevel: 0=Mercury,Venus | 1=Earth | 2=moon | 3=Mars | 4=Jupiter+moons | 5–8=Saturn..Pluto
const planets = [
  { radius: 6, orbitRadius: 44, orbitSpeed: 0.016, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 0 },
  { radius: 8, orbitRadius: 52, orbitSpeed: 0.012, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 0 },
  { radius: 9, orbitRadius: 60, orbitSpeed: 0.01, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 1 },
  { radius: 7, orbitRadius: 68, orbitSpeed: 0.008, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 3 },
  { radius: 11, orbitRadius: 76, orbitSpeed: 0.0044, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 4 },
  { radius: 10, orbitRadius: 84, orbitSpeed: 0.0035, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 5 },
  { radius: 8, orbitRadius: 92, orbitSpeed: 0.003, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 6 },
  { radius: 8, orbitRadius: 100, orbitSpeed: 0.0028, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 7 },
  { radius: 5, orbitRadius: 108, orbitSpeed: 0.0025, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, revealLevel: 8 }
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
  trailWidth: 2
};

const JUPITER_INDEX = 4;
const JUPITER_MOON_COLOR_VARS = [
  '--moon-io-color',
  '--moon-europa-color',
  '--moon-ganymede-color',
  '--moon-callisto-color'
];
const jupiterMoons = [
  { radius: 3, orbitRadius: 18, orbitRadiusBase: 18, orbitSpeed: 0.08, speedBase: 0.08, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2 },
  { radius: 3, orbitRadius: 28, orbitRadiusBase: 28, orbitSpeed: 0.063, speedBase: 0.063, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2 },
  { radius: 4, orbitRadius: 45, orbitRadiusBase: 45, orbitSpeed: 0.05, speedBase: 0.05, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2 },
  { radius: 3, orbitRadius: 78, orbitRadiusBase: 78, orbitSpeed: 0.038, speedBase: 0.038, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2 }
];

/** One getComputedStyle + all CSS colors used by the canvas this frame. */
function snapshotCanvasColors() {
  const cs = getComputedStyle(document.documentElement);
  const pick = (v) => cs.getPropertyValue(v).trim() || '#ffffff';
  return {
    bg: pick('--bg-color'),
    star: pick('--star-color'),
    sun: pick('--sun-color'),
    planet: PLANET_COLOR_VARS.map((v) => pick(v)),
    moon: pick('--moon-color'),
    jupiterMoon: JUPITER_MOON_COLOR_VARS.map((v) => pick(v))
  };
}

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

function parseHexRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
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

function drawStars(ctx, sliderValue, starColorHex) {
  if (sliderValue <= 0) return;
  const count = Math.floor((sliderValue / 100) * MAX_STARS);
  const intensity = sliderValue / 100;
  const stars = getStars();
  const { r, g, b } = parseHexRgb(starColorHex);
  for (let i = 0; i < count; i++) {
    const s = stars[i];
    const alpha = s.brightness * intensity;
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius ?? 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTaperedTrail(ctx, trail, colorHex, maxAlpha, bodyRadius) {
  const n = trail.length;
  if (n < 2) return;
  const { r, g, b } = parseHexRgb(colorHex);
  const minWidth = 1;
  const maxWidth = bodyRadius * 2;
  const stride = TRAIL_DRAW_STRIDE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < n - stride; i += stride) {
    const j = i + stride;
    const t = (i + j) / (2 * n);
    const w = minWidth + (maxWidth - minWidth) * t;
    ctx.strokeStyle = `rgba(${r},${g},${b},${maxAlpha * t})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(trail[i].x, trail[i].y);
    ctx.lineTo(trail[j].x, trail[j].y);
    ctx.stroke();
  }
}

function draw() {
  const C = snapshotCanvasColors();
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const starsSliderVal = Number(document.getElementById('stars-slider').value);
  drawStars(ctx, starsSliderVal, C.star);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const sunGradient = ctx.createRadialGradient(
    cx - sun.radius * 0.3, cy - sun.radius * 0.3, 0,
    cx, cy, sun.radius
  );
  sunGradient.addColorStop(0, lightenHex(C.sun, 40));
  sunGradient.addColorStop(0.5, C.sun);
  sunGradient.addColorStop(1, darkenHex(C.sun, 25));
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
        if (p.trail.length > trailMaxLength) p.trail.shift();
        if (p.trail.length > 1) {
          drawTaperedTrail(ctx, p.trail, C.planet[i], 0.6, p.radius);
        }
      } else {
        p.trail = [];
      }
      ctx.fillStyle = C.planet[i];
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
      if (moon.trail.length > trailMaxLength) moon.trail.shift();
      if (moon.trail.length > 1) {
        drawTaperedTrail(ctx, moon.trail, C.moon, 0.6, moon.radius);
      }
    } else {
      moon.trail = [];
    }

    ctx.fillStyle = C.moon;
    ctx.beginPath();
    ctx.arc(mx, my, moon.radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    moon.trail = [];
  }

  if (revealLevel >= 4) {
  jupiterMoons.forEach((jm, ji) => {
    if (!paused) {
      jm.orbitAngle += jm.orbitSpeed * speedMultiplier;
    }
    const jmOffset = ellipsePosition(jm.orbitAngle, jm.orbitRadius, jm.ellipticity, jm.orbitTilt);
    const jmx = jupiterX + jmOffset.x;
    const jmy = jupiterY + jmOffset.y;

    if (jm.trailEnabled) {
      jm.trail.push({ x: jmx, y: jmy });
      if (jm.trail.length > trailMaxLength) jm.trail.shift();
      if (jm.trail.length > 1) {
        drawTaperedTrail(ctx, jm.trail, C.jupiterMoon[ji], 0.6, jm.radius);
      }
    } else {
      jm.trail = [];
    }

    ctx.fillStyle = C.jupiterMoon[ji];
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

function syncTrailLengthFromSlider() {
  const val = Number(document.getElementById('trails-slider').value);
  const enabled = val > 0;
  trailMaxLength = enabled ? Math.max(1, Math.round((val / 100) * TRAIL_LENGTH_MAX)) : 0;

  planets.forEach(p => {
    p.trailEnabled = enabled;
    if (!enabled) p.trail = [];
    else while (p.trail.length > trailMaxLength) p.trail.shift();
  });
  moon.trailEnabled = enabled;
  if (!enabled) moon.trail = [];
  else while (moon.trail.length > trailMaxLength) moon.trail.shift();
  jupiterMoons.forEach(jm => {
    jm.trailEnabled = enabled;
    if (!enabled) jm.trail = [];
    else while (jm.trail.length > trailMaxLength) jm.trail.shift();
  });
}

document.getElementById('trails-slider').addEventListener('input', syncTrailLengthFromSlider);

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

  if (isLight) {
    document.documentElement.style.setProperty('--crescent-moon-a', '#141414');
    document.documentElement.style.setProperty('--crescent-moon-b', '#4a4a4a');
    document.documentElement.style.setProperty('--crescent-moon-c', '#6e6e6e');
    document.documentElement.style.setProperty('--moon-crescent', '#141414');
  } else {
    document.documentElement.style.setProperty('--crescent-moon-a', '#fcfbf7');
    document.documentElement.style.setProperty('--crescent-moon-b', '#dcd8ce');
    document.documentElement.style.setProperty('--crescent-moon-c', '#a39e94');
    document.documentElement.style.setProperty('--moon-crescent', '#fcfbf7');
  }
}

document.getElementById('bg-slider').addEventListener('input', (e) => {
  updateUiColorsForBg(Number(e.target.value));
});

/** Keeps the controls toggle fixed when collapsing: reserve expanded stack height. */
function updateSliderFloatAnchorHeight() {
  const float = document.getElementById('slider-float');
  if (!float) return;
  const wasHidden = float.classList.contains('slider-float--controls-hidden');
  float.classList.remove('slider-float--controls-hidden');
  void float.offsetHeight;
  const h = float.offsetHeight;
  float.style.minHeight = `${h}px`;
  if (wasHidden) float.classList.add('slider-float--controls-hidden');
}

document.getElementById('controls-visibility-btn').addEventListener('click', () => {
  const float = document.getElementById('slider-float');
  const btn = document.getElementById('controls-visibility-btn');
  float.classList.toggle('slider-float--controls-hidden');
  const hidden = float.classList.contains('slider-float--controls-hidden');
  btn.setAttribute('aria-expanded', String(!hidden));
  btn.setAttribute('aria-label', hidden ? 'Show controls' : 'Hide controls');
});

window.addEventListener('resize', updateSliderFloatAnchorHeight);


/**
 * HSL (0–360, 0–1, 0–1) → { r, g, b } 0–255
 */
function hslToRgb(h, s, l) {
  let hue = h % 360;
  if (hue < 0) hue += 360;
  const sat = Math.max(0, Math.min(1, s));
  const light = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hue < 60) {
    rp = c;
    gp = x;
  } else if (hue < 120) {
    rp = x;
    gp = c;
  } else if (hue < 180) {
    gp = c;
    bp = x;
  } else if (hue < 240) {
    gp = x;
    bp = c;
  } else if (hue < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255)
  };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

/**
 * One random "solar system" palette: analogous hue steps from a base, warm sun,
 * Earth's moon and Galileans tinted from their host planets.
 */
function randomThematicSystemColors() {
  const baseHue = Math.random() * 360;
  const step = 16 + Math.random() * 10;
  const j = () => (Math.random() - 0.5) * 8;

  const sunHue = (baseHue + 12 + Math.random() * 18) % 360;
  const sunS = 0.72 + Math.random() * 0.2;
  const sunL = 0.54 + Math.random() * 0.12;

  const planetHsl = [];
  for (let i = 0; i < 9; i++) {
    const hue = (baseHue + i * step + j()) % 360;
    const s = 0.42 + Math.random() * 0.22 + (i % 3) * 0.04;
    const l = 0.34 + Math.random() * 0.14 + (i % 2) * 0.05;
    planetHsl.push({ h: hue, s, l });
  }

  const earth = planetHsl[2];
  const jupiter = planetHsl[4];

  const moonHue = (earth.h + 6 + j()) % 360;
  const moonS = Math.max(0.25, earth.s - 0.08 + Math.random() * 0.06);
  const moonL = Math.max(0.28, earth.l - 0.04 + Math.random() * 0.06);

  const galileanOffsets = [
    { dh: -14, ds: 0.12, dl: 0.06 },
    { dh: 6, ds: -0.1, dl: 0.1 },
    { dh: 18, ds: 0.04, dl: -0.04 },
    { dh: -4, ds: -0.06, dl: -0.08 }
  ];
  const jupiterMoonsHex = galileanOffsets.map(({ dh, ds, dl }) => {
    const h = (jupiter.h + dh + j()) % 360;
    const s = Math.max(0.2, Math.min(0.92, jupiter.s + ds + (Math.random() - 0.5) * 0.06));
    const l = Math.max(0.26, Math.min(0.62, jupiter.l + dl + (Math.random() - 0.5) * 0.05));
    return hslToHex(h, s, l);
  });

  return {
    sun: hslToHex(sunHue, sunS, sunL),
    planets: planetHsl.map(({ h, s, l }) => hslToHex(h, s, l)),
    moon: hslToHex(moonHue, moonS, moonL),
    jupiterMoons: jupiterMoonsHex
  };
}

document.getElementById('random-colors-btn').addEventListener('click', () => {
  const pal = randomThematicSystemColors();
  document.documentElement.style.setProperty('--sun-color', pal.sun);
  document.documentElement.style.setProperty('--planet-inner-color', pal.planets[0]);
  document.documentElement.style.setProperty('--planet-venus-color', pal.planets[1]);
  document.documentElement.style.setProperty('--planet-color', pal.planets[2]);
  document.documentElement.style.setProperty('--planet-outer-color', pal.planets[3]);
  document.documentElement.style.setProperty('--planet-jupiter-color', pal.planets[4]);
  document.documentElement.style.setProperty('--planet-saturn-color', pal.planets[5]);
  document.documentElement.style.setProperty('--planet-uranus-color', pal.planets[6]);
  document.documentElement.style.setProperty('--planet-neptune-color', pal.planets[7]);
  document.documentElement.style.setProperty('--planet-pluto-color', pal.planets[8]);
  document.documentElement.style.setProperty('--moon-color', pal.moon);
  document.documentElement.style.setProperty('--moon-io-color', pal.jupiterMoons[0]);
  document.documentElement.style.setProperty('--moon-europa-color', pal.jupiterMoons[1]);
  document.documentElement.style.setProperty('--moon-ganymede-color', pal.jupiterMoons[2]);
  document.documentElement.style.setProperty('--moon-callisto-color', pal.jupiterMoons[3]);
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
syncTrailLengthFromSlider();

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    updateSliderFloatAnchorHeight();
  });
});

draw();
