using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Se llama con fetch desde site.js y devuelve JSON
public class LikesController : Controller
{
    public IActionResult ObtenerLike(int id)
    {
        int idEmisor = int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0");
        return Json(new BD().obtenerLike(idEmisor, id));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult AlternarLike(int idReceptor)
    {
        string? idEmisor = HttpContext.Session.GetString("idUsuario");
        if (idEmisor == null) return Unauthorized();

        return Json(new BD().alternarLike(int.Parse(idEmisor), idReceptor));
    }
}
