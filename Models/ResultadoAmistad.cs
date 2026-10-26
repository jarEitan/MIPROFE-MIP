namespace MIP_MIPROFESOR.Models;

// estadoAmistad: ninguna | enviada | recibida | amigos
// codigo en enviarAmistad: 0 = ok, 1 = sos vos, 2 = el perfil no existe, 3 = ya hay solicitud o ya son amigos
// codigo en quitarAmistad: 0 = ok, 1 = no había nada para quitar
public class ResultadoAmistad
{
    public int codigo { get; set; }
    public string estadoAmistad { get; set; } = "ninguna";
    public int cantidadAmigos { get; set; }
}
