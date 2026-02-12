"use client";

import { motion } from "framer-motion";
import { RotateCcw, ZoomIn, ZoomOut, Maximize2, Box, Move } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThreeViewerPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl gradient-border",
        className
      )}
    >
      {/* Viewer area */}
      <div className="flex aspect-square items-center justify-center bg-card/50 backdrop-blur-sm lg:aspect-[4/3]">
        {/* Animated 3D model placeholder */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{
              rotateY: [0, 360],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ perspective: 800 }}
          >
            <Box className="h-24 w-24 text-accent/30 md:h-32 md:w-32" />
          </motion.div>

          <div className="flex flex-col items-center gap-1">
            <motion.div
              className="flex items-center gap-2"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-sm font-medium text-muted-foreground">
                3D Model Hazir
              </span>
            </motion.div>
            <span className="text-xs text-muted-foreground/60">
              Surukle & birak ile dondur | Scroll ile yaklas
            </span>
          </div>
        </div>

        {/* Orbit rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute h-48 w-48 rounded-full border border-dashed border-accent/10 md:h-64 md:w-64"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute h-72 w-72 rounded-full border border-dashed border-accent/5 md:h-96 md:w-96"
          />
        </div>
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-card/90 px-2 py-1.5 backdrop-blur-sm">
        {[
          { icon: RotateCcw, label: "Sifirla" },
          { icon: ZoomIn, label: "Yakinlastir" },
          { icon: ZoomOut, label: "Uzaklastir" },
          { icon: Move, label: "Tasi" },
          { icon: Maximize2, label: "Tam ekran" },
        ].map((control) => (
          <button
            key={control.label}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={control.label}
          >
            <control.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
