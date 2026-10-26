using System.Net;
using System.Text.RegularExpressions;
using Ganss.Xss;
using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;
using SkiaSharp;

namespace MIP_MIPROFESOR.Controllers;

// Funciones de perfiles que se llaman con fetch desde site.js y devuelven JSON.
// La página del perfil (navegación) está en HomeController.Perfil.
public class PerfilesController : Controller
{
    private const int largoMaximoNombre = 50;
    private const int largoMaximoMail = 150;
    private const int largoMaximoDireccion = 200;
    private const int largoMaximoTextoDescripcion = 1000;
    private const int largoMaximoHtmlDescripcion = 5000;
    private const int largoMaximoTitulo = 100;
    private const int cantidadMaximaTitulos = 10;
    private const int precioHoraMaximo = 10000000;
    private const int anioMinimoEscuela = 1950;
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

    // Limpia el HTML de "Sobre mí". Los &nbsp; (Quill los pone en vez de espacios) pasan a espacios
    // comunes para que el texto se pueda cortar en renglones.
    private static string limpiarDescripcion(string html)
    {
        return limpiadorDescripcion.Sanitize(html.Replace("&nbsp;", " ").Replace(' ', ' '));
    }

    // ================= VER PERFIL =================

    // GET /Perfiles/ObtenerPerfil/5 → perfil público de cualquier usuario (no hace falta sesión)
    [HttpGet]
    public IActionResult ObtenerPerfil(int id)
    {
        try
        {
            PerfilUsuario perfil = new BD().obtenerPerfil(id);
            // Se vuelve a limpiar al mostrar, por si quedó algo cargado a mano en la base
            if (perfil.descripcion != null) perfil.descripcion = limpiarDescripcion(perfil.descripcion);
            return Json(perfil);
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensaje = "No pudimos conectarnos con la base de datos. Probá de nuevo en unos minutos." });
        }
    }

    // ================= MODAL "EDITAR PERFIL" (solo el perfil propio) =================

    // GET /Perfiles/ObtenerOpcionesPerfil → materias, niveles, modalidades y colegios
    [HttpGet]
    public IActionResult ObtenerOpcionesPerfil()
    {
        try
        {
            return Json(new BD().obtenerOpcionesPerfil());
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensaje = "No pudimos cargar las opciones. Probá de nuevo en unos minutos." });
        }
    }

    // GET /Perfiles/ObtenerDatosEdicion → datos privados del usuario de la sesión (nunca de otro)
    [HttpGet]
    public IActionResult ObtenerDatosEdicion()
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null) return StatusCode(401, new { mensaje = "Tu sesión se cerró. Volvé a iniciar sesión." });

        try
        {
            DatosEdicion? datos = new BD().obtenerDatosEdicion(idUsuario.Value);
            if (datos == null) return StatusCode(404, new { mensaje = "No encontramos tu cuenta." });
            if (datos.descripcion != null) datos.descripcion = limpiarDescripcion(datos.descripcion);
            datos.faltantes = new BD().obtenerFaltantesVerificacion(idUsuario.Value);
            return Json(datos);
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensaje = "No pudimos cargar tus datos. Probá de nuevo en unos minutos." });
        }
    }

    // POST /Perfiles/GuardarPerfil → guarda las dos pestañas con un solo SP (guardarPerfilCompleto)
    [HttpPost]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public IActionResult GuardarPerfil(EdicionPerfil edicion, IFormFile? archivoFotoPerfil, IFormFile? archivoFotoDni)
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null) return respuestaError("sinSesion", "Tu sesión se cerró. Volvé a iniciar sesión para editar tu perfil.");

        string tipoUsuario = HttpContext.Session.GetString("tipoUsuario") ?? "";
        string? errorValidacion = normalizarYValidarEdicion(edicion, tipoUsuario);
        if (errorValidacion != null) return respuestaError("datosInvalidos", errorValidacion);

        DatosEdicion? datosAnteriores;
        try
        {
            datosAnteriores = new BD().obtenerDatosEdicion(idUsuario.Value);
        }
        catch (Exception)
        {
            return respuestaError("errorBD", "No pudimos guardar los cambios. Probá de nuevo en unos minutos.");
        }
        if (datosAnteriores == null) return respuestaError("usuarioInexistente", "No encontramos tu cuenta.");

        // Fotos: la de perfil se guarda como WEBP 256x256 (pública); la del DNI en una carpeta privada
        string? rutaFotoPerfilNueva = null;
        string? rutaFotoDniNueva = null;
        if (archivoFotoPerfil != null && archivoFotoPerfil.Length > 0)
        {
            rutaFotoPerfilNueva = guardarFotoPerfil(archivoFotoPerfil, idUsuario.Value);
            if (rutaFotoPerfilNueva == null) return respuestaError("fotoInvalida", "La foto de perfil tiene que ser una imagen JPG, PNG o WEBP de hasta 5 MB.");
        }
        if (archivoFotoDni != null && archivoFotoDni.Length > 0)
        {
            rutaFotoDniNueva = guardarFotoDni(archivoFotoDni, idUsuario.Value);
            if (rutaFotoDniNueva == null)
            {
                borrarArchivo(rutaFotoPerfilNueva);
                return respuestaError("fotoInvalida", "La foto del DNI tiene que ser una imagen JPG, PNG o WEBP de hasta 5 MB.");
            }
        }

        ResultadoGuardado resultadoGuardado;
        List<string> faltantes;
        try
        {
            resultadoGuardado = new BD().guardarPerfilCompleto(idUsuario.Value, edicion, rutaFotoPerfilNueva, rutaFotoDniNueva);
            faltantes = resultadoGuardado.resultado == "ok" ? new BD().obtenerFaltantesVerificacion(idUsuario.Value) : new List<string>();
        }
        catch (Exception)
        {
            borrarArchivo(rutaFotoPerfilNueva);
            borrarArchivo(rutaFotoDniNueva);
            return respuestaError("errorBD", "No pudimos guardar los cambios. Probá de nuevo en unos minutos.");
        }

        if (resultadoGuardado.resultado != "ok")
        {
            borrarArchivo(rutaFotoPerfilNueva);
            borrarArchivo(rutaFotoDniNueva);
            return respuestaError(resultadoGuardado.resultado, mensajeDeResultado(resultadoGuardado.resultado));
        }

        // Las fotos reemplazadas ya no se usan
        if (rutaFotoPerfilNueva != null) borrarArchivo(datosAnteriores.fotoPerfil);
        if (rutaFotoDniNueva != null) borrarArchivo(datosAnteriores.fotoDni);

        // El header y el aviso de verificación se arman con la sesión
        string fotoPerfil = rutaFotoPerfilNueva ?? datosAnteriores.fotoPerfil ?? "";
        HttpContext.Session.SetString("nombre", edicion.nombre);
        HttpContext.Session.SetString("apellido", edicion.apellido);
        HttpContext.Session.SetString("fotoPerfil", fotoPerfil);
        VerificacionCuenta.guardarEnSesion(HttpContext.Session, resultadoGuardado.verificado, faltantes);

        return Json(new
        {
            resultado = "ok",
            mensaje = resultadoGuardado.verificado ? "¡Listo! Tu cuenta está verificada." : "Cambios guardados.",
            verificado = resultadoGuardado.verificado,
            faltantes = faltantes,
            nombre = edicion.nombre,
            apellido = edicion.apellido,
            fotoPerfil = fotoPerfil
        });
    }

    // ================= VALIDACIÓN =================

    // Limpia los datos del formulario y devuelve el primer error (o null si está todo bien)
    private string? normalizarYValidarEdicion(EdicionPerfil edicion, string tipoUsuario)
    {
        edicion.nombre = (edicion.nombre ?? "").Trim();
        edicion.apellido = (edicion.apellido ?? "").Trim();
        edicion.mail = (edicion.mail ?? "").Trim().ToLower();
        edicion.dni = vaciarSiNoHayTexto(Regex.Replace(edicion.dni ?? "", @"[\s.\-]", ""));
        edicion.direccion = vaciarSiNoHayTexto((edicion.direccion ?? "").Trim());
        edicion.idsMaterias = limpiarListaDeIds(edicion.idsMaterias);
        edicion.idsNiveles = limpiarListaDeIds(edicion.idsNiveles);
        edicion.idsModalidades = limpiarListaDeIds(edicion.idsModalidades);
        // Los profesores mandan cada colegio con el año desde el que dan clase ahí ("20:2015,21:2019")
        edicion.idsEscuelas = tipoUsuario == "profesor" ? limpiarEscuelasConAnio(edicion.idsEscuelas) : limpiarListaDeIds(edicion.idsEscuelas);

        // "|" es el separador de títulos en el SP
        edicion.titulos = (edicion.titulos ?? new List<string>())
            .Select(titulo => Regex.Replace((titulo ?? "").Replace("|", " "), @"\s+", " ").Trim())
            .Where(titulo => titulo != "")
            .Distinct()
            .ToList();

        // Lo que es solo de profesores no se manda para los alumnos
        if (tipoUsuario != "profesor")
        {
            edicion.precioHora = null;
            edicion.idsMaterias = "";
            edicion.idsModalidades = "";
            edicion.titulos = new List<string>();
        }

        if (edicion.nombre == "" || edicion.apellido == "") return "Ingresá tu nombre y tu apellido.";
        if (edicion.nombre.Length > largoMaximoNombre || edicion.apellido.Length > largoMaximoNombre) return "El nombre y el apellido pueden tener hasta 50 caracteres.";
        if (edicion.mail.Length > largoMaximoMail || !Regex.IsMatch(edicion.mail, @"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")) return "Ingresá un correo electrónico válido.";
        if (edicion.dni != null && !Regex.IsMatch(edicion.dni, @"^\d{7,8}$")) return "El DNI tiene que tener 7 u 8 números.";
        if (edicion.direccion != null && edicion.direccion.Length > largoMaximoDireccion) return "La dirección puede tener hasta 200 caracteres.";
        if (edicion.fechaNacimiento != null && (edicion.fechaNacimiento > DateTime.Today || edicion.fechaNacimiento < new DateTime(1900, 1, 1))) return "Ingresá una fecha de nacimiento válida.";
        if (edicion.precioHora < 0 || edicion.precioHora > precioHoraMaximo) return "Ingresá un precio por hora válido.";
        if (edicion.titulos.Count > cantidadMaximaTitulos) return "Podés cargar hasta 10 títulos.";
        if (edicion.titulos.Any(titulo => titulo.Length > largoMaximoTitulo)) return "Cada título puede tener hasta 100 caracteres.";
        if (tipoUsuario == "alumno" && (contarIds(edicion.idsEscuelas) > 1 || contarIds(edicion.idsNiveles) > 1)) return "Como alumno podés elegir un solo colegio y un solo nivel.";
        if (tipoUsuario == "profesor" && !aniosDeEscuelasValidos(edicion.idsEscuelas)) return mensajeDeResultado("anioColegioInvalido");

        // Descripción: HTML del editor, limpio. Si no tiene texto, se guarda vacía.
        string htmlDescripcion = limpiarDescripcion(edicion.descripcion ?? "").Trim();
        string textoDescripcion = WebUtility.HtmlDecode(Regex.Replace(htmlDescripcion, "<[^>]+>", " ")).Trim();
        if (textoDescripcion.Length > largoMaximoTextoDescripcion) return "La descripción puede tener hasta 1000 caracteres.";
        if (htmlDescripcion.Length > largoMaximoHtmlDescripcion) return "La descripción tiene demasiado formato. Probá sacar algunos estilos o enlaces.";
        edicion.descripcion = textoDescripcion == "" ? null : htmlDescripcion;

        return null;
    }

    private static string? vaciarSiNoHayTexto(string texto)
    {
        return texto == "" ? null : texto;
    }

    // "37, 38,abc" → "37,38"
    private static string limpiarListaDeIds(string? ids)
    {
        return string.Join(",", (ids ?? "").Split(',')
            .Select(id => id.Trim())
            .Where(id => int.TryParse(id, out _))
            .Distinct());
    }

    // "20:2015, 21:2019,abc:3" → "20:2015,21:2019". Si un colegio vino sin año queda "21:" (y la validación lo frena)
    private static string limpiarEscuelasConAnio(string? escuelas)
    {
        return string.Join(",", (escuelas ?? "").Split(',')
            .Select(escuela => escuela.Split(':'))
            .Where(partes => int.TryParse(partes[0].Trim(), out _))
            .GroupBy(partes => int.Parse(partes[0].Trim()))
            .Select(grupo => grupo.Key + ":" + (grupo.First().Length > 1 ? grupo.First()[1].Trim() : "")));
    }

    // Cada colegio tiene que tener un año entre 1950 y el año actual
    private static bool aniosDeEscuelasValidos(string? escuelas)
    {
        if (string.IsNullOrEmpty(escuelas)) return true;
        return escuelas.Split(',').All(escuela =>
            int.TryParse(escuela.Split(':')[1], out int anio) && anio >= anioMinimoEscuela && anio <= DateTime.Today.Year);
    }

    private static int contarIds(string? ids)
    {
        return string.IsNullOrEmpty(ids) ? 0 : ids.Split(',').Length;
    }

    private static string mensajeDeResultado(string resultado)
    {
        switch (resultado)
        {
            case "mailExistente": return "Ese correo ya lo usa otra cuenta.";
            case "dniExistente": return "Ese DNI ya está registrado en otra cuenta.";
            case "opcionesInvalidas": return "Como alumno podés elegir un solo colegio y un solo nivel.";
            case "anioColegioInvalido": return "Escribí desde qué año das clase en cada colegio (solo el año, por ejemplo 2018).";
            case "usuarioInexistente": return "No encontramos tu cuenta.";
            default: return "Revisá los datos e intentá de nuevo.";
        }
    }

    // ================= FOTOS =================

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

    // ================= AUXILIARES =================

    private int? obtenerIdUsuarioSesion()
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        return int.TryParse(idUsuario, out int id) ? id : null;
    }

    private JsonResult respuestaError(string resultado, string mensaje)
    {
        return Json(new { resultado = resultado, mensaje = mensaje });
    }
}
