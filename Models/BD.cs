using Dapper;
using Microsoft.Data.SqlClient;

namespace MIP_MIPROFESOR.Models;

// Los SP están en MIP_Estructuras/MIP-BD_02_stored_procedures.sql. Login y registro en BDsesion.cs.
public class BD
{
    private static string connectionString = @"Server=localhost;Database=MIP;Integrated Security=True;TrustServerCertificate=True;";

    public Usuario obtenerPerfil(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            using (var tablas = connection.QueryMultiple("EXEC obtenerPerfil @idUsuario", new { idUsuario = idUsuario }))
            {
                Usuario perfil = tablas.ReadFirst<Usuario>();
                if (perfil.codigo == 0)
                {
                    perfil.titulos = tablas.Read<string>().ToList();
                    perfil.resenas = tablas.Read<ResenaPerfil>().ToList();
                }
                return perfil;
            }
        }
    }

    public ResultadoLike obtenerLike(int idEmisor, int idReceptor)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoLike>("EXEC obtenerLike @idEmisor, @idReceptor", new { idEmisor = idEmisor, idReceptor = idReceptor });
        }
    }

    public ResultadoLike alternarLike(int idEmisor, int idReceptor)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoLike>("EXEC alternarLike @idEmisor, @idReceptor", new { idEmisor = idEmisor, idReceptor = idReceptor });
        }
    }

    public ResultadoAmistad obtenerAmistad(int idUsuario, int idOtroUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoAmistad>("EXEC obtenerAmistad @idUsuario, @idOtroUsuario", new { idUsuario = idUsuario, idOtroUsuario = idOtroUsuario });
        }
    }

    // Manda la solicitud, o la acepta si el otro ya te había mandado una
    public ResultadoAmistad enviarAmistad(int idUsuario, int idOtroUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoAmistad>("EXEC enviarAmistad @idUsuario, @idOtroUsuario", new { idUsuario = idUsuario, idOtroUsuario = idOtroUsuario });
        }
    }

    // Cancela la solicitud que mandaste o deja de ser amigo
    public ResultadoAmistad quitarAmistad(int idUsuario, int idOtroUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoAmistad>("EXEC quitarAmistad @idUsuario, @idOtroUsuario", new { idUsuario = idUsuario, idOtroUsuario = idOtroUsuario });
        }
    }

    public List<Usuario> obtenerAmigos(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<Usuario>("EXEC obtenerAmigos @idUsuario", new { idUsuario = idUsuario }).ToList();
        }
    }

    // Por nombre o ID exacto, de a 20 (texto vacío = los primeros 20)
    public List<Usuario> buscarUsuarios(string texto)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<Usuario>("EXEC buscarUsuarios @texto", new { texto = texto }).ToList();
        }
    }

    // codigo: 0 = ok, 1 = no tuvieron ninguna clase completada, 2 = ya le dejaste una reseña
    public int darResena(int idEmisor, int idReceptor, int puntuacion, string? descripcion)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<int>("EXEC darResena @idEmisor, @idReceptor, @puntuacion, @descripcion", new { idEmisor = idEmisor, idReceptor = idReceptor, puntuacion = puntuacion, descripcion = descripcion });
        }
    }

    public OpcionesPerfil obtenerOpcionesPerfil()
    {
        using (var connection = new SqlConnection(connectionString))
        {
            using (var tablas = connection.QueryMultiple("EXEC obtenerOpcionesPerfil"))
            {
                OpcionesPerfil opciones = new OpcionesPerfil();
                opciones.materias = tablas.Read<OpcionPerfil>().ToList();
                opciones.niveles = tablas.Read<OpcionPerfil>().ToList();
                opciones.modalidades = tablas.Read<OpcionPerfil>().ToList();
                opciones.escuelas = tablas.Read<OpcionPerfil>().ToList();
                return opciones;
            }
        }
    }

    public Usuario obtenerDatosEdicion(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            using (var tablas = connection.QueryMultiple("EXEC obtenerDatosEdicion @idUsuario", new { idUsuario = idUsuario }))
            {
                Usuario datos = tablas.ReadFirst<Usuario>();
                datos.titulos = tablas.Read<string>().ToList();
                return datos;
            }
        }
    }

    public List<string> obtenerFaltantesVerificacion(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<string>("EXEC obtenerFaltantesVerificacion @idUsuario", new { idUsuario = idUsuario }).ToList();
        }
    }

    // fotoPerfil / fotoDni en null conservan las fotos que ya tenía
    public Usuario guardarPerfilCompleto(int idUsuario, Usuario edicion, string? fotoPerfil, string? fotoDni)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<Usuario>(
                "EXEC guardarPerfilCompleto @idUsuario, @nombre, @apellido, @mail, @fechaNacimiento, @dni, @direccion, @fotoPerfil, @fotoDni, @descripcion, @precioHora, @idsMaterias, @idsNiveles, @idsModalidades, @idsEscuelas, @titulos",
                new
                {
                    idUsuario = idUsuario,
                    nombre = edicion.nombre,
                    apellido = edicion.apellido,
                    mail = edicion.mail,
                    fechaNacimiento = edicion.fechaNacimiento,
                    dni = edicion.dni,
                    direccion = edicion.direccion,
                    fotoPerfil = fotoPerfil,
                    fotoDni = fotoDni,
                    descripcion = edicion.descripcion,
                    precioHora = edicion.precioHora,
                    idsMaterias = edicion.idsMaterias,
                    idsNiveles = edicion.idsNiveles,
                    idsModalidades = edicion.idsModalidades,
                    idsEscuelas = edicion.idsEscuelas,
                    titulos = string.Join("|", edicion.titulos)
                });
        }
    }

    // Año desde el que el profesor da clase en el colegio. codigo: 0 = ok, 3 = año fuera de rango (del año de nacimiento al actual)
    public int guardarAnioEscuela(int idUsuario, int idEscuela, int anio)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<int>("EXEC guardarAnioEscuela @idUsuario, @idEscuela, @anio", new { idUsuario = idUsuario, idEscuela = idEscuela, anio = anio });
        }
    }

    // Fase 1 del catálogo: los ID de los profesores que cumplen los filtros, sin orden
    public List<int> obtenerIdsCatalogo(string? busqueda, string? materia, string? colegio, string? modalidad, string? niveles)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<int>("EXEC obtenerIdsCatalogo @busqueda, @materia, @colegio, @modalidad, @niveles", new { busqueda = busqueda, materia = materia, colegio = colegio, modalidad = modalidad, niveles = niveles }).ToList();
        }
    }

    // Fase 2: de esos ID, los datos de una sola página, ordenados por calificación
    public List<Usuario> obtenerProfesoresCatalogo(List<int> ids, int pagina, int porPagina)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<Usuario>("EXEC obtenerProfesoresCatalogo @ids, @pagina, @porPagina", new { ids = string.Join(",", ids), pagina = pagina, porPagina = porPagina }).ToList();
        }
    }

    // codigo: 0 = ok (con idClase), 1 = vos no sos alumno o el profesor no existe, 2 = tiene que empezar dentro de 1 hora
    // o más y dentro de los próximos 90 días, 3 = fuera de la agenda del profesor, 4 = ya tenés una clase en ese horario,
    // 5 = el profesor ya tiene una clase confirmada en ese horario. mensaje (opcional) va al chat del profesor
    public ResultadoClase enviarPedidoClase(int idAlumno, int idProfesor, DateTime fecha, string? mensaje)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoClase>("EXEC enviarPedidoClase @idAlumno, @idProfesor, @fecha, @mensaje", new { idAlumno = idAlumno, idProfesor = idProfesor, fecha = fecha, mensaje = mensaje });
        }
    }

    // Responde quien recibió el pedido (o el horario nuevo). codigo: 0 = ok, 1 = no te toca responder,
    // 2 = ya se respondió o venció, 3 = alguno de los dos ya tiene una clase confirmada en ese horario
    public ResultadoClase aceptarPedidoClase(int idUsuario, int idClase)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoClase>("EXEC aceptarPedidoClase @idUsuario, @idClase", new { idUsuario = idUsuario, idClase = idClase });
        }
    }

    // codigo: 0 = ok, 1 = no te toca responder, 2 = ya se respondió o venció
    public ResultadoClase rechazarPedidoClase(int idUsuario, int idClase)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoClase>("EXEC rechazarPedidoClase @idUsuario, @idClase", new { idUsuario = idUsuario, idClase = idClase });
        }
    }

    // Una confirmada que empieza en menos de 24 h queda "Pide cancelar" y el otro tiene que aceptar (mirar estado).
    // codigo: 0 = ok, 1 = no es tu clase, 2 = ya no se puede cancelar. motivo (opcional) va al chat del otro
    public ResultadoClase cancelarClase(int idUsuario, int idClase, string? motivo)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoClase>("EXEC cancelarClase @idUsuario, @idClase, @motivo", new { idUsuario = idUsuario, idClase = idClase, motivo = motivo });
        }
    }

    // Una confirmada queda "Pide cambio" y sigue en su horario hasta que el otro acepte (mirar estado).
    // codigo: 0 = ok, 1 = no es tu clase, 2 = ya no se puede reubicar, 3 = es el mismo horario, 4 = tiene que empezar
    // dentro de 1 hora o más y dentro de los próximos 90 días, 5 = fuera de la agenda del profesor,
    // 6 = el alumno ya tiene una clase en ese horario, 7 = el profesor ya tiene una clase confirmada en ese horario
    public ResultadoClase reubicarClase(int idUsuario, int idClase, DateTime nuevaFecha, string? motivo)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoClase>("EXEC reubicarClase @idUsuario, @idClase, @nuevaFecha, @motivo", new { idUsuario = idUsuario, idClase = idClase, nuevaFecha = nuevaFecha, motivo = motivo });
        }
    }

    // Acepta un pedido de cambio de horario o de cancelación. codigo: 0 = ok, 1 = no te toca responder,
    // 2 = ya se respondió o venció, 3 = alguno de los dos ya tiene una clase confirmada en el horario nuevo
    public ResultadoClase aceptarSolicitudClase(int idUsuario, int idClase)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoClase>("EXEC aceptarSolicitudClase @idUsuario, @idClase", new { idUsuario = idUsuario, idClase = idClase });
        }
    }

    // codigo: 0 = ok (la clase sigue como estaba), 1 = no te toca responder, 2 = ya se respondió o venció
    public ResultadoClase rechazarSolicitudClase(int idUsuario, int idClase)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoClase>("EXEC rechazarSolicitudClase @idUsuario, @idClase", new { idUsuario = idUsuario, idClase = idClase });
        }
    }

    // Quien pidió el cambio o la cancelación se arrepiente. codigo: 0 = ok, 1 = no lo pediste vos, 2 = ya se respondió
    public ResultadoClase retirarSolicitudClase(int idUsuario, int idClase)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoClase>("EXEC retirarSolicitudClase @idUsuario, @idClase", new { idUsuario = idUsuario, idClase = idClase });
        }
    }

    // "No se dio". codigo: 0 = ok, 1 = no es tu clase, 2 = pasaron más de 48 h desde que terminó
    public ResultadoClase marcarClaseNoConcretada(int idUsuario, int idClase)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoClase>("EXEC marcarClaseNoConcretada @idUsuario, @idClase", new { idUsuario = idUsuario, idClase = idClase });
        }
    }

    // Todas las clases del usuario entre esos dos días (incluidos), en cualquier estado
    public List<ClaseCalendario> obtenerCalendarioClases(int idUsuario, DateTime desde, DateTime hasta)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<ClaseCalendario>("EXEC obtenerCalendarioClases @idUsuario, @desde, @hasta", new { idUsuario = idUsuario, desde = desde, hasta = hasta }).ToList();
        }
    }

    public ContadoresClases obtenerContadoresClases(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ContadoresClases>("EXEC obtenerContadoresClases @idUsuario", new { idUsuario = idUsuario });
        }
    }

    // Mirando el propio se ven todas las clases; mirando el de otro, solo las completadas
    public ResultadoHistorial obtenerHistorialClases(int idUsuario, int idVisitante, int desde, int cantidad)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            using (var tablas = connection.QueryMultiple("EXEC obtenerHistorialClases @idUsuario, @idVisitante, @desde, @cantidad", new { idUsuario = idUsuario, idVisitante = idVisitante, desde = desde, cantidad = cantidad }))
            {
                ResultadoHistorial historial = tablas.ReadFirst<ResultadoHistorial>();
                if (historial.codigo == 0)
                {
                    historial.clases = tablas.Read<ClaseHistorial>().ToList();
                }
                return historial;
            }
        }
    }

    // Lo que el selector de horario tiene que bloquear ese día. idClaseExcluir: la clase que se está moviendo (0 = ninguna)
    public List<HorarioOcupado> obtenerHorariosOcupados(int idProfesor, int idAlumno, DateTime dia, int idClaseExcluir)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<HorarioOcupado>("EXEC obtenerHorariosOcupados @idProfesor, @idAlumno, @dia, @idClaseExcluir", new { idProfesor = idProfesor, idAlumno = idAlumno, dia = dia, idClaseExcluir = idClaseExcluir }).ToList();
        }
    }

    public AgendaProfesor obtenerDisponibilidad(int idProfesor)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            using (var tablas = connection.QueryMultiple("EXEC obtenerDisponibilidad @idProfesor", new { idProfesor = idProfesor }))
            {
                AgendaProfesor agenda = new AgendaProfesor();
                agenda.franjas = tablas.Read<FranjaSemanal>().ToList();
                agenda.diasBloqueados = tablas.Read<DiaBloqueado>().ToList();
                return agenda;
            }
        }
    }

    // codigo: 0 = ok, 1 = no sos profesor
    public int borrarDisponibilidadSemanal(int idProfesor)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<int>("EXEC borrarDisponibilidadSemanal @idProfesor", new { idProfesor = idProfesor });
        }
    }

    // diaSemana: lunes = 1. codigo: 0 = ok, 1 = no sos profesor, 2 = la franja no sirve (de al menos 60 minutos, entre las 7 y las 23 y sin tocarse con otra del mismo día)
    public int agregarFranja(int idProfesor, int diaSemana, TimeSpan desde, TimeSpan hasta)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<int>("EXEC agregarFranja @idProfesor, @diaSemana, @desde, @hasta", new { idProfesor = idProfesor, diaSemana = diaSemana, desde = desde, hasta = hasta });
        }
    }

    public ResultadoAgenda bloquearDia(int idProfesor, DateTime fecha)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoAgenda>("EXEC bloquearDia @idProfesor, @fecha", new { idProfesor = idProfesor, fecha = fecha });
        }
    }

    public void desbloquearDia(int idProfesor, DateTime fecha)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            connection.Execute("EXEC desbloquearDia @idProfesor, @fecha", new { idProfesor = idProfesor, fecha = fecha });
        }
    }

    public ResultadoMensaje enviarMensaje(int idEmisor, int idReceptor, string? contenido)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoMensaje>("EXEC enviarMensaje @idEmisor, @idReceptor, @contenido", new { idEmisor = idEmisor, idReceptor = idReceptor, contenido = contenido });
        }
    }

    public List<ConversacionChat> obtenerConversaciones(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<ConversacionChat>("EXEC obtenerConversaciones @idUsuario", new { idUsuario = idUsuario }).ToList();
        }
    }

    // Los mensajes que el otro te mandó pasan a Visto
    public ResultadoChat obtenerChat(int idUsuario, int idOtroUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            using (var tablas = connection.QueryMultiple("EXEC obtenerChat @idUsuario, @idOtroUsuario", new { idUsuario = idUsuario, idOtroUsuario = idOtroUsuario }))
            {
                ResultadoChat chat = tablas.ReadFirst<ResultadoChat>();
                if (chat.codigo == 0)
                {
                    chat.mensajes = tablas.Read<MensajeChat>().ToList();
                }
                return chat;
            }
        }
    }

    public List<NotificacionUsuario> obtenerNotificaciones(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<NotificacionUsuario>("EXEC obtenerNotificaciones @idUsuario", new { idUsuario = idUsuario }).ToList();
        }
    }

    // El número de la insignia: solo cuentan las notificaciones de acción
    public int contarNotificaciones(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<int>("EXEC contarNotificaciones @idUsuario", new { idUsuario = idUsuario });
        }
    }

    // codigo: 0 = ok, 1 = la solicitud ya no está pendiente
    public int aceptarAmistad(int idUsuario, int idOtroUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<int>("EXEC aceptarAmistad @idUsuario, @idOtroUsuario", new { idUsuario = idUsuario, idOtroUsuario = idOtroUsuario });
        }
    }

    // codigo: 0 = ok, 1 = la solicitud ya no está pendiente
    public int rechazarAmistad(int idUsuario, int idOtroUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<int>("EXEC rechazarAmistad @idUsuario, @idOtroUsuario", new { idUsuario = idUsuario, idOtroUsuario = idOtroUsuario });
        }
    }

    // codigo: 0 = ok, 1 = tipo inválido, 2 = mensaje vacío
    public int enviarConsulta(int idUsuario, string? tipo, string? mensaje)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<int>("EXEC enviarConsulta @idUsuario, @tipo, @mensaje", new { idUsuario = idUsuario, tipo = tipo, mensaje = mensaje });
        }
    }

    public List<ConsultaSoporte> obtenerConsultasPendientes()
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<ConsultaSoporte>("EXEC obtenerConsultasPendientes").ToList();
        }
    }

    // codigo: 0 = ok, 1 = respuesta vacía, 2 = la consulta ya fue respondida o no existe
    public int responderConsulta(int idModerador, int idConsulta, string? respuesta)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<int>("EXEC responderConsulta @idModerador, @idConsulta, @respuesta", new { idModerador = idModerador, idConsulta = idConsulta, respuesta = respuesta });
        }
    }

    public List<Usuario> obtenerUsuariosPorVerificar()
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<Usuario>("EXEC obtenerUsuariosPorVerificar").ToList();
        }
    }

    // codigo: 0 = ok, 1 = no existe o ya está verificada
    public int verificarUsuario(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<int>("EXEC verificarUsuario @idUsuario", new { idUsuario = idUsuario });
        }
    }

    // La ruta de la foto ("/userData/dni/...") o null si no la subió
    public string? obtenerFotoDni(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<string?>("EXEC obtenerFotoDni @idUsuario", new { idUsuario = idUsuario });
        }
    }
}
