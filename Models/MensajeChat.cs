namespace MIP_MIPROFESOR.Models;

// Un mensaje del chat visto por el usuario de la sesión (segundo resultado del SP obtenerChat).
// estado: No visto | Visto (si el otro ya lo leyó, en los propios).
public class MensajeChat
{
    public int id { get; set; }
    public bool esMio { get; set; }
    public string contenido { get; set; } = "";
    public string estado { get; set; } = "";
    public DateTime fechaEnvio { get; set; }
}

// La otra persona del chat (primer resultado del SP obtenerChat). marcados = cuántos mensajes suyos
// se acaban de marcar como Visto al abrir el chat.
public class UsuarioChat
{
    public int id { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string? fotoPerfil { get; set; }
    public string tipoUsuario { get; set; } = "";
    public int marcados { get; set; }
}

// El chat completo con una persona, del mensaje más viejo al más nuevo. encontrado = false si la persona no existe.
public class ResultadoChat
{
    public bool encontrado { get; set; }
    public UsuarioChat? otroUsuario { get; set; }
    public List<MensajeChat> mensajes { get; set; } = new List<MensajeChat>();
}

// Una fila del SP obtenerConversaciones: una persona con la que el usuario intercambió mensajes
public class ConversacionChat
{
    public int idOtroUsuario { get; set; }
    public string nombreOtro { get; set; } = "";
    public string apellidoOtro { get; set; } = "";
    public string? fotoOtro { get; set; }
    public string tipoOtro { get; set; } = "";
    public string ultimoMensaje { get; set; } = "";
    public DateTime fechaUltimoMensaje { get; set; }
    public bool ultimoEsMio { get; set; }
    public int sinLeer { get; set; }
}

// Fila del SP enviarMensaje. resultado: ok | mismoUsuario | usuarioInexistente | mensajeInvalido
public class ResultadoMensaje
{
    public string resultado { get; set; } = "";
    public int? id { get; set; }
    public DateTime? fechaEnvio { get; set; }
}
