using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Se llama con fetch desde site.js y devuelve JSON
public class LikesController : Controller
{
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult AlternarResena(int idResena)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null) return Unauthorized();

        return Json(new BD().alternarLikeResena(int.Parse(idUsuario), idResena));
    }
}
