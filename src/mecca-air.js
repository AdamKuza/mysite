/* Воздух Мекки: мелкие песчинки у земли и тепловое искажение дальнего плана. Текст и Кааба не искажаются. */
(() => {
  'use strict';
  const book = document.querySelector('.book');
  const scene = document.querySelector('.scene--mecca');
  const air = scene?.querySelector('.mecca-air');
  if (!book || !air) return;
  const hero = scene.querySelector('.hero');
  const noise = scene.querySelector('feDisplacementMap');
  const paths = [...air.querySelectorAll('path')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const grains = [];
  const random = (min, max) => min + Math.random() * (max - min);
  let width = 0, height = 0, frame = 0, lastTime = 0, heatTime = 0, elapsed = 0;
  let turning = false, visible = true;

/* При первом заполнении песчинки распределяются по всей области, затем новые входят с правой стороны. */
  function spawn(scattered = false) {
    return {x: scattered ? random(0, width) : width + 6, y: random(height * .2, height - 5),
      speed: random(30, 72), length: random(2, 4.5), phase: random(0, Math.PI * 2),
      layer: Math.floor(random(0, paths.length))};
  }

  function running() {
    return visible && !turning && !document.hidden && !preference.matches && book.dataset.scene === 'mecca';
  }

  function draw() {
    const strokes = paths.map(() => []);
    for (const grain of grains) {
      strokes[grain.layer].push(`M${grain.x.toFixed(1)} ${grain.y.toFixed(1)}l${grain.length.toFixed(1)} -.4`);
    }
    paths.forEach((path, index) => path.setAttribute('d', strokes[index].join('')));
  }

/* Песчинки несёт общий порыв с небольшим индивидуальным колебанием. Сила искажения обновляется реже движения частиц. */
  function animate(now) {
    frame = 0;
    if (!running()) { update(); return; }
    const dt = Math.min(.04, Math.max(0, (now - lastTime) / 1000));
    lastTime = now; elapsed += dt;
    const gust = 1 + Math.max(0, Math.sin(elapsed * .65)) * .9;
    for (let i = 0; i < grains.length; i++) {
      const grain = grains[i];
      grain.phase += dt * 1.3;
      grain.x -= grain.speed * gust * dt;
      grain.y += Math.sin(grain.phase) * 3 * dt;
      if (grain.x < -6 || grain.y < 0 || grain.y > height + 6) grains[i] = spawn();
    }
    // Repaint only distant architecture and paving at 10 Hz, never the Kaaba or text.
    if (noise && elapsed >= heatTime) {
      noise.setAttribute('scale', (2 + Math.sin(elapsed * .7) * .8).toFixed(2));
      heatTime = elapsed + .1;
    }
    draw();
    frame = requestAnimationFrame(animate);
  }

/* Остановка снимает запланированный кадр, поэтому скрытая сцена не расходует время на расчёт песка. */
  function update() {
    const active = running() && width > 0 && height > 0;
    air.toggleAttribute('hidden', !active);
    scene.dataset.meccaAirRunning = String(active);
    if (!active) { cancelAnimationFrame(frame); frame = 0; return; }
    if (!frame) { lastTime = performance.now(); frame = requestAnimationFrame(animate); }
  }

  function measure() {
    const inset = innerWidth < 700 ? 40 : hero.clientWidth * .125;
    width = Math.max(0, hero.clientWidth - inset * 2);
    height = innerWidth < 700 ? 180 : 240;
    const count = Math.max(28, Math.min(90, Math.round(width / 16)));
    grains.length = 0;
    for (let i = 0; i < count; i++) grains.push(spawn(true));
    draw(); update();
  }
  book.addEventListener('book:turnstart', () => { turning = true; update(); });
  book.addEventListener('book:turnend', () => { turning = false; update(); });
  addEventListener('resize', measure, {passive: true});
  document.addEventListener('visibilitychange', update);
  preference.addEventListener('change', update);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }).observe(scene);
  }
  measure();
})();
