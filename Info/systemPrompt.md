# INSTRUCCIONES DE SISTEMA PARA PROGRAMAR

Valores: originalidad, confiabilidad, legibilidad, escalabilidad, modularidad. El código tiene que leerse como si lo hubiera escrito un estudiante en clase, no como si estuviera generado: corto, directo, pocos comentarios.

## Nombres
- camelCase en todos lados, descriptivo del propósito exacto. Nada de nombres genéricos (hero, funcion1, test, temp, data).

## Frontend
- Bootstrap para layout y grillas. Un solo CSS propio, modular, con clases reutilizables y selectores descendientes (`.clase div h2`), en este orden: Header → etiquetas generales → Main/Aside (en el orden de la página) → Footer.
- Razor: `<section>` para zonas grandes y aisladas, `<div>` para elementos anidados. Sesión: `@if (Context.Session.GetString("key") == "val") { }`
- Los campos obligatorios de los formularios se validan en JS antes de enviar (`onsubmit="return validarRegistro()"`; los formularios usan `novalidate`). El controlador ya no revisa valores vacíos.
- JS modular. Validación: `if(val===""){ msg.innerHTML="Error"; msg.style.display="block"; return false; }`. Fetch: `fetch('url').then(r=>r.json()).then(d=>{ /* DOM */ }).catch(e=>console.error(e));`
- Cuando un fetch devuelve `codigo`: `if (d.codigo == 0) { /* DOM */ } else if (d.codigo == 1) { mostrarSnackbar("…", "error"); } else { … }`

## Backend (MVC)
- Controladores simples, sin `RedirectToAction` anidados. Sin `try/catch` y sin validar lo que ya valida el SP.
- Flujo: `Resultado r = new BD().sp(...); if (r.codigo == 0) { ... } else { if (r.codigo == 1) { ViewBag.mensaje = "..."; } else { ... } }`
- El id del usuario sale siempre de la sesión, nunca del request. GET: `int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0")`. POST: `if (idUsuario == null) return Unauthorized();`. Todo POST lleva `[ValidateAntiForgeryToken]`.
- Los endpoints de fetch devuelven lo que devolvió la BD: `return Json(new BD().sp(...));`
- Sesión: `HttpContext.Session.SetString("Key", val);` / `HttpContext.Session.Clear();`
- Modelos: solo propiedades auto-implementadas. Los modelos de resultado tienen `int codigo` y un comentario de una línea sobre la clase que lista qué significa cada código.
- Sin banners `// =====` en el C# refactorizado (los que quedan en `BD.cs` se van a medida que se refactoriza cada sección). Comentarios solo para explicar el porqué.

## Base de datos (BD.cs + Dapper)
- Todo el acceso a la BD va en `BD.cs` (`BDsesion.cs` para login/registro): un método por SP, con el mismo nombre.
- `using (var connection = new SqlConnection(connectionString)) { return connection.QueryFirst<T>("EXEC sp @a, @b", new { a = a, b = b }); }`. Para listas, `Query<T>(...).ToList()`. Sin `CommandType`, sin fallbacks `?? new T()`.
- Los SP siguen el ejemplo de clase: `IF EXISTS (...) BEGIN ... END ELSE BEGIN IF ... END` anidados, con `BEGIN/END` en cada rama. Éxito: `SELECT 0 AS codigo, <datos>`. Cada error: `SELECT n AS codigo`. Nunca `RETURN 'texto'` (en un stored procedure RETURN solo acepta enteros). Sin `SET NOCOUNT`, `TRY/CATCH`, transacciones, hints de lock ni funciones auxiliares para lógica de una línea. Un SP por acción (`enviarAmistad` / `quitarAmistad`, no un solo SP `cambiarAmistad @accion`; el controlador sí puede recibir `accion` y elegir el SP).
- Las contraseñas se guardan encriptadas (PBKDF2 con sal); las encripta y las compara `BDsesion.cs`, el SP `iniciarSesion` solo devuelve la guardada.
- Scripts en `MIP_Estructuras/` (UTF-16, mantener la codificación): `01_estructura`, `02_stored_procedures`, `03_datos_prueba`. La BD se borra y se recrea en cada cambio, por eso se usa `CREATE PROCEDURE`. Leer 01 y 02 antes de escribir consultas. En 03, las tablas referenciadas se insertan primero.
- Documentar cada código nuevo en el comentario del modelo y en la tabla de códigos de `log.md`.
