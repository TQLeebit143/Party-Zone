# Semana 1 Â· Fundamentos DOM, jQuery y formularios

MÃ³dulos de referencia del catÃ¡logo **PartyZone**. La versiÃ³n que se ejecuta en
producciÃ³n es `script.js` (script unificado); estas carpetas muestran el mismo
trabajo separado por semanas para la evaluaciÃ³n de DiseÃ±o Web II.

| Carpeta | Tema | FunciÃ³n expuesta |
| --- | --- | --- |
| `01-modo-oscuro-tema` | Tema oscuro/claro persistente en `localStorage` | `initTemaSemana1()` |
| `02-filtro-busqueda` | Filtro por categorÃ­a y bÃºsqueda en `keyup` | `initFiltroSemana1()` |
| `03-menu-hamburguesa` | MenÃº responsivo con `.slideToggle()` | `initMenuSemana1()` |
| `04-validacion-formulario` | ValidaciÃ³n con `shared/validacion.js` | `initValidacionSemana1()` |
| `05-bitacora-eventos` | Panel de auditorÃ­a con `textContent` | `registrarEventoSemana1()` |

## CÃ³mo probar un mÃ³dulo aislado

```html
<script src="js/jquery.min.js"></script>
<script src="semana1/01-modo-oscuro-tema/modo-oscuro.js"></script>
<script>initTemaSemana1();</script>
```

Todos los mÃ³dulos incluyen un guard: si `window.PartyZoneUnificado` existe
(es decir, `script.js` ya se cargÃ³), no vuelven a enlazar eventos. AsÃ­ se evita
duplicar listeners y se cumple la limpieza de memoria con `.off()` / `.on()`.