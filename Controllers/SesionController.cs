using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

public class SesionController : Controller
{
    public IActionResult IniciarSesion()
    {
        if (HttpContext.Session.GetString("idUsuario") != null) return RedirectToAction("Perfil", "Home");
        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult IniciarSesion(string mail, string contrasena)
    {
        ResultadoSesion cuenta = new BDsesion().iniciarSesion(mail, contrasena);

        if (cuenta.codigo == 0)
        {
            guardarSesion(cuenta);
            return RedirectToAction("Index", "Home");
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
    public IActionResult Registrarse(RegistroUsuario registro)
    {
        // Para que nadie se registre como admin desde el formulario
        registro.tipoUsuario = (registro.tipoUsuario == "profesor" ? "profesor" : "alumno");

        ResultadoSesion cuenta = new BDsesion().registrarUsuario(registro);

        if (cuenta.codigo == 0)
        {
            guardarSesion(cuenta);
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

    private void guardarSesion(ResultadoSesion cuenta)
    {
        HttpContext.Session.SetString("idUsuario", cuenta.id.ToString());
        HttpContext.Session.SetString("nombre", cuenta.nombre);
        HttpContext.Session.SetString("apellido", cuenta.apellido);
        HttpContext.Session.SetString("tipoUsuario", cuenta.tipoUsuario);
        HttpContext.Session.SetString("fotoPerfil", cuenta.fotoPerfil ?? "");

        List<string> faltantes = new BD().obtenerFaltantesVerificacion(cuenta.id);
        VerificacionCuenta.guardarEnSesion(HttpContext.Session, cuenta.verificado, faltantes);

        int cantidadNotificaciones = new BD().contarNotificaciones(cuenta.id);
        HttpContext.Session.SetString("cantidadNotificaciones", cantidadNotificaciones.ToString());
    }
}
