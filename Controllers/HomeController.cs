using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

public class HomeController : Controller
{
    public IActionResult Index()
    {
        // Los 3 primeros del catálogo: los mejor calificados
        List<int> ids = new BD().obtenerIdsCatalogo(null, null, null, null, null);
        ViewBag.profesoresDestacados = new BD().obtenerProfesoresCatalogo(ids, 1, 3);
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

    // Las clases y el chat los piden clases.js y chat.js con fetch
    public IActionResult PanelControl()
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null) return RedirectToAction("IniciarSesion", "Sesion");

        BD bd = new BD();
        List<NotificacionUsuario> notificaciones = bd.obtenerNotificaciones(int.Parse(idUsuario));
        ViewBag.notificaciones = notificaciones;
        ViewBag.contadores = bd.obtenerContadoresClases(int.Parse(idUsuario));
        HttpContext.Session.SetString("cantidadNotificaciones", notificaciones.Count(notificacion => notificacion.grupo == "accion").ToString());
        // Un profesor sin franjas semanales todavía no configuró su agenda (aviso arriba del Panel)
        ViewBag.sinAgenda = HttpContext.Session.GetString("tipoUsuario") == "profesor" && bd.obtenerDisponibilidad(int.Parse(idUsuario)).franjas.Count == 0;
        return View();
    }

    public IActionResult Privacy()
    {
        return View();
    }
}
