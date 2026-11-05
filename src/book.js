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
