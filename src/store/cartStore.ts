import { create } from "zustand";

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
  calculatedPrice: number; // parametrelere göre hesaplanmış birim fiyat
}

interface CartData {
  items: CartItemState[];
}

interface CartStore {
  items: CartItemState[];
  currentUserId: string | null;
  addItem: (item: Omit<CartItemState, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
  switchUser: (userId: string | null) => void;
}

// localStorage key hesaplama
function getStorageKey(userId: string | null): string {
  return userId ? `adjy-cart-${userId}` : "adjy-cart-guest";
}

// localStorage'dan sepet yükleme
function loadCart(userId: string | null): CartItemState[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const data: CartData = JSON.parse(raw);
    return (data.items || []).map((item) => ({
      ...item,
      // Eski format uyumluluğu: calculatedPrice yoksa basePrice kullan
      calculatedPrice: item.calculatedPrice ?? item.product.basePrice,
    }));
  } catch {
    return [];
  }
}

// localStorage'a sepet kaydetme
function saveCart(userId: string | null, items: CartItemState[]): void {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(userId);
    const data: CartData = { items };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage dolu veya erişilemez
  }
}

export const useCartStore = create<CartStore>()((set, get) => ({
  items: [],
  currentUserId: null,

  addItem: (item) => {
    const id = crypto.randomUUID();
    set((state) => {
      const newItems = [...state.items, { ...item, id }];
      saveCart(state.currentUserId, newItems);
      return { items: newItems };
    });
  },

  removeItem: (id) => {
    set((state) => {
      const newItems = state.items.filter((item) => item.id !== id);
      saveCart(state.currentUserId, newItems);
      return { items: newItems };
    });
  },

  updateQuantity: (id, quantity) => {
    set((state) => {
      const newItems = state.items.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
      );
      saveCart(state.currentUserId, newItems);
      return { items: newItems };
    });
  },

  clearCart: () => {
    const { currentUserId } = get();
    saveCart(currentUserId, []);
    set({ items: [] });
  },

  totalItems: () =>
    get().items.reduce((sum, item) => sum + item.quantity, 0),

  totalPrice: () =>
    get().items.reduce(
      (sum, item) => sum + item.calculatedPrice * item.quantity,
      0
    ),

  // Kullanıcı değiştiğinde çağrılır (login/logout)
  switchUser: (userId) => {
    const currentState = get();

    // Login: guest → authenticated user geçişi
    if (userId && !currentState.currentUserId) {
      const guestItems = currentState.items;
      const userItems = loadCart(userId);

      // Guest sepetindeki ürünleri kullanıcı sepetine merge et
      // Aynı ürün + customization varsa miktarları topla, yoksa ekle
      const mergedItems = [...userItems];
      for (const guestItem of guestItems) {
        const existingIndex = mergedItems.findIndex(
          (ui) =>
            ui.product.id === guestItem.product.id &&
            ui.customization?.id === guestItem.customization?.id
        );
        if (existingIndex >= 0) {
          mergedItems[existingIndex] = {
            ...mergedItems[existingIndex],
            quantity:
              mergedItems[existingIndex].quantity + guestItem.quantity,
          };
        } else {
          mergedItems.push(guestItem);
        }
      }

      // Merge'lenmiş sepeti kullanıcıya kaydet
      saveCart(userId, mergedItems);
      // Guest sepetini temizle
      saveCart(null, []);
      set({ currentUserId: userId, items: mergedItems });
    } else {
      // Logout veya farklı kullanıcıya geçiş
      saveCart(currentState.currentUserId, currentState.items);
      const newItems = loadCart(userId);
      set({ currentUserId: userId, items: newItems });
    }
  },
}));
