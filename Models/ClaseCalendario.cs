namespace MIP_MIPROFESOR.Models;

// Una fila del SP obtenerCalendarioClases: una clase vista por el usuario de la sesión, en cualquier estado.
// estado: Pendiente | Rechazada | Confirmada | Pide cambio | Pide cancelar | Completada | No concretada | Cancelada.
// esperaA (Pendiente, Rechazada activa, Pide cambio / Pide cancelar): a quién le toca mover ficha, yo | otro.
// requiereAccion: me toca a mí (se pinta en rojo). fechaPropuesta: horario nuevo, solo en Pide cambio.
// motivo: solo en No concretada (por qué; sale de fechaEmision). Los puede...: qué botones corresponden.
public class ClaseCalendario
{
    public int id { get; set; }
    public string estado { get; set; } = "";
    public DateTime fecha { get; set; }
    public DateTime fechaFin { get; set; }
    public DateTime? fechaPropuesta { get; set; }
    public DateTime fechaEmision { get; set; }
    public int idOtroUsuario { get; set; }
    public string nombreOtro { get; set; } = "";
    public string apellidoOtro { get; set; } = "";
    public string? fotoOtro { get; set; }
    public string miRol { get; set; } = "";
    public string? esperaA { get; set; }
    public bool requiereAccion { get; set; }
    public bool muyCerca { get; set; }
    public bool puedeResponder { get; set; }
    public bool puedeResponderSolicitud { get; set; }
    public bool puedeRetirarSolicitud { get; set; }
    public bool puedeReubicar { get; set; }
    public bool puedeCancelar { get; set; }
    public bool puedeMarcarNoSeDio { get; set; }
    public string? motivo { get; set; }
}

// Los contadores del Panel de Control (SP obtenerContadoresClases)
public class ContadoresClases
{
    public int pendientes { get; set; }
    public int proximas { get; set; }
    public int completadas { get; set; }
}

// Fila de los SP de clases (enviarPedidoClase, responderPedidoClase, cancelarClase, reubicarClase,
// responderSolicitudClase, retirarSolicitudClase y marcarClaseNoConcretada).
// resultado: ok o el motivo por el que no se pudo (ver Info/log.md, entradas 2026-10-14 y 2026-10-20).
public class ResultadoClase
{
    public string resultado { get; set; } = "";
    public string? estado { get; set; }
    public int? idClase { get; set; }
    public int? idOtroUsuario { get; set; }
}

// Franja ocupada que devuelve obtenerHorariosOcupados. de: profesor | alumno
public class HorarioOcupado
{
    public DateTime inicio { get; set; }
    public DateTime fin { get; set; }
    public string de { get; set; } = "";
}

// Franja semanal de la agenda del profesor (tabla Disponibilidad). diaSemana: 1 = lunes ... 7 = domingo
public class FranjaSemanal
{
    public int diaSemana { get; set; }
    public TimeSpan desde { get; set; }
    public TimeSpan hasta { get; set; }
}

// Día bloqueado del profesor y cuántas clases activas tiene ese día (para avisar "avisales o cancelalas")
public class DiaBloqueado
{
    public DateTime fecha { get; set; }
    public int clasesEseDia { get; set; }
}

// La agenda completa de un profesor. Sin franjas semanales = todavía no la configuró (se comporta de 8 a 22)
public class AgendaProfesor
{
    public List<FranjaSemanal> franjas { get; set; } = new List<FranjaSemanal>();
    public List<DiaBloqueado> diasBloqueados { get; set; } = new List<DiaBloqueado>();
    public bool tieneAgenda { get { return franjas.Count > 0; } }
}

// Fila de los SP guardarDisponibilidad, bloquearDia y desbloquearDia
public class ResultadoAgenda
{
    public string resultado { get; set; } = "";
    public int clasesEseDia { get; set; }
}
