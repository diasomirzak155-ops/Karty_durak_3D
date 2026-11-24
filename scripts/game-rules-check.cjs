const assert = require('node:assert/strict');
const { beats, canThrow, nextPlayerIndex } = require('../game-rules');
const attack = { rank: '7', suit: '♠', value: 7 };
assert.equal(beats({ rank: '8', suit: '♠', value: 8 }, attack, '♥'), true);
assert.equal(beats({ rank: '6', suit: '♥', value: 6 }, attack, '♥'), true);
assert.equal(beats({ rank: 'A', suit: '♦', value: 14 }, attack, '♥'), false);
assert.equal(beats({ rank: '6', suit: '♠', value: 6 }, attack, '♥'), false);
const table = [{ attack, defense: { rank: '9', suit: '♣', value: 9 } }];
assert.equal(canThrow(table, { rank: '7', suit: '♦', value: 7 }, 6), true);
assert.equal(canThrow(table, { rank: '8', suit: '♦', value: 8 }, 6), false);
const fivePairs = Array.from({ length: 5 }, (_, i) => ({ attack: { rank: String(i), suit: '♠' }, defense: { rank: 'Q', suit: '♣' } }));
assert.equal(canThrow(fivePairs, { rank: 'Q', suit: '♦' }, 6), true);
assert.equal(canThrow([...fivePairs, { attack: { rank: 'Q' }, defense: null }], { rank: 'Q', suit: '♥' }, 6), false);
assert.equal(canThrow([], { rank: '6', suit: '♠' }, 6), true);
assert.equal(canThrow([], { rank: '6', suit: '♠' }, 0), false);
const players = [{hand:[1]}, {hand:[]}, {hand:[1]}];
assert.equal(nextPlayerIndex(players, 0, 5), 1); // empty hand will draw before the next round
assert.equal(nextPlayerIndex(players, 0, 0), 2); // with an empty deck, skip players out of cards
assert.equal(nextPlayerIndex(players, 0, 0, 2), 0);
console.log('Game rules passed: trump beating, same-rank throw-ins, and fixed defender round limit, and correct next-player selection.');
