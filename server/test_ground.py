"""Ask this page only answers what the page says. Run: uv run pytest -q"""

import os

os.environ["CLICKER_MOCK_DELAY"] = "0"

from ground import ground  # noqa: E402
from nova_mock import MockNova  # noqa: E402

PAGE = """Weeknight Spaghetti Carbonara
Total time: 25 minutes. Serves 4.
Traditional carbonara has no cream: the eggs and pecorino make the sauce silky.
If you can't find guanciale, thick-cut pancetta works fine."""


def test_quotes_must_be_on_the_page_word_for_word():
    r = ground("No cream: eggs and cheese make the sauce.",
               ["Traditional carbonara has no cream:  the eggs and pecorino make the sauce silky.",
                "Carbonara was invented in 1944 by American soldiers."], PAGE)
    assert r["grounded"] and r["quotes"] == ["Traditional carbonara has no cream: the eggs and pecorino make the sauce silky."]
    assert r["dropped"] == ["Carbonara was invented in 1944 by American soldiers."]


def test_no_quote_on_the_page_means_not_on_this_page():
    r = ground("It has 650 calories.", ["Each serving has about 650 calories."], PAGE)
    assert r == {"answer": None, "quotes": [], "grounded": False, "dropped": ["Each serving has about 650 calories."]}


def test_the_answers_numbers_must_be_in_its_quotes():
    page = "Prep\n10 min\nServes\n4\nFor two people, halve every ingredient: 200 g spaghetti."
    r = ground("This recipe serves four people.", ["For two people, halve every ingredient: 200 g spaghetti."], page)
    assert r["answer"] is None and r["quotes"]  # "four" isn't in that quote
    r = ground("It serves four.", ["Serves 4", "For two people, halve every ingredient: 200 g spaghetti."], page)
    assert r["answer"] == "It serves four." and r["quotes"][0] == "Serves 4"


def test_numbers_the_page_doesnt_contain_drop_the_answer_but_keep_the_quotes():
    r = ground("For 2 people it takes 12 minutes.", ["Total time: 25 minutes."], PAGE)
    assert r["grounded"] and r["answer"] is None and r["quotes"] == ["Total time: 25 minutes."]
    assert ground("It takes 25 minutes.", ["Total time: 25 minutes."], PAGE)["answer"] == "It takes 25 minutes."


def test_typographic_quotes_and_spacing_dont_matter():
    assert ground("Pancetta.", ["If you can’t find guanciale, thick-cut pancetta works fine."], PAGE)["grounded"]


def test_simulated_ask_quotes_the_best_matching_sentence():
    r = MockNova().ask_page("No cream, what do I use?", PAGE)
    assert r["quotes"] == ["Traditional carbonara has no cream: the eggs and pecorino make the sauce silky."]
    assert r["simulated"] is True


def test_real_nova_answer_is_grounded_too():
    from nova_api import NovaAPI

    api = NovaAPI("test-key")
    api._chat = lambda system, user, max_tokens=1200: (
        '{"answer": "Use pancetta.", "quotes": ["If you can\'t find guanciale, thick-cut pancetta works fine.", "made up"]}', {})
    r = api.ask_page("No guanciale?", PAGE)
    assert r["answer"] == "Use pancetta." and len(r["quotes"]) == 1 and r["simulated"] is False


def test_short_facts_count_only_as_whole_lines_with_a_number():
    page = "Linden Oak Lounge Chair\n$349\nAdd to cart\nWidth\t72 cm (28.3 in)"  # noqa: E501
    r = ground("It costs $349.", ["$349", "Add to cart"], page)
    assert r["quotes"] == ["$349"] and r["answer"] == "It costs $349." and r["dropped"] == ["Add to cart"]
    assert not ground("", ["49"], page)["grounded"]  # inside "$349", not on its own
