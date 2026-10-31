using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

public class SesionController : Controller
{
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
