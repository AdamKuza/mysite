/* Петербургская гавань: JavaScript задаёт границы плавания, а непрерывное движение воды и кораблей выполняет CSS. */
(() => {
  'use strict';
  const book = document.querySelector('.book');
  const scene = document.querySelector('.scene--petersburg');
  if (!book || !scene) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let turning = false;

/* Скрытая сцена и фоновая вкладка не должны продолжать анимацию гавани. */
  function update() {
    const running = visible && !document.hidden && !turning && !preference.matches && book.dataset.scene === 'petersburg';
    const value = String(running);
    if (scene.dataset.harborRunning !== value) scene.dataset.harborRunning = value;
  }

/* Начало и конец маршрута вынесены за видимые края. Масштаб SVG учитывается, чтобы судно целиком скрывалось за рамками. */
  function measure() {
    const river = scene.querySelector('.hero').getBoundingClientRect();
    for (const [selector, width, duration, reverse] of [['.ship', 520, 100, false], ['.distant-boat', 70, 140, true]]) {
      const vessel = scene.querySelector(selector);
      const parent = vessel.parentElement.getBoundingClientRect();
      const style = getComputedStyle(vessel);
      const vesselWidth = parseFloat(style.width);
      if (!vesselWidth) continue;
      const inset = parseFloat(style.left);
      const vesselLeft = parent.left + (Number.isFinite(inset) ? inset : parent.width - parseFloat(style.right) - vesselWidth);
      const scale = vesselWidth / width;
      const left = -(vesselLeft - river.left + vesselWidth + 40) / scale;
      const right = (river.right - vesselLeft + 40) / scale;
      const start = reverse ? right : left;
      const end = reverse ? left : right;
      // Negative delay starts each voyage at its original engraved position.
      vessel.style.setProperty('--voyage-start', `${start}px`);
      vessel.style.setProperty('--voyage-end', `${end}px`);
      vessel.style.setProperty('--voyage-duration', `${duration}s`);
      vessel.style.setProperty('--voyage-delay', `${-duration * (0 - start) / (end - start)}s`);
    }
    update();
  }

  book.addEventListener('book:turnstart', () => { turning = true; update(); });
  book.addEventListener('book:turnend', () => { turning = false; update(); });
  addEventListener('resize', measure, {passive: true});
  document.addEventListener('visibilitychange', update);
  preference.addEventListener('change', update);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      update();
    });
    observer.observe(scene);
  }
  measure();
})();
