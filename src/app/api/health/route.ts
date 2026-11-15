import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { healthFailureEvent, newRequestId } from "@/lib/operational-events";
import { hasRequiredSchema, type RequiredSchemaState } from "@/lib/schema-readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const requestId = newRequestId();
  const timestamp = new Date().toISOString();
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";

  try {
    // Enforce critical schema contracts, not just database connectivity.
    // The 22-migration snapshot does not have the order item snapshot column.
    const rows = await prisma.$queryRaw<RequiredSchemaState[]>`
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'OrderItem'
            AND column_name = 'itemName'
        ) AS "orderItemSnapshotReady",
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'AuthLoginThrottle'
            AND column_name = 'keyHash'
        ) AS "loginThrottleReady"
    `;

    if (!hasRequiredSchema(rows[0])) {
      console.error(
        healthFailureEvent(requestId, Date.now() - startedAt, new Date(), "database_schema_incompatible"),
      );
      return NextResponse.json(
        { status: "error", database: "schema_incompatible", version, timestamp },
        { status: 503, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } },
      );
    }

    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        version,
        timestamp,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-Request-ID": requestId,
        },
      }
    );
  } catch {
    // Avoid serializing underlying pg errors: they can include internal hosts.
    console.error(healthFailureEvent(requestId, Date.now() - startedAt));
    return NextResponse.json(
      {
        status: "error",
        database: "unavailable",
        version,
        timestamp,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Request-ID": requestId,
        },
      }
    );
  }
}
