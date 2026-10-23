"""The simulated Nova only removes and renames what the TV's map holds. Run: uv run pytest -q"""

import os

os.environ["CLICKER_MOCK_DELAY"] = "0"

from nova_mock import MockNova  # noqa: E402


def test_refine_drops_promotions_names_parts_and_offers_questions():
    outline = {"type": "recipe", "recipe": {"steps": ["a", "b", "c"]}, "stops": [
        {"id": 0, "kind": "title", "label": "Spaghetti Carbonara | Lina's Kitchen"},
        {"id": 1, "kind": "item", "label": "Sponsored: the best pans of 2026"},
        {"id": 2, "kind": "steps", "label": "Steps"},
        {"id": 3, "kind": "item", "label": "Subscribe to our newsletter"},
    ]}
    r = MockNova().refine_page(outline)
    assert r["hide"] == [1, 3]
    assert r["labels"] == {0: "Spaghetti Carbonara", 2: "Steps · 3"}
    assert r["questions"][0] == "No cream, what do I use?"
    assert r["simulated"] is True


def test_refine_never_invents_parts():
    r = MockNova().refine_page({"type": "article", "stops": [{"id": 7, "kind": "section", "label": "Early life"}]})
    assert set(r["labels"]) <= {7}
    assert r["hide"] == []


def test_real_nova_answers_are_filtered_to_the_map():
    """Whatever the model says, only ids from the TV's map survive, and labels stay TV-sized."""
    from nova_api import NovaAPI

    api = NovaAPI("test-key")
    reply = ('```json\n{"type": "recipe", "hide": [1, 99], "labels": {"0": "Spaghetti Carbonara", '
             '"1": "hidden anyway", "42": "invented", "2": "' + "x" * 80 + '"}, "questions": ["How long?"]}\n```')
    api._chat = lambda system, user, max_tokens=1200: (reply, {"total_tokens": 10})
    outline = {"type": "recipe", "stops": [{"id": i, "kind": "item", "label": f"stop {i}"} for i in range(3)]}
    r = api.refine_page(outline)
    assert r["hide"] == [1]
    assert set(r["labels"]) == {0, 2} and len(r["labels"][2]) == 48
    assert r["questions"] == ["How long?"] and r["simulated"] is False


def test_real_nova_failure_falls_back_to_rules():
    from nova_api import NovaAPI

    api = NovaAPI("test-key")

    def boom(*a, **k):
        raise TimeoutError("slow")

    api._chat = boom
    r = api.refine_page({"type": "article", "stops": [{"id": 0, "kind": "title", "label": "Hello"}]})
    assert r["simulated"] is True and r["fallback"].startswith("TimeoutError")
