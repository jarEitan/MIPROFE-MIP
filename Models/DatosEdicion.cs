using System.Text.Json.Serialization;

namespace MIP_MIPROFESOR.Models;

// Datos privados del propio usuario para llenar el modal (SP obtenerDatosEdicion).
// La ruta de la foto del DNI nunca sale hacia el navegador: solo tieneFotoDni.
public class DatosEdicion
{
    public int id { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string mail { get; set; } = "";
    public string tipoUsuario { get; set; } = "";
    public string? dni { get; set; }
    public string? direccion { get; set; }
    public string? fotoPerfil { get; set; }
    [JsonIgnore]
    public string? fotoDni { get; set; }
    public bool tieneFotoDni { get; set; }
    public DateTime? fechaNacimiento { get; set; }
    public bool verificado { get; set; }
    public string? descripcion { get; set; }
    public int? precioHora { get; set; }
    public List<int> idsMaterias { get; set; } = new List<int>();
    public List<int> idsNiveles { get; set; } = new List<int>();
    public List<int> idsModalidades { get; set; } = new List<int>();
    public List<int> idsEscuelas { get; set; } = new List<int>();
    // Los mismos colegios con el año desde el que está ahí (solo lo cargan los profesores)
    public List<EscuelaUsuario> escuelas { get; set; } = new List<EscuelaUsuario>();
    public List<string> titulos { get; set; } = new List<string>();
    // Lo que le falta para estar verificada (SP obtenerFaltantesVerificacion)
    public List<string> faltantes { get; set; } = new List<string>();
}

// Un colegio del usuario (tabla Escuelas_Usuarios). anioDesde = año de la columna "desde" (null en los alumnos)
public class EscuelaUsuario
{
    public int id { get; set; }
    public int? anioDesde { get; set; }
}
