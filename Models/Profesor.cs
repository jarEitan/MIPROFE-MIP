namespace MIP_MIPROFESOR.Models;

// Una tarjeta del catálogo (SP obtenerCatalogo). Las listas vienen como texto: "Física, Química"
public class Profesor
{
    public int id { get; set; }
    public string nombre { get; set; } = "";
    public string apellido { get; set; } = "";
    public string? fotoPerfil { get; set; }
    public string? descripcion { get; set; }
    public decimal calificacion { get; set; }
    public int cantidadResenas { get; set; }
    public int precioHora { get; set; }
    public bool verificado { get; set; }
    // Cuántos amigos del visitante completaron clases con este profesor (0 sin sesión)
    public int amigosRecomiendan { get; set; }
    public string? materias { get; set; }
    public string? niveles { get; set; }
    public string? modalidades { get; set; }
    public string? colegios { get; set; }

    public string nombreCompleto => nombre + " " + apellido;

    public string iniciales
    {
        get
        {
            string inicialNombre = nombre.Length > 0 ? nombre.Substring(0, 1).ToUpper() : "";
            string inicialApellido = apellido.Length > 0 ? apellido.Substring(0, 1).ToUpper() : "";
            return inicialNombre + inicialApellido == "" ? "?" : inicialNombre + inicialApellido;
        }
    }

    // La descripción se guarda como HTML (editor de texto enriquecido); en la tarjeta va como texto corto
    public string resumen
    {
        get
        {
            string texto = System.Net.WebUtility.HtmlDecode(System.Text.RegularExpressions.Regex.Replace(descripcion ?? "", "<[^>]*>", " "));
            texto = System.Text.RegularExpressions.Regex.Replace(texto, @"\s+", " ").Trim();
            return texto.Length > 140 ? texto.Substring(0, 137).TrimEnd() + "..." : texto;
        }
    }
}
