"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Loader2,
  Settings2,
  X,
  Pencil,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";

// ===== Types =====

interface Parameter {
  id: string;
  name: string;
  displayName: string;
  type: ParameterType;
  minValue: number | null;
  maxValue: number | null;
  defaultValue: string;
  step: number | null;
  unit: string | null;
  affectsPrice: boolean;
  priceFormula: string | null;
  affectsGeometry: boolean;
  validationRules: {
    options?: string[];
    maxLength?: number;
    minLength?: number;
  } | null;
  sortOrder: number;
}

type ParameterType = "SLIDER" | "DROPDOWN" | "COLOR" | "TEXT" | "NUMBER";

interface ParameterForm {
  name: string;
  displayName: string;
  type: ParameterType;
  minValue: string;
  maxValue: string;
  defaultValue: string;
  step: string;
  unit: string;
  affectsPrice: boolean;
  priceFormula: string;
  affectsGeometry: boolean;
  options: string[];
  maxLength: string;
  minLength: string;
}

const EMPTY_FORM: ParameterForm = {
  name: "",
  displayName: "",
  type: "SLIDER",
  minValue: "",
  maxValue: "",
  defaultValue: "",
  step: "",
  unit: "",
  affectsPrice: false,
  priceFormula: "",
  affectsGeometry: true,
  options: [],
  maxLength: "",
  minLength: "",
};

const TYPE_LABELS: Record<ParameterType, string> = {
  SLIDER: "Kaydırıcı",
  DROPDOWN: "Açılır Menü",
  COLOR: "Renk",
  TEXT: "Metin",
  NUMBER: "Sayı",
};

const TYPE_COLORS: Record<ParameterType, string> = {
  SLIDER: "bg-blue-100 text-blue-700",
  DROPDOWN: "bg-purple-100 text-purple-700",
  COLOR: "bg-pink-100 text-pink-700",
  TEXT: "bg-gray-100 text-gray-700",
  NUMBER: "bg-green-100 text-green-700",
};

// ===== Formula Tester =====

function evaluateFormula(
  formula: string,
  base: number,
  value: number
): number | null {
  try {
    const expression = formula
      .replace(/\bbase\b/g, String(base))
      .replace(/\bvalue\b/g, String(value));

    if (!/^[\d+\-*/().\s]+$/.test(expression)) return null;

    const fn = new Function(`"use strict"; return (${expression});`);
    const result = fn();
    if (typeof result !== "number" || !isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

// ===== Component =====

interface ParameterManagerProps {
  productId: string;
}

export function ParameterManager({ productId }: ParameterManagerProps) {
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<ParameterForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [newOption, setNewOption] = useState("");

  // Formula test state
  const [testBase, setTestBase] = useState("100");
  const [testValue, setTestValue] = useState("200");

  const fetchParameters = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/products/${productId}/parameters`
      );
      if (res.ok) {
        const data = await res.json();
        setParameters(data.parameters);
      }
    } catch {
      toast.error("Parametreler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchParameters();
  }, [fetchParameters]);

  // ===== Form Helpers =====

  function parameterToForm(p: Parameter): ParameterForm {
    return {
      name: p.name,
      displayName: p.displayName,
      type: p.type,
      minValue: p.minValue != null ? String(p.minValue) : "",
      maxValue: p.maxValue != null ? String(p.maxValue) : "",
      defaultValue: p.defaultValue,
      step: p.step != null ? String(p.step) : "",
      unit: p.unit || "",
      affectsPrice: p.affectsPrice,
      priceFormula: p.priceFormula || "",
      affectsGeometry: p.affectsGeometry,
      options: p.validationRules?.options || [],
      maxLength:
        p.validationRules?.maxLength != null
          ? String(p.validationRules.maxLength)
          : "",
      minLength:
        p.validationRules?.minLength != null
          ? String(p.validationRules.minLength)
          : "",
    };
  }

  function formToPayload(f: ParameterForm) {
    const payload: Record<string, unknown> = {
      name: f.name,
      displayName: f.displayName,
      type: f.type,
      defaultValue: f.defaultValue,
      affectsPrice: f.affectsPrice,
      affectsGeometry: f.affectsGeometry,
      priceFormula:
        f.affectsPrice && f.priceFormula ? f.priceFormula : null,
    };

    if (f.type === "SLIDER" || f.type === "NUMBER") {
      payload.minValue = f.minValue ? Number(f.minValue) : null;
      payload.maxValue = f.maxValue ? Number(f.maxValue) : null;
      payload.step = f.step ? Number(f.step) : null;
      payload.unit = f.unit || null;
    } else {
      payload.minValue = null;
      payload.maxValue = null;
      payload.step = null;
    }

    if (f.type === "DROPDOWN") {
      payload.unit = f.unit || null;
      payload.validationRules = { options: f.options };
    } else if (f.type === "TEXT") {
      const rules: Record<string, number> = {};
      if (f.maxLength) rules.maxLength = Number(f.maxLength);
      if (f.minLength) rules.minLength = Number(f.minLength);
      payload.validationRules =
        Object.keys(rules).length > 0 ? rules : null;
    } else {
      payload.validationRules = null;
    }

    return payload;
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setIsAdding(false);
    setNewOption("");
  }

  function handleEdit(p: Parameter) {
    setForm(parameterToForm(p));
    setEditingId(p.id);
    setIsAdding(false);
  }

  function handleAddNew() {
    setForm({
      ...EMPTY_FORM,
      sortOrder:
        parameters.length > 0
          ? Math.max(...parameters.map((p) => p.sortOrder)) + 1
          : 0,
    } as ParameterForm);
    setIsAdding(true);
    setEditingId(null);
  }

  // ===== CRUD Operations =====

  async function handleSave() {
    if (!form.name || !form.displayName) {
      toast.error("Ad ve görüntüleme adı zorunludur");
      return;
    }

    if (form.type === "DROPDOWN" && form.options.length < 2) {
      toast.error("Açılır menü için en az 2 seçenek gereklidir");
      return;
    }

    setSaving(true);
    const payload = formToPayload(form);

    // sortOrder ekle (yeni ekleme için)
    if (isAdding) {
      payload.sortOrder =
        parameters.length > 0
          ? Math.max(...parameters.map((p) => p.sortOrder)) + 1
          : 0;
    }

    try {
      const url = editingId
        ? `/api/admin/products/${productId}/parameters/${editingId}`
        : `/api/admin/products/${productId}/parameters`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "İşlem başarısız");
        return;
      }

      toast.success(
        editingId ? "Parametre güncellendi" : "Parametre oluşturuldu"
      );
      resetForm();
      fetchParameters();
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm("Bu parametreyi silmek istediğinize emin misiniz?")
    )
      return;

    try {
      const res = await fetch(
        `/api/admin/products/${productId}/parameters/${id}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Silme başarısız");
        return;
      }

      toast.success("Parametre silindi");
      if (editingId === id) resetForm();
      fetchParameters();
    } catch {
      toast.error("Silme sırasında hata oluştu");
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const idx = parameters.findIndex((p) => p.id === id);
    if (idx < 0) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= parameters.length) return;

    const updated = [...parameters];
    const tempSort = updated[idx].sortOrder;
    updated[idx] = {
      ...updated[idx],
      sortOrder: updated[swapIdx].sortOrder,
    };
    updated[swapIdx] = { ...updated[swapIdx], sortOrder: tempSort };

    // Optimistic update
    updated.sort((a, b) => a.sortOrder - b.sortOrder);
    setParameters(updated);

    try {
      await fetch(`/api/admin/products/${productId}/parameters`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orders: [
            { id: updated[idx].id, sortOrder: updated[idx].sortOrder },
            {
              id: updated[swapIdx].id,
              sortOrder: updated[swapIdx].sortOrder,
            },
          ],
        }),
      });
    } catch {
      fetchParameters();
    }
  }

  // ===== Param Summary =====

  function getParamSummary(p: Parameter): string {
    switch (p.type) {
      case "SLIDER":
      case "NUMBER":
        return `${p.minValue ?? "?"}-${p.maxValue ?? "?"}${p.unit ? ` ${p.unit}` : ""}, adım: ${p.step ?? 1}`;
      case "DROPDOWN":
        return `${p.validationRules?.options?.length ?? 0} seçenek`;
      case "COLOR":
        return `Varsayılan: ${p.defaultValue}`;
      case "TEXT":
        return p.validationRules?.maxLength
          ? `Max ${p.validationRules.maxLength} karakter`
          : "Serbest metin";
      default:
        return "";
    }
  }

  // ===== Options Editor =====

  function handleAddOption() {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (form.options.includes(trimmed)) {
      toast.error("Bu seçenek zaten var");
      return;
    }
    setForm((f) => ({ ...f, options: [...f.options, trimmed] }));
    setNewOption("");
  }

  function handleRemoveOption(option: string) {
    setForm((f) => ({
      ...f,
      options: f.options.filter((o) => o !== option),
    }));
  }

  // ===== Render =====

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showsNumericFields =
    form.type === "SLIDER" || form.type === "NUMBER";
  const showsOptions = form.type === "DROPDOWN";
  const showsTextRules = form.type === "TEXT";
  const showsColorPicker = form.type === "COLOR";

  return (
    <div className="space-y-4">
      {/* Parametre Listesi */}
      {parameters.length === 0 && !isAdding && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Henüz parametre eklenmemiş
        </div>
      )}

      {parameters.map((p, idx) => (
        <div key={p.id}>
          {/* Collapsed Card */}
          {editingId !== p.id && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border/30 bg-background/50 hover:bg-background/80 transition-colors">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleReorder(p.id, "up")}
                  disabled={idx === 0}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-20"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleReorder(p.id, "down")}
                  disabled={idx === parameters.length - 1}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-20"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {p.displayName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({p.name})
                  </span>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TYPE_COLORS[p.type]}`}
                  >
                    {TYPE_LABELS[p.type]}
                  </span>
                  {p.affectsPrice && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1"
                    >
                      ₺
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getParamSummary(p)}
                </p>
              </div>

              {/* Actions */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleEdit(p)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(p.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Expanded Edit Form */}
          {editingId === p.id && renderForm("Parametre Düzenle")}
        </div>
      ))}

      {/* Add New Form */}
      {isAdding && renderForm("Yeni Parametre")}

      {/* Add Button */}
      {!isAdding && !editingId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddNew}
          className="gap-1.5 w-full"
        >
          <Plus className="h-3.5 w-3.5" /> Parametre Ekle
        </Button>
      )}
    </div>
  );

  // ===== Form Renderer =====

  function renderForm(title: string) {
    return (
      <div className="border border-primary/20 rounded-lg p-4 bg-primary/5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">{title}</h4>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={resetForm}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Row 1: Name + Display Name + Type */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block">
              Ad Teknik *
            </label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="height"
              className="text-sm h-8"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">
              Görüntüleme Adı *
            </label>
            <Input
              value={form.displayName}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  displayName: e.target.value,
                }))
              }
              placeholder="Yükseklik"
              className="text-sm h-8"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">
              Tip
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as ParameterType,
                  // Tip değişince ilgili alanları sıfırla
                  options:
                    e.target.value === "DROPDOWN" ? f.options : [],
                  minValue:
                    e.target.value === "SLIDER" ||
                    e.target.value === "NUMBER"
                      ? f.minValue
                      : "",
                  maxValue:
                    e.target.value === "SLIDER" ||
                    e.target.value === "NUMBER"
                      ? f.maxValue
                      : "",
                }))
              }
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              {(
                Object.entries(TYPE_LABELS) as [
                  ParameterType,
                  string,
                ][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Numeric fields (SLIDER/NUMBER) */}
        {showsNumericFields && (
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">
                Min
              </label>
              <Input
                type="number"
                value={form.minValue}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    minValue: e.target.value,
                  }))
                }
                placeholder="0"
                className="text-sm h-8"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">
                Max
              </label>
              <Input
                type="number"
                value={form.maxValue}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    maxValue: e.target.value,
                  }))
                }
                placeholder="300"
                className="text-sm h-8"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">
                Adım
              </label>
              <Input
                type="number"
                step="any"
                value={form.step}
                onChange={(e) =>
                  setForm((f) => ({ ...f, step: e.target.value }))
                }
                placeholder="1"
                className="text-sm h-8"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">
                Birim
              </label>
              <Input
                value={form.unit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit: e.target.value }))
                }
                placeholder="mm"
                className="text-sm h-8"
              />
            </div>
          </div>
        )}

        {/* DROPDOWN: Unit + Options Editor */}
        {showsOptions && (
          <div className="space-y-3">
            <div className="w-1/3">
              <label className="text-xs font-medium mb-1 block">
                Birim
              </label>
              <Input
                value={form.unit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit: e.target.value }))
                }
                placeholder="opsiyonel"
                className="text-sm h-8"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">
                Seçenekler *
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.options.map((opt) => (
                  <span
                    key={opt}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium"
                  >
                    {opt}
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(opt)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {form.options.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Henüz seçenek yok
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                  placeholder="Yeni seçenek..."
                  className="text-sm h-8 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={handleAddOption}
                >
                  Ekle
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TEXT: min/maxLength */}
        {showsTextRules && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">
                Min Karakter
              </label>
              <Input
                type="number"
                value={form.minLength}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    minLength: e.target.value,
                  }))
                }
                placeholder="0"
                className="text-sm h-8"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">
                Max Karakter
              </label>
              <Input
                type="number"
                value={form.maxLength}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    maxLength: e.target.value,
                  }))
                }
                placeholder="100"
                className="text-sm h-8"
              />
            </div>
          </div>
        )}

        {/* Default Value */}
        <div>
          <label className="text-xs font-medium mb-1 block">
            Varsayılan Değer
          </label>
          {showsColorPicker ? (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.defaultValue || "#FFFFFF"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    defaultValue: e.target.value,
                  }))
                }
                className="h-8 w-12 rounded border border-border cursor-pointer"
              />
              <Input
                value={form.defaultValue}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    defaultValue: e.target.value,
                  }))
                }
                placeholder="#FFFFFF"
                className="text-sm h-8 flex-1"
              />
            </div>
          ) : showsOptions ? (
            <select
              value={form.defaultValue}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  defaultValue: e.target.value,
                }))
              }
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Seçin...</option>
              {form.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <Input
              type={showsNumericFields ? "number" : "text"}
              value={form.defaultValue}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  defaultValue: e.target.value,
                }))
              }
              placeholder={showsNumericFields ? "200" : "Varsayılan..."}
              className="text-sm h-8"
            />
          )}
        </div>

        {/* Checkboxes */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={form.affectsPrice}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  affectsPrice: e.target.checked,
                }))
              }
              className="rounded"
            />
            Fiyatı etkiler
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={form.affectsGeometry}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  affectsGeometry: e.target.checked,
                }))
              }
              className="rounded"
            />
            Geometriyi etkiler
          </label>
        </div>

        {/* Price Formula */}
        {form.affectsPrice && (
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium mb-1 block">
                Fiyat Formülü
              </label>
              <Input
                value={form.priceFormula}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priceFormula: e.target.value,
                  }))
                }
                placeholder="base * (value / 200)"
                className="text-sm h-8 font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Kullanılabilir: <code>base</code> (baz fiyat),{" "}
                <code>value</code> (parametre değeri). Örn:{" "}
                <code>base * (value / 200)</code>
              </p>
            </div>

            {/* Formula Tester */}
            {form.priceFormula && (
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50 text-xs">
                <FlaskConical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Test:</span>
                <Input
                  type="number"
                  value={testBase}
                  onChange={(e) => setTestBase(e.target.value)}
                  className="h-6 w-20 text-xs"
                  placeholder="base"
                />
                <span className="text-muted-foreground">₺,</span>
                <Input
                  type="number"
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  className="h-6 w-20 text-xs"
                  placeholder="value"
                />
                <span className="text-muted-foreground">=</span>
                <span className="font-semibold">
                  {(() => {
                    const result = evaluateFormula(
                      form.priceFormula,
                      Number(testBase) || 0,
                      Number(testValue) || 0
                    );
                    return result != null
                      ? `${result} ₺`
                      : "Hata";
                  })()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Save / Cancel */}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {editingId ? "Güncelle" : "Ekle"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetForm}
          >
            İptal
          </Button>
        </div>
      </div>
    );
  }
}
