# Generador de datos de prueba (MIP)

Arma un `.sql` con datos de prueba para la base `MIP` y las imágenes (fotos de perfil y DNI) que ese script referencia. Solo biblioteca estándar de Python. Las fechas salen de hoy: historia hacia atrás y clases a futuro.

Es un extra: los tres archivos de `MIP_Estructuras/` no se tocan.

## Abrir la ventana

Doble clic en `interfaz.pyw` (Windows la abre sin consola) o `python interfaz.pyw`. Necesita Python 3.10+ con tkinter, que trae el instalador de python.org.

Atajos: `Ctrl+G` genera, `Ctrl+P` hace vista previa (arma todo en memoria y muestra el resumen sin escribir nada). La última configuración se recuerda en `configuraciones/ultima.json`; en el menú Archivo se guardan y abren presets `.json` (nunca guardan la contraseña de SQL Server).

| Pestaña | Qué hace |
|---|---|
| Cantidades | Profesores, alumnos, clases, consultas, colegios y materias a usar, amigos, mensajes por chat, probabilidades de reseñas, verificación y distribución de estrellas |
| Fechas y clases | Fecha de referencia (vacío = ahora), años de historia, días a futuro, porcentajes de estados de clases pasadas y futuras (se normalizan), precios |
| Listas | Casillas para elegir qué materias y colegios entran; abrir `recursos/` y recargar las listas |
| Perfiles armados | Cuentas fijas para probar casos puntuales y una cuenta propia |
| Imágenes | % con foto y con DNI, avatares de userData, texturas de avatar, copia al sitio y vista previa de avatares |
| Base de datos | Servidor, base y credenciales para cargar con `sqlcmd` |

Después de generar, abajo se ven el **Resumen** (conteos y problemas de verificación), las **Cuentas** (filtrables, con "Copiar mail") y las primeras 300 líneas del **SQL**. Si la verificación encuentra problemas no se exporta nada.

## Perfiles armados

Contraseña de todas las cuentas (también las comunes): `12345678`. El admin no se genera: se crea a mano en la BD.

| Mail | Qué es |
|---|---|
| `profe.estrella@mip.edu.ar` | Profesor verificado, 60+ clases completadas, reseñas de 4 y 5, agenda casi llena la semana que viene |
| `profe.nuevo@mip.edu.ar` | Profesor recién inscripto: sin clases, reseñas ni amigos, sin verificar, con agenda |
| `alumno.nuevo@mip.edu.ar` | Alumno recién inscripto, sin nada |
| `alumno.completo@mip.edu.ar` | Notificaciones de todos los tipos (solicitud de amistad recibida, mensajes sin ver de 3 personas, pedido de clase pendiente, clase rechazada, pide cambio, pide cancelar), clases en varios estados, reseñas dadas y amigos |
| `sin.verificar@mip.edu.ar` | Profesor con DNI subido y `verificado = 0`, para probar Moderación |

La cuenta propia (nombre, apellido, mail y tipo) recibe el trato de `alumno.completo`, o el de `profe.estrella` si es profesor. Los perfiles armados se suman a las cantidades pedidas.
Las demás cuentas son `nombre.apellido@mip.edu.ar` sin tildes (si se repite, lleva número).
Un alumno con DNI subido queda verificado; un profesor verificado siempre tiene DNI. Las cuentas sin verificar no tienen clases, amigos, mensajes ni me gusta (como en los SP, que no las dejan interactuar).

## Listas y avatares

Todo el texto sale de `recursos/*.txt`: una entrada por línea, UTF-8, se ignoran las líneas vacías y las que empiezan con `#`. Se pueden editar y se recargan con el botón "Recargar listas".

| Archivo | Formato |
|---|---|
| `nombres_hombre`, `nombres_mujer`, `apellidos`, `calles`, `barrios`, `materias` | un valor por línea |
| `fotos_perfil` | `archivo|h` o `archivo|m`: avatares de `wwwroot/userData/fotos-perfil/` que se usan y de qué género son |
| `colegios` | `nombre\|dirección` (la dirección es opcional) |
| `titulos`, `descripciones_profesor`, `descripciones_alumno` | plantillas; `{m}` es la materia |
| `resenas_5`, `resenas_4`, `resenas_3`, `resenas_1y2` | la reseña elige el archivo según su puntuación |
| `chats` | conversaciones separadas por una línea `---`; cada línea es un mensaje y se alterna quién habla; `{m}` materia, `{n}` nombre del otro |
| `consultas` | `tipo\|mensaje` (tipos: `cuenta`, `clases`, `sugerencia`, `otro`) |

Avatares: cada usuario con foto recibe uno al azar (se pueden repetir) de los de `recursos/fotos_perfil.txt` del mismo género que su nombre (si el nombre no está en las listas, cualquiera). Para sumar uno, poné el `.jpg`, `.png` o `.webp` en `wwwroot/userData/fotos-perfil/` con un nombre que empiece con `h-` (hombre) o `m-` (mujer), por ejemplo `m-007.webp`, y se usa solo; si no, agregá la línea `archivo|h` o `archivo|m` a `recursos/fotos_perfil.txt`. Conviene que sean fotos (no ilustraciones) cuadradas de 256x256; los archivos que no están en la lista (fotos reales de cuentas, el logo) no se usan. No se copian: el `.sql` apunta directo a ese archivo. Solo si no hay ninguno se dibuja un avatar SVG con iniciales. No se generan denuncias.

## Imágenes

Se escriben en `salida/userData/fotos-perfil/` (solo los SVG de reserva, `prueba-<n>.svg`) y `salida/userData/dni/` (`prueba-dni-<n>.png`). "Copiar al sitio" las pasa a `wwwroot/userData/...` (por defecto el `wwwroot` del repo) y antes borra **solo** los archivos que empiezan con `prueba-`, nunca las fotos reales de usuarios.

## Cargar en SQL Server

1. Ejecutar `MIP_Estructuras/MIP-BD_01_estructura.sql` y `MIP-BD_02_stored_procedures.sql`.
2. Cargar el `.sql` generado: a mano en SSMS, o con la casilla "Cargar en SQL Server al generar" (corre `sqlcmd -S servidor -d base -E -C -b -i archivo`; con usuario y contraseña usa `-U/-P`). Hace falta `sqlcmd` en el PATH (viene con SSMS) y pide confirmación porque **borra todos los datos de la base**.

El `.sql` solo usa `DELETE`, `INSERT`, subconsultas y `CAST` (sin funciones SQL). Se escribe en UTF-16 con BOM y CRLF, igual que `03_datos_prueba` (o UTF-8 con BOM a elección).

## Uso por consola

```bash
python tools/datos-prueba/generar_datos.py                          # valores por defecto
python tools/datos-prueba/generar_datos.py --profesores 60 --alumnos 200 --clases 4000
python tools/datos-prueba/generar_datos.py --semilla 7              # mismo resultado en cada corrida
python tools/datos-prueba/generar_datos.py --hoy 2026-06-01 --copiar-al-sitio
```

Genera `salida/MIP-datos-prueba.sql` y las imágenes al lado (`salida/` no se sube a git). Con `--help` salen todos los parámetros; los principales:

| Parámetro | Por defecto | Qué hace |
|---|---|---|
| `--profesores`, `--alumnos` | 40, 120 | Cantidad de cada tipo |
| `--clases` | 400 | Clases a intentar crear (algunas se descartan si no caen en una agenda libre) |
| `--consultas` | 30 | Consultas de soporte de visitantes |
| `--colegios`, `--materias` | todos | Cuántos de la lista usar |
| `--amigos-por-usuario` | 4 | Máximo de amigos que inicia cada usuario |
| `--prob-amistad-aceptada` | 0.9 | Proporción de amistades aceptadas |
| `--prob-resena`, `--prob-resena-aprobada` | 0.4, 0.9 | Reseñas por clase completada y proporción aprobada |
| `--likes-max-por-resena` | 3 | Me gusta por reseña aprobada |
| `--mensajes-min`, `--mensajes-max` | 2, 8 | Mensajes por chat |
| `--prob-chat-amigos-sin-clase` | 0.5 | Chats entre amigos aceptados sin clase |
| `--estados-pasadas`, `--estados-futuras` | 80/10/10 y 45/35/7/6/7 | Porcentajes, p. ej. `Completada=80,Cancelada=20` |
| `--estrellas` | 2/3/15/35/45 | Distribución, p. ej. `5=60,4=40` |
| `--dias-historial`, `--dias-futuro`, `--hoy` | 30, 30, ahora | Días de historial (clases pasadas), clases a futuro y fecha de referencia `AAAA-MM-DD` |
| `--precio-min`, `--precio-max`, `--precio-paso` | 3000, 9000, 500 | Precio por hora |
| `--prob-profesor-verificado` | 0.85 | Profesores verificados |
| `--prob-foto`, `--prob-dni` | 0.75, 0.6 | Usuarios con foto y con DNI |
| `--usar-fotos-propias`, `--patrones` | sí | Usar avatares de userData / texturas en los SVG de reserva. Admiten `--no-...` |
| `--perfil-profe-estrella` y los otros perfiles | sí | Admiten `--no-...` |
| `--cuenta-nombre`, `--cuenta-apellido`, `--cuenta-mail`, `--cuenta-tipo` | vacío | Cuenta propia |
| `--base` | `MIP` | Base de la línea `USE` y de la carga |
| `--semilla` | aleatoria | Para repetir el resultado |
| `--salida`, `--codificacion` | `salida/MIP-datos-prueba.sql`, `utf-16` | Archivo y codificación (`utf-16` o `utf-8`) |
| `--copiar-al-sitio [WWWROOT]` | no | Copia las imágenes al sitio |
| `--cargar`, `--servidor`, `--usuario`, `--contrasena-sql` | no, `localhost` | Carga con `sqlcmd` |

La consola sale con error si la verificación encuentra algún problema.

## Verificación

Antes de escribir, el motor revisa: mails únicos; clases dentro de la agenda y fuera de días bloqueados; fechas de emisión; estados de pasadas y futuras; materia que da el profesor; `fechaPropuesta` solo con "Pide cambio"; ningún profesor con dos clases a la misma hora; reseñas solo de alumno a profesor con clase Completada y una por par; Me gusta solo a reseñas aprobadas y nunca del autor; mensajes solo entre quienes tuvieron clase o son amigos aceptados.

Tests (no abren ventana): `python3 -m unittest tools/datos-prueba/test_generar_datos.py`.

## .exe opcional

```bash
pip install pyinstaller
pyinstaller --onefile --windowed --add-data "recursos;recursos" interfaz.pyw
```

Es opcional. El motor busca `recursos/` en el paquete del .exe (`sys._MEIPASS`) si existe, y si no, junto al script; las listas editadas hay que empaquetarlas de nuevo.

## Limitaciones

- Una sola sal para todas las cuentas de prueba (ahorra tiempo de hashing; no afecta el login).
- La carga con `sqlcmd` no se probó contra un SQL Server real en esta versión.
