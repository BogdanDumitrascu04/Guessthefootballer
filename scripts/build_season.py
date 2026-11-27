"""Builds data/seasons/2026-27/<league>.json for the game from the downloaded sources.

- squads, full names, nationality, date of birth: football-data.org;
- photo and shirt number: API-Football, linked to each player by club, name and age; a second pass
  links the rest by club, age and either the Transfermarkt name or the surname; a third pass uses the
  API-Football name searches (download_api_football.py --profiles) and the exact birth date;
  data/manual_links.csv, filled by hand, has the last word;
- tier: suggested from the latest Transfermarkt market value, ranked within the league (it decides the card);
- level: who can be hidden on Easy, Medium or Hard, from data/fame.csv (scripts/build_fame.py + Bogdan's corrections).
The Transfermarkt player is found by birth date and name; data/manual_tm.csv fixes the birth dates that differ.

Run from the project folder (after download_squads.py and download_api_football.py):
    .venv\\Scripts\\python.exe scripts\\build_season.py
The links found after the first pass are listed in data/raw/second_pass.txt, for checking by hand;
the players still without photo or number in data/raw/incomplete.txt.
"""

import csv
import gzip
import html
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_DIR / "data" / "raw"
AF_DIR = RAW_DIR / "api-football"
TM_DIR = RAW_DIR / "transfermarkt"
SEASON = "2026-27"
OUT_DIR = PROJECT_DIR / "data" / "seasons" / SEASON
MANIFEST = PROJECT_DIR / "data" / "manifest.json"
SECOND_PASS_REPORT = RAW_DIR / "second_pass.txt"
INCOMPLETE_REPORT = RAW_DIR / "incomplete.txt"
PROFILES_DIR = AF_DIR / "profiles"
MANUAL_LINKS = PROJECT_DIR / "data" / "manual_links.csv"
MANUAL_TM = PROJECT_DIR / "data" / "manual_tm.csv"
FAME_CSV = PROJECT_DIR / "data" / "fame.csv"
LEVELS = {"usor": "easy", "ușor": "easy", "mediu": "medium", "greu": "hard", "exclus": None}
AF_PHOTO = "https://media.api-sports.io/football/players/{}.png"

LEAGUES = {
    "PL": ("premier-league", "Premier League"),
    "PD": ("la-liga", "La Liga"),
    "BL1": ("bundesliga", "Bundesliga"),
    "SA": ("serie-a", "Serie A"),
    "FL1": ("ligue-1", "Ligue 1"),
}
STARS, REGULARS = 40, 180  # value rank within the league: 1-40 tier 1, 41-180 tier 2, the rest tier 3
KNOWN_VALUE = 1_000_000  # Bogdan's line: a player still without photo or number is left out below this value

AF_POSITIONS = {"Goalkeeper": "Goalkeeper", "Defender": "Defender", "Midfielder": "Midfielder", "Attacker": "Forward"}
FD_POSITIONS = [  # football-data.org mixes 4 groups with detailed positions
    ("goalkeeper", "Goalkeeper"),
    ("back", "Defender"),
    ("defen", "Defender"),
    ("midfield", "Midfielder"),
    ("wing", "Forward"),
    ("forward", "Forward"),
    ("striker", "Forward"),
    ("offence", "Forward"),
]
SPECIAL_LETTERS = str.maketrans({"ø": "o", "æ": "ae", "œ": "oe", "ß": "ss", "ł": "l", "đ": "d", "ð": "d", "ı": "i"})


def normalize(name: str) -> str:
    name = name.lower().translate(SPECIAL_LETTERS)
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return " ".join(name.replace("-", " ").replace(".", " ").replace("'", "").split())


def age_on(birth: str | None, today: date) -> int | None:
    if not birth:
        return None
    born = date.fromisoformat(birth[:10])
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def best_age(fd_age: int | None, af_age: int | None) -> int | None:
    """football-data.org has a few wrong birth dates (a 21-year-old listed at 48), so a big gap trusts API-Football."""
    if fd_age is None or (af_age is not None and abs(fd_age - af_age) > 3):
        return af_age
    return fd_age


def position(fd_position: str | None, af_position: str | None) -> str | None:
    if af_position in AF_POSITIONS:
        return AF_POSITIONS[af_position]
    text = (fd_position or "").lower()
    return next((group for key, group in FD_POSITIONS if key in text), None)


def same_person(fd_name: str, af_name: str) -> bool:
    """API-Football often shortens first names ("H. Davies"); football-data.org does not."""
    fd_tokens = normalize(fd_name).split()
    af_tokens = normalize(html.unescape(af_name)).split()  # the API sends "O&apos;Reilly"
    initials = [t for t in af_tokens if len(t) == 1]
    af_words = [t for t in af_tokens if len(t) > 1]
    if af_words and all(w in fd_tokens for w in af_words):
        return not initials or fd_tokens[0].startswith(initials[0])
    fd_words = [t for t in fd_tokens if len(t) > 1]
    return bool(fd_words) and all(w in af_tokens for w in fd_words)


def match_players(fd_squad: list[dict], af_players: list[dict], today: date) -> dict[int, dict]:
    """football-data.org player ID -> API-Football player, for one club. Unclear cases stay unmatched."""
    matches, claimed = {}, defaultdict(list)
    for af in af_players:
        found = [p for p in fd_squad if same_person(p["name"], af["name"])]
        if len(found) > 1 and af.get("age"):
            found = [p for p in found if abs((age_on(p.get("dateOfBirth"), today) or 0) - af["age"]) <= 1]
        if len(found) == 1:
            claimed[found[0]["id"]].append(af)
    for fd_id, afs in claimed.items():
        if len(afs) == 1:  # two API-Football players on one name: neither is certain
            matches[fd_id] = afs[0]
    return matches


def same_surname(fd_name: str, af_name: str) -> bool:
    """Like same_person without the initial: nicknames break it ("Femi Azeez" is "O. Azeez")."""
    af_words = [t for t in normalize(html.unescape(af_name)).split() if len(t) > 1]
    return bool(af_words) and all(w in normalize(fd_name).split() for w in af_words)


def match_leftovers(
    fd_squad: list[dict], af_players: list[dict], matched: dict, by_birth: dict, today: date
) -> dict[int, tuple[dict, str]]:
    """Second pass for one club: football-data.org ID -> (API-Football player, "transfermarkt" or "surname").

    Only players left on both sides by match_players. The weaker name evidence is why the age is required
    here, and why a pair counts only if neither side has another candidate.
    """
    taken = {af["id"] for af in matched.values()}
    left_af = [af for af in af_players if af["id"] not in taken]
    candidates = {}
    for p in fd_squad:
        if p["id"] in matched:
            continue
        age = age_on(p.get("dateOfBirth"), today)
        tm = tm_player(p, by_birth)
        found = []
        for af in left_af:
            if age is None or af.get("age") is None or abs(age - af["age"]) > 1:
                continue
            # Transfermarkt usually has the name in use ("Tino Livramento"), found by the exact birth date
            if tm and same_person(tm["name"], af["name"]):
                found.append((af, "transfermarkt"))
            elif same_surname(p["name"], af["name"]):
                found.append((af, "surname"))
        candidates[p["id"]] = found
    wanted = Counter(af["id"] for found in candidates.values() for af, _ in found)
    return {
        fd_id: found[0] for fd_id, found in candidates.items() if len(found) == 1 and wanted[found[0][0]["id"]] == 1
    }


def search_term(name: str) -> str | None:
    """The last run of at least 4 plain letters, usually the surname: what the API-Football search accepts.

    The API ignores accents ("jaros" finds Jaroš) but not letters like ø, so the term stops at them ("jlund").
    """
    plain = "".join(c for c in unicodedata.normalize("NFKD", name) if not unicodedata.combining(c))
    runs = [r for r in re.findall(r"[A-Za-z0-9]+", plain) if len(r) >= 4]
    return runs[-1].lower() if runs else None


def load_profiles() -> dict[int, list[dict]]:
    """football-data.org ID -> the players API-Football found for his search term (<id>.json, then <id>_p2.json...)."""
    found = {}
    for path in PROFILES_DIR.glob("*.json"):
        fd_id = path.stem.split("_p")[0]
        if fd_id.isdigit():
            response = json.loads(path.read_text(encoding="utf-8"))["response"]
            found.setdefault(int(fd_id), []).extend(item["player"] for item in response)
    return found


def left_out(missing: list[str], value: int | None) -> bool:
    """Unknown players without photo or number leave the game; known ones stay and get fixed."""
    return bool(missing) and (value or 0) < KNOWN_VALUE


def match_profiles(
    fd_squad: list[dict], matched: dict, profiles: dict, af_players: list[dict], af_club_of: dict, club_id: int
) -> dict[int, tuple[dict, str]]:
    """Third pass for one club, from the saved searches: the exact birth date and the name rule of the first pass.

    The full name rule, not just the surname, because twins share both (Oscar and Emil Højlund).
    A player listed in another club's squad keeps only the photo, because his number there is not his number here.
    """
    taken = {af["id"] for af in matched.values()}
    in_squad = {af["id"]: af for af in af_players}
    links = {}
    for p in fd_squad:
        born = (p.get("dateOfBirth") or "")[:10]
        if p["id"] in matched or not born:
            continue
        found = []
        for pr in profiles.get(p["id"], []):
            full_name = " ".join(filter(None, (pr.get("firstname"), pr.get("lastname"))))
            same_name = any(same_person(p["name"], n) for n in (pr.get("name"), full_name) if n)
            if (pr.get("birth") or {}).get("date") == born and same_name:
                found.append(pr)
        if len(found) != 1 or found[0]["id"] in taken:
            continue
        pr = found[0]
        if pr["id"] in in_squad:
            links[p["id"]] = (in_squad[pr["id"]], "birth date")
        elif af_club_of.get(pr["id"], club_id) != club_id:
            links[p["id"]] = ({k: pr.get(k) for k in ("id", "name", "age", "photo")}, "birth date, other club")
        else:
            links[p["id"]] = ({k: pr.get(k) for k in ("id", "name", "age", "number", "photo")}, "birth date")
    used = Counter(af["id"] for af, _ in links.values())
    return {fd_id: link for fd_id, link in links.items() if used[link[0]["id"]] == 1}


def load_manual_links() -> dict[int, dict]:
    """football-data.org ID -> {api_football_id, number}, from the CSV filled by hand (Excel, ";")."""
    if not MANUAL_LINKS.exists():
        return {}
    with MANUAL_LINKS.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f, delimiter=";"))
    links = {}
    for line, row in enumerate(rows, 2):
        af_id, number = (row.get(k, "").strip() for k in ("api_football_id", "number"))
        if not row["fd_id"].strip().isdigit() or (af_id and not af_id.isdigit()) or (number and not number.isdigit()):
            raise ValueError(f"{MANUAL_LINKS.name}, line {line}: IDs and numbers must be whole numbers")
        if number and not 1 <= int(number) <= 99:
            raise ValueError(f"{MANUAL_LINKS.name}, line {line}: the number must be 1-99")
        links[int(row["fd_id"])] = {
            "api_football_id": int(af_id) if af_id else None,
            "number": int(number) if number else None,
        }
    return links


def load_manual_tm() -> dict[int, str]:
    """football-data.org ID -> Transfermarkt ID, for players whose birth date differs between the two sources."""
    if not MANUAL_TM.exists():
        return {}
    with MANUAL_TM.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f, delimiter=";"))
    for line, row in enumerate(rows, 2):
        if not (row["fd_id"].strip().isdigit() and row["tm_id"].strip().isdigit()):
            raise ValueError(f"{MANUAL_TM.name}, line {line}: both IDs must be whole numbers")
    return {int(row["fd_id"]): row["tm_id"].strip() for row in rows}


def level_of(row: dict) -> str | None:
    """Bogdan's correction, else the suggestion. None: the player is never hidden."""
    word = (row.get("correction") or "").strip().lower() or row["suggestion"]
    if word not in LEVELS:
        raise ValueError(f"{FAME_CSV.name}, {row['name']}: '{word}' is not one of {', '.join(LEVELS)}")
    return LEVELS[word]


def load_fame() -> dict[int, dict]:
    if not FAME_CSV.exists():
        return {}
    with FAME_CSV.open(encoding="utf-8-sig", newline="") as f:
        return {int(r["fd_id"]): r for r in csv.DictReader(f, delimiter=";")}


def assign_levels(players: list[dict], fame: dict[int, dict]) -> list[str]:
    """Sets p["level"]; a player missing from data/fame.csv is new and unknown, so Hard until build_fame.py runs.

    Without a number or an age a player cannot be hidden (pickTarget in engine.js), so he gets no level.
    """
    new = []
    for p in players:
        row = fame.get(p["id"])
        if p["number"] is None or p["age"] is None:
            p["level"] = None
        elif row:
            p["level"] = level_of(row)
        else:
            p["level"] = "hard"
            new.append(p["name"])
    return new


def manual_entry(row: dict, af: dict, af_players: list[dict]) -> dict:
    """The hand-filled row wins; an empty cell keeps what the matching found."""
    entry = dict(af)
    if row["api_football_id"]:
        in_squad = next((a for a in af_players if a["id"] == row["api_football_id"]), None)
        entry = dict(in_squad) if in_squad else {"id": row["api_football_id"]}
        entry.setdefault("photo", AF_PHOTO.format(row["api_football_id"]))
    if row["number"]:
        entry["number"] = row["number"]
    return entry


def assign_tiers(values: dict[str, int | None]) -> dict[str, int]:
    """Player key -> tier, by market value rank. No known value: tier 3."""
    ranked = sorted((v, k) for k, v in values.items() if v)
    ranked.reverse()
    tiers = {k: 3 for k in values}
    for rank, (_, key) in enumerate(ranked, 1):
        tiers[key] = 1 if rank <= STARS else 2 if rank <= REGULARS else 3
    return tiers


def unique_names(players: list[dict]) -> None:
    """The game finds players by name, so equal names in one league get their club added."""
    counts = defaultdict(int)
    for p in players:
        counts[normalize(p["name"])] += 1
    for p in players:
        if counts[normalize(p["name"])] > 1:
            p["name"] = f"{p['name']} ({p['team']})"


def tm_rows(name: str):
    with gzip.open(TM_DIR / f"{name}.csv.gz", "rt", encoding="utf-8", newline="") as f:
        yield from csv.DictReader(f)


def load_market_values(today: date) -> tuple[dict, dict, dict]:
    """(date of birth -> Transfermarkt players born that day, Transfermarkt ID -> player, Transfermarkt ID -> latest value)."""
    by_birth, by_id = defaultdict(list), {}
    for row in tm_rows("players"):
        by_id[row["player_id"]] = row
        if row["date_of_birth"]:
            by_birth[row["date_of_birth"][:10]].append(row)
    latest = {}
    for row in tm_rows("player_valuations"):
        if row["date"] <= today.isoformat() and row["date"] >= latest.get(row["player_id"], ("",))[0]:
            latest[row["player_id"]] = (row["date"], int(row["market_value_in_eur"]))
    return by_birth, by_id, {k: v for k, (_, v) in latest.items()}


def tm_player(player: dict, by_birth: dict, by_id: dict | None = None, manual: dict | None = None) -> dict | None:
    """Same birth date and the same name, or one name word in common if only one player fits."""
    if manual and player.get("id") in manual:
        return (by_id or {}).get(manual[player["id"]])
    born = (player.get("dateOfBirth") or "")[:10]
    wanted = normalize(player["name"])
    same_day = by_birth.get(born, [])
    found = [r for r in same_day if normalize(r["name"]) == wanted]
    if not found:
        words = set(wanted.split())
        found = [r for r in same_day if words & set(normalize(r["name"]).split())]
    return found[0] if len(found) == 1 else None


def market_value(player: dict, by_birth: dict, values: dict, by_id: dict | None = None, manual: dict | None = None) -> int | None:
    tm = tm_player(player, by_birth, by_id, manual)
    return values.get(tm["player_id"]) if tm else None


def player_entry(fd: dict, af: dict, team: str, today: date) -> dict:
    """The football-data.org ID is kept because it never changes: shared links and saved rounds point to it."""
    return {
        "id": fd["id"],
        "name": fd["name"],
        "team": team,
        "position": position(fd.get("position"), af.get("position")),
        "age": best_age(age_on(fd.get("dateOfBirth"), today), af.get("age")),
        "number": af.get("number"),
        "nationality": fd.get("nationality"),
        "photo": af.get("photo"),
    }


def squad_players(af_team_id: int) -> list[dict]:
    squad_file = AF_DIR / f"squad_{af_team_id}.json"
    if not squad_file.exists():
        return []
    response = json.loads(squad_file.read_text(encoding="utf-8"))["response"]
    return response[0]["players"] if response else []


def build_league(code: str, today: date, team_map: dict, sources: dict) -> tuple[dict, list[dict], list[dict]]:
    """(the league file, the links found after the first pass, the players still without photo or number).

    sources: by_birth and values (Transfermarkt), profiles, af_club_of (API-Football player ID -> club ID), manual.
    """
    league_id, league_name = LEAGUES[code]
    fd = json.loads((RAW_DIR / f"{code}_{SEASON}.json").read_text(encoding="utf-8"))
    teams, players, worth, extra_links, incomplete = {}, [], {}, [], []
    for team in fd["teams"]:
        af_team = team_map[str(team["id"])]
        af_players = squad_players(af_team["id"])
        matched = match_players(team["squad"], af_players, today)
        extra = match_leftovers(team["squad"], af_players, matched, sources["by_birth"], today)
        matched |= {fd_id: af for fd_id, (af, _) in extra.items()}
        found = match_profiles(
            team["squad"], matched, sources["profiles"], af_players, sources["af_club_of"], af_team["id"]
        )
        extra |= found
        matched |= {fd_id: af for fd_id, (af, _) in found.items()}
        teams[af_team["name"]] = af_team["logo"]
        for p in team["squad"]:
            af = matched.get(p["id"], {})
            if p["id"] in sources["manual"]:
                af = manual_entry(sources["manual"][p["id"]], af, af_players)
                extra[p["id"]] = (af, "manual")
            entry = player_entry(p, af, af_team["name"], today)
            players.append(entry)
            worth[len(players) - 1] = market_value(p, sources["by_birth"], sources["values"], sources["by_id"], sources["manual_tm"])
            if p["id"] in extra:
                link, method = extra[p["id"]]
                extra_links.append(
                    {"league": league_name, "club": af_team["name"], "method": method, "fd": p, "af": link}
                )
            missing = [k for k in ("photo", "number") if entry[k] is None]
            if missing:
                value = worth[len(players) - 1]
                incomplete.append(
                    {"league": code, "club": af_team["name"], "fd": p, "missing": missing, "value": value}
                )
    tiers = assign_tiers(worth)
    for index, p in enumerate(players):
        p["tier"] = tiers[index]
    tier_of = {p["id"]: p["tier"] for p in players}
    for row in incomplete:
        row["tier"] = tier_of[row["fd"]["id"]]
        row["in_game"] = not left_out(row["missing"], row["value"])
    dropped = {row["fd"]["id"] for row in incomplete if not row["in_game"]}
    players = [p for p in players if p["id"] not in dropped]
    sources["new"] += assign_levels(players, sources["fame"])
    unique_names(players)
    league = {"id": league_id, "name": league_name, "season": SEASON, "teams": teams, "players": players}
    return league, extra_links, incomplete


def write_second_pass(pairs: list[dict], today: date) -> None:
    """Tab-separated, so it also opens as a table in Excel."""
    lines = ["league\tclub\tmethod\tfootball-data\tage\tAPI-Football\tage\tnumber"]
    for pair in pairs:
        fd, af = pair["fd"], pair["af"]
        lines.append(
            f"{pair['league']}\t{pair['club']}\t{pair['method']}\t{fd['name']}\t{age_on(fd.get('dateOfBirth'), today)}"
            f"\t{html.unescape(af.get('name') or '')}\t{af.get('age') or ''}\t{af.get('number') or ''}"
        )
    SECOND_PASS_REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_incomplete(rows: list[dict]) -> None:
    """Who is still missing a photo or a number, most valuable first.

    download_api_football.py --profiles searches the "search" column, filled only for players kept in the game.
    """
    lines = ["league\tclub\tfd_id\tname\tborn\tvalue_m\ttier\tmissing\tin_game\tpages_searched\tsearch"]
    for row in sorted(rows, key=lambda r: -(r["value"] or 0)):
        fd = row["fd"]
        pages = len(list(PROFILES_DIR.glob(f"{fd['id']}.json")) + list(PROFILES_DIR.glob(f"{fd['id']}_p*.json")))
        term = search_term(fd["name"]) if row["in_game"] and "photo" in row["missing"] else None
        lines.append(
            f"{row['league']}\t{row['club']}\t{fd['id']}\t{fd['name']}\t{(fd.get('dateOfBirth') or '')[:10]}"
            f"\t{(row['value'] or 0) / 1e6:g}\t{row['tier']}\t{' + '.join(row['missing'])}"
            f"\t{'yes' if row['in_game'] else 'no'}\t{pages or ''}\t{term or ''}"
        )
    INCOMPLETE_REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def update_manifest() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if SEASON not in manifest["seasons"]:
        manifest["seasons"].append(SEASON)
    manifest["defaultSeason"] = SEASON
    for league in manifest["leagues"]:
        if SEASON not in league["seasons"]:
            league["seasons"].append(SEASON)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    today = date.today()
    team_map = json.loads((AF_DIR / "team_map.json").read_text(encoding="utf-8"))
    by_birth, by_id, values = load_market_values(today)
    af_club_of = {af["id"]: team["id"] for team in team_map.values() for af in squad_players(team["id"])}
    sources = {
        "by_birth": by_birth,
        "values": values,
        "profiles": load_profiles(),
        "af_club_of": af_club_of,
        "manual": load_manual_links(),
        "by_id": by_id,
        "manual_tm": load_manual_tm(),
        "fame": load_fame(),
        "new": [],
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    all_pairs, all_incomplete = [], []
    for code in LEAGUES:
        data, pairs, incomplete = build_league(code, today, team_map, sources)
        all_pairs += pairs
        all_incomplete += incomplete
        path = OUT_DIR / f"{data['id']}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        players = data["players"]
        complete = sum(p["photo"] is not None and p["number"] is not None for p in players)
        tiers = [sum(p["tier"] == t for p in players) for t in (1, 2, 3)]
        levels = [sum(p["level"] == v for p in players) for v in ("easy", "medium", "hard", None)]
        print(
            f"{data['name']:<15} {len(players):>4} players, {complete:>4} with photo + number "
            f"({100 * complete / len(players):.0f}%), tiers 1/2/3: {tiers}, easy/medium/hard/never: {levels}"
        )
    if sources["new"]:
        print(f"\nNot in {FAME_CSV.name}, Hard for now (run build_fame.py): {len(sources['new'])} players")
    print(f"\nLinked after the first pass (list in {SECOND_PASS_REPORT.relative_to(PROJECT_DIR)}):")
    for _, name in LEAGUES.values():
        methods = Counter(p["method"] for p in all_pairs if p["league"] == name)
        print(
            f"{name:<15} {methods.total():>3}: {methods['transfermarkt']} Transfermarkt name, "
            f"{methods['surname']} surname, {methods['birth date']} birth date, "
            f"{methods['birth date, other club']} birth date at another club (photo only), {methods['manual']} manual"
        )
    unknown = set(sources["manual"]) - {p["fd"]["id"] for p in all_pairs if p["method"] == "manual"}
    if unknown:
        print(f"Not in any 2026-27 squad, check {MANUAL_LINKS.name}: {sorted(unknown)}")
    write_second_pass(all_pairs, today)
    write_incomplete(all_incomplete)
    kept = [r for r in all_incomplete if r["in_game"]]
    print(
        f"\nWithout photo or number: {len(all_incomplete)}; left out of the game (under "
        f"{KNOWN_VALUE / 1e6:g}M euros): {len(all_incomplete) - len(kept)}; kept, still to fix: {len(kept)}"
        f" (list in {INCOMPLETE_REPORT.relative_to(PROJECT_DIR)})"
    )
    update_manifest()
    print(f"\nWritten to {OUT_DIR}; manifest default season: {SEASON}")


if __name__ == "__main__":
    main()
