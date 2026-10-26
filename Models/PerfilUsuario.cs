namespace MIP_MIPROFESOR.Models;

// Perfil público que devuelve el SP obtenerPerfil (sin mail, DNI, dirección, fecha de nacimiento
// ni foto del DNI). encontrado = false cuando el ID no corresponde a ningún alumno o profesor.
public class PerfilUsuario
{
    public bool encontrado { get; set; }
    public int id { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string tipoUsuario { get; set; } = "";
    public string? fotoPerfil { get; set; }
    public bool verificado { get; set; }
    public DateTime fechaInscripcion { get; set; }
    public string? descripcion { get; set; }
    public int? precioHora { get; set; }
    public decimal? calificacion { get; set; }
    public int cantidadResenas { get; set; }
    public int cantidadLikes { get; set; }
    public int cantidadAmigos { get; set; }
    public List<string> materias { get; set; } = new List<string>();
    public List<string> niveles { get; set; } = new List<string>();
    public List<string> modalidades { get; set; } = new List<string>();
    public List<string> colegios { get; set; } = new List<string>();
    public List<string> titulos { get; set; } = new List<string>();
    public List<ResenaPerfil> resenas { get; set; } = new List<ResenaPerfil>();
}
