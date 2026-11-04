"""Tests del motor (sin ventana). Correr: python3 -m unittest tools/datos-prueba/test_generar_datos.py"""
import datetime as dt
import os
import struct
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generar_datos as g

CONFIG = dict(profesores=8, alumnos=20, clases=200, consultas=5, semilla=3, hoy="2026-11-04")


class TestGenerador(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.res = g.generar(CONFIG)
        cls.d = cls.res.datos

    def usuario(self, mail):
        return next(u for u in self.d["usuarios"] if u["mail"] == mail)

    def test_sin_problemas(self):
        self.assertEqual(self.res.problemas, [])

    def test_misma_semilla_mismas_sentencias(self):
        otra = g.generar(CONFIG)
        self.assertEqual(self.res.sentencias, otra.sentencias)
        self.assertNotEqual(self.res.sentencias, g.generar(dict(CONFIG, semilla=4)).sentencias)

    def test_verificar_detecta_problemas(self):
        malo = dict(self.d, clases=self.d["clases"] + [dict(self.d["clases"][0])])
        self.assertTrue(any("misma hora" in p for p in g.verificar(malo)))

    def test_archivo_utf16(self):
        with tempfile.TemporaryDirectory() as t:
            ruta = os.path.join(t, "a.sql")
            g.escribir_sql(self.res, ruta)
            with open(ruta, "rb") as f:
                crudo = f.read()
            self.assertEqual(crudo[:2], b"\xff\xfe")
            self.assertIn("\r\n".encode("utf-16-le"), crudo)
            g.escribir_sql(self.res, ruta, "utf-8")
            with open(ruta, "rb") as f:
                self.assertEqual(f.read(3), b"\xef\xbb\xbf")

    def test_avatares_de_userdata(self):
        avatares = g.cargar_recursos()["fotos"]
        self.assertTrue(avatares, "no hay avatares en wwwroot/userData/fotos-perfil")
        fotos = [u["foto"] for u in self.d["usuarios"] if u["foto"]]
        self.assertTrue(fotos)
        for f in fotos:
            self.assertIn(f.rsplit("/", 1)[1], avatares)

    def test_imagenes(self):
        res = g.generar(dict(CONFIG, usar_fotos_propias=False))  # sin avatares de userData: SVG de reserva
        pngs = [c for r, c in res.imagenes if r.endswith(".png")]
        svgs = [c for r, c in res.imagenes if r.endswith(".svg")]
        self.assertTrue(pngs and svgs)
        for p in pngs:
            self.assertEqual(p[:8], b"\x89PNG\r\n\x1a\n")
            self.assertEqual(struct.unpack(">I", p[8:12])[0], 13)  # largo del IHDR
            self.assertEqual(struct.unpack(">II", p[16:24]), (480, 300))
            self.assertEqual(p[12:16], b"IHDR")
            self.assertEqual(len(zlib.decompress(p[p.index(b"IDAT") + 4:-12])), 300 * (480 * 3 + 1))
        for s in svgs:
            self.assertTrue(ET.fromstring(s).tag.endswith("svg"))

    def test_perfiles_armados(self):
        for mail, _ in g.PERFILES.values():
            self.usuario(mail)
        nuevo, pnuevo = self.usuario("alumno.nuevo@mip.edu.ar"), self.usuario("profe.nuevo@mip.edu.ar")
        for u in (nuevo, pnuevo):
            self.assertFalse([c for c in self.d["clases"] if u in (c["emisor"], c["receptor"])])
        self.assertFalse(pnuevo["verificado"])
        sv = self.usuario("sin.verificar@mip.edu.ar")
        self.assertTrue(sv["fotoDni"] and not sv["verificado"])
        est = self.usuario("profe.estrella@mip.edu.ar")
        self.assertGreaterEqual(sum(1 for c in self.d["clases"] if c["prof"] is est and c["estado"] == "Completada"), 60)
        self.assertTrue(all(r["punt"] >= 4 for r in self.d["resenas"] if r["prof"] is est))

    def test_alumno_completo_notificaciones(self):
        u = self.usuario("alumno.completo@mip.edu.ar")
        futuras = lambda estado, **lado: [c for c in self.d["clases"] if c["estado"] == estado and c["fecha"] > self.d["hoy"]
                                          and all(c[k] is u for k in lado)]
        self.assertTrue(futuras("Pendiente", receptor=True))
        self.assertTrue(futuras("Rechazada", emisor=True))
        self.assertTrue(futuras("Pide cambio", receptor=True))
        self.assertTrue(futuras("Pide cancelar", receptor=True))
        self.assertTrue([a for a in self.d["amistades"].values() if a["u2"] is u and a["estado"] == "Pendiente"])
        emisores = {m["emisor"]["mail"] for m in self.d["mensajes"] if m["receptor"] is u and m["estado"] == "No visto"}
        self.assertGreaterEqual(len(emisores), 2)
        self.assertTrue([r for r in self.d["resenas"] if r["alum"] is u])

    def test_copiar_al_sitio_solo_borra_prueba(self):
        with tempfile.TemporaryDirectory() as t:
            salida, sitio = os.path.join(t, "salida"), os.path.join(t, "www")
            fotos = os.path.join(sitio, "userData", "fotos-perfil")
            os.makedirs(fotos)
            for nombre in ("real.webp", "prueba-viejo.svg"):
                open(os.path.join(fotos, nombre), "w").close()
            g.escribir_imagenes(self.res, salida)
            g.copiar_al_sitio(salida, sitio)
            self.assertTrue(os.path.exists(os.path.join(fotos, "real.webp")))
            self.assertFalse(os.path.exists(os.path.join(fotos, "prueba-viejo.svg")))
            self.assertTrue(os.listdir(os.path.join(sitio, "userData", "dni")))

    def test_recurso_faltante(self):
        with tempfile.TemporaryDirectory() as t:
            with self.assertRaises(g.ErrorGenerador):
                g.generar(dict(CONFIG, carpeta_recursos=t))


if __name__ == "__main__":
    unittest.main()
