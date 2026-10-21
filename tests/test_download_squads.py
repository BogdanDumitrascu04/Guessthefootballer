"""Teste fără internet pentru scripts/download_squads.py. Internetul e înlocuit cu funcții false."""

import json
from datetime import date

import httpx
import pytest

from scripts.download_squads import (
    MAX_WAIT,
    count_squads,
    current_season_start,
    file_path,
    process,
    save_complete,
    season_label,
    seasons_to_download,
    wait_seconds,
)


def squads_json(start_year: int, players_per_team: tuple[int, ...] = (2, 3)) -> bytes:
    teams = [
        {"name": f"Club {i}", "squad": [{"id": i * 100 + j, "name": f"Jucător {j}"} for j in range(n)]}
        for i, n in enumerate(players_per_team)
    ]
    return json.dumps({"season": {"startDate": f"{start_year}-08-16"}, "teams": teams}).encode()


def response(status: int, content: bytes = b"", headers: dict | None = None) -> httpx.Response:
    return httpx.Response(status, content=content, headers=headers, request=httpx.Request("GET", "https://x/"))


def fake_fetch(*responses: httpx.Response):
    """Întoarce răspunsurile pe rând și ține minte fiecare cerere."""
    queue, calls = list(responses), []

    def fetch(url: str, params: dict) -> httpx.Response:
        calls.append((url, params))
        return queue.pop(0)

    return fetch, calls


def no_sleep(seconds: float) -> None:
    raise AssertionError("nu trebuia să aștepte")


def test_current_season_start():
    assert current_season_start(date(2026, 10, 21)) == 2026  # toamna: 2026/27
    assert current_season_start(date(2027, 3, 1)) == 2026  # primăvara: tot 2026/27
    assert current_season_start(date(2027, 7, 1)) == 2027  # din iulie: sezon nou


def test_last_three_seasons():
    assert seasons_to_download(2026) == [2024, 2025, 2026]


def test_labels_and_names(tmp_path):
    assert season_label(2024) == "2024-25"
    assert season_label(2099) == "2099-00"
    assert file_path(tmp_path, "BL1", 2026).name == "BL1_2026-27.json"


def test_count_squads():
    assert count_squads(squads_json(2024), 2024) == (2, 5)


def test_count_squads_rejects_wrong_season():
    with pytest.raises(ValueError, match="alt sezon"):
        count_squads(squads_json(2026), 2024)


def test_count_squads_rejects_error_message():
    with pytest.raises(ValueError, match="lipsesc echipele"):
        count_squads(b'{"message": "restricted", "errorCode": 403}', 2024)
    with pytest.raises(ValueError, match="JSON valid"):
        count_squads(b"<html>Bad gateway</html>", 2024)


def test_count_squads_rejects_team_without_squad():
    with pytest.raises(ValueError, match="Club 1"):
        count_squads(squads_json(2024, (2, 0)), 2024)


def test_save_complete_leaves_no_part_file(tmp_path):
    path = tmp_path / "raw" / "PL_2024-25.json"
    save_complete(path, squads_json(2024))
    assert path.read_bytes() == squads_json(2024)
    assert list(path.parent.iterdir()) == [path]


def test_past_season_is_downloaded_only_once(tmp_path):
    fetch, calls = fake_fetch(response(200, squads_json(2024)))
    first = process(fetch, no_sleep, tmp_path, "PL", 2024, current=2026)
    second = process(fetch, no_sleep, tmp_path, "PL", 2024, current=2026)
    assert (first.status, first.teams, first.players) == ("descărcat", 2, 5)
    assert (second.status, second.players) == ("existent", 5)
    assert calls == [("/competitions/PL/teams", {"season": 2024})]  # a doua oară n-a mai cerut nimic


def test_current_season_is_downloaded_every_time(tmp_path):
    fetch, calls = fake_fetch(response(200, squads_json(2026)), response(200, squads_json(2026, (2, 4))))
    process(fetch, no_sleep, tmp_path, "PL", 2026, current=2026)
    second = process(fetch, no_sleep, tmp_path, "PL", 2026, current=2026)
    assert (second.status, second.players) == ("actualizat (sezon curent)", 6)
    assert len(calls) == 2


def test_broken_local_file_is_downloaded_again(tmp_path):
    file_path(tmp_path, "PL", 2024).write_bytes(b"{jumatate de fis")
    fetch, _ = fake_fetch(response(200, squads_json(2024)))
    result = process(fetch, no_sleep, tmp_path, "PL", 2024, current=2026)
    assert result.status.startswith("descărcat din nou")


def test_429_waits_as_told_then_retries_once(tmp_path):
    waits = []
    fetch, calls = fake_fetch(
        response(429, headers={"X-RequestCounter-Reset": "17"}),
        response(200, squads_json(2024)),
    )
    result = process(fetch, waits.append, tmp_path, "PL", 2024, current=2026)
    assert result.status == "descărcat"
    assert waits == [17]
    assert len(calls) == 2


def test_429_twice_is_an_error_and_keeps_the_old_file(tmp_path):
    path = file_path(tmp_path, "PL", 2026)
    path.write_bytes(squads_json(2026))
    fetch, calls = fake_fetch(response(429), response(429))
    result = process(fetch, lambda s: None, tmp_path, "PL", 2026, current=2026)
    assert result.status == "EROARE: prea multe cereri (429), chiar și după așteptare (am păstrat fișierul vechi)"
    assert path.read_bytes() == squads_json(2026)
    assert len(calls) == 2  # o singură reîncercare, nu la nesfârșit


def test_403_is_reported_without_retry(tmp_path):
    fetch, calls = fake_fetch(response(403, b'{"errorCode": 403}'))
    result = process(fetch, no_sleep, tmp_path, "SA", 2024, current=2026)
    assert result.status.startswith("EROARE: acces refuzat (403)")
    assert result.players is None
    assert not file_path(tmp_path, "SA", 2024).exists()
    assert len(calls) == 1


def test_wrong_content_does_not_overwrite_good_file(tmp_path):
    path = file_path(tmp_path, "PL", 2026)
    path.write_bytes(squads_json(2026))
    fetch, _ = fake_fetch(response(200, squads_json(2025)))  # sursa a trimis alt sezon
    result = process(fetch, no_sleep, tmp_path, "PL", 2026, current=2026)
    assert "alt sezon (2025)" in result.status
    assert path.read_bytes() == squads_json(2026)


def test_wait_seconds():
    assert wait_seconds(response(429, headers={"X-RequestCounter-Reset": "30"})) == 30
    assert wait_seconds(response(429)) == MAX_WAIT  # fără indicație: un minut întreg
    assert wait_seconds(response(429, headers={"X-RequestCounter-Reset": "3600"})) == MAX_WAIT
    assert wait_seconds(response(429, headers={"X-RequestCounter-Reset": "abc"})) == MAX_WAIT
