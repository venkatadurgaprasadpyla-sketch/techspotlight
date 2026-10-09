/** Face-off scoring. Pure, unit tested. */
export type Side = 'a' | 'b' | 'tie';

export interface Score {
  a: number;
  b: number;
}

/** The score after each round, e.g. [{a:1,b:0}, {a:1,b:1}, …]. Ties score for neither. */
export function runningScores(rounds: readonly { winner: Side }[]): Score[] {
  const score = { a: 0, b: 0 };
  return rounds.map(({ winner }) => {
    if (winner !== 'tie') score[winner] += 1;
    return { ...score };
  });
}

const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const count = (n: number) => words[n] ?? String(n);

/**
 * One line for "The short answer", e.g. "Nova 5G wins 3 to 2 (one tie)". When the editor's pick
 * is not the side with more rounds, it says so rather than claiming a win on rounds.
 */
export function scoreSummary(
  names: { a: string; b: string },
  rounds: readonly { winner: Side }[],
  overall: Side,
): string {
  const final = runningScores(rounds).at(-1) ?? { a: 0, b: 0 };
  const ties = rounds.filter((r) => r.winner === 'tie').length;
  const tieNote = ties === 0 ? '' : ties === 1 ? ' (one tie)' : ` (${count(ties)} tied)`;
  if (overall === 'tie') {
    return final.a === final.b
      ? `It's a draw at ${final.a} rounds each${tieNote}`
      : `Too close to call: ${names.a} takes ${final.a} rounds and ${names.b} takes ${final.b}${tieNote}`;
  }
  const other = overall === 'a' ? 'b' : 'a';
  const [won, lost] = [final[overall], final[other]];
  return won > lost
    ? `${names[overall]} wins ${won} to ${lost}${tieNote}`
    : `${names[overall]} is our pick, though the rounds finish ${won} to ${lost}${tieNote}`;
}
