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

const ORBIT_RATIOS = { mercury: 0.387, earth: 1.0, mars: 1.524 };
const planets = [
  { radius: 7, orbitRadius: 115 * ORBIT_RATIOS.mercury, orbitSpeed: 0.012, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--planet-inner-color'); } },
  { radius: 9, orbitRadius: 115, orbitSpeed: 0.01, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--planet-color'); } },
  { radius: 7, orbitRadius: 115 * ORBIT_RATIOS.mars, orbitSpeed: 0.008, ellipticity: 0, orbitTilt: 0, orbitAngle: Math.random() * Math.PI * 2, trailEnabled: true, trail: [], trailWidth: 2, get color() { return getThemeColor('--planet-outer-color'); } }
];
const middlePlanetIndex = 1;

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

let paused = false;
let speedMultiplier = 1;

function getCanvasDimensions() {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
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

  requestAnimationFrame(draw);
}

document.getElementById('speed-multiplier-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  speedMultiplier = val / 100;
});

document.getElementById('planet-speed-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  const speed = 0.005 + (val - 5) / 45 * 0.045;
  planets[1].orbitSpeed = speed;
  planets[0].orbitSpeed = speed * 1.2;
  planets[2].orbitSpeed = speed * 0.8;
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
});

document.getElementById('tilt-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value) * Math.PI / 180;
  planets.forEach(p => { p.orbitTilt = val; });
  moon.orbitTilt = val;
});

document.getElementById('planet-radius-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  planets[1].orbitRadius = val;
  planets[0].orbitRadius = val * ORBIT_RATIOS.mercury;
  planets[2].orbitRadius = val * ORBIT_RATIOS.mars;
});

document.getElementById('moon-radius-slider').addEventListener('input', (e) => {
  moon.orbitRadius = Number(e.target.value);
});

document.getElementById('bg-slider').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  const hex = Math.round(v * 255 / 100).toString(16).padStart(2, '0');
  document.documentElement.style.setProperty('--bg-color', `#${hex}${hex}${hex}`);
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

draw();
