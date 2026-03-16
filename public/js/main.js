const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const MAX_TRAIL_LENGTH = 80;

function getThemeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#ffffff';
}

const sun = {
  radius: 40,
  get color() { return getThemeColor('--sun-color'); }
};

const planet = {
  radius: 12,
  orbitRadius: 120,
  orbitSpeed: 0.01,
  ellipticity: 0,
  orbitTilt: 0,
  orbitAngle: 0,
  trailEnabled: false,
  trail: [],
  trailWidth: 2,
  get color() { return getThemeColor('--planet-color'); }
};

const moon = {
  radius: 6,
  orbitRadius: 35,
  orbitSpeed: 0.03,
  ellipticity: 0,
  orbitTilt: 0,
  orbitAngle: 0,
  trailEnabled: false,
  trail: [],
  trailWidth: 2,
  get color() { return getThemeColor('--moon-color'); }
};

let paused = false;

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

function drawTaperedTrail(ctx, trail, color, maxAlpha, lineWidth) {
  const n = trail.length;
  if (n < 2) return;
  const minWidth = 1;
  const maxWidth = lineWidth;
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

  ctx.fillStyle = sun.color;
  ctx.beginPath();
  ctx.arc(cx, cy, sun.radius, 0, Math.PI * 2);
  ctx.fill();

  if (!paused) {
    planet.orbitAngle += planet.orbitSpeed;
  }
  const planetOffset = ellipsePosition(planet.orbitAngle, planet.orbitRadius, planet.ellipticity, planet.orbitTilt);
  const px = cx + planetOffset.x;
  const py = cy + planetOffset.y;

  if (planet.trailEnabled) {
    planet.trail.push({ x: px, y: py });
    if (planet.trail.length > MAX_TRAIL_LENGTH) planet.trail.shift();
    if (planet.trail.length > 1) {
      drawTaperedTrail(ctx, planet.trail, planet.color, 0.6, planet.trailWidth);
    }
  } else {
    planet.trail = [];
  }

  ctx.fillStyle = planet.color;
  ctx.beginPath();
  ctx.arc(px, py, planet.radius, 0, Math.PI * 2);
  ctx.fill();

  if (!paused) {
    moon.orbitAngle += moon.orbitSpeed;
  }
  const moonOffset = ellipsePosition(moon.orbitAngle, moon.orbitRadius, moon.ellipticity, moon.orbitTilt);
  const mx = px + moonOffset.x;
  const my = py + moonOffset.y;

  if (moon.trailEnabled) {
    moon.trail.push({ x: mx, y: my });
    if (moon.trail.length > MAX_TRAIL_LENGTH) moon.trail.shift();
    if (moon.trail.length > 1) {
      drawTaperedTrail(ctx, moon.trail, moon.color, 0.6, moon.trailWidth);
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

document.getElementById('planet-speed-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  planet.orbitSpeed = 0.005 + (val - 5) / 45 * 0.045;
});

document.getElementById('moon-speed-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  moon.orbitSpeed = 0.01 + (val - 10) / 90 * 0.09;
});

document.getElementById('trails-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value);
  planet.trailEnabled = val > 0;
  moon.trailEnabled = val > 0;
  if (val === 0) {
    planet.trail = [];
    moon.trail = [];
  }
});

document.getElementById('tilt-slider').addEventListener('input', (e) => {
  const val = Number(e.target.value) * Math.PI / 180;
  planet.orbitTilt = val;
  moon.orbitTilt = val;
});

document.getElementById('planet-radius-slider').addEventListener('input', (e) => {
  planet.orbitRadius = Number(e.target.value);
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
