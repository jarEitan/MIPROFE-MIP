using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// La página trae los selectores y catalogo.js pide cada página a Catalogo/Buscar con fetch
public class CatalogoController : Controller
{
    // Los filtros de la URL solo preseleccionan el formulario (links de Inicio y búsquedas compartidas)
    [HttpGet("Catalogo")]
    public IActionResult Index(string? busqueda, string? materia, string? colegio, string? modalidad, string[]? nivel, int pagina = 1, int porPagina = 10)
    {
        ViewBag.busqueda = busqueda ?? "";
        ViewBag.materia = materia ?? "";
        ViewBag.colegio = colegio ?? "";
        ViewBag.modalidad = modalidad ?? "";
        ViewBag.nivelesElegidos = (nivel ?? new string[0]).ToList();
        ViewBag.pagina = pagina;
        ViewBag.porPagina = porPagina;

        OpcionesPerfil opciones = new BD().obtenerOpcionesPerfil();
        ViewBag.materias = opciones.materias.Select(opcion => opcion.nombre).ToList();
        ViewBag.colegios = opciones.escuelas.Select(opcion => opcion.nombre).ToList();
        ViewBag.niveles = opciones.niveles.Select(opcion => opcion.nombre).ToList();
        ViewBag.modalidades = opciones.modalidades.Select(opcion => opcion.nombre).ToList();
        return View();
    }

    [HttpGet("Catalogo/Buscar")]
    public IActionResult Buscar(string? busqueda, string? materia, string? colegio, string? modalidad, string[]? nivel, int pagina = 1, int porPagina = 10)
    {
        string? niveles = nivel == null || nivel.Length == 0 ? null : string.Join(",", nivel);
        List<int> ids = new BD().obtenerIdsCatalogo(busqueda, materia, colegio, modalidad, niveles);
        return Json(new { total = ids.Count, profesores = new BD().obtenerProfesoresCatalogo(ids, pagina, porPagina) });
    }
}
