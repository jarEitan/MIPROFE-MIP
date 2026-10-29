namespace MIP_MIPROFESOR.Models;

// Las fechas salen crudas de la BD; este es el texto de las fechas de clase en los mensajes y las notificaciones
public static class TextoFecha
{
    // "21/11 a las 12:00"
    public static string clase(DateTime fecha)
    {
        return fecha.ToString("dd/MM 'a las' HH:mm", System.Globalization.CultureInfo.InvariantCulture);
    }
}
