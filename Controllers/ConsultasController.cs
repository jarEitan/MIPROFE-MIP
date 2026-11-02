using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Formulario de contacto de Soporte (site.js, validarContacto). Las responde un moderador desde ModeracionController
public class ConsultasController : Controller
{
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Enviar(string? tipo, string? mensaje)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null) return Unauthorized();

        return Json(new BD().enviarConsulta(int.Parse(idUsuario), tipo, mensaje));
    }

    // "Reportar" del perfil (tipo perfil) y de cada reseña (tipo resena). Lo revisa un moderador en ModeracionController
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Reportar(string? tipo, int idReportado, string? mensaje)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null) return Unauthorized();

        return Json(new { codigo = new BD().enviarReporte(int.Parse(idUsuario), tipo, idReportado, mensaje?.Trim()) });
    }
}
