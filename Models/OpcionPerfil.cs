namespace MIP_MIPROFESOR.Models;

// Una opción de los catálogos (materia, nivel, modalidad o colegio).
public class OpcionPerfil
{
    public int id { get; set; }
    public string nombre { get; set; } = "";
}

// Las 4 listas del SP obtenerOpcionesPerfil, para los selectores del modal.
public class OpcionesPerfil
{
    public List<OpcionPerfil> materias { get; set; } = new List<OpcionPerfil>();
    public List<OpcionPerfil> niveles { get; set; } = new List<OpcionPerfil>();
    public List<OpcionPerfil> modalidades { get; set; } = new List<OpcionPerfil>();
    public List<OpcionPerfil> escuelas { get; set; } = new List<OpcionPerfil>();
}

// codigo: 0 = ok, 1 = el mail ya lo usa otra cuenta, 2 = el DNI ya lo usa otra cuenta, 3 = datos inválidos,
// 4 = alguna foto no es una imagen válida (esto lo revisa PerfilesController, no el SP)
public class ResultadoGuardado
{
    public int codigo { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string? fotoPerfil { get; set; }
    public bool verificado { get; set; }
    public List<string> faltantes { get; set; } = new List<string>();
}
