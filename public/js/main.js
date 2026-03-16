const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const ICON_STRIP_WIDTH = 35;
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

function getCanvasDimensions() {
  return {
    width: Math.floor(window.innerWidth - ICON_STRIP_WIDTH),
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

  planet.orbitAngle += planet.orbitSpeed;
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

  moon.orbitAngle += moon.orbitSpeed;
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

let activePopover = null;

function closePopover() {
  if (activePopover) {
    activePopover.remove();
    activePopover = null;
  }
  document.removeEventListener('click', handleOutsideClick);
}

function handleOutsideClick(e) {
  const strip = document.querySelector('.icon-strip');
  const popover = document.querySelector('.popover');
  if (popover && !popover.contains(e.target) && strip && !strip.contains(e.target)) {
    closePopover();
  }
}

function createPopover(content, anchorBtn) {
  closePopover();
  const popover = document.createElement('div');
  popover.className = 'popover';
  popover.innerHTML = content;
  popover.addEventListener('click', (ev) => ev.stopPropagation());
  document.body.appendChild(popover);

  if (anchorBtn) {
    const rect = anchorBtn.getBoundingClientRect();
    popover.style.position = 'fixed';
    popover.style.top = `${rect.top}px`;
    popover.style.right = `${window.innerWidth - rect.left + 8}px`;
  }

  activePopover = popover;
  setTimeout(() => document.addEventListener('click', handleOutsideClick), 0);
}

document.getElementById('planet-speed-icon').addEventListener('click', (e) => {
  e.stopPropagation();
  const min = 0.005, max = 0.05;
  const pct = (planet.orbitSpeed - min) / (max - min);
  createPopover(`
    <div class="popover-slider">
      <label>Planet speed</label>
      <input type="range" min="5" max="50" value="${Math.round(pct * 45 + 5)}" id="planet-speed-slider">
    </div>
  `, e.currentTarget);
  const slider = document.getElementById('planet-speed-slider');
  slider.addEventListener('input', (ev) => {
    const val = Number(ev.target.value);
    planet.orbitSpeed = min + (val - 5) / 45 * (max - min);
  });
});

document.getElementById('moon-speed-icon').addEventListener('click', (e) => {
  e.stopPropagation();
  const min = 0.01, max = 0.1;
  const pct = (moon.orbitSpeed - min) / (max - min);
  createPopover(`
    <div class="popover-slider">
      <label>Moon speed</label>
      <input type="range" min="10" max="100" value="${Math.round(pct * 90 + 10)}" id="moon-speed-slider">
    </div>
  `, e.currentTarget);
  const slider = document.getElementById('moon-speed-slider');
  slider.addEventListener('input', (ev) => {
    const val = Number(ev.target.value);
    moon.orbitSpeed = min + (val - 10) / 90 * (max - min);
  });
});

document.getElementById('trails-icon').addEventListener('click', (e) => {
  e.stopPropagation();
  const enabled = planet.trailEnabled && moon.trailEnabled;
  createPopover(`
    <div class="popover-toggle">
      <label for="trails-check">Orbit trails</label>
      <input type="checkbox" id="trails-check" ${enabled ? 'checked' : ''}>
    </div>
  `, e.currentTarget);
  const check = document.getElementById('trails-check');
  check.addEventListener('change', () => {
    planet.trailEnabled = check.checked;
    moon.trailEnabled = check.checked;
    if (!check.checked) {
      planet.trail = [];
      moon.trail = [];
    }
  });
});

document.getElementById('tilt-icon').addEventListener('click', (e) => {
  e.stopPropagation();
  const deg = Math.round((planet.orbitTilt * 180 / Math.PI + 360) % 360);
  createPopover(`
    <div class="popover-slider">
      <label>Orbit tilt (degrees)</label>
      <input type="range" min="0" max="360" value="${deg}" id="tilt-slider">
    </div>
  `, e.currentTarget);
  const slider = document.getElementById('tilt-slider');
  slider.addEventListener('input', (ev) => {
    const val = Number(ev.target.value) * Math.PI / 180;
    planet.orbitTilt = val;
    moon.orbitTilt = val;
  });
});

document.getElementById('radius-icon').addEventListener('click', (e) => {
  e.stopPropagation();
  createPopover(`
    <div class="radius-popover">
      <div class="popover-row">
        <label>Planet orbit</label>
        <input type="range" min="60" max="300" value="${planet.orbitRadius}" id="planet-radius-slider">
      </div>
      <div class="popover-row">
        <label>Moon orbit</label>
        <input type="range" min="20" max="80" value="${moon.orbitRadius}" id="moon-radius-slider">
      </div>
    </div>
  `, e.currentTarget);
  document.getElementById('planet-radius-slider').addEventListener('input', (ev) => {
    planet.orbitRadius = Number(ev.target.value);
  });
  document.getElementById('moon-radius-slider').addEventListener('input', (ev) => {
    moon.orbitRadius = Number(ev.target.value);
  });
});

draw();
