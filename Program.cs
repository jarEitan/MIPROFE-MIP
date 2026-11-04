using System.Globalization;
using MIP_MIPROFESOR.Models;

var builder = WebApplication.CreateBuilder(args);

// Formato argentino en todo el sitio: precios "8.000" y calificaciones "4,9"
CultureInfo.DefaultThreadCurrentCulture = new CultureInfo("es-AR");
CultureInfo.DefaultThreadCurrentUICulture = new CultureInfo("es-AR");

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

// Una URL que no existe (o cualquier error sin contenido) muestra Home/NoEncontrado con el mismo código
app.UseStatusCodePagesWithReExecute("/Home/NoEncontrado");

app.UseHttpsRedirection();
app.UseRouting();
app.UseSession();

// Cuentas suspendidas (alumnoBaneado / profesorBaneado): pueden iniciar sesión y mirar, pero no hacer nada.
// Todas las acciones son POST: en cada una se vuelve a leer el tipo de la base, así la suspensión (o quitarla) vale enseguida.
// Se dejan pasar la sesión y Soporte, para que puedan pedir que se revise.
app.Use(async (contexto, siguiente) =>
{
    string? idUsuario = contexto.Session.GetString("idUsuario");
    if (HttpMethods.IsPost(contexto.Request.Method) && idUsuario != null)
    {
        string tipoUsuario = new BD().obtenerTipoUsuario(int.Parse(idUsuario)) ?? "";
        contexto.Session.SetString("tipoUsuario", tipoUsuario);
        bool permitida = contexto.Request.Path.StartsWithSegments("/Sesion") || contexto.Request.Path.StartsWithSegments("/Consultas/Enviar");
        if (tipoUsuario.EndsWith("Baneado") && !permitida)
        {
            contexto.Response.StatusCode = StatusCodes.Status403Forbidden;
            await contexto.Response.WriteAsJsonAsync(new { codigo = -1, mensaje = "Tu cuenta está suspendida." });
            return;
        }
    }
    await siguiente();
});

app.UseAuthorization();

// Las fotos del DNI se guardan en wwwroot/userData/dni pero nunca se sirven por URL
app.Use(async (contexto, siguiente) =>
{
    if (contexto.Request.Path.StartsWithSegments("/userData/dni"))
    {
        contexto.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }
    await siguiente();
});

// MapStaticAssets solo conoce los archivos que había al compilar: las fotos subidas después las sirve UseStaticFiles
app.UseStaticFiles();
app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();


app.Run();
