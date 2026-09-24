export type Jurisdiction = 'india' | 'international';
export type Language = 'en' | 'hi';

export type UserRole = 'USER' | 'ADMIN';
export type UserType = 'MSMEs' | 'Researchers/Searchers' | 'Admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  user_type: UserType;
  organization: string;
  gst_number?: string;
  status: 'active' | 'disabled';
  created_at: string;
  last_login_at?: string;
  last_activity_at?: string;
}

export interface RAGCitation {
  documentId: string;
  documentTitle: string;
  page?: number;
  section?: string;
  source: string;
  relevanceScore: number;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: RAGCitation[];
  evidence_sources?: string[];
  sourceEngine?: string;
  evidenceFound?: boolean;
}

export interface ConversationItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface DocumentItem {
  id: string;
  title: string;
  original_name: string;
  file_type: string;
  file_size: number;
  status: 'uploaded' | 'extracting' | 'chunking' | 'embedding' | 'indexing' | 'processed' | 'failed';
  error_message?: string;
  total_chunks: number;
  created_at: string;
  updated_at: string;
  uploader_name?: string;
}

export interface AuditLogItem {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  resource: string;
  metadata?: any;
  ip_address?: string;
  timestamp: string;
}

// ==========================================
// LEGACY COMPATIBILITY TYPES
// ==========================================
export type ActiveTab = 'home' | 'assistant' | 'laws' | 'products' | 'resources' | 'chat';

export interface UserPreferences {
  defaultJurisdiction: Jurisdiction;
  preferredLanguage: Language;
  autoCitations: boolean;
  tkdlAlerts: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  joinedDate: string;
  savedConsultationsCount: number;
  preferences: UserPreferences;
}

export interface ChatSession {
  id: string;
  title: string;
  date?: string;
  messageCount?: number;
  jurisdiction?: Jurisdiction;
  tags?: string[];
  updatedAt?: string;
  messages?: any[];
}

export type ProductCategory =
  | 'classical'
  | 'proprietary'
  | 'extract'
  | 'nutraceutical'
  | 'cosmetic'
  | 'classical_formulation'
  | 'proprietary_medicine'
  | 'herbal_cosmetic'
  | 'extract_isolate'
  | string;

export type IngredientSource =
  | 'domestic_wild'
  | 'domestic_cultivated'
  | 'imported'
  | 'synthetic_derivative'
  | 'siddha_herbal'
  | 'unani_mineral';

export type NoveltyClaim =
  | 'exact_classical_recipe'
  | 'synergistic_combination'
  | 'novel_delivery_system'
  | 'purified_fraction'
  | 'new_therapeutic_indication';

export type CommercialTarget =
  | 'domestic_only'
  | 'export_global'
  | 'academic_research';

export interface ClassificationState {
  category: ProductCategory;
  ingredientSource?: IngredientSource;
  source?: IngredientSource;
  noveltyClaim?: NoveltyClaim;
  novelty?: NoveltyClaim;
  commercialTarget: CommercialTarget;
  activeIngredients?: string[];
}

export interface IPABSAssessment {
  categoryTitle?: string;
  categoryHindi?: string;
  patentStatus?: string;
  absObligation?: string;
  regulatoryBody?: string;
  tkdlConflictRisk?: string;
  bulletPoints?: string[];
  statutoryCitations?: string[];
  actionChecklist?: string[];
  overallRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_BAR';
  patentEligibilityScore?: number;
  section3pRisk?: string;
  section3eRisk?: string;
  section3dRisk?: string;
  nbaRequirement?: string;
  tkdlStatus?: string;
  recommendation?: string;
}

export interface StatutoryGuide {
  id?: string;
  section?: string;
  act: string;
  title: string;
  titleHindi?: string;
  summary: string;
  summaryHindi?: string;
  safeHarborTip?: string;
  safeHarborTipHindi?: string;
  tags?: string[];
}
