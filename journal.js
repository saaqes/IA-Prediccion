/**
 * journal.js
 * Historial de análisis ejecutados, persistido en localStorage.
 *
 * REGLA: aquí no se inventa nada. Cada registro guarda lo que el sistema
 * midió de verdad: mercado, ticks, dirección estimada, precio al abrir la
 * ventana y precio al cerrarla. El "resultado" es la comparación real entre
 * ambos precios, no una ganancia monetaria: la app está en simulación y no
 * hay cuenta conectada, así que no existe importe que informar.
 */
(function (TAI) {
  'use strict';

  var CLAVE = 'tai.journal.v1';
  var CLAVE_NOMBRE = 'tai.user.name';

  function leer() {
    try {
      var raw = localStorage.getItem(CLAVE);
      var datos = raw ? JSON.parse(raw) : [];
      return Array.isArray(datos) ? datos : [];
    } catch (e) {
      console.warn('[journal] no se pudo leer el historial:', e && e.message);
      return [];
    }
  }

  function guardar(lista) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(lista));
      return true;
    } catch (e) {
      console.warn('[journal] no se pudo guardar:', e && e.message);
      return false;
    }
  }

  function siguienteId(lista) {
    return lista.reduce(function (max, r) { return Math.max(max, r.id || 0); }, 0) + 1;
  }

  function pad(n) { return String(n).padStart(3, '0'); }

  var Journal = {
    /** Nombre con el que IRIS se dirige al usuario. */
    getName: function () {
      try { return localStorage.getItem(CLAVE_NOMBRE) || ''; } catch (e) { return ''; }
    },
    setName: function (nombre) {
      try { localStorage.setItem(CLAVE_NOMBRE, String(nombre || '').trim()); return true; }
      catch (e) { return false; }
    },

    list: function () {
      return leer().sort(function (a, b) { return b.id - a.id; });   // más recientes primero
    },

    get: function (id) {
      return leer().find(function (r) { return r.id === Number(id); }) || null;
    },

    findByName: function (texto) {
      var q = String(texto || '').toLowerCase().trim();
      if (!q) return null;
      return leer().find(function (r) {
        return r.name && r.name.toLowerCase().indexOf(q) !== -1;
      }) || null;
    },

    /**
     * Registra un análisis ejecutado.
     * @param {Object} datos { market, ticks, direction, confidence, entryPrice, exitPrice, decimals }
     */
    add: function (datos) {
      var lista = leer();
      var ahora = new Date();

      var entrada = Number(datos.entryPrice);
      var salida = Number(datos.exitPrice);
      var variacion = (isFinite(entrada) && isFinite(salida)) ? salida - entrada : null;

      var resultado = 'SIN DATOS';
      if (variacion != null && datos.direction !== 'WAIT') {
        if (variacion === 0) resultado = 'SIN CAMBIO';
        else if ((datos.direction === 'CALL' && variacion > 0) ||
                 (datos.direction === 'PUT' && variacion < 0)) resultado = 'ACERTADO';
        else resultado = 'FALLADO';
      } else if (datos.direction === 'WAIT') {
        resultado = 'SIN DIRECCIÓN';
      }

      var registro = {
        id: siguienteId(lista),
        code: '#' + pad(siguienteId(lista)),
        name: null,
        date: ahora.toISOString(),
        dateLabel: ahora.toLocaleDateString('es-CO'),
        timeLabel: ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        market: datos.market,
        ticks: datos.ticks,
        direction: datos.direction,
        confidence: datos.confidence,
        entryPrice: isFinite(entrada) ? entrada : null,
        exitPrice: isFinite(salida) ? salida : null,
        change: variacion,
        decimals: datos.decimals != null ? datos.decimals : 3,
        result: resultado,
        mode: 'SIMULACIÓN'
      };

      lista.push(registro);
      guardar(lista);
      return registro;
    },

    rename: function (id, nombre) {
      var lista = leer();
      var r = lista.find(function (x) { return x.id === Number(id); });
      if (!r) return null;
      r.name = String(nombre || '').trim() || null;
      guardar(lista);
      return r;
    },

    remove: function (id) {
      var lista = leer();
      var i = lista.findIndex(function (x) { return x.id === Number(id); });
      if (i === -1) return false;
      lista.splice(i, 1);
      guardar(lista);
      return true;
    },

    /** Resumen de un día (por defecto hoy) calculado solo con lo registrado. */
    summary: function (fecha) {
      var dia = (fecha || new Date()).toDateString();
      var delDia = leer().filter(function (r) { return new Date(r.date).toDateString() === dia; });

      return {
        total: delDia.length,
        acertados: delDia.filter(function (r) { return r.result === 'ACERTADO'; }).length,
        fallados: delDia.filter(function (r) { return r.result === 'FALLADO'; }).length,
        sinDireccion: delDia.filter(function (r) { return r.result === 'SIN DIRECCIÓN'; }).length,
        registros: delDia
      };
    },

    byMarket: function (etiqueta) {
      var q = String(etiqueta || '').toLowerCase();
      return leer().filter(function (r) {
        return String(r.market || '').toLowerCase().indexOf(q) !== -1;
      });
    },

    clear: function () { guardar([]); }
  };

  TAI.Journal = Journal;
})(window.TAI);
