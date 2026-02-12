export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  thumbnailUrl: string | null;
  categoryId: string;
  featured: boolean;
}

export interface ProductDetail extends ProductListItem {
  modelFileUrl: string | null;
  gallery: string[] | null;
  printTimeEst: number | null;
  materialType: string | null;
  materialWeight: number | null;
  parameters: ProductParameter[];
  category: {
    id: string;
    name: string;
    slug: string;
  };
  reviews: {
    averageRating: number;
    totalCount: number;
  };
}

export interface ProductParameter {
  id: string;
  name: string;
  displayName: string;
  type: "SLIDER" | "DROPDOWN" | "COLOR" | "TEXT" | "NUMBER";
  minValue: number | null;
  maxValue: number | null;
  defaultValue: string;
  step: number | null;
  unit: string | null;
  affectsPrice: boolean;
  priceFormula: string | null;
  affectsGeometry: boolean;
  sortOrder: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  children?: CategoryItem[];
}
