namespace MIP_MIPROFESOR.Models;

// Consulta del formulario de Soporte que todavía no respondió ningún moderador
public class ConsultaSoporte
{
    public int id { get; set; }
    public int idUsuario { get; set; }
    public string nombre { get; set; } = "";
    public string correo { get; set; } = "";
    public string tipo { get; set; } = "";
    public string mensaje { get; set; } = "";
    public DateTime fecha { get; set; }
}
