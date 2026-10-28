// =====================================================================
// MiProfesor (MIP) - JavaScript global
// Cada módulo es una función independiente que se inicializa al final.
// Para agregar funciones nuevas: crear la función y sumarla a inicializarSitio().
//
// Bootstrap 6 es ESM y ya no expone window.bootstrap: sus componentes (drawer,
// dialog, menu, tabs, acordeón) funcionan solos con los atributos
// data-bs-* del HTML. Acá solo va la lógica propia de MIP.
// =====================================================================


// ================= UTILIDADES =================
// Los mensajes de error se muestran solos: el CSS oculta ".mensajeError:empty"
function mostrarMensaje(elementoMensaje, texto) {
    if (elementoMensaje) elementoMensaje.textContent = texto;
}

function mostrarErrorEnCampo(elementoMensaje, campo, texto) {
    mostrarMensaje(elementoMensaje, texto);
    // Si el campo es un <select data-buscable>, el foco va a su campo de texto visible
    const campoVisible = campo && campo.hidden && campo.nextElementSibling?.classList.contains("selectorBuscable")
        ? campo.nextElementSibling.querySelector("input")
        : campo;
    if (campoVisible) campoVisible.focus();
    return false;
}

// Quita tildes y mayúsculas para comparar textos ("Matemática" = "matematica")
function normalizarTexto(texto) {
    return (texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function correoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo);
}

// Crea un elemento con clases y texto (textContent: nunca interpreta HTML). Lo usan catalogo.js y clases.js
function crearElemento(etiqueta, clases, texto) {
    const elemento = document.createElement(etiqueta);
    if (clases) elemento.className = clases;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

// fetch que devuelve el JSON o falla si el servidor respondió con error (401, 404, 500...)
function pedirJson(url, opciones) {
    return fetch(url, opciones).then(respuesta => {
        if (!respuesta.ok) throw new Error(`Error ${respuesta.status} en ${url}`);
        return respuesta.json();
    });
}

// Snackbar del UI Kit: aviso corto abajo de la pantalla. tipo: "info" | "exito" | "error"
let temporizadorSnackbar = null;

function mostrarSnackbar(texto, tipo = "info") {
    const snackbar = document.getElementById("snackbar");
    if (!snackbar) return;

    snackbar.textContent = texto;
    snackbar.dataset.tipo = tipo;
    snackbar.hidden = false;
    // Se reinicia la animación aunque ya hubiera uno visible
    snackbar.classList.remove("visible");
    void snackbar.offsetWidth;
    snackbar.classList.add("visible");

    clearTimeout(temporizadorSnackbar);
    temporizadorSnackbar = setTimeout(() => {
        snackbar.classList.remove("visible");
        setTimeout(() => { snackbar.hidden = true; }, 300);
    }, 3200);
}


// ================= COMPONENTE: SELECTOR CON BÚSQUEDA =================
// Convierte cualquier <select data-buscable> (simple o "multiple") en un campo con una lista que se
// puede scrollear y que se va filtrando mientras se escribe. El <select> original queda oculto y
// sigue mandando: formularios y filtros leen su value / selectedOptions y escuchan su "change".
//   data-placeholder="..."  texto del campo vacío (si no, el de la opción con value="")
//   En el simple, la opción value="" ("Todas las materias", "Sin elegir") sirve para borrar la elección.
//   En el múltiple, lo elegido se muestra como etiquetas con una ✕ para quitarlo.
// Si las opciones cambian por JS, volver a llamar a crearSelectorBuscable(select).
let contadorSelectoresBuscables = 0;

function inicializarSelectoresBuscables() {
    document.querySelectorAll("select[data-buscable]").forEach(crearSelectorBuscable);
}

function crearSelectorBuscable(select) {
    // Ya estaba armado: solo se redibuja con las opciones nuevas
    if (select.actualizarSelectorBuscable) {
        select.actualizarSelectorBuscable();
        return;
    }

    const esMultiple = select.multiple;
    const idBase = select.id || `selectorBuscable${++contadorSelectoresBuscables}`;

    const selector = document.createElement("div");
    selector.className = esMultiple ? "selectorBuscable multiple" : "selectorBuscable";

    const etiquetasElegidas = document.createElement("div");
    etiquetasElegidas.className = "etiquetasElegidas";

    const campo = document.createElement("div");
    campo.className = "campoSelector";

    const entrada = document.createElement("input");
    entrada.type = "text";
    entrada.className = "form-control";
    entrada.id = `${idBase}Buscador`;
    entrada.autocomplete = "off";
    entrada.spellcheck = false;
    entrada.setAttribute("role", "combobox");
    entrada.setAttribute("aria-autocomplete", "list");
    entrada.setAttribute("aria-expanded", "false");
    entrada.setAttribute("aria-controls", `${idBase}Lista`);

    const botonDesplegar = document.createElement("button");
    botonDesplegar.type = "button";
    botonDesplegar.className = "desplegar";
    botonDesplegar.tabIndex = -1;
    botonDesplegar.setAttribute("aria-label", "Mostrar opciones");
    botonDesplegar.innerHTML = '<i class="bi bi-chevron-down" aria-hidden="true"></i>';

    const lista = document.createElement("ul");
    lista.className = "listaOpciones";
    lista.id = `${idBase}Lista`;
    lista.setAttribute("role", "listbox");
    if (esMultiple) lista.setAttribute("aria-multiselectable", "true");
    lista.hidden = true;

    campo.append(entrada, botonDesplegar);
    if (esMultiple) selector.append(etiquetasElegidas);
    selector.append(campo, lista);

    // La etiqueta del <select> pasa a apuntar al campo de texto
    const etiqueta = select.id ? document.querySelector(`label[for="${select.id}"]`) : null;
    if (etiqueta) etiqueta.htmlFor = entrada.id;

    select.hidden = true;
    select.tabIndex = -1;
    select.insertAdjacentElement("afterend", selector);

    let textoFiltro = "";
    let indiceActivo = -1;

    const textoPlaceholder = () => select.dataset.placeholder
        || Array.from(select.options).find(opcion => opcion.value === "")?.textContent
        || "Elegí una opción";
    const itemsDeLista = () => Array.from(lista.querySelectorAll("[role='option']"));
    const avisarCambio = () => select.dispatchEvent(new Event("change", { bubbles: true }));

    // Muestra lo elegido: texto en el campo (simple) o etiquetas (múltiple)
    const mostrarElegidas = () => {
        entrada.placeholder = textoPlaceholder();
        if (!esMultiple) {
            const elegida = select.selectedOptions[0];
            entrada.value = elegida && elegida.value !== "" ? elegida.textContent : "";
            return;
        }

        entrada.value = "";
        etiquetasElegidas.replaceChildren();
        Array.from(select.selectedOptions).filter(opcion => opcion.value !== "").forEach(opcion => {
            const etiquetaElegida = document.createElement("span");
            etiquetaElegida.className = "badge theme-accent";
            etiquetaElegida.textContent = opcion.textContent;

            const botonQuitar = document.createElement("button");
            botonQuitar.type = "button";
            botonQuitar.setAttribute("aria-label", `Quitar ${opcion.textContent}`);
            botonQuitar.innerHTML = '<i class="bi bi-x" aria-hidden="true"></i>';
            botonQuitar.addEventListener("click", () => {
                opcion.selected = false;
                mostrarElegidas();
                if (!lista.hidden) dibujarOpciones();
                avisarCambio();
            });

            etiquetaElegida.append(botonQuitar);
            etiquetasElegidas.append(etiquetaElegida);
        });
        etiquetasElegidas.hidden = etiquetasElegidas.children.length === 0;
    };

    const marcarActiva = nuevoIndice => {
        const items = itemsDeLista();
        if (items.length === 0) {
            indiceActivo = -1;
            entrada.removeAttribute("aria-activedescendant");
            return;
        }
        indiceActivo = Math.max(0, Math.min(nuevoIndice, items.length - 1));
        items.forEach((item, posicion) => item.classList.toggle("activa", posicion === indiceActivo));
        entrada.setAttribute("aria-activedescendant", items[indiceActivo].id);
        items[indiceActivo].scrollIntoView({ block: "nearest" });
    };

    const dibujarOpciones = () => {
        lista.replaceChildren();
        const filtro = normalizarTexto(textoFiltro);
        // La opción vacía ("Todas las materias") solo aparece en el simple y cuando no se está buscando
        const coincidencias = Array.from(select.options).filter(opcion =>
            !opcion.disabled
            && !(opcion.value === "" && (esMultiple || filtro !== ""))
            && normalizarTexto(opcion.textContent).includes(filtro));

        // Primero las que tienen una palabra que empieza con lo escrito ("ort" → "ORT" antes que "Northlands")
        if (filtro !== "") {
            const empiezaConElFiltro = opcion => normalizarTexto(opcion.textContent).split(/\s+/).some(palabra => palabra.startsWith(filtro));
            coincidencias.sort((opcionA, opcionB) => Number(empiezaConElFiltro(opcionB)) - Number(empiezaConElFiltro(opcionA)));
        }

        if (coincidencias.length === 0) {
            const sinCoincidencias = document.createElement("li");
            sinCoincidencias.className = "sinCoincidencias";
            sinCoincidencias.textContent = "No hay coincidencias";
            lista.append(sinCoincidencias);
            marcarActiva(-1);
            return;
        }

        coincidencias.forEach((opcion, posicion) => {
            const item = document.createElement("li");
            item.id = `${lista.id}Opcion${posicion}`;
            item.setAttribute("role", "option");
            item.setAttribute("aria-selected", String(opcion.selected));
            item.classList.toggle("vacia", opcion.value === "");
            item.textContent = opcion.textContent;
            if (opcion.selected && opcion.value !== "") {
                const tilde = document.createElement("i");
                tilde.className = "bi bi-check-lg";
                tilde.setAttribute("aria-hidden", "true");
                item.append(tilde);
            }
            // pointerdown no saca el foco del campo, así la lista no se cierra antes del click
            item.addEventListener("pointerdown", evento => evento.preventDefault());
            item.addEventListener("click", () => elegirOpcion(opcion));
            item.opcionDelSelect = opcion;
            lista.append(item);
        });

        const posicionElegida = coincidencias.findIndex(opcion => opcion.selected);
        marcarActiva(textoFiltro === "" && posicionElegida >= 0 ? posicionElegida : 0);
    };

    const abrir = () => {
        if (!lista.hidden) return;
        textoFiltro = "";
        lista.hidden = false;
        selector.classList.add("abierto");
        entrada.setAttribute("aria-expanded", "true");
        dibujarOpciones();
    };

    const cerrar = () => {
        if (lista.hidden) return;
        lista.hidden = true;
        selector.classList.remove("abierto");
        entrada.setAttribute("aria-expanded", "false");
        entrada.removeAttribute("aria-activedescendant");
        textoFiltro = "";
        mostrarElegidas();
    };

    const elegirOpcion = opcion => {
        if (esMultiple) {
            opcion.selected = !opcion.selected;
            textoFiltro = "";
            mostrarElegidas();
            dibujarOpciones();
        } else {
            select.value = opcion.value;
            cerrar();
            mostrarElegidas();
        }
        avisarCambio();
    };

    entrada.addEventListener("focus", () => {
        abrir();
        if (!esMultiple) entrada.select();
    });
    entrada.addEventListener("click", abrir);
    entrada.addEventListener("input", () => {
        abrir();
        textoFiltro = entrada.value;
        dibujarOpciones();
    });
    entrada.addEventListener("keydown", evento => {
        if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
            evento.preventDefault();
            if (lista.hidden) { abrir(); return; }
            marcarActiva(indiceActivo + (evento.key === "ArrowDown" ? 1 : -1));
        } else if (evento.key === "Enter") {
            if (lista.hidden) return;
            evento.preventDefault();
            const item = itemsDeLista()[indiceActivo];
            if (item) elegirOpcion(item.opcionDelSelect);
        } else if (evento.key === "Escape") {
            if (lista.hidden) return;
            // Dentro de un diálogo, Escape cierra la lista y no el diálogo
            evento.preventDefault();
            evento.stopPropagation();
            cerrar();
        } else if (evento.key === "Tab") {
            cerrar();
        } else if (evento.key === "Backspace" && esMultiple && entrada.value === "") {
            const ultimaElegida = Array.from(select.selectedOptions).filter(opcion => opcion.value !== "").pop();
            if (!ultimaElegida) return;
            ultimaElegida.selected = false;
            mostrarElegidas();
            dibujarOpciones();
            avisarCambio();
        }
    });
    entrada.addEventListener("blur", cerrar);

    botonDesplegar.addEventListener("pointerdown", evento => evento.preventDefault());
    botonDesplegar.addEventListener("click", () => {
        if (lista.hidden) {
            entrada.focus();
            abrir();
        } else {
            cerrar();
        }
    });

    // El botón "Limpiar" de un formulario vuelve el <select> a su estado inicial: se redibuja después
    select.form?.addEventListener("reset", () => setTimeout(mostrarElegidas, 0));

    select.actualizarSelectorBuscable = () => {
        mostrarElegidas();
        if (!lista.hidden) dibujarOpciones();
    };
    mostrarElegidas();
}


// ================= AVISO "CUENTA NO VERIFICADA" (debajo del header) =================
// Se puede cerrar hasta la próxima sesión: se recuerda en sessionStorage y se olvida al cerrar sesión.
function inicializarAvisoVerificacion() {
    document.querySelectorAll("form[action*='CerrarSesion']").forEach(formulario => {
        formulario.addEventListener("submit", () => {
            try { sessionStorage.removeItem("avisoVerificacionCerrado"); } catch (error) { /* sin sessionStorage */ }
        });
    });

    const avisoVerificacion = document.getElementById("avisoVerificacion");
    if (!avisoVerificacion) return;

    let estaCerrado = false;
    try { estaCerrado = sessionStorage.getItem("avisoVerificacionCerrado") === "true"; } catch (error) { /* sin sessionStorage */ }
    avisoVerificacion.hidden = estaCerrado;

    document.getElementById("botonCerrarAvisoVerificacion").addEventListener("click", () => {
        avisoVerificacion.hidden = true;
        try { sessionStorage.setItem("avisoVerificacionCerrado", "true"); } catch (error) { /* sin sessionStorage */ }
    });
}

// ================= INICIO: validación del buscador =================
// Se llama desde onsubmit del formulario. El envío va a Catalogo?busqueda=...
function validarBusqueda() {
    const campoBusqueda = document.getElementById("campoBusqueda");
    const mensajeErrorBusqueda = document.getElementById("mensajeErrorBusqueda");
    const textoBuscado = campoBusqueda.value.trim();

    if (textoBuscado === "") {
        return mostrarErrorEnCampo(mensajeErrorBusqueda, campoBusqueda, "Escribí una materia, un profesor o un colegio para buscar.");
    }
    if (textoBuscado.length < 2) {
        return mostrarErrorEnCampo(mensajeErrorBusqueda, campoBusqueda, "La búsqueda debe tener al menos 2 caracteres.");
    }

    mostrarMensaje(mensajeErrorBusqueda, "");
    return true;
}

function inicializarBuscador() {
    const campoBusqueda = document.getElementById("campoBusqueda");
    const mensajeErrorBusqueda = document.getElementById("mensajeErrorBusqueda");
    if (!campoBusqueda || !mensajeErrorBusqueda) return;

    // Oculta el error apenas el usuario vuelve a escribir
    campoBusqueda.addEventListener("input", () => mostrarMensaje(mensajeErrorBusqueda, ""));

    // TODO BD: sugerencias en vivo cuando exista el endpoint (ej: Home/SugerirMaterias?texto=...)
}


// ================= REGISTRO =================
// Muestra el panel ilustrado que corresponde al rol elegido (data-solo-rol)
function inicializarRolesDeRegistro() {
    const formularioRegistro = document.getElementById("formularioRegistro");
    if (!formularioRegistro) return;

    const mostrarPanelDelRol = () => {
        const rolElegido = formularioRegistro.querySelector("input[name='tipoUsuario']:checked").value;
        document.querySelectorAll("[data-solo-rol]").forEach(panel => {
            panel.hidden = panel.dataset.soloRol !== rolElegido;
        });
    };

    formularioRegistro.querySelectorAll("input[name='tipoUsuario']").forEach(radio => radio.addEventListener("change", mostrarPanelDelRol));
    mostrarPanelDelRol();
}

// Botón del ojo: alterna entre ocultar y mostrar la contraseña
function inicializarVerContrasena() {
    document.querySelectorAll("[data-ver-contrasena]").forEach(boton => {
        const campo = document.getElementById(boton.dataset.verContrasena);
        if (!campo) return;

        boton.addEventListener("click", () => {
            const seMuestra = campo.type === "password";
            campo.type = seMuestra ? "text" : "password";
            boton.setAttribute("aria-pressed", String(seMuestra));
            boton.setAttribute("aria-label", seMuestra ? "Ocultar contraseña" : "Mostrar contraseña");
            boton.querySelector(".bi").className = seMuestra ? "bi bi-eye-slash" : "bi bi-eye";
        });
    });
}

function validarRegistro() {
    const mensajeRegistro = document.getElementById("mensajeRegistro");
    const campo = id => document.getElementById(id);

    if (campo("registroNombre").value.trim().length < 2) return mostrarErrorEnCampo(mensajeRegistro, campo("registroNombre"), "Ingresá tu nombre.");
    if (campo("registroApellido").value.trim().length < 2) return mostrarErrorEnCampo(mensajeRegistro, campo("registroApellido"), "Ingresá tu apellido.");
    if (!correoValido(campo("registroCorreo").value.trim())) return mostrarErrorEnCampo(mensajeRegistro, campo("registroCorreo"), "Ingresá un correo electrónico válido.");
    if (campo("registroContrasena").value.length < 8) return mostrarErrorEnCampo(mensajeRegistro, campo("registroContrasena"), "La contraseña debe tener al menos 8 caracteres.");
    if (!fechaNacimientoValida(campo("registroFechaNacimiento").value)) return mostrarErrorEnCampo(mensajeRegistro, campo("registroFechaNacimiento"), "Ingresá una fecha de nacimiento válida.");
    if (!campo("registroTerminos").checked) return mostrarErrorEnCampo(mensajeRegistro, campo("registroTerminos"), "Tenés que aceptar los términos para continuar.");

    mostrarMensaje(mensajeRegistro, "");
    return true;
}

function fechaNacimientoValida(valor) {
    if (valor === "") return false;
    const fecha = new Date(valor + "T00:00:00");
    return !isNaN(fecha) && fecha <= new Date() && fecha.getFullYear() >= 1900;
}


// ================= INICIO DE SESIÓN =================
function validarIngreso() {
    const mensajeIngreso = document.getElementById("mensajeIngreso");
    const campoCorreo = document.getElementById("ingresoCorreo");
    const campoContrasena = document.getElementById("ingresoContrasena");

    if (!correoValido(campoCorreo.value.trim())) return mostrarErrorEnCampo(mensajeIngreso, campoCorreo, "Ingresá un correo electrónico válido.");
    if (campoContrasena.value === "") return mostrarErrorEnCampo(mensajeIngreso, campoContrasena, "Ingresá tu contraseña.");

    mostrarMensaje(mensajeIngreso, "");
    return true;
}


// ================= SOPORTE: buscador de preguntas frecuentes =================
function inicializarBuscadorDeAyuda() {
    const campoAyuda = document.getElementById("campoAyuda");
    const preguntas = document.querySelectorAll("#acordeonPreguntas details");
    if (!campoAyuda || preguntas.length === 0) return;

    const mensajeAyuda = document.getElementById("mensajeAyuda");
    const sinCoincidencias = document.getElementById("sinCoincidencias");

    campoAyuda.addEventListener("input", () => {
        const textoBuscado = normalizarTexto(campoAyuda.value);
        let cantidadVisible = 0;

        preguntas.forEach(pregunta => {
            const coincide = textoBuscado === "" || normalizarTexto(pregunta.textContent).includes(textoBuscado);
            pregunta.hidden = !coincide;
            if (coincide) cantidadVisible++;
        });

        sinCoincidencias.hidden = cantidadVisible > 0;
        mostrarMensaje(mensajeAyuda, textoBuscado === "" ? "" : `${cantidadVisible} ${cantidadVisible === 1 ? "pregunta encontrada" : "preguntas encontradas"}.`);
    });
}

// Enter o la lupa: baja a las preguntas y abre la primera que coincide
function verPreguntasDeAyuda() {
    const primeraVisible = document.querySelector("#acordeonPreguntas details:not([hidden])");
    if (primeraVisible) primeraVisible.open = true;
    document.getElementById("seccionPreguntas").scrollIntoView();
    return false;
}

function validarContacto() {
    const mensajeContacto = document.getElementById("mensajeContacto");
    const exitoContacto = document.getElementById("exitoContacto");
    const campo = id => document.getElementById(id);
    exitoContacto.hidden = true;

    if (campo("contactoNombre").value.trim().length < 3) return mostrarErrorEnCampo(mensajeContacto, campo("contactoNombre"), "Ingresá tu nombre completo.");
    if (!correoValido(campo("contactoCorreo").value.trim())) return mostrarErrorEnCampo(mensajeContacto, campo("contactoCorreo"), "Ingresá un correo electrónico válido.");
    if (campo("contactoTipo").value === "") return mostrarErrorEnCampo(mensajeContacto, campo("contactoTipo"), "Elegí el tipo de consulta.");
    if (campo("contactoMensaje").value.trim().length < 10) return mostrarErrorEnCampo(mensajeContacto, campo("contactoMensaje"), "Contanos un poco más (mínimo 10 caracteres).");

    mostrarMensaje(mensajeContacto, "");
    // TODO BD: guardar la consulta (BD.guardarConsulta) o enviarla por correo desde el servidor
    exitoContacto.hidden = false;
    document.getElementById("formularioContacto").reset();
    return false;
}


// ================= PANEL DE CONTROL =================
// Los accesos rápidos (data-abrir-tab="tabChat") activan la pestaña con ese id. El chat está en chat.js.
function inicializarAccesosDelPanel() {
    document.querySelectorAll("[data-abrir-tab]").forEach(acceso => {
        acceso.addEventListener("click", () => {
            const idPestana = acceso.dataset.abrirTab;
            document.getElementById(idPestana.replace(/^tab/, "botonTab"))?.click();
        });
    });
}


// ================= DIÁLOGOS: el fondo solo cierra si el clic empezó y terminó en el fondo =================
// Bootstrap cierra el <dialog> en el "click" cuyo objetivo es el propio <dialog> (el fondo). Si se aprieta dentro del
// contenido y se suelta en el fondo, el navegador manda ese click al <dialog> y se cerraba. Acá se corta ese click.
function inicializarCierreDeDialogos() {
    let apretoEnElFondo = false;
    document.addEventListener("pointerdown", evento => {
        apretoEnElFondo = evento.target instanceof HTMLDialogElement;
    }, true);
    document.addEventListener("click", evento => {
        if (evento.target instanceof HTMLDialogElement && !apretoEnElFondo) evento.stopPropagation();
    }, true);
}


// ================= PERFIL =================
// La vista Home/Perfil solo trae el esqueleto: los datos llegan por fetch desde PerfilesController.
// Los textos de la BD se ponen con textContent. La única excepción es "Sobre mí", que es HTML del
// editor y llega limpio desde el servidor (HtmlSanitizer solo deja negrita, listas, enlaces, etc.).
const nombresDeTipoUsuario = { alumno: "Alumno", profesor: "Profesor", admin: "Administrador" };
const largoMaximoDescripcion = 1000;
const pesoMaximoFoto = 5 * 1024 * 1024;
const ladoFotoPerfil = 256;
const tiposDeFotoPermitidos = ["image/jpeg", "image/png", "image/webp"];
const anioMinimoEscuela = 1950;
// Lo mismo que revisa el SP guardarPerfilCompleto (código 3)
const materiasMaximas = 10;
const colegiosMaximos = 5;

let editorDescripcion = null;
let opcionesPerfilCargadas = null;
let urlVistaPreviaFoto = null;
// Foto de perfil ya recortada en el navegador (WEBP 256x256, igual que la guarda el servidor): es lo que se sube al guardar
let fotoPerfilRecortada = null;
let recortadorFoto = null;
let edicionYaAbiertaSola = false;
// Profesores: año desde el que da clase en cada colegio elegido, por id de colegio ({ "20": "2015" })
let aniosDeEscuelas = {};

function inicializarPerfil() {
    const seccionPerfil = document.getElementById("perfil");
    if (!seccionPerfil) return;

    cargarPerfil();
    inicializarCopiarEnlacePerfil();
    inicializarBotonesProximamente();
    inicializarMeGusta();
    inicializarAmistad();
    inicializarEdicionPerfil();
}

function esPerfilPropio() {
    return document.getElementById("perfil").dataset.perfilPropio === "true";
}

function cargarPerfil() {
    const seccionPerfil = document.getElementById("perfil");
    const estadoPerfil = document.getElementById("estadoPerfil");

    pedirJson(`/Perfiles/ObtenerPerfil/${seccionPerfil.dataset.idPerfil}`)
        .then(perfil => {
            estadoPerfil.hidden = true;
            if (perfil.codigo != 0) {
                mostrarContenidoCargado(document.getElementById("perfilInexistente"));
                return;
            }
            mostrarPerfil(perfil);
            if (esPerfilPropio()) cargarAvisoVerificacionPerfil();
        })
        .catch(error => {
            console.error(error);
            estadoPerfil.textContent = "No pudimos cargar el perfil. Revisá tu conexión y recargá la página.";
        });
}

function mostrarPerfil(perfil) {
    const nombreCompleto = `${perfil.nombre} ${perfil.apellido}`;
    document.title = `${nombreCompleto} | MiProfesor (MIP)`;

    pintarAvatar(document.getElementById("avatarPerfil"), perfil.nombre, perfil.apellido, perfil.fotoPerfil);
    document.getElementById("tipoPerfil").textContent = nombresDeTipoUsuario[perfil.tipoUsuario] || "Usuario";
    document.getElementById("nombrePerfil").textContent = nombreCompleto;
    document.getElementById("tickPerfil").hidden = !perfil.verificado;
    document.getElementById("estadoVerificadoPerfil").hidden = !perfil.verificado;
    document.getElementById("datosTitularPerfil").replaceChildren(...crearDatosTitular(perfil));

    // "Pedir clase" solo tiene sentido en el perfil de un profesor
    document.querySelectorAll("[data-solo-profesor]").forEach(boton => {
        boton.hidden = perfil.tipoUsuario !== "profesor";
        boton.dataset.nombreProfesor = nombreCompleto;
    });
    document.querySelectorAll("#perfil [data-dar-resena]").forEach(boton => { boton.dataset.nombreUsuario = nombreCompleto; });

    mostrarCifrasPerfil(perfil);
    mostrarDescripcionPerfil(perfil.descripcion);
    mostrarResenasPerfil(perfil.resenas);
    mostrarDatosPerfil(perfil);
    mostrarContenidoCargado(document.getElementById("contenidoPerfil"));

    // Desde el aviso "Completar mis datos" se llega con ?editar=true: el modal se abre solo una vez
    const botonEditar = document.querySelector("button[data-abrir-edicion]");
    if (document.getElementById("perfil").dataset.editarAlCargar === "true" && !edicionYaAbiertaSola && botonEditar) {
        edicionYaAbiertaSola = true;
        botonEditar.click();
    }
}

function mostrarContenidoCargado(contenido) {
    contenido.hidden = false;
}

// Foto de perfil o, si no tiene, la primera letra del nombre y del apellido
function pintarAvatar(avatar, nombre, apellido, fotoPerfil) {
    avatar.replaceChildren();
    if (fotoPerfil) {
        const foto = document.createElement("img");
        foto.src = fotoPerfil;
        foto.alt = `Foto de perfil de ${nombre} ${apellido}`;
        avatar.append(foto);
        return;
    }
    avatar.textContent = ((nombre || "").charAt(0) + (apellido || "").charAt(0)).toUpperCase() || "?";
}

// "Colegio Nacional de Buenos Aires y 2 más · Miembro desde octubre de 2026"
function crearDatosTitular(perfil) {
    const partes = [];
    if (perfil.colegios) {
        const lista = perfil.colegios.split(", ");
        const colegios = lista.length > 1 ? `${lista[0]} y ${lista.length - 1} más` : lista[0];
        partes.push(crearDatoConIcono("bi-building", colegios));
    }
    const fechaInscripcion = new Date(perfil.fechaInscripcion).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    partes.push(crearDatoConIcono("bi-calendar3", `Miembro desde ${fechaInscripcion}`));
    return partes;
}

function crearDatoConIcono(icono, texto) {
    const dato = document.createElement("span");
    const iconoDato = document.createElement("i");
    iconoDato.className = `bi ${icono}`;
    iconoDato.setAttribute("aria-hidden", "true");
    dato.append(iconoDato, ` ${texto}`);
    return dato;
}

function mostrarCifrasPerfil(perfil) {
    const cifrasPerfil = document.getElementById("cifrasPerfil");
    cifrasPerfil.replaceChildren();

    const calificacion = perfil.cantidadResenas > 0 && perfil.calificacion !== null
        ? perfil.calificacion.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : "–";
    const textoResenas = perfil.cantidadResenas === 1 ? "1 reseña" : `${perfil.cantidadResenas} reseñas`;
    cifrasPerfil.append(crearCifraPerfil("bi-star-fill", calificacion, textoResenas));
    cifrasPerfil.append(crearCifraPerfil("bi-heart-fill", perfil.cantidadLikes, "me gusta", "cantidadLikesPerfil"));

    // Amigos: la cifra es un botón que abre la lista
    const cifraAmigos = crearCifraPerfil("bi-people-fill", perfil.cantidadAmigos, perfil.cantidadAmigos === 1 ? "amigo" : "amigos", "cantidadAmigosPerfil");
    const botonAmigos = crearElemento("button", "botonCifra");
    botonAmigos.type = "button";
    botonAmigos.setAttribute("aria-haspopup", "dialog");
    botonAmigos.append(...cifraAmigos.childNodes);
    botonAmigos.addEventListener("click", abrirAmigosDelPerfil);
    cifraAmigos.append(botonAmigos);
    cifrasPerfil.append(cifraAmigos);

    // En la base, un profesor sin precio queda con 0
    if (perfil.tipoUsuario === "profesor") {
        const precio = perfil.precioHora > 0 ? `$ ${perfil.precioHora.toLocaleString("es-AR")}` : "Sin precio";
        cifrasPerfil.append(crearCifraPerfil("bi-cash-coin", precio, "por hora"));
    }
}

function crearCifraPerfil(icono, valor, detalle, idValor) {
    const cifra = document.createElement("li");
    const iconoCifra = document.createElement("i");
    iconoCifra.className = `bi ${icono}`;
    iconoCifra.setAttribute("aria-hidden", "true");
    const valorCifra = document.createElement("strong");
    valorCifra.textContent = valor;
    if (idValor) valorCifra.id = idValor;
    const detalleCifra = document.createElement("span");
    detalleCifra.textContent = detalle;
    cifra.append(iconoCifra, valorCifra, detalleCifra);
    return cifra;
}

function mostrarDescripcionPerfil(descripcion) {
    const descripcionPerfil = document.getElementById("descripcionPerfil");
    if (descripcion) {
        descripcionPerfil.classList.remove("vacio");
        // HTML limpiado en el servidor (PerfilesController.ObtenerPerfil)
        descripcionPerfil.innerHTML = descripcion;
        descripcionPerfil.querySelectorAll("a").forEach(enlace => {
            enlace.target = "_blank";
            enlace.rel = "noopener noreferrer nofollow";
        });
        return;
    }
    descripcionPerfil.classList.add("vacio");
    descripcionPerfil.textContent = esPerfilPropio()
        ? "Todavía no escribiste nada sobre vos. Tocá «Editar perfil» para contarle a los demás quién sos."
        : "Todavía no escribió una descripción.";
}

function mostrarResenasPerfil(resenas) {
    const resenasPerfil = document.getElementById("resenasPerfil");
    resenasPerfil.replaceChildren();

    if (resenas.length === 0) {
        const sinResenas = document.createElement("p");
        sinResenas.className = "vacio";
        sinResenas.textContent = "Todavía no tiene reseñas.";
        resenasPerfil.append(sinResenas);
        return;
    }

    resenas.forEach(resena => {
        const tarjetaResena = document.createElement("div");
        tarjetaResena.className = "resena";

        // El nombre de quien escribió la reseña lleva a su perfil
        const autorResena = document.createElement("a");
        autorResena.href = `/Home/Perfil/${resena.idEmisor}`;
        autorResena.textContent = `${resena.nombre} ${resena.apellido}`;
        if (resena.verificadoEmisor) autorResena.append(" ", crearTickVerificado());

        const estrellas = document.createElement("span");
        estrellas.className = "estrellas";
        estrellas.setAttribute("aria-label", `${resena.puntuacion} de 5 estrellas`);
        for (let posicion = 1; posicion <= 5; posicion++) {
            const estrella = document.createElement("i");
            estrella.className = posicion <= resena.puntuacion ? "bi bi-star-fill" : "bi bi-star";
            estrella.setAttribute("aria-hidden", "true");
            estrellas.append(estrella);
        }

        const encabezadoResena = document.createElement("header");
        encabezadoResena.append(autorResena, estrellas);
        tarjetaResena.append(encabezadoResena);

        if (resena.descripcion) {
            const textoResena = document.createElement("p");
            textoResena.textContent = resena.descripcion;
            tarjetaResena.append(textoResena);
        }
        resenasPerfil.append(tarjetaResena);
    });
}

function crearTickVerificado() {
    const tick = document.createElement("i");
    tick.className = "bi bi-patch-check-fill tickVerificado";
    tick.title = "Cuenta verificada";
    tick.setAttribute("aria-label", "Cuenta verificada");
    return tick;
}

// Grupos de etiquetas: los profesores muestran materias, modalidades y títulos además de niveles y colegios
function mostrarDatosPerfil(perfil) {
    const datosPerfil = document.getElementById("datosPerfil");
    datosPerfil.replaceChildren();

    // Las listas llegan como texto: "Física, Química"
    const lista = texto => texto ? texto.split(", ") : [];
    const gruposDeDatos = perfil.tipoUsuario === "profesor"
        ? [["Materias", "bi-book", lista(perfil.materias)], ["Niveles", "bi-mortarboard", lista(perfil.niveles)], ["Modalidad", "bi-laptop", lista(perfil.modalidades)], ["Colegios", "bi-building", lista(perfil.colegios)], ["Títulos", "bi-award", perfil.titulos]]
        : [["Colegio", "bi-building", lista(perfil.colegios)], ["Nivel", "bi-mortarboard", lista(perfil.niveles)]];

    const gruposConDatos = gruposDeDatos.filter(([, , valores]) => valores.length > 0);
    if (gruposConDatos.length === 0) {
        const sinDatos = document.createElement("p");
        sinDatos.className = "vacio";
        sinDatos.textContent = perfil.tipoUsuario === "profesor"
            ? "Todavía no cargó sus materias, niveles ni colegios."
            : "Todavía no cargó su colegio ni su nivel.";
        datosPerfil.append(sinDatos);
        return;
    }

    gruposConDatos.forEach(([tituloGrupo, icono, valores]) => {
        const grupo = document.createElement("div");
        grupo.className = "grupo";
        const tituloDelGrupo = document.createElement("h3");
        tituloDelGrupo.append(crearDatoConIcono(icono, tituloGrupo));
        const etiquetas = document.createElement("div");
        etiquetas.className = "etiquetas";
        valores.forEach(valor => {
            const etiqueta = document.createElement("span");
            etiqueta.className = tituloGrupo === "Materias" ? "badge theme-accent" : "badge badge-subtle theme-inverse";
            etiqueta.textContent = valor;
            etiquetas.append(etiqueta);
        });
        grupo.append(tituloDelGrupo, etiquetas);
        datosPerfil.append(grupo);
    });
}

// ----- Aviso de verificación dentro del perfil propio -----
function cargarAvisoVerificacionPerfil() {
    pedirJson("/Perfiles/ObtenerDatosEdicion")
        .then(datos => mostrarAvisoVerificacionPerfil(datos.verificado, datos.faltantes))
        .catch(error => console.error(error));
}

function mostrarAvisoVerificacionPerfil(verificado, faltantes) {
    const avisoPerfil = document.getElementById("avisoVerificacionPerfil");
    if (!avisoPerfil) return;

    avisoPerfil.hidden = verificado || faltantes.length === 0;
    const listaFaltantes = document.getElementById("faltantesPerfil");
    listaFaltantes.replaceChildren(...faltantes.map(faltante => {
        const itemFaltante = document.createElement("li");
        itemFaltante.textContent = faltante.charAt(0).toUpperCase() + faltante.slice(1);
        return itemFaltante;
    }));
}

// ----- Copiar enlace y botones sociales -----

// Copia la URL pública del perfil (/Home/Perfil/{id}), también cuando se entra a "Mi perfil" sin ID
function inicializarCopiarEnlacePerfil() {
    const botonCopiarEnlace = document.getElementById("botonCopiarEnlace");
    if (!botonCopiarEnlace) return;

    const enlacePerfil = `${window.location.origin}/Home/Perfil/${document.getElementById("perfil").dataset.idPerfil}`;
    botonCopiarEnlace.addEventListener("click", () => {
        navigator.clipboard.writeText(enlacePerfil)
            .then(() => mostrarSnackbar("¡Enlace copiado! Ya lo podés compartir.", "exito"))
            .catch(() => window.prompt("Copiá el enlace del perfil:", enlacePerfil));
    });
}

// Reportar todavía no hace nada (Pedir clase está en clases.js y Mensaje lleva al chat del Panel)
function inicializarBotonesProximamente() {
    const haySesion = document.getElementById("perfil").dataset.haySesion === "true";

    document.querySelectorAll("[data-proximamente]").forEach(boton => {
        boton.addEventListener("click", evento => {
            evento.preventDefault();
            if (!haySesion) {
                window.location.href = "/Sesion/IniciarSesion";
                return;
            }
            mostrarSnackbar(`«${boton.dataset.proximamente}» va a estar disponible muy pronto.`);
        });
    });
}

// ----- Me gusta (LikesController: fetch) -----
const coloresExplosionLike = ["#FF5757", "#5CE1E6", "#D51F47", "#FFB4B4"];

function inicializarMeGusta() {
    const botonMeGusta = document.getElementById("botonMeGusta");
    if (!botonMeGusta) return;

    const seccionPerfil = document.getElementById("perfil");
    const idPerfil = seccionPerfil.dataset.idPerfil;
    const haySesion = seccionPerfil.dataset.haySesion === "true";

    // Si ya le diste me gusta, el corazón arranca lleno (sin sesión no hay nada que averiguar).
    // Si hacés clic antes de que llegue esta respuesta, se ignora para no pisar el estado nuevo.
    let respuestaInicialVigente = true;
    if (haySesion) {
        pedirJson(`/Likes/ObtenerLike/${idPerfil}`)
            .then(resultado => {
                if (respuestaInicialVigente) pintarEstadoMeGusta(botonMeGusta, resultado.leGusta);
            })
            .catch(error => console.error(error));
    }

    botonMeGusta.addEventListener("click", () => {
        if (!haySesion) {
            window.location.href = "/Sesion/IniciarSesion";
            return;
        }
        respuestaInicialVigente = false;
        alternarMeGusta(botonMeGusta, idPerfil);
    });
}

function alternarMeGusta(botonMeGusta, idPerfil) {
    // Mientras viaja el pedido el botón queda bloqueado: dos clics seguidos no se pisan
    botonMeGusta.disabled = true;
    const token = document.querySelector("#perfil input[name='__RequestVerificationToken']");
    const datos = new URLSearchParams({ idReceptor: idPerfil });

    pedirJson("/Likes/AlternarLike", {
        method: "POST",
        headers: { "RequestVerificationToken": token ? token.value : "" },
        body: datos
    })
        .then(resultado => {
            pintarEstadoMeGusta(botonMeGusta, resultado.leGusta);
            actualizarCantidadLikes(resultado.cantidadLikes);
            animarMeGusta(botonMeGusta, resultado.leGusta);
        })
        .catch(error => {
            console.error(error);
            mostrarSnackbar("No pudimos guardar tu me gusta. Probá de nuevo.", "error");
        })
        .finally(() => { botonMeGusta.disabled = false; });
}

function pintarEstadoMeGusta(botonMeGusta, leGusta) {
    botonMeGusta.classList.toggle("activo", leGusta);
    botonMeGusta.setAttribute("aria-pressed", leGusta ? "true" : "false");
    const icono = botonMeGusta.querySelector(".bi");
    icono.classList.toggle("bi-heart-fill", leGusta);
    icono.classList.toggle("bi-heart", !leGusta);
}

function actualizarCantidadLikes(cantidadLikes) {
    const cantidad = document.getElementById("cantidadLikesPerfil");
    if (!cantidad) return;
    cantidad.textContent = cantidadLikes;
    cantidad.classList.remove("rebote");
    void cantidad.offsetWidth;
    cantidad.classList.add("rebote");
}

// ----- Amigos (AmigosController: fetch) -----
// El botón muestra cómo están los dos y qué pasa al tocarlo. accion: enviar (manda o acepta) | quitar (cancela o deja de ser amigo)
const estadosBotonAmistad = {
    ninguna: { icono: "bi-person-plus", texto: "Agregar amigo", accion: "enviar" },
    enviada: { icono: "bi-person-check", texto: "Solicitud enviada", accion: "quitar", titulo: "Tocá para cancelar la solicitud" },
    recibida: { icono: "bi-person-plus-fill", texto: "Aceptar solicitud", accion: "enviar" },
    amigos: { icono: "bi-people-fill", texto: "Amigos", accion: "quitar", titulo: "Tocá para quitar de tus amigos" }
};

function inicializarAmistad() {
    const botonAmistad = document.getElementById("botonAmistad");
    if (!botonAmistad) return;

    const seccionPerfil = document.getElementById("perfil");
    const idPerfil = seccionPerfil.dataset.idPerfil;
    const haySesion = seccionPerfil.dataset.haySesion === "true";

    if (haySesion) {
        pedirJson(`/Amigos/Estado/${idPerfil}`)
            .then(resultado => pintarBotonAmistad(botonAmistad, resultado.estadoAmistad))
            .catch(error => console.error(error));
    }

    botonAmistad.addEventListener("click", () => {
        if (!haySesion) {
            window.location.href = "/Sesion/IniciarSesion";
            return;
        }
        // Dejar de ser amigos se confirma; lo demás se puede deshacer con el mismo botón
        if (botonAmistad.dataset.estadoAmistad === "amigos") {
            document.getElementById("dialogoQuitarAmigo").showModal();
            return;
        }
        cambiarAmistad(estadosBotonAmistad[botonAmistad.dataset.estadoAmistad].accion);
    });

    document.getElementById("botonConfirmarQuitarAmigo").addEventListener("click", () => {
        document.getElementById("dialogoQuitarAmigo").close();
        cambiarAmistad("quitar");
    });
}

function cambiarAmistad(accion) {
    const botonAmistad = document.getElementById("botonAmistad");
    const token = document.querySelector("#perfil input[name='__RequestVerificationToken']");
    botonAmistad.disabled = true;

    pedirJson("/Amigos/Cambiar", {
        method: "POST",
        headers: { "RequestVerificationToken": token ? token.value : "" },
        body: new URLSearchParams({ idOtroUsuario: document.getElementById("perfil").dataset.idPerfil, accion: accion })
    })
        .then(resultado => {
            if (resultado.codigo == 0) {
                mostrarCambioDeAmistad(botonAmistad, accion, resultado);
            } else if (accion === "enviar" && resultado.codigo == 1) {
                mostrarSnackbar("No podés agregarte a vos mismo.", "error");
            } else if (accion === "enviar" && resultado.codigo == 2) {
                mostrarSnackbar("Este perfil ya no existe.", "error");
            } else {
                mostrarSnackbar("Algo cambió mientras tanto. Recargá la página.", "error");
            }
        })
        .catch(error => {
            console.error(error);
            mostrarSnackbar("No pudimos guardar el cambio. Probá de nuevo.", "error");
        })
        .finally(() => { botonAmistad.disabled = false; });
}

function mostrarCambioDeAmistad(botonAmistad, accion, resultado) {
    pintarBotonAmistad(botonAmistad, resultado.estadoAmistad);
    actualizarCantidadAmigos(resultado.cantidadAmigos);
    const avisos = { enviada: "Le mandaste una solicitud de amistad.", amigos: "¡Ahora son amigos!" };
    if (avisos[resultado.estadoAmistad]) mostrarSnackbar(avisos[resultado.estadoAmistad], "exito");
    // Aceptar acá resuelve la notificación de la solicitud: la insignia del header se pone al día
    if (accion === "enviar" && resultado.estadoAmistad === "amigos") {
        pedirJson("/Notificaciones/Contar")
            .then(contador => actualizarInsigniaDeNotificaciones(contador.cantidad))
            .catch(error => console.error(error));
    }
}

function pintarBotonAmistad(botonAmistad, estadoAmistad) {
    const estado = estadosBotonAmistad[estadoAmistad] || estadosBotonAmistad.ninguna;
    botonAmistad.dataset.estadoAmistad = estadoAmistad in estadosBotonAmistad ? estadoAmistad : "ninguna";
    botonAmistad.classList.toggle("principal", estadoAmistad === "recibida");
    botonAmistad.classList.toggle("contorno", estadoAmistad !== "recibida");
    botonAmistad.querySelector(".bi").className = `bi ${estado.icono}`;
    botonAmistad.querySelector("span").textContent = estado.texto;
    if (estado.titulo) botonAmistad.title = estado.titulo;
    else botonAmistad.removeAttribute("title");
}

function actualizarCantidadAmigos(cantidadAmigos) {
    const cantidad = document.getElementById("cantidadAmigosPerfil");
    if (!cantidad) return;
    cantidad.textContent = cantidadAmigos;
    cantidad.nextElementSibling.textContent = cantidadAmigos === 1 ? "amigo" : "amigos";
    cantidad.classList.remove("rebote");
    void cantidad.offsetWidth;
    cantidad.classList.add("rebote");
}

// Lista de amigos del perfil (modal #dialogoAmigos)
function abrirAmigosDelPerfil() {
    const listaAmigos = document.getElementById("listaAmigos");
    const estadoAmigos = document.getElementById("estadoAmigos");
    document.getElementById("nombreAmigos").textContent = document.getElementById("nombrePerfil").textContent;
    listaAmigos.replaceChildren();
    estadoAmigos.hidden = false;
    estadoAmigos.textContent = "Cargando amigos…";
    document.getElementById("dialogoAmigos").showModal();

    pedirJson(`/Amigos/Lista/${document.getElementById("perfil").dataset.idPerfil}`)
        .then(amigos => {
            estadoAmigos.hidden = amigos.length > 0;
            estadoAmigos.textContent = "Todavía no tiene amigos en MIP.";
            listaAmigos.replaceChildren(...amigos.map(crearItemAmigo));
        })
        .catch(error => {
            console.error(error);
            estadoAmigos.textContent = "No pudimos cargar los amigos. Probá de nuevo en unos minutos.";
        });
}

function crearItemAmigo(amigo) {
    const item = document.createElement("li");
    const enlace = crearElemento("a");
    enlace.href = `/Home/Perfil/${amigo.id}`;
    const avatar = crearElemento("span", amigo.fotoPerfil ? "avatar" : "avatar theme-primary");
    avatar.setAttribute("aria-hidden", "true");
    pintarAvatar(avatar, amigo.nombre, amigo.apellido, amigo.fotoPerfil);
    const nombre = crearElemento("strong", "", `${amigo.nombre} ${amigo.apellido}`);
    if (amigo.verificado) nombre.append(" ", crearTickVerificado());
    enlace.append(avatar, nombre, crearElemento("span", "pildora", nombresDeTipoUsuario[amigo.tipoUsuario] || "Usuario"));
    item.append(enlace);
    return item;
}

// El corazón "salta" y, al dar me gusta, suelta una explosión de corazoncitos con los colores de la marca
function animarMeGusta(botonMeGusta, leGusta) {
    const icono = botonMeGusta.querySelector(".bi");
    icono.classList.remove("saltoCorazon");
    void icono.offsetWidth;
    icono.classList.add("saltoCorazon");

    if (!leGusta || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cantidadCorazones = 10;
    for (let i = 0; i < cantidadCorazones; i++) {
        const angulo = (i / cantidadCorazones) * 2 * Math.PI + Math.random() * 0.4;
        const distancia = 40 + Math.random() * 30;
        const corazon = document.createElement("i");
        corazon.className = "bi bi-heart-fill corazonVolador";
        corazon.setAttribute("aria-hidden", "true");
        corazon.style.setProperty("--destinoX", `${Math.cos(angulo) * distancia}px`);
        corazon.style.setProperty("--destinoY", `${Math.sin(angulo) * distancia}px`);
        corazon.style.color = coloresExplosionLike[i % coloresExplosionLike.length];
        corazon.style.fontSize = `${.6 + Math.random() * .5}rem`;
        corazon.addEventListener("animationend", () => corazon.remove());
        botonMeGusta.append(corazon);
    }
}

// ----- Modal "Editar perfil" -----
function inicializarEdicionPerfil() {
    const dialogoEditarPerfil = document.getElementById("dialogoEditarPerfil");
    if (!dialogoEditarPerfil) return;

    document.querySelectorAll("[data-abrir-edicion]").forEach(boton => boton.addEventListener("click", cargarDatosEdicion));
    document.getElementById("edicionEscuelas").addEventListener("change", dibujarAniosDeEscuelas);
    document.getElementById("edicionFechaNacimiento").addEventListener("change", dibujarAniosDeEscuelas);
    inicializarEditorDescripcion();
    inicializarFotosEdicion();
    inicializarTitulosEdicion();
}

function cargarDatosEdicion() {
    const estadoEdicion = document.getElementById("estadoEdicion");
    const contenidoEdicion = document.getElementById("contenidoEdicion");
    mostrarMensaje(document.getElementById("mensajeEditarPerfil"), "");

    // Las opciones casi no cambian: se piden una sola vez
    const pedidoOpciones = opcionesPerfilCargadas
        ? Promise.resolve(opcionesPerfilCargadas)
        : pedirJson("/Perfiles/ObtenerOpcionesPerfil").then(opciones => (opcionesPerfilCargadas = opciones));

    Promise.all([pedidoOpciones, pedirJson("/Perfiles/ObtenerDatosEdicion")])
        .then(([opciones, datos]) => {
            completarFormularioEdicion(opciones, datos);
            estadoEdicion.hidden = true;
            contenidoEdicion.hidden = false;
        })
        .catch(error => {
            console.error(error);
            estadoEdicion.hidden = false;
            contenidoEdicion.hidden = true;
            estadoEdicion.textContent = "No pudimos cargar tus datos. Cerrá el cuadro y probá de nuevo.";
        });
}

function completarFormularioEdicion(opciones, datos) {
    const campo = id => document.getElementById(id);

    // Modificar perfil
    if (editorDescripcion) {
        editorDescripcion.setContents([]);
        if (datos.descripcion) editorDescripcion.clipboard.dangerouslyPasteHTML(datos.descripcion);
        actualizarContadorDescripcion();
    }
    // Los IDs llegan como texto: "37,38". Los colegios con su año: "20:2015,21:2019"
    const ids = texto => texto ? texto.split(",").map(id => parseInt(id)) : [];
    const escuelas = datos.idsEscuelas ? datos.idsEscuelas.split(",") : [];
    aniosDeEscuelas = Object.fromEntries(escuelas.map(escuela => [parseInt(escuela), escuela.split(":")[1] ?? ""]));
    llenarSelectDeOpciones(campo("edicionEscuelas"), opciones.escuelas, ids(datos.idsEscuelas));
    llenarSelectDeOpciones(campo("edicionNiveles"), opciones.niveles, ids(datos.idsNiveles));
    llenarSelectDeOpciones(campo("edicionMaterias"), opciones.materias, ids(datos.idsMaterias));
    llenarSelectDeOpciones(campo("edicionModalidades"), opciones.modalidades, ids(datos.idsModalidades));
    if (campo("edicionPrecioHora")) campo("edicionPrecioHora").value = datos.precioHora > 0 ? datos.precioHora : "";
    if (campo("listaTitulos")) {
        campo("listaTitulos").replaceChildren();
        datos.titulos.forEach(agregarTituloEdicion);
    }

    // Modificar cuenta
    campo("edicionNombre").value = datos.nombre;
    campo("edicionApellido").value = datos.apellido;
    campo("edicionMail").value = datos.mail;
    campo("edicionFechaNacimiento").value = datos.fechaNacimiento ? datos.fechaNacimiento.slice(0, 10) : "";
    // Los años de los colegios arrancan en el de nacimiento: se dibujan después de cargarlo
    dibujarAniosDeEscuelas();
    campo("edicionDni").value = datos.dni || "";
    campo("edicionDireccion").value = datos.direccion || "";
    campo("edicionFotoPerfil").value = "";
    fotoPerfilRecortada = null;
    campo("edicionFotoDni").value = "";
    pintarAvatar(campo("vistaPreviaFotoPerfil"), datos.nombre, datos.apellido, datos.fotoPerfil);
    campo("estadoFotoDni").textContent = datos.tieneFotoDni
        ? "✓ Ya subiste la foto del DNI. Si elegís otra, se reemplaza."
        : "Todavía no subiste la foto del DNI.";
    campo("estadoFotoDni").classList.toggle("cargada", datos.tieneFotoDni);

    mostrarProgresoVerificacion(datos.verificado, datos.faltantes);
}

// Llena un <select> del modal y lo convierte en selector con búsqueda.
// En los de una sola opción (alumno), "Sin elegir" permite dejarlo vacío.
function llenarSelectDeOpciones(select, opciones, idsElegidos) {
    if (!select) return;

    select.replaceChildren();
    if (!select.multiple) select.append(new Option("Sin elegir", "", false, idsElegidos.length === 0));
    opciones.forEach(opcion => {
        const estaElegida = idsElegidos.includes(opcion.id);
        select.append(new Option(opcion.nombre, opcion.id, estaElegida, estaElegida));
    });
    crearSelectorBuscable(select);
}

// Se puede dar clase en un colegio desde el año en que naciste (sin fecha de nacimiento, desde 1950)
function primerAnioParaEnsenar() {
    const anioNacimiento = Number(document.getElementById("edicionFechaNacimiento").value.slice(0, 4));
    return anioNacimiento >= 1900 ? anioNacimiento : anioMinimoEscuela;
}

// Profesores: por cada colegio elegido se elige desde qué año da clase ahí (solo el año). Se redibuja cada
// vez que cambian los colegios o la fecha de nacimiento; lo elegido queda en aniosDeEscuelas para no perderlo.
function dibujarAniosDeEscuelas() {
    const contenedorAnios = document.getElementById("aniosEscuelas");
    if (!contenedorAnios) return;

    const anioActual = new Date().getFullYear();
    const primerAnio = primerAnioParaEnsenar();
    const escuelasElegidas = Array.from(document.getElementById("edicionEscuelas").selectedOptions).filter(opcion => opcion.value !== "");
    contenedorAnios.hidden = escuelasElegidas.length === 0;
    document.getElementById("listaAniosEscuelas").replaceChildren(...escuelasElegidas.map(opcion => {
        // Del más nuevo al más viejo; si el año guardado quedó fuera del rango, queda sin elegir
        const campoAnio = document.createElement("select");
        campoAnio.className = "form-control";
        campoAnio.id = `anioEscuela${opcion.value}`;
        campoAnio.append(new Option("Año", ""));
        for (let anio = anioActual; anio >= primerAnio; anio--) campoAnio.append(new Option(anio, anio));
        campoAnio.value = aniosDeEscuelas[opcion.value] ?? "";
        campoAnio.dataset.nombreEscuela = opcion.textContent;
        campoAnio.addEventListener("change", () => { aniosDeEscuelas[opcion.value] = campoAnio.value; });

        const etiquetaAnio = crearElemento("label", "", opcion.textContent);
        etiquetaAnio.htmlFor = campoAnio.id;
        const filaAnio = crearElemento("div", "anioEscuela");
        filaAnio.append(etiquetaAnio, campoAnio);
        return filaAnio;
    }));
}

// Arriba del modal: verde si ya está verificada; amarillo con lo que falta si no
function mostrarProgresoVerificacion(verificado, faltantes) {
    const progresoVerificacion = document.getElementById("progresoVerificacion");
    progresoVerificacion.replaceChildren();
    progresoVerificacion.classList.toggle("verificada", verificado);

    const titulo = document.createElement("p");
    if (verificado) {
        titulo.append(crearTickVerificado(), " Tu cuenta está verificada.");
        progresoVerificacion.append(titulo);
        return;
    }

    titulo.textContent = faltantes.length === 1
        ? "Te falta 1 dato para verificar tu cuenta:"
        : `Te faltan ${faltantes.length} datos para verificar tu cuenta:`;
    const listaFaltantes = document.createElement("ul");
    listaFaltantes.replaceChildren(...faltantes.map(faltante => {
        const itemFaltante = document.createElement("li");
        itemFaltante.textContent = faltante;
        return itemFaltante;
    }));
    progresoVerificacion.append(titulo, listaFaltantes);
}

// Editor de texto enriquecido (Quill 2): negrita, cursiva, subrayado, tachado, listas, cita y enlaces
function inicializarEditorDescripcion() {
    const contenedorEditor = document.getElementById("editorDescripcion");
    if (!contenedorEditor || !window.Quill) return;

    editorDescripcion = new Quill(contenedorEditor, {
        theme: "snow",
        placeholder: "Contá quién sos, qué te gusta y qué estás buscando…",
        modules: {
            toolbar: [
                ["bold", "italic", "underline", "strike"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["blockquote", "link"],
                ["clean"]
            ]
        }
    });
    editorDescripcion.on("text-change", actualizarContadorDescripcion);
}

function textoDeLaDescripcion() {
    return editorDescripcion ? editorDescripcion.getText().trim() : "";
}

function actualizarContadorDescripcion() {
    const contadorDescripcion = document.getElementById("contadorDescripcion");
    const cantidadCaracteres = textoDeLaDescripcion().length;
    contadorDescripcion.textContent = `${cantidadCaracteres} / ${largoMaximoDescripcion}`;
    contadorDescripcion.classList.toggle("excedido", cantidadCaracteres > largoMaximoDescripcion);
}

// Foto de perfil: al elegirla se abre el recorte (se guarda recién al tocar "Guardar"). Aviso de la foto del DNI.
function inicializarFotosEdicion() {
    const campoFotoPerfil = document.getElementById("edicionFotoPerfil");
    const campoFotoDni = document.getElementById("edicionFotoDni");
    const mensajeEditarPerfil = document.getElementById("mensajeEditarPerfil");

    campoFotoPerfil.addEventListener("change", () => {
        const archivo = campoFotoPerfil.files[0];
        // Lo que se sube es el recorte; vaciarlo también deja volver a elegir la misma foto
        campoFotoPerfil.value = "";
        if (!archivo) return;
        if (!fotoValida(archivo)) {
            mostrarMensaje(mensajeEditarPerfil, "La foto de perfil tiene que ser JPG, PNG o WEBP de hasta 5 MB.");
            return;
        }
        mostrarMensaje(mensajeEditarPerfil, "");
        abrirRecorteDeFoto(archivo);
    });
    inicializarRecorteDeFoto();

    campoFotoDni.addEventListener("change", () => {
        const archivo = campoFotoDni.files[0];
        if (!archivo) return;
        if (!fotoValida(archivo)) {
            campoFotoDni.value = "";
            mostrarMensaje(mensajeEditarPerfil, "La foto del DNI tiene que ser JPG, PNG o WEBP de hasta 5 MB.");
            return;
        }
        mostrarMensaje(mensajeEditarPerfil, "");
        const estadoFotoDni = document.getElementById("estadoFotoDni");
        estadoFotoDni.textContent = `Nueva foto elegida: ${archivo.name}. Se sube al guardar.`;
        estadoFotoDni.classList.add("cargada");
    });
}

// ---------- Recortar la foto de perfil (Cropper.js 1.6, en wwwroot/lib/cropperjs) ----------
// El recuadro es cuadrado y la vista previa circular, como se ve en el sitio. Se puede mover, acercar y girar.
function abrirRecorteDeFoto(archivo) {
    document.getElementById("imagenRecorte").src = URL.createObjectURL(archivo);
    document.getElementById("dialogoRecortarFoto").showModal();
}

function inicializarRecorteDeFoto() {
    const dialogoRecortarFoto = document.getElementById("dialogoRecortarFoto");
    const imagenRecorte = document.getElementById("imagenRecorte");

    // Cropper.js necesita la imagen cargada y a la vista para medirla
    imagenRecorte.addEventListener("load", () => {
        recortadorFoto?.destroy();
        recortadorFoto = new Cropper(imagenRecorte, {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: "move",
            autoCropArea: .85,
            background: false,
            guides: false,
            toggleDragModeOnDblclick: false,
            preview: document.getElementById("vistaPreviaRecorte")
        });
    });
    imagenRecorte.addEventListener("error", () => {
        dialogoRecortarFoto.close();
        mostrarMensaje(document.getElementById("mensajeEditarPerfil"), "No pudimos abrir esa foto. Probá con otra.");
    });

    // Al cerrar se suelta la foto original (puede pesar varios MB): ya se usó el recorte o se canceló
    dialogoRecortarFoto.addEventListener("close", () => {
        recortadorFoto?.destroy();
        recortadorFoto = null;
        URL.revokeObjectURL(imagenRecorte.src);
    });

    const acciones = {
        acercar: () => recortadorFoto.zoom(.1),
        alejar: () => recortadorFoto.zoom(-.1),
        girarIzquierda: () => girarFoto(-90),
        girarDerecha: () => girarFoto(90),
        reiniciar: () => recortadorFoto.reset()
    };
    dialogoRecortarFoto.querySelectorAll("[data-recorte]").forEach(boton => {
        boton.addEventListener("click", () => recortadorFoto && acciones[boton.dataset.recorte]());
    });

    document.getElementById("botonUsarRecorte").addEventListener("click", () => {
        if (!recortadorFoto) return;
        const lienzo = recortadorFoto.getCroppedCanvas({ width: ladoFotoPerfil, height: ladoFotoPerfil, imageSmoothingQuality: "high" });
        // Si el navegador no sabe generar WEBP (Safari viejo) devuelve PNG: el servidor igual lo pasa a WEBP
        lienzo.toBlob(foto => {
            if (!foto) return;
            fotoPerfilRecortada = foto;
            if (urlVistaPreviaFoto) URL.revokeObjectURL(urlVistaPreviaFoto);
            urlVistaPreviaFoto = URL.createObjectURL(foto);
            pintarAvatar(document.getElementById("vistaPreviaFotoPerfil"), "", "", urlVistaPreviaFoto);
            dialogoRecortarFoto.close();
        }, "image/webp", .9);
    });
}

// Cropper.js gira la foto sin volver a encuadrarla: acá se la centra entera en el escenario y se centra el recuadro
function girarFoto(grados) {
    recortadorFoto.clear();
    recortadorFoto.rotate(grados);
    const escenario = recortadorFoto.getContainerData();
    const foto = recortadorFoto.getCanvasData();
    const escala = Math.min(escenario.width / foto.width, escenario.height / foto.height);
    const ancho = foto.width * escala;
    const alto = foto.height * escala;
    recortadorFoto.setCanvasData({ left: (escenario.width - ancho) / 2, top: (escenario.height - alto) / 2, width: ancho, height: alto });
    recortadorFoto.crop();
    const lado = Math.min(ancho, alto) * .85;
    recortadorFoto.setCropBoxData({ left: (escenario.width - lado) / 2, top: (escenario.height - lado) / 2, width: lado, height: lado });
}

function fotoValida(archivo) {
    return tiposDeFotoPermitidos.includes(archivo.type) && archivo.size <= pesoMaximoFoto;
}

// Títulos del profesor: lista con "Agregar" y una ✕ para quitar cada uno (inputs name="titulos")
function inicializarTitulosEdicion() {
    const botonAgregarTitulo = document.getElementById("botonAgregarTitulo");
    if (!botonAgregarTitulo) return;

    const campoNuevoTitulo = document.getElementById("nuevoTitulo");
    const agregarDesdeElCampo = () => {
        const titulo = campoNuevoTitulo.value.replaceAll("|", " ").replace(/\s+/g, " ").trim();
        const mensajeEditarPerfil = document.getElementById("mensajeEditarPerfil");
        if (titulo === "") return mostrarErrorEnCampo(mensajeEditarPerfil, campoNuevoTitulo, "Escribí el título antes de agregarlo.");
        if (document.querySelectorAll("#listaTitulos li").length >= 10) return mostrarErrorEnCampo(mensajeEditarPerfil, campoNuevoTitulo, "Podés cargar hasta 10 títulos.");
        mostrarMensaje(mensajeEditarPerfil, "");
        agregarTituloEdicion(titulo);
        campoNuevoTitulo.value = "";
        campoNuevoTitulo.focus();
        return true;
    };

    botonAgregarTitulo.addEventListener("click", agregarDesdeElCampo);
    campoNuevoTitulo.addEventListener("keydown", evento => {
        if (evento.key !== "Enter") return;
        evento.preventDefault();
        agregarDesdeElCampo();
    });
}

function agregarTituloEdicion(titulo) {
    const itemTitulo = document.createElement("li");
    const textoTitulo = document.createElement("span");
    textoTitulo.textContent = titulo;

    const campoTitulo = document.createElement("input");
    campoTitulo.type = "hidden";
    campoTitulo.name = "titulos";
    campoTitulo.value = titulo;

    const botonQuitar = document.createElement("button");
    botonQuitar.type = "button";
    botonQuitar.className = "btn-close";
    botonQuitar.setAttribute("aria-label", `Quitar ${titulo}`);
    botonQuitar.addEventListener("click", () => itemTitulo.remove());

    itemTitulo.append(textoTitulo, campoTitulo, botonQuitar);
    document.getElementById("listaTitulos").append(itemTitulo);
}

// Muestra la pestaña donde está un campo (para los errores de validación)
function mostrarPestanaDelCampo(campo) {
    const pestana = campo?.closest(".tab-pane");
    if (!pestana || pestana.classList.contains("active")) return;
    document.querySelector(`[data-bs-target="#${pestana.id}"]`)?.click();
}

function errorEnCampoDeEdicion(campo, texto) {
    mostrarPestanaDelCampo(campo);
    // Se espera a que la pestaña se vea para poder poner el foco
    setTimeout(() => mostrarErrorEnCampo(document.getElementById("mensajeEditarPerfil"), campo, texto), 50);
    return false;
}

function guardarPerfil() {
    const formularioEditarPerfil = document.getElementById("formularioEditarPerfil");
    const mensajeEditarPerfil = document.getElementById("mensajeEditarPerfil");
    const botonGuardarPerfil = document.getElementById("botonGuardarPerfil");
    const campo = id => document.getElementById(id);
    const campoPrecioHora = campo("edicionPrecioHora");
    const dniSinPuntos = campo("edicionDni").value.replace(/[\s.\-]/g, "");

    if (campo("edicionNombre").value.trim() === "") return errorEnCampoDeEdicion(campo("edicionNombre"), "Ingresá tu nombre.");
    if (campo("edicionApellido").value.trim() === "") return errorEnCampoDeEdicion(campo("edicionApellido"), "Ingresá tu apellido.");
    if (!correoValido(campo("edicionMail").value.trim())) return errorEnCampoDeEdicion(campo("edicionMail"), "Ingresá un correo electrónico válido.");
    if (dniSinPuntos !== "" && !/^\d{7,8}$/.test(dniSinPuntos)) return errorEnCampoDeEdicion(campo("edicionDni"), "El DNI tiene que tener 7 u 8 números.");
    if (campo("edicionFechaNacimiento").value !== "" && !fechaNacimientoValida(campo("edicionFechaNacimiento").value)) return errorEnCampoDeEdicion(campo("edicionFechaNacimiento"), "Ingresá una fecha de nacimiento válida.");
    if (textoDeLaDescripcion().length > largoMaximoDescripcion) return errorEnCampoDeEdicion(campo("editorDescripcion"), "La descripción puede tener hasta 1000 caracteres.");
    if (campoPrecioHora && campoPrecioHora.value !== "" && !(Number.isInteger(Number(campoPrecioHora.value)) && Number(campoPrecioHora.value) >= 0)) {
        return errorEnCampoDeEdicion(campoPrecioHora, "Ingresá un precio por hora válido (solo números).");
    }
    if (campo("edicionMaterias") && campo("edicionMaterias").selectedOptions.length > materiasMaximas) {
        return errorEnCampoDeEdicion(campo("edicionMaterias"), `Podés elegir hasta ${materiasMaximas} materias.`);
    }
    if (campo("edicionEscuelas").multiple && campo("edicionEscuelas").selectedOptions.length > colegiosMaximos) {
        return errorEnCampoDeEdicion(campo("edicionEscuelas"), `Podés elegir hasta ${colegiosMaximos} colegios.`);
    }
    // Cada año va desde el de nacimiento (sin fecha de nacimiento, desde 1950) hasta el actual
    const anioActual = new Date().getFullYear();
    const anioDesde = primerAnioParaEnsenar();
    for (const campoAnio of document.querySelectorAll("#listaAniosEscuelas select")) {
        const anio = Number(campoAnio.value);
        if (campoAnio.value === "") return errorEnCampoDeEdicion(campoAnio, `Elegí desde qué año das clase en ${campoAnio.dataset.nombreEscuela}.`);
        if (!Number.isInteger(anio) || anio < anioDesde || anio > anioActual) return errorEnCampoDeEdicion(campoAnio, `El año de ${campoAnio.dataset.nombreEscuela} tiene que estar entre ${anioDesde} y ${anioActual}.`);
    }

    // HTML del editor (vacío si no se escribió nada) y listas de IDs separadas por coma.
    // Los colegios del profesor van con su año: "20:2015,21:2019"
    // getSemanticHTML() de Quill convierte cada espacio en &nbsp; (y el texto no se corta en renglones)
    campo("edicionDescripcion").value = textoDeLaDescripcion() === "" ? "" : editorDescripcion.getSemanticHTML().replace(/&nbsp;/g, " ");
    const datosFormulario = new FormData(formularioEditarPerfil);
    if (fotoPerfilRecortada) datosFormulario.set("archivoFotoPerfil", fotoPerfilRecortada, `perfil.${fotoPerfilRecortada.type.split("/")[1]}`);
    formularioEditarPerfil.querySelectorAll("select[data-nombre-ids]").forEach(select => {
        const idsElegidos = Array.from(select.selectedOptions).map(opcion => opcion.value).filter(valor => valor !== "");
        const valores = select.id === "edicionEscuelas" && document.getElementById("aniosEscuelas")
            ? idsElegidos.map(id => `${id}:${aniosDeEscuelas[id] ?? ""}`)
            : idsElegidos;
        datosFormulario.append(select.dataset.nombreIds, valores.join(","));
    });

    mostrarMensaje(mensajeEditarPerfil, "");
    botonGuardarPerfil.disabled = true;

    pedirJson(formularioEditarPerfil.action, { method: "POST", body: datosFormulario })
        .then(respuesta => {
            if (respuesta.codigo == 0) {
                formularioEditarPerfil.querySelector("[data-bs-dismiss='dialog']").click();
                mostrarSnackbar(respuesta.verificado ? "¡Listo! Tu cuenta está verificada." : "Cambios guardados.", "exito");
                actualizarUsuarioEnEncabezado(respuesta);
                mostrarAvisoVerificacionPerfil(respuesta.verificado, respuesta.faltantes);
                cargarPerfil();
            } else if (respuesta.codigo == 1) {
                errorEnCampoDeEdicion(campo("edicionMail"), "Ese correo ya lo usa otra cuenta.");
            } else if (respuesta.codigo == 2) {
                errorEnCampoDeEdicion(campo("edicionDni"), "Ese DNI ya está registrado en otra cuenta.");
            } else if (respuesta.codigo == 3) {
                mostrarMensaje(mensajeEditarPerfil, "Revisá los datos: nombre y apellido de hasta 50 caracteres, dirección de hasta 200, hasta 10 títulos, hasta 10 materias y 5 colegios, y el año de cada colegio.");
            } else {
                mostrarMensaje(mensajeEditarPerfil, "Las fotos tienen que ser imágenes JPG, PNG o WEBP de hasta 5 MB.");
            }
        })
        .catch(error => {
            console.error(error);
            mostrarMensaje(mensajeEditarPerfil, "No pudimos guardar los cambios. Revisá tu conexión e intentá de nuevo.");
        })
        .finally(() => { botonGuardarPerfil.disabled = false; });

    return false;
}

// El header se arma con la sesión al cargar la página: se actualiza a mano para no recargar
function actualizarUsuarioEnEncabezado(usuario) {
    document.querySelectorAll("#encabezado .usuario").forEach(enlaceUsuario => {
        enlaceUsuario.querySelector(".nombreUsuario").textContent = `${usuario.nombre} ${usuario.apellido}`;

        const avatar = enlaceUsuario.querySelector(".avatar");
        pintarAvatar(avatar, usuario.nombre, usuario.apellido, usuario.fotoPerfil);
        avatar.classList.toggle("theme-primary", !usuario.fotoPerfil);

        let tick = enlaceUsuario.querySelector(".tickVerificado");
        if (usuario.verificado && !tick) enlaceUsuario.append(crearTickVerificado());
        if (!usuario.verificado && tick) tick.remove();
    });
}


// ================= INICIALIZACIÓN =================
// ================= RESEÑAS =================
// "Dar reseña" (diálogo en _Layout): la estrella del Perfil y el botón del Historial ([data-dar-resena] con
// data-id-usuario y data-nombre-usuario). El servidor (SP darResena) revisa que hayan tenido una clase completada.
const textosPuntuacion = ["", "Muy mala", "Mala", "Regular", "Buena", "Excelente"];

function inicializarResenas() {
    // Los botones del historial se crean con fetch: se escuchan en el documento
    document.addEventListener("click", evento => {
        const boton = evento.target.closest("[data-dar-resena]");
        if (!boton) return;
        evento.preventDefault();
        // El diálogo solo está para alumnos y profesores: sin sesión se va a Iniciar sesión
        if (!document.getElementById("dialogoDarResena")) {
            if (document.getElementById("perfil")?.dataset.haySesion === "true") mostrarSnackbar("Solo los alumnos y los profesores pueden dejar reseñas.");
            else window.location.href = "/Sesion/IniciarSesion";
            return;
        }
        abrirResena(boton.dataset.idUsuario, boton.dataset.nombreUsuario);
    });

    const formulario = document.getElementById("formularioDarResena");
    if (!formulario) return;
    const descripcion = document.getElementById("descripcionResena");
    descripcion.addEventListener("input", () => {
        document.getElementById("contadorResena").textContent = `${descripcion.value.length} / 500`;
    });
    formulario.addEventListener("change", evento => {
        if (evento.target.name !== "puntuacion") return;
        document.getElementById("textoPuntuacion").textContent = textosPuntuacion[evento.target.value];
        mostrarMensaje(document.getElementById("mensajeDarResena"), "");
    });
}

function abrirResena(idUsuario, nombreUsuario) {
    const formulario = document.getElementById("formularioDarResena");
    formulario.reset();
    document.getElementById("idReceptorResena").value = idUsuario;
    document.getElementById("nombreResena").textContent = nombreUsuario || "esta persona";
    document.getElementById("textoPuntuacion").textContent = "";
    document.getElementById("contadorResena").textContent = "0 / 500";
    mostrarMensaje(document.getElementById("mensajeDarResena"), "");
    document.getElementById("dialogoDarResena").showModal();
}

function enviarResena() {
    const formulario = document.getElementById("formularioDarResena");
    const mensaje = document.getElementById("mensajeDarResena");
    const botonEnviar = document.getElementById("botonEnviarResena");

    if (!formulario.querySelector("input[name='puntuacion']:checked")) {
        return mostrarErrorEnCampo(mensaje, formulario.querySelector("input[name='puntuacion']"), "Elegí de 1 a 5 estrellas.");
    }

    mostrarMensaje(mensaje, "");
    botonEnviar.disabled = true;
    const datos = new FormData(formulario);

    pedirJson("/Resenas/Dar", { method: "POST", body: datos })
        .then(respuesta => {
            if (respuesta.codigo == 0) {
                const gracias = "¡Gracias! Tu reseña ya está en el perfil.";
                document.getElementById("dialogoDarResena").close();
                // historial.js vuelve a pedir el historial a la vista (y avisa adentro del modal, si está abierto)
                document.dispatchEvent(new CustomEvent("resenaPublicada", { detail: { idReceptor: datos.get("idReceptor"), mensaje: gracias } }));
                if (!document.getElementById("dialogoHistorial")?.open) mostrarSnackbar(gracias, "exito");
                // En el perfil de quien la recibió, la reseña y el promedio se ven enseguida
                if (document.getElementById("perfil")?.dataset.idPerfil === datos.get("idReceptor")) cargarPerfil();
            } else if (respuesta.codigo == 1) {
                mostrarMensaje(mensaje, "Podés dejar una reseña después de tener una clase con esta persona.");
            } else {
                mostrarMensaje(mensaje, "Ya le dejaste una reseña a esta persona.");
            }
        })
        .catch(error => {
            console.error(error);
            mostrarMensaje(mensaje, "No pudimos publicar tu reseña. Revisá tu conexión e intentá de nuevo.");
        })
        .finally(() => { botonEnviar.disabled = false; });

    return false;
}


// ================= HEADER: buscador de usuarios =================
// Los usuarios se piden recién al abrir la lupa y de a 20 (el TOP del SP buscarUsuarios).
// Cada respuesta se guarda por texto: al borrar letras no se vuelve a pedir. Si una búsqueda trajo menos de 20,
// ahí están todos los que coinciden, así que al agregar letras se filtra acá (salvo un ID, que se busca exacto).
const usuariosPorBusqueda = 20;
const busquedasDeUsuarios = new Map();
let temporizadorBusquedaUsuarios = null;

function inicializarBuscadorDeUsuarios() {
    const buscador = document.getElementById("buscadorUsuarios");
    if (!buscador) return;

    const botonLupa = document.getElementById("botonBuscarUsuarios");
    const campo = document.getElementById("campoBuscarUsuarios");

    botonLupa.addEventListener("click", () => {
        buscador.classList.add("abierto");
        botonLupa.setAttribute("aria-expanded", "true");
        campo.focus();
        buscarUsuarios(campo.value);
    });

    // Espera a que se deje de escribir un momento para no pedir una vez por letra
    campo.addEventListener("input", () => {
        clearTimeout(temporizadorBusquedaUsuarios);
        temporizadorBusquedaUsuarios = setTimeout(() => buscarUsuarios(campo.value), 200);
    });

    // Flechas para recorrer los resultados, Enter abre el primero y Escape cierra
    buscador.addEventListener("keydown", evento => {
        const enlaces = [...document.querySelectorAll("#resultadosUsuarios a")];
        const posicion = enlaces.indexOf(document.activeElement);
        if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
            evento.preventDefault();
            const siguiente = posicion + (evento.key === "ArrowDown" ? 1 : -1);
            if (siguiente < 0) campo.focus();
            else if (siguiente < enlaces.length) enlaces[siguiente].focus();
        } else if (evento.key === "Enter" && document.activeElement === campo && enlaces.length > 0) {
            evento.preventDefault();
            window.location.href = enlaces[0].href;
        } else if (evento.key === "Escape" && buscador.classList.contains("abierto")) {
            // En el celular, que no se cierre también el menú
            evento.preventDefault();
            cerrarBuscadorDeUsuarios();
            botonLupa.focus();
        }
    });

    document.addEventListener("click", evento => {
        if (!buscador.contains(evento.target)) cerrarBuscadorDeUsuarios();
    });
}

function cerrarBuscadorDeUsuarios() {
    document.getElementById("buscadorUsuarios").classList.remove("abierto");
    document.getElementById("botonBuscarUsuarios").setAttribute("aria-expanded", "false");
    document.getElementById("resultadosUsuarios").hidden = true;
}

function buscarUsuarios(textoEscrito) {
    const texto = textoEscrito.trim();
    const clave = normalizarTexto(texto);
    const guardados = busquedasDeUsuarios.get(clave) ?? buscarEntreLosGuardados(clave);
    if (guardados) {
        busquedasDeUsuarios.set(clave, guardados);
        mostrarUsuariosEncontrados(guardados);
        return;
    }

    pedirJson(`/Perfiles/Buscar?texto=${encodeURIComponent(texto)}`)
        .then(usuarios => {
            busquedasDeUsuarios.set(clave, usuarios);
            // Si mientras tanto se siguió escribiendo, esta respuesta ya quedó vieja
            if (normalizarTexto(document.getElementById("campoBuscarUsuarios").value) === clave) mostrarUsuariosEncontrados(usuarios);
        })
        .catch(error => {
            console.error(error);
            mostrarAvisoDeBusqueda("No pudimos buscar. Probá de nuevo en unos minutos.");
        });
}

// Una búsqueda más corta que ya trajo a todos (menos de 20) alcanza para filtrar sin pedir de nuevo
function buscarEntreLosGuardados(clave) {
    if (/^\d+$/.test(clave)) return null;
    for (const [claveGuardada, usuarios] of busquedasDeUsuarios) {
        if (usuarios.length < usuariosPorBusqueda && clave.includes(claveGuardada)) {
            return usuarios.filter(usuario => coincideUsuario(usuario, clave));
        }
    }
    return null;
}

// La misma regla que el SP: nombre y apellido en cualquier orden, sin tildes ni mayúsculas
function coincideUsuario(usuario, clave) {
    return normalizarTexto(`${usuario.nombre} ${usuario.apellido}`).includes(clave)
        || normalizarTexto(`${usuario.apellido} ${usuario.nombre}`).includes(clave);
}

function mostrarUsuariosEncontrados(usuarios) {
    if (usuarios.length === 0) return mostrarAvisoDeBusqueda("No encontramos a nadie con ese nombre o ID.");
    const lista = document.getElementById("resultadosUsuarios");
    lista.replaceChildren(...usuarios.map(crearResultadoDeUsuario));
    lista.hidden = false;
}

function mostrarAvisoDeBusqueda(texto) {
    const lista = document.getElementById("resultadosUsuarios");
    lista.replaceChildren(crearElemento("li", "vacio", texto));
    lista.hidden = false;
}

// Foto (o iniciales), nombre con el tick si está verificado, y rol con el ID. Lleva al perfil
function crearResultadoDeUsuario(usuario) {
    const enlace = crearElemento("a");
    enlace.href = `/Home/Perfil/${usuario.id}`;

    const avatar = crearElemento("span", usuario.fotoPerfil ? "avatar" : "avatar theme-primary");
    avatar.setAttribute("aria-hidden", "true");
    pintarAvatar(avatar, usuario.nombre, usuario.apellido, usuario.fotoPerfil);

    const nombre = crearElemento("strong", "", `${usuario.nombre} ${usuario.apellido} `);
    if (usuario.verificado) {
        const tick = crearElemento("i", "bi bi-patch-check-fill tickVerificado");
        tick.title = "Cuenta verificada";
        tick.setAttribute("aria-label", "Cuenta verificada");
        nombre.append(tick);
    }
    const datos = crearElemento("span", "datos");
    datos.append(nombre, crearElemento("small", "", `${usuario.tipoUsuario === "profesor" ? "Profesor" : "Alumno"} · ID ${usuario.id}`));

    enlace.append(avatar, datos);
    const item = crearElemento("li");
    item.append(enlace);
    return item;
}


function inicializarSitio() {
    inicializarAvisoVerificacion();
    inicializarSelectoresBuscables();
    inicializarRolesDeRegistro();
    inicializarVerContrasena();
    inicializarBuscador();
    inicializarBuscadorDeAyuda();
    inicializarAccesosDelPanel();
    inicializarCierreDeDialogos();
    inicializarResenas();
    inicializarPerfil();
    inicializarBuscadorDeUsuarios();
}

document.addEventListener("DOMContentLoaded", inicializarSitio);
