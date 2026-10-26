namespace MIP_MIPROFESOR.Models;

// Fila que devuelven los stored procedures obtenerLike y alternarLike.
// resultado (solo en alternarLike): ok | mismoUsuario | usuarioInexistente
public class ResultadoLike
{
    public string resultado { get; set; } = "ok";
    public bool leGusta { get; set; }
    public int cantidadLikes { get; set; }
}
