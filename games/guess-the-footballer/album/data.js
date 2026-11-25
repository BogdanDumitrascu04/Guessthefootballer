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
