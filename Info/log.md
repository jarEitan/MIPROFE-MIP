# LOG — MiProfesor (MIP)

Contexto para seguir programando. Reglas: [systemPrompt.md](systemPrompt.md); estilo: [guiaDeEstilo.md](guiaDeEstilo.md). Sumar una entrada al **Historial** cada vez que se trabaje.

## 1. Proyecto

Plataforma que conecta **alumnos** con **profesores** de su **colegio** (solo CABA). Misión: *"Una plataforma donde cada docente puede compartir su conocimiento y cada alumno encontrar la ayuda que necesita."*

Funciones: registro Alumno/Profesor, catálogo con filtros, clases presenciales o virtuales, Panel de Control (Mis clases, Chat directo, Historial), cancelar/reubicar, reseñas, likes, amigos, soporte (FAQ + contacto).

Equipo: Francisco Martinez (Project Leader), Tobias Schatzyki (BD), Eitan Ariel Glaz (front), Ariel Chocron (back).

Diseño: [Figma](https://www.figma.com/design/HDhfuOx62CKtV0MSiQWDl4/MIP), [Miro](https://miro.com/app/board/uXjVHVYvc3g=/), prototipos Netlify de [Panel](https://eclectic-semolina-f2b73a.netlify.app/) y [Soporte](https://gorgeous-crumble-edc300.netlify.app/) (solo el estilo).

## 2. Stack

| Capa | Tecnología |
|---|---|
| Framework | ASP.NET Core MVC **.NET 9** (namespace `MIP_MIPROFESOR`), Razor |
| CSS | **Bootstrap 6.0.0-alpha.1** local + un solo `wwwroot/css/site.css` |
| JS | Vanilla: `site.js` (todas las páginas), `clases.js` (todas), `catalogo.js`, `historial.js`, `chat.js` (solo donde se usan). Bootstrap como **módulo ES**; sin jQuery (si una vista usa `_ValidationScriptsPartial`, cargarlo en su `@section Scripts`) |
| Libs locales (`wwwroot/lib`) | Bootstrap Icons 1.11.3 (`<i class="bi bi-x" aria-hidden="true">`), Quill 2 (Sobre mí), Cropper.js 1.6.2 (foto) |
| Fuentes (`wwwroot/fonts`) | Eras Bold ITC (`--fuenteTitulos`), Fredoka (`--fuenteMarca`), Plus Jakarta Sans (`--fuenteTexto`) |
| BD | SQL Server 2022 + Dapper + Microsoft.Data.SqlClient. **Todo por stored procedures**; consultas en `Models/BD.cs` (login/registro en `BDsesion.cs`). Script único: `MIP-BD.sql` (tablas, SP, funciones y datos de prueba) |
| Otros NuGet | HtmlSanitizer (limpia el HTML de Sobre mí), SkiaSharp (re-encode de fotos) |
| Sesión | Claves `idUsuario`, `nombre`, `apellido`, `tipoUsuario`, `fotoPerfil`, `verificado`, `datosFaltantes`, `cantidadNotificaciones`. Cultura `es-AR` |

**Arquitectura**: navegación en `HomeController` (y `SesionController`); cada función con fetch + BD en su propio controlador (`Perfiles`, `Catalogo`, `Likes`, `Clases`, `Notificaciones`, `Historial`, `Mensajes`, `Amigos`, `Resenas`). El usuario siempre sale **de la sesión**, nunca del pedido; todos los POST llevan `[ValidateAntiForgeryToken]`. Lo que viene de la BD se pinta con `textContent`.

## 3. Sistema de diseño

| Variable | Valor | Uso |
|---|---|---|
| `--colorCoral` | `#FF5757` | Marca, botón principal (`primary`) |
| `--colorMagenta` | `#D51F47` | Alertas, hover de links, errores (`danger`) |
| `--colorCeleste` | `#5CE1E6` | Acento, pegatinas, foco sobre fondo oscuro (`accent`) |
| `--colorTinta` | `#111827` | Texto, lo elegido, footer (`inverse`) |
| `--colorBorde` | `#E5E7EB` | Borde de reposo de tarjetas y botones |

- **Plancha de pegatinas**: tarjetas blancas con borde gris y sombra suave, pegatinas troqueladas y giradas, texto tinta sobre coral y celeste, lo elegido en tinta con texto blanco; sin bordes negros en reposo. Reglas completas en la [guía](guiaDeEstilo.md) (sección 2).
- Solo dos texturas: la franja del Perfil y `--fondoLavado`. `<mark>` celeste solo en un h1 por página y en el h2 de `.llamadoFinal`; sigla "MIP" gigante en el footer.
- Tamaños con `clamp()`; la raíz sube a 112,5 % desde 1536px y 125 % desde 1920px. Header y filtros usan `@container`.
- Animaciones: sin animaciones de entrada (desde el 2026-10-23). Quedan la cinta de palabras, `girarCarga`, `sacudirError`, Me gusta, `resaltarClase` y el hover de lo clickeable dentro de `@media (hover: hover)`. Con `prefers-reduced-motion` todo queda quieto y visible.
- ⚠️ Nunca poner `backdrop-filter`, `transform` ni `filter` en el header (rompe los `position: fixed` del drawer).

## 4. Archivos

```
Controllers/   Home (Index, Soporte, QuienesSomos, PanelControl, Perfil, Privacy), Sesion (IniciarSesion, Registrarse, CerrarSesion) + uno por función con fetch
Views/Shared/  _Layout, _encabezadoInvitado/Alumno/Profesor/Admin, _piePagina, _marcaLogo, _avatarUsuario, _tarjetaProfesor,
               _preguntasFrecuentes, _avisoVerificacion, _dialogoPedirClase, _selectorHorario, _dialogoDarResena
Views/Home/    Index (landing), PanelControl, Perfil, Soporte, QuienesSomos, Privacy ·  Views/Catalogo/Index ·  Views/Sesion/
wwwroot/userData/fotos-perfil/, dni/   Archivos de usuarios (ignorados por git salvo .gitkeep). /userData/dni da 404 siempre
wwwroot/img/   logo.png y logoChico.png (vistas, favicon, og:image)
```

Landing (`Index`): `.portada`, `.cinta`, `.pasos` (`#seccionComoFunciona`), `.perfiles`, `.frases` (plancha de frases del Miro), `.destacados` (3 primeros del catálogo), `.preguntas`, `.llamadoFinal`. Sin cifras ni testimonios inventados.

## 5. Reglas de negocio

- **Clases** (`idEmisor` = quien hizo la última propuesta, `idReceptor` = quien responde; se intercambian al reubicar/cancelar). Duran 60 min. Pendiente: el receptor acepta, rechaza o propone otro horario; quien la pidió la cancela cuando quiera. Confirmada: se cancela con 24 h de anticipación, si no, "Ir al chat". Rechazar un horario deja la clase `Rechazada` (activa hasta su fecha) para proponer otro o cancelar.
- **Sin jobs**: `actualizarEstadosClases(@idUsuario)` (la llaman los SP) pasa Confirmada terminada → Completada y Pendiente vencida → Rechazada.
- **Notificaciones calculadas** (`notificacionesDeUsuario`, sin tabla): solicitudes de amistad pendientes, mensajes `No visto` (una por persona) y clases por responder. Desaparecen solas al resolverse. `clases.js` actualiza la insignia cada minuto.
- **Historial** (`obtenerHistorialClases`, tope fijo 20): propio = Completada, Cancelada y Rechazada vencida; de otro = solo Completadas. Solo el día, sin hora.
- **Reseñas** (`darResena`): solo con una clase Completada, una por persona, 1–5 estrellas + hasta 500 caracteres. Quedan `Aprobada` hasta que haya moderación (entonces cambiar a `Pendiente` en el SP).
- **Amigos**: `idUsuario1` = quien envía. `estadoAmistad`: `ninguna | enviada | recibida | amigos`. Rechazar es desde la notificación (`responderSolicitudAmistad` borra la fila). El catálogo con sesión ordena primero por amigos que completaron clase (`amigosRecomiendan`). No hay seguidores: los Me gusta cumplen ese papel.
- **Verificación**: `faltantesVerificacion` recalcula `Usuarios.verificado` al guardar el perfil; aviso `_avisoVerificacion` en todas las páginas.
- **Fotos**: el navegador recorta (Cropper) y sube WEBP 256×256; el servidor valida (≤5 MB, imagen), recorta al centro, re-encoda WEBP y borra la anterior. El DNI nunca es accesible por URL.
- **Chat**: se actualiza cada 10 s solo con la pestaña visible (leer marca `Visto`). Entrada directa: `/Home/PanelControl?tab=chat&chat=ID`.

## 6. Pendientes

- Moderación de reseñas (admin), filtros avanzados, pedido de alumno por un profesor (V2).
- Reemplazar los `TODO BD` restantes: consulta de Soporte, sugerencias del buscador (`site.js`). `ViewBag.materiasDestacadas` (`HomeController`) ya no lo lee ninguna vista (la cinta muestra las palabras del moodboard): se puede borrar con su `TODO BD`.
- Confirmar la licencia web de Eras Bold ITC (se sirve pública) y pedir imágenes de marca de más de 512px.
- Bootstrap 6 es alpha: revisar cambios antes de actualizar.
- Mejoras posibles: hash de contraseñas, filtro reutilizable de sesión para vistas privadas, ViewModels en vez de ViewBag, imagen OG 1200×630, modo oscuro (ya todo es variable).

## 7. Historial de cambios

Para aplicar cambios de BD: borrar la base `MIP` y correr `MIP-BD.sql`.

- **2026-10-07** — Landing sin sesión con el estilo de los prototipos Netlify; layout, partials de header/footer, `site.css` y `site.js` modulares. Bootstrap Icons y fuentes locales, Open Graph, `aria-current`, sin jQuery.
- **2026-10-08** — Migración a Bootstrap 6 y CSS reorganizado (base + modificador, ver guía). Vistas Catálogo, Soporte, Quiénes somos, Registro, Ingreso, Panel. Cultura `es-AR`.
- **2026-10-09** — Eras Bold ITC (solo h1, h2, logo, lema y sigla); menos espacio vertical (`--espacioSeccion` `clamp(1.75rem, 3.5vw, 3rem)`).
- **2026-10-12** — Perfiles por URL (`/Home/Perfil/5`; sin ID = el propio) y modal "Editar perfil" (Quill, colegios, niveles, materias, modalidades, precio, títulos, foto, datos de cuenta y DNI) con SP `obtenerPerfil`, `obtenerOpcionesPerfil`, `obtenerDatosEdicion`, `guardarPerfilCompleto`. Selector con búsqueda reutilizable (`select[data-buscable]`), `mostrarSnackbar()`, `pedirJson()`.
- **2026-10-13** — Catálogo con fetch (`CatalogoController`, `catalogo.js`, SP `obtenerCatalogo`, paginación 5/10/15/20, filtros en la URL). Catálogos de datos: niveles Secundario 1–6/Terciario/Universitario, ~66 instituciones de CABA, 35 materias. Likes (`obtenerLike`, `alternarLike`) con animación.
- **2026-10-14** — Pedidos de clase y notificaciones (`ClasesController`, `NotificacionesController`, `clases.js`, `_dialogoPedirClase`), Panel actualizado con fetch sin recargar.
- **2026-10-15** — Historial con fetch en Panel y en un modal de cada perfil (`HistorialController`, `historial.js`).
- **2026-10-16** — BD nueva: sin tablas `Chats`/`Notificaciones`; `Mensajes` con emisor/receptor/estado; año "desde" en los colegios del profesor (`idsEscuelas = "20:2015,21:2019"`). Chat real (`MensajesController`, `chat.js`).
- **2026-10-19** — Datos de prueba dentro de `MIP-BD.sql` (~2 años de uso, 456 cuentas `nombre.apellido@mip.edu.ar` / `12345678`; probar con `eitan.glaz@` y `sofia.martinez@`), con fechas relativas a cuando se corre. Aceptar/rechazar amistad desde la notificación. Carpeta `wwwroot/userData`. Modales que solo se cierran si el clic empieza y termina en el fondo (`inicializarCierreDeDialogos`). Se quitó la pestaña Configuración del Panel.
- **2026-10-19** — Editor de foto con Cropper.js (modal "Ajustá tu foto"), fotos en 256×256. "Mi Colegio" del header del alumno → "Quiénes somos" (acción `MiColegio` borrada). Reseñas (`ResenasController`, `_dialogoDarResena`, SP `darResena`). Amigos (`AmigosController`, `estadoAmistad`, `obtenerAmistad`, `cambiarAmistad`, `obtenerAmigos`; `obtenerPerfil` suma `cantidadAmigos`) y recomendaciones por amigos en `obtenerCatalogo`. Sin cambios en tablas.
- **2026-10-20** — Agenda del Panel estilo consultorio: calendario mensual con líneas azul/roja/gris (punteada = esperando a la otra persona), agenda del día por hora y lista "Requiere tu acción" (`ClaseCalendario`, `calendario.js`, SP `obtenerCalendarioClases`/`obtenerContadoresClases`; `obtenerMisClases` y `ClasePanel` borrados). Estados nuevos `Pide cambio`, `Pide cancelar`, `No concretada` (`responderSolicitudClase`, `retirarSolicitudClase`, `marcarClaseNoConcretada`). Profesor: pestaña "Mi agenda" (tabla nueva `Disponibilidad`, `miAgenda.js`, SP `obtenerDisponibilidad`/`guardarDisponibilidad`/`bloquearDia`/`desbloquearDia`) y los pedidos fuera de su agenda se rechazan. Selector de horario en tira de días. Notificaciones separadas en "Requiere tu acción" (cuentan en el badge) y "Novedades". Historial paginado con "Ver más" y "No se dio". Tabla `Clases` suma `fechaPropuesta`.
- **2026-10-22** — Rediseño visual "Plancha de pegatinas" en todas las páginas (PR #12): tokens y componentes nuevos (`--troquel`, `--fondoLavado`, `--colorFoco`, `.pegatina`, `.plancha`; reglas en la [guía](guiaDeEstilo.md)), header y cabeceras claras, Quiénes somos de cero, Panel con saludo y notificaciones en dos columnas, sin bordes negros, foco en tinta y controles de 44 px. Se borró: Opiniones de Inicio (testimonios inventados) con su carrusel, los accesos rápidos del Panel, el fade-up (`.revelar`, `jsActivo`), las 8 `.webp` de Quiénes somos y los alias `--bordeMarcado`, `--sombraMarcada*`, `--colorCoralOscuro` y `--colorPapel`. Revisión final: campos, selects y nombres que llevan a un perfil de 44 px; el texto de las cabeceras con lavado pasa a tinta (el gris no llegaba a 4,5:1 en el celular). Bugs: el chip "Nacional Buenos Aires" de Inicio devolvía 0 profesores (apuntaba a "Colegio Nacional de Buenos Aires") y la insignia del header del admin no tenía `id`, así que `#insigniaNotificaciones` nunca se actualizaba. Sin cambios en controladores, modelos ni BD.
- **2026-10-23** — Segunda pasada de diseño (T1–T6): sin animaciones de entrada, hover solo con mouse y en lo clickeable, camino de 3 pasos y plancha de frases en Inicio, portada compacta en el celular, modalidad en la línea de datos del Catálogo y cabecera más baja, limpieza de tokens y selectores. `site.css` pasa de 5.474 a 5.538 líneas mientras se suman el camino, la plancha de frases y la portada compacta.
