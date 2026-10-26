using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Notificaciones del usuario. Se llama con fetch desde clases.js para mantener al día la insignia del
// botón Panel de Control y para responder las solicitudes de amistad (la lista se arma en HomeController.PanelControl).
public class NotificacionesController : Controller
{
    // GET /Notificaciones/Contar → { cantidad }: solicitudes de amistad, chats con mensajes sin leer y clases que esperan respuesta
    [HttpGet]
    public IActionResult Contar()
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (!int.TryParse(idUsuario, out int id)) return StatusCode(401, new { cantidad = 0 });

        try
        {
            int cantidad = new BD().contarNotificaciones(id);
            HttpContext.Session.SetString("cantidadNotificaciones", cantidad.ToString());
            return Json(new { cantidad = cantidad });
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensaje = "No pudimos cargar las notificaciones." });
        }
    }

    // POST /Notificaciones/ResponderAmistad → { resultado, cantidadNotificaciones }. Solo responde quien recibió la solicitud.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult ResponderAmistad(int idOtroUsuario, bool aceptar)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (!int.TryParse(idUsuario, out int id)) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Tu sesión se cerró. Volvé a iniciar sesión." });

        try
        {
            BD bd = new BD();
            string resultado = bd.responderSolicitudAmistad(id, idOtroUsuario, aceptar);
            int cantidad = bd.contarNotificaciones(id);
            HttpContext.Session.SetString("cantidadNotificaciones", cantidad.ToString());
            if (resultado != "ok") return StatusCode(404, new { resultado = resultado, mensaje = "Esa solicitud ya no está pendiente.", cantidadNotificaciones = cantidad });
            return Json(new { resultado = resultado, cantidadNotificaciones = cantidad });
        }
        catch (Exception)
        {
            return StatusCode(500, new { resultado = "errorBD", mensaje = "No pudimos responder la solicitud. Probá de nuevo en unos minutos." });
        }
    }
}
