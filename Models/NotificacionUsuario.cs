namespace MIP_MIPROFESOR.Models;

// Una fila del SP obtenerNotificaciones. No hay tabla de notificaciones: se calculan con lo que está a medio
// resolver en Amigos, Mensajes y Clases (función notificacionesDeUsuario), así que cada una
// desaparece sola cuando se resuelve.
// grupo: accion (cuenta en la insignia) | noticia (solo para enterarse, se muestra 3 días).
// tipo (acciones): solicitudAmistad | mensajesSinLeer | pedidoPorResponder | propuestaPorResponder | horarioRechazado |
// pideCambioPorResponder | pideCancelarPorResponder. tipo (noticias): claseConfirmada | claseCancelada | claseTerminada | claseNoConcretada.
// destino (a dónde lleva el botón): perfil | chat | panelClases | resena (abre el diálogo Dar reseña).
public class NotificacionUsuario
{
    public string tipo { get; set; } = "";
    public string titulo { get; set; } = "";
    public string mensaje { get; set; } = "";
    public string textoBoton { get; set; } = "";
    public string destino { get; set; } = "";
    public int? idClase { get; set; }
    public int idOtroUsuario { get; set; }
    public string nombreOtro { get; set; } = "";
    public string apellidoOtro { get; set; } = "";
    public string? fotoOtro { get; set; }
    // Cuándo pasó (la solicitud de amistad no tiene fecha)
    public DateTime? fecha { get; set; }
    // En mensajesSinLeer: cuántos mensajes sin leer hay de esa persona (en el resto, 1)
    public int cantidad { get; set; }
    public string grupo { get; set; } = "accion";
}
