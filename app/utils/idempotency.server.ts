import { prisma } from "~/services/db.server";
import { sha256 } from "~/utils/crypto.server";

export async function getIdempotentResponse<T>(
  scope: string,
  key: string,
  payload: unknown,
) {
  const record = await prisma.idempotencyRecord.findUnique({
    where: {
      scope_recordKey: {
        scope,
        recordKey: key,
      },
    },
  });

  if (!record) {
    return null;
  }

  const checksum = sha256(JSON.stringify(payload));
  if (record.checksum && record.checksum !== checksum) {
    throw new Response("Idempotency key payload mismatch.", { status: 409 });
  }

  return (record.response as T | null) ?? null;
}

export async function saveIdempotentResponse(
  scope: string,
  key: string,
  payload: unknown,
  response: unknown,
) {
  const checksum = sha256(JSON.stringify(payload));

  await prisma.idempotencyRecord.upsert({
    where: {
      scope_recordKey: {
        scope,
        recordKey: key,
      },
    },
    create: {
      scope,
      recordKey: key,
      checksum,
      response,
    },
    update: {
      checksum,
      response,
    },
  });
}
