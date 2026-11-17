using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

public class SesionController : Controller
{
    public const int edadMinimaProfesor = 18;

    // Solo letras (con tildes y ñ) y números, con un espacio entre palabras. Los números sirven para diferenciar dos nombres iguales
    public static string? limpiarNombre(string? texto)
    {
        string nombre = Regex.Replace(texto ?? "", @"\s+", " ").Trim();
        return nombre.Length >= 2 && nombre.Length <= 50 && Regex.IsMatch(nombre, @"^[\p{L}0-9]+( [\p{L}0-9]+)*$") ? nombre : null;
    }

    public static bool esMayorDeEdad(DateTime? fechaNacimiento)
    {
        return fechaNacimiento != null && fechaNacimiento.Value.Date <= DateTime.Today.AddYears(-edadMinimaProfesor);
    }

    public IActionResult IniciarSesion(string? volver)
    {
        if (HttpContext.Session.GetString("idUsuario") != null) return RedirectToAction("Perfil", "Home");
        ViewBag.volver = volver;
        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult IniciarSesion(string mail, string contrasena, string? volver)
    {
        UsuarioPrivado cuenta = new BDsesion().iniciarSesion(mail, contrasena);

        if (cuenta.codigo == 0)
        {
            guardarSesion(HttpContext.Session, cuenta);
            // Solo rutas del propio sitio, para que nadie use el login para redirigir afuera
            if (Url.IsLocalUrl(volver))
            {
                return Redirect(volver);
            }
            else
            {
                return RedirectToAction("Index", "Home");
            }
        }
        else
        {
            if (cuenta.codigo == 1)
            {
                ViewBag.mensaje = "No hay ninguna cuenta con ese correo.";
            }
            else
            {
                ViewBag.mensaje = "La contraseña es incorrecta.";
            }
            ViewBag.mail = mail;
            ViewBag.volver = volver;
            return View();
        }
    }

    public IActionResult Registrarse(string? rol)
    {
        if (HttpContext.Session.GetString("idUsuario") != null) return RedirectToAction("Perfil", "Home");
        ViewBag.rol = (rol == "profesor" ? "profesor" : "alumno");
        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Registrarse(UsuarioPrivado registro)
    {
        // Para que nadie se registre como moderador (admin) desde el formulario
        registro.tipoUsuario = (registro.tipoUsuario == "profesor" ? "profesor" : "alumno");

        string? nombre = limpiarNombre(registro.nombre);
        string? apellido = limpiarNombre(registro.apellido);
        if (nombre == null || apellido == null)
        {
            ViewBag.mensaje = "El nombre y el apellido solo pueden tener letras y números (de 2 a 50 caracteres).";
            ViewBag.registro = registro;
            return View();
        }
        if (registro.tipoUsuario == "profesor" && !esMayorDeEdad(registro.fechaNacimiento))
        {
            ViewBag.mensaje = $"Para dar clases tenés que tener al menos {edadMinimaProfesor} años.";
            ViewBag.registro = registro;
            return View();
        }
        registro.nombre = nombre;
        registro.apellido = apellido;

        UsuarioPrivado cuenta = new BDsesion().registrarUsuario(registro);

        if (cuenta.codigo == 0)
        {
            guardarSesion(HttpContext.Session, cuenta);
            return RedirectToAction("Perfil", "Home");
        }
        else
        {
            if (cuenta.codigo == 1)
            {
                ViewBag.mensaje = "Ya existe una cuenta con ese correo.";
            }
            else
            {
                ViewBag.mensaje = "La fecha de nacimiento no es válida.";
            }
            ViewBag.registro = registro;
            return View();
        }
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult CerrarSesion()
    {
        HttpContext.Session.Clear();
        return RedirectToAction("Index", "Home");
    }

    // También la usa PerfilesController al guardar el perfil. Le carga a la cuenta lo que le falta para verificarse
    public static void guardarSesion(ISession sesion, Usuario cuenta)
    {
        guardarSesion(sesion, cuenta.id, cuenta.nombre, cuenta.apellido, cuenta.tipoUsuario, cuenta.fotoPerfil, cuenta.verificado);
    }

    public static void guardarSesion(ISession sesion, UsuarioPrivado cuenta)
    {
        guardarSesion(sesion, cuenta.id, cuenta.nombre, cuenta.apellido, cuenta.tipoUsuario, cuenta.fotoPerfil, cuenta.verificado);
    }

    private static void guardarSesion(ISession sesion, int idUsuario, string nombre, string apellido, string tipoUsuario, string fotoPerfil, bool verificado)
    {
        sesion.SetString("idUsuario", idUsuario.ToString());
        sesion.SetString("nombre", nombre);
        sesion.SetString("apellido", apellido);
        sesion.SetString("tipoUsuario", tipoUsuario);
        sesion.SetString("fotoPerfil", fotoPerfil ?? "");
        sesion.SetString("verificado", verificado ? "true" : "false");

        // ["el DNI", "la dirección", "tu colegio"] → "el DNI, la dirección y tu colegio"
        List<string> faltantes = new BD().obtenerFaltantesVerificacion(idUsuario);
        string datosFaltantes = string.Join(", ", faltantes);
        if (faltantes.Count > 1)
        {
            datosFaltantes = string.Join(", ", faltantes.Take(faltantes.Count - 1)) + " y " + faltantes.Last();
        }
        sesion.SetString("datosFaltantes", datosFaltantes);

        int cantidadNotificaciones = new BD().contarNotificaciones(idUsuario);
        sesion.SetString("cantidadNotificaciones", cantidadNotificaciones.ToString());
    }
}
