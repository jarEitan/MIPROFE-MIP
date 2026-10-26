using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Reseñas: "Dar reseña" del perfil y del historial. Se llama con fetch desde site.js y devuelve JSON.
// Quien la escribe sale SIEMPRE de la sesión; el SP darResena revisa que hayan tenido una clase completada.
public class ResenasController : Controller
{
    private const int largoMaximoDescripcion = 500;

    // POST /Resenas/Dar → puntuacion de 1 a 5 y un comentario opcional (hasta 500 caracteres)
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Dar(int idReceptor, int puntuacion, string? descripcion)
    {
        string? idSesion = HttpContext.Session.GetString("idUsuario");
        if (!int.TryParse(idSesion, out int idEmisor)) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para dejar una reseña." });

        // El navegador manda cada salto de línea como \r\n; el contador de la página cuenta uno solo
        descripcion = descripcion?.Replace("\r\n", "\n").Trim();
        if (puntuacion < 1 || puntuacion > 5) return Json(new { resultado = "puntuacionInvalida", mensaje = textoDeResultado("puntuacionInvalida") });
        if (descripcion != null && descripcion.Length > largoMaximoDescripcion) return Json(new { resultado = "descripcionInvalida", mensaje = textoDeResultado("descripcionInvalida") });

        try
        {
            string resultado = new BD().darResena(idEmisor, idReceptor, puntuacion, descripcion);
            return Json(new { resultado = resultado, mensaje = textoDeResultado(resultado) });
        }
        catch (Exception)
        {
            return StatusCode(500, new { resultado = "errorBD", mensaje = "No pudimos guardar tu reseña. Probá de nuevo en unos minutos." });
        }
    }

    private static string textoDeResultado(string resultado)
    {
        switch (resultado)
        {
            case "ok": return "¡Gracias! Tu reseña ya está en el perfil.";
            case "mismoUsuario": return "No podés dejarte una reseña a vos mismo.";
            case "usuarioInexistente": return "Este perfil ya no existe.";
            case "puntuacionInvalida": return "Elegí de 1 a 5 estrellas.";
            case "descripcionInvalida": return "El comentario puede tener hasta 500 caracteres.";
            case "sinClaseCompletada": return "Podés dejar una reseña después de tener una clase con esta persona.";
            case "yaReseno": return "Ya le dejaste una reseña a esta persona.";
            default: return "Revisá los datos e intentá de nuevo.";
        }
    }
}
