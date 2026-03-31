import type { AuditLevel } from "@prisma/client";

import { prisma } from "~/services/db.server";

type AuditInput = {
  shopId?: string | null;
  paymentSessionId?: string | null;
  level?: AuditLevel;
  action: string;
  actor: string;
  message: string;
  context?: Record<string, unknown> | null;
};

export async function writeAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        shopId: input.shopId ?? undefined,
        paymentSessionId: input.paymentSessionId ?? undefined,
        level: input.level ?? "INFO",
        action: input.action,
        actor: input.actor,
        message: input.message,
        context: input.context ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to persist audit log", error);
  }
}
