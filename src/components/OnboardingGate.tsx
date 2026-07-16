import { useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { OnboardingFlow } from "@/components/OnboardingFlow";

import { getProfile, updateProfileCache } from "@/lib/profile";

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [needs, setNeeds] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading || !user) { setNeeds(false); return; }
    
    let cancelled = false;
    (async () => {
      const profile = await getProfile(user.id);
      if (!cancelled) {
        setNeeds(!profile.onboarded);
      }
    })();

    return () => { cancelled = true; };
  }, [user, loading]);

  if (needs === null) return null;
  if (needs) return <OnboardingFlow onDone={() => setNeeds(false)} />;
  return <>{children}</>;
}
