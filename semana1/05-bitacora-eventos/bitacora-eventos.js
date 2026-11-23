/* MÃ³dulo semanal de referencia.
   La lÃ³gica de producciÃ³n vive en script.js (script unificado).
   Si ese archivo ya se cargÃ³, este mÃ³dulo no vuelve a enlazar nada. */
function registrarEventoSemana1(mensaje, tipo) {
  var caja = document.getElementById('logOutput');
  if (!caja) return;
  var hora = new Date().toLocaleTimeString('es-BO', { hour12: false });
  var linea = document.createElement('div');
  linea.className = 'pz-log__line pz-log__line--' + (tipo || 'info');
  var tiempo = document.createElement('span');
  tiempo.className = 'pz-log__time';
  tiempo.textContent = hora;
  var texto = document.createElement('span');
  texto.className = 'pz-log__msg';
  /* textContent (nunca innerHTML) para evitar inyecciÃ³n XSS. */
  texto.textContent = String(mensaje);
  linea.appendChild(tiempo);
  linea.appendChild(texto);
  caja.prepend(linea);
}

function initBitacoraSemana1() {
  if (window.PartyZoneUnificado) {
    console.info('[semana1] BitÃ¡cora: cubierta por script.js');
    return;
  }
  registrarEventoSemana1('MÃ³dulo semanal de bitÃ¡cora cargado.', 'ok');
}