import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallback });

function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                // Exchange the OAuth code for a session
                const { data, error } = await supabase.auth.exchangeCodeForSession(
                    window.location.href
                );

                if (error) {
                    toast.error("فشل تسجيل الدخول: " + error.message);
                    navigate({ to: "/auth" });
                    return;
                }

                if (data.session) {
                    toast.success("تم تسجيل الدخول بنجاح!");
                    navigate({ to: "/app" });
                } else {
                    navigate({ to: "/auth" });
                }
            } catch (err) {
                toast.error("حدث خطأ أثناء تسجيل الدخول");
                navigate({ to: "/auth" });
            }
        })();
    }, [navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                <p className="text-muted-foreground">جاري تسجيل الدخول...</p>
            </div>
        </div>
    );
}