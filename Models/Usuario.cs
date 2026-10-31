using System.Text.Json.Serialization;

namespace MIP_MIPROFESOR.Models;

// Una persona: sesión, registro, perfil, edición, amigos y tarjetas del catálogo. Cada SP llena solo sus columnas.
// Las listas vienen como texto: materias = "Física, Química", idsMaterias = "37,38", idsEscuelas = "20:2015,21:2019".
// codigo: registro (1 = mail ya registrado, 2 = fecha inválida), login (1 = el mail no existe, 2 = contraseña incorrecta, esto lo revisa BDsesion),
// obtenerPerfil (1 = no es de ningún alumno ni profesor), guardarPerfilCompleto (1 = mail de otra cuenta,
// 2 = DNI de otra cuenta, 3 = datos inválidos, 4 = foto inválida, esto lo revisa PerfilesController).
// El 3 también sale si el año de un colegio no sirve (guardarAnioEscuela) o si la descripción pasa de 5000 caracteres (PerfilesController)
public class Usuario
{
    public int codigo { get; set; }
    public int id { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string mail { get; set; } = "";
    [JsonIgnore]
    public string contrasena { get; set; } = "";
    public string tipoUsuario { get; set; } = "";
    public string? fotoPerfil { get; set; }
    [JsonIgnore]
    public string? fotoDni { get; set; }
    public bool tieneFotoDni { get; set; }
    public string? dni { get; set; }
    public string? direccion { get; set; }
    public DateTime? fechaNacimiento { get; set; }
    public DateTime? fechaInscripcion { get; set; }
    public bool verificado { get; set; }
    public string? descripcion { get; set; }
    public int? precioHora { get; set; }
    public decimal? calificacion { get; set; }
    public int cantidadResenas { get; set; }
    public int cantidadLikes { get; set; }
    public int cantidadAmigos { get; set; }
    public string? materias { get; set; }
    public string? niveles { get; set; }
    public string? modalidades { get; set; }
    public string? colegios { get; set; }
    public string? idsMaterias { get; set; }
    public string? idsNiveles { get; set; }
    public string? idsModalidades { get; set; }
    public string? idsEscuelas { get; set; }
    public List<string> titulos { get; set; } = new List<string>();
    public List<ResenaPerfil> resenas { get; set; } = new List<ResenaPerfil>();
    // Lo que le falta para estar verificada (SP obtenerFaltantesVerificacion)
    public List<string> faltantes { get; set; } = new List<string>();
}
