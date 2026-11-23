/* MÃ³dulo semanal de referencia.
   La lÃ³gica de producciÃ³n vive en script.js (script unificado).
   Si ese archivo ya se cargÃ³, este mÃ³dulo no vuelve a enlazar nada. */
function initValidacionSemana1() {
  if (window.PartyZoneUnificado) {
    console.info('[semana1] ValidaciÃ³n: cubierta por shared/validacion.js y script.js');
    return;
  }
  if (!window.Validacion) return;
  var form = document.getElementById('formReserva');
  if (!form) return;
  form.addEventListener('submit', function (evento) {
    var nombre = document.getElementById('reservaNombre');
    var telefono = document.getElementById('reservaTelefono');
    var errores = [];
    var eNombre = Validacion.reglas.nombre(nombre.value, { requerido: true });
    var eTel = Validacion.reglas.telefono(telefono.value, { requerido: true });
    if (eNombre) errores.push(eNombre);
    if (eTel) errores.push(eTel);
    var caja = document.getElementById('errorReserva');
    if (errores.length) {
      evento.preventDefault();
      if (caja) caja.textContent = errores[0];
    } else if (caja) {
      caja.textContent = '';
    }
  });
}