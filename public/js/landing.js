(() => {
  const canvas = document.getElementById('landing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  /** Thirteen rings = one chromatic octave of keys: k=12 inner = first B♭, k=0 outer = second B♭ (left→right low→high). */
  const SEMITONE_RATIO = 2 ** (1 / 12);
  const CHROMATIC_STEPS = 13;
  /** Twelve gaps between thirteen circles; inner disk (inside smallest ring) has no hover fill. */
  const BAND_COUNT = CHROMATIC_STEPS - 1;
  const CHROMATIC_SCALE = 0.85;
  /** Uniform scale: 1 = default; slider 25–300 → 0.25× … 3× (semitone ring ratios unchanged). */
  let ringSizeMultiplier = 1;

  /**
   * Perfect fifth above B♭ (7 semitones, pitch class 7): band b = (11 − p) mod 12 → band 4
   * (between circles 4 and 5). Gear circle diameter = that band’s width at its broadest point:
   * 2·(r[4] − r[5]), radius = r[4] − r[5]. It rolls along the inside of the innermost ring.
   */
  const FIFTH_BAND_INDEX = 4;
  /** Arc length along the gear’s center track per second (px/s in CSS pixels). */
  const GEAR_SPEED_PX_PER_SEC = 15;
  /** Multiply grandchild orbit angular speed vs the main gear path (same linear ds). */
  const GRANDCHILD_ORBIT_SPEED_MULT = 8;
  /** Keep rolling briefly after the last mousemove so motion stays smooth. */
  const GEAR_MOUSE_IDLE_MS = 120;
  /** Child gear at parent spoke tip: radius relative to parent gear radius. */
  const CHILD_GEAR_RADIUS_SCALE = 0.75;

  function gearSpokeLengthCss(rGear) {
    return 0.84375 * (2 * Math.PI * rGear);
  }

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

  /** @type {{ cx: number[], r: number[], cy: number } | null} */
  let chromaticGeom = null;
  let hoverBand = null;
  /** @type {number | null} */
  let chordLinkIndex = null;

  const innerK = CHROMATIC_STEPS - 1;
  /** Angle (rad) of gear center on its track around the parent center; + = clockwise on screen. */
  let gearTrackAngle = -Math.PI / 2;
  /** Gear rotation (rad) for rolling without slip: dφ = ds / r_gear. */
  let gearRollAngle = 0;
  /** Grandchild gear center on exterior orbit around child gear (world angle). */
  let orbitGrandchildAngle = -Math.PI / 2;
  let lastMouseMoveTime = 0;
  /** Wall clock for gear physics integrated inside render() (any redraw path). */
  let lastGearPhysicsTime = 0;
  let gearRafScheduled = false;
  let cachedCanvasCssW = 0;
  let cachedCanvasCssH = 0;

  function spectrumIndexForBand(bandIndex) {
    return BAND_COUNT - 1 - bandIndex;
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
    const rBbNominal =
      Math.sqrt((circleAreaFraction * viewportArea) / Math.PI) * CHROMATIC_SCALE;
    const rBb = rBbNominal * ringSizeMultiplier;
    const cxCanvas = cssW / 2;
    const cy = cssH / 2;
    /** Fixed screen point: center of innermost ring at multiplier 1 (same as old leftX = cx − rBb layout). */
    const anchorX = cxCanvas + rBbNominal * (SEMITONE_RATIO ** -12 - 1);
    const rArr = [];
    for (let k = 0; k < CHROMATIC_STEPS; k++) {
      rArr.push(rBb * SEMITONE_RATIO ** -k);
    }
    const inner = CHROMATIC_STEPS - 1;
    const leftX = anchorX - rArr[inner];
    const cxArr = [];
    for (let k = 0; k < CHROMATIC_STEPS; k++) {
      cxArr.push(leftX + rArr[k]);
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

  function drawGearParentLink(parentX, parentY, gearX, gearY) {
    ctx.beginPath();
    ctx.moveTo(parentX, parentY);
    ctx.lineTo(gearX, gearY);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * Parent gear → spoke → child (collinear with rollRad). Grandchild orbits **outside** the child:
   * center on a circle of radius r_child + r_grandchild around the child center.
   */
  function drawGearCircle(gx, gy, rGear, rollRad) {
    const s1 = gearSpokeLengthCss(rGear);
    const rC = rGear * CHILD_GEAR_RADIUS_SCALE;
    const rG = rC * CHILD_GEAR_RADIUS_SCALE;
    const trackGrandchild = rC + rG;

    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(rollRad);

    ctx.beginPath();
    ctx.arc(0, 0, rGear, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s1, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(s1, 0, rC, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    if (trackGrandchild <= 0) return;

    const childCx = gx + s1 * Math.cos(rollRad);
    const childCy = gy + s1 * Math.sin(rollRad);
    const gCx = childCx + trackGrandchild * Math.cos(orbitGrandchildAngle);
    const gCy = childCy + trackGrandchild * Math.sin(orbitGrandchildAngle);
    drawGearParentLink(childCx, childCy, gCx, gCy);
    strokeCircleOnly(gCx, gCy, rG);
  }

  function ensureCanvasBackingStore(cssW, cssH) {
    if (cachedCanvasCssW === cssW && cachedCanvasCssH === cssH) return;
    cachedCanvasCssW = cssW;
    cachedCanvasCssH = cssH;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
  }

  function bumpMouseForGear() {
    lastMouseMoveTime = performance.now();
    if (!gearRafScheduled) {
      gearRafScheduled = true;
      requestAnimationFrame(gearAnimationFrame);
    }
  }

  /** Advance track / roll / grandchild orbit from real time (runs every render while active). */
  function stepGearPhysics() {
    const t = performance.now();
    if (!chromaticGeom) return;

    const rArr = chromaticGeom.r;
    const rGear = rArr[FIFTH_BAND_INDEX] - rArr[FIFTH_BAND_INDEX + 1];
    const rParent = rArr[innerK];
    const trackR = rParent - rGear;
    const rC = rGear * CHILD_GEAR_RADIUS_SCALE;
    const rG = rC * CHILD_GEAR_RADIUS_SCALE;
    const trackGrandchild = rC + rG;

    if (!lastMouseMoveTime || t - lastMouseMoveTime >= GEAR_MOUSE_IDLE_MS) {
      lastGearPhysicsTime = t;
      return;
    }

    if (!lastGearPhysicsTime) {
      lastGearPhysicsTime = t;
      return;
    }

    const dt = Math.min(0.1, Math.max(0, (t - lastGearPhysicsTime) / 1000));
    lastGearPhysicsTime = t;
    if (dt <= 0) return;

    const ds = GEAR_SPEED_PX_PER_SEC * dt;
    if (trackR > 0 && rGear > 0) {
      gearTrackAngle += ds / trackR;
      gearRollAngle += ds / rGear;
    }
    if (rGear > 0 && trackGrandchild > 0) {
      orbitGrandchildAngle += (ds * GRANDCHILD_ORBIT_SPEED_MULT) / trackGrandchild;
    }
  }

  function gearAnimationFrame() {
    gearRafScheduled = false;
    render();
    if (performance.now() - lastMouseMoveTime < GEAR_MOUSE_IDLE_MS) {
      gearRafScheduled = true;
      requestAnimationFrame(gearAnimationFrame);
    }
  }

  function fillBandAnnulus(c0x, c0y, r0, c1x, c1y, r1, color) {
    ctx.beginPath();
    ctx.arc(c0x, c0y, r0, 0, Math.PI * 2);
    ctx.arc(c1x, c1y, r1, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill('evenodd');
  }

  function render() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    ensureCanvasBackingStore(cssW, cssH);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    chromaticGeom = computeChromaticGeometry(cssW, cssH);
    const { cx, r, cy } = chromaticGeom;
    stepGearPhysics();

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

    const rGear = r[FIFTH_BAND_INDEX] - r[FIFTH_BAND_INDEX + 1];
    const trackR = r[innerK] - rGear;
    if (trackR > 0 && rGear > 0) {
      const gx = cx[innerK] + trackR * Math.cos(gearTrackAngle);
      const gy = cy + trackR * Math.sin(gearTrackAngle);
      drawGearParentLink(cx[innerK], cy, gx, gy);
      drawGearCircle(gx, gy, rGear, gearRollAngle);
    } else {
      drawGearCircle(cx[innerK], cy, rGear, gearRollAngle);
    }
  }

  window.addEventListener('mousemove', () => {
    bumpMouseForGear();
  });

  canvas.addEventListener('mousemove', (e) => {
    bumpMouseForGear();
    const { x, y } = canvasCssCoordsFromEvent(e);
    canvas.style.cursor = 'default';
    if (chordLinkIndex !== null) return;
    const band = chromaticGeom ? hitTestBand(x, y, chromaticGeom) : null;
    if (band !== hoverBand) {
      hoverBand = band;
      render();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (hoverBand !== null) {
      hoverBand = null;
      render();
    }
  });

  window.addEventListener('resize', () => {
    cachedCanvasCssW = 0;
    cachedCanvasCssH = 0;
    render();
  });

  const ringSizeSlider = document.getElementById('landing-ring-size-slider');
  if (ringSizeSlider) {
    ringSizeSlider.addEventListener('input', () => {
      ringSizeMultiplier = Number(ringSizeSlider.value) / 100;
      render();
    });
  }

  const landingFloat = document.getElementById('landing-slider-float');
  const landingToggle = document.getElementById('landing-controls-toggle');
  if (landingFloat && landingToggle) {
    landingToggle.addEventListener('click', () => {
      landingFloat.classList.toggle('landing-slider-float--controls-hidden');
      const hidden = landingFloat.classList.contains('landing-slider-float--controls-hidden');
      landingToggle.setAttribute('aria-expanded', String(!hidden));
      landingToggle.setAttribute(
        'aria-label',
        hidden ? 'Show ring controls' : 'Hide ring controls'
      );
    });
  }

  document.querySelectorAll('.landing-link').forEach((a, i) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') e.preventDefault();
    });
    a.addEventListener('mouseenter', () => {
      const next = CHORD_LINK_PATTERNS[i] ? i : null;
      if (next !== chordLinkIndex) {
        chordLinkIndex = next;
        hoverBand = null;
        render();
      }
    });
    a.addEventListener('mouseleave', () => {
      if (chordLinkIndex === i) {
        chordLinkIndex = null;
        render();
      }
    });
  });

  render();
})();
