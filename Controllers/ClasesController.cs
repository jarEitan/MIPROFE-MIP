using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Clases entre alumno y profesor y agenda del profesor. Se llama con fetch desde clases.js, calendario.js y miAgenda.js
public class ClasesController : Controller
{
    // Lo ocupado ese día y la agenda del profesor de la pareja (el propio si quien pide es profesor)
    public IActionResult HorariosOcupados(int idOtroUsuario, DateTime dia, int? idClaseExcluir)
    {
        int idUsuario = int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0");
        bool soyProfesor = HttpContext.Session.GetString("tipoUsuario") == "profesor";
        int idProfesor = soyProfesor ? idUsuario : idOtroUsuario;
        int idAlumno = soyProfesor ? idOtroUsuario : idUsuario;

        BD bd = new BD();
        AgendaProfesor agenda = bd.obtenerDisponibilidad(idProfesor);
        return Json(new
        {
            tieneAgenda = agenda.franjas.Count > 0,
            bloqueado = estaBloqueado(agenda, dia),
            franjas = franjasDelDia(agenda, dia),
            ocupados = bd.obtenerHorariosOcupados(idProfesor, idAlumno, dia, idClaseExcluir ?? 0)
        });
    }

    // La agenda del profesor de la pareja, día por día, para la tira de días del selector
    public IActionResult DiasConAgenda(int idOtroUsuario, DateTime desde, DateTime hasta)
    {
        if ((hasta - desde).TotalDays > 100) return BadRequest();
        int idUsuario = int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0");
        int idProfesor = HttpContext.Session.GetString("tipoUsuario") == "profesor" ? idUsuario : idOtroUsuario;

        AgendaProfesor agenda = new BD().obtenerDisponibilidad(idProfesor);
        List<object> dias = new List<object>();
        for (DateTime dia = desde; dia <= hasta; dia = dia.AddDays(1))
        {
            dias.Add(new { dia = dia.ToString("yyyy-MM-dd"), bloqueado = estaBloqueado(agenda, dia), franjas = franjasDelDia(agenda, dia) });
        }
        return Json(new { tieneAgenda = agenda.franjas.Count > 0, semana = agenda.franjas, dias = dias });
    }

    public IActionResult Calendario(DateTime desde, DateTime hasta)
    {
        int idUsuario = int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0");
        return Json(new BD().obtenerCalendarioClases(idUsuario, desde, hasta));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult EnviarPedido(int idProfesor, DateTime fecha, string? mensaje)
    {
        string? idAlumno = HttpContext.Session.GetString("idUsuario");
        if (idAlumno == null) return Unauthorized();

        ResultadoClase resultado = new BD().enviarPedidoClase(int.Parse(idAlumno), idProfesor, fecha, mensaje);
        if (resultado.codigo == 0 && !string.IsNullOrWhiteSpace(mensaje))
        {
            avisarPorChat(int.Parse(idAlumno), idProfesor, "Te pedí una clase para el " + TextoFecha.clase(fecha) + ". " + mensaje);
        }
        return Json(conInsignia(resultado));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Responder(int idClase, bool aceptar)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null) return Unauthorized();

        ResultadoClase resultado;
        if (aceptar)
        {
            resultado = new BD().aceptarPedidoClase(int.Parse(idUsuario), idClase);
        }
        else
        {
            resultado = new BD().rechazarPedidoClase(int.Parse(idUsuario), idClase);
        }
        return Json(conInsignia(resultado));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Cancelar(int idClase, string? motivo)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null) return Unauthorized();

        ResultadoClase resultado = new BD().cancelarClase(int.Parse(idUsuario), idClase, motivo);
        if (resultado.codigo == 0 && !string.IsNullOrWhiteSpace(motivo))
        {
            string accion = resultado.estado == "Pide cancelar" ? "Pedí cancelar" : "Cancelé";
            avisarPorChat(int.Parse(idUsuario), resultado.idOtro!.Value, accion + " la clase del " + TextoFecha.clase(resultado.fecha!.Value) + ". Motivo: " + motivo);
        }
        return Json(conInsignia(resultado));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Reubicar(int idClase, DateTime fecha, string? motivo)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null) return Unauthorized();

        ResultadoClase resultado = new BD().reubicarClase(int.Parse(idUsuario), idClase, fecha, motivo);
        if (resultado.codigo == 0 && !string.IsNullOrWhiteSpace(motivo))
        {
            avisarPorChat(int.Parse(idUsuario), resultado.idOtro!.Value, "Pedí cambiar la clase del " + TextoFecha.clase(resultado.fecha!.Value) + " al " + TextoFecha.clase(fecha) + ". Motivo: " + motivo);
        }
        return Json(conInsignia(resultado));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult ResponderSolicitud(int idClase, bool aceptar)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null) return Unauthorized();

        ResultadoClase resultado;
        if (aceptar)
        {
            resultado = new BD().aceptarSolicitudClase(int.Parse(idUsuario), idClase);
            if (resultado.codigo == 0 && resultado.fechaPropuesta != null)
            {
                avisarPorChat(int.Parse(idUsuario), resultado.idOtro!.Value, "El cambio de horario fue aceptado, el nuevo horario es: " + TextoFecha.clase(resultado.fechaPropuesta.Value) + ".");
            }
        }
        else
        {
            resultado = new BD().rechazarSolicitudClase(int.Parse(idUsuario), idClase);
        }
        return Json(conInsignia(resultado));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult RetirarSolicitud(int idClase)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null) return Unauthorized();

        return Json(conInsignia(new BD().retirarSolicitudClase(int.Parse(idUsuario), idClase)));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult NoSeDio(int idClase)
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        if (idUsuario == null) return Unauthorized();

        return Json(conInsignia(new BD().marcarClaseNoConcretada(int.Parse(idUsuario), idClase)));
    }

    public IActionResult MiAgenda()
    {
        int idProfesor = int.Parse(HttpContext.Session.GetString("idUsuario") ?? "0");
        return Json(new BD().obtenerDisponibilidad(idProfesor));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult GuardarAgenda(string franjas)
    {
        string? idProfesor = HttpContext.Session.GetString("idUsuario");
        if (idProfesor == null) return Unauthorized();

        return Json(new { codigo = new BD().guardarDisponibilidad(int.Parse(idProfesor), franjas) });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult BloquearDia(DateTime fecha)
    {
        string? idProfesor = HttpContext.Session.GetString("idUsuario");
        if (idProfesor == null) return Unauthorized();

        return Json(new BD().bloquearDia(int.Parse(idProfesor), fecha));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult DesbloquearDia(DateTime fecha)
    {
        string? idProfesor = HttpContext.Session.GetString("idUsuario");
        if (idProfesor == null) return Unauthorized();

        new BD().desbloquearDia(int.Parse(idProfesor), fecha);
        return Json(new { codigo = 0 });
    }

    // Después de cada acción cambian las notificaciones: se actualiza el número de la insignia
    private ResultadoClase conInsignia(ResultadoClase resultado)
    {
        resultado.cantidadNotificaciones = new BD().contarNotificaciones(int.Parse(HttpContext.Session.GetString("idUsuario")!));
        HttpContext.Session.SetString("cantidadNotificaciones", resultado.cantidadNotificaciones.ToString());
        return resultado;
    }

    // Los mensajes automáticos de las clases van al chat del otro; enviarMensaje acepta hasta 1000 caracteres
    private static void avisarPorChat(int idEmisor, int idReceptor, string texto)
    {
        new BD().enviarMensaje(idEmisor, idReceptor, texto.Length > 1000 ? texto.Substring(0, 1000) : texto);
    }

    private static bool estaBloqueado(AgendaProfesor agenda, DateTime dia)
    {
        return agenda.diasBloqueados.Any(bloqueado => bloqueado.fecha == dia.Date);
    }

    // Las franjas de ese día de la semana (lunes = 1, como en Disponibilidad). Vacías si el día está bloqueado
    private static List<FranjaSemanal> franjasDelDia(AgendaProfesor agenda, DateTime dia)
    {
        if (estaBloqueado(agenda, dia)) return new List<FranjaSemanal>();
        int numeroDeDia = ((int)dia.DayOfWeek + 6) % 7 + 1;
        return agenda.franjas.Where(franja => franja.diaSemana == numeroDeDia).ToList();
    }
}
