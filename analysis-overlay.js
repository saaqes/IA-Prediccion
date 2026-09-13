/**
 * analysis-overlay.js
 * Capa visual del proceso de análisis, dibujada en SVG sobre el gráfico.
 *
 * IMPORTANTE: esta capa no inventa nada. Cada punto, línea y nivel que dibuja
 * proviene del resultado del motor de análisis (swingPoints, trendLines,
 * supportLevels, resistanceLevels) calculado con los ticks reales.
 *
 * API:
 *   runAnalysisAnimation(chart, analysis, onPhase) -> Promise
 *   animateMarketScanner() / animateSwingPoints() / animateTrendLines()
 *   animateSupportResistance() / animateAnalysisProgress() / clearAnalysisOverlay()
 */
(function (TAI) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var state = {
    host: null,
    svg: null,
    badge: null,
    chart: null,
    coords: null,
    timers: [],
    running: false
  };

  function el(tag, attrs) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    state.timers.push(id);
    return id;
  }

  function ensureLayer(chart, host) {
    state.chart = chart;
    state.host = host;

    if (!state.svg || state.svg.parentNode !== host) {
      clearAnalysisOverlay();
      state.svg = el('svg', { class: 'scan-layer' });
      host.appendChild(state.svg);

      state.badge = document.createElement('div');
      state.badge.className = 'scan-badge';
      state.badge.innerHTML = '<span class="scan-badge__title">● AI ANALYZING</span><span class="scan-badge__phase"></span>';
      host.appendChild(state.badge);
    }

    var w = host.clientWidth, h = host.clientHeight;
    state.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    state.svg.setAttribute('width', w);
    state.svg.setAttribute('height', h);
    state.size = { w: w, h: h };
    state.coords = chart && chart.coords ? chart.coords() : null;
  }

  /** Coordenada segura: descarta lo que caiga fuera del área visible. */
  function xy(time, price) {
    if (!state.coords) return null;
    var x = state.coords.timeToX(time);
    var y = state.coords.priceToY(price);
    if (x == null || y == null || isNaN(x) || isNaN(y)) return null;
    if (x < 0 || x > state.size.w || y < 0 || y > state.size.h) return null;
    return { x: x, y: y };
  }

  /* ------------------------------- fases ------------------------------- */

  /** Línea vertical que recorre las velas de izquierda a derecha. */
  function animateMarketScanner(durationMs) {
    if (!state.svg) return;
    var linea = el('line', {
      class: 'scan-line',
      x1: 0, y1: 0, x2: 0, y2: state.size.h
    });
    state.svg.appendChild(linea);
    linea.style.animationDuration = (durationMs || 5000) + 'ms';
    linea.style.setProperty('--scan-width', state.size.w + 'px');
  }

  /** Marca los máximos y mínimos detectados, uno tras otro. */
  function animateSwingPoints(points) {
    if (!state.svg || !points) return;
    var visibles = points.slice(-8);

    visibles.forEach(function (p, i) {
      later(function () {
        var c = xy(p.time, p.price);
        if (!c) return;
        var g = el('g', { class: 'swing swing--' + (p.type === 'HIGH' ? 'high' : 'low') });
        g.appendChild(el('circle', { cx: c.x, cy: c.y, r: 4.5, class: 'swing__dot' }));
        var t = el('text', { x: c.x + 8, y: c.y + (p.type === 'HIGH' ? -7 : 13), class: 'swing__label' });
        t.textContent = p.type === 'HIGH' ? 'HIGH' : 'LOW';
        g.appendChild(t);
        state.svg.appendChild(g);
      }, i * 110);
    });
  }

  /** Traza las líneas entre pivotes del mismo tipo, como si las dibujara a mano. */
  function animateTrendLines(lines) {
    if (!state.svg || !lines) return;

    lines.forEach(function (l, i) {
      later(function () {
        var a = xy(l.from.time, l.from.price);
        var b = xy(l.to.time, l.to.price);
        if (!a || !b) return;

        var linea = el('line', {
          x1: a.x, y1: a.y, x2: b.x, y2: b.y,
          class: 'trendline trendline--' + (l.rising ? 'up' : 'down')
        });
        var largo = Math.hypot(b.x - a.x, b.y - a.y);
        linea.style.strokeDasharray = largo;
        linea.style.strokeDashoffset = largo;
        state.svg.appendChild(linea);
        requestAnimationFrame(function () { linea.style.strokeDashoffset = '0'; });
      }, i * 260);
    });
  }

  /** Líneas horizontales de soporte y resistencia. */
  function animateSupportResistance(levels) {
    if (!state.svg || !levels) return;

    levels.forEach(function (lv, i) {
      later(function () {
        if (!state.coords) return;
        var y = state.coords.priceToY(lv.price);
        if (y == null || isNaN(y) || y < 0 || y > state.size.h) return;

        var esResistencia = lv.kind === 'RESISTANCE';
        var linea = el('line', {
          x1: 0, y1: y, x2: state.size.w, y2: y,
          class: 'level level--' + (esResistencia ? 'resistance' : 'support')
        });
        state.svg.appendChild(linea);

        var t = el('text', { x: 8, y: y - 6, class: 'level__label' });
        t.textContent = (esResistencia ? 'RESISTENCIA' : 'SOPORTE') + ' · ' + lv.touches + ' toques';
        state.svg.appendChild(t);
      }, i * 200);
    });
  }

  /** Texto de fase bajo el rótulo AI ANALYZING. */
  function animateAnalysisProgress(text) {
    if (!state.badge) return;
    var node = state.badge.querySelector('.scan-badge__phase');
    node.textContent = text;
    node.classList.remove('is-in');
    void node.offsetWidth;
    node.classList.add('is-in');
  }

  function clearAnalysisOverlay() {
    state.timers.forEach(clearTimeout);
    state.timers = [];
    state.running = false;
    if (state.svg && state.svg.parentNode) state.svg.parentNode.removeChild(state.svg);
    if (state.badge && state.badge.parentNode) state.badge.parentNode.removeChild(state.badge);
    state.svg = null;
    state.badge = null;
  }

  /**
   * Secuencia completa. Devuelve una promesa que resuelve al terminar.
   * @param {Object} chart  instancia devuelta por TAI.createChart
   * @param {HTMLElement} host contenedor del gráfico
   * @param {Object} analysis resultado de analyzeMarket (datos reales)
   */
  function runAnalysisAnimation(chart, host, analysis) {
    clearAnalysisOverlay();
    ensureLayer(chart, host);
    state.running = true;

    var paso = (TAI.CONFIG.APP && TAI.CONFIG.APP.scanStepMs) || 1300;
    var total = paso * 5;

    animateMarketScanner(total);
    animateAnalysisProgress('Analizando acción del precio…');

    return new Promise(function (resolve) {
      later(function () {
        animateAnalysisProgress('Identificando máximos y mínimos…');
        animateSwingPoints(analysis.swingPoints);
      }, paso);

      later(function () {
        animateAnalysisProgress('Midiendo momentum…');
      }, paso * 2);

      later(function () {
        animateAnalysisProgress('Revisando la tendencia…');
        animateTrendLines(analysis.trendLines);
      }, paso * 3);

      later(function () {
        animateAnalysisProgress('Marcando soportes y resistencias…');
        animateSupportResistance((analysis.supportLevels || []).concat(analysis.resistanceLevels || []));
      }, paso * 4);

      later(function () {
        animateAnalysisProgress('Calculando la probabilidad…');
      }, paso * 4.6);

      later(function () {
        state.running = false;
        resolve();
      }, total);
    });
  }

  TAI.AnalysisOverlay = {
    runAnalysisAnimation: runAnalysisAnimation,
    animateMarketScanner: animateMarketScanner,
    animateSwingPoints: animateSwingPoints,
    animateTrendLines: animateTrendLines,
    animateSupportResistance: animateSupportResistance,
    animateAnalysisProgress: animateAnalysisProgress,
    clearAnalysisOverlay: clearAnalysisOverlay,
    isRunning: function () { return state.running; }
  };
})(window.TAI);
