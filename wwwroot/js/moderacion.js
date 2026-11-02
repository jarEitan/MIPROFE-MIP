// ================= MODERACIÓN =================
// Saca la tarjeta de la lista; si era la última, pone el mismo estado vacío que dibuja el servidor
function quitarTarjeta(columna, textoVacio) {
    const fila = columna.parentElement;
    columna.remove();
    if (fila.children.length > 0) return;
    const vacio = crearElemento("div", "card estadoVacio");
    vacio.append(crearElemento("p", "", textoVacio));
    fila.replaceWith(vacio);
}

// Cada consulta es un form con data-id-consulta. La respuesta le llega al usuario como mensaje directo (ModeracionController.Responder)
function inicializarRespuestasDeConsultas() {
    document.querySelectorAll("form[data-id-consulta]").forEach(formulario => {
        formulario.addEventListener("submit", evento => {
            evento.preventDefault();
            const campo = formulario.querySelector("textarea");
            const mensaje = formulario.querySelector(".mensajeError");
            if (campo.value.trim() === "") return mostrarErrorEnCampo(mensaje, campo, "Escribí una respuesta.");

            mostrarMensaje(mensaje, "");
            const botonResponder = formulario.querySelector("button");
            botonResponder.disabled = true;
            enviarAccionDeClase("/Moderacion/Responder", { idConsulta: formulario.dataset.idConsulta, respuesta: campo.value.trim() })
                .then(codigo => {
                    if (codigo == 0) {
                        quitarTarjeta(formulario.closest(".col"), "No hay consultas sin responder.");
                        mostrarSnackbar("Respuesta enviada por mensaje directo.", "exito");
                    } else if (codigo == 1) {
                        botonResponder.disabled = false;
                        mostrarErrorEnCampo(mensaje, campo, "Escribí una respuesta.");
                    } else {
                        quitarTarjeta(formulario.closest(".col"), "No hay consultas sin responder.");
                        mostrarSnackbar("Esa consulta ya fue respondida.", "error");
                    }
                })
                .catch(error => {
                    console.error(error);
                    botonResponder.disabled = false;
                    mostrarSnackbar("No pudimos enviar la respuesta. Probá de nuevo.", "error");
                });
        });
    });
}

// Botones "Verificar cuenta" (data-verificar-usuario con el id). La tarjeta se va de la lista al verificarla
function inicializarVerificacionDeUsuarios() {
    document.querySelectorAll("[data-verificar-usuario]").forEach(boton => {
        boton.addEventListener("click", () => {
            boton.disabled = true;
            enviarAccionDeClase("/Moderacion/Verificar", { idUsuario: boton.dataset.verificarUsuario })
                .then(codigo => {
                    quitarTarjeta(boton.closest(".col"), "No hay cuentas esperando verificación.");
                    if (codigo == 0) {
                        mostrarSnackbar("Cuenta verificada.", "exito");
                    } else {
                        mostrarSnackbar("Esa cuenta ya estaba verificada.", "error");
                    }
                })
                .catch(error => {
                    console.error(error);
                    boton.disabled = false;
                    mostrarSnackbar("No pudimos verificar la cuenta. Probá de nuevo.", "error");
                });
        });
    });
}

// Botones de cada reporte (data-accion: borrarResena | suspender | descartar). Cualquiera cierra el reporte
function inicializarReportes() {
    const textosExito = { borrarResena: "Reseña borrada.", suspender: "Cuenta suspendida. Sus clases futuras se cancelaron.", descartar: "Reporte descartado." };
    document.querySelectorAll("[data-id-reporte]").forEach(tarjeta => {
        tarjeta.addEventListener("click", evento => {
            const boton = evento.target.closest("[data-accion]");
            if (!boton) return;
            if (boton.dataset.accion === "suspender" && !window.confirm("¿Suspender esta cuenta? Se cancelan sus clases futuras y no va a poder usar MiProfesor hasta que le quites la suspensión desde su perfil.")) return;

            tarjeta.querySelectorAll("button").forEach(otro => { otro.disabled = true; });
            enviarAccionDeClase("/Moderacion/ResolverReporte", { idConsulta: tarjeta.dataset.idReporte, accion: boton.dataset.accion })
                .then(resultado => {
                    quitarTarjeta(tarjeta.closest(".col"), "No hay reportes sin revisar.");
                    if (resultado.codigo == 0) mostrarSnackbar(textosExito[boton.dataset.accion], "exito");
                    else if (resultado.codigo == 1) mostrarSnackbar("Ese reporte ya estaba resuelto.", "error");
                    else mostrarSnackbar("Eso ya no se puede hacer: la reseña se borró o la cuenta ya está suspendida. Recargá la página.", "error");
                })
                .catch(error => {
                    console.error(error);
                    tarjeta.querySelectorAll("button").forEach(otro => { otro.disabled = false; });
                    mostrarSnackbar("No pudimos resolver el reporte. Probá de nuevo.", "error");
                });
        });
    });
}

function inicializarModeracion() {
    inicializarReportes();
    inicializarRespuestasDeConsultas();
    inicializarVerificacionDeUsuarios();
}

document.addEventListener("DOMContentLoaded", inicializarModeracion);
