"""The real Nova 2 Lite, through the Amazon Nova API (nova.amazon.com/dev-apis).

It works without an AWS account, which is why it's here: the AWS account is still
PENDING_ACTIVATION. The API is OpenAI-compatible. Once Bedrock is open, the same
model and prompt move to Converse unchanged.

Nova may only remove and rename what the TV's map holds: every id it returns is
checked against the map, and anything else is dropped.
"""

from __future__ import annotations

import json
import os
import re
import time

import httpx

from ground import ground
from nova_mock import QUESTIONS, MockNova

BASE = "https://api.nova.amazon.com/v1"
MODEL = "nova-2-lite-v1"
TYPES = {"recipe", "article", "listing", "product", "video"}

REFINE_PROMPT = """You help Sofa Surf, a web browser for TV remotes, understand a page.
You get the page's outline: its "stops", the parts the remote can jump between, each with an id, a kind and the text found there.

Answer with JSON only, in this shape:
{"type": "recipe|article|listing|product|video", "hide": [ids], "labels": {"id": "label"}, "questions": ["...", "...", "..."]}

- hide: ids of stops a TV viewer doesn't need: ads, sponsored or promoted links, newsletter or sign-up prompts, cookie notices, social "follow us", app download banners, and lists of unrelated trending links. Never hide the title, the main sections, ingredients, steps or videos.
- labels: for kept stops of kind title, section or item, a short label (at most 28 characters) made only from words in that stop's text. If the text is already short, keep its own wording unchanged; never drop words in a way that breaks grammar. Drop site names and boilerplate.
- questions: three short, practical questions (at most 7 words each) a viewer on the sofa would really ask about this page, each answered somewhere in its text: substitutions, timings, quantities, sizes, prices, delivery, what happens next. Not "why is this recommended", not about other products, not about the site itself.
Never invent stops, facts or numbers."""


ASK_PROMPT = """You answer a TV viewer's question about the web page they are looking at, using only that page's text.

Answer with JSON only, in this shape:
{"answer": "one or two short sentences", "quotes": ["exact sentence copied from the page", "..."]}

- quotes: one or two passages copied character for character from the page text that state the answer (a sentence, or a short fact like "Serves 4" or "$349"). Never paraphrase a quote.
- answer: short, in plain words, readable from a sofa. Use only facts in the quotes; don't compute new numbers.
- If the page doesn't answer the question, return {"answer": null, "quotes": []}. Never use outside knowledge."""


def _json(text: str) -> dict:
    """The first JSON object in the reply (models sometimes wrap it in a code fence)."""
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0)) if m else {}


class NovaAPI:
    def __init__(self, key: str):
        self.key = key
        self.fallback = MockNova()

    def _chat(self, system: str, user: str, max_tokens: int = 1200) -> tuple[str, dict]:
        for attempt in (1, 2):  # the API sometimes answers 500 once, then succeeds
            r = httpx.post(
                f"{BASE}/chat/completions",
                headers={"Authorization": f"Bearer {self.key}"},
                json={"model": MODEL, "max_tokens": max_tokens, "temperature": 0.2,
                      "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]},
                timeout=30,
            )
            if r.status_code < 500:
                break
        r.raise_for_status()
        d = r.json()
        return d["choices"][0]["message"]["content"], d.get("usage") or {}

    def refine_page(self, outline: dict) -> dict:
        t = time.perf_counter()
        stops = (outline.get("stops") or [])[:80]
        ids = {s["id"] for s in stops}
        compact = {
            "title": outline.get("title"),
            "type_guess": outline.get("type"),
            "stops": [{"id": s["id"], "kind": s["kind"], "text": (s.get("label") or "")[:90]} for s in stops],
        }
        try:
            reply, usage = self._chat(REFINE_PROMPT, json.dumps(compact, ensure_ascii=False))
            raw = _json(reply)
        except Exception as e:  # noqa: BLE001 - the TV keeps its own map; fall back to rules
            out = self.fallback.refine_page(outline)
            return out | {"fallback": f"{type(e).__name__}: {str(e)[:120]}"}

        # Keep only what refers to the map; trim everything to TV sizes.
        hide = [i for i in raw.get("hide") or [] if i in ids]
        labels = {}
        for k, v in (raw.get("labels") or {}).items():
            if str(k).isdigit() and int(k) in ids and int(k) not in hide and isinstance(v, str) and v.strip():
                labels[int(k)] = v.strip()[:48]
        page_type = raw.get("type") if raw.get("type") in TYPES else (outline.get("type") or "article")
        questions = [q.strip()[:80] for q in raw.get("questions") or [] if isinstance(q, str) and q.strip()][:3]
        return {
            "type": page_type, "hide": hide, "labels": labels,
            "questions": questions or QUESTIONS.get(page_type, QUESTIONS["article"]),
            "model": MODEL, "simulated": False, "usage": usage,
            "ms": round((time.perf_counter() - t) * 1000),
        }


    def ask_page(self, question: str, text: str, title: str = "") -> dict:
        """A grounded answer: what Nova says survives only if the page backs it up (see ground.py)."""
        t = time.perf_counter()
        user = json.dumps({"page_title": title, "question": question, "page_text": text[:14000]}, ensure_ascii=False)
        try:
            reply, usage = self._chat(ASK_PROMPT, user, max_tokens=400)
            raw = _json(reply)
        except Exception as e:  # noqa: BLE001 - rules still answer from the page itself
            return self.fallback.ask_page(question, text, title) | {"fallback": f"{type(e).__name__}: {str(e)[:120]}"}
        out = ground(raw.get("answer") if isinstance(raw.get("answer"), str) else None, raw.get("quotes") or [], text)
        return out | {"model": MODEL, "simulated": False, "usage": usage, "ms": round((time.perf_counter() - t) * 1000)}


def from_env() -> NovaAPI | None:
    key = (os.environ.get("NOVA_API_KEY") or "").strip()
    return NovaAPI(key) if key else None
