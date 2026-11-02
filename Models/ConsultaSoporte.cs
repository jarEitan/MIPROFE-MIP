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

    // Solo los reportes (tipo reportePerfil / reporteResena): a quién se reportó y, si es una reseña, cómo es
    public int? idReportado { get; set; }
    public int? idUsuarioReportado { get; set; }
    public string? nombreReportado { get; set; }
    public string? tipoReportado { get; set; }
    public string? textoResena { get; set; }
    public int? puntuacionResena { get; set; }
    public int? idPerfilResena { get; set; }
    public bool esReporte => tipo.StartsWith("reporte");
}
