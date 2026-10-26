using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Catálogo de profesores. La página (Index) trae los selectores y el resto lo carga catalogo.js
// con fetch a Catalogo/Buscar, que responde en JSON una página de resultados.
public class CatalogoController : Controller
{
    // /Catalogo?busqueda=...&materia=...&colegio=...&modalidad=...&nivel=Secundario 1&nivel=Secundario 2&pagina=2&porPagina=15
    // Los filtros de la URL solo preseleccionan el formulario (links de Inicio y búsquedas compartidas).
    [HttpGet("Catalogo")]
    public IActionResult Index(string? busqueda, string? materia, string? colegio, string? modalidad, string[]? nivel, int pagina = 1, int porPagina = 10)
    {
        ViewBag.busqueda = busqueda ?? "";
        ViewBag.materia = materia ?? "";
        ViewBag.colegio = colegio ?? "";
        ViewBag.modalidad = modalidad ?? "";
        ViewBag.nivelesElegidos = (nivel ?? new string[0]).ToList();
        ViewBag.pagina = pagina < 1 ? 1 : pagina;
        ViewBag.porPagina = new[] { 5, 10, 15, 20 }.Contains(porPagina) ? porPagina : 10;

        ViewBag.materias = new List<string>();
        ViewBag.colegios = new List<string>();
        ViewBag.niveles = new List<string>();
        ViewBag.modalidades = new List<string>();
        try
        {
            OpcionesPerfil opciones = new BD().obtenerOpcionesPerfil();
            ViewBag.materias = opciones.materias.Select(opcion => opcion.nombre).ToList();
            ViewBag.colegios = opciones.escuelas.Select(opcion => opcion.nombre).ToList();
            ViewBag.niveles = opciones.niveles.Select(opcion => opcion.nombre).ToList();
            ViewBag.modalidades = opciones.modalidades.Select(opcion => opcion.nombre).ToList();
        }
        catch (Exception)
        {
            // Sin las opciones la página igual carga; catalogo.js muestra el error al buscar
        }
        return View();
    }

    // Una página de resultados en JSON. Cada profesor trae lo que muestra la tarjeta.
    [HttpGet("Catalogo/Buscar")]
    public IActionResult Buscar(string? busqueda, string? materia, string? colegio, string? modalidad, string[]? nivel, int pagina = 1, int porPagina = 10)
    {
        try
        {
            string niveles = string.Join(",", nivel ?? new string[0]);
            // Con sesión, los profesores que eligieron tus amigos aparecen primero
            int? idVisitante = int.TryParse(HttpContext.Session.GetString("idUsuario"), out int id) ? id : null;
            ResultadoCatalogo resultado = new BD().obtenerCatalogo(busqueda, materia, colegio, modalidad, niveles, pagina, porPagina, idVisitante);
            return Json(new
            {
                ok = true,
                total = resultado.total,
                pagina = resultado.pagina,
                porPagina = resultado.porPagina,
                totalPaginas = resultado.totalPaginas,
                profesores = resultado.profesores.Select(profesor => new
                {
                    id = profesor.id,
                    nombreCompleto = profesor.nombreCompleto,
                    iniciales = profesor.iniciales,
                    fotoPerfil = profesor.fotoPerfil,
                    verificado = profesor.verificado,
                    resumen = profesor.resumen,
                    calificacion = profesor.calificacion,
                    cantidadResenas = profesor.cantidadResenas,
                    amigosRecomiendan = profesor.amigosRecomiendan,
                    precioHora = profesor.precioHora,
                    materias = profesor.materias,
                    niveles = profesor.niveles,
                    modalidades = profesor.modalidades,
                    colegios = profesor.colegios
                })
            });
        }
        catch (Exception)
        {
            return StatusCode(500, new { ok = false, mensaje = "No pudimos cargar el catálogo. Probá de nuevo en un rato." });
        }
    }
}
