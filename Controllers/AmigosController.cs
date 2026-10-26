using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Amigos de los perfiles: botón "Agregar amigo" y lista de amigos. Se llama con fetch desde site.js y devuelve JSON.
// Quien pide sale SIEMPRE de la sesión, nunca del pedido. Rechazar una solicitud es NotificacionesController.ResponderAmistad.
public class AmigosController : Controller
{
    // GET /Amigos/Estado/5 → cómo está el usuario de la sesión con el perfil 5 (sin sesión: ninguna)
    [HttpGet]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Estado(int id)
    {
        try
        {
            return Json(new { estadoAmistad = new BD().obtenerAmistad(obtenerIdUsuarioSesion(), id).estadoAmistad });
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensaje = "No pudimos cargar tus amigos. Probá de nuevo en unos minutos." });
        }
    }

    // POST /Amigos/Cambiar → accion: enviar (manda o acepta la solicitud) | quitar (la cancela o deja de ser amigo)
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Cambiar(int idOtroUsuario, string accion)
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para agregar amigos." });

        try
        {
            ResultadoAmistad resultado = new BD().cambiarAmistad(idUsuario.Value, idOtroUsuario, accion ?? "");
            if (resultado.resultado == "mismoUsuario") return StatusCode(400, new { resultado = resultado.resultado, mensaje = "No podés agregarte a vos mismo." });
            if (resultado.resultado == "accionInvalida") return StatusCode(400, new { resultado = resultado.resultado, mensaje = "Revisá los datos e intentá de nuevo." });
            if (resultado.resultado == "usuarioInexistente") return StatusCode(404, new { resultado = resultado.resultado, mensaje = "Este perfil ya no existe." });
            return Json(new { resultado = resultado.resultado, estadoAmistad = resultado.estadoAmistad, cantidadAmigos = resultado.cantidadAmigos });
        }
        catch (Exception)
        {
            return StatusCode(500, new { resultado = "errorBD", mensaje = "No pudimos guardar el cambio. Probá de nuevo en unos minutos." });
        }
    }

    // GET /Amigos/Lista/5 → los amigos del perfil 5 (públicos, como las reseñas)
    [HttpGet]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Lista(int id)
    {
        try
        {
            return Json(new BD().obtenerAmigos(id));
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensaje = "No pudimos cargar los amigos. Probá de nuevo en unos minutos." });
        }
    }

    private int? obtenerIdUsuarioSesion()
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        return int.TryParse(idUsuario, out int id) ? id : null;
    }
}
