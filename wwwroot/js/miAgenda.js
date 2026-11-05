// Mi agenda (solo profesores): el horario semanal (franjas por día de la semana) y los días bloqueados. Se carga solo en el
// Panel de Control de un profesor, después de site.js y clases.js. Todo con fetch a ClasesController (MiAgenda, GuardarAgenda,
// BloquearDia, DesbloquearDia); el servidor valida lo mismo que este archivo (SP agregarFranja).
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

// ----- Validación (la misma que el SP agregarFranja) -----
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
// Los cambios no se guardan hasta apretar Guardar: el botón y el aviso lo recuerdan
function marcarCambiosDeAgenda(hayCambios) {
    document.getElementById("avisoCambiosAgenda").hidden = !hayCambios;
    document.querySelector("#botonGuardarAgenda span").textContent = hayCambios ? "Guardar cambios" : "Guardar agenda";
}

function inicializarListaDeDias() {
    const lista = document.getElementById("listaDiasAgenda");

    lista.addEventListener("change", evento => {
        marcarCambiosDeAgenda(true);
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
                mostrarSnackbar(`No hay lugar para otra franja el ${nombresDeDiasDeAgenda[indice].toLowerCase()}.`, "error");
                return;
            }
            mostrarMensaje(document.getElementById("mensajeAgenda"), "");
            marcarCambiosDeAgenda(true);
            diasDeAgenda[indice].franjas.push(nueva);
            dibujarDiasDeAgenda();
            const selects = document.querySelectorAll(`#listaDiasAgenda .diaDeAgenda[data-indice='${indice}'] .franjaDeAgenda:last-of-type select`);
            selects[0]?.focus();
        } else if (evento.target.closest("[data-quitar-franja]")) {
            const posicion = Number(evento.target.closest(".franjaDeAgenda").dataset.posicion);
            marcarCambiosDeAgenda(true);
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
            diasBloqueadosActuales = new Set((agenda.diasBloqueados || []).map(dia => dia.fecha.slice(0, 10)));
            diasDeAgenda = nombresDeDiasDeAgenda.map((_, indice) => {
                const franjas = agenda.franjas.filter(franja => franja.diaSemana === indice + 1).map(franja => ({ desde: franja.desde.slice(0, 5), hasta: franja.hasta.slice(0, 5) }));
                return { activo: franjas.length > 0, franjas };
            });
            dibujarDiasDeAgenda();
            return cargarMapaDeFeriados(agenda.diasBloqueados).then(() => {
                dibujarDiasBloqueados(agenda.diasBloqueados, mapaDeFeriados);
            });
        })
        .then(() => {
            marcarCambiosDeAgenda(false);
            actualizarAvisosDeAgenda(true);
            actualizarEstadoBotonFeriados();
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
                marcarCambiosDeAgenda(false);
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
let mapaDeFeriados = new Map();
let feriadosOcultos = false;
let diasBloqueadosActuales = new Set();

function rangoBloqueado(dias) {
    if (!dias || dias.length === 0) return { desde: null, hasta: null };
    const fechas = dias.map(dia => dia.fecha.slice(0, 10)).sort();
    return { desde: fechas[0], hasta: fechas[fechas.length - 1] };
}

function cargarMapaDeFeriados(dias) {
    const { desde, hasta } = rangoBloqueado(dias);
    if (!desde || !hasta) {
        mapaDeFeriados = new Map();
        return Promise.resolve(mapaDeFeriados);
    }

    const anios = new Set([new Date(`${desde}T00:00:00`).getFullYear(), new Date(`${hasta}T00:00:00`).getFullYear()]);
    return Promise.all([...anios].map(anio => fetch(`https://api.argentinadatos.com/v1/feriados/${anio}`)
        .then(respuesta => respuesta.ok ? respuesta.json() : [])
        .catch(() => [])))
        .then(listas => {
            const mapa = new Map();
            listas.flat().forEach(feriado => {
                if (!feriado?.fecha) return;
                const fecha = feriado.fecha.slice(0, 10);
                if (fecha < desde || fecha > hasta) return;
                const nombre = feriado.motivo || feriado.nombre || "Feriado";
                if (!mapa.has(fecha) || !mapa.get(fecha)) mapa.set(fecha, nombre);
            });
            mapaDeFeriados = mapa;
            return mapa;
        });
}

function actualizarEstadoBotonFeriados() {
    const boton = document.getElementById("botonOcultarFeriados");
    const badge = document.getElementById("badgeOcultarFeriados");
    const icono = boton?.querySelector(".iconoOcultarFeriados");
    const texto = boton?.querySelector(".textoOcultarFeriados");
    if (!boton || !badge || !icono || !texto) return;

    const cantidad = [...diasBloqueadosActuales].filter(fecha => mapaDeFeriados.has(fecha)).length;
    boton.setAttribute("aria-pressed", String(feriadosOcultos));

    if (feriadosOcultos) {
        icono.className = "bi bi-eye iconoOcultarFeriados";
        texto.textContent = "Mostrar feriados";
        badge.hidden = cantidad === 0;
        badge.textContent = `${cantidad} ${cantidad === 1 ? "feriado oculto" : "feriados ocultos"}`;
        return;
    }

    icono.className = "bi bi-eye-slash iconoOcultarFeriados";
    texto.textContent = "Ocultar feriados";
    badge.hidden = true;
}

function dibujarDiasBloqueados(dias, feriados = mapaDeFeriados) {
    const lista = document.getElementById("listaDiasBloqueados");
    if (dias.length === 0) {
        lista.replaceChildren(crearElemento("li", "sinBloqueos", "No tenés días bloqueados."));
        actualizarEstadoBotonFeriados();
        return;
    }

    const diasVisibles = dias.filter(dia => {
        const fecha = dia.fecha.slice(0, 10);
        const esFeriado = Boolean(feriados.get(fecha));
        return !(feriadosOcultos && esFeriado);
    });

    if (diasVisibles.length === 0) {
        lista.replaceChildren(crearElemento("li", "sinBloqueos", "No hay días bloqueados visibles."));
        actualizarEstadoBotonFeriados();
        return;
    }

    lista.replaceChildren(...diasVisibles.map(dia => {
        const fecha = dia.fecha.slice(0, 10);
        const nombreFeriado = feriados.get(fecha);
        const item = crearElemento("li");
        item.dataset.fecha = fecha;
        if (nombreFeriado) item.classList.add("feriado");

        const texto = crearElemento("div", "contenidoBloqueado");
        const filaTitulo = crearElemento("div", "filaTituloBloqueado");
        filaTitulo.append(crearElemento("strong", "", textoDiaLargo(leerFechaLocal(fecha))));
        if (nombreFeriado) filaTitulo.append(crearElemento("span", "etiquetaFeriado", " " + `Feriado: ${nombreFeriado}`));
        texto.append(filaTitulo);

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

    actualizarEstadoBotonFeriados();
}

function alternarFeriadosOcultos() {
    feriadosOcultos = !feriadosOcultos;
    const dias = document.querySelectorAll("#listaDiasBloqueados li[data-fecha]");
    const lista = document.getElementById("listaDiasBloqueados");
    if (!lista) return;

    const diasBloqueados = [...dias].map(item => ({ fecha: item.dataset.fecha, clasesEseDia: Number(item.dataset.clasesEseDia || 0) }));
    const feriadosEnAgenda = new Map();
    [...document.querySelectorAll("#listaDiasBloqueados li[data-fecha]")].forEach(item => {
        const fecha = item.dataset.fecha;
        const nombre = mapaDeFeriados.get(fecha);
        if (nombre) feriadosEnAgenda.set(fecha, nombre);
    });

    dibujarDiasBloqueados(diasBloqueados.length ? diasBloqueados : [], feriadosEnAgenda.size ? feriadosEnAgenda : mapaDeFeriados);
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

function importarFeriados() {
    const boton = document.getElementById("botonImportarFeriados");
    boton.disabled = true;
    const hoy = new Date();
    const desde = fechaATexto(hoy);
    const hasta = fechaATexto(new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate()));
    const yaBloqueados = [...diasBloqueadosActuales];

    const anioActual = fetch(`https://api.argentinadatos.com/v1/feriados/${hoy.getFullYear()}`)
        .then(respuesta => respuesta.ok ? respuesta.json() : [])
        .catch(() => []);
    const anioSiguiente = fetch(`https://api.argentinadatos.com/v1/feriados/${hoy.getFullYear() + 1}`)
        .then(respuesta => respuesta.ok ? respuesta.json() : [])
        .catch(() => []);

    Promise.all([anioActual, anioSiguiente])
        .then(listas => {
            const fechas = [...new Set(listas.flat().map(feriado => feriado.fecha))]
                .filter(fecha => fecha >= desde && fecha <= hasta && !yaBloqueados.includes(fecha));
            return Promise.all(fechas.map(fecha => enviarAccionDeClase("/Clases/BloquearDia", { fecha }).catch(() => ({ codigo: -1 }))));
        })
        .then(resultados => {
            const bloqueados = resultados.filter(resultado => resultado.codigo == 0);
            const conClases = bloqueados.filter(resultado => resultado.clasesEseDia > 0).length;
            if (bloqueados.length === 0) {
                mostrarSnackbar("Ya tenías todos los feriados bloqueados.", "info");
                return;
            }
            let texto = `Bloqueamos ${bloqueados.length} ${bloqueados.length === 1 ? "feriado" : "feriados"}.`;
            if (conClases > 0) texto += ` Tenés clases en ${conClases} de esos días: revisalas en Mis clases.`;
            mostrarSnackbar(texto, conClases > 0 ? "info" : "exito");
            return cargarMiAgenda();
        })
        .catch(error => {
            console.error(error);
            mostrarSnackbar("No pudimos traer los feriados. Probá de nuevo más tarde.", "error");
        })
        .finally(() => { boton.disabled = false; });
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
    document.getElementById("botonImportarFeriados").addEventListener("click", () => abrirDialogo("dialogoImportarFeriados"));
    document.getElementById("botonOcultarFeriados").addEventListener("click", () => {
        feriadosOcultos = !feriadosOcultos;
        cargarMiAgenda();
    });
    document.getElementById("botonConfirmarFeriados").addEventListener("click", () => {
        cerrarDialogo("dialogoImportarFeriados");
        importarFeriados();
    });
    document.getElementById("listaDiasBloqueados").addEventListener("click", evento => {
        const boton = evento.target.closest("[data-desbloquear-dia]");
        if (boton) desbloquearUnDia(boton.dataset.desbloquearDia);
    });
    cargarMiAgenda();
}

document.addEventListener("DOMContentLoaded", inicializarMiAgenda);
