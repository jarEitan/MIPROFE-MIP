// Clases y notificaciones: pedir una clase (Catálogo y Perfil), el selector de día y hora, y la insignia de
// notificaciones del header. Todo se llama con fetch a ClasesController y NotificacionesController. Las utilidades
// (pedirJson, mostrarSnackbar, crearElemento...) están en site.js; el calendario y las acciones sobre las clases del Panel
// en calendario.js, la agenda del profesor en miAgenda.js y el chat en chat.js (que también usa enviarAccionDeClase).
// El servidor siempre valida las reglas (Info/log.md, entradas 2026-10-14 y 2026-10-20); acá solo se ayuda a no
// elegir horarios imposibles. Todo el texto de la base se inserta con textContent, nunca como HTML.

// Sin agenda configurada el profesor atiende de 8 a 22 (la última clase empieza a las 21:30)
const horaPrimeraFranja = 8;
const horaUltimaFranja = 21;
const minutosEntreFranjas = 30;
const minutosDeUnaClase = 60;
const minutosDeAnticipacionMinima = 60;
const diasDeLaTira = 28;

// ----- Fechas en español (las comparten el selector, el calendario y la agenda) -----
const nombresDeMeses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const nombresDeDias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function dosDigitos(numero) {
    return String(numero).padStart(2, "0");
}

// "2026-10-22" en hora local (toISOString usa UTC y corre el día)
function fechaATexto(fecha) {
    return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

// "2026-10-22" o "2026-10-22T18:00" → Date en hora local (un día solo se interpretaría en UTC)
function leerFechaLocal(texto) {
    return new Date(texto.length === 10 ? `${texto}T00:00` : texto);
}

function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "Jueves 22 de octubre"
function textoDiaLargo(fecha) {
    return capitalizar(`${nombresDeDias[fecha.getDay()]} ${fecha.getDate()} de ${nombresDeMeses[fecha.getMonth()]}`);
}

// "18:00"
function textoHoraDe(fecha) {
    return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

// "jue 22/10 18:00"
function textoFechaCorta(fecha) {
    return `${nombresDeDias[fecha.getDay()].slice(0, 3)} ${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)} ${textoHoraDe(fecha)}`;
}

// POST con el token anti-falsificación. Devuelve lo que contestó el SP (con su codigo). Sin sesión lleva a
// Iniciar sesión; si el servidor falla, tira un error y lo agarra el .catch de quien llama.
function enviarAccionDeClase(url, datos) {
    const token = document.querySelector("input[name='__RequestVerificationToken']");
    return fetch(url, {
        method: "POST",
        headers: { "RequestVerificationToken": token ? token.value : "" },
        body: new URLSearchParams(datos)
    }).then(respuesta => {
        if (respuesta.status === 401) window.location.href = "/Sesion/IniciarSesion";
        if (!respuesta.ok) throw new Error(`Error ${respuesta.status} en ${url}`);
        return respuesta.json();
    });
}

// El número rojo del botón Panel de Control (oculto si es 0)
function actualizarInsigniaDeNotificaciones(cantidad) {
    const insignia = document.getElementById("insigniaNotificaciones");
    if (!insignia || cantidad === null || cantidad === undefined) return;
    insignia.textContent = cantidad;
    insignia.hidden = cantidad === 0;
    insignia.setAttribute("aria-label", `${cantidad} notificaciones`);
}

function inicializarInsigniaDeNotificaciones() {
    if (!document.getElementById("insigniaNotificaciones")) return;

    // La sesión guarda el número de la última vez que se calculó: se refresca al cargar y cada minuto
    const refrescar = () => {
        if (document.hidden) return;
        pedirJson("/Notificaciones/Contar")
            .then(resultado => actualizarInsigniaDeNotificaciones(resultado.cantidad))
            .catch(error => console.error(error));
    };
    refrescar();
    setInterval(refrescar, 60000);
}

// Saca una notificación de acción ya resuelta de la lista del Panel y pone al día el contador de la lista y la insignia del header
function quitarNotificacion(item, cantidadNotificaciones) {
    item?.remove();

    const lista = document.getElementById("listaAcciones");
    const restantes = lista ? lista.children.length : 0;
    const contador = document.getElementById("cantidadNotificacionesPanel");
    if (contador) {
        contador.textContent = restantes;
        contador.hidden = restantes === 0;
    }
    if (lista && restantes === 0) {
        lista.replaceWith(crearElemento("p", "sinNotificaciones", "No tenés nada pendiente. Acá vas a ver las solicitudes de amistad, los mensajes sin leer y las clases que esperan tu respuesta."));
    }
    actualizarInsigniaDeNotificaciones(cantidadNotificaciones);
}

// Solicitudes de amistad: se aceptan o rechazan desde la notificación misma. El clic se escucha en la sección
// (no en cada botón) porque refrescarPanel() reemplaza la lista de notificaciones.
function inicializarSolicitudesDeAmistad() {
    document.getElementById("notificaciones")?.addEventListener("click", evento => {
        const boton = evento.target.closest("[data-responder-amistad]");
        if (!boton) return;
        const item = boton.closest(".notificacion");
        const nombre = item.dataset.nombre;
        const aceptar = boton.dataset.responderAmistad === "aceptar";
        const botones = item.querySelectorAll("[data-responder-amistad]");
        botones.forEach(b => { b.disabled = true; });

        enviarAccionDeClase("/Notificaciones/ResponderAmistad", { idOtroUsuario: item.dataset.idOtro, aceptar })
            .then(cuerpo => {
                // el foco pasa a la notificación de al lado (o al título) para no perderlo al borrar el botón
                const vecina = item.nextElementSibling || item.previousElementSibling;
                const titulo = document.getElementById("tituloNotificaciones");
                quitarNotificacion(item, cuerpo.cantidadNotificaciones);
                if (vecina) vecina.querySelector("a, button")?.focus();
                else if (titulo) { titulo.tabIndex = -1; titulo.focus(); }

                if (cuerpo.codigo == 0) {
                    mostrarSnackbar(aceptar ? `Ahora ${nombre} y vos son amigos.` : `Rechazaste la solicitud de ${nombre}.`, "exito");
                } else {
                    mostrarSnackbar("Esa solicitud ya no está pendiente.", "info");
                }
            })
            .catch(error => {
                console.error(error);
                botones.forEach(b => { b.disabled = false; });
                mostrarSnackbar("No pudimos responder la solicitud. Probá de nuevo.", "error");
            });
    });
}

// ----- Selector de día y hora (.selectorHorario: "Pedir clase" en _Layout y "Cambiar horario" en el Panel) -----
function minutosDeHora(texto) {
    const [horas, minutos] = texto.split(":").map(Number);
    return horas * 60 + minutos;
}

function horaEnTexto(totalMinutos) {
    return `${dosDigitos(Math.floor(totalMinutos / 60))}:${dosDigitos(totalMinutos % 60)}`;
}

// "14:00" → "14", "9:30" → "9:30" (para "lun a vie 14 a 21")
function horaCorta(texto) {
    return texto.endsWith(":00") ? String(Number(texto.slice(0, 2))) : `${Number(texto.slice(0, 2))}${texto.slice(2)}`;
}

// "lun a vie 14 a 21, sáb 9 a 13": agrupa los días seguidos que tienen las mismas franjas
function resumirSemana(semana) {
    const nombres = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
    const porDia = nombres.map((_, indice) => semana
        .filter(franja => franja.diaSemana === indice + 1)
        .map(franja => `${horaCorta(franja.desde)} a ${horaCorta(franja.hasta)}`)
        .join(" y "));
    const grupos = [];
    porDia.forEach((horario, indice) => {
        if (!horario) return;
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && ultimo.horario === horario && ultimo.hasta === indice - 1) ultimo.hasta = indice;
        else grupos.push({ desde: indice, hasta: indice, horario });
    });
    return grupos.map(grupo => `${grupo.desde === grupo.hasta ? nombres[grupo.desde] : `${nombres[grupo.desde]} a ${nombres[grupo.hasta]}`} ${grupo.horario}`).join(", ");
}

function crearSelectorHorario(raiz) {
    const tira = raiz.querySelector("[data-campo-dia]");
    const contenedorDias = raiz.querySelector("[data-dias]");
    const contenedorFranjas = raiz.querySelector("[data-franjas]");
    const resumen = raiz.querySelector("[data-resumen-agenda]");
    // La agenda del profesor limita al alumno que pide; un profesor que cambia el horario puede elegir fuera de la suya
    const respetaAgenda = document.body.dataset.tipoUsuario === "alumno";
    let idOtroUsuario = null;
    let idClaseExcluir = null;
    let diaElegido = null;
    let horaElegida = null;
    let consultaVigente = 0;
    let configuracionVigente = 0;
    let agenda = null;

    function mostrarAyuda(texto) {
        contenedorFranjas.replaceChildren(crearElemento("p", "ayudaFranjas", texto));
    }

    function mostrarAyudaEnTira(texto) {
        contenedorDias.replaceChildren(crearElemento("p", "ayudaFranjas", texto));
    }

    // Los días sin horario del profesor (o bloqueados) quedan deshabilitados, con el texto "sin horario" para lectores de pantalla
    function dibujarTira() {
        const botones = agenda.dias.map(info => {
            const fecha = leerFechaLocal(info.dia);
            const sinHorario = respetaAgenda && (info.bloqueado || (agenda.tieneAgenda && info.franjas.length === 0));
            const boton = crearElemento("button", "diaTira");
            boton.type = "button";
            boton.dataset.dia = info.dia;
            boton.disabled = sinHorario;
            boton.setAttribute("aria-pressed", "false");
            boton.setAttribute("aria-label", `${textoDiaLargo(fecha)}${sinHorario ? ", sin horario" : ""}`);
            boton.append(
                crearElemento("span", "nombreDia", nombresDeDias[fecha.getDay()].slice(0, 3)),
                crearElemento("strong", "", String(fecha.getDate())),
                crearElemento("span", "mesDia", nombresDeMeses[fecha.getMonth()].slice(0, 3))
            );
            if (sinHorario) {
                boton.title = "Sin horario";
                boton.append(crearElemento("span", "visually-hidden", " sin horario"));
            }
            return boton;
        });
        contenedorDias.replaceChildren(...botones);
        contenedorDias.scrollLeft = 0;
    }

    function escribirResumen(nombreOtro) {
        resumen.hidden = !respetaAgenda;
        if (!respetaAgenda) return;
        const nombre = nombreOtro || "el profesor";
        resumen.replaceChildren(
            crearIconoDeAgenda(),
            agenda.tieneAgenda ? ` Horario de ${nombre}: ${resumirSemana(agenda.semana)}.` : ` ${nombre} todavía no configuró su horario: podés pedir de ${horaPrimeraFranja} a ${horaUltimaFranja + 1} cualquier día.`
        );
    }

    // Franjas de 30 minutos que caben enteras dentro de la agenda de ese día; las ocupadas o que ya pasaron quedan deshabilitadas
    function dibujarFranjas(dia, ocupados, agendaDelDia) {
        if (respetaAgenda && (agendaDelDia.bloqueado || (agendaDelDia.tieneAgenda && agendaDelDia.franjas.length === 0))) {
            mostrarAyuda("El profesor no da clases ese día. Elegí otro.");
            return;
        }

        const tramos = respetaAgenda && agendaDelDia.tieneAgenda
            ? agendaDelDia.franjas.map(franja => ({ desde: minutosDeHora(franja.desde), hasta: minutosDeHora(franja.hasta) }))
            : [{ desde: horaPrimeraFranja * 60, hasta: (horaUltimaFranja + 1) * 60 + minutosEntreFranjas }];
        const limite = new Date(Date.now() + minutosDeAnticipacionMinima * 60000);
        const franjas = [];
        let hayLibres = false;

        tramos.forEach(tramo => {
            for (let minutos = tramo.desde; minutos + minutosDeUnaClase <= tramo.hasta; minutos += minutosEntreFranjas) {
                const texto = horaEnTexto(minutos);
                const inicio = new Date(`${dia}T${texto}`);
                const fin = new Date(inicio.getTime() + minutosDeUnaClase * 60000);
                const franja = crearElemento("button", "franja", texto);
                franja.type = "button";
                franja.dataset.hora = texto;
                franja.setAttribute("aria-pressed", "false");

                const choque = ocupados.find(ocupado => new Date(ocupado.inicio) < fin && new Date(ocupado.fin) > inicio);
                if (inicio < limite) {
                    franja.disabled = true;
                    franja.title = "Tiene que empezar dentro de 1 hora o más";
                } else if (choque) {
                    franja.disabled = true;
                    franja.title = choque.de === "alumno" ? "Ya tenés una clase en este horario" : "El profesor ya tiene una clase en este horario";
                } else {
                    hayLibres = true;
                }
                franjas.push(franja);
            }
        });

        contenedorFranjas.replaceChildren(...franjas);
        if (!hayLibres) contenedorFranjas.append(crearElemento("p", "ayudaFranjas", "No quedan horarios libres este día. Probá con otro."));
        horaElegida = null;
    }

    function cargarDia() {
        horaElegida = null;
        if (!diaElegido) {
            mostrarAyuda("Elegí primero un día.");
            return Promise.resolve();
        }

        const dia = diaElegido;
        const consulta = ++consultaVigente;
        mostrarAyuda("Buscando horarios libres…");
        const parametros = new URLSearchParams({ idOtroUsuario, dia });
        if (idClaseExcluir) parametros.set("idClaseExcluir", idClaseExcluir);

        return pedirJson(`/Clases/HorariosOcupados?${parametros}`)
            .then(resultado => {
                if (consulta === consultaVigente) dibujarFranjas(dia, resultado.ocupados, resultado);
            })
            .catch(error => {
                console.error(error);
                if (consulta === consultaVigente) mostrarAyuda("No pudimos cargar los horarios. Probá con otro día o recargá la página.");
            });
    }

    contenedorDias.addEventListener("click", evento => {
        const boton = evento.target.closest(".diaTira");
        if (!boton || boton.disabled) return;
        diaElegido = boton.dataset.dia;
        contenedorDias.querySelectorAll(".diaTira").forEach(otro => otro.setAttribute("aria-pressed", otro === boton ? "true" : "false"));
        cargarDia();
    });
    contenedorFranjas.addEventListener("click", evento => {
        const franja = evento.target.closest(".franja");
        if (!franja || franja.disabled) return;
        horaElegida = franja.dataset.hora;
        contenedorFranjas.querySelectorAll(".franja").forEach(otra => otra.setAttribute("aria-pressed", otra === franja ? "true" : "false"));
    });
    // Las flechas mueven la tira por dentro: la página nunca scrollea hacia los costados
    tira.querySelectorAll("[data-mover-tira]").forEach(flecha => {
        flecha.addEventListener("click", () => {
            const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            contenedorDias.scrollBy({ left: Number(flecha.dataset.moverTira) * contenedorDias.clientWidth * 0.8, behavior: sinMovimiento ? "auto" : "smooth" });
        });
    });

    return {
        // Deja el selector vacío para otro profesor / otra clase y trae su agenda de las próximas 4 semanas
        configurar(opciones) {
            idOtroUsuario = opciones.idOtroUsuario;
            idClaseExcluir = opciones.idClaseExcluir || null;
            diaElegido = null;
            horaElegida = null;
            agenda = null;
            resumen.hidden = true;
            mostrarAyuda("Elegí primero un día.");
            mostrarAyudaEnTira("Cargando días…");

            const configuracion = ++configuracionVigente;
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const ultimo = new Date(hoy);
            ultimo.setDate(ultimo.getDate() + diasDeLaTira - 1);
            const parametros = new URLSearchParams({ idOtroUsuario, desde: fechaATexto(hoy), hasta: fechaATexto(ultimo) });

            return pedirJson(`/Clases/DiasConAgenda?${parametros}`)
                .then(resultado => {
                    if (configuracion !== configuracionVigente) return;
                    agenda = resultado;
                    dibujarTira();
                    escribirResumen(opciones.nombreOtro);
                })
                .catch(error => {
                    console.error(error);
                    if (configuracion === configuracionVigente) mostrarAyudaEnTira("No pudimos cargar los días. Cerrá y volvé a abrir.");
                });
        },
        // "2026-10-19T16:00" o null si falta el día o la hora
        valor() {
            return diaElegido && horaElegida ? `${diaElegido}T${horaElegida}` : null;
        },
        recargar: cargarDia,
        campoDia: tira
    };
}

function crearIconoDeAgenda() {
    const icono = crearElemento("i", "bi bi-calendar-week");
    icono.setAttribute("aria-hidden", "true");
    return icono;
}

function abrirDialogo(idDialogo) {
    document.getElementById(idDialogo)?.showModal();
}

function cerrarDialogo(idDialogo) {
    document.getElementById(idDialogo)?.close();
}

// ----- Pedir clase (botones [data-pedir-clase] del Catálogo y del Perfil) -----
let selectorDePedido = null;

function inicializarPedidoDeClase() {
    document.addEventListener("click", evento => {
        const botonPedir = evento.target.closest("[data-pedir-clase]");
        if (!botonPedir) return;
        evento.preventDefault();
        abrirPedidoDeClase(botonPedir.dataset.idProfesor, botonPedir.dataset.nombreProfesor);
    });

    const dialogoPedir = document.getElementById("dialogoPedirClase");
    if (dialogoPedir) selectorDePedido = crearSelectorHorario(dialogoPedir.querySelector("[data-selector-horario]"));
}

function abrirPedidoDeClase(idProfesor, nombreProfesor) {
    const tipoUsuario = document.body.dataset.tipoUsuario;
    if (!tipoUsuario) {
        window.location.href = "/Sesion/IniciarSesion";
        return;
    }
    if (tipoUsuario !== "alumno" || !selectorDePedido) {
        mostrarSnackbar("Solo los alumnos pueden pedir clases.", "error");
        return;
    }

    const dialogoPedir = document.getElementById("dialogoPedirClase");
    dialogoPedir.dataset.idProfesor = idProfesor;
    document.getElementById("nombreProfesorPedido").textContent = nombreProfesor || "el profesor";
    document.getElementById("mensajePedido").value = "";
    mostrarMensaje(document.getElementById("mensajePedirClase"), "");
    selectorDePedido.configurar({ idOtroUsuario: idProfesor, nombreOtro: nombreProfesor });
    abrirDialogo("dialogoPedirClase");
}

function enviarPedidoDeClase() {
    const mensajePedir = document.getElementById("mensajePedirClase");
    const botonEnviar = document.getElementById("botonEnviarPedido");
    const horario = selectorDePedido.valor();
    if (!horario) return mostrarErrorEnCampo(mensajePedir, selectorDePedido.campoDia, "Elegí un día y una hora de inicio.");

    mostrarMensaje(mensajePedir, "");
    botonEnviar.disabled = true;
    enviarAccionDeClase("/Clases/EnviarPedido", {
        idProfesor: document.getElementById("dialogoPedirClase").dataset.idProfesor,
        fecha: horario,
        mensaje: document.getElementById("mensajePedido").value.trim()
    })
        .then(cuerpo => {
            if (cuerpo.codigo != 0) {
                const mensajes = {
                    1: "Solo los alumnos pueden pedirle clases a un profesor.",
                    2: "Elegí un horario que empiece dentro de 1 hora o más y dentro de los próximos 90 días.",
                    3: "Ese horario está fuera de la agenda del profesor.",
                    4: "Ya tenés una clase en ese horario. Elegí otro.",
                    5: "El profesor ya tiene una clase confirmada en ese horario. Elegí otro."
                };
                mostrarMensaje(mensajePedir, mensajes[cuerpo.codigo]);
                if (cuerpo.codigo >= 3) selectorDePedido.recargar();
                return;
            }
            cerrarDialogo("dialogoPedirClase");
            mostrarSnackbar("Pedido enviado. Te avisamos cuando el profesor responda.", "exito");
            actualizarInsigniaDeNotificaciones(cuerpo.cantidadNotificaciones);
            // Desde el Historial del Panel ("Pedir otra clase") el pedido nuevo aparece en Mis clases sin recargar
            if (document.getElementById("panelTabs")) refrescarPanel().then(() => resaltarClase(cuerpo.idClase));
        })
        .catch(error => {
            console.error(error);
            mostrarMensaje(mensajePedir, "No pudimos enviar el pedido. Probá de nuevo en unos minutos.");
        })
        .finally(() => { botonEnviar.disabled = false; });

    return false;
}

// ----- Panel de Control: pestañas, notificaciones y actualización -----
// Las acciones sobre cada clase (aceptar, cambiar horario, cancelar...) están en calendario.js. Todo es con fetch y sin
// recargar la página: después de cada acción se vuelve a pedir el Panel y se cambia solo lo que cambió.
function inicializarAccionesDeClases() {
    const panel = document.getElementById("panelTabs");
    if (!panel) return;

    abrirPestanaYClase(new URLSearchParams(window.location.search));

    // Los botones de las notificaciones llevan a la pestaña (la clase o el chat) sin recargar el Panel
    document.getElementById("notificaciones").addEventListener("click", evento => {
        const enlace = evento.target.closest("a.boton[href*='/Home/PanelControl']");
        if (!enlace) return;
        evento.preventDefault();
        abrirPestanaYClase(new URL(enlace.href).searchParams);
    });

    // Al dar una reseña, la noticia "Terminó tu clase" ya no corresponde
    document.addEventListener("resenaPublicada", () => refrescarPanel());
}

// Vuelve a pedir el Panel y cambia solo lo que cambió: notificaciones, contadores e insignia. El calendario y el
// historial se vuelven a pedir con fetch (cargarCalendario en calendario.js, cargarHistorialPropio en historial.js).
// Si la sesión venció, el servidor redirige al inicio de sesión. Devuelve una promesa que se cumple cuando todo está actualizado.
function refrescarPanel() {
    return fetch("/Home/PanelControl")
        .then(respuesta => {
            if (!respuesta.url.includes("/Home/PanelControl")) {
                window.location.href = respuesta.url;
                return null;
            }
            return respuesta.text();
        })
        .then(html => {
            if (html === null) return;
            const nuevo = new DOMParser().parseFromString(html, "text/html");

            const notificaciones = nuevo.getElementById("notificaciones");
            if (notificaciones) document.getElementById("notificaciones").innerHTML = notificaciones.innerHTML;
            ["contadorClasesActivas", "contadorClasesCompletadas"].forEach(id => {
                const reemplazo = nuevo.getElementById(id);
                if (reemplazo) document.getElementById(id).textContent = reemplazo.textContent;
            });
            actualizarInsigniaDeNotificaciones(Number(nuevo.getElementById("insigniaNotificaciones")?.textContent ?? 0));
            return Promise.all([
                typeof cargarCalendario === "function" ? cargarCalendario() : null,
                typeof cargarHistorialPropio === "function" ? cargarHistorialPropio() : null
            ]);
        })
        .catch(error => console.error(error));
}

// Las notificaciones llevan a /Home/PanelControl?tab=clases&clase=12: abre esa pestaña y resalta la clase en el calendario.
// Con ?tab=chat&chat=5 (notificación de mensajes o botón Mensaje del perfil) abre el chat con esa persona (chat.js).
function abrirPestanaYClase(parametros) {
    if (parametros.get("tab") === "chat") {
        if (typeof mostrarChat === "function") mostrarChat(parametros.get("chat"));
        return;
    }

    const esHistorial = parametros.get("tab") === "historial";
    const idClase = parametros.get("clase");
    if (!parametros.has("tab") && !idClase) return;

    document.getElementById(esHistorial ? "botonTabHistorial" : "botonTabClases")?.click();
    if (!esHistorial) {
        if (idClase && typeof mostrarClaseEnCalendario === "function") mostrarClaseEnCalendario(idClase);
        return;
    }

    // Las filas del historial recién existen cuando termina su fetch
    esperarHistorialPropio().then(() => {
        const destino = document.getElementById(`historial-${idClase}`);
        if (!destino) return;
        setTimeout(() => {
            destino.scrollIntoView({ behavior: "smooth", block: "center" });
            resaltarElemento(destino);
        }, 150);
    });
}

// La clase que acaba de cambiar se resalta un momento (en el calendario o, si ya terminó, en el Historial)
function resaltarClase(idClase) {
    if (!idClase) return;
    if (typeof mostrarClaseEnCalendario === "function" && mostrarClaseEnCalendario(idClase)) return;
    const destino = document.getElementById(`historial-${idClase}`);
    if (destino) resaltarElemento(destino);
}

function resaltarElemento(elemento) {
    elemento.classList.remove("resaltada");
    void elemento.offsetWidth;
    elemento.classList.add("resaltada");
}


// ================= INICIALIZACIÓN =================
function inicializarClases() {
    inicializarInsigniaDeNotificaciones();
    inicializarSolicitudesDeAmistad();
    inicializarPedidoDeClase();
    inicializarAccionesDeClases();
}

document.addEventListener("DOMContentLoaded", inicializarClases);
