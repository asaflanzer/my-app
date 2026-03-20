import type { IEnrichedPlayer } from "@/contexts/LeagueContext";

/**
 * Sorts players by a 5-level tiebreaker chain:
 *
 *  1. Active > Inactive           — disabled players always sink to the bottom
 *  2. isQualified=true > false    — admin-flagged playoff qualifiers float to the top
 *  3. Has played games > 0 games  — players with no games sink below active players
 *  4. Wins (primary criterion)    — more wins = higher rank
 *  5. Score (point differential)  — tiebreaker when wins are equal; can be negative
 */
export function sortStandings(players: IEnrichedPlayer[]): IEnrichedPlayer[] {
  return [...players].sort((a, b) => {
    // Level 1: Active > Inactive
    if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;

    // Level 2: Qualified > Not qualified (within same active/inactive group)
    if (a.isQualified !== b.isQualified) return a.isQualified ? -1 : 1;

    // Level 3: Has played > no games played
    if (a.games === 0 && b.games > 0) return 1;
    if (a.games > 0 && b.games === 0) return -1;

    // Level 4: More wins = higher rank (primary ranking criterion)
    if (a.wins !== b.wins) return b.wins - a.wins;

    // Level 5: Higher score (point differential) wins the tiebreak
    return b.score - a.score;
  });
}

/**
 * Formats a score (point differential) for display.
 * Positive values get a leading "+", negative show naturally, zero shows "0".
 */
export function formatScore(score: number): string {
  if (score > 0) return `+${score}`;
  return String(score);
}
