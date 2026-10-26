namespace MIP_MIPROFESOR.Models;

// Reseña recibida que se muestra en el perfil (séptima tabla del SP obtenerPerfil).
// nombre, apellido y verificadoEmisor son de quien escribió la reseña.
public class ResenaPerfil
{
    public int id { get; set; }
    public int idEmisor { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public bool verificadoEmisor { get; set; }
    public int puntuacion { get; set; }
    public string? descripcion { get; set; }
}
