import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

/**
 * مسح جميع بيانات الجلسة المخزنة محلياً (localStorage + sessionStorage)
 * هذا يُستخدم عند انتهاء صلاحية الـ Refresh Token (مثلاً بعد إعادة تشغيل المشروع في Supabase)
 */
function clearLocalSession() {
  try {
    // Supabase يخزن الجلسة بمفتاح يبدأ بـ sb-
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem("auth_no_persist");
  } catch {
    // تجاهل أي خطأ في حالة عدم وجود localStorage
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // سجّل المستمع أولاً حتى لا تفوتنا أي أحداث مصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, s) => {
      if (cancelled) return;

      // إذا انتهت صلاحية الـ token أو كان غير صالح → امسح المخزن المحلي وأعد التوجيه
      if (event === "TOKEN_REFRESHED" && !s) {
        clearLocalSession();
        setSession(null);
        setUser(null);
        setInitializing(false);
        return;
      }

      if (event === "SIGNED_OUT") {
        clearLocalSession();
        setSession(null);
        setUser(null);
        setInitializing(false);
        return;
      }

      setSession(s);
      setUser(s?.user ?? null);
      setInitializing(false);
    });

    // اجلب الجلسة الحالية
    supabase.auth.getSession().then(async ({ data: { session: s }, error }) => {
      if (cancelled) return;

      // إذا كان هناك خطأ في الجلسة أو كان الـ refresh token منتهياً
      if (error || (s && !s.refresh_token)) {
        clearLocalSession();
        // أجبر Supabase على إعادة التحقق
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setInitializing(false);
        return;
      }

      // إذا كانت هناك جلسة، تحقق منها مع الخادم
      if (s) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (cancelled) return;
        if (refreshError || !refreshData.session) {
          // الـ Refresh Token لم يعد صالحاً → مسح وتسجيل خروج
          clearLocalSession();
          await supabase.auth.signOut().catch(() => {});
          setSession(null);
          setUser(null);
        } else {
          setSession(refreshData.session);
          setUser(refreshData.session.user);
        }
      } else {
        setSession(null);
        setUser(null);
      }
      setInitializing(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, remember = true) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && !remember) {
      sessionStorage.setItem("auth_no_persist", "1");
    } else if (!error) {
      sessionStorage.removeItem("auth_no_persist");
    }
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    clearLocalSession();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, session, loading: initializing, signIn, signUp, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
