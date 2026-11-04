"""MIP · Generador de datos de prueba: ventana (tkinter) sobre el motor de generar_datos.py.

Doble clic en Windows (sin consola) o `python interfaz.pyw`. Variables de entorno para probar sin manos:
MIP_AUTOTEST=1 abre, hace una vista previa y cierra; MIP_CAPTURA=ruta (sin extensión) además guarda capturas.
"""
import datetime as dt
import json
import math
import os
import queue
import random
import shutil
import subprocess
import sys
import threading
import tkinter as tk
import traceback
from tkinter import filedialog, messagebox, ttk
from tkinter import font as tkfont

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import generar_datos as motor  # noqa: E402

# Colores del sitio (ver wwwroot/css/site.css)
BG, BLANCO, BORDE, TEXTO, SUAVE = "#F5F6F8", "#FFFFFF", "#E5E7EB", "#111827", "#6B7280"
CORAL, CORAL_OSC, CYAN, CYAN_CLARO, MAGENTA = "#FF5757", "#E64848", "#5CE1E6", "#DFF7F8", "#D51F47"
CARPETA_CONFIG = os.path.join(AQUI, "configuraciones")
ULTIMA = os.path.join(CARPETA_CONFIG, "ultima.json")

SPINS = {  # clave: (etiqueta, mínimo, máximo)
    "profesores": ("Profesores", 0, 2000), "alumnos": ("Alumnos", 0, 5000),
    "clases": ("Clases a intentar crear", 0, 50000), "consultas": ("Consultas de soporte", 0, 1000),
    "amigos_por_usuario": ("Amigos por usuario (máx.)", 0, 30), "likes_max_por_resena": ("Me gusta por reseña (máx.)", 0, 50),
    "mensajes_min": ("Mensajes por chat (mín.)", 1, 50), "mensajes_max": ("Mensajes por chat (máx.)", 1, 50),
    "anios": ("Años de historia", 1, 10), "dias_futuro": ("Días a futuro", 0, 365),
    "precio_min": ("Precio mínimo por hora ($)", 0, 1000000), "precio_max": ("Precio máximo por hora ($)", 0, 1000000),
    "precio_paso": ("Paso del precio ($)", 1, 100000),
}
PROBS = {  # clave: etiqueta (se muestran en %)
    "prob_amistad_aceptada": "Amistades aceptadas", "prob_resena": "Clases completadas con reseña",
    "prob_resena_aprobada": "Reseñas aprobadas", "prob_chat_amigos_sin_clase": "Chats entre amigos sin clase",
    "prob_profesor_verificado": "Profesores verificados", "prob_foto": "Usuarios con foto de perfil",
    "prob_dni": "Usuarios con foto de DNI",
}


def elegir_fuente(raiz):
    familias = set(tkfont.families(raiz))
    return next((f for f in ("Fredoka", "Segoe UI") if f in familias), tkfont.nametofont("TkDefaultFont").actual("family"))


def dibujar_avatar(cv, x, y, tam, iniciales, fondo, patron, familia):
    """Mismo diseño que el SVG del motor, dibujado en un Canvas (cuadrado: el sitio lo recorta en círculo)."""
    claro = motor.aclarar(fondo)
    cv.create_rectangle(x, y, x + tam, y + tam, fill=fondo, outline="")
    if patron == "rayas":
        for c in range(-tam, tam, 16):
            a, b = max(0, c), min(tam, tam + c)
            cv.create_line(x + a, y + a - c, x + b, y + b - c, fill=claro, width=5)
    elif patron == "puntos":
        for i in range(8, tam, 16):
            for j in range(8, tam, 16):
                cv.create_oval(x + i - 3, y + j - 3, x + i + 3, y + j + 3, fill=claro, outline="")
    elif patron == "ondas":
        for fila in range(8, tam - 8, 16):
            pts = [(x + k, y + fila + 4 * math.sin(k / 6)) for k in range(0, tam + 1, 4)]
            cv.create_line(*[c for p in pts for c in p], fill=claro, width=3, smooth=True)
    cv.create_text(x + tam / 2, y + tam / 2, text=iniciales, fill=motor.color_texto(fondo),
                   font=(familia, int(tam * 0.38), "bold"))


class Ventana(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("MIP · Generador de datos de prueba")
        self.geometry("1100x800")
        self.minsize(900, 600)
        self.configure(bg=BG)
        self.familia = elegir_fuente(self)
        self.cola = queue.Queue()
        self.ocupado = False
        self.resultado = None
        self.vars = {}
        self.recursos = None
        self.estilos()
        self.report_callback_exception = self.error_interno
        self.armar_menu()
        self.armar_cabecera()
        cuerpo = ttk.Frame(self)
        cuerpo.pack(fill="both", expand=True, padx=16, pady=(0, 16))
        cuerpo.columnconfigure(0, weight=1)
        cuerpo.rowconfigure(0, weight=5)
        cuerpo.rowconfigure(1, weight=3)
        self.cargar_listas()
        self.config_nb = ttk.Notebook(cuerpo)
        self.config_nb.grid(row=0, column=0, sticky="nsew", padx=(0, 12))
        for titulo, f in (("Cantidades", self.tab_cantidades), ("Fechas y clases", self.tab_fechas),
                          ("Listas", self.tab_listas), ("Perfiles armados", self.tab_perfiles),
                          ("Imágenes", self.tab_imagenes), ("Base de datos", self.tab_bd)):
            marco = ttk.Frame(self.config_nb, padding=8)
            self.config_nb.add(marco, text=titulo)
            f(marco)
        self.armar_resultados(cuerpo)
        self.armar_panel(cuerpo)
        self.bind("<Control-g>", lambda e: self.ejecutar(True))
        self.bind("<Control-p>", lambda e: self.ejecutar(False))
        self.protocol("WM_DELETE_WINDOW", self.cerrar)
        self.cargar_ultima()
        self.after(100, self.sondear)
        if os.environ.get("MIP_AUTOTEST") or os.environ.get("MIP_CAPTURA"):
            self.after(800, self.autotest)

    # ---------- estilo ----------
    def estilos(self):
        f = self.familia
        for nombre in ("TkDefaultFont", "TkTextFont", "TkMenuFont", "TkHeadingFont"):
            tkfont.nametofont(nombre).configure(family=f, size=10)
        self.fuente_titulo = (f, 11, "bold")
        s = ttk.Style(self)
        s.theme_use("clam")
        plano = dict(bordercolor=BORDE, lightcolor=BORDE, darkcolor=BORDE)
        s.configure(".", background=BG, foreground=TEXTO, font=(f, 10), focuscolor=BLANCO)
        s.configure("TFrame", background=BG)
        s.configure("TLabel", background=BG, foreground=TEXTO)
        s.configure("Card.TFrame", background=BLANCO)
        s.configure("Card.TLabel", background=BLANCO)
        s.configure("Titulo.TLabel", background=BLANCO, font=self.fuente_titulo)
        s.configure("Suave.TLabel", background=BLANCO, foreground=SUAVE)
        s.configure("Peligro.TLabel", background=BLANCO, foreground=MAGENTA)
        s.configure("Card.TCheckbutton", background=BLANCO)
        s.configure("Card.TRadiobutton", background=BLANCO)
        for st in ("Card.TCheckbutton", "Card.TRadiobutton"):
            s.map(st, background=[("active", BLANCO)], indicatorcolor=[("selected", CORAL), ("!selected", BLANCO)])
        s.configure("TNotebook", background=BG, tabmargins=(0, 0, 0, 0), **plano)
        s.configure("TNotebook.Tab", background=BORDE, foreground=SUAVE, padding=(14, 7), **plano)
        s.configure("TScrollbar", background=BORDE, troughcolor=BG, arrowcolor=SUAVE, **plano)
        s.map("TNotebook.Tab", background=[("selected", BLANCO), ("active", CYAN_CLARO)],
              foreground=[("selected", TEXTO)])
        s.configure("TEntry", fieldbackground=BLANCO, padding=5, **plano)
        s.configure("TSpinbox", fieldbackground=BLANCO, padding=4, arrowsize=12, **plano)
        s.configure("TCombobox", fieldbackground=BLANCO, background=BLANCO, padding=4, **plano)
        for st in ("TEntry", "TSpinbox", "TCombobox"):
            s.map(st, bordercolor=[("focus", CYAN)], lightcolor=[("focus", CYAN)], darkcolor=[("focus", CYAN)])
        s.configure("TButton", background=BLANCO, foreground=TEXTO, padding=(12, 7), borderwidth=1, **plano)
        s.map("TButton", background=[("active", BG)])
        s.configure("Primario.TButton", background=CORAL, foreground=BLANCO, bordercolor=CORAL, lightcolor=CORAL,
                    darkcolor=CORAL, font=(f, 10, "bold"))
        s.map("Primario.TButton", background=[("active", CORAL_OSC), ("disabled", "#F7B4B4")],
              foreground=[("disabled", BLANCO)])
        s.configure("Horizontal.TScale", background=CORAL, troughcolor=BORDE, bordercolor=BORDE,
                    lightcolor=CORAL, darkcolor=CORAL)
        s.configure("Card.Horizontal.TScale", background=CORAL, troughcolor=BORDE, bordercolor=BORDE,
                    lightcolor=CORAL, darkcolor=CORAL)
        s.configure("Horizontal.TProgressbar", background=CORAL, troughcolor=BORDE, bordercolor=BORDE,
                    lightcolor=CORAL, darkcolor=CORAL)
        s.configure("Treeview", background=BLANCO, fieldbackground=BLANCO, rowheight=24, bordercolor=BORDE,
                    lightcolor=BORDE, darkcolor=BORDE)
        s.configure("Treeview.Heading", background=BG, foreground=TEXTO, relief="flat", font=(f, 10, "bold"))
        s.map("Treeview", background=[("selected", CYAN_CLARO)], foreground=[("selected", TEXTO)])
        s.map("Treeview.Heading", background=[("active", BORDE)])

    def tarjeta(self, padre, titulo=None, **grid):
        marco = tk.Frame(padre, bg=BLANCO, highlightbackground=BORDE, highlightthickness=1)
        if grid:
            marco.grid(**{"sticky": "nsew", **grid})
        interior = ttk.Frame(marco, style="Card.TFrame", padding=8)
        interior.pack(fill="both", expand=True)
        if titulo:
            ttk.Label(interior, text=titulo, style="Titulo.TLabel").grid(row=0, column=0, columnspan=3, sticky="w", pady=(0, 8))
        interior.columnconfigure(1, weight=1)
        interior.marco = marco
        return interior

    def armar_cabecera(self):
        cab = ttk.Frame(self)
        cab.pack(fill="x", padx=16, pady=14)
        ttk.Label(cab, text="MIP", foreground=CORAL, font=(self.familia, 22, "bold")).pack(side="left")
        textos = ttk.Frame(cab)
        textos.pack(side="left", padx=14)
        ttk.Label(textos, text="Generador de datos de prueba", font=(self.familia, 13, "bold")).pack(anchor="w")
        ttk.Label(textos, text="El conocimiento nos conecta", foreground=SUAVE, font=(self.familia, 9)).pack(anchor="w")

    def armar_menu(self):
        barra = tk.Menu(self)
        m = tk.Menu(barra, tearoff=False)
        m.add_command(label="Guardar configuración…", command=self.guardar_config)
        m.add_command(label="Abrir configuración…", command=self.abrir_config)
        m.add_separator()
        m.add_command(label="Salir", command=self.cerrar)
        barra.add_cascade(label="Archivo", menu=m)
        self.config(menu=barra)

    # ---------- campos ----------
    def spin(self, p, fila, clave, rotulo=None, desde=None, hasta=None):
        et, d, h = SPINS.get(clave, (rotulo, desde, hasta))
        v = self.vars.setdefault(clave, tk.IntVar(value=motor.CONFIG_POR_DEFECTO.get(clave) or 0))
        ttk.Label(p, text=et, style="Card.TLabel").grid(row=fila, column=0, sticky="w", pady=1, padx=(0, 12))
        w = ttk.Spinbox(p, from_=d, to=h, textvariable=v, width=9)
        w.grid(row=fila, column=1, sticky="w")
        return w

    def escala(self, p, fila, rotulo, var, maximo=100):
        ttk.Label(p, text=rotulo, style="Card.TLabel").grid(row=fila, column=0, sticky="w", pady=0, padx=(0, 12))
        ttk.Scale(p, from_=0, to=maximo, variable=var, style="Card.Horizontal.TScale").grid(row=fila, column=1, sticky="ew")
        etiqueta = ttk.Label(p, style="Card.TLabel", width=5, anchor="e")
        etiqueta.grid(row=fila, column=2, padx=(8, 0))
        var.trace_add("write", lambda *a: etiqueta.config(text="%d%%" % round(var.get())))
        var.set(var.get())

    def prob(self, p, fila, clave):
        v = self.vars.setdefault(clave, tk.DoubleVar(value=motor.CONFIG_POR_DEFECTO[clave] * 100))
        self.escala(p, fila, PROBS[clave], v)

    def check(self, p, fila, clave, texto, defecto=True, col=0, span=3):
        v = self.vars.setdefault(clave, tk.BooleanVar(value=defecto))
        ttk.Checkbutton(p, text=texto, variable=v, style="Card.TCheckbutton").grid(
            row=fila, column=col, columnspan=span, sticky="w", pady=2)

    def entrada(self, p, fila, rotulo, clave, ancho=None, defecto="", **kw):
        v = self.vars.setdefault(clave, tk.StringVar(value=defecto))
        ttk.Label(p, text=rotulo, style="Card.TLabel").grid(row=fila, column=0, sticky="w", pady=3, padx=(0, 12))
        w = ttk.Entry(p, textvariable=v, width=ancho or 30, **kw)
        w.grid(row=fila, column=1, sticky="ew" if not ancho else "w")
        return w

    # ---------- pestañas ----------
    def tab_cantidades(self, marco):
        marco.columnconfigure((0, 1), weight=1)
        a = self.tarjeta(marco, "Personas y clases", row=0, column=0, padx=(0, 6), pady=(0, 8))
        for i, k in enumerate(("profesores", "alumnos", "clases", "consultas"), 1):
            self.spin(a, i, k)
        self.sp_colegios = self.spin(a, 5, "colegios", "Colegios (máx. = largo de la lista)", 1, 1)
        self.sp_materias = self.spin(a, 6, "materias", "Materias de la lista a usar", 1, 1)
        b = self.tarjeta(marco, "Vínculos y chat", row=0, column=1, padx=(6, 0), pady=(0, 8))
        for i, k in enumerate(("amigos_por_usuario", "mensajes_min", "mensajes_max", "likes_max_por_resena"), 1):
            self.spin(b, i, k)
        for i, k in enumerate(("prob_amistad_aceptada", "prob_chat_amigos_sin_clase"), 5):
            self.prob(b, i, k)
        c = self.tarjeta(marco, "Reseñas y verificación", row=1, column=0, padx=(0, 6))
        for i, k in enumerate(("prob_resena", "prob_resena_aprobada", "prob_profesor_verificado"), 1):
            self.prob(c, i, k)
        d = self.tarjeta(marco, "Distribución de estrellas (se normaliza)", row=1, column=1, padx=(6, 0))
        self.vars["estrellas"] = {}
        for i, n in enumerate((5, 4, 3, 2, 1), 1):
            v = self.vars["estrellas"].setdefault(n, tk.DoubleVar(value=motor.CONFIG_POR_DEFECTO["estrellas"][n]))
            self.escala(d, i, "★" * n, v)

    def tab_fechas(self, marco):
        marco.columnconfigure((0, 1), weight=1)
        a = self.tarjeta(marco, "Fechas y precios", row=0, column=0, padx=(0, 6), sticky="nsew")
        self.entrada(a, 1, "Hoy (AAAA-MM-DD, vacío = ahora)", "hoy", 12)
        ttk.Button(a, text="Hoy", command=lambda: self.vars["hoy"].set(dt.date.today().isoformat())).grid(row=1, column=2, padx=(8, 0))
        for i, k in enumerate(("anios", "dias_futuro", "precio_min", "precio_max", "precio_paso"), 2):
            self.spin(a, i, k)
        b = self.tarjeta(marco, "Estados de clases", row=0, column=1, padx=(6, 0), sticky="nsew")
        for titulo, clave, estados, fila0 in (("Pasadas", "estados_pasadas", motor.ESTADOS_PASADAS, 1),
                                              ("Futuras", "estados_futuras", motor.ESTADOS_FUTURAS, 6)):
            self.vars[clave] = {}
            ttk.Label(b, text=titulo, style="Suave.TLabel").grid(row=fila0, column=0, sticky="w", pady=(6, 0))
            total = ttk.Label(b, style="Card.TLabel")
            total.grid(row=fila0, column=1, columnspan=2, sticky="e", pady=(6, 0))
            for i, e in enumerate(estados, 1):
                v = self.vars[clave][e] = tk.DoubleVar(value=motor.CONFIG_POR_DEFECTO[clave][e])
                self.escala(b, fila0 + i, e, v)
                v.trace_add("write", lambda *a, c=clave, t=total: self.actualizar_total(c, t))
            self.actualizar_total(clave, total)

    def actualizar_total(self, clave, etiqueta):
        suma = round(sum(v.get() for v in self.vars[clave].values()))
        etiqueta.config(text="Total %d%%%s" % (suma, "" if suma == 100 else " (se normaliza)"),
                        style="Card.TLabel" if suma == 100 else "Peligro.TLabel")

    def tab_listas(self, marco):
        marco.columnconfigure((0, 1), weight=1)
        marco.rowconfigure(0, weight=1)
        self.arboles = {}
        for col, (clave, titulo) in enumerate((("materias", "Materias"), ("colegios", "Colegios"))):
            t = self.tarjeta(marco, titulo, row=0, column=col, padx=(0, 6) if col == 0 else (6, 0))
            t.rowconfigure(1, weight=1)
            arbol = ttk.Treeview(t, show="tree", selectmode="none", height=6)
            arbol.grid(row=1, column=0, columnspan=3, sticky="nsew")
            sb = ttk.Scrollbar(t, command=arbol.yview)
            sb.grid(row=1, column=3, sticky="ns")
            arbol.config(yscrollcommand=sb.set)
            arbol.bind("<Button-1>", lambda e, a=arbol: self.alternar_item(a, e))
            self.arboles[clave] = arbol
            fila = ttk.Frame(t, style="Card.TFrame")
            fila.grid(row=2, column=0, columnspan=4, sticky="w", pady=(8, 0))
            ttk.Button(fila, text="Todas", command=lambda a=arbol: self.marcar_todo(a, True)).pack(side="left")
            ttk.Button(fila, text="Ninguna", command=lambda a=arbol: self.marcar_todo(a, False)).pack(side="left", padx=6)
        pie = self.tarjeta(marco, row=1, column=0, columnspan=2, pady=(12, 0))
        self.lbl_conteo = ttk.Label(pie, style="Card.TLabel")
        self.lbl_conteo.grid(row=0, column=0, sticky="w")
        botones = ttk.Frame(pie, style="Card.TFrame")
        botones.grid(row=0, column=2)
        ttk.Button(botones, text="Abrir carpeta de recursos", command=self.abrir_recursos).pack(side="left")
        ttk.Button(botones, text="Recargar listas", command=self.recargar_listas).pack(side="left", padx=(6, 0))
        self.llenar_listas()

    def cargar_listas(self):
        try:
            self.recursos = motor.cargar_recursos(self.vars_recursos())
            self.error_recursos = None
        except motor.ErrorGenerador as e:
            self.recursos, self.error_recursos = None, str(e)

    def vars_recursos(self):
        return None  # carpeta por defecto (junto al motor o en _MEIPASS)

    def llenar_listas(self, marcadas=None):
        r = self.recursos
        nombres = {"materias": r["materias"] if r else [], "colegios": [c[0] for c in r["colegios"]] if r else []}
        for clave, arbol in self.arboles.items():
            arbol.delete(*arbol.get_children())
            for n in nombres[clave]:
                ok = marcadas is None or marcadas.get(clave) is None or n in marcadas[clave]
                arbol.insert("", "end", iid=n, text=("☑ " if ok else "☐ ") + n)
        self.sp_materias.config(to=max(1, len(nombres["materias"])))
        self.sp_colegios.config(to=max(1, len(nombres["colegios"])))
        for clave in ("materias", "colegios"):
            v = self.vars[clave]
            if v.get() < 1 or marcadas is None:
                v.set(len(nombres[clave]))
        if r:
            self.lbl_conteo.config(text="Cargados: %d nombres, %d apellidos, %d títulos, %d descripciones, %d reseñas, "
                                        "%d conversaciones, %d consultas, %d fotos propias" % (
                len(r["nombres"]), len(r["apellidos"]), len(r["titulos"]),
                len(r["descripciones_profesor"]) + len(r["descripciones_alumno"]),
                sum(len(r[k]) for k in ("resenas_5", "resenas_4", "resenas_3", "resenas_1y2")),
                len(r["chats"]), len(r["consultas"]), len(r["fotos"])))
            self.n_fotos_propias = len(r["fotos"])
        else:
            self.lbl_conteo.config(text=self.error_recursos, style="Peligro.TLabel")
            self.n_fotos_propias = 0
        if hasattr(self, "lbl_fotos"):
            self.lbl_fotos.config(text="Fotos propias en recursos/fotos: %d" % self.n_fotos_propias)

    def recargar_listas(self):
        marcadas = {k: self.items_marcados(a) for k, a in self.arboles.items()}
        self.cargar_listas()
        self.llenar_listas(marcadas)
        self.log("Listas recargadas.")

    def items_marcados(self, arbol):
        return [i for i in arbol.get_children() if arbol.item(i, "text").startswith("☑")]

    def alternar_item(self, arbol, ev):
        i = arbol.identify_row(ev.y)
        if i:
            t = arbol.item(i, "text")
            arbol.item(i, text=("☐" if t.startswith("☑") else "☑") + t[1:])
        return "break"

    def marcar_todo(self, arbol, ok):
        for i in arbol.get_children():
            arbol.item(i, text=("☑ " if ok else "☐ ") + i)

    def abrir_recursos(self):
        ruta = motor.carpeta_recursos()
        if hasattr(os, "startfile"):
            os.startfile(ruta)
        else:
            subprocess.Popen(["xdg-open", ruta], stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)

    def tab_perfiles(self, marco):
        marco.columnconfigure(0, weight=1)
        a = self.tarjeta(marco, "Perfiles armados (contraseña de todos: 12345678)", row=0, column=0, pady=(0, 8))
        for i, (clave, (mail, desc)) in enumerate(motor.PERFILES.items(), 1):
            self.check(a, i, clave, "%s  ·  %s" % (mail, desc))
        b = self.tarjeta(marco, "Cuenta propia (opcional)", row=1, column=0)
        ttk.Label(b, text="Recibe el trato de alumno.completo (o de profe.estrella si es profesor). Vacío = no se crea.",
                  style="Suave.TLabel").grid(row=1, column=0, columnspan=3, sticky="w", pady=(0, 6))
        self.entrada(b, 2, "Nombre", "cuenta_nombre", 24)
        self.entrada(b, 3, "Apellido", "cuenta_apellido", 24)
        self.entrada(b, 4, "Mail", "cuenta_mail", 36)
        self.vars["cuenta_tipo"] = tk.StringVar(value="alumno")
        ttk.Label(b, text="Tipo", style="Card.TLabel").grid(row=5, column=0, sticky="w", pady=3)
        ttk.Combobox(b, textvariable=self.vars["cuenta_tipo"], values=["alumno", "profesor"], state="readonly",
                     width=12).grid(row=5, column=1, sticky="w")

    def tab_imagenes(self, marco):
        marco.columnconfigure(0, weight=1)
        a = self.tarjeta(marco, "Fotos y DNI", row=0, column=0, pady=(0, 8))
        self.prob(a, 1, "prob_foto")
        self.prob(a, 2, "prob_dni")
        self.check(a, 3, "usar_fotos_propias", "Usar mis fotos de recursos/fotos primero (el resto lleva avatar)")
        self.check(a, 4, "patrones", "Avatares con textura (rayas, puntos u ondas)")
        self.lbl_fotos = ttk.Label(a, style="Suave.TLabel")
        self.lbl_fotos.grid(row=5, column=0, columnspan=3, sticky="w")
        self.lbl_fotos.config(text="Fotos propias en recursos/fotos: %d" % getattr(self, "n_fotos_propias", 0))
        b = self.tarjeta(marco, "Sitio (wwwroot)", row=1, column=0, pady=(0, 8))
        self.entrada(b, 1, "Carpeta wwwroot", "wwwroot", defecto=motor.detectar_wwwroot())
        ttk.Button(b, text="Elegir…", command=self.elegir_wwwroot).grid(row=1, column=2, padx=(8, 0))
        self.check(b, 2, "copiar_al_sitio", "Copiar imágenes al sitio al generar (borra solo los archivos prueba-*)", False)
        c = self.tarjeta(marco, "Vista previa de avatares", row=2, column=0)
        self.canvas = tk.Canvas(c, height=56, bg=BLANCO, highlightthickness=0)
        self.canvas.grid(row=1, column=0, columnspan=2, sticky="ew")
        ttk.Button(c, text="Otra muestra", command=self.dibujar_muestra).grid(row=1, column=2, padx=(8, 0), sticky="n")
        self.vars["patrones"].trace_add("write", lambda *a: self.dibujar_muestra())
        self.after(300, self.dibujar_muestra)

    def dibujar_muestra(self):
        self.canvas.delete("all")
        r = random.Random()
        for i in range(6):
            fondo, patron = motor.estilo_avatar(r, self.vars["patrones"].get())
            ini = r.choice("ABCDEFGLMNPRSTV") + r.choice("ABCDEFGLMNPRSTVZ")
            dibujar_avatar(self.canvas, 4 + i * 60, 4, 48, ini, fondo, patron, self.familia)

    def elegir_wwwroot(self):
        ruta = filedialog.askdirectory(title="Carpeta wwwroot del sitio", initialdir=self.vars["wwwroot"].get() or AQUI)
        if ruta:
            self.vars["wwwroot"].set(ruta)

    def tab_bd(self, marco):
        marco.columnconfigure(0, weight=1)
        a = self.tarjeta(marco, "SQL Server (sqlcmd)", row=0, column=0)
        self.entrada(a, 1, "Servidor", "servidor", 30, "localhost")
        self.entrada(a, 2, "Base", "base", 20, "MIP")
        self.vars["auth"] = tk.StringVar(value="windows")
        fila = ttk.Frame(a, style="Card.TFrame")
        fila.grid(row=3, column=0, columnspan=3, sticky="w", pady=4)
        for txt, val in (("Autenticación de Windows", "windows"), ("Usuario y contraseña", "sql")):
            ttk.Radiobutton(fila, text=txt, value=val, variable=self.vars["auth"], style="Card.TRadiobutton").pack(side="left", padx=(0, 16))
        self.entrada(a, 4, "Usuario", "usuario", 24)
        self.entrada(a, 5, "Contraseña (no se guarda)", "contrasena", 24, show="•")
        fila = ttk.Frame(a, style="Card.TFrame")
        fila.grid(row=6, column=0, columnspan=3, sticky="w", pady=(8, 0))
        ttk.Button(fila, text="Probar conexión", command=self.probar).pack(side="left")
        self.check(a, 7, "cargar", "Cargar en SQL Server al generar", False)
        ttk.Label(a, text="Vacía todas las tablas de la base antes de insertar", style="Peligro.TLabel",
                  font=(self.familia, 10, "bold")).grid(row=8, column=0, columnspan=3, sticky="w", pady=(6, 0))

    # ---------- panel derecho y resultados ----------
    def armar_panel(self, cuerpo):
        p = self.tarjeta(cuerpo, "Generar", row=0, column=1, rowspan=2, sticky="nsew")
        p.marco.configure(width=300)
        cuerpo.columnconfigure(1, minsize=300)
        p.rowconfigure(9, weight=1)
        ttk.Label(p, text="Semilla (vacío = aleatoria)", style="Card.TLabel").grid(row=1, column=0, columnspan=3, sticky="w")
        self.vars["semilla"] = tk.StringVar()
        ttk.Entry(p, textvariable=self.vars["semilla"], width=8).grid(row=2, column=0, columnspan=2, sticky="ew", pady=(2, 8))
        ttk.Button(p, text="🎲 Nueva", command=lambda: self.vars["semilla"].set(str(random.randrange(1, 10 ** 6)))).grid(
            row=2, column=2, padx=(6, 0), pady=(2, 8))
        ttk.Label(p, text="Archivo de salida", style="Card.TLabel").grid(row=3, column=0, columnspan=3, sticky="w")
        self.vars["salida"] = tk.StringVar(value=os.path.join(AQUI, "salida", "MIP-datos-prueba.sql"))
        ttk.Entry(p, textvariable=self.vars["salida"], width=8).grid(row=4, column=0, columnspan=2, sticky="ew", pady=(2, 8))
        ttk.Button(p, text="Guardar como…", command=self.elegir_salida).grid(row=4, column=2, padx=(6, 0), pady=(2, 8))
        self.vars["codificacion"] = tk.StringVar(value="utf-16")
        fila = ttk.Frame(p, style="Card.TFrame")
        fila.grid(row=5, column=0, columnspan=3, sticky="w", pady=(0, 10))
        for txt, val in (("UTF-16 (como 03)", "utf-16"), ("UTF-8", "utf-8")):
            ttk.Radiobutton(fila, text=txt, value=val, variable=self.vars["codificacion"], style="Card.TRadiobutton").pack(side="left", padx=(0, 10))
        self.btn_prev = ttk.Button(p, text="Vista previa  (Ctrl+P)", command=lambda: self.ejecutar(False))
        self.btn_prev.grid(row=6, column=0, columnspan=3, sticky="ew", pady=2)
        self.btn_gen = ttk.Button(p, text="Generar  (Ctrl+G)", style="Primario.TButton", command=lambda: self.ejecutar(True))
        self.btn_gen.grid(row=7, column=0, columnspan=3, sticky="ew", pady=2)
        self.progreso = ttk.Progressbar(p, mode="indeterminate")
        self.progreso.grid(row=8, column=0, columnspan=3, sticky="ew", pady=10)
        self.txt_log = tk.Text(p, width=10, height=8, wrap="word", state="disabled", bg=BG, relief="flat", highlightthickness=1,
                               highlightbackground=BORDE, font=(self.familia, 9))
        self.txt_log.grid(row=9, column=0, columnspan=3, sticky="nsew")
        self.txt_log.tag_configure("error", foreground=MAGENTA)

    def elegir_salida(self):
        ruta = filedialog.asksaveasfilename(title="Archivo de salida", defaultextension=".sql",
                                            initialdir=os.path.dirname(self.vars["salida"].get()) or AQUI,
                                            filetypes=[("SQL", "*.sql")])
        if ruta:
            self.vars["salida"].set(ruta)

    def armar_resultados(self, cuerpo):
        self.res_nb = ttk.Notebook(cuerpo)
        self.res_nb.grid(row=1, column=0, sticky="nsew", padx=(0, 12), pady=(12, 0))
        # Resumen
        r = ttk.Frame(self.res_nb, padding=8)
        r.columnconfigure(0, weight=1)
        r.rowconfigure(1, weight=1)
        self.lbl_problemas = ttk.Label(r, text="Todavía no se generó nada. Usá Vista previa o Generar.", foreground=SUAVE)
        self.lbl_problemas.grid(row=0, column=0, sticky="w")
        self.tabla_resumen = ttk.Treeview(r, columns=("n",), height=6)
        self.tabla_resumen.heading("#0", text="Concepto")
        self.tabla_resumen.heading("n", text="Cantidad")
        self.tabla_resumen.column("n", width=100, anchor="e")
        self.tabla_resumen.grid(row=1, column=0, sticky="nsew", pady=(6, 0))
        sb = ttk.Scrollbar(r, command=self.tabla_resumen.yview)
        sb.grid(row=1, column=1, sticky="ns", pady=(6, 0))
        self.tabla_resumen.config(yscrollcommand=sb.set)
        self.res_nb.add(r, text="Resumen")
        # Cuentas
        c = ttk.Frame(self.res_nb, padding=8)
        c.columnconfigure(0, weight=1)
        c.rowconfigure(1, weight=1)
        filtros = ttk.Frame(c)
        filtros.grid(row=0, column=0, columnspan=2, sticky="ew")
        self.filtro_tipo, self.filtro_texto = tk.StringVar(value="todos"), tk.StringVar()
        ttk.Combobox(filtros, textvariable=self.filtro_tipo, values=["todos", "profesor", "alumno", "armados"],
                     state="readonly", width=10).pack(side="left")
        ttk.Entry(filtros, textvariable=self.filtro_texto, width=28).pack(side="left", padx=6)
        ttk.Button(filtros, text="Copiar mail", command=self.copiar_mail).pack(side="left")
        ttk.Label(filtros, text="Contraseña de todas: 12345678", foreground=SUAVE).pack(side="right")
        self.filtro_tipo.trace_add("write", lambda *a: self.llenar_cuentas())
        self.filtro_texto.trace_add("write", lambda *a: self.llenar_cuentas())
        cols = ("tipo", "nombre", "verificado", "notas")
        self.tabla_cuentas = ttk.Treeview(c, columns=cols, height=6)
        for col, ancho in zip(("#0",) + cols, (230, 80, 160, 80, 300)):
            self.tabla_cuentas.column(col, width=ancho, stretch=col in ("notas",))
        for col, txt in zip(("#0",) + cols, ("Mail", "Tipo", "Nombre", "Verificado", "Notas")):
            self.tabla_cuentas.heading(col, text=txt)
        self.tabla_cuentas.grid(row=1, column=0, sticky="nsew", pady=(6, 0))
        sb = ttk.Scrollbar(c, command=self.tabla_cuentas.yview)
        sb.grid(row=1, column=1, sticky="ns", pady=(6, 0))
        self.tabla_cuentas.config(yscrollcommand=sb.set)
        self.res_nb.add(c, text="Cuentas")
        # SQL
        s = ttk.Frame(self.res_nb, padding=8)
        s.columnconfigure(0, weight=1)
        s.rowconfigure(0, weight=1)
        self.txt_sql = tk.Text(s, height=6, wrap="none", state="disabled", bg=BLANCO, relief="flat",
                               highlightthickness=1, highlightbackground=BORDE, font=("Courier", 9))
        self.txt_sql.grid(row=0, column=0, sticky="nsew")
        sb = ttk.Scrollbar(s, command=self.txt_sql.yview)
        sb.grid(row=0, column=1, sticky="ns")
        self.txt_sql.config(yscrollcommand=sb.set)
        self.res_nb.add(s, text="SQL")

    def mostrar_resultado(self, res):
        self.resultado = res
        t = self.tabla_resumen
        t.delete(*t.get_children())
        grupos = {}
        for k, v in res.resumen.items():
            g, _, n = k.partition(" · ")
            if not n:
                t.insert("", "end", text=k, values=(v,))
                continue
            if g not in grupos:
                grupos[g] = t.insert("", "end", text=g, open=True)
            t.insert(grupos[g], "end", text=n, values=(v,))
        if res.problemas:
            self.lbl_problemas.config(foreground=MAGENTA, text="%d problema(s) de verificación, no se exporta nada: %s" % (
                len(res.problemas), " | ".join(res.problemas[:5])))
        else:
            self.lbl_problemas.config(foreground=TEXTO, text="Verificación sin problemas.")
        self.llenar_cuentas()
        self.txt_sql.config(state="normal")
        self.txt_sql.delete("1.0", "end")
        self.txt_sql.insert("1.0", "\n".join((res.cabecera + res.sentencias)[:300]))
        self.txt_sql.config(state="disabled")

    def llenar_cuentas(self):
        t = self.tabla_cuentas
        t.delete(*t.get_children())
        if not self.resultado:
            return
        tipo, q = self.filtro_tipo.get(), self.filtro_texto.get().strip().lower()
        for mail, tp, nombre, ver, notas in self.resultado.cuentas:
            if (tipo in ("profesor", "alumno") and tp != tipo) or (tipo == "armados" and not notas):
                continue
            if q and q not in (mail + nombre + notas).lower():
                continue
            t.insert("", "end", text=mail, values=(tp, nombre, "sí" if ver else "no", notas))
            if len(t.get_children()) >= 1500:  # shortcut: tope para que la tabla no se ponga lenta, usar el buscador
                break

    def copiar_mail(self):
        sel = self.tabla_cuentas.selection()
        if sel:
            self.clipboard_clear()
            self.clipboard_append(self.tabla_cuentas.item(sel[0], "text"))
            self.log("Mail copiado: " + self.tabla_cuentas.item(sel[0], "text"))

    # ---------- configuración ----------
    def recoger(self):
        """Valores de la ventana -> dict (el que entiende el motor, más los de la ventana)."""
        v = self.vars
        cfg = {}
        try:
            for k in SPINS:
                cfg[k] = int(v[k].get())
            for k in PROBS:
                cfg[k] = round(v[k].get()) / 100
            for k in ("estados_pasadas", "estados_futuras", "estrellas"):
                cfg[k] = {e: round(x.get()) for e, x in v[k].items()}
        except (tk.TclError, ValueError):
            raise motor.ErrorGenerador("Hay un número inválido en las cantidades, fechas o precios.")
        for k in ("colegios", "materias"):
            try:
                n = int(v[k].get())
            except (tk.TclError, ValueError):
                raise motor.ErrorGenerador("Hay un número inválido en %s." % k)
            cfg[k] = n if n < len(self.recursos[k] if self.recursos else []) else None
        for k, lst in (("materias_elegidas", "materias"), ("colegios_elegidos", "colegios")):
            marcadas = self.items_marcados(self.arboles[lst])
            cfg[k] = None if len(marcadas) == len(self.arboles[lst].get_children()) else marcadas
        for k in ("usar_fotos_propias", "patrones", *motor.PERFILES):
            cfg[k] = bool(v[k].get())
        for k in ("cuenta_nombre", "cuenta_apellido", "cuenta_mail", "cuenta_tipo", "hoy", "base"):
            cfg[k] = v[k].get().strip() or None if k == "hoy" else v[k].get().strip()
        cfg["semilla"] = int(v["semilla"].get()) if v["semilla"].get().strip().isdigit() else None
        return cfg

    def extras(self):
        v = self.vars
        return {k: v[k].get() for k in ("wwwroot", "servidor", "usuario", "salida", "codificacion", "auth")} | {
            k: bool(v[k].get()) for k in ("copiar_al_sitio", "cargar")}

    def preset(self):
        cfg = self.recoger()
        cfg.update(self.extras())
        cfg["semilla"] = self.vars["semilla"].get()  # la contraseña no se guarda
        return cfg

    def aplicar(self, d):
        """Pone en la ventana lo que haya en el dict; ignora claves desconocidas."""
        for k, val in d.items():
            var = self.vars.get(k)
            try:
                if isinstance(var, dict):
                    for e, x in var.items():
                        x.set(float(val.get(str(e), val.get(e, x.get()))))
                elif var is not None and not isinstance(val, (dict, list)):
                    var.set("" if val is None else (val * 100 if k in PROBS else val))
            except (tk.TclError, ValueError, TypeError, AttributeError):
                continue
        marcadas = {"materias": d.get("materias_elegidas"), "colegios": d.get("colegios_elegidos")}
        for clave, arbol in self.arboles.items():
            if marcadas[clave] is not None:
                for i in arbol.get_children():
                    arbol.item(i, text=("☑ " if i in marcadas[clave] else "☐ ") + i)
        for k in ("colegios", "materias"):
            if d.get(k) is None and self.recursos:
                self.vars[k].set(len(self.recursos[k]))
        self.vars["semilla"].set("" if d.get("semilla") in (None, "") else str(d["semilla"]))
        self.vars["contrasena"].set("")

    def guardar_config(self):
        os.makedirs(CARPETA_CONFIG, exist_ok=True)
        ruta = filedialog.asksaveasfilename(title="Guardar configuración", defaultextension=".json",
                                            initialdir=CARPETA_CONFIG, filetypes=[("Configuración", "*.json")])
        if ruta:
            self.guardar_json(ruta)
            self.log("Configuración guardada: " + ruta)

    def guardar_json(self, ruta):
        try:
            with open(ruta, "w", encoding="utf-8") as f:
                json.dump(self.preset(), f, ensure_ascii=False, indent=2)
        except (OSError, motor.ErrorGenerador) as e:
            self.log("No se pudo guardar la configuración: %s" % e, True)

    def abrir_config(self):
        ruta = filedialog.askopenfilename(title="Abrir configuración", initialdir=CARPETA_CONFIG,
                                          filetypes=[("Configuración", "*.json")])
        if ruta:
            self.cargar_json(ruta)

    def cargar_json(self, ruta):
        try:
            with open(ruta, encoding="utf-8") as f:
                self.aplicar(json.load(f))
            self.log("Configuración cargada: " + os.path.basename(ruta))
        except (OSError, ValueError) as e:
            self.log("No se pudo leer la configuración: %s" % e, True)

    def cargar_ultima(self):
        if os.path.isfile(ULTIMA):
            self.cargar_json(ULTIMA)

    def cerrar(self):
        if os.path.isdir(CARPETA_CONFIG):
            self.guardar_json(ULTIMA)
        self.destroy()

    # ---------- ejecución ----------
    def log(self, texto, error=False):
        self.txt_log.config(state="normal")
        self.txt_log.insert("end", texto + "\n", "error" if error else "")
        self.txt_log.see("end")
        self.txt_log.config(state="disabled")

    def error_interno(self, tipo, valor, tb):
        self.log("Error: %s" % valor, True)
        traceback.print_exception(tipo, valor, tb)
        if not os.environ.get("MIP_AUTOTEST"):
            messagebox.showerror("Error", str(valor))
        else:
            self.fallo_autotest = True

    def ejecutar(self, exportar):
        if self.ocupado:
            return
        try:
            cfg = self.recoger()
            extras = self.extras()
            clave_sql = self.vars["contrasena"].get()
        except motor.ErrorGenerador as e:
            self.log(str(e), True)
            messagebox.showerror("Revisá los datos", str(e))
            return
        if exportar and extras["cargar"] and not messagebox.askyesno(
                "Cargar en SQL Server", "Esto borra todos los datos de la base %s en %s. ¿Seguir?" % (cfg["base"], extras["servidor"])):
            return
        self.ocupado = True
        for b in (self.btn_gen, self.btn_prev):
            b.state(["disabled"])
        self.progreso.start(12)
        self.log("Generando…" if exportar else "Vista previa…")
        threading.Thread(target=self.trabajo, args=(cfg, extras, clave_sql, exportar), daemon=True).start()

    def trabajo(self, cfg, extras, clave_sql, exportar):
        """Corre en un hilo: solo habla con la ventana por la cola."""
        q = self.cola
        try:
            res = motor.generar(cfg)
            q.put(("resultado", res))
            if res.problemas:
                q.put(("log", "No se exporta: hay problemas de verificación.", True))
            elif exportar:
                n = motor.escribir_sql(res, extras["salida"], extras["codificacion"])
                carpeta = os.path.dirname(os.path.abspath(extras["salida"]))
                motor.escribir_imagenes(res, carpeta)
                q.put(("log", "Listo: %s (%d sentencias, %d imágenes, semilla %d)" % (
                    extras["salida"], n, len(res.imagenes), res.config["semilla"]), False))
                if extras["copiar_al_sitio"]:
                    motor.copiar_al_sitio(carpeta, extras["wwwroot"])
                    q.put(("log", "Imágenes copiadas a %s" % extras["wwwroot"], False))
                if extras["cargar"]:
                    q.put(("log", "Cargando en SQL Server…", False))
                    ok, salida = motor.cargar_en_sql_server(extras["salida"], extras["servidor"], res.config["base"],
                                                           extras["usuario"] if extras["auth"] == "sql" else None, clave_sql)
                    q.put(("log", salida or ("Carga terminada." if ok else "La carga falló."), not ok))
            else:
                q.put(("log", "Vista previa lista (no se escribió nada).", False))
        except Exception as e:  # el motor nunca debe cerrar la ventana
            traceback.print_exc()
            q.put(("error", str(e) or e.__class__.__name__))
        q.put(("fin",))

    def sondear(self):
        try:
            while True:
                m = self.cola.get_nowait()
                if m[0] == "resultado":
                    self.mostrar_resultado(m[1])
                elif m[0] == "log":
                    self.log(m[1], m[2])
                elif m[0] == "error":
                    self.log("Error: " + m[1], True)
                    if not os.environ.get("MIP_AUTOTEST"):
                        messagebox.showerror("No se pudo generar", m[1])
                    self.fallo_autotest = True
                elif m[0] == "fin":
                    self.ocupado = False
                    self.progreso.stop()
                    for b in (self.btn_gen, self.btn_prev):
                        b.state(["!disabled"])
                    self.fin_trabajo()
        except queue.Empty:
            pass
        self.after(100, self.sondear)

    def probar(self):
        v = self.vars
        usuario = v["usuario"].get() if v["auth"].get() == "sql" else None
        self.log("Probando conexión…")

        def hilo():
            ok, salida = motor.probar_conexion(v_servidor, v_base, usuario, v_clave)
            self.cola.put(("log", ("Conexión correcta." if ok else "No se pudo conectar: ") + ("" if ok else salida), not ok))
        v_servidor, v_base, v_clave = v["servidor"].get(), v["base"].get(), v["contrasena"].get()
        threading.Thread(target=hilo, daemon=True).start()

    # ---------- autotest ----------
    fallo_autotest = False
    etapa_autotest = 0

    def capturar(self, sufijo):
        base = os.environ.get("MIP_CAPTURA")
        if not base:
            return
        self.update()
        ruta = "%s_%s.png" % (base, sufijo)
        if shutil.which("import"):
            subprocess.run(["import", "-window", "root", ruta], check=False)
        elif shutil.which("xwd"):
            subprocess.run("xwd -root -silent | convert xwd:- %s" % ruta, shell=True, check=False)
        else:
            self.log("No hay import ni xwd para sacar capturas.", True)

    def autotest(self):
        self.update_idletasks()
        self.capturar("cantidades")
        self.ejecutar(False)

    def fin_trabajo(self):
        if not (os.environ.get("MIP_AUTOTEST") or os.environ.get("MIP_CAPTURA")):
            return
        self.res_nb.select(0)
        self.capturar("resumen")
        self.config_nb.select(4)
        self.update()
        self.capturar("imagenes")
        self.res_nb.select(1)
        self.capturar("cuentas")
        print("AUTOTEST:", "FALLO" if self.fallo_autotest else "OK", "problemas=%d" % len(self.resultado.problemas)
              if self.resultado else "sin resultado")
        self.after(200, self.destroy)


if __name__ == "__main__":
    app = Ventana()
    app.mainloop()
    sys.exit(1 if app.fallo_autotest else 0)
