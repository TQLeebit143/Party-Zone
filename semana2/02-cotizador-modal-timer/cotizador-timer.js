/* MÃ³dulo semanal de referencia.
   La lÃ³gica de producciÃ³n vive en script.js (script unificado).
   Si ese archivo ya se cargÃ³, este mÃ³dulo no vuelve a enlazar nada. */
var intervaloSemana2 = null;

function iniciarTemporizadorSemana2(segundos, alExpirar) {
  if (intervaloSemana2) clearInterval(intervaloSemana2);
  var restantes = segundos || 30;
  var salida = document.querySelector('#temporizadorReserva .pz-timer__value');

  function pintar() {
    if (salida) salida.textContent = '00:' + String(restantes).padStart(2, '0');
  }
  pintar();

  intervaloSemana2 = setInterval(function () {
    restantes -= 1;
    pintar();
    if (restantes <= 0) {
      clearInterval(intervaloSemana2);
      intervaloSemana2 = null;
      if (typeof alExpirar === 'function') alExpirar();
    }
  }, 1000);
}

function detenerTemporizadorSemana2() {
  if (intervaloSemana2) {
    clearInterval(intervaloSemana2);
    intervaloSemana2 = null;
  }
}

function initCotizadorSemana2() {
  if (window.PartyZoneUnificado) {
    console.info('[semana2] Cotizador y temporizador: cubiertos por script.js');
    return;
  }
  var boton = document.getElementById('btnReservar');
  if (!boton) return;
  boton.addEventListener('click', function () {
    iniciarTemporizadorSemana2(30, function () {
      var modal = document.getElementById('modalReserva');
      if (modal && window.jQuery) jQuery(modal).fadeOut(200);
    });
  });
}