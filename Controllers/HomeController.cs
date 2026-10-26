using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;

    public HomeController(ILogger<HomeController> logger)
    {
        _logger = logger;
    }

    // ================= PÁGINAS PÚBLICAS =================

    public IActionResult Index()
    {
        // TODO BD: reemplazar la lista de materias por BD.obtenerMateriasDestacadas().
        ViewBag.materiasDestacadas = new List<string>
        {
            "Matemática", "Física", "Química", "Biología", "Inglés", "Historia",
            "Lengua y Literatura", "Programación", "Economía", "Geografía"
        };
        // Los 3 primeros del catálogo: cuentas verificadas y mejor calificadas. Si la base no responde, la página igual carga.
        try
        {
            ViewBag.profesoresDestacados = new BD().obtenerCatalogo(null, null, null, null, null, 1, 5, null).profesores.Take(3).ToList();
        }
        catch (Exception)
        {
            ViewBag.profesoresDestacados = new List<Profesor>();
        }
        return View();
    }

    public IActionResult Soporte()
    {
        return View();
    }

    public IActionResult QuienesSomos()
    {
        return View();
    }

    // /Home/Perfil/5 → perfil de cualquier usuario (se puede compartir la URL).
    // /Home/Perfil sin ID → el perfil propio. Los datos los trae site.js con fetch a PerfilesController.
    // /Home/Perfil?editar=true → el perfil propio con el modal "Editar perfil" ya abierto
    // (lo usa el botón "Completar mis datos" del aviso de cuenta no verificada).
    public IActionResult Perfil(int? id, bool editar = false)
    {
        string? idUsuarioSesion = HttpContext.Session.GetString("idUsuario");
        if (id == null && idUsuarioSesion == null) return RedirectToAction("IniciarSesion", "Sesion");

        int idPerfil = id ?? int.Parse(idUsuarioSesion!);
        bool esPerfilPropio = idUsuarioSesion == idPerfil.ToString();
        ViewBag.idPerfil = idPerfil;
        ViewBag.esPerfilPropio = esPerfilPropio;
        ViewBag.abrirEdicion = esPerfilPropio && editar;
        // En el perfil propio el aviso de verificación está dentro de la página, con más detalle
        ViewBag.ocultarAvisoVerificacion = esPerfilPropio;
        return View();
    }

    // ================= ÁREA CON SESIÓN =================

    public IActionResult PanelControl()
    {
        string? idUsuarioSesion = HttpContext.Session.GetString("idUsuario");
        if (!int.TryParse(idUsuarioSesion, out int idUsuario)) return RedirectToAction("IniciarSesion", "Sesion");

        // Los contadores y las notificaciones salen de la BD. Las de acción son lo que está a medio resolver (amistades,
        // mensajes y clases): siguen contando en la insignia hasta que se resuelven; las noticias no cuentan.
        // Las clases (calendario) las pide clases.js con fetch a ClasesController.Calendario y el chat, chat.js a MensajesController.
        try
        {
            BD bd = new BD();
            ViewBag.contadores = bd.obtenerContadoresClases(idUsuario);
            List<NotificacionUsuario> notificaciones = bd.obtenerNotificaciones(idUsuario);
            ViewBag.notificaciones = notificaciones;
            HttpContext.Session.SetString("cantidadNotificaciones", notificaciones.Count(notificacion => notificacion.grupo == "accion").ToString());
            // Un profesor sin franjas semanales todavía no configuró su agenda (aviso arriba del Panel)
            ViewBag.sinAgenda = HttpContext.Session.GetString("tipoUsuario") == "profesor" && !bd.obtenerDisponibilidad(idUsuario).tieneAgenda;
        }
        catch (Exception)
        {
            ViewBag.errorBD = true;
        }
        return View();
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
