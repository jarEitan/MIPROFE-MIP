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
- Reseñas: hecho
- Historial: hecho
- Catálogo: hecho
- Perfil: hecho
- Agenda: hecho
- Clases: hecho
- Navegación: hecho
- Consulta de Soporte: sin hacer
- Sugerencias del buscador: sin hacer
- Moderación de reseñas: sin hacer
- Filtros avanzados: sin hacer
- Pedido de un alumno por un profesor: sin hacer

## Con qué seguir

1. **Reseñas**: un solo SP, `darResena`.
2. **Historial**: un solo SP, `obtenerHistorialClases`.
3. **Catálogo**: `obtenerCatalogo`, el que tiene más filtros.
4. **Perfil**: 5 SP, más la subida de fotos.
5. **Agenda**: `obtenerDisponibilidad`, `guardarDisponibilidad`, `bloquearDia` y `desbloquearDia`.
6. **Clases**: el más grande, con 10 SP y las funciones que comparten (`dentroDeAgenda`, `clasesQueChocan`, `actualizarEstadosClases`).
7. **Navegación**: `HomeController`, que usa SP de Catálogo, Clases y Notificaciones. Por eso va al final.
8. **Lo que está sin hacer**: primero la consulta de Soporte y las sugerencias del buscador (tienen `TODO BD`); después lo de la V2.
