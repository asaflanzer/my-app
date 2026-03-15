export type TournamentFormat =
  | "single_elimination"
  | "double_elimination"
  | "round_robin"
  | "swiss"
  | "free_for_all"
  | "leaderboard";

export interface BracketParticipant {
  id: string;
  name: string;
  seed: number;
}

export interface MatchSeed {
  id: string;
  round: number;
  matchNumber: number;
  participant1Id: string | null;
  participant2Id: string | null;
  nextMatchId: string | null;
  isLosersBracket: boolean;
}

function nextPowerOf2(n: number): number {
  if (n <= 4) return 4;
  let p = 4;
  while (p < n) p *= 2;
  return p;
}

function makeId(prefix: string, i: number) {
  return `${prefix}_${i}`;
}

// Standard single-elimination seeding: 1v8, 4v5, 2v7, 3v6 (for 8 players)
// General: pair seeds so that if every favourite wins, the final is 1v2.
function singleElimSeeding(size: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  function seed(lo: number, hi: number) {
    if (hi - lo === 1) {
      pairs.push([lo, hi]);
      return;
    }
    const mid = Math.floor((hi - lo + 1) / 2);
    for (let i = 0; i < mid; i++) {
      seed(lo + i, hi - i);
    }
  }
  // Build bracket positions
  const positions: number[] = new Array(size);
  positions[0] = 1;
  for (let i = 1; i < size; i++) {
    positions[i] = size + 1 - positions[i - 1 - (i % 2 === 0 ? 0 : 1)];
  }
  // Simple approach: fold the seed list
  const seeds = Array.from({ length: size }, (_, i) => i + 1);
  const paired: Array<[number, number]> = [];
  function fold(arr: number[]): Array<[number, number]> {
    if (arr.length === 2) return [[arr[0], arr[1]]];
    const half = arr.length / 2;
    const result: Array<[number, number]> = [];
    for (let i = 0; i < half; i++) {
      result.push([arr[i], arr[arr.length - 1 - i]]);
    }
    return result;
  }
  return fold(seeds);
}

export function generateBracket(
  format: TournamentFormat,
  participants: BracketParticipant[],
  idPrefix: string = "m"
): MatchSeed[] {
  if (format === "leaderboard") return [];

  if (format === "free_for_all") {
    return [
      {
        id: makeId(idPrefix, 1),
        round: 1,
        matchNumber: 1,
        participant1Id: participants[0]?.id ?? null,
        participant2Id: participants[1]?.id ?? null,
        nextMatchId: null,
        isLosersBracket: false,
      },
    ];
  }

  if (format === "round_robin") {
    const ms: MatchSeed[] = [];
    let matchNum = 0;
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        matchNum++;
        ms.push({
          id: makeId(idPrefix, matchNum),
          round: 1,
          matchNumber: matchNum,
          participant1Id: participants[i].id,
          participant2Id: participants[j].id,
          nextMatchId: null,
          isLosersBracket: false,
        });
      }
    }
    return ms;
  }

  if (format === "swiss") {
    // Generate round 1 random pairings; rest is results-driven
    const arr = [...participants];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    const shuffled = arr;
    const ms: MatchSeed[] = [];
    for (let i = 0; i < Math.floor(shuffled.length / 2); i++) {
      ms.push({
        id: makeId(idPrefix, i + 1),
        round: 1,
        matchNumber: i + 1,
        participant1Id: shuffled[i * 2].id,
        participant2Id: shuffled[i * 2 + 1].id,
        nextMatchId: null,
        isLosersBracket: false,
      });
    }
    return ms;
  }

  // single_elimination or double_elimination
  const bracketSize = nextPowerOf2(participants.length);
  const seededPairs = singleElimSeeding(bracketSize);
  const matches: MatchSeed[] = [];
  let idCounter = 1;

  // Build all rounds for winners bracket
  const totalRounds = Math.log2(bracketSize);
  // Round 1
  const round1Ids: string[] = [];
  for (let i = 0; i < seededPairs.length; i++) {
    const [s1, s2] = seededPairs[i];
    const p1 = participants[s1 - 1] ?? null;
    const p2 = participants[s2 - 1] ?? null;
    const id = makeId(idPrefix, idCounter++);
    round1Ids.push(id);
    matches.push({
      id,
      round: 1,
      matchNumber: i + 1,
      participant1Id: p1?.id ?? null,
      participant2Id: p2?.id ?? null,
      nextMatchId: null, // patched below
      isLosersBracket: false,
    });
  }

  // Subsequent rounds (winners bracket) — participants are TBD (null)
  let prevRoundIds = round1Ids;
  for (let r = 2; r <= totalRounds; r++) {
    const currRoundIds: string[] = [];
    const matchesInRound = prevRoundIds.length / 2;
    for (let i = 0; i < matchesInRound; i++) {
      const id = makeId(idPrefix, idCounter++);
      currRoundIds.push(id);
      matches.push({
        id,
        round: r,
        matchNumber: i + 1,
        participant1Id: null,
        participant2Id: null,
        nextMatchId: null,
        isLosersBracket: false,
      });
    }
    // Wire nextMatchId for previous round
    for (let i = 0; i < prevRoundIds.length; i++) {
      const match = matches.find((m) => m.id === prevRoundIds[i]);
      if (match) match.nextMatchId = currRoundIds[Math.floor(i / 2)];
    }
    prevRoundIds = currRoundIds;
  }

  if (format === "double_elimination") {
    // Losers bracket: same size as winners bracket minus the final
    // Simplified: generate losers bracket slots (all TBD) wired round by round
    let losersPrevIds: string[] = [];
    for (let r = 1; r <= totalRounds - 1; r++) {
      const matchesInRound = bracketSize / Math.pow(2, r);
      const currIds: string[] = [];
      for (let i = 0; i < matchesInRound; i++) {
        const id = makeId(idPrefix + "L", idCounter++);
        currIds.push(id);
        matches.push({
          id,
          round: r,
          matchNumber: i + 1,
          participant1Id: null,
          participant2Id: null,
          nextMatchId: null,
          isLosersBracket: true,
        });
      }
      for (let i = 0; i < losersPrevIds.length; i++) {
        const match = matches.find((m) => m.id === losersPrevIds[i]);
        if (match) match.nextMatchId = currIds[Math.floor(i / 2)];
      }
      losersPrevIds = currIds;
    }
  }

  return matches;
}

export function generatePlaceholderParticipants(
  count: number,
  isTeam: boolean
): Array<{ name: string; isPlaceholder: true; seed: number }> {
  const size = nextPowerOf2(count > 0 ? count : 4);
  const result = [];
  for (let i = 1; i <= size; i++) {
    const name = isTeam
      ? `Team ${String.fromCharCode(64 + i)}`
      : `Player ${String.fromCharCode(64 + Math.ceil(i / 2))}${((i - 1) % 2) + 1}`;
    result.push({ name, isPlaceholder: true as const, seed: i });
  }
  return result;
}
