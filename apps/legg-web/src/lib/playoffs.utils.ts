/**
 * playoffs.utils.ts
 *
 * Double-elimination playoff bracket logic for legg-web.
 * Modelled after /8ball-app/src/components/playoffsUtils.ts.
 *
 * ─── FORMAT ─────────────────────────────────────────────────────────────────
 *
 * Double elimination: every player starts in the Winners bracket.
 * One loss → drops to Losers bracket (still alive).
 * A second loss → eliminated.
 * The Losers bracket survivor meets the Winners bracket champion in the Grand Final.
 *
 * Supported sizes:
 *   Playoff 8  — 14 games, 4 carousel rounds
 *   Playoff 16 — 30 games, 5 carousel rounds
 *
 * ─── SEEDING ────────────────────────────────────────────────────────────────
 *
 * Input is the sorted standings array (index 0 = best record).
 * Classic seeding: best vs worst, second-best vs second-worst, etc.
 * This ensures if every top seed wins, the final is always seed #1 vs #2.
 *
 * ─── STORAGE ────────────────────────────────────────────────────────────────
 *
 * The IPlayoffBracket object is stored as JSON in leagues.playoffBracket.
 * It is loaded via trpc.playoffs.getBracket and mutated via trpc.playoffs.recordResult.
 * All mutations return a new IPlayoffBracket (pure functions).
 */

import type { IEnrichedPlayer } from "@/contexts/LeagueContext";
import { sortStandings } from "@/lib/standings.utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal player reference embedded in bracket game slots. */
export interface IPlayoffPlayer {
  memberId: string; // leagueMember.id
  name: string;
}

/**
 * A single match slot in the bracket array.
 *
 * Routing fields:
 *   winnerNextGame / loserNextGame  — 0-based array INDEX of the next game
 *   winnerSlot / loserSlot          — which slot ('1' or '2') the player fills
 *
 * Special string values for final results:
 *   'champion'  → this game's winner is the tournament champion
 *   'runnerUp'  → this game's loser is 2nd place
 *   'third'     → this game's winner is 3rd place
 *   null        → player is eliminated (no next game)
 */
export interface IPlayoffGame {
  /** 1-based display number shown in the UI. */
  game: number;

  /** The two competing players (null = slot not yet filled). */
  player1: IPlayoffPlayer | null;
  player2: IPlayoffPlayer | null;

  /** Scores entered by the admin. */
  player1Score: number | null;
  player2Score: number | null;

  /** Set after the game is complete. */
  winnerId: string | null; // memberId
  loserId: string | null; // memberId
  isComplete: boolean;

  /** Where the winner goes next. */
  winnerNextGame: number | "champion" | "runnerUp" | "third" | null;
  winnerSlot: "1" | "2" | null;

  /**
   * Where the loser goes next.
   * null = eliminated (no second chance).
   * 'third'    = loser plays in 3rd-place match (Winners semi-final).
   * 'runnerUp' = loser is 2nd place (Grand Final loser).
   */
  loserNextGame: number | "third" | "runnerUp" | null;
  loserSlot: "1" | "2" | null;

  /** 0-based column index for the Carousel. Games in the same round share the same value. */
  round: number;

  /** Which bracket this game belongs to — used for visual grouping. */
  bracket: "winners" | "losers" | "final";

  /** Display labels shown below each player slot (e.g. "Winner of Game 3"). */
  player1PrevGame?: string;
  player2PrevGame?: string;
}

/** The full bracket state persisted in the DB. */
export interface IPlayoffBracket {
  /** All games, ordered by game number (1-based). Array is 0-indexed: game N is at index N-1. */
  games: IPlayoffGame[];

  /** Populated when the Grand Final is played. */
  champion: IPlayoffPlayer | null;
  runnerUp: IPlayoffPlayer | null;
  thirdPlace: IPlayoffPlayer | null;

  /** Total number of carousel rounds (columns). */
  totalRounds: number;
}

// ---------------------------------------------------------------------------
// Internal helper — extract player reference from a standings entry
// ---------------------------------------------------------------------------

function toPlayoffPlayer(p: IEnrichedPlayer): IPlayoffPlayer {
  return { memberId: p.id, name: p.name };
}

// ---------------------------------------------------------------------------
// buildPlayoff8
// ---------------------------------------------------------------------------

/**
 * Builds the 14-game double-elimination bracket for exactly 8 players.
 *
 * ── SEEDING ─────────────────────────────────────────────────────────────────
 *
 *   members[0] (#1 seed) → Game  1 player1    ┐  1 vs 8  (Winners R1)
 *   members[7] (#8 seed) → Game  1 player2    ┘
 *   members[3] (#4 seed) → Game  2 player1    ┐  4 vs 5
 *   members[4] (#5 seed) → Game  2 player2    ┘
 *   members[2] (#3 seed) → Game  3 player1    ┐  3 vs 6
 *   members[5] (#6 seed) → Game  3 player2    ┘
 *   members[1] (#2 seed) → Game  4 player1    ┐  2 vs 7
 *   members[6] (#7 seed) → Game  4 player2    ┘
 *
 * ── CAROUSEL ROUNDS ─────────────────────────────────────────────────────────
 *
 *   round 0: Games  1– 4  (Winners R1 — initial seeded matchups)
 *   round 1: Games  5– 8  (Winners R2 + Losers R1)
 *   round 2: Games  9–12  (Winners QF + Losers R2/R3)
 *   round 3: Games 13–14  (Winners Final + Grand Final)
 */
export function buildPlayoff8(members: IPlayoffPlayer[]): IPlayoffBracket {
  const p = members;

  // winnerNextGame and loserNextGame values below are 0-based array indices.
  // (game number N lives at index N-1)
  const games: IPlayoffGame[] = [
    // ── Winners Round 1 (round 0) ─────────────────────────────────────────
    // Game 1 (index 0): #1 vs #8
    //   Winner → index 4 (Game 5, winners R2, slot 1)
    //   Loser  → index 6 (Game 7, losers R1, slot 1)
    {
      game: 1,
      round: 0,
      bracket: "winners",
      player1: p[0] ?? null,
      player2: p[7] ?? null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 4,
      winnerSlot: "1",
      loserNextGame: 6,
      loserSlot: "1",
      player1PrevGame: "Seed #1",
      player2PrevGame: "Seed #8",
    },
    // Game 2 (index 1): #4 vs #5
    //   Winner → index 4 (Game 5, winners R2, slot 2)
    //   Loser  → index 6 (Game 7, losers R1, slot 2)
    {
      game: 2,
      round: 0,
      bracket: "winners",
      player1: p[3] ?? null,
      player2: p[4] ?? null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 4,
      winnerSlot: "2",
      loserNextGame: 6,
      loserSlot: "2",
      player1PrevGame: "Seed #4",
      player2PrevGame: "Seed #5",
    },
    // Game 3 (index 2): #3 vs #6
    //   Winner → index 5 (Game 6, winners R2, slot 1)
    //   Loser  → index 7 (Game 8, losers R1, slot 1)
    {
      game: 3,
      round: 0,
      bracket: "winners",
      player1: p[2] ?? null,
      player2: p[5] ?? null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 5,
      winnerSlot: "1",
      loserNextGame: 7,
      loserSlot: "1",
      player1PrevGame: "Seed #3",
      player2PrevGame: "Seed #6",
    },
    // Game 4 (index 3): #2 vs #7
    //   Winner → index 5 (Game 6, winners R2, slot 2)
    //   Loser  → index 7 (Game 8, losers R1, slot 2)
    {
      game: 4,
      round: 0,
      bracket: "winners",
      player1: p[1] ?? null,
      player2: p[6] ?? null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 5,
      winnerSlot: "2",
      loserNextGame: 7,
      loserSlot: "2",
      player1PrevGame: "Seed #2",
      player2PrevGame: "Seed #7",
    },

    // ── Winners Round 2 (round 1) ─────────────────────────────────────────
    // Game 5 (index 4): winners of G1 & G2
    //   Winner → index 8 (Game 9, winners QF, slot 1)
    //   Loser  → index 10 (Game 11, losers R2, slot 2) — drops to losers
    {
      game: 5,
      round: 1,
      bracket: "winners",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 8,
      winnerSlot: "1",
      loserNextGame: 10,
      loserSlot: "2",
      player1PrevGame: "Winner of Game 1",
      player2PrevGame: "Winner of Game 2",
    },
    // Game 6 (index 5): winners of G3 & G4
    //   Winner → index 8 (Game 9, winners QF, slot 2)
    //   Loser  → index 9 (Game 10, losers R2, slot 2)
    {
      game: 6,
      round: 1,
      bracket: "winners",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 8,
      winnerSlot: "2",
      loserNextGame: 9,
      loserSlot: "2",
      player1PrevGame: "Winner of Game 3",
      player2PrevGame: "Winner of Game 4",
    },

    // ── Losers Round 1 (round 1) ──────────────────────────────────────────
    // Game 7 (index 6): losers of G1 & G2
    //   Winner → index 9 (Game 10, losers R2, slot 1)
    //   Loser  → ELIMINATED
    {
      game: 7,
      round: 1,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 9,
      winnerSlot: "1",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Loser of Game 1",
      player2PrevGame: "Loser of Game 2",
    },
    // Game 8 (index 7): losers of G3 & G4
    //   Winner → index 10 (Game 11, losers R2, slot 1)
    //   Loser  → ELIMINATED
    {
      game: 8,
      round: 1,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 10,
      winnerSlot: "1",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Loser of Game 3",
      player2PrevGame: "Loser of Game 4",
    },

    // ── Winners Semi-final (round 2) ──────────────────────────────────────
    // Game 9 (index 8): winners of G5 & G6
    //   Winner → index 12 (Game 13, winners final, slot 1)
    //   Loser  → index 11 (Game 12, losers SF, slot 2)
    {
      game: 9,
      round: 2,
      bracket: "winners",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 12,
      winnerSlot: "1",
      loserNextGame: 11,
      loserSlot: "2",
      player1PrevGame: "Winner of Game 5",
      player2PrevGame: "Winner of Game 6",
    },

    // ── Losers Round 2 (round 1 — displayed in Quarter-Finals column) ───────
    // Game 10 (index 9): G7 winner vs G6 loser
    //   Winner → index 11 (Game 12, losers SF, slot 1)
    //   Loser  → ELIMINATED
    {
      game: 10,
      round: 1,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 11,
      winnerSlot: "1",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Winner of Game 7",
      player2PrevGame: "Loser of Game 6",
    },
    // Game 11 (index 10): G8 winner vs G5 loser
    //   Winner → index 11 (Game 12, losers SF, slot 2)
    //   Loser  → ELIMINATED
    {
      game: 11,
      round: 1,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 11,
      winnerSlot: "2",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Winner of Game 8",
      player2PrevGame: "Loser of Game 5",
    },

    // ── Losers Semi-final (round 2) ───────────────────────────────────────
    // Game 12 (index 11): losers bracket final two survivors
    //   Winner → index 12 (Game 13, winners final, slot 2)
    //   Loser  → index 14 (Game 15, 3rd place match, slot 1)
    {
      game: 12,
      round: 2,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 12,
      winnerSlot: "2",
      loserNextGame: 14,
      loserSlot: "1",
      player1PrevGame: "Winner of Game 10",
      player2PrevGame: "Winner of Game 11",
    },

    // ── Winners Final (round 3) ───────────────────────────────────────────
    // Game 13 (index 12): undefeated winner vs losers bracket survivor
    //   Winner → Grand Final (slot 2)
    //   Loser  → index 14 (Game 15, 3rd place match, slot 2)
    {
      game: 13,
      round: 3,
      bracket: "winners",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 13,
      winnerSlot: "2",
      loserNextGame: 14,
      loserSlot: "2",
      player1PrevGame: "Winner of Game 9",
      player2PrevGame: "Winner of Game 12",
    },

    // ── 3rd Place Match (round 3 — Finals column) ────────────────────────
    // Game 15 (index 14): loser of G12 vs loser of G13
    //   Winner → 'third' (3rd place)
    //   Loser  → 4th place (eliminated)
    {
      game: 15,
      round: 3,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: "third",
      winnerSlot: null,
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Loser of Game 12",
      player2PrevGame: "Loser of Game 13",
    },

    // ── Grand Final (round 3 — Finals column) ────────────────────────────
    // Game 14 (index 13): winners bracket champion vs losers bracket champion
    //   Winner → 'champion'  (1st place)
    //   Loser  → 'runnerUp'  (2nd place)
    {
      game: 14,
      round: 3,
      bracket: "final",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: "champion",
      winnerSlot: null,
      loserNextGame: "runnerUp",
      loserSlot: null,
      player1PrevGame: "Winner of Game 13",
      player2PrevGame: "TBD",
    },
  ];

  return {
    games,
    champion: null,
    runnerUp: null,
    thirdPlace: null,
    totalRounds: 4,
  };
}

// ---------------------------------------------------------------------------
// buildPlayoff16
// ---------------------------------------------------------------------------

/**
 * Builds the 30-game double-elimination bracket for exactly 16 players.
 *
 * ── SEEDING ─────────────────────────────────────────────────────────────────
 *
 *   members[0]  (#1)  → Game  1 p1   ┐  1 vs 16
 *   members[15] (#16) → Game  1 p2   ┘
 *   members[7]  (#8)  → Game  2 p1   ┐  8 vs  9
 *   members[8]  (#9)  → Game  2 p2   ┘
 *   members[4]  (#5)  → Game  3 p1   ┐  5 vs 12
 *   members[11] (#12) → Game  3 p2   ┘
 *   members[3]  (#4)  → Game  4 p1   ┐  4 vs 13
 *   members[12] (#13) → Game  4 p2   ┘
 *   members[2]  (#3)  → Game  5 p1   ┐  3 vs 14
 *   members[13] (#14) → Game  5 p2   ┘
 *   members[5]  (#6)  → Game  6 p1   ┐  6 vs 11
 *   members[10] (#11) → Game  6 p2   ┘
 *   members[6]  (#7)  → Game  7 p1   ┐  7 vs 10
 *   members[9]  (#10) → Game  7 p2   ┘
 *   members[1]  (#2)  → Game  8 p1   ┐  2 vs 15
 *   members[14] (#15) → Game  8 p2   ┘
 *
 * ── CAROUSEL ROUNDS ─────────────────────────────────────────────────────────
 *
 *   round 0: Games  1– 8  (Winners R1)
 *   round 1: Games  9–16  (Winners R2 + Losers R1)
 *   round 2: Games 17–24  (Losers R2/R3 + Winners QF + Losers R4)
 *   round 3: Games 25–28  (Losers SF + Winners SF)
 *   round 4: Games 29–30  (3rd place + Grand Final)
 */
export function buildPlayoff16(members: IPlayoffPlayer[]): IPlayoffBracket {
  const p = members;

  const games: IPlayoffGame[] = [
    // ── Winners Round 1 (round 0) — Games 1–8 ────────────────────────────
    {
      game: 1,
      round: 0,
      bracket: "winners",
      player1: p[0] ?? null,
      player2: p[15] ?? null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 8,
      winnerSlot: "1",
      loserNextGame: 12,
      loserSlot: "1",
      player1PrevGame: "Seed #1",
      player2PrevGame: "Seed #16",
    },
    {
      game: 2,
      round: 0,
      bracket: "winners",
      player1: p[7] ?? null,
      player2: p[8] ?? null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 8,
      winnerSlot: "2",
      loserNextGame: 12,
      loserSlot: "2",
      player1PrevGame: "Seed #8",
      player2PrevGame: "Seed #9",
    },
    {
      game: 3,
      round: 0,
      bracket: "winners",
      player1: p[4] ?? null,
      player2: p[11] ?? null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 9,
      winnerSlot: "1",
      loserNextGame: 13,
      loserSlot: "1",
      player1PrevGame: "Seed #5",
      player2PrevGame: "Seed #12",
    },
    {
      game: 4,
      round: 0,
      bracket: "winners",
      player1: p[3] ?? null,
      player2: p[12] ?? null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 9,
      winnerSlot: "2",
      loserNextGame: 13,
      loserSlot: "2",
      player1PrevGame: "Seed #4",
      player2PrevGame: "Seed #13",
    },
    {
      game: 5,
      round: 0,
      bracket: "winners",
      player1: p[2] ?? null,
      player2: p[13] ?? null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 10,
      winnerSlot: "1",
      loserNextGame: 14,
      loserSlot: "1",
      player1PrevGame: "Seed #3",
      player2PrevGame: "Seed #14",
    },
    {
      game: 6,
      round: 0,
      bracket: "winners",
      player1: p[5] ?? null,
      player2: p[10] ?? null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 10,
      winnerSlot: "2",
      loserNextGame: 14,
      loserSlot: "2",
      player1PrevGame: "Seed #6",
      player2PrevGame: "Seed #11",
    },
    {
      game: 7,
      round: 0,
      bracket: "winners",
      player1: p[6] ?? null,
      player2: p[9] ?? null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 11,
      winnerSlot: "1",
      loserNextGame: 15,
      loserSlot: "1",
      player1PrevGame: "Seed #7",
      player2PrevGame: "Seed #10",
    },
    {
      game: 8,
      round: 0,
      bracket: "winners",
      player1: p[1] ?? null,
      player2: p[14] ?? null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 11,
      winnerSlot: "2",
      loserNextGame: 15,
      loserSlot: "2",
      player1PrevGame: "Seed #2",
      player2PrevGame: "Seed #15",
    },

    // ── Winners Round 2 (round 1) — Games 9–12 ───────────────────────────
    {
      game: 9,
      round: 1,
      bracket: "winners",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 20,
      winnerSlot: "1",
      loserNextGame: 19,
      loserSlot: "2",
      player1PrevGame: "Winner G1",
      player2PrevGame: "Winner G2",
    },
    {
      game: 10,
      round: 1,
      bracket: "winners",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 20,
      winnerSlot: "2",
      loserNextGame: 18,
      loserSlot: "2",
      player1PrevGame: "Winner G3",
      player2PrevGame: "Winner G4",
    },
    {
      game: 11,
      round: 1,
      bracket: "winners",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 21,
      winnerSlot: "1",
      loserNextGame: 17,
      loserSlot: "2",
      player1PrevGame: "Winner G5",
      player2PrevGame: "Winner G6",
    },
    {
      game: 12,
      round: 1,
      bracket: "winners",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 21,
      winnerSlot: "2",
      loserNextGame: 16,
      loserSlot: "2",
      player1PrevGame: "Winner G7",
      player2PrevGame: "Winner G8",
    },

    // ── Losers Round 1 (round 1) — Games 13–16 ───────────────────────────
    {
      game: 13,
      round: 1,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 16,
      winnerSlot: "1",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Loser G1",
      player2PrevGame: "Loser G2",
    },
    {
      game: 14,
      round: 1,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 17,
      winnerSlot: "1",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Loser G3",
      player2PrevGame: "Loser G4",
    },
    {
      game: 15,
      round: 1,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 18,
      winnerSlot: "1",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Loser G5",
      player2PrevGame: "Loser G6",
    },
    {
      game: 16,
      round: 1,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 19,
      winnerSlot: "1",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Loser G7",
      player2PrevGame: "Loser G8",
    },

    // ── Losers Round 2 (round 2) — Games 17–20 ───────────────────────────
    {
      game: 17,
      round: 2,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 22,
      winnerSlot: "1",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Winner G13",
      player2PrevGame: "Loser G12",
    },
    {
      game: 18,
      round: 2,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 22,
      winnerSlot: "2",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Winner G14",
      player2PrevGame: "Loser G11",
    },
    {
      game: 19,
      round: 2,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 23,
      winnerSlot: "1",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Winner G15",
      player2PrevGame: "Loser G10",
    },
    {
      game: 20,
      round: 2,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 23,
      winnerSlot: "2",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Winner G16",
      player2PrevGame: "Loser G9",
    },

    // ── Winners Quarter-finals (round 2) — Games 21–22 ───────────────────
    {
      game: 21,
      round: 2,
      bracket: "winners",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 26,
      winnerSlot: "1",
      loserNextGame: 24,
      loserSlot: "2",
      player1PrevGame: "Winner G9",
      player2PrevGame: "Winner G10",
    },
    {
      game: 22,
      round: 2,
      bracket: "winners",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 27,
      winnerSlot: "1",
      loserNextGame: 25,
      loserSlot: "2",
      player1PrevGame: "Winner G11",
      player2PrevGame: "Winner G12",
    },

    // ── Losers Round 3 (round 2) — Games 23–24 ───────────────────────────
    {
      game: 23,
      round: 2,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 24,
      winnerSlot: "1",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Winner G17",
      player2PrevGame: "Winner G18",
    },
    {
      game: 24,
      round: 2,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 25,
      winnerSlot: "1",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Winner G19",
      player2PrevGame: "Winner G20",
    },

    // ── Losers Semi-finals (round 3) — Games 25–26 ───────────────────────
    {
      game: 25,
      round: 3,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 27,
      winnerSlot: "2",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Winner G23",
      player2PrevGame: "Loser G21",
    },
    {
      game: 26,
      round: 3,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 26,
      winnerSlot: "2",
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Winner G24",
      player2PrevGame: "Loser G22",
    },

    // ── Winners Semi-finals (round 3) — Games 27–28 ──────────────────────
    {
      game: 27,
      round: 3,
      bracket: "winners",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 29,
      winnerSlot: "1",
      loserNextGame: 28,
      loserSlot: "1",
      player1PrevGame: "Winner G21",
      player2PrevGame: "Winner G26",
    },
    {
      game: 28,
      round: 3,
      bracket: "winners",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: 29,
      winnerSlot: "2",
      loserNextGame: 28,
      loserSlot: "2",
      player1PrevGame: "Winner G22",
      player2PrevGame: "Winner G25",
    },

    // ── 3rd Place (round 4) ───────────────────────────────────────────────
    // Game 29 (index 28): losers of the two semi-finals
    //   Winner → 'third' (3rd place)
    //   Loser  → eliminated
    {
      game: 29,
      round: 4,
      bracket: "losers",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: "third",
      winnerSlot: null,
      loserNextGame: null,
      loserSlot: null,
      player1PrevGame: "Loser G27",
      player2PrevGame: "Loser G28",
    },

    // ── Grand Final (round 5) ─────────────────────────────────────────────
    // Game 30 (index 29): both semi-final winners
    //   Winner → 'champion'  (1st place)
    //   Loser  → 'runnerUp'  (2nd place)
    {
      game: 30,
      round: 5,
      bracket: "final",
      player1: null,
      player2: null,
      player1Score: null,
      player2Score: null,
      winnerId: null,
      loserId: null,
      isComplete: false,
      winnerNextGame: "champion",
      winnerSlot: null,
      loserNextGame: "runnerUp",
      loserSlot: null,
      player1PrevGame: "Winner G27",
      player2PrevGame: "Winner G28",
    },
  ];

  return {
    games,
    champion: null,
    runnerUp: null,
    thirdPlace: null,
    totalRounds: 6,
  };
}

// ---------------------------------------------------------------------------
// recordGameResult
// ---------------------------------------------------------------------------

/**
 * Pure function — records the result of one game and advances players
 * to their next game slots. Returns a new IPlayoffBracket.
 *
 * @param bracket   Current bracket state (not mutated)
 * @param gameIndex 0-based index into bracket.games
 * @param winner    The winning player
 * @param loser     The losing player
 * @param p1Score   Final score for player1
 * @param p2Score   Final score for player2
 */
export function recordGameResult(
  bracket: IPlayoffBracket,
  gameIndex: number,
  winner: IPlayoffPlayer,
  loser: IPlayoffPlayer,
  p1Score: number,
  p2Score: number,
): IPlayoffBracket {
  const games = bracket.games.map((g) => ({ ...g })); // shallow copy
  let { champion, runnerUp, thirdPlace } = bracket;

  const game = games[gameIndex];
  if (!game) return bracket;

  // Mark the game as complete
  game.isComplete = true;
  game.player1Score = p1Score;
  game.player2Score = p2Score;
  game.winnerId = winner.memberId;
  game.loserId = loser.memberId;

  // ── Advance the WINNER ──────────────────────────────────────────────────
  if (game.winnerNextGame === "champion") {
    champion = winner;
  } else if (typeof game.winnerNextGame === "number") {
    const nextGame = games[game.winnerNextGame];
    if (nextGame && game.winnerSlot === "1") nextGame.player1 = winner;
    if (nextGame && game.winnerSlot === "2") nextGame.player2 = winner;
  }

  // ── Advance the LOSER ───────────────────────────────────────────────────
  if (game.loserNextGame === "runnerUp") {
    runnerUp = loser;
  } else if (game.loserNextGame === "third") {
    thirdPlace = loser; // direct 3rd place (from winners final in 8-player bracket)
  } else if (typeof game.loserNextGame === "number") {
    const nextGame = games[game.loserNextGame];
    if (nextGame && game.loserSlot === "1") nextGame.player1 = loser;
    if (nextGame && game.loserSlot === "2") nextGame.player2 = loser;
  }
  // loserNextGame === null → player is eliminated, no action needed

  return { ...bracket, games, champion, runnerUp, thirdPlace };
}

// ---------------------------------------------------------------------------
// getMyActiveRound
// ---------------------------------------------------------------------------

/**
 * Returns the carousel round index the current user should default to:
 *   - The round of the first incomplete game they are listed in, OR
 *   - The round of the first incomplete game overall (fallback), OR
 *   - 0 if the bracket is empty.
 */
export function getMyActiveRound(
  bracket: IPlayoffBracket,
  myMemberId: string | undefined,
): number {
  if (!myMemberId) {
    const firstIncomplete = bracket.games.find((g) => !g.isComplete);
    return firstIncomplete?.round ?? 0;
  }

  const myGame = bracket.games.find(
    (g) =>
      !g.isComplete &&
      (g.player1?.memberId === myMemberId ||
        g.player2?.memberId === myMemberId),
  );
  if (myGame) return myGame.round;

  const firstIncomplete = bracket.games.find((g) => !g.isComplete);
  return firstIncomplete?.round ?? 0;
}

// ---------------------------------------------------------------------------
// buildFromQualifiedPlayers
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper: filters the full player list to qualified players,
 * sorts them by standings, and builds the appropriate bracket (8 or 16).
 *
 * Returns null if there are fewer than 8 qualified players.
 */
export function buildFromQualifiedPlayers(
  players: IEnrichedPlayer[],
): IPlayoffBracket | null {
  const qualified = sortStandings(players.filter((p) => p.isQualified));

  if (qualified.length >= 16) {
    return buildPlayoff16(qualified.slice(0, 16).map(toPlayoffPlayer));
  }
  if (qualified.length >= 8) {
    return buildPlayoff8(qualified.slice(0, 8).map(toPlayoffPlayer));
  }
  return null; // not enough qualified players yet
}

// ---------------------------------------------------------------------------
// groupGamesByRound
// ---------------------------------------------------------------------------

/** Groups the games array into arrays per carousel round (0-indexed). */
export function groupGamesByRound(games: IPlayoffGame[]): IPlayoffGame[][] {
  const map = new Map<number, IPlayoffGame[]>();
  for (const g of games) {
    const arr = map.get(g.round) ?? [];
    arr.push(g);
    map.set(g.round, arr);
  }
  // Return sorted by round index
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, v]) => v);
}
