/**
 * Resume /about page: theme toggle + pinwheel canvas 
 */
(() => {
  const root = document.documentElement;
  const key = 'theme';

  const apply = (theme) => {
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
  };

  const saved = localStorage.getItem(key);
  if (saved === 'light' || saved === 'dark') {
    apply(saved);
  } else {
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)')?.matches;
    apply(prefersLight ? 'light' : 'dark');
  }

  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const isLight = root.getAttribute('data-theme') === 'light';
      const next = isLight ? 'dark' : 'light';
      apply(next);
      localStorage.setItem(key, next);
    });
  }
})();

(() => {
  const canvas = document.getElementById('pinwheel');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const colors = [
    'rgba(4, 100, 59, 0.5)',
    'rgba(1, 75, 43, 0.5)',
    'rgba(21, 189, 116, .5)',
    'rgba(147, 233, 196, .5)',
  ];

  const rotationSpeed = (2 * Math.PI) / 45000;

  function getTargetH1() {
    const siblingH1 = canvas.parentElement?.querySelector('h1');
    return siblingH1 || document.querySelector('h1');
  }

  function setCanvasSizeFromH1() {
    const h1 = getTargetH1();
    const h1Height = h1 ? h1.getBoundingClientRect().height : 32;
    const cssSize = Math.max(40, Math.min(96, Math.round(h1Height * 2)));

    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return cssSize;
  }

  let cssSize = setCanvasSizeFromH1();

  function drawRectangle(color, rectWidth, rectHeight) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-rectWidth / 3, -rectHeight / 2);
    ctx.lineTo(rectWidth / 2, -rectHeight / 2);
    ctx.lineTo(rectWidth / 3, rectHeight / 2);
    ctx.lineTo(-rectWidth / 2, rectHeight / 2);
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.save();
    ctx.translate(cssSize / 2, cssSize / 2);

    const rectWidth = cssSize * 0.95;
    const rectHeight = cssSize * 0.25;

    for (let i = 0; i < colors.length; i++) {
      ctx.save();
      const t = (Date.now() % 30000) * rotationSpeed;
      ctx.rotate(t + i * (Math.PI / 2) + i * (Math.PI / 4));
      drawRectangle(colors[i], rectWidth, rectHeight);
      ctx.restore();
    }

    ctx.restore();
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {
    cssSize = setCanvasSizeFromH1();
  });

  document.fonts?.ready?.then(() => {
    cssSize = setCanvasSizeFromH1();
  });

  requestAnimationFrame(draw);
})();
