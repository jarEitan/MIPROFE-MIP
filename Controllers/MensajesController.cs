using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Chat directo del Panel de Control. Se llama con fetch desde chat.js y devuelve JSON.
// El usuario sale SIEMPRE de la sesión, nunca del pedido.
public class MensajesController : Controller
{
    private const int largoMaximoMensaje = 1000;

    // GET /Mensajes/Conversaciones → las personas con las que hablaste, la del último mensaje primero
    [HttpGet]
    public IActionResult Conversaciones()
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null) return StatusCode(401, new { mensaje = "Tu sesión se cerró. Volvé a iniciar sesión." });

        try
        {
            return Json(new BD().obtenerConversaciones(idUsuario.Value));
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensaje = "No pudimos cargar tus conversaciones. Probá de nuevo en unos minutos." });
        }
    }

    // GET /Mensajes/Chat/5 → todos los mensajes entre vos y el usuario 5, del más viejo al más nuevo.
    // Al leerlos, los que te mandó y no habías visto pasan a Visto; si cambió algo se devuelve la insignia nueva.
    [HttpGet]
    public IActionResult Chat(int id)
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null) return StatusCode(401, new { mensaje = "Tu sesión se cerró. Volvé a iniciar sesión." });

        try
        {
            BD bd = new BD();
            ResultadoChat chat = bd.obtenerChat(idUsuario.Value, id);
            if (!chat.encontrado || chat.otroUsuario == null) return StatusCode(404, new { mensaje = "Esta persona no existe o no se le pueden mandar mensajes." });

            int? cantidadNotificaciones = null;
            if (chat.otroUsuario.marcados > 0)
            {
                cantidadNotificaciones = bd.contarNotificaciones(idUsuario.Value);
                HttpContext.Session.SetString("cantidadNotificaciones", cantidadNotificaciones.Value.ToString());
            }

            return Json(new { otroUsuario = chat.otroUsuario, mensajes = chat.mensajes, cantidadNotificaciones = cantidadNotificaciones });
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensaje = "No pudimos cargar el chat. Probá de nuevo en unos minutos." });
        }
    }

    // POST /Mensajes/Enviar → manda un mensaje del usuario de la sesión a idReceptor
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Enviar(int idReceptor, string? contenido)
    {
        int? idEmisor = obtenerIdUsuarioSesion();
        if (idEmisor == null) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Tu sesión se cerró. Volvé a iniciar sesión." });

        contenido = (contenido ?? "").Trim();
        if (contenido == "") return StatusCode(400, new { resultado = "mensajeInvalido", mensaje = "Escribí un mensaje antes de enviarlo." });
        if (contenido.Length > largoMaximoMensaje) return StatusCode(400, new { resultado = "mensajeInvalido", mensaje = "El mensaje puede tener hasta 1000 caracteres." });

        try
        {
            ResultadoMensaje resultado = new BD().enviarMensaje(idEmisor.Value, idReceptor, contenido);
            if (resultado.resultado == "mismoUsuario") return StatusCode(400, new { resultado = resultado.resultado, mensaje = "No podés mandarte mensajes a vos mismo." });
            if (resultado.resultado == "usuarioInexistente") return StatusCode(404, new { resultado = resultado.resultado, mensaje = "Esta persona no existe o no se le pueden mandar mensajes." });
            if (resultado.resultado != "ok") return StatusCode(400, new { resultado = resultado.resultado, mensaje = "Revisá el mensaje: no puede estar vacío ni pasar los 1000 caracteres." });
            return Json(new { resultado = resultado.resultado, id = resultado.id, fechaEnvio = resultado.fechaEnvio });
        }
        catch (Exception)
        {
            return StatusCode(500, new { resultado = "errorBD", mensaje = "No pudimos enviar el mensaje. Probá de nuevo en unos minutos." });
        }
    }

    private int? obtenerIdUsuarioSesion()
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        return int.TryParse(idUsuario, out int id) ? id : null;
    }
}
