"""Tests for scripts/build_clues.py. No internet, no Transfermarkt files."""

from datetime import date

from scripts.build_clues import (
    body_fact,
    born_fact,
    contract_fact,
    fee_band,
    league_before,
    player_facts,
    position_fact,
    season_fact,
    transfer_fact,
    window,
)

TODAY = date(2026, 11, 23)
# Lille (1082) played in Ligue 1 the year before the moves below; club 999 has no league games in the data
HISTORY = [("2025-03-01", "1082", "FR1"), ("2024-11-01", "1082", "FR1")]


def tm(**changes):
    row = {
        "sub_position": "Left Winger", "international_caps": "12", "highest_market_value_in_eur": "45000000",
        "contract_expiration_date": "2029-06-30", "foot": "left", "height_in_cm": "179",
        "country_of_birth": "France", "country_of_citizenship": "France",
    }
    return {**row, **changes}


def move(day, fee, from_club="1082", to_club="11"):
    return {"transfer_date": day, "transfer_fee": fee, "from_club_id": from_club, "to_club_id": to_club}


def test_fees_become_bands_that_do_not_name_the_player():
    assert fee_band(116_000_000) == [100, None]
    assert fee_band(45_000_000) == [40, 70]
    assert fee_band(3_000_000) == [0, 5]
    assert fee_band(10_000_000) == [10, 20]


def test_transfer_windows():
    assert window("2025-08-30") == {"window": "summer", "year": 2025}
    assert window("2025-12-28") == {"window": "winter", "year": 2026}
    assert window("2026-01-15") == {"window": "winter", "year": 2026}
    assert window("2026-04-01") == {"window": "year", "year": 2026}


def test_the_paid_move_to_the_current_club_with_its_league_of_that_time():
    fact = transfer_fact([move("2021-07-01", "5000000", to_club="5"), move("2025-08-01", "45000000")], False, HISTORY)
    assert fact == {"type": "transfer", "window": "summer", "year": 2025, "fee": [40, 70], "league": "Ligue 1"}


def test_the_league_comes_from_the_games_before_the_move():
    assert league_before(HISTORY, "1082", "2025-08-01") == "FR1"
    assert league_before(HISTORY, "1082", "2023-08-01") is None  # no games in the year before
    assert league_before(HISTORY, "999", "2025-08-01") is None
    assert "league" not in transfer_fact([move("2025-08-01", "8000000", from_club="999")], False, HISTORY)


def test_a_loan_away_and_back_keeps_the_paid_move():
    # Pedri: bought by Barcelona in 2019, loaned back to Las Palmas, returned in 2020
    rows = [move("2019-09-02", "23000000", from_club="472", to_club="131"), move("2019-09-03", "0.000", "131", "472"),
            move("2020-07-31", "0.000", "472", "131")]
    assert transfer_fact(rows, False, [])["year"] == 2019


def test_free_moves_loans_away_and_missing_summer_moves_give_no_transfer():
    # out on loan now: the latest row ends at another club
    assert transfer_fact([move("2025-08-01", "45000000"), move("2026-01-31", "0.000", "11", "77")], False, HISTORY) is None
    assert transfer_fact([move("2025-08-01", "")], False, HISTORY) is None
    # changed clubs for 2026-27, but the data stops before that move: the latest row is an older move
    assert transfer_fact([move("2024-07-01", "20000000")], moved=True, history=HISTORY) is None
    assert transfer_fact([move("2026-06-20", "20000000")], moved=True, history=HISTORY)["year"] == 2026
    # planned loan returns after the data ends are not moves
    assert transfer_fact([move("2025-08-01", "45000000"), move("2027-06-30", "", "77", "11")], False, HISTORY)["year"] == 2025


def test_a_season_needs_five_games():
    assert season_fact({"games": 4, "goals": 3, "assists": 0}) is None
    assert season_fact({"games": 33, "goals": 12, "assists": 4}) == {
        "type": "season", "season": "2025-26", "games": 33, "goals": 12, "assists": 4,
    }
    assert season_fact(None) is None


def test_goalkeepers_get_no_position_detail():
    assert position_fact(tm()) == {"type": "position", "detail": "leftWinger"}
    assert position_fact(tm(sub_position="Goalkeeper")) is None
    assert position_fact(tm(sub_position="")) is None


def test_old_or_unsure_contracts_are_left_out():
    assert contract_fact(tm(), up_to_date=True, today=TODAY) == {"type": "contract", "until": 2029}
    assert contract_fact(tm(), up_to_date=False, today=TODAY) is None
    assert contract_fact(tm(contract_expiration_date="2025-06-30"), True, TODAY) is None
    assert contract_fact(tm(contract_expiration_date=""), True, TODAY) is None


def test_body_is_the_fallback_even_when_half_known():
    assert body_fact(tm()) == {"type": "body", "foot": "left", "height": 179}
    assert body_fact(tm(foot="", height_in_cm="")) is None
    assert body_fact(tm(height_in_cm="")) == {"type": "body", "foot": "left", "height": None}


def test_birthplace_only_when_it_does_not_give_the_nationality_away():
    assert born_fact(tm(), "France") is None
    assert born_fact(tm(country_of_citizenship="Mali"), "Mali") == {"type": "born", "country": "FR"}
    assert born_fact(tm(country_of_citizenship="Mali"), "France") is None  # the tile would show France
    assert born_fact(tm(country_of_birth="Atlantis", country_of_citizenship="Mali"), "Mali") is None


def test_a_player_missing_from_transfermarkt_has_no_facts():
    assert player_facts({"nationality": "France"}, None, [], None, False, HISTORY, TODAY) == []


def test_all_facts_of_one_player():
    facts = player_facts(
        {"nationality": "Mali"}, tm(country_of_citizenship="Mali"), [move("2025-08-01", "45000000")],
        {"games": 33, "goals": 12, "assists": 4}, False, HISTORY, TODAY,
    )
    assert [f["type"] for f in facts] == ["transfer", "season", "position", "caps", "peak", "contract", "body", "born"]
