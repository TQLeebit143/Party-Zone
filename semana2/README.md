# Semana 2 Â· jQuery avanzado, PWA y seguridad

| Carpeta | Tema | FunciÃ³n expuesta |
| --- | --- | --- |
| `01-acordeon-faq` | AcordeÃ³n de preguntas con `.slideToggle('slow')` | `initAcordeonSemana2()` |
| `02-cotizador-modal-timer` | Cotizador y modal con temporizador de 30 s | `iniciarTemporizadorSemana2()` |
| `03-fetch-lazyloading` | CatÃ¡logo asÃ­ncrono con `fetch` y respaldo local | `cargarCatalogoSemana2()` |
| `04-pwa-offline` | `beforeinstallprompt` + registro del Service Worker | `initPwaSemana2()` |
| `05-seguridad-xss` | SanitizaciÃ³n con DOMPurify y `textContent` | `sanitizarSemana2()` |

El temporizador siempre se detiene con `clearInterval`. Al expirar, cierra el
modal con `.fadeOut()` y avisa al usuario, tal como exige la rÃºbrica.