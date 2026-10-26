# SYSTEM INSTRUCTIONS FOR CODING

Values: originality, reliability, readability, scalability, modularity.

## Naming
- camelCase everywhere, descriptive of exact purpose. No generic names (hero, funcion1, test, temp, data).

## Frontend
- Bootstrap for layout/grids. One modular custom CSS with reusable classes and descendant selectors (`.class div h2`), ordered: Header → general tags → Main/Aside (page order) → Footer.
- Razor: `<section>` for large isolated zones, `<div>` for nested items. Session: `@if (Context.Session.GetString("key") == "val") { }`
- JS modular. Validation: `if(val===""){ msg.innerHTML="Error"; msg.style.display="block"; return false; }`. Fetch: `fetch('url').then(r=>r.json()).then(d=>{ /* DOM */ }).catch(e=>console.error(e));`

## Backend (MVC)
- Simple controllers, no nested `RedirectToAction`.
- Session: `HttpContext.Session.SetString("Key", val);` / `HttpContext.Session.Clear();`
- Models: auto-implemented properties only.

## Database (BD.cs + Dapper)
- All DB access in `BD.cs` via Dapper, through stored procedures.
- Always read the root `.sql` (`MIP-BD.sql`) for schema and existing SPs before writing queries.
- `using (var c = new SqlConnection(connStr)) { return c.Execute("sp", model, commandType: CommandType.StoredProcedure); }`
