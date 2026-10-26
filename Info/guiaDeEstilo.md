# GUÍA DE ESTILO — cómo se escribe el código en MIP

> Filosofía de Eitan (de `TP-Sala-de-escape`, `bootstrap` y `TP06-ARTE`) para que todo esté donde se espera. Ver también [systemPrompt.md](systemPrompt.md) y [log.md](log.md).


## 1. La filosofía en una frase

**Pocas clases, muy reutilizadas, que cambian de aspecto según dónde están.**
Una clase base (`.boton`, `.card`, `.icono`) + un modificador de una palabra (`.principal`, `.coral`, `.celeste`) + selectores descendientes (`.perfiles .card li`) para especializar sin inventar nombres nuevos.


## 2. CSS: un solo archivo, en orden fijo

`wwwroot/css/site.css` es el **único** CSS propio. Se recorre de arriba hacia abajo como se recorre la página:

| Bloque | Qué va |
|---|---|
| `0) VARIABLES Y BASE` | `@font-face`, `:root` con la marca, mapeo a los tokens `--bs-*`, escala en pantallas grandes |
| `1) HEADER` | Encabezado, logo, menú, drawer móvil, menú de usuario |
| `2) ETIQUETAS GENERALES Y COMPONENTES REUTILIZABLES` | `section`, `h1…h5`, `mark`, `a`, `.pildora`, `.boton`, `.card`, `.icono`, `.pegatina`, `.plancha`, `.badge`, `.avatar`, formularios, `.buscador`, `.burbuja`, animaciones |
| `3) MAIN` | Una sub-sección por zona **en el orden en que aparecen en la página** (`.portada`, `.cinta`, `.pasos`, `.perfiles`, `.frases`, `.destacados`, `.preguntas`, `.llamadoFinal`, luego cada página: `.cabecera`, `.catalogo`, `.acceso`, `.ayuda`, `.saludo` y `.panel`, `.presentacion`, `.mision`, `.equipo`, `.perfil`) |
| `4) FOOTER` | `.pie` |
| `5) ACCESIBILIDAD DE MOVIMIENTO` | `prefers-reduced-motion` |

### Comentarios
Banner de **3 líneas** para cada bloque grande, línea con guiones para cada página o componente, y un comentario de **una línea** para lo que se ve raro:

```css
/* =========================================================
   3) MAIN
   ========================================================= */

/* ---------- 3.11 Catálogo ---------- */

/* Desde lg el formulario es la tarjeta con borde */
```

Los comentarios explican **por qué** (un bug de Bootstrap, una decisión de diseño), no repiten lo que dice la regla.

### Nombres
- `camelCase`, en español, descriptivos: `.llamadoFinal`, `.enlacesExternos`, `.mensajeError`.
- Nada genérico (`hero`, `box`, `item1`). La portada es `.portada`, no `.hero`.
- Una palabra para los **modificadores**: `.boton .principal`, `.card .coral`, `.icono .celeste`.
- La zona (`<section class="catalogo">`) le da el contexto a todo lo de adentro: no hace falta repetirlo en cada hijo.

### Cómo se reutiliza (vocabulario base)

| Base | Modificadores | Se especializa con |
|---|---|---|
| `.boton` | `.principal` `.secundario` `.contorno` `.oscuro` `.claro` `.chico` | `.buscador .boton`, `.acceso .boton.completo` |
| `.card` | `.coral` `.oscura` `.estadoVacio`. Solo levitan las que se abren: `a.card`, `.profesor`, `.profesorFila` | `.perfiles .card.oscura`, `.manifiesto .card` |
| `.icono` | `.celeste` `.oscuro` (base: coral suave con ícono magenta) | `.perfiles .card .icono`, `.notificaciones .notificacion .icono` |
| `.pegatina` | `.coral` `.celeste` `.magenta` `.oscura` `.redonda` (sin modificador: blanca) | `.cabecera .pegatina`, `.saludo .plancha` |
| `.plancha` | — | contenedor de pegatinas sueltas, con margen para el troquel |
| `.pildora` | — | solo un dato real (el rol en el Perfil y en la lista de amigos) |
| `.encabezadoSeccion` | — | h2 + p centrados al inicio de cada sección |
| `.cabecera` | — | portada clara de Catálogo, Soporte y Privacidad (Quiénes somos usa `.presentacion`) |
| `.badge`, `.avatar`, `.burbuja` | — | `.destacados .colegios .badge`, `.saludo .avatar`, `.chat .burbuja` |

Antes de crear una clase nueva: ¿se resuelve con una existente + un selector descendiente? Si sí, no se crea.

### Reglas visuales (dirección D · Plancha de pegatinas)
- **Tokens nuevos**: `--troquel` (anillo gris de las pegatinas), `--fondoLavado` (puntos + brillo coral y celeste), `--colorFoco` (anillo de foco: tinta, y celeste sobre fondo oscuro), `--sombraSuave` (tarjetas), `--sombraFlotante` (buscador, diálogos), `--sombraCoral` (tarjeta coral), `--sombraTinta` (tarjeta oscura), `--sombraPanel` (contenedores con lavado), `--sombraAvatar` (avatares) y `--anilloFoco` (foco de los campos).
- **Tonos exactos**: no se agrega ningún hex. Todo sale de los tokens de `:root`; las transparencias usan el RGB de esos tonos (tinta 17,24,39 · coral 255,87,87 · celeste 92,225,230 · magenta 213,31,71).
- **60/20/20**: 60 % colores planos con sombras suaves, 20 % degradados tranquilos y 20 % texturas, siempre ligeras. Texto sobre coral y celeste: tinta, nunca blanco; el blanco va solo sobre tinta, magenta o verde de éxito.
- **Lo elegido** (link activo, pestaña activa, día y franja elegidos, página actual, check) = fondo tinta con texto blanco. Única excepción: el rol elegido en Registrarse (borde tinta, fondo celeste suave).
- **Sin animaciones de entrada**: nada se anima al cargar ni al abrir un diálogo o una pestaña (`tab-pane-instant`). Quedan las que dicen algo: cinta, `girarCarga`, `sacudirError`, Me gusta, `resaltarClase`. Hover solo en lo clickeable y dentro de `@media (hover: hover)`; una sola curva, `--curvaSuave`.
- **Dos texturas**: la franja de `.perfil .portadaPerfil` y `--fondoLavado` (solo en `.portada > .container`, `.cabecera`, `.saludo`, `.acceso`, `.paginaError`, `.presentacion`). Lo demás es plano.
- **`mark`**: solo en un h1 por página y en el h2 de `.llamadoFinal`.
- **Prohibido**: cejas (píldoras en mayúsculas sobre los títulos), flechas `bi-arrow-right` pegadas a los links, emojis en el HTML (el corazón es `<i class="bi bi-heart-fill">`), bordes de color de un solo lado, el ✦, cifras o testimonios inventados.
- **Toque**: todo control interactivo mide 44 px, también campos, selects y los nombres que llevan a un perfil (`btn-close` y quitar etiqueta, 24 px). Los links dentro de una frase quedan afuera.

### Tipografías (una variable por rol, en `:root`)
- `--fuenteTitulos` → **Eras Bold ITC**: solo `h1`, `h2`, logo y lema. No se usa en `h3` ni en texto corrido.
- `--fuenteMarca` → **Fredoka**: botones, etiquetas, cifras y precios.
- `--fuenteTexto` → **Plus Jakarta Sans**: párrafos, formularios y todo lo demás.
- Eras tiene un solo peso: el `@font-face` declara `font-weight: 100 900` para que el navegador no la engrose.

### Bootstrap hace el layout, el CSS propio hace la marca
- Grilla, espaciado, alineación y visibilidad van **en el HTML** con utilidades de Bootstrap (`row`, `col-*`, `d-flex`, `gap-3`, `md:col-6`).
- `site.css` no repite lo que Bootstrap ya da: solo color, borde, sombra, tipografía y detalles de marca.
- Lo repetido se ata a **variables** (`--colorCoral`, `--colorTinta`, `--sombraSuave`, `--troquel`, `--espacioSeccion`…), no a valores sueltos.


## 3. HTML / Razor

- `<section class="zona">` para cada zona grande y **aislada**; `<div>` para los ítems de adentro.
- Una sección = una clase propia (`<section class="pasos">`). El orden del HTML coincide con el orden del CSS.
- Partials para lo que se repite (`_marcaLogo`, `_tarjetaProfesor`, `_preguntasFrecuentes`, `_encabezadoInvitado/Usuario`, `_piePagina`).
- Los datos salen de la BD (SP); lo que falta conectar lleva `TODO BD:`. La vista nunca inventa datos.
- Sesión: `@if (Context.Session.GetString("idUsuario") == null) { … }` (sintaxis de systemPrompt).
- Íconos: `<i class="bi bi-nombre" aria-hidden="true"></i>` (Bootstrap Icons local).


## 4. JavaScript

- `site.js` (común) + un archivo por función grande (`catalogo.js`, `clases.js`, `historial.js`, `chat.js`). **Una función por cosa**, cada una sale temprano si su elemento no existe; en `site.js` todas se llaman desde `inicializarSitio()`.
- Validación con el patrón del systemPrompt (`mensaje.innerHTML = "…"; mensaje.style.display = "block"; return false;`) mediante `mostrarMensaje` / `mostrarErrorEnCampo`.
- Nombres de función = verbo + objeto: `validarRegistro`, `inicializarFiltrosCatalogo`, `enviarMensajeChat`.


## 5. Bootstrap 6 (alpha): lo que hay que saber para no perder tiempo

`wwwroot/lib/bootstrap/dist`, **6.0.0-alpha.1** (puede cambiar).

1. **Los breakpoints son prefijos, no sufijos**: `md:col-6`, `lg:navbar-expand`, `sm:d-none`, `lg:order-2`. (En BS5 era `col-md-6`, `order-lg-2`.) Breakpoints: sm 576 · md 768 · lg 1024 · xl 1280 · 2xl 1536.
2. **JS solo como módulo ES**: el layout lo carga con `<script type="module" src="~/lib/bootstrap/dist/js/bootstrap.bundle.min.js">`. No sirve un `<script>` común ni jQuery.
3. **Componentes nuevos**: Drawer (`<dialog class="drawer drawer-end">`, `data-bs-toggle="drawer"`) en vez de offcanvas; Dialog (`<dialog>`) en vez de modal; Menu en vez de dropdown; acordeón con `<details name="…">`; carrusel con scroll-snap (`--bs-carousel-items` se define **en el `.carousel`**, no en un ancestro).
4. **Capas (`@layer`)**: los estilos de Bootstrap están en capas, así que el CSS propio (sin capa) gana en declaraciones normales. **Pero** Bootstrap usa `!important` dentro de capas en algunos casos (por ejemplo `.lg:drawer` desde 1024px): ahí no se puede pisar. La salida es estilar el **hijo** (el `form` dentro del drawer es la tarjeta con borde), no el contenedor.
5. **El header responde al contenedor, no a la ventana**: `.navbar` es `container-type: inline-size`, por eso las reglas del header usan `@container (width >= 1024px)` y no `@media`. Con `@media` el corte difiere ~15px (ancho de la barra de scroll).
6. **Tokens**: el tema se arma con `--bs-*` y las clases `theme-*`. En `:root` se mapea `primary` = coral, `accent` = celeste, `danger` = magenta `#D51F47`, `inverse` = tinta. Los colores de enlace salen de `--bs-theme-fg`.
7. `text-danger` ya no existe como en BS5: se usa `fg-danger`.


## 6. Antes de dar algo por terminado

- Revisar a **390, 768, 1024, 1280 y 1920 px**: sin scroll horizontal ni errores en consola.
- Que toda clase usada en las vistas exista en `site.css` o en Bootstrap.
- Que el orden de `site.css` siga Header → generales → Main (en orden de página) → Footer.
- Agregar una entrada nueva en el **Historial de cambios** de [log.md](log.md).
