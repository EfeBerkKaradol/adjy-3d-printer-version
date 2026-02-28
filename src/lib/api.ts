// ==========================================
// API HELPER FONKSİYONLARI
// Frontend'den backend API'ye istek atmak için
// kullanılan yardımcı fonksiyonlar.
//
// Bu dosya hem Server Component hem de Client Component
// tarafından kullanılabilir.
// ==========================================

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

// ==========================================
// Genel fetch wrapper — hata yönetimi dahil
// ==========================================
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Bir hata oluştu");
  }

  return data as T;
}

// ==========================================
// ÜRÜNLER
// ==========================================

export interface ProductsResponse {
  products: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    basePrice: number;
    thumbnailUrl: string | null;
    featured: boolean;
    category: { id: string; name: string; slug: string };
    _count: { reviews: number };
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters?: {
    materials: string[];
  };
}

export interface ProductDetailResponse {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    basePrice: number;
    thumbnailUrl: string | null;
    modelFileUrl: string | null;
    gallery: string[] | null;
    printTimeEst: number | null;
    materialType: string | null;
    materialWeight: number | null;
    featured: boolean;
    category: { id: string; name: string; slug: string };
    parameters: Array<{
      id: string;
      name: string;
      displayName: string;
      type: string;
      minValue: number | null;
      maxValue: number | null;
      defaultValue: string;
      step: number | null;
      unit: string | null;
      affectsPrice: boolean;
      priceFormula: string | null;
      affectsGeometry: boolean;
      sortOrder: number;
    }>;
    reviews: {
      averageRating: number;
      totalCount: number;
    };
  };
}

export interface CategoriesResponse {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    children: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
    _count: { products: number };
  }>;
}

// Ürünleri listele (filtre ve sayfalama destekli)
export function getProducts(params?: {
  category?: string;
  featured?: boolean;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.featured) searchParams.set("featured", "true");
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sort) searchParams.set("sort", params.sort);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const qs = searchParams.toString();
  return fetchAPI<ProductsResponse>(`/api/products${qs ? `?${qs}` : ""}`);
}

// Tek ürün detayı getir
export function getProductBySlug(slug: string) {
  return fetchAPI<ProductDetailResponse>(`/api/products/${slug}`);
}

// Tek ürün detayı ID ile getir (customize sayfası için)
export function getProductById(id: string) {
  return fetchAPI<ProductDetailResponse>(`/api/products/${id}?byId=true`);
}

// Kategorileri listele
export function getCategories() {
  return fetchAPI<CategoriesResponse>("/api/categories");
}

// ==========================================
// AUTH
// ==========================================

export function registerUser(data: {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}) {
  return fetchAPI<{ message: string; user: { id: string; email: string } }>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}
