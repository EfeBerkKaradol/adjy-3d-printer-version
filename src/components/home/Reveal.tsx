"use client";

import { motion, useReducedMotion } from "framer-motion";

// ==========================================
// GÖRÜNÜME GİRİŞ
// Sayfadaki tek giriş animasyonu. Her bölüm kendi
// animasyonunu icat etmesin diye tek yerde tanımlı:
// kısa, aşağıdan yukarı, bir kez.
// Hareket azaltma açıksa hiçbir şey animasyonlanmaz.
// ==========================================

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Aynı grup içinde kademeli giriş için sıra numarası */
  index?: number;
  as?: "div" | "li" | "article" | "section";
}

export function Reveal({ children, className, index = 0, as = "div" }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as];

  if (reduceMotion) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        delay: Math.min(index, 4) * 0.07,
      }}
    >
      {children}
    </MotionTag>
  );
}
