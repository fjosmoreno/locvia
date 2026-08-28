// Tipos compartilhados no cliente (espelham o serializer do backend)

export interface PropertyImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface PropertyVideo {
  id: string;
  url: string;
  duration: number;
  thumbnail: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Advertiser {
  type: string;
  name: string;
  whatsapp: string | null;
  phone: string | null;
  verified: boolean;
  logoUrl: string | null;
}

export interface Property {
  id: string;
  title: string;
  description: string | null;
  purpose: string;
  propertyType: string;
  price: number;
  condominium: number | null;
  iptu: number | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  contactName: string | null;
  whatsapp: string | null;
  phone: string | null;
  status: string;
  featured: boolean;
  badge: string | null;
  views: number;
  lastConfirmedAt: string | null;
  createdAt: string;
  images: PropertyImage[];
  videos: PropertyVideo[];
  advertiser: Advertiser | null;
  distance?: number;
}

export interface Filters {
  purpose?: string;
  propertyTypes: string[];
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  minArea?: number;
  radius?: number; // metros, para "próximos"
  search?: string;
}

export type PanelView = "list" | "detail";

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface MyPropertyItem {
  id: string;
  title: string;
  purpose: string;
  propertyType: string;
  price: number;
  status: string;
  views: number;
  lastConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  leadsCount: number;
  favoritesCount: number;
  primaryImage: string | null;
  neighborhood: string | null;
  city: string | null;
}

export interface LeadItem {
  id: string;
  source: string;
  message: string | null;
  contact: string | null;
  createdAt: string;
  property: { id: string; title: string; price: number; purpose: string; propertyType: string } | null;
}
