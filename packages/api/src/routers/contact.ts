import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { sendMail, getFirstAdminEmail } from "../email.js";
import { TRPCError } from "@trpc/server";

export const contactRouter = router({
  send: protectedProcedure
    .input(z.object({ message: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const adminEmail = getFirstAdminEmail();
      if (!adminEmail) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No admin email configured",
        });
      }

      const senderName = ctx.session.user.name ?? "Someone";
      const senderEmail = ctx.session.user.email;

      await sendMail({
        to: adminEmail,
        subject: `Legg: host event request from ${senderName}`,
        text: `From: ${senderName} <${senderEmail}>\n\n${input.message}`,
      });
    }),
});
