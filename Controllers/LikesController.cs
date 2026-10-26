using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Me gusta de los perfiles. Se llama con fetch desde site.js y devuelve JSON.
public class LikesController : Controller
{
    // GET /Likes/ObtenerLike/5 → si el usuario de la sesión le dio me gusta al perfil 5 (sin sesión: false)
    [HttpGet]
    public IActionResult ObtenerLike(int id)
    {
        try
        {
            ResultadoLike resultado = new BD().obtenerLike(obtenerIdUsuarioSesion(), id);
            return Json(new { leGusta = resultado.leGusta, cantidadLikes = resultado.cantidadLikes });
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensaje = "No pudimos cargar los me gusta. Probá de nuevo en unos minutos." });
        }
    }

    // POST /Likes/AlternarLike → da o saca el me gusta. El emisor sale SIEMPRE de la sesión, nunca del pedido.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult AlternarLike(int idReceptor)
    {
        int? idEmisor = obtenerIdUsuarioSesion();
        if (idEmisor == null) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para dar me gusta." });

        try
        {
            ResultadoLike resultado = new BD().alternarLike(idEmisor.Value, idReceptor);
            if (resultado.resultado == "mismoUsuario") return StatusCode(400, new { resultado = resultado.resultado, mensaje = "No podés darte me gusta a vos mismo." });
            if (resultado.resultado == "usuarioInexistente") return StatusCode(404, new { resultado = resultado.resultado, mensaje = "Este perfil ya no existe." });
            return Json(new { resultado = resultado.resultado, leGusta = resultado.leGusta, cantidadLikes = resultado.cantidadLikes });
        }
        catch (Exception)
        {
            return StatusCode(500, new { resultado = "errorBD", mensaje = "No pudimos guardar tu me gusta. Probá de nuevo en unos minutos." });
        }
    }

    private int? obtenerIdUsuarioSesion()
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        return int.TryParse(idUsuario, out int id) ? id : null;
    }
}
