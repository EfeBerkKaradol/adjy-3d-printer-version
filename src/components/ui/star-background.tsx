"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

interface Star {
    x: number;
    y: number;
    radius: number;
    vx: number;
    vy: number;
    alpha: number;
    targetAlpha: number;
}

export const StarBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const { theme } = useTheme();

    // Mouse position state
    const mouseRef = useRef({ x: 0, y: 0 });
    const starsRef = useRef<Star[]>([]);

    useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setSize({ width, height });
                    initStars(width, height);
                }
            }
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                mouseRef.current = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                };
            }
        };

        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            observer.disconnect();
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    const initStars = (width: number, height: number) => {
        const starCount = Math.floor((width * height) / 4000); // Density based on area
        const newStars: Star[] = [];

        for (let i = 0; i < starCount; i++) {
            newStars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 1.5,
                vx: (Math.random() - 0.5) * 0.2, // Subtle movement
                vy: (Math.random() - 0.5) * 0.2,
                alpha: Math.random(),
                targetAlpha: Math.random(),
            });
        }
        starsRef.current = newStars;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            ctx.clearRect(0, 0, size.width, size.height);

            // Star color based on theme
            const isDark = theme === "dark";
            const starColor = isDark ? "255, 255, 255" : "0, 0, 0";

            starsRef.current.forEach((star) => {
                // Update position
                star.x += star.vx;
                star.y += star.vy;

                // Mouse interaction (Parallax / Avoidance)
                const dx = mouseRef.current.x - star.x;
                const dy = mouseRef.current.y - star.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = 150;

                if (distance < maxDistance) {
                    const force = (maxDistance - distance) / maxDistance;
                    // Gentle push away from mouse
                    star.x -= (dx / distance) * force * 2;
                    star.y -= (dy / distance) * force * 2;
                }

                // Wrap around screen
                if (star.x < 0) star.x = size.width;
                if (star.x > size.width) star.x = 0;
                if (star.y < 0) star.y = size.height;
                if (star.y > size.height) star.y = 0;

                // Twinkle effect
                if (Math.abs(star.alpha - star.targetAlpha) < 0.01) {
                    star.targetAlpha = Math.random();
                }
                star.alpha += (star.targetAlpha - star.alpha) * 0.05;

                // Draw star
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${starColor}, ${star.alpha * 0.5})`; // Base slight transparency
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [size, theme]); // Re-run when size or theme changes

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
        >
            <canvas
                ref={canvasRef}
                width={size.width}
                height={size.height}
                className="absolute top-0 left-0 w-full h-full"
            />
        </div>
    );
};
