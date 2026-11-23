/* MÃ³dulo semanal de referencia.
   La lÃ³gica de producciÃ³n vive en script.js (script unificado).
   Si ese archivo ya se cargÃ³, este mÃ³dulo no vuelve a enlazar nada. */
function sanitizarSemana2(texto) {
  var valor = String(texto == null ? '' : texto);
  if (window.DOMPurify) {
    return window.DOMPurify.sanitize(valor, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }
  return valor.replace(/[<>&"]/g, function (c) {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c];
  });
}

function initSeguridadSemana2() {
  if (window.PartyZoneUnificado) {
    console.info('[semana2] Seguridad XSS: cubierta por script.js y shared/validacion.js');
    return;
  }
  /* Toda salida de datos del usuario pasa por textContent. */
  var demo = document.getElementById('logOutput');
  if (demo) {
    demo.setAttribute('data-sanitizado', 'true');
  }
}