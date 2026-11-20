"""Tests for scripts/build_season.py and the club matching in scripts/download_api_football.py. No internet."""

from datetime import date

from scripts.build_season import (
    age_on,
    assign_tiers,
    best_age,
    match_players,
    player_entry,
    position,
    same_person,
    unique_names,
)
from scripts.download_api_football import is_first_team, match_team

TODAY = date(2026, 11, 8)


def test_age_counts_the_birthday():
    assert age_on("1998-12-20", TODAY) == 27
    assert age_on("1998-11-08", TODAY) == 28
    assert age_on(None, TODAY) is None


def test_a_wrong_birth_date_gives_way():
    assert best_age(48, 21) == 21
    assert best_age(25, 24) == 25
    assert best_age(None, 24) == 24
    assert best_age(25, None) == 25


def test_positions_from_either_source():
    assert position(None, "Attacker") == "Forward"
    assert position("Centre-Back", None) == "Defender"
    assert position("Offence", None) == "Forward"
    assert position("Left Winger", None) == "Forward"
    assert position(None, None) is None


def test_short_first_names_and_double_surnames():
    assert same_person("Harvey Davies", "H. Davies")
    assert same_person("Trent Alexander-Arnold", "T. Alexander-Arnold")
    assert same_person("Martin Ødegaard", "M. Odegaard")
    assert same_person("Rodri", "Rodrigo Rodri Hernandez")
    assert not same_person("Harvey Davies", "B. Davies")


def test_players_with_the_same_surname_are_told_apart_by_age():
    squad = [
        {"id": 1, "name": "Harvey Davies", "dateOfBirth": "2003-09-03"},
        {"id": 2, "name": "Ben Davies", "dateOfBirth": "1993-04-24"},
        {"id": 3, "name": "Neco Williams", "dateOfBirth": "2001-04-13"},
        {"id": 4, "name": "Joe Williams", "dateOfBirth": "1996-12-08"},
    ]
    af = [
        {"name": "H. Davies", "age": 23, "number": 32},
        {"name": "Williams", "age": 25, "number": 7},
    ]
    matches = match_players(squad, af, TODAY)
    assert matches[1]["number"] == 32
    assert matches[3]["number"] == 7  # only one Williams is about 25
    assert 2 not in matches and 4 not in matches


def test_unclear_matches_stay_empty():
    squad = [{"id": 1, "name": "Danilo", "dateOfBirth": None}, {"id": 2, "name": "Danilo Pereira", "dateOfBirth": None}]
    assert match_players(squad, [{"name": "Danilo", "age": None}], TODAY) == {}


def test_tiers_follow_the_value_rank():
    values = {f"p{i}": 1000 - i for i in range(200)} | {"unknown": None}
    tiers = assign_tiers(values)
    assert tiers["p0"] == tiers["p39"] == 1
    assert tiers["p40"] == tiers["p179"] == 2
    assert tiers["p180"] == tiers["unknown"] == 3


def test_equal_names_get_the_club():
    players = [
        {"name": "Danilo", "team": "Juventus"},
        {"name": "Danilo", "team": "Napoli"},
        {"name": "Rodri", "team": "X"},
    ]
    unique_names(players)
    assert [p["name"] for p in players] == ["Danilo (Juventus)", "Danilo (Napoli)", "Rodri"]


def test_youth_reserve_and_women_teams_are_skipped():
    assert is_first_team({"name": "Lens", "national": False})
    for name in ("Lens II", "Lens U19", "Lens W", "Real Madrid III"):
        assert not is_first_team({"name": name, "national": False})
    assert not is_first_team({"name": "France", "national": True})


def test_club_matching():
    af = [
        {"id": 85, "name": "Paris Saint Germain", "code": "PSG"},
        {"id": 114, "name": "Paris FC", "code": "PAR"},
        {"id": 33, "name": "Manchester United", "code": "MUN"},
        {"id": 50, "name": "Manchester City", "code": "MCI"},
        {"id": 3118, "name": "Stade Beaucairois", "code": None},
    ]
    assert match_team({"id": 1, "name": "Paris FC", "shortName": "Paris FC", "tla": "PFC"}, af)["id"] == 114
    assert match_team({"id": 2, "name": "Manchester City FC", "shortName": "Man City", "tla": "MCI"}, af)["id"] == 50
    assert match_team({"id": 3, "name": "Unknown Town", "shortName": "Unknown", "tla": "UNK"}, af) is None


def test_each_player_keeps_the_football_data_id():
    fd = {"id": 7, "name": "Eli Kroupi", "position": "Offence", "dateOfBirth": "2006-06-23", "nationality": "France"}
    af = {"number": 22, "photo": "https://media.api-sports.io/football/players/368030.png", "age": 20}
    entry = player_entry(fd, af, "Bournemouth", TODAY)
    assert entry == {
        "id": 7,
        "name": "Eli Kroupi",
        "team": "Bournemouth",
        "position": "Forward",
        "age": 20,
        "number": 22,
        "nationality": "France",
        "photo": "https://media.api-sports.io/football/players/368030.png",
    }
    unmatched = player_entry(fd, {}, "Bournemouth", TODAY)
    assert unmatched["id"] == 7 and unmatched["number"] is None and unmatched["photo"] is None
