import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClubForm } from "./club-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function NewClubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <Link
        href="/"
        className="text-muted-foreground mb-6 inline-block text-sm hover:underline"
      >
        ← 홈으로
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>새 클럽 만들기</CardTitle>
          <CardDescription>
            클럽을 만들면 당신이 회장이 됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClubForm />
        </CardContent>
      </Card>
    </div>
  );
}
