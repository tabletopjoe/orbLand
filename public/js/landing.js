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
  /** Uniform scale for all 12 rings (1 = full size). */
  const CHROMATIC_SCALE = 0.85;
  const CORNER_R = 19;
  const F_STEP = 7;
  const cornerInnerR = CORNER_R * 2 ** (-F_STEP / 12);

  const MOBILE_MQ = window.matchMedia('(max-width: 640px)');
  let linksOpen = false;

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

  function strokeCircle(ax, ay, r) {
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const viewportArea = cssW * cssH;
    const circleAreaFraction = 0.5 * (1 - 0.15);
    const rBb = Math.sqrt((circleAreaFraction * viewportArea) / Math.PI) * CHROMATIC_SCALE;
    const cx = cssW / 2;
    const cy = cssH / 2;

    const leftX = cx - rBb;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cssW, cssH);

    for (let k = 0; k < CHROMATIC_STEPS; k++) {
      const hz = HZ_BB * SEMITONE_RATIO ** k;
      const r = rBb * (HZ_BB / hz);
      const ax = leftX + r;
      strokeCircle(ax, cy, r);
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
    canvas.style.cursor = isPointInMoonToggle(x, y) ? 'pointer' : 'default';
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
