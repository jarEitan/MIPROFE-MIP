namespace MIP_MIPROFESOR.Models;

// Una persona de la lista de amigos de un perfil (SP obtenerAmigos)
public class AmigoPerfil
{
    public int id { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string? fotoPerfil { get; set; }
    public string tipoUsuario { get; set; } = "";
    public bool verificado { get; set; }
}
