using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// "Dar reseña" del perfil y del historial. Se llama con fetch desde site.js y devuelve JSON
public class ResenasController : Controller
{
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Dar(int idReceptor, int puntuacion, string? descripcion)
    {
        string? idEmisor = HttpContext.Session.GetString("idUsuario");
        if (idEmisor == null) return Unauthorized();

        // El navegador manda cada salto de línea como \r\n y el contador de la página (hasta 500) cuenta uno solo
        descripcion = descripcion?.Replace("\r\n", "\n");
        return Json(new { codigo = new BD().darResena(int.Parse(idEmisor), idReceptor, puntuacion, descripcion) });
    }
}
