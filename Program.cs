using System.Globalization;

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

app.UseHttpsRedirection();
app.UseRouting();
app.UseSession();

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
