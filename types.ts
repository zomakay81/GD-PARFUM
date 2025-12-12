
export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  vatNumber: string;
  email: string;
  phone: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  province: string;
  phone: string;
  email: string;
  vatNumber: string;
  sdi: string;
  agentId?: string;
}

export interface Supplier {
  id: string;
  name:string;
  address: string;
  city: string;
  phone: string;
  email: string;
  vatNumber: string;
}

export interface Agent {
  id: string;
  name: string;
  city: string;
  phone: string;
  associatedClients: number;
}

export interface Category {
  id: string;
  name: string;
  isComponent: boolean;
  isFinishedProduct?: boolean; // Flag per indicare se può essere un prodotto finito (vendibile/producibile)
  parentId?: string; // ID della categoria genitore per sottocategorie
}

export interface OlfactoryPyramid {
    head: string;
    heart: string;
    base: string;
}

export interface Product {
  id: string;
  code?: string; // Codice Prodotto
  name: string;
  brand?: string; // Brand del prodotto
  category: string;
  unit: 'pz' | 'ml' | 'l' | 'g' | 'kg';
  imageUrl?: string; // Foto copertina
  additionalImages?: string[]; // Galleria foto aggiuntive
  description?: string;
  olfactoryPyramid?: OlfactoryPyramid;
  essenceCode?: string; // Codice Essenza
  ifraLimit?: number; // Percentuale IFRA
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string; // e.g., "30ml", "50ml", "Red"
  capacity?: number; // Quantità numerica (es. 50 per 50ml)
  purchasePrice: number;
  salePrice: number;
  location?: string;
  imageUrl?: string; // Foto specifica della variante
}

export interface InventoryBatch {
  id: string;
  variantId: string;
  stockLoadId?: string;
  productionId?: string;
  batchNumber?: string;
  expirationDate?: string;
  initialQuantity: number;
  currentQuantity: number;
  createdAt: string;
  // Maceration fields
  status: 'available' | 'macerating'; 
  macerationEndDate?: string;
  actualMacerationDays?: number; // Giorni effettivi di macerazione
}

export interface Partner {
  id: string;
  name: string;
}

export interface StockLoadItem {
  variantId: string;
  quantity: number;
  price: number;
  batchNumber?: string;
  expirationDate?: string;
}

export interface StockLoad {
  id: string;
  date: string;
  supplierId?: string; // Opzionale per carico da deposito/interno
  items: StockLoadItem[];
  paidByPartnerId?: string; // Opzionale se carico interno (nessun pagamento)
  vatApplied?: boolean;
  total: number;
  discountValue?: number;
  discountType?: 'amount' | 'percentage';
  shippingCost?: number;
}

export interface ProductionComponent {
  variantId: string;
  totalQuantityUsed: number;
  weightInGrams?: number; // Optional weight for liquids
  sourceBatches: {
    batchId: string;
    quantityTaken: number;
  }[];
}

export interface Production {
  id: string;
  date: string;
  finishedProductId: string;
  quantityProduced: number;
  components: ProductionComponent[];
  batchNumber: string;
  expirationDate: string;
  macerationDays?: number; 
  // New fields
  productionType: 'finished_sale' | 'bulk_refill';
  colorCode?: string;
  colorDrops?: number;
}

export interface DocumentItem {
  variantId: string;
  quantity: number;
  price: number;
}

export interface SalePayment {
    id: string;
    date: string;
    amount: number;
    partnerId: string;
}

export interface Sale {
  id: string;
  date: string;
  customerId: string;
  items: DocumentItem[];
  subtotal: number;
  vatApplied: boolean;
  total: number;
  type: 'vendita';
  collectedByPartnerId?: string; // Deprecato, mantenuto per compatibilità legacy
  collectionDate?: string; // Deprecato, mantenuto per compatibilità legacy
  payments?: SalePayment[]; // Nuovo campo per pagamenti multipli
  discountValue?: number;
  discountType?: 'amount' | 'percentage';
  shippingCost?: number;
}

export interface Quote {
  id: string;
  date: string;
  customerId: string;
  items: DocumentItem[];
  subtotal: number;
  vatApplied: boolean;
  total: number;
  type: 'preventivo';
  status: 'aperto' | 'convertito';
  discountValue?: number;
  discountType?: 'amount' | 'percentage';
  shippingCost?: number;
  payments?: SalePayment[]; // Aggiunto per gestione acconti/saldi su preventivi
}

export interface PartnerLedgerEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  partnerId: string;
  relatedDocumentId?: string; // ID of Sale, StockLoad, Settlement, etc.
  paymentMethod?: string;
}

export interface PartnerSettlement {
  id: string;
  date: string;
  totalSystemBalance: number;
  targetPerPartner: number;
  partnerSnapshots: {
      partnerId: string;
      partnerName: string;
      balance: number;
      status: 'creditor' | 'debtor' | 'balanced';
  }[];
  payment?: {
    amount: number;
    paymentMethod?: string;
    fromPartnerId: string;
    fromPartnerName: string;
    toPartnerId: string;
    toPartnerName: string;
  }
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  quantity: number;
  price: number;
  vatApplied: boolean;
  total: number;
  supplierId?: string;
  notes?: string;
  paidByPartnerId?: string;
}

export interface YearData {
  customers: Customer[];
  suppliers: Supplier[];
  agents: Agent[];
  products: Product[];
  productVariants: ProductVariant[];
  inventoryBatches: InventoryBatch[];
  categories: Category[];
  stockLoads: StockLoad[];
  productions: Production[];
  sales: Sale[];
  quotes: Quote[];
  partnerLedger: PartnerLedgerEntry[];
  partnerSettlements: PartnerSettlement[];
  expenses: Expense[];
  orders: Order[];
}

export interface OrderItem extends DocumentItem {
  prepared: boolean;
}

export interface Order {
  id: string;
  date: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  vatApplied: boolean;
  total: number;
  status: 'in-preparazione' | 'completato' | 'annullato';
  discountValue?: number;
  discountType?: 'amount' | 'percentage';
  shippingCost?: number;
  notes?: string;
}

export interface AppState {
  partners: Partner[];
  [year: number]: YearData;
}

export interface Settings {
  theme: 'light' | 'dark';
  currentYear: number;
  firebaseEnabled: boolean;
  aiAssistantEnabled: boolean;
  companyInfo: CompanyInfo;
}

export type View = 
  | 'dashboard'
  | 'new-sale'
  | 'new-quote'
  | 'sales-history'
  | 'quotes-history'
  | 'customers'
  | 'suppliers'
  | 'agents'
  | 'inventory'
  | 'stock-load'
  | 'stock-load-history' 
  | 'production'
  | 'production-history'
  | 'cellar' 
  | 'partner-ledger'
  | 'catalog'
  | 'archives'
  | 'spese'
  | 'ordini-clienti';
