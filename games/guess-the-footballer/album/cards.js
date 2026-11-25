const PAGE = 1000; // Supabase returns at most this many rows per request
let mine = new Map();

// The user_cards view (sql/user_cards.sql). Signed out, the album is empty.
export async function loadCards() {
    await accountReady;
    const cards = new Map();
    for (let from = 0; currentUser; from += PAGE) {
        const { data, error } = await supabaseClient.from('user_cards').select('player_id, guesses, guessed_at')
            .eq('user_id', currentUser.id).order('player_id').range(from, from + PAGE - 1);
        if (error) throw error;
        for (const { player_id, guesses, guessed_at } of data) cards.set(player_id, { guesses, date: new Date(guessed_at) });
        if (data.length < PAGE) break;
    }
    mine = cards;
}

export const winOf = id => mine.get(id);
