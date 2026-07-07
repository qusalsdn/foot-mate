import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/constants/roles";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Club = {
  id: string;
  name: string;
  region: string | null;
  description: string | null;
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 내가 속한 클럽 (활성 회원)
  const { data: memberships } = await supabase
    .from("club_members")
    .select("role, clubs(id, name, region, description)")
    .eq("user_id", user.id)
    .eq("status", "active");

  // 둘러보기: 최근 생성된 클럽
  const { data: allClubs } = await supabase
    .from("clubs")
    .select("id, name, region, description")
    .order("created_at", { ascending: false })
    .limit(12);

  const myClubs = (memberships ?? []) as unknown as Array<{
    role: string;
    clubs: Club | null;
  }>;
  const myClubIds = new Set(myClubs.map((m) => m.clubs?.id));
  const discover = ((allClubs ?? []) as Club[]).filter(
    (c) => !myClubIds.has(c.id),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">내 클럽</h1>
        <div className="flex items-center gap-2">
          <Link href="/clubs/new" className={buttonVariants()}>
            클럽 만들기
          </Link>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline">
              로그아웃
            </Button>
          </form>
        </div>
      </header>

      {myClubs.length === 0 ? (
        <Card className="mb-10">
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            아직 소속된 클럽이 없어요. 클럽을 만들거나 아래에서 찾아보세요.
          </CardContent>
        </Card>
      ) : (
        <ul className="mb-10 grid gap-3">
          {myClubs.map((m) =>
            m.clubs ? (
              <li key={m.clubs.id}>
                <Link href={`/clubs/${m.clubs.id}`}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-lg">
                        {m.clubs.name}
                        <span className="text-muted-foreground text-sm font-normal">
                          {roleLabel(m.role)}
                        </span>
                      </CardTitle>
                      {m.clubs.region && (
                        <CardDescription>{m.clubs.region}</CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      )}

      <h2 className="mb-4 text-lg font-medium">클럽 둘러보기</h2>
      {discover.length === 0 ? (
        <p className="text-muted-foreground text-sm">둘러볼 다른 클럽이 없어요.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {discover.map((c) => (
            <li key={c.id}>
              <Link href={`/clubs/${c.id}`}>
                <Card className="h-full transition-colors hover:bg-accent">
                  <CardHeader>
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    {c.region && <CardDescription>{c.region}</CardDescription>}
                  </CardHeader>
                  {c.description && (
                    <CardContent className="text-muted-foreground text-sm">
                      {c.description}
                    </CardContent>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
