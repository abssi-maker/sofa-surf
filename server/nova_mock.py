"""A stand-in for Nova while the AWS account is PENDING_ACTIVATION.

It answers the way Nova will, after a delay like a real model call's, and only
from the map the TV sent: it removes and renames, it never invents. The rules
below double as the brief for the real prompt.
"""

from __future__ import annotations

import os
import re
import time

from ground import ground, sentences
from nova import MODEL

# Seconds, about what one Nova 2 Lite call takes.
DELAY = float(os.environ.get("CLICKER_MOCK_DELAY", "1.5"))

# Stops Nova would drop from the remote's path: promotions and boilerplate, not content.
NOISE = re.compile(r"sponsor|advert|\bads?\b|promo|newsletter|subscribe|sign up|cookie|trending|"
                   r"you may also like|shop now|download the app|get the app|follow us", re.I)
QUESTIONS = {
    "recipe": ["No cream, what do I use?", "How long in total?", "Make it for 2"],
    "article": ["What's the main point?", "Who is involved?", "What happens next?"],
    "listing": ["What's new today?", "Show me the most popular", "Anything under $50?"],
    "product": ["Is it in stock?", "What are the dimensions?", "What do reviewers say?"],
    "video": ["What is this video about?", "How long is it?", "Who made it?"],
}


# Words too common to tell sentences apart.
STOP = {"the", "and", "for", "what", "how", "does", "this", "that", "with", "use", "can", "are", "was", "who", "why",
        "when", "which", "page", "about", "there", "have", "has", "will", "you", "your", "its", "his", "her"}


def _short(label: str, n: int = 48) -> str:
    label = re.sub(r"\s+", " ", label).strip(" |-–·")
    label = re.sub(r"\s*[|–-]\s*[^|–-]{2,30}$", "", label) or label  # trailing " | Site name"
    return label if len(label) <= n else label[: n - 1].rstrip() + "…"


def _wait(t: float, delay: float) -> int:
    """Sleep until the call has taken as long as the real model would; returns ms."""
    left = delay - (time.perf_counter() - t)
    if left > 0:
        time.sleep(left)
    return round((time.perf_counter() - t) * 1000)


class MockNova:
    def refine_page(self, outline: dict) -> dict:
        """Tier 2: keep the page's real parts on the remote's path, name them, and offer questions."""
        t = time.perf_counter()
        stops = outline.get("stops") or []
        hide = [s["id"] for s in stops if NOISE.search(s.get("label") or "")]
        labels = {}
        for s in stops:
            if s["id"] in hide:
                continue
            if s["kind"] in ("ingredients", "steps") and outline.get("recipe"):
                n = len(outline["recipe"].get("steps") or [])
                labels[s["id"]] = f"Steps · {n}" if s["kind"] == "steps" and n else s["kind"].title()
            elif s["kind"] in ("section", "item", "title"):
                labels[s["id"]] = _short(s.get("label") or "")
        page_type = outline.get("type") or "article"
        return {"type": page_type, "hide": hide, "labels": labels,
                "questions": QUESTIONS.get(page_type, QUESTIONS["article"]),
                "model": MODEL, "simulated": True, "ms": _wait(t, DELAY)}

    def ask_page(self, question: str, text: str, title: str = "") -> dict:
        """The page's sentence that shares the most words with the question, quoted as is."""
        t = time.perf_counter()
        words = {w for w in re.findall(r"[a-z]{3,}", question.lower())} - STOP
        best, score = None, 0
        for s in sentences(text):
            n = len(words & set(re.findall(r"[a-z]{3,}", s.lower())))
            if n > score:
                best, score = s, n
        out = ground(best, [best] if best else [], text)
        return out | {"model": MODEL, "simulated": True, "ms": _wait(t, DELAY)}
