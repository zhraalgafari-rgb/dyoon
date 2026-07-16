import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePromises } from "./usePromises";
import type { PaymentPromise } from "./types";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    personId: string;
    editingPromise?: PaymentPromise | null;
    onSuccess?: () => void;
}

export function PromiseDialog({ open, onOpenChange, personId, editingPromise, onSuccess }: Props) {
    const { createPromise } = usePromises();
    const [submitting, setSubmitting] = useState(false);
    const [amount, setAmount] = useState("");
    const [promiseDate, setPromiseDate] = useState("");
    const [notes, setNotes] = useState("");
    const [errors, setErrors] = useState<{ amount?: string; promiseDate?: string }>({});

    useEffect(() => {
        if (open) {
            if (editingPromise) {
                setAmount(String(editingPromise.amount));
                setPromiseDate(editingPromise.promise_date);
                setNotes(editingPromise.notes || "");
            } else {
                setAmount("");
                setPromiseDate(new Date().toISOString().split("T")[0]);
                setNotes("");
            }
            setErrors({});
        }
    }, [open, editingPromise]);

    const validate = () => {
        const newErrors: { amount?: string; promiseDate?: string } = {};
        const numAmount = parseFloat(amount);
        if (!amount || isNaN(numAmount) || numAmount <= 0) {
            newErrors.amount = "المبلغ مطلوب";
        }
        if (!promiseDate) {
            newErrors.promiseDate = "التاريخ مطلوب";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            await createPromise.mutateAsync({
                person_id: personId,
                amount: parseFloat(amount),
                promise_date: promiseDate,
                notes: notes || undefined,
            });
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            // Error handled by mutation
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingPromise ? "تعديل وعد السداد" : "وعد سداد جديد"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">المبلغ</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="promise_date">تاريخ الوعد</Label>
                        <Input id="promise_date" type="date" value={promiseDate} onChange={(e) => setPromiseDate(e.target.value)} />
                        {errors.promiseDate && <p className="text-xs text-destructive">{errors.promiseDate}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">ملاحظات</Label>
                        <Textarea id="notes" placeholder="ملاحظات اختيارية..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                            إلغاء
                        </Button>
                        <Button type="button" onClick={handleSubmit} disabled={submitting} className="bg-gradient-primary text-primary-foreground">
                            {submitting ? "جاري الحفظ..." : editingPromise ? "تحديث" : "إنشاء"}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
