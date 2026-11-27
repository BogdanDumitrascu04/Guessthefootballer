"""Writes data/fame.csv: how well known each player is, which decides who can be hidden on Easy, Medium and Hard.

The score mixes public data: views of the English Wikipedia article in the last 60 days (Wikimedia, CC0),
the number of Wikipedia languages (Wikidata, CC0), and from the Transfermarkt set the highest market value,
international caps and Champions League games. Each league gets its own cut, because an equal score is not an
equal fame everywhere (English Wikipedia favours the Premier League).

The "correction" column is Bogdan's and always wins; it is kept, like the Wikidata ID, at every run.
Views and languages already in the file are reused, so a run asks the internet only about new players;
--refresh asks again about everyone (slowly: Wikipedia answers 429 to anything faster).

Run from the project folder, after build_season.py, then build_season.py again to put the levels in the game:
    .venv\\Scripts\\python.exe -m scripts.build_fame [--refresh]
"""

import csv
import json
import math
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

from scripts.build_season import (
    FAME_CSV,
    LEAGUES,
    OUT_DIR,
    RAW_DIR,
    SEASON,
    level_of,
    load_fame,
    load_manual_tm,
    tm_player,
    tm_rows,
)

COLUMNS = ["fd_id", "league", "rank", "name", "team", "suggestion", "correction", "wikidata", "article", "views_60d", "languages"]
# The last rank of Easy and of Medium in each league, chosen with Bogdan on 26 Nov 2026; his corrections move the rest.
CUTS = {"premier-league": (40, 140), "la-liga": (32, 110), "bundesliga": (20, 75), "serie-a": (25, 100), "ligue-1": (18, 70)}
WEIGHTS = {"views": 0.40, "languages": 0.25, "peak": 0.15, "caps": 0.10, "champions_league": 0.10}
USER_AGENT = {"User-Agent": "guess-the-footballer-data/1.0"}


def suggestion(rank: int, league: str, known: bool) -> str:
    # Without a Wikipedia article we cannot tell how known a player is, and he is usually a youth player.
    if not known:
        return "exclus"
    easy, medium = CUTS[league]
    return "usor" if rank <= easy else "mediu" if rank <= medium else "greu"


def scores(players: list[dict]) -> None:
    """Each measure on a log scale, then standardised, so no single one decides alone."""
    measures = {
        "views": lambda p: math.log10(p["views"] + 100),
        "languages": lambda p: math.log10(p["languages"] + 1),
        "peak": lambda p: math.log10(p["peak"] + 1e5),
        "caps": lambda p: math.log10(p["caps"] + 1),
        "champions_league": lambda p: math.log10(p["champions_league"] + 1),
    }
    for key, measure in measures.items():
        values = [measure(p) for p in players]
        mean, spread = statistics.mean(values), statistics.pstdev(values) or 1
        for p, v in zip(players, values):
            p["score"] = p.get("score", 0) + WEIGHTS[key] * (v - mean) / spread


def ask(url: str, data: bytes | None = None, headers: dict | None = None) -> dict:
    for _ in range(6):
        try:
            request = urllib.request.Request(url, data=data, headers={**USER_AGENT, **(headers or {})})
            return json.load(urllib.request.urlopen(request, timeout=90))
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504):
                raise
            wait = max(int(e.headers.get("retry-after") or 0), 60)
            print(f"HTTP {e.code}, waiting {wait} s", flush=True)
            time.sleep(wait)
    raise RuntimeError(f"no answer from {url[:60]}")


def wikidata(tm_ids: list[str], qids: list[str]) -> tuple[dict, dict]:
    """(Transfermarkt ID -> Wikidata ID, Wikidata ID -> {languages, article}), 200 players per query."""
    by_tm, about = {}, {}
    for kind, ids in (("tm", tm_ids), ("item", qids)):
        for i in range(0, len(ids), 200):
            values = " ".join(f'"{x}"' if kind == "tm" else f"wd:{x}" for x in ids[i : i + 200])
            match = f"VALUES ?tm {{ {values} }} ?item wdt:P2446 ?tm ." if kind == "tm" else f"VALUES ?item {{ {values} }}"
            query = f"""SELECT ?tm ?item ?languages ?article WHERE {{ {match} ?item wikibase:sitelinks ?languages .
                OPTIONAL {{ ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }} }}"""
            answer = ask(
                "https://query.wikidata.org/sparql",
                urllib.parse.urlencode({"query": query, "format": "json"}).encode(),
                {"Accept": "application/sparql-results+json"},
            )
            for b in answer["results"]["bindings"]:
                qid = b["item"]["value"].rsplit("/", 1)[-1]
                if "tm" in b:
                    by_tm[b["tm"]["value"]] = qid
                article = b.get("article", {}).get("value", "").split("/wiki/")[-1]
                about[qid] = {"languages": int(b["languages"]["value"]), "article": urllib.parse.unquote(article)}
            time.sleep(2)
    return by_tm, about


def views(articles: list[str]) -> dict[str, int]:
    """English Wikipedia views in the last 60 days, 50 articles per request, with pauses."""
    found, redirects = {}, {}
    for i in range(0, len(articles), 50):
        params = {"action": "query", "prop": "pageviews", "pvipdays": 60, "redirects": 1, "format": "json", "formatversion": 2,
                  "titles": "|".join(a.replace("_", " ") for a in articles[i : i + 50])}
        more = {}
        while True:
            answer = ask("https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({**params, **more}))
            for page in answer.get("query", {}).get("pages", []):
                found[page["title"]] = sum(v or 0 for v in (page.get("pageviews") or {}).values())
            redirects |= {r["from"]: r["to"] for r in answer.get("query", {}).get("redirects", [])}
            if "continue" not in answer:
                break
            more = answer["continue"]
            time.sleep(10)
        time.sleep(10)
    return {a: found.get(redirects.get(a.replace("_", " "), a.replace("_", " ")), 0) for a in articles}


def transfermarkt_facts(fd_players: dict[int, dict]) -> dict[int, dict]:
    """Football-data ID -> highest value, caps, Champions League games, linked like the market value in build_season."""
    by_birth, by_id = defaultdict(list), {}
    for row in tm_rows("players"):
        by_id[row["player_id"]] = row
        if row["date_of_birth"]:
            by_birth[row["date_of_birth"][:10]].append(row)
    manual = load_manual_tm()
    linked = {fd_id: tm_player(p, by_birth, by_id, manual) for fd_id, p in fd_players.items()}
    linked = {k: v for k, v in linked.items() if v}
    champions = defaultdict(int)
    for row in tm_rows("appearances"):
        if row["competition_id"] == "CL":
            champions[row["player_id"]] += 1
    return {
        fd_id: {
            "tm": tm["player_id"],
            "peak": int(float(tm["highest_market_value_in_eur"] or 0)),
            "caps": int(float(tm["international_caps"] or 0)),
            "champions_league": champions[tm["player_id"]],
        }
        for fd_id, tm in linked.items()
    }


def main() -> None:
    refresh = "--refresh" in sys.argv
    old = load_fame()
    fd_players = {}
    for code in LEAGUES:
        for team in json.loads((RAW_DIR / f"{code}_{SEASON}.json").read_text(encoding="utf-8"))["teams"]:
            fd_players |= {p["id"]: p for p in team["squad"]}
    players = []
    for league_id, _ in LEAGUES.values():
        for p in json.loads((OUT_DIR / f"{league_id}.json").read_text(encoding="utf-8"))["players"]:
            if p["number"] is not None and p["age"] is not None:  # the others are never hidden (pickTarget)
                players.append({"id": p["id"], "name": p["name"], "team": p["team"], "league": league_id})
    facts = transfermarkt_facts({p["id"]: fd_players[p["id"]] for p in players})
    for p in players:
        p |= {"tm": None, "peak": 0, "caps": 0, "champions_league": 0} | facts.get(p["id"], {})
        row = old.get(p["id"]) or {}
        p["wikidata"] = row.get("wikidata", "")
        if row and not refresh:
            p |= {"article": row["article"], "views": int(row["views_60d"] or 0), "languages": int(row["languages"] or 0)}

    todo = [p for p in players if "views" not in p]
    if todo:
        print(f"Asking Wikidata and Wikipedia about {len(todo)} players")
        by_tm, _ = wikidata(sorted({p["tm"] for p in todo if p["tm"] and not p["wikidata"]}), [])
        for p in todo:
            p["wikidata"] = p["wikidata"] or by_tm.get(p["tm"], "")
        _, about = wikidata([], sorted({p["wikidata"] for p in todo if p["wikidata"]}))
        for p in todo:
            p |= about.get(p["wikidata"], {"languages": 0, "article": ""})
        seen = views(sorted({p["article"] for p in todo if p["article"]}))
        for p in todo:
            p["views"] = seen.get(p["article"], 0)

    scores(players)
    rows = []
    for league_id, _ in LEAGUES.values():
        ranked = sorted((p for p in players if p["league"] == league_id), key=lambda p: -p["score"])
        for rank, p in enumerate(ranked, 1):
            rows.append({
                "fd_id": p["id"], "league": league_id, "rank": rank, "name": p["name"], "team": p["team"],
                "suggestion": suggestion(rank, league_id, bool(p["article"])),
                "correction": (old.get(p["id"]) or {}).get("correction", ""),
                "wikidata": p["wikidata"], "article": p["article"], "views_60d": p["views"], "languages": p["languages"],
            })
    for row in rows:
        level_of(row)  # a typo in a correction stops the run before the file is written
    with FAME_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, COLUMNS, delimiter=";")
        writer.writeheader()
        writer.writerows(rows)
    for league_id, _ in LEAGUES.values():
        levels = [level_of(r) for r in rows if r["league"] == league_id]
        print(f"{league_id:15} easy {levels.count('easy'):3}, medium {levels.count('medium'):3}, "
              f"hard {levels.count('hard'):3}, never hidden {levels.count(None):3}")
    gone = set(old) - {r["fd_id"] for r in rows}
    if any(old[k].get("correction") for k in gone):
        print("Corrections of players no longer in the game:", ", ".join(old[k]["name"] for k in gone if old[k].get("correction")))


if __name__ == "__main__":
    main()
