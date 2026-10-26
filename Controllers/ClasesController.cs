using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using MIP_MIPROFESOR.Models;

namespace MIP_MIPROFESOR.Controllers;

// Pedidos de clase entre alumno y profesor, calendario del Panel y agenda del profesor. Se llaman con fetch desde
// clases.js y devuelven JSON. El usuario sale SIEMPRE de la sesión, nunca del pedido.
// Reglas: Info/log.md, entradas 2026-10-14 y 2026-10-20
public class ClasesController : Controller
{
    private const string formatoFecha = "yyyy-MM-ddTHH:mm";

    private const int maximoDiasDeCalendario = 62;
    private const int maximoDiasDeAgenda = 100;
    private const int largoMaximoMotivo = 500;

    // GET /Clases/HorariosOcupados?idOtroUsuario=5&dia=2026-10-19&idClaseExcluir=3
    // Franjas ocupadas de ese día para bloquearlas en el selector, más la agenda del profesor de la pareja (el
    // propio si quien pide es profesor, el otro si es alumno): tieneAgenda, bloqueado y las franjas de ese día.
    // idOtroUsuario es el profesor (si pide un alumno) o el alumno (si reubica un profesor).
    // idClaseExcluir: la clase que se está moviendo.
    [HttpGet]
    public IActionResult HorariosOcupados(int idOtroUsuario, string dia, int? idClaseExcluir)
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        string tipoUsuario = HttpContext.Session.GetString("tipoUsuario") ?? "";
        if (idUsuario == null) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para pedir clases." });
        if (tipoUsuario != "alumno" && tipoUsuario != "profesor") return StatusCode(403, new { resultado = "sinPermiso", mensaje = "Tu cuenta no puede pedir clases." });
        if (!DateTime.TryParseExact(dia, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime desde))
            return StatusCode(400, new { resultado = "fechaInvalida", mensaje = "Elegí un día válido." });

        int idProfesor = tipoUsuario == "profesor" ? idUsuario.Value : idOtroUsuario;
        int idAlumno = tipoUsuario == "alumno" ? idUsuario.Value : idOtroUsuario;

        try
        {
            BD bd = new BD();
            List<HorarioOcupado> ocupados = bd.obtenerHorariosOcupados(idProfesor, idAlumno, desde, desde.AddDays(1), idClaseExcluir);
            AgendaProfesor agenda = bd.obtenerDisponibilidad(idProfesor);
            return Json(new
            {
                tieneAgenda = agenda.tieneAgenda,
                bloqueado = estaBloqueado(agenda, desde),
                franjas = franjasDelDia(agenda, desde),
                ocupados = ocupados.Select(horario => new
                {
                    inicio = horario.inicio.ToString(formatoFecha, CultureInfo.InvariantCulture),
                    fin = horario.fin.ToString(formatoFecha, CultureInfo.InvariantCulture),
                    de = horario.de
                })
            });
        }
        catch (Exception)
        {
            return StatusCode(500, new { resultado = "errorBD", mensaje = "No pudimos cargar los horarios. Probá de nuevo en unos minutos." });
        }
    }

    // POST /Clases/EnviarPedido → el alumno de la sesión le pide una clase al profesor
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult EnviarPedido(int idProfesor, string fecha, string? mensaje)
    {
        int? idAlumno = obtenerIdUsuarioSesion();
        if (idAlumno == null) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para pedir una clase." });
        if (HttpContext.Session.GetString("tipoUsuario") != "alumno") return StatusCode(403, new { resultado = "sinPermiso", mensaje = "Solo los alumnos pueden pedir clases." });
        if (!leerFecha(fecha, out DateTime fechaClase)) return StatusCode(400, new { resultado = "fechaInvalida", mensaje = "Elegí un día y una hora válidos." });

        if (textoMuyLargo(mensaje)) return StatusCode(400, new { resultado = "mensajeInvalido", mensaje = $"El mensaje puede tener hasta {largoMaximoMotivo} caracteres." });

        return ejecutar(() => new BD().enviarPedidoClase(idAlumno.Value, idProfesor, fechaClase, mensaje), "Pedido enviado. Te avisamos cuando el profesor responda.");
    }

    // POST /Clases/Responder → acepta o rechaza quien tiene que responder
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Responder(int idClase, bool aceptar)
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para responder." });

        return ejecutar(() => new BD().responderPedidoClase(idUsuario.Value, idClase, aceptar), aceptar ? "Clase confirmada." : "Rechazaste ese horario. La otra persona puede proponer otro o cancelar la clase.");
    }

    // POST /Clases/Cancelar
    [HttpPost]
    [ValidateAntiForgeryToken]
    // Con 24 h o más una clase confirmada se cancela; con menos queda "Pide cancelar" (resultado solicitudEnviada)
    // y la otra persona tiene que aceptar. motivo (opcional) llega al chat de la otra persona.
    public IActionResult Cancelar(int idClase, string? motivo)
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para cancelar una clase." });
        if (textoMuyLargo(motivo)) return StatusCode(400, new { resultado = "mensajeInvalido", mensaje = $"El motivo puede tener hasta {largoMaximoMotivo} caracteres." });

        return ejecutar(() => new BD().cancelarClase(idUsuario.Value, idClase, motivo), "Clase cancelada.");
    }

    // POST /Clases/Reubicar → cualquiera de los dos propone otro horario; le toca responder al otro.
    // Una clase confirmada sigue en su horario (estado "Pide cambio") hasta que el otro acepte.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Reubicar(int idClase, string fecha, string? motivo)
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para cambiar el horario." });
        if (!leerFecha(fecha, out DateTime fechaClase)) return StatusCode(400, new { resultado = "fechaInvalida", mensaje = "Elegí un día y una hora válidos." });
        if (textoMuyLargo(motivo)) return StatusCode(400, new { resultado = "mensajeInvalido", mensaje = $"El motivo puede tener hasta {largoMaximoMotivo} caracteres." });

        return ejecutar(() => new BD().reubicarClase(idUsuario.Value, idClase, fechaClase, motivo), "Pedimos confirmar el nuevo horario.");
    }

    // POST /Clases/ResponderSolicitud → acepta o rechaza el pedido de cambio de horario o de cancelación de una clase confirmada
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult ResponderSolicitud(int idClase, bool aceptar)
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para responder." });

        return ejecutar(() => new BD().responderSolicitudClase(idUsuario.Value, idClase, aceptar), aceptar ? "Aceptaste el pedido." : "No aceptaste el pedido: la clase sigue como estaba.");
    }

    // POST /Clases/RetirarSolicitud → quien pidió el cambio o la cancelación se arrepiente
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult RetirarSolicitud(int idClase)
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para continuar." });

        return ejecutar(() => new BD().retirarSolicitudClase(idUsuario.Value, idClase), "Retiraste el pedido: la clase sigue como estaba.");
    }

    // POST /Clases/NoSeDio → "No se dio": alumno o profesor marcan una clase completada de las últimas 48 h como no concretada
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult NoSeDio(int idClase)
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para continuar." });

        return ejecutar(() => new BD().marcarClaseNoConcretada(idUsuario.Value, idClase), "Marcaste que la clase no se dio.");
    }

    // GET /Clases/Calendario?desde=2026-10-01&hasta=2026-10-31 → todas las clases del usuario en esos días (máximo 62),
    // en cualquier estado. Las fechas viajan como "yyyy-MM-ddTHH:mm" sin zona horaria.
    [HttpGet]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Calendario(string desde, string hasta)
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para ver tus clases." });
        if (!leerDia(desde, out DateTime primerDia) || !leerDia(hasta, out DateTime ultimoDia) || ultimoDia < primerDia || (ultimoDia - primerDia).TotalDays > maximoDiasDeCalendario)
            return StatusCode(400, new { resultado = "fechaInvalida", mensaje = $"Pedí un rango de hasta {maximoDiasDeCalendario} días." });

        try
        {
            List<ClaseCalendario> clases = new BD().obtenerCalendarioClases(idUsuario.Value, primerDia, ultimoDia);
            return Json(new
            {
                clases = clases.Select(clase => new
                {
                    clase.id, clase.estado,
                    fecha = textoFecha(clase.fecha),
                    fechaFin = textoFecha(clase.fechaFin),
                    fechaPropuesta = clase.fechaPropuesta == null ? null : textoFecha(clase.fechaPropuesta.Value),
                    fechaEmision = textoFecha(clase.fechaEmision),
                    clase.idOtroUsuario, clase.nombreOtro, clase.apellidoOtro, clase.fotoOtro, clase.miRol,
                    clase.esperaA, clase.requiereAccion, clase.muyCerca, clase.puedeResponder, clase.puedeResponderSolicitud,
                    clase.puedeRetirarSolicitud, clase.puedeReubicar, clase.puedeCancelar, clase.puedeMarcarNoSeDio, clase.motivo
                })
            });
        }
        catch (Exception)
        {
            return StatusCode(500, new { resultado = "errorBD", mensaje = "No pudimos cargar tus clases. Probá de nuevo en unos minutos." });
        }
    }

    // GET /Clases/DiasConAgenda?idOtroUsuario=5&desde=2026-10-20&hasta=2026-11-16 → la agenda del profesor de la pareja día por día
    // (el propio si quien pide es profesor): tieneAgenda, semana (franjas fijas) y, por cada día, si está bloqueado y sus franjas.
    // Sin agenda configurada tieneAgenda es false y las franjas vienen vacías: el selector usa el horario de siempre (8 a 22).
    [HttpGet]
    public IActionResult DiasConAgenda(int idOtroUsuario, string desde, string hasta)
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        string tipoUsuario = HttpContext.Session.GetString("tipoUsuario") ?? "";
        if (idUsuario == null) return StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para pedir clases." });
        if (tipoUsuario != "alumno" && tipoUsuario != "profesor") return StatusCode(403, new { resultado = "sinPermiso", mensaje = "Tu cuenta no puede pedir clases." });
        if (!leerDia(desde, out DateTime primerDia) || !leerDia(hasta, out DateTime ultimoDia) || ultimoDia < primerDia || (ultimoDia - primerDia).TotalDays > maximoDiasDeAgenda)
            return StatusCode(400, new { resultado = "fechaInvalida", mensaje = "Elegí un rango de fechas válido." });

        int idProfesor = tipoUsuario == "profesor" ? idUsuario.Value : idOtroUsuario;
        try
        {
            AgendaProfesor agenda = new BD().obtenerDisponibilidad(idProfesor);
            List<object> dias = new List<object>();
            for (DateTime dia = primerDia; dia <= ultimoDia; dia = dia.AddDays(1))
            {
                dias.Add(new { dia = dia.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), bloqueado = estaBloqueado(agenda, dia), franjas = franjasDelDia(agenda, dia) });
            }
            return Json(new { tieneAgenda = agenda.tieneAgenda, semana = agenda.franjas.Select(franja => new { franja.diaSemana, desde = textoHora(franja.desde), hasta = textoHora(franja.hasta) }), dias = dias });
        }
        catch (Exception)
        {
            return StatusCode(500, new { resultado = "errorBD", mensaje = "No pudimos cargar la agenda. Probá de nuevo en unos minutos." });
        }
    }

    // ================= AGENDA DEL PROFESOR (solo profesores) =================

    // GET /Clases/MiAgenda → franjas semanales y días bloqueados del profesor de la sesión
    [HttpGet]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult MiAgenda()
    {
        int? idProfesor = obtenerIdProfesorSesion(out IActionResult? error);
        if (idProfesor == null) return error!;

        try
        {
            AgendaProfesor agenda = new BD().obtenerDisponibilidad(idProfesor.Value);
            return Json(new
            {
                tieneAgenda = agenda.tieneAgenda,
                franjas = agenda.franjas.Select(franja => new { franja.diaSemana, desde = textoHora(franja.desde), hasta = textoHora(franja.hasta) }),
                diasBloqueados = agenda.diasBloqueados.Select(dia => new { fecha = dia.fecha.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), dia.clasesEseDia })
            });
        }
        catch (Exception)
        {
            return StatusCode(500, new { resultado = "errorBD", mensaje = "No pudimos cargar tu agenda. Probá de nuevo en unos minutos." });
        }
    }

    // POST /Clases/GuardarAgenda → reemplaza el horario semanal. franjas: "1:14:00-21:00,1:09:00-12:00,6:09:00-13:00" (lunes = 1)
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult GuardarAgenda(string franjas)
    {
        int? idProfesor = obtenerIdProfesorSesion(out IActionResult? error);
        if (idProfesor == null) return error!;

        try
        {
            string resultado = new BD().guardarDisponibilidad(idProfesor.Value, franjas ?? "");
            if (resultado == "ok") return Json(new { resultado = resultado, mensaje = "Guardamos tu agenda." });
            return StatusCode(resultado == "usuarioNoProfesor" ? 403 : 400, new { resultado = resultado, mensaje = "Revisá las franjas: tienen que ser de al menos 60 minutos, entre las 7 y las 23, y no pueden tocarse ni superponerse en un mismo día." });
        }
        catch (Exception)
        {
            return StatusCode(500, new { resultado = "errorBD", mensaje = "No pudimos guardar tu agenda. Probá de nuevo en unos minutos." });
        }
    }

    // POST /Clases/BloquearDia → el profesor no da clases ese día. Las clases que ya existan no se cancelan: clasesEseDia avisa cuántas hay
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult BloquearDia(string fecha)
    {
        int? idProfesor = obtenerIdProfesorSesion(out IActionResult? error);
        if (idProfesor == null) return error!;
        if (!leerDia(fecha, out DateTime dia)) return StatusCode(400, new { resultado = "fechaInvalida", mensaje = "Elegí un día válido." });

        try
        {
            ResultadoAgenda resultado = new BD().bloquearDia(idProfesor.Value, dia);
            string mensaje = resultado.resultado switch
            {
                "ok" => resultado.clasesEseDia == 0 ? "Bloqueaste ese día." : $"Bloqueaste ese día. Tenés {resultado.clasesEseDia} {(resultado.clasesEseDia == 1 ? "clase" : "clases")} ese día: avisales o cancelalas.",
                "yaBloqueado" => "Ese día ya está bloqueado.",
                "fechaInvalida" => "Elegí un día de hoy en adelante y dentro del próximo año.",
                _ => "No pudimos bloquear ese día."
            };
            return StatusCode(resultado.resultado == "ok" ? 200 : resultado.resultado == "yaBloqueado" ? 409 : resultado.resultado == "usuarioNoProfesor" ? 403 : 400,
                new { resultado = resultado.resultado, clasesEseDia = resultado.clasesEseDia, mensaje = mensaje });
        }
        catch (Exception)
        {
            return StatusCode(500, new { resultado = "errorBD", mensaje = "No pudimos bloquear ese día. Probá de nuevo en unos minutos." });
        }
    }

    // POST /Clases/DesbloquearDia
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult DesbloquearDia(string fecha)
    {
        int? idProfesor = obtenerIdProfesorSesion(out IActionResult? error);
        if (idProfesor == null) return error!;
        if (!leerDia(fecha, out DateTime dia)) return StatusCode(400, new { resultado = "fechaInvalida", mensaje = "Elegí un día válido." });

        try
        {
            ResultadoAgenda resultado = new BD().desbloquearDia(idProfesor.Value, dia);
            return StatusCode(resultado.resultado == "ok" ? 200 : 403, new { resultado = resultado.resultado, mensaje = resultado.resultado == "ok" ? "Desbloqueaste ese día." : "No pudimos desbloquear ese día." });
        }
        catch (Exception)
        {
            return StatusCode(500, new { resultado = "errorBD", mensaje = "No pudimos desbloquear ese día. Probá de nuevo en unos minutos." });
        }
    }

    // Llama al SP, traduce el resultado a un código HTTP y un mensaje, y devuelve la insignia actualizada
    private IActionResult ejecutar(Func<ResultadoClase> accion, string mensajeExito)
    {
        ResultadoClase resultado;
        try
        {
            resultado = accion();
        }
        catch (Exception)
        {
            return StatusCode(500, new { resultado = "errorBD", mensaje = "No pudimos completar la acción. Probá de nuevo en unos minutos." });
        }

        bool exito = resultado.resultado == "ok" || resultado.resultado == "solicitudEnviada";
        return StatusCode(codigoHttp(resultado.resultado), new
        {
            resultado = resultado.resultado,
            estado = resultado.estado,
            idClase = resultado.idClase,
            idOtroUsuario = resultado.idOtroUsuario,
            mensaje = exito ? mensajeExito : mensajeDeError(resultado.resultado),
            cantidadNotificaciones = actualizarInsigniaDeSesion()
        });
    }

    private static int codigoHttp(string resultado)
    {
        switch (resultado)
        {
            case "ok":
            case "solicitudEnviada": return 200;
            case "claseInexistente":
            case "profesorInexistente":
            case "alumnoInexistente": return 404;
            case "noEsTuClase": return 403;
            case "fechaInvalida": return 400;
            default: return 409; // choques de horario, fuera de agenda, ya respondida, estado que no admite el cambio
        }
    }

    private static string mensajeDeError(string resultado)
    {
        switch (resultado)
        {
            case "fechaInvalida": return "Elegí un horario que empiece dentro de 1 hora o más y dentro de los próximos 90 días.";
            case "horarioOcupadoAlumno": return "Ya tenés una clase en ese horario. Elegí otro.";
            case "horarioOcupadoProfesor": return "El profesor ya tiene una clase confirmada en ese horario. Elegí otro.";
            case "horarioOcupado": return "Ya hay otra clase confirmada en ese horario, no se puede aceptar.";
            case "mensajeInvalido": return "El mensaje es demasiado largo.";
            case "profesorInexistente": return "Ese profesor ya no existe.";
            case "alumnoInexistente": return "Solo los alumnos pueden pedir clases.";
            case "claseInexistente": return "Esa clase ya no existe.";
            case "noEsTuClase": return "Esta acción no la podés hacer vos en esta clase.";
            case "yaRespondida": return "Este pedido ya fue respondido, lo retiraron o venció.";
            case "noSePuedeCancelar": return "Esta clase ya no se puede cancelar. Si te toca responder, aceptá, rechazá o proponé otro horario.";
            case "noSePuedeReubicar": return "Esta clase ya no se puede reubicar.";
            case "mismoHorario": return "Elegí un horario distinto al actual.";
            case "fueraDeAgenda": return "Ese horario está fuera de la agenda del profesor.";
            case "fueraDePlazo": return "Ya pasaron más de 48 horas desde que terminó la clase: no se puede marcar.";
            case "solicitudEnviada": return "Le pedimos a la otra persona que confirme la cancelación.";
            default: return "No pudimos completar la acción.";
        }
    }

    // Después de cada acción cambian las notificaciones: se actualiza el número de la insignia en la sesión
    private int? actualizarInsigniaDeSesion()
    {
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null) return null;

        try
        {
            int cantidad = new BD().contarNotificaciones(idUsuario.Value);
            HttpContext.Session.SetString("cantidadNotificaciones", cantidad.ToString());
            return cantidad;
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static bool leerDia(string? dia, out DateTime fecha)
    {
        return DateTime.TryParseExact(dia, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out fecha);
    }

    private static string textoFecha(DateTime fecha)
    {
        return fecha.ToString(formatoFecha, CultureInfo.InvariantCulture);
    }

    private static string textoHora(TimeSpan hora)
    {
        return hora.ToString(@"hh\:mm", CultureInfo.InvariantCulture);
    }

    private static bool textoMuyLargo(string? texto)
    {
        return texto != null && texto.Trim().Length > largoMaximoMotivo;
    }

    // Lunes = 1 ... domingo = 7 (el mismo número que guarda Disponibilidad.diaSemana)
    private static int numeroDeDia(DateTime dia)
    {
        return ((int)dia.DayOfWeek + 6) % 7 + 1;
    }

    private static bool estaBloqueado(AgendaProfesor agenda, DateTime dia)
    {
        return agenda.diasBloqueados.Any(bloqueado => bloqueado.fecha.Date == dia.Date);
    }

    // Las franjas de ese día; vacías si el día está bloqueado o no tiene horario (o si el profesor no configuró su agenda)
    private static List<object> franjasDelDia(AgendaProfesor agenda, DateTime dia)
    {
        if (estaBloqueado(agenda, dia)) return new List<object>();
        return agenda.franjas
            .Where(franja => franja.diaSemana == numeroDeDia(dia))
            .Select(franja => (object)new { desde = textoHora(franja.desde), hasta = textoHora(franja.hasta) })
            .ToList();
    }

    // Solo los profesores tienen agenda: si no hay sesión o no es profesor devuelve el error (401 / 403)
    private int? obtenerIdProfesorSesion(out IActionResult? error)
    {
        error = null;
        int? idUsuario = obtenerIdUsuarioSesion();
        if (idUsuario == null)
        {
            error = StatusCode(401, new { resultado = "sinSesion", mensaje = "Iniciá sesión para ver tu agenda." });
            return null;
        }
        if (HttpContext.Session.GetString("tipoUsuario") != "profesor")
        {
            error = StatusCode(403, new { resultado = "sinPermiso", mensaje = "Solo los profesores tienen agenda." });
            return null;
        }
        return idUsuario;
    }

    private static bool leerFecha(string? fecha, out DateTime fechaClase)
    {
        return DateTime.TryParseExact(fecha, formatoFecha, CultureInfo.InvariantCulture, DateTimeStyles.None, out fechaClase);
    }

    private int? obtenerIdUsuarioSesion()
    {
        string? idUsuario = HttpContext.Session.GetString("idUsuario");
        return int.TryParse(idUsuario, out int id) ? id : null;
    }
}
