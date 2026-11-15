"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useMediaQuery } from "@/hooks/useClientState";
import { cn } from "@/lib/utils";

// ==========================================
// DOCK — macOS Dock büyütmesi
//
// İmleç dock'un üstünde gezerken her öğe imlece olan
// uzaklığına göre büyür; en yakın olan en çok. Öğe yalnızca
// ölçeklenmez, kapladığı genişlik de artar — komşular yana
// itilir, tıpkı Mac'teki gibi. İmleç ayrılınca hepsi yaylı
// bir hareketle eski boyutuna döner.
//
// Dokunmatik ekranlarda ve "hareketi azalt" açıkken büyütme
// yoktur: imleç yoksa büyütmenin de anlamı yok.
// ==========================================

/** İmlecin etkilediği yarıçap (px) */
const ETKI = 130;
/** En yakın öğenin ulaştığı ölçek */
const AZAMI = 1.32;

const DockContext = createContext<MotionValue<number> | null>(null);

interface DockProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Dock({ children, className, ...rest }: DockProps) {
  const mouseX = useMotionValue(Infinity);

  return (
    <DockContext.Provider value={mouseX}>
      <div
        {...rest}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse") mouseX.set(e.clientX);
        }}
        onPointerLeave={() => mouseX.set(Infinity)}
        className={cn("adjy-glass flex items-center", className)}
      >
        {children}
      </div>
    </DockContext.Provider>
  );
}

interface DockItemProps {
  children: React.ReactNode;
  className?: string;
  /** Bu öğe ne kadar büyüsün — metin etiketleri ikonlardan az büyür */
  max?: number;
}

export function DockItem({ children, className, max = AZAMI }: DockItemProps) {
  const mouseX = useContext(DockContext);
  // framer-motion'ın useReducedMotion'ı sunucuda null, istemcide ilk
  // render'da gerçek değeri verir → hidrasyon uyuşmazlığı. Bu kanca
  // hidrasyonda sunucuyla aynı (false) başlar, sonra gerçek değere geçer.
  const reduce = useMediaQuery("(prefers-reduced-motion: reduce)");
  const ref = useRef<HTMLDivElement>(null);
  const [base, setBase] = useState(0);

  // Büyümemiş genişlik — içerik ölçeklense de offsetWidth değişmez
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const olc = () => setBase(el.offsetWidth);
    olc();
    const ro = new ResizeObserver(olc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fallback = useMotionValue(Infinity);
  const distance = useTransform(mouseX ?? fallback, (x) => {
    const el = ref.current;
    if (!el || !Number.isFinite(x)) return ETKI;
    const r = el.getBoundingClientRect();
    return x - (r.left + r.width / 2);
  });

  const hedef = useTransform(distance, [-ETKI, 0, ETKI], [1, max, 1], {
    clamp: true,
  });
  const scale = useSpring(hedef, { mass: 0.1, stiffness: 170, damping: 14 });
  // Büyüyen öğe komşularını iter: fazladan genişliğin yarısı her iki yana
  const margin = useTransform(scale, (s) => (base * (s - 1)) / 2);
  // Hafifçe aşağı süzülür — dock üstte olduğu için ekrandan uzağa doğru
  const y = useTransform(scale, (s) => (s - 1) * 14);

  // Hareket azaltmada da AYNI iki katman çizilir, yalnızca hareket
  // değerleri bağlanmaz: yapı sunucu çıktısıyla aynı kalır ve tercih
  // sonradan öğrenilince içerik (menüler, düğmeler) yeniden kurulmaz.
  return (
    <motion.div
      style={reduce ? undefined : { marginLeft: margin, marginRight: margin }}
      className={cn("relative shrink-0", className)}
    >
      <motion.div
        ref={ref}
        style={reduce ? undefined : { scale, y }}
        className={cn("origin-center", !reduce && "will-change-transform")}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Dock bölümleri arasındaki ince dikey ayraç */
export function DockDivider({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mx-1.5 h-7 w-px shrink-0 bg-foreground/15 dark:bg-white/15",
        className
      )}
    />
  );
}
