/* MÃ³dulo semanal de referencia.
   La lÃ³gica de producciÃ³n vive en script.js (script unificado).
   Si ese archivo ya se cargÃ³, este mÃ³dulo no vuelve a enlazar nada. */
function initTemaSemana1() {
  if (window.PartyZoneUnificado) {
    console.info('[semana1] Tema: cubierto por script.js');
    return;
  }
  var CLAVE = 'partyzone_tema';
  var html = document.documentElement;
  var guardado = null;
  try { guardado = localStorage.getItem(CLAVE); } catch (e) { /* modo privado */ }
  html.setAttribute('data-tema', guardado === 'claro' ? 'claro' : 'oscuro');

  var boton = document.getElementById('btnTema');
  if (!boton) return;
  boton.addEventListener('click', function () {
    var oscuro = html.getAttribute('data-tema') !== 'claro';
    html.setAttribute('data-tema', oscuro ? 'claro' : 'oscuro');
    try { localStorage.setItem(CLAVE, oscuro ? 'claro' : 'oscuro'); } catch (e) { /* noop */ }
    boton.setAttribute('aria-pressed', String(oscuro));
  });
}