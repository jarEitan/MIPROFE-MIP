# Generador de datos de prueba (MIP)

Script en Python (solo biblioteca estándar) que arma un `.sql` con datos de prueba para la base `MIP`.
Las fechas se calculan a partir de hoy: hay historia de 2 años hasta hoy y clases futuras.

Es un extra. Los tres archivos de `MIP_Estructuras/` no se tocan.

## Uso

```bash
python tools/datos-prueba/generar_datos.py                       # valores por defecto
python tools/datos-prueba/generar_datos.py --profesores 60 --alumnos 200 --clases 4000
python tools/datos-prueba/generar_datos.py --semilla 7           # mismo resultado en cada corrida
python tools/datos-prueba/generar_datos.py --hoy 2026-06-01      # simular otra fecha de referencia
```

Genera `tools/datos-prueba/salida/MIP-datos-prueba.sql` (la carpeta `salida/` no se sube a git).
Para otro archivo, usar `--salida ruta/archivo.sql`.

| Parámetro | Por defecto | Qué hace |
|---|---|---|
| `--profesores` | 40 | Cantidad de profesores |
| `--alumnos` | 120 | Cantidad de alumnos |
| `--clases` | 2500 | Clases a intentar crear (algunas se descartan si no caen en la agenda) |
| `--consultas` | 30 | Consultas de soporte de visitantes |
| `--colegios` | 16 | Colegios a usar (máximo 16) |
| `--anios` | 2 | Años de historia hasta hoy |
| `--semilla` | aleatoria | Semilla para repetir el mismo resultado |
| `--hoy` | ahora | Fecha de referencia `AAAA-MM-DD` |
| `--salida` | `salida/MIP-datos-prueba.sql` | Archivo de salida |

## Cómo cargarlo

1. Ejecutar `MIP_Estructuras/MIP-BD_01_estructura.sql`.
2. Ejecutar `MIP_Estructuras/MIP-BD_02_stored_procedures.sql`.
3. Ejecutar el `.sql` generado (SSMS o `sqlcmd -i`).

El script borra todas las tablas (igual que `03_datos_prueba`) y después inserta. No usa funciones SQL: solo `INSERT`, `DELETE`, subconsultas y `CAST`.

## Cuentas de prueba

- Mail: `nombre.apellido@mip.edu.ar`, con tildes quitadas (si se repite, lleva un número: `lucas.gomez2@mip.edu.ar`).
- Contraseña: `12345678`.
- El admin no se genera: se crea a mano en la BD.

## Qué genera

- Usuarios (profesores y alumnos), perfiles, títulos, materias, niveles, modalidades y colegios.
- Agenda semanal y días bloqueados de cada profesor. Las clases caen dentro de la agenda.
- Clases: pasadas (Completada, No concretada, Cancelada); futuras (Pendiente, Confirmada, Rechazada, Pide cambio, Pide cancelar). Cada clase tiene una materia (`idMateria`) que da el profesor.
- Mensajes entre quienes tuvieron clase y entre amigos aceptados sin clase, con estado Visto o No visto.
- Amigos: aceptados (con y sin clase entre ellos), pendientes y pares sin relación.
- Me gusta solo en reseñas (`LikesResenas`): solo a reseñas aprobadas y nunca del autor de la reseña.
- Reseñas: solo de alumno a profesor con una clase Completada entre los dos, una por par.
- Consultas de soporte de visitantes.

## Verificación

Antes de escribir el archivo, el script revisa que la agenda, los días bloqueados, las fechas de emisión y los estados sean coherentes. Si algo falla, no escribe nada.

Probado el 2026-11-04 con SQL Server 2022 (contenedor): `01`, `02` y `03` corren en orden sin error, y el `.sql` generado con los valores por defecto también. Después se revisó: cada clase tiene materia que da su profesor, no hay Me gusta a reseñas no aprobadas ni propios, y no hay reseñas sin clase Completada.
La contraseña generada coincide con la verificación PBKDF2 de `Models/BDsesion.cs`.

## Limitaciones

- Una sola sal para todas las cuentas de prueba (ahorra tiempo de hashing; no afecta el login).
- Las fotos y los DNI quedan en NULL (no hay archivos).
