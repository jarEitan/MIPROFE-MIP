using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;
using MIP_MIPROFESOR.Services;

namespace MIP_MIPROFESOR.Controllers;

// "Dar reseña" del perfil y del historial, y borrarla desde el perfil. Se llama con fetch desde site.js y devuelve JSON
public class ResenasController : Controller
{
    private readonly IGroqModerationService moderacion;

    public ResenasController(IGroqModerationService moderacion)
    {
        this.moderacion = moderacion;
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Dar(int idReceptor, int puntuacion, string? descripcion)
    {
        string? idEmisor = HttpContext.Session.GetString("idUsuario");
        if (idEmisor == null) return Unauthorized();

        // El navegador manda cada salto de línea como \r\n y el contador de la página (hasta 500) cuenta uno solo
        descripcion = descripcion?.Replace("\r\n", "\n");

        if (string.IsNullOrWhiteSpace(descripcion) || await moderacion.EsContenidoValidoAsync(descripcion))
        {
            return Json(new { codigo = new BD().darResena(int.Parse(idEmisor), idReceptor, puntuacion, descripcion) });
        }
        else
        {
            return Json(new { codigo = 99 });
        }
    }

    // El tacho de la reseña: la borra quien la escribió o un moderador (lo revisa el SP)
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Borrar(int idResena)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null) return Unauthorized();

        return Json(new { codigo = new BD().borrarResena(idResena, int.Parse(idUsuario)) });
    }
}
