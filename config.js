/**
 * config.js
 * Configuración central de la aplicación. No contiene secretos.
 * Cualquier credencial privada debe vivir en un backend/proxy (ver AI.proxyUrl).
 */
window.TAI = window.TAI || {};

/** Versión visible en pantalla y en consola, para saber qué build se está ejecutando. */
TAI.VERSION = '1.9.0';

TAI.CONFIG = {
  /* ------------------------------------------------------------------ */
  /* API DE MERCADO (Deriv WebSocket público: solo lectura de ticks)      */
  /* ------------------------------------------------------------------ */
  API: {
    websocketUrl: 'wss://ws.derivws.com/websockets/v3',
    // Si un endpoint falla se rota al siguiente automáticamente
    endpoints: [
      'wss://ws.derivws.com/websockets/v3',
      'wss://ws.binaryws.com/websockets/v3',
      'wss://frontend.derivws.com/websockets/v3'
    ],
    pingIntervalMs: 25000,
    // app_id público de Deriv. Reemplázalo por el tuyo (app.deriv.com).
    // NO es un secreto: solo identifica la aplicación para datos públicos.
    appId: '1089',
    historyCount: 300,
    reconnectDelayMs: 2500,
    maxReconnectDelayMs: 20000,
    requestTimeoutMs: 12000
  },

  /* ------------------------------------------------------------------ */
  /* IA                                                                  */
  /* ------------------------------------------------------------------ */
  AI: {
    // 'LOCAL' -> motor determinista incluido | 'PROXY' -> backend propio
    provider: 'LOCAL',
    proxyUrl: '',
    maxContextTicks: 120,
    fallbackToLocal: true
  },

  /* ------------------------------------------------------------------ */
  /* MERCADOS                                                            */
  /* ------------------------------------------------------------------ */
  MARKET: {
    // Preferencia, no verdad absoluta: la lista real se pide al servidor
    // con active_symbols. Si no llega, la app NO inventa códigos.
    defaultSymbol: '1HZ75V',
    requireServerSymbols: true,
    minTicksForAnalysis: 25,
    symbols: [
      { code: 'R_10',    label: 'Volatility 10',       index: 10,  oneSecond: false, decimals: 3 },
      { code: '1HZ10V',  label: 'Volatility 10 (1s)',  index: 10,  oneSecond: true,  decimals: 3 },
      { code: 'R_25',    label: 'Volatility 25',       index: 25,  oneSecond: false, decimals: 3 },
      { code: '1HZ25V',  label: 'Volatility 25 (1s)',  index: 25,  oneSecond: true,  decimals: 2 },
      { code: 'R_50',    label: 'Volatility 50',       index: 50,  oneSecond: false, decimals: 4 },
      { code: '1HZ50V',  label: 'Volatility 50 (1s)',  index: 50,  oneSecond: true,  decimals: 2 },
      { code: 'R_75',    label: 'Volatility 75',       index: 75,  oneSecond: false, decimals: 4 },
      { code: '1HZ75V',  label: 'Volatility 75 (1s)',  index: 75,  oneSecond: true,  decimals: 2 },
      { code: 'R_100',   label: 'Volatility 100',      index: 100, oneSecond: false, decimals: 2 },
      { code: '1HZ100V', label: 'Volatility 100 (1s)', index: 100, oneSecond: true,  decimals: 2 }
    ]
  },

  /* ------------------------------------------------------------------ */
  /* APLICACIÓN                                                          */
  /* ------------------------------------------------------------------ */
  APP: {
    simulationMode: true,       // arranca siempre en simulación
    allowRealTrading: false,    // ninguna orden real puede enviarse desde aquí
    countdownSeconds: 10,
    autoBrief: true,            // al conectar, rellena el escenario sin esperar comandos
    liveRefreshMs: 15000,
    candleSeconds: 5,           // segundos que agrupa cada vela del gráfico
    scanStepMs: 1300,           // duración de cada fase del escaneo visual
    historyLimit: 8,
    lang: 'es-ES',
    speechRate: 0.95,
    speechPitch: 1.12,
    preferFemaleVoice: true,
    conversationMode: true,
    greeting: 'Hola, ¿cómo estás? ¿Quieres iniciar un análisis hoy?'
  }
};

/** Devuelve la definición de un mercado por su código. */
TAI.getSymbol = function (code) {
  return TAI.CONFIG.MARKET.symbols.find(function (s) { return s.code === code; }) || null;
};
