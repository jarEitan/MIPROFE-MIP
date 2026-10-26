namespace MIP_MIPROFESOR.Models;

// Guarda en la sesión si la cuenta está verificada y qué le falta.
// Lo usan el login/registro (SesionController) y el guardado del perfil (PerfilesController).
// Claves de sesión: "verificado" ("true" / "false") y "datosFaltantes" (texto del aviso).
public static class VerificacionCuenta
{
    public static void guardarEnSesion(ISession sesion, bool verificado, List<string> faltantes)
    {
        sesion.SetString("verificado", verificado ? "true" : "false");
        sesion.SetString("datosFaltantes", unirFaltantes(faltantes));
    }

    // ["el DNI", "la dirección", "tu colegio"] → "el DNI, la dirección y tu colegio"
    public static string unirFaltantes(List<string> faltantes)
    {
        if (faltantes.Count == 0) return "";
        if (faltantes.Count == 1) return faltantes[0];
        return string.Join(", ", faltantes.Take(faltantes.Count - 1)) + " y " + faltantes[faltantes.Count - 1];
    }
}
