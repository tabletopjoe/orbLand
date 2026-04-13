(() => {
  const canvas = document.getElementById('landing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const area = cssW * cssH;
    const circleAreaFraction = 0.5 * (1 - 0.15);
    const r = Math.sqrt((circleAreaFraction * area) / Math.PI);
    const cx = cssW / 2;
    const cy = cssH / 2;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  window.addEventListener('resize', draw);
  draw();
})();
