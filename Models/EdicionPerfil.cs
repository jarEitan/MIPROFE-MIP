namespace MIP_MIPROFESOR.Models;

// Lo que manda el modal "Editar perfil" (las dos pestañas juntas). Las fotos llegan aparte,
// como archivos. Las listas de IDs vienen separadas por coma ("37,38"), igual que las pide
// el SP guardarPerfilCompleto. Los profesores mandan cada colegio con el año desde el que dan
// clase ahí: idsEscuelas = "20:2015,21:2019".
public class EdicionPerfil
{
    // Modificar cuenta
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string mail { get; set; } = "";
    public DateTime? fechaNacimiento { get; set; }
    public string? dni { get; set; }
    public string? direccion { get; set; }

    // Modificar perfil
    public string? descripcion { get; set; }
    public int? precioHora { get; set; }
    public string? idsMaterias { get; set; }
    public string? idsNiveles { get; set; }
    public string? idsModalidades { get; set; }
    public string? idsEscuelas { get; set; }
    public List<string> titulos { get; set; } = new List<string>();
}
