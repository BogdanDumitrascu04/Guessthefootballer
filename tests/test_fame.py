"""Tests for the levels (who can be hidden on Easy, Medium, Hard): scripts/build_fame.py, build_season.py. No internet."""

import json

import pytest

from scripts.build_fame import suggestion
from scripts.build_season import LEAGUES, OUT_DIR, assign_levels, level_of


def row(suggested, correction=""):
    return {"name": "X", "suggestion": suggested, "correction": correction}


def test_the_correction_wins_over_the_suggestion():
    assert level_of(row("greu")) == "hard"
    assert level_of(row("greu", "ușor")) == "easy"
    assert level_of(row("usor", "Mediu ")) == "medium"
    assert level_of(row("mediu", "exclus")) is None


def test_a_typo_in_a_correction_stops_the_build():
    with pytest.raises(ValueError):
        level_of(row("usor", "usr"))


def test_each_league_has_its_own_cut():
    assert suggestion(40, "premier-league", True) == "usor"
    assert suggestion(40, "ligue-1", True) == "mediu"
    assert suggestion(200, "ligue-1", True) == "greu"
    assert suggestion(1, "ligue-1", False) == "exclus"


def test_new_players_are_hard_and_incomplete_ones_are_never_hidden():
    players = [
        {"id": 1, "name": "Known", "number": 10, "age": 25},
        {"id": 2, "name": "New", "number": 7, "age": 19},
        {"id": 3, "name": "No number", "number": None, "age": 30},
    ]
    new = assign_levels(players, {1: row("usor"), 3: row("usor")})
    assert [p["level"] for p in players] == ["easy", "hard", None]
    assert new == ["New"]


def levels():
    found = {}
    for league_id, _ in LEAGUES.values():
        for p in json.loads((OUT_DIR / f"{league_id}.json").read_text(encoding="utf-8"))["players"]:
            found[p["name"]] = p["level"]
    return found


def test_the_famous_veterans_are_easy_and_the_unknown_are_not():
    found = levels()
    for name in ("Luka Modrić", "Kevin De Bruyne", "Virgil van Dijk", "Manuel Neuer", "Kylian Mbappé"):
        assert found[name] == "easy", name
    assert found["Samir El Mourabet"] != "easy"


def test_every_league_can_hide_a_player_on_every_level():
    for league_id, _ in LEAGUES.values():
        players = json.loads((OUT_DIR / f"{league_id}.json").read_text(encoding="utf-8"))["players"]
        for level in ("easy", "medium", "hard"):
            assert any(p["level"] == level and p["number"] is not None and p["age"] is not None for p in players), (league_id, level)
