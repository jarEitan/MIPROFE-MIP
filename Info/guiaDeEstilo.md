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
- Sin partials: lo que está en todas las páginas (header, aviso de verificación, footer, diálogos "Pedir clase" y "Dar reseña") va en `_Layout.cshtml`, y lo de una página va en su vista. `Views/Shared/` tiene solo `_Layout`.
- Los datos salen de la BD (SP); lo que falta conectar lleva `TODO BD:`. La vista nunca inventa datos.
- Los campos obligatorios se validan en JS antes de enviar (`validarRegistro`, `validarIngreso`): el controlador ya no revisa si vienen vacíos (ver sección 5).
- Sesión: `@if (Context.Session.GetString("idUsuario") == null) { … }` (sintaxis de systemPrompt).
- Íconos: `<i class="bi bi-nombre" aria-hidden="true"></i>` (Bootstrap Icons local).
- Modales: todos con la misma caja, sin clases extra. Lo propio de cada uno se escribe en el CSS con su id (`#dialogoDarResena .filaEstrellas`):

  ```html
  <dialog class="dialog" id="dialogoAlgo" aria-labelledby="tituloAlgo">
      <form …>  @* solo si manda datos *@
          <div class="dialog-header">
              <h2 class="dialog-title" id="tituloAlgo">Título</h2>
              <button type="button" class="btn-close" data-bs-dismiss="dialog" aria-label="Cerrar"></button>
          </div>
          <div class="dialog-body">…<p class="mensajeError" id="mensajeAlgo" role="alert"></p></div>
          <div class="dialog-footer">
              <button type="button" class="boton contorno chico" data-bs-dismiss="dialog">Volver</button>
              <button type="submit" class="boton principal chico">Confirmar</button>
          </div>
      </form>
  </dialog>
  ```


## 4. JavaScript

- `site.js` (común) + un archivo por función grande (`catalogo.js`, `clases.js`, `historial.js`, `chat.js`, `calendario.js`, `miAgenda.js`). **Una función por cosa**, cada una sale temprano si su elemento no existe; en `site.js` todas se llaman desde `inicializarSitio()`.
- Validación con el patrón del systemPrompt (`mensaje.innerHTML = "…"; mensaje.style.display = "block"; return false;`) mediante `mostrarMensaje` / `mostrarErrorEnCampo`.
- Nombres de función = verbo + objeto: `validarRegistro`, `inicializarFiltrosCatalogo`, `enviarMensajeChat`.


## 5. Backend: stored procedures, BD.cs y controladores

Desde el 2026-10-26 el backend se escribe como el ejemplo de clase (`TP7 - RedSocial`): poco código, que se lea de un tirón y que no parezca generado. Está todo así (ver [progreso.md](progreso.md)).

**La idea: el SP decide, C# solo lo llama y muestra el resultado.**

1. El SP revisa con `IF` / `ELSE` anidados. Si está todo bien, hace el cambio y devuelve `SELECT 0 AS codigo` junto con los datos. Si no, devuelve `SELECT 1 AS codigo`, `2`, `3`… según el error.
2. `BD.cs` hace un `EXEC` y devuelve lo que llegó.
3. El controlador hace `if (codigo == 0) { … } else { … }` y elige el mensaje.
4. La vista o el JS lo muestra.

### Stored procedures

```sql
CREATE PROCEDURE [dbo].[iniciarSesion]
@mail nvarchar(150),
@contrasena nvarchar(255)
AS
BEGIN
IF EXISTS (SELECT mail FROM Usuarios WHERE mail = @mail)
	BEGIN
	IF EXISTS (SELECT mail FROM Usuarios WHERE mail = @mail AND contrasena = @contrasena)
		BEGIN
		SELECT 0 AS codigo, ID, nombre, apellido, tipoUsuario, fotoPerfil, verificado FROM Usuarios WHERE mail = @mail
		END
	ELSE
		BEGIN
		SELECT 2 AS codigo
		END
	END
ELSE
	BEGIN
	SELECT 1 AS codigo
	END
END
```

- Cada rama lleva su `BEGIN … END` aunque tenga una sola línea. El siguiente `IF` va **adentro** de la rama que corresponde, nunca después de un `RETURN`.
- El resultado sale con `SELECT`, nunca con `RETURN`. En un stored procedure, `RETURN` solo acepta un número entero: `RETURN 'texto'` da error de conversión, y Dapper no lo lee como fila. (En las funciones SQL sí se usa `RETURN` con cualquier tipo.)
- `0` = salió bien, y en esa misma fila van los datos. `1`, `2`, `3`… = cada error, en el orden en que se revisan.
- Si hay dos acciones distintas, se hacen dos SP: `enviarAmistad` y `quitarAmistad`, no un SP `cambiarAmistad @accion`. El controlador puede seguir recibiendo `accion` y elegir cuál llamar.
- No van: `SET NOCOUNT`, `TRY/CATCH`, transacciones, `WITH (UPDLOCK)`, funciones auxiliares para algo de una línea ni comentarios largos arriba del SP. Los códigos se explican en el modelo de C#.
- Los textos con acentos van con `N'…'`.
- Se usa `CREATE PROCEDURE`, porque la base se borra y se vuelve a crear con cada cambio.

### BD.cs

```csharp
public ResultadoLike alternarLike(int idEmisor, int idReceptor)
{
    using (var connection = new SqlConnection(connectionString))
    {
        return connection.QueryFirst<ResultadoLike>("EXEC alternarLike @idEmisor, @idReceptor", new { idEmisor = idEmisor, idReceptor = idReceptor });
    }
}
```

- Hay una función por SP, con el mismo nombre que el SP. Los parámetros van en el mismo orden que en el SP.
- Se usa `QueryFirst<T>` si el SP devuelve una fila y `Query<T>(…).ToList()` si devuelve una lista.
- Si el modelo ya tiene las propiedades con esos nombres, se pasa el modelo entero: `registrarUsuario(registro)`.
- No van `CommandType.StoredProcedure`, ni `?? new …` "por si acaso", ni `try/catch`.
- Comentario de una línea solo si el nombre no alcanza. Por ejemplo, en `enviarAmistad`: "Manda la solicitud, o la acepta si el otro ya te había mandado una".

### Modelos

La clase que recibe la fila tiene `int codigo` más los datos. Arriba lleva un comentario con lo que significa cada código:

```csharp
// codigo: 0 = ok, 1 = sos vos, 2 = la persona no existe, 3 = mensaje vacío o de más de 1000 caracteres
public class ResultadoMensaje
{
    public int codigo { get; set; }
    public int? id { get; set; }
    public DateTime? fechaEnvio { get; set; }
}
```

Si no hay ningún error posible, no hay `codigo`: Likes devuelve solo `cantidadLikes` y `leGusta`.

Los modelos tienen solo propiedades `{ get; set; }`: nada de métodos ni propiedades calculadas (`=>`). Lo que se calcula va en la vista, el JS o el controlador.

### Controladores

```csharp
[HttpPost]
[ValidateAntiForgeryToken]
public IActionResult IniciarSesion(string mail, string contrasena)
{
    ResultadoSesion cuenta = new BDsesion().iniciarSesion(mail, contrasena);

    if (cuenta.codigo == 0)
    {
        guardarSesion(cuenta);
        return RedirectToAction("Index", "Home");
    }
    else
    {
        if (cuenta.codigo == 1)
        {
            ViewBag.mensaje = "No hay ninguna cuenta con ese correo.";
        }
        else
        {
            ViewBag.mensaje = "La contraseña es incorrecta.";
        }
        ViewBag.mail = mail;
        return View();
    }
}
```

- No llevan `try/catch` ni repiten lo que ya revisa el SP. Si falta un campo, lo frena el JS antes de mandar el formulario: `onsubmit="return validarRegistro()"`. Los formularios llevan `novalidate` para mostrar el mensaje propio, así que `required` y `minlength` solo quedan como marca.
- El usuario siempre sale de la sesión:
  - En un GET: `int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0")` (0 = sin sesión).
  - En un POST: `if (idUsuario == null) return Unauthorized();`.
- Los que se llaman con fetch devuelven tal cual lo que vino de la BD: `return Json(new BD().alternarLike(…));`.
- Se mantiene `[ValidateAntiForgeryToken]` en todos los POST. También lo que cuida los datos, como `tipoUsuario`, que desde el formulario solo puede ser `alumno` o `profesor`.
- Sin banners `// ======` ni comentarios que repiten el nombre de la acción. En `BD.cs` los banners se van borrando a medida que se refactoriza cada sección.

### JavaScript que recibe un código

```js
.then(resultado => {
    if (resultado.codigo == 0) {
        cargarChatAbierto(true);
    } else if (resultado.codigo == 1) {
        mostrarSnackbar("No podés mandarte mensajes a vos mismo.", "error");
    } else {
        mostrarSnackbar("Esta persona no existe.", "error");
    }
})
```

El `.catch` queda para todo lo que no es una respuesta normal del SP: sin conexión, sesión cerrada (401), token inválido (400) o error del servidor o de la BD (500). Como los controladores ya no tienen `try/catch`, un error de la BD llega como 500.

### Contraseñas

Se guardan en texto plano a propósito, porque es un TP de la escuela. `iniciarSesion` las compara en el SP. No volver a ponerles hash sin hablarlo antes con el equipo.

### Scripts de la base (`MIP_Estructuras/`)

| Archivo | Qué tiene |
|---|---|
| `MIP-BD_01_estructura.sql` | `CREATE DATABASE`, tablas, claves y restricciones |
| `MIP-BD_02_stored_procedures.sql` | Funciones y SP |
| `MIP-BD_03_datos_prueba.sql` | Datos de prueba (456 cuentas con contraseña `12345678`) |

- Para aplicar cualquier cambio, se borra la base `MIP` y se corren los tres en orden: 01 → 02 → 03.
- Están en **UTF-16**, como los exporta SSMS. Al editarlos hay que respetar esa codificación; si se guardan en otra, se rompen los acentos.
- En 03, primero van las tablas a las que apuntan las demás (`Usuarios`, `Escuelas`, `Materias`, `Modalidades`, `Niveles`) y después el resto. Si se suma una tabla con clave foránea, va después de la tabla a la que apunta.


## 6. Bootstrap 6 (alpha): lo que hay que saber para no perder tiempo

`wwwroot/lib/bootstrap/dist`, **6.0.0-alpha.1** (puede cambiar).

1. **Los breakpoints son prefijos, no sufijos**: `md:col-6`, `lg:navbar-expand`, `sm:d-none`, `lg:order-2`. (En BS5 era `col-md-6`, `order-lg-2`.) Breakpoints: sm 576 · md 768 · lg 1024 · xl 1280 · 2xl 1536.
2. **JS solo como módulo ES**: el layout lo carga con `<script type="module" src="~/lib/bootstrap/dist/js/bootstrap.bundle.min.js">`. No sirve un `<script>` común ni jQuery.
3. **Componentes nuevos**: Drawer (`<dialog class="drawer drawer-end">`, `data-bs-toggle="drawer"`) en vez de offcanvas; Dialog (`<dialog>`) en vez de modal; Menu en vez de dropdown; acordeón con `<details name="…">`; carrusel con scroll-snap (`--bs-carousel-items` se define **en el `.carousel`**, no en un ancestro).
4. **Capas (`@layer`)**: los estilos de Bootstrap están en capas, así que el CSS propio (sin capa) gana en declaraciones normales. **Pero** Bootstrap usa `!important` dentro de capas en algunos casos (por ejemplo `.lg:drawer` desde 1024px): ahí no se puede pisar. La salida es estilar el **hijo** (el `form` dentro del drawer es la tarjeta con borde), no el contenedor.
5. **El header responde al contenedor, no a la ventana**: `.navbar` es `container-type: inline-size`, por eso las reglas del header usan `@container (width >= 1024px)` y no `@media`. Con `@media` el corte difiere ~15px (ancho de la barra de scroll).
6. **Tokens**: el tema se arma con `--bs-*` y las clases `theme-*`. En `:root` se mapea `primary` = coral, `accent` = celeste, `danger` = magenta `#D51F47`, `inverse` = tinta. Los colores de enlace salen de `--bs-theme-fg`.
7. `text-danger` ya no existe como en BS5: se usa `fg-danger`.


## 7. Antes de dar algo por terminado

- Revisar a **390, 768, 1024, 1280 y 1920 px**: sin scroll horizontal ni errores en consola.
- Que toda clase usada en las vistas exista en `site.css` o en Bootstrap.
- Que el orden de `site.css` siga Header → generales → Main (en orden de página) → Footer.
- Si se tocó la BD: borrar `MIP` y correr los tres scripts en orden, sin errores.
- Que cada código nuevo de un SP esté en el comentario de su modelo y en la tabla de códigos del [log](log.md).
- Agregar una entrada nueva en el **Historial de cambios** de [log.md](log.md).
