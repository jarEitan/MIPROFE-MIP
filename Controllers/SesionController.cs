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
        Usuario cuenta = new BDsesion().iniciarSesion(mail, contrasena);

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
    public IActionResult Registrarse(Usuario registro)
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

        Usuario cuenta = new BDsesion().registrarUsuario(registro);

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
        sesion.SetString("idUsuario", cuenta.id.ToString());
        sesion.SetString("nombre", cuenta.nombre);
        sesion.SetString("apellido", cuenta.apellido);
        sesion.SetString("tipoUsuario", cuenta.tipoUsuario);
        sesion.SetString("fotoPerfil", cuenta.fotoPerfil ?? "");
        sesion.SetString("verificado", cuenta.verificado ? "true" : "false");

        // ["el DNI", "la dirección", "tu colegio"] → "el DNI, la dirección y tu colegio"
        cuenta.faltantes = new BD().obtenerFaltantesVerificacion(cuenta.id);
        string datosFaltantes = string.Join(", ", cuenta.faltantes);
        if (cuenta.faltantes.Count > 1)
        {
            datosFaltantes = string.Join(", ", cuenta.faltantes.Take(cuenta.faltantes.Count - 1)) + " y " + cuenta.faltantes.Last();
        }
        sesion.SetString("datosFaltantes", datosFaltantes);

        int cantidadNotificaciones = new BD().contarNotificaciones(cuenta.id);
        sesion.SetString("cantidadNotificaciones", cantidadNotificaciones.ToString());
    }
}
