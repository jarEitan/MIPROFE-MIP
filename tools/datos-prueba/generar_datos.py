#!/usr/bin/env python3
"""Genera un .sql con datos de prueba para la base MIP, con fechas relativas a hoy.

Uso (ver README.md):
    python generar_datos.py --profesores 40 --alumnos 120 --anios 2 --semilla 7

Solo usa la biblioteca estándar. El .sql generado solo hace DELETE + INSERT (sin funciones SQL),
así que corre después de 01_estructura y 02_stored_procedures.
"""
import argparse
import base64
import datetime as dt
import hashlib
import os
import random
import secrets
import unicodedata

CONTRASENA = "12345678"
ITERACIONES = 100000  # las mismas que Models/BDsesion.cs

ESCUELAS = [
    "Nacional Buenos Aires", "Carlos Pellegrini", "Belgrano Day School", "Colegio San Martín",
    "ORT Argentina", "Liceo Nº 1", "Colegio Mariano Moreno", "Colegio Nicolás Avellaneda",
    "Escuela Normal Nº 1", "Escuela Normal Nº 2", "Escuela Normal Nº 9", "Lenguas Vivas J. R. Fernández",
    "Escuela Técnica Otto Krause", "Escuela Técnica Raggio", "Colegio del Salvador", "Colegio Champagnat",
]
MATERIAS = ["Matemática", "Física", "Química", "Biología", "Lengua", "Literatura", "Inglés", "Alemán",
            "Historia", "Geografía", "Economía", "Programación", "Francés", "Filosofía", "Contabilidad"]
NIVELES = ["Primaria", "Secundario 1", "Secundario 2", "Secundario 3", "Secundario 4", "Secundario 5",
           "Secundario 6", "Universitario"]
MODALIDADES = ["Presencial", "Virtual"]
NOMBRES = ["Eitan", "Gabriela", "Delfina", "Sofía", "Thiago", "Eugenia", "Facundo", "Tamara", "Rocío",
           "Lucas", "Valentina", "Mateo", "Julieta", "Santiago", "Camila", "Martín", "Agustina", "Nicolás",
           "Florencia", "Ignacio", "Lautaro", "Paula", "Gonzalo", "Micaela", "Bruno", "Carolina", "Joaquín",
           "Luciana", "Ezequiel", "Milagros", "Tomás", "Sol", "Franco", "Victoria", "Pablo", "Renata",
           "Matías", "Abril", "Iván", "Brenda"]
APELLIDOS = ["Glaz", "Silva", "Villalba", "Martínez", "Fontana", "Nieva", "Orellana", "Díaz", "Montenegro",
             "Pérez", "Gómez", "Rodríguez", "López", "Fernández", "González", "Sosa", "Romero", "Torres",
             "Ramírez", "Acosta", "Benítez", "Castro", "Ruiz", "Herrera", "Medina", "Suárez", "Ortiz",
             "Correa", "Navarro", "Vega"]
TITULOS = ["Profesor/a de {m} (IFD)", "Licenciado/a en {m} (UBA)", "Profesor/a de {m} (UNLP)",
           "Estudiante avanzado de {m}", "Técnico/a en {m}"]
DESCRIPCIONES_PROF = [
    "Doy clases de {m} con paciencia y ejemplos de la vida diaria. Preparo para exámenes y repasos.",
    "Profesor/a de {m} con experiencia en secundario. Me gusta que el alumno entienda, no que memorice.",
    "Clases de {m} online o presenciales, con material propio y seguimiento de cada tema.",
]
DESCRIPCIONES_ALUM = [
    "Busco ayuda con {m} para subir mis notas antes de los exámenes.",
    "Necesito apoyo en {m} para ponerme al día con el curso.",
    "Quiero reforzar {m} con clases semanales.",
]
RESENAS = ["Muy buena clase, explica claro.", "Puntual y con buena onda. Recomendado.",
           "Me sirvió mucho para el parcial.", "Buen ritmo, pero me gustaría más ejercicios.",
           "Excelente, ya tengo otra clase agendada.", "Clase correcta, cumplió lo que prometió."]
MENSAJES = ["Hola, ¿das clases de {m}?", "¿Qué día te queda libre esta semana?",
            "Gracias por la clase de hoy.", "¿Podemos cambiar el horario del jueves?",
            "Te mando el material que vimos.", "Perfecto, nos vemos entonces.",
            "¿Cuánto cobrás por hora?", "Me sirvió muchísimo, gracias."]
CONSULTAS = [("cuenta", "No puedo iniciar sesión."), ("clases", "No me aparece una clase que pedí."),
             ("sugerencia", "Sería útil poder filtrar por precio."), ("otro", "Consulta general de prueba.")]


def sql_str(s):
    return "N'" + s.replace("'", "''") + "'"


def sql_dt(d):
    return "CAST(N'%s' AS DateTime)" % d.strftime("%Y-%m-%dT%H:%M:%S")


def sql_date(d):
    return "CAST(N'%s' AS Date)" % d.strftime("%Y-%m-%d")


def sql_hora(h):
    return "CAST(N'%s' AS Time)" % h


def ref_usuario(mail):
    return "(SELECT ID FROM Usuarios WHERE mail = %s)" % sql_str(mail)


def ref_por_nombre(tabla, nombre):
    return "(SELECT ID FROM %s WHERE nombre = %s)" % (tabla, sql_str(nombre))


def normalizar(texto):
    sin_tildes = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return sin_tildes.lower().replace(" ", "")


def hash_contrasena():
    # Mismo formato que BDsesion.encriptarContrasena: "sal.hash" en base64, PBKDF2-SHA256.
    # Shortcut: una sola sal para todas las cuentas de prueba (ahorra ~40 s de hashing).
    sal = secrets.token_bytes(16)
    hash_ = hashlib.pbkdf2_hmac("sha256", CONTRASENA.encode(), sal, ITERACIONES, 32)
    return base64.b64encode(sal).decode() + "." + base64.b64encode(hash_).decode()


def generar(args):
    rnd = random.Random(args.semilla)
    hoy = dt.datetime.combine(args.hoy, dt.time(20, 0)) if args.hoy else dt.datetime.now().replace(microsecond=0)
    inicio = hoy - dt.timedelta(days=365 * args.anios)
    sql = []   # cada elemento es una sentencia, sin ";"
    clave = hash_contrasena()

    # ---------- catálogos ----------
    for e in ESCUELAS[: args.colegios]:
        sql.append("INSERT [dbo].[Escuelas] ([nombre], [direccion]) VALUES (%s, NULL)" % sql_str(e))
    for m in MATERIAS:
        sql.append("INSERT [dbo].[Materias] ([nombre]) VALUES (%s)" % sql_str(m))
    for n in NIVELES:
        sql.append("INSERT [dbo].[Niveles] ([nombre]) VALUES (%s)" % sql_str(n))
    for m in MODALIDADES:
        sql.append("INSERT [dbo].[Modalidades] ([nombre]) VALUES (%s)" % sql_str(m))

    # ---------- usuarios ----------
    usuarios = []  # dicts: mail, tipo, nombre, apellido, ...
    usados_mail, usados_dni = set(), set()
    total = args.profesores + args.alumnos
    for i in range(total):
        tipo = "profesor" if i < args.profesores else "alumno"
        nombre, apellido = rnd.choice(NOMBRES), rnd.choice(APELLIDOS)
        base = "%s.%s" % (normalizar(nombre), normalizar(apellido))
        mail, n = base + "@mip.edu.ar", 2
        while mail in usados_mail:
            mail = "%s%d@mip.edu.ar" % (base, n)
            n += 1
        usados_mail.add(mail)
        dni = str(rnd.randint(10000000, 45999999))
        while dni in usados_dni:
            dni = str(rnd.randint(10000000, 45999999))
        usados_dni.add(dni)
        ins = inicio + dt.timedelta(days=rnd.randint(0, 90), minutes=rnd.randint(0, 1400))
        if tipo == "profesor":
            nac = dt.date(hoy.year - rnd.randint(24, 65), rnd.randint(1, 12), rnd.randint(1, 28))
        else:
            nac = dt.date(hoy.year - rnd.randint(14, 40), rnd.randint(1, 12), rnd.randint(1, 28))
        verificado = 1 if (tipo == "alumno" or rnd.random() < 0.85) else 0
        u = dict(mail=mail, tipo=tipo, nombre=nombre, apellido=apellido, ins=ins)
        usuarios.append(u)
        sql.append(
            "INSERT [dbo].[Usuarios] ([nombre], [apellido], [mail], [contrasena], [dni], [fotoPerfil], "
            "[direccion], [fotoDni], [tipoUsuario], [fechaNacimiento], [fechaInscripcion], [verificado]) VALUES "
            "(%s, %s, %s, %s, %s, NULL, %s, NULL, %s, %s, %s, %d)" % (
                sql_str(nombre), sql_str(apellido), sql_str(mail), sql_str(clave), sql_str(dni),
                sql_str("Calle %s %d" % (rnd.choice(APELLIDOS), rnd.randint(100, 4000))) if rnd.random() < 0.6 else "NULL",
                sql_str(tipo), sql_date(nac), sql_dt(ins), verificado))

    profesores = [u for u in usuarios if u["tipo"] == "profesor"]
    alumnos = [u for u in usuarios if u["tipo"] == "alumno"]
    for u in usuarios:
        m = rnd.choice(MATERIAS).lower()
        if rnd.random() < 0.9:
            plantilla = rnd.choice(DESCRIPCIONES_PROF if u["tipo"] == "profesor" else DESCRIPCIONES_ALUM)
            sql.append("INSERT [dbo].[Perfiles] ([idUsuario], [descripcion]) VALUES (%s, %s)" % (
                ref_usuario(u["mail"]), sql_str("<p>%s</p>" % plantilla.format(m=m))))
        u["materias"] = rnd.sample(MATERIAS, rnd.randint(1, 3))
        for mat in u["materias"]:
            sql.append("INSERT [dbo].[Usuarios_Materias] ([idUsuario], [idMateria]) VALUES (%s, %s)" % (
                ref_usuario(u["mail"]), ref_por_nombre("Materias", mat)))
        for niv in rnd.sample(NIVELES, rnd.randint(1, 2)):
            sql.append("INSERT [dbo].[Usuarios_Niveles] ([idUsuario], [idNivel]) VALUES (%s, %s)" % (
                ref_usuario(u["mail"]), ref_por_nombre("Niveles", niv)))
        # Colegios: profesores con año desde (1 de enero), alumnos sin año (NULL)
        for esc in rnd.sample(ESCUELAS[: args.colegios], rnd.randint(1, 2)):
            if u["tipo"] == "profesor":
                desde = "CAST(N'%d-01-01T00:00:00' AS DateTime)" % rnd.randint(inicio.year - 8, inicio.year)
            else:
                desde = "NULL"
            sql.append("INSERT [dbo].[Escuelas_Usuarios] ([idUsuario], [idEscuela], [desde]) VALUES (%s, %s, %s)" % (
                ref_usuario(u["mail"]), ref_por_nombre("Escuelas", esc), desde))

    # ---------- datos de profesor ----------
    disponibilidad = {}  # mail -> {"dias": {diaSemana: (desde, hasta)}, "bloqueados": set(date)}
    for p in profesores:
        sql.append("INSERT [dbo].[InfoProfesores] ([idUsuario], [precioHora]) VALUES (%s, %d)" % (
            ref_usuario(p["mail"]), rnd.randrange(3000, 9001, 500)))
        for t in rnd.sample(TITULOS, rnd.randint(1, 2)):
            sql.append("INSERT [dbo].[Titulos] ([idUsuario], [titulo]) VALUES (%s, %s)" % (
                ref_usuario(p["mail"]), sql_str(t.format(m=rnd.choice(MATERIAS)))))
        for mod in rnd.sample(MODALIDADES, rnd.randint(1, 2)):
            sql.append("INSERT [dbo].[Profesores_Modalidades] ([idUsuario], [idModalidad]) VALUES (%s, %s)" % (
                ref_usuario(p["mail"]), ref_por_nombre("Modalidades", mod)))
        dias = {}
        for dia in rnd.sample(range(1, 8), rnd.randint(2, 4)):  # 1 = lunes ... 7 = domingo
            desde_h = rnd.randint(8, 16)
            hasta_h = min(desde_h + rnd.randint(3, 5), 22)
            dias[dia] = (desde_h, hasta_h)
            sql.append("INSERT [dbo].[Disponibilidad] ([idProfesor], [diaSemana], [fecha], [desde], [hasta]) VALUES "
                       "(%s, %d, NULL, %s, %s)" % (ref_usuario(p["mail"]), dia, sql_hora("%02d:00:00" % desde_h),
                                                   sql_hora("%02d:00:00" % hasta_h)))
        bloqueados = set()
        for _ in range(rnd.randint(0, 2)):  # días bloqueados (bloquearDia): fecha con 00:00 a 23:59
            f = (inicio + dt.timedelta(days=rnd.randint(0, 365 * args.anios))).date()
            if f not in bloqueados:
                bloqueados.add(f)
                sql.append("INSERT [dbo].[Disponibilidad] ([idProfesor], [diaSemana], [fecha], [desde], [hasta]) VALUES "
                           "(%s, NULL, %s, %s, %s)" % (ref_usuario(p["mail"]), sql_date(f),
                                                       sql_hora("00:00:00"), sql_hora("23:59:00")))
        disponibilidad[p["mail"]] = {"dias": dias, "bloqueados": bloqueados}

    # ---------- clases ----------
    clases = []  # dicts: emisor, receptor, estado, fecha, emision, propuesta
    fin = hoy + dt.timedelta(days=30)
    for _ in range(args.clases):
        p = rnd.choice(profesores)
        alum = rnd.choice(alumnos)
        info = disponibilidad[p["mail"]]
        for _intento in range(50):
            dia_fecha = (inicio + dt.timedelta(days=120) + dt.timedelta(
                days=rnd.randint(0, (fin - inicio).days - 120))).date()
            if dia_fecha in info["bloqueados"] or dia_fecha.isoweekday() not in info["dias"]:
                continue
            desde_h, hasta_h = info["dias"][dia_fecha.isoweekday()]
            hora = rnd.randint(desde_h, hasta_h - 1)
            fecha = dt.datetime.combine(dia_fecha, dt.time(hora, 0))
            break
        else:
            continue
        # Emisor: cualquiera de los dos; el receptor es el otro
        emisor, receptor = (alum, p) if rnd.random() < 0.8 else (p, alum)
        if fecha < hoy:
            r = rnd.random()
            estado = "Completada" if r < 0.8 else ("No concretada" if r < 0.9 else "Cancelada")
        else:
            r = rnd.random()
            estado = ("Pendiente" if r < 0.45 else "Confirmada" if r < 0.8 else
                      "Rechazada" if r < 0.87 else "Pide cambio" if r < 0.93 else "Pide cancelar")
        emision = min(fecha - dt.timedelta(days=rnd.randint(1, 14), hours=rnd.randint(0, 23)), hoy)
        propuesta = fecha + dt.timedelta(days=1) if estado == "Pide cambio" else None
        materia = rnd.choice(p["materias"])  # la clase es de una materia que da el profesor
        clases.append(dict(emisor=emisor, receptor=receptor, estado=estado, fecha=fecha, emision=emision,
                           propuesta=propuesta, materia=materia))
        sql.append("INSERT [dbo].[Clases] ([idEmisor], [idReceptor], [idMateria], [estado], [fecha], [fechaEmision], "
                   "[fechaPropuesta]) VALUES (%s, %s, %s, %s, %s, %s, %s)" % (
                       ref_usuario(emisor["mail"]), ref_usuario(receptor["mail"]), ref_por_nombre("Materias", materia),
                       sql_str(estado), sql_dt(fecha), sql_dt(emision), sql_dt(propuesta) if propuesta else "NULL"))

    # ---------- amigos, likes, mensajes, reseñas ----------
    pares_amistad = set()
    amistades = {}  # par -> estado
    for u in usuarios:
        for otro in rnd.sample(usuarios, min(len(usuarios), rnd.randint(0, 4))):
            if otro is u or (u["mail"], otro["mail"]) in pares_amistad or (otro["mail"], u["mail"]) in pares_amistad:
                continue
            pares_amistad.add((u["mail"], otro["mail"]))
            estado = "Aceptada" if rnd.random() < 0.9 else "Pendiente"
            amistades[frozenset((u["mail"], otro["mail"]))] = estado
            sql.append("INSERT [dbo].[Amigos] ([idUsuario1], [idUsuario2], [estado]) VALUES (%s, %s, %s)" % (
                ref_usuario(u["mail"]), ref_usuario(otro["mail"]), sql_str(estado)))


    # Mensajes entre quienes tuvieron clase (la más antigua marca el inicio del chat)
    chats = {}
    for c in clases:
        clave_par = tuple(sorted([c["emisor"]["mail"], c["receptor"]["mail"]]))
        if clave_par not in chats or c["emision"] < chats[clave_par]:
            chats[clave_par] = c["emision"]
    usuario_por_mail = {u["mail"]: u for u in usuarios}
    for par, estado_amistad in amistades.items():
        a, b = sorted(par)
        if estado_amistad == "Aceptada" and (a, b) not in chats and rnd.random() < 0.5:
            chats[(a, b)] = hoy - dt.timedelta(days=rnd.randint(10, 300))  # amigos sin clase: chat por amistad
    for (a, b), desde in chats.items():
        n = rnd.randint(2, 6)
        momentos = sorted(desde + (hoy - desde) * rnd.random() for _ in range(n))
        for k, momento in enumerate(momentos):
            emisor, receptor = (usuario_por_mail[a], usuario_por_mail[b]) if k % 2 == 0 else (
                usuario_por_mail[b], usuario_por_mail[a])
            reciente = (hoy - momento).days < 7
            estado = "No visto" if (reciente and rnd.random() < 0.3 and k == n - 1) else "Visto"
            texto = rnd.choice(MENSAJES).format(m=rnd.choice(MATERIAS).lower())
            sql.append("INSERT [dbo].[Mensajes] ([idReceptor], [idEmisor], [contenido], [estado], [fechaEnvio]) VALUES "
                       "(%s, %s, %s, %s, %s)" % (ref_usuario(receptor["mail"]), ref_usuario(emisor["mail"]),
                                                 sql_str(texto), sql_str(estado), sql_dt(momento)))

    # Reseñas: solo de un alumno a un profesor con una clase Completada, una por par
    resenado = set()
    aprobadas = []
    for c in clases:
        if c["estado"] != "Completada" or "alumno" not in (c["emisor"]["tipo"], c["receptor"]["tipo"]):
            continue
        alum = c["emisor"] if c["emisor"]["tipo"] == "alumno" else c["receptor"]
        prof = c["receptor"] if alum is c["emisor"] else c["emisor"]
        if (alum["mail"], prof["mail"]) in resenado or rnd.random() < 0.6:
            continue
        resenado.add((alum["mail"], prof["mail"]))
        estado = "Aprobada" if rnd.random() < 0.9 else "NULL"
        sql.append("INSERT [dbo].[Resenas] ([idEmisor], [idReceptor], [estado], [puntuacion], [descripcion]) VALUES "
                   "(%s, %s, %s, %d, %s)" % (ref_usuario(alum["mail"]), ref_usuario(prof["mail"]),
                                             "NULL" if estado == "NULL" else sql_str(estado),
                                             rnd.choice([3, 4, 4, 5, 5]), sql_str(rnd.choice(RESENAS))))
        if estado == "Aprobada":
            aprobadas.append((alum["mail"], prof["mail"]))

    # Me gusta solo en reseñas aprobadas, nunca del autor de la reseña
    for autor, receptor in aprobadas:
        otros = [u["mail"] for u in usuarios if u["mail"] not in (autor, receptor)]
        for mail in rnd.sample(otros, rnd.randint(0, 3)):
            sql.append("INSERT [dbo].[LikesResenas] ([idUsuario], [idResena]) VALUES (%s, (SELECT ID FROM Resenas "
                       "WHERE idEmisor = %s AND idReceptor = %s))" % (ref_usuario(mail), ref_usuario(autor),
                                                                   ref_usuario(receptor)))

    for i in range(args.consultas):
        tipo, msg = CONSULTAS[i % len(CONSULTAS)]
        estado = "Pendiente" if rnd.random() < 0.3 else "Resuelta"
        sql.append("INSERT [dbo].[Consultas_Soporte] ([idUsuario], [nombre], [correo], [tipo], [mensaje], [estado], [fecha]) "
                   "VALUES (NULL, %s, %s, %s, %s, %s, %s)" % (
                       sql_str("Visitante %d" % (i + 1)), sql_str("visitante%d@example.com" % (i + 1)),
                       sql_str(tipo), sql_str(msg), sql_str(estado),
                       sql_dt(hoy - dt.timedelta(days=rnd.randint(0, 365 * args.anios)))))

    verificar(usuarios, clases, disponibilidad, sql, hoy)
    return cabecera(hoy, args) + sql


def cabecera(hoy, args):
    borrar = ["Amigos", "Clases", "Consultas_Soporte", "Disponibilidad", "Escuelas_Usuarios", "InfoProfesores",
              "LikesResenas", "Mensajes", "Perfiles", "Profesores_Modalidades", "Resenas", "Titulos", "Usuarios_Materias",
              "Usuarios_Niveles", "Escuelas", "Materias", "Modalidades", "Niveles", "Usuarios"]
    lineas = ["USE [MIP]", "GO"]
    lineas += ["DELETE FROM [dbo].[%s]" % t for t in borrar]
    lineas += ["GO", "-- Generado por tools/datos-prueba/generar_datos.py: hoy=%s, semilla=%s, anios=%d, "
               "profesores=%d, alumnos=%d, clases=%d" % (hoy.date(), args.semilla, args.anios, args.profesores,
                                                       args.alumnos, args.clases), "GO"]
    return ["RAW:" + l for l in lineas]


def verificar(usuarios, clases, disponibilidad, sql, hoy):
    """Chequeos de coherencia: fallan si algo no cumple las reglas de la BD."""
    # Reseñas (solo con clase Completada) y Me gusta (solo a reseñas aprobadas, nunca del autor) se arman con esas reglas en generar().
    assert len({u["mail"] for u in usuarios}) == len(usuarios), "mails repetidos"
    for c in clases:
        info = disponibilidad[c["receptor"]["mail"] if c["receptor"]["tipo"] == "profesor" else c["emisor"]["mail"]]
        d = c["fecha"]
        assert d.isoweekday() in info["dias"], "clase fuera de la agenda semanal"
        assert d.date() not in info["bloqueados"], "clase en un día bloqueado"
        assert c["emision"] <= hoy and c["emision"] <= c["fecha"], "fechaEmision inválida"
        if c["fecha"] < hoy:
            assert c["estado"] in ("Completada", "No concretada", "Cancelada"), "clase pasada sin cerrar"
        prof = c["receptor"] if c["receptor"]["tipo"] == "profesor" else c["emisor"]
        assert c["materia"] in prof["materias"], "materia que el profesor no da"
        if c["propuesta"] is not None:
            assert c["estado"] == "Pide cambio", "fechaPropuesta sin pedido de cambio"


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--profesores", type=int, default=40)
    p.add_argument("--alumnos", type=int, default=120)
    p.add_argument("--clases", type=int, default=2500, help="clases a intentar crear")
    p.add_argument("--consultas", type=int, default=30)
    p.add_argument("--colegios", type=int, default=len(ESCUELAS), help="cuántos colegios usar (máx. %d)" % len(ESCUELAS))
    p.add_argument("--anios", type=int, default=2, help="años de historia hasta hoy")
    p.add_argument("--semilla", type=int, default=None, help="semilla para repetir el mismo resultado")
    p.add_argument("--hoy", type=lambda s: dt.date.fromisoformat(s), default=None,
                   help="fecha de referencia YYYY-MM-DD (por defecto, ahora)")
    p.add_argument("--salida", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida",
                                                    "MIP-datos-prueba.sql"))
    args = p.parse_args()
    if args.semilla is None:
        args.semilla = random.randrange(1, 10**6)
    args.colegios = max(1, min(args.colegios, len(ESCUELAS)))

    partes = generar(args)
    os.makedirs(os.path.dirname(args.salida), exist_ok=True)
    # Se usa UTF-8 con BOM (SSMS lo abre bien). Un GO cada 500 sentencias para no armar un lote gigante.
    with open(args.salida, "w", encoding="utf-8-sig", newline="\r\n") as f:
        contador = 0
        for linea in partes:
            if linea.startswith("RAW:"):
                f.write(linea[4:] + "\n")
                continue
            f.write(linea + "\n")
            contador += 1
            if contador % 500 == 0:
                f.write("GO\n")
        f.write("GO\n")
    print("Listo: %s (%d sentencias, semilla %d)" % (args.salida, contador, args.semilla))


if __name__ == "__main__":
    main()
