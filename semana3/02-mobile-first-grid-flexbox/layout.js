/* MÃ³dulo semanal de referencia.
   La lÃ³gica de producciÃ³n vive en script.js (script unificado).
   Si ese archivo ya se cargÃ³, este mÃ³dulo no vuelve a enlazar nada. */
/* Semana 3: layout mobile-first.
   En vertical: columna + dock inferior.
   En horizontal o >=768px: fila + barra lateral izquierda. */
function initLayoutSemana3() {
  var app = document.querySelector('.contenedor-app');
  var dock = document.querySelector('.dock-acciones');
  if (!app || !dock) return;

  var mq = window.matchMedia('(min-width: 768px), (orientation: landscape)');

  function aplicar(esFila) {
    app.classList.toggle('contenedor-app--fila', esFila);
    dock.classList.toggle('dock-acciones--lateral', esFila);
  }

  aplicar(mq.matches);
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', function (e) { aplicar(e.matches); });
  } else if (typeof mq.addListener === 'function') {
    mq.addListener(function (e) { aplicar(e.matches); });
  }
}