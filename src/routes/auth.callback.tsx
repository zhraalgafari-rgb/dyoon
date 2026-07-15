import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallback });

function AuthCallback() {
    const navigate = useNavigate();
    // منع التنفيذ المزدوج في React Strict Mode أو عند تحديث المكوّن
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        (async () => {
            try {
                const url = new URL(window.location.href);

                // 1. التحقق من وجود رمز خطأ في URL (يُرسله Supabase عند الفشل)
                const errorCode = url.searchParams.get("error");
                const errorDesc = url.searchParams.get("error_description");
                if (errorCode) {
                    const message = errorDesc
                        ? decodeURIComponent(errorDesc.replace(/\+/g, " "))
                        : errorCode;
                    toast.error("فشل تسجيل الدخول: " + message);
                    navigate({ to: "/auth" });
                    return;
                }

                // 2. التحقق من وجود code (PKCE flow)
                const code = url.searchParams.get("code");
                if (!code) {
                    // لا يوجد code ولا error → ربما وصل المستخدم مباشرةً للصفحة
                    navigate({ to: "/auth" });
                    return;
                }

                // 3. استبدال الكود بجلسة
                const { data, error } = await supabase.auth.exchangeCodeForSession(
                    window.location.href
                );

                if (error) {
                    // معالجة حالة انتهاء صلاحية OAuth state بشكل خاص
                    if (
                        error.message?.includes("expired") ||
                        error.message?.includes("flow state") ||
                        error.message?.includes("code verifier")
                    ) {
                        toast.error(
                            "انتهت صلاحية جلسة تسجيل الدخول. يرجى المحاولة مرة أخرى."
                        );
                    } else {
                        toast.error("فشل تسجيل الدخول: " + error.message);
                    }
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
                console.error("[AuthCallback] unexpected error:", err);
                toast.error("حدث خطأ غير متوقع أثناء تسجيل الدخول");
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