"""Who understands the pages: Nova, or a simulation of it.

CLICKER_AI picks it (by default: nova-api when NOVA_API_KEY is set, else mock):
- "nova-api": the real Nova 2 Lite through the Amazon Nova API (nova.amazon.com/dev-apis),
  which needs no AWS account. Used while the AWS account is PENDING_ACTIVATION.
- "mock": nova_mock answers the way Nova should, by rules, from the page's own map.
  Every answer it gives says `simulated: true`.
- "bedrock": the same model on Amazon Bedrock, wired once the account is active.

Requests and their answers:
- refine_page(outline) -> {type, hide, labels, questions, model, simulated, ms}: tier 2
  of page understanding; the outline is the map the TV's injected script built.
- ask_page(question, text, title) -> {answer, quotes, grounded, dropped, model, simulated, ms}:
  "Ask this page", grounded by ground.py (every quote is on the page, word for word).
"""

from __future__ import annotations

import os
from typing import Protocol

MODEL = "us.amazon.nova-2-lite-v1:0"
MODE = os.environ.get("CLICKER_AI") or ("nova-api" if (os.environ.get("NOVA_API_KEY") or "").strip() else "mock")


class Nova(Protocol):
    def refine_page(self, outline: dict) -> dict: ...

    def ask_page(self, question: str, text: str, title: str = "") -> dict: ...


def nova() -> Nova:
    if MODE == "nova-api":
        from nova_api import from_env

        api = from_env()
        if not api:
            raise RuntimeError("CLICKER_AI=nova-api needs NOVA_API_KEY (put it in server/.env)")
        return api
    if MODE == "mock":
        from nova_mock import MockNova

        return MockNova()
    if MODE == "bedrock":
        raise RuntimeError("CLICKER_AI=bedrock isn't wired yet: the AWS account is still PENDING_ACTIVATION")
    raise RuntimeError(f"CLICKER_AI must be 'nova-api', 'mock' or 'bedrock', not {MODE!r}")
