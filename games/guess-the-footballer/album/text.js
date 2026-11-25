// t(), currentLanguage and clueCountry() are the game's own, so the album speaks the language chosen in the header.
export const LINES = ['goalkeeper', 'defender', 'midfielder', 'forward'];

export const capitalize = text => text[0].toUpperCase() + text.slice(1);
export const positionName = spot => capitalize(t(`pos_${spot}`));
export const tierName = tier => t(`tier_${tier}`);
export const countryName = code => clueCountry(code);

// "25 nov": the stamp has no room for the full stop some languages put after a short month.
export function shortDate(date) {
    return new Intl.DateTimeFormat(currentLanguage, { day: 'numeric', month: 'short' }).format(date).replaceAll('.', '');
}

export const seatText = (card, club) => t('cardSeat', { code: club.code, row: card.row, seat: card.seat });
