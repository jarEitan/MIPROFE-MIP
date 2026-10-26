using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Historial de clases (Panel de Control y modal "Historial" de los perfiles). Se llama con fetch y devuelve JSON.
// Quien mira sale SIEMPRE de la sesión, nunca del pedido: el SP decide qué clases puede ver.
public class HistorialController : Controller
{
    // GET /Historial/Obtener/5?desde=20 → las clases del usuario 5 a partir de la número "desde" (no hace falta sesión).
    // Mirando el propio ID se ve todo el historial, de a 20; mirando el de otro, solo las clases completadas, de a 10
    // y con tope total de 20 (el SP lo aplica). La cantidad la decide el servidor, no el pedido.
    // No se guarda en caché: la respuesta cambia según quién mira.
    [HttpGet]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Obtener(int id, int desde = 0)
    {
        int? idVisitante = obtenerIdUsuarioSesion();
        int cantidad = idVisitante == id ? 20 : 10;
        try
        {
            return Json(new BD().obtenerHistorialClases(id, idVisitante, Math.Max(desde, 0), cantidad));
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensaje = "No pudimos cargar el historial. Probá de nuevo en unos minutos." });
        }
    }

    private int? obtenerIdUsuarioSesion()
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        return int.TryParse(idUsuario, out int id) ? id : null;
    }
}
