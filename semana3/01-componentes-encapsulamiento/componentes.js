/* MÃ³dulo semanal de referencia.
   La lÃ³gica de producciÃ³n vive en script.js (script unificado).
   Si ese archivo ya se cargÃ³, este mÃ³dulo no vuelve a enlazar nada. */
/* Semana 3: componente encapsulado con patrÃ³n IIFE y API mÃ­nima. */
var TarjetaPartyZone = (function () {
  'use strict';

  function crear(item) {
    var articulo = document.createElement('article');
    articulo.className = 'pz-card';
    articulo.setAttribute('data-id', item.id || '');
    articulo.setAttribute('data-categoria', item.categoria || '');

    var media = document.createElement('div');
    media.className = 'pz-card__media';
    var img = document.createElement('img');
    img.className = 'pz-card__img';
    img.src = item.imagen || 'img/logo-pz.svg';
    img.alt = String(item.nombre || 'Paquete');
    img.width = 800;
    img.height = 600;
    img.loading = 'lazy';
    img.decoding = 'async';
    media.appendChild(img);

    var cuerpo = document.createElement('div');
    cuerpo.className = 'pz-card__body';

    var categoria = document.createElement('p');
    categoria.className = 'pz-card__cat';
    categoria.textContent = String(item.categoria || '');

    var titulo = document.createElement('h3');
    titulo.className = 'pz-card__title';
    titulo.title = String(item.nombre || '');
    titulo.textContent = String(item.nombre || '');

    var precio = document.createElement('p');
    precio.className = 'pz-card__price';
    var fuerte = document.createElement('strong');
    fuerte.textContent = 'Bs ' + Number(item.precio || 0).toLocaleString('es-BO');
    precio.appendChild(fuerte);

    cuerpo.appendChild(categoria);
    cuerpo.appendChild(titulo);
    cuerpo.appendChild(precio);
    articulo.appendChild(media);
    articulo.appendChild(cuerpo);
    return articulo;
  }

  return { crear: crear };
})();