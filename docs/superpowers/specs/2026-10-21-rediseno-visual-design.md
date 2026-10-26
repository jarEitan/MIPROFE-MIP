# Rediseño visual de MIP: "Plancha de pegatinas" (diseño)

- **Fecha:** 2026-10-21
- **Pedido por:** Jarsou, en el hilo "Hilo con Opus" (rediseño de todo el sitio, a fondo).
- **Maquetas:** lienzo "MIP: direcciones visuales" (https://claude.ai/artifact/RSfgcvS2uTzyBPxgYU6CaD), con un artboard por página.
- **Estado:** esperando la aprobación de Jarsou. Cuando la apruebe sigue el plan de implementación.

## 1. Objetivo y alcance

Se cambia la cara de todo el sitio y se mantiene la identidad:

- **Paleta:** coral #FF5757, celeste #5CE1E6, magenta #D51F47, tinta #111827 y gris #B3B3B3 solo decorativo.
- **Fuentes:** Eras Bold ITC, Fredoka y Plus Jakarta Sans.

Cambian las animaciones, la organización de las páginas, las sombras, los degradados y los detalles. La meta es que el sitio represente los ideales de MIP ("El conocimiento nos conecta.") y se sienta original, minimalista, luminoso, con alto contraste y joven.

**Entra:** las 10 vistas (Inicio, Catálogo, Perfil, Panel de Control, Iniciar sesión, Registrarse, Soporte, Privacidad, Error y Quiénes somos), los partials de `Views/Shared`, `wwwroot/css/site.css` y lo mínimo de `wwwroot/js/site.js` que depende del CSS (el fade-up y el carrusel que se borran).

**No entra:**
- No se tocan controladores, modelos, la BD ni los SP.
- No se agregan dependencias.
- No se agregan funciones nuevas.
- No se escribe texto legal nuevo para Privacidad.

## 2. Lo que pidió el dueño (decisiones ya tomadas)

1. Dirección **D, "Plancha de pegatinas", con menos bordes negros.** Tarjetas y botones van sin contorno negro en reposo.
2. Proporción **60% colores planos con sombras suaves, 20% degradados tranquilos y 20% texturas.** Las texturas van solo en lugares especiales y son ligeras: "un detallito, nada que llame la atención".
3. Le gustan las **sombras**, el **degradado oscuro del llamado final** y la **franja del Perfil** (coral→celeste con puntitos), sin bordes negros.
4. **Header con sombra.** La **cinta de palabras va recta.**
5. La **portada tiene fondo claro**, con un degradado tranquilo y una textura chica. El título usa los **colores de texto del sitio actual**: tinta, con la frase clave en coral y el subrayado celeste tipo marcador.
6. Los bloques **Para alumnos / Para profesores** tienen la misma información que hoy, en colores planos.
7. **Quiénes somos se rehace de cero**, con información lógica y sin imágenes del Miro.
8. Los textos usan las **frases del Miro tal cual** (`/mnt/project-files/rediseno/frases-miro.md`). Nada robótico ni con cara de IA, y nada de cifras o testimonios inventados.
9. **Exactamente los tonos del sitio** (pedido del 2026-10-22): no entra ningún color nuevo. Todo sale de los tokens y valores que ya usa `site.css`; las transparencias se arman con el RGB de esos mismos tonos. Por eso el texto suave sigue en #6B7280 y los bordes en #E5E7EB, aunque las maquetas muestren otros grises.

## 3. Sistema visual

### 3.1 Tokens (`:root`)

| Token | Valor | Uso |
|---|---|---|
| `--colorTinta` / `--colorTexto` | #111827 (sin cambios) | todo el texto y lo "elegido" |
| `--colorTextoSuave` | #6B7280 (sin cambios) | párrafos, fechas, ayudas (4,8:1) |
| `--colorMagenta` | #D51F47 | alertas, "te toca a vos", hover de links (`--colorCoralOscuro` queda como alias hasta la limpieza) |
| `--colorBorde` | #E5E7EB | borde de reposo de tarjetas y botones |
| body | #FFFFFF | fondo general (`#F9FAFB` solo detrás del Perfil) |
| `--sombraSuave` | `0 1px 2px rgba(17,24,39,.05), 0 10px 28px -14px rgba(17,24,39,.22)` | tarjetas, nav-pills |
| `--sombraFlotante` | `0 2px 4px rgba(17,24,39,.06), 0 24px 44px -20px rgba(17,24,39,.35)` | buscador, diálogos, tarjeta del Perfil |
| `--troquel` (nuevo) | `0 0 0 5px #fff, 0 0 0 6.5px rgba(17,24,39,.14), 0 18px 30px -14px rgba(17,24,39,.35)` | pegatinas: anillo **gris**, no negro |
| `--fondoLavado` (nuevo) | puntos tinta al 7% cada 22px + radial coral .16 arriba a la derecha + radial celeste .24 abajo a la izquierda, sobre blanco | portada, cabeceras, saludo del Panel, Acceso, Error, presentación de Quiénes somos |

**Tokens de Bootstrap:**
- `--bs-link-color` es tinta y `--bs-link-hover-color` es magenta. No se agrega un `a:hover` propio, porque teñiría los botones.
- El foco y `control-checked-bg` van en tinta.
- `primary-contrast`, `primary-fg` y `accent-fg` van en tinta. Así el texto sobre coral queda a 5,7:1 y los `badge-subtle` se leen.
- `danger-contrast` queda blanco (5,1:1).
- `--bs-body-font-size` es 1rem y `--espacioSeccion` es `clamp(2.5rem, 2rem + 3vw, 4.5rem)`.

**Alias de migración**, que se borran en la última etapa:
- `--bordeMarcado` pasa a `1.5px solid var(--colorBorde)`.
- `--sombraMarcada` pasa a `--sombraSuave`.
- `--sombraMarcadaElevada` pasa a `--sombraFlotante`.

Con eso los 52 usos actuales dejan de ser "negro duro" de una vez.

### 3.2 Tipografía

- **h1:** Eras, `clamp(2.25rem, 1.4rem + 3.6vw, 4rem)`, interlineado .96. La portada lo agranda.
- **h2:** Eras, `clamp(1.75rem, 1.2rem + 2.2vw, 2.75rem)`, interlineado 1.05.
- **h3:** Jakarta 800.
- **Títulos chicos de diálogos y pestañas:** Fredoka 600.
- **Fredoka:** botones, etiquetas, cifras y precios.
- **Plus Jakarta Sans:** el resto del texto.

### 3.3 Texturas y degradados (la regla 60/20/20)

- **Solo dos texturas** en todo el sitio:
  - la franja del Perfil, que ya existe y se conserva entera menos el borde negro de abajo;
  - los puntos tinta al 7% de `--fondoLavado`.
- **Tres degradados:**
  - el lavado;
  - el llamado final (tinta con brillo coral radial a la derecha);
  - la franja del Perfil.
- **Todo lo demás es plano.** Tarjetas, íconos, cinta, avisos, drawer, diálogos, botones y badges van sin textura.
- No se crean clases `.puntos`, `.rayas` ni `.cuadricula`, porque `catalogo.js` ya usa `span.puntos` en el paginador.

### 3.4 Componentes

| Componente | Cómo queda |
|---|---|
| `.boton` | Píldora Fredoka 600 de 48px de alto, borde 2px gris claro, fondo blanco y sombra suave. Al pasar el mouse sube 3px y la sombra crece. Al presionar baja. |
| `.boton.principal` / `.secundario` | Coral / celeste sin borde, **texto tinta** y sombra teñida. Al pasar el mouse no cambia de color. |
| `.boton.oscuro` / `.claro` / `.chico` | `.oscuro`: tinta con texto blanco. `.claro`: transparente con borde blanco, para fondos oscuros. `.chico`: 44px. `.contorno` es la base y se conserva porque lo usa el JS. |
| `.card` | Blanca, borde 1.5px `--colorBorde`, radio grande y `--sombraSuave`. Al pasar el mouse se corre 4px, el borde pasa a tinta y aparece una capa celeste plana de 6px. Es la única capa plana del sistema. |
| `.card.coral` / `.card.oscura` | Coral con texto tinta / tinta con texto blanco. Sin degradado, con sombra teñida. |
| `.icono` | Cuadrado redondeado de 3rem, sin borde, fondo suave (coral o celeste) con el ícono en magenta o tinta. Al pasar el mouse sobre su tarjeta gira -8°. |
| `.pegatina` (nueva) | Fondo blanco, Fredoka 600 y `--troquel`, girada con `--giro`. Al pasar el mouse se endereza y sube. Variantes planas: `.coral`, `.celeste`, `.magenta` y `.oscura`. Solo las de la **primera sección** de cada página se "pegan" al cargar. |
| `.plancha` (nueva) | Contenedor flex de pegatinas sueltas, con 1rem de margen para el troquel. |
| `.pildora` | Solo para un dato real (el rol en el Perfil y en la lista de amigos): celeste plano, Fredoka, sin mayúsculas. **Se borran las cejas en mayúsculas sobre los títulos.** |
| `mark` | Se queda como está: coral con el marcador celeste. Va solo en el h1 de la portada, como máximo en uno por h1 de cabecera, y en el h2 del llamado final. Nunca en otros h2. |
| Lo elegido | Una sola regla: **fondo tinta con texto blanco**. Aplica al link activo del menú, la pestaña activa, el día y la franja elegidos, la página actual del paginador y el check. |
| Formularios | Borde 1.5px #6B7280 (4,8:1), radio chico y label visible. El foco es borde tinta con anillo celeste. `.mensajeError` es magenta con texto blanco. |
| `.buscador` | Píldora blanca con `--sombraFlotante` y el botón coral "Buscar". El foco suma un anillo tinta y uno celeste. |
| `.nav-pills` (base nueva) | Barra blanca con borde gris y sombra suave. Cada pestaña mide 44px y la activa va en tinta. |
| `.dialog` | Sin borde, radio grande, `--sombraFlotante`, header blanco y fondo oscurecido sin blur. No gira al abrir. |
| Acordeón | Ítems blancos con borde gris. El abierto tiene el resumen en celeste suave. |
| `.burbuja` / `.snackbar` | Burbuja ajena gris claro y propia coral con texto tinta. Snackbar tinta en píldora, verde si sale bien y magenta si hay error. |
| `.avatar` | Sin borde, con aro interior celeste cuando muestra iniciales. No lleva troquel. |

### 3.5 Movimiento

- **Un solo momento por página:** las pegatinas de la primera sección se pegan escalonadas al cargar (`pegarPegatina`: escala 1.18, giro de 8° y rebote).
- **Se quedan:** la cinta que se desplaza, el feedback al pasar el mouse y al presionar, `sacudirError` y los corazones del Me gusta.
- **Se borra el fade-up de todas las secciones:**
  - las clases y animaciones `.revelar`, `.animarEntrada`, `aparecerDesdeAbajo`, `flotarFigura`, `pulsoExpansivo` y `flotarTarjeta`;
  - en `site.js`, `inicializarRevelarAlScroll`;
  - el script `jsActivo` del layout.
- Con `prefers-reduced-motion` todo queda quieto. Se suma `animation-delay: 0s !important` para que ninguna pegatina quede invisible.

### 3.6 Accesibilidad (se arregla de paso)

- No va texto blanco sobre coral (3,1:1): ese texto pasa a tinta.
- El foco pasa de celeste (1,6:1) a tinta, y a celeste solo sobre fondos oscuros mediante `--colorFoco`.
- El borde de los campos pasa a #6B7280.
- Los indicadores que dependían del celeste (líneas del calendario, tilde de verificado) pasan a tinta.
- Todos los controles miden al menos 44px: botones chicos, paginador, links del menú y flechas del selector de horario.
- `main { overflow-x: clip }`, para que las pegatinas giradas no generen scroll horizontal a 390 px sin romper el sticky de los filtros.

## 4. Páginas

### Header y footer (todas)

**Header:**
- Blanco, con la sombra suave siempre puesta.
- Links en píldoras Fredoka; el activo va en tinta.
- Hamburguesa en un círculo celeste.
- Drawer sin borde ni blur.
- La insignia de notificaciones queda quieta, sin pulso.
- Se arregla la insignia del admin, que no tiene `id` y por eso nunca se actualiza.

**Footer:** sigue en tinta con el borde coral de 4px y los h5 en Fredoka sin mayúsculas.

### Inicio
1. **Portada clara** con `--fondoLavado`, en un panel redondeado:
   - el h1 "El conocimiento **nos conecta.**", con la frase en coral y el marcador celeste;
   - debajo, "En miProfesor creemos que aprender nunca debería depender de la suerte.";
   - el buscador y los botones "Soy alumno" y "Quiero enseñar";
   - cinco pegatinas: tarjeta de profe, "Clase confirmada", chat, círculo MIP e "I ❤ MIP".
   - Se borra el "★ 4,9" porque es inventado.
2. **Cinta coral recta** con las palabras del moodboard: Flexible · Comunidad · Aprendizaje · Conexión · Diversión · Innovación · Accesibilidad.
3. **¿Cómo funciona?**: 3 tarjetas planas con números de color plano. Acá sí hay una secuencia real.
4. **Alumnos / Profesores** con el mismo texto y checklist de hoy:
   - el de alumnos es coral con texto tinta y botón blanco;
   - el de profesores es tinta con texto blanco y botón celeste.
5. **Funcionalidades**, sobre blanco.
6. **Profesores destacados**: datos reales de la BD. Se arregla el chip "Nacional Buenos Aires", que hoy devuelve 0 profesores.
7. **Preguntas frecuentes.**
8. **Llamado final**: panel redondeado tinta con el brillo coral, separado del footer.
9. **Se borran las Opiniones**, porque los testimonios son inventados, y con ellas el carrusel (`3.7` e `inicializarCarruseles`).

### Catálogo
- **Cabecera clara** con `--fondoLavado`, el h1 a la izquierda y 1 a 3 pegatinas a la derecha.
- **Filtros** como tarjeta, en una columna en desktop y en el drawer en el celular.
- **Tarjeta horizontal** sin borde negro:
  - precio grande en Fredoka;
  - verificado en verde;
  - modalidad y amigos en celeste suave.
- **Paginador** con la página actual en tinta.
- **Estado vacío** con "Limpiar filtros".
- Mientras busca, la lista baja la opacidad.
- **`catalogo.js` no cambia.**

### Perfil
- La **franja coral→celeste con puntitos** se queda; solo se le saca el borde negro.
- Encima va la **tarjeta del titular**, con sombra flotante y sin borde. Tiene el avatar con aro celeste, las etiquetas arriba del nombre, "Cuenta verificada" en verde suave y las acciones en píldora.
- Las **cifras** (reseñas, me gusta, amigos y precio) van en fichas suaves.
- **Me gusta** activo se ve en magenta, las **estrellas** en coral y los títulos de **Datos** sin mayúsculas.
- **Reportar** queda al final.
- **Los modales** comparten el mismo lenguaje:
  - Amigos, Historial, Editar perfil, Recortar foto y Dar reseña;
  - en todos, la pestaña activa va en tinta.

### Panel de Control
- **Saludo con `--fondoLavado`** y pegatinas: avatar, rol y los dos contadores. Los contadores mantienen los `id` exactos que usa `clases.js`.
- **Se borra el bloque de accesos rápidos**, porque repite las pestañas. El número de mensajes sin leer pasa a la pestaña Chat.
- **Notificaciones en dos columnas**: "Requiere tu acción" con una banda magenta plana y "Novedades".
- **Calendario y agenda del día lado a lado** desde 1024 px, con las líneas del calendario en tinta, magenta o gris.
- **Chat** con las burbujas nuevas.
- **Botones destructivos** en tinta.
- **No cambia ningún `id`, clase ni `data-*`** de los que leen o generan los JS.

### Iniciar sesión y Registrarse
- Fondo `--fondoLavado`.
- La tarjeta del formulario va al lado de un **panel de color plano** (`.ilustracion`) con pegatinas: logo, lema, "I ❤ MIP" y un valor del Miro.
  - Es coral con texto tinta para iniciar sesión y para alumno.
  - Es tinta con texto blanco para profesor.
- El rol elegido lleva borde tinta y fondo celeste suave.
- Debajo de 1024 px el panel sigue oculto, como hoy.

### Soporte, Privacidad y Error
- **Soporte** pasa a la cabecera clara (deja de ser oscura) con el buscador de ayuda.
  - Los accesos rápidos son tarjetas con `.icono`.
  - "Ver guía" pasa a "Ver preguntas".
  - El resultado del buscador ya no se ve como un error.
- **Privacidad** solo cambia de estilo; el texto legal queda como está.
- **Error** pasa a español, con salidas a Inicio y a Soporte, y se borra el bloque "Development Mode".

### Quiénes somos (de cero)
1. **Presentación** con `--fondoLavado`:
   - el h1 "Quiénes somos";
   - el lead textual "Esta es nuestra start-up, dedicada a ayudar a profesores y alumnos a conectarse";
   - pegatinas: isotipo, "I ❤ MIP" y tres palabras del moodboard.
2. **Manifiesto completo**, textual, en una tarjeta blanca sobre una sección coral plana.
3. **Misión y visión.**
4. **Cómo somos**: los atributos de marca del Miro, sobre celeste plano, con pegatinas quietas.
5. **Por qué nace MiProfesor**: los 4 problemas que detectó el equipo, con quién lo detectó.
6. **Equipo**, con avatares de iniciales. La sección conserva `id="equipo"` porque el footer enlaza ahí.
7. **Llamado final.**

Se borran las secciones "Identidad" y "Proceso de diseño" y las 8 `.webp` que solo usaba esta vista.

## 5. Lo que el JS necesita (no se puede romper)

La lista completa está en las propuestas por zona (`/mnt/project-files/rediseno/organizacion-por-pagina.json`) y el sistema unificado con correcciones y huecos en `/mnt/project-files/rediseno/sistema-unificado.json`. Lo más delicado:

- **Panel:**
  - `#contadorClasesActivas` y `#contadorClasesCompletadas`: `refrescarPanel` no chequea `null`;
  - el `innerHTML` de `#notificaciones`;
  - `#insigniaNotificaciones`.
- **Perfil:**
  - `#tipoPerfil`, `#estadoVerificadoPerfil` y `#tickPerfil`: si falta uno, el render se corta;
  - el AntiForgeryToken y `[data-dar-resena]` dentro de `#perfil`.
- **Registrarse:** `data-solo-rol` con `hidden` en el mismo div.
- **Soporte:** `#mensajeAyuda` y `#acordeonPreguntas`.
- **Catálogo:** `span.puntos` del paginador.
- **Snackbar:** `.visible`.
- **Clases que arman los JS:** las de `catalogo.js`, `calendario.js` (`azul`, `rojo`, `gris`, `punteada`), `historial.js`, `miAgenda.js` y `chat.js`.

## 6. Etapas de implementación

Cada etapa deja el sitio funcionando y se verifica antes de pasar a la siguiente.

| # | Etapa | Cómo se verifica |
|---|---|---|
| 1 | Tokens, alias y base, sin tocar vistas | Las 10 vistas a 390 y 1280 px: nada roto, bordes grises, foco tinta, sin scroll horizontal, consola limpia |
| 2 | Componentes del bloque 2 y diálogos | Lo que generan los JS (Catálogo, Panel, Perfil) y los 5 diálogos se abren y se ven bien |
| 3 | Apagar el fade-up (CSS y JS en el mismo cambio) | `grep revelar\|jsActivo` = 0; el Perfil carga; el snackbar aparece |
| 4 | Header, aviso de verificación y footer | 1024 px con las tres sesiones sin salto de línea; drawer; insignia actualizada |
| 5 | Barrido de cejas, `mark` en los h2 y flechas | Con grep, solo quedan las píldoras de datos y los `mark` permitidos |
| 6 | Inicio | Un solo momento animado; reduced motion; 390 px sin scroll; chip "Nacional Buenos Aires" con resultados |
| 7 | Cabecera compartida y Catálogo | Catálogo, Soporte y Privacidad en 5 anchos; filtros, limpiar y paginador |
| 8 | Acceso, Ayuda y Quiénes somos | Login y registro validan; ayuda filtra; contacto valida; Error en español; `#equipo` |
| 9 | Perfil y modales | Perfil propio y ajeno, alumno y profesor, sin errores; me gusta, amistad, reseña, editar y recorte |
| 10 | Panel de Control | Alumno y profesor: aceptar, rechazar, cancelar, reubicar y "no se dio" actualizan todo; chat |
| 11 | Limpieza y documentación | Sin alias ni sombras duras; `Info/guiaDeEstilo.md` actualizado y entrada en `Info/log.md` |

La verificación final recorre 390, 768, 1024, 1280 y 1920 px, con teclado y con `prefers-reduced-motion`, sobre el sitio corriendo con la BD de prueba.

## 7. Riesgos

- **Entre las etapas 1 y 10 el sitio se ve mezclado.** Los alias cubren 52 usos, pero hay 37 sombras desplazadas y 37 bordes tinta escritos a mano. El grep de la etapa 11 confirma que no quede ninguno.
- **Trampas de Bootstrap 6 alpha:**
  - las utilidades `d-*` pierden contra cualquier `display` de `site.css`, así que la visibilidad responsive va en el envoltorio y nunca sobre `.pegatina`;
  - un hover propio le gana al `.active`, así que se escribe un `.active` explícito después.
- **Componentes compartidos:** `.cabecera`, `.llamadoFinal`, `.tabla` y `.dialog` aparecen en varias páginas, así que cada etapa revisa todas las páginas donde aparece lo que tocó.
- **Ajustes a ojo:** las posiciones de las pegatinas y el ancho del header a 1024 px se ajustan mirando el sitio real.

## 8. Puntos para que confirme el dueño

Ya están resueltos como se indica, salvo que diga otra cosa:

1. Se borran las **Opiniones** del Inicio porque son inventadas. Vuelven cuando haya reseñas reales para mostrar.
2. Se borran los **accesos rápidos** del Panel porque repiten las pestañas.
3. La **cinta** muestra las palabras del moodboard en lugar de las materias destacadas.
4. **Quiénes somos** pierde los enlaces a Figma y a Miro junto con las secciones de proceso. Si la escuela los pide, se pueden sumar como dos links en el cierre.
5. El manifiesto conserva "miProfesor" tal cual está en el Miro. En el resto del sitio la marca sigue como "MiProfesor".

### Detalles que resolví al revisar las maquetas

- **Pegatinas de la portada:** llevan los textos de la vista actual ("Física I: Dinámica", "Viernes, 18:30 hs" y "¿Tenés el programa del colegio a mano?").
- **Catálogo:** `catalogo.js` no cambia. "Popular" queda en coral suave y las modalidades en verde suave. En desktop no se agrega el título "Filtros".
- **Panel, saludo:** el avatar va sin troquel y las pegatinas son el rol y los dos contadores.
- **Panel, Mis clases:** "Clases que requieren tu acción" va con fondo coral suave, para no repetir una segunda banda magenta.
- **Panel, calendario:** el gris de "no se dio / cancelada" pasa a #6B7280, para llegar a 3:1.
- **Logo:** las letras de "MIP" van en tinta #111827, no en #000.
- **Footer:** "Francisco Martínez" va con tilde, como en Quiénes somos.
- **Registrarse:** el checkbox habla de "términos", pero no existe esa página. Crearla queda fuera de este rediseño.
- **Datos de ejemplo:** las maquetas usan datos de la BD de prueba. Algunas clases del Panel salen de la BD de prueba en uso al momento de las capturas.
