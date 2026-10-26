# SYSTEM INSTRUCTIONS FOR CODING

Values: originality, reliability, readability, scalability, modularity. The code must read like a student wrote it in class, not like it was generated: short, direct, few comments.

## Naming
- camelCase everywhere, descriptive of exact purpose. No generic names (hero, funcion1, test, temp, data).

## Frontend
- Bootstrap for layout/grids. One modular custom CSS with reusable classes and descendant selectors (`.class div h2`), ordered: Header → general tags → Main/Aside (page order) → Footer.
- Razor: `<section>` for large isolated zones, `<div>` for nested items. Session: `@if (Context.Session.GetString("key") == "val") { }`
- Required form fields are validated in JS before submit (`onsubmit="return validarRegistro()"`; forms use `novalidate`). The controller no longer checks for empty values.
- JS modular. Validation: `if(val===""){ msg.innerHTML="Error"; msg.style.display="block"; return false; }`. Fetch: `fetch('url').then(r=>r.json()).then(d=>{ /* DOM */ }).catch(e=>console.error(e));`
- When a fetch returns `codigo`: `if (d.codigo == 0) { /* DOM */ } else if (d.codigo == 1) { mostrarSnackbar("…", "error"); } else { … }`

## Backend (MVC)
- Simple controllers, no nested `RedirectToAction`. No `try/catch`, and no validation the SP already does.
- Flow: `Resultado r = new BD().sp(...); if (r.codigo == 0) { ... } else { if (r.codigo == 1) { ViewBag.mensaje = "..."; } else { ... } }`
- User id always from the session, never from the request. GET: `int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0")`. POST: `if (idUsuario == null) return Unauthorized();`. Every POST has `[ValidateAntiForgeryToken]`.
- Fetch endpoints return what the DB returned: `return Json(new BD().sp(...));`
- Session: `HttpContext.Session.SetString("Key", val);` / `HttpContext.Session.Clear();`
- Models: auto-implemented properties only. Result models have `int codigo` and a one-line comment above the class listing what each code means.
- No `// =====` banners in refactored C# (the ones left in `BD.cs` go away as each section is refactored). Comments only to explain why.

## Database (BD.cs + Dapper)
- All DB access in `BD.cs` (`BDsesion.cs` for login/register): one method per SP, with the same name.
- `using (var connection = new SqlConnection(connectionString)) { return connection.QueryFirst<T>("EXEC sp @a, @b", new { a = a, b = b }); }`. Use `Query<T>(...).ToList()` for lists. No `CommandType`, no `?? new T()` fallbacks.
- SPs follow the class example: nested `IF EXISTS (...) BEGIN ... END ELSE BEGIN IF ... END`, with `BEGIN/END` on every branch. Success: `SELECT 0 AS codigo, <data>`. Each error: `SELECT n AS codigo`. Never `RETURN 'text'` (in a stored procedure RETURN only takes an integer). No `SET NOCOUNT`, `TRY/CATCH`, transactions, lock hints or helper functions for one-line logic. One SP per action (`enviarAmistad` / `quitarAmistad`, not one SP `cambiarAmistad @accion`; the controller may still take `accion` and pick the SP).
- Passwords are stored in plain text on purpose (school project); `iniciarSesion` compares them in the SP.
- Scripts in `MIP_Estructuras/` (UTF-16, keep the encoding): `01_estructura`, `02_stored_procedures`, `03_datos_prueba`. The DB is dropped and recreated on every change, so use `CREATE PROCEDURE`. Read 01 and 02 before writing queries. In 03, referenced tables are inserted first.
- Document every new code in the model comment and in the codes table in `log.md`.
