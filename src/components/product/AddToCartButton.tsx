"use client";

import { Button } from "@/components/ui/button";
import { ShoppingCart, Check } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useState, useRef, useCallback } from "react";

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    basePrice: number;
    thumbnailUrl: string | null;
  };
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);
  const [flyingItems, setFlyingItems] = useState<{ id: number; x: number; y: number }[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const triggerFlyAnimation = useCallback(() => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const cartIcon = document.querySelector("[data-cart-icon]");
    if (!cartIcon) return;

    const cartRect = cartIcon.getBoundingClientRect();

    const startX = buttonRect.left + buttonRect.width / 2;
    const startY = buttonRect.top + buttonRect.height / 2;
    const endX = cartRect.left + cartRect.width / 2;
    const endY = cartRect.top + cartRect.height / 2;

    const flyId = Date.now();

    // Create the flying element
    const flyEl = document.createElement("div");
    flyEl.className = "fly-to-cart-item";
    flyEl.style.cssText = `
      position: fixed;
      z-index: 9999;
      left: ${startX}px;
      top: ${startY}px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: hsl(var(--primary));
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      box-shadow: 0 4px 12px hsl(var(--primary) / 0.4);
      transition: all 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      opacity: 1;
      transform: scale(1);
    `;

    // Add SVG icon inside
    flyEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary-foreground))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`;

    document.body.appendChild(flyEl);

    // Trigger animation after paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flyEl.style.left = `${endX}px`;
        flyEl.style.top = `${endY}px`;
        flyEl.style.transform = "scale(0.3)";
        flyEl.style.opacity = "0.4";
      });
    });

    // Cleanup + trigger cart badge bounce
    setTimeout(() => {
      flyEl.remove();
      // Trigger badge bounce
      const badge = document.querySelector("[data-cart-badge]");
      if (badge) {
        badge.classList.remove("animate-cart-bounce");
        void (badge as HTMLElement).offsetWidth; // force reflow
        badge.classList.add("animate-cart-bounce");
      }
    }, 700);
  }, []);

  function handleAddToCart() {
    addItem({
      product: {
        id: product.id,
        name: product.name,
        basePrice: Number(product.basePrice),
        thumbnailUrl: product.thumbnailUrl,
      },
      customization: null,
      quantity: 1,
      calculatedPrice: Number(product.basePrice),
    });

    triggerFlyAnimation();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <Button
      ref={buttonRef}
      size="lg"
      className="w-full text-base gap-2"
      onClick={handleAddToCart}
      disabled={added}
    >
      {added ? (
        <>
          <Check className="h-5 w-5" />
          Sepete Eklendi
        </>
      ) : (
        <>
          <ShoppingCart className="h-5 w-5" />
          Sepete Ekle
        </>
      )}
    </Button>
  );
}
