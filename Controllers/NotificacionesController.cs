using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Se llama con fetch desde clases.js. La lista de notificaciones se arma en HomeController.PanelControl
public class NotificacionesController : Controller
{
    public IActionResult Contar()
    {
        int idUsuario = int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0");
        int cantidad = new BD().contarNotificaciones(idUsuario);
        HttpContext.Session.SetString("cantidadNotificaciones", cantidad.ToString());
        return Json(new { cantidad = cantidad });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult ResponderAmistad(int idOtroUsuario, bool aceptar)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null) return Unauthorized();

        BD bd = new BD();
        int codigo;
        if (aceptar)
        {
            codigo = bd.aceptarAmistad(int.Parse(idUsuario), idOtroUsuario);
        }
        else
        {
            codigo = bd.rechazarAmistad(int.Parse(idUsuario), idOtroUsuario);
        }

        int cantidad = bd.contarNotificaciones(int.Parse(idUsuario));
        HttpContext.Session.SetString("cantidadNotificaciones", cantidad.ToString());
        return Json(new { codigo = codigo, cantidadNotificaciones = cantidad });
    }
}
