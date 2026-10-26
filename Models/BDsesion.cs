using Dapper;
using Microsoft.Data.SqlClient;

namespace MIP_MIPROFESOR.Models;

public class BDsesion
{
    private static string connectionString = @"Server=localhost;Database=MIP;Integrated Security=True;TrustServerCertificate=True;";

    public ResultadoSesion registrarUsuario(RegistroUsuario registro)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoSesion>("EXEC registrarUsuario @nombre, @apellido, @mail, @contrasena, @fechaNacimiento, @tipoUsuario", registro);
        }
    }

    public ResultadoSesion iniciarSesion(string mail, string contrasena)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<ResultadoSesion>("EXEC iniciarSesion @mail, @contrasena", new { mail = mail, contrasena = contrasena });
        }
    }
}
