using System.Security.Cryptography;
using Dapper;
using Microsoft.Data.SqlClient;

namespace MIP_MIPROFESOR.Models;

public class BDsesion
{
    private static string connectionString = @"Server=localhost;Database=MIP;Integrated Security=True;TrustServerCertificate=True;";

    public Usuario registrarUsuario(Usuario registro)
    {
        registro.contrasena = encriptarContrasena(registro.contrasena);
        using (var connection = new SqlConnection(connectionString))
        {
            return connection.QueryFirst<Usuario>("EXEC registrarUsuario @nombre, @apellido, @mail, @contrasena, @fechaNacimiento, @tipoUsuario", registro);
        }
    }

    // El SP devuelve la contraseña encriptada del mail y acá se compara (codigo 2 = contraseña incorrecta)
    public Usuario iniciarSesion(string mail, string contrasena)
    {
        Usuario cuenta;
        using (var connection = new SqlConnection(connectionString))
        {
            cuenta = connection.QueryFirst<Usuario>("EXEC iniciarSesion @mail", new { mail = mail });
        }
        if (cuenta.codigo == 0 && !compararContrasena(contrasena, cuenta.contrasena))
        {
            cuenta = new Usuario { codigo = 2 };
        }
        return cuenta;
    }

    // Se guarda "sal.hash" en base64: PBKDF2 con SHA256 y una sal distinta por usuario
    private static string encriptarContrasena(string contrasena)
    {
        byte[] sal = RandomNumberGenerator.GetBytes(16);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(contrasena, sal, 100000, HashAlgorithmName.SHA256, 32);
        return Convert.ToBase64String(sal) + "." + Convert.ToBase64String(hash);
    }

    // Una contraseña sin encriptar no tiene el formato "sal.hash" y nunca coincide
    private static bool compararContrasena(string contrasena, string guardada)
    {
        string[] partes = guardada.Split('.');
        if (partes.Length != 2) return false;

        byte[] sal = Convert.FromBase64String(partes[0]);
        byte[] hashGuardado = Convert.FromBase64String(partes[1]);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(contrasena, sal, 100000, HashAlgorithmName.SHA256, hashGuardado.Length);
        return CryptographicOperations.FixedTimeEquals(hash, hashGuardado);
    }
}
