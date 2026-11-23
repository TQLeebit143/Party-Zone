(function () {
  'use strict';

  const LOCAL_USERS_KEY = 'pz_usuarios_local_v1';
  const LOCAL_RES_KEY = 'pz_reservas_local_v1';

  function obtenerConfig() {
    const cfg = window.SUPABASE_CONFIG || window.PARTYZONE_SUPABASE_CONFIG || {};
    return {
      url: String(cfg.url || '').trim().replace(/\/+$/, ''),
      anonKey: String(cfg.anonKey || '').trim(),
      tablaReservas: String(cfg.tablaReservas || 'reservas_partyzone').trim(),
      tablaUsuarios: String(cfg.tablaUsuarios || 'usuarios_partyzone').trim()
    };
  }

  function headersSupabase(cfg, extra) {
    return Object.assign({
      'Content-Type': 'application/json',
      'apikey': cfg.anonKey,
      'Authorization': `Bearer ${cfg.anonKey}`
    }, extra || {});
  }

  function actualizarEstadoVisual() {
    const el = document.getElementById('estadoConexion');
    if (!el) return;
    const cfg = obtenerConfig();
    if (cfg.url && cfg.anonKey) {
      el.textContent = '✓ Conectado a Supabase · Reservas, cuentas y confirmación de pagos en la nube.';
    } else {
      el.textContent = 'Modo local · Listo para enviar por WhatsApp.';
    }
  }

  function leerLocal(clave) {
    try {
      const data = JSON.parse(localStorage.getItem(clave) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  function guardarLocal(clave, arr) {
    try { localStorage.setItem(clave, JSON.stringify(arr)); } catch (_) {}
  }

  async function registrarUsuario({ nombre, correo, telefono, password }) {
    const cfg = obtenerConfig();
    const correoNorm = correo.trim().toLowerCase();
    const nuevo = {
      nombre: nombre.trim(),
      correo: correoNorm,
      telefono: telefono.trim(),
      password_hash: password,
      rol: correoNorm === 'admin@partyzone.bo' ? 'admin' : 'cliente'
    };

    if (cfg.url && cfg.anonKey) {
      const checkUrl = `${cfg.url}/rest/v1/${cfg.tablaUsuarios}?correo=eq.${encodeURIComponent(correoNorm)}&select=id`;
      const checkResp = await fetch(checkUrl, { headers: headersSupabase(cfg) });
      if (checkResp.ok) {
        const existentes = await checkResp.json();
        if (Array.isArray(existentes) && existentes.length > 0) {
          throw new Error('Ese correo ya está registrado. Inicia sesión.');
        }
      }

      const resp = await fetch(`${cfg.url}/rest/v1/${cfg.tablaUsuarios}`, {
        method: 'POST',
        headers: headersSupabase(cfg, { 'Prefer': 'return=representation' }),
        body: JSON.stringify([nuevo])
      });
      if (!resp.ok) {
        const errTxt = await resp.text().catch(() => '');
        throw new Error(`No se pudo registrar en Supabase: ${errTxt}`);
      }
      const creados = await resp.json();
      return creados[0];
    }

    const locales = leerLocal(LOCAL_USERS_KEY);
    if (locales.some(u => u.correo === correoNorm)) {
      throw new Error('Ese correo ya está registrado.');
    }
    const creadoLocal = Object.assign({ id: 'loc-' + Date.now() }, nuevo);
    locales.push(creadoLocal);
    guardarLocal(LOCAL_USERS_KEY, locales);
    return creadoLocal;
  }

  async function iniciarSesion(correo, password) {
    const cfg = obtenerConfig();
    const correoNorm = correo.trim().toLowerCase();

    if (cfg.url && cfg.anonKey) {
      const endpoint = `${cfg.url}/rest/v1/${cfg.tablaUsuarios}?correo=eq.${encodeURIComponent(correoNorm)}&select=*`;
      const resp = await fetch(endpoint, { headers: headersSupabase(cfg) });
      if (resp.ok) {
        const filas = await resp.json();
        if (Array.isArray(filas) && filas.length > 0) {
          const user = filas[0];
          if (user.password_hash !== password) {
            throw new Error('Contraseña incorrecta.');
          }
          return user;
        }
      }
    }

    if (correoNorm === 'admin@partyzone.bo' && password === 'PartyZone2026') {
      return {
        id: 'admin-default',
        nombre: 'Administración Party Zone',
        correo: 'admin@partyzone.bo',
        telefono: '67301760',
        rol: 'admin'
      };
    }

    const locales = leerLocal(LOCAL_USERS_KEY);
    const encontrado = locales.find(u => u.correo === correoNorm && u.password_hash === password);
    if (!encontrado) {
      throw new Error('Correo o contraseña incorrectos.');
    }
    return encontrado;
  }

  async function guardarReserva(datos) {
    const cfg = obtenerConfig();
    const payload = Object.assign({
      estado_pago: 'pendiente',
      estado: 'pendiente'
    }, datos);

    if (cfg.url && cfg.anonKey) {
      const resp = await fetch(`${cfg.url}/rest/v1/${cfg.tablaReservas}`, {
        method: 'POST',
        headers: headersSupabase(cfg, { 'Prefer': 'return=representation' }),
        body: JSON.stringify([payload])
      });
      if (!resp.ok) {
        const detalle = await resp.text().catch(() => '');
        throw new Error(`Error Supabase (${resp.status}): ${detalle}`);
      }
      const filas = await resp.json();
      return filas[0] || payload;
    }

    const locales = leerLocal(LOCAL_RES_KEY);
    const nuevaLocal = Object.assign({
      id: 'res-' + Date.now(),
      creado_en: new Date().toISOString()
    }, payload);
    locales.unshift(nuevaLocal);
    guardarLocal(LOCAL_RES_KEY, locales);
    return nuevaLocal;
  }

  async function listarReservas(filtroUsuario) {
    const cfg = obtenerConfig();
    if (cfg.url && cfg.anonKey) {
      let query = `${cfg.url}/rest/v1/${cfg.tablaReservas}?select=*&order=creado_en.desc`;
      if (filtroUsuario && filtroUsuario.rol === 'cliente') {
        const correo = encodeURIComponent(filtroUsuario.correo || '');
        const uid = encodeURIComponent(filtroUsuario.id || '');
        query += `&or=(usuario_id.eq.${uid},correo.eq.${correo})`;
      }
      const resp = await fetch(query, { headers: headersSupabase(cfg) });
      if (resp.ok) {
        return await resp.json();
      }
    }

    const locales = leerLocal(LOCAL_RES_KEY);
    if (filtroUsuario && filtroUsuario.rol === 'cliente') {
      return locales.filter(r => r.usuario_id === filtroUsuario.id || r.correo === filtroUsuario.correo);
    }
    return locales;
  }

  async function actualizarEstadoReserva(id, cambios) {
    const cfg = obtenerConfig();
    if (cfg.url && cfg.anonKey && !String(id).startsWith('res-')) {
      const endpoint = `${cfg.url}/rest/v1/${cfg.tablaReservas}?id=eq.${encodeURIComponent(id)}`;
      const resp = await fetch(endpoint, {
        method: 'PATCH',
        headers: headersSupabase(cfg, { 'Prefer': 'return=representation' }),
        body: JSON.stringify(cambios)
      });
      if (!resp.ok) {
        throw new Error('No se pudo actualizar la reserva en Supabase.');
      }
      const filas = await resp.json();
      return filas[0];
    }

    const locales = leerLocal(LOCAL_RES_KEY);
    const idx = locales.findIndex(r => String(r.id) === String(id));
    if (idx !== -1) {
      locales[idx] = Object.assign({}, locales[idx], cambios);
      guardarLocal(LOCAL_RES_KEY, locales);
      return locales[idx];
    }
    return null;
  }

  window.PartyZoneSupabase = {
    registrarUsuario,
    iniciarSesion,
    guardarReserva,
    listarReservas,
    actualizarEstadoReserva,
    actualizarEstadoVisual
  };

  document.addEventListener('DOMContentLoaded', actualizarEstadoVisual);
})();