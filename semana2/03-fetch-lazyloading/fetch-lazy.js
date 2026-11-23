/* MÃ³dulo semanal de referencia.
   La lÃ³gica de producciÃ³n vive en script.js (script unificado).
   Si ese archivo ya se cargÃ³, este mÃ³dulo no vuelve a enlazar nada. */
function cargarCatalogoSemana2() {
  if (window.PartyZoneUnificado) {
    console.info('[semana2] Fetch y lazy loading: cubiertos por script.js');
    return;
  }
  return fetch('data/catalogo.json', { cache: 'no-store' })
    .then(function (respuesta) {
      if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
      return respuesta.json();
    })
    .then(function (datos) {
      if (!Array.isArray(datos)) throw new Error('El catÃ¡logo no es un arreglo');
      return datos;
    })
    .catch(function () {
      return Array.isArray(window.CATALOGO_PARTYZONE) ? window.CATALOGO_PARTYZONE : [];
    });
}