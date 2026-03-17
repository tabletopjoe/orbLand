const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const MAX_TRAIL_LENGTH = 80;

function getThemeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#ffffff';
}

const sun = {
  radius: 27,
  get color() { return getThemeColor('--sun-color'); }
};

const ORBIT_RATIOS = { mercury: 0.387, venus: 0.723, earth: 1.0, mars: 1.524, jupiter: 5.203 };
const planets = [
  { radius: 6, orbitRadius: 115 * ORBIT_RATIOS.mercury, orbitSpeed: 0.016, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--planet-inner-color'); } },
  { radius: 8, orbitRadius: 115 * ORBIT_RATIOS.venus, orbitSpeed: 0.012, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--planet-venus-color'); } },
  { radius: 9, orbitRadius: 115, orbitSpeed: 0.01, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--planet-color'); } },
  { radius: 7, orbitRadius: 115 * ORBIT_RATIOS.mars, orbitSpeed: 0.008, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--planet-outer-color'); } },
  { radius: 11, orbitRadius: 115 * ORBIT_RATIOS.jupiter, orbitSpeed: 0.0044, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--planet-jupiter-color'); } }
];
const middlePlanetIndex = 2;

const moon = {
  radius: 4,
  orbitRadius: 28,
  orbitSpeed: 0.03,
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
  { radius: 3, orbitRadius: 18, orbitSpeed: 0.08, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--moon-io-color'); } },
  { radius: 3, orbitRadius: 28, orbitSpeed: 0.063, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--moon-europa-color'); } },
  { radius: 4, orbitRadius: 45, orbitSpeed: 0.05, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--moon-ganymede-color'); } },
  { radius: 3, orbitRadius: 78, orbitSpeed: 0.038, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--moon-callisto-color'); } }
];

let paused = false;
let speedMultiplier = 1;

function getCanvasDimensions() {
  const area = canvas.parentElement;
  const w = area?.clientWidth || window.innerWidth;
  const h = area?.clientHeight || window.innerHeight;
  return { width: Math.max(1, w), height: Math.max(1, h) };
}

function resizeCanvas() {
  const { width, height } = getCanvasDimensions();
  canvas.width = width;
  canvas.height = height;
}
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
  }

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

  requestAnimationFrame(draw);
}

document.getElementById('speed-multiplier-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  speedMultiplier = val / 100;
});

document.getElementById('planet-speed-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  const earthSpeed = 0.005 + (val - 5) / 45 * 0.045;
  planets[2].orbitSpeed = earthSpeed;
  planets[0].orbitSpeed = earthSpeed * Math.sqrt(1 / ORBIT_RATIOS.mercury);
  planets[1].orbitSpeed = earthSpeed * Math.sqrt(1 / ORBIT_RATIOS.venus);
  planets[3].orbitSpeed = earthSpeed * Math.sqrt(1 / ORBIT_RATIOS.mars);
  planets[4].orbitSpeed = earthSpeed * Math.sqrt(1 / ORBIT_RATIOS.jupiter);
});

document.getElementById('moon-speed-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  moon.orbitSpeed = 0.01 + (val - 10) / 90 * 0.09;
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

document.getElementById('tilt-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value) * Math.PI / 180;
  planets.forEach(p => { p.orbitTilt = val; });
  moon.orbitTilt = val;
  jupiterMoons.forEach(jm => { jm.orbitTilt = val; });
});

document.getElementById('planet-radius-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  planets[0].orbitRadius = val * ORBIT_RATIOS.mercury;
  planets[1].orbitRadius = val * ORBIT_RATIOS.venus;
  planets[2].orbitRadius = val;
  planets[3].orbitRadius = val * ORBIT_RATIOS.mars;
  planets[4].orbitRadius = val * ORBIT_RATIOS.jupiter;
});

document.getElementById('moon-radius-slider').addEventListener('input', (e) => {
  moon.orbitRadius = Number(e.target.value);
});

function updateUiColorsForBg(value) {
  const hex = Math.round(value * 255 / 100).toString(16).padStart(2, '0');
  document.documentElement.style.setProperty('--bg-color', `#${hex}${hex}${hex}`);
  const isLight = value > 50;
  document.documentElement.style.setProperty('--ui-color', isLight ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)');
  document.documentElement.style.setProperty('--ui-hover', isLight ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)');
  document.documentElement.style.setProperty('--ui-track', isLight ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)');
}

document.getElementById('bg-slider').addEventListener('input', (e) => {
  updateUiColorsForBg(Number(e.target.value));
});

function isClickOnSun(canvasX, canvasY) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  return Math.sqrt((canvasX - cx) ** 2 + (canvasY - cy) ** 2) <= sun.radius;
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (e.clientX - rect.left) * scaleX;
  const canvasY = (e.clientY - rect.top) * scaleY;
  if (isClickOnSun(canvasX, canvasY)) {
    paused = !paused;
  }
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (e.clientX - rect.left) * scaleX;
  const canvasY = (e.clientY - rect.top) * scaleY;
  canvas.style.cursor = isClickOnSun(canvasX, canvasY) ? 'pointer' : 'default';
});

updateUiColorsForBg(Number(document.getElementById('bg-slider').value));

document.querySelectorAll('.link-category').forEach(btn => {
  btn.addEventListener('click', () => {
    const category = btn.dataset.category;
    const list = document.getElementById(`link-list-${category}`);
    document.querySelectorAll('.link-list').forEach(l => l.classList.remove('visible'));
    document.querySelectorAll('.link-category').forEach(b => b.classList.remove('active'));
    if (list) {
      list.classList.add('visible');
      btn.classList.add('active');
    }
  });
});

draw();
