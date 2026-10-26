namespace MIP_MIPROFESOR.Models;

public class RegistroUsuario
{
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string mail { get; set; } = "";
    public string contrasena { get; set; } = "";
    public DateTime? fechaNacimiento { get; set; }
    public string tipoUsuario { get; set; } = "";
}
