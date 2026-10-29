// Mi agenda (solo profesores): el horario semanal (franjas por día de la semana) y los días bloqueados. Se carga solo en el
// Panel de Control de un profesor, después de site.js y clases.js. Todo con fetch a ClasesController (MiAgenda, GuardarAgenda,
// BloquearDia, DesbloquearDia); el servidor valida lo mismo que este archivo (SP guardarDisponibilidad).
// Un profesor sin franjas no configuró su agenda: los alumnos pueden pedirle clases de 8 a 22 cualquier día.

const nombresDeDiasDeAgenda = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const primeraHoraDeAgenda = 7 * 60;
const ultimaHoraDeAgenda = 23 * 60;
const minutosEntreHorarios = 30;
const duracionMinimaDeFranja = 60;

// Una entrada por día (1 = lunes ... 7 = domingo): { activo, franjas: [{ desde: "14:00", hasta: "21:00" }] }
let diasDeAgenda = [];

function opcionesDeHorario(valorElegido) {
    const opciones = [];
    for (let minutos = primeraHoraDeAgenda; minutos <= ultimaHoraDeAgenda; minutos += minutosEntreHorarios) {
        const opcion = crearElemento("option", "", horaEnTexto(minutos));
        opcion.value = horaEnTexto(minutos);
        opcion.selected = opcion.value === valorElegido;
        opciones.push(opcion);
    }
    return opciones;
}

function crearSelectorDeHorario(nombreDia, tipo, valorElegido) {
    const select = crearElemento("select", "form-control");
    select.dataset.horario = tipo;
    select.setAttribute("aria-label", `${nombreDia}: ${tipo === "desde" ? "desde" : "hasta"}`);
    select.append(...opcionesDeHorario(valorElegido));
    return select;
}

// ----- Dibujo del horario semanal -----
function dibujarDiasDeAgenda() {
    const lista = document.getElementById("listaDiasAgenda");
    lista.replaceChildren(...diasDeAgenda.map((dia, indice) => crearFilaDeDia(dia, indice)));
}

function crearFilaDeDia(dia, indice) {
    const nombreDia = nombresDeDiasDeAgenda[indice];
    const fila = crearElemento("li", "diaDeAgenda");
    fila.dataset.indice = indice;

    const interruptor = crearElemento("span", "switch");
    const casilla = crearElemento("input");
    casilla.type = "checkbox";
    casilla.id = `diaAgenda${indice + 1}`;
    casilla.checked = dia.activo;
    casilla.setAttribute("role", "switch");
    casilla.dataset.interruptorDia = "";
    interruptor.append(casilla);
    const etiqueta = crearElemento("label", "", "Doy clases");
    etiqueta.htmlFor = casilla.id;

    const encabezado = crearElemento("div", "encabezadoDia");
    encabezado.append(crearElemento("strong", "", nombreDia), interruptor, etiqueta);
    fila.append(encabezado);

    const franjas = crearElemento("div", "franjasDelDia");
    franjas.hidden = !dia.activo;
    dia.franjas.forEach((franja, posicion) => franjas.append(crearFilaDeFranja(nombreDia, franja, posicion)));
    const agregar = crearElemento("button", "boton contorno chico", " Agregar franja");
    agregar.type = "button";
    agregar.dataset.agregarFranja = "";
    agregar.prepend(crearIconoDeAgenda());
    franjas.append(agregar);
    fila.append(franjas);
    return fila;
}

function crearFilaDeFranja(nombreDia, franja, posicion) {
    const fila = crearElemento("div", "franjaDeAgenda");
    fila.dataset.posicion = posicion;
    const quitar = crearElemento("button", "boton contorno chico");
    quitar.type = "button";
    quitar.dataset.quitarFranja = "";
    quitar.setAttribute("aria-label", `${nombreDia}: quitar franja`);
    const icono = crearElemento("i", "bi bi-trash");
    icono.setAttribute("aria-hidden", "true");
    quitar.append(icono);
    const error = crearElemento("p", "mensajeError");
    error.setAttribute("role", "alert");

    const selectores = crearElemento("div", "selectoresDeFranja");
    selectores.append(crearSelectorDeHorario(nombreDia, "desde", franja.desde), crearElemento("span", "", "a"), crearSelectorDeHorario(nombreDia, "hasta", franja.hasta), quitar);
    fila.append(selectores, error);
    return fila;
}

// Lee de la pantalla lo que la persona tiene elegido (los cambios de los selectores no se guardan hasta apretar Guardar)
function leerDiasDeLaPantalla() {
    return [...document.querySelectorAll("#listaDiasAgenda .diaDeAgenda")].map(fila => ({
        activo: fila.querySelector("[data-interruptor-dia]").checked,
        franjas: [...fila.querySelectorAll(".franjaDeAgenda")].map(franja => ({
            desde: franja.querySelector("[data-horario='desde']").value,
            hasta: franja.querySelector("[data-horario='hasta']").value
        }))
    }));
}

// ----- Validación (la misma que el SP guardarDisponibilidad) -----
// Muestra el error al lado de la franja. Devuelve true si todo está bien.
function validarAgenda() {
    const dias = leerDiasDeLaPantalla();
    const mensajeGeneral = document.getElementById("mensajeAgenda");
    let primerError = null;
    document.querySelectorAll("#listaDiasAgenda .franjaDeAgenda .mensajeError").forEach(error => { error.textContent = ""; });
    mostrarMensaje(mensajeGeneral, "");

    dias.forEach((dia, indice) => {
        if (!dia.activo) return;
        const filas = [...document.querySelectorAll(`#listaDiasAgenda .diaDeAgenda[data-indice='${indice}'] .franjaDeAgenda`)];
        const rangos = dia.franjas.map((franja, posicion) => ({ posicion, desde: minutosDeHora(franja.desde), hasta: minutosDeHora(franja.hasta) }));
        rangos.forEach(rango => {
            let error = "";
            if (rango.hasta <= rango.desde) error = "La hora de fin tiene que ser después de la de inicio.";
            else if (rango.hasta - rango.desde < duracionMinimaDeFranja) error = "Cada franja tiene que ser de al menos 60 minutos.";
            else if (rangos.some(otro => otro.posicion < rango.posicion && otro.desde <= rango.hasta && rango.desde <= otro.hasta)) error = "Las franjas de un mismo día no se pueden tocar ni superponer.";
            if (error) {
                mostrarMensaje(filas[rango.posicion].querySelector(".mensajeError"), error);
                primerError = primerError || filas[rango.posicion].querySelector("select");
            }
        });
    });

    if (!primerError && !dias.some(dia => dia.activo && dia.franjas.length > 0)) {
        mostrarMensaje(mensajeGeneral, "Activá al menos un día con una franja de horario.");
        return false;
    }
    if (primerError) {
        primerError.focus();
        return false;
    }
    return true;
}

// "1:14:00-21:00,1:09:00-12:00,6:09:00-13:00" (lunes = 1)
function franjasEnTexto() {
    return leerDiasDeLaPantalla()
        .flatMap((dia, indice) => dia.activo ? dia.franjas.map(franja => `${indice + 1}:${franja.desde}-${franja.hasta}`) : [])
        .join(",");
}

// ----- Acciones de la lista de días -----
function inicializarListaDeDias() {
    const lista = document.getElementById("listaDiasAgenda");

    lista.addEventListener("change", evento => {
        const casilla = evento.target.closest("[data-interruptor-dia]");
        if (!casilla) return;
        diasDeAgenda = leerDiasDeLaPantalla();
        const indice = Number(casilla.closest(".diaDeAgenda").dataset.indice);
        // Al activar un día sin franjas aparece una de arranque (sábado de mañana, el resto de tarde)
        if (casilla.checked && diasDeAgenda[indice].franjas.length === 0) {
            diasDeAgenda[indice].franjas.push(indice === 5 ? { desde: "09:00", hasta: "13:00" } : { desde: "14:00", hasta: "21:00" });
        }
        diasDeAgenda[indice].activo = casilla.checked;
        dibujarDiasDeAgenda();
        document.getElementById(`diaAgenda${indice + 1}`).focus();
    });

    lista.addEventListener("click", evento => {
        const fila = evento.target.closest(".diaDeAgenda");
        if (!fila) return;
        const indice = Number(fila.dataset.indice);

        if (evento.target.closest("[data-agregar-franja]")) {
            diasDeAgenda = leerDiasDeLaPantalla();
            const nueva = proximaFranjaLibre(diasDeAgenda[indice].franjas);
            if (!nueva) {
                mostrarMensaje(document.getElementById("mensajeAgenda"), `No hay lugar para otra franja el ${nombresDeDiasDeAgenda[indice].toLowerCase()}.`);
                return;
            }
            mostrarMensaje(document.getElementById("mensajeAgenda"), "");
            diasDeAgenda[indice].franjas.push(nueva);
            dibujarDiasDeAgenda();
            const selects = document.querySelectorAll(`#listaDiasAgenda .diaDeAgenda[data-indice='${indice}'] .franjaDeAgenda:last-of-type select`);
            selects[0]?.focus();
        } else if (evento.target.closest("[data-quitar-franja]")) {
            const posicion = Number(evento.target.closest(".franjaDeAgenda").dataset.posicion);
            diasDeAgenda = leerDiasDeLaPantalla();
            diasDeAgenda[indice].franjas.splice(posicion, 1);
            // Sin franjas el día queda apagado
            if (diasDeAgenda[indice].franjas.length === 0) diasDeAgenda[indice].activo = false;
            dibujarDiasDeAgenda();
            document.getElementById(`diaAgenda${indice + 1}`).focus();
        }
    });
}

// La primera franja de 2 horas que entra después de las que ya hay, o una de al menos 60 minutos en cualquier hueco
function proximaFranjaLibre(franjas) {
    const ocupadas = franjas.map(franja => ({ desde: minutosDeHora(franja.desde), hasta: minutosDeHora(franja.hasta) })).sort((una, otra) => una.desde - otra.desde);
    const huecos = [];
    let inicio = primeraHoraDeAgenda;
    ocupadas.forEach(franja => {
        huecos.push({ desde: inicio, hasta: franja.desde - minutosEntreHorarios });
        inicio = franja.hasta + minutosEntreHorarios;
    });
    huecos.push({ desde: inicio, hasta: ultimaHoraDeAgenda });
    const hueco = huecos.reverse().find(candidato => candidato.hasta - candidato.desde >= duracionMinimaDeFranja);
    if (!hueco) return null;
    return { desde: horaEnTexto(hueco.desde), hasta: horaEnTexto(Math.min(hueco.hasta, hueco.desde + 120)) };
}

// ----- Datos -----
function cargarMiAgenda() {
    return pedirJson("/Clases/MiAgenda")
        .then(agenda => {
            diasDeAgenda = nombresDeDiasDeAgenda.map((_, indice) => {
                const franjas = agenda.franjas.filter(franja => franja.diaSemana === indice + 1).map(franja => ({ desde: franja.desde.slice(0, 5), hasta: franja.hasta.slice(0, 5) }));
                return { activo: franjas.length > 0, franjas };
            });
            dibujarDiasDeAgenda();
            dibujarDiasBloqueados(agenda.diasBloqueados);
            actualizarAvisosDeAgenda(agenda.franjas.length > 0);
        })
        .catch(error => {
            console.error(error);
            document.getElementById("listaDiasAgenda").replaceChildren(crearElemento("li", "avisoChat", "No pudimos cargar tu agenda. Probá de nuevo en unos minutos."));
        });
}

// El aviso de "Configurá tu agenda" (arriba del Panel y en esta pestaña) solo está mientras no haya franjas
function actualizarAvisosDeAgenda(tieneAgenda) {
    document.getElementById("avisoSinAgendaPestana").hidden = tieneAgenda;
    const avisoDelPanel = document.getElementById("avisoSinAgenda");
    if (avisoDelPanel && tieneAgenda) avisoDelPanel.remove();
}

function guardarMiAgenda() {
    if (!validarAgenda()) return;
    const boton = document.getElementById("botonGuardarAgenda");
    boton.disabled = true;

    enviarAccionDeClase("/Clases/GuardarAgenda", { franjas: franjasEnTexto() })
        .then(cuerpo => {
            if (cuerpo.codigo == 0) {
                mostrarSnackbar("Guardamos tu agenda.", "exito");
                actualizarAvisosDeAgenda(true);
            } else if (cuerpo.codigo == 1) {
                mostrarMensaje(document.getElementById("mensajeAgenda"), "Solo los profesores tienen agenda.");
            } else {
                mostrarMensaje(document.getElementById("mensajeAgenda"), "Revisá las franjas: tienen que ser de al menos 60 minutos, entre las 7 y las 23, y no pueden tocarse ni superponerse en un mismo día.");
            }
        })
        .catch(error => {
            console.error(error);
            mostrarMensaje(document.getElementById("mensajeAgenda"), "No pudimos guardar tu agenda. Probá de nuevo en unos minutos.");
        })
        .finally(() => { boton.disabled = false; });
}

// ----- Días bloqueados -----
function dibujarDiasBloqueados(dias) {
    const lista = document.getElementById("listaDiasBloqueados");
    if (dias.length === 0) {
        lista.replaceChildren(crearElemento("li", "sinBloqueos", "No tenés días bloqueados."));
        return;
    }

    lista.replaceChildren(...dias.map(dia => {
        const fecha = dia.fecha.slice(0, 10);
        const item = crearElemento("li");
        item.dataset.fecha = fecha;
        const texto = crearElemento("div");
        texto.append(crearElemento("strong", "", textoDiaLargo(leerFechaLocal(fecha))));
        if (dia.clasesEseDia > 0) {
            texto.append(crearElemento("small", "", `Tenés ${dia.clasesEseDia} ${dia.clasesEseDia === 1 ? "clase" : "clases"} ese día: avisales o cancelalas.`));
        }
        const desbloquear = crearElemento("button", "boton contorno chico", "Desbloquear");
        desbloquear.type = "button";
        desbloquear.dataset.desbloquearDia = fecha;
        desbloquear.setAttribute("aria-label", `Desbloquear el ${textoDiaLargo(leerFechaLocal(fecha)).toLowerCase()}`);
        item.append(texto, desbloquear);
        return item;
    }));
}

function bloquearUnDia(evento) {
    evento.preventDefault();
    const campo = document.getElementById("campoDiaBloqueado");
    const mensaje = document.getElementById("mensajeBloqueo");
    if (!campo.value) return mostrarErrorEnCampo(mensaje, campo, "Elegí el día que querés bloquear.");

    mostrarMensaje(mensaje, "");
    enviarAccionDeClase("/Clases/BloquearDia", { fecha: campo.value })
        .then(cuerpo => {
            if (cuerpo.codigo == 0) {
                campo.value = "";
                if (cuerpo.clasesEseDia == 0) mostrarSnackbar("Bloqueaste ese día.", "exito");
                else mostrarSnackbar(`Bloqueaste ese día. Tenés ${cuerpo.clasesEseDia} ${cuerpo.clasesEseDia === 1 ? "clase" : "clases"} ese día: avisales o cancelalas.`, "info");
                return cargarMiAgenda();
            } else if (cuerpo.codigo == 1) {
                mostrarMensaje(mensaje, "Solo los profesores tienen agenda.");
            } else if (cuerpo.codigo == 2) {
                mostrarMensaje(mensaje, "Elegí un día de hoy en adelante y dentro del próximo año.");
            } else {
                mostrarMensaje(mensaje, "Ese día ya está bloqueado.");
            }
        })
        .catch(error => {
            console.error(error);
            mostrarMensaje(mensaje, "No pudimos bloquear ese día. Probá de nuevo en unos minutos.");
        });
}

function desbloquearUnDia(fecha) {
    enviarAccionDeClase("/Clases/DesbloquearDia", { fecha })
        .then(() => {
            mostrarSnackbar("Desbloqueaste ese día.", "exito");
            return cargarMiAgenda();
        })
        .catch(error => {
            console.error(error);
            mostrarSnackbar("No pudimos desbloquear ese día. Probá de nuevo.", "error");
        });
}


// ================= INICIALIZACIÓN =================
function inicializarMiAgenda() {
    if (!document.getElementById("miAgenda")) return;

    const hoy = new Date();
    const campo = document.getElementById("campoDiaBloqueado");
    campo.min = fechaATexto(hoy);
    campo.max = fechaATexto(new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate()));

    inicializarListaDeDias();
    document.getElementById("botonGuardarAgenda").addEventListener("click", guardarMiAgenda);
    document.getElementById("formularioBloquearDia").addEventListener("submit", bloquearUnDia);
    document.getElementById("listaDiasBloqueados").addEventListener("click", evento => {
        const boton = evento.target.closest("[data-desbloquear-dia]");
        if (boton) desbloquearUnDia(boton.dataset.desbloquearDia);
    });
    cargarMiAgenda();
}

document.addEventListener("DOMContentLoaded", inicializarMiAgenda);
