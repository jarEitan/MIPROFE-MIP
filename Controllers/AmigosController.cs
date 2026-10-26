using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Se llama con fetch desde site.js y devuelve JSON.
// Rechazar una solicitud recibida está en NotificacionesController.ResponderAmistad
public class AmigosController : Controller
{
    public IActionResult Estado(int id)
    {
        int idUsuario = int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0");
        return Json(new BD().obtenerAmistad(idUsuario, id));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Cambiar(int idOtroUsuario, string accion)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null) return Unauthorized();

        if (accion == "enviar")
        {
            return Json(new BD().enviarAmistad(int.Parse(idUsuario), idOtroUsuario));
        }
        else
        {
            return Json(new BD().quitarAmistad(int.Parse(idUsuario), idOtroUsuario));
        }
    }

    public IActionResult Lista(int id)
    {
        return Json(new BD().obtenerAmigos(id));
    }
}
