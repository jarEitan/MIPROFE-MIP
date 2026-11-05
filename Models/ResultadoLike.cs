namespace MIP_MIPROFESOR.Models;

// codigo: 0 = ok, 1 = la reseña no existe o no está aprobada, 2 = es tu propia reseña
public class ResultadoLike
{
    public int codigo { get; set; }
    public int cantidadLikes { get; set; }
    public bool leGusta { get; set; }
}
