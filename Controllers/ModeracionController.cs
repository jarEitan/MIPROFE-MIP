using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Solo para moderadores: tipoUsuario = 'admin', se crean a mano en la BD
public class ModeracionController : Controller
{
    private readonly IWebHostEnvironment entorno;

    public ModeracionController(IWebHostEnvironment entorno)
    {
        this.entorno = entorno;
    }

    public IActionResult Index()
    {
        if (HttpContext.Session.GetString("tipoUsuario") != "admin") return RedirectToAction("Index", "Home");

        BD bd = new BD();
        ViewBag.consultas = bd.obtenerConsultasPendientes();
        ViewBag.usuarios = bd.obtenerUsuariosPorVerificar();
        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Responder(int idConsulta, string? respuesta)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null || HttpContext.Session.GetString("tipoUsuario") != "admin") return Unauthorized();

        return Json(new BD().responderConsulta(int.Parse(idUsuario), idConsulta, respuesta));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Verificar(int idUsuario)
    {
        if (HttpContext.Session.GetString("tipoUsuario") != "admin") return Unauthorized();

        return Json(new BD().verificarUsuario(idUsuario));
    }

    // /userData/dni está bloqueada en Program.cs: la foto solo sale por acá. La pide el botón "Ver DNI" del Perfil (site.js)
    public IActionResult FotoDni(int id)
    {
        if (HttpContext.Session.GetString("tipoUsuario") != "admin") return NotFound();

        string? fotoDni = new BD().obtenerFotoDni(id);
        if (fotoDni == null) return NotFound();

        string extension = Path.GetExtension(fotoDni);
        string tipoArchivo = extension == ".png" ? "image/png" : (extension == ".webp" ? "image/webp" : "image/jpeg");
        return PhysicalFile(Path.Combine(entorno.WebRootPath, "userData", "dni", Path.GetFileName(fotoDni)), tipoArchivo);
    }
}
