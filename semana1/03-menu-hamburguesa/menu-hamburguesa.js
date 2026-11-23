/* MÃ³dulo semanal de referencia.
   La lÃ³gica de producciÃ³n vive en script.js (script unificado).
   Si ese archivo ya se cargÃ³, este mÃ³dulo no vuelve a enlazar nada. */
function initMenuSemana1() {
  if (window.PartyZoneUnificado) {
    console.info('[semana1] MenÃº hamburguesa: cubierto por script.js');
    return;
  }
  var boton = document.getElementById('btnMenu');
  var nav = document.getElementById('navPrincipal');
  if (!boton || !nav || !window.jQuery) return;

  jQuery(boton).on('click', function () {
    var abierto = boton.getAttribute('aria-expanded') === 'true';
    boton.setAttribute('aria-expanded', String(!abierto));
    jQuery(nav).stop(true, true).slideToggle(180);
  });
}