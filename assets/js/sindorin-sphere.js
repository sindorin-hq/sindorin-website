/*
  Sindorin hero sphere. Production version of the visual in the Home design.
  Usage:  <canvas data-sindorin-sphere aria-hidden="true"></canvas>
          <script src="/assets/js/sindorin-sphere.js" defer></script>
  The canvas fills its parent; give the parent a size.
  Optional: data-density="1900" (dot count, 400 to 4000).
  Respects prefers-reduced-motion (renders one still frame), pauses off-screen and in background tabs.
*/
(function () {
  'use strict';
  var GRAPHITE = [58, 64, 61], PAPER = [247, 246, 242];
  var T_OFFSET = 40; // start mid-motion so the first frame is already shaped

  function makePoints(n) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(1 - y * y), lon = i * 2.39996;
      pts.push([r * Math.cos(lon), y, r * Math.sin(lon)]);
    }
    return pts;
  }

  function draw(ctx, w, h, t, dpr, pts) {
    var R = Math.min(w, h) * 0.42, cx = w / 2, cy = h / 2;
    var a1 = t * 0.031, a2 = t * 0.023;
    var ax = [Math.cos(a1), 0.35, Math.sin(a1)], bx = [0.3, Math.cos(a2), Math.sin(a2)];
    var rot = t * 0.035, ct = Math.cos(0.28), st = Math.sin(0.28);
    var out = new Array(pts.length);
    for (var i = 0; i < pts.length; i++) {
      var x0 = pts[i][0], y0 = pts[i][1], z0 = pts[i][2];
      var sw = rot + y0 * 0.55 * Math.sin(t * 0.04), cs = Math.cos(sw), sn = Math.sin(sw);
      var x = x0 * cs - z0 * sn, z = x0 * sn + z0 * cs, y = y0;
      var da = x * ax[0] + y * ax[1] + z * ax[2], db = x * bx[0] + y * bx[1] + z * bx[2];
      var rr = 1 + 0.1 * Math.sin(3.1 * da + t * 0.19) + 0.06 * Math.sin(4.7 * db - t * 0.14);
      out[i] = [cx + x * rr * R, cy + (y * ct - z * st) * rr * R, (y * st + z * ct) * rr];
    }
    out.sort(function (p, q) { return p[2] - q[2]; });
    ctx.clearRect(0, 0, w, h);
    for (var j = 0; j < out.length; j++) {
      var k = Math.max(0, Math.min(1, (out[j][2] + 1.1) / 2.2)), m = 0.12 + 0.88 * k;
      ctx.fillStyle = 'rgb(' +
        Math.round(GRAPHITE[0] + (PAPER[0] - GRAPHITE[0]) * m) + ',' +
        Math.round(GRAPHITE[1] + (PAPER[1] - GRAPHITE[1]) * m) + ',' +
        Math.round(GRAPHITE[2] + (PAPER[2] - GRAPHITE[2]) * m) + ')';
      ctx.beginPath();
      ctx.arc(out[j][0], out[j][1], (0.55 + 1.7 * k * k) * dpr, 0, 6.2832);
      ctx.fill();
    }
  }

  function init(canvas) {
    var n = Math.max(400, Math.min(4000, parseInt(canvas.getAttribute('data-density'), 10) || 1900));
    var pts = makePoints(n), ctx = canvas.getContext('2d');
    var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var raf = 0, visible = true, t0 = performance.now(), dpr = 1;
    canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.display = 'block';

    function render(now) {
      if (!canvas.width) return;
      var t = reduce.matches ? T_OFFSET : (now - t0) / 1000 + T_OFFSET;
      draw(ctx, canvas.width, canvas.height, t, dpr, pts);
    }
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      render(performance.now());
    }
    function loop(now) { render(now); raf = requestAnimationFrame(loop); }
    function update() {
      cancelAnimationFrame(raf); raf = 0;
      if (visible && !document.hidden && !reduce.matches) raf = requestAnimationFrame(loop);
      else render(performance.now());
    }

    if (window.ResizeObserver) new ResizeObserver(size).observe(canvas); else window.addEventListener('resize', size);
    if (window.IntersectionObserver) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; update(); }).observe(canvas);
    document.addEventListener('visibilitychange', update);
    if (reduce.addEventListener) reduce.addEventListener('change', update);
    size(); update();
  }

  function start() { Array.prototype.forEach.call(document.querySelectorAll('canvas[data-sindorin-sphere]'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
