"use strict";

/** True when a defense card beats an attack card in Durak. */
function beats(card, attack, trump) {
  if (!card || !attack) return false;
  return (card.suit === attack.suit && card.value > attack.value) ||
    (card.suit === trump && attack.suit !== trump);
}

/**
 * Throw-ins are legal only when their rank is already on the table.
 * The round limit is captured from the defender's hand at the start of
 * the round (not recalculated after every defense).
 */
function canThrow(table, card, roundLimit) {
  if (!card || !Number.isInteger(roundLimit) || roundLimit < 1) return false;
  if (table.length >= Math.min(6, roundLimit)) return false;
  if (table.length === 0) return true;
  const ranks = new Set();
  for (const pair of table) {
    if (pair.attack) ranks.add(pair.attack.rank);
    if (pair.defense) ranks.add(pair.defense.rank);
  }
  return ranks.has(card.rank);
}

function nextPlayerIndex(players, from, deckRemaining, skipIndex = -1) {
  for (let step = 1; step <= players.length; step++) {
    const index = (from + step) % players.length;
    const canReceiveCards = deckRemaining > 0 || players[index].hand.length > 0;
    if (index !== skipIndex && canReceiveCards) return index;
  }
  return from;
}

module.exports = { beats, canThrow, nextPlayerIndex };
