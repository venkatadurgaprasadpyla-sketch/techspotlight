import { describe, expect, it } from 'vitest';
import { runningScores, scoreSummary, type Side } from '~/lib/versus';

const rounds = (...winners: Side[]) => winners.map((winner) => ({ winner }));
const names = { a: 'Nova', b: 'Orbit' };

describe('runningScores', () => {
  it('adds a point per round won; ties score for neither', () => {
    expect(runningScores(rounds('b', 'tie', 'a', 'a'))).toEqual([
      { a: 0, b: 1 },
      { a: 0, b: 1 },
      { a: 1, b: 1 },
      { a: 2, b: 1 },
    ]);
  });
});

describe('scoreSummary', () => {
  it('names the winner with the final score and ties', () => {
    expect(scoreSummary(names, rounds('a', 'b', 'a', 'a', 'b', 'a', 'tie'), 'a')).toBe(
      'Nova wins 4 to 2 (one tie)',
    );
    expect(scoreSummary(names, rounds('b', 'b', 'a'), 'b')).toBe('Orbit wins 2 to 1');
    expect(scoreSummary(names, rounds('b', 'tie', 'tie', 'b'), 'b')).toBe(
      'Orbit wins 2 to 0 (two tied)',
    );
  });
  it('does not claim a win on rounds the pick did not get', () => {
    expect(scoreSummary(names, rounds('a', 'b', 'b'), 'a')).toBe(
      'Nova is our pick, though the rounds finish 1 to 2',
    );
  });
  it('describes a tied verdict', () => {
    expect(scoreSummary(names, rounds('a', 'b', 'tie'), 'tie')).toBe(
      "It's a draw at 1 rounds each (one tie)",
    );
    expect(scoreSummary(names, rounds('a', 'a', 'b'), 'tie')).toBe(
      'Too close to call: Nova takes 2 rounds and Orbit takes 1',
    );
  });
});
