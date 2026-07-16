import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wallet, ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const googleClicking = useRef(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  const handle = async (mode: "in" | "up") => {
    if (!email || password.length < 6) {
      toast.error("أدخل بريداً صحيحاً وكلمة مرور لا تقل عن 6 أحرف");
      return;
    }
    if (mode === "up" && password !== confirmPassword) {
      toast.error("كلمة المرور وتأكيدها غير متطابقتين");
      return;
    }
    setBusy(true);
    const { error } = mode === "in"
      ? await signIn(email, password, rememberMe)
      : await signUp(email, password);
    setBusy(false);
    if (error) toast.error(error);
    else if (mode === "up") toast.success("تم إنشاء الحساب! يمكنك تسجيل الدخول الآن.");
    else navigate({ to: "/app" });
  };

  const handleGoogle = async () => {
    if (googleClicking.current) return;
    googleClicking.current = true;
    setGoogleBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) {
        toast.error("فشل تسجيل الدخول بحساب جوجل: " + error.message);
        setGoogleBusy(false);
        googleClicking.current = false;
      }
    } catch {
      toast.error("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      setGoogleBusy(false);
      googleClicking.current = false;
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast.error("أدخل بريدك الإلكتروني أولاً");
      return;
    }
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setForgotBusy(false);
    if (error) {
      toast.error("تعذّر الإرسال: " + error.message);
    } else {
      setForgotSent(true);
    }
  };

  // ─── شاشة نسيت كلمة السر ────────────────────────────────────────────
  if (forgotMode) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <button
            onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); }}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-6 text-sm"
          >
            <ArrowLeft className="size-4 rotate-180" /> العودة لتسجيل الدخول
          </button>

          <div className="text-center mb-6">
            <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur mb-3 shadow-glow">
              <Mail className="size-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">إعادة تعيين كلمة المرور</h1>
            <p className="text-white/80 text-sm mt-1">سنرسل لك رابطاً على بريدك الإلكتروني</p>
          </div>

          <Card className="p-6 shadow-elevated">
            {forgotSent ? (
              <div className="text-center py-4">
                <div className="size-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-3">
                  <Mail className="size-7 text-success" />
                </div>
                <p className="font-bold text-foreground mb-1">تم الإرسال!</p>
                <p className="text-sm text-muted-foreground">
                  تحقّق من بريدك الإلكتروني واتّبع الرابط لإعادة تعيين كلمة المرور.
                </p>
                <Button
                  className="mt-4 w-full bg-gradient-primary text-primary-foreground"
                  onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); }}
                >
                  العودة لتسجيل الدخول
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">البريد الإلكتروني</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    dir="ltr"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                  />
                </div>
                <Button
                  className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
                  disabled={forgotBusy}
                  onClick={handleForgotPassword}
                >
                  {forgotBusy ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : "إرسال رابط الاستعادة"}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ─── شاشة تسجيل الدخول الرئيسية ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 text-white/90 hover:text-white mb-6 text-sm">
          <ArrowLeft className="size-4 rotate-180" /> العودة للرئيسية
        </Link>

        <div className="text-center mb-6">
          <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur mb-3 shadow-glow">
            <Wallet className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">مرحباً بك في دفترك</h1>
          <p className="text-white/80 text-sm mt-1">إدارة ديونك ومصاريفك بكل احترافية</p>
        </div>

        <Card className="p-6 shadow-elevated">
          {/* Google */}
          <Button
            type="button"
            variant="outline"
            className="w-full mb-4 h-11 font-semibold"
            disabled={busy || googleBusy}
            onClick={handleGoogle}
          >
            {googleBusy ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <GoogleIcon />
            )}
            {googleBusy ? "جاري التوجيه إلى Google..." : "المتابعة باستخدام Google"}
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-card px-2 text-muted-foreground">أو</span>
            </div>
          </div>

          <Tabs defaultValue="in" className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="in">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="up">إنشاء حساب</TabsTrigger>
            </TabsList>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  onKeyDown={(e) => e.key === "Enter" && handle("in")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="pw"
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pe-10"
                    onKeyDown={(e) => e.key === "Enter" && handle("in")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* تسجيل الدخول */}
            <TabsContent value="in" className="mt-4 space-y-3">
              {/* تذكرني + نسيت كلمة السر */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-border accent-primary size-4"
                  />
                  <span className="text-muted-foreground">تذكرني</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); setForgotMode(true); }}
                  className="text-primary hover:underline font-medium"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              <Button
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
                disabled={busy}
                onClick={() => handle("in")}
              >
                {busy ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : "تسجيل الدخول"}
              </Button>
            </TabsContent>

            {/* إنشاء حساب */}
            <TabsContent value="up" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="confirm-pw">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="confirm-pw"
                    type={showConfirmPassword ? "text" : "password"}
                    dir="ltr"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pe-10"
                    onKeyDown={(e) => e.key === "Enter" && handle("up")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
                disabled={busy}
                onClick={() => handle("up")}
              >
                {busy ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : "إنشاء حساب جديد"}
              </Button>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.7 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.5 35.5 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
