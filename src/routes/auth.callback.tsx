import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallback });

function AuthCallback() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    useEffect(() => {
        const url = new URL(window.location.href);
        const errorCode = url.searchParams.get("error");
        const errorDesc = url.searchParams.get("error_description");
        const code = url.searchParams.get("code");
        
        if (errorCode) {
            const message = errorDesc
                ? decodeURIComponent(errorDesc.replace(/\+/g, " "))
                : errorCode;
            toast.error("فشل تسجيل الدخول: " + message);
            navigate({ to: "/auth", replace: true });
            return;
        }

        const handleManualExchange = async (c: string) => {
            const { error } = await supabase.auth.exchangeCodeForSession(c);
            if (error) {
                console.error("Manual exchange error:", error);
                if (error.message.includes("PKCE")) {
                    toast.error("فشل تسجيل الدخول بسبب إعدادات المتصفح. الرجاء فتح التطبيق في المتصفح الرئيسي (Safari/Chrome).");
                } else {
                    toast.error("حدث خطأ أثناء تأكيد الدخول: " + error.message);
                }
                navigate({ to: "/auth", replace: true });
            }
        };

        if (code && !user && !loading) {
            // Attempt manual exchange to catch PKCE errors on mobile
            handleManualExchange(code);
        } else if (!loading) {
            if (user) {
                toast.success("تم تسجيل الدخول بنجاح!");
                navigate({ to: "/app", replace: true });
            } else {
                const hash = url.hash;
                if (!code && !hash) {
                    navigate({ to: "/auth", replace: true });
                }
            }
        }
    }, [user, loading, navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                <p className="text-muted-foreground">جاري تسجيل الدخول...</p>
            </div>
        </div>
    );
}