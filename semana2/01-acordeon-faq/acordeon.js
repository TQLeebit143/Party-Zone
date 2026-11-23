/* MÃ³dulo semanal de referencia.
   La lÃ³gica de producciÃ³n vive en script.js (script unificado).
   Si ese archivo ya se cargÃ³, este mÃ³dulo no vuelve a enlazar nada. */
function initAcordeonSemana2() {
  if (window.PartyZoneUnificado) {
    console.info('[semana2] AcordeÃ³n: cubierto por script.js');
    return;
  }
  if (!window.jQuery) return;
  jQuery(document).off('click.faqSemana2').on('click.faqSemana2', '.pz-faq__question', function () {
    var boton = jQuery(this);
    var respuesta = boton.next('.pz-faq__answer');
    var abierto = boton.attr('aria-expanded') === 'true';
    boton.attr('aria-expanded', abierto ? 'false' : 'true');
    respuesta.stop(true, true).slideToggle('slow');
  });
}