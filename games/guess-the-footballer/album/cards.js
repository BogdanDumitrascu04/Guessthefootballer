const PAGE = 1000; // Supabase returns at most this many rows per request
const KEPT = 'gtf-cards'; // removed at sign-out (auth.js)
let mine = new Map();
let asked = null; // { userId, answer }: the server is asked once per page, not on every tab of the album

async function download(userId) {
    const cards = new Map();
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabaseClient.from('user_cards').select('player_id, guesses, guessed_at')
            .eq('user_id', userId).order('player_id').range(from, from + PAGE - 1);
        if (error) throw error;
        for (const { player_id, guesses, guessed_at } of data) cards.set(player_id, { guesses, date: new Date(guessed_at) });
        if (data.length < PAGE) break;
    }
    localStorage.setItem(KEPT, JSON.stringify({ userId, cards: [...cards] }));
    return cards;
}

function kept(userId) {
    try {
        const copy = JSON.parse(localStorage.getItem(KEPT));
        if (copy?.userId === userId) return new Map(copy.cards.map(([id, win]) => [id, { ...win, date: new Date(win.date) }]));
    } catch {
        // a copy that cannot be read is only a slower page
    }
    return null;
}

const sameCards = (a, b) => a.size === b.size && [...a].every(([id, win]) => b.get(id)?.guesses === win.guesses);

// The user_cards view (sql/user_cards.sql). The copy kept in this browser is shown at once and the server's answer
// replaces it when it differs (onNewer redraws). waitForServer: a card just won is not in the copy yet.
export async function loadCards({ onNewer, waitForServer = false } = {}) {
    await accountReady;
    const userId = currentUser?.id;
    if (!userId) {
        mine = new Map();
        return;
    }
    if (asked?.userId !== userId) {
        const answer = download(userId);
        asked = { userId, answer };
        answer.catch(() => { if (asked?.answer === answer) asked = null; }); // asked again at the next draw
    }
    const { answer } = asked;
    const copy = waitForServer ? null : kept(userId);
    if (!copy) {
        mine = await answer;
        return;
    }
    mine = copy;
    answer.then(cards => {
        if (asked?.answer !== answer || sameCards(cards, copy)) return;
        mine = cards;
        onNewer?.();
    }, error => console.error(error));
}

export const winOf = id => mine.get(id);
