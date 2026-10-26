namespace MIP_MIPROFESOR.Models;

// Fila que devuelven los stored procedures obtenerAmistad y cambiarAmistad.
// estadoAmistad: ninguna | enviada | recibida | amigos (visto desde el usuario de la sesión).
// resultado y cantidadAmigos (del otro) solo en cambiarAmistad. resultado: ok | mismoUsuario | usuarioInexistente | accionInvalida
public class ResultadoAmistad
{
    public string resultado { get; set; } = "ok";
    public string estadoAmistad { get; set; } = "ninguna";
    public int cantidadAmigos { get; set; }
}
