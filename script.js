/* =========================================================
   PARTY ZONE · LÓGICA PRINCIPAL + AUTH ADMIN/CLIENTE + PANEL
   ========================================================= */
(function () {
  'use strict';

  const TELEFONO_WA = '59167301760';
  const STORAGE_KEYS = {
    tema: 'pz_tema_v1',
    carrito: 'pz_cotizacion_v1',
    bitacora: 'pz_bitacora_v1',
    vistaSimulada: 'pz_vista_movil_v1',
    sesion: 'pz_sesion_actual_v1'
  };

  const estado = {
    catalogo: Array.isArray(window.CATALOGO_PARTYZONE) ? window.CATALOGO_PARTYZONE : [],
    filtroCategoria: 'todas',
    busqueda: '',
    orden: 'relevancia',
    carrito: [],
    turnoSeleccionado: 'Mañana (09:00 a 14:00)',
    fechaConsulta: '',
    itemZoomActual: null,
    timerId: null,
    segundosRestantes: 30,
    deferredPrompt: null,
    usuarioActual: null,
    reservasCargadas: [],
    filtroAdminPago: 'todos'
  };

  /* ---------------------------------------------------------
     1. DETECTOR AUTOMÁTICO DE EXTENSIONES (.png / .jpg / .jpeg)
     --------------------------------------------------------- */
  function resolverExtensionImagen(imgEl) {
    if (!imgEl || imgEl.dataset.imgResuelto === '1') return;
    const base = imgEl.getAttribute('data-img-base');
    if (!base) return;

    const extensiones = ['.png', '.jpg', '.jpeg', '.webp'];
    const actualSrc = imgEl.getAttribute('src') || '';
    let intento = Number(imgEl.dataset.imgIntento || 0);

    while (intento < extensiones.length && actualSrc.endsWith(extensiones[intento])) {
      intento++;
    }

    if (intento < extensiones.length) {
      imgEl.dataset.imgIntento = String(intento + 1);
      imgEl.src = base + extensiones[intento];
    } else {
      imgEl.dataset.imgResuelto = '1';
      imgEl.src = 'img/logo.png';
    }
  }

  document.addEventListener('error', function (e) {
    const target = e.target;
    if (target && target.tagName === 'IMG' && target.hasAttribute('data-img-base')) {
      resolverExtensionImagen(target);
    }
  }, true);

  /* ---------------------------------------------------------
     2. UTILIDADES DE SEGURIDAD, LOG Y TOAST
     --------------------------------------------------------- */
  function sanitizar(texto) {
    const str = String(texto == null ? '' : texto);
    if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
      return window.DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    }
    return str.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function registrarLog(mensaje) {
    const hora = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const linea = `[${hora}] ${sanitizar(mensaje)}`;
    const out = document.getElementById('logOutput');
    if (out) {
      const div = document.createElement('div');
      div.textContent = linea;
      out.prepend(div);
    }
    try {
      const prev = JSON.parse(localStorage.getItem(STORAGE_KEYS.bitacora) || '[]');
      prev.unshift(linea);
      localStorage.setItem(STORAGE_KEYS.bitacora, JSON.stringify(prev.slice(0, 40)));
    } catch (_) {}
  }

  let toastTimeout = null;
  function mostrarToast(mensaje, tipo) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = mensaje;
    toast.classList.toggle('pz-toast--error', tipo === 'error');
    toast.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.hidden = true; }, 3200);
  }

  function formatearBs(valor) {
    return 'Bs ' + Number(valor || 0).toLocaleString('es-BO');
  }

  /* ---------------------------------------------------------
     3. MODO CELULAR 📱 / LAPTOP 💻 Y VISTAS SIN SCROLL GLOBAL
     --------------------------------------------------------- */
  function esDispositivoMovilReal() {
    return window.matchMedia('(max-width: 768px)').matches
      || window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
  }

  function esVistaCelularActiva() {
    return document.body.classList.contains('vista-movil-simulada') || esDispositivoMovilReal();
  }

  function actualizarBotonVista(simulado) {
    const btn = document.getElementById('btnVistaMovil');
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(simulado));
    const icon = btn.querySelector('.view-icon');
    const label = btn.querySelector('.view-label');
    if (icon) icon.textContent = simulado ? '💻' : '📱';
    if (label) label.textContent = simulado ? 'Laptop' : 'Móvil';
    btn.title = simulado ? 'Volver a vista completa de Laptop' : 'Simular vista de Celular sin scroll global';
  }

  function activarVista(idSeccion, hacerScroll) {
    if (!idSeccion) return;
    const destino = document.getElementById(idSeccion);
    if (!destino) return;

    document.querySelectorAll('.vista-seccion').forEach(sec => sec.classList.remove('is-vista-activa'));
    destino.classList.add('is-vista-activa');
    destino.scrollTop = 0;

    document.querySelectorAll('.pz-nav__link').forEach(a => {
      a.classList.toggle('active', a.getAttribute('data-vista-target') === idSeccion);
    });

    document.querySelectorAll('.pz-dock__link').forEach(a => {
      a.classList.toggle('is-active', a.getAttribute('data-vista-target') === idSeccion);
    });

    const drop = document.getElementById('navMobileDrop');
    const btnMenu = document.getElementById('btnMenu');
    if (drop && !drop.hidden) {
      drop.hidden = true;
      if (btnMenu) btnMenu.setAttribute('aria-expanded', 'false');
    }

    if (idSeccion === 'panel-cuenta' && estado.usuarioActual) {
      cargarYRenderizarPanel();
    }

    if (hacerScroll && !esVistaCelularActiva()) {
      destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ---------------------------------------------------------
     4. AUTENTICACIÓN (LOGIN / REGISTRO) Y PANEL ADMIN / CLIENTE
     --------------------------------------------------------- */
  function cargarSesionGuardada() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.sesion);
      if (raw) estado.usuarioActual = JSON.parse(raw);
    } catch (_) {}
  }

  function guardarSesion(usuario) {
    estado.usuarioActual = usuario;
    try {
      if (usuario) {
        localStorage.setItem(STORAGE_KEYS.sesion, JSON.stringify(usuario));
      } else {
        localStorage.removeItem(STORAGE_KEYS.sesion);
      }
    } catch (_) {}
    actualizarInterfazSesion();
  }

  function abrirModalAuth(tabInicial) {
    const modal = document.getElementById('modalAuth');
    if (!modal) return;
    cambiarTabAuth(tabInicial || 'login');
    modal.hidden = false;
  }

  function cambiarTabAuth(tab) {
    const esRegistro = tab === 'registro';
    const tabLogin = document.getElementById('tabLogin');
    const tabReg = document.getElementById('tabRegistro');
    const formLogin = document.getElementById('formLogin');
    const formReg = document.getElementById('formRegistro');
    const titulo = document.getElementById('tituloAuth');

    if (tabLogin) tabLogin.classList.toggle('is-active', !esRegistro);
    if (tabReg) tabReg.classList.toggle('is-active', esRegistro);
    if (formLogin) formLogin.hidden = esRegistro;
    if (formReg) formReg.hidden = !esRegistro;
    if (titulo) titulo.textContent = esRegistro ? 'Crea tu Cuenta en Party Zone' : 'Inicia Sesión en Party Zone';
  }

  function actualizarInterfazSesion() {
    const user = estado.usuarioActual;
    const textoHeader = document.getElementById('textoCuentaHeader');
    const navPanel = document.getElementById('navLinkPanel');
    const mobilePanel = document.getElementById('mobileLinkPanel');
    const panelSin = document.getElementById('panelSinSesion');
    const panelCon = document.getElementById('panelConSesion');
    const btnAbrirAuth = document.getElementById('btnAbrirAuthPanel');
    const btnRefrescar = document.getElementById('btnRefrescarPanel');
    const btnCerrar = document.getElementById('btnCerrarSesion');
    const eyebrow = document.getElementById('eyebrowPanel');
    const titulo = document.getElementById('tituloPanelCuenta');
    const lead = document.getElementById('leadPanelCuenta');
    const adminKpis = document.getElementById('adminKpis');
    const filtrosAdmin = document.getElementById('filtrosAdminPagos');

    if (!user) {
      if (textoHeader) textoHeader.textContent = 'Ingresar';
      if (navPanel) navPanel.hidden = true;
      if (mobilePanel) mobilePanel.textContent = '👤 Mi Cuenta / Panel Admin';
      if (panelSin) panelSin.hidden = false;
      if (panelCon) panelCon.hidden = true;
      if (btnAbrirAuth) btnAbrirAuth.hidden = false;
      if (btnRefrescar) btnRefrescar.hidden = true;
      if (btnCerrar) btnCerrar.hidden = true;
      if (eyebrow) eyebrow.innerHTML = '<span aria-hidden="true">🔐</span> Gestión Party Zone';
      if (titulo) titulo.textContent = 'Acceso Cliente y Administración';
      if (lead) lead.textContent = 'Inicia sesión o regístrate para ver tus pagos y reservas, o entra como administrador para confirmar pagos.';
      return;
    }

    const esAdmin = user.rol === 'admin';
    const primerNombre = String(user.nombre || 'Usuario').split(' ')[0];

    if (textoHeader) textoHeader.textContent = esAdmin ? 'Admin' : primerNombre;
    if (navPanel) {
      navPanel.hidden = false;
      navPanel.textContent = esAdmin ? 'Panel Admin' : 'Mis Reservas';
    }
    if (mobilePanel) {
      mobilePanel.textContent = esAdmin ? '🛡️ Panel Administrador (Pagos)' : '🎟️ Mis Reservas y Pagos';
    }
    if (panelSin) panelSin.hidden = true;
    if (panelCon) panelCon.hidden = false;
    if (btnAbrirAuth) btnAbrirAuth.hidden = true;
    if (btnRefrescar) btnRefrescar.hidden = false;
    if (btnCerrar) btnCerrar.hidden = false;

    if (eyebrow) {
      eyebrow.innerHTML = esAdmin
        ? '<span aria-hidden="true">🛡️</span> Vista Administrador · Control de Ventas y Pagos'
        : `<span aria-hidden="true">🎟️</span> Hola, ${sanitizar(user.nombre)}`;
    }
    if (titulo) {
      titulo.textContent = esAdmin
        ? 'Bitácora de Ventas, Reservas y Confirmación de Pagos'
        : 'Mis Reservas y Estado de Pagos';
    }
    if (lead) {
      lead.textContent = esAdmin
        ? 'Confirma anticipos (30%) o pagos totales recibidos y aprueba los turnos solicitados por los clientes.'
        : 'Aquí puedes verificar en tiempo real si tu reserva y pago ya fueron confirmados por Party Zone.';
    }

    if (adminKpis) adminKpis.hidden = !esAdmin;
    if (filtrosAdmin) filtrosAdmin.hidden = !esAdmin;
  }

  async function cargarYRenderizarPanel() {
    const user = estado.usuarioActual;
    const contenedor = document.getElementById('listaReservasPanel');
    if (!user || !contenedor) return;

    contenedor.innerHTML = '<p class="pz-quote__empty">Cargando registros desde Supabase…</p>';

    try {
      const lista = await window.PartyZoneSupabase.listarReservas(user);
      estado.reservasCargadas = Array.isArray(lista) ? lista : [];
      renderizarListaPanel();
    } catch (err) {
      contenedor.innerHTML = '<p class="pz-quote__empty">No se pudieron cargar los registros en este momento.</p>';
    }
  }

  function renderizarListaPanel() {
    const user = estado.usuarioActual;
    const contenedor = document.getElementById('listaReservasPanel');
    if (!user || !contenedor) return;

    const esAdmin = user.rol === 'admin';
    const todas = estado.reservasCargadas;

    if (esAdmin) {
      const confirmadas = todas.filter(r => r.estado_pago === 'anticipo_pagado' || r.estado_pago === 'pagado_total');
      const pendientes = todas.filter(r => !r.estado_pago || r.estado_pago === 'pendiente');
      const montoConfirmado = confirmadas.reduce((acc, r) => {
        if (r.estado_pago === 'pagado_total') return acc + Number(r.total_estimado || 0);
        return acc + Number(r.anticipo_estimado || Math.round(Number(r.total_estimado || 0) * 0.3));
      }, 0);

      const elTot = document.getElementById('kpiTotalReservas');
      const elConf = document.getElementById('kpiPagosConfirmados');
      const elPend = document.getElementById('kpiPagosPendientes');
      const elMonto = document.getElementById('kpiMontoConfirmado');
      if (elTot) elTot.textContent = String(todas.length);
      if (elConf) elConf.textContent = String(confirmadas.length);
      if (elPend) elPend.textContent = String(pendientes.length);
      if (elMonto) elMonto.textContent = formatearBs(montoConfirmado);
    }

    let filtradas = todas;
    if (esAdmin && estado.filtroAdminPago !== 'todos') {
      filtradas = todas.filter(r => (r.estado_pago || 'pendiente') === estado.filtroAdminPago);
    }

    if (filtradas.length === 0) {
      contenedor.innerHTML = `<p class="pz-quote__empty">${
        esAdmin
          ? 'Aún no hay reservas registradas en esta categoría.'
          : 'Aún no tienes reservas asociadas a tu cuenta. ¡Arma tu evento en el Cotizador!'
      }</p>`;
      return;
    }

    contenedor.innerHTML = filtradas.map(r => {
      const pago = r.estado_pago || 'pendiente';
      const estadoRes = r.estado || 'pendiente';
      const clasePago = pago === 'pagado_total'
        ? 'pz-pill-estado--pagado'
        : pago === 'anticipo_pagado'
          ? 'pz-pill-estado--anticipo'
          : 'pz-pill-estado--pendiente';
      const textoPago = pago === 'pagado_total'
        ? '✅ Pagado Total'
        : pago === 'anticipo_pagado'
          ? '💳 Anticipo 30% Confirmado'
          : '⏳ Pago Pendiente';

      const textoReserva = estadoRes === 'confirmada'
        ? '🎉 Fecha Confirmada'
        : estadoRes === 'cancelada'
          ? '✖ Cancelada'
          : '🗓️ En revisión';

      const botonesAdmin = esAdmin ? `
        <div class="pz-reserva-card__admin-bar">
          <button class="pz-btn pz-btn--ghost pz-btn--small" type="button" data-admin-id="${sanitizar(r.id)}" data-admin-accion="anticipo">💳 Confirmar Anticipo</button>
          <button class="pz-btn pz-btn--primary pz-btn--small" type="button" data-admin-id="${sanitizar(r.id)}" data-admin-accion="pagado">✅ Confirmar Pago Total</button>
          <button class="pz-btn pz-btn--ghost pz-btn--small" type="button" data-admin-id="${sanitizar(r.id)}" data-admin-accion="pendiente">⏳ Marcar Pendiente</button>
        </div>
      ` : '';

      return `
        <article class="pz-reserva-card">
          <div class="pz-reserva-card__top">
            <div>
              <strong>${sanitizar(r.nombre)}</strong> · <span>📱 ${sanitizar(r.telefono)}</span>
              <div style="font-size:0.82rem;color:var(--muted);">Fecha evento: <strong>${sanitizar(r.fecha_evento)}</strong> · ${sanitizar(r.turno)}</div>
            </div>
            <div class="pz-reserva-card__badges">
              <span class="pz-pill-estado ${clasePago}">${textoPago}</span>
              <span class="pz-pill-estado pz-pill-estado--anticipo">${textoReserva}</span>
            </div>
          </div>
          <div class="pz-reserva-card__detalle">
            <div><strong>Evento:</strong> ${sanitizar(r.tipo_evento)} (${sanitizar(r.ninos)} niños, ${sanitizar(r.adultos)} adultos)</div>
            <div><strong>Selección:</strong> ${sanitizar(r.seleccion).replace(/\n/g, ' · ')}</div>
            <div><strong>Total referencial:</strong> ${formatearBs(r.total_estimado)} · <strong>Anticipo (30%):</strong> ${formatearBs(r.anticipo_estimado || Math.round(Number(r.total_estimado || 0) * 0.3))}</div>
            ${r.notas ? `<div><strong>Notas:</strong> ${sanitizar(r.notas)}</div>` : ''}
          </div>
          ${botonesAdmin}
        </article>
      `;
    }).join('');
  }

  /* ---------------------------------------------------------
     5. TEMA (OSCURO / CLARO), RED Y CONTROLES UI
     --------------------------------------------------------- */
  function aplicarTema(tema) {
    const esClaro = tema === 'claro';
    const val = esClaro ? 'claro' : 'oscuro';
    document.documentElement.setAttribute('data-tema', val);
    document.body.setAttribute('data-tema', val);

    const btn = document.getElementById('btnTema');
    if (btn) {
      btn.setAttribute('aria-pressed', String(!esClaro));
      btn.setAttribute('aria-label', esClaro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
      const icon = btn.querySelector('.pz-btn__icon');
      const text = btn.querySelector('.pz-btn__text');
      if (icon) icon.textContent = esClaro ? '☀' : '☾';
      if (text) text.textContent = esClaro ? 'Modo oscuro' : 'Modo claro';
    }
    try { localStorage.setItem(STORAGE_KEYS.tema, val); } catch (_) {}
  }

  function actualizarEstadoRed() {
    const pill = document.getElementById('estadoRed');
    if (!pill) return;
    const online = navigator.onLine;
    pill.textContent = online ? 'En Línea' : 'Offline';
    pill.classList.toggle('is-offline', !online);
  }

  function inicializarControlesUI() {
    let temaGuardado = 'oscuro';
    try { temaGuardado = localStorage.getItem(STORAGE_KEYS.tema) || 'oscuro'; } catch (_) {}
    aplicarTema(temaGuardado);

    const btnTema = document.getElementById('btnTema');
    if (btnTema) {
      btnTema.addEventListener('click', () => {
        const actual = document.documentElement.getAttribute('data-tema');
        const nuevo = actual === 'claro' ? 'oscuro' : 'claro';
        aplicarTema(nuevo);
        mostrarToast(nuevo === 'oscuro' ? '🌙 Modo Noche activado' : '☀️ Modo Día activado');
        registrarLog(`Tema cambiado a modo ${nuevo}.`);
      });
    }

    if (localStorage.getItem(STORAGE_KEYS.vistaSimulada) === '1' && !esDispositivoMovilReal()) {
      document.body.classList.add('vista-movil-simulada');
      actualizarBotonVista(true);
    }

    const btnVistaMovil = document.getElementById('btnVistaMovil');
    if (btnVistaMovil) {
      btnVistaMovil.addEventListener('click', () => {
        const activo = document.body.classList.toggle('vista-movil-simulada');
        try { localStorage.setItem(STORAGE_KEYS.vistaSimulada, activo ? '1' : '0'); } catch (_) {}
        actualizarBotonVista(activo);

        const actual = document.querySelector('.vista-seccion.is-vista-activa')?.id || 'inicio-vista';
        activarVista(actual, !activo);
        mostrarToast(activo ? '📱 Vista Celular activada (sin scroll global)' : '💻 Vista Laptop restaurada');
      });
    }

    window.addEventListener('resize', () => {
      if (esDispositivoMovilReal() && document.body.classList.contains('vista-movil-simulada')) {
        document.body.classList.remove('vista-movil-simulada');
        actualizarBotonVista(false);
      }
    });

    document.addEventListener('click', e => {
      const targetEl = e.target.closest('[data-vista-target]');
      if (!targetEl) return;
      const seccionId = targetEl.getAttribute('data-vista-target');
      if (!seccionId) return;
      e.preventDefault();
      activarVista(seccionId, true);
    });

    const btnMenu = document.getElementById('btnMenu');
    const drop = document.getElementById('navMobileDrop');
    if (btnMenu && drop) {
      btnMenu.addEventListener('click', () => {
        const estabaOculto = drop.hidden;
        drop.hidden = !estabaOculto;
        btnMenu.setAttribute('aria-expanded', String(estabaOculto));
      });
    }

    actualizarEstadoRed();
    window.addEventListener('online', actualizarEstadoRed);
    window.addEventListener('offline', actualizarEstadoRed);
  }

  /* ---------------------------------------------------------
     6. RENDERIZADO DEL CATÁLOGO (PAQUETES + TEMÁTICAS)
     --------------------------------------------------------- */
  function obtenerItemsFiltrados() {
    const q = estado.busqueda.trim().toLowerCase();
    let lista = estado.catalogo.filter(item => {
      const okCat = estado.filtroCategoria === 'todas' || item.categoria === estado.filtroCategoria;
      if (!okCat) return false;
      if (!q) return true;
      const texto = `${item.nombre} ${item.categoriaTexto} ${item.descripcion} ${(item.detalles || []).join(' ')}`.toLowerCase();
      return texto.includes(q);
    });

    if (estado.orden === 'precio-asc') {
      lista = [...lista].sort((a, b) => a.precio - b.precio);
    } else if (estado.orden === 'precio-desc') {
      lista = [...lista].sort((a, b) => b.precio - a.precio);
    } else if (estado.orden === 'nombre') {
      lista = [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    }
    return lista;
  }

  function renderizarCatalogo() {
    const grid = document.getElementById('gridCatalogo');
    const vacio = document.getElementById('estadoVacio');
    const contador = document.getElementById('contadorResultados');
    if (!grid) return;

    const items = obtenerItemsFiltrados();
    if (contador) {
      contador.textContent = `${items.length} ${items.length === 1 ? 'opción disponible' : 'opciones disponibles'}`;
    }

    if (items.length === 0) {
      grid.innerHTML = '';
      if (vacio) vacio.hidden = false;
      return;
    }
    if (vacio) vacio.hidden = true;

    grid.innerHTML = items.map(item => {
      const esPaquete = item.categoria === 'paquetes';
      const detallesHtml = (item.detalles || [])
        .map(d => `<li>${sanitizar(d)}</li>`)
        .join('');

      return `
        <article class="pz-card ${esPaquete ? 'pz-card--paquete' : ''}" data-id="${sanitizar(item.id)}">
          <div class="pz-card__media">
            <span class="pz-card__badge">${sanitizar(item.badge || item.categoriaTexto)}</span>
            <img class="pz-card__img" src="${sanitizar(item.imagen)}" data-img-base="${sanitizar(item.imagenBase)}" alt="${sanitizar(item.nombre)}" loading="lazy" data-accion="zoom">
            <button class="pz-card__zoom" type="button" data-accion="zoom">🔍 Detalle</button>
          </div>
          <div class="pz-card__body">
            <p class="pz-card__cat">${sanitizar(item.categoriaTexto)}</p>
            <h3 class="pz-card__title">${sanitizar(item.nombre)}</h3>
            <p class="pz-card__desc">${sanitizar(item.descripcion)}</p>
            <ul class="pz-card__details" hidden>${detallesHtml}</ul>
            <div class="pz-card__foot">
              <span class="pz-card__price">${sanitizar(item.precioTexto || formatearBs(item.precio))}</span>
              <div class="pz-card__actions">
                <button class="pz-btn pz-btn--ghost pz-btn--small" type="button" data-accion="detalles" aria-expanded="false">Incluye</button>
                <button class="pz-btn pz-btn--primary pz-btn--small" type="button" data-accion="agregar">+ Elegir</button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  /* ---------------------------------------------------------
     7. COTIZADOR
     --------------------------------------------------------- */
  function guardarCarrito() {
    try { localStorage.setItem(STORAGE_KEYS.carrito, JSON.stringify(estado.carrito)); } catch (_) {}
  }

  function cargarCarrito() {
    try {
      const guardado = JSON.parse(localStorage.getItem(STORAGE_KEYS.carrito) || '[]');
      if (Array.isArray(guardado)) estado.carrito = guardado;
    } catch (_) {}
  }

  function agregarAlCotizador(id) {
    const item = estado.catalogo.find(x => x.id === id);
    if (!item) return;

    if (item.categoria === 'paquetes') {
      estado.carrito = estado.carrito.filter(x => x.categoria !== 'paquetes');
    }

    const existente = estado.carrito.find(x => x.id === id);
    if (existente) {
      existente.cantidad += 1;
    } else {
      estado.carrito.push({
        id: item.id,
        nombre: item.nombre,
        categoria: item.categoria,
        precio: Number(item.precio || 0),
        precioTexto: item.precioTexto || '',
        cantidad: 1
      });
    }

    guardarCarrito();
    renderizarCotizador();
    mostrarToast(`✓ Agregado: ${item.nombre}`);
    registrarLog(`Seleccionado en cotizador: ${item.nombre}`);
  }

  function cambiarCantidad(id, delta) {
    const idx = estado.carrito.findIndex(x => x.id === id);
    if (idx === -1) return;
    estado.carrito[idx].cantidad += delta;
    if (estado.carrito[idx].cantidad <= 0) {
      estado.carrito.splice(idx, 1);
    }
    guardarCarrito();
    renderizarCotizador();
  }

  function calcularTotal() {
    return estado.carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  }

  function renderizarCotizador() {
    const lista = document.getElementById('listaCotizacion');
    const vacio = document.getElementById('cotizadorVacio');
    const totalEl = document.getElementById('totalCotizacion');
    const anticipoEl = document.getElementById('anticipoCotizacion');
    if (!lista) return;

    if (estado.carrito.length === 0) {
      lista.innerHTML = '';
      if (vacio) vacio.hidden = false;
      if (totalEl) totalEl.textContent = 'Bs 0';
      if (anticipoEl) anticipoEl.textContent = 'Bs 0';
      return;
    }

    if (vacio) vacio.hidden = true;
    lista.innerHTML = estado.carrito.map(item => `
      <li class="pz-quote__item">
        <div class="pz-quote__item-info">
          <strong>${sanitizar(item.nombre)}</strong>
          <span>${item.precio > 0 ? formatearBs(item.precio * item.cantidad) : sanitizar(item.precioTexto || 'Incluida en paquete')}</span>
        </div>
        <div class="pz-quote__qty">
          <button class="pz-qty-btn" type="button" data-qty-id="${sanitizar(item.id)}" data-delta="-1" aria-label="Quitar">−</button>
          <span>${item.cantidad}</span>
          <button class="pz-qty-btn" type="button" data-qty-id="${sanitizar(item.id)}" data-delta="1" aria-label="Sumar">+</button>
        </div>
      </li>
    `).join('');

    const total = calcularTotal();
    const anticipo = Math.round(total * 0.30);
    if (totalEl) totalEl.textContent = total > 0 ? formatearBs(total) : 'A confirmar en visita';
    if (anticipoEl) anticipoEl.textContent = total > 0 ? formatearBs(anticipo) : 'Bs 0';
  }

  /* ---------------------------------------------------------
     8. TURNOS, MODAL ZOOM Y MODAL RESERVA
     --------------------------------------------------------- */
  function inicializarTurnos() {
    const fechaInput = document.getElementById('fechaConsultaTurno');
    const resumen = document.getElementById('resumenTurnoSeleccionado');
    const selectCotizador = document.getElementById('turnoEventoSelect');
    const cards = document.querySelectorAll('.pz-turno-card');

    const hoy = new Date().toISOString().split('T')[0];
    if (fechaInput) {
      fechaInput.min = hoy;
      fechaInput.addEventListener('change', () => {
        estado.fechaConsulta = fechaInput.value;
        const reservaFecha = document.getElementById('reservaFecha');
        if (reservaFecha && fechaInput.value) reservaFecha.value = fechaInput.value;
        actualizarTextoTurno();
        registrarLog(`Fecha consultada en calendario: ${fechaInput.value}`);
      });
    }

    function actualizarTextoTurno() {
      if (!resumen) return;
      const fechaTxt = estado.fechaConsulta ? ` para el <strong>${sanitizar(estado.fechaConsulta)}</strong>` : '';
      resumen.innerHTML = `Turno elegido: <strong>${sanitizar(estado.turnoSeleccionado)}</strong>${fechaTxt}`;
    }

    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
        estado.turnoSeleccionado = card.getAttribute('data-turno') || estado.turnoSeleccionado;
        if (selectCotizador) selectCotizador.value = estado.turnoSeleccionado;
        actualizarTextoTurno();
      });
    });

    if (selectCotizador) {
      selectCotizador.addEventListener('change', () => {
        estado.turnoSeleccionado = selectCotizador.value;
        actualizarTextoTurno();
      });
    }
  }

  function abrirModalZoom(datos) {
    const modal = document.getElementById('modalZoom');
    const img = document.getElementById('imagenZoom');
    const titulo = document.getElementById('tituloZoom');
    const precio = document.getElementById('precioZoom');
    const texto = document.getElementById('textoZoom');
    const lista = document.getElementById('detallesZoom');
    const btnAgregar = document.getElementById('btnAgregarZoom');
    if (!modal || !img) return;

    estado.itemZoomActual = datos.id || null;
    img.dataset.imgResuelto = '0';
    img.dataset.imgIntento = '0';
    if (datos.imagenBase) img.setAttribute('data-img-base', datos.imagenBase);
    img.src = datos.imagen || (datos.imagenBase + '.png');
    img.alt = datos.nombre || 'Vista Party Zone';

    if (titulo) titulo.textContent = datos.nombre || 'Ambiente Party Zone';
    if (precio) precio.textContent = datos.precioTexto || 'Salón Party Zone · Miraflores';
    if (texto) texto.textContent = datos.descripcion || 'Instalaciones equipadas en Av. Busch #1159, Edificio Jimena Natividad.';
    if (lista) {
      lista.innerHTML = (datos.detalles || []).map(d => `<li>${sanitizar(d)}</li>`).join('');
    }
    if (btnAgregar) btnAgregar.hidden = !datos.id;

    modal.hidden = false;
  }

  function detenerTemporizador() {
    if (estado.timerId) {
      clearInterval(estado.timerId);
      estado.timerId = null;
    }
  }

  function abrirModalReserva() {
    const modal = document.getElementById('modalReserva');
    const resumen = document.getElementById('resumenReserva');
    const timerBox = document.getElementById('temporizadorReserva');
    const timerVal = timerBox ? timerBox.querySelector('.pz-timer__value') : null;
    const errorEl = document.getElementById('errorReserva');
    if (!modal) return;

    if (errorEl) errorEl.textContent = '';

    // Autorrellenar datos si el usuario inició sesión
    if (estado.usuarioActual) {
      const inpNombre = document.getElementById('reservaNombre');
      const inpTel = document.getElementById('reservaTelefono');
      if (inpNombre && !inpNombre.value) inpNombre.value = estado.usuarioActual.nombre || '';
      if (inpTel && !inpTel.value) inpTel.value = estado.usuarioActual.telefono || '';
    }

    const tipoEvento = document.getElementById('tipoEventoSelect')?.value || 'Piñata / Infantil';
    const turno = document.getElementById('turnoEventoSelect')?.value || estado.turnoSeleccionado;
    const ninos = document.getElementById('ninosEvento')?.value || '30';
    const adultos = document.getElementById('adultosEvento')?.value || '60';
    const itemsTxt = estado.carrito.length
      ? estado.carrito.map(i => `${i.nombre} (x${i.cantidad})`).join(', ')
      : 'Consulta general / Visita al salón';

    if (resumen) {
      resumen.innerHTML = `
        <div><strong>Selección:</strong> ${sanitizar(itemsTxt)}</div>
        <div><strong>Evento:</strong> ${sanitizar(tipoEvento)}</div>
        <div><strong>Turno:</strong> ${sanitizar(turno)} · <strong>Invitados:</strong> ${sanitizar(ninos)} niños, ${sanitizar(adultos)} adultos</div>
      `;
    }

    const fechaInput = document.getElementById('reservaFecha');
    if (fechaInput) {
      const hoy = new Date().toISOString().split('T')[0];
      fechaInput.min = hoy;
      if (!fechaInput.value && estado.fechaConsulta) fechaInput.value = estado.fechaConsulta;
    }

    detenerTemporizador();
    estado.segundosRestantes = 30;
    if (timerBox) timerBox.classList.remove('is-urgent');
    if (timerVal) timerVal.textContent = '00:30';

    estado.timerId = setInterval(() => {
      estado.segundosRestantes -= 1;
      const seg = Math.max(0, estado.segundosRestantes);
      if (timerVal) timerVal.textContent = `00:${String(seg).padStart(2, '0')}`;
      if (timerBox && seg <= 10) timerBox.classList.add('is-urgent');
      if (seg <= 0) {
        detenerTemporizador();
        modal.hidden = true;
        mostrarToast('Tiempo expirado. Puedes volver a abrir el formulario.', 'error');
      }
    }, 1000);

    modal.hidden = false;
  }

  async function manejarEnvioReserva(e) {
    e.preventDefault();
    const errorEl = document.getElementById('errorReserva');
    const nombre = (document.getElementById('reservaNombre')?.value || '').trim();
    const telefono = (document.getElementById('reservaTelefono')?.value || '').trim();
    const fecha = (document.getElementById('reservaFecha')?.value || '').trim();
    const notas = (document.getElementById('reservaNotas')?.value || '').trim();
    const acepto = Boolean(document.getElementById('reservaAcepto')?.checked);

    if (nombre.length < 3) {
      if (errorEl) errorEl.textContent = 'Ingresa tu nombre completo (mínimo 3 caracteres).';
      return;
    }
    if (!/^[67]\d{7}$/.test(telefono.replace(/\s+/g, ''))) {
      if (errorEl) errorEl.textContent = 'Ingresa un celular válido de Bolivia (8 dígitos, empezando con 6 o 7).';
      return;
    }
    if (!fecha) {
      if (errorEl) errorEl.textContent = 'Selecciona la fecha tentativa de tu celebración.';
      return;
    }
    if (!acepto) {
      if (errorEl) errorEl.textContent = 'Debes aceptar coordinar el horario por WhatsApp.';
      return;
    }

    if (errorEl) errorEl.textContent = '';

    const tipoEvento = document.getElementById('tipoEventoSelect')?.value || '';
    const turno = document.getElementById('turnoEventoSelect')?.value || estado.turnoSeleccionado;
    const ninos = document.getElementById('ninosEvento')?.value || '30';
    const adultos = document.getElementById('adultosEvento')?.value || '60';
    const itemsTxt = estado.carrito.length
      ? estado.carrito.map(i => `• ${i.nombre} (x${i.cantidad})`).join('\n')
      : '• Consulta de paquetes y visita al salón';

    const total = calcularTotal();
    const anticipo = Math.round(total * 0.30);

    const payload = {
      usuario_id: estado.usuarioActual && !String(estado.usuarioActual.id).startsWith('loc-') && estado.usuarioActual.id !== 'admin-default'
        ? estado.usuarioActual.id
        : null,
      correo: estado.usuarioActual ? estado.usuarioActual.correo : '',
      nombre: sanitizar(nombre),
      telefono: sanitizar(telefono),
      fecha_evento: fecha,
      turno,
      tipo_evento: tipoEvento,
      ninos: Number(ninos),
      adultos: Number(adultos),
      seleccion: itemsTxt,
      notas: sanitizar(notas),
      total_estimado: total,
      anticipo_estimado: anticipo
    };

    if (window.PartyZoneSupabase && typeof window.PartyZoneSupabase.guardarReserva === 'function') {
      try {
        await window.PartyZoneSupabase.guardarReserva(payload);
        registrarLog(`Solicitud guardada en Supabase (${nombre} - ${fecha}).`);
      } catch (err) {
        registrarLog('Guardado local realizado.');
      }
    }

    detenerTemporizador();
    const modal = document.getElementById('modalReserva');
    if (modal) modal.hidden = true;

    const mensajeWa = [
      `¡Hola *Party Zone*! 🎈 Quisiera consultar disponibilidad y agendar visita:`,
      `*Nombre:* ${nombre}`,
      `*Celular:* ${telefono}`,
      `*Fecha tentativa:* ${fecha}`,
      `*Turno:* ${turno}`,
      `*Evento:* ${tipoEvento} (${ninos} niños, ${adultos} adultos)`,
      `*Selección:*\n${itemsTxt}`,
      notas ? `*Notas / Horario de visita:* ${notas}` : ''
    ].filter(Boolean).join('\n');

    const urlWa = `https://wa.me/${TELEFONO_WA}?text=${encodeURIComponent(mensajeWa)}`;
    mostrarToast('✓ ¡Reserva registrada! Abriendo WhatsApp…');
    window.open(urlWa, '_blank', 'noopener,noreferrer');
  }

  /* ---------------------------------------------------------
     9. EVENTOS GENERALES E INICIALIZACIÓN
     --------------------------------------------------------- */
  function enlazarEventos() {
    // Botón Ingresar / Cuenta en Header
    const btnCuentaHeader = document.getElementById('btnCuentaHeader');
    if (btnCuentaHeader) {
      btnCuentaHeader.addEventListener('click', () => {
        if (estado.usuarioActual) {
          activarVista('panel-cuenta', true);
        } else {
          abrirModalAuth('login');
        }
      });
    }

    const btnAbrirAuthPanel = document.getElementById('btnAbrirAuthPanel');
    if (btnAbrirAuthPanel) {
      btnAbrirAuthPanel.addEventListener('click', () => abrirModalAuth('login'));
    }

    document.querySelectorAll('[data-abrir-auth]').forEach(btn => {
      btn.addEventListener('click', () => {
        abrirModalAuth(btn.getAttribute('data-abrir-auth'));
      });
    });

    document.querySelectorAll('[data-auth-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        cambiarTabAuth(tab.getAttribute('data-auth-tab'));
      });
    });

    // Submit Login
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
      formLogin.addEventListener('submit', async e => {
        e.preventDefault();
        const errEl = document.getElementById('errorAuthLogin');
        const correo = (document.getElementById('loginCorreo')?.value || '').trim();
        const pass = document.getElementById('loginPassword')?.value || '';
        if (!correo || !pass) {
          if (errEl) errEl.textContent = 'Completa tu correo y contraseña.';
          return;
        }
        if (errEl) errEl.textContent = '';

        try {
          const user = await window.PartyZoneSupabase.iniciarSesion(correo, pass);
          guardarSesion(user);
          document.getElementById('modalAuth').hidden = true;
          formLogin.reset();
          mostrarToast(`✓ Bienvenido/a, ${user.nombre}`);
          registrarLog(`Sesión iniciada: ${user.correo} (${user.rol})`);
          activarVista('panel-cuenta', true);
        } catch (err) {
          if (errEl) errEl.textContent = err.message || 'No se pudo iniciar sesión.';
        }
      });
    }

    // Submit Registro
    const formRegistro = document.getElementById('formRegistro');
    if (formRegistro) {
      formRegistro.addEventListener('submit', async e => {
        e.preventDefault();
        const errEl = document.getElementById('errorAuthReg');
        const nombre = (document.getElementById('regNombre')?.value || '').trim();
        const correo = (document.getElementById('regCorreo')?.value || '').trim();
        const telefono = (document.getElementById('regTelefono')?.value || '').trim();
        const pass = document.getElementById('regPassword')?.value || '';

        if (nombre.length < 3) {
          if (errEl) errEl.textContent = 'Ingresa tu nombre completo.';
          return;
        }
        if (!correo.includes('@')) {
          if (errEl) errEl.textContent = 'Ingresa un correo electrónico válido.';
          return;
        }
        if (!/^[67]\d{7}$/.test(telefono.replace(/\s+/g, ''))) {
          if (errEl) errEl.textContent = 'Ingresa un celular válido de Bolivia (8 dígitos).';
          return;
        }
        if (pass.length < 6) {
          if (errEl) errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
          return;
        }
        if (errEl) errEl.textContent = '';

        try {
          const user = await window.PartyZoneSupabase.registrarUsuario({
            nombre: sanitizar(nombre),
            correo,
            telefono: sanitizar(telefono),
            password: pass
          });
          guardarSesion(user);
          document.getElementById('modalAuth').hidden = true;
          formRegistro.reset();
          mostrarToast(`🎉 ¡Cuenta creada! Bienvenido/a, ${user.nombre}`);
          registrarLog(`Nuevo cliente registrado: ${user.correo}`);
          activarVista('panel-cuenta', true);
        } catch (err) {
          if (errEl) errEl.textContent = err.message || 'No se pudo crear la cuenta.';
        }
      });
    }

    // Cerrar sesión y refrescar panel
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if (btnCerrarSesion) {
      btnCerrarSesion.addEventListener('click', () => {
        registrarLog(`Sesión cerrada: ${estado.usuarioActual?.correo || ''}`);
        guardarSesion(null);
        mostrarToast('Sesión cerrada.');
      });
    }

    const btnRefrescarPanel = document.getElementById('btnRefrescarPanel');
    if (btnRefrescarPanel) {
      btnRefrescarPanel.addEventListener('click', () => {
        cargarYRenderizarPanel();
        mostrarToast('↻ Registros actualizados');
      });
    }

    // Filtros de pago en Panel Admin
    document.querySelectorAll('#filtrosAdminPagos .pz-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        estado.filtroAdminPago = chip.getAttribute('data-filtro-pago') || 'todos';
        document.querySelectorAll('#filtrosAdminPagos .pz-chip').forEach(c => {
          c.classList.toggle('pz-chip--active', c === chip);
        });
        renderizarListaPanel();
      });
    });

    // Acciones del Administrador sobre pagos/reservas
    const listaPanel = document.getElementById('listaReservasPanel');
    if (listaPanel) {
      listaPanel.addEventListener('click', async e => {
        const btn = e.target.closest('[data-admin-accion]');
        if (!btn) return;
        const id = btn.getAttribute('data-admin-id');
        const accion = btn.getAttribute('data-admin-accion');

        const cambios = accion === 'pagado'
          ? { estado_pago: 'pagado_total', estado: 'confirmada' }
          : accion === 'anticipo'
            ? { estado_pago: 'anticipo_pagado', estado: 'confirmada' }
            : { estado_pago: 'pendiente', estado: 'pendiente' };

        try {
          await window.PartyZoneSupabase.actualizarEstadoReserva(id, cambios);
          const idx = estado.reservasCargadas.findIndex(x => String(x.id) === String(id));
          if (idx !== -1) {
            estado.reservasCargadas[idx] = Object.assign({}, estado.reservasCargadas[idx], cambios);
          }
          renderizarListaPanel();
          mostrarToast('✓ Estado de pago actualizado');
          registrarLog(`Admin actualizó pago de reserva #${id} a ${cambios.estado_pago}.`);
        } catch (err) {
          mostrarToast('No se pudo actualizar el pago.', 'error');
        }
      });
    }

    // Catálogo, filtros y búsqueda
    const buscador = document.getElementById('buscadorCatalogo');
    const selectCat = document.getElementById('filtroCategoria');
    const selectOrden = document.getElementById('ordenCatalogo');
    const chips = document.querySelectorAll('#chipsCategoria .pz-chip');

    if (buscador) {
      buscador.addEventListener('input', () => {
        estado.busqueda = buscador.value;
        renderizarCatalogo();
      });
    }

    if (selectCat) {
      selectCat.addEventListener('change', () => {
        estado.filtroCategoria = selectCat.value;
        chips.forEach(c => {
          const act = c.getAttribute('data-categoria') === estado.filtroCategoria;
          c.classList.toggle('pz-chip--active', act);
          c.setAttribute('aria-selected', String(act));
        });
        renderizarCatalogo();
      });
    }

    if (selectOrden) {
      selectOrden.addEventListener('change', () => {
        estado.orden = selectOrden.value;
        renderizarCatalogo();
      });
    }

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        estado.filtroCategoria = chip.getAttribute('data-categoria') || 'todas';
        chips.forEach(c => {
          const act = c === chip;
          c.classList.toggle('pz-chip--active', act);
          c.setAttribute('aria-selected', String(act));
        });
        if (selectCat) selectCat.value = estado.filtroCategoria;
        renderizarCatalogo();
      });
    });

    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    if (btnLimpiar) {
      btnLimpiar.addEventListener('click', () => {
        estado.busqueda = '';
        estado.filtroCategoria = 'todas';
        estado.orden = 'relevancia';
        if (buscador) buscador.value = '';
        if (selectCat) selectCat.value = 'todas';
        if (selectOrden) selectOrden.value = 'relevancia';
        chips.forEach(c => c.classList.toggle('pz-chip--active', c.getAttribute('data-categoria') === 'todas'));
        renderizarCatalogo();
      });
    }

    const grid = document.getElementById('gridCatalogo');
    if (grid) {
      grid.addEventListener('click', e => {
        const trigger = e.target.closest('[data-accion]');
        if (!trigger) return;
        const card = trigger.closest('.pz-card');
        if (!card) return;
        const id = card.getAttribute('data-id');
        const item = estado.catalogo.find(x => x.id === id);
        if (!item) return;

        const accion = trigger.getAttribute('data-accion');
        if (accion === 'agregar') {
          agregarAlCotizador(id);
        } else if (accion === 'detalles') {
          const ul = card.querySelector('.pz-card__details');
          if (ul) {
            const abierto = !ul.hidden;
            ul.hidden = abierto;
            trigger.setAttribute('aria-expanded', String(!abierto));
            trigger.textContent = abierto ? 'Incluye' : 'Ocultar';
          }
        } else if (accion === 'zoom') {
          abrirModalZoom(item);
        }
      });
    }

    const gridAmbientes = document.getElementById('gridAmbientes');
    if (gridAmbientes) {
      gridAmbientes.addEventListener('click', e => {
        const card = e.target.closest('.pz-ambiente-card');
        if (!card) return;
        const base = card.getAttribute('data-zoom-src');
        const titulo = card.getAttribute('data-zoom-titulo');
        const desc = card.querySelector('span')?.textContent || '';
        abrirModalZoom({
          nombre: titulo,
          imagenBase: base,
          imagen: base + '.png',
          precioTexto: 'Instalaciones Party Zone · Miraflores',
          descripcion: desc,
          detalles: [
            'Av. Busch #1159, Edificio Jimena Natividad, Miraflores',
            'Capacidad: 40 niños y 80 adultos (Baby Shower: 80 a 90 adultos)',
            'Turnos: Mañana (09:00–14:00) y Tarde (15:00–20:00)'
          ]
        });
      });
    }

    const btnAgregarZoom = document.getElementById('btnAgregarZoom');
    if (btnAgregarZoom) {
      btnAgregarZoom.addEventListener('click', () => {
        if (estado.itemZoomActual) {
          agregarAlCotizador(estado.itemZoomActual);
          const modalZoom = document.getElementById('modalZoom');
          if (modalZoom) modalZoom.hidden = true;
        }
      });
    }

    const listaCot = document.getElementById('listaCotizacion');
    if (listaCot) {
      listaCot.addEventListener('click', e => {
        const btn = e.target.closest('[data-qty-id]');
        if (!btn) return;
        cambiarCantidad(btn.getAttribute('data-qty-id'), Number(btn.getAttribute('data-delta')));
      });
    }

    const ninosRange = document.getElementById('ninosEvento');
    const ninosOut = document.getElementById('resumenNinos');
    if (ninosRange && ninosOut) {
      ninosRange.addEventListener('input', () => { ninosOut.textContent = ninosRange.value; });
    }
    const adultosRange = document.getElementById('adultosEvento');
    const adultosOut = document.getElementById('resumenAdultos');
    if (adultosRange && adultosOut) {
      adultosRange.addEventListener('input', () => { adultosOut.textContent = adultosRange.value; });
    }

    const btnReservar = document.getElementById('btnReservar');
    if (btnReservar) btnReservar.addEventListener('click', abrirModalReserva);

    const formReserva = document.getElementById('formReserva');
    if (formReserva) formReserva.addEventListener('submit', manejarEnvioReserva);

    document.querySelectorAll('[data-cerrar-modal]').forEach(el => {
      el.addEventListener('click', () => {
        const cual = el.getAttribute('data-cerrar-modal');
        if (cual === 'zoom') {
          const m = document.getElementById('modalZoom');
          if (m) m.hidden = true;
        } else if (cual === 'reserva') {
          detenerTemporizador();
          const m = document.getElementById('modalReserva');
          if (m) m.hidden = true;
        } else if (cual === 'auth') {
          const m = document.getElementById('modalAuth');
          if (m) m.hidden = true;
        }
      });
    });

    document.querySelectorAll('#faqPartyZone .pz-faq__question').forEach(btn => {
      btn.addEventListener('click', () => {
        const ans = btn.nextElementSibling;
        if (!ans) return;
        const abierto = !ans.hidden;
        ans.hidden = abierto;
        btn.setAttribute('aria-expanded', String(!abierto));
        const icon = btn.querySelector('.pz-faq__icon');
        if (icon) icon.textContent = abierto ? '+' : '−';
      });
    });

    const btnLog = document.getElementById('btnLog');
    const logOut = document.getElementById('logOutput');
    if (btnLog && logOut) {
      btnLog.addEventListener('click', () => {
        const abierto = !logOut.hidden;
        logOut.hidden = abierto;
        btnLog.setAttribute('aria-expanded', String(!abierto));
        btnLog.textContent = abierto ? 'Mostrar' : 'Ocultar';
      });
    }
    const btnLimpiarLog = document.getElementById('btnLimpiarLog');
    if (btnLimpiarLog && logOut) {
      btnLimpiarLog.addEventListener('click', () => {
        logOut.innerHTML = '';
        try { localStorage.removeItem(STORAGE_KEYS.bitacora); } catch (_) {}
      });
    }

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      estado.deferredPrompt = e;
      const btnInstalar = document.getElementById('btnInstalarPWA');
      if (btnInstalar) btnInstalar.hidden = false;
    });
    const btnInstalar = document.getElementById('btnInstalarPWA');
    if (btnInstalar) {
      btnInstalar.addEventListener('click', async () => {
        if (!estado.deferredPrompt) return;
        estado.deferredPrompt.prompt();
        await estado.deferredPrompt.userChoice;
        estado.deferredPrompt = null;
        btnInstalar.hidden = true;
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    inicializarControlesUI();
    cargarSesionGuardada();
    actualizarInterfazSesion();
    cargarCarrito();
    renderizarCatalogo();
    renderizarCotizador();
    inicializarTurnos();
    enlazarEventos();

    const main = document.getElementById('contenido');
    if (main) main.setAttribute('data-hidratado', 'true');

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    registrarLog('Party Zone listo con portal Cliente y Administrador.');
  });
})();