import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { tournaments, participants, matches } from "@my-app/db";
import { eq, and } from "@my-app/db";
import { generateBracket, generatePlaceholderParticipants } from "../lib/bracket.js";
import type { TournamentFormat, BracketParticipant } from "../lib/bracket.js";
import { TRPCError } from "@trpc/server";

const tournamentFormatSchema = z.enum([
  "single_elimination",
  "double_elimination",
  "round_robin",
  "swiss",
  "free_for_all",
  "leaderboard",
]);

const createTournamentSchema = z.object({
  name: z.string().min(1),
  gameType: z.string().min(1),
  duration: z.enum(["single_day", "multi_day", "recurring"]),
  format: tournamentFormatSchema,
  secondFormat: tournamentFormatSchema.optional(),
  breakTies: z.boolean().default(false),
  registrationType: z.enum(["host_provided", "sign_up_page"]),
  isFree: z.boolean().default(true),
  requireTeams: z.boolean().default(false),
  maxParticipants: z.number().int().positive().optional(),
  startDate: z.string(),
  isTentative: z.boolean().default(false),
  requireCheckIn: z.boolean().default(false),
  participants: z
    .array(z.object({ name: z.string().min(1), teamName: z.string().optional() }))
    .default([]),
});


async function assertHost(ctx: { db: typeof import("@my-app/db").db; session: { user: { id: string } } }, tournamentId: string) {
  const [t] = await ctx.db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!t) throw new TRPCError({ code: "NOT_FOUND" });
  if (t.hostId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });
  return t;
}

const updateTournamentSchema = createTournamentSchema.extend({
  id: z.string(),
});

export const tournamentRouter = router({
  update: protectedProcedure
    .input(updateTournamentSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await assertHost(ctx, input.id);

      // Update tournament fields
      await ctx.db
        .update(tournaments)
        .set({
          name: input.name,
          gameType: input.gameType,
          duration: input.duration,
          format: input.format,
          secondFormat: input.secondFormat ?? null,
          breakTies: input.breakTies,
          registrationType: input.registrationType,
          isFree: input.isFree,
          requireTeams: input.requireTeams,
          maxParticipants: input.maxParticipants ?? null,
          startDate: new Date(input.startDate),
          isTentative: input.isTentative,
          requireCheckIn: input.requireCheckIn,
          updatedAt: new Date(),
        })
        .where(eq(tournaments.id, input.id));

      // Rebuild participants + bracket
      await ctx.db.delete(matches).where(eq(matches.tournamentId, input.id));
      await ctx.db.delete(participants).where(eq(participants.tournamentId, input.id));

      const useReal = input.participants.length > 0;
      const participantRows = useReal
        ? input.participants.map((p, i) => ({
            id: crypto.randomUUID(),
            tournamentId: input.id,
            userId: null,
            name: p.name,
            teamName: p.teamName ?? null,
            isPlaceholder: false,
            seed: i + 1,
          }))
        : generatePlaceholderParticipants(
            input.maxParticipants ?? 8,
            input.requireTeams
          ).map((p) => ({
            id: crypto.randomUUID(),
            tournamentId: input.id,
            userId: null,
            name: p.name,
            teamName: null,
            isPlaceholder: true,
            seed: p.seed,
          }));

      if (participantRows.length > 0) {
        await ctx.db.insert(participants).values(participantRows);
      }

      const bracketParticipants: BracketParticipant[] = participantRows.map((p) => ({
        id: p.id,
        name: p.name,
        seed: p.seed,
      }));

      const matchSeeds = generateBracket(
        input.format as TournamentFormat,
        bracketParticipants,
        input.id.slice(0, 4)
      );

      if (matchSeeds.length > 0) {
        await ctx.db.insert(matches).values(
          matchSeeds.map((m) => ({
            id: m.id,
            tournamentId: input.id,
            round: m.round,
            matchNumber: m.matchNumber,
            participant1Id: m.participant1Id,
            participant2Id: m.participant2Id,
            winnerId: null,
            nextMatchId: m.nextMatchId,
            isLosersBracket: m.isLosersBracket,
            status: "pending" as const,
            scheduledAt: null,
          }))
        );
      }

      return { id: input.id };
    }),

  create: protectedProcedure
    .input(createTournamentSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const tournamentId = crypto.randomUUID();

      await ctx.db.insert(tournaments).values({
        id: tournamentId,
        hostId: userId,
        name: input.name,
        gameType: input.gameType,
        status: "draft",
        duration: input.duration,
        format: input.format,
        secondFormat: input.secondFormat ?? null,
        breakTies: input.breakTies,
        registrationType: input.registrationType,
        isFree: input.isFree,
        requireTeams: input.requireTeams,
        maxParticipants: input.maxParticipants ?? null,
        startDate: new Date(input.startDate),
        isTentative: input.isTentative,
        requireCheckIn: input.requireCheckIn,
        shareableSlug: input.registrationType === "sign_up_page" ? crypto.randomUUID() : null,
      });

      const useReal = input.participants.length > 0;
      const participantRows = useReal
        ? input.participants.map((p, i) => ({
            id: crypto.randomUUID(),
            tournamentId,
            userId: null,
            name: p.name,
            teamName: p.teamName ?? null,
            isPlaceholder: false,
            seed: i + 1,
          }))
        : generatePlaceholderParticipants(
            input.maxParticipants ?? 8,
            input.requireTeams
          ).map((p) => ({
            id: crypto.randomUUID(),
            tournamentId,
            userId: null,
            name: p.name,
            teamName: null,
            isPlaceholder: true,
            seed: p.seed,
          }));

      if (participantRows.length > 0) {
        await ctx.db.insert(participants).values(participantRows);
      }

      const bracketParticipants: BracketParticipant[] = participantRows.map((p) => ({
        id: p.id,
        name: p.name,
        seed: p.seed,
      }));

      const matchSeeds = generateBracket(
        input.format as TournamentFormat,
        bracketParticipants,
        tournamentId.slice(0, 4)
      );

      if (matchSeeds.length > 0) {
        await ctx.db.insert(matches).values(
          matchSeeds.map((m) => ({
            id: m.id,
            tournamentId,
            round: m.round,
            matchNumber: m.matchNumber,
            participant1Id: m.participant1Id,
            participant2Id: m.participant2Id,
            winnerId: null,
            nextMatchId: m.nextMatchId,
            isLosersBracket: m.isLosersBracket,
            status: "pending" as const,
            scheduledAt: null,
          }))
        );
      }

      return { id: tournamentId };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [tournament] = await ctx.db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, input.id))
        .limit(1);

      if (!tournament) throw new TRPCError({ code: "NOT_FOUND" });

      if (tournament.status === "draft" && tournament.hostId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const tournamentParticipants = await ctx.db
        .select()
        .from(participants)
        .where(eq(participants.tournamentId, input.id));

      const tournamentMatches = await ctx.db
        .select()
        .from(matches)
        .where(eq(matches.tournamentId, input.id));

      return { tournament, participants: tournamentParticipants, matches: tournamentMatches };
    }),

  // List: published tournaments + caller's own (any status)
  list: protectedProcedure.query(async ({ ctx }) => {
    const all = await ctx.db.select().from(tournaments);
    return all.filter(
      (t) => t.status === "published" || t.status === "in_progress" || t.hostId === ctx.session.user.id
    );
  }),

  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const t = await assertHost(ctx, input.id);
      if (t.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Already published." });

      const ps = await ctx.db.select().from(participants).where(eq(participants.tournamentId, input.id));
      const missing = ps.filter((p) => p.isPlaceholder).length;
      if (missing > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${missing} participant${missing === 1 ? "" : "s"} still missing. Replace all placeholders before publishing.`,
        });
      }

      await ctx.db
        .update(tournaments)
        .set({ status: "published", updatedAt: new Date() })
        .where(eq(tournaments.id, input.id));

      return { status: "published" };
    }),

  start: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const t = await assertHost(ctx, input.id);
      if (t.status !== "published" && t.status !== "paused") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tournament must be published to start." });
      }
      await ctx.db
        .update(tournaments)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(tournaments.id, input.id));
      return { status: "in_progress" };
    }),

  pause: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const t = await assertHost(ctx, input.id);
      if (t.status !== "in_progress") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tournament is not running." });
      }
      await ctx.db
        .update(tournaments)
        .set({ status: "paused", updatedAt: new Date() })
        .where(eq(tournaments.id, input.id));
      return { status: "paused" };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertHost(ctx, input.id);
      await ctx.db.delete(tournaments).where(eq(tournaments.id, input.id));
      return { ok: true };
    }),

  register: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
      teamName: z.string().optional(),
      paymentMethod: z.enum(["google_pay", "apple_pay", "cash"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const [t] = await ctx.db.select().from(tournaments).where(eq(tournaments.id, input.id)).limit(1);
      if (!t) throw new TRPCError({ code: "NOT_FOUND" });
      if (t.status !== "published" && t.status !== "in_progress") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tournament is not open for registration." });
      }
      if (t.registrationType !== "sign_up_page") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This tournament does not accept self-registration." });
      }

      const existing = await ctx.db
        .select()
        .from(participants)
        .where(and(eq(participants.tournamentId, input.id), eq(participants.userId, ctx.session.user.id)))
        .limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "Already registered." });

      if (t.maxParticipants) {
        const all = await ctx.db.select().from(participants).where(eq(participants.tournamentId, input.id));
        if (all.length >= t.maxParticipants) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tournament is full." });
        }
      }

      await ctx.db.insert(participants).values({
        id: crypto.randomUUID(),
        tournamentId: input.id,
        userId: ctx.session.user.id,
        name: input.name,
        teamName: input.teamName ?? null,
        isPlaceholder: false,
        seed: null,
      });

      return { ok: true };
    }),

  unregister: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(participants)
        .where(and(eq(participants.tournamentId, input.id), eq(participants.userId, ctx.session.user.id)));
      return { ok: true };
    }),
});
