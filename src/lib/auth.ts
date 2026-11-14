import { createClient } from "@/lib/supabase/server";
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("UNAUTHORIZED");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("id,lawyer_id,role,preferred_language,full_name").eq("id", user.id).single();
  if (profileError || !profile?.lawyer_id) throw new Error("PROFILE_NOT_CONFIGURED");
  return { supabase, user, profile };
}
export async function requireStaff() {
  const ctx = await requireUser();
  if (!["admin","lawyer"].includes(ctx.profile.role)) throw new Error("FORBIDDEN");
  return ctx;
}
