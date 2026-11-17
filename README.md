# MIP (miProfesor)

Plataforma web que conecta a **alumnos** con **profesores particulares**. Los profesores muestran su materia, sus colegios, su modalidad y su precio por hora. Los alumnos buscan en el catálogo, se hacen amigos, chatean, piden clases y dejan reseñas. Cada profesor tiene una agenda con sus horarios libres.

Es un proyecto escolar.

## Requisitos

- **.NET 9 SDK**. Verificalo con `dotnet --version`.
- **SQL Server** (Express sirve) y **SQL Server Management Studio** (SSMS). Alternativamente, `sqlcmd`.
- **Python 3.10+**, solo si querés usar el generador de datos de prueba.

## Pasos para iniciar el proyecto

### 1. Crear la base de datos

Abrí SSMS y creá una base vacía llamada `MIP`, o dejá que la cree el script 01 en el paso 3.

### 2. Crear una conexión

Conectate a tu instancia de SQL Server, preferiblemente a `localhost`.

### 3. Ejecutar los archivos 01 y 02

Desde SSMS o con `sqlcmd`, ejecutá en este orden:

1. `MIP_Estructuras/MIP-BD_01_estructura.sql`: crea la base y las tablas.
2. `MIP_Estructuras/MIP-BD_02_stored_procedures.sql`: crea los stored procedures.

> **Atención:** el script 01 tiene rutas de archivo de Windows (`C:\Program Files\Microsoft SQL Server\MSSQL14.MSSQLSERVER\...`). `MSSQL14` corresponde a SQL Server 2017; la versión 2019 usa `MSSQL15` y la 2022 usa `MSSQL16`. Si tu instalación tiene otra ruta, cambiala en el `FILENAME` del `CREATE DATABASE` o quitá esas cláusulas.

### 4. Cargar datos

Elegí una de estas dos opciones:

- **Archivo 03:** ejecutá `MIP_Estructuras/MIP-BD_03_datos_prueba.sql`.
- **Programa de tools:** generá datos propios con `tools/datos-prueba/`. Desde la consola:

  ```bash
  python tools/datos-prueba/generar_datos.py --profesores 60 --alumnos 200 --clases 4000
  ```

  También podés abrir la ventana con `python tools/datos-prueba/interfaz.pyw`. El `.sql` generado queda en `tools/datos-prueba/salida/` y hay que ejecutarlo igual que el archivo 03. Cargarlo **borra todos los datos** de la base `MIP`.

### 5. Verificar la cadena de conexión (opcional)

Si la aplicación no se conecta a la base, revisá la cadena de conexión. Está escrita en el código, en dos archivos:

- `Models/BD.cs`
- `Models/BDsesion.cs`

Por defecto es:

```csharp
@"Server=localhost;Database=MIP;Integrated Security=True;TrustServerCertificate=True;"
```

Si tu instancia tiene otro nombre (por ejemplo `localhost\SQLEXPRESS`) o usás autenticación SQL, cambiala **en los dos archivos**.

### 6. Iniciar la aplicación

Desde la carpeta raíz del proyecto (la que contiene `MIP-MIPROFESOR.csproj`):

```bash
dotnet run
```

La consola muestra la dirección en la que quedó disponible (por defecto `http://localhost:5299`).

## Datos extra

- **Contraseña de las cuentas de prueba:** `12345678`.
- **Crear un usuario admin:** los moderadores no se registran desde la web. Registrá primero la cuenta normalmente y después ejecutá:

  ```sql
  UPDATE Usuarios SET tipoUsuario = 'admin' WHERE mail = 'tu.mail@ejemplo.com';
  ```

## Estado del proyecto

El detalle está en `Info/progreso.md`. Quedan pendientes el formulario de consulta de Soporte, las sugerencias del buscador, los filtros avanzados y el pedido de clase de un alumno por parte de un profesor.

Nada de esto se probó todavía en el navegador. Antes de probar, ejecutá los tres scripts de `MIP_Estructuras/` y reiniciá la aplicación.

---

*Equipo: Francisco Martínez (Project Leader) · Tobias Schatzyki (Database Engineer) · Eitan Ariel Glaz (Front-end) · Ariel Chocron (Back-end)*
