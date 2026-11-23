"""Builds data/seasons/2026-27/clues/<league>.json: the facts behind the opening clue of a round.

Every fact is stored as a type plus values, never as a sentence: the game writes the sentence in the
player's language. The game decides which facts suit which difficulty (see `engine.js`).

Sources: the 2026-27 and 2025-26 squads (football-data.org) and the transfermarkt-datasets tables
(players, transfers, appearances), which stop on 28 June 2026.

Run from the project folder (after build_season.py), as a module because it reuses build_season.py:
    .venv\\Scripts\\python.exe -m scripts.build_clues
"""

import json
from collections import defaultdict
from datetime import date
from itertools import pairwise

from scripts.build_season import LEAGUES, PROJECT_DIR, RAW_DIR, tm_player, tm_rows

SEASON, LAST_SEASON = "2026-27", "2025-26"
OUT_DIR = PROJECT_DIR / "data" / "seasons" / SEASON / "clues"
MANIFEST = PROJECT_DIR / "data" / "manifest.json"
LAST_SEASON_DAYS = ("2025-07-01", "2026-06-30")
DATA_END = "2026-07-06"  # later rows in the transfers table are planned loan returns, not moves
SUMMER_2026 = "2026-05-01"  # a move into a 2026-27 squad is in the data only if it is this recent
MIN_GAMES = 5  # fewer games say little about a season
FEE_BANDS = [0, 5, 10, 20, 40, 70, 100]  # millions of euros; a band, because an exact fee names the player
POSITIONS = {  # Transfermarkt detail -> key in i18n.js; goalkeepers are left out, the tile already says it
    "Centre-Back": "centreBack", "Left-Back": "leftBack", "Right-Back": "rightBack",
    "Defensive Midfield": "defensiveMidfield", "Central Midfield": "centralMidfield",
    "Attacking Midfield": "attackingMidfield", "Left Midfield": "leftMidfield", "Right Midfield": "rightMidfield",
    "Left Winger": "leftWinger", "Right Winger": "rightWinger", "Centre-Forward": "centreForward",
    "Second Striker": "secondStriker",
}
LEAGUE_NAMES = {  # Transfermarkt competition -> name shown in every language (league names are not translated)
    "GB1": "Premier League", "ES1": "LaLiga", "L1": "Bundesliga", "IT1": "Serie A", "FR1": "Ligue 1",
    "NL1": "Eredivisie", "PO1": "Liga Portugal", "BE1": "Jupiler Pro League", "TR1": "Süper Lig",
    "SC1": "Scottish Premiership", "A1": "Austrian Bundesliga", "C1": "Swiss Super League", "DK1": "Danish Superliga",
    "GR1": "Greek Super League", "RU1": "Russian Premier League", "UKR1": "Ukrainian Premier League",
    "SA1": "Saudi Pro League", "MLS1": "MLS", "BRA1": "Brasileirão", "ARG1": "Liga Profesional Argentina",
    "MEX1": "Liga MX", "JAP1": "J1 League", "RSK1": "K League 1", "AUS1": "A-League", "NO1": "Eliteserien",
    "SE1": "Allsvenskan", "PL1": "Ekstraklasa", "TS1": "Czech First League", "SER1": "Serbian SuperLiga",
    "KR1": "HNL", "RO1": "SuperLiga",
}
COUNTRIES = {  # Transfermarkt birth country -> ISO code (the browser translates it); UK nations have their own keys
    "England": "GB-ENG", "Scotland": "GB-SCT", "Wales": "GB-WLS", "Northern Ireland": "GB-NIR",
    "France": "FR", "Spain": "ES", "Germany": "DE", "Italy": "IT", "Portugal": "PT", "Netherlands": "NL",
    "Belgium": "BE", "Switzerland": "CH", "Austria": "AT", "Sweden": "SE", "Norway": "NO", "Denmark": "DK",
    "Ireland": "IE", "Poland": "PL", "Czech Republic": "CZ", "Croatia": "HR", "Serbia": "RS", "Bosnia-Herzegovina": "BA",
    "Slovenia": "SI", "Slovakia": "SK", "Hungary": "HU", "Romania": "RO", "Greece": "GR", "Türkiye": "TR",
    "Ukraine": "UA", "Russia": "RU", "Georgia": "GE", "Albania": "AL", "Kosovo": "XK", "North Macedonia": "MK",
    "Montenegro": "ME", "Finland": "FI", "Iceland": "IS", "Luxembourg": "LU", "Brazil": "BR", "Argentina": "AR",
    "Uruguay": "UY", "Colombia": "CO", "Ecuador": "EC", "Venezuela": "VE", "Chile": "CL", "Paraguay": "PY", "Peru": "PE",
    "Mexico": "MX", "United States": "US", "Canada": "CA", "Jamaica": "JM", "Morocco": "MA", "Algeria": "DZ",
    "Tunisia": "TN", "Egypt": "EG", "Senegal": "SN", "Mali": "ML", "Cote d'Ivoire": "CI", "Ghana": "GH",
    "Nigeria": "NG", "Cameroon": "CM", "Guinea": "GN", "DR Congo": "CD", "Congo": "CG", "Gabon": "GA",
    "Burkina Faso": "BF", "Angola": "AO", "Cape Verde": "CV", "Guinea-Bissau": "GW", "Gambia": "GM",
    "Sierra Leone": "SL", "Togo": "TG", "Benin": "BJ", "Zambia": "ZM", "Zimbabwe": "ZW", "South Africa": "ZA",
    "Japan": "JP", "Korea, South": "KR", "Australia": "AU", "New Zealand": "NZ", "Iran": "IR", "Israel": "IL",
    "Central African Republic": "CF", "Equatorial Guinea": "GQ", "Mozambique": "MZ", "Madagascar": "MG",
    "Comoros": "KM", "Mauritania": "MR", "Libya": "LY", "Haiti": "HT", "Dominican Republic": "DO", "Cuba": "CU",
    "Curacao": "CW", "Suriname": "SR", "Martinique": "MQ", "Guadeloupe": "GP", "French Guiana": "GF",
    "Reunion": "RE", "Armenia": "AM", "Azerbaijan": "AZ", "Belarus": "BY", "Bulgaria": "BG", "Moldova": "MD",
    "Lithuania": "LT", "Latvia": "LV", "Estonia": "EE", "Cyprus": "CY", "Kazakhstan": "KZ", "Uzbekistan": "UZ",
    "China": "CN", "Philippines": "PH", "Indonesia": "ID", "Thailand": "TH", "Vietnam": "VN", "Malaysia": "MY",
    "Kenya": "KE", "Uganda": "UG", "Tanzania": "TZ", "Ethiopia": "ET", "Sudan": "SD", "Burundi": "BI", "Rwanda": "RW",
    "Liberia": "LR", "Niger": "NE", "Chad": "TD", "Costa Rica": "CR", "Honduras": "HN", "Panama": "PA",
    "Guatemala": "GT", "El Salvador": "SV", "Bolivia": "BO", "Trinidad and Tobago": "TT", "Grenada": "GD",
    "Saudi Arabia": "SA", "Qatar": "QA", "Iraq": "IQ", "Syria": "SY", "Lebanon": "LB", "Jordan": "JO",
}


def fee_band(euros: float) -> list:
    """[lower, upper] in millions; upper is None for the top band."""
    millions = euros / 1_000_000
    for low, high in pairwise(FEE_BANDS):
        if millions < high:
            return [low, high]
    return [FEE_BANDS[-1], None]


def window(day: str) -> dict:
    """Transfer windows: summer (June-September) and winter (December-February, named after its January)."""
    year, month = int(day[:4]), int(day[5:7])
    if 6 <= month <= 9:
        return {"window": "summer", "year": year}
    if month == 12:
        return {"window": "winter", "year": year + 1}
    if month <= 2:
        return {"window": "winter", "year": year}
    return {"window": "year", "year": year}


def money(value: str) -> float:
    try:
        return float(value or 0)
    except ValueError:
        return 0.0


def league_before(history: list[tuple], club_id: str, day: str) -> str | None:
    """The league a club played in during the year before a day, from the player's own games.

    A club's league today can differ from the one it played in when the transfer happened.
    """
    year_before = f"{int(day[:4]) - 1}{day[4:]}"
    games = [(d, comp) for d, club, comp in history if club == club_id and year_before <= d < day]
    return max(games)[1] if games else None


def transfer_fact(transfers: list[dict], moved: bool, history: list[tuple]) -> dict | None:
    """How the player joined his current club, if he was paid for.

    The paid move counts while the latest row still ends at the same club, so a loan away and back
    (Pedri: bought in 2019, loaned out, back in 2020) keeps it. A player who changed clubs for 2026-27
    must have that move in the data (from May 2026 on); otherwise the latest row we have is an older one.
    """
    known = sorted((t for t in transfers if t["transfer_date"] <= DATA_END), key=lambda t: t["transfer_date"])
    if not known or (moved and known[-1]["transfer_date"] < SUMMER_2026):
        return None
    paid = [t for t in known if money(t["transfer_fee"]) > 0]  # free moves and loans have no fee to tell
    if not paid or paid[-1]["to_club_id"] != known[-1]["to_club_id"]:
        return None
    move = paid[-1]
    fact = {"type": "transfer", **window(move["transfer_date"]), "fee": fee_band(money(move["transfer_fee"]))}
    league = LEAGUE_NAMES.get(league_before(history, move["from_club_id"], move["transfer_date"]) or "")
    if league:
        fact["league"] = league
    return fact


def season_fact(stats: dict | None) -> dict | None:
    if not stats or stats["games"] < MIN_GAMES:
        return None
    return {"type": "season", "season": LAST_SEASON, **stats}


def position_fact(tm: dict) -> dict | None:
    key = POSITIONS.get(tm["sub_position"])
    return {"type": "position", "detail": key} if key else None


def caps_fact(tm: dict) -> dict | None:
    caps = int(money(tm["international_caps"]))
    return {"type": "caps", "caps": caps} if caps > 0 else None


def peak_fact(tm: dict) -> dict | None:
    peak = money(tm["highest_market_value_in_eur"])
    return {"type": "peak", "value": fee_band(peak)} if peak > 0 else None


def contract_fact(tm: dict, up_to_date: bool, today: date) -> dict | None:
    """A contract from before a summer move belongs to the old club."""
    until = tm["contract_expiration_date"][:4]
    if not up_to_date or not until.isdigit() or int(until) < today.year:
        return None
    return {"type": "contract", "until": int(until)}


def body_fact(tm: dict) -> dict | None:
    """The fallback for every difficulty: almost everyone has it, and it never repeats a tile."""
    foot = tm["foot"] if tm["foot"] in ("left", "right", "both") else None
    height = int(money(tm["height_in_cm"])) or None
    if not foot and not height:
        return None
    return {"type": "body", "foot": foot, "height": height}


def born_fact(tm: dict, nationality: str | None) -> dict | None:
    """Only for players born outside the country they play for, or the clue would give the nationality away."""
    country = tm["country_of_birth"].strip()
    if not country or country in (nationality, tm["country_of_citizenship"].strip()):
        return None
    code = COUNTRIES.get(country)
    return {"type": "born", "country": code} if code else None


def player_facts(fd: dict, tm: dict | None, transfers, stats, moved: bool, history: list, today: date) -> list:
    if tm is None:
        return []
    up_to_date = not moved or any(t["transfer_date"] >= SUMMER_2026 for t in transfers if t["transfer_date"] <= DATA_END)
    candidates = [
        transfer_fact(transfers, moved, history),
        season_fact(stats),
        position_fact(tm),
        caps_fact(tm),
        peak_fact(tm),
        contract_fact(tm, up_to_date, today),
        body_fact(tm),
        born_fact(tm, fd.get("nationality")),
    ]
    return [fact for fact in candidates if fact]


def load_sources() -> dict:
    by_birth = defaultdict(list)
    for row in tm_rows("players"):
        if row["date_of_birth"]:
            by_birth[row["date_of_birth"][:10]].append(row)
    squads = {code: json.loads((RAW_DIR / f"{code}_{SEASON}.json").read_text(encoding="utf-8")) for code in LEAGUES}
    tm_ids = {}  # football-data.org player -> Transfermarkt player
    for fd in squads.values():
        for team in fd["teams"]:
            for p in team["squad"]:
                tm = tm_player(p, by_birth)
                if tm:
                    tm_ids[p["id"]] = tm
    wanted = {tm["player_id"] for tm in tm_ids.values()}
    transfers = defaultdict(list)
    for row in tm_rows("transfers"):
        if row["player_id"] in wanted:
            transfers[row["player_id"]].append(row)
    stats = defaultdict(lambda: {"games": 0, "goals": 0, "assists": 0})
    history = defaultdict(list)  # Transfermarkt player -> (day, club, league) of every league game
    first, last = LAST_SEASON_DAYS
    for row in tm_rows("appearances"):
        pid = row["player_id"]
        if pid not in wanted:
            continue
        if row["competition_id"] in LEAGUE_NAMES:
            history[pid].append((row["date"], row["player_club_id"], row["competition_id"]))
        if first <= row["date"] <= last:
            s = stats[pid]
            s["games"] += 1
            s["goals"] += int(row["goals"] or 0)
            s["assists"] += int(row["assists"] or 0)
    last_clubs = {}  # football-data.org player -> club at the end of 2025-26
    for code in LEAGUES:
        for team in json.loads((RAW_DIR / f"{code}_{LAST_SEASON}.json").read_text(encoding="utf-8"))["teams"]:
            for p in team["squad"]:
                last_clubs[p["id"]] = team["id"]
    return {"squads": squads, "tm_ids": tm_ids, "transfers": transfers, "stats": stats, "history": history, "last_clubs": last_clubs}


def build_league(code: str, sources: dict, today: date) -> dict:
    players = {}
    for team in sources["squads"][code]["teams"]:
        for p in team["squad"]:
            tm = sources["tm_ids"].get(p["id"])
            tm_id = tm["player_id"] if tm else None
            moved = sources["last_clubs"].get(p["id"]) != team["id"]
            facts = player_facts(
                p, tm, sources["transfers"].get(tm_id, []), sources["stats"].get(tm_id), moved,
                sources["history"].get(tm_id, []), today,
            )
            if facts:
                players[str(p["id"])] = facts
    return {"season": SEASON, "source": "transfermarkt-datasets (CC0), data until 28 June 2026", "players": players}


def update_manifest() -> None:
    """The game asks only for clue files that exist; older seasons have none."""
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest["clueSeasons"] = sorted(set(manifest.get("clueSeasons", [])) | {SEASON})
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    today = date.today()
    sources = load_sources()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for code, (slug, name) in LEAGUES.items():
        data = build_league(code, sources, today)
        path = OUT_DIR / f"{slug}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        kinds = defaultdict(int)
        for facts in data["players"].values():
            for fact in facts:
                kinds[fact["type"]] += 1
        print(f"{name:<15} {len(data['players']):>4} players with facts; " + ", ".join(f"{k} {v}" for k, v in sorted(kinds.items())))
    update_manifest()
    print(f"Written to {OUT_DIR}; manifest clue seasons updated")


if __name__ == "__main__":
    main()
