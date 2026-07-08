import { NextResponse } from "next/server";
import { sendPushToUser } from "@/lib/push/send";

// web-push 는 Node API 를 쓰므로 edge 아님
export const runtime = "nodejs";

type WebhookBody = {
  type?: string;
  table?: string;
  record?: {
    user_id?: string;
    title?: string;
    body?: string | null;
    link?: string | null;
    type?: string | null;
  };
};

/**
 * Supabase Database Webhook 대상 — notifications INSERT 시 호출된다.
 * 새 알림 행(record)의 수신자에게 Web Push 를 발송한다.
 * 공개 엔드포인트라 PUSH_WEBHOOK_SECRET 로 보호한다(웹훅 헤더와 일치해야 함).
 */
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  const auth = req.headers.get("authorization");
  const custom = req.headers.get("x-webhook-secret");
  const authorized =
    !!secret && (auth === `Bearer ${secret}` || custom === secret);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: WebhookBody;
  try {
    payload = (await req.json()) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const record = payload.record;
  if (!record?.user_id || !record.title) {
    return NextResponse.json({ error: "no record" }, { status: 400 });
  }

  try {
    const result = await sendPushToUser(record.user_id, {
      title: record.title,
      body: record.body ?? undefined,
      link: record.link ?? undefined,
      tag: record.type ?? undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[push send]", err);
    return NextResponse.json({ error: "send failed" }, { status: 500 });
  }
}
