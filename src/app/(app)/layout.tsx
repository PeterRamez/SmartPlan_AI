import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import AppShell from "@/components/app-shell";
export default async function Layout({children}:{children:React.ReactNode}) {
 try { await requireUser(); } catch { redirect("/login"); }
 return <AppShell>{children}</AppShell>;
}
