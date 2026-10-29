namespace MIP_MIPROFESOR.Models;

// El dueño del historial y las clases de la página pedida (SP obtenerHistorialClases).
// codigo: 0 = ok, 1 = el usuario no existe. total: cuántas clases se pueden ver (con el tope de 20 de los perfiles ajenos)
public class ResultadoHistorial
{
    public int codigo { get; set; }
    public int id { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string tipoUsuario { get; set; } = "";
    public bool esPropio { get; set; }
    public int total { get; set; }
    public List<ClaseHistorial> clases { get; set; } = new List<ClaseHistorial>();
}

// estado: Completada | No concretada | Cancelada. motivo: solo en No concretada.
// puntuacion: estrellas de la última reseña que el dueño le dejó al otro (null = no le dejó)
public class ClaseHistorial
{
    public int id { get; set; }
    public string estado { get; set; } = "";
    public DateTime fecha { get; set; }
    public int idOtroUsuario { get; set; }
    public string nombreOtro { get; set; } = "";
    public string apellidoOtro { get; set; } = "";
    public string? fotoOtro { get; set; }
    public string tipoOtro { get; set; } = "";
    public string? materias { get; set; }
    public string? colegios { get; set; }
    public int? puntuacion { get; set; }
    public bool puedeDarResena { get; set; }
    public bool puedeMarcarNoSeDio { get; set; }
    public string? motivo { get; set; }
}
