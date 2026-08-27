// Constantes de domínio — fonte única de verdade para roles, statuses, tipos, planos

export const ROLES = {
  USER: "USER",
  OWNER: "OWNER",
  BROKER: "BROKER",
  AGENCY: "AGENCY",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const USER_STATUS = { ACTIVE: "ACTIVE", BLOCKED: "BLOCKED" } as const;

export const AGENCY_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  BLOCKED: "BLOCKED",
} as const;

export const PURPOSES = { RENT: "RENT", SALE: "SALE" } as const;
export type Purpose = (typeof PURPOSES)[keyof typeof PURPOSES];

export const PROPERTY_TYPES = {
  APARTMENT: "APARTMENT",
  HOUSE: "HOUSE",
  SHOP: "SHOP",
  COMMERCIAL_ROOM: "COMMERCIAL_ROOM",
  OTHER: "OTHER",
} as const;
export type PropertyType = (typeof PROPERTY_TYPES)[keyof typeof PROPERTY_TYPES];

export const PROPERTY_STATUS = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  RENTED: "RENTED",
  SOLD: "SOLD",
  EXPIRED: "EXPIRED",
  REJECTED: "REJECTED",
} as const;

// Apenas ACTIVE aparece em buscas públicas
export const PUBLIC_VISIBLE_STATUS = [PROPERTY_STATUS.ACTIVE];

export const PLAN_CODES = {
  START: "START",
  PRO: "PRO",
  BUSINESS: "BUSINESS",
  ENTERPRISE: "ENTERPRISE",
  OWNER_SINGLE: "OWNER_SINGLE",
} as const;

export const LEAD_SOURCES = {
  WHATSAPP: "WHATSAPP",
  PHONE: "PHONE",
  INTEREST: "INTEREST",
  DIRECTIONS: "DIRECTIONS",
  SHARE: "SHARE",
} as const;

export const REPORT_REASONS = [
  "Imóvel inexistente",
  "Anúncio desatualizado",
  "Preço incorreto",
  "Fraude",
  "Conteúdo inadequado",
  "Outro",
] as const;

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Apartamento",
  HOUSE: "Casa",
  SHOP: "Loja",
  COMMERCIAL_ROOM: "Sala comercial",
  OTHER: "Outro",
};

export const PURPOSE_LABELS: Record<string, string> = {
  RENT: "Alugar",
  SALE: "Comprar",
};

export const PROPERTY_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Aguardando aprovação",
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  RENTED: "Alugado",
  SOLD: "Vendido",
  EXPIRED: "Expirado",
  REJECTED: "Rejeitado",
};

export const DISTANCE_OPTIONS = [
  { value: 0, label: "Qualquer distância" },
  { value: 500, label: "500 m" },
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
  { value: 5000, label: "5 km" },
  { value: 10000, label: "10 km" },
];

// Coordenadas padrão: Belo Horizonte (centro do mercado-alvo do MVP)
export const DEFAULT_CENTER = { lat: -19.9245, lng: -43.9352 };
export const DEFAULT_ZOOM = 13;
