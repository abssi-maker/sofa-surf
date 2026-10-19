"""Sofa Surf backend. The TV renders real pages itself; this serves what it can't do alone,
plus the fictional demo sites the video is filmed on (sites/).

Run: uv run uvicorn server:app --host 0.0.0.0 --port 8788
"""

import io
import os
import socket
from functools import lru_cache
from pathlib import Path
from urllib.parse import urljoin, urlparse

import segno

import httpx
from fastapi import Body, FastAPI, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from PIL import Image
from selectolax.lexbor import LexborHTMLParser

import nova

# A real browser's user agent, plus an honest token so sites can see who we are.
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/129.0 Safari/537.36 SofaSurf/0.1")

app = FastAPI(title="Sofa Surf")
ai = nova.nova()
_refines: dict[str, dict] = {}
_answers: dict[tuple[str, str], dict] = {}

# Lina's Kitchen, Cedar & Pine, Harbor Daily: fictional sites, no real brands, for the demo video.
app.mount("/sites", StaticFiles(directory=Path(__file__).parent / "sites", html=True), name="sites")


# The Virtual Device reaches this Mac as 10.0.2.2; the Mac itself is 127.0.0.1, and a phone on the
# same Wi-Fi needs the Mac's LAN address.
VVD_HOST = "10.0.2.2"


def _here(url: str) -> str:
    """A URL this process can fetch (the demo sites live on this server)."""
    return url.replace(f"//{VVD_HOST}:", "//127.0.0.1:", 1)


def _lan_ip() -> str:
    if os.environ.get("SOFA_PUBLIC_HOST"):
        return os.environ["SOFA_PUBLIC_HOST"]
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.connect(("192.0.2.1", 80))  # no packet is sent; this only picks the outgoing interface
        return s.getsockname()[0]


def _or_502(fn, *args):
    try:
        return fn(*args)
    except Exception as e:  # noqa: BLE001 - the TV shows the reason
        raise HTTPException(502, f"{type(e).__name__}: {str(e)[:200]}") from e


@app.get("/health")
def health() -> dict:
    """Also the beacon: the TV's live page reports test events here (?ev=...), read from the access log."""
    return {"ok": True, "ai": nova.MODE}


@lru_cache(maxsize=256)
def _meta(url: str) -> dict:
    r = httpx.get(_here(url), follow_redirects=True, timeout=10, headers={"User-Agent": UA})
    r.raise_for_status()
    tree = LexborHTMLParser(r.text)

    def og(*names: str) -> str | None:
        for n in names:
            node = tree.css_first(f'meta[property="{n}"], meta[name="{n}"]')
            if node and node.attributes.get("content"):
                return node.attributes["content"].strip()
        return None

    title = og("og:title", "twitter:title") or (tree.css_first("title").text().strip() if tree.css_first("title") else "")
    image = og("og:image", "twitter:image")
    return {"url": str(r.url), "site": og("og:site_name") or urlparse(str(r.url)).netloc.removeprefix("www."),
            "title": title, "image": urljoin(str(r.url), image) if image else None}


@app.get("/meta")
def meta(url: str) -> dict:
    """A site's name, title and share image, for the home screen's tiles."""
    return _or_502(_meta, url)


@app.post("/refine")
def refine(body: dict = Body(...)) -> dict:
    """Tier 2 of a live page: Nova refines the map the TV's script built. Once per page."""
    url = body.get("url") or ""
    if url not in _refines:
        _refines[url] = _or_502(ai.refine_page, body.get("outline") or {})
    return _refines[url]


@app.get("/qr")
def qr(u: str) -> Response:
    """Send to phone: a QR code of the page. Demo-site addresses point at this Mac's Wi-Fi address."""
    url = u.replace(f"//{VVD_HOST}:", f"//{_lan_ip()}:", 1).replace("//127.0.0.1:", f"//{_lan_ip()}:", 1)
    out = io.BytesIO()
    segno.make(url, error="m").save(out, kind="png", scale=12, border=2, dark="#0B0F17", light="#FFFFFF")
    return Response(out.getvalue(), media_type="image/png", headers={"X-Url": url})


@app.post("/ask")
def ask(body: dict = Body(...)) -> dict:
    """Ask this page: Nova answers from the page's own text; ground.py drops whatever the page doesn't say."""
    url, question, text = body.get("url") or "", (body.get("question") or "").strip(), body.get("text") or ""
    if not question or not text:
        raise HTTPException(400, "question and text are required")
    key = (url, question.lower())
    if key not in _answers:
        _answers[key] = _or_502(ai.ask_page, question[:200], text[:20000], (body.get("title") or "")[:120])
    return _answers[key]


@lru_cache(maxsize=512)
def _jpeg(src: str, width: int) -> bytes:
    r = httpx.get(_here(src), follow_redirects=True, timeout=10, headers={"User-Agent": UA, "Referer": src})
    r.raise_for_status()
    im = Image.open(io.BytesIO(r.content)).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    out = io.BytesIO()
    im.save(out, "JPEG", quality=82, optimize=True)
    return out.getvalue()


@app.get("/img")
def img(u: str, w: int = 960) -> Response:
    """Any web image as a JPEG no wider than the TV needs (no WebP/AVIF surprises, little memory)."""
    try:
        data = _jpeg(u, max(64, min(w, 1920)))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"{type(e).__name__}") from e
    return Response(data, media_type="image/jpeg", headers={"Cache-Control": "max-age=86400"})
