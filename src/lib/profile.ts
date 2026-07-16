import { supabase } from "@/integrations/supabase/client";

const profileCache = new Map<string, { pin_hash: string | null; onboarded: boolean | null }>();

export async function getProfile(userId: string) {
  if (!profileCache.has(userId)) {
    const { data, error } = await supabase
      .from("profiles")
      .select("pin_hash, onboarded")
      .eq("user_id", userId)
      .maybeSingle();
      
    if (error) {
      console.error("Error fetching profile:", error);
    }
    
    profileCache.set(userId, {
      pin_hash: data?.pin_hash ?? null,
      onboarded: data?.onboarded ?? false
    });
  }
  return profileCache.get(userId)!;
}

export function updateProfileCache(userId: string, data: { pin_hash?: string | null; onboarded?: boolean | null }) {
  if (profileCache.has(userId)) {
    const existing = profileCache.get(userId)!;
    if (data.pin_hash !== undefined) existing.pin_hash = data.pin_hash;
    if (data.onboarded !== undefined) existing.onboarded = data.onboarded;
  } else {
    profileCache.set(userId, {
      pin_hash: data.pin_hash ?? null,
      onboarded: data.onboarded ?? false
    });
  }
}
