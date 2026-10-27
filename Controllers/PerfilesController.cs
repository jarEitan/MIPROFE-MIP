using System.Net;
using System.Text.RegularExpressions;
using Ganss.Xss;
using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;
using SkiaSharp;

namespace MIP_MIPROFESOR.Controllers;

// Se llama con fetch desde site.js. La página del perfil está en HomeController.Perfil
public class PerfilesController : Controller
{
    private const long pesoMaximoFoto = 5 * 1024 * 1024;
    private const int ladoFotoPerfil = 256;

    private readonly IWebHostEnvironment entorno;

    public PerfilesController(IWebHostEnvironment entorno)
    {
        this.entorno = entorno;
    }

    // Etiquetas que deja pasar el editor de texto enriquecido (Quill). Todo lo demás se borra.
    private static readonly HtmlSanitizer limpiadorDescripcion = crearLimpiadorDescripcion();

    private static HtmlSanitizer crearLimpiadorDescripcion()
    {
        var limpiador = new HtmlSanitizer();
        limpiador.AllowedTags.Clear();
        foreach (string etiqueta in new[] { "p", "br", "strong", "b", "em", "i", "u", "s", "ol", "ul", "li", "a", "blockquote", "h3" })
        {
            limpiador.AllowedTags.Add(etiqueta);
        }
        limpiador.AllowedAttributes.Clear();
        limpiador.AllowedAttributes.Add("href");
        limpiador.AllowedSchemes.Clear();
        limpiador.AllowedSchemes.Add("http");
        limpiador.AllowedSchemes.Add("https");
        limpiador.AllowedSchemes.Add("mailto");
        limpiador.AllowedCssProperties.Clear();
        limpiador.AllowedAtRules.Clear();
        limpiador.AllowDataAttributes = false;
        return limpiador;
    }

    // Limpia el HTML de "Sobre mí". Los &nbsp; (Quill los pone en vez de espacios) pasan a espacios comunes
    // para que el texto se pueda cortar en renglones. Si no queda texto, devuelve null.
    private static string? limpiarDescripcion(string? html)
    {
        string limpio = limpiadorDescripcion.Sanitize((html ?? "").Replace("&nbsp;", " ").Replace(' ', ' ')).Trim();
        string texto = WebUtility.HtmlDecode(Regex.Replace(limpio, "<[^>]+>", "")).Trim();
        return texto == "" ? null : limpio;
    }

    public IActionResult ObtenerPerfil(int id)
    {
        Usuario perfil = new BD().obtenerPerfil(id);
        // Se vuelve a limpiar al mostrar, por si quedó algo cargado a mano en la base
        perfil.descripcion = limpiarDescripcion(perfil.descripcion);
        return Json(perfil);
    }

    // Buscador del header (site.js). Solo van los campos que muestra la lista, para que la respuesta pese poco
    public IActionResult Buscar(string? texto)
    {
        List<Usuario> usuarios = new BD().buscarUsuarios((texto ?? "").Trim());
        return Json(usuarios.Select(usuario => new { usuario.id, usuario.nombre, usuario.apellido, usuario.tipoUsuario, usuario.fotoPerfil, usuario.verificado }));
    }

    public IActionResult ObtenerOpcionesPerfil()
    {
        return Json(new BD().obtenerOpcionesPerfil());
    }

    public IActionResult ObtenerDatosEdicion()
    {
        int idUsuario = int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0");
        Usuario datos = new BD().obtenerDatosEdicion(idUsuario);
        datos.descripcion = limpiarDescripcion(datos.descripcion);
        datos.tieneFotoDni = datos.fotoDni != null;
        datos.faltantes = new BD().obtenerFaltantesVerificacion(idUsuario);
        return Json(datos);
    }

    // El SP revisa los datos. Acá solo se limpia el HTML de "Sobre mí" y se revisan las fotos
    [HttpPost]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public IActionResult GuardarPerfil(Usuario edicion, IFormFile? archivoFotoPerfil, IFormFile? archivoFotoDni)
    {
        string? idSesion = HttpContext.Session.GetString("idUsuario");
        if (idSesion == null) return Unauthorized();
        int idUsuario = int.Parse(idSesion);

        BD bd = new BD();
        Usuario anteriores = bd.obtenerDatosEdicion(idUsuario);
        edicion.descripcion = limpiarDescripcion(edicion.descripcion);

        string? fotoPerfil = null;
        string? fotoDni = null;
        if (archivoFotoPerfil != null)
        {
            fotoPerfil = guardarFotoPerfil(archivoFotoPerfil, idUsuario);
            if (fotoPerfil == null) return Json(new Usuario { codigo = 4 });
        }
        if (archivoFotoDni != null)
        {
            fotoDni = guardarFotoDni(archivoFotoDni, idUsuario);
            if (fotoDni == null)
            {
                borrarArchivo(fotoPerfil);
                return Json(new Usuario { codigo = 4 });
            }
        }

        Usuario resultado = bd.guardarPerfilCompleto(idUsuario, edicion, fotoPerfil, fotoDni);
        if (resultado.codigo == 0)
        {
            // Las fotos reemplazadas ya no se usan
            if (fotoPerfil != null) borrarArchivo(anteriores.fotoPerfil);
            if (fotoDni != null) borrarArchivo(anteriores.fotoDni);

            // El header y el aviso de verificación se arman con la sesión
            SesionController.guardarSesion(HttpContext.Session, resultado);
        }
        else
        {
            borrarArchivo(fotoPerfil);
            borrarArchivo(fotoDni);
        }
        return Json(resultado);
    }

    // Recorta al centro, achica a 256x256 y guarda como WEBP en wwwroot/userData/fotos-perfil/.
    // Devuelve la URL ("/userData/fotos-perfil/...") o null si el archivo no es una imagen válida.
    private string? guardarFotoPerfil(IFormFile archivo, int idUsuario)
    {
        if (archivo.Length > pesoMaximoFoto) return null;

        using (var lectura = archivo.OpenReadStream())
        using (SKBitmap? original = SKBitmap.Decode(lectura))
        {
            if (original == null) return null;

            int lado = Math.Min(original.Width, original.Height);
            var recorte = new SKRectI((original.Width - lado) / 2, (original.Height - lado) / 2, (original.Width - lado) / 2 + lado, (original.Height - lado) / 2 + lado);

            using (var cuadrado = new SKBitmap(lado, lado))
            {
                if (!original.ExtractSubset(cuadrado, recorte)) return null;

                using (SKBitmap? achicada = cuadrado.Resize(new SKImageInfo(ladoFotoPerfil, ladoFotoPerfil), new SKSamplingOptions(SKCubicResampler.Mitchell)))
                {
                    if (achicada == null) return null;

                    using (SKImage imagen = SKImage.FromBitmap(achicada))
                    using (SKData webp = imagen.Encode(SKEncodedImageFormat.Webp, 85))
                    {
                        if (webp == null) return null;

                        string carpeta = Path.Combine(entorno.WebRootPath, "userData", "fotos-perfil");
                        Directory.CreateDirectory(carpeta);
                        string nombreArchivo = $"perfil-{idUsuario}-{DateTime.Now:yyyyMMddHHmmssfff}.webp";
                        using (var escritura = System.IO.File.Create(Path.Combine(carpeta, nombreArchivo)))
                        {
                            webp.SaveTo(escritura);
                        }
                        return $"/userData/fotos-perfil/{nombreArchivo}";
                    }
                }
            }
        }
    }

    // Guarda la foto del DNI tal cual en wwwroot/userData/dni/ (Program.cs bloquea esa carpeta: no se puede abrir desde la web).
    // Devuelve la URL ("/userData/dni/...") o null si no es una imagen JPG, PNG o WEBP.
    private string? guardarFotoDni(IFormFile archivo, int idUsuario)
    {
        if (archivo.Length > pesoMaximoFoto) return null;

        using (var memoria = new MemoryStream())
        {
            archivo.CopyTo(memoria);
            string? extension;
            memoria.Position = 0;
            using (SKCodec? codec = SKCodec.Create(memoria))
            {
                if (codec == null) return null;
                extension = codec.EncodedFormat switch
                {
                    SKEncodedImageFormat.Jpeg => ".jpg",
                    SKEncodedImageFormat.Png => ".png",
                    SKEncodedImageFormat.Webp => ".webp",
                    _ => null
                };
            }
            if (extension == null) return null;

            string carpeta = Path.Combine(entorno.WebRootPath, "userData", "dni");
            Directory.CreateDirectory(carpeta);
            string nombreArchivo = $"dni-{idUsuario}-{Guid.NewGuid():N}{extension}";
            System.IO.File.WriteAllBytes(Path.Combine(carpeta, nombreArchivo), memoria.ToArray());
            return $"/userData/dni/{nombreArchivo}";
        }
    }

    // Borra una foto guardada por el sitio (solo dentro de userData/fotos-perfil o userData/dni)
    private void borrarArchivo(string? ruta)
    {
        if (string.IsNullOrWhiteSpace(ruta)) return;

        string? rutaCompleta = null;
        if (ruta.StartsWith("/userData/fotos-perfil/")) rutaCompleta = Path.Combine(entorno.WebRootPath, "userData", "fotos-perfil", Path.GetFileName(ruta));
        if (ruta.StartsWith("/userData/dni/")) rutaCompleta = Path.Combine(entorno.WebRootPath, "userData", "dni", Path.GetFileName(ruta));
        if (rutaCompleta == null) return;

        try
        {
            if (System.IO.File.Exists(rutaCompleta)) System.IO.File.Delete(rutaCompleta);
        }
        catch (IOException)
        {
            // Si el archivo está en uso queda huérfano: no impide guardar el perfil
        }
    }
}
