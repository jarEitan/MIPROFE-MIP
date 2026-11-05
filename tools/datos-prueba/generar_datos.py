#!/usr/bin/env python3
"""Genera un .sql (y las imágenes) con datos de prueba para la base MIP, con fechas relativas a hoy.

Uso por consola (ver README.md); la ventana está en interfaz.pyw:
    python generar_datos.py --profesores 40 --alumnos 120 --dias-historial 30 --semilla 7

Solo usa la biblioteca estándar. El .sql generado solo hace DELETE + INSERT (sin funciones SQL),
así que corre después de 01_estructura y 02_stored_procedures.
"""
import argparse
import base64
import dataclasses
import datetime as dt
import hashlib
import json
import os
import random
import shutil
import struct
import subprocess
import sys
import unicodedata
import zlib
from xml.sax.saxutils import escape

CONTRASENA = "12345678"
ITERACIONES = 100000  # las mismas que Models/BDsesion.cs
NIVELES = ["Primaria", "Secundario 1", "Secundario 2", "Secundario 3", "Secundario 4", "Secundario 5",
           "Secundario 6", "Universitario"]
MODALIDADES = ["Presencial", "Virtual"]
ESTADOS_PASADAS = ["Completada", "No concretada", "Cancelada"]
ESTADOS_FUTURAS = ["Pendiente", "Confirmada", "Rechazada", "Pide cambio", "Pide cancelar"]
EXT_FOTOS = (".jpg", ".jpeg", ".png", ".webp")
CARPETA_FOTOS_PERFIL = "userData/fotos-perfil"
CARPETA_DNI = "userData/dni"

# Perfiles armados: clave de config -> (mail, descripción corta)
PERFILES = {
    "perfil_profe_estrella": ("profe.estrella@mip.edu.ar", "Profesor verificado con mucha demanda"),
    "perfil_profe_nuevo": ("profe.nuevo@mip.edu.ar", "Profesor recién inscripto, sin verificar"),
    "perfil_alumno_nuevo": ("alumno.nuevo@mip.edu.ar", "Alumno recién inscripto, sin nada"),
    "perfil_alumno_completo": ("alumno.completo@mip.edu.ar", "Alumno con notificaciones de todos los tipos"),
    "perfil_sin_verificar": ("sin.verificar@mip.edu.ar", "Profesor con DNI subido y sin verificar"),
}

CONFIG_POR_DEFECTO = dict(
    # cantidades
    profesores=40, alumnos=120, clases=400, consultas=30,
    colegios=None, materias=None,  # None = todos los de la lista
    amigos_por_usuario=4, prob_amistad_aceptada=0.9,
    prob_resena=0.4, prob_resena_aprobada=0.9, likes_max_por_resena=3,
    mensajes_min=2, mensajes_max=8, prob_chat_amigos_sin_clase=0.5,
    # estados (porcentajes; se normalizan)
    estados_pasadas={"Completada": 80, "No concretada": 10, "Cancelada": 10},
    estados_futuras={"Pendiente": 45, "Confirmada": 35, "Rechazada": 7, "Pide cambio": 6, "Pide cancelar": 7},
    # fechas
    dias_historial=30, dias_futuro=30, hoy=None,
    # precios
    precio_min=3000, precio_max=9000, precio_paso=500,
    prob_profesor_verificado=0.85,
    # imágenes
    prob_foto=0.75, prob_dni=0.6, usar_fotos_propias=True, patrones=True,
    estrellas={1: 2, 2: 3, 3: 15, 4: 35, 5: 45},
    semilla=None,
    # perfiles armados
    perfil_profe_estrella=True, perfil_profe_nuevo=True, perfil_alumno_nuevo=True,
    perfil_alumno_completo=True, perfil_sin_verificar=True,
    cuenta_nombre="", cuenta_apellido="", cuenta_mail="", cuenta_tipo="alumno",
    # varios
    base="MIP", carpeta_recursos=None, materias_elegidas=None, colegios_elegidos=None,
)


class ErrorGenerador(Exception):
    """Error pensado para mostrarse tal cual al usuario."""


@dataclasses.dataclass
class Resultado:
    sentencias: list
    cabecera: list
    resumen: dict
    cuentas: list    # (mail, tipo, nombre completo, verificado, notas)
    imagenes: list   # (ruta relativa a la carpeta de salida, bytes o str)
    problemas: list
    datos: dict      # estructuras internas (para verificar y para los tests)
    config: dict


# ---------- recursos ----------

def carpeta_recursos():
    base = getattr(sys, "_MEIPASS", None) or os.path.dirname(os.path.abspath(__file__))  # _MEIPASS: .exe de PyInstaller
    return os.path.join(base, "recursos")


def _leer_lineas(carpeta, nombre):
    ruta = os.path.join(carpeta, nombre)
    if not os.path.isfile(ruta):
        raise ErrorGenerador("Falta el archivo de recursos: %s" % ruta)
    with open(ruta, encoding="utf-8-sig") as f:
        lineas = [l.strip() for l in f.read().splitlines()]
    return [l for l in lineas if l and not l.startswith("#")]


def cargar_recursos(carpeta=None):
    carpeta = carpeta or carpeta_recursos()
    rec = {n: _leer_lineas(carpeta, n + ".txt") for n in (
        "nombres_hombre", "nombres_mujer", "apellidos", "calles", "barrios", "materias", "titulos", "descripciones_profesor",
        "descripciones_alumno", "resenas_5", "resenas_4", "resenas_3", "resenas_1y2")}
    rec["colegios"] = [tuple((l.split("|", 1) + [None])[:2]) for l in _leer_lineas(carpeta, "colegios.txt")]
    rec["colegios"] = [(n.strip(), (d or "").strip() or None) for n, d in rec["colegios"]]
    ruta = os.path.join(carpeta, "chats.txt")
    if not os.path.isfile(ruta):
        raise ErrorGenerador("Falta el archivo de recursos: %s" % ruta)
    with open(ruta, encoding="utf-8-sig") as f:
        bloques = f.read().replace("\r\n", "\n").split("\n---\n")
    chats = [[l.strip() for l in b.split("\n") if l.strip() and not l.strip().startswith("#")] for b in bloques]
    rec["chats"] = [c for c in chats if len(c) >= 2]
    rec["consultas"] = []
    for l in _leer_lineas(carpeta, "consultas.txt"):
        tipo, _, msg = l.partition("|")
        if tipo.strip() not in ("cuenta", "clases", "sugerencia", "otro") or not msg.strip():
            raise ErrorGenerador("consultas.txt: línea inválida (tipo|mensaje): %s" % l)
        rec["consultas"].append((tipo.strip(), msg.strip()))
    if not rec["chats"]:
        raise ErrorGenerador("chats.txt no tiene conversaciones válidas")
    # Avatares predeterminados que ya están en el sitio (wwwroot/userData/fotos-perfil), sin los generados
    fotos = os.path.join(detectar_wwwroot(), *CARPETA_FOTOS_PERFIL.split("/"))
    rec["nombres"] = rec["nombres_hombre"] + rec["nombres_mujer"]
    rec["genero"] = dict([(n, "m") for n in rec["nombres_mujer"]] + [(n, "h") for n in rec["nombres_hombre"]])
    # Solo los avatares de fotos_perfil.txt (archivo|h o archivo|m) que están en la carpeta del sitio
    rec["genero_foto"] = {}
    for l in _leer_lineas(carpeta, "fotos_perfil.txt"):
        archivo, _, genero = l.partition("|")
        if genero.strip() not in ("h", "m"):
            raise ErrorGenerador("fotos_perfil.txt: línea inválida (archivo|h o archivo|m): %s" % l)
        if os.path.isfile(os.path.join(fotos, archivo.strip())) and archivo.strip().lower().endswith(EXT_FOTOS):
            rec["genero_foto"][archivo.strip()] = genero.strip()
    rec["fotos"] = sorted(rec["genero_foto"])
    return rec


# ---------- utilidades SQL ----------

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
    return "".join(c for c in sin_tildes.lower() if c.isalnum())


def hash_contrasena(rnd):
    # Mismo formato que BDsesion.encriptarContrasena: "sal.hash" en base64, PBKDF2-SHA256.
    # Shortcut: una sola sal para todas las cuentas de prueba (ahorra ~40 s de hashing). Sal desde la semilla: salida repetible.
    sal = rnd.randbytes(16)
    hash_ = hashlib.pbkdf2_hmac("sha256", CONTRASENA.encode(), sal, ITERACIONES, 32)
    return base64.b64encode(sal).decode() + "." + base64.b64encode(hash_).decode()


# ---------- imágenes ----------

PALETA = ["#FF5757", "#5CE1E6", "#D51F47", "#111827", "#6B7280", "#9CA3AF"]  # coral, cyan, magenta, negro, grises
PATRONES = ["rayas", "puntos", "ondas"]


def _rgb(hex_):
    return tuple(int(hex_[i:i + 2], 16) for i in (1, 3, 5))


def _luminancia(hex_):
    def canal(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (canal(c) for c in _rgb(hex_))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def color_texto(fondo):
    """Blanco o negro, el de mayor contraste con el fondo."""
    l = _luminancia(fondo)
    return "#FFFFFF" if (1.05 / (l + 0.05)) > ((l + 0.05) / 0.05) else "#111827"


def aclarar(hex_, k=0.22):
    return "#%02X%02X%02X" % tuple(round(c + (255 - c) * k) for c in _rgb(hex_))


def estilo_avatar(rnd, patrones=True):
    """(color de fondo, patrón o None). Lo usan el SVG y la vista previa de la ventana."""
    return rnd.choice(PALETA), (rnd.choice(PATRONES) if patrones and rnd.random() < 0.7 else None)


def svg_avatar(iniciales, fondo, patron):
    claro = aclarar(fondo)
    defs, relleno = "", ""
    if patron == "rayas":
        defs = ('<pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
                '<rect width="10" height="24" fill="%s"/></pattern>' % claro)
    elif patron == "puntos":
        defs = ('<pattern id="p" width="32" height="32" patternUnits="userSpaceOnUse">'
                '<circle cx="8" cy="8" r="4" fill="%s"/><circle cx="24" cy="24" r="4" fill="%s"/></pattern>' % (claro, claro))
    elif patron == "ondas":
        defs = ('<pattern id="p" width="64" height="32" patternUnits="userSpaceOnUse">'
                '<path d="M0 16 Q16 0 32 16 T64 16" fill="none" stroke="%s" stroke-width="6"/></pattern>' % claro)
    if patron:
        relleno = '<rect width="256" height="256" fill="url(#p)"/>'
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">'
            '<defs>%s</defs><rect width="256" height="256" fill="%s"/>%s'
            '<text x="128" y="128" text-anchor="middle" dominant-baseline="central" font-size="104" font-weight="700" '
            'font-family="Fredoka, \'Plus Jakarta Sans\', Arial, sans-serif" fill="%s">%s</text></svg>\n') % (
        defs, fondo, relleno, color_texto(fondo), escape(iniciales))


def _chunk(tipo, datos):
    c = tipo + datos
    return struct.pack(">I", len(datos)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)


def png_rgb(ancho, alto, filas):
    """Encoder PNG mínimo: filas = lista de bytearray RGB (ancho*3)."""
    crudo = b"".join(b"\x00" + bytes(f) for f in filas)
    return (b"\x89PNG\r\n\x1a\n" + _chunk(b"IHDR", struct.pack(">IIBBBBB", ancho, alto, 8, 2, 0, 0, 0))
            + _chunk(b"IDAT", zlib.compress(crudo, 6)) + _chunk(b"IEND", b""))


def png_dni(rnd, ancho=480, alto=300):
    """Tarjeta de DNI de mentira: banda de color, recuadro de foto y barras que simulan texto."""
    filas = [bytearray(bytes((236, 238, 241)) * ancho) for _ in range(alto)]

    def rect(x0, y0, x1, y1, color):
        tira = bytes(color) * (x1 - x0)
        for y in range(y0, y1):
            filas[y][x0 * 3:x1 * 3] = tira

    rect(0, 0, ancho, 56, _rgb(rnd.choice(PALETA[:3])))
    rect(28, 84, 148, 224, (190, 194, 200))
    y = 88
    for _ in range(6):
        rect(172, y, 172 + rnd.randint(140, 280), y + 12, (75, 85, 99) if rnd.random() < 0.7 else (156, 163, 175))
        y += 28
    rect(28, 248, 28 + rnd.randint(200, 420), 258, (156, 163, 175))
    return png_rgb(ancho, alto, filas)


# ---------- configuración ----------

def _pesos(d, claves, nombre):
    out = {}
    for k in claves:
        v = d.get(k, d.get(str(k), 0))
        try:
            out[k] = max(0.0, float(v))
        except (TypeError, ValueError):
            raise ErrorGenerador("%s: valor inválido para %s" % (nombre, k))
    if sum(out.values()) <= 0:
        raise ErrorGenerador("%s: los porcentajes no pueden sumar 0" % nombre)
    return out


def completar_config(config=None):
    """Mezcla con los valores por defecto, normaliza tipos y valida."""
    cfg = {k: (dict(v) if isinstance(v, dict) else v) for k, v in CONFIG_POR_DEFECTO.items()}
    cfg.update({k: v for k, v in (config or {}).items() if k in cfg})
    if isinstance(cfg["hoy"], str):
        try:
            cfg["hoy"] = dt.date.fromisoformat(cfg["hoy"].strip()) if cfg["hoy"].strip() else None
        except ValueError:
            raise ErrorGenerador("La fecha de hoy debe ser AAAA-MM-DD")
    if isinstance(cfg["hoy"], dt.datetime):
        cfg["hoy"] = cfg["hoy"].date()
    if cfg["semilla"] in (None, ""):
        cfg["semilla"] = random.randrange(1, 10 ** 6)
    cfg["semilla"] = int(cfg["semilla"])
    for k in ("profesores", "alumnos", "clases", "consultas", "amigos_por_usuario", "likes_max_por_resena",
              "mensajes_min", "mensajes_max", "dias_historial", "dias_futuro", "precio_min", "precio_max", "precio_paso"):
        cfg[k] = int(cfg[k])
        if cfg[k] < 0:
            raise ErrorGenerador("%s no puede ser negativo" % k)
    for k in ("prob_amistad_aceptada", "prob_resena", "prob_resena_aprobada", "prob_chat_amigos_sin_clase",
              "prob_profesor_verificado", "prob_foto", "prob_dni"):
        cfg[k] = min(1.0, max(0.0, float(cfg[k])))
    cfg["dias_historial"] = max(1, cfg["dias_historial"])
    cfg["precio_paso"] = max(1, cfg["precio_paso"])
    cfg["mensajes_min"] = max(1, cfg["mensajes_min"])
    cfg["mensajes_max"] = max(cfg["mensajes_min"], cfg["mensajes_max"])
    if cfg["precio_max"] < cfg["precio_min"]:
        cfg["precio_min"], cfg["precio_max"] = cfg["precio_max"], cfg["precio_min"]
    cfg["estados_pasadas"] = _pesos(cfg["estados_pasadas"], ESTADOS_PASADAS, "Clases pasadas")
    cfg["estados_futuras"] = _pesos(cfg["estados_futuras"], ESTADOS_FUTURAS, "Clases futuras")
    cfg["estrellas"] = _pesos(cfg["estrellas"], [1, 2, 3, 4, 5], "Estrellas")
    if cfg["cuenta_tipo"] not in ("alumno", "profesor"):
        raise ErrorGenerador("La cuenta propia debe ser alumno o profesor")
    cfg["cuenta_mail"] = cfg["cuenta_mail"].strip().lower()
    if cfg["cuenta_mail"] and (len(cfg["cuenta_mail"]) > 150 or "@" not in cfg["cuenta_mail"]
                               or not cfg["cuenta_nombre"].strip() or not cfg["cuenta_apellido"].strip()):
        raise ErrorGenerador("La cuenta propia necesita nombre, apellido y un mail válido")
    return cfg


# ---------- motor ----------

class _Gen:
    def __init__(self, cfg, rec):
        self.c, self.rec = cfg, rec
        self.rnd = random.Random(cfg["semilla"])
        self.hoy = (dt.datetime.combine(cfg["hoy"], dt.time(20, 0)) if cfg["hoy"]
                    else dt.datetime.now().replace(microsecond=0))
        # Los usuarios se inscriben en los primeros días (margen) y las clases ocupan los últimos dias_historial
        self.margen = min(90, max(1, cfg["dias_historial"] // 2))
        self.inicio = self.hoy - dt.timedelta(days=cfg["dias_historial"] + self.margen)
        mats = [m for m in rec["materias"] if cfg["materias_elegidas"] is None or m in cfg["materias_elegidas"]]
        cols = [c for c in rec["colegios"] if cfg["colegios_elegidos"] is None or c[0] in cfg["colegios_elegidos"]]
        self.materias = mats[: cfg["materias"]] if cfg["materias"] else mats
        self.colegios = cols[: cfg["colegios"]] if cfg["colegios"] else cols
        if not self.materias:
            raise ErrorGenerador("Hace falta al menos una materia")
        if not self.colegios:
            raise ErrorGenerador("Hace falta al menos un colegio")
        self.usuarios, self.clases, self.mensajes, self.resenas, self.likes, self.consultas = [], [], [], [], [], []
        self.amistades = {}   # (mail_a, mail_b) ordenados -> dict(u1, u2, estado)
        self.disp = {}        # mail -> {"dias": {diaSemana: (desde, hasta)}, "bloqueados": set(date)}
        self.ocupado = set()  # (mail, fecha): ni profesor ni alumno tienen dos clases a la misma hora
        self.chats_forzados = {}  # par ordenado -> mail que debe tener un mensaje "No visto"
        self.usados_mail, self.usados_dni = set(), set()
        self.imagenes = []

    # -- usuarios --
    def mail_unico(self, nombre, apellido):
        base = "%s.%s" % (normalizar(nombre), normalizar(apellido))
        mail, n = base + "@mip.edu.ar", 2
        while mail in self.usados_mail:
            mail = "%s%d@mip.edu.ar" % (base, n)
            n += 1
        return mail

    def nuevo_usuario(self, tipo, nombre=None, apellido=None, mail=None, rol=None, notas="", **forzar):
        r, c = self.rnd, self.c
        nombre = (nombre or r.choice(self.rec["nombres"]))[:50]
        apellido = (apellido or r.choice(self.rec["apellidos"]))[:50]
        mail = mail or self.mail_unico(nombre, apellido)
        if mail in self.usados_mail:
            raise ErrorGenerador("El mail %s está repetido" % mail)
        self.usados_mail.add(mail)
        dni = str(r.randint(10000000, 45999999))
        while dni in self.usados_dni:
            dni = str(r.randint(10000000, 45999999))
        self.usados_dni.add(dni)
        ins = self.inicio + dt.timedelta(days=r.randint(0, self.margen), minutes=r.randint(0, 1400))
        edad = r.randint(24, 65) if tipo == "profesor" else r.randint(14, 40)
        if tipo == "profesor":
            verificado = r.random() < c["prob_profesor_verificado"]
            tiene_dni = verificado or r.random() < c["prob_dni"]
        else:  # el alumno que subió el DNI está verificado
            tiene_dni = r.random() < c["prob_dni"]
            verificado = tiene_dni
        u = dict(
            mail=mail, tipo=tipo, nombre=nombre, apellido=apellido, ins=ins, rol=rol, notas=notas, dni=dni,
            nac=dt.date(self.hoy.year - edad, r.randint(1, 12), r.randint(1, 28)),
            verificado=forzar.get("verificado", verificado), tiene_dni=forzar.get("tiene_dni", tiene_dni),
            foto_forzada=forzar.get("foto"), foto=None, fotoDni=None,
            direccion=("%s %d, %s" % (r.choice(self.rec["calles"]), r.randint(100, 4000), r.choice(self.rec["barrios"]))
                       if rol or r.random() < 0.6 else None),
            descripcion=None,
            materias=r.sample(self.materias, r.randint(1, min(3, len(self.materias)))),
            niveles=r.sample(NIVELES, r.randint(1, 2)),
            escuelas=r.sample(self.colegios, r.randint(1, min(2, len(self.colegios)))),
        )
        if u["verificado"]:
            u["tiene_dni"] = True
        plantillas = self.rec["descripciones_profesor" if tipo == "profesor" else "descripciones_alumno"]
        if rol or r.random() < 0.9:
            u["descripcion"] = r.choice(plantillas).replace("{m}", r.choice(u["materias"]).lower())
        if tipo == "profesor":
            self.datos_profesor(u)
        self.usuarios.append(u)
        return u

    def datos_profesor(self, u):
        r, c = self.rnd, self.c
        u["precio"] = r.randrange(c["precio_min"], c["precio_max"] + 1, c["precio_paso"])
        u["titulos"] = [t.replace("{m}", r.choice(u["materias"])) for t in r.sample(self.rec["titulos"], r.randint(1, 2))]
        u["modalidades"] = r.sample(MODALIDADES, r.randint(1, 2))
        dias = {}
        if u["rol"] == "estrella":
            for dia in range(1, 7):
                dias[dia] = (9, 20)
        else:
            for dia in r.sample(range(1, 8), 3 if u["rol"] == "nuevo" else r.randint(2, 4)):  # 1 = lunes ... 7 = domingo
                desde_h = r.randint(8, 16)
                dias[dia] = (desde_h, min(desde_h + r.randint(3, 5), 22))
        bloqueados = set()
        if u["rol"] is None:
            for _ in range(r.randint(0, 2)):  # días bloqueados (bloquearDia): fecha con 00:00 a 23:59
                bloqueados.add((self.inicio + dt.timedelta(days=r.randint(0, (self.hoy - self.inicio).days + c["dias_futuro"]))).date())
        self.disp[u["mail"]] = {"dias": dias, "bloqueados": bloqueados}

    # -- clases --
    def hueco(self, prof, d0, d1):
        """Una fecha libre dentro de la agenda del profesor entre los días d0 y d1 (date), o None."""
        info = self.disp[prof["mail"]]
        if d1 < d0:
            return None
        for _ in range(50):
            dia = d0 + dt.timedelta(days=self.rnd.randint(0, (d1 - d0).days))
            if dia in info["bloqueados"] or dia.isoweekday() not in info["dias"]:
                continue
            desde_h, hasta_h = info["dias"][dia.isoweekday()]
            f = dt.datetime.combine(dia, dt.time(self.rnd.randint(desde_h, hasta_h - 1), 0))
            if (prof["mail"], f) not in self.ocupado:
                return f
        return None

    def estado_al_azar(self, fecha):
        pesos = self.c["estados_pasadas" if fecha < self.hoy else "estados_futuras"]
        return self.rnd.choices(list(pesos), list(pesos.values()))[0]

    def crear_clase(self, prof, alum, fecha, estado=None, alumno_emite=True, forzar_resena=False):
        if (prof["mail"], fecha) in self.ocupado or (alum["mail"], fecha) in self.ocupado:
            return None
        estado = estado or self.estado_al_azar(fecha)
        emision = min(fecha - dt.timedelta(days=self.rnd.randint(1, 14), hours=self.rnd.randint(0, 23)), self.hoy)
        self.ocupado.update([(prof["mail"], fecha), (alum["mail"], fecha)])
        cl = dict(prof=prof, alum=alum, emisor=alum if alumno_emite else prof, receptor=prof if alumno_emite else alum,
                  estado=estado, fecha=fecha, emision=emision, materia=self.rnd.choice(prof["materias"]),
                  propuesta=fecha + dt.timedelta(days=1) if estado == "Pide cambio" else None,
                  forzar_resena=forzar_resena)
        self.clases.append(cl)
        return cl

    def clases_al_azar(self):
        profes, alumnos = self.activos("profesor"), self.activos("alumno")
        if not profes or not alumnos:
            return
        d0 = self.inicio.date() + dt.timedelta(days=self.margen)
        d1 = self.hoy.date() + dt.timedelta(days=self.c["dias_futuro"])
        for _ in range(self.c["clases"]):
            p, a = self.rnd.choice(profes), self.rnd.choice(alumnos)
            f = self.hueco(p, d0, d1)
            if f:
                self.crear_clase(p, a, f, alumno_emite=self.rnd.random() < 0.8)

    # -- perfiles armados --
    def activos(self, tipo=None):
        """Los que pueden tener clases e interactuar: verificados y no recién inscriptos (como en los SP)."""
        return [u for u in self.usuarios if (tipo is None or u["tipo"] == tipo) and u["rol"] != "nuevo" and u["verificado"]]

    def armar_estrella(self, u):
        alumnos = self.activos("alumno")
        if not alumnos:
            return
        hoy = self.hoy.date()
        d0 = self.inicio.date() + dt.timedelta(days=self.margen)
        hechas = intentos = 0
        while hechas < 70 and intentos < 3000:  # >= 60 completadas
            intentos += 1
            f = self.hueco(u, d0, hoy - dt.timedelta(days=1))
            if f and self.crear_clase(u, self.rnd.choice(alumnos), f, "Completada"):
                hechas += 1
        for d in range(1, 8):  # la semana que viene, casi llena
            dia = hoy + dt.timedelta(days=d)
            if dia.isoweekday() not in self.disp[u["mail"]]["dias"]:
                continue
            desde_h, hasta_h = self.disp[u["mail"]]["dias"][dia.isoweekday()]
            for h in range(desde_h, hasta_h):
                if self.rnd.random() < 0.9:
                    self.crear_clase(u, self.rnd.choice(alumnos), dt.datetime.combine(dia, dt.time(h, 0)),
                                     "Confirmada" if self.rnd.random() < 0.7 else "Pendiente")

    def armar_completo(self, u):
        profes = self.activos("profesor")
        otros = [x for x in self.activos() if x is not u]
        if not profes:
            return
        hoy = self.hoy.date()
        futuro = (hoy + dt.timedelta(days=1), hoy + dt.timedelta(days=max(1, self.c["dias_futuro"])))
        pasado = (self.inicio.date() + dt.timedelta(days=self.margen), hoy - dt.timedelta(days=1))
        # (estado, lo emite el alumno, futura, reseña forzada): cubre cada tipo de notificación del SP
        plan = [("Pendiente", False, True, 0), ("Rechazada", True, True, 0), ("Pide cambio", False, True, 0),
                ("Pide cancelar", False, True, 0), ("Confirmada", True, True, 0), ("Pendiente", True, True, 0),
                ("Completada", True, False, 1), ("Completada", True, False, 1), ("Completada", True, False, 1),
                ("No concretada", True, False, 0), ("Cancelada", True, False, 0)]
        self.rnd.shuffle(profes := list(profes))
        for i, (estado, emite, fut, resena) in enumerate(plan):
            for k in range(len(profes)):  # primer profesor, desde el i-ésimo, que tenga hueco
                p = profes[(i + k) % len(profes)]
                f = self.hueco(p, *(futuro if fut else pasado))
                if f and self.crear_clase(p, u, f, estado, emite, bool(resena)):
                    break
        if len(otros) < 9:
            return
        elegidos = self.rnd.sample(otros, 9)
        self.amistad(elegidos[0], u, "Pendiente")  # solicitud recibida
        for x in elegidos[1:5]:
            self.amistad(u, x, "Aceptada")
        for x in elegidos[1:4]:  # mensajes sin leer de 3 personas
            self.chats_forzados[tuple(sorted((u["mail"], x["mail"])))] = u["mail"]
        for x in elegidos[5:9]:
            self.amistad(x, u, "Aceptada")

    def amistad(self, u1, u2, estado):
        par = tuple(sorted((u1["mail"], u2["mail"])))
        if par in self.amistades:
            return False
        self.amistades[par] = dict(u1=u1, u2=u2, estado=estado)  # u1 = quien envía
        return True

    def armar_perfiles(self):
        c = self.c
        n = lambda clave: PERFILES[clave][0]
        if c["perfil_profe_estrella"]:
            self.nuevo_usuario("profesor", "Profe", "Estrella", n("perfil_profe_estrella"), "estrella",
                               "Profesor verificado, 60+ clases completadas, reseñas 4-5, agenda llena la semana próxima",
                               verificado=True, foto=True)
        if c["perfil_profe_nuevo"]:
            self.nuevo_usuario("profesor", "Profe", "Nuevo", n("perfil_profe_nuevo"), "nuevo",
                               "Profesor recién inscripto: sin clases, reseñas, amigos ni verificar",
                               verificado=False, tiene_dni=False, foto=False)
        if c["perfil_alumno_nuevo"]:
            self.nuevo_usuario("alumno", "Alumno", "Nuevo", n("perfil_alumno_nuevo"), "nuevo",
                               "Alumno recién inscripto, sin nada", verificado=False, tiene_dni=False, foto=False)
        if c["perfil_alumno_completo"]:
            self.nuevo_usuario("alumno", "Alumno", "Completo", n("perfil_alumno_completo"), "completo",
                               "Notificaciones de todos los tipos, clases en varios estados, reseñas y amigos",
                               verificado=True, foto=True)
        if c["perfil_sin_verificar"]:
            self.nuevo_usuario("profesor", "Sin", "Verificar", n("perfil_sin_verificar"), "sinverificar",
                               "Profesor con DNI subido y sin verificar (para probar moderación)",
                               verificado=False, tiene_dni=True, foto=True)
        if c["cuenta_mail"]:
            es_prof = c["cuenta_tipo"] == "profesor"
            self.nuevo_usuario(c["cuenta_tipo"], c["cuenta_nombre"].strip(), c["cuenta_apellido"].strip(),
                               c["cuenta_mail"], "estrella" if es_prof else "completo",
                               "Cuenta propia (%s)" % ("trato de profe estrella" if es_prof else "trato de alumno completo"),
                               verificado=True, foto=True)

    def completar_armados(self):
        for u in [x for x in self.usuarios if x["rol"] in ("estrella", "completo")]:
            (self.armar_estrella if u["rol"] == "estrella" else self.armar_completo)(u)

    # -- amigos, mensajes, reseñas, likes, consultas --
    def amistades_al_azar(self):
        pool = self.activos()
        for u in pool:
            for otro in self.rnd.sample(pool, min(len(pool), self.rnd.randint(0, self.c["amigos_por_usuario"]))):
                if otro is not u:
                    self.amistad(u, otro, "Aceptada" if self.rnd.random() < self.c["prob_amistad_aceptada"] else "Pendiente")

    def armar_chat(self, a, b, desde, materia, nv_hacia=None):
        r, hoy = self.rnd, self.hoy
        candidatas = [x for x in self.rec["chats"] if len(x) >= self.c["mensajes_min"]] or self.rec["chats"]
        conv = r.choice(candidatas)
        n = min(len(conv), r.randint(self.c["mensajes_min"], self.c["mensajes_max"]))
        primero, segundo = (a, b) if a["tipo"] == "alumno" or b["tipo"] != "alumno" else (b, a)  # abre el alumno
        if a["tipo"] == b["tipo"] and r.random() < 0.5:
            primero, segundo = segundo, primero
        momentos = sorted((desde + (hoy - desde) * r.random()).replace(microsecond=0) for _ in range(n))
        msgs = []
        for k in range(n):
            e, d = (primero, segundo) if k % 2 == 0 else (segundo, primero)
            texto = conv[k].replace("{m}", materia.lower()).replace("{n}", d["nombre"])
            msgs.append(dict(emisor=e, receptor=d, texto=texto, estado="Visto", fecha=momentos[k]))
        if nv_hacia:  # el último mensaje recibido por nv_hacia queda sin ver y no hay nada después
            ultimo = max((i for i, m in enumerate(msgs) if m["receptor"]["mail"] == nv_hacia), default=None)
            if ultimo is not None:
                msgs = msgs[: ultimo + 1]
                msgs[ultimo]["estado"] = "No visto"
        elif (hoy - msgs[-1]["fecha"]).days < 7 and r.random() < 0.3:
            msgs[-1]["estado"] = "No visto"
        self.mensajes.extend(msgs)

    def chats(self):
        por_mail = {u["mail"]: u for u in self.usuarios}
        pares = {}  # par ordenado -> (desde, materia): chat entre quienes tuvieron clase
        for cl in self.clases:
            par = tuple(sorted((cl["emisor"]["mail"], cl["receptor"]["mail"])))
            if par not in pares or cl["emision"] < pares[par][0]:
                pares[par] = (cl["emision"], cl["materia"])
        for par, am in self.amistades.items():
            if par in pares or am["estado"] != "Aceptada":
                continue
            if par in self.chats_forzados or self.rnd.random() < self.c["prob_chat_amigos_sin_clase"]:
                pares[par] = (self.hoy - dt.timedelta(days=self.rnd.randint(1, min(300, self.c["dias_historial"]))), self.rnd.choice(self.materias))
        for par, (desde, materia) in pares.items():
            self.armar_chat(por_mail[par[0]], por_mail[par[1]], desde, materia, self.chats_forzados.get(par))

    def resenas_y_likes(self):
        r, c = self.rnd, self.c
        textos = {5: "resenas_5", 4: "resenas_4", 3: "resenas_3", 2: "resenas_1y2", 1: "resenas_1y2"}
        hechas = set()
        for cl in self.clases:
            if cl["estado"] != "Completada":
                continue
            alum, prof = cl["alum"], cl["prof"]
            estrella, completo = prof["rol"] == "estrella", alum["rol"] == "completo"
            par = (alum["mail"], prof["mail"])
            if par in hechas or not (cl["forzar_resena"] or r.random() < (0.85 if estrella else c["prob_resena"])):
                continue
            hechas.add(par)
            pesos = {4: 40, 5: 60} if estrella else c["estrellas"]
            punt = r.choices(list(pesos), list(pesos.values()))[0]
            aprobada = cl["forzar_resena"] or r.random() < (0.95 if estrella else c["prob_resena_aprobada"])
            self.resenas.append(dict(alum=alum, prof=prof, estado="Aprobada" if aprobada else None, punt=punt,
                                     texto=r.choice(self.rec[textos[punt]])))
        pool = self.activos()
        for rs in self.resenas:  # Me gusta solo a reseñas aprobadas, nunca del autor
            if rs["estado"] != "Aprobada":
                continue
            k = r.randint(0, c["likes_max_por_resena"])
            candidatos = [u for u in r.sample(pool, min(len(pool), k + 2)) if u is not rs["alum"] and u is not rs["prof"]]
            for u in candidatos[:k]:
                self.likes.append(dict(usuario=u, resena=rs))

    def armar_consultas(self):
        r = self.rnd
        base = list(self.rec["consultas"])
        r.shuffle(base)
        for i in range(self.c["consultas"]):
            tipo, msg = base[i % len(base)]
            nombre, apellido = r.choice(self.rec["nombres"]), r.choice(self.rec["apellidos"])
            self.consultas.append(dict(
                nombre=("%s %s" % (nombre, apellido))[:100], correo="%s.%s%d@example.com" % (
                    normalizar(nombre), normalizar(apellido), i + 1), tipo=tipo, mensaje=msg,
                estado="Pendiente" if r.random() < 0.3 else "Resuelta",
                fecha=self.hoy - dt.timedelta(days=r.randint(0, self.c["dias_historial"]))))

    # -- imágenes --
    def asignar_imagenes(self):
        r, c = self.rnd, self.c
        avatares = self.rec["fotos"] if c["usar_fotos_propias"] else []
        for n, u in enumerate(self.usuarios, 1):
            forzada = u["foto_forzada"]
            if forzada is True or (forzada is None and r.random() < c["prob_foto"]):
                # Avatar del mismo género que el nombre (si el nombre no está en las listas, cualquiera)
                genero = self.rec["genero"].get(u["nombre"])
                propios = [f for f in avatares if genero is None or self.rec["genero_foto"][f] == genero]
                if propios:  # se repiten: el archivo ya está en el sitio, solo se referencia
                    u["foto"] = "/%s/%s" % (CARPETA_FOTOS_PERFIL, r.choice(propios))
                else:
                    fondo, patron = estilo_avatar(r, c["patrones"])
                    contenido = svg_avatar((u["nombre"][:1] + u["apellido"][:1]).upper(), fondo, patron)
                    u["foto"] = "/%s/prueba-%d.svg" % (CARPETA_FOTOS_PERFIL, n)
                    self.imagenes.append(("%s/prueba-%d.svg" % (CARPETA_FOTOS_PERFIL, n), contenido))
            if u["tiene_dni"]:
                u["fotoDni"] = "/%s/prueba-dni-%d.png" % (CARPETA_DNI, n)
                self.imagenes.append(("%s/prueba-dni-%d.png" % (CARPETA_DNI, n), png_dni(r)))

    # -- salida --
    def sentencias(self):
        sql = []
        ins = lambda tabla, cols, vals: sql.append("INSERT [dbo].[%s] (%s) VALUES (%s)" % (
            tabla, ", ".join("[%s]" % x for x in cols), ", ".join(vals)))
        clave = hash_contrasena(self.rnd)
        for nombre, direccion in self.colegios:
            ins("Escuelas", ["nombre", "direccion"], [sql_str(nombre), sql_str(direccion) if direccion else "NULL"])
        for m in self.materias:
            ins("Materias", ["nombre"], [sql_str(m)])
        for n in NIVELES:
            ins("Niveles", ["nombre"], [sql_str(n)])
        for m in MODALIDADES:
            ins("Modalidades", ["nombre"], [sql_str(m)])
        for u in self.usuarios:
            ins("Usuarios", ["nombre", "apellido", "mail", "contrasena", "dni", "fotoPerfil", "direccion", "fotoDni",
                             "tipoUsuario", "fechaNacimiento", "fechaInscripcion", "verificado"], [
                sql_str(u["nombre"]), sql_str(u["apellido"]), sql_str(u["mail"]), sql_str(clave), sql_str(u["dni"]),
                sql_str(u["foto"]) if u["foto"] else "NULL", sql_str(u["direccion"]) if u["direccion"] else "NULL",
                sql_str(u["fotoDni"]) if u["fotoDni"] else "NULL", sql_str(u["tipo"]), sql_date(u["nac"]),
                sql_dt(u["ins"]), "1" if u["verificado"] else "0"])
        for u in self.usuarios:
            ref = ref_usuario(u["mail"])
            if u["descripcion"]:
                ins("Perfiles", ["idUsuario", "descripcion"], [ref, sql_str("<p>%s</p>" % u["descripcion"])])
            for m in u["materias"]:
                ins("Usuarios_Materias", ["idUsuario", "idMateria"], [ref, ref_por_nombre("Materias", m)])
            for n in u["niveles"]:
                ins("Usuarios_Niveles", ["idUsuario", "idNivel"], [ref, ref_por_nombre("Niveles", n)])
            for nombre, _ in u["escuelas"]:  # profesores con año desde (1 de enero); alumnos sin año
                desde = ("CAST(N'%d-01-01T00:00:00' AS DateTime)" % self.rnd.randint(self.inicio.year - 8, self.inicio.year)
                         if u["tipo"] == "profesor" else "NULL")
                ins("Escuelas_Usuarios", ["idUsuario", "idEscuela", "desde"], [ref, ref_por_nombre("Escuelas", nombre), desde])
            if u["tipo"] != "profesor":
                continue
            ins("InfoProfesores", ["idUsuario", "precioHora"], [ref, str(u["precio"])])
            for t in u["titulos"]:
                ins("Titulos", ["idUsuario", "titulo"], [ref, sql_str(t[:100])])
            for m in u["modalidades"]:
                ins("Profesores_Modalidades", ["idUsuario", "idModalidad"], [ref, ref_por_nombre("Modalidades", m)])
            info = self.disp[u["mail"]]
            for dia, (d, h) in sorted(info["dias"].items()):
                ins("Disponibilidad", ["idProfesor", "diaSemana", "fecha", "desde", "hasta"], [
                    ref, str(dia), "NULL", sql_hora("%02d:00:00" % d), sql_hora("%02d:00:00" % h)])
            for f in sorted(info["bloqueados"]):
                ins("Disponibilidad", ["idProfesor", "diaSemana", "fecha", "desde", "hasta"], [
                    ref, "NULL", sql_date(f), sql_hora("00:00:00"), sql_hora("23:59:00")])
        for cl in self.clases:
            ins("Clases", ["idEmisor", "idReceptor", "idMateria", "estado", "fecha", "fechaEmision", "fechaPropuesta"], [
                ref_usuario(cl["emisor"]["mail"]), ref_usuario(cl["receptor"]["mail"]),
                ref_por_nombre("Materias", cl["materia"]), sql_str(cl["estado"]), sql_dt(cl["fecha"]),
                sql_dt(cl["emision"]), sql_dt(cl["propuesta"]) if cl["propuesta"] else "NULL"])
        for am in self.amistades.values():
            ins("Amigos", ["idUsuario1", "idUsuario2", "estado"], [
                ref_usuario(am["u1"]["mail"]), ref_usuario(am["u2"]["mail"]), sql_str(am["estado"])])
        for m in self.mensajes:
            ins("Mensajes", ["idReceptor", "idEmisor", "contenido", "estado", "fechaEnvio"], [
                ref_usuario(m["receptor"]["mail"]), ref_usuario(m["emisor"]["mail"]), sql_str(m["texto"][:1000]),
                sql_str(m["estado"]), sql_dt(m["fecha"])])
        for rs in self.resenas:
            ins("Resenas", ["idEmisor", "idReceptor", "estado", "puntuacion", "descripcion"], [
                ref_usuario(rs["alum"]["mail"]), ref_usuario(rs["prof"]["mail"]),
                sql_str(rs["estado"]) if rs["estado"] else "NULL", str(rs["punt"]), sql_str(rs["texto"][:500])])
        for lk in self.likes:
            rs = lk["resena"]
            ins("LikesResenas", ["idUsuario", "idResena"], [
                ref_usuario(lk["usuario"]["mail"]), "(SELECT ID FROM Resenas WHERE idEmisor = %s AND idReceptor = %s)" % (
                    ref_usuario(rs["alum"]["mail"]), ref_usuario(rs["prof"]["mail"]))])
        for q in self.consultas:
            ins("Consultas_Soporte", ["idUsuario", "nombre", "correo", "tipo", "mensaje", "estado", "fecha"], [
                "NULL", sql_str(q["nombre"]), sql_str(q["correo"]), sql_str(q["tipo"]), sql_str(q["mensaje"][:1000]),
                sql_str(q["estado"]), sql_dt(q["fecha"])])
        return sql

    def cabecera(self):
        borrar = ["Amigos", "Clases", "Consultas_Soporte", "Disponibilidad", "Escuelas_Usuarios", "InfoProfesores",
                  "LikesResenas", "Mensajes", "Perfiles", "Profesores_Modalidades", "Resenas", "Titulos",
                  "Usuarios_Materias", "Usuarios_Niveles", "Escuelas", "Materias", "Modalidades", "Niveles", "Usuarios"]
        c = self.c
        return (["USE [%s]" % c["base"].replace("]", "]]"), "GO"] + ["DELETE FROM [dbo].[%s]" % t for t in borrar]
                + ["GO", "-- Generado por tools/datos-prueba/generar_datos.py: hoy=%s, semilla=%s, dias_historial=%d, "
                   "profesores=%d, alumnos=%d, clases=%d" % (self.hoy.date(), c["semilla"], c["dias_historial"], c["profesores"],
                                                           c["alumnos"], len(self.clases)), "GO"])

    def resumen(self):
        cuenta = lambda it, f: sum(1 for x in it if f(x))
        res = {}
        for t in ("profesor", "alumno"):
            res["Usuarios · " + t] = cuenta(self.usuarios, lambda u: u["tipo"] == t)
        res["Usuarios · verificados"] = cuenta(self.usuarios, lambda u: u["verificado"])
        for e in ESTADOS_PASADAS + ESTADOS_FUTURAS:
            res["Clases · " + e] = cuenta(self.clases, lambda x: x["estado"] == e)
        res["Clases · total"] = len(self.clases)
        for e in ("Visto", "No visto"):
            res["Mensajes · " + e] = cuenta(self.mensajes, lambda m: m["estado"] == e)
        for e in ("Aceptada", "Pendiente"):
            res["Amistades · " + e] = cuenta(self.amistades.values(), lambda a: a["estado"] == e)
        res["Reseñas · aprobadas"] = cuenta(self.resenas, lambda x: x["estado"] == "Aprobada")
        res["Reseñas · sin moderar"] = cuenta(self.resenas, lambda x: x["estado"] is None)
        for n in (5, 4, 3, 2, 1):
            res["Reseñas · %d estrellas" % n] = cuenta(self.resenas, lambda x: x["punt"] == n)
        res["Me gusta en reseñas"] = len(self.likes)
        res["Consultas de soporte"] = len(self.consultas)
        res["Fotos de perfil"] = cuenta(self.usuarios, lambda u: u["foto"])
        res["Fotos de DNI"] = cuenta(self.usuarios, lambda u: u["fotoDni"])
        return res

    def cuentas(self):
        armados = [u for u in self.usuarios if u["rol"]]
        resto = [u for u in self.usuarios if not u["rol"]]
        return [(u["mail"], u["tipo"], "%s %s" % (u["nombre"], u["apellido"]), bool(u["verificado"]), u["notas"])
                for u in armados + resto]


def generar(config=None):
    cfg = completar_config(config)
    g = _Gen(cfg, cargar_recursos(cfg["carpeta_recursos"]))
    g.armar_perfiles()
    for tipo, cantidad in (("profesor", cfg["profesores"]), ("alumno", cfg["alumnos"])):
        for _ in range(cantidad):
            g.nuevo_usuario(tipo)
    g.clases_al_azar()
    g.completar_armados()
    g.amistades_al_azar()
    g.chats()
    g.resenas_y_likes()
    g.armar_consultas()
    g.asignar_imagenes()
    datos = dict(usuarios=g.usuarios, clases=g.clases, disp=g.disp, mensajes=g.mensajes, amistades=g.amistades,
                 resenas=g.resenas, likes=g.likes, hoy=g.hoy)
    return Resultado(sentencias=g.sentencias(), cabecera=g.cabecera(), resumen=g.resumen(), cuentas=g.cuentas(),
                     imagenes=g.imagenes, problemas=verificar(datos), datos=datos, config=cfg)


# ---------- verificación ----------

def verificar(d):
    """Chequeos de coherencia con las reglas de la BD. Devuelve la lista de problemas (vacía si está todo bien)."""
    p = []
    hoy = d["hoy"]
    mails = [u["mail"] for u in d["usuarios"]]
    if len(set(mails)) != len(mails):
        p.append("mails repetidos")
    ocupado = set()
    completadas = set()
    pares_clase = set()
    for c in d["clases"]:
        etq = "clase %s %s (%s)" % (c["prof"]["mail"], c["fecha"], c["estado"])
        info = d["disp"][c["prof"]["mail"]]
        f = c["fecha"]
        if f.isoweekday() not in info["dias"]:
            p.append("%s: fuera de la agenda semanal" % etq)
        elif not info["dias"][f.isoweekday()][0] <= f.hour < info["dias"][f.isoweekday()][1] or f.minute:
            p.append("%s: fuera del horario de la agenda" % etq)
        if f.date() in info["bloqueados"]:
            p.append("%s: en un día bloqueado" % etq)
        if not (c["emision"] <= hoy and c["emision"] <= f):
            p.append("%s: fechaEmision inválida" % etq)
        if f < hoy and c["estado"] not in ESTADOS_PASADAS:
            p.append("%s: clase pasada sin cerrar" % etq)
        if f >= hoy and c["estado"] not in ESTADOS_FUTURAS:
            p.append("%s: clase futura con estado de pasada" % etq)
        if c["materia"] not in c["prof"]["materias"]:
            p.append("%s: materia que el profesor no da" % etq)
        if (c["propuesta"] is not None) != (c["estado"] == "Pide cambio"):
            p.append("%s: fechaPropuesta solo va con Pide cambio" % etq)
        if (c["prof"]["mail"], f) in ocupado:
            p.append("%s: dos clases del mismo profesor a la misma hora" % etq)
        ocupado.add((c["prof"]["mail"], f))
        par = frozenset((c["emisor"]["mail"], c["receptor"]["mail"]))
        pares_clase.add(par)
        if c["estado"] == "Completada":
            completadas.add((c["alum"]["mail"], c["prof"]["mail"]))
    vistas = set()
    for r in d["resenas"]:
        par = (r["alum"]["mail"], r["prof"]["mail"])
        if r["alum"]["tipo"] != "alumno" or r["prof"]["tipo"] != "profesor":
            p.append("reseña %s: no es de alumno a profesor" % (par,))
        if par not in completadas:
            p.append("reseña %s: sin clase Completada" % (par,))
        if par in vistas:
            p.append("reseña %s: repetida" % (par,))
        vistas.add(par)
    for l in d["likes"]:
        if l["resena"]["estado"] != "Aprobada":
            p.append("Me gusta a una reseña no aprobada")
        if l["usuario"] is l["resena"]["alum"]:
            p.append("Me gusta del autor de la reseña")
    amigos = {frozenset(k) for k, a in d["amistades"].items() if a["estado"] == "Aceptada"}
    for a in d["amistades"].values():
        if a["estado"] not in ("Aceptada", "Pendiente"):
            p.append("amistad con estado inválido")
    for m in d["mensajes"]:
        par = frozenset((m["emisor"]["mail"], m["receptor"]["mail"]))
        if par not in pares_clase and par not in amigos:
            p.append("mensaje entre %s sin clase ni amistad aceptada" % sorted(par))
        if m["estado"] not in ("Visto", "No visto"):
            p.append("mensaje con estado inválido")
    # Los SP no dejan interactuar a cuentas sin verificar (salvo los moderadores)
    sin_verificar = lambda *us: any(not u["verificado"] for u in us)
    for c in d["clases"]:
        if sin_verificar(c["emisor"], c["receptor"]):
            p.append("clase con una cuenta sin verificar")
    for a in d["amistades"].values():
        if sin_verificar(a["u1"], a["u2"]):
            p.append("amistad con una cuenta sin verificar")
    for m in d["mensajes"]:
        if sin_verificar(m["emisor"], m["receptor"]):
            p.append("mensaje con una cuenta sin verificar")
    for l in d["likes"]:
        if sin_verificar(l["usuario"]):
            p.append("me gusta de una cuenta sin verificar")
    return sorted(set(p))


# ---------- archivos ----------

def escribir_sql(resultado, ruta, codificacion="utf-16"):
    """UTF-16LE con BOM y CRLF (como 03_datos_prueba) o UTF-8 con BOM. Un GO cada 500 sentencias."""
    carpeta = os.path.dirname(os.path.abspath(ruta))
    os.makedirs(carpeta, exist_ok=True)
    enc = "utf-8-sig" if codificacion.lower().replace("_", "-") in ("utf8", "utf-8", "utf-8-sig") else "utf-16-le"
    with open(ruta, "w", encoding=enc, newline="\r\n") as f:
        if enc == "utf-16-le":
            f.write("\ufeff")
        for linea in resultado.cabecera:
            f.write(linea + "\n")
        for i, s in enumerate(resultado.sentencias, 1):
            f.write(s + "\n")
            if i % 500 == 0:
                f.write("GO\n")
        f.write("GO\n")
    return len(resultado.sentencias)


def _borrar_prueba(carpeta):
    if os.path.isdir(carpeta):
        for nombre in os.listdir(carpeta):
            if nombre.startswith("prueba-"):
                os.remove(os.path.join(carpeta, nombre))


def escribir_imagenes(resultado, carpeta_salida):
    for sub in (CARPETA_FOTOS_PERFIL, CARPETA_DNI):
        _borrar_prueba(os.path.join(carpeta_salida, sub))  # corridas anteriores más grandes
        os.makedirs(os.path.join(carpeta_salida, sub), exist_ok=True)
    for ruta, contenido in resultado.imagenes:
        destino = os.path.join(carpeta_salida, *ruta.split("/"))
        with open(destino, "wb") as f:
            f.write(contenido.encode("utf-8") if isinstance(contenido, str) else contenido)


def copiar_al_sitio(carpeta_salida, wwwroot):
    """Copia las imágenes al sitio. Solo borra archivos que empiezan con 'prueba-' (nunca las fotos reales)."""
    if not os.path.isdir(wwwroot):
        raise ErrorGenerador("No existe la carpeta wwwroot: %s" % wwwroot)
    for sub in (CARPETA_FOTOS_PERFIL, CARPETA_DNI):
        destino = os.path.join(wwwroot, *sub.split("/"))
        _borrar_prueba(destino)
        os.makedirs(destino, exist_ok=True)
        origen = os.path.join(carpeta_salida, *sub.split("/"))
        for nombre in os.listdir(origen) if os.path.isdir(origen) else []:
            if nombre.startswith("prueba-"):
                shutil.copy2(os.path.join(origen, nombre), os.path.join(destino, nombre))


def _sqlcmd(args, servidor, base, usuario, contrasena):
    exe = shutil.which("sqlcmd")
    if not exe:
        return False, "Instalá sqlcmd (viene con SSMS) o cargá el .sql a mano"
    auth = ["-U", usuario, "-P", contrasena or ""] if usuario else ["-E"]
    try:
        r = subprocess.run([exe, "-S", servidor, "-d", base] + auth + ["-C", "-b"] + args,
                           capture_output=True, text=True, timeout=900, errors="replace")
    except (OSError, subprocess.TimeoutExpired) as e:
        return False, "No se pudo ejecutar sqlcmd: %s" % e
    return r.returncode == 0, (r.stdout + r.stderr).strip()


def cargar_en_sql_server(ruta_sql, servidor, base, usuario=None, contrasena=None):
    """Corre el .sql con sqlcmd. La contraseña no se guarda en ningún lado."""
    with open(ruta_sql, "rb") as f:
        extra = ["-f", "65001"] if f.read(3) == b"\xef\xbb\xbf" else []
    return _sqlcmd(extra + ["-i", ruta_sql], servidor, base, usuario, contrasena)


def probar_conexion(servidor, base, usuario=None, contrasena=None):
    return _sqlcmd(["-Q", "SELECT 1"], servidor, base, usuario, contrasena)


def detectar_wwwroot():
    ruta = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "wwwroot"))
    return ruta if os.path.isdir(ruta) else ""


# ---------- consola ----------

def _fecha(s):
    try:
        return dt.date.fromisoformat(s)
    except ValueError:
        raise argparse.ArgumentTypeError("usá AAAA-MM-DD")


def _dict_arg(s):
    """'Completada=80,Cancelada=10' o JSON."""
    try:
        return json.loads(s) if s.strip().startswith("{") else {k.strip(): float(v) for k, v in (
            par.split("=") for par in s.split(","))}
    except ValueError:
        raise argparse.ArgumentTypeError("usá Nombre=valor,Nombre=valor")


def armar_parser():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    tipos_none = dict(colegios=int, materias=int, semilla=int, hoy=_fecha)
    for clave, valor in CONFIG_POR_DEFECTO.items():
        if clave in ("materias_elegidas", "colegios_elegidos", "cuenta_tipo"):
            continue
        opcion = "--" + clave.replace("_", "-")
        if isinstance(valor, bool):
            p.add_argument(opcion, action=argparse.BooleanOptionalAction, default=None)
        elif isinstance(valor, dict):
            p.add_argument(opcion, type=_dict_arg, default=None, metavar="K=V,K=V")
        else:
            p.add_argument(opcion, type=tipos_none.get(clave, type(valor) if valor is not None else str), default=None)
    p.add_argument("--cuenta-tipo", choices=["alumno", "profesor"], default=None)
    p.add_argument("--salida", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida", "MIP-datos-prueba.sql"))
    p.add_argument("--codificacion", choices=["utf-16", "utf-8"], default="utf-16")
    p.add_argument("--copiar-al-sitio", nargs="?", const=detectar_wwwroot(), default=None, metavar="WWWROOT",
                   help="copia las imágenes a wwwroot (por defecto, el del repo)")
    p.add_argument("--cargar", action="store_true", help="carga el .sql en SQL Server con sqlcmd (borra los datos)")
    p.add_argument("--servidor", default="localhost")
    p.add_argument("--usuario", default=None)
    p.add_argument("--contrasena-sql", default=None)
    return p


def main(argv=None):
    args = armar_parser().parse_args(argv)
    config = {k: v for k, v in vars(args).items() if k in CONFIG_POR_DEFECTO and v is not None}
    try:
        res = generar(config)
        if res.problemas:
            print("Problemas de verificación:\n  " + "\n  ".join(res.problemas), file=sys.stderr)
            return 1
        n = escribir_sql(res, args.salida, args.codificacion)
        carpeta = os.path.dirname(os.path.abspath(args.salida))
        escribir_imagenes(res, carpeta)
        print("Listo: %s (%d sentencias, %d imágenes, semilla %d)" % (args.salida, n, len(res.imagenes), res.config["semilla"]))
        if args.copiar_al_sitio is not None:
            copiar_al_sitio(carpeta, args.copiar_al_sitio)
            print("Imágenes copiadas a %s" % args.copiar_al_sitio)
        if args.cargar:
            ok, salida = cargar_en_sql_server(args.salida, args.servidor, res.config["base"], args.usuario, args.contrasena_sql)
            print(salida)
            return 0 if ok else 1
    except ErrorGenerador as e:
        print("Error: %s" % e, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
