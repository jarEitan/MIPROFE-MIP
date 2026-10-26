# Rediseño visual "Plancha de pegatinas": plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar el sistema visual D a las 10 vistas de MIP sin romper ninguna función del sitio.

**Architecture:** Todo el cambio de marca vive en `wwwroot/css/site.css`, que mantiene su orden de bloques: 0) variables y base, 1) header, 2) componentes, 3) Main por página, 4) footer y 5) movimiento.

- Las vistas Razor solo cambian donde la organización cambia.
- `site.js` pierde el fade-up y el carrusel; el resto del JS no cambia.
- Un verificador con Playwright, fuera del repo, es la "prueba" de cada tarea. Revisa contra el sitio corriendo sobre la BD de prueba que no haya errores de consola, scroll horizontal, bordes negros en reposo, sombras duras, blanco sobre coral, texturas fuera de lugar, controles de menos de 44 px, ni ids del JS perdidos.

**Tech Stack:**
- ASP.NET Core MVC 9 con Razor.
- Bootstrap 6.0.0-alpha.1: CSS en `@layer`, breakpoints como prefijo (`md:col-6`), dialog y drawer nuevos, header con `@container`.
- Un solo CSS propio y JS en módulos ES.
- Para verificar: SQL Server 2022 en Docker y Playwright con Node 22.

**Spec:** `docs/superpowers/specs/2026-10-21-rediseno-visual-design.md`. La copia está en `/mnt/project-files/rediseno/`, donde también están:
- `sistema-unificado.json`: el vocabulario con los valores exactos de cada componente y las etapas;
- `organizacion-por-pagina.json`: el detalle por zona y las clases que usa el JS;
- `frases-miro.md`.

Las maquetas están en https://claude.ai/artifact/RSfgcvS2uTzyBPxgYU6CaD, un artboard por página.

## Global Constraints

- **No tocar:** controladores, modelos, BD, SP ni `MIP-BD.sql`. No agregar dependencias.
- **Convenciones de `Info/guiaDeEstilo.md` y `Info/systemPrompt.md`:**
  - nombres en camelCase y en español;
  - patrón base + modificador de una palabra (`.boton.principal`);
  - orden de `site.css`: Header → generales → Main en orden de página → Footer → reduced motion;
  - breakpoints como prefijo.
- **Paleta:**
  - coral #FF5757, celeste #5CE1E6, magenta #D51F47 y tinta #111827 (texto, nunca #000);
  - texto suave #6B7280 (`--colorTextoSuave`, sin cambios);
  - borde de reposo #E5E7EB;
  - borde de campos #6B7280;
  - #B3B3B3 solo como decoración, nunca para texto ni para el borde de un control.
- **Tonos exactos del sitio** (pedido de Jarsou, 2026-10-22):
  - no se agrega ningún color nuevo; todo hex de `site.css` tiene que estar en `/tmp/mipprueba/tonos-base.txt` (los 44 que ya usa el sitio);
  - las transparencias usan el RGB de esos tonos (tinta 17,24,39; coral 255,87,87; celeste 92,225,230; magenta 213,31,71; celesteOscuro 14,116,144; blanco);
  - donde `sistema-unificado.json` o una maqueta digan #374151 como texto suave, o #ECECEC, #EDEDED, #F0F0F0, #FFE5E5, #EFFBFC o #FFF4F4, se usa el token existente: `--colorTextoSuave`, `--colorBorde`, `--colorCoralSuave` o `--colorCelesteSuave`;
  - cada tarea lo comprueba antes del commit con:
    `comm -13 /tmp/mipprueba/tonos-base.txt <(grep -oiE '#[0-9a-f]{6}\b|#[0-9a-f]{3}\b' wwwroot/css/site.css | tr a-f A-F | sort -u)`, que tiene que salir vacío.
- **Tipografía:**
  - Eras Bold ITC solo en h1, h2, logo y lema;
  - Fredoka en botones, etiquetas, cifras y precios;
  - Plus Jakarta Sans en el resto del texto.
- **Texturas:** solo dos.
  - La franja `.perfil .portadaPerfil`, que se conserva.
  - `--fondoLavado`, solo en `.portada > .container`, `.cabecera`, `.saludo`, `.acceso`, `.paginaError` y `.presentacion`.
- **Degradados:** solo esos dos y el brillo radial coral de `.llamadoFinal > .container`.
- **Contraste:**
  - no va texto blanco sobre coral: sobre coral y celeste va tinta;
  - el blanco va solo sobre tinta, magenta o verde de éxito.
- **Lo elegido:** link activo, pestaña activa, día y franja elegidos, página actual y check van en fondo tinta con texto blanco. La única excepción es el rol elegido en Registrarse: borde tinta con fondo `--colorCelesteSuave`.
- **`mark`:** solo en un h1 por página y en el h2 de `.llamadoFinal`.
- **Prohibido:**
  - píldoras de ceja sobre los títulos;
  - `bi-arrow-right` pegado a los links;
  - emojis en el HTML: el ❤ va como `<i class="bi bi-heart-fill">`;
  - cifras o testimonios inventados.
- **Movimiento:**
  - solo `pegarPegatina` en `main > section:first-of-type .pegatina`;
  - también `desplazarCinta`, `sacudirError`, el feedback del Me gusta y el hover/press;
  - con `prefers-reduced-motion` todo queda quieto y visible.
- **Tamaños mínimos:** todo control interactivo mide 44 px; `btn-close` y los botones de quitar etiqueta miden 24 px.
- **No se renombran ni se borran:**
  - los ids, clases y `data-*` que leen o generan los JS (lista por zona en `organizacion-por-pagina.json` → `clasesDelJs`);
  - `.visible`, porque la usa el snackbar.
- **Entrega:**
  - se trabaja en `/home/claude/MIP-MIPROFESOR`;
  - cada tarea termina con un commit local de checkpoint, sin push;
  - al final se copian los archivos a la PC de Jarsou (`D:\eitug\Descargas\MIP-MIPROFESOR`) **sin commit**, o se deja un parche si la PC no está conectada.

## Review Focus

1. **Celular de 390 px con pegatinas giradas:** el troquel de 6,5 px más la rotación no pueden generar scroll horizontal ni cortarse. Lo prueba `sinScroll` a 390 en todas las páginas: Tareas 1, 6, 7, 8 y 10.
2. **Header a 1024 px con sesión de profesor:** links, Panel de Control con insignia y nombre tienen que entrar en una línea, o `.nombreUsuario` se oculta con `@container (width < 1280px)`. Lo prueba `headerEnUnaLinea` a 1024: Tarea 4.
3. **Acciones del Panel que reescriben el DOM:** `refrescarPanel` reemplaza `#notificaciones` y escribe en los contadores sin chequear `null`. Después de aceptar o cancelar no puede haber `TypeError` y los contadores tienen que cambiar. Lo prueba el flujo `accionPanel`: Tarea 10.
4. **Usuario con `prefers-reduced-motion`:** con delay y fill `backwards`, las pegatinas podrían quedar invisibles. Con reduce, todas tienen que estar a opacidad 1 a los 50 ms. Lo prueba `pegatinasVisiblesSinMovimiento`: Tareas 1 y 6.
5. **Teclado:** el foco tiene que verse sobre blanco (tinta) y sobre fondos oscuros (celeste) en el buscador, los filtros, los diálogos y el footer. Lo prueba `focoVisible`: Tareas 1, 2 y 4.

---

### Task 0: Entorno de prueba y verificador

> Hecha el 2026-10-22: `sincronizar.sh` y `verificar.js` están en `/tmp/mipprueba/`. La línea de base del sitio actual dio 123 PASA y 141 FALLA (12 páginas a 390 y 1280); `sinErrores`, `sinScroll` e `idsDelJs` pasan en todas. Los 5 flujos funcionan y `dialogos` falla, como se esperaba. Los 404 de `/userData/` no cuentan como error, porque las fotos se suben a mano.

**Files:**
- Create: `/tmp/mipprueba/sincronizar.sh` (fuera del repo)
- Create: `/tmp/mipprueba/verificar.js` (fuera del repo)

**Interfaces:**
- Produces: `bash /tmp/mipprueba/sincronizar.sh`. Copia `Views/`, `wwwroot/css`, `wwwroot/js` y `wwwroot/img` del repo a `/tmp/mipprueba/app`. Si cambió algún `.cshtml`, corre `docker restart web` y espera HTTP 200 en `http://localhost:5080/`.
- Produces: `node /tmp/mipprueba/verificar.js --paginas <lista> --anchos <lista> --chequeos <lista> [--capturas <dir>] [--flujos <lista>]`. Sale con código 1 si falla algún chequeo e imprime `FALLA <chequeo> <pagina>@<ancho>: <detalle>`.

- [ ] **Step 1: Levantar el entorno.**
  - Si `docker info` falla, correr `dockerd > /tmp/dockerd.log 2>&1 &`.
  - `docker start sql`, esperar unos 15 s y `docker start web`.
  - Esperar en loop hasta que `curl -s -o /dev/null -w '%{http_code}' http://localhost:5080/` dé `200`.
  - `/tmp/mipprueba/app` es una copia del repo con la cadena de conexión de la nube y `SkiaSharp.NativeAssets.Linux.NoDependencies`. No se copian `appsettings*.json`, `*.csproj`, `Models/` ni `bin/obj`.

- [ ] **Step 2: Escribir `sincronizar.sh`.** Usa `rm -rf` + `cp -a` de las 4 carpetas (no hay rsync en el contenedor) y compara el `md5sum` de los `.cshtml` antes y después para decidir el restart.

- [ ] **Step 3: Escribir `verificar.js`.** Partir de `/tmp/mipprueba/capturar.js`, que ya tiene el login y la ruta de Chromium.

Páginas y sesiones:

```js
const PAGINAS = {
  inicio: ['/', null], catalogo: ['/Catalogo', 'alumno'], perfilProfe: ['/Home/Perfil?id=3', 'alumno'],
  perfilPropio: ['/Home/Perfil', 'alumno'], panelAlumno: ['/Home/PanelControl', 'alumno'],
  panelProfesor: ['/Home/PanelControl', 'profesor'], iniciarSesion: ['/Sesion/IniciarSesion', null],
  registrarse: ['/Sesion/Registrarse', null], soporte: ['/Home/Soporte', null], privacidad: ['/Home/Privacy', null],
  error: ['/Home/Error', null], quienesSomos: ['/Home/QuienesSomos', null],
};
const CUENTAS = { alumno: 'eitan.glaz@mip.edu.ar', profesor: 'sofia.martinez@mip.edu.ar' }; // contraseña 12345678
```

Cada chequeo es una función `(page, contexto) => string[]` que devuelve los problemas; vacío significa que pasa. Los que corren en el navegador usan `page.evaluate`. Hay que mirar solo elementos visibles (`offsetParent !== null`) y usar el estilo computado en reposo, después de `page.mouse.move(0,0)`.

| Chequeo | Falla si |
|---|---|
| `sinErrores` | hubo algún `console.error` o `pageerror` desde que cargó |
| `sinScroll` | `document.documentElement.scrollWidth > innerWidth` |
| `sinBordeNegroEnReposo` | un elemento de `.card, .boton, .form-control, .dialog[open], .accordion-item, .nav-pills, .encabezado, .avisoVerificacion, .portadaPerfil` tiene algún borde ≥1px de color `rgb(17, 24, 39)` o `rgb(0, 0, 0)`, salvo que el elemento sea `.active`, `[aria-pressed="true"]`, `.activo` o `:checked + *` |
| `sinSombraDura` | el `box-shadow` de algún elemento de `main, header, footer` coincide con `/rgb\((17, 24, 39|0, 0, 0)\) -?\d+px -?\d+px 0px/` |
| `sinBlancoSobreCoral` | un elemento con texto propio tiene `color: rgb(255, 255, 255)` y su fondo efectivo (subiendo por los ancestros hasta el primero no transparente) es `rgb(255, 87, 87)` |
| `texturasPermitidas` | un elemento tiene un `background-image` con `radial-gradient(circle` y no hace `matches('.portadaPerfil, .portada > .container, .cabecera, .saludo, .acceso, .paginaError, .presentacion')` |
| `toque44` | algún `.boton, .nav-link, .navbar-toggler, .paginador .numero, .tiraDias .flecha, .franja, .diaTira` visible mide menos de 44 px de alto (`getBoundingClientRect().height < 43.5`), o algún `.btn-close` o `.etiquetasElegidas button` mide menos de 24 px |
| `sinRevelar` | `document.querySelector('.revelar') !== null` o `document.documentElement.classList.contains('jsActivo')` |
| `marksPermitidos` | hay un `mark` que no está dentro de `h1` ni de `.llamadoFinal h2`, o hay más de un `h1 mark` |
| `sinCejas` | existe algún `.encabezadoSeccion .pildora, .cabecera .pildora, .portada .pildora, .acceso .encabezadoAcceso .pildora` o algún `main a .bi-arrow-right` |
| `idsDelJs` | falta algún selector de `REQUERIDOS[pagina]` (ver abajo) |
| `focoVisible` | al pulsar Tab hasta el primer `a` o `button` de `main`, el `outline-color` computado no es `rgb(17, 24, 39)`, o no es `rgb(92, 225, 230)` cuando el fondo efectivo es tinta, o el `outline-width` es menor a 2px |
| `unSoloMomento` | a los 100 ms de cargar, `document.getAnimations()` incluye un `animationName` que no es `pegarPegatina`, `desplazarCinta` ni de un spinner, o alguna `pegarPegatina` corre fuera de `main > section:first-of-type` |
| `pegatinasVisiblesSinMovimiento` | con `reducedMotion: 'reduce'`, a los 50 ms alguna `.pegatina` tiene `opacity` menor a 1 |
| `headerEnUnaLinea` | los hijos directos visibles de `.encabezado .navbar` tienen tops distintos en más de 8 px |

Los selectores que pide `idsDelJs` en cada página:

```js
const REQUERIDOS = {
  catalogo: ['#formularioFiltros', '#listaProfesores', '#cantidadResultados', '#sinResultados', '#paginador', '#panelFiltros', 'article.card.profesorFila', '[data-pedir-clase]'],
  perfilProfe: ['#perfil', '#tipoPerfil', '#estadoVerificadoPerfil', '#tickPerfil', '#cifrasPerfil', '#botonMeGusta', '#botonAmistad', '#perfil [data-dar-resena]', "#perfil input[name='__RequestVerificationToken']"],
  perfilPropio: ['#perfil', '#tipoPerfil', '#estadoVerificadoPerfil', '#tickPerfil', 'button[data-abrir-edicion]', '#dialogoEditarPerfil', '#dialogoRecortarFoto'],
  panelProfesor: ['#notificaciones', '#contadorClasesActivas', '#contadorClasesCompletadas', '#insigniaNotificaciones', '#panelTabs', '#diasMes', '#agendaDia', '#miAgenda', '#chat', '#dialogoCancelarClase', '#dialogoReubicarClase', '#dialogoNoSeDio'],
  panelAlumno: ['#notificaciones', '#contadorClasesActivas', '#contadorClasesCompletadas', '#panelTabs', '#diasMes', '#chat'],
  registrarse: ['#formularioRegistro', "input[name='tipoUsuario']", '[data-solo-rol]', '[data-ver-contrasena] .bi'],
  iniciarSesion: ['#formularioIngreso', '#ingresoCorreo', '#ingresoContrasena', '[data-ver-contrasena] .bi'],
  soporte: ['#campoAyuda', '#mensajeAyuda', '#acordeonPreguntas', '#formularioContacto', '#sinCoincidencias'],
  quienesSomos: ['#equipo'],
  inicio: ['#campoBusqueda', '#acordeonPreguntas'],
};
```

Flujos de `--flujos`. Cada uno lanza un error si falla.

| Flujo | Qué hace y qué espera |
|---|---|
| `dialogos` | En el Panel del profesor abre con `showModal()` cada `dialog.dialog` de la página. A cada uno le corre `sinBordeNegroEnReposo` y `toque44`, y lo cierra con su `[data-bs-dismiss='dialog']`. |
| `catalogoFiltros` | Elige una materia en `#filtroMateria` y espera que `#cantidadResultados` cambie. Pulsa "Limpiar filtros" y espera que vuelva al total. |
| `accionPanel` | Con el profesor, toma el primer `[data-accion-clase]` disponible, lo ejecuta y confirma el diálogo si aparece. Espera que el texto de `#contadorClasesActivas` o de `#cantidadNotificacionesPanel` cambie y que `sinErrores` siga vacío. |
| `snackbar` | En `perfilProfe` pulsa `#botonCopiarEnlace` y espera `#snackbar.visible` antes de 1 s. |
| `chat` | Abre `/Home/PanelControl?tab=chat` con el alumno, pulsa el primer `button.conversacion` y espera que `#mensajesChat` tenga al menos un `.burbuja`. |

Con `--capturas <dir>`, se guarda `<dir>/<pagina>-<ancho>.png` en página completa y con `reducedMotion: 'reduce'`.

- [ ] **Step 4: Correr la línea de base sobre el sitio actual.**

```bash
node /tmp/mipprueba/verificar.js --paginas inicio,catalogo,perfilProfe,perfilPropio,panelAlumno,panelProfesor,iniciarSesion,registrarse,soporte,privacidad,error,quienesSomos --anchos 390,1280 --chequeos sinErrores,sinScroll,sinBordeNegroEnReposo,sinSombraDura,sinBlancoSobreCoral,texturasPermitidas,toque44,sinRevelar,marksPermitidos,sinCejas,idsDelJs --capturas /tmp/mipprueba/capturas/base > /tmp/mipprueba/linea-base.txt
```

Se espera:
- `sinErrores` e `idsDelJs` en PASA en las 12 páginas;
- `sinBordeNegroEnReposo`, `sinSombraDura`, `sinRevelar`, `marksPermitidos` y `sinCejas` en FALLA en Inicio.

Si `idsDelJs` falla hoy, se corrige el verificador, no el sitio.

---

### Task 1: Tokens, alias y base

**Files:**
- Modify: `wwwroot/css/site.css`:
  - bloque 0 (`:root` en las líneas 10–190 y base en 191–258);
  - bloque 5 (líneas 5264–5280).

**Interfaces:**
- Produces, que las tareas siguientes usan por nombre:
  - `--colorMagenta`, `--troquel`, `--fondoLavado` y `--colorFoco`;
  - `--sombraSuave` y `--sombraFlotante` con los valores nuevos;
  - los alias `--bordeMarcado`, `--sombraMarcada`, `--sombraMarcadaElevada` y `--colorCoralOscuro`.

- [ ] **Step 1: Correr el chequeo que tiene que fallar.**

```bash
node /tmp/mipprueba/verificar.js --paginas soporte,catalogo --anchos 1280 --chequeos sinSombraDura,focoVisible,sinBlancoSobreCoral
```

Se espera FALLA: sombras `4px 4px 0` y foco celeste.

- [ ] **Step 2: Cambiar el `:root` con los valores exactos de la tabla 3.1 del spec.**
  - `--colorMagenta: #D51F47` y `--colorCoralOscuro: var(--colorMagenta)`.
  - `--sombraSuave`, `--sombraFlotante`, `--troquel` y `--fondoLavado`, copiados del spec.
  - Alias: `--bordeMarcado: 1.5px solid var(--colorBorde)`, `--sombraMarcada: var(--sombraSuave)` y `--sombraMarcadaElevada: var(--sombraFlotante)`.
  - Tokens `--bs-*` según el spec §3.1: link en tinta con hover magenta, `focus-ring` tinta, `control-checked-bg` tinta, `primary-contrast`, `primary-fg` y `accent-fg` tinta, `body-font-size: 1rem`.
  - `--espacioSeccion: clamp(2.5rem, 2rem + 3vw, 4.5rem)`.
  - El bloque de alias va al final del `:root`, con un comentario de una línea: "alias de migración: se borran en la etapa 11".

- [ ] **Step 3: Cambiar la base.**
  - `body`: `background: var(--colorSuperficie)`.
  - `h1` y `h2`: los clamps del spec §3.2.
  - `:focus-visible{outline:3px solid var(--colorFoco, var(--colorTinta)); outline-offset:3px}`.
  - `--colorFoco: var(--colorCeleste)` en `.pie, .llamadoFinal, .card.oscura, .ilustracion.oscura, .snackbar`.
  - `main{overflow-x:clip}`.
  - En el bloque 5, `animation-delay: 0s !important` dentro de la regla global `*`.

- [ ] **Step 4: Sincronizar y verificar.**

```bash
bash /tmp/mipprueba/sincronizar.sh && node /tmp/mipprueba/verificar.js --paginas inicio,catalogo,perfilProfe,perfilPropio,panelAlumno,panelProfesor,iniciarSesion,registrarse,soporte,privacidad,error,quienesSomos --anchos 390,1280 --chequeos sinErrores,sinScroll,focoVisible,idsDelJs --capturas /tmp/mipprueba/capturas/t1
```

Se espera PASA. Hay que mirar 4 capturas (inicio, catálogo, perfilProfe y panelProfesor a 1280) y confirmar que los bordes de los alias ya son grises.

- [ ] **Step 5: Commit.**

```bash
git add wwwroot/css/site.css
git commit -m "Rediseño 1/11: tokens nuevos, alias de migración y base"
```

---

### Task 2: Componentes del bloque 2 y diálogos

**Files:**
- Modify: `wwwroot/css/site.css`:
  - bloque 2 (líneas 546–1330);
  - 3.8 acordeón (1852–1906);
  - reglas `.dialog*`, `.selectorHorario`, `.tiraDias` y `.franja` de 3.14 (3754–3950 aprox.), que se mudan al bloque 2;
  - `.pestanasEdicion` en 3.16, de la que queda solo el layout.

**Interfaces:**
- Consumes: los tokens de la Tarea 1.
- Produces, en el bloque 2:
  - `.boton` con `.principal`, `.secundario`, `.oscuro`, `.claro`, `.chico` y `.botonIcono`;
  - `.card` con `.coral`, `.oscura`, `.estatica` y `.estadoVacio`;
  - `.icono` con `.celeste` y `.oscuro`;
  - `.pegatina` con `.coral`, `.celeste`, `.magenta` y `.oscura`, más el custom property `--giro`;
  - `.plancha`;
  - `.pildora`, `.badge`, `.avatar` y `.tickVerificado`;
  - `.form-control`, `.mensajeError`, `.mensajeExito`, `.buscador` y `.selectorBuscable`;
  - `.nav-pills`;
  - `.dialog` con `.dialogoClase`, `.selectorHorario`, `.tiraDias`, `.franja` y `.dialogoResena`;
  - `.burbuja` y `.snackbar`;
  - `@keyframes pegarPegatina`.
- **No cambian:** `.contorno` (el JS la usa), `.visible`, `.estrellas` ni `.vacio`.

- [ ] **Step 1: Correr el chequeo que tiene que fallar.**

```bash
node /tmp/mipprueba/verificar.js --paginas soporte,catalogo --anchos 390,1280 --chequeos sinBordeNegroEnReposo,sinBlancoSobreCoral,toque44 --flujos dialogos
```

Se espera FALLA.

- [ ] **Step 2: Reescribir cada componente con los valores de su entrada en `sistema-unificado.json` → `vocabulario`.** Se copian tal cual las entradas `.boton`, `.card`, `.icono`, `.pegatina`, `.plancha`, `.badge / .avatar / .tickVerificado`, `Formularios`, `.buscador`, `.selectorBuscable`, `.nav-pills`, `Estado 'elegido'`, `.dialog`, `Acordeón` y `.burbuja / .snackbar`.
  - Se borran `.principal:hover`, `.secundario:hover`, `.contorno:hover`, `.chico:hover`, `.oscuro.chico` y los `:hover` propios de `.card.coral` y `.card.oscura`.
  - `.nav-pills .nav-link.active` va escrita **después** del hover.
  - La animación va en una sola regla: `main > section:first-of-type .pegatina{animation:pegarPegatina .5s var(--curvaRebote) var(--retraso,.15s) backwards}`.

- [ ] **Step 3: Sincronizar y verificar.**

```bash
bash /tmp/mipprueba/sincronizar.sh && node /tmp/mipprueba/verificar.js --paginas soporte,catalogo,panelProfesor,perfilPropio --anchos 390,1280 --chequeos sinErrores,sinBordeNegroEnReposo,sinBlancoSobreCoral,toque44,focoVisible,idsDelJs --flujos dialogos,catalogoFiltros,snackbar,chat --capturas /tmp/mipprueba/capturas/t2
```

Se espera PASA en `soporte` y `catalogo`. En Panel y Perfil, los bordes que fallen por reglas propias de 3.14 o 3.16 se anotan en el commit y quedan para las Tareas 9 y 10. Los diálogos sí tienen que pasar.

- [ ] **Step 4: Commit.**

```bash
git commit -am "Rediseño 2/11: vocabulario de componentes D y diálogos en el bloque 2"
```

---

### Task 3: Apagar el fade-up global

**Files:**
- Modify: `wwwroot/css/site.css`:
  - "Animaciones reutilizables" (1283–1330);
  - bloque 5;
  - los `@keyframes` `aparecerDesdeAbajo`, `flotarFigura` y `pulsoExpansivo`.
- Modify: `wwwroot/js/site.js`:
  - borrar `inicializarRevelarAlScroll` (378–410) y su llamada (1687);
  - `mostrarContenidoCargado` (701–704) queda en `contenido.hidden = false`;
  - borrar la línea 909.
- Modify: `Views/Shared/_Layout.cshtml:26`: borrar el script `jsActivo`.

**Interfaces:**
- Produces: nada nuevo. `.visible` sigue existiendo para `#snackbar`.

- [ ] **Step 1:** `node /tmp/mipprueba/verificar.js --paginas inicio,perfilPropio --anchos 1280 --chequeos sinRevelar`. Se espera FALLA.
- [ ] **Step 2: Borrar el CSS y el JS listados.** `flotarTarjeta` se queda hasta la Tarea 8.
- [ ] **Step 3: Sincronizar y verificar.** `grep -rn "revelar\|jsActivo\|animarEntrada" wwwroot Views` tiene que dar 0 líneas. Después:

```bash
bash /tmp/mipprueba/sincronizar.sh && node /tmp/mipprueba/verificar.js --paginas inicio,catalogo,perfilProfe,perfilPropio,panelProfesor,soporte,quienesSomos --anchos 1280 --chequeos sinErrores,sinRevelar,idsDelJs --flujos snackbar
```

Se espera PASA, y en la captura del Perfil propio se tiene que ver todo el contenido.

- [ ] **Step 4: Commit.**

```bash
git commit -am "Rediseño 3/11: sin fade-up global"
```

---

### Task 4: Header, aviso de verificación y footer

**Files:**
- Modify: `wwwroot/css/site.css`, bloques 1 (259–545), 2 ("Aviso Cuenta no verificada", 1251–1282) y 4 (5167–5263).
- Modify: `Views/Shared/_encabezadoAdmin.cshtml:44`: la insignia lleva `id="insigniaNotificaciones"` y `hidden` cuando es 0, como en `_encabezadoAlumno.cshtml`.
- Modify: `Views/Shared/_marcaLogo.cshtml`: "Mi" en tinta y "Profesor" en `<span>` coral.
- Modify: `Views/Shared/_avisoVerificacion.cshtml`: el botón pasa a `boton oscuro chico`.
- Modify: `Views/Shared/_piePagina.cshtml`: "Francisco Martínez" con tilde.

**Interfaces:**
- **No cambian:** `#encabezado`, `.conSombra` (puede quedar sin reglas), `.usuario`, `.nombreUsuario`, `.avatar`, `#insigniaNotificaciones`, `a.boton[href*='/Home/PanelControl']`, `#avisoVerificacion` y `#botonCerrarAvisoVerificacion`.

- [ ] **Step 1:** `node /tmp/mipprueba/verificar.js --paginas inicio,panelProfesor --anchos 1024,1280 --chequeos sinBordeNegroEnReposo,sinSombraDura,toque44,headerEnUnaLinea`. Se espera FALLA.

- [ ] **Step 2: Header** según la entrada "Header" de `vocabulario`.
  - `box-shadow: 0 1px 0 rgba(17,24,39,.06), 0 10px 28px -16px rgba(17,24,39,.3)` siempre.
  - Se borran `::before`, el `::after` del subrayado, `.encabezado .menu*`, `.badge[hidden]` y `pulsoExpansivo`.
  - `.nav-link` en píldora de 2.75rem con `.active` tinta.
  - Hamburguesa en círculo celeste.
  - El drawer va dentro de `@container (width < 1024px)` y nunca en `@media`.
  - Si `headerEnUnaLinea` falla a 1024, sumar `@container (width < 1280px){ .nombreUsuario{display:none} }`.

- [ ] **Step 3:** el aviso pasa a celeste plano con texto tinta, y el footer lleva los h5 en Fredoka 600, sin mayúsculas ni `letter-spacing`.

- [ ] **Step 4: Sincronizar y verificar.**

```bash
bash /tmp/mipprueba/sincronizar.sh && node /tmp/mipprueba/verificar.js --paginas inicio,catalogo,panelProfesor,panelAlumno --anchos 390,1024,1280 --chequeos sinErrores,sinBordeNegroEnReposo,sinSombraDura,toque44,headerEnUnaLinea,focoVisible,idsDelJs --flujos accionPanel
```

Se espera PASA. Además, a 390 el drawer tiene que abrir y cerrar (lo comprueba la captura con el drawer abierto) y `#insigniaNotificaciones` tiene que cambiar con `accionPanel`.

- [ ] **Step 5: Commit.**

```bash
git commit -am "Rediseño 4/11: header con sombra, aviso y footer"
```

---

### Task 5: Barrido de cejas, `mark` en los h2 y flechas

**Files:**
- Modify: `Views/Home/Index.cshtml`: píldoras en 98, 133, 174, 229, 257 y 306; `mark` en los h2 de 99, 134, 175, 230, 258 y 307; `bi-arrow-right` en 248 y 314.
- Modify: `Views/Home/Soporte.cshtml`: píldoras en 8, 59 y 80; `mark` en 60 y 81; flechas.
- Modify: `Views/Catalogo/Index.cshtml:17`, `Views/Home/Privacy.cshtml:8` y `Views/Sesion/IniciarSesion.cshtml:14`.
- Modify: `Views/Sesion/Registrarse.cshtml:18`: la ceja pasa a `<span class="pegatina celeste">` en la esquina de la tarjeta.
- Modify: `wwwroot/css/site.css`: borrar `.encabezadoSeccion .pildora`, `.cabecera .pildora` y `.acceso .encabezadoAcceso .pildora`.

Los números de línea son de `main` antes de empezar. Ubicarlos con grep si se movieron.

- [ ] **Step 1:** `node /tmp/mipprueba/verificar.js --paginas inicio,soporte,catalogo,iniciarSesion --anchos 1280 --chequeos sinCejas,marksPermitidos`. Se espera FALLA.
- [ ] **Step 2: Borrar** las píldoras de ceja, las etiquetas `<mark>` de los h2 (el texto queda), las flechas y el CSS listado.
- [ ] **Step 3: Sincronizar y verificar.** Correr el mismo comando con `sinErrores,sinCejas,marksPermitidos` agregando `registrarse,privacidad`. Se espera PASA. Además, `grep -rn 'class="pildora' Views` solo tiene que mostrar `Perfil.cshtml` y `PanelControl.cshtml`.
- [ ] **Step 4: Commit.**

```bash
git commit -am "Rediseño 5/11: sin cejas, mark solo en h1 y sin flechas"
```

---

### Task 6: Inicio

**Files:**
- Modify: `Views/Home/Index.cshtml`: secciones portada, cinta, pasos, perfiles, funciones, destacados, opiniones (se borra), preguntas y llamado final.
- Modify: `wwwroot/css/site.css`, 3.1 a 3.9 (1335–1956). Se borra 3.7 entero (carrusel y opiniones).
- Modify: `wwwroot/js/site.js`: borrar `inicializarCarruseles` (416–) y su llamada (1688).

**Interfaces:**
- Consumes: `.pegatina`, `.plancha`, `--fondoLavado`, `.card.coral` y `.card.oscura` de las Tareas 1 y 2.
- **No cambian:** `#campoBusqueda`, `#mensajeErrorBusqueda`, `onsubmit="return validarBusqueda()"`, `.cinta` y `#acordeonPreguntas`.
- `materiasDestacadas` sigue llegando del controlador y la vista deja de usarla.

**Portada** (`.portada > .container`):
- `--fondoLavado`, `border: 1.5px solid var(--colorBorde)`, `border-radius: 2.25rem`, `padding: clamp(1.5rem,4vw,3.5rem)` y `box-shadow: 0 30px 60px -36px rgba(17,24,39,.35)`.
- h1: `El conocimiento <mark>nos conecta.</mark>`.
- p: `En miProfesor creemos que aprender nunca debería depender de la suerte.`
- `.composicion` pasa a `.plancha` con 5 `.pegatina`, cada una con `style="--giro:…; --retraso:…"`:
  - tarjeta de profe con materias reales;
  - "Clase confirmada" en `.pegatina.celeste`: `Física I: Dinámica` / `Viernes, 18:30 hs`;
  - chat: `¿Tenés el programa del colegio a mano?`;
  - círculo MIP;
  - `I <i class="bi bi-heart-fill"></i> MIP`.
- "Tutorías entre colegios" pasa a `.pegatina.celeste`.
- Se borran las `.figura` y el "★ 4,9".

**Resto de la página:**
- **Cinta:** coral plana, recta, con `Flexible · Comunidad · Aprendizaje · Conexión · Diversión · Innovación · Accesibilidad`, separadores `✦` blancos y `aria-hidden="true"`.
- **Perfiles:** alumno en `.card.coral` con botón `boton`; profesor en `.card.oscura` con botón `boton secundario`.
- **Destacados:** `asp-route-colegio="Nacional Buenos Aires"` y `@if (profesoresDestacados.Count == 0)` con un texto vacío.
- **Llamado final:**
  - la sección es blanca;
  - el `.container` lleva `background: radial-gradient(36rem 24rem at 100% 50%, rgba(255,87,87,.45), transparent 65%), var(--colorTinta)` y `border-radius: 2rem`;
  - se borra `.llamadoFinal::before`.

- [ ] **Step 1:** `node /tmp/mipprueba/verificar.js --paginas inicio --anchos 390,1280 --chequeos texturasPermitidas,unSoloMomento,pegatinasVisiblesSinMovimiento,sinBordeNegroEnReposo,sinSombraDura`. Se espera FALLA.
- [ ] **Step 2: Escribir la vista y el CSS** según lo de arriba y la maqueta "Inicio" del lienzo.
- [ ] **Step 3: Sincronizar y verificar.**

```bash
bash /tmp/mipprueba/sincronizar.sh && node /tmp/mipprueba/verificar.js --paginas inicio,quienesSomos --anchos 390,768,1024,1280,1920 --chequeos sinErrores,sinScroll,sinBordeNegroEnReposo,sinSombraDura,sinBlancoSobreCoral,texturasPermitidas,toque44,marksPermitidos,sinCejas,unSoloMomento,pegatinasVisiblesSinMovimiento,idsDelJs --capturas /tmp/mipprueba/capturas/t6
```

Se espera PASA.
- Además, `curl -s 'http://localhost:5080/Catalogo?colegio=Nacional%20Buenos%20Aires'` tiene que devolver HTML con `profesorFila` (al menos 1).
- Se comparan las capturas a 1280 con la maqueta "Inicio".

- [ ] **Step 4: Commit.**

```bash
git commit -am "Rediseño 6/11: Inicio con portada clara, cinta recta y sin opiniones inventadas"
```

---

### Task 7: Cabecera compartida y Catálogo

**Files:**
- Modify: `wwwroot/css/site.css`, 3.10 (1957–2016) y 3.11 (2017–2289). Se borra `.cabecera.oscura`.
- Modify: `Views/Catalogo/Index.cshtml`: cabecera en dos columnas (`col-12 md:col-7` / `col-12 md:col-5 d-none md:d-block` con `aria-hidden` y una `.plancha` de 3 pegatinas: Flexible, Comunidad y Accesibilidad) y "Limpiar filtros" (`type="reset" form="formularioFiltros"`) dentro de `#sinResultados`.
- Modify: `Views/Home/Soporte.cshtml` y `Views/Home/Privacy.cshtml`: la cabecera pasa a la clara. La de Soporte deja de ser `.oscura`.

**Interfaces:**
- `catalogo.js` **no cambia**: `.profesorFila`, `.cuerpo`, `.lateral`, `.importe`, `.etiquetas`, `span.puntos`, `button.numero.activo` y `[data-pedir-clase]`.
- La visibilidad responsive va en la columna, nunca sobre `.pegatina`.

- [ ] **Step 1:** `node /tmp/mipprueba/verificar.js --paginas catalogo,soporte,privacidad --anchos 1280 --chequeos texturasPermitidas,sinBordeNegroEnReposo,toque44`. Se espera FALLA.
- [ ] **Step 2: Escribir el CSS y las vistas.**
  - `.cabecera` lleva `background: var(--fondoLavado)`, sin borde, alineada a la izquierda y sin `max-width: 50rem`.
  - `.drawer-title` en tinta.
  - Paginador de 2.75rem con el activo en tinta.
  - `#listaProfesores[aria-busy="true"]{opacity:.45}`.
- [ ] **Step 3: Sincronizar y verificar.**

```bash
bash /tmp/mipprueba/sincronizar.sh && node /tmp/mipprueba/verificar.js --paginas catalogo,soporte,privacidad --anchos 390,768,1024,1280,1920 --chequeos sinErrores,sinScroll,sinBordeNegroEnReposo,sinSombraDura,sinBlancoSobreCoral,texturasPermitidas,toque44,unSoloMomento,idsDelJs --flujos catalogoFiltros --capturas /tmp/mipprueba/capturas/t7
```

Se espera PASA. Hay que comprobar a 1024 que los filtros se ven en línea.

- [ ] **Step 4: Commit.**

```bash
git commit -am "Rediseño 7/11: cabecera clara compartida y Catálogo"
```

---

### Task 8: Acceso, Soporte, Error y Quiénes somos

**Files:**
- Modify: `wwwroot/css/site.css`:
  - 3.12 (2290–2617): `.acceso` con lavado; `.ilustracion` coral con texto tinta y `.ilustracion.oscura` tinta; se borra `flotarTarjeta`; el rol elegido lleva borde tinta con fondo `--colorCelesteSuave`;
  - 3.13 (2618–2651): `#mensajeAyuda` usa `.resultadoAyuda`;
  - 3.15 (3953–4120): se reescribe.
- Modify: `Views/Sesion/IniciarSesion.cshtml` y `Registrarse.cshtml`: pegatinas en `.ilustracion` (logo, lema, `I <i class="bi bi-heart-fill"></i> MIP` y un valor del Miro).
- Modify: `Views/Home/Soporte.cshtml`:
  - "Ver guía" pasa a "Ver preguntas";
  - `maxlength`: 100 en nombre, 150 en correo y 1000 en mensaje;
  - los accesos rápidos usan `.icono`.
- Modify: `Views/Shared/Error.cshtml`: en español, dentro de `<section class="paginaError">`, con salidas a Inicio y Soporte. Se borra el bloque Development Mode.
- Modify: `Views/Home/QuienesSomos.cshtml`: se reescribe con el orden del spec §4, los textos de `frases-miro.md` tal cual, y `id="equipo"`.
- Delete: las 8 `.webp` de `wwwroot/img` que solo usa Quiénes somos. Antes de borrarlas, verificar con `grep -rn "<nombre>" Views wwwroot`.

**Interfaces:**
- **No cambian:**
  - `#formularioIngreso`, `#formularioRegistro`, `input[name='tipoUsuario']` y `[data-solo-rol]` con `hidden` en el mismo div;
  - `[data-ver-contrasena]` con un hijo `.bi`;
  - `#campoAyuda`, `#mensajeAyuda`, `#sinCoincidencias`, `#acordeonPreguntas` y `#formularioContacto` con sus campos.

- [ ] **Step 1:** `node /tmp/mipprueba/verificar.js --paginas iniciarSesion,registrarse,soporte,error,quienesSomos --anchos 1280 --chequeos texturasPermitidas,sinBordeNegroEnReposo,sinSombraDura,sinBlancoSobreCoral`. Se espera FALLA.
- [ ] **Step 2: Escribir el CSS y las vistas** según el spec §4 y las maquetas "Iniciar sesión y Registrarse", "Soporte (+ página de Error)" y "Quiénes somos (de cero)".
- [ ] **Step 3: Sincronizar y verificar.**

```bash
bash /tmp/mipprueba/sincronizar.sh && node /tmp/mipprueba/verificar.js --paginas iniciarSesion,registrarse,soporte,error,quienesSomos,privacidad --anchos 390,768,1024,1280,1920 --chequeos sinErrores,sinScroll,sinBordeNegroEnReposo,sinSombraDura,sinBlancoSobreCoral,texturasPermitidas,toque44,marksPermitidos,sinCejas,unSoloMomento,pegatinasVisiblesSinMovimiento,idsDelJs --capturas /tmp/mipprueba/capturas/t8
```

Se espera PASA. Además, con Playwright:
- en Registrarse, al elegir "profesor" el panel `[data-solo-rol="profesor"]` deja de tener `hidden`;
- en Soporte, escribir "clase" en `#campoAyuda` deja visible al menos un `details`;
- `grep -rn "\.webp" Views/Home/QuienesSomos.cshtml` da 0 líneas.

- [ ] **Step 4: Commit.**

```bash
git commit -am "Rediseño 8/11: acceso, soporte, error en español y Quiénes somos de cero"
```

---

### Task 9: Perfil y sus modales

**Files:**
- Modify: `wwwroot/css/site.css`, 3.16 (4121–5166).
- Modify: `Views/Home/Perfil.cshtml`, solo si hace falta para el orden: Reportar al final y, opcionalmente, Datos primero en el celular con `lg:order-last` y `align-self-start`.

**Interfaces:**
- **No cambian:** todos los ids de la lista `perfil` en `organizacion-por-pagina.json` → `clasesDelJs`. Los críticos son:
  - `#tipoPerfil`, `#estadoVerificadoPerfil` y `#tickPerfil`;
  - `#cifrasPerfil > li` (i.bi + strong + span);
  - `#botonMeGusta` (con `.activo`, `.saltoCorazon` y `.corazonVolador`);
  - `#botonAmistad`, que alterna `.principal` y `.contorno`;
  - el AntiForgeryToken y `[data-dar-resena]` dentro de `#perfil`;
  - Quill (`.ql-*`) y Cropper (`.cropper-*`).

**Cómo queda:**
- **Franja:** `.portadaPerfil` conserva el degradado y los puntitos, solo pierde el `border-bottom`.
- **Tarjeta del titular:** sin borde y con `--sombraFlotante`.
- **Avatar:** aro celeste. `pegarPegatina` solo en `.cabeceraPerfil .avatar`.
- **Cifras:** fichas con `--colorCoralSuave` o `--colorCelesteSuave`.
- **Me gusta activo:** magenta con corazón blanco.
- **Datos:** h3 sin mayúsculas.
- **Estrellas:** coral, y las vacías del diálogo de reseña en #6B7280.

- [ ] **Step 1:** `node /tmp/mipprueba/verificar.js --paginas perfilProfe,perfilPropio --anchos 1280 --chequeos sinBordeNegroEnReposo,sinSombraDura,sinBlancoSobreCoral`. Se espera FALLA.
- [ ] **Step 2: Escribir el CSS** según la maqueta "Perfil de un profesor + modal Editar perfil".
- [ ] **Step 3: Sincronizar y verificar.**

```bash
bash /tmp/mipprueba/sincronizar.sh && node /tmp/mipprueba/verificar.js --paginas perfilProfe,perfilPropio --anchos 390,768,1024,1280,1920 --chequeos sinErrores,sinScroll,sinBordeNegroEnReposo,sinSombraDura,sinBlancoSobreCoral,texturasPermitidas,toque44,unSoloMomento,idsDelJs --flujos snackbar,dialogos --capturas /tmp/mipprueba/capturas/t9
```

Se espera PASA. Además, con Playwright:
- `/Home/Perfil?editar=true` abre `#dialogoEditarPerfil`;
- pulsar `#botonMeGusta` cambia `#cantidadLikesPerfil` (después se vuelve a pulsar para dejarlo como estaba).

- [ ] **Step 4: Commit.**

```bash
git commit -am "Rediseño 9/11: Perfil y modales sin bordes negros"
```

---

### Task 10: Panel de Control

**Files:**
- Modify: `Views/Home/PanelControl.cshtml`:
  - saludo con `--fondoLavado` y pegatinas de rol y contadores, que conservan **exactos** `#contadorClasesActivas` y `#contadorClasesCompletadas`;
  - se borra `.metricas` y `#insigniaChat` pasa al botón de la pestaña Chat;
  - notificaciones en dos columnas **dentro** de `#notificaciones`.
- Modify: `wwwroot/css/site.css`:
  - 3.14 (2652–3952, sin las reglas de diálogo ya mudadas);
  - `.requiereAccion` con banda magenta plana y texto blanco;
  - "Clases que requieren tu acción" con fondo `--colorCoralSuave`;
  - `.avisoAgenda` celeste plano;
  - `.linea.azul` en tinta y `.linea.gris` en #6B7280;
  - `.etiquetaEstado` sin giro;
  - calendario y agenda lado a lado desde `lg`;
  - se borran `--colorAzul` y `--colorAzulSuave` del `:root`.

**Interfaces:**
- **No cambian:** todo lo de la lista `panel` → `clasesDelJs`. Eso incluye las clases que generan `calendario.js` (`azul`, `rojo`, `gris`, `punteada`), `miAgenda.js`, `chat.js` e `historial.js`, y `a.boton[href*='/Home/PanelControl']`.

- [ ] **Step 1:** `node /tmp/mipprueba/verificar.js --paginas panelProfesor,panelAlumno --anchos 1280 --chequeos sinBordeNegroEnReposo,sinSombraDura,sinBlancoSobreCoral,texturasPermitidas`. Se espera FALLA.
- [ ] **Step 2: Escribir la vista y el CSS** según la maqueta "Panel de Control (profesor)".
- [ ] **Step 3: Sincronizar y verificar.**

```bash
bash /tmp/mipprueba/sincronizar.sh && node /tmp/mipprueba/verificar.js --paginas panelProfesor,panelAlumno --anchos 390,768,1024,1280,1920 --chequeos sinErrores,sinScroll,sinBordeNegroEnReposo,sinSombraDura,sinBlancoSobreCoral,texturasPermitidas,toque44,unSoloMomento,idsDelJs --flujos dialogos,accionPanel,chat --capturas /tmp/mipprueba/capturas/t10
```

Se espera PASA. Además:
- a 1280 la parte de arriba de `#diasMes` tiene que estar por encima de los 900 px;
- `/Home/PanelControl?tab=chat&chat=<id>` abre esa conversación.

- [ ] **Step 4: Commit.**

```bash
git commit -am "Rediseño 10/11: Panel de Control con saludo, notificaciones y calendario D"
```

---

### Task 11: Limpieza final, documentación y pasada completa

**Files:**
- Modify: `wwwroot/css/site.css`:
  - reemplazar cada `var(--bordeMarcado)` por `1.5px solid var(--colorBorde)`;
  - reemplazar `--sombraMarcada*` por `--sombraSuave` o `--sombraFlotante`, y `--colorCoralOscuro` por `--colorMagenta`;
  - borrar los alias, `--colorPapel`, `--colorTintaSuave` y `--colorCelesteOscuro`, si ya no tienen usos.
- Modify: `Info/guiaDeEstilo.md`: el vocabulario nuevo, la regla de texturas, `mark` y lo elegido. Se borran las menciones a `.cabecera.oscura`, `.identidad`, `.proceso`, `.opiniones` y "píldora + h2 + p centrados".
- Modify: `Info/log.md`: una entrada con la fecha, qué cambió, qué se borró (Opiniones, accesos rápidos, fade-up, carrusel y las 8 `.webp`) y los dos bugs arreglados ("Nacional Buenos Aires" y la insignia del admin).

- [ ] **Step 1: Grep de limpieza.**

```bash
grep -cE 'bordeMarcado|sombraMarcada|colorCoralOscuro' wwwroot/css/site.css
grep -nE '[0-9]px [0-9]px 0 (var\(--colorTinta\)|#000)' wwwroot/css/site.css
grep -n 'text-transform: uppercase' wwwroot/css/site.css
```

Se espera:
- el primero da `0`;
- el segundo solo muestra la capa `6px 6px 0 var(--colorCeleste)` del hover de `.card`, o nada;
- en el tercero, revisar uno por uno que ninguno sea una ceja.

- [ ] **Step 2: Pasada completa.**

```bash
bash /tmp/mipprueba/sincronizar.sh && node /tmp/mipprueba/verificar.js --paginas inicio,catalogo,perfilProfe,perfilPropio,panelAlumno,panelProfesor,iniciarSesion,registrarse,soporte,privacidad,error,quienesSomos --anchos 390,768,1024,1280,1920 --chequeos sinErrores,sinScroll,sinBordeNegroEnReposo,sinSombraDura,sinBlancoSobreCoral,texturasPermitidas,toque44,sinRevelar,marksPermitidos,sinCejas,idsDelJs,focoVisible,unSoloMomento,pegatinasVisiblesSinMovimiento,headerEnUnaLinea --flujos dialogos,catalogoFiltros,accionPanel,snackbar,chat --capturas /tmp/mipprueba/capturas/final
```

Se espera PASA en todo. Se miran las capturas a 390 y 1280 de cada página contra su maqueta.

- [ ] **Step 3: Revisión de código.** Usar superpowers:requesting-code-review sobre el diff completo desde `606da57`.

- [ ] **Step 4: Commit.**

```bash
git commit -am "Rediseño 11/11: limpieza de alias y documentación"
```

- [ ] **Step 5: Entrega.** Seguir superpowers:finishing-a-development-branch, con la preferencia de Jarsou:
  - copiar los archivos cambiados a `D:\eitug\Descargas\MIP-MIPROFESOR` por la carpeta conectada, sin commit;
  - si la PC no está conectada, dejar `git diff 606da57 > /mnt/project-files/rediseno/rediseno-visual.patch` y avisar.
