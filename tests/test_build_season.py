"""Tests for scripts/build_season.py and the club matching in scripts/download_api_football.py. No internet."""

from datetime import date

import pytest

from scripts import build_season
from scripts.build_season import (
    age_on,
    assign_tiers,
    best_age,
    load_manual_links,
    manual_entry,
    market_value,
    match_leftovers,
    match_players,
    match_profiles,
    player_entry,
    position,
    same_person,
    same_surname,
    search_term,
    tm_player,
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


def tm(player_id, name, born):
    return {"player_id": player_id, "name": name, "date_of_birth": born}


def second_pass(squad, af, by_birth=None, matched=None):
    """match_leftovers after match_players, as build_league runs them."""
    matched = match_players(squad, af, TODAY) if matched is None else matched
    return match_leftovers(squad, af, matched, by_birth or {}, TODAY)


def test_transfermarkt_player_needs_the_birth_date_and_a_single_fit():
    by_birth = {"2001-07-03": [tm("1", "Promise David", "2001-07-03")]}
    assert tm_player({"name": "Promise Akinpelu", "dateOfBirth": "2001-07-03"}, by_birth)["player_id"] == "1"
    assert tm_player({"name": "Promise Akinpelu", "dateOfBirth": "2001-07-04"}, by_birth) is None
    two = {"2001-07-03": [tm("1", "Promise David", "2001-07-03"), tm("2", "Promise Okafor", "2001-07-03")]}
    assert tm_player({"name": "Promise Akinpelu", "dateOfBirth": "2001-07-03"}, two) is None
    assert (
        market_value({"name": "Promise Akinpelu", "dateOfBirth": "2001-07-03"}, by_birth, {"1": 5_000_000}) == 5_000_000
    )


def test_surname_without_the_initial():
    assert same_surname("Femi Azeez", "O. Azeez")
    assert same_surname("Mamadou Usman Simbakoli", "U. Simbakoli")
    assert not same_surname("Álvaro Carreras", "Álvaro Fernández")  # a first name alone is not enough
    assert not same_surname("Femi Azeez", "O.")


def test_second_pass_uses_the_transfermarkt_name():
    squad = [{"id": 1, "name": "Promise Akinpelu", "dateOfBirth": "2001-07-03"}]
    af = [{"id": 10, "name": "P. David", "age": 25, "number": 12}]
    assert match_players(squad, af, TODAY) == {}
    by_birth = {"2001-07-03": [tm("1", "Promise David", "2001-07-03")]}
    assert second_pass(squad, af, by_birth) == {1: (af[0], "transfermarkt")}


def test_second_pass_uses_the_surname():
    squad = [{"id": 1, "name": "Femi Azeez", "dateOfBirth": "2001-06-05"}]
    af = [{"id": 10, "name": "O. Azeez", "age": 25, "number": 11}]
    assert match_players(squad, af, TODAY) == {}
    assert second_pass(squad, af) == {1: (af[0], "surname")}


def test_second_pass_needs_a_known_and_close_age():
    af = [{"id": 10, "name": "O. Azeez", "age": 25}]
    assert second_pass([{"id": 1, "name": "Femi Azeez", "dateOfBirth": "1998-06-05"}], af) == {}  # 28 vs 25
    assert second_pass([{"id": 1, "name": "Femi Azeez", "dateOfBirth": None}], af) == {}
    assert second_pass([{"id": 1, "name": "Femi Azeez", "dateOfBirth": "2001-06-05"}], [af[0] | {"age": None}]) == {}


def test_the_age_picks_the_right_llorente():
    squad = [{"id": 1, "name": "Marcos Llorente", "dateOfBirth": "1995-01-30"}]
    af = [{"id": 10, "name": "M. Llorente", "age": 17}, {"id": 11, "name": "Marcos Llorente", "age": 31}]
    assert match_players(squad, af, TODAY) == {}  # both pass the name rule, so the first pass links neither
    assert second_pass(squad, af) == {1: (af[1], "surname")}


def test_second_pass_keeps_the_first_pass_links():
    squad = [
        {"id": 1, "name": "Harvey Davies", "dateOfBirth": "2003-09-03"},
        {"id": 2, "name": "Hugo Davies", "dateOfBirth": "2003-05-01"},
    ]
    af = [{"id": 10, "name": "H. Davies", "age": 23}]
    first = {1: af[0]}  # taken already, so Hugo Davies cannot have it too
    assert second_pass(squad, af, matched=first) == {}


def test_second_pass_links_only_unique_pairs():
    two_candidates = [{"id": 10, "name": "O. Azeez", "age": 25}, {"id": 11, "name": "F. Azeez", "age": 24}]
    assert second_pass([{"id": 1, "name": "Femi Azeez", "dateOfBirth": "2001-06-05"}], two_candidates) == {}
    one_candidate_wanted_twice = [
        {"id": 1, "name": "Femi Azeez", "dateOfBirth": "2001-06-05"},
        {"id": 2, "name": "Tobi Azeez", "dateOfBirth": "2001-09-01"},
    ]
    assert second_pass(one_candidate_wanted_twice, [{"id": 10, "name": "O. Azeez", "age": 25}]) == {}


def test_search_terms_are_plain_letters():
    assert search_term("Vítězslav Jaroš") == "jaros"
    assert search_term("Oscar Højlund") == "jlund"
    assert search_term("Anass Salah-Eddine") == "eddine"
    assert search_term("Juma Bah") == "juma"  # the API needs 4 letters at least
    assert search_term("Ji-soo Kim") is None


def profile(af_id, name, born, number=None):
    first, last = name.split(" ", 1)
    return {
        "id": af_id,
        "name": f"{first[0]}. {last}",
        "firstname": first,
        "lastname": last,
        "age": 24,
        "birth": {"date": born},
        "number": number,
        "photo": f"https://media.api-sports.io/football/players/{af_id}.png",
    }


EKITIKE = {"id": 1, "name": "Hugo Ekitike", "dateOfBirth": "2002-06-20"}


def test_third_pass_needs_the_exact_birth_date():
    found = {1: [profile(174565, "Hugo Ekitike", "2002-06-20", 22), profile(9, "Hugo Ekitike", "1980-01-01", 9)]}
    link, method = match_profiles([EKITIKE], {}, found, [], {}, 40)[1]
    assert (link["number"], link["photo"], method) == (22, found[1][0]["photo"], "birth date")
    wrong_day = {1: [profile(174565, "Hugo Ekitike", "2002-06-21", 22)]}
    assert match_profiles([EKITIKE], {}, wrong_day, [], {}, 40) == {}
    twins = {1: [profile(5, "Hugo Ekitike", "2002-06-20"), profile(6, "Hugo Ekitike", "2002-06-20")]}
    assert match_profiles([EKITIKE], {}, twins, [], {}, 40) == {}


def test_twins_share_the_birth_date_and_surname_but_not_the_first_name():
    emil = {"id": 2, "name": "Emil Højlund", "dateOfBirth": "2005-01-04"}
    found = {2: [profile(339874, "Oscar Højlund", "2005-01-04", 6)]}
    assert match_profiles([emil], {}, found, [], {339874: 50}, 40) == {}


def test_third_pass_prefers_the_squad_and_distrusts_another_club():
    squad = [{"id": 174565, "name": "H. Ekitike", "age": 24, "number": 22, "position": "Attacker"}]
    found = {1: [profile(174565, "Hugo Ekitike", "2002-06-20", 9)]}
    assert match_profiles([EKITIKE], {}, found, squad, {174565: 40}, 40)[1] == (squad[0], "birth date")
    link, method = match_profiles([EKITIKE], {}, found, [], {174565: 50}, 40)[1]
    assert method == "birth date, other club" and "number" not in link and link["photo"]
    assert match_profiles([EKITIKE], {2: {"id": 174565}}, found, [], {}, 40) == {}  # taken by another player


def test_manual_links_win(tmp_path, monkeypatch):
    csv_file = tmp_path / "manual_links.csv"
    header = "fd_id;name;api_football_id;number;note\n"
    csv_file.write_text(header + "7;A;284300;;\n8;B;;19;youth\n", encoding="utf-8-sig")
    monkeypatch.setattr(build_season, "MANUAL_LINKS", csv_file)
    links = load_manual_links()
    assert links == {7: {"api_football_id": 284300, "number": None}, 8: {"api_football_id": None, "number": 19}}
    squad = [{"id": 284300, "name": "Álvaro Fernández", "number": 18, "photo": "x.png"}]
    assert manual_entry(links[7], {}, squad) == squad[0]
    assert manual_entry(links[7], {}, [])["photo"] == "https://media.api-sports.io/football/players/284300.png"
    assert manual_entry(links[8], {"photo": "y.png", "number": None}, []) == {"photo": "y.png", "number": 19}
    csv_file.write_text(header + "8;B;;123;\n", encoding="utf-8-sig")
    with pytest.raises(ValueError):
        load_manual_links()
