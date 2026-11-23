/* MÃ³dulo semanal de referencia.
   La lÃ³gica de producciÃ³n vive en script.js (script unificado).
   Si ese archivo ya se cargÃ³, este mÃ³dulo no vuelve a enlazar nada. */
function initFiltroSemana1() {
  if (window.PartyZoneUnificado) {
    console.info('[semana1] Filtro y bÃºsqueda: cubiertos por script.js');
    return;
  }
  var chips = document.getElementById('chipsCategoria');
  var buscador = document.getElementById('buscadorCatalogo');
  var grid = document.getElementById('gridCatalogo');

  function aplicar(categoria, texto) {
    if (!grid) return;
    var q = String(texto || '').toLowerCase().trim();
    var tarjetas = grid.querySelectorAll('.pz-card');
    var visibles = 0;
    tarjetas.forEach(function (tarjeta) {
      var okCat = !categoria || categoria === 'todas' || tarjeta.getAttribute('data-categoria') === categoria;
      var okTexto = !q || tarjeta.textContent.toLowerCase().indexOf(q) !== -1;
      var mostrar = okCat && okTexto;
      tarjeta.style.display = mostrar ? '' : 'none';
      if (mostrar) visibles += 1;
    });
    var info = document.getElementById('contadorResultados');
    if (info) info.textContent = visibles + ' paquetes disponibles';
  }

  if (chips) {
    chips.addEventListener('click', function (evento) {
      var chip = evento.target.closest('.pz-chip');
      if (!chip) return;
      chips.querySelectorAll('.pz-chip').forEach(function (c) {
        c.classList.toggle('pz-chip--active', c === chip);
      });
      aplicar(chip.getAttribute('data-categoria'), buscador ? buscador.value : '');
    });
  }

  if (buscador) {
    buscador.addEventListener('keyup', function () {
      var activo = chips ? chips.querySelector('.pz-chip--active') : null;
      aplicar(activo ? activo.getAttribute('data-categoria') : 'todas', buscador.value);
    });
  }
}