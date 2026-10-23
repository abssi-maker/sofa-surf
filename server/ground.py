"""The grounding rule for "Ask this page": an answer only reaches the TV if the page says it.

- Every quote must appear in the page text, word for word (only spacing and quote marks may differ).
  A quote under 12 characters counts only if it holds a number and stands alone in the text ("$349", "Serves 4").
- Every number in the answer must appear in a kept quote (number words count: "four" = 4), and the quotes
  that share most with the answer come first.
- Every number in the answer must appear in the page text.
- No verified quote means "Not on this page": the TV never shows an answer it can't point to.
"""

from __future__ import annotations

import re

_QUOTES = str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-"})
_NUMBER = re.compile(r"\d+(?:[.,]\d+)?")


def norm(text: str) -> str:
    """Spacing and typographic quotes don't change what a page says."""
    return re.sub(r"\s+", " ", (text or "").translate(_QUOTES)).strip()


def on_page(quote: str, text: str) -> bool:
    """A sentence found in the text, or a short fact (a price, a size) that is a whole line of the page."""
    q = norm(quote).strip(' ."\'')
    if len(q) >= 12:
        return q.lower() in norm(text).lower()
    # A short fact must hold a number and stand on its own in the text ("$349", "Serves 4"), not inside a word.
    pat = rf"(?<![\w$.,]){re.escape(q.lower())}(?![\w.,]*\d)"
    return len(q) >= 2 and bool(_NUMBER.search(q)) and re.search(pat, norm(text).lower()) is not None


_NUMBER_WORDS = {w: str(i) for i, w in enumerate(
    "zero one two three four five six seven eight nine ten eleven twelve".split())}


def _digits(text: str) -> str:
    """'serves four' and 'serves 4' say the same thing."""
    return re.sub(r"\b(" + "|".join(_NUMBER_WORDS) + r")\b", lambda m: _NUMBER_WORDS[m.group(1).lower()], text, flags=re.I)


def _words(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9$]{3,}", _digits(text).lower()))


def sentences(text: str) -> list[str]:
    """The page text cut into sentences (and lines, which on web pages are often list items)."""
    out = []
    for line in (text or "").splitlines():
        out += [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(])", line) if len(s.strip()) >= 12]
    return out


def ground(answer: str | None, quotes: list, text: str) -> dict:
    """Keep only what the page backs up. Returns {answer, quotes, grounded, dropped}."""
    kept, dropped = [], []
    for q in quotes or []:
        if isinstance(q, str) and on_page(q, text) and norm(q) not in kept:
            kept.append(norm(q))
        elif isinstance(q, str) and q.strip():
            dropped.append(q.strip()[:120])
    kept = kept[:3]
    if not kept:
        return {"answer": None, "quotes": [], "grounded": False, "dropped": dropped}
    answer = norm(answer or "")
    kept.sort(key=lambda q: -len(_words(q) & _words(answer)))
    # A number the page doesn't contain means the model computed or invented it: show the quotes alone.
    quoted = " ".join(_digits(q) for q in kept)
    on = lambda n: re.search(rf"(?<![\d.,]){re.escape(n)}(?![\d])", quoted)  # noqa: E731 - "2" must not match "12"
    if answer and not all(on(n) for n in _NUMBER.findall(_digits(answer))):
        dropped.append(f"answer with numbers its quotes don't show: {answer[:120]}")
        answer = ""
    return {"answer": answer[:280] or None, "quotes": kept, "grounded": True, "dropped": dropped}
