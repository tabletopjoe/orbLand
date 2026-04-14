(() => {
  const canvas = document.getElementById('landing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const panel = document.getElementById('landing-link-panel');

  /** Reference: lowest B♭ (~29.14 Hz). Twelve chromatic steps B♭→…→A (one octave of pitch classes). */
  const HZ_BB = 29.14;
  const SEMITONE_RATIO = 2 ** (1 / 12);
  const CHROMATIC_STEPS = 12;
  const CHROMATIC_SCALE = 0.85;
  const CORNER_R = 19;
  const F_STEP = 7;
  const cornerInnerR = CORNER_R * 2 ** (-F_STEP / 12);

  /** Bands 0–10 = gaps between the 12 circles (blue→violet; skewed away from green). Innermost disk has no hover fill. */
  const HOVER_SPECTRUM = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    const h = Math.round(215 + t * (308 - 215));
    return `hsl(${h}, 48%, 46%)`;
  });

  const MOBILE_MQ = window.matchMedia('(max-width: 640px)');
  let linksOpen = false;

  /** @type {{ cx: number[], r: number[], cy: number } | null} */
  let chromaticGeom = null;
  let hoverBand = null;

  function isMobile() {
    return MOBILE_MQ.matches;
  }

  function updatePanelVisibility() {
    if (!panel) return;
    const show = isMobile() || linksOpen;
    panel.classList.toggle('is-visible', show);
  }

  function getCornerInnerCenter() {
    const cornerCx = CORNER_R * 2;
    const cornerCy = CORNER_R * 2;
    const cornerRightX = cornerCx + CORNER_R;
    const cornerInnerCx = cornerRightX - cornerInnerR;
    return { cornerInnerCx, cornerInnerCy: cornerCy };
  }

  function isPointInMoonToggle(cssX, cssY) {
    const { cornerInnerCx, cornerInnerCy } = getCornerInnerCenter();
    const dx = cssX - cornerInnerCx;
    const dy = cssY - cornerInnerCy;
    return dx * dx + dy * dy <= cornerInnerR * cornerInnerR;
  }

  function canvasCssCoordsFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function computeChromaticGeometry(cssW, cssH) {
    const viewportArea = cssW * cssH;
    const circleAreaFraction = 0.5 * (1 - 0.15);
    const rBb = Math.sqrt((circleAreaFraction * viewportArea) / Math.PI) * CHROMATIC_SCALE;
    const cx = cssW / 2;
    const cy = cssH / 2;
    const leftX = cx - rBb;
    const cxArr = [];
    const rArr = [];
    for (let k = 0; k < CHROMATIC_STEPS; k++) {
      const hz = HZ_BB * SEMITONE_RATIO ** k;
      const r = rBb * (HZ_BB / hz);
      rArr.push(r);
      cxArr.push(leftX + r);
    }
    return { cx: cxArr, r: rArr, cy };
  }

  function hitTestBand(px, py, g) {
    if (!g) return null;
    const { cx, r, cy } = g;
    const dist = (i) => {
      const dx = px - cx[i];
      const dy = py - cy;
      return Math.hypot(dx, dy);
    };

    if (dist(11) <= r[11]) return null;

    for (let k = 0; k < 11; k++) {
      if (dist(k) <= r[k] && dist(k + 1) > r[k + 1]) return k;
    }
    return null;
  }

  function fillCircleOnly(ax, ay, r) {
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
  }

  function strokeCircleOnly(ax, ay, r) {
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function fillBandAnnulus(c0x, c0y, r0, c1x, c1y, r1, color) {
    ctx.beginPath();
    ctx.arc(c0x, c0y, r0, 0, Math.PI * 2);
    ctx.arc(c1x, c1y, r1, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill('evenodd');
  }

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    chromaticGeom = computeChromaticGeometry(cssW, cssH);
    const { cx, r, cy } = chromaticGeom;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cssW, cssH);

    for (let k = 0; k < CHROMATIC_STEPS; k++) {
      fillCircleOnly(cx[k], cy, r[k]);
    }

    if (hoverBand !== null && hoverBand >= 0 && hoverBand < 11) {
      const c = HOVER_SPECTRUM[hoverBand];
      fillBandAnnulus(cx[hoverBand], cy, r[hoverBand], cx[hoverBand + 1], cy, r[hoverBand + 1], c);
    }

    for (let k = 0; k < CHROMATIC_STEPS; k++) {
      strokeCircleOnly(cx[k], cy, r[k]);
    }

    const cornerCx = CORNER_R * 2;
    const cornerCy = CORNER_R * 2;
    const cornerRightX = cornerCx + CORNER_R;
    const cornerInnerCx = cornerRightX - cornerInnerR;

    ctx.beginPath();
    ctx.arc(cornerCx, cornerCy, CORNER_R, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cornerInnerCx, cornerCy, cornerInnerR, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  canvas.addEventListener('click', (e) => {
    const { x, y } = canvasCssCoordsFromEvent(e);
    if (!isPointInMoonToggle(x, y)) return;
    e.preventDefault();
    linksOpen = !linksOpen;
    updatePanelVisibility();
  });

  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = canvasCssCoordsFromEvent(e);
    if (isPointInMoonToggle(x, y)) {
      canvas.style.cursor = 'pointer';
      if (hoverBand !== null) {
        hoverBand = null;
        draw();
      }
      return;
    }
    canvas.style.cursor = 'default';
    const band = chromaticGeom ? hitTestBand(x, y, chromaticGeom) : null;
    if (band !== hoverBand) {
      hoverBand = band;
      draw();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (hoverBand !== null) {
      hoverBand = null;
      draw();
    }
  });

  MOBILE_MQ.addEventListener('change', updatePanelVisibility);

  window.addEventListener('resize', () => {
    draw();
    updatePanelVisibility();
  });

  document.querySelectorAll('.landing-link').forEach((a) => {
    a.addEventListener('click', (e) => e.preventDefault());
  });

  draw();
  updatePanelVisibility();
})();
