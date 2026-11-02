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

function inicializarModeracion() {
    inicializarRespuestasDeConsultas();
    inicializarVerificacionDeUsuarios();
}

document.addEventListener("DOMContentLoaded", inicializarModeracion);
