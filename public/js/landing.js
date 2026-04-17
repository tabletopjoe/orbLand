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
  /** CONSULTING link: 208% rings, semi-transparent gears, copy inside the tonic disk. */
  const CONSULTING_RING_SLIDER_PCT = 208;
  /** Shift tonic label block inward from the disk’s left edge (CSS px). */
  const TONIC_LABEL_LEFT_INSET_PX = 88;
  let landingConsultingActive = false;

  const CONTACT_EMAIL = 'consult@dianilo.onmicrosoft.com';
  const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;
  const CONTACT_LABEL = 'CONTACT';
  /** Envelope + CONTACT row hit area in CSS px (set while drawing consulting copy). */
  let contactMailHitRect = null;
  /** Envelope icon only (tooltips). */
  let contactEnvelopeHitRect = null;
  /** Clipboard icon hit area for copy-to-clipboard. */
  let contactCopyHitRect = null;

  async function copyContactEmailToClipboard() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = CONTACT_EMAIL;
      ta.setAttribute('aria-hidden', 'true');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
  }

  /** Use \\n for line breaks; \\n\\n adds a short blank gap. Or use a template literal (backticks) with real newlines. (CONTACT row is drawn separately with mail link.) */
  const CONSULTING_TONIC_COPY =
    'MICROSOFT 365\n  POWER PLATFORM\n SHAREPOINT\n TEAMS\n\n CUSTOM WEB SOLUTIONS';

  /**
   * Perfect fifth above B♭ (7 semitones, pitch class 7): band b = (11 − p) mod 12 → band 4
   * (between circles 4 and 5). Gear circle diameter = that band’s width at its broadest point:
   * 2·(r[4] − r[5]), radius = r[4] − r[5]. It rolls along the inside of the innermost ring.
   */
  const FIFTH_BAND_INDEX = 4;
  /**
   * Circle k = FIFTH_BAND_INDEX + 1 is the inner arc of the perfect-fifth band (band 4). Counting bands
   * from the tonic inward, band 4 is the 8th band. The small gear rolls **outside** this circle.
   */
  const FIFTH_ORBIT_HOST_CIRCLE_K = FIFTH_BAND_INDEX + 1;
  /**
   * Strum left→right is band 11 … band 0 ({@link STRUM_BAND_ORDER_LTR}). The **12th** band = index 0,
   * the outermost gap (between circles 0 and 1). Same pattern as the fifth mini: roll **outside** the
   * inner circle of that band — here k=1 (not k=11/12; those are inner gaps).
   */
  const TWELFTH_BAND_ORBIT_HOST_K = 1;
  /** Signed minutes per orbit (+ forward, − reverse, 0 stop); #landing-gear-main-speed (default 3). */
  let gearMainOrbitPeriodMinutes = 3;
  /** Signed minutes per orbit; #landing-gear-fifth-speed (default 3). */
  let gearFifthOrbitPeriodMinutes = 3;
  /** Signed minutes per orbit; #landing-gear-fifth-child-speed (default 1). */
  let gearFifthChildOrbitPeriodMinutes = 1;
  /** Signed minutes per orbit; #landing-gear-twelfth-speed (default 3). */
  let gearTwelfthOrbitPeriodMinutes = 3;
  /** Extra arc length along the track from mouse activity (px/s); added while pointer recently moved. */
  const GEAR_SPEED_PX_PER_SEC = 15;
  /** Multiply grandchild orbit angular speed vs the main gear path (same linear ds). */
  const GRANDCHILD_ORBIT_SPEED_MULT = 8;
  /** Window after mousemove during which {@link GEAR_SPEED_PX_PER_SEC} is applied on top of base orbit. */
  const GEAR_MOUSE_IDLE_MS = 120;
  /** Child gear at parent spoke tip: radius relative to parent gear radius. */
  const CHILD_GEAR_RADIUS_SCALE = 0.75;

  function gearSpokeLengthCss(rGear) {
    return 0.84375 * (2 * Math.PI * rGear);
  }

  /** Signed minutes per revolution → rad/s. Negative reverses; 0 freezes that motion. */
  function signedRadPerSecFromPeriodMinutes(periodMinutes) {
    if (periodMinutes === 0 || !Number.isFinite(periodMinutes)) return 0;
    const absMin = Math.abs(periodMinutes);
    return (Math.sign(periodMinutes) * (2 * Math.PI)) / (absMin * 60);
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
  /** Band lit by strum animation (null = idle). Same colors as hover via {@link spectrumIndexForBand}. */
  let strumHighlightBand = null;
  let strumAnimToken = 0;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let strumTimerId = null;

  /**
   * Circle centers increase in x from inner (k=12) to outer (k=0); bands sit between k and k+1.
   * Left→right strum: band 11 (inner gap) … band 0 (outer gap).
   */
  const STRUM_BAND_ORDER_LTR = Array.from({ length: BAND_COUNT }, (_, i) => BAND_COUNT - 1 - i);

  const innerK = CHROMATIC_STEPS - 1;
  /** Angle (rad) of gear center on its track around the parent center; 0 = 3 o'clock, π/2 = 6 o'clock. Default ≈ 4:30 (bottom-right). */
  let gearTrackAngle = Math.PI / 4;
  /** Gear rotation (rad) for rolling without slip: dφ = ds / r_gear. */
  let gearRollAngle = 0;
  /** Grandchild gear center on exterior orbit around child gear (world angle). */
  let orbitGrandchildAngle = -Math.PI / 2;
  /** Small gear: orbit angle around the fifth-band host circle (world angle). */
  let fifthOrbitGearAngle = -Math.PI / 2;
  /** Rolling angle for the small fifth-orbit gear (rad). */
  let fifthOrbitGearRoll = 0;
  /** Child of fifth mini: orbit angle around the parent center (world). */
  let fifthChildOrbitAngle = -Math.PI / 2;
  /** Rolling angle for no-slip motion on the outside of the fifth mini (rad). */
  let fifthChildRollAngle = 0;
  /** Orbit angle around circle {@link TWELFTH_BAND_ORBIT_HOST_K} (world). */
  let twelfthOrbitGearAngle = -Math.PI / 2;
  /** Roll for 12th-ring exterior gear (rad). */
  let twelfthOrbitGearRoll = 0;
  let lastMouseMoveTime = 0;
  /** Wall clock for gear physics integrated inside render() (any redraw path). */
  let lastGearPhysicsTime = 0;
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

  /** True if (px,py) lies inside any chromatic ring disk (the drawn circle design). */
  function pointInChromaticDesign(px, py, g) {
    if (!g) return false;
    const { cx, r, cy } = g;
    for (let k = 0; k < CHROMATIC_STEPS; k++) {
      const dx = px - cx[k];
      const dy = py - cy;
      if (dx * dx + dy * dy <= r[k] * r[k]) return true;
    }
    return false;
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
   * Word-wrap for canvas. Respects newline characters in `text` (each \\n starts a new row;
   * use \\n\\n for an extra gap). Each line segment is wrapped to maxWidth.
   */
  function wrapCanvasTextLines(text, maxWidth) {
    const paragraphs = text.split('\n');
    const lines = [];
    for (const raw of paragraphs) {
      if (raw.trim() === '') {
        lines.push('');
        continue;
      }
      const words = raw.trim().split(/\s+/).filter(Boolean);
      let line = '';
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  function consultingWrappedBlockHeight(lines, lineHeight) {
    let h = 0;
    for (const ln of lines) {
      h += ln === '' ? lineHeight * 0.55 : lineHeight;
    }
    return h;
  }

  function pointInRect(px, py, rect) {
    return (
      rect &&
      px >= rect.x &&
      px <= rect.x + rect.w &&
      py >= rect.y &&
      py <= rect.y + rect.h
    );
  }

  function showContactTooltip(text, clientX, clientY) {
    const el = document.getElementById('landing-contact-tooltip');
    if (!el) return;
    el.textContent = text;
    el.removeAttribute('hidden');
    const pad = 12;
    el.style.left = `${clientX + pad}px`;
    el.style.top = `${clientY + pad}px`;
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      let left = clientX + pad;
      let top = clientY + pad;
      const margin = 8;
      if (left + r.width > window.innerWidth - margin) {
        left = window.innerWidth - r.width - margin;
      }
      if (top + r.height > window.innerHeight - margin) {
        top = clientY - r.height - pad;
      }
      if (left < margin) left = margin;
      if (top < margin) top = margin;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    });
  }

  function hideContactTooltip() {
    const el = document.getElementById('landing-contact-tooltip');
    if (!el) return;
    el.setAttribute('hidden', '');
    el.textContent = '';
  }

  /** Stroked page outline with top-right dog-ear (monochrome). */
  function strokeDogEarPage(x, y, w, h, fold) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w - fold, y);
    ctx.lineTo(x + w, y + fold);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.stroke();
  }

  /** Outer height of stroked copy icon for scale `s` (two offset sheets): h + shift * 1.25. */
  const COPY_ICON_OUTER_H_FACTOR = 1.08 + 0.14 * 1.25;

  function copyIconStrokeWidthForOuterHeight(targetOuterHeight) {
    const s = Math.max(4, targetOuterHeight) / COPY_ICON_OUTER_H_FACTOR;
    return Math.max(1, s * (0.02 / 0.42));
  }

  /** Simple mail envelope outline (V flap); stroke matches copy icon weight when lineWidth matches. */
  function drawEnvelopeStroked(leftX, yMid, w, h, lineWidth) {
    const topY = yMid - h / 2;
    const flapDepth = Math.max(2, h * 0.38);
    const mx = leftX + w / 2;
    const fy = topY + flapDepth;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Body: full rectangle (include top horizontal; old path skipped TR→TL).
    ctx.moveTo(leftX, topY + h);
    ctx.lineTo(leftX + w, topY + h);
    ctx.lineTo(leftX + w, topY);
    ctx.lineTo(leftX, topY);
    ctx.lineTo(leftX, topY + h);
    // Flap: V from top corners to apex (separate subpath so top edge stays closed).
    ctx.moveTo(leftX, topY);
    ctx.lineTo(mx, fy);
    ctx.lineTo(leftX + w, topY);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Two overlapping outlined pages (copy metaphor). Returns bounding box in CSS px.
   * @param {number} leftX left edge of icon
   * @param {number} yMid vertical center (aligns with CONTACT row)
   * @param {number} targetOuterHeight total icon bbox height (slightly above CONTACT word height)
   */
  function drawCopyIconStroked(leftX, yMid, targetOuterHeight) {
    const s = Math.max(4, targetOuterHeight) / COPY_ICON_OUTER_H_FACTOR;
    const w = s * 0.9;
    const h = s * 1.08;
    const fold = Math.max(2.2, s * 0.17);
    const shift = s * 0.14;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = copyIconStrokeWidthForOuterHeight(targetOuterHeight);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const bx = leftX;
    const by = yMid - h / 2 - shift * 0.9;
    const fx = leftX + shift;
    const fy = yMid - h / 2 + shift * 0.35;

    strokeDogEarPage(bx, by, w, h, fold);
    strokeDogEarPage(fx, fy, w, h, fold);
    ctx.restore();

    const left = Math.min(bx, fx);
    const top = Math.min(by, fy);
    const right = Math.max(bx + w, fx + w);
    const bottom = Math.max(by + h, fy + h);
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  /** Fills wrapped consulting copy inside the innermost (tonic) circle. */
  function drawConsultingTonicText(centerX, centerY, rInner) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(1, rInner - 3), 0, Math.PI * 2);
    ctx.clip();

    const pad = Math.max(10, rInner * 0.14);
    const maxW = Math.max(40, (rInner - pad) * 2);
    const fontSizeBase = Math.max(9, Math.min(13, rInner / 4.5));
    const fontSize = fontSizeBase * 3;
    ctx.font = `400 ${fontSize}px Poppins, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const lines = wrapCanvasTextLines(CONSULTING_TONIC_COPY, maxW);
    const lineHeight = fontSize * 1.38;
    const contactRowH = lineHeight;
    const totalH = consultingWrappedBlockHeight(lines, lineHeight) + contactRowH;
    const textLeftX = centerX - rInner + pad + TONIC_LABEL_LEFT_INSET_PX;
    let y = centerY - totalH / 2 + lineHeight / 2;
    for (const ln of lines) {
      if (ln === '') {
        y += lineHeight * 0.55;
        continue;
      }
      ctx.fillText(ln, textLeftX, y);
      y += lineHeight;
    }

    const iconGap = fontSize * 0.28;
    const tmContact = ctx.measureText(CONTACT_LABEL);
    const labelW = tmContact.width;
    const contactTextH =
      (tmContact.actualBoundingBoxAscent != null ? tmContact.actualBoundingBoxAscent : fontSize * 0.72) +
      (tmContact.actualBoundingBoxDescent != null ? tmContact.actualBoundingBoxDescent : fontSize * 0.18);
    const copyIconOuterH = contactTextH + 4;
    const envW = ctx.measureText('\u2709').width;
    const envStroke = copyIconStrokeWidthForOuterHeight(copyIconOuterH);
    drawEnvelopeStroked(textLeftX, y, envW, contactTextH, envStroke);
    const contactTextX = textLeftX + envW + iconGap;
    ctx.fillText(CONTACT_LABEL, contactTextX, y);
    const afterLabelGap = Math.max(fontSize * 0.35, 16);
    const copyIconX = contactTextX + labelW + afterLabelGap;
    const copyBounds = drawCopyIconStroked(copyIconX, y, copyIconOuterH);

    const hitPad = 6;
    const envTop = y - contactTextH / 2;
    contactEnvelopeHitRect = {
      x: textLeftX - hitPad,
      y: envTop - hitPad,
      w: envW + hitPad * 2,
      h: contactTextH + hitPad * 2
    };
    contactMailHitRect = {
      x: textLeftX - hitPad,
      y: y - lineHeight / 2,
      w: contactTextX + labelW - textLeftX + hitPad * 2,
      h: lineHeight
    };
    contactCopyHitRect = {
      x: copyBounds.x - hitPad,
      y: copyBounds.y - hitPad,
      w: copyBounds.w + hitPad * 2,
      h: copyBounds.h + hitPad * 2
    };

    ctx.restore();
  }

  /** Stroked gear circle only (no spoke) — fifth-orbit mini gear. */
  function drawSimpleGearCircle(gx, gy, rGear, rollRad) {
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(rollRad);
    ctx.beginPath();
    ctx.arc(0, 0, rGear, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
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
  }

  /** Advance track / roll / grandchild orbit from real time (runs each render via continuous RAF). */
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

    if (!lastGearPhysicsTime) {
      lastGearPhysicsTime = t;
      return;
    }

    const dt = Math.min(0.1, Math.max(0, (t - lastGearPhysicsTime) / 1000));
    lastGearPhysicsTime = t;
    if (dt <= 0) return;

    const gearTrackRadPerSec = signedRadPerSecFromPeriodMinutes(gearMainOrbitPeriodMinutes);
    let ds = trackR * gearTrackRadPerSec * dt;
    if (lastMouseMoveTime > 0 && t - lastMouseMoveTime < GEAR_MOUSE_IDLE_MS) {
      ds += GEAR_SPEED_PX_PER_SEC * dt;
    }

    if (trackR > 0 && rGear > 0) {
      gearTrackAngle += ds / trackR;
      gearRollAngle += ds / rGear;
    }
    if (rGear > 0 && trackGrandchild > 0) {
      orbitGrandchildAngle += (ds * GRANDCHILD_ORBIT_SPEED_MULT) / trackGrandchild;
    }

    const kHost = FIFTH_ORBIT_HOST_CIRCLE_K;
    const rHost = rArr[kHost];
    const rTonic = rArr[innerK];
    const rFifthMini = rTonic / 3;
    const orbitFifthR = rHost + rFifthMini;
    if (orbitFifthR > 0 && rFifthMini > 0) {
      const fifthRadPerSec = signedRadPerSecFromPeriodMinutes(gearFifthOrbitPeriodMinutes);
      const dsFifth = orbitFifthR * fifthRadPerSec * dt;
      fifthOrbitGearAngle += dsFifth / orbitFifthR;
      fifthOrbitGearRoll += dsFifth / rFifthMini;

      const rFifthChild = rGear;
      const orbitAroundParentR = rFifthMini + rFifthChild;
      if (orbitAroundParentR > 0 && rFifthChild > 0) {
        const ωChild = signedRadPerSecFromPeriodMinutes(gearFifthChildOrbitPeriodMinutes);
        fifthChildOrbitAngle += ωChild * dt;
        fifthChildRollAngle += (orbitAroundParentR / rFifthChild) * ωChild * dt;
      }
    }

    const kTw = TWELFTH_BAND_ORBIT_HOST_K;
    const rTw = rArr[kTw];
    const orbitTwelfthR = rTw + rGear;
    if (orbitTwelfthR > 0 && rGear > 0) {
      const ωTw = signedRadPerSecFromPeriodMinutes(gearTwelfthOrbitPeriodMinutes);
      twelfthOrbitGearAngle += ωTw * dt;
      twelfthOrbitGearRoll += (orbitTwelfthR / rGear) * ωTw * dt;
    }
  }

  function landingGearAnimationLoop() {
    render();
    requestAnimationFrame(landingGearAnimationLoop);
  }

  function fillBandAnnulus(c0x, c0y, r0, c1x, c1y, r1, color) {
    ctx.beginPath();
    ctx.arc(c0x, c0y, r0, 0, Math.PI * 2);
    ctx.arc(c1x, c1y, r1, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill('evenodd');
  }

  function cancelChromaticStrum() {
    strumAnimToken++;
    if (strumTimerId !== null) {
      clearTimeout(strumTimerId);
      strumTimerId = null;
    }
    strumHighlightBand = null;
    render();
  }

  /**
   * “Strum” the chromatic rings: each band flashes its spectrum color in sequence (left→right by default).
   * @param {object} [options]
   * @param {number} [options.msPerBand] Delay between bands (default ~52).
   * @param {boolean} [options.reverse] If true, strum outer→inner (right→left).
   * @param {() => void} [options.onComplete] Called after the last band clears.
   */
  function chromaticStrum(options = {}) {
    const msPerBand = options.msPerBand ?? 52;
    const reverse = options.reverse === true;
    const onComplete = typeof options.onComplete === 'function' ? options.onComplete : null;
    const order = reverse ? Array.from({ length: BAND_COUNT }, (_, i) => i) : STRUM_BAND_ORDER_LTR;

    strumAnimToken++;
    const token = strumAnimToken;
    if (strumTimerId !== null) {
      clearTimeout(strumTimerId);
      strumTimerId = null;
    }

    let i = 0;
    function step() {
      if (token !== strumAnimToken) return;
      strumHighlightBand = order[i];
      render();
      if (i < BAND_COUNT - 1) {
        i++;
        strumTimerId = setTimeout(step, msPerBand);
      } else {
        strumTimerId = setTimeout(() => {
          if (token !== strumAnimToken) return;
          strumHighlightBand = null;
          strumTimerId = null;
          render();
          if (onComplete) {
            try {
              onComplete();
            } catch {
              /* ignore */
            }
          }
        }, msPerBand);
      }
    }
    step();
  }

  function render() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    ensureCanvasBackingStore(cssW, cssH);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    chromaticGeom = computeChromaticGeometry(cssW, cssH);
    const { cx, r, cy } = chromaticGeom;
    contactMailHitRect = null;
    contactEnvelopeHitRect = null;
    contactCopyHitRect = null;
    stepGearPhysics();

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cssW, cssH);

    for (let k = 0; k < CHROMATIC_STEPS; k++) {
      fillCircleOnly(cx[k], cy, r[k]);
    }

    /* Strum must paint above nav-link chord hover so clicks (e.g. CONSULTING) show strum while pointer stays on the link. */
    if (
      strumHighlightBand !== null &&
      strumHighlightBand >= 0 &&
      strumHighlightBand < BAND_COUNT
    ) {
      const b = strumHighlightBand;
      const c = HOVER_SPECTRUM[spectrumIndexForBand(b)];
      fillBandAnnulus(cx[b], cy, r[b], cx[b + 1], cy, r[b + 1], c);
    } else if (chordLinkIndex !== null && CHORD_LINK_PATTERNS[chordLinkIndex]) {
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

    if (landingConsultingActive) {
      drawConsultingTonicText(cx[innerK], cy, r[innerK]);
    }

    const rGear = r[FIFTH_BAND_INDEX] - r[FIFTH_BAND_INDEX + 1];
    const trackR = r[innerK] - rGear;
    const gearAlpha = landingConsultingActive ? 0.5 : 1;
    ctx.save();
    ctx.globalAlpha = gearAlpha;
    if (trackR > 0 && rGear > 0) {
      const gx = cx[innerK] + trackR * Math.cos(gearTrackAngle);
      const gy = cy + trackR * Math.sin(gearTrackAngle);
      drawGearParentLink(cx[innerK], cy, gx, gy);
      drawGearCircle(gx, gy, rGear, gearRollAngle);
    } else {
      drawGearCircle(cx[innerK], cy, rGear, gearRollAngle);
    }

    const kHost = FIFTH_ORBIT_HOST_CIRCLE_K;
    const rFifthMini = r[innerK] / 3;
    const orbitFifthR = r[kHost] + rFifthMini;
    if (orbitFifthR > 0 && rFifthMini > 0) {
      const fx = cx[kHost] + orbitFifthR * Math.cos(fifthOrbitGearAngle);
      const fy = cy + orbitFifthR * Math.sin(fifthOrbitGearAngle);
      drawSimpleGearCircle(fx, fy, rFifthMini, fifthOrbitGearRoll);
      const rFifthChild = rGear;
      const orbitAroundParentR = rFifthMini + rFifthChild;
      if (orbitAroundParentR > 0 && rFifthChild > 0) {
        const ccx = fx + orbitAroundParentR * Math.cos(fifthChildOrbitAngle);
        const ccy = fy + orbitAroundParentR * Math.sin(fifthChildOrbitAngle);
        drawSimpleGearCircle(ccx, ccy, rFifthChild, fifthChildRollAngle);
      }
    }

    const kTw = TWELFTH_BAND_ORBIT_HOST_K;
    const orbitTwelfthR = r[kTw] + rGear;
    if (orbitTwelfthR > 0 && rGear > 0) {
      const tx = cx[kTw] + orbitTwelfthR * Math.cos(twelfthOrbitGearAngle);
      const ty = cy + orbitTwelfthR * Math.sin(twelfthOrbitGearAngle);
      drawSimpleGearCircle(tx, ty, rGear, twelfthOrbitGearRoll);
    }
    ctx.restore();
  }

  window.addEventListener('mousemove', () => {
    bumpMouseForGear();
  });

  canvas.addEventListener('mousemove', (e) => {
    bumpMouseForGear();
    const { x, y } = canvasCssCoordsFromEvent(e);
    if (landingConsultingActive) {
      if (pointInRect(x, y, contactCopyHitRect)) {
        canvas.style.cursor = 'pointer';
        showContactTooltip('Copy Email', e.clientX, e.clientY);
      } else if (pointInRect(x, y, contactEnvelopeHitRect)) {
        canvas.style.cursor = 'pointer';
        showContactTooltip('Send Email', e.clientX, e.clientY);
      } else if (pointInRect(x, y, contactMailHitRect)) {
        canvas.style.cursor = 'pointer';
        hideContactTooltip();
      } else {
        canvas.style.cursor = 'default';
        hideContactTooltip();
      }
    } else {
      canvas.style.cursor = 'default';
      hideContactTooltip();
    }
    if (chordLinkIndex !== null) return;
    const band = chromaticGeom ? hitTestBand(x, y, chromaticGeom) : null;
    if (band !== hoverBand) {
      hoverBand = band;
      render();
    }
  });

  canvas.addEventListener('click', (e) => {
    const { x, y } = canvasCssCoordsFromEvent(e);
    if (landingConsultingActive && pointInRect(x, y, contactCopyHitRect)) {
      e.preventDefault();
      void copyContactEmailToClipboard();
      return;
    }
    if (landingConsultingActive && pointInRect(x, y, contactMailHitRect)) {
      e.preventDefault();
      window.location.href = CONTACT_MAILTO;
      return;
    }
    if (chromaticGeom && pointInChromaticDesign(x, y, chromaticGeom)) {
      chromaticStrum();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hideContactTooltip();
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

  function syncRingSizePctLabel() {
    const el = document.getElementById('landing-ring-size-pct');
    const slider = document.getElementById('landing-ring-size-slider');
    if (!el || !slider) return;
    el.textContent = `${slider.value}%`;
  }

  function formatGearPeriodReadout(periodStr) {
    const v = Number(periodStr);
    if (v === 0) return '0 — stop';
    const abs = Math.abs(v);
    return `${v < 0 ? '−' : ''}${abs} min`;
  }

  function syncGearSpeedReadouts() {
    const mainEl = document.getElementById('landing-gear-main-speed-readout');
    const mainSlider = document.getElementById('landing-gear-main-speed');
    const fifthEl = document.getElementById('landing-gear-fifth-speed-readout');
    const fifthSlider = document.getElementById('landing-gear-fifth-speed');
    if (mainEl && mainSlider) {
      mainEl.textContent = formatGearPeriodReadout(mainSlider.value);
    }
    if (fifthEl && fifthSlider) {
      fifthEl.textContent = formatGearPeriodReadout(fifthSlider.value);
    }
    const childEl = document.getElementById('landing-gear-fifth-child-speed-readout');
    const childSlider = document.getElementById('landing-gear-fifth-child-speed');
    if (childEl && childSlider) {
      childEl.textContent = formatGearPeriodReadout(childSlider.value);
    }
    const twelfthEl = document.getElementById('landing-gear-twelfth-speed-readout');
    const twelfthSlider = document.getElementById('landing-gear-twelfth-speed');
    if (twelfthEl && twelfthSlider) {
      twelfthEl.textContent = formatGearPeriodReadout(twelfthSlider.value);
    }
  }

  const ringSizeSlider = document.getElementById('landing-ring-size-slider');
  if (ringSizeSlider) {
    ringSizeSlider.addEventListener('input', () => {
      ringSizeMultiplier = Number(ringSizeSlider.value) / 100;
      syncRingSizePctLabel();
      render();
    });
    syncRingSizePctLabel();
  }

  const mainGearSpeedSlider = document.getElementById('landing-gear-main-speed');
  if (mainGearSpeedSlider) {
    gearMainOrbitPeriodMinutes = Number(mainGearSpeedSlider.value);
    mainGearSpeedSlider.addEventListener('input', () => {
      gearMainOrbitPeriodMinutes = Number(mainGearSpeedSlider.value);
      syncGearSpeedReadouts();
    });
  }
  const fifthGearSpeedSlider = document.getElementById('landing-gear-fifth-speed');
  if (fifthGearSpeedSlider) {
    gearFifthOrbitPeriodMinutes = Number(fifthGearSpeedSlider.value);
    fifthGearSpeedSlider.addEventListener('input', () => {
      gearFifthOrbitPeriodMinutes = Number(fifthGearSpeedSlider.value);
      syncGearSpeedReadouts();
    });
  }
  const fifthChildGearSpeedSlider = document.getElementById('landing-gear-fifth-child-speed');
  if (fifthChildGearSpeedSlider) {
    gearFifthChildOrbitPeriodMinutes = Number(fifthChildGearSpeedSlider.value);
    fifthChildGearSpeedSlider.addEventListener('input', () => {
      gearFifthChildOrbitPeriodMinutes = Number(fifthChildGearSpeedSlider.value);
      syncGearSpeedReadouts();
    });
  }
  const twelfthGearSpeedSlider = document.getElementById('landing-gear-twelfth-speed');
  if (twelfthGearSpeedSlider) {
    gearTwelfthOrbitPeriodMinutes = Number(twelfthGearSpeedSlider.value);
    twelfthGearSpeedSlider.addEventListener('input', () => {
      gearTwelfthOrbitPeriodMinutes = Number(twelfthGearSpeedSlider.value);
      syncGearSpeedReadouts();
    });
  }
  syncGearSpeedReadouts();

  const landingFloat = document.getElementById('landing-slider-float');
  const landingToggle = document.getElementById('landing-controls-toggle');
  if (landingFloat && landingToggle) {
    landingToggle.addEventListener('click', () => {
      chromaticStrum();
      landingFloat.classList.toggle('landing-slider-float--controls-hidden');
      const hidden = landingFloat.classList.contains('landing-slider-float--controls-hidden');
      landingToggle.setAttribute('aria-expanded', String(!hidden));
      landingToggle.setAttribute(
        'aria-label',
        hidden ? 'Show ring controls' : 'Hide ring controls'
      );
    });
  }

  function applyConsultingMode(active) {
    landingConsultingActive = active;
    if (!active) {
      hideContactTooltip();
    }
    const consultingEl = document.getElementById('landing-link-consulting');
    if (consultingEl) {
      consultingEl.classList.toggle('landing-link--consulting-active', active);
    }
    const floatEl = document.getElementById('landing-slider-float');
    if (floatEl) {
      floatEl.classList.toggle('landing-slider-float--consulting-hidden', active);
    }
    const slider = document.getElementById('landing-ring-size-slider');
    if (slider) {
      if (active) {
        slider.value = String(CONSULTING_RING_SLIDER_PCT);
        ringSizeMultiplier = CONSULTING_RING_SLIDER_PCT / 100;
      } else {
        slider.value = '100';
        ringSizeMultiplier = 1;
      }
      syncRingSizePctLabel();
    }
    render();
  }

  const consultingLink = document.getElementById('landing-link-consulting');
  if (consultingLink) {
    consultingLink.addEventListener('click', (e) => {
      e.preventDefault();
      chromaticStrum();
      applyConsultingMode(!landingConsultingActive);
    });
  }

  document.querySelectorAll('.landing-link').forEach((a, i) => {
    a.addEventListener('click', (e) => {
      if (a.id === 'landing-link-consulting') return;
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

  window.chromaticStrum = chromaticStrum;
  window.cancelChromaticStrum = cancelChromaticStrum;

  requestAnimationFrame(landingGearAnimationLoop);
})();
