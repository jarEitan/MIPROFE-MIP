namespace MIP_MIPROFESOR.Models;

// Una página del catálogo (SP obtenerCatalogo): los datos de paginación y los profesores de esa página
public class ResultadoCatalogo
{
    public int total { get; set; }
    public int pagina { get; set; }
    public int porPagina { get; set; }
    public int totalPaginas { get; set; }
    public List<Profesor> profesores { get; set; } = new List<Profesor>();
}
