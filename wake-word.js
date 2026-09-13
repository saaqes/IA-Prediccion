/**
 * wake-word.js
 * Palabra de activación "Iris" y máquina de estados de la conversación por voz.
 *
 * No abre el micrófono por su cuenta: usa la sesión de reconocimiento de voice.js.
 * Si el navegador no permite reconocimiento continuo, el estado real se refleja
 * en la interfaz; nunca se finge que está escuchando.
 *
 * Estados:
 *   IDLE → LISTENING_FOR_WAKE_WORD → WAKE_WORD_DETECTED
 *        → LISTENING_FOR_COMMAND → PROCESSING → (app) → WAITING
 */
(function (TAI) {
  'use strict';

  var STATES = {
    IDLE: 'IDLE',
    LISTENING_FOR_WAKE_WORD: 'LISTENING_FOR_WAKE_WORD',
    WAKE_WORD_DETECTED: 'WAKE_WORD_DETECTED',
    LISTENING_FOR_COMMAND: 'LISTENING_FOR_COMMAND',
    PROCESSING: 'PROCESSING'
  };

  // Variantes que suele devolver el reconocimiento para «Iris»
  var WAKE_PATTERN = /\b(iris|irís|iri|irix|iriz|hiris|iribs|aires|irs)\b/;

  function normalize(text) {
    return (text || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function WakeWord() {
    this._handlers = {};
    this.enabled = true;
    this.state = STATES.IDLE;
    this.commandTimeoutMs = 12000;
    this._commandTimer = null;
  }

  WakeWord.prototype.on = function (evt, cb) {
    (this._handlers[evt] = this._handlers[evt] || []).push(cb);
    return this;
  };
  WakeWord.prototype.emit = function (evt, payload) {
    (this._handlers[evt] || []).forEach(function (cb) {
      try { cb(payload); } catch (e) { console.error('[WakeWord]', evt, e); }
    });
  };

  WakeWord.prototype.setState = function (next) {
    if (this.state === next) return;
    this.state = next;
    this.emit('state', { state: next });
  };

  /** ¿La transcripción contiene la palabra de activación? */
  WakeWord.prototype.containsWakeWord = function (transcript) {
    return WAKE_PATTERN.test(normalize(transcript));
  };

  /** Devuelve el comando sin la palabra de activación ni conectores sobrantes. */
  WakeWord.prototype.stripWakeWord = function (transcript) {
    return normalize(transcript)
      .replace(WAKE_PATTERN, ' ')
      .replace(/^\s*(por favor|oye|hey|ya|ok)\s+/, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  /**
   * Enruta una transcripción final.
   * @returns {Object} { action: 'ignore'|'activate'|'command', command }
   */
  WakeWord.prototype.route = function (transcript, micAbierto) {
    var texto = (transcript || '').trim();
    if (!texto) return { action: 'ignore' };

    var tieneWake = this.enabled && this.containsWakeWord(texto);

    // Micrófono abierto manualmente: todo lo dicho es un comando
    if (micAbierto && !tieneWake) {
      this.clearCommandTimer();
      this.setState(STATES.PROCESSING);
      return { action: 'command', command: texto, wakeWord: null };
    }

    if (tieneWake) {
      var resto = this.stripWakeWord(texto);
      this.setState(STATES.WAKE_WORD_DETECTED);
      this.emit('activated', { transcript: texto });

      if (resto.length >= 3) {
        this.clearCommandTimer();
        this.setState(STATES.PROCESSING);
        return { action: 'command', command: resto, wakeWord: 'iris' };
      }

      this.startCommandWindow();
      return { action: 'activate', wakeWord: 'iris' };
    }

    // Ventana abierta tras decir solo «Iris»
    if (this.state === STATES.LISTENING_FOR_COMMAND) {
      this.clearCommandTimer();
      this.setState(STATES.PROCESSING);
      return { action: 'command', command: texto, wakeWord: 'iris' };
    }

    return { action: 'ignore' };
  };

  /** Abre la ventana en la que se espera la orden tras la activación. */
  WakeWord.prototype.startCommandWindow = function () {
    var self = this;
    this.clearCommandTimer();
    this.setState(STATES.LISTENING_FOR_COMMAND);

    this._commandTimer = setTimeout(function () {
      self._commandTimer = null;
      if (self.state === STATES.LISTENING_FOR_COMMAND) {
        self.setState(self.enabled ? STATES.LISTENING_FOR_WAKE_WORD : STATES.IDLE);
        self.emit('timeout', {});
      }
    }, this.commandTimeoutMs);
  };

  WakeWord.prototype.clearCommandTimer = function () {
    if (this._commandTimer) clearTimeout(this._commandTimer);
    this._commandTimer = null;
  };

  /** Vuelve al estado de espera de la palabra de activación. */
  WakeWord.prototype.waiting = function () {
    this.clearCommandTimer();
    this.setState(this.enabled ? STATES.LISTENING_FOR_WAKE_WORD : STATES.IDLE);
  };

  WakeWord.prototype.setEnabled = function (on) {
    this.enabled = !!on;
    this.clearCommandTimer();
    this.setState(this.enabled ? STATES.LISTENING_FOR_WAKE_WORD : STATES.IDLE);
    this.emit('enabled', { enabled: this.enabled });
  };

  WakeWord.prototype.STATES = STATES;

  TAI.WakeWord = new WakeWord();

  /* Alias legibles de la arquitectura solicitada */
  TAI.detectWakeWord = function (t) { return TAI.WakeWord.containsWakeWord(t); };
  TAI.startWakeWordDetection = function () { TAI.WakeWord.setEnabled(true); };
  TAI.stopWakeWordDetection = function () { TAI.WakeWord.setEnabled(false); };
})(window.TAI);
