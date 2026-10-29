# AGENTS.md — MIP (MIPROFE)

ASP.NET Core MVC (net9.0) + Dapper + SQL Server. Plataforma de profesores y alumnos: catálogo, perfiles, amistades, chat, reseñas, agenda y clases. Proyecto escolar.

Flujo de toda funcionalidad: `Vista (js fetch) → Controller → Models/BD.cs (EXEC sp) → Stored Procedure → { codigo, datos }`

## Qué leer antes de hacer cada cosa

Reglas de código: **[Info/systemPrompt.md](Info/systemPrompt.md)** (obligatorio siempre, es la fuente de verdad).

| Área | Usá |
|---|---|
| **BD** (SP, `BD.cs`, scripts SQL) | Bloque "Base de datos" de [systemPrompt.md](Info/systemPrompt.md) + [guiaDeEstilo.md](Info/guiaDeEstilo.md) sección 5. Leer antes `MIP_Estructuras/MIP-BD_01_estructura.sql` y `..._02_stored_procedures.sql` |
| **Controllers y Models** | Bloque "Backend (MVC)" de [systemPrompt.md](Info/systemPrompt.md) + [guiaDeEstilo.md](Info/guiaDeEstilo.md) sección 5 |
| **CSS** | [guiaDeEstilo.md](Info/guiaDeEstilo.md) secciones 1–2 (orden y clases) y 6 (Bootstrap) |
| **Views (Razor)** | [guiaDeEstilo.md](Info/guiaDeEstilo.md) sección 3 + bloque "Frontend" de [systemPrompt.md](Info/systemPrompt.md) |
| **JS** | [guiaDeEstilo.md](Info/guiaDeEstilo.md) sección 4 + bloque "Frontend" de [systemPrompt.md](Info/systemPrompt.md) |
| **Qué sigue / qué falta** | [progreso.md](Info/progreso.md) |
| **Antes de dar algo por terminado** | [guiaDeEstilo.md](Info/guiaDeEstilo.md) sección 7 |

## Reglas de trabajo
- Antes de crear una clase CSS nueva, ver si se resuelve con una existente + selector descendiente.
- Si no te aclaro la arquitectura de una función nueva, preguntame antes de programar: cómo se mueven los datos (vista → controller → SP), dónde se filtran (SP, `BD.cs` o JS) y cómo se administran (tablas y estados).

## Índice de archivos

| Carpeta | Contenido |
|---|---|
| `Controllers/` | Un controlador por módulo (tabla abajo) |
| `Models/` | `BD.cs` (todo el acceso a datos), `BDsesion.cs` (login/registro) y un modelo por resultado: `Usuario`, `ClaseCalendario`, `ConsultaSoporte`, `MensajeChat`, `NotificacionUsuario`, `OpcionPerfil`, `ResenaPerfil`, `ResultadoAmistad`, `ResultadoHistorial`, `ResultadoLike` |
| `Views/Home/` | `Index`, `PanelControl`, `Perfil`, `Privacy`, `QuienesSomos`, `Soporte`, `NoEncontrado` |
| `Views/Sesion/` | `IniciarSesion`, `Registrarse` |
| `Views/Catalogo/` | `Index` |
| `Views/Moderacion/` | `Index` (consultas de Soporte y verificar usuarios, solo moderadores) |
| `Views/Shared/` | `_Layout` (header, buscador de usuarios, footer) |
| `wwwroot/css/` | `site.css`, único CSS propio |
| `wwwroot/js/` | `site.js` (general), `catalogo.js`, `calendario.js`, `miAgenda.js`, `clases.js`, `chat.js`, `historial.js`, `moderacion.js` |
| `MIP_Estructuras/` | `01_estructura`, `02_stored_procedures`, `03_datos_prueba` (SQL) |
| `Info/` | Documentación: `systemPrompt.md`, `guiaDeEstilo.md`, `progreso.md` |

## Índice de funciones por módulo

| Módulo | Controller → acciones | `BD.cs` |
|---|---|---|
| Sesión | `SesionController`: IniciarSesion, Registrarse, CerrarSesion | `registrarUsuario`, `iniciarSesion` (en `BDsesion.cs`) |
| Navegación / páginas | `HomeController`: Index, Soporte, QuienesSomos, Perfil, PanelControl, Privacy, NoEncontrado | — |
| Perfil | `PerfilesController`: ObtenerPerfil, Buscar, ObtenerOpcionesPerfil, ObtenerDatosEdicion, GuardarPerfil | `obtenerPerfil`, `buscarUsuarios`, `obtenerOpcionesPerfil`, `obtenerDatosEdicion`, `obtenerFaltantesVerificacion`, `guardarPerfilCompleto` |
| Catálogo | `CatalogoController`: Index, Buscar | `obtenerIdsCatalogo`, `obtenerProfesoresCatalogo` |
| Likes | `LikesController`: ObtenerLike, AlternarLike | `obtenerLike`, `alternarLike` |
| Amigos | `AmigosController`: Estado, Cambiar, Lista | `obtenerAmistad`, `enviarAmistad`, `quitarAmistad`, `obtenerAmigos` |
| Notificaciones | `NotificacionesController`: Contar, ResponderAmistad | `obtenerNotificaciones`, `contarNotificaciones`, `aceptarAmistad`, `rechazarAmistad` |
| Chat | `MensajesController`: Conversaciones, Chat, Enviar | `enviarMensaje`, `obtenerConversaciones`, `obtenerChat` |
| Reseñas | `ResenasController`: Dar | `darResena` |
| Historial | `HistorialController`: Obtener | `obtenerHistorialClases` |
| Soporte | `ConsultasController`: Enviar | `enviarConsulta` |
| Moderación (`tipoUsuario = 'admin'`, se crean a mano en la BD) | `ModeracionController`: Index, Responder (la respuesta va por mensaje directo), Verificar, FotoDni (la pide "Ver DNI" del Perfil) | `obtenerConsultasPendientes`, `responderConsulta`, `obtenerUsuariosPorVerificar`, `verificarUsuario`, `obtenerFotoDni` |
| Clases (pedidos) | `ClasesController`: EnviarPedido, Responder, Cancelar, Reubicar, ResponderSolicitud, RetirarSolicitud, NoSeDio | `enviarPedidoClase`, `aceptarPedidoClase`, `rechazarPedidoClase`, `cancelarClase`, `reubicarClase`, `aceptarSolicitudClase`, `rechazarSolicitudClase`, `retirarSolicitudClase`, `marcarClaseNoConcretada` |
| Agenda / calendario | `ClasesController`: Calendario, HorariosOcupados, DiasConAgenda, MiAgenda, GuardarAgenda, BloquearDia, DesbloquearDia | `obtenerCalendarioClases`, `obtenerContadoresClases`, `obtenerHorariosOcupados`, `obtenerDisponibilidad`, `guardarDisponibilidad`, `bloquearDia`, `desbloquearDia` |

Pendiente (sin hacer): sugerencias del buscador, moderación de reseñas, filtros avanzados, pedido de un alumno por un profesor. Detalle en [progreso.md](Info/progreso.md).

Mantener este índice al día: si agregás o renombrás un controlador, acción o método de `BD.cs`, actualizá la tabla.
