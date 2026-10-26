using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Historial del Panel de Control y del modal de los perfiles. Se llama con fetch desde historial.js y devuelve JSON
public class HistorialController : Controller
{
    public IActionResult Obtener(int id, int desde)
    {
        int idVisitante = int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0");
        int cantidad = 10;
        if (idVisitante == id)
        {
            cantidad = 20;
        }
        return Json(new BD().obtenerHistorialClases(id, idVisitante, desde, cantidad));
    }
}
