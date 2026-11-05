/* Физика каждой верёвки независима от сцены. Держатель двигает контроллер книги, изгиб и кисточку — этот контроллер. */
(() => {
  'use strict';
  const systems = [...document.querySelectorAll('.cord-system')];
  systems.forEach((system, systemIndex) => {
  const button = system?.querySelector('.pull-cord');
  if (!button) return;
  const tassel = button.querySelector('.cord-tassel');
  const paths = [...system.querySelectorAll('.rope-line path')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const book = system.closest('.book');
  const fixture = system.querySelector('.cord-anchor');
/* Верёвка представлена цепочкой точек с ограничением расстояния. Фиксированный шаг делает движение стабильнее при разной частоте кадров. */
  const segments = 18;
  const step = 1 / 120;
  const gravity = 1050;
  let points = [];
  let anchor = {x: 50, y: 9};
  let length = 130;
  let extension = 0;
  let drag = null;
  let frame = 0;
  let lastTime = 0;
  let accumulator = 0;
  let restingFrames = 0;
  let freeTime = 0;
  let angle = 0;
  let transitioning = false;
  let lift = 0;
  let travel = 0;
  let lastPath = '';

  // Presentation offset is applied in this renderer only. Physics always works
  // in the same local coordinates, including during scene changes.
  const visibleY = y => (y - lift).toFixed(2);
  const visibleX = x => (anchor.x + (x - anchor.x) * (travel ? Math.max(0, 1 - lift / travel) ** 2 : 1)).toFixed(2);

/* Ломаная цепочка сглаживается кривыми Безье. Три одинаковых контура рисуют тень, основу и оплётку. */
  function draw() {
    const midpoint = (a, b) => `${visibleX((a.x + b.x) / 2)} ${visibleY((a.y + b.y) / 2)}`;
    let d = `M${visibleX(points[0].x)} ${visibleY(points[0].y)}`;
    for (let i = 1; i < points.length - 1; i++) {
      d += ` Q${visibleX(points[i].x)} ${visibleY(points[i].y)} ${midpoint(points[i], points[i + 1])}`;
    }
    const end = points.at(-1);
    d += ` L${visibleX(end.x)} ${visibleY(end.y)}`;
    if (d !== lastPath) { paths.forEach(path => path.setAttribute('d', d)); lastPath = d; }
    button.style.left = `${visibleX(end.x)}px`;
    button.style.top = `${end.y - lift}px`;
    tassel.style.transform = `rotate(${angle.toFixed(2)}deg)`;
  }

/* Прямая верёвка — исходное состояние и состояние покоя; в нём дальнейшие кадры физики не нужны. */
  function straight() {
    extension = 0; angle = 0;
    points = Array.from({length: segments + 1}, (_, i) => ({
      x: anchor.x, y: anchor.y + length * i / segments,
      px: anchor.x, py: anchor.y + length * i / segments,
      weight: i === 0 ? 0 : i === segments ? .17 : 1
    }));
    draw();
  }

/* Сначала переносим точки с учётом инерции и тяжести, затем несколько раз восстанавливаем длины звеньев. */
  function solve(dt) {
    if (drag) extension = Math.max(0, Math.hypot(drag.target.x - anchor.x, drag.target.y - anchor.y) - length);
    else { extension *= Math.exp(-8 * dt); freeTime += dt; }
    const damping = Math.exp(-2.8 * dt);
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      if (drag && i === segments) continue;
      const vx = (p.x - p.px) * damping;
      const vy = (p.y - p.py) * damping;
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy + gravity * dt * dt;
    }
    const segmentLength = (length + extension) / segments;
    // Position-based distance constraints, a fixed anchor, and a heavier tassel.
    for (let iteration = 0; iteration < 18; iteration++) {
      points[0].x = anchor.x; points[0].y = anchor.y;
      if (drag) { points[segments].x = drag.target.x; points[segments].y = drag.target.y; }
      for (let i = 0; i < segments; i++) {
        const a = points[i], b = points[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || .0001;
        const wa = a.weight, wb = drag && i + 1 === segments ? 0 : b.weight;
        const correction = (distance - segmentLength) / distance / (wa + wb || 1);
        a.x += dx * correction * wa; a.y += dy * correction * wa;
        b.x -= dx * correction * wb; b.y -= dy * correction * wb;
      }
    }
    points[0].x = anchor.x; points[0].y = anchor.y;
    if (drag) { points[segments].x = drag.target.x; points[segments].y = drag.target.y; }
    const end = points[segments], previous = points[segments - 1];
    const tangent = Math.max(-70, Math.min(70, -Math.atan2(end.x - previous.x, end.y - previous.y) * 180 / Math.PI));
    angle += (tangent - angle) * (1 - Math.exp(-12 * dt));
  }

/* Накопитель времени позволяет выполнить несколько коротких физических шагов за один кадр отрисовки. */
  function animate(now) {
    frame = 0;
    if (document.hidden || preference.matches) return;
    accumulator += Math.min(.04, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    while (accumulator >= step) { solve(step); accumulator -= step; }
    draw();
    const speed = Math.max(...points.map(p => Math.hypot(p.x - p.px, p.y - p.py)));
    if (!drag && speed < .055 && extension < .06 && Math.abs(angle) < .2) restingFrames++;
    else restingFrames = 0;
    if (!transitioning && !drag && (system.classList.contains('is-stowed') || restingFrames > 24 || freeTime > 12)) {
      straight(); system.classList.remove('is-moving'); return;
    }
    frame = requestAnimationFrame(animate);
  }

/* Будим расчёт только при взаимодействии или движении. Это не создаёт второй цикл, если он уже запущен. */
  function wake() {
    if (frame || document.hidden || preference.matches) return;
    lastTime = performance.now(); accumulator = 0; restingFrames = 0;
    system.classList.add('is-moving');
    frame = requestAnimationFrame(animate);
  }

/* Указатель переводится в локальные координаты держателя; максимальная дальность не даёт растянуть цепочку бесконечно. */
  function targetAt(event) {
    const rect = system.getBoundingClientRect();
    let x = event.clientX - rect.left + drag.offsetX;
    let y = Math.max(anchor.y + 5, event.clientY - rect.top + drag.offsetY);
    const maxReach = length + 115;
    const radius = Math.hypot(x - anchor.x, y - anchor.y);
    if (radius > maxReach) {
      x = anchor.x + (x - anchor.x) * maxReach / radius;
      y = anchor.y + (y - anchor.y) * maxReach / radius;
    }
    x = Math.max(25 - rect.left, Math.min(innerWidth - rect.left - 25, x));
    return {x, y};
  }

  function followReduced() {
    const end = drag.target;
    points.forEach((p, i) => {
      p.x = p.px = anchor.x + (end.x - anchor.x) * i / segments;
      p.y = p.py = anchor.y + (end.y - anchor.y) * i / segments;
    });
    angle = -Math.atan2(end.x - anchor.x, end.y - anchor.y) * 180 / Math.PI;
    draw();
  }

/* Натяжение вниз и короткое нажатие различаются. Максимальный путь жеста защищает от перехода после раскачивания туда и обратно. */
  function release(cancelled = false) {
    if (!drag) return;
    const held = drag;
    const threshold = innerWidth < 700 ? 42 : 52;
    const downward = !cancelled && held.dy >= threshold && held.dy >= Math.abs(held.dx) * 1.2
      && held.target.y - anchor.y >= length + threshold * .65;
    drag = null;
    button.classList.remove('is-dragging');
    if (button.hasPointerCapture(held.id)) button.releasePointerCapture(held.id);
    const end = points[segments];
    end.px = end.x - held.vx * step * .7;
    end.py = end.y - held.vy * step * .7;
    freeTime = 0;
    if (preference.matches) straight(); else wake();
    if (downward || (!cancelled && held.maxTravel < 8 && button.dataset.pullOnly !== 'true')) button.dispatchEvent(new Event('cord:pull'));
  }

  button.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || button.getAttribute('aria-disabled') === 'true') return;
    const rect = system.getBoundingClientRect(), end = points[segments];
    drag = {id: event.pointerId, startX: event.clientX, startY: event.clientY,
      offsetX: end.x - (event.clientX - rect.left), offsetY: end.y - (event.clientY - rect.top),
      dx: 0, dy: 0, maxTravel: 0, vx: 0, vy: 0, time: event.timeStamp, target: {x: end.x, y: end.y}};
    button.setPointerCapture(event.pointerId);
    button.classList.add('is-dragging'); freeTime = 0; wake();
  });
  button.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const target = targetAt(event);
    const dt = Math.max(.008, Math.min(.1, (event.timeStamp - drag.time) / 1000));
    drag.vx = Math.max(-1000, Math.min(1000, (target.x - drag.target.x) / dt));
    drag.vy = Math.max(-1000, Math.min(1000, (target.y - drag.target.y) / dt));
    drag.time = event.timeStamp; drag.target = target;
    drag.dx = event.clientX - drag.startX; drag.dy = event.clientY - drag.startY;
    drag.maxTravel = Math.max(drag.maxTravel, Math.hypot(drag.dx, drag.dy));
    if (preference.matches) followReduced(); else wake();
  });
  button.addEventListener('pointerup', event => { if (drag?.id === event.pointerId) release(); });
  button.addEventListener('pointercancel', () => release(true));
  button.addEventListener('lostpointercapture', () => release(true));
  button.addEventListener('dragstart', event => event.preventDefault());

/* Клавиатура запускает тот же переход, что и натяжение; пользователю не обязательно управлять указателем. */
  function keyboardPull() {
    if (drag || button.getAttribute('aria-disabled') === 'true') return;
    extension = innerWidth < 700 ? 54 : 64;
    points.forEach((p, i) => { p.y = p.py = anchor.y + (length + extension) * i / segments; p.x = p.px = anchor.x; });
    draw(); freeTime = 0;
    if (preference.matches) straight(); else wake();
    button.dispatchEvent(new Event('cord:pull'));
  }
  // Pointer taps navigate on release; native keyboard activation simulates a pull.
  button.addEventListener('click', event => { if (event.detail === 0) keyboardPull(); });
  button.addEventListener('keydown', event => {
    if (event.key === 'Escape') release(true);
    if (event.key === 'ArrowDown') { event.preventDefault(); if (!event.repeat) keyboardPull(); }
  });
/* Запас хода учитывает не только нить, но и кисточку с подписью: при втягивании они должны полностью пройти за держатель. */
  function measureTravel() {
    // Reel the full tassel and label through the stationary fixture's opening.
    travel = Math.max(length + 115, ...points.map(p => p.y))
      + (button.offsetHeight || 130) + 20;
  }
  book.addEventListener('book:turnstart', () => {
    release(true);
    transitioning = true;
    system.classList.add('is-transitioning');
    measureTravel();
    freeTime = 0;
  });
/* Втягивание — только смещение рисунка. Физические точки не перемещаются вверх и не получают искусственный рывок. */
  book.addEventListener('book:turnprogress', event => {
    if (preference.matches) return;
    const progress = event.detail.progress;
    const smooth = value => {
      const t = Math.max(0, Math.min(1, value));
      return t * t * t * (t * (t * 6 - 15) + 10);
    };
    const amount = progress < .34 ? smooth(progress / .34)
      : 1 - smooth((progress - .58) / .42);
    lift = travel * amount;
    draw();
  });
  book.addEventListener('book:turnend', () => {
    transitioning = false;
    system.classList.remove('is-transitioning');
    lift = 0;
    draw();
    freeTime = 0;
    if (system.classList.contains('is-stowed') || preference.matches) {
      cancelAnimationFrame(frame); frame = 0;
      system.classList.remove('is-moving');
      straight();
    } else if (frame || extension > .06 || Math.abs(angle) > .2) wake();
  });
/* После изменения размера окна заново читаем длину из CSS и ставим верёвку в устойчивое исходное положение. */
  function measure() {
    release(true); cancelAnimationFrame(frame); frame = 0;
    length = parseFloat(getComputedStyle(system).getPropertyValue('--rope-length')) || 130;
    anchor = {x: (system.clientWidth || parseFloat(getComputedStyle(system).width)) / 2,
      y: fixture.offsetHeight || parseFloat(getComputedStyle(fixture).height)};
    system.style.setProperty('--feed-top', `${anchor.y - 2}px`);
    if (transitioning) measureTravel();
    system.classList.remove('is-moving'); straight();
  }
  book.addEventListener('cord:revealed', measure);
  addEventListener('resize', measure, {passive: true});
  preference.addEventListener('change', measure);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      release(true); cancelAnimationFrame(frame); frame = 0;
      system.classList.remove('is-moving');
    }
    else wake();
  });
  measure();
  });
})();
