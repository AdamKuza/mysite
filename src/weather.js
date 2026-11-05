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
