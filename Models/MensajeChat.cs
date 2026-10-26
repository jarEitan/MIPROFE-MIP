namespace MIP_MIPROFESOR.Models;

// estado: No visto | Visto
public class MensajeChat
{
    public int id { get; set; }
    public bool esMio { get; set; }
    public string contenido { get; set; } = "";
    public string estado { get; set; } = "";
    public DateTime fechaEnvio { get; set; }
}

// codigo: 0 = ok, 1 = sos vos, 2 = la persona no existe
// Los datos son de la otra persona. marcados = cuántos mensajes suyos se acaban de marcar como Visto
public class ResultadoChat
{
    public int codigo { get; set; }
    public int id { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string? fotoPerfil { get; set; }
    public string tipoUsuario { get; set; } = "";
    public int marcados { get; set; }
    public List<MensajeChat> mensajes { get; set; } = new List<MensajeChat>();
    public int cantidadNotificaciones { get; set; }
}

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

// codigo: 0 = ok, 1 = sos vos, 2 = la persona no existe, 3 = mensaje vacío o de más de 1000 caracteres
public class ResultadoMensaje
{
    public int codigo { get; set; }
    public int? id { get; set; }
    public DateTime? fechaEnvio { get; set; }
}
