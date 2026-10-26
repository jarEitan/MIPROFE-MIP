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

// Lo que devuelve el SP guardarPerfilCompleto.
// resultado: ok | usuarioInexistente | datosInvalidos | mailExistente | dniExistente | opcionesInvalidas
public class ResultadoGuardado
{
    public string resultado { get; set; } = "";
    public bool verificado { get; set; }
}
