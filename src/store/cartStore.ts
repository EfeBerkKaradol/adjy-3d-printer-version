import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartProduct {
  id: string;
  name: string;
  basePrice: number;
  thumbnailUrl: string | null;
}

export interface CartCustomization {
  id: string;
  parameters: Record<string, unknown>;
}

export interface CartItemState {
  id: string;
  product: CartProduct;
  customization: CartCustomization | null;
  quantity: number;
}

interface CartStore {
  items: CartItemState[];
  addItem: (item: Omit<CartItemState, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const id = crypto.randomUUID();
        set((state) => ({
          items: [...state.items, { ...item, id }],
        }));
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      totalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      totalPrice: () =>
        get().items.reduce(
          (sum, item) => sum + item.product.basePrice * item.quantity,
          0
        ),
    }),
    {
      name: "adjy-cart",
    }
  )
);
