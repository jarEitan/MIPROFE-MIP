# MIP (miProfesor)

Plataforma web que conecta a **alumnos** con **profesores particulares**. Los profesores muestran su materia, sus colegios, su modalidad y su precio por hora. Los alumnos buscan en el catálogo, se hacen amigos, chatean, piden clases y dejan reseñas. Cada profesor tiene una agenda con sus horarios libres.

## Integrantes

- **Francisco Martínez** — Project Leader & UX/UI designer
- **Tobias Schatzyki** — Database Engineer
- **Eitan Ariel Glaz** — Front-end
- **Ariel Chocron** — Back-end

## Funcionalidades

- **Cuentas y sesiones:** registro de alumnos y profesores (con validación de mayoría de edad para profesores), inicio y cierre de sesión, y estado de verificación de cuenta.
- **Catálogo de profesores:** listado paginado con búsqueda por texto y filtros por materia, colegio, modalidad y nivel educativo, además de profesores destacados en el inicio.
- **Perfiles:** visualización pública y edición del perfil propio, carga y recorte de foto de perfil, carga de foto de DNI (visible solo para moderadores) y descripción enriquecida.
- **Agenda y clases:** configuración de franjas horarias semanales y bloqueo de días para profesores; pedido, aceptación, rechazo, retiro, cancelación y reubicación de clases con calendario interactivo.
- **Historial y reseñas:** historial paginado de clases, publicación y borrado de reseñas con puntaje y sistema de likes en reseñas.
- **Amigos, chat y notificaciones:** solicitudes de amistad, mensajería entre usuarios y panel de control con notificaciones y contadores.
- **Soporte y moderación:** envío de consultas o denuncias desde Soporte y panel para moderadores (`admin`) para responder consultas, verificar usuarios, borrar reseñas y suspender cuentas.

## Cómo ejecutar el proyecto

### Requisitos

- **.NET 9 SDK**. Verificalo con `dotnet --version`.
- **SQL Server** (Express sirve) y **SQL Server Management Studio** (SSMS). Alternativamente, `sqlcmd`.
- **Python 3.10+**, solo si querés usar el generador de datos de prueba.

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

### 6. Iniciar la aplicación con `dotnet run`

Abrí una terminal en la carpeta raíz del proyecto (donde está `MIP-MIPROFESOR.csproj`) y ejecutá:

```bash
dotnet run
```

La consola va a compilar y levantar el servidor local mostrando la dirección disponible (por defecto `http://localhost:5299`). Abrí esa URL en el navegador para usar la aplicación.

## Enlaces

- **Miro:** https://miro.com/app/board/uXjVHVYvc3g=/
- **Trello:** https://trello.com/b/J4Kdwphi/mip
- **Figma:** https://www.figma.com/design/HDhfuOx62CKtV0MSiQWDl4/MIP?node-id=0-1&p=f&t=FyX5OXv43Er4W7z9-0