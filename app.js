/* Контроллер книги: выбирает сцену, складывает её слои и управляет доступностью верёвок. */
(() => {
  'use strict';
  const book = document.querySelector('.book');
  if (!book) return;
  const stage = book.querySelector('.book-stage');
  const scenes = [...book.querySelectorAll('.scene')];
  const cords = [...book.querySelectorAll('.pull-cord')];
/* Порядок сцен и назначения верёвок задаются отдельно: верёвка не меняет свой маршрут при переходе. */
  const sceneNames = ['petersburg', 'moscow', 'newyork', 'mecca', 'safari'];
  const destinations = ['Въ Москву', 'Въ Петербургъ', 'Въ Нью-Іоркъ', 'Въ Мекку', 'Въ тайную комнату'];
  const cordTargets = [1, 0, 2, 3, 4];
  const badge = book.querySelector('.compass-trigger');
  let badgeClicks = 0;
  let secretUnlocked = false;
  const status = book.querySelector('.book-status');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => { const x = clamp(value); return x * x * (3 - 2 * x); };
  const phase = (value, start, end) => ease((value - start) / (end - start));
  let frame = 0;
  let progress = 0;
  let turning = false;
  let current = 0;
  let target = 0;
  let cordScene = 0;
  const cordFrames = new Map();

/* Параметры слоёв читаются заранее, чтобы при анимации не запрашивать вычисленные стили на каждом кадре. */
  const layers = scenes.map(scene => [...scene.querySelectorAll('[data-fold]')].map(element => ({
    element,
    type: element.dataset.fold,
    delay: Number(element.dataset.delay || 0),
    baseOpacity: Number(getComputedStyle(element).opacity)
  })));

/* Боковые детали закрываются как створки, остальные слои — как страницы бумажной книги. Задержка задаёт порядок складывания. */
  function foldScene(index, amount, incoming) {
    const scene = scenes[index];
    const active = amount > 0.001 && amount < 0.999;
    for (const {element, type, delay, baseOpacity} of layers[index]) {
      const folded = incoming
        ? 1 - phase(1 - amount, delay, Math.min(1, delay + 0.72))
        : phase(amount, delay, Math.min(1, delay + 0.72));
      let transform;
      if (type === 'left' || type === 'right') {
        const direction = type === 'left' ? -1 : 1;
        transform = `perspective(1100px) rotateY(${direction * folded * 88}deg) rotateX(${folded * 8}deg)`;
      } else if (type === 'copy') {
        transform = `perspective(1400px) rotateX(${-folded * 32}deg) translateY(${folded * 28}px)`;
      } else {
        transform = `perspective(1100px) rotateX(${(incoming ? -1 : 1) * folded * 89}deg)`;
      }
      element.style.transform = amount === 0 ? '' : transform;
      element.style.opacity = String(baseOpacity * (1 - phase(folded, type === 'copy' ? 0.08 : 0.68, 0.99)));
      element.style.willChange = active ? 'transform, opacity' : 'auto';
    }
    scene.style.pointerEvents = amount > .94 ? 'none' : '';
  }

/* Один общий прогресс управляет старой и новой сценами. Их видимость немного перекрывается, чтобы не возникал пустой кадр. */
  function render(value) {
    progress = clamp(value);
    book.dataset.turning = String(turning);
    const close = phase(progress, .035, .53);
    const open = phase(progress, .43, .94);
    scenes.forEach((scene, index) => {
      const outgoing = index === current;
      const incoming = index === target && target !== current;
      const opacity = incoming ? phase(progress, .43, .68) : outgoing ? (target === current ? 1 : 1 - phase(progress, .34, .58)) : 0;
      const shown = outgoing || incoming;
      scene.style.visibility = shown ? 'visible' : 'hidden';
      scene.dataset.rendering = String(shown);
      if (shown) foldScene(index, incoming ? 1 - open : outgoing && target !== current ? close : outgoing ? 0 : 1, incoming);
      scene.style.opacity = String(opacity);
      scene.style.zIndex = outgoing ? '2' : '1';
      const active = index === (progress > .56 ? target : current);
      scene.setAttribute('aria-hidden', String(!active));
      scene.inert = !active || turning;
    });
    stage.style.setProperty('--crease-opacity', String(Math.sin(progress * Math.PI) * .2));
    // Preserve the original Moscow progress contract; scene identifies the third page.
    book.dataset.progress = target === 0 && current === 1 ? (1 - progress).toFixed(4) : current === 0 && target === 1 ? progress.toFixed(4) : current === 1 ? '1' : '0';
    book.dataset.scene = sceneNames[current];
    if (turning) {
      // Update availability while all cords are inside their holders.
      if (progress >= .5 && cordScene !== target) updateCord(target);
      renderCordFrames(close, open);
      book.dispatchEvent(new CustomEvent('book:turnprogress', {detail: {progress}}));
    } else {
      for (const cord of cords) {
        const system = cord.closest('.cord-system');
        system.style.transform = ''; system.style.opacity = ''; system.style.willChange = 'auto';
      }
    }
  }

  // Frame motion is applied to the whole holder, leaving rope physics in local coordinates.
  // Layout is read only when measuring or swapping scenes, never on every animation frame.
/* Центр вращения держателя переводится из координат рамки в координаты самой верёвки. Так крепление остаётся на рамке. */
  function cacheCordFrames(scene) {
    const hero = scenes[scene].querySelector('.hero');
    const width = hero?.clientWidth || innerWidth;
    const bottom = (hero?.offsetTop || 0) + (hero?.clientHeight || innerHeight);
    cords.slice(0, 4).forEach(cord => {
      const system = cord.closest('.cord-system');
      const left = system.offsetLeft || 0;
      const right = left + system.clientWidth / 2 > width / 2;
      const originX = (hero?.offsetLeft || 0) + (scene === 0 ? right ? width : 0 : width / 2);
      cordFrames.set(system, {scene, right});
      system.style.transformOrigin = (originX - left) + 'px ' + (bottom - system.offsetTop) + 'px';
    });
  }

/* В середине перехода рамки скрыты: в этот момент можно сменить точки крепления без заметного скачка. */
  function renderCordFrames(close, open) {
    const incoming = progress >= .5;
    const amount = incoming ? 1 - open : close;
    const scene = incoming ? target : current;
    const sceneOpacity = incoming ? phase(progress, .43, .68) : 1 - phase(progress, .34, .58);
    for (const cord of cords.slice(0, 4)) {
      const system = cord.closest('.cord-system');
      const record = cordFrames.get(system);
      const delay = scene === 0 ? .18 : .06;
      const folded = incoming ? 1 - phase(1 - amount, delay, delay + .72) : phase(amount, delay, delay + .72);
      system.style.transform = scene === 0
        ? 'perspective(1100px) rotateY(' + ((record?.right ? 1 : -1) * folded * 88) + 'deg) rotateX(' + (folded * 8) + 'deg)'
        : 'perspective(1100px) rotateX(' + ((incoming ? -1 : 1) * folded * 89) + 'deg)';
      system.style.opacity = String(sceneOpacity * (1 - phase(folded, .68, .99)));
      system.style.willChange = 'transform, opacity';
    }
  }

/* Для Москвы и Мекки высота крепления находится на SVG-контуре арки под конкретным держателем. */
  function positionCords(scene = cordScene) {
    const hero = scenes[1].querySelector('.hero');
    if (hero?.clientHeight) {
      hero.style.setProperty('--moscow-crest-top', `${hero.clientHeight * .098 + Math.min(innerWidth < 700 ? 28 : 40, hero.clientHeight * .04)}px`);
    }
    const secretSystem = cords[4]?.closest('.cord-system');
    if (secretSystem && badge && !secretSystem.hidden) {
      const bounds = badge.getBoundingClientRect(), stageBounds = stage.getBoundingClientRect();
      secretSystem.style.setProperty('inset-block-start', (bounds.top - stageBounds.top) + 'px');
      secretSystem.style.setProperty('inset-inline-start', (bounds.left + bounds.width / 2 - stageBounds.left - secretSystem.clientWidth / 2) + 'px');
    }
    if (scene !== 1 && scene !== 3) {
      cords.forEach((cord, index) => { if (index !== 4) cord.closest('.cord-system').style.removeProperty('inset-block-start'); });
      cacheCordFrames(scene);
      return;
    }
    const frameHero = scenes[scene].querySelector('.hero');
    const rail = scenes[scene].querySelector(scene === 3 ? '#mecca-cord-rail' : '#kremlin-cord-rail');
    if (!frameHero?.clientWidth || typeof rail?.getTotalLength !== 'function') { cacheCordFrames(scene); return; }
    const total = rail.getTotalLength();
    for (const cord of cords.slice(0, 4)) {
      const system = cord.closest('.cord-system');
      const x = (system.offsetLeft + system.clientWidth / 2 - frameHero.offsetLeft) / frameHero.clientWidth * 1200;
      // The guide follows the stone arch from left to right. Find its exact
      // height under each holder instead of using a fixed viewport offset.
      let low = 0, high = total;
      for (let i = 0; i < 24; i++) {
        const middle = (low + high) / 2;
        if (rail.getPointAtLength(middle).x < x) low = middle;
        else high = middle;
      }
      const y = rail.getPointAtLength((low + high) / 2).y;
      system.style.setProperty('inset-block-start', `${frameHero.offsetTop + (y + 2) / 1000 * frameHero.clientHeight}px`);
    }
    cacheCordFrames(scene);
  }

/* Обычные направления всегда доступны, кроме текущей сцены. Секретная верёвка появляется отдельно после разблокировки. */
  function updateCord(scene = current) {
    cordScene = scene;
    cords.forEach((cord, index) => {
      const destination = cordTargets[index];
      const secret = destination === 4;
      const available = secret ? secretUnlocked && scene === 0 : scene !== destination;
      const system = cord.closest('.cord-system');
      system.classList[available ? 'remove' : 'add']('is-current');
      if (secret) system.hidden = !available;
      cord.inert = turning || !available;
      const label = destinations[index];
      cord.querySelector('.cord-destination').textContent = label;
      cord.setAttribute('aria-controls', scenes[destination].id);
      cord.setAttribute('aria-label', 'Потянуть верёвочку вниз: ' + label);
      cord.setAttribute('aria-disabled', String(turning || !available));
      cord.setAttribute('aria-current', available ? 'false' : 'page');
      cord.disabled = turning || !available;
    });
    positionCords(scene);
  }

/* Сначала закрепляем новую сцену, затем возвращаем ввод и сообщаем остальным контроллерам, что переход завершён. */
  function finish() {
    cancelAnimationFrame(frame); frame = 0;
    current = target; progress = 0; turning = false;
    measure(); updateCord();
    book.dispatchEvent(new Event('book:turnend'));
    status.textContent = ['Открытъ Петербургъ. Адамъ Кузнецовъ.', 'Живу въ Москвѣ.', 'Нью-Іоркъ. Знаю американскій англійскій. Мечтаю слетать въ Нью-Іоркъ.', 'Мекка. Исповѣдую исламъ суннитскаго толку.', 'Я ненавижу WebKit.'][current];
  }

/* Во время перелистывания повторный ввод блокируется. При уменьшении движения переход выполняется сразу. */
  function turn(index) {
    const destination = cordTargets[index];
    if (turning || destination === current || (destination === 4 && (!secretUnlocked || current !== 0))) return;
    target = destination;
    measure();
    turning = true;
    book.dispatchEvent(new Event('book:turnstart'));
    cords.forEach(cord => { cord.inert = true; cord.disabled = true; cord.setAttribute('aria-disabled', 'true'); });
    if (preference.matches) { finish(); return; }
    const start = performance.now();
    function animate(now) {
      const elapsed = clamp((now - start) / 1650);
      render(ease(elapsed));
      if (elapsed < 1) frame = requestAnimationFrame(animate);
      else finish();
    }
    frame = requestAnimationFrame(animate);
  }

/* Перерасчёт нужен при смене размера окна и сцены; постоянного опроса размеров здесь нет. */
  function measure() {
    const header = scenes[0].querySelector('.masthead').offsetHeight;
    book.style.setProperty('--cord-top', header + 'px');
    book.style.setProperty('--page-height', document.documentElement.clientHeight + 'px');
    render(progress);
    positionCords();
  }

  function configure() {
    if (turning) finish();
    document.documentElement.classList.add('book-motion');
    measure();
    updateCord();
  }

/* Пасхалка действует только на розе ветров Петербурга. Счётчик живёт до перезагрузки страницы. */
  badge?.addEventListener('click', () => {
    if (turning || current !== 0 || secretUnlocked) return;
    if (++badgeClicks < 10) return;
    secretUnlocked = true;
    book.dataset.secretUnlocked = 'true';
    badge.style.visibility = 'hidden';
    badge.disabled = true;
    updateCord();
    book.dispatchEvent(new Event('cord:revealed'));
    cords[4]?.focus();
  });
  cords.forEach((cord, index) => cord.addEventListener('cord:pull', () => turn(index)));
  addEventListener('resize', measure, {passive: true});
  preference.addEventListener('change', configure);
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('page-hidden', document.hidden));
  configure();
})();
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
/* Общий генератор дождя и снега. Геометрия строится один раз, а движение готовых слоёв выполняется средствами CSS. */
(() => {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  const random = (min, max) => min + Math.random() * (max - min);
  const svgElement = (name, attributes = {}) => {
    const node = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  };

/* У каждой сцены собственные размеры, состояние видимости и набор частиц. */
  function create(name, type) {
    const book = document.querySelector('.book');
    const scene = document.querySelector(`.scene--${name}`);
    const field = scene?.querySelector(type === 'snow' ? '.moscow-snow' : `.${name}-rain`);
    if (!book || !field) return;
    const hero = scene.querySelector('.hero');
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, dirty = true, turning = false, visible = true;
    field.classList.add('weather-field', `weather-${type}`);

/* Осадки скрываются при перелистывании, в фоновой вкладке и при включённом уменьшении движения. */
    function running() {
      return visible && !turning && !document.hidden && !preference.matches && book.dataset.scene === name;
    }

/* Бесшовная плитка повторяется на большом листе. Длина CSS-прохода совпадает с размером плитки, поэтому цикл не перескакивает. */
    function build() {
      const rain = type === 'rain', tileWidth = 320, tileHeight = rain ? 640 : 480;
      const area = width * Math.min(height, innerHeight);
      const total = rain
        ? Math.min(name === 'newyork' ? 620 : 520, Math.max(90, area / (name === 'newyork' ? 3200 : 4000))) * .8
        : Math.min(300, Math.max(65, area / 6200));
      const count = Math.max(3, Math.round(total * tileWidth * tileHeight / Math.max(1, width * height) / 3));
      const fragment = document.createDocumentFragment();
/* Три слоя с разной скоростью и прозрачностью дают глубину без отдельных DOM-элементов для каждой капли. */
      for (let layer = 0; layer < 3; layer++) {
        const sway = document.createElement('div');
        sway.className = 'weather-sway';
        sway.style.setProperty('--weather-opacity', String((rain ? [name === 'newyork' ? .14 : .12, .22, .32] : [.22, .3, .42])[layer]));
        sway.style.setProperty('--gust-duration', `${random(1.8, 4).toFixed(2)}s`);
        sway.style.setProperty('--sway-duration', `${random(3.7, 6.2).toFixed(2)}s`);
        sway.style.setProperty('--sway-delay', `${-random(0, 6).toFixed(2)}s`);
        const sheet = document.createElement('div');
        sheet.className = 'weather-sheet';
        const sheetWidth = width + (rain ? tileWidth : 48), sheetHeight = height + tileHeight;
        const duration = tileHeight / (rain ? [1050, 1270, 1450][layer] : [25, 43, 62][layer]);
        sheet.style.width = `${sheetWidth}px`; sheet.style.height = `${sheetHeight}px`;
        sheet.style.left = rain ? '0px' : '-24px';
        sheet.style.setProperty('--weather-top', `${-tileHeight}px`);
        sheet.style.setProperty('--weather-left', `${rain ? -tileWidth : 0}px`);
        sheet.style.setProperty('--fall-duration', `${duration.toFixed(4)}s`);
        sheet.style.setProperty('--fall-delay', `${-random(0, duration).toFixed(4)}s`);
        const svg = svgElement('svg', {width: sheetWidth, height: sheetHeight, viewBox: `0 0 ${sheetWidth} ${sheetHeight}`, 'aria-hidden': 'true', focusable: 'false'});
        const defs = svgElement('defs');
        const id = `weather-${name}-${layer}`;
        const pattern = svgElement('pattern', {id, width: tileWidth, height: tileHeight, patternUnits: 'userSpaceOnUse'});
        const strokes = [];
        for (let i = 0; i < count; i++) {
          const x = random(10, tileWidth - 24), y = random(24, tileHeight - 12);
          if (rain) {
            const length = random(7, 19);
            strokes.push(`M${x.toFixed(1)} ${y.toFixed(1)}l${(length * .447).toFixed(1)} ${(-length * .894).toFixed(1)}`);
          } else {
            const r = random(1.9, 2.7) + layer, diagonal = r * .72;
            if (layer === 0) strokes.push(`M${(x-r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2*r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2*r).toFixed(1)} 0`);
            else strokes.push(`M${(x-r).toFixed(1)} ${y.toFixed(1)}h${(2*r).toFixed(1)}M${(x-diagonal).toFixed(1)} ${(y-diagonal).toFixed(1)}l${(2*diagonal).toFixed(1)} ${(2*diagonal).toFixed(1)}M${(x-diagonal).toFixed(1)} ${(y+diagonal).toFixed(1)}l${(2*diagonal).toFixed(1)} ${(-2*diagonal).toFixed(1)}`);
          }
        }
        pattern.append(svgElement('path', {d: strokes.join('')}));
        defs.append(pattern); svg.append(defs, svgElement('rect', {width: sheetWidth, height: sheetHeight, fill: `url(#${id})`}));
        sheet.append(svg); sway.append(sheet); fragment.append(sway);
      }
      field.replaceChildren(fragment);
      dirty = false;
    }

/* Повторная сборка нужна только после изменения размеров. Простое возвращение в сцену использует уже готовые слои. */
    function update() {
      const active = running() && width > 0 && height > 0;
      if (active && dirty) build();
      field.toggleAttribute('hidden', !active);
      field.dataset.weatherRunning = String(active);
    }

/* Ширина рабочей области согласована с рамками: осадки не выходят на боковое оформление. */
    function measure() {
      const inset = innerWidth < 700 ? 34 : hero.clientWidth * .125;
      const nextWidth = Math.max(0, hero.clientWidth - inset * 2), nextHeight = hero.clientHeight;
      if (width !== nextWidth || height !== nextHeight) { width = nextWidth; height = nextHeight; dirty = true; }
      update();
    }
    book.addEventListener('book:turnstart', () => { turning = true; update(); });
    book.addEventListener('book:turnend', () => { turning = false; measure(); });
    addEventListener('resize', measure, {passive: true});
    document.addEventListener('visibilitychange', update);
    preference.addEventListener('change', update);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }).observe(scene);
    }
    measure();
  }
  window.SiteWeather = {create};
})();
(() => { 'use strict'; /* Подключаем общий генератор дождя к двум сценам; параметры плотности выбираются внутри weather.js. */
window.SiteWeather.create('petersburg', 'rain'); window.SiteWeather.create('newyork', 'rain'); })();
(() => { 'use strict'; /* Снег использует тот же механизм слоёв, что и дождь, но другую геометрию и скорость падения. */
window.SiteWeather.create('moscow', 'snow'); })();
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
