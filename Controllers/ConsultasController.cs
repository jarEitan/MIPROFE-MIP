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
}
