using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

public class SesionController : Controller
{
    // ================= INICIAR SESIÓN =================

    public IActionResult IniciarSesion()
    {
        if (HttpContext.Session.GetString("idUsuario") != null) return RedirectToAction("Perfil", "Home");
        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult IniciarSesion(string mail, string contrasena)
    {
        mail = (mail ?? "").Trim();
        contrasena = contrasena ?? "";
        ViewBag.mail = mail;

        if (mail == "" || contrasena == "")
        {
            ViewBag.mensaje = "Ingresá tu correo y tu contraseña.";
            return View();
        }

        ResultadoSesion cuenta;
        try
        {
            cuenta = new BDsesion().iniciarSesion(mail, contrasena);
        }
        catch (Exception)
        {
            ViewBag.mensaje = "No pudimos conectarnos con la base de datos. Probá de nuevo en unos minutos.";
            return View();
        }

        if (cuenta.resultado != "ok")
        {
            ViewBag.mensaje = "El correo o la contraseña no coinciden.";
            return View();
        }

        guardarSesion(cuenta);
        return RedirectToAction("Index", "Home");
    }

    // ================= REGISTRARSE =================

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
        registro.nombre = (registro.nombre ?? "").Trim();
        registro.apellido = (registro.apellido ?? "").Trim();
        registro.mail = (registro.mail ?? "").Trim();
        registro.contrasena = registro.contrasena ?? "";
        // Solo alumno o profesor: admin nunca se asigna desde el formulario
        registro.tipoUsuario = (registro.tipoUsuario == "profesor" ? "profesor" : "alumno");
        ViewBag.registro = registro;

        if (registro.nombre == "" || registro.apellido == "")
        {
            ViewBag.mensaje = "Ingresá tu nombre y tu apellido.";
            return View();
        }
        if (registro.nombre.Length > 50 || registro.apellido.Length > 50)
        {
            ViewBag.mensaje = "El nombre y el apellido pueden tener hasta 50 caracteres.";
            return View();
        }
        if (!registro.mail.Contains('@') || registro.mail.Length < 5 || registro.mail.Length > 150)
        {
            ViewBag.mensaje = "Ingresá un correo electrónico válido.";
            return View();
        }
        if (registro.contrasena.Length < 8)
        {
            ViewBag.mensaje = "La contraseña debe tener al menos 8 caracteres.";
            return View();
        }
        if (registro.fechaNacimiento == null || registro.fechaNacimiento > DateTime.Today || registro.fechaNacimiento < new DateTime(1900, 1, 1))
        {
            ViewBag.mensaje = "Ingresá una fecha de nacimiento válida.";
            return View();
        }

        ResultadoSesion cuenta;
        try
        {
            cuenta = new BDsesion().registrarUsuario(registro);
        }
        catch (Exception)
        {
            ViewBag.mensaje = "No pudimos conectarnos con la base de datos. Probá de nuevo en unos minutos.";
            return View();
        }

        if (cuenta.resultado == "mailExistente")
        {
            ViewBag.mensaje = "Ya existe una cuenta con ese correo. Probá iniciar sesión.";
            return View();
        }
        if (cuenta.resultado != "ok")
        {
            ViewBag.mensaje = "Revisá los datos ingresados e intentá de nuevo.";
            return View();
        }

        guardarSesion(cuenta);
        return RedirectToAction("Perfil", "Home");
    }

    // ================= CIERRE DE SESIÓN =================
    // El perfil (propio y de otros usuarios) está en HomeController.Perfil

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult CerrarSesion()
    {
        HttpContext.Session.Clear();
        return RedirectToAction("Index", "Home");
    }

    // ================= SESIÓN =================
    // Claves: idUsuario, nombre, apellido, tipoUsuario, fotoPerfil (si tiene),
    // verificado ("true"/"false"), datosFaltantes (texto del aviso "Cuenta no verificada")
    // y cantidadNotificaciones (insignia del Panel de Control; se actualiza con fetch en site.js)

    private void guardarSesion(ResultadoSesion cuenta)
    {
        HttpContext.Session.SetString("idUsuario", cuenta.id.ToString());
        HttpContext.Session.SetString("nombre", cuenta.nombre);
        HttpContext.Session.SetString("apellido", cuenta.apellido);
        HttpContext.Session.SetString("tipoUsuario", cuenta.tipoUsuario);
        HttpContext.Session.SetString("fotoPerfil", cuenta.fotoPerfil ?? "");

        // Si la base no responde acá, el aviso simplemente no muestra el detalle de lo que falta
        List<string> faltantes = new List<string>();
        try
        {
            faltantes = new BD().obtenerFaltantesVerificacion(cuenta.id);
        }
        catch (Exception)
        {
        }
        VerificacionCuenta.guardarEnSesion(HttpContext.Session, cuenta.verificado, faltantes);

        // Insignia del botón Panel de Control: pedidos por responder + novedades sin ver
        int cantidadNotificaciones = 0;
        try
        {
            cantidadNotificaciones = new BD().contarNotificaciones(cuenta.id);
        }
        catch (Exception)
        {
        }
        HttpContext.Session.SetString("cantidadNotificaciones", cantidadNotificaciones.ToString());
    }
}
