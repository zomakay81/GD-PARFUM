import React, { createContext, useContext, useState, useEffect, useReducer, useMemo, useCallback } from 'react';
// AGGIUNGI QUESTA RIGA QUI SOTTO:
import { useUndoableState } from '../hooks/useUndoableState'; 
// ... segui con gli altri import (types, supabase, ecc)
import type { AppState, Settings, YearData, View, Customer, Supplier, Agent, Partner, Product, StockLoad, StockLoadItem, Category, Sale, Quote, DocumentItem, ProductVariant, PartnerLedgerEntry, Production, InventoryBatch, ProductionComponent, CompanyInfo, PartnerSettlement, SalePayment, Expense, StockAdjustment } from '../types';
import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase'; // Assicurati che l'estensione sia corretta (.ts o .tsx)
import { VAT_RATE } from '../constants';

// --- TIPI DI AZIONE ---
type Action =
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'BACKUP' }
  | { type: 'RESTORE'; payload: { state: AppState; settings: Settings } }
  | { type: 'RESET_APP' }
  | { type: 'ARCHIVE_YEAR' }
  // Azioni Clienti
  | { type: 'ADD_CUSTOMER'; payload: Omit<Customer, 'id'> }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; payload: string }
  // Azioni Fornitori
  | { type: 'ADD_SUPPLIER'; payload: Omit<Supplier, 'id'> }
  | { type: 'UPDATE_SUPPLIER'; payload: Supplier }
  | { type: 'DELETE_SUPPLIER'; payload: string }
  // Azioni Agenti
  | { type: 'ADD_AGENT'; payload: Omit<Agent, 'id' | 'associatedClients'> }
  | { type: 'UPDATE_AGENT'; payload: Agent }
  | { type: 'DELETE_AGENT'; payload: string }
    // Azioni Soci
  | { type: 'ADD_PARTNER'; payload: Omit<Partner, 'id'> }
  | { type: 'UPDATE_PARTNER'; payload: Partner }
  | { type: 'DELETE_PARTNER'; payload: string }
  // Azioni Prodotti
  | { type: 'ADD_PRODUCT'; payload: Omit<Product, 'id'> & { initialCapacity?: number } }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  // Azioni Varianti Prodotto
  | { type: 'ADD_VARIANT'; payload: Omit<ProductVariant, 'id'> }
  | { type: 'UPDATE_VARIANT'; payload: ProductVariant }
  | { type: 'DELETE_VARIANT'; payload: string }
  // Azioni Categorie
  | { type: 'ADD_CATEGORY'; payload: Omit<Category, 'id'> }
  | { type: 'UPDATE_CATEGORY'; payload: { oldName: string; category: Category } }
  | { type: 'DELETE_CATEGORY'; payload: string }
  // Azioni Carico Magazzino
  | { type: 'ADD_STOCK_LOAD'; payload: Omit<StockLoad, 'id' | 'total'> }
  | { type: 'UPDATE_STOCK_LOAD'; payload: StockLoad }
  | { type: 'DELETE_STOCK_LOAD'; payload: string }
  // Azioni Produzione
  | { type: 'ADD_PRODUCTION'; payload: {
      date: string;
      productionType: 'bulk' | 'direct' | 'fill' | 'transform';
      targetVariantId: string;
      quantityProduced: number;
      components: { variantId: string; quantityUsed: number; }[];
      macerationDays?: number;
      sourceBatchId?: string;
      colorCode?: string;
      colorDrops?: number;
      concentration?: number;
    }
  }
  | { type: 'DELETE_PRODUCTION'; payload: string }
  | { type: 'COMPLETE_MACERATION'; payload: string } // payload is batchId
  | { type: 'WITHDRAW_PARTIAL_MACERATION', payload: { batchId: string, quantity: number } }
  // Azioni Vendite
  | { type: 'ADD_SALE'; payload: Omit<Sale, 'id' | 'total' | 'subtotal' | 'type'> }
  | { type: 'DELETE_SALE'; payload: string }
  | { type: 'COLLECT_SALE'; payload: { saleId: string; partnerId: string; date: string; amount: number } }
  | { type: 'BULK_COLLECT_SALES'; payload: { collections: { saleId: string; amount: number }[]; partnerId: string; date: string } }
  // Azioni Preventivi
  | { type: 'ADD_QUOTE'; payload: Omit<Quote, 'id' | 'total' | 'subtotal' | 'type' | 'status'> }
  | { type: 'DELETE_QUOTE'; payload: string }
  | { type: 'CONVERT_QUOTE_TO_SALE'; payload: string }
  | { type: 'COLLECT_QUOTE'; payload: { quoteId: string; partnerId: string; date: string; amount: number } }
  // Azioni Mastro Soci
  | { type: 'ADD_MANUAL_LEDGER_ENTRY', payload: Omit<PartnerLedgerEntry, 'id'> }
  | { type: 'SETTLE_PARTNER_DEBT', payload: { fromPartnerId: string; toPartnerId: string; amount: number; date: string } }
  | { type: 'TRANSFER_BETWEEN_PARTNERS', payload: { fromPartnerId: string; toPartnerId: string; amount: number; date: string; description: string } }
  | { type: 'ARCHIVE_PARTNER_SETTLEMENT', payload: PartnerSettlement }
  // Azioni Spese
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  // Azioni Ordini
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'DELETE_ORDER'; payload: string }
  | { type: 'TOGGLE_ORDER_ITEM_PREPARED'; payload: { orderId: string, itemId: string } }
  | { type: 'CONVERT_ORDER_TO_SALE'; payload: string }
  // Azioni Magazzino
  | { type: 'ADJUST_STOCK'; payload: { variantId: string; newQuantity: number; reason: string } };


// --- STATO INIZIALE ---
const getInitialYearData = (): YearData => ({
  customers: [], suppliers: [], agents: [], products: [], productVariants: [],
  inventoryBatches: [],
  categories: [
      { id: uuidv4(), name: "Materia Prima", isComponent: true, isFinishedProduct: false },
      { id: uuidv4(), name: "Accessorio", isComponent: true, isFinishedProduct: false },
      { id: uuidv4(), name: "Prodotto Finito", isComponent: false, isFinishedProduct: true },
      { id: uuidv4(), name: "Semilavorato (Sfuso)", isComponent: true, isFinishedProduct: true },
  ],
  stockLoads: [], productions: [], sales: [], quotes: [], partnerLedger: [], partnerSettlements: [], expenses: [], orders: [], stockAdjustments: []
});

const getDefaultCompanyInfo = (): CompanyInfo => ({
    name: "Profumeria Pro S.R.L.",
    address: "Via delle Essenze, 123",
    city: "40100 Bologna (BO)",
    vatNumber: "IT01234567890",
    email: "info@profumeriapro.it",
    phone: "+39 051 123456",
});

const getInitialState = (): { state: AppState; settings: Settings } => {
  try {
    const savedState = localStorage.getItem('appState');
    const savedSettings = localStorage.getItem('appSettings');
    const currentYear = new Date().getFullYear();
    
    const initialState: AppState = savedState ? JSON.parse(savedState) : { partners: [{id: '1', name: 'Socio Unico'}], [currentYear]: getInitialYearData() };
    if (!initialState[currentYear]) {
        initialState[currentYear] = getInitialYearData();
    }
    // Comprehensive check to ensure all data arrays are initialized
    const defaultYearData = getInitialYearData();
    (Object.keys(defaultYearData) as Array<keyof YearData>).forEach(key => {
        if (!initialState[currentYear][key]) {
             initialState[currentYear][key] = defaultYearData[key] as any;
        }
    });
    
    // Migration: ensure batches have status
    Object.keys(initialState).forEach(key => {
        const year = parseInt(key);
        if(!isNaN(year) && initialState[year].inventoryBatches) {
            initialState[year].inventoryBatches.forEach(b => {
                if(!b.status) b.status = 'available';
            });
        }
    });

    const initialSettings: Settings = savedSettings ? JSON.parse(savedSettings) : {
      theme: 'light',
      currentYear: currentYear,
      firebaseEnabled: false,
      aiAssistantEnabled: true,
      companyInfo: getDefaultCompanyInfo(),
    };
    
    if (!initialSettings.companyInfo) {
        initialSettings.companyInfo = getDefaultCompanyInfo();
    }

    return { state: initialState, settings: initialSettings };
  } catch (error) {
    console.error("Errore nel caricamento dello stato iniziale:", error);
    const currentYear = new Date().getFullYear();
    return {
      state: { partners: [{id: '1', name: 'Socio Unico'}], [currentYear]: getInitialYearData() },
      settings: { 
          theme: 'light', 
          currentYear, 
          firebaseEnabled: false, 
          aiAssistantEnabled: true,
          companyInfo: getDefaultCompanyInfo()
    },
    };
  }
};

const initialState = getInitialState();

// --- STORIA PER UNDO/REDO ---
let history: { state: AppState; settings: Settings }[] = [initialState];
let historyIndex = 0;

// --- FUNZIONI DI UTILITÀ ---

// Restituisce la quantità fisica totale (inclusa macerazione)
const getVariantTotalQuantity = (variantId: string, batches: InventoryBatch[]): number => {
    return batches
        .filter(b => b.variantId === variantId)
        .reduce((sum, b) => sum + b.currentQuantity, 0);
};

// Restituisce la quantità vendibile (SOLO status 'available')
const getVariantAvailableQuantity = (variantId: string, batches: InventoryBatch[]): number => {
    return batches
        .filter(b => b.variantId === variantId && b.status === 'available')
        .reduce((sum, b) => sum + b.currentQuantity, 0);
};

const calculateAssociatedClients = (customers: Customer[], agentId: string): number => {
    return customers.filter(c => c.agentId === agentId).length;
};

const recalculateAllAgents = (draft: AppState, year: number) => {
    const customers = draft[year].customers;
    draft[year].agents.forEach(agent => {
        agent.associatedClients = calculateAssociatedClients(customers, agent.id);
    });
};

// FEFO: First Expired, First Out - Modificato per prendere SOLO lotti disponibili se consumption è true
const getSortedBatches = (variantId: string, batches: InventoryBatch[], forConsumption: boolean = false): InventoryBatch[] => {
    return batches
        .filter(b => b.variantId === variantId && b.currentQuantity > 0 && (!forConsumption || b.status === 'available'))
        .sort((a, b) => {
            if (a.expirationDate && b.expirationDate) {
                return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
            }
            if (a.expirationDate) return -1; // a ha scadenza, b no -> a viene prima
            if (b.expirationDate) return 1;  // b ha scadenza, a no -> b viene prima
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // FIFO se non ci sono scadenze
        });
};


// --- REDUCER ---
const appReducer = (state: { state: AppState; settings: Settings }, action: Action): { state: AppState; settings: Settings } => {
  const currentYear = state.settings.currentYear;

  return produce(state, draft => {
    const yearData = draft.state[currentYear];
    if (!yearData && action.type !== 'ARCHIVE_YEAR' && action.type !== 'RESET_APP') {
        draft.state[currentYear] = getInitialYearData();
    }

    switch (action.type) {
      // --- IMPOSTAZIONI E STORIA ---
      case 'UPDATE_SETTINGS':
        Object.assign(draft.settings, action.payload);
        break;

      case 'RESET_APP': {
          localStorage.removeItem('appState');
          localStorage.removeItem('appSettings');
          const newYear = new Date().getFullYear();
          draft.state = { partners: [{id: '1', name: 'Socio Unico'}], [newYear]: getInitialYearData() };
          draft.settings = {
              theme: 'light',
              currentYear: newYear,
              firebaseEnabled: false,
              aiAssistantEnabled: true,
              companyInfo: getDefaultCompanyInfo(),
          };
          break;
      }

      case 'ARCHIVE_YEAR': {
        const nextYear = currentYear + 1;
        if (draft.state[nextYear]) {
            alert(`L'anno ${nextYear} esiste già. Impossibile archiviare.`);
            break;
        }
        draft.state[nextYear] = getInitialYearData();
        draft.settings.currentYear = nextYear;
        alert(`Anno ${currentYear} archiviato con successo. Anno corrente impostato a ${nextYear}.`);
        break;
      }
      
      // --- CLIENTI ---
      case 'ADD_CUSTOMER': {
        const newCustomer: Customer = { id: uuidv4(), ...action.payload };
        yearData.customers.push(newCustomer);
        recalculateAllAgents(draft.state, currentYear);
        break;
      }
      case 'UPDATE_CUSTOMER': {
        const index = yearData.customers.findIndex(c => c.id === action.payload.id);
        if (index !== -1) yearData.customers[index] = action.payload;
        recalculateAllAgents(draft.state, currentYear);
        break;
      }
      case 'DELETE_CUSTOMER': {
        yearData.customers = yearData.customers.filter(c => c.id !== action.payload);
        recalculateAllAgents(draft.state, currentYear);
        break;
      }

      // --- FORNITORI ---
      case 'ADD_SUPPLIER':
        yearData.suppliers.push({ id: uuidv4(), ...action.payload });
        break;
      case 'UPDATE_SUPPLIER': {
        const index = yearData.suppliers.findIndex(s => s.id === action.payload.id);
        if (index !== -1) yearData.suppliers[index] = action.payload;
        break;
      }
      case 'DELETE_SUPPLIER':
        yearData.suppliers = yearData.suppliers.filter(s => s.id !== action.payload);
        break;

      // --- AGENTI ---
      case 'ADD_AGENT':
        yearData.agents.push({ id: uuidv4(), ...action.payload, associatedClients: 0 });
        break;
      case 'UPDATE_AGENT': {
        const index = yearData.agents.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
            // Preserve calculated client count
            const associatedClients = yearData.agents[index].associatedClients;
            yearData.agents[index] = {...action.payload, associatedClients};
        }
        break;
      }
      case 'DELETE_AGENT': {
        const agentId = action.payload;
        yearData.agents = yearData.agents.filter(a => a.id !== agentId);
        // Dissocia i clienti dall'agente eliminato
        yearData.customers.forEach(c => {
            if (c.agentId === agentId) c.agentId = undefined;
        });
        break;
      }
      
      // --- SOCI ---
      case 'ADD_PARTNER':
        draft.state.partners.push({ id: uuidv4(), ...action.payload });
        break;
      case 'UPDATE_PARTNER': {
        const index = draft.state.partners.findIndex(p => p.id === action.payload.id);
        if (index !== -1) draft.state.partners[index] = action.payload;
        break;
      }
      case 'DELETE_PARTNER': {
        const partnerId = action.payload;
        const isUsed = Object.keys(draft.state).some(key => {
            if (!isNaN(parseInt(key))) {
                const yearData = draft.state[parseInt(key)] as YearData;
                return yearData.stockLoads?.some(sl => sl.paidByPartnerId === partnerId) 
                    || yearData.sales?.some(s => s.collectedByPartnerId === partnerId || s.payments?.some(p => p.partnerId === partnerId))
                    || yearData.partnerLedger?.some(pl => pl.partnerId === partnerId);
            }
            return false;
        });
        if (isUsed) {
            alert("Impossibile eliminare il socio perché ha dei movimenti finanziari associati.");
        } else {
            draft.state.partners = draft.state.partners.filter(p => p.id !== partnerId);
        }
        break;
      }

      // --- PRODOTTI ---
      case 'ADD_PRODUCT': {
        const { initialCapacity, ...productData } = action.payload;
        const newProduct: Product = { id: uuidv4(), ...productData };
        yearData.products.push(newProduct);
        
        // Se initialCapacity è fornita, creiamo una variante che si chiama tipo "50ml"
        const variantName = initialCapacity ? `${initialCapacity}${newProduct.unit}` : 'Standard';

        const defaultVariant: ProductVariant = {
            id: uuidv4(),
            productId: newProduct.id,
            name: variantName,
            capacity: initialCapacity,
            purchasePrice: 0,
            salePrice: 0,
            location: '',
        };
        yearData.productVariants.push(defaultVariant);
        break;
      }
      case 'UPDATE_PRODUCT': {
        const index = yearData.products.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
            yearData.products[index] = {...action.payload};
        }
        break;
      }
      case 'DELETE_PRODUCT':
        yearData.products = yearData.products.filter(p => p.id !== action.payload);
        yearData.productVariants = yearData.productVariants.filter(v => v.productId !== action.payload);
        yearData.inventoryBatches = yearData.inventoryBatches.filter(b => !yearData.productVariants.some(v => v.id === b.variantId && v.productId === action.payload));
        break;
        
      // --- VARIANTI PRODOTTO ---
      case 'ADD_VARIANT':
        yearData.productVariants.push({ id: uuidv4(), ...action.payload });
        break;
      case 'UPDATE_VARIANT': {
        const index = yearData.productVariants.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
            yearData.productVariants[index] = { ...action.payload };
        }
        break;
      }
      case 'DELETE_VARIANT':
        yearData.productVariants = yearData.productVariants.filter(v => v.id !== action.payload);
        yearData.inventoryBatches = yearData.inventoryBatches.filter(b => b.variantId !== action.payload);
        break;

      // --- CATEGORIE ---
      case 'ADD_CATEGORY':
        if (!yearData.categories.some(c => c.name.toLowerCase() === action.payload.name.toLowerCase())) {
          yearData.categories.push({ id: uuidv4(), ...action.payload });
        } else {
            alert("Una categoria con questo nome esiste già.");
        }
        break;
      case 'UPDATE_CATEGORY': {
        const { oldName, category } = action.payload;
        const index = yearData.categories.findIndex(c => c.id === category.id);
        if (index !== -1) {
            if (yearData.categories.some(c => c.name.toLowerCase() === category.name.toLowerCase() && c.id !== category.id)) {
                alert("Una categoria con questo nome esiste già.");
                break;
            }
          yearData.categories[index] = category;
          yearData.products.forEach(p => {
            if (p.category === oldName) {
              p.category = category.name;
            }
          });
        }
        break;
      }
      case 'DELETE_CATEGORY': {
        const categoryId = action.payload;
        const categoryToDelete = yearData.categories.find(c => c.id === categoryId);
        // Check also for subcategories
        const hasSubcategories = yearData.categories.some(c => c.parentId === categoryId);

        if (categoryToDelete) {
            const isUsed = yearData.products.some(p => p.category === categoryToDelete.name);
            if (isUsed) {
                alert("Impossibile eliminare la categoria perché è utilizzata da almeno un prodotto.");
            } else if (hasSubcategories) {
                alert("Impossibile eliminare la categoria perché contiene sottocategorie. Elimina prima le sottocategorie.");
            } else {
                yearData.categories = yearData.categories.filter(c => c.id !== categoryId);
            }
        }
        break;
      }
      
      // --- CARICO MAGAZZINO ---
      case 'ADD_STOCK_LOAD': {
        const { items, vatApplied, paidByPartnerId, supplierId, discountValue, discountType, shippingCost } = action.payload;
        const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
        
        let discount = 0;
        if (discountValue) {
            discount = discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue;
        }
        const shipping = shippingCost || 0;
        const taxable = Math.max(0, subtotal - discount + shipping);
        const total = vatApplied ? taxable * VAT_RATE : taxable;

        const newLoad: StockLoad = { id: uuidv4(), ...action.payload, total };
        yearData.stockLoads.push(newLoad);
        
        const now = new Date().toISOString();
        newLoad.items.forEach(item => {
          const newBatch: InventoryBatch = {
            id: uuidv4(),
            variantId: item.variantId,
            stockLoadId: newLoad.id,
            batchNumber: item.batchNumber,
            expirationDate: item.expirationDate,
            initialQuantity: item.quantity,
            currentQuantity: item.quantity,
            createdAt: now,
            unitCost: item.price, // Costo unitario al momento del carico
            status: 'available' // Default raw materials are available
          };
          yearData.inventoryBatches.push(newBatch);
        });
        
        // Crea movimento contabile SOLO SE c'è un socio pagante
        if (paidByPartnerId) {
            const supplierName = supplierId 
                ? (yearData.suppliers.find(s => s.id === supplierId)?.name || 'Sconosciuto') 
                : 'Deposito/Interno';
                
            const ledgerEntry: PartnerLedgerEntry = {
                id: uuidv4(),
                date: newLoad.date,
                description: `Pagamento fornitore ${supplierName}`,
                amount: -newLoad.total,
                partnerId: paidByPartnerId,
                relatedDocumentId: newLoad.id,
            };
            yearData.partnerLedger.push(ledgerEntry);
        }
        break;
      }
      case 'UPDATE_STOCK_LOAD': {
        const updatedLoad = action.payload;
        const loadIndex = yearData.stockLoads.findIndex(sl => sl.id === updatedLoad.id);

        if (loadIndex !== -1) {
            const originalLoad = yearData.stockLoads[loadIndex];

            // 1. Update Inventory Batches based on quantity differences
            updatedLoad.items.forEach((newItem, index) => {
                const originalItem = originalLoad.items[index];
                if (!originalItem || newItem.variantId !== originalItem.variantId) {
                    // Logic for adding/removing items would be complex; for now, we only support quantity/price changes on existing items.
                    // We find the batch by matching stockLoadId and variantId (and assuming order is preserved).
                    // A more robust solution might need a unique ID per stockLoadItem.
                    return; 
                }
                
                // Find the specific batch created by this stock load item.
                // We assume one batch per item line in a stock load.
                const batch = yearData.inventoryBatches.find(b => 
                    b.stockLoadId === originalLoad.id && 
                    b.variantId === originalItem.variantId &&
                    b.batchNumber === originalItem.batchNumber // Use batch number for better matching
                );

                if (batch) {
                    const quantityDifference = newItem.quantity - originalItem.quantity;
                    batch.currentQuantity += quantityDifference;
                    batch.initialQuantity = newItem.quantity; // Update initial quantity as well
                    batch.unitCost = newItem.price; // Update the unit cost
                }
            });

            // 2. Recalculate total for the load
            const subtotal = updatedLoad.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
            let discount = 0;
            if (updatedLoad.discountValue) {
                discount = updatedLoad.discountType === 'percentage' ? subtotal * (updatedLoad.discountValue / 100) : updatedLoad.discountValue;
            }
            const shipping = updatedLoad.shippingCost || 0;
            const taxable = Math.max(0, subtotal - discount + shipping);
            updatedLoad.total = updatedLoad.vatApplied ? taxable * VAT_RATE : taxable;
            
            // 3. Update the stock load itself
            yearData.stockLoads[loadIndex] = updatedLoad;

            // 4. Update or create/delete ledger entry
            const ledgerEntryIndex = yearData.partnerLedger.findIndex(e => e.relatedDocumentId === updatedLoad.id);
            const supplierName = updatedLoad.supplierId ? (yearData.suppliers.find(s => s.id === updatedLoad.supplierId)?.name || 'Sconosciuto') : 'Deposito/Interno';
            
            if (updatedLoad.paidByPartnerId) {
                if (ledgerEntryIndex !== -1) {
                    // Update existing entry
                    const entry = yearData.partnerLedger[ledgerEntryIndex];
                    entry.partnerId = updatedLoad.paidByPartnerId;
                    entry.date = updatedLoad.date;
                    entry.description = `Pagamento fornitore ${supplierName}`;
                    entry.amount = -updatedLoad.total; // Use the new total
                } else {
                    // Create new if it was an internal load before
                    yearData.partnerLedger.push({
                        id: uuidv4(),
                        date: updatedLoad.date,
                        description: `Pagamento fornitore ${supplierName}`,
                        amount: -updatedLoad.total,
                        partnerId: updatedLoad.paidByPartnerId,
                        relatedDocumentId: updatedLoad.id,
                    });
                }
            } else {
                // If it's now an internal load, remove any existing ledger entry
                if (ledgerEntryIndex !== -1) {
                    yearData.partnerLedger.splice(ledgerEntryIndex, 1);
                }
            }
        }
        break;
      }
      case 'DELETE_STOCK_LOAD': {
        const loadId = action.payload;
        yearData.inventoryBatches = yearData.inventoryBatches.filter(b => b.stockLoadId !== loadId);
        yearData.stockLoads = yearData.stockLoads.filter(sl => sl.id !== loadId);
        yearData.partnerLedger = yearData.partnerLedger.filter(e => e.relatedDocumentId !== loadId);
        break;
      }

      // --- PRODUZIONE ---
      case 'ADD_PRODUCTION': {
          const {
              date,
              productionType,
              targetVariantId,
              quantityProduced,
              components: componentInputs,
              macerationDays,
              sourceBatchId, // per fill/transform
              ...rest
          } = action.payload;

          let totalCost = 0;
          const newProductionComponents: ProductionComponent[] = [];

          // 1. Logica di Consumo Componenti e Calcolo Costi
          for (const input of componentInputs) {
              const totalAvailable = getVariantAvailableQuantity(input.variantId, yearData.inventoryBatches);
              if (totalAvailable < input.quantityUsed) {
                  const variant = yearData.productVariants.find(v => v.id === input.variantId);
                  const productName = yearData.products.find(p => p.id === variant?.productId)?.name || 'Sconosciuto';
                  alert(`Quantità non disponibile per ${productName} - ${variant?.name}. Richiesti: ${input.quantityUsed}, Disponibili: ${totalAvailable}`);
                  return; // Stop
              }

              const sortedBatches = getSortedBatches(input.variantId, yearData.inventoryBatches, true);
              let remainingToTake = input.quantityUsed;
              let componentCost = 0;
              const sourceBatches: ProductionComponent['sourceBatches'] = [];

              for (const batch of sortedBatches) {
                  if (remainingToTake <= 0) break;
                  
                  const takeFromThisBatch = Math.min(batch.currentQuantity, remainingToTake);
                  const costContribution = takeFromThisBatch * batch.unitCost;
                  
                  batch.currentQuantity -= takeFromThisBatch;
                  remainingToTake -= takeFromThisBatch;
                  componentCost += costContribution;
                  
                  sourceBatches.push({
                      batchId: batch.id,
                      quantityTaken: takeFromThisBatch,
                      costContribution: costContribution,
                  });
              }

              newProductionComponents.push({
                  variantId: input.variantId,
                  totalQuantityUsed: input.quantityUsed,
                  totalCost: componentCost,
                  sourceBatches: sourceBatches,
              });
              totalCost += componentCost;
          }

          // In caso di 'fill' o 'transform', il batch sorgente è anch'esso un componente
          if ((productionType === 'fill' || productionType === 'transform') && sourceBatchId) {
            const sourceBatch = yearData.inventoryBatches.find(b => b.id === sourceBatchId);
            if (!sourceBatch) {
                alert("Lotto di origine per riempimento/trasformazione non trovato.");
                return;
            }
            // La quantità "usata" dal lotto sorgente è la sua intera capacità se non specificato diversamente
            // Questa logica va affinata a seconda che si riempia una parte o tutto
            const quantityFromSource = sourceBatch.initialQuantity; // Semplificazione: si usa tutto il lotto
             if (sourceBatch.currentQuantity < quantityFromSource) {
                 alert(`Quantità insufficiente nel lotto di origine. Richiesti: ${quantityFromSource}, Disponibili: ${sourceBatch.currentQuantity}`);
                 return;
             }
             const costContribution = quantityFromSource * sourceBatch.unitCost;
             sourceBatch.currentQuantity -= quantityFromSource;
             totalCost += costContribution;
             
             // Aggiungiamo anche il lotto sorgente ai "componenti" per tracciabilità
             newProductionComponents.push({
                  variantId: sourceBatch.variantId,
                  totalQuantityUsed: quantityFromSource,
                  totalCost: costContribution,
                  sourceBatches: [{ batchId: sourceBatchId, quantityTaken: quantityFromSource, costContribution: costContribution }],
              });
          }

          // 2. Creazione Nuovo Lotto Prodotto
          const productionDate = new Date(date);
          const expirationDate = new Date(productionDate);
          expirationDate.setMonth(expirationDate.getMonth() + 24); // Scadenza a 24 mesi
          const batchNumber = `PROD-${date.replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          const costPerUnit = totalCost / quantityProduced;

          let status: 'available' | 'macerating' = 'available';
          let macerationEndDate: string | undefined = undefined;
          if (macerationDays && macerationDays > 0) {
              status = 'macerating';
              const mDate = new Date(productionDate);
              mDate.setDate(mDate.getDate() + macerationDays);
              macerationEndDate = mDate.toISOString().split('T')[0];
          }

          const newProductionRecord: Production = {
              id: uuidv4(),
              date,
              productionType,
              targetVariantId,
              quantityProduced,
              components: newProductionComponents,
              batchNumber,
              expirationDate: expirationDate.toISOString().split('T')[0],
              macerationDays,
              totalCost,
              costPerUnit,
              sourceBatchId: productionType === 'fill' || productionType === 'transform' ? sourceBatchId : undefined,
              ...rest
          };
          yearData.productions.push(newProductionRecord);

          const newFinishedGoodBatch: InventoryBatch = {
              id: uuidv4(),
              variantId: targetVariantId,
              productionId: newProductionRecord.id,
              batchNumber,
              expirationDate: expirationDate.toISOString().split('T')[0],
              initialQuantity: quantityProduced,
              currentQuantity: quantityProduced,
              createdAt: new Date().toISOString(),
              unitCost: costPerUnit,
              status,
              macerationEndDate,
              concentration: action.payload.concentration,
          };
          yearData.inventoryBatches.push(newFinishedGoodBatch);
          break;
      }
      case 'DELETE_PRODUCTION': {
        const productionId = action.payload;
        const prodToDelete = yearData.productions.find(p => p.id === productionId);

        if (prodToDelete) {
          prodToDelete.components.forEach(component => {
            component.sourceBatches.forEach(source => {
                const batch = yearData.inventoryBatches.find(b => b.id === source.batchId);
                if(batch) {
                    batch.currentQuantity += source.quantityTaken;
                }
            });
          });
          
          yearData.inventoryBatches = yearData.inventoryBatches.filter(b => b.productionId !== productionId);
          yearData.productions = yearData.productions.filter(p => p.id !== productionId);
        }
        break;
      }
      
      case 'COMPLETE_MACERATION': {
          const batchId = action.payload;
          const batch = yearData.inventoryBatches.find(b => b.id === batchId);
          if (batch && batch.status === 'macerating') {
              batch.status = 'available';
              
              // Calculate actual days spent macerating
              const created = new Date(batch.createdAt);
              const now = new Date();
              const diffTime = Math.abs(now.getTime() - created.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
              
              batch.actualMacerationDays = diffDays;
          }
          break;
      }
      
      case 'WITHDRAW_PARTIAL_MACERATION': {
        const { batchId, quantity } = action.payload;
        const sourceBatch = yearData.inventoryBatches.find(b => b.id === batchId);

        if (sourceBatch && sourceBatch.status === 'macerating' && quantity > 0 && quantity <= sourceBatch.currentQuantity) {
            
            sourceBatch.currentQuantity -= quantity;

            const today = new Date();
            const macerationStartDate = new Date(sourceBatch.createdAt); 
            const macerationDays = Math.ceil((today.getTime() - macerationStartDate.getTime()) / (1000 * 60 * 60 * 24));

            const newBatch: InventoryBatch = {
                ...sourceBatch,
                id: uuidv4(),
                initialQuantity: quantity,
                currentQuantity: quantity,
                status: 'available',
                macerationEndDate: undefined,
                actualMacerationDays: macerationDays,
                notes: `Prelievo parziale dal lotto ${sourceBatch.batchNumber} in data ${today.toLocaleDateString()}`
            };
            yearData.inventoryBatches.push(newBatch);

            const note = `\n- ${new Date().toLocaleDateString()}: Prelevati ${quantity} pz. Macerazione di ${macerationDays} giorni.`;
            sourceBatch.notes = (sourceBatch.notes || '') + note;
        }
        break;
      }


      // --- VENDITE ---
      case 'ADD_SALE': {
        const { items, vatApplied, discountValue, discountType, shippingCost } = action.payload;
        const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
        
        let discount = 0;
        if (discountValue) {
            discount = discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue;
        }
        const shipping = shippingCost || 0;
        const taxable = Math.max(0, subtotal - discount + shipping);
        const total = vatApplied ? taxable * VAT_RATE : total;
        
        for (const item of items) {
            // Check against AVAILABLE quantity, not total
            const totalAvailable = getVariantAvailableQuantity(item.variantId, yearData.inventoryBatches);
            if (totalAvailable < item.quantity) {
                const variant = yearData.productVariants.find(v => v.id === item.variantId);
                const product = yearData.products.find(p => p.id === variant?.productId);
                alert(`Quantità DISPONIBILE insufficiente per ${product?.name || 'sconosciuto'} - ${variant?.name || ''}. Richiesti: ${item.quantity}, Disponibili (non in macerazione): ${totalAvailable}`);
                return;
            }
        }

        items.forEach(item => {
            // Consume only from available batches
            const sortedBatches = getSortedBatches(item.variantId, yearData.inventoryBatches, true);
            let remainingToTake = item.quantity;
            for (const batch of sortedBatches) {
                if (remainingToTake <= 0) break;
                const takeFromThisBatch = Math.min(batch.currentQuantity, remainingToTake);
                batch.currentQuantity -= takeFromThisBatch;
                remainingToTake -= takeFromThisBatch;
            }
        });

        const newSale: Sale = { 
            id: uuidv4(), 
            ...action.payload, 
            subtotal, 
            total,
            type: 'vendita',
            payments: [] // Inizializza array pagamenti vuoto
        };
        yearData.sales.push(newSale);
        break;
      }
      case 'DELETE_SALE': {
        const saleId = action.payload;
        const saleToDelete = yearData.sales.find(s => s.id === saleId);
        if (saleToDelete) {
            saleToDelete.items.forEach(item => {
                // Semplificazione: ripristina la quantità nei lotti più recenti che hanno spazio
                // Preferibilmente nei lotti 'available'
                const batches = yearData.inventoryBatches
                    .filter(b => b.variantId === item.variantId && b.status === 'available')
                    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                let remainingToRestore = item.quantity;
                
                // Primo giro: prova a riempire i lotti esistenti
                for(const batch of batches) {
                    if(remainingToRestore <= 0) break;
                    const spaceAvailable = batch.initialQuantity - batch.currentQuantity;
                    const restoreToThisBatch = Math.min(spaceAvailable, remainingToRestore);
                    batch.currentQuantity += restoreToThisBatch;
                    remainingToRestore -= restoreToThisBatch;
                }
                
                // Se avanza, crea un nuovo "lotto reso" o forza nel più recente (scelta rapida: forza nel più recente)
                if (remainingToRestore > 0 && batches.length > 0) {
                    batches[0].currentQuantity += remainingToRestore;
                }
            });
            
            // Rimuove tutti i movimenti di incasso collegati a questa vendita
            yearData.partnerLedger = yearData.partnerLedger.filter(e => {
                if (!e.relatedDocumentId) return true;
                // Gestisce sia ID singolo che lista di ID (incasso cumulativo)
                return !e.relatedDocumentId.includes(saleId);
            });
            
            yearData.sales = yearData.sales.filter(s => s.id !== saleId);
        }
        break;
      }
      case 'COLLECT_SALE': {
        const { saleId, partnerId, date, amount } = action.payload;
        const sale = yearData.sales.find(s => s.id === saleId);
        if (sale) {
            // Aggiorna legacy fields per compatibilità, ma usa 'payments' come source of truth
            sale.collectedByPartnerId = partnerId;
            sale.collectionDate = date;
            
            if (!sale.payments) sale.payments = [];
            sale.payments.push({
                id: uuidv4(),
                date,
                amount,
                partnerId
            });

            const customerName = yearData.customers.find(c => c.id === sale.customerId)?.name || 'Sconosciuto';
            const shortId = sale.id.substring(0, 8).toUpperCase();
            
            const ledgerEntry: PartnerLedgerEntry = {
                id: uuidv4(),
                date: date,
                description: `Incasso cliente ${customerName} (Doc #${shortId})`,
                amount: amount,
                partnerId: partnerId,
                relatedDocumentId: sale.id,
            };
            yearData.partnerLedger.push(ledgerEntry);
        }
        break;
      }
      case 'COLLECT_QUOTE': {
        const { quoteId, partnerId, date, amount } = action.payload;
        const quote = yearData.quotes.find(q => q.id === quoteId);
        if (quote) {
            if (!quote.payments) quote.payments = [];
            quote.payments.push({
                id: uuidv4(),
                date,
                amount,
                partnerId
            });

            const customerName = yearData.customers.find(c => c.id === quote.customerId)?.name || 'Sconosciuto';
            const shortId = quote.id.substring(0, 8).toUpperCase();
            
            const ledgerEntry: PartnerLedgerEntry = {
                id: uuidv4(),
                date: date,
                description: `Acconto/Incasso Preventivo ${customerName} (Prev #${shortId})`,
                amount: amount,
                partnerId: partnerId,
                relatedDocumentId: quote.id,
            };
            yearData.partnerLedger.push(ledgerEntry);
        }
        break;
      }
      
      case 'BULK_COLLECT_SALES': {
            const { collections, partnerId, date } = action.payload;
            let totalAmount = 0;
            const saleNumbers: string[] = [];
            let customerName = 'Clienti Vari';
            const saleIds: string[] = [];
            
            // Primo passaggio: identifica il cliente (se tutti uguali) e accumula
            if (collections.length > 0) {
                const firstSale = yearData.sales.find(s => s.id === collections[0].saleId);
                if (firstSale) {
                     customerName = yearData.customers.find(c => c.id === firstSale.customerId)?.name || 'Sconosciuto';
                }
            }

            collections.forEach(col => {
                const sale = yearData.sales.find(s => s.id === col.saleId);
                if (sale) {
                    if (!sale.payments) sale.payments = [];
                    sale.payments.push({
                        id: uuidv4(),
                        date,
                        amount: col.amount,
                        partnerId
                    });
                    
                    // Legacy compatibility
                    sale.collectedByPartnerId = partnerId;
                    sale.collectionDate = date;

                    totalAmount += col.amount;
                    saleNumbers.push(`#${sale.id.substring(0, 8).toUpperCase()}`);
                    saleIds.push(sale.id);
                }
            });

            // Crea un'unica voce nel mastro
            if (totalAmount > 0) {
                const ledgerEntry: PartnerLedgerEntry = {
                    id: uuidv4(),
                    date: date,
                    description: `Incasso Cumulativo (${collections.length} doc) - ${customerName} - Rif: ${saleNumbers.join(', ')}`,
                    amount: totalAmount,
                    partnerId: partnerId,
                    relatedDocumentId: saleIds.join(','), // Memorizza tutti gli ID separati da virgola
                };
                yearData.partnerLedger.push(ledgerEntry);
            }
            break;
      }

      // --- PREVENTIVI ---
      case 'ADD_QUOTE': {
        const { items, vatApplied, discountValue, discountType, shippingCost } = action.payload;
        const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
        
        let discount = 0;
        if (discountValue) {
            discount = discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue;
        }
        const shipping = shippingCost || 0;
        const taxable = Math.max(0, subtotal - discount + shipping);
        const total = vatApplied ? taxable * VAT_RATE : total;

        const newQuote: Quote = { 
            id: uuidv4(), 
            ...action.payload, 
            subtotal, 
            total,
            type: 'preventivo',
            status: 'aperto',
            payments: []
        };
        yearData.quotes.push(newQuote);
        break;
      }
      case 'DELETE_QUOTE': {
          const quoteId = action.payload;
          // Rimuove eventuali incassi collegati al preventivo dal mastro
          yearData.partnerLedger = yearData.partnerLedger.filter(e => e.relatedDocumentId !== quoteId);
          yearData.quotes = yearData.quotes.filter(q => q.id !== quoteId);
          break;
      }
      case 'CONVERT_QUOTE_TO_SALE': {
          const quoteId = action.payload;
          const quote = yearData.quotes.find(q => q.id === quoteId);

          if (quote && quote.status === 'aperto') {
            for (const item of quote.items) {
                const totalAvailable = getVariantAvailableQuantity(item.variantId, yearData.inventoryBatches);
                if (totalAvailable < Number(item.quantity)) {
                    const variant = yearData.productVariants.find(v => v.id === item.variantId);
                    const product = yearData.products.find(p => p.id === variant?.productId);
                    alert(`Quantità DISPONIBILE insufficiente per ${product?.name || 'sconosciuto'} - ${variant?.name || ''}. Richiesti: ${item.quantity}, Disponibili: ${totalAvailable}. Impossibile convertire.`);
                    return;
                }
            }

            quote.items.forEach(item => {
                const sortedBatches = getSortedBatches(item.variantId, yearData.inventoryBatches, true);
                let remainingToTake = Number(item.quantity);
                for (const batch of sortedBatches) {
                    if (remainingToTake <= 0) break;
                    const takeFromThisBatch = Math.min(batch.currentQuantity, remainingToTake);
                    batch.currentQuantity -= takeFromThisBatch;
                    remainingToTake -= takeFromThisBatch;
                }
            });

            // Crea la nuova vendita trasferendo eventuali pagamenti già effettuati sul preventivo
            const newSale: Sale = {
                id: uuidv4(),
                date: new Date().toISOString().split('T')[0],
                customerId: quote.customerId,
                items: quote.items,
                subtotal: quote.subtotal,
                vatApplied: quote.vatApplied,
                total: quote.total,
                type: 'vendita',
                payments: quote.payments || [], // Trasferisce gli acconti
                discountValue: quote.discountValue,
                discountType: quote.discountType,
                shippingCost: quote.shippingCost
            };
            yearData.sales.push(newSale);
            
            quote.status = 'convertito';
          }
          break;
      }
      
      // --- MASTRO SOCI ---
      case 'ADD_MANUAL_LEDGER_ENTRY': {
          yearData.partnerLedger.push({ id: uuidv4(), ...action.payload });
          break;
      }
      case 'SETTLE_PARTNER_DEBT': {
          const { fromPartnerId, toPartnerId, amount, date } = action.payload;
          const fromPartner = draft.state.partners.find(p => p.id === fromPartnerId);
          const toPartner = draft.state.partners.find(p => p.id === toPartnerId);

          if (fromPartner && toPartner) {
               // Il debitore PAGA, quindi ha un'uscita (-) ma per bilanciare il suo debito nel mastro visuale (che è saldo)
               // Se 'from' deve dare soldi a 'to', significa che 'from' è in negativo o 'to' in positivo rispetto alla media.
               
               yearData.partnerLedger.push({
                   id: uuidv4(),
                   date: date,
                   description: `Pareggio conti: versamento a ${toPartner.name}`,
                   amount: amount, // Aumenta il saldo di chi paga (era in deficit)
                   partnerId: fromPartnerId
               });

               yearData.partnerLedger.push({
                   id: uuidv4(),
                   date: date,
                   description: `Pareggio conti: ricevuto da ${fromPartner.name}`,
                   amount: -amount, // Diminuisce il saldo di chi riceve (era in surplus)
                   partnerId: toPartnerId
               });
          }
          break;
      }
      case 'TRANSFER_BETWEEN_PARTNERS': {
          const { fromPartnerId, toPartnerId, amount, date, description, paymentMethod } = action.payload;
          const fromPartner = draft.state.partners.find(p => p.id === fromPartnerId);
          const toPartner = draft.state.partners.find(p => p.id === toPartnerId);

          if (fromPartner && toPartner) {
              // --- 1. Create a snapshot of the current state BEFORE the transaction ---
              const currentBalances = draft.state.partners.map(p => {
                  const entries = yearData.partnerLedger.filter(e => e.partnerId === p.id);
                  const balance = entries.reduce((acc, e) => acc + e.amount, 0);
                  return { partnerId: p.id, partnerName: p.name, balance };
              });
              const totalSystemBalance = currentBalances.reduce((acc, p) => acc + p.balance, 0);
              const targetPerPartner = totalSystemBalance / draft.state.partners.length;

              const snapshot: PartnerSettlement = {
                  id: uuidv4(),
                  date: date, // Use the transaction date for the snapshot
                  totalSystemBalance,
                  targetPerPartner,
                  partnerSnapshots: currentBalances.map(p => ({
                      ...p,
                      status: (p.balance > targetPerPartner + 0.01) ? 'debtor' : (p.balance < targetPerPartner - 0.01) ? 'creditor' : 'balanced'
                  }))
              };
              yearData.partnerSettlements.push(snapshot);

              // --- 2. Apply the transaction ---
              const commonDescription = `${description} (${paymentMethod || 'N/D'})`;
              
              // Sender GIVES money. Balance decreases.
              yearData.partnerLedger.push({
                  id: uuidv4(),
                  date,
                  description: `Trasferimento a ${toPartner.name}: ${commonDescription}`,
                  amount: -amount,
                  partnerId: fromPartnerId,
                  paymentMethod: paymentMethod
              });

              // Receiver GETS money. Balance increases.
              yearData.partnerLedger.push({
                  id: uuidv4(),
                  date,
                  description: `Trasferimento da ${fromPartner.name}: ${commonDescription}`,
                  amount: amount,
                  partnerId: toPartnerId,
                  paymentMethod: paymentMethod
              });
          }
          break;
      }
      case 'ARCHIVE_PARTNER_SETTLEMENT': {
          const settlement = action.payload;
          yearData.partnerSettlements.push(settlement);

          // Add resetting entries for each partner to bring balance to 0
          settlement.partnerSnapshots.forEach(snap => {
              if (snap.balance !== 0) {
                yearData.partnerLedger.push({
                    id: uuidv4(),
                    date: settlement.date,
                    description: `Chiusura Periodo / Archiviazione Conteggio`,
                    amount: -snap.balance, // Opposite of current balance to zero it out
                    partnerId: snap.partnerId
                });
              }
          });
          break;
      }

      // --- SPESE ---
      case 'ADD_EXPENSE': {
          const expense = action.payload;
          yearData.expenses.push(expense);
          if (expense.paidByPartnerId) {
              yearData.partnerLedger.push({
                  id: uuidv4(),
                  date: expense.date,
                  description: `Spesa: ${expense.description}`,
                  amount: -expense.total,
                  partnerId: expense.paidByPartnerId,
                  relatedDocumentId: expense.id
              });
          }
          break;
      }
      case 'UPDATE_EXPENSE': {
          const expense = action.payload;
          const index = yearData.expenses.findIndex(e => e.id === expense.id);
          if (index !== -1) {
              yearData.expenses[index] = expense;

              const ledgerEntryIndex = yearData.partnerLedger.findIndex(e => e.relatedDocumentId === expense.id);
              if (expense.paidByPartnerId) {
                  if (ledgerEntryIndex !== -1) {
                      const entry = yearData.partnerLedger[ledgerEntryIndex];
                      entry.date = expense.date;
                      entry.description = `Spesa: ${expense.description}`;
                      entry.amount = -expense.total;
                      entry.partnerId = expense.paidByPartnerId;
                  } else {
                      yearData.partnerLedger.push({
                          id: uuidv4(),
                          date: expense.date,
                          description: `Spesa: ${expense.description}`,
                          amount: -expense.total,
                          partnerId: expense.paidByPartnerId,
                          relatedDocumentId: expense.id
                      });
                  }
              } else if (ledgerEntryIndex !== -1) {
                  yearData.partnerLedger.splice(ledgerEntryIndex, 1);
              }
          }
          break;
      }
      case 'DELETE_EXPENSE': {
          const expenseId = action.payload;
          yearData.expenses = yearData.expenses.filter(e => e.id !== expenseId);
          yearData.partnerLedger = yearData.partnerLedger.filter(e => e.relatedDocumentId !== expenseId);
          break;
      }
      
      // --- ORDINI CLIENTI ---
        case 'ADD_ORDER':
            yearData.orders.push(action.payload);
            break;
        case 'UPDATE_ORDER': {
            const index = yearData.orders.findIndex(o => o.id === action.payload.id);
            if (index !== -1) {
                yearData.orders[index] = action.payload;
            }
            break;
        }
        case 'DELETE_ORDER':
            yearData.orders = yearData.orders.filter(o => o.id !== action.payload);
            break;
        case 'TOGGLE_ORDER_ITEM_PREPARED': {
            const { orderId, itemId } = action.payload;
            const order = yearData.orders.find(o => o.id === orderId);
            if (order) {
                const item = order.items.find(i => i.variantId === itemId);
                if (item) {
                    item.prepared = !item.prepared;
                }
            }
            break;
        }
        case 'CONVERT_ORDER_TO_SALE': {
            const orderId = action.payload;
            const order = yearData.orders.find(o => o.id === orderId);
            if (order && order.status === 'in-preparazione' && order.items.every(i => i.prepared)) {
                
                //
                // Same inventory check as in ADD_SALE
                //
                for (const item of order.items) {
                    const totalAvailable = getVariantAvailableQuantity(item.variantId, yearData.inventoryBatches);
                    if (totalAvailable < item.quantity) {
                        const variant = yearData.productVariants.find(v => v.id === item.variantId);
                        const product = yearData.products.find(p => p.id === variant?.productId);
                        alert(`Quantità DISPONIBILE insufficiente per ${product?.name || 'sconosciuto'} - ${variant?.name || ''}. Richiesti: ${item.quantity}, Disponibili: ${totalAvailable}`);
                        return; // Stop conversion
                    }
                }

                //
                // Same inventory consumption logic as in ADD_SALE
                //
                order.items.forEach(item => {
                    const sortedBatches = getSortedBatches(item.variantId, yearData.inventoryBatches, true);
                    let remainingToTake = item.quantity;
                    for (const batch of sortedBatches) {
                        if (remainingToTake <= 0) break;
                        const takeFromThisBatch = Math.min(batch.currentQuantity, remainingToTake);
                        batch.currentQuantity -= takeFromThisBatch;
                        remainingToTake -= takeFromThisBatch;
                    }
                });
                
                // Create the new Sale
                const newSale: Sale = {
                    id: uuidv4(),
                    date: new Date().toISOString().split('T')[0],
                    customerId: order.customerId,
                    items: order.items.map(({ prepared, ...item }) => item), // Remove 'prepared' flag
                    subtotal: order.subtotal,
                    vatApplied: order.vatApplied,
                    total: order.total,
                    type: 'vendita',
                    payments: [],
                    discountValue: order.discountValue,
                    discountType: order.discountType,
                    shippingCost: order.shippingCost,
                    // Note: 'notes' from order could be transferred here if Sale type is updated to support it
                };
                yearData.sales.push(newSale);
                
                // Mark the order as completed
                order.status = 'completato';
            }
            break;
        }
        
        // --- RETTIFICA MAGAZZINO ---
      case 'ADJUST_STOCK': {
        const { variantId, newQuantity, reason } = action.payload;
        const currentQuantity = getVariantTotalQuantity(variantId, yearData.inventoryBatches);

        if (newQuantity < 0) {
            alert("La quantità non può essere negativa.");
            return;
        }
        
        const difference = newQuantity - currentQuantity;
        
        if (Math.abs(difference) < 0.001) {
            // Nessuna modifica sostanziale
            return;
        }
        
        // Crea un nuovo batch per la rettifica
        const adjustmentBatch: InventoryBatch = {
            id: uuidv4(),
            variantId,
            initialQuantity: difference,
            currentQuantity: difference,
            createdAt: new Date().toISOString(),
            unitCost: 0, // Le rettifiche non hanno costo diretto, il valore è già nel magazzino
            status: 'available',
            notes: `Rettifica manuale: ${reason}`
        };
        yearData.inventoryBatches.push(adjustmentBatch);
        
        // Registra lo storico della rettifica
        const adjustmentRecord: StockAdjustment = {
            id: uuidv4(),
            date: new Date().toISOString().split('T')[0],
            variantId,
            reason,
            quantityBefore: currentQuantity,
            quantityAfter: newQuantity,
        };
        yearData.stockAdjustments.push(adjustmentRecord);
        break;
      }
    }
  });
};

const statefulReducer = (state: { state: AppState; settings: Settings }, action: Action): { state: AppState; settings: Settings } => {
  switch (action.type) {
    case 'UNDO':
      if (historyIndex > 0) {
        historyIndex--;
      }
      return history[historyIndex];
    case 'REDO':
      if (historyIndex < history.length - 1) {
        historyIndex++;
      }
      return history[historyIndex];
    case 'RESTORE':
      history = [action.payload];
      historyIndex = 0;
      return action.payload;
    default:
      const newState = appReducer(state, action);
      // Se lo stato è cambiato, aggiungi alla storia
      if (newState !== state) {
        history = history.slice(0, historyIndex + 1);
        history.push(newState);
        historyIndex++;
      }
      return newState;
  }
};

// --- CONTEXT ---
interface AppContextType {
  state: AppState;
  settings: Settings;
  dispatch: React.Dispatch<Action>;
  updateSettings: (payload: Partial<Settings>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  backupData: () => void;
  restoreData: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
const AppContext = createContext<AppContextType | undefined>(undefined);

// --- PROVIDER ---
import { User } from '@supabase/supabase-js';
export const AppProvider: React.FC<{ children: React.ReactNode; user: any }> = ({ children, user }) => {
  // --- STATO PER GESTIRE GLI ERRORI (Nuovo) ---
  const [error, setError] = useState<string | null>(null);
  
  const [state, dispatch, { undo, redo, canUndo, canRedo }] = useUndoableState(appReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>(initialState.settings);

  // --- CARICAMENTO DATI BLINDATO ---
  const loadData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
        console.log("Avvio sincronizzazione dati...");

        // Eseguiamo tutte le chiamate in parallelo
        const [
            settingsRes,
            customersRes,
            suppliersRes,
            productsRes,
            salesRes,
            quotesRes,
            expensesRes // Aggiungi qui altre tabelle se servono
        ] = await Promise.all([
            supabase.from('settings').select('*').single(),
            supabase.from('customers').select('*'),
            supabase.from('suppliers').select('*'),
            supabase.from('products').select('*'),
            supabase.from('sales').select('*'),
            supabase.from('quotes').select('*'),
            supabase.from('expenses').select('*')
        ]);

        // Se una chiamata critica fallisce, lanciamo errore
        if (customersRes.error) throw new Error(`Errore Clienti: ${customersRes.error.message}`);
        if (productsRes.error) throw new Error(`Errore Prodotti: ${productsRes.error.message}`);
        if (salesRes.error) throw new Error(`Errore Vendite: ${salesRes.error.message}`);

        // Inizializziamo l'app con i dati scaricati
        // Usiamo l'azione RESTORE che è già presente nel tuo reducer per caricare tutto in colpo solo
        dispatch({
            type: 'RESTORE',
            payload: {
                settings: settingsRes.data || initialState.settings,
                state: {
                    ...initialState, // Mantiene i campi vuoti per quelli non caricati
                    customers: customersRes.data || [],
                    suppliers: suppliersRes.data || [],
                    products: productsRes.data || [],
                    sales: salesRes.data || [],
                    quotes: quotesRes.data || [],
                    expenses: expensesRes.data || [],
                    // ... mappa qui eventuali altri dati (stock, inventory, ecc.) ...
                }
            }
        });

        if (settingsRes.data) {
            setSettings(settingsRes.data);
        }

    } catch (e: any) {
        console.error("ERRORE CRITICO:", e);
        // Qui blocchiamo l'app invece di farla crashare
        setError(e.message || "Errore di connessione al database.");
    } finally {
        setIsLoading(false);
    }
  }, [user, dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- FUNZIONI DI SUPPORTO (Le tue originali) ---
  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
  }, [dispatch]);

  const backupData = useCallback(() => {
      const dataStr = JSON.stringify({ state, settings });
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `backup_${new Date().toISOString().slice(0,10)}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
  }, [state, settings]);

  const restoreData = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
        fileReader.readAsText(event.target.files[0], "UTF-8");
        fileReader.onload = e => {
            const result = e.target?.result;
            if (typeof result === 'string') {
                try {
                    const { state, settings } = JSON.parse(result);
                    if (state && settings) {
                         dispatch({ type: 'RESTORE', payload: { state, settings } });
                    }
                } catch (error) { console.error(error); }
            }
        };
    }
  }, [dispatch]);

  // --- INTERFACCIA DI ERRORE (Invece della Schermata Bianca) ---
  if (error) {
    return (
        <div className="flex h-screen flex-col items-center justify-center bg-red-50 p-8 text-center font-sans">
            <h1 className="text-2xl font-bold text-red-700 mb-4">Si è verificato un problema</h1>
            <div className="bg-white p-4 rounded border border-red-200 shadow-sm mb-6 max-w-lg">
                <code className="text-red-600 block mb-2">Errore: {error}</code>
                <p className="text-sm text-gray-500">Impossibile caricare i dati (es. Vendite o Prodotti).</p>
            </div>
            <div className="flex gap-4">
                <button onClick={loadData} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Riprova Connessione
                </button>
                <button 
                    onClick={() => { localStorage.clear(); window.location.reload(); }}
                    className="px-6 py-2 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50"
                >
                    Reset Cache & Riavvia
                </button>
            </div>
        </div>
    );
  }

  // --- LOADER ---
  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center bg-white">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">Caricamento Gestionale...</p>
            </div>
        </div>
    );
  }

  // --- APP NORMALE ---
  // Nota: loadData non è nel value per non rompere l'interfaccia originale, ma viene usato internamente
  const value = { state, settings, dispatch, updateSettings, undo, redo, canUndo, canRedo, backupData, restoreData };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
// --- HOOK ---
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
