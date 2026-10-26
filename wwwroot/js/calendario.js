// Mis clases del Panel de Control: calendario del mes + agenda del día elegido (como un sistema de turnos de consultorio)
// y las acciones sobre cada clase (aceptar, rechazar, cambiar horario, cancelar, "No se dio"). Se carga solo en el Panel,
// después de site.js y clases.js (que tiene las fechas en español, crearSelectorHorario, enviarAccionDeClase y refrescarPanel).
// Todo se pide con fetch a /Clases/Calendario; el servidor decide qué botones corresponden (puede...) y valida las reglas.
// Colores: rojo = necesita tu acción, azul = está bien (punteado si espera al otro), gris = terminó sin darse.
// Todo lo que viene de la base se inserta con textContent, nunca como HTML.

const maximoDiasPorPedido = 60;
const diasFuturosCargados = 90;
const maximoLineasPorDia = 3;
const estadosQueOcupanHorario = ["Pendiente", "Confirmada", "Pide cambio", "Pide cancelar", "Completada"];

const calendario = {
    mes: null,              // Date del primer día del mes que se ve
    diaElegido: null,       // "2026-10-22"
    clases: new Map(),      // id → clase (lo que viene de /Clases/Calendario)
    cargado: false,
    claseParaMostrar: null  // id de una clase a la que lleva una notificación y todavía no se pudo mostrar
};

let selectorDeReubicacion = null;
let claseElegida = null;

// Si el servidor contesta alguno de estos, lo que se ve en pantalla está viejo (la otra persona ya respondió, canceló, etc.)
const resultadosDePantallaVieja = ["yaRespondida", "noSePuedeCancelar", "noSePuedeReubicar", "claseInexistente", "noEsTuClase", "fueraDePlazo"];

// ----- Datos -----
// Pide las clases entre dos días, en tramos de hasta 60 días (el servidor no acepta más de 62 por pedido)
function pedirClasesEntre(desde, hasta) {
    const pedidos = [];
    for (let inicio = new Date(desde); inicio <= hasta; inicio.setDate(inicio.getDate() + maximoDiasPorPedido + 1)) {
        const fin = new Date(Math.min(hasta.getTime(), new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + maximoDiasPorPedido).getTime()));
        pedidos.push(pedirJson(`/Clases/Calendario?desde=${fechaATexto(inicio)}&hasta=${fechaATexto(fin)}`));
    }
    return Promise.all(pedidos).then(respuestas => respuestas.flatMap(respuesta => respuesta.clases));
}

function guardarClases(clases) {
    clases.forEach(clase => calendario.clases.set(clase.id, clase));
}

function inicioDeHoy() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy;
}

function primerDiaDelMes(fecha) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

// La grilla siempre tiene 6 semanas (lunes a domingo) para que no salte de alto al cambiar de mes
function rangoDeLaGrilla(mes) {
    const inicio = new Date(mes);
    inicio.setDate(1 - ((mes.getDay() + 6) % 7));
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 41);
    return { inicio, fin };
}

// Carga completa: la grilla del mes que se ve + una semana atrás y 90 días adelante (para "Requiere tu acción" y las
// novedades). Reemplaza todo lo que había. Devuelve una promesa.
function cargarCalendario() {
    if (!document.getElementById("misClases")) return Promise.resolve();
    if (!calendario.mes) calendario.mes = primerDiaDelMes(new Date());

    const grilla = rangoDeLaGrilla(calendario.mes);
    const hoy = inicioDeHoy();
    const desde = new Date(Math.min(grilla.inicio.getTime(), hoy.getTime() - 7 * 86400000));
    const hasta = new Date(Math.max(grilla.fin.getTime(), hoy.getTime() + diasFuturosCargados * 86400000));

    return pedirClasesEntre(desde, hasta)
        .then(clases => {
            calendario.clases = new Map();
            guardarClases(clases);
            calendario.cargado = true;
            if (!calendario.diaElegido) calendario.diaElegido = diaInicialDelMes(calendario.mes);
            dibujarTodo();
            if (calendario.claseParaMostrar) mostrarClaseEnCalendario(calendario.claseParaMostrar);
        })
        .catch(error => {
            console.error(error);
            const aviso = crearElemento("p", "mensajeErrorCalendario", "No pudimos cargar tus clases. Probá de nuevo en unos minutos.");
            document.getElementById("diasMes").replaceChildren(aviso);
        });
}

// Al cambiar de mes se pide solo la grilla nueva y se suma a lo que ya estaba
function cargarGrillaDelMes() {
    const grilla = rangoDeLaGrilla(calendario.mes);
    const mesPedido = calendario.mes;
    return pedirClasesEntre(grilla.inicio, grilla.fin)
        .then(clases => {
            if (mesPedido !== calendario.mes) return;
            guardarClases(clases);
            dibujarTodo();
        })
        .catch(error => console.error(error));
}

// Hoy si se ve ese mes; si hoy no tiene clases, el próximo día con clases dentro del mes
function diaInicialDelMes(mes) {
    const hoy = inicioDeHoy();
    const esMesActual = hoy.getFullYear() === mes.getFullYear() && hoy.getMonth() === mes.getMonth();
    const primero = esMesActual ? hoy : mes;
    const ultimo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
    for (let dia = new Date(primero); dia <= ultimo; dia.setDate(dia.getDate() + 1)) {
        if (clasesDelDia(fechaATexto(dia)).length > 0) return fechaATexto(dia);
    }
    return fechaATexto(primero);
}

function clasesDelDia(dia) {
    return [...calendario.clases.values()]
        .filter(clase => clase.fecha.startsWith(dia))
        .sort((una, otra) => una.fecha.localeCompare(otra.fecha) || una.id - otra.id);
}

// ----- Colores y textos de cada clase -----
// rojo = me toca a mí; gris = terminó sin darse; azul = está bien (punteado si esperamos que responda el otro)
function colorDeClase(clase) {
    if (clase.requiereAccion) return "rojo";
    if (clase.estado === "No concretada" || clase.estado === "Cancelada") return "gris";
    return "azul";
}

function lineaDeClase(clase) {
    return `${colorDeClase(clase)}${clase.esperaA === "otro" ? " punteada" : ""}`;
}

// Texto del estado (nunca solo color): [ícono, texto]
function estadoDeClase(clase) {
    const meToca = clase.esperaA === "yo";
    switch (clase.estado) {
        case "Pendiente": return meToca ? ["bi-hourglass-split", "Te toca responder"] : ["bi-hourglass-split", "Esperando respuesta"];
        case "Rechazada": return meToca ? ["bi-calendar-x", "Horario rechazado"] : ["bi-calendar-x", "Rechazaste el horario"];
        case "Confirmada": return ["bi-calendar-check", "Confirmada"];
        case "Pide cambio": return meToca ? ["bi-arrow-left-right", "Te piden cambiar el horario"] : ["bi-arrow-left-right", "Pediste cambiar el horario"];
        case "Pide cancelar": return meToca ? ["bi-x-octagon", "Te piden cancelar"] : ["bi-x-octagon", "Pediste cancelar"];
        case "Completada": return ["bi-check2-circle", "Completada"];
        case "No concretada": return ["bi-calendar-minus", "No concretada"];
        default: return ["bi-x-circle", clase.estado];
    }
}

function nombreCompleto(clase) {
    return `${clase.nombreOtro} ${clase.apellidoOtro}`;
}

function crearIcono(nombreIcono) {
    const icono = crearElemento("i", `bi ${nombreIcono}`);
    icono.setAttribute("aria-hidden", "true");
    return icono;
}

// ----- Dibujo -----
function dibujarTodo() {
    dibujarRequiereAccion();
    dibujarMes();
    dibujarAgendaDelDia();
}

function textoDelContadorDeClases(clases) {
    if (clases.length === 0) return "sin clases";
    const necesitanAccion = clases.filter(clase => clase.requiereAccion).length;
    const base = `${clases.length} ${clases.length === 1 ? "clase" : "clases"}`;
    if (necesitanAccion === 0) return base;
    return `${base}, ${necesitanAccion} ${necesitanAccion === 1 ? "necesita" : "necesitan"} tu acción`;
}

function dibujarMes() {
    document.getElementById("tituloMes").textContent = capitalizar(`${nombresDeMeses[calendario.mes.getMonth()]} ${calendario.mes.getFullYear()}`);

    const hoy = fechaATexto(new Date());
    const grilla = rangoDeLaGrilla(calendario.mes);
    const dias = [];
    for (let dia = new Date(grilla.inicio); dia <= grilla.fin; dia.setDate(dia.getDate() + 1)) {
        const texto = fechaATexto(dia);
        const clases = clasesDelDia(texto);
        const boton = crearElemento("button", "dia");
        boton.type = "button";
        boton.dataset.dia = texto;
        boton.setAttribute("aria-pressed", String(texto === calendario.diaElegido));
        boton.setAttribute("aria-label", `${textoDiaLargo(dia)}${texto === hoy ? " (hoy)" : ""}: ${textoDelContadorDeClases(clases)}`);
        if (texto === hoy) { boton.classList.add("hoy"); boton.setAttribute("aria-current", "date"); }
        if (texto < hoy) boton.classList.add("pasado");
        if (dia.getMonth() !== calendario.mes.getMonth()) boton.classList.add("otroMes");

        boton.append(crearElemento("span", "numero", String(dia.getDate())));
        const lineas = crearElemento("span", "lineas");
        clases.slice(0, maximoLineasPorDia).forEach(clase => lineas.append(crearElemento("i", `linea ${lineaDeClase(clase)}`)));
        if (clases.length > maximoLineasPorDia) lineas.append(crearElemento("span", "mas", `+${clases.length - maximoLineasPorDia}`));
        boton.append(lineas);
        dias.push(boton);
    }
    document.getElementById("diasMes").replaceChildren(...dias);
}

// "Clases que requieren tu acción": de todo el calendario, las más próximas primero. Sin ninguna no se muestra.
function dibujarRequiereAccion() {
    const seccion = document.getElementById("clasesRequierenAccion");
    const lista = document.getElementById("listaRequiereAccion");
    const pendientes = [...calendario.clases.values()]
        .filter(clase => clase.requiereAccion)
        .sort((una, otra) => una.fecha.localeCompare(otra.fecha));

    seccion.hidden = pendientes.length === 0;
    document.getElementById("cantidadRequiereAccion").textContent = pendientes.length;
    lista.replaceChildren(...pendientes.map(clase => {
        const item = crearElemento("li", "pedidoPendiente");
        marcarComoClase(item, clase);
        const texto = crearElemento("div", "textoPedido");
        texto.append(
            crearElemento("strong", "", textoFechaCorta(leerFechaLocal(clase.fecha))),
            ` · ${nombreCompleto(clase)} (${clase.miRol === "alumno" ? "Profesor" : "Alumno"})`,
            crearElemento("span", "", textoDePedido(clase))
        );
        const botones = crearElemento("div", "botonesClase");
        botonesDeAccion(clase).forEach(boton => botones.append(boton));
        botones.append(crearBotonDeClase("verDia", "contorno", "bi-calendar-event", "Ver en el calendario"));
        item.append(texto, botones);
        return item;
    }));
}

// Qué se le pide a la persona (para la lista de arriba y el detalle de la agenda)
function textoDePedido(clase) {
    switch (clase.estado) {
        case "Pendiente": return clase.miRol === "alumno" ? "Te proponen este horario." : "Te piden esta clase.";
        case "Rechazada": return "No aceptaron el horario: proponé otro o cancelá la clase.";
        case "Pide cambio": return `Piden pasarla a ${textoFechaCorta(leerFechaLocal(clase.fechaPropuesta))}.`;
        case "Pide cancelar": return "Piden cancelar la clase.";
        default: return "";
    }
}

// Los atributos que lee el manejador de clics para saber sobre qué clase se actuó
function marcarComoClase(elemento, clase) {
    elemento.dataset.clase = "";
    elemento.dataset.idClase = clase.id;
}

function crearBotonDeClase(accion, estilo, icono, texto) {
    const boton = crearElemento("button", `boton ${estilo} chico`);
    boton.type = "button";
    boton.dataset.accionClase = accion;
    boton.append(crearIcono(icono), ` ${texto}`);
    return boton;
}

// Los botones que corresponden a esta clase según los permisos que mandó el servidor
function botonesDeAccion(clase) {
    const botones = [];
    if (clase.puedeResponder) {
        botones.push(crearBotonDeClase("aceptar", "principal", "bi-check2", clase.miRol === "alumno" ? "Aceptar horario" : "Aceptar"));
        botones.push(crearBotonDeClase("rechazar", "contorno", "bi-x-lg", "Rechazar"));
    }
    if (clase.puedeResponderSolicitud) {
        botones.push(crearBotonDeClase("aceptarSolicitud", "principal", "bi-check2", clase.estado === "Pide cambio" ? "Aceptar cambio" : "Aceptar cancelación"));
        botones.push(crearBotonDeClase("rechazarSolicitud", "contorno", "bi-x-lg", "Rechazar"));
    }
    if (clase.puedeRetirarSolicitud) botones.push(crearBotonDeClase("retirar", "contorno", "bi-arrow-counterclockwise", "Retirar pedido"));
    if (clase.puedeReubicar) {
        // Proponer otro horario cuando hay algo que responder o rechazado; cambiarlo si está confirmada o esperando
        const proponeOtro = clase.puedeResponder || clase.estado === "Rechazada";
        const esLoPrincipal = clase.estado === "Rechazada" && clase.esperaA === "yo";
        botones.push(crearBotonDeClase("reubicar", esLoPrincipal ? "principal" : "contorno", "bi-arrow-repeat", proponeOtro ? "Proponer otro horario" : "Cambiar horario"));
    }
    if (clase.puedeCancelar) {
        const texto = clase.estado === "Pendiente" ? "Cancelar pedido" : clase.muyCerca ? "Pedir cancelación" : "Cancelar clase";
        botones.push(crearBotonDeClase("cancelar", "oscuro", "bi-x-circle", texto));
    }
    if (clase.puedeMarcarNoSeDio) botones.push(crearBotonDeClase("noSeDio", "contorno", "bi-calendar-minus", "No se dio"));
    return botones;
}

// Agenda del día elegido: una fila por clase, ordenada por hora, como los turnos de un consultorio
function dibujarAgendaDelDia() {
    const contenedor = document.getElementById("agendaDia");
    const fecha = leerFechaLocal(calendario.diaElegido);
    const clases = clasesDelDia(calendario.diaElegido);

    const titulo = crearElemento("h3", "", textoDiaLargo(fecha));
    titulo.id = "tituloAgendaDia";
    const encabezado = crearElemento("header");
    encabezado.append(titulo, crearElemento("span", "cantidadDelDia", textoDelContadorDeClases(clases)));
    contenedor.replaceChildren(encabezado);

    if (clases.length === 0) {
        const vacio = crearElemento("div", "card estadoVacio");
        vacio.append(crearElemento("p", "", "No tenés clases este día."));
        if (document.getElementById("misClases").dataset.rol === "Alumno") {
            const buscar = crearElemento("a", "boton principal chico", "Buscar profesor");
            buscar.href = "/Catalogo";
            vacio.append(buscar);
        }
        contenedor.append(vacio);
        return;
    }

    const lista = crearElemento("ol", "turnos");
    lista.setAttribute("aria-labelledby", "tituloAgendaDia");
    clases.forEach(clase => lista.append(crearTurno(clase, clases)));
    contenedor.append(lista);
}

function crearTurno(clase, delDia) {
    const inicio = leerFechaLocal(clase.fecha);
    const fin = leerFechaLocal(clase.fechaFin);
    const [iconoEstado, textoEstado] = estadoDeClase(clase);

    const turno = crearElemento("li", "turno");
    turno.id = `clase-${clase.id}`;
    marcarComoClase(turno, clase);

    const hora = crearElemento("div", "horaTurno");
    const etiquetaHora = crearElemento("time", "", textoHoraDe(inicio));
    etiquetaHora.dateTime = clase.fecha;
    hora.append(etiquetaHora, crearElemento("span", "", textoHoraDe(fin)));
    hora.setAttribute("aria-label", `${textoHoraDe(inicio)} a ${textoHoraDe(fin)}`);

    const tarjeta = crearElemento("article", "tarjetaTurno");
    const enlace = crearElemento("a", "", nombreCompleto(clase));
    enlace.href = `/Home/Perfil/${clase.idOtroUsuario}`;
    const nombre = crearElemento("h4");
    nombre.append(enlace);
    const rol = crearElemento("span", "rolTurno", clase.miRol === "alumno" ? "Profesor" : "Alumno");
    const etiqueta = crearElemento("span", `etiquetaEstado ${colorDeClase(clase)}`);
    etiqueta.append(crearIcono(iconoEstado), ` ${textoEstado}`);
    const encabezado = crearElemento("header");
    encabezado.append(nombre, rol, etiqueta);
    tarjeta.append(crearElemento("i", `linea ${lineaDeClase(clase)}`), encabezado);

    const detalles = crearElemento("ul", "detalleTurno");
    const pedido = textoDePedido(clase);
    if (pedido) detalles.append(crearDetalle("bi-info-circle", pedido));
    if (clase.estado === "Pendiente" && clase.esperaA === "otro") detalles.append(crearDetalle("bi-hourglass-split", `Esperando que responda ${clase.nombreOtro}.`));
    if (clase.estado === "Rechazada" && clase.esperaA === "otro") detalles.append(crearDetalle("bi-info-circle", `Rechazaste este horario. Esperando que ${clase.nombreOtro} proponga otro o cancele.`));
    if (clase.estado === "Pide cambio" && clase.esperaA === "otro") detalles.append(crearDetalle("bi-arrow-left-right", `La clase sigue en su horario hasta que ${clase.nombreOtro} acepte pasarla a ${textoFechaCorta(leerFechaLocal(clase.fechaPropuesta))}.`));
    if (clase.estado === "Pide cancelar" && clase.esperaA === "otro") detalles.append(crearDetalle("bi-x-octagon", `La clase sigue en pie hasta que ${clase.nombreOtro} acepte cancelarla.`));
    if (clase.motivo) detalles.append(crearDetalle("bi-info-circle", clase.motivo));
    const choque = choqueConOtraClase(clase, delDia);
    if (choque) detalles.append(crearDetalle("bi-exclamation-triangle", `Se superpone con la de las ${textoHoraDe(leerFechaLocal(choque.fecha))}.`));
    if (detalles.children.length > 0) tarjeta.append(detalles);

    const pie = crearElemento("footer", "botonesClase");
    botonesDeAccion(clase).forEach(boton => pie.append(boton));
    pie.append(crearBotonDeClase("chat", "contorno", "bi-chat-dots", "Ir al chat"));
    tarjeta.append(pie);

    turno.append(hora, tarjeta);
    return turno;
}

function crearDetalle(icono, texto) {
    const item = crearElemento("li");
    item.append(crearIcono(icono), ` ${texto}`);
    return item;
}

// Otra clase del mismo día que ocupa el mismo horario (un profesor puede tener dos pedidos pendientes a la misma hora)
function choqueConOtraClase(clase, delDia) {
    if (!estadosQueOcupanHorario.includes(clase.estado)) return null;
    return delDia.find(otra => otra.id !== clase.id
        && estadosQueOcupanHorario.includes(otra.estado)
        && otra.fecha < clase.fechaFin && clase.fecha < otra.fechaFin) || null;
}

// ----- Navegación -----
function elegirDia(dia) {
    calendario.diaElegido = dia;
    const fecha = leerFechaLocal(dia);
    // Un día de la semana de otro mes lleva a ese mes
    if (fecha.getMonth() !== calendario.mes.getMonth() || fecha.getFullYear() !== calendario.mes.getFullYear()) {
        calendario.mes = primerDiaDelMes(fecha);
        dibujarTodo();
        cargarGrillaDelMes();
        return;
    }
    dibujarMes();
    dibujarAgendaDelDia();
}

function cambiarDeMes(desplazamiento) {
    calendario.mes = new Date(calendario.mes.getFullYear(), calendario.mes.getMonth() + desplazamiento, 1);
    const diaProvisorio = diaInicialDelMes(calendario.mes);
    calendario.diaElegido = diaProvisorio;
    dibujarTodo();
    // Con las clases del mes ya cargadas se elige el primer día con clases (si la persona no eligió otro mientras tanto)
    cargarGrillaDelMes().then(() => {
        if (calendario.diaElegido !== diaProvisorio) return;
        calendario.diaElegido = diaInicialDelMes(calendario.mes);
        dibujarMes();
        dibujarAgendaDelDia();
    });
}

function irAHoy() {
    const hoy = new Date();
    calendario.mes = primerDiaDelMes(hoy);
    calendario.diaElegido = diaInicialDelMes(calendario.mes);
    dibujarTodo();
    cargarGrillaDelMes();
}

// Lo llaman las notificaciones (?tab=clases&clase=12) y el resaltado tras una acción: abre el día de esa clase y la
// resalta. Devuelve true si la clase está en el calendario; si todavía no cargó, la deja pendiente.
function mostrarClaseEnCalendario(idClase) {
    const clase = calendario.clases.get(Number(idClase));
    if (!clase) {
        calendario.claseParaMostrar = calendario.cargado ? null : idClase;
        return false;
    }
    calendario.claseParaMostrar = null;
    const dia = clase.fecha.slice(0, 10);
    const fecha = leerFechaLocal(dia);
    calendario.diaElegido = dia;
    if (fecha.getMonth() !== calendario.mes.getMonth() || fecha.getFullYear() !== calendario.mes.getFullYear()) {
        calendario.mes = primerDiaDelMes(fecha);
        dibujarTodo();
        cargarGrillaDelMes();
    } else {
        dibujarMes();
        dibujarAgendaDelDia();
    }

    const destino = document.getElementById(`clase-${clase.id}`);
    if (destino) {
        setTimeout(() => {
            destino.scrollIntoView({ behavior: "smooth", block: "center" });
            resaltarElemento(destino);
        }, 150);
    }
    return true;
}

// ----- Acciones sobre una clase -----
function inicializarAccionesDelCalendario() {
    const contenedor = document.getElementById("misClases");

    document.getElementById("botonMesAnterior").addEventListener("click", () => cambiarDeMes(-1));
    document.getElementById("botonMesSiguiente").addEventListener("click", () => cambiarDeMes(1));
    document.getElementById("botonHoy").addEventListener("click", irAHoy);

    contenedor.addEventListener("click", evento => {
        const dia = evento.target.closest("button.dia");
        if (dia) {
            elegirDia(dia.dataset.dia);
            document.querySelector(`#diasMes button.dia[data-dia='${dia.dataset.dia}']`)?.focus();
            return;
        }

        const boton = evento.target.closest("[data-accion-clase]");
        if (!boton) return;
        const clase = calendario.clases.get(Number(boton.closest("[data-clase]").dataset.idClase));
        if (!clase) return;
        claseElegida = clase;

        switch (boton.dataset.accionClase) {
            case "aceptar": responderClase(boton, "/Clases/Responder", true); break;
            case "rechazar": responderClase(boton, "/Clases/Responder", false); break;
            case "aceptarSolicitud": responderClase(boton, "/Clases/ResponderSolicitud", true); break;
            case "rechazarSolicitud": responderClase(boton, "/Clases/ResponderSolicitud", false); break;
            case "retirar": responderClase(boton, "/Clases/RetirarSolicitud"); break;
            case "cancelar": abrirCancelacionDeClase(); break;
            case "reubicar": abrirReubicacionDeClase(); break;
            case "noSeDio": abrirNoSeDio(clase.id, nombreCompleto(clase), textoFechaCorta(leerFechaLocal(clase.fecha))); break;
            case "chat": abrirPestanaYClase(new URLSearchParams({ tab: "chat", chat: clase.idOtroUsuario })); break;
            case "verDia": elegirDia(clase.fecha.slice(0, 10)); document.getElementById("agendaDia").scrollIntoView({ behavior: "smooth", block: "start" }); break;
        }
    });

    selectorDeReubicacion = crearSelectorHorario(document.getElementById("dialogoReubicarClase").querySelector("[data-selector-horario]"));
    document.getElementById("botonConfirmarCancelacion").addEventListener("click", confirmarCancelacionDeClase);
    document.getElementById("botonConfirmarNoSeDio").addEventListener("click", confirmarNoSeDio);
}

// La acción salió bien: se cierran los diálogos, se avisa y se actualiza el Panel
function accionDeClaseCompletada(mensaje) {
    ["dialogoCancelarClase", "dialogoReubicarClase", "dialogoNoSeDio"].forEach(cerrarDialogo);
    mostrarSnackbar(mensaje, "exito");
    const id = claseElegida?.id;
    refrescarPanel().then(() => resaltarClase(id));
}

// La acción no se pudo: si lo que se ve ya está viejo se actualiza el Panel; si no, el motivo va en el diálogo
function accionDeClaseRechazada(cuerpo, mensajeDelDialogo) {
    if (resultadosDePantallaVieja.includes(cuerpo.resultado)) {
        ["dialogoCancelarClase", "dialogoReubicarClase", "dialogoNoSeDio"].forEach(cerrarDialogo);
        mostrarSnackbar(cuerpo.mensaje, "error");
        refrescarPanel();
    } else if (mensajeDelDialogo) {
        mostrarMensaje(mensajeDelDialogo, cuerpo.mensaje);
    } else {
        mostrarSnackbar(cuerpo.mensaje, "error");
    }
}

// Aceptar / rechazar un pedido o un pedido de cambio o cancelación, o retirar el propio. aceptar es undefined al retirar
function responderClase(boton, url, aceptar) {
    boton.disabled = true;
    const datos = { idClase: claseElegida.id };
    if (aceptar !== undefined) datos.aceptar = aceptar;
    enviarAccionDeClase(url, datos)
        .then(({ ok, cuerpo }) => {
            if (ok) accionDeClaseCompletada(cuerpo.mensaje);
            else accionDeClaseRechazada(cuerpo);
        })
        .catch(error => {
            console.error(error);
            mostrarSnackbar("No pudimos enviar tu respuesta. Probá de nuevo.", "error");
        })
        .finally(() => { boton.disabled = false; });
}

// Un pedido que nadie aceptó se cancela sin condiciones; una clase confirmada con 24 h o más, también; con menos
// de 24 h se le pide a la otra persona que lo confirme (la clase sigue en pie hasta que acepte)
function abrirCancelacionDeClase() {
    const esPedido = claseElegida.estado === "Pendiente";
    const esSolicitud = claseElegida.estado === "Confirmada" && claseElegida.muyCerca;
    const nombre = crearElemento("strong", "", nombreCompleto(claseElegida));
    const fechaTexto = `${textoDiaLargo(leerFechaLocal(claseElegida.fecha))}, ${textoHoraDe(leerFechaLocal(claseElegida.fecha))} hs`;

    document.getElementById("tituloCancelarClase").textContent = esPedido ? "¿Cancelar el pedido?" : esSolicitud ? "¿Pedir la cancelación?" : "¿Cancelar esta clase?";
    document.getElementById("textoCancelarClase").replaceChildren(
        esSolicitud ? "Tu clase con " : `Vas a cancelar ${esPedido ? "tu pedido de clase" : "tu clase"} con `,
        nombre,
        ` (${fechaTexto}). `,
        esPedido ? "Todavía nadie lo aceptó, así que no hay ningún compromiso."
            : esSolicitud ? `empieza en menos de 24 horas, así que no se cancela sola: le vamos a pedir a ${claseElegida.nombreOtro} que lo confirme. Hasta que acepte, la clase sigue en pie.`
            : "Le avisamos a la otra persona."
    );
    document.getElementById("campoMotivoCancelar").hidden = esPedido;
    document.getElementById("motivoCancelar").value = "";
    document.getElementById("botonConfirmarCancelacion").textContent = esSolicitud ? "Pedir cancelación" : "Sí, cancelar";
    mostrarMensaje(document.getElementById("mensajeCancelarClase"), "");
    abrirDialogo("dialogoCancelarClase");
}

function confirmarCancelacionDeClase() {
    const mensajeCancelar = document.getElementById("mensajeCancelarClase");
    const botonConfirmar = document.getElementById("botonConfirmarCancelacion");
    const clase = claseElegida;
    botonConfirmar.disabled = true;

    enviarAccionDeClase("/Clases/Cancelar", { idClase: clase.id, motivo: document.getElementById("motivoCancelar").value.trim() })
        .then(({ ok, cuerpo }) => {
            if (!ok) {
                accionDeClaseRechazada(cuerpo, mensajeCancelar);
                return;
            }
            const mensaje = cuerpo.resultado === "solicitudEnviada" ? `Le pedimos a ${clase.nombreOtro} que confirme la cancelación.`
                : clase.estado === "Pendiente" ? "Pedido cancelado." : cuerpo.mensaje;
            accionDeClaseCompletada(mensaje);
        })
        .catch(error => {
            console.error(error);
            mostrarMensaje(mensajeCancelar, "No pudimos cancelar. Probá de nuevo.");
        })
        .finally(() => { botonConfirmar.disabled = false; });
}

function abrirReubicacionDeClase() {
    const inicio = leerFechaLocal(claseElegida.fecha);
    const esConfirmada = claseElegida.estado === "Confirmada";
    document.getElementById("horarioActualReubicar").textContent = `${textoDiaLargo(inicio)}, ${textoHoraDe(inicio)} hs`;
    document.getElementById("nombreClaseAReubicar").textContent = nombreCompleto(claseElegida);
    document.getElementById("textoQuienResponde").textContent = esConfirmada
        ? `Tu clase sigue en su horario hasta que ${claseElegida.nombreOtro} acepte el cambio.`
        : `${claseElegida.nombreOtro} tiene que confirmar el nuevo horario.`;
    document.getElementById("motivoReubicar").value = "";
    mostrarMensaje(document.getElementById("mensajeReubicarClase"), "");
    selectorDeReubicacion.configurar({ idOtroUsuario: claseElegida.idOtroUsuario, idClaseExcluir: claseElegida.id, nombreOtro: claseElegida.nombreOtro });
    abrirDialogo("dialogoReubicarClase");
}

// Lo llama el onsubmit del formulario del diálogo
function enviarReubicacionDeClase() {
    const mensajeReubicar = document.getElementById("mensajeReubicarClase");
    const botonConfirmar = document.getElementById("botonConfirmarReubicacion");
    const horario = selectorDeReubicacion.valor();
    if (!horario) return mostrarErrorEnCampo(mensajeReubicar, selectorDeReubicacion.campoDia, "Elegí un día y una hora de inicio.");

    const clase = claseElegida;
    mostrarMensaje(mensajeReubicar, "");
    botonConfirmar.disabled = true;
    enviarAccionDeClase("/Clases/Reubicar", { idClase: clase.id, fecha: horario, motivo: document.getElementById("motivoReubicar").value.trim() })
        .then(({ ok, cuerpo }) => {
            if (ok) {
                accionDeClaseCompletada(cuerpo.estado === "Pide cambio" ? `Le pedimos a ${clase.nombreOtro} que confirme el cambio. Tu clase sigue en su horario.` : cuerpo.mensaje);
            } else {
                accionDeClaseRechazada(cuerpo, mensajeReubicar);
                if (cuerpo.resultado?.startsWith("horarioOcupado") || cuerpo.resultado === "fueraDeAgenda") selectorDeReubicacion.recargar();
            }
        })
        .catch(error => {
            console.error(error);
            mostrarMensaje(mensajeReubicar, "No pudimos cambiar el horario. Probá de nuevo.");
        })
        .finally(() => { botonConfirmar.disabled = false; });

    return false;
}

// "No se dio": lo abren la agenda del día y el Historial (historial.js)
let claseNoSeDio = null;

function abrirNoSeDio(idClase, nombre, fechaTexto) {
    claseNoSeDio = idClase;
    claseElegida = calendario.clases.get(Number(idClase)) || { id: idClase };
    document.getElementById("textoNoSeDio").replaceChildren(
        "Vas a marcar que la clase con ",
        crearElemento("strong", "", nombre),
        ` (${fechaTexto}) no se dio. Queda en tu historial como no concretada y la otra persona se entera. Tenés 48 horas desde que terminó para marcarlo.`
    );
    mostrarMensaje(document.getElementById("mensajeNoSeDio"), "");
    abrirDialogo("dialogoNoSeDio");
}

function confirmarNoSeDio() {
    const mensaje = document.getElementById("mensajeNoSeDio");
    const boton = document.getElementById("botonConfirmarNoSeDio");
    boton.disabled = true;

    enviarAccionDeClase("/Clases/NoSeDio", { idClase: claseNoSeDio })
        .then(({ ok, cuerpo }) => {
            if (ok) accionDeClaseCompletada(cuerpo.mensaje);
            else accionDeClaseRechazada(cuerpo, mensaje);
        })
        .catch(error => {
            console.error(error);
            mostrarMensaje(mensaje, "No pudimos marcar la clase. Probá de nuevo.");
        })
        .finally(() => { boton.disabled = false; });
}


// ================= INICIALIZACIÓN =================
function inicializarCalendario() {
    if (!document.getElementById("misClases")) return;
    inicializarAccionesDelCalendario();
    cargarCalendario();
}

document.addEventListener("DOMContentLoaded", inicializarCalendario);
