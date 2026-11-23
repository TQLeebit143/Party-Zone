/* ============================================================
   Avance Semana 3 · PartyZone
   Demo autocontenida: componentes, filtros, calculador,
   modal con temporizador de 30 s, DOMPurify y bitácora.
   ============================================================ */
(function () {
  'use strict';

  var CLAVE_TEMA = 'partyzone_tema';
  var TARIFA_HORA = 150;
  var BASE_HORAS = 4;
  var SEGUNDOS_MODAL = 30;

  var estado = {
    items: [],
    filtro: 'todas',
    busqueda: '',
    horas: BASE_HORAS,
    intervalo: null,
    segundos: SEGUNDOS_MODAL
  };

  var $ = function (sel, raiz) { return (raiz || document).querySelector(sel); };
  var $$ = function (sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); };

  function formatoBs(n) {
    return 'Bs ' + Math.round(Number(n) || 0).toLocaleString('es-BO');
  }

  function log(mensaje, tipo) {
    var caja = $('#logOutput');
    if (!caja) return;
    var hora = new Date().toLocaleTimeString('es-BO', { hour12: false });
    var linea = document.createElement('div');
    linea.className = 'pz-log__line pz-log__line--' + (tipo || 'info');
    var tiempo = document.createElement('span');
    tiempo.className = 'pz-log__time';
    tiempo.textContent = hora;
    var texto = document.createElement('span');
    texto.className = 'pz-log__msg';
    texto.textContent = String(mensaje);
    linea.appendChild(tiempo);
    linea.appendChild(texto);
    caja.prepend(linea);
    while (caja.children.length > 60) caja.removeChild(caja.lastChild);
  }

  function aviso(mensaje, error) {
    var toast = $('#s3Toast');
    if (!toast) return;
    if (window.jQuery) {
      jQuery(toast)
        .stop(true, true)
        .text(mensaje)
        .removeClass('pz-toast--error')
        .toggleClass('pz-toast--error', !!error)
        .removeAttr('hidden')
        .fadeIn(160)
        .delay(3000)
        .fadeOut(300, function () { jQuery(this).attr('hidden', 'hidden'); });
    }
  }

  /* ── Componente de tarjeta (Semana 3) ───────────────────── */
  var Tarjeta = (function () {
    function crear(item) {
      var articulo = document.createElement('article');
      articulo.className = 'pz-card';
      articulo.setAttribute('data-categoria', item.categoria);

      var media = document.createElement('div');
      media.className = 'pz-card__media';
      var img = document.createElement('img');
      img.className = 'pz-card__img';
      img.src = item.imagen;
      img.alt = item.nombre;
      img.width = 800;
      img.height = 600;
      img.loading = 'lazy';
      img.decoding = 'async';
      media.appendChild(img);
      media.appendChild(botonZoom(item));

      var cuerpo = document.createElement('div');
      cuerpo.className = 'pz-card__body';
      var cat = document.createElement('p');
      cat.className = 'pz-card__cat';
      cat.textContent = item.categoria;
      var titulo = document.createElement('h3');
      titulo.className = 'pz-card__title';
      titulo.title = item.nombre;
      titulo.textContent = item.nombre;
      var precio = document.createElement('p');
      precio.className = 'pz-card__price';
      var fuerte = document.createElement('strong');
      fuerte.textContent = formatoBs(item.precio);
      var unidad = document.createElement('span');
      unidad.textContent = '/ evento';
      precio.appendChild(fuerte);
      precio.appendChild(unidad);

      var acciones = document.createElement('div');
      acciones.className = 'pz-card__actions';
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'pz-btn pz-btn--primary';
      boton.textContent = 'Agregar';
      boton.setAttribute('data-accion', 'agregar');
      boton.setAttribute('data-id', item.id);
      acciones.appendChild(boton);

      cuerpo.appendChild(cat);
      cuerpo.appendChild(titulo);
      cuerpo.appendChild(precio);
      cuerpo.appendChild(acciones);
      articulo.appendChild(media);
      articulo.appendChild(cuerpo);
      return articulo;
    }

    function botonZoom(item) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'pz-card__zoom';
      boton.textContent = '⤢';
      boton.setAttribute('data-accion', 'zoom');
      boton.setAttribute('data-id', item.id);
      boton.setAttribute('aria-label', 'Ampliar ' + item.nombre);
      return boton;
    }

    return { crear: crear };
  })();

  /* ── Datos de la demo ──────────────────────────────────── */
  var DEMO = [
    { id: 'deco-neon', nombre: 'Decoración Neon Glow', categoria: 'decoracion', precio: 900, imagen: '../img/deco-neon.svg' },
    { id: 'deco-minnie', nombre: 'Decoración Minnie & Mickey', categoria: 'decoracion', precio: 850, imagen: '../img/deco-minnie.svg' },
    { id: 'catering-dulce', nombre: 'Catering Dulce', categoria: 'catering', precio: 720, imagen: '../img/catering-dulce.svg' },
    { id: 'catering-salado', nombre: 'Catering Salado', categoria: 'catering', precio: 840, imagen: '../img/catering-salado.svg' },
    { id: 'tec-sonido', nombre: 'Sonido + Luces LED', categoria: 'tecnologia', precio: 550, imagen: '../img/tec-sonido.svg' },
    { id: 'tec-karaoke', nombre: 'Karaoke + Pantalla LED', categoria: 'tecnologia', precio: 480, imagen: '../img/tec-karaoke.svg' }
  ];

  function normalizar(texto) {
    return String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function visibles() {
    var q = normalizar(estado.busqueda);
    return estado.items.filter(function (item) {
      var okCat = estado.filtro === 'todas' || item.categoria === estado.filtro;
      var okTexto = !q || normalizar(item.nombre + ' ' + item.categoria).indexOf(q) !== -1;
      return okCat && okTexto;
    });
  }

  function render() {
    var grid = $('#s3Grid');
    if (!grid) return;
    grid.innerHTML = '';
    var lista = visibles();
    lista.forEach(function (item) { grid.appendChild(Tarjeta.crear(item)); });
    if (!lista.length) {
      var vacio = document.createElement('p');
      vacio.className = 'pz-empty__text';
      vacio.textContent = 'No hay resultados con ese filtro.';
      grid.appendChild(vacio);
    }
  }

  function total() {
    return estado.horas * TARIFA_HORA;
  }

  function pintarTotal(animar) {
    var salida = $('#s3Total');
    if (!salida) return;
    salida.textContent = formatoBs(total());
    if (animar && window.jQuery) {
      jQuery(salida).stop(true, true).animate({ opacity: 0.3 }, 110).animate({ opacity: 1 }, 220);
    }
  }

  /* ── Modal con temporizador de 30 s ────────────────────── */
  function pintarTimer() {
    var salida = $('#s3Timer .pz-timer__value');
    if (salida) salida.textContent = '00:' + String(Math.max(0, estado.segundos)).padStart(2, '0');
    var caja = $('#s3Timer');
    if (caja) caja.classList.toggle('pz-timer--urgente', estado.segundos <= 10);
  }

  function detenerTimer() {
    if (estado.intervalo) {
      clearInterval(estado.intervalo);
      estado.intervalo = null;
    }
  }

  function abrirModal() {
    var modal = $('#s3Modal');
    if (!modal) return;
    modal.removeAttribute('hidden');
    if (window.jQuery) jQuery(modal).hide().fadeIn(160);
    detenerTimer();
    estado.segundos = SEGUNDOS_MODAL;
    pintarTimer();
    log('Modal abierto con temporizador de 30 s.', 'info');

    estado.intervalo = setInterval(function () {
      estado.segundos -= 1;
      pintarTimer();
      if (estado.segundos <= 0) {
        detenerTimer();
        cerrarModal();
        aviso('El tiempo terminó. Vuelve a intentarlo.', true);
        log('El temporizador expiró y el modal se cerró solo.', 'error');
      }
    }, 1000);
  }

  function cerrarModal() {
    detenerTimer();
    var modal = $('#s3Modal');
    if (!modal) return;
    if (window.jQuery) {
      jQuery(modal).stop(true, true).fadeOut(200, function () { jQuery(this).attr('hidden', 'hidden'); });
    } else {
      modal.setAttribute('hidden', 'hidden');
    }
  }

  /* ── Tema y PWA ────────────────────────────────────────── */
  function aplicarTema(tema) {
    var oscuro = tema !== 'claro';
    document.documentElement.setAttribute('data-tema', oscuro ? 'oscuro' : 'claro');
    var boton = $('#btnTema');
    if (boton) {
      boton.innerHTML = '';
      boton.appendChild(document.createTextNode(oscuro ? '☾ ' : '☀ '));
      var span = document.createElement('span');
      span.textContent = oscuro ? 'Modo claro' : 'Modo oscuro';
      boton.appendChild(span);
      boton.setAttribute('aria-pressed', String(oscuro));
    }
    try { localStorage.setItem(CLAVE_TEMA, oscuro ? 'oscuro' : 'claro'); } catch (e) { /* noop */ }
  }

  function initPwa() {
    var prompt = null;
    var boton = $('#btnInstalarPWA');
    window.addEventListener('beforeinstallprompt', function (evento) {
      evento.preventDefault();
      prompt = evento;
      if (boton) boton.removeAttribute('hidden');
      log('La demo se puede instalar como PWA.', 'ok');
    });
    if (boton) {
      boton.addEventListener('click', function () {
        if (!prompt) return;
        prompt.prompt();
        prompt.userChoice.then(function (eleccion) {
          log('Instalación PWA: ' + eleccion.outcome, 'info');
          prompt = null;
        });
      });
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('../sw.js').then(function (registro) {
        log('Service Worker activo en ' + registro.scope.replace(location.origin, ''), 'ok');
      }).catch(function (error) {
        log('Service Worker no disponible: ' + error.message, 'error');
      });
    }
  }

  /* ── Arranque ──────────────────────────────────────────── */
  function iniciar() {
    var contenedor = $('#contenido');
    if (!contenedor || contenedor.getAttribute('data-hidratado') === 'true') return;
    contenedor.setAttribute('data-hidratado', 'true');

    var anio = $('#s3Anio');
    if (anio) anio.textContent = String(new Date().getFullYear());

    var guardado = null;
    try { guardado = localStorage.getItem(CLAVE_TEMA); } catch (e) { /* noop */ }
    aplicarTema(guardado === 'claro' ? 'claro' : 'oscuro');

    estado.items = DEMO.slice();
    render();
    pintarTotal(false);
    initPwa();
    log('Interfaz hidratada una sola vez.', 'ok');
    log('jQuery ' + (window.jQuery ? jQuery.fn.jquery : 'no cargado') + ' · DOMPurify ' + (window.DOMPurify ? DOMPurify.version : 'no disponible'), 'info');

    document.addEventListener('click', function (evento) {
      var tema = evento.target.closest('#btnTema');
      if (tema) {
        var oscuro = document.documentElement.getAttribute('data-tema') !== 'claro';
        aplicarTema(oscuro ? 'claro' : 'oscuro');
        log('Tema cambiado a ' + (oscuro ? 'claro' : 'oscuro') + '.', 'info');
        return;
      }

      var agregar = evento.target.closest('[data-accion="agregar"]');
      if (agregar) {
        var id = agregar.getAttribute('data-id');
        var item = estado.items.filter(function (x) { return x.id === id; })[0];
        aviso('“' + (item ? item.nombre : 'Paquete') + '” agregado (demo).');
        log('Agregó ' + (item ? item.nombre : id) + '.', 'ok');
        return;
      }

      var zoom = evento.target.closest('[data-accion="zoom"]');
      if (zoom) {
        var idZoom = zoom.getAttribute('data-id');
        var encontrado = estado.items.filter(function (x) { return x.id === idZoom; })[0];
        aviso('Zoom de ' + (encontrado ? encontrado.nombre : idZoom) + ' (demo).', false);
        log('Abrió el zoom de ' + (encontrado ? encontrado.nombre : idZoom) + '.', 'info');
        return;
      }

      var chip = evento.target.closest('#s3Chips .pz-chip');
      if (chip) {
        estado.filtro = chip.getAttribute('data-categoria');
        $$('#s3Chips .pz-chip').forEach(function (c) {
          var activo = c === chip;
          c.classList.toggle('pz-chip--active', activo);
          c.setAttribute('aria-selected', String(activo));
        });
        var select = $('#s3Categoria');
        if (select) select.value = estado.filtro;
        render();
        log('Filtro: ' + estado.filtro, 'info');
        return;
      }

      if (evento.target.closest('[data-cerrar]')) {
        cerrarModal();
        return;
      }
    });

    var buscador = $('#s3Busqueda');
    if (buscador) {
      buscador.addEventListener('keyup', function () {
        estado.busqueda = buscador.value;
        if (buscador.value.trim() && estado.filtro !== 'todas') {
          estado.filtro = 'todas';
          $$('#s3Chips .pz-chip').forEach(function (c) {
            c.classList.toggle('pz-chip--active', c.getAttribute('data-categoria') === 'todas');
          });
          var sel = $('#s3Categoria');
          if (sel) sel.value = 'todas';
        }
        render();
        if (buscador.value.length >= 2) log('Búsqueda: “' + buscador.value + '”', 'info');
      });
    }

    var selectCat = $('#s3Categoria');
    if (selectCat) {
      selectCat.addEventListener('change', function () {
        estado.filtro = selectCat.value;
        $$('#s3Chips .pz-chip').forEach(function (c) {
          c.classList.toggle('pz-chip--active', c.getAttribute('data-categoria') === estado.filtro);
        });
        render();
      });
    }

    var rango = $('#s3Horas');
    if (rango) {
      rango.addEventListener('input', function () {
        estado.horas = Number(rango.value) || BASE_HORAS;
        var salida = $('#s3HorasSalida');
        if (salida) salida.textContent = String(estado.horas);
        pintarTotal(true);
      });
    }

    var reservar = $('#s3Reservar');
    if (reservar) reservar.addEventListener('click', abrirModal);

    var confirmar = $('#s3Confirmar');
    if (confirmar) {
      confirmar.addEventListener('click', function () {
        cerrarModal();
        aviso('Reserva confirmada (demo).');
        log('Reserva confirmada por ' + formatoBs(total()) + '.', 'ok');
      });
    }

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') cerrarModal();
    });

    /* Demo XSS */
    var sanitizar = $('#s3Sanitizar');
    if (sanitizar) {
      sanitizar.addEventListener('click', function () {
        var entrada = $('#s3TextoSucio');
        var salida = $('#s3SalidaSegura');
        var limpio = window.DOMPurify
          ? window.DOMPurify.sanitize(entrada.value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
          : String(entrada.value).replace(/[<>&"]/g, '');
        salida.textContent = 'Resultado seguro: ' + limpio;
        salida.classList.add('s3-xss__salida--ok');
        log('Texto sanitizado con DOMPurify.', 'ok');
      });
    }

    var inyectar = $('#s3Inyectar');
    if (inyectar) {
      inyectar.addEventListener('click', function () {
        var entrada = $('#s3TextoSucio');
        var salida = $('#s3SalidaSegura');
        /* Demostración del riesgo: el texto se inserta como nodo de texto,
           así que incluso aquí el navegador no ejecuta la etiqueta. */
        salida.textContent = 'Intento bloqueado (innerHTML no se usa): ' + entrada.value;
        salida.classList.remove('s3-xss__salida--ok');
        log('Se intentó inyectar HTML: bloqueado por textContent.', 'error');
      });
    }

    var limpiar = $('#s3LimpiarLog');
    if (limpiar) {
      limpiar.addEventListener('click', function () {
        var caja = $('#logOutput');
        if (caja) caja.innerHTML = '';
        log('Bitácora limpiada.', 'info');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
