using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;

namespace MIP_MIPROFESOR.Models;

// Acceso a datos del sitio con Dapper. El inicio de sesión y el registro están en BDsesion.cs.
// Perfiles: stored procedures obtenerPerfil, obtenerOpcionesPerfil, obtenerDatosEdicion,
// obtenerFaltantesVerificacion y guardarPerfilCompleto de la base MIP.
// Catálogo: stored procedure obtenerCatalogo (en MIP-BD.sql).
// Likes: stored procedures obtenerLike y alternarLike (en MIP-BD.sql).
// Amigos: obtenerAmistad, cambiarAmistad y obtenerAmigos. Reseñas: darResena (en MIP-BD.sql).
// Clases y notificaciones: stored procedures en MIP-BD.sql (reglas y estados en Info/log.md, entradas 2026-10-14 y 2026-10-20).
// Agenda del profesor: tabla Disponibilidad y stored procedures obtenerDisponibilidad, guardarDisponibilidad, bloquearDia y desbloquearDia.
// Chat: stored procedures enviarMensaje, obtenerConversaciones y obtenerChat (en MIP-BD.sql).
public class BD
{
    private static string connectionString = @"Server=localhost;Database=MIP;Integrated Security=True;TrustServerCertificate=True;";

    // ================= PERFIL PÚBLICO =================

    // Lee las 7 tablas del SP. Si el usuario no existe (o es admin), devuelve encontrado = false.
    public PerfilUsuario obtenerPerfil(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            using (var tablas = connection.QueryMultiple("obtenerPerfil", new { idUsuario = idUsuario }, commandType: CommandType.StoredProcedure))
            {
                PerfilUsuario? perfil = tablas.ReadFirstOrDefault<PerfilUsuario>();
                if (perfil == null) return new PerfilUsuario { encontrado = false };

                perfil.encontrado = true;
                perfil.materias = tablas.Read<string>().ToList();
                perfil.niveles = tablas.Read<string>().ToList();
                perfil.modalidades = tablas.Read<string>().ToList();
                perfil.colegios = tablas.Read<string>().ToList();
                perfil.titulos = tablas.Read<string>().ToList();
                perfil.resenas = tablas.Read<ResenaPerfil>().ToList();
                return perfil;
            }
        }
    }

    // ================= LIKES =================

    // Si idEmisor (null = visitante sin sesión) le dio me gusta al perfil idReceptor, y cuántos tiene
    public ResultadoLike obtenerLike(int? idEmisor, int idReceptor)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoLike>("obtenerLike", new { idEmisor = idEmisor, idReceptor = idReceptor }, commandType: CommandType.StoredProcedure);
        }
    }

    // Da o saca el me gusta y devuelve cómo quedó. resultado: ok | mismoUsuario | usuarioInexistente
    public ResultadoLike alternarLike(int idEmisor, int idReceptor)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoLike>("alternarLike", new { idEmisor = idEmisor, idReceptor = idReceptor }, commandType: CommandType.StoredProcedure);
        }
    }

    // ================= AMIGOS =================

    // Cómo están idUsuario (null = sin sesión) e idOtroUsuario: ninguna | enviada | recibida | amigos
    public ResultadoAmistad obtenerAmistad(int? idUsuario, int idOtroUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoAmistad>("obtenerAmistad", new { idUsuario = idUsuario, idOtroUsuario = idOtroUsuario }, commandType: CommandType.StoredProcedure);
        }
    }

    // accion: enviar (manda o acepta la solicitud) | quitar (la cancela o deja de ser amigo)
    public ResultadoAmistad cambiarAmistad(int idUsuario, int idOtroUsuario, string accion)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoAmistad>("cambiarAmistad", new { idUsuario = idUsuario, idOtroUsuario = idOtroUsuario, accion = accion }, commandType: CommandType.StoredProcedure);
        }
    }

    public List<AmigoPerfil> obtenerAmigos(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<AmigoPerfil>("obtenerAmigos", new { idUsuario = idUsuario }, commandType: CommandType.StoredProcedure).ToList();
        }
    }

    // ================= RESEÑAS =================

    // resultado: ok | mismoUsuario | usuarioInexistente | puntuacionInvalida | descripcionInvalida | sinClaseCompletada | yaReseno
    public string darResena(int idEmisor, int idReceptor, int puntuacion, string? descripcion)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<string>("darResena", new { idEmisor = idEmisor, idReceptor = idReceptor, puntuacion = puntuacion, descripcion = descripcion }, commandType: CommandType.StoredProcedure);
        }
    }

    // ================= EDICIÓN DEL PERFIL PROPIO =================

    // Las 4 listas para los selectores: materias, niveles, modalidades y colegios
    public OpcionesPerfil obtenerOpcionesPerfil()
    {
        using (var connection = new SqlConnection(connectionString))
        {
            using (var tablas = connection.QueryMultiple("obtenerOpcionesPerfil", commandType: CommandType.StoredProcedure))
            {
                return new OpcionesPerfil
                {
                    materias = tablas.Read<OpcionPerfil>().ToList(),
                    niveles = tablas.Read<OpcionPerfil>().ToList(),
                    modalidades = tablas.Read<OpcionPerfil>().ToList(),
                    escuelas = tablas.Read<OpcionPerfil>().ToList()
                };
            }
        }
    }

    // Datos privados del usuario de la sesión (6 tablas). null si no existe.
    public DatosEdicion? obtenerDatosEdicion(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            using (var tablas = connection.QueryMultiple("obtenerDatosEdicion", new { idUsuario = idUsuario }, commandType: CommandType.StoredProcedure))
            {
                DatosEdicion? datos = tablas.ReadFirstOrDefault<DatosEdicion>();
                if (datos == null) return null;

                datos.tieneFotoDni = !string.IsNullOrWhiteSpace(datos.fotoDni);
                datos.idsMaterias = tablas.Read<int>().ToList();
                datos.idsNiveles = tablas.Read<int>().ToList();
                datos.idsModalidades = tablas.Read<int>().ToList();
                datos.escuelas = tablas.Read<EscuelaUsuario>().ToList();
                datos.idsEscuelas = datos.escuelas.Select(escuela => escuela.id).ToList();
                datos.titulos = tablas.Read<string>().ToList();
                return datos;
            }
        }
    }

    // Textos de lo que le falta a la cuenta para estar verificada (vacía = verificada)
    public List<string> obtenerFaltantesVerificacion(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<string>(
                "obtenerFaltantesVerificacion",
                new { idUsuario = idUsuario },
                commandType: CommandType.StoredProcedure).ToList();
        }
    }

    // Guarda las dos pestañas del modal con un solo SP y recalcula la verificación.
    // rutaFotoPerfil / rutaFotoDni en null conservan las fotos que ya tenía.
    public ResultadoGuardado guardarPerfilCompleto(int idUsuario, EdicionPerfil edicion, string? rutaFotoPerfil, string? rutaFotoDni)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirstOrDefault<ResultadoGuardado>(
                "guardarPerfilCompleto",
                new
                {
                    idUsuario = idUsuario,
                    nombre = edicion.nombre,
                    apellido = edicion.apellido,
                    mail = edicion.mail,
                    fechaNacimiento = edicion.fechaNacimiento,
                    dni = edicion.dni,
                    direccion = edicion.direccion,
                    fotoPerfil = rutaFotoPerfil,
                    fotoDni = rutaFotoDni,
                    descripcion = edicion.descripcion,
                    precioHora = edicion.precioHora,
                    idsMaterias = edicion.idsMaterias ?? "",
                    idsNiveles = edicion.idsNiveles ?? "",
                    idsModalidades = edicion.idsModalidades ?? "",
                    idsEscuelas = edicion.idsEscuelas ?? "",
                    titulos = string.Join("|", edicion.titulos)
                },
                commandType: CommandType.StoredProcedure) ?? new ResultadoGuardado { resultado = "datosInvalidos" };
        }
    }

    // ================= CATÁLOGO =================

    // Una página de profesores que cumplen los filtros (todos opcionales). niveles: nombres separados por coma.
    public ResultadoCatalogo obtenerCatalogo(string? busqueda, string? materia, string? colegio, string? modalidad, string? niveles, int pagina, int porPagina, int? idVisitante)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            using (var tablas = connection.QueryMultiple(
                "obtenerCatalogo",
                new { busqueda = busqueda, materia = materia, colegio = colegio, modalidad = modalidad, niveles = niveles, pagina = pagina, porPagina = porPagina, idVisitante = idVisitante },
                commandType: CommandType.StoredProcedure))
            {
                ResultadoCatalogo resultado = tablas.ReadFirst<ResultadoCatalogo>();
                resultado.profesores = tablas.Read<Profesor>().ToList();
                var materiasPorProfesor = tablas.Read<ItemDeProfesor>().ToLookup(fila => fila.idUsuario, fila => fila.nombre);
                var nivelesPorProfesor = tablas.Read<ItemDeProfesor>().ToLookup(fila => fila.idUsuario, fila => fila.nombre);
                var modalidadesPorProfesor = tablas.Read<ItemDeProfesor>().ToLookup(fila => fila.idUsuario, fila => fila.nombre);
                var colegiosPorProfesor = tablas.Read<ItemDeProfesor>().ToLookup(fila => fila.idUsuario, fila => fila.nombre);

                foreach (Profesor profesor in resultado.profesores)
                {
                    profesor.materias = materiasPorProfesor[profesor.id].ToList();
                    profesor.niveles = nivelesPorProfesor[profesor.id].ToList();
                    profesor.modalidades = modalidadesPorProfesor[profesor.id].ToList();
                    profesor.colegios = colegiosPorProfesor[profesor.id].ToList();
                }
                return resultado;
            }
        }
    }

    // ================= CLASES (pedidos alumno → profesor) =================
    // Reglas y estados: Info/log.md, entrada 2026-10-14. Todos los SP devuelven una fila con "resultado".

    // El alumno le pide una clase al profesor. fecha = hora de inicio. mensaje (opcional) va al chat del profesor
    public ResultadoClase enviarPedidoClase(int idAlumno, int idProfesor, DateTime fecha, string? mensaje)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoClase>("enviarPedidoClase", new { idAlumno = idAlumno, idProfesor = idProfesor, fecha = fecha, mensaje = mensaje }, commandType: CommandType.StoredProcedure);
        }
    }

    // Acepta o rechaza quien tiene que responder (el profesor a un pedido, o el alumno a un nuevo horario propuesto)
    public ResultadoClase responderPedidoClase(int idUsuario, int idClase, bool aceptar)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoClase>("responderPedidoClase", new { idUsuario = idUsuario, idClase = idClase, aceptar = aceptar }, commandType: CommandType.StoredProcedure);
        }
    }

    // Cancela una clase. Confirmada con menos de 24 h: queda Pide cancelar y el otro tiene que aceptar (solicitudEnviada).
    // motivo (opcional) va al chat de la otra persona
    public ResultadoClase cancelarClase(int idUsuario, int idClase, string? motivo)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoClase>("cancelarClase", new { idUsuario = idUsuario, idClase = idClase, motivo = motivo }, commandType: CommandType.StoredProcedure);
        }
    }

    // Propone otro horario. Pendiente / Rechazada: vuelve a Pendiente y le toca responder al otro. Confirmada: queda
    // Pide cambio (sigue en su horario hasta que el otro acepte). motivo (opcional) va al chat
    public ResultadoClase reubicarClase(int idUsuario, int idClase, DateTime nuevaFecha, string? motivo)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoClase>("reubicarClase", new { idUsuario = idUsuario, idClase = idClase, nuevaFecha = nuevaFecha, motivo = motivo }, commandType: CommandType.StoredProcedure);
        }
    }

    // Acepta o rechaza el pedido de cambio de horario o de cancelación de una clase confirmada
    public ResultadoClase responderSolicitudClase(int idUsuario, int idClase, bool aceptar)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoClase>("responderSolicitudClase", new { idUsuario = idUsuario, idClase = idClase, aceptar = aceptar }, commandType: CommandType.StoredProcedure);
        }
    }

    // Quien pidió el cambio o la cancelación lo retira: la clase vuelve a Confirmada
    public ResultadoClase retirarSolicitudClase(int idUsuario, int idClase)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoClase>("retirarSolicitudClase", new { idUsuario = idUsuario, idClase = idClase }, commandType: CommandType.StoredProcedure);
        }
    }

    // "No se dio": pasa una clase Completada de las últimas 48 h a No concretada
    public ResultadoClase marcarClaseNoConcretada(int idUsuario, int idClase)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoClase>("marcarClaseNoConcretada", new { idUsuario = idUsuario, idClase = idClase }, commandType: CommandType.StoredProcedure);
        }
    }

    // Todas las clases del usuario con fecha entre desde y hasta (días completos), en cualquier estado: el calendario del Panel
    public List<ClaseCalendario> obtenerCalendarioClases(int idUsuario, DateTime desde, DateTime hasta)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<ClaseCalendario>("obtenerCalendarioClases", new { idUsuario = idUsuario, desde = desde.Date, hasta = hasta.Date }, commandType: CommandType.StoredProcedure).ToList();
        }
    }

    // Los contadores del Panel de Control (clases activas y completadas)
    public ContadoresClases obtenerContadoresClases(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ContadoresClases>("obtenerContadoresClases", new { idUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
        }
    }

    // Historial de clases de idUsuario, de a cantidad desde la posición desde. idVisitante = quien mira (null = sin sesión):
    // si es el mismo usuario ve todo su historial; si es otro, solo las clases completadas y con tope total de 20 (lo aplica el SP).
    public ResultadoHistorial obtenerHistorialClases(int idUsuario, int? idVisitante, int desde, int cantidad)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            using (var tablas = connection.QueryMultiple("obtenerHistorialClases", new { idUsuario = idUsuario, idVisitante = idVisitante, desde = desde, cantidad = cantidad }, commandType: CommandType.StoredProcedure))
            {
                ResultadoHistorial? resultado = tablas.ReadFirstOrDefault<ResultadoHistorial>();
                if (resultado == null) return new ResultadoHistorial { encontrado = false };

                resultado.encontrado = true;
                resultado.clases = tablas.Read<ClaseHistorial>().ToList();
                return resultado;
            }
        }
    }

    // Franjas que el selector de horario tiene que bloquear (clases confirmadas del profesor y clases del alumno)
    public List<HorarioOcupado> obtenerHorariosOcupados(int idProfesor, int? idAlumno, DateTime desde, DateTime hasta, int? idClaseExcluir)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<HorarioOcupado>(
                "obtenerHorariosOcupados",
                new { idProfesor = idProfesor, idAlumno = idAlumno, desde = desde, hasta = hasta, idClaseExcluir = idClaseExcluir },
                commandType: CommandType.StoredProcedure).ToList();
        }
    }

    // ================= AGENDA DEL PROFESOR =================
    // Tabla Disponibilidad: horario semanal (franjas) y días bloqueados. Un profesor sin franjas no configuró su agenda.

    public AgendaProfesor obtenerDisponibilidad(int idProfesor)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            using (var tablas = connection.QueryMultiple("obtenerDisponibilidad", new { idProfesor = idProfesor }, commandType: CommandType.StoredProcedure))
            {
                AgendaProfesor agenda = new AgendaProfesor();
                agenda.franjas = tablas.Read<FranjaSemanal>().ToList();
                agenda.diasBloqueados = tablas.Read<DiaBloqueado>().ToList();
                return agenda;
            }
        }
    }

    // Reemplaza el horario semanal. franjas: "1:14:00-21:00,1:09:00-12:00,6:09:00-13:00" (lunes = 1)
    public string guardarDisponibilidad(int idProfesor, string franjas)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoAgenda>("guardarDisponibilidad", new { idProfesor = idProfesor, franjas = franjas }, commandType: CommandType.StoredProcedure).resultado;
        }
    }

    public ResultadoAgenda bloquearDia(int idProfesor, DateTime fecha)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoAgenda>("bloquearDia", new { idProfesor = idProfesor, fecha = fecha.Date }, commandType: CommandType.StoredProcedure);
        }
    }

    public ResultadoAgenda desbloquearDia(int idProfesor, DateTime fecha)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoAgenda>("desbloquearDia", new { idProfesor = idProfesor, fecha = fecha.Date }, commandType: CommandType.StoredProcedure);
        }
    }

    // ================= CHAT =================
    // Tabla Mensajes: cada mensaje tiene emisor, receptor y estado (No visto | Visto).

    // Guarda un mensaje (queda No visto hasta que el receptor abre el chat)
    public ResultadoMensaje enviarMensaje(int idEmisor, int idReceptor, string contenido)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<ResultadoMensaje>("enviarMensaje", new { idEmisor = idEmisor, idReceptor = idReceptor, contenido = contenido }, commandType: CommandType.StoredProcedure);
        }
    }

    // Las personas con las que el usuario habló, la del último mensaje primero
    public List<ConversacionChat> obtenerConversaciones(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<ConversacionChat>("obtenerConversaciones", new { idUsuario = idUsuario }, commandType: CommandType.StoredProcedure).ToList();
        }
    }

    // Todos los mensajes entre los dos, del más viejo al más nuevo. Los que idOtroUsuario le mandó
    // a idUsuario y estaban No visto pasan a Visto (se llama cuando el usuario abre el chat).
    public ResultadoChat obtenerChat(int idUsuario, int idOtroUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            using (var tablas = connection.QueryMultiple("obtenerChat", new { idUsuario = idUsuario, idOtroUsuario = idOtroUsuario }, commandType: CommandType.StoredProcedure))
            {
                UsuarioChat? otroUsuario = tablas.ReadFirstOrDefault<UsuarioChat>();
                List<MensajeChat> mensajes = tablas.Read<MensajeChat>().ToList();
                if (otroUsuario == null) return new ResultadoChat { encontrado = false };
                return new ResultadoChat { encontrado = true, otroUsuario = otroUsuario, mensajes = mensajes };
            }
        }
    }

    // ================= NOTIFICACIONES =================
    // Se calculan con lo que está a medio resolver (acciones: amistades, mensajes sin leer y clases que esperan una
    // respuesta) y con las novedades de los últimos 3 días (noticias), función notificacionesDeUsuario.
    // Las acciones desaparecen solas cuando se resuelven.

    // Las notificaciones del usuario, la más reciente primero
    public List<NotificacionUsuario> obtenerNotificaciones(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.Query<NotificacionUsuario>("obtenerNotificaciones", new { idUsuario = idUsuario }, commandType: CommandType.StoredProcedure).ToList();
        }
    }

    // El número de la insignia del botón Panel de Control (cuántas notificaciones de acción hay; las noticias no cuentan)
    public int contarNotificaciones(int idUsuario)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<int>("contarNotificaciones", new { idUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
        }
    }

    // Acepta o rechaza una solicitud de amistad recibida. resultado: ok | solicitudInexistente
    public string responderSolicitudAmistad(int idUsuario, int idOtroUsuario, bool aceptar)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QuerySingle<string>("responderSolicitudAmistad", new { idUsuario = idUsuario, idOtroUsuario = idOtroUsuario, aceptar = aceptar }, commandType: CommandType.StoredProcedure);
        }
    }
}

// Una fila (profesor, nombre) de las listas del SP obtenerCatalogo
public class ItemDeProfesor
{
    public int idUsuario { get; set; }
    public string nombre { get; set; } = "";
}
