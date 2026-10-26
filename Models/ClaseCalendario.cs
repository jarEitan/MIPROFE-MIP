namespace MIP_MIPROFESOR.Models;

// Una fila del SP obtenerCalendarioClases: una clase vista por el usuario de la sesión, en cualquier estado.
// estado: Pendiente | Rechazada | Confirmada | Pide cambio | Pide cancelar | Completada | No concretada | Cancelada.
// esperaA (Pendiente, Rechazada activa, Pide cambio / Pide cancelar): a quién le toca mover ficha, yo | otro.
// requiereAccion: me toca a mí (se pinta en rojo). fechaPropuesta: horario nuevo, solo en Pide cambio.
// motivo: solo en No concretada. Los puede...: qué botones corresponden. Las fechas vienen como "2026-10-28T20:00".
public class ClaseCalendario
{
    public int id { get; set; }
    public string estado { get; set; } = "";
    public string fecha { get; set; } = "";
    public string fechaFin { get; set; } = "";
    public string? fechaPropuesta { get; set; }
    public string fechaEmision { get; set; } = "";
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

// Lo que devuelven los SP de clases. Qué significa cada codigo está arriba de cada función en BD.cs.
// estado: cómo quedó la clase (en cancelarClase y reubicarClase). cantidadNotificaciones la pone ClasesController.
public class ResultadoClase
{
    public int codigo { get; set; }
    public string? estado { get; set; }
    public int? idClase { get; set; }
    public int cantidadNotificaciones { get; set; }
}

// Franja ocupada que devuelve obtenerHorariosOcupados. de: profesor | alumno
public class HorarioOcupado
{
    public string inicio { get; set; } = "";
    public string fin { get; set; } = "";
    public string de { get; set; } = "";
}

// Franja semanal de la agenda del profesor (tabla Disponibilidad). diaSemana: 1 = lunes ... 7 = domingo. Horas: "14:00"
public class FranjaSemanal
{
    public int diaSemana { get; set; }
    public string desde { get; set; } = "";
    public string hasta { get; set; } = "";
}

// Día bloqueado del profesor ("2026-10-28") y cuántas clases activas tiene ese día
public class DiaBloqueado
{
    public string fecha { get; set; } = "";
    public int clasesEseDia { get; set; }
}

// La agenda completa de un profesor. Sin franjas semanales = todavía no la configuró (se comporta de 8 a 22)
public class AgendaProfesor
{
    public List<FranjaSemanal> franjas { get; set; } = new List<FranjaSemanal>();
    public List<DiaBloqueado> diasBloqueados { get; set; } = new List<DiaBloqueado>();
    public bool tieneAgenda => franjas.Count > 0;
}

// codigo (bloquearDia): 0 = ok, 1 = no sos profesor, 2 = el día ya pasó o falta más de un año, 3 = ya estaba bloqueado
public class ResultadoAgenda
{
    public int codigo { get; set; }
    public int clasesEseDia { get; set; }
}
