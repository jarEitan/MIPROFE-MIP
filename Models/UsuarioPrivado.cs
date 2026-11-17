using System.Text.Json.Serialization;

namespace MIP_MIPROFESOR.Models;

// Modelo interno solo para backend: login, registro, edición y moderación.
// No se usa para serializar respuestas del cliente.
public class UsuarioPrivado
{
    public int codigo { get; set; }
    public int id { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string mail { get; set; } = "";
    public string contrasena { get; set; } = "";
    public string tipoUsuario { get; set; } = "";
    public string fotoPerfil { get; set; } = "";
    public string fotoDni { get; set; } = "";
    public bool tieneFotoDni { get; set; }
    public string dni { get; set; } = "";
    public string direccion { get; set; } = "";
    public DateTime fechaNacimiento { get; set; }
    public DateTime fechaInscripcion { get; set; }
    public bool verificado { get; set; }
    public string descripcion { get; set; } = "";
    public int precioHora { get; set; }
    public decimal calificacion { get; set; }
    public int cantidadResenas { get; set; }
    public bool puedeEscribir { get; set; }
    public bool puedeDarResena { get; set; }
    public bool puedeInteractuar { get; set; }
    public int cantidadAmigos { get; set; }
    public string materias { get; set; } = "";
    public string niveles { get; set; } = "";
    public string modalidades { get; set; } = "";
    public string colegios { get; set; } = "";
    public string idsMaterias { get; set; } = "";
    public string idsNiveles { get; set; } = "";
    public string idsModalidades { get; set; } = "";
    public string idsEscuelas { get; set; } = "";
    public List<string> titulos { get; set; } = new List<string>();
    public List<ResenaPerfil> resenas { get; set; } = new List<ResenaPerfil>();
    public List<string> faltantes { get; set; } = new List<string>();
}
