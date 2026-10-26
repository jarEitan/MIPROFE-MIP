using System.Data;
using System.Security.Cryptography;
using Dapper;
using Microsoft.Data.SqlClient;

namespace MIP_MIPROFESOR.Models;

// Acceso a datos de inicio de sesión y registro. Usa los stored procedures
// registrarUsuario e iniciarSesion de la base MIP.
public class BDsesion
{
    private static string connectionString = @"Server=localhost;Database=MIP;Integrated Security=True;TrustServerCertificate=True;";

    private const int iteracionesHash = 100000;
    private const int bytesSal = 16;
    private const int bytesHash = 32;

    // Devuelve el resultado del SP; si es "ok" trae los datos de sesión del usuario nuevo.
    public ResultadoSesion registrarUsuario(RegistroUsuario registro)
    {
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirstOrDefault<ResultadoSesion>(
                "registrarUsuario",
                new
                {
                    nombre = registro.nombre,
                    apellido = registro.apellido,
                    mail = registro.mail,
                    contrasenaHash = generarHash(registro.contrasena),
                    fechaNacimiento = registro.fechaNacimiento,
                    tipoUsuario = registro.tipoUsuario
                },
                commandType: CommandType.StoredProcedure) ?? new ResultadoSesion { resultado = "datosInvalidos" };
        }
    }

    // Busca la cuenta por mail y verifica la contraseña contra el hash guardado.
    // resultado "ok" = datos correctos; "cuentaInexistente" = mail o contraseña incorrectos.
    public ResultadoSesion iniciarSesion(string mail, string contrasena)
    {
        ResultadoSesion cuenta;
        using (var connection = new SqlConnection(connectionString))
        {
            cuenta = connection.QueryFirstOrDefault<ResultadoSesion>(
                "iniciarSesion",
                new { mail = mail },
                commandType: CommandType.StoredProcedure) ?? new ResultadoSesion { resultado = "cuentaInexistente" };
        }

        if (cuenta.resultado != "ok") return cuenta;

        bool contrasenaCorrecta = verificarHash(contrasena, cuenta.contrasenaHash);
        cuenta.contrasenaHash = null;
        if (!contrasenaCorrecta) return new ResultadoSesion { resultado = "cuentaInexistente" };
        return cuenta;
    }

    // Formato guardado: pbkdf2$iteraciones$sal(base64)$hash(base64)
    private static string generarHash(string contrasena)
    {
        byte[] sal = RandomNumberGenerator.GetBytes(bytesSal);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(contrasena, sal, iteracionesHash, HashAlgorithmName.SHA256, bytesHash);
        return $"pbkdf2${iteracionesHash}${Convert.ToBase64String(sal)}${Convert.ToBase64String(hash)}";
    }

    private static bool verificarHash(string contrasena, string? hashGuardado)
    {
        if (string.IsNullOrEmpty(hashGuardado)) return false;
        string[] partes = hashGuardado.Split('$');
        if (partes.Length != 4 || partes[0] != "pbkdf2" || !int.TryParse(partes[1], out int iteraciones)) return false;

        try
        {
            byte[] sal = Convert.FromBase64String(partes[2]);
            byte[] hashEsperado = Convert.FromBase64String(partes[3]);
            byte[] hashCalculado = Rfc2898DeriveBytes.Pbkdf2(contrasena, sal, iteraciones, HashAlgorithmName.SHA256, hashEsperado.Length);
            return CryptographicOperations.FixedTimeEquals(hashCalculado, hashEsperado);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
