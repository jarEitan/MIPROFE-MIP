namespace MIP_MIPROFESOR.Models;

// codigo: 0 = ok. Registro: 1 = mail ya registrado, 2 = fecha inválida.
// Login: 1 = el mail no existe, 2 = contraseña incorrecta.
public class ResultadoSesion
{
    public int codigo { get; set; }
    public int id { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string tipoUsuario { get; set; } = "";
    public string? fotoPerfil { get; set; }
    public bool verificado { get; set; }
}
