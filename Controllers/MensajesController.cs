using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Chat del Panel de Control. Se llama con fetch desde chat.js y devuelve JSON
public class MensajesController : Controller
{
    public IActionResult Conversaciones()
    {
        int idUsuario = int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0");
        return Json(new BD().obtenerConversaciones(idUsuario));
    }

    public IActionResult Chat(int id)
    {
        int idUsuario = int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0");
        ResultadoChat chat = new BD().obtenerChat(idUsuario, id);

        // Si se leyeron mensajes nuevos, baja la insignia de notificaciones
        if (chat.marcados > 0)
        {
            chat.cantidadNotificaciones = new BD().contarNotificaciones(idUsuario);
            HttpContext.Session.SetString("cantidadNotificaciones", chat.cantidadNotificaciones.ToString());
        }
        return Json(chat);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Enviar(int idReceptor, string? contenido)
    {
        string? idEmisor = HttpContext.Session.GetString("idUsuario");
        if (idEmisor == null) return Unauthorized();

        return Json(new BD().enviarMensaje(int.Parse(idEmisor), idReceptor, contenido));
    }
}
