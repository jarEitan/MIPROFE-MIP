namespace MIP_MIPROFESOR.Models;

// Fila que devuelven los stored procedures registrarUsuario e iniciarSesion.
// resultado: ok | mailExistente | datosInvalidos | cuentaInexistente
public class ResultadoSesion
{
    public string resultado { get; set; } = "";
    public int id { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string tipoUsuario { get; set; } = "";
    public string? fotoPerfil { get; set; }
    public bool verificado { get; set; }
    public string? contrasenaHash { get; set; }
}
