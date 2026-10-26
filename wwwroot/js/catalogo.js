// Catálogo de profesores: lee los filtros del formulario, pide una página a Catalogo/Buscar con fetch
// y dibuja las tarjetas horizontales y la paginación. Los selectores con búsqueda los arma site.js.
// Todo el texto de la base se inserta con textContent, nunca como HTML.

const porPaginaPermitidos = [5, 10, 15, 20];
const porPaginaPredeterminado = 10;

let paginaActual = 1;
let porPaginaActual = porPaginaPredeterminado;
let temporizadorBusqueda = null;
let numeroDeBusqueda = 0;

function inicializarCatalogo() {
    const formularioFiltros = document.getElementById("formularioFiltros");
    const listaProfesores = document.getElementById("listaProfesores");
    if (!formularioFiltros || !listaProfesores) return;

    paginaActual = parseInt(formularioFiltros.dataset.pagina) || 1;
    const porPaginaInicial = parseInt(formularioFiltros.dataset.porPagina);
    porPaginaActual = porPaginaPermitidos.includes(porPaginaInicial) ? porPaginaInicial : porPaginaPredeterminado;
    document.getElementById("tarjetasPorPagina").value = porPaginaActual;

    // Al elegir en un selector se vuelve a buscar desde la página 1
    formularioFiltros.addEventListener("change", evento => {
        if (evento.target.tagName === "SELECT") buscarProfesores(1);
    });

    // Al escribir se espera a que la persona termine antes de buscar
    document.getElementById("filtroTexto").addEventListener("input", () => {
        clearTimeout(temporizadorBusqueda);
        temporizadorBusqueda = setTimeout(() => buscarProfesores(1), 400);
    });

    // El reset vacía los campos DESPUÉS de este evento, por eso se espera un instante
    formularioFiltros.addEventListener("reset", () => setTimeout(() => buscarProfesores(1), 0));

    document.getElementById("paginaAnterior").addEventListener("click", () => buscarProfesores(paginaActual - 1, true));
    document.getElementById("paginaSiguiente").addEventListener("click", () => buscarProfesores(paginaActual + 1, true));
    document.getElementById("tarjetasPorPagina").addEventListener("change", evento => {
        porPaginaActual = parseInt(evento.target.value);
        buscarProfesores(1);
    });

    buscarProfesores(paginaActual);
}

// Arma los parámetros de la consulta con lo que hay en el formulario
function leerFiltros() {
    const parametros = new URLSearchParams();
    const agregarSiHayValor = (nombre, valor) => { if (valor !== "") parametros.append(nombre, valor); };

    agregarSiHayValor("busqueda", document.getElementById("filtroTexto").value.trim());
    agregarSiHayValor("materia", document.getElementById("filtroMateria").value);
    agregarSiHayValor("colegio", document.getElementById("filtroColegio").value);
    agregarSiHayValor("modalidad", document.getElementById("filtroModalidad").value);
    Array.from(document.getElementById("filtroNivel").selectedOptions).forEach(opcion => agregarSiHayValor("nivel", opcion.value));
    return parametros;
}

function buscarProfesores(pagina, subirALaLista) {
    const filtros = leerFiltros();

    // La URL visible guarda solo lo que no es el valor por defecto, para poder compartir la búsqueda
    const parametrosUrl = new URLSearchParams(filtros);
    if (pagina > 1) parametrosUrl.set("pagina", pagina);
    if (porPaginaActual !== porPaginaPredeterminado) parametrosUrl.set("porPagina", porPaginaActual);
    const textoUrl = parametrosUrl.toString();
    history.replaceState(null, "", textoUrl === "" ? location.pathname : `${location.pathname}?${textoUrl}`);

    // El servidor siempre recibe la página y la cantidad
    const consulta = new URLSearchParams(filtros);
    consulta.set("pagina", pagina);
    consulta.set("porPagina", porPaginaActual);

    const numeroDeEstaBusqueda = ++numeroDeBusqueda;
    const listaProfesores = document.getElementById("listaProfesores");
    listaProfesores.setAttribute("aria-busy", "true");

    fetch(`/Catalogo/Buscar?${consulta}`)
        .then(respuesta => respuesta.json().then(datos => ({ ok: respuesta.ok, datos })))
        .then(({ ok, datos }) => {
            // Si mientras tanto se pidió otra búsqueda, esta respuesta ya no sirve
            if (numeroDeEstaBusqueda !== numeroDeBusqueda) return;
            if (!ok) throw new Error("Respuesta con error");
            mostrarResultados(datos);
            if (subirALaLista) listaProfesores.scrollIntoView({ behavior: "smooth", block: "start" });
        })
        .catch(error => {
            if (numeroDeEstaBusqueda === numeroDeBusqueda) mostrarErrorCatalogo();
        })
        .finally(() => listaProfesores.removeAttribute("aria-busy"));
}

function mostrarResultados(datos) {
    paginaActual = datos.pagina;
    porPaginaActual = datos.porPagina;

    const listaProfesores = document.getElementById("listaProfesores");
    listaProfesores.replaceChildren(...datos.profesores.map(crearTarjetaProfesor));

    document.getElementById("errorCatalogo").hidden = true;
    document.getElementById("sinResultados").hidden = datos.total > 0;
    document.getElementById("cantidadResultados").textContent = datos.total === 1 ? "1 profesor" : `${datos.total} profesores`;

    const paginador = document.getElementById("paginador");
    paginador.hidden = datos.total === 0;
    dibujarNumerosDePagina(datos.pagina, datos.totalPaginas);
    document.getElementById("paginaAnterior").disabled = datos.pagina <= 1;
    document.getElementById("paginaSiguiente").disabled = datos.pagina >= datos.totalPaginas;
    document.getElementById("tarjetasPorPagina").value = datos.porPagina;
}

// Números de página: todos si son pocos; si no, la primera, la última y las cercanas a la actual
function dibujarNumerosDePagina(pagina, totalPaginas) {
    const contenedor = document.getElementById("numerosPagina");
    const numeros = [];
    for (let numero = 1; numero <= totalPaginas; numero++) {
        if (numero === 1 || numero === totalPaginas || Math.abs(numero - pagina) <= 1) numeros.push(numero);
    }

    const elementos = [];
    numeros.forEach((numero, posicion) => {
        if (posicion > 0 && numero - numeros[posicion - 1] > 1) elementos.push(crearElemento("span", "puntos", "…"));
        const boton = crearElemento("button", numero === pagina ? "numero activo" : "numero", String(numero));
        boton.type = "button";
        boton.setAttribute("aria-label", `Página ${numero}`);
        if (numero === pagina) boton.setAttribute("aria-current", "page");
        else boton.addEventListener("click", () => buscarProfesores(numero, true));
        elementos.push(boton);
    });
    contenedor.replaceChildren(...elementos);
}

function mostrarErrorCatalogo() {
    document.getElementById("listaProfesores").replaceChildren();
    document.getElementById("sinResultados").hidden = true;
    document.getElementById("paginador").hidden = true;
    document.getElementById("cantidadResultados").textContent = "";
    document.getElementById("errorCatalogo").hidden = false;
}

// ================= TARJETA HORIZONTAL =================

function crearIcono(clase) {
    const icono = crearElemento("i", `bi ${clase}`);
    icono.setAttribute("aria-hidden", "true");
    return icono;
}

const coloresAvatar = ["theme-primary", "theme-accent", "theme-inverse"];

function crearTarjetaProfesor(profesor) {
    const urlPerfil = `/Home/Perfil/${profesor.id}`;
    const tarjeta = crearElemento("article", "card profesorFila");

    // Foto de perfil, o las iniciales sobre un color si todavía no cargó una
    const avatar = crearElemento("span", profesor.fotoPerfil ? "avatar" : `avatar ${coloresAvatar[profesor.id % coloresAvatar.length]}`);
    if (profesor.fotoPerfil) {
        const foto = document.createElement("img");
        foto.src = profesor.fotoPerfil;
        foto.alt = `Foto de perfil de ${profesor.nombreCompleto}`;
        avatar.append(foto);
    } else {
        avatar.textContent = profesor.iniciales;
        avatar.setAttribute("aria-hidden", "true");
    }

    const cuerpo = crearElemento("div", "cuerpo");

    const nombre = crearElemento("div", "nombre");
    const titulo = crearElemento("h3");
    const enlace = crearElemento("a", "", profesor.nombreCompleto);
    enlace.href = urlPerfil;
    titulo.append(enlace);
    nombre.append(titulo);
    if (profesor.verificado) {
        const sello = crearElemento("span", "badge badge-subtle theme-success");
        sello.title = "Credenciales revisadas por el equipo de MIP";
        sello.append(crearIcono("bi-patch-check-fill"), " Verificado");
        nombre.append(sello);
    }
    // "Popular": muy bien calificado y con más de una reseña
    if (profesor.calificacion >= 4.8 && profesor.cantidadResenas >= 2) {
        nombre.append(crearElemento("span", "badge badge-subtle theme-primary", "Popular"));
    }
    // Recomendación: amigos tuyos que ya completaron clases con este profesor (solo con sesión; ellos van primero)
    if (profesor.amigosRecomiendan > 0) {
        const recomendado = crearElemento("span", "badge badge-subtle theme-accent");
        recomendado.append(crearIcono("bi-people-fill"), profesor.amigosRecomiendan === 1 ? " 1 amigo tomó clase" : ` ${profesor.amigosRecomiendan} amigos tomaron clase`);
        nombre.append(recomendado);
    }
    cuerpo.append(nombre);

    const colegios = crearElemento("p", "colegios");
    colegios.append(crearIcono("bi-building"), ` ${profesor.colegios.length > 0 ? profesor.colegios.join(" · ") : "Sin colegio cargado"}`);
    cuerpo.append(colegios);

    if (profesor.materias.length > 0) {
        const etiquetas = crearElemento("div", "etiquetas");
        profesor.materias.forEach(materia => etiquetas.append(crearElemento("span", "badge badge-subtle theme-inverse", materia)));
        cuerpo.append(etiquetas);
    }

    if (profesor.resumen !== "") cuerpo.append(crearElemento("p", "resumen", profesor.resumen));

    const datos = crearElemento("ul", "datos");
    const calificacion = crearElemento("li");
    calificacion.append(crearIcono("bi-star-fill"), profesor.cantidadResenas === 0
        ? " Sin reseñas"
        : ` ${profesor.calificacion.toFixed(1).replace(".", ",")} (${profesor.cantidadResenas})`);
    const niveles = crearElemento("li");
    niveles.append(crearIcono("bi-mortarboard"), ` ${profesor.niveles.join(", ")}`);
    const modalidades = crearElemento("li");
    modalidades.append(crearIcono("bi-laptop"), ` ${profesor.modalidades.join(" y ")}`);
    datos.append(calificacion, modalidades, niveles);
    cuerpo.append(datos);

    // Columna derecha: precio y botones
    const lateral = crearElemento("div", "lateral");

    const importe = crearElemento("p", "importe");
    importe.append(crearElemento("strong", "", `$ ${profesor.precioHora.toLocaleString("es-AR")}`), " ", crearElemento("span", "", "/ hora"));
    lateral.append(importe);

    const botonPerfil = crearElemento("a", "boton contorno chico", "Ver perfil");
    botonPerfil.href = urlPerfil;
    // Abre el diálogo "Pedir clase" (site.js: abrirPedidoDeClase); sin sesión lleva a Iniciar sesión
    const botonPedido = crearElemento("button", "boton principal chico", "Enviar pedido");
    botonPedido.type = "button";
    botonPedido.dataset.pedirClase = "";
    botonPedido.dataset.idProfesor = profesor.id;
    botonPedido.dataset.nombreProfesor = profesor.nombreCompleto;
    lateral.append(botonPerfil, botonPedido);

    tarjeta.append(avatar, cuerpo, lateral);
    return tarjeta;
}

document.addEventListener("DOMContentLoaded", inicializarCatalogo);
