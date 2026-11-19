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
        BD bd = new BD();
        List<ClaseHistorial> clases = bd.obtenerHistorialClases(id, idVisitante, desde, cantidad);
        ResultadoHistorial historial = new ResultadoHistorial
        {
            id = id,
            tipoUsuario = bd.obtenerTipoUsuario(id) ?? "",
            esPropio = idVisitante == id,
            total = clases.Count,
            clases = clases
        };
        if (historial.clases.Count == 0)
        {
            historial.codigo = 1;
        }
        else
        {
            historial.codigo = 0;
        }
        return Json(historial);
    }
}
