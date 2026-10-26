namespace MIP_MIPROFESOR.Models;

// Una página del catálogo (SP obtenerCatalogo): los datos de paginación y los profesores de esa página
public class ResultadoCatalogo
{
    public int total { get; set; }
    public int pagina { get; set; } = 1;
    public int porPagina { get; set; } = 10;
    public int totalPaginas { get; set; } = 1;
    public List<Profesor> profesores { get; set; } = new List<Profesor>();
}
