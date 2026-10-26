// Historial de clases: la pestaña "Historial" del Panel de Control (el historial propio) y el modal
// "Historial" del Perfil (el de cualquier usuario). Los dos piden los datos con fetch a HistorialController
// y dibujan la MISMA tabla con dibujarHistorial(). Se carga solo en esas dos páginas, después de site.js y clases.js.
// Qué clases se ven y cuántas por vez lo decide el servidor (SP obtenerHistorialClases): el propio, de a 20 y todas;
// el de otra persona, solo las completadas, de a 10 y hasta 20 en total. "Ver más" pide la página siguiente.
// Todo lo que viene de la base se inserta con textContent, nunca como HTML.

// ----- Datos -----
function pedirHistorial(idUsuario, desde) {
    return pedirJson(`/Historial/Obtener/${idUsuario}?desde=${desde || 0}`);
}

// ----- Dibujo de la tabla (lo comparten el Panel y el modal) -----
// opciones.esPanel: historial propio dentro del Panel. Suma la columna "Acción" (Pedir otra clase, solo alumnos, y
// "No se dio") y le pone id a cada fila para que las notificaciones puedan resaltarla.
function dibujarHistorial(contenedor, resultado, opciones) {
    contenedor.replaceChildren();

    if (resultado.codigo != 0) {
        contenedor.append(crearEstadoVacioHistorial("Este usuario no existe", "Revisá que el enlace esté completo."));
        return;
    }

    if (resultado.clases.length === 0) {
        contenedor.append(resultado.esPropio
            ? crearEstadoVacioHistorial("Todavía no hay clases en tu historial", "Las clases completadas, no concretadas y canceladas aparecen acá.")
            : crearEstadoVacioHistorial("Todavía no tiene clases completadas", "Cuando termine sus primeras clases, van a aparecer acá."));
        return;
    }

    const conAccion = Boolean(opciones.esPanel);
    // La contraparte de un alumno es un profesor, y al revés
    const columnaContraparte = resultado.tipoUsuario === "alumno" ? "Profesor" : "Alumno";
    const columnas = [columnaContraparte, "Materia", "Colegio", "Puntuación", "Día y hora"];
    if (conAccion) columnas.push("Acción");

    const filaTitulos = crearElemento("tr");
    columnas.forEach(columna => {
        const titulo = crearElemento("th", "", columna);
        titulo.scope = "col";
        filaTitulos.append(titulo);
    });
    const encabezado = crearElemento("thead");
    encabezado.append(filaTitulos);

    const cuerpo = crearElemento("tbody");
    resultado.clases.forEach(clase => cuerpo.append(crearFilaHistorial(clase, columnaContraparte, conAccion, opciones, resultado.tipoUsuario)));

    const tabla = crearElemento("table", "table");
    tabla.append(encabezado, cuerpo);

    const tarjeta = crearElemento("div", "card tabla");
    tarjeta.append(tabla);
    contenedor.append(tarjeta);

    contenedor.append(crearPieDelHistorial(resultado, cuerpo, columnaContraparte, conAccion, opciones));
}

// "Mostrando 20 de 143 clases" y el botón "Ver más", que pide la página siguiente y la agrega a la tabla
function crearPieDelHistorial(resultado, cuerpo, columnaContraparte, conAccion, opciones) {
    const pie = crearElemento("div", "pieHistorial");
    const nota = crearElemento("p", "notaHistorial");
    const boton = crearElemento("button", "boton contorno chico");
    boton.type = "button";
    boton.append(crearIconoHistorial("bi-plus-lg"), " Ver más");
    pie.append(nota, boton);

    const actualizar = () => {
        const mostradas = cuerpo.children.length;
        nota.textContent = `Mostrando ${mostradas} de ${resultado.total} ${resultado.total === 1 ? "clase" : "clases"}.`;
        boton.hidden = mostradas >= resultado.total;
    };
    actualizar();

    boton.addEventListener("click", () => {
        boton.disabled = true;
        pedirHistorial(resultado.id, cuerpo.children.length)
            .then(pagina => {
                pagina.clases.forEach(clase => cuerpo.append(crearFilaHistorial(clase, columnaContraparte, conAccion, opciones, resultado.tipoUsuario)));
                resultado.total = pagina.total;
                actualizar();
                // El foco queda en la primera fila nueva para no perder el lugar al agregar contenido
                cuerpo.children[cuerpo.children.length - pagina.clases.length]?.querySelector("a, button")?.focus();
            })
            .catch(error => {
                console.error(error);
                nota.textContent = "No pudimos cargar más clases. Probá de nuevo.";
            })
            .finally(() => { boton.disabled = false; });
    });
    return pie;
}

function crearFilaHistorial(clase, columnaContraparte, conAccion, opciones, tipoUsuarioDueno) {
    const nombreOtro = `${clase.nombreOtro} ${clase.apellidoOtro}`;
    const fila = crearElemento("tr");
    if (opciones.esPanel) fila.id = `historial-${clase.id}`;

    // La contraparte lleva a su perfil
    const enlace = crearElemento("a", "", nombreOtro);
    enlace.href = `/Home/Perfil/${clase.idOtroUsuario}`;
    const nombreEnNegrita = crearElemento("strong");
    nombreEnNegrita.append(enlace);
    const celdaContraparte = crearCeldaHistorial(columnaContraparte);
    celdaContraparte.append(nombreEnNegrita);

    // Cancelada y No concretada solo aparecen en el historial propio: se marcan al lado del día, con el motivo
    const inicio = new Date(clase.fecha);
    const diaYEstado = crearElemento("span", "", `${inicio.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })} ${inicio.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`);
    if (clase.estado !== "Completada") diaYEstado.append(" ", crearElemento("span", "badge badge-subtle theme-danger", clase.estado));
    const celdaDia = crearCeldaHistorial("Día y hora");
    celdaDia.append(diaYEstado);
    if (clase.motivo) celdaDia.append(crearElemento("small", "motivoHistorial", clase.motivo));

    fila.append(
        celdaContraparte,
        crearCeldaHistorial("Materia", clase.materias || "–"),
        crearCeldaHistorial("Colegio", clase.colegios || "–"),
        crearCeldaPuntuacionHistorial(clase, nombreOtro),
        celdaDia
    );

    if (conAccion) {
        const celdaAccion = crearCeldaHistorial("Acción");
        const botones = crearElemento("div", "botonesClase");
        if (tipoUsuarioDueno === "alumno") {
            // Abre el diálogo "Pedir una clase" (clases.js) ya con ese profesor
            const botonPedir = crearElemento("button", "boton principal chico");
            botonPedir.type = "button";
            botonPedir.dataset.pedirClase = "";
            botonPedir.dataset.idProfesor = clase.idOtroUsuario;
            botonPedir.dataset.nombreProfesor = nombreOtro;
            botonPedir.append(crearIconoHistorial("bi-calendar-plus"), " Pedir otra clase");
            botones.append(botonPedir);
        }
        if (clase.puedeMarcarNoSeDio) {
            // Hasta 48 h después de que terminó la clase (calendario.js: abrirNoSeDio)
            const botonNoSeDio = crearElemento("button", "boton contorno chico");
            botonNoSeDio.type = "button";
            botonNoSeDio.dataset.noSeDio = "";
            botonNoSeDio.dataset.idClase = clase.id;
            botonNoSeDio.dataset.nombreOtro = nombreOtro;
            botonNoSeDio.dataset.fechaTexto = textoFechaCorta(inicio);
            botonNoSeDio.append(crearIconoHistorial("bi-calendar-minus"), " No se dio");
            botones.append(botonNoSeDio);
        }
        if (botones.children.length > 0) celdaAccion.append(botones);
        else celdaAccion.textContent = "–";
        fila.append(celdaAccion);
    }
    return fila;
}

// Las estrellas de la última reseña; si no hay, "Dar reseña" (solo en el historial propio) o un guion
function crearCeldaPuntuacionHistorial(clase, nombreOtro) {
    const celda = crearCeldaHistorial("Puntuación");

    if (clase.puntuacion) {
        const estrellas = crearElemento("span", "estrellas");
        estrellas.setAttribute("aria-label", `${clase.puntuacion} de 5 estrellas`);
        for (let posicion = 1; posicion <= 5; posicion++) {
            estrellas.append(crearIconoHistorial(posicion <= clase.puntuacion ? "bi-star-fill" : "bi-star"));
        }
        celda.append(estrellas);
    } else if (clase.puedeDarResena) {
        const botonResena = crearElemento("button", "boton contorno chico");
        botonResena.type = "button";
        botonResena.dataset.darResena = "";
        botonResena.dataset.idUsuario = clase.idOtroUsuario;
        botonResena.dataset.nombreUsuario = nombreOtro;
        botonResena.setAttribute("aria-label", `Dar reseña a ${nombreOtro}`);
        botonResena.append(crearIconoHistorial("bi-star"), " Dar reseña");
        celda.append(botonResena);
    } else {
        celda.textContent = "–";
    }
    return celda;
}

// data-etiqueta: en celulares cada fila se apila y esa etiqueta se muestra al lado del valor (CSS)
function crearCeldaHistorial(etiqueta, texto) {
    const celda = crearElemento("td", "", texto);
    celda.dataset.etiqueta = etiqueta;
    return celda;
}

function crearIconoHistorial(nombreIcono) {
    const icono = crearElemento("i", `bi ${nombreIcono}`);
    icono.setAttribute("aria-hidden", "true");
    return icono;
}

function crearEstadoVacioHistorial(titulo, texto) {
    const tarjeta = crearElemento("div", "card estadoVacio");
    const icono = crearElemento("span", "icono celeste");
    icono.append(crearIconoHistorial("bi-clock-history"));
    tarjeta.append(icono, crearElemento("h3", "", titulo), crearElemento("p", "", texto));
    return tarjeta;
}

// ----- Historial propio (pestaña del Panel de Control) -----
let historialPropioEnCurso = null;

// Siempre vuelve a pedir los datos (también lo llama clases.js después de aceptar, cancelar, etc.)
function cargarHistorialPropio() {
    const contenedor = document.getElementById("contenidoHistorialPanel");
    if (!contenedor) return Promise.resolve();

    historialPropioEnCurso = pedirHistorial(contenedor.dataset.idUsuario)
        .then(resultado => dibujarHistorial(contenedor, resultado, { esPanel: true }))
        .catch(error => {
            console.error(error);
            const errorCarga = crearElemento("div", "card estadoVacio");
            errorCarga.append(crearElemento("p", "", "No pudimos cargar tu historial. Probá de nuevo en unos minutos."));
            contenedor.replaceChildren(errorCarga);
        });
    return historialPropioEnCurso;
}

// El historial que ya está cargando o cargado; si todavía nadie lo pidió, lo pide. Sirve para resaltar una fila
// cuando se llega desde una notificación (la fila recién existe cuando termina el fetch).
function esperarHistorialPropio() {
    return historialPropioEnCurso || cargarHistorialPropio();
}

// ----- Historial de un perfil (modal) -----
let consultaHistorialPerfilVigente = 0;

function mostrarEstadoHistorialPerfil(texto, cargando) {
    const estado = document.getElementById("estadoHistorial");
    estado.hidden = false;
    estado.classList.toggle("cargando", cargando);
    estado.replaceChildren(...(cargando ? [crearIconoHistorial("bi-arrow-repeat"), ` ${texto}`] : [texto]));
}

function abrirHistorialDelPerfil() {
    document.getElementById("nombreHistorial").textContent = document.getElementById("nombrePerfil").textContent;
    document.getElementById("avisoHistorial").hidden = true;
    cargarHistorialDelPerfil();
    abrirDialogo("dialogoHistorial");
}

function cargarHistorialDelPerfil() {
    const contenedor = document.getElementById("contenidoHistorialPerfil");
    const idPerfil = document.getElementById("perfil").dataset.idPerfil;
    contenedor.replaceChildren();
    mostrarEstadoHistorialPerfil("Cargando historial…", true);

    // Si se cierra y se vuelve a abrir antes de que llegue la respuesta, solo vale la última consulta
    const consulta = ++consultaHistorialPerfilVigente;
    pedirHistorial(idPerfil)
        .then(resultado => {
            if (consulta !== consultaHistorialPerfilVigente) return;
            document.getElementById("estadoHistorial").hidden = true;
            dibujarHistorial(contenedor, resultado, { esPanel: false });
        })
        .catch(error => {
            console.error(error);
            if (consulta === consultaHistorialPerfilVigente) mostrarEstadoHistorialPerfil("No pudimos cargar el historial. Probá de nuevo en unos minutos.", false);
        });
}

// Al publicar una reseña (site.js: enviarResena) se vuelve a pedir el historial que se esté viendo: "Dar reseña"
// pasa a ser las estrellas. Dentro del modal el snackbar quedaría detrás (el diálogo está en la capa de arriba),
// así que ahí el aviso va dentro del mismo modal.
function actualizarHistorialTrasResena(evento) {
    if (document.getElementById("contenidoHistorialPanel")) cargarHistorialPropio();

    const dialogoHistorial = document.getElementById("dialogoHistorial");
    if (!dialogoHistorial?.open) return;
    cargarHistorialDelPerfil();
    const avisoHistorial = document.getElementById("avisoHistorial");
    avisoHistorial.textContent = evento.detail.mensaje;
    avisoHistorial.hidden = false;
}


// ================= INICIALIZACIÓN =================
function inicializarHistorial() {
    document.addEventListener("resenaPublicada", actualizarHistorialTrasResena);
    document.addEventListener("click", evento => {
        const boton = evento.target.closest("[data-no-se-dio]");
        if (boton && typeof abrirNoSeDio === "function") abrirNoSeDio(boton.dataset.idClase, boton.dataset.nombreOtro, boton.dataset.fechaTexto);
    });
    document.getElementById("botonHistorial")?.addEventListener("click", abrirHistorialDelPerfil);
    if (document.getElementById("contenidoHistorialPanel")) esperarHistorialPropio();
}

document.addEventListener("DOMContentLoaded", inicializarHistorial);
