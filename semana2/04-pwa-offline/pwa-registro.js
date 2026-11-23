/* MÃ³dulo semanal de referencia.
   La lÃ³gica de producciÃ³n vive en script.js (script unificado).
   Si ese archivo ya se cargÃ³, este mÃ³dulo no vuelve a enlazar nada. */
function initPwaSemana2() {
  var promptDiferido = null;
  var boton = document.getElementById('btnInstalarPWA');

  window.addEventListener('beforeinstallprompt', function (evento) {
    evento.preventDefault();
    promptDiferido = evento;
    if (boton) boton.removeAttribute('hidden');
  });

  if (boton) {
    boton.addEventListener('click', function () {
      if (!promptDiferido) return;
      promptDiferido.prompt();
      promptDiferido = null;
    });
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* sin SW en file:// */ });
  }
}