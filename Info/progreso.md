# PROGRESO

Objetivo: todo **refactorizado**. Cómo se hace: [guía](guiaDeEstilo.md), sección 5.

## Estados

- **Sin hacer**: todavía no existe.
- **Hecho**: funciona, pero con el código viejo (`try/catch`, `resultado` en texto, `CommandType.StoredProcedure`).
- **Refactorizado**: el SP usa `IF` / `ELSE` y devuelve `codigo`, `BD.cs` usa `EXEC` y el controlador es un `if` / `else` sin `try/catch`.

## Módulos

- Sesión: refactorizado
- Likes: refactorizado
- Amigos: refactorizado
- Notificaciones: refactorizado
- Chat: refactorizado
- Reseñas: refactorizado
- Historial: refactorizado
- Catálogo: refactorizado
- Perfil: refactorizado
- Agenda: refactorizado
- Clases: refactorizado
- Navegación: refactorizado
- Buscador de usuarios (header): refactorizado
- Consulta de Soporte: sin hacer
- Sugerencias del buscador: sin hacer
- Moderación de reseñas: sin hacer
- Filtros avanzados: sin hacer
- Pedido de un alumno por un profesor: sin hacer

## Con qué seguir

1. **Consulta de Soporte** y **sugerencias del buscador**: tienen `TODO BD`.
2. Lo de la V2: moderación de reseñas, filtros avanzados y pedido de un alumno por un profesor.

## Qué falta probar

Nada de esto se probó en el navegador. Antes de probar hay que correr los 3 scripts de `MIP_Estructuras/` y reiniciar la app. La contraseña de todos los usuarios es `12345678`.

- **Catálogo**: buscar, filtrar por materia, colegio, modalidad y nivel, y cambiar de página. Que las tarjetas muestren bien las materias y los colegios, también las 3 del Inicio.
- **Perfil**:
  - Abrir un perfil que no existe.
  - Guardar con el mail o el DNI de otra cuenta, con datos inválidos y con una foto que no es imagen (códigos 1 a 4).
  - Cambiar la foto de perfil y la del DNI: que se borre la vieja y se actualice la barra de arriba.
- **Agenda**: guardar franjas, bloquear un día (pasado, ya bloqueado, con clases ese día) y desbloquearlo.
- **Clases**:
  - Pedir una clase con cada error (1 a 5).
  - Aceptar y rechazar pedidos y solicitudes, y retirar una solicitud.
  - Cancelar: cuando se cancela directo y cuando la otra persona tiene que aceptar.
  - Reubicar (1 a 7) y marcar "no se dio".
  - Que se actualicen el calendario, los contadores y el número de notificaciones.
- **Panel**: notificaciones, contadores y el aviso de agenda vacía.
- **Lo demás** (sesión, likes, amigos, chat, notificaciones, reseñas e historial): una pasada rápida con la BD nueva.

## Ideas para tener menos controllers y models

Son ideas, todavía no se hizo ninguna.

### Models

1. ~~Borrar `Usuario.cs`~~: ahora es el modelo de todas las personas.
2. Hecho: un solo `Usuario` en lugar de `ResultadoSesion`, `AmigoPerfil`, `RegistroUsuario`, `DatosEdicion`, `EdicionPerfil`, `PerfilUsuario`, `ResultadoGuardado` y `Profesor`, solo con `get; set;` (`contrasena` y `fotoDni` con `[JsonIgnore]`). Lo calculado (`nombreCompleto`, `iniciales`, `resumen`, `tieneAgenda`) se arma en la vista, el JS o el controlador.
3. Devolver `int` cuando el SP solo manda `codigo`, como ya hace `darResena`. Sacaría `ResultadoAgenda`, y también `ResultadoMensaje` si el chat no usa su `id`.
4. Un archivo por módulo: `Usuario.cs`, `Clase.cs`, `Agenda.cs`, `Chat.cs` y `Perfil.cs`. Hoy `ClaseCalendario.cs` tiene 8 clases y `ResultadoLike.cs` tiene 1.
5. Meter las clases chicas de la agenda (`HorarioOcupado`, `FranjaSemanal` y `DiaBloqueado`) dentro de `AgendaProfesor`, y que el JS arme cada día con eso.
6. Borrar `ErrorViewModel` y la acción `Error` si no se usa la página de error.

### Controllers (de 11 a 7)

| Controller | Qué tendría |
|---|---|
| `Home` | Solo páginas públicas: Inicio, Soporte, Quiénes somos y Privacidad |
| `Sesion` | Igual que ahora |
| `Catalogo` | Igual que ahora: la página y la búsqueda juntas. Es el modelo a copiar |
| `Perfiles` | La página de perfil (sale de `Home`), la edición, likes, amigos, reseñas e historial. Hoy son 5 controllers chicos que trabajan sobre un perfil |
| `Panel` | La página del Panel (sale de `Home`), notificaciones y chat |
| `Clases` | Las acciones sobre clases y el calendario |
| `Agenda` | `MiAgenda`, `GuardarAgenda`, bloquear y desbloquear días, `DiasConAgenda` y `HorariosOcupados` |

Así cada parte tiene su página y sus `fetch` en el mismo controller.

Opcional: `HttpContext.Session.GetString("idUsuario")` se repite unas 30 veces. Podría ser una propiedad en un controller base, pero es una abstracción más: solo si te gusta.
