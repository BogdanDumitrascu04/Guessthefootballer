const cache = new Map();

// getJson() is the game's: it asks the server for a newer copy instead of trusting the browser's cache.
function load(path) {
    if (!cache.has(path)) {
        cache.set(path, getJson(`data/album/${path}`).catch(error => {
            cache.delete(path);
            throw error;
        }));
    }
    return cache.get(path);
}

export const loadIndex = () => load('index.json');
export const loadClub = id => load(`clubs/${id}.json`);

// A player's card, or null: only the album's season has cards, and a player who has changed clubs has none at the old one.
export async function findCard(player, season) {
    const index = await loadIndex();
    const [clubId, club] = Object.entries(index.clubs).find(([, c]) => c.name === player.team) ?? [];
    if (season !== index.season || !club) return null;
    const card = (await loadClub(clubId)).cards.find(c => c.id === player.id);
    return card ? { card, club, clubId, league: index.leagues.find(l => l.id === club.league) } : null;
}
