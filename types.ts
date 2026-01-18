
export type Language = 'ar' | 'fr';

export interface Variation {
  id: string;
  name: string; // e.g., "XL", "Red", "128GB"
  price: number;
  discountPrice?: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  category: string;
  description: string;
  image: string; // Base64
  stock: number;
  createdAt: number;
  variations?: Variation[];
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariationId?: string;
}

export interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT';
  details: string;
  timestamp: number;
}

export interface AppState {
  products: Product[];
  logs: AuditLog[];
  language: Language;
}

export const CATEGORIES = {
  ar: ['إلكترونيات', 'ملابس', 'منزل', 'جمال', 'أخرى'],
  fr: ['Électronique', 'Vêtements', 'Maison', 'Beauté', 'Autre']
};
