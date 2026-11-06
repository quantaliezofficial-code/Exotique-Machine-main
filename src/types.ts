export interface ColorOption {
  name: string;
  hex: string;
}

export type VehicleStatus = 'available' | 'reserved' | 'sold';

export interface Vehicle {
  id: string;
  slug?: string;
  brand: string;
  model: string;
  badge: string;
  type: string;
  category?: 'premium' | 'non-premium';
  lifestyle: string;
  fuel: string;
  transmission: string;
  price: number; // in Lakhs
  emi: number; // monthly EMI in INR
  seats: number;
  engine: string;
  power: string;
  mileage: string;
  images: string[];
  colors: ColorOption[];
  description: string;
  features: string[];
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
  isRecent?: boolean;
  year?: number | null;
  kmDriven?: number | null;
  owners?: number | null;
  registration?: string | null;
  condition?: 'used' | 'new';
  status?: VehicleStatus;
  isPublished?: boolean;
  showcaseLabel?: string | null;
  cardImage?: string | null;
  /** Answer-first paragraph built from the car's own fields (backend/seo/listing.py). */
  summary?: string;
}

export type ActivePage =
  | 'home' | 'inventory' | 'details' | 'finance' | 'tradein' | 'testdrive' | 'service' | 'offers' | 'about' | 'admin';

export type AdminRole = 'superadmin' | 'admin';

export type AdminPermission =
  | 'inventory:view' | 'inventory:create' | 'inventory:edit' | 'inventory:delete' | 'pricing:edit'
  | 'logs:view' | 'leads:view' | 'leads:manage'
  | 'cms:hero' | 'cms:showcase' | 'cms:reviews' | 'cms:offers' | 'cms:media' | 'cms:settings' | 'cms:publish';

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  rolePreset?: string | null;
  permissions?: AdminPermission[];
  status?: 'active' | 'deactivated';
  mustChangePassword?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorUsername: string;
  actorRole: string;
  action: string;
  target?: string;
  details: string;
  ip?: string;
}

export interface TestDriveBooking {
  id: string;
  modelId: string;
  modelName: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  hasLicense: boolean;
  status: string;
  createdAt: string;
}

// ---------------------------------------------------------------- CMS

export interface HeroSlide {
  id: string;
  title: string;
  eyebrow?: string | null;
  description?: string | null;
  watermark?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  desktopImage: string;
  mobileImage?: string | null;
  imageAlt?: string | null;
  vehicleId?: string | null;
  sortOrder: number;
  status: 'draft' | 'published' | 'archived';
  startsAt?: string | null;
  endsAt?: string | null;
  updatedBy?: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  customerName: string;
  customerTitle?: string | null;
  rating?: number | null;
  body: string;
  photo?: string | null;
  vehicleId?: string | null;
  source: string;
  sourceUrl?: string | null;
  reviewDate?: string | null;
  isFeatured: boolean;
  sortOrder: number;
  status?: 'pending' | 'approved' | 'rejected';
  moderatedBy?: string | null;
  createdAt?: string;
}

export type OfferEffectiveStatus = 'draft' | 'scheduled' | 'live' | 'paused' | 'expired' | 'archived';

export interface Offer {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  description?: string | null;
  terms?: string | null;
  vehicleId?: string | null;
  discountType: 'none' | 'fixed' | 'percentage';
  discountValue?: number | null;
  image?: string | null;
  ctaLabel?: string | null;
  startsAt: string;
  endsAt: string;
  showOnHome: boolean;
  sortOrder: number;
  effectiveStatus: OfferEffectiveStatus;
  status?: 'draft' | 'published' | 'paused' | 'archived';
  authorName?: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  filename: string;
  originalName?: string | null;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  originalBytes?: number | null;
  originalPreserved: boolean;
  variantsReady: boolean;
  placeholder?: string | null;
  alt?: string | null;
  folder: string;
  uploadedBy?: string;
  createdAt?: string;
  duplicate?: boolean;
  usage?: { type: string; id: string; label: string; status?: string }[];
}

export interface ShowcaseItem {
  id: string;
  vehicleId: string;
  sortOrder: number;
  isVisible: boolean;
  label?: string | null;
  cardImage?: string | null;
  vehicle?: Vehicle | null;
}

/** A web video uploaded through the admin (backend/cms/videos.py). */
export interface VideoClip {
  src: string;
  poster: string;
  name?: string;
  caption?: string;
  car?: string;
  title?: string;
  description?: string;
  transcript?: string;
  duration?: number;
  width?: number;
  height?: number;
  uploadedAt?: string;
}

export interface HomeSection {
  id: 'hero' | 'stats' | 'velocity' | 'brands' | 'showcase' | 'whyus' | 'offers' | 'services' | 'testimonials' | 'stories' | 'lifestyle' | 'faq';
  enabled: boolean;
  eyebrow?: string;
  title?: string;
  /** Second line of the title, shown in the accent gradient. */
  titleAccent?: string;
  subtitle?: string;
  limit?: number;
}

export interface HomeServices {
  centerEyebrow: string;
  centerTitle: string;
  centerText: string;
  ctaLabel: string;
  ctaUrl: string;
  items: { title: string; desc: string; image: string; link: string }[];
}

export interface HomeCollection { label: string; image: string; link: string }

export interface SiteSettings {
  general: {
    siteName: string;
    legalName: string;
    tagline: string;
    footerBlurb: string;
    aboutTitle: string;
    aboutBody: string;
    assurances: string[];
    announcement: { enabled: boolean; text: string; link: string };
    /** About page videos: the first is the showroom intro beside the text, the rest a row below. */
    aboutVideos?: VideoClip[];
    /** Show the customer video stories on the About page too (default true). */
    aboutStories?: boolean;
  };
  contact: {
    phones: { label: string; number: string }[];
    whatsapp: string;
    email: string;
    streetAddress: string;
    locality: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    mapUrl: string;
    latitude: number | null;
    longitude: number | null;
    openingHours: { days: string[]; opens: string; closes: string }[];
  };
  social: Record<string, string>;
  seo: {
    homeTitle: string;
    homeDescription: string;
    titleSuffix: string;
    defaultOgImage: string;
    allowAiCrawlers: boolean;
    googleSiteVerification?: string;
    bingSiteVerification?: string;
  };
  homepage: {
    heading: string;
    sections: HomeSection[];
    stats: { value: string; label: string; auto?: string }[];
    services: HomeServices;
    collections: HomeCollection[];
    velocity: { lines: string[]; brandLine: boolean };
    whyUs: { title: string; text: string; image: string }[];
    videoStories?: VideoClip[];
  };
  faq: { question: string; answer: string }[];
}

export interface HomePayload {
  settings: SiteSettings;
  hero: HeroSlide[];
  featured: { source: 'cms' | 'auto'; vehicles: Vehicle[] };
  reviews: Review[];
  offers: Offer[];
  stats: { count: number; brands: number; minPrice: number | null; maxPrice: number | null; priceRange: string };
  brands: { slug: string; name: string; count: number }[];
  collections?: { slug: string; title: string; path: string; count: number }[];
  preview: boolean;
}

export type LeadKind = 'finance' | 'test-drives' | 'service' | 'enquiries';

export interface ListingFacts {
  count: number;
  minPrice: number | null;
  maxPrice: number | null;
  priceRange: string | null;
  yearRange: string | null;
  brands: { name: string; count: number }[];
  fuels: { name: string; count: number }[];
  transmissions: { name: string; count: number }[];
  models: string[];
  updatedAt: string | null;
}

export interface ListingCollection {
  slug: string; kind: string; label: string; title: string; path: string; count: number; indexable: boolean;
  preset: { types?: string[]; fuels?: string[]; transmission?: string; budget?: number };
}

export interface ListingInfo {
  title: string;
  path: string;
  summary: string;
  facts: ListingFacts;
  indexable: boolean;
  preset: ListingCollection['preset'] | null;
  collections: ListingCollection[];
  brands: { slug: string; name: string; count: number }[];
}
