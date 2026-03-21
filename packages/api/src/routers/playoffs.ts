import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { leagues, leagueMembers, users } from "@my-app/db";
import { eq, and } from "@my-app/db";
import { TRPCError } from "@trpc/server";

// ---------------------------------------------------------------------------
// Types (inlined so the API package doesn't depend on the frontend utils)
// ---------------------------------------------------------------------------

interface IPlayoffPlayer {
  memberId: string;
  name: string;
}

interface IPlayoffGame {
  game: number;
  round: number;
  bracket: 'winners' | 'losers' | 'final';
  player1: IPlayoffPlayer | null;
  player2: IPlayoffPlayer | null;
  player1Score: number | null;
  player2Score: number | null;
  winnerId: string | null;
  loserId: string | null;
  isComplete: boolean;
  winnerNextGame: number | 'champion' | 'runnerUp' | 'third' | null;
  winnerSlot: '1' | '2' | null;
  loserNextGame: number | 'third' | 'runnerUp' | null;
  loserSlot: '1' | '2' | null;
  player1PrevGame?: string;
  player2PrevGame?: string;
}

interface IPlayoffBracket {
  games: IPlayoffGame[];
  champion: IPlayoffPlayer | null;
  runnerUp: IPlayoffPlayer | null;
  thirdPlace: IPlayoffPlayer | null;
  totalRounds: number;
}

// ---------------------------------------------------------------------------
// Guard helper — same pattern as assertLeagueHost in leagues.ts
// ---------------------------------------------------------------------------

async function assertLeagueHost(
  ctx: {
    db: typeof import("@my-app/db").db;
    session: { user: { id: string } };
  },
  leagueId: string,
) {
  const [league] = await ctx.db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) throw new TRPCError({ code: "NOT_FOUND" });
  if (league.hostId !== ctx.session.user.id)
    throw new TRPCError({ code: "FORBIDDEN" });
  return league;
}

// ---------------------------------------------------------------------------
// Bracket builder (server-side mirror of playoffs.utils.ts)
// Called by initBracket so the server builds the initial structure.
// ---------------------------------------------------------------------------

function buildBracket(members: IPlayoffPlayer[]): IPlayoffBracket | null {
  if (members.length >= 16) return buildPlayoff16(members.slice(0, 16));
  if (members.length >= 8)  return buildPlayoff8(members.slice(0, 8));
  return null;
}

function buildPlayoff8(p: IPlayoffPlayer[]): IPlayoffBracket {
  const mk = (
    game: number, round: number, bracket: 'winners'|'losers'|'final',
    p1: IPlayoffPlayer|null, p2: IPlayoffPlayer|null,
    wNext: number|'champion'|'runnerUp'|'third'|null, wSlot: '1'|'2'|null,
    lNext: number|'third'|'runnerUp'|null, lSlot: '1'|'2'|null,
    p1Prev?: string, p2Prev?: string,
  ): IPlayoffGame => ({
    game, round, bracket,
    player1: p1, player2: p2,
    player1Score: null, player2Score: null,
    winnerId: null, loserId: null, isComplete: false,
    winnerNextGame: wNext, winnerSlot: wSlot,
    loserNextGame: lNext, loserSlot: lSlot,
    ...(p1Prev !== undefined && { player1PrevGame: p1Prev }),
    ...(p2Prev !== undefined && { player2PrevGame: p2Prev }),
  });

  const games: IPlayoffGame[] = [
    mk(1, 0,'winners', p[0]??null, p[7]??null, 4,'1', 6,'1', 'Seed #1','Seed #8'),
    mk(2, 0,'winners', p[3]??null, p[4]??null, 4,'2', 6,'2', 'Seed #4','Seed #5'),
    mk(3, 0,'winners', p[2]??null, p[5]??null, 5,'1', 7,'1', 'Seed #3','Seed #6'),
    mk(4, 0,'winners', p[1]??null, p[6]??null, 5,'2', 7,'2', 'Seed #2','Seed #7'),
    mk(5, 1,'winners', null, null, 8,'1', 10,'2', 'Winner G1','Winner G2'),
    mk(6, 1,'winners', null, null, 8,'2',  9,'2', 'Winner G3','Winner G4'),
    mk(7, 1,'losers',  null, null, 9,'1', null,null, 'Loser G1','Loser G2'),
    mk(8, 1,'losers',  null, null,10,'1', null,null, 'Loser G3','Loser G4'),
    mk(9, 2,'winners', null, null,12,'1', 11,'2', 'Winner G5','Winner G6'),
    mk(10,1,'losers',  null, null,11,'1', null,null,'Winner G7','Loser G6'),
    mk(11,1,'losers',  null, null,11,'2', null,null,'Winner G8','Loser G5'),
    mk(12,2,'losers',  null, null,12,'2', 14,'1','Winner G10','Winner G11'),
    mk(13,3,'winners', null, null,13,'2', 14,'2','Winner G9','Winner G12'),
    mk(14,3,'final',   null, null,'champion',null,'runnerUp',null,'Winner G13','TBD'),
    mk(15,3,'losers',  null, null,'third',null,null,null,'Loser G12','Loser G13'),
  ];
  return { games, champion:null, runnerUp:null, thirdPlace:null, totalRounds:4 };
}

function buildPlayoff16(p: IPlayoffPlayer[]): IPlayoffBracket {
  const mk = (
    game: number, round: number, bracket: 'winners'|'losers'|'final',
    p1: IPlayoffPlayer|null, p2: IPlayoffPlayer|null,
    wNext: number|'champion'|'runnerUp'|'third'|null, wSlot: '1'|'2'|null,
    lNext: number|'third'|'runnerUp'|null, lSlot: '1'|'2'|null,
    p1Prev?: string, p2Prev?: string,
  ): IPlayoffGame => ({
    game, round, bracket,
    player1: p1, player2: p2,
    player1Score: null, player2Score: null,
    winnerId: null, loserId: null, isComplete: false,
    winnerNextGame: wNext, winnerSlot: wSlot,
    loserNextGame: lNext, loserSlot: lSlot,
    ...(p1Prev !== undefined && { player1PrevGame: p1Prev }),
    ...(p2Prev !== undefined && { player2PrevGame: p2Prev }),
  });

  const games: IPlayoffGame[] = [
    // Winners R1
    mk(1, 0,'winners',p[0]??null,p[15]??null,8,'1',12,'1','Seed #1','Seed #16'),
    mk(2, 0,'winners',p[7]??null,p[8]??null, 8,'2',12,'2','Seed #8','Seed #9'),
    mk(3, 0,'winners',p[4]??null,p[11]??null,9,'1',13,'1','Seed #5','Seed #12'),
    mk(4, 0,'winners',p[3]??null,p[12]??null,9,'2',13,'2','Seed #4','Seed #13'),
    mk(5, 0,'winners',p[2]??null,p[13]??null,10,'1',14,'1','Seed #3','Seed #14'),
    mk(6, 0,'winners',p[5]??null,p[10]??null,10,'2',14,'2','Seed #6','Seed #11'),
    mk(7, 0,'winners',p[6]??null,p[9]??null, 11,'1',15,'1','Seed #7','Seed #10'),
    mk(8, 0,'winners',p[1]??null,p[14]??null,11,'2',15,'2','Seed #2','Seed #15'),
    // Winners R2
    mk(9, 1,'winners',null,null,20,'1',19,'2','Winner G1','Winner G2'),
    mk(10,1,'winners',null,null,20,'2',18,'2','Winner G3','Winner G4'),
    mk(11,1,'winners',null,null,21,'1',17,'2','Winner G5','Winner G6'),
    mk(12,1,'winners',null,null,21,'2',16,'2','Winner G7','Winner G8'),
    // Losers R1
    mk(13,1,'losers',null,null,16,'1',null,null,'Loser G1','Loser G2'),
    mk(14,1,'losers',null,null,17,'1',null,null,'Loser G3','Loser G4'),
    mk(15,1,'losers',null,null,18,'1',null,null,'Loser G5','Loser G6'),
    mk(16,1,'losers',null,null,19,'1',null,null,'Loser G7','Loser G8'),
    // Losers R2
    mk(17,2,'losers',null,null,22,'1',null,null,'Winner G13','Loser G12'),
    mk(18,2,'losers',null,null,22,'2',null,null,'Winner G14','Loser G11'),
    mk(19,2,'losers',null,null,23,'1',null,null,'Winner G15','Loser G10'),
    mk(20,2,'losers',null,null,23,'2',null,null,'Winner G16','Loser G9'),
    // Winners QF
    mk(21,2,'winners',null,null,26,'1',24,'2','Winner G9','Winner G10'),
    mk(22,2,'winners',null,null,27,'1',25,'2','Winner G11','Winner G12'),
    // Losers R3
    mk(23,2,'losers',null,null,24,'1',null,null,'Winner G17','Winner G18'),
    mk(24,2,'losers',null,null,25,'1',null,null,'Winner G19','Winner G20'),
    // Losers SF
    mk(25,3,'losers',null,null,27,'2',null,null,'Winner G23','Loser G21'),
    mk(26,3,'losers',null,null,26,'2',null,null,'Winner G24','Loser G22'),
    // Winners SF
    mk(27,3,'winners',null,null,29,'1',28,'1','Winner G21','Winner G26'),
    mk(28,3,'winners',null,null,29,'2',28,'2','Winner G22','Winner G25'),
    // 3rd place
    mk(29,4,'losers',null,null,'third',null,null,null,'Loser G27','Loser G28'),
    // Grand Final
    mk(30,5,'final',null,null,'champion',null,'runnerUp',null,'Winner G27','Winner G28'),
  ];
  return { games, champion:null, runnerUp:null, thirdPlace:null, totalRounds:6 };
}

function advanceBracket(
  bracket: IPlayoffBracket,
  gameIndex: number,
  winner: IPlayoffPlayer,
  loser: IPlayoffPlayer,
  p1Score: number,
  p2Score: number,
): IPlayoffBracket {
  const games = bracket.games.map((g) => ({ ...g }));
  let { champion, runnerUp, thirdPlace } = bracket;

  const game = games[gameIndex];
  if (!game) return bracket;

  game.isComplete = true;
  game.player1Score = p1Score;
  game.player2Score = p2Score;
  game.winnerId = winner.memberId;
  game.loserId = loser.memberId;

  if (game.winnerNextGame === 'champion') {
    champion = winner;
  } else if (typeof game.winnerNextGame === 'number') {
    const ng = games[game.winnerNextGame];
    if (ng) { if (game.winnerSlot === '1') ng.player1 = winner; else ng.player2 = winner; }
  }

  if (game.loserNextGame === 'runnerUp') {
    runnerUp = loser;
  } else if (game.loserNextGame === 'third') {
    thirdPlace = loser;
  } else if (typeof game.loserNextGame === 'number') {
    const ng = games[game.loserNextGame];
    if (ng) { if (game.loserSlot === '1') ng.player1 = loser; else ng.player2 = loser; }
  }

  return { ...bracket, games, champion, runnerUp, thirdPlace };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const playoffsRouter = router({
  /**
   * Returns the current bracket state + playoff settings.
   * Accessible to any league member.
   */
  getBracket: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [league] = await ctx.db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);
      if (!league) throw new TRPCError({ code: "NOT_FOUND" });

      // Verify caller is a member or host
      const [membership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, league.id),
            eq(leagueMembers.userId, ctx.session.user.id),
          ),
        )
        .limit(1);
      if (!membership && league.hostId !== ctx.session.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });

      return {
        bracket: league.playoffBracket as IPlayoffBracket | null,
        raceTo: league.playoffRaceTo,
        gameType: league.playoffGameType,
      };
    }),

  /**
   * Host configures playoff settings before the bracket is initialised.
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        leagueId: z.string(),
        raceTo: z.union([z.literal(3), z.literal(7)]),
        gameType: z.union([z.literal("8-ball"), z.literal("9-ball")]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);
      await ctx.db
        .update(leagues)
        .set({
          playoffRaceTo: input.raceTo,
          playoffGameType: input.gameType,
          updatedAt: new Date(),
        })
        .where(eq(leagues.id, input.leagueId));
    }),

  /**
   * Host initialises the bracket from the currently qualified members.
   * Reads all members with isQualified=true, sorts by wins then score,
   * and builds the appropriate bracket (8 or 16 players).
   */
  initBracket: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);

      const members = await ctx.db
        .select({
          id: leagueMembers.id,
          wins: leagueMembers.wins,
          score: leagueMembers.score,
          disabled: leagueMembers.disabled,
          isQualified: leagueMembers.isQualified,
          name: users.name,
        })
        .from(leagueMembers)
        .innerJoin(users, eq(leagueMembers.userId, users.id))
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.isQualified, true),
          ),
        );

      // Sort by the same rules as the frontend standings.utils.ts
      const sorted = [...members].sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        if (a.wins !== b.wins) return b.wins - a.wins;
        return b.score - a.score;
      });

      const players: IPlayoffPlayer[] = sorted.map((m) => ({
        memberId: m.id,
        name: m.name ?? "Unknown",
      }));

      const bracket = buildBracket(players);
      if (!bracket)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Need at least 8 qualified players to initialise the bracket.",
        });

      await ctx.db
        .update(leagues)
        .set({ playoffBracket: bracket, updatedAt: new Date() })
        .where(eq(leagues.id, input.leagueId));

      return bracket;
    }),

  /**
   * Host records the result of a playoff game.
   * The bracket advances automatically (winner/loser placed in next slots).
   */
  recordResult: protectedProcedure
    .input(
      z.object({
        leagueId: z.string(),
        gameIndex: z.number().int().min(0),
        winnerId: z.string(),
        loserId: z.string(),
        player1Score: z.number().int().min(0),
        player2Score: z.number().int().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);

      const [league] = await ctx.db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);
      if (!league) throw new TRPCError({ code: "NOT_FOUND" });

      const bracket = league.playoffBracket as IPlayoffBracket | null;
      if (!bracket)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bracket has not been initialised yet.",
        });

      const game = bracket.games[input.gameIndex];
      if (!game)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid game index." });
      if (game.isComplete)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Game already complete." });

      const winner = game.player1?.memberId === input.winnerId ? game.player1 : game.player2;
      const loser  = game.player1?.memberId === input.loserId  ? game.player1 : game.player2;

      if (!winner || !loser)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Player not found in this game." });

      const updated = advanceBracket(
        bracket,
        input.gameIndex,
        winner,
        loser,
        input.player1Score,
        input.player2Score,
      );

      await ctx.db
        .update(leagues)
        .set({ playoffBracket: updated, updatedAt: new Date() })
        .where(eq(leagues.id, input.leagueId));

      return updated;
    }),

  /**
   * Host initialises an empty bracket skeleton (all player slots null) so
   * the playoff page can render the structure before players are seeded.
   * No-ops if a bracket already exists.
   */
  previewBracket: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);

      const bracket = buildPlayoff8([]);
      await ctx.db
        .update(leagues)
        .set({ playoffBracket: bracket, updatedAt: new Date() })
        .where(eq(leagues.id, input.leagueId));

      return bracket;
    }),

  /**
   * Host resets the bracket (e.g. to re-seed after a qualification change).
   */
  resetBracket: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);
      await ctx.db
        .update(leagues)
        .set({ playoffBracket: null, updatedAt: new Date() })
        .where(eq(leagues.id, input.leagueId));
    }),
});
