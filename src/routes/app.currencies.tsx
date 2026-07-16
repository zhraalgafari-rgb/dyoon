import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Loader2, Coins } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/currencies")({ component: CurrenciesPage });

interface Currency { id: string; name: string; symbol: string; rate: number; is_base: boolean }

function CurrenciesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("currencies").select("*").order("created_at");
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error("أدخل اسم العملة"); return; }
    setBusy(true);
    const { error } = await supabase.from("currencies").insert({
      user_id: user.id, name: name.trim(), symbol: symbol.trim(), rate: 1, is_base: false,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setName(""); setSymbol("");
    toast.success("تمت إضافة العملة");
    load();
  };

  const del = async (id: string) => {
    if (!confirm("حذف العملة؟ لن يتم الحذف إذا كانت مستخدمة في معاملات.")) return;
    const { error } = await supabase.from("currencies").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="size-10 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
          <Coins className="size-5" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">العملات</h1>
          <p className="text-xs text-muted-foreground">أضف العملات التي تتعامل بها</p>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm">إضافة عملة جديدة</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">اسم العملة</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: ريال يمني" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">الرمز (اختياري)</Label>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="مثلاً: ر.ي" />
          </div>
        </div>
        <Button onClick={add} disabled={busy} className="w-full bg-gradient-primary text-primary-foreground">
          <Plus className="size-4" /> إضافة
        </Button>
      </Card>

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="size-5 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="bg-card border rounded-2xl p-3 shadow-card flex items-center gap-3">
              <div className="size-10 rounded-xl bg-secondary text-primary font-bold flex items-center justify-center shadow-sm">
                {c.symbol || c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">
                  {c.name}
                </div>
              </div>
              <button onClick={() => del(c.id)} className="text-muted-foreground hover:text-danger p-2 bg-danger/5 rounded-lg transition-colors">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
