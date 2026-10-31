// Chat directo del Panel de Control. Todo con fetch a MensajesController:
//   GET  /Mensajes/Conversaciones → la lista de personas con las que hablaste
//   GET  /Mensajes/Chat/{id}      → todos los mensajes con esa persona, del más viejo al más nuevo. Al leerlos,
//                                   los que te mandó pasan a Visto (por eso solo se pide con el chat a la vista).
//   POST /Mensajes/Enviar         → manda un mensaje (con el token anti-falsificación, como las clases)
// Se abre desde la pestaña, desde una notificación o con /Home/PanelControl?tab=chat&chat=5 (botón Mensaje del
// perfil; abrirPestanaYClase en clases.js). Mientras la pestaña está a la vista se actualiza sola.
// Las utilidades (crearElemento, pintarAvatar, mostrarSnackbar...) están en site.js y enviarAccionDeClase en clases.js.
// Todo el texto de la base se inserta con textContent, nunca como HTML.

const segundosEntreActualizacionesDelChat = 10;
const largoMaximoMensaje = 1000;

let idChatAbierto = null;
let otroUsuarioDelChat = null;
let firmaDelChatAbierto = "";
let conversacionesDelChat = [];
let actualizandoChat = false;

function inicializarChat() {
    const formularioChat = document.getElementById("formularioChat");
    if (!formularioChat) return;

    formularioChat.addEventListener("submit", evento => {
        evento.preventDefault();
        enviarMensajeDelChat();
    });

    // El campo corta a 1000 sin avisar: desde 800 se muestra cuánto va
    const campoMensaje = document.getElementById("campoMensajeChat");
    const contadorChat = document.getElementById("contadorChat");
    campoMensaje.addEventListener("input", () => {
        contadorChat.hidden = campoMensaje.value.length < 800;
        contadorChat.textContent = `${campoMensaje.value.length} / ${largoMaximoMensaje}`;
    });

    document.getElementById("conversacionesChat").addEventListener("click", evento => {
        const conversacion = evento.target.closest("[data-id-chat]");
        if (conversacion) abrirChatCon(conversacion.dataset.idChat);
    });

    // Al entrar a la pestaña se traen las conversaciones; después, cada 10 segundos mientras se vea
    document.getElementById("botonTabChat").addEventListener("click", actualizarChat);
    setInterval(() => {
        if (chatALaVista()) actualizarChat();
    }, segundosEntreActualizacionesDelChat * 1000);
}

// Desde la URL (?tab=chat&chat=5), una notificación o "Ir al chat" de una clase: muestra la pestaña del chat y,
// si viene una persona, abre su chat. No depende de inicializarChat (clases.js lo llama antes).
function mostrarChat(idOtroUsuario) {
    document.getElementById("botonTabChat")?.click();
    if (idOtroUsuario) abrirChatCon(idOtroUsuario);
    else cargarConversaciones();
    setTimeout(() => document.getElementById("chat")?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
}

// Solo se piden mensajes con la pestaña del chat abierta y la ventana a la vista: si no, se marcarían como leídos sin verlos
function chatALaVista() {
    return !document.hidden && document.getElementById("tabChat")?.classList.contains("active");
}

// Abre el chat con esa persona (aunque todavía no hayan hablado). Lo que te mandó pasa a Visto.
function abrirChatCon(idOtroUsuario) {
    idChatAbierto = String(idOtroUsuario);
    otroUsuarioDelChat = null;
    firmaDelChatAbierto = "";

    // Mientras carga se muestra lo que ya se sabe de la lista
    const conversacion = conversacionesDelChat.find(item => String(item.idOtroUsuario) === idChatAbierto);
    if (conversacion) mostrarCabeceraDelChat(conversacion.idOtroUsuario, conversacion.nombreOtro, conversacion.apellidoOtro, conversacion.fotoOtro, conversacion.tipoOtro);
    document.getElementById("mensajesChat").replaceChildren(crearAvisoDelChat("bi-arrow-repeat", "Cargando mensajes…"));
    dibujarConversaciones();

    return cargarChatAbierto(true).then(cargarConversaciones);
}

// La lista y el chat abierto (primero el chat, así la lista ya sale con sus mensajes como leídos)
function actualizarChat() {
    if (actualizandoChat) return;
    actualizandoChat = true;
    (idChatAbierto === null ? Promise.resolve() : cargarChatAbierto(false))
        .then(cargarConversaciones)
        .finally(() => { actualizandoChat = false; });
}

// GET que devuelve el JSON. Sin sesión lleva a Iniciar sesión; si falla, el error trae el mensaje del servidor
function pedirDatosDelChat(url) {
    return fetch(url).then(respuesta => {
        if (respuesta.status === 401) {
            window.location.href = "/Sesion/IniciarSesion";
            throw new Error("Sin sesión");
        }
        return respuesta.json()
            .catch(() => ({}))
            .then(cuerpo => {
                if (!respuesta.ok) throw new Error(cuerpo.mensaje || `Error ${respuesta.status} en ${url}`);
                return cuerpo;
            });
    });
}

// ----- Lista de conversaciones -----
function cargarConversaciones() {
    return pedirDatosDelChat("/Mensajes/Conversaciones")
        .then(conversaciones => {
            conversacionesDelChat = conversaciones;
            dibujarConversaciones();
        })
        .catch(error => {
            console.error(error);
            if (conversacionesDelChat.length === 0) {
                document.getElementById("conversacionesChat").replaceChildren(crearAvisoDelChat("bi-exclamation-circle", "No pudimos cargar tus conversaciones. Probá de nuevo en unos minutos.", "li"));
            }
        });
}

function dibujarConversaciones() {
    const lista = document.getElementById("conversacionesChat");
    const conversaciones = [...conversacionesDelChat];

    // Si abriste el chat con alguien con quien todavía no hablaste, aparece arriba hasta que le escribas
    if (otroUsuarioDelChat && !conversaciones.some(conversacion => String(conversacion.idOtroUsuario) === idChatAbierto)) {
        conversaciones.unshift({
            idOtroUsuario: otroUsuarioDelChat.id,
            nombreOtro: otroUsuarioDelChat.nombre,
            apellidoOtro: otroUsuarioDelChat.apellido,
            fotoOtro: otroUsuarioDelChat.fotoPerfil,
            ultimoMensaje: "",
            sinLeer: 0
        });
    }

    // El chat abierto ya está leído aunque la lista haya llegado antes
    const sinLeer = conversaciones
        .filter(conversacion => String(conversacion.idOtroUsuario) !== idChatAbierto)
        .reduce((total, conversacion) => total + conversacion.sinLeer, 0);
    actualizarInsigniaDelChat(sinLeer);

    if (conversaciones.length === 0) {
        lista.replaceChildren(crearAvisoDelChat("bi-chat-dots", "Todavía no tenés conversaciones. Escribile a alguien con el botón «Mensaje» de su perfil.", "li"));
        return;
    }
    lista.replaceChildren(...conversaciones.map(crearItemDeConversacion));
}

function crearItemDeConversacion(conversacion) {
    const esLaAbierta = String(conversacion.idOtroUsuario) === idChatAbierto;
    const item = document.createElement("li");
    const boton = crearElemento("button", esLaAbierta ? "conversacion activa" : "conversacion");
    boton.type = "button";
    boton.dataset.idChat = conversacion.idOtroUsuario;
    if (esLaAbierta) boton.setAttribute("aria-current", "true");

    const avatar = crearElemento("span", conversacion.fotoOtro ? "avatar" : "avatar theme-primary");
    avatar.setAttribute("aria-hidden", "true");
    pintarAvatar(avatar, conversacion.nombreOtro, conversacion.apellidoOtro, conversacion.fotoOtro);

    const texto = document.createElement("div");
    const vistaPrevia = conversacion.ultimoMensaje === ""
        ? "Conversación nueva"
        : (conversacion.ultimoEsMio ? "Vos: " : "") + conversacion.ultimoMensaje;
    texto.append(crearElemento("strong", "", `${conversacion.nombreOtro} ${conversacion.apellidoOtro}`), crearElemento("span", "", vistaPrevia));
    boton.append(avatar, texto);

    if (conversacion.sinLeer > 0 && !esLaAbierta) {
        const insignia = crearElemento("span", "badge theme-primary", conversacion.sinLeer);
        insignia.setAttribute("aria-label", conversacion.sinLeer === 1 ? "1 mensaje sin leer" : `${conversacion.sinLeer} mensajes sin leer`);
        boton.append(insignia);
    }

    item.append(boton);
    return item;
}

// El número del acceso "Chat directo" del Panel (oculto si es 0)
function actualizarInsigniaDelChat(cantidad) {
    const insignia = document.getElementById("insigniaChat");
    if (!insignia) return;
    insignia.textContent = cantidad;
    insignia.hidden = cantidad === 0;
}

// ----- Chat abierto -----
// bajarAlFinal: al abrirlo y al mandar un mensaje. En las actualizaciones solo baja si ya estaba abajo de todo.
function cargarChatAbierto(bajarAlFinal) {
    const idPedido = idChatAbierto;
    return pedirDatosDelChat(`/Mensajes/Chat/${encodeURIComponent(idPedido)}`)
        .then(chat => {
            if (idPedido !== idChatAbierto) return;
            if (chat.codigo == 0) {
                const eraNuevo = otroUsuarioDelChat === null;
                otroUsuarioDelChat = chat;
                if (eraNuevo) {
                    mostrarCabeceraDelChat(chat.id, chat.nombre, chat.apellido, chat.fotoPerfil, chat.tipoUsuario);
                    document.getElementById("formularioChat").hidden = false;
                }
                dibujarMensajes(chat.mensajes, bajarAlFinal);
                if (chat.marcados > 0) quitarNotificacionDelChat(chat.id, chat.cantidadNotificaciones);
            } else if (chat.codigo == 1) {
                mostrarErrorDelChat("No podés chatear con vos mismo.");
            } else {
                mostrarErrorDelChat("Esta persona no existe o no se le pueden mandar mensajes.");
            }
        })
        .catch(error => {
            if (idPedido !== idChatAbierto) return;
            console.error(error);
            // Si ya se ve el chat, una actualización que falla no borra nada
            if (otroUsuarioDelChat !== null) return;
            mostrarErrorDelChat("No pudimos cargar el chat. Probá de nuevo en unos minutos.");
        });
}

function mostrarErrorDelChat(texto) {
    document.getElementById("formularioChat").hidden = true;
    document.getElementById("mensajesChat").replaceChildren(crearAvisoDelChat("bi-exclamation-circle", texto));
}

function mostrarCabeceraDelChat(id, nombre, apellido, fotoPerfil, tipoUsuario) {
    const avatar = document.getElementById("avatarChat");
    avatar.classList.toggle("theme-primary", !fotoPerfil);
    pintarAvatar(avatar, nombre, apellido, fotoPerfil);

    const enlacePerfil = crearElemento("a", "", `${nombre} ${apellido}`);
    enlacePerfil.href = `/Home/Perfil/${id}`;
    document.getElementById("nombreChat").replaceChildren(enlacePerfil);
    document.getElementById("detalleChat").textContent = nombresDeTipoUsuario[tipoUsuario] || "";
}

function dibujarMensajes(mensajes, bajarAlFinal) {
    const contenedor = document.getElementById("mensajesChat");
    // Si no cambió nada (ni mensajes nuevos ni vistos), no se redibuja: así no salta el scroll
    const firma = mensajes.map(mensaje => `${mensaje.id}-${mensaje.estado}`).join(",") || "vacio";
    const estabaAbajo = contenedor.scrollHeight - contenedor.scrollTop - contenedor.clientHeight < 40;

    if (firma !== firmaDelChatAbierto) {
        firmaDelChatAbierto = firma;
        if (mensajes.length === 0) {
            contenedor.replaceChildren(crearAvisoDelChat("bi-chat-dots", `Todavía no hay mensajes. Escribile a ${otroUsuarioDelChat.nombre} para empezar la conversación.`));
        } else {
            const elementos = [];
            let diaAnterior = "";
            mensajes.forEach(mensaje => {
                const fecha = new Date(mensaje.fechaEnvio);
                if (fecha.toDateString() !== diaAnterior) {
                    diaAnterior = fecha.toDateString();
                    elementos.push(crearElemento("p", "diaChat", textoDiaDelChat(fecha)));
                }
                elementos.push(crearBurbujaDeMensaje(mensaje, fecha));
            });
            contenedor.replaceChildren(...elementos);
        }
    }
    if (bajarAlFinal || estabaAbajo) contenedor.scrollTop = contenedor.scrollHeight;
}

// En los propios: una tilde = enviado, dos = la otra persona ya lo vio
function crearBurbujaDeMensaje(mensaje, fecha) {
    const burbuja = crearElemento("p", mensaje.esMio ? "burbuja propia" : "burbuja", mensaje.contenido);
    const detalle = crearElemento("small", "detalleMensaje", fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }));
    if (mensaje.esMio) {
        const visto = mensaje.estado === "Visto";
        const tilde = crearElemento("i", visto ? "bi bi-check2-all" : "bi bi-check2");
        tilde.setAttribute("aria-hidden", "true");
        detalle.classList.toggle("visto", visto);
        detalle.title = visto ? "Visto" : "Enviado";
        detalle.append(" ", tilde, crearElemento("span", "visually-hidden", visto ? "Visto" : "Enviado"));
    }
    burbuja.append(detalle);
    return burbuja;
}

// "Hoy", "Ayer" o "Lunes 12 de octubre" (como en las clases del Panel; con el año si no es este)
function textoDiaDelChat(fecha) {
    const hoy = new Date();
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
    if (fecha.toDateString() === hoy.toDateString()) return "Hoy";
    if (fecha.toDateString() === ayer.toDateString()) return "Ayer";
    const diaDeLaSemana = fecha.toLocaleDateString("es-AR", { weekday: "long" });
    const mes = fecha.toLocaleDateString("es-AR", { month: "long" });
    const anio = fecha.getFullYear() === hoy.getFullYear() ? "" : ` de ${fecha.getFullYear()}`;
    return `${diaDeLaSemana.charAt(0).toUpperCase()}${diaDeLaSemana.slice(1)} ${fecha.getDate()} de ${mes}${anio}`;
}

function crearAvisoDelChat(icono, texto, etiqueta = "p") {
    const aviso = crearElemento(etiqueta, "avisoChat");
    const iconoAviso = crearElemento("i", `bi ${icono}`);
    iconoAviso.setAttribute("aria-hidden", "true");
    aviso.append(iconoAviso, ` ${texto}`);
    return aviso;
}

// Al leer el chat desaparece su notificación de mensajes sin leer (quitarNotificacion está en clases.js)
function quitarNotificacionDelChat(idOtroUsuario, cantidadNotificaciones) {
    quitarNotificacion(document.querySelector(`#notificaciones [data-tipo="mensajesSinLeer"][data-id-otro="${idOtroUsuario}"]`), cantidadNotificaciones);
}

// ----- Enviar -----
function enviarMensajeDelChat() {
    const campoMensaje = document.getElementById("campoMensajeChat");
    const botonEnviar = document.getElementById("botonEnviarChat");
    const contenido = campoMensaje.value.trim();
    if (idChatAbierto === null || contenido === "") {
        campoMensaje.focus();
        return;
    }
    if (contenido.length > largoMaximoMensaje) {
        mostrarSnackbar("El mensaje puede tener hasta 1000 caracteres.", "error");
        return;
    }

    botonEnviar.disabled = true;
    enviarAccionDeClase("/Mensajes/Enviar", { idReceptor: idChatAbierto, contenido })
        .then(cuerpo => {
            if (cuerpo.codigo == 0) {
                campoMensaje.value = "";
                document.getElementById("contadorChat").hidden = true;
                return cargarChatAbierto(true).then(cargarConversaciones);
            } else if (cuerpo.codigo == 1) {
                mostrarSnackbar("No podés mandarte mensajes a vos mismo.", "error");
            } else if (cuerpo.codigo == 2) {
                mostrarSnackbar("Esta persona no existe o no se le pueden mandar mensajes.", "error");
            } else {
                mostrarSnackbar("El mensaje no puede estar vacío ni pasar los 1000 caracteres.", "error");
            }
        })
        .catch(error => {
            console.error(error);
            mostrarSnackbar("No pudimos enviar el mensaje. Probá de nuevo.", "error");
        })
        .finally(() => {
            botonEnviar.disabled = false;
            campoMensaje.focus();
        });
}

document.addEventListener("DOMContentLoaded", inicializarChat);
