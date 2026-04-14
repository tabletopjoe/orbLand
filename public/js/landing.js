(() => {
  const canvas = document.getElementById('landing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const panel = document.getElementById('landing-link-panel');

  /** Reference: lowest B♭ (~29.14 Hz). Thirteen rings = one chromatic octave of keys: k=12 inner = first B♭, k=0 outer = second B♭ (left→right low→high). */
  const HZ_BB = 29.14;
  const SEMITONE_RATIO = 2 ** (1 / 12);
  const CHROMATIC_STEPS = 13;
  /** Twelve gaps between thirteen circles; inner disk (inside smallest ring) has no hover fill. */
  const BAND_COUNT = CHROMATIC_STEPS - 1;
  const CHROMATIC_SCALE = 0.85;
  const CORNER_R = 19;
  const F_STEP = 7;
  const cornerInnerR = CORNER_R * 2 ** (-F_STEP / CHROMATIC_STEPS);

  /**
   * Twelve ring gaps: band 0 = outer (high B♭ side) … band 11 = inner (toward low B♭).
   * Spectrum index 0 = innermost gap (low end of the octave), 11 = outermost gap (high end).
   */
  const HOVER_SPECTRUM = Array.from({ length: BAND_COUNT }, (_, i) => {
    const t = i / (BAND_COUNT - 1);
    const h = Math.round(215 + t * (308 - 215));
    return `hsl(${h}, 48%, 46%)`;
  });

  /**
   * Ring k (0 = outer largest … 12 = inner smallest): pitch rises outward; inner k=12 = first B♭, outer k=0 = octave B♭.
   * Band b lies between circle b (outer side) and b+1: inner pitch class p (0=B♭…11=A) at circle b+1 satisfies p ≡ (11 − b) mod 12, so tone p → band b = (11 − p) mod 12 (here p∈{0…11} ⇒ b = 11 − p).
   * Lower tonic B♭ (fundamental) = band 11; higher tonic (octave) = band 0. Minor/aug “higher tonic” swap root band 11 → 0.
   * Dom7 / maj7 fourth tone: p=10 → band 1; p=11 → band 0 (same outer region, different colors).
   * Link 7: B♭ minor blues — pitch classes 0,3,5,6,7,10 (root, ♭3, 4, ♭5, 5, ♭7).
   */
  const CHORD_LINK_PATTERNS = [
    { bands: [11, 7, 4], colorIndices: [0, 4, 7] },
    { bands: [0, 8, 4], colorIndices: [0, 3, 7] },
    { bands: [11, 8, 5], colorIndices: [0, 3, 6] },
    { bands: [0, 7, 3], colorIndices: [0, 4, 8] },
    { bands: [11, 7, 4, 1], colorIndices: [0, 4, 7, 9] },
    { bands: [11, 7, 4, 0], colorIndices: [0, 4, 7, 10] },
    { bands: [11, 8, 6, 5, 4, 1], colorIndices: [0, 2, 4, 5, 7, 9] }
  ];

  const MOBILE_MQ = window.matchMedia('(max-width: 640px)');
  let linksOpen = false;

  /** @type {{ cx: number[], r: number[], cy: number } | null} */
  let chromaticGeom = null;
  let hoverBand = null;
  /** @type {number | null} */
  let chordLinkIndex = null;

  function spectrumIndexForBand(bandIndex) {
    return BAND_COUNT - 1 - bandIndex;
  }

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
    const last = CHROMATIC_STEPS - 1;
    for (let k = 0; k < CHROMATIC_STEPS; k++) {
      const hz = HZ_BB * SEMITONE_RATIO ** (last - k);
      const r = rBb * SEMITONE_RATIO ** -k;
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

    const inner = CHROMATIC_STEPS - 1;
    if (dist(inner) <= r[inner]) return null;

    for (let k = 0; k < BAND_COUNT; k++) {
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

    if (chordLinkIndex !== null && CHORD_LINK_PATTERNS[chordLinkIndex]) {
      const pat = CHORD_LINK_PATTERNS[chordLinkIndex];
      for (let j = 0; j < pat.bands.length; j++) {
        const b = pat.bands[j];
        const ci = pat.colorIndices[j];
        const c = HOVER_SPECTRUM[ci];
        fillBandAnnulus(cx[b], cy, r[b], cx[b + 1], cy, r[b + 1], c);
      }
    } else if (hoverBand !== null && hoverBand >= 0 && hoverBand < BAND_COUNT) {
      const c = HOVER_SPECTRUM[spectrumIndexForBand(hoverBand)];
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
    if (chordLinkIndex !== null) return;
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

  document.querySelectorAll('.landing-link').forEach((a, i) => {
    a.addEventListener('click', (e) => e.preventDefault());
    a.addEventListener('mouseenter', () => {
      const next = CHORD_LINK_PATTERNS[i] ? i : null;
      if (next !== chordLinkIndex) {
        chordLinkIndex = next;
        hoverBand = null;
        draw();
      }
    });
    a.addEventListener('mouseleave', () => {
      if (chordLinkIndex === i) {
        chordLinkIndex = null;
        draw();
      }
    });
  });

  draw();
  updatePanelVisibility();
})();
