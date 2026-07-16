import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallback });

function AuthCallback() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    useEffect(() => {
        const url = new URL(window.location.href);
        const errorCode = url.searchParams.get("error");
        const errorDesc = url.searchParams.get("error_description");
        
        if (errorCode) {
            const message = errorDesc
                ? decodeURIComponent(errorDesc.replace(/\+/g, " "))
                : errorCode;
            toast.error("فشل تسجيل الدخول: " + message);
            navigate({ to: "/auth", replace: true });
            return;
        }

        if (!loading) {
            if (user) {
                toast.success("تم تسجيل الدخول بنجاح!");
                navigate({ to: "/app", replace: true });
            } else {
                const hash = url.hash;
                const code = url.searchParams.get("code");
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