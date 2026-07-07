import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/constants/roles";
import { joinClub } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, region, description")
    .eq("id", id)
    .single();
  if (!club) notFound();

  const { data: membership } = await supabase
    .from("club_members")
    .select("role, status")
    .eq("club_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isActiveMember = membership?.status === "active";
  const isPending = membership?.status === "pending";
  const joinClubWithId = joinClub.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/"
        className="text-muted-foreground mb-6 inline-block text-sm hover:underline"
      >
        ← 홈으로
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-2xl">
            {club.name}
            {isActiveMember && membership && (
              <span className="text-muted-foreground text-sm font-normal">
                내 역할: {roleLabel(membership.role)}
              </span>
            )}
          </CardTitle>
          {club.region && <CardDescription>{club.region}</CardDescription>}
        </CardHeader>
        <CardContent className="grid gap-4">
          {club.description && <p className="text-sm">{club.description}</p>}

          {!membership && (
            <form action={joinClubWithId}>
              <Button type="submit">가입 신청</Button>
            </form>
          )}
          {isPending && (
            <p className="text-muted-foreground text-sm">
              가입 신청됨 — 운영진 승인을 기다리는 중이에요.
            </p>
          )}
          {isActiveMember && (
            <p className="text-muted-foreground text-sm">
              이 클럽의 멤버입니다. (매치·회비 기능은 곧 추가됩니다)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
