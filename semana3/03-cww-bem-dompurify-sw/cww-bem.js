/* MÃ³dulo semanal de referencia.
   La lÃ³gica de producciÃ³n vive en script.js (script unificado).
   Si ese archivo ya se cargÃ³, este mÃ³dulo no vuelve a enlazar nada. */
/* Semana 3: CSS-in-JS mÃ­nimo para el zoom, BEM en los nombres y
   comprobaciÃ³n de que DOMPurify y el Service Worker estÃ¡n activos. */
function alternarZoomSemana3(activo) {
  var modal = document.getElementById('modalZoom');
  if (!modal) return;
  modal.classList.toggle('pz-modal--abierto', !!activo);
  modal.hidden = !activo;
  document.body.style.overflow = activo ? 'hidden' : '';
}

function initCwwSemana3() {
  var estado = {
    dompurify: !!window.DOMPurify,
    serviceWorker: 'serviceWorker' in navigator,
    unificado: !!window.PartyZoneUnificado
  };
  console.info('[semana3] Estado CWW:', estado);
  return estado;
}