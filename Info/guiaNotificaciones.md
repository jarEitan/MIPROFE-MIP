# Guía: avisos (snackbar) y modales de confirmación

Es el aviso que aparece abajo de la pantalla al importar los feriados ("Bloqueamos 3 feriados."). Ya está listo para usar en cualquier página: no hay que agregar HTML ni CSS.

## 1. El aviso de abajo (snackbar)

```js
mostrarSnackbar(texto, tipo);
```

| `tipo` | Color | Cuánto dura | Cuándo usarlo |
|---|---|---|---|
| `"exito"` | verde | 3,2 s | Algo salió bien: "Guardamos tu agenda." |
| `"info"` (o sin poner nada) | oscuro | 3,2 s | Un dato para tener en cuenta: "Ya tenías todos los feriados bloqueados." |
| `"error"` | magenta | 7 s | Algo falló o no se pudo: "No pudimos guardar el cambio. Probá de nuevo." |

Ejemplos para copiar:

```js
mostrarSnackbar("Guardamos tu perfil.", "exito");
mostrarSnackbar("Ese día ya estaba bloqueado.");            // info
mostrarSnackbar("No pudimos enviar el mensaje. Probá de nuevo.", "error");
mostrarSnackbar(`Bloqueamos ${cantidad} ${cantidad === 1 ? "feriado" : "feriados"}.`, "exito");
```

Cómo funciona (no hace falta tocarlo):
- La función está en `wwwroot/js/site.js` y el `<div id="snackbar">` en `Views/Shared/_Layout.cshtml`, así que sirve en todas las páginas.
- Si llamás a otro antes de que se vaya el anterior, lo reemplaza y vuelve a contar el tiempo.
- Lo lee el lector de pantalla (`role="status"`), así que el texto tiene que entenderse solo.
- Colores y forma: `.snackbar` en `wwwroot/css/site.css`.

### Con un fetch (el caso de siempre)

El SP devuelve un `codigo`; cada código tiene su mensaje:

```js
enviarAccionDeClase("/Clases/BloquearDia", { fecha })
    .then(cuerpo => {
        if (cuerpo.codigo == 0) {
            mostrarSnackbar("Bloqueaste ese día.", "exito");
        } else if (cuerpo.codigo == 9) {
            mostrarSnackbar(textoCuentaNoVerificada, "error");
        } else {
            mostrarSnackbar("Ese día ya estaba bloqueado.", "info");
        }
    })
    .catch(error => {
        console.error(error);
        mostrarSnackbar("No pudimos bloquear ese día. Probá de nuevo.", "error");
    });
```

### Cómo escribir el texto
- Corto, de una o dos frases, y terminado en punto.
- Decí qué pasó y, si hace falta, qué tiene que hacer la persona: "Tenés clases en 2 de esos días: revisalas en Mis clases."
- En los errores, siempre una salida: "Probá de nuevo." / "Recargá la página."
- Con voseo, como el resto del sitio.

### Cuándo no usarlo
- **Si hay un modal abierto**: el aviso queda detrás. Mostrá el mensaje adentro del modal con `mostrarMensaje(elemento, texto)` (lo usan "Pedir clase" y "Dar reseña").
- **Un error de un campo de un formulario**: va al lado del campo (`mostrarErrorEnCampo`), no abajo de la pantalla.
- **Algo que la persona tiene que hacer después** (un pedido de clase, una solicitud de amistad): eso es una notificación del Panel de Control y sale del SP `obtenerNotificaciones`, no de un aviso.

## 2. El modal "¿Seguro?" antes de una acción

Es el que abre "Importar feriados" antes de hacer nada. Para una acción nueva:

**1) El modal en la vista** (copiá este y cambiá ids y textos):

```html
<dialog class="dialog" id="dialogoBorrarFranjas" aria-labelledby="tituloBorrarFranjas">
    <div class="dialog-header">
        <h2 class="dialog-title" id="tituloBorrarFranjas">¿Borrar tus franjas?</h2>
        <button type="button" class="btn-close" data-bs-dismiss="dialog" aria-label="Cerrar"></button>
    </div>
    <div class="dialog-body">
        <p>Qué va a pasar y para qué sirve, en una o dos frases.</p>
        <p>Qué no cambia o cómo deshacerlo.</p>
    </div>
    <div class="dialog-footer">
        <button type="button" class="boton contorno chico" data-bs-dismiss="dialog">Cancelar</button>
        <button type="button" class="boton principal chico" id="botonConfirmarBorrarFranjas">Borrar</button>
    </div>
</dialog>
```

**2) En el JS**: el botón de la página abre el modal y el de confirmar lo cierra y hace la acción.

```js
document.getElementById("botonBorrarFranjas").addEventListener("click", () => abrirDialogo("dialogoBorrarFranjas"));
document.getElementById("botonConfirmarBorrarFranjas").addEventListener("click", () => {
    cerrarDialogo("dialogoBorrarFranjas");
    borrarFranjas();   // y adentro, al terminar: mostrarSnackbar("Borramos tus franjas.", "exito");
});
```

- `abrirDialogo` y `cerrarDialogo` están en `wwwroot/js/clases.js`.
- "Cancelar" y la ✕ ya cierran solos por `data-bs-dismiss="dialog"`, no necesitan JS.
- El botón de confirmar dice la acción ("Importar", "Borrar"), no "Aceptar". Si la acción borra algo, usá `boton oscuro chico` y "Sí, borrar" (como "Borrar reseña" del Perfil).
- Cerrá el modal antes de mostrar el aviso, así no queda detrás.

Ejemplo real completo: `dialogoImportarFeriados` en `Views/Home/PanelControl.cshtml` y `importarFeriados()` en `wwwroot/js/miAgenda.js`.
