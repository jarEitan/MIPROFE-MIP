namespace MIP_MIPROFESOR.Models;

public class Usuario
{
    public int id { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string tipoUsuario { get; set; } = "";
    public string? fotoPerfil { get; set; }
    public bool verificado { get; set; }
}
