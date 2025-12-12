
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { View, Customer, Supplier, Agent, Product, StockLoad, StockLoadItem, Category, Partner, ProductVariant, Sale, PartnerLedgerEntry, Quote, Production, ProductionComponent, InventoryBatch, YearData, CompanyInfo, PartnerSettlement } from '../types';
import { useAppContext } from '../state/AppContext';
import { Button, Input, Modal, ConfirmDialog, Card, Table, Alert } from './ui';
import { navItems } from './Sidebar';
import { PlusCircle, Edit, Trash2, Check, X, DollarSign, Layers, ArrowUpDown, Image as ImageIcon, Eye, Euro, Users as UsersIcon, Package as PackageIcon, FileText as FileTextIcon, ListTree, Printer, FileDown, Briefcase, TrendingUp, Wine, Clock, Lock, ShoppingCart, Factory, CircleDollarSign, Calendar, PiggyBank, ArrowRightLeft, Archive, Droplets, Beaker, Barcode, Truck, Wallet, BookOpen, Info, Search, Plus, Filter, CheckSquare, Warehouse, FlaskConical, LayoutGrid, FileStack, CheckCircle2, UserCheck, Building, ScrollText, History, ArrowRight, ArrowUpCircle, ArrowDownCircle, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { SpeseView } from './Spese';
import { OrdiniClientiView } from './OrdiniClienti';

// --- UTILS PER ORDINAMENTO ---
const SortHeader = ({ label, sortKey, currentSort, onSort }: { label: string, sortKey: string, currentSort: { key: string, direction: string }, onSort: (key: string) => void }) => (
    <div className="flex items-center cursor-pointer hover:text-primary-600 transition-colors select-none" onClick={() => onSort(sortKey)}>
        {label}
        {currentSort.key === sortKey ? (
            <ArrowUpDown size={14} className={`ml-1 transform transition-transform ${currentSort.direction === 'ascending' ? 'rotate-0' : 'rotate-180'}`} />
        ) : (
            <ArrowUpDown size={14} className="ml-1 opacity-20" />
        )}
    </div>
);

const useSortableData = <T,>(items: T[], config = { key: 'date', direction: 'ascending' }) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: string) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};

// --- COMPONENTI PER LA STAMPA ---

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentName: string;
  children: React.ReactNode;
}

const PrintModal: React.FC<PrintModalProps> = ({ isOpen, onClose, title, documentName, children }) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const processDocument = async (action: 'print' | 'pdf' | 'jpg') => {
        const element = printRef.current;
        if (!element) return;

        setIsProcessing(true);

        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            
            if (action === 'jpg') {
                const data = canvas.toDataURL('image/jpeg', 0.95);
                const link = document.createElement('a');
                link.href = data;
                link.download = `${documentName}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else { 
                const data = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgProperties = pdf.getImageProperties(data);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;
                
                let heightLeft = pdfHeight;
                let position = 0;

                pdf.addImage(data, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;

                while (heightLeft > 0) {
                    position -= pageHeight; // Shift image up by one page height
                    pdf.addPage();
                    pdf.addImage(data, 'PNG', 0, position, pdfWidth, pdfHeight);
                    heightLeft -= pageHeight;
                }

                if (action === 'pdf') {
                    pdf.save(`${documentName}.pdf`);
                } else { 
                    pdf.autoPrint();
                    window.open(pdf.output('bloburl') as unknown as string, '_blank');
                }
            }
        } catch (error) {
            console.error("Errore durante l'esportazione:", error);
            alert("Si è verificato un errore durante la creazione del documento.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const footer = (
        <>
            <Button variant="secondary" onClick={onClose} disabled={isProcessing}>Chiudi</Button>
            <Button onClick={() => processDocument('print')} disabled={isProcessing}>
                <Printer className="mr-2 h-4 w-4" /> {isProcessing ? 'Elaboro...' : 'Stampa'}
            </Button>
            <Button onClick={() => processDocument('pdf')} disabled={isProcessing}>
                <FileDown className="mr-2 h-4 w-4" /> {isProcessing ? 'Elaboro...' : 'PDF'}
            </Button>
            <Button onClick={() => processDocument('jpg')} disabled={isProcessing}>
                <ImageIcon className="mr-2 h-4 w-4" /> {isProcessing ? 'Elaboro...' : 'JPG'}
            </Button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
            <div className="bg-gray-100 dark:bg-gray-900 p-4 max-h-[80vh] overflow-y-auto">
                <div ref={printRef} className="bg-white text-black shadow-lg printable-area w-[210mm] min-h-[297mm] mx-auto">
                    {children}
                </div>
            </div>
        </Modal>
    );
};

interface PrintableSaleQuoteProps {
    doc: Sale | Quote;
    customer: Customer;
    allVariants: (ProductVariant & { productName: string })[];
    companyInfo: CompanyInfo;
}
const PrintableSaleQuote: React.FC<PrintableSaleQuoteProps> = ({ doc, customer, allVariants, companyInfo }) => {
    const isQuote = doc.type === 'preventivo';
    
    let discountAmount = 0;
    if (doc.discountValue) {
        discountAmount = doc.discountType === 'percentage' 
            ? doc.subtotal * (doc.discountValue / 100)
            : doc.discountValue;
    }
    const shipping = doc.shippingCost || 0;
    
    return (
        <div className="font-sans text-sm p-8">
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800">
                <div>
                    <Briefcase size={48} className="text-primary-600" />
                    <h1 className="text-2xl font-bold mt-2">{companyInfo.name}</h1>
                    <p>{companyInfo.address}, {companyInfo.city}</p>
                    <p>P.IVA: {companyInfo.vatNumber}</p>
                    <p>Email: {companyInfo.email} | Tel: {companyInfo.phone}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold uppercase text-gray-600">{isQuote ? 'Preventivo' : 'Fattura'}</h2>
                    <p className="mt-2">Numero: <strong>#{doc.id.substring(0, 8).toUpperCase()}</strong></p>
                    <p>Data: <strong>{new Date(doc.date).toLocaleDateString()}</strong></p>
                </div>
            </header>
            <section className="mt-8 mb-8">
                <h3 className="font-bold text-gray-600">Cliente:</h3>
                <div className="p-4 border rounded bg-gray-50">
                    <p className="font-bold text-lg">{customer.name}</p>
                    <p>{customer.address}, {customer.zip} {customer.city} ({customer.province})</p>
                    {customer.vatNumber && <p>P.IVA/CF: {customer.vatNumber}</p>}
                    {customer.sdi && <p>SDI: {customer.sdi}</p>}
                </div>
            </section>
            <section>
                <table className="w-full text-left">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="p-2">Prodotto</th>
                            <th className="p-2 text-center">Quantità</th>
                            <th className="p-2 text-right">Prezzo Unit.</th>
                            <th className="p-2 text-right">Totale</th>
                        </tr>
                    </thead>
                    <tbody>
                        {doc.items.map(item => {
                            const variant = allVariants.find(v => v.id === item.variantId);
                            const name = variant ? `${variant.productName} - ${variant.name}` : 'Prodotto non trovato';
                            return (
                                <tr key={item.variantId} className="border-b">
                                    <td className="p-2">{name}</td>
                                    <td className="p-2 text-center">{item.quantity}</td>
                                    <td className="p-2 text-right">€{item.price.toFixed(2)}</td>
                                    <td className="p-2 text-right">€{(item.quantity * item.price).toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>
            <section className="flex justify-end mt-8">
                <div className="w-1/2 space-y-2">
                    <div className="flex justify-between"><span>Subtotale Articoli:</span> <span>€{doc.subtotal.toFixed(2)}</span></div>
                    {discountAmount > 0 && (
                        <div className="flex justify-between text-red-600">
                            <span>Sconto {doc.discountType === 'percentage' ? `(${doc.discountValue}%)` : '(Fisso)'}:</span> 
                            <span>-€{discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    {shipping > 0 && (
                        <div className="flex justify-between"><span>Spedizione:</span> <span>€{shipping.toFixed(2)}</span></div>
                    )}
                    
                    <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Imponibile:</span> 
                        <span>€{(doc.subtotal - discountAmount + shipping).toFixed(2)}</span>
                    </div>

                    {doc.vatApplied && <div className="flex justify-between"><span>IVA (22%):</span> <span>€{(doc.total - (doc.subtotal - discountAmount + shipping)).toFixed(2)}</span></div>}
                    <div className="flex justify-between font-bold text-xl border-t-2 pt-2 mt-2"><span>Totale:</span> <span>€{doc.total.toFixed(2)}</span></div>
                </div>
            </section>
            <footer className="mt-16 pt-4 text-center text-xs text-gray-500 border-t">
                <p>Grazie per averci scelto.</p>
                <p>{companyInfo.name}</p>
            </footer>
        </div>
    );
};

interface PrintableStockLoadProps {
    load: StockLoad;
    supplier?: Supplier;
    allVariants: (ProductVariant & { productName: string })[];
    companyInfo: CompanyInfo;
}
const PrintableStockLoad: React.FC<PrintableStockLoadProps> = ({ load, supplier, allVariants, companyInfo }) => {
    const subtotal = load.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    let discountAmount = 0;
    if (load.discountValue) {
        discountAmount = load.discountType === 'percentage' 
            ? subtotal * (load.discountValue / 100)
            : load.discountValue;
    }
    const shipping = load.shippingCost || 0;

    return (
        <div className="font-sans text-sm p-8">
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800">
                <div>
                     <h1 className="text-2xl font-bold">{companyInfo.name}</h1>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold uppercase text-gray-600">Documento di Carico</h2>
                    <p className="mt-2">Numero: <strong>#{load.id.substring(0, 8).toUpperCase()}</strong></p>
                    <p>Data: <strong>{new Date(load.date).toLocaleDateString()}</strong></p>
                </div>
            </header>
            <section className="mt-8 mb-8">
                <h3 className="font-bold text-gray-600">Fornitore / Provenienza:</h3>
                <div className="p-4 border rounded bg-gray-50">
                    {supplier ? (
                        <>
                            <p className="font-bold text-lg">{supplier.name}</p>
                            <p>{supplier.address}, {supplier.city}</p>
                            {supplier.vatNumber && <p>P.IVA: {supplier.vatNumber}</p>}
                        </>
                    ) : (
                        <p className="font-bold text-lg">Deposito / Merce Interna</p>
                    )}
                    {load.items[0]?.batchNumber && <p className="mt-2 text-xs text-gray-500">Note: {load.items[0].batchNumber}</p>} 
                    {/* Nota: Usiamo batchNumber impropriamente per note globali in visualizzazione semplice se c'è */}
                </div>
            </section>
            <section>
                <table className="w-full text-left">
                     <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="p-2">Prodotto</th>
                            <th className="p-2">Lotto</th>
                            <th className="p-2">Scadenza</th>
                            <th className="p-2 text-center">Quantità</th>
                            <th className="p-2 text-right">Prezzo Unit.</th>
                            <th className="p-2 text-right">Totale</th>
                        </tr>
                    </thead>
                    <tbody>
                        {load.items.map((item, index) => {
                             const variant = allVariants.find(v => v.id === item.variantId);
                             const name = variant ? `${variant.productName} - ${variant.name}` : 'Prodotto non trovato';
                             return (
                                <tr key={index} className="border-b">
                                    <td className="p-2">{name}</td>
                                    <td className="p-2 font-mono text-xs">{item.batchNumber || '-'}</td>
                                    <td className="p-2">{item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : '-'}</td>
                                    <td className="p-2 text-center">{item.quantity}</td>
                                    <td className="p-2 text-right">€{item.price.toFixed(4)}</td>
                                    <td className="p-2 text-right">€{(item.quantity * item.price).toFixed(2)}</td>
                                </tr>
                             );
                        })}
                    </tbody>
                </table>
            </section>
             <section className="flex justify-end mt-8">
                <div className="w-1/2 space-y-2">
                    <div className="flex justify-between"><span>Subtotale Articoli:</span> <span>€{subtotal.toFixed(2)}</span></div>
                    {discountAmount > 0 && (
                        <div className="flex justify-between text-red-600">
                            <span>Sconto {load.discountType === 'percentage' ? `(${load.discountValue}%)` : '(Fisso)'}:</span> 
                            <span>-€{discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    {shipping > 0 && (
                        <div className="flex justify-between"><span>Spedizione:</span> <span>€{shipping.toFixed(2)}</span></div>
                    )}
                    
                    <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Imponibile:</span> 
                        <span>€{(subtotal - discountAmount + shipping).toFixed(2)}</span>
                    </div>
                    {load.vatApplied && (
                        <div className="flex justify-between"><span>IVA (22%):</span> <span>€{(load.total - (subtotal - discountAmount + shipping)).toFixed(2)}</span></div>
                    )}
                    <div className="flex justify-between font-bold text-xl border-t-2 pt-2 mt-2"><span>Totale Documento:</span> <span>€{load.total.toFixed(2)}</span></div>
                </div>
            </section>
        </div>
    );
}

interface PrintableInventoryProps {
    variants: any[];
    companyInfo: CompanyInfo;
}
const PrintableInventory: React.FC<PrintableInventoryProps> = ({ variants, companyInfo }) => {
     return (
        <div className="font-sans text-sm p-8">
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800 mb-6">
                <div>
                     <h1 className="text-2xl font-bold">{companyInfo.name}</h1>
                     <p>Report Giacenze di Magazzino</p>
                </div>
                <div className="text-right">
                    <p>Data: <strong>{new Date().toLocaleDateString()}</strong></p>
                </div>
            </header>
            <table className="w-full text-left">
                <thead className="bg-gray-800 text-white">
                    <tr>
                        <th className="p-2">Brand</th>
                        <th className="p-2">Prodotto</th>
                        <th className="p-2">Variante</th>
                        <th className="p-2">Categoria</th>
                        <th className="p-2">Posizione</th>
                        <th className="p-2 text-center">Giacenza</th>
                        <th className="p-2 text-right">Valore Unit.</th>
                        <th className="p-2 text-right">Valore Tot.</th>
                    </tr>
                </thead>
                <tbody>
                    {variants.map((v, idx) => (
                        <tr key={v.id} className="border-b">
                            <td className="p-2 text-xs font-bold">{v.brand || '-'}</td>
                            <td className="p-2">{v.productName}</td>
                            <td className="p-2">{v.name}</td>
                            <td className="p-2 text-xs">{v.category}</td>
                             <td className="p-2 text-xs">{v.location || '-'}</td>
                            <td className="p-2 text-center font-bold">{v.quantity}</td>
                            <td className="p-2 text-right">€{v.purchasePrice.toFixed(2)}</td>
                            <td className="p-2 text-right">€{(v.quantity * v.purchasePrice).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="mt-8 text-right font-bold text-xl">
                Valore Totale Magazzino: €{variants.reduce((acc, v) => acc + (v.quantity * v.purchasePrice), 0).toFixed(2)}
            </div>
        </div>
    );
};

interface PrintableCatalogProps {
    products: (Product & { variants: ProductVariant[] })[];
    companyInfo: CompanyInfo;
    title: string;
}
const PrintableCatalog: React.FC<PrintableCatalogProps> = ({ products, companyInfo, title }) => {
    // 1. Raggruppa e Ordina per Categoria e Brand
    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => {
            const catA = (a.category || '').toLowerCase();
            const catB = (b.category || '').toLowerCase();
            if (catA < catB) return -1;
            if (catA > catB) return 1;

            const brandA = (a.brand || '').toLowerCase();
            const brandB = (b.brand || '').toLowerCase();
            if (brandA < brandB) return -1;
            if (brandA > brandB) return 1;
            
            return a.name.localeCompare(b.name);
        });
    }, [products]);

    // 2. Suddividi in pagine da 5
    const itemsPerPage = 5;
    const pages = useMemo(() => {
        const chunks = [];
        for (let i = 0; i < sortedProducts.length; i += itemsPerPage) {
            chunks.push(sortedProducts.slice(i, i + itemsPerPage));
        }
        return chunks;
    }, [sortedProducts]);

    return (
        <div className="font-sans text-gray-900">
            {pages.map((chunk, pageIndex) => {
                let lastCategory = pageIndex > 0 ? sortedProducts[(pageIndex * itemsPerPage) - 1].category : '';
                
                return (
                    <div 
                        key={pageIndex} 
                        style={{ 
                            width: '210mm', 
                            height: '296mm', // Leggermente meno di 297 per evitare overflow
                            padding: '15mm',
                            position: 'relative',
                            pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto',
                            backgroundColor: 'white',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {/* Header */}
                        <header className="border-b-2 border-primary-600 pb-4 mb-4 shrink-0">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h1 className="text-2xl font-bold uppercase text-gray-800">{companyInfo.name}</h1>
                                    <p className="text-xs text-gray-500">{title} - Pagina {pageIndex + 1}</p>
                                </div>
                                <div className="text-right text-xs text-gray-400">
                                    {new Date().toLocaleDateString()}
                                </div>
                            </div>
                        </header>
                        
                        {/* Content */}
                        <div className="flex-grow flex flex-col justify-start space-y-4">
                            {chunk.map((product) => {
                                const showCategoryHeader = product.category !== lastCategory;
                                lastCategory = product.category;

                                return (
                                    <React.Fragment key={product.id}>
                                        {showCategoryHeader && (
                                            <div className="bg-gray-200 px-3 py-1 text-sm font-bold uppercase tracking-wider text-gray-700 mt-2 rounded">
                                                {product.category}
                                            </div>
                                        )}
                                        <div className="flex flex-row border-b last:border-0 pb-2 h-[42mm] overflow-hidden">
                                            <div className="w-[40mm] h-[40mm] flex-shrink-0 bg-gray-50 rounded flex items-center justify-center mr-4">
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain" />
                                                ) : (
                                                    <ImageIcon className="text-gray-300" size={24} />
                                                )}
                                            </div>
                                            <div className="flex-grow min-w-0 flex flex-col justify-center">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700">{product.brand || 'NO BRAND'}</span>
                                                    <span className="text-[10px] font-mono text-gray-400">#{product.code}</span>
                                                </div>
                                                <h3 className="text-base font-bold truncate leading-tight mb-1">{product.name}</h3>
                                                <p className="text-[10px] text-gray-500 line-clamp-2 italic mb-1">{product.description}</p>
                                                
                                                {/* Varianti compatte */}
                                                <div className="flex flex-wrap gap-2 mt-auto">
                                                    {product.variants.slice(0, 4).map(v => (
                                                        <span key={v.id} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded border border-gray-200 whitespace-nowrap">
                                                            {v.name}: <strong>€{v.salePrice.toFixed(2)}</strong>
                                                        </span>
                                                    ))}
                                                    {product.variants.length > 4 && <span className="text-[10px] text-gray-400">+{product.variants.length - 4} varianti</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                        
                        {/* Footer */}
                        <footer className="mt-auto pt-2 border-t text-center text-[9px] text-gray-400 shrink-0">
                            {companyInfo.address} - {companyInfo.city} | P.IVA: {companyInfo.vatNumber} | {companyInfo.email}
                        </footer>
                    </div>
                );
            })}
            
            {pages.length === 0 && (
                <div className="p-10 text-center">Nessun prodotto da visualizzare.</div>
            )}
        </div>
    );
};

// --- MODALS HELPER ---

interface ProductSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedVariantIds: string[]) => void;
    title?: string;
}

const ProductSelectorModal: React.FC<ProductSelectorModalProps> = ({ isOpen, onClose, onConfirm, title = "Seleziona Prodotti" }) => {
    const { state, settings } = useAppContext();
    const { products, productVariants, categories } = state[settings.currentYear];
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());

    const filteredVariants = useMemo(() => {
        return productVariants.filter(v => {
            const product = products.find(p => p.id === v.productId);
            if (!product) return false;

            const matchCategory = selectedCategory === 'all' || product.category === selectedCategory;
            if (!matchCategory) return false;

            const searchLower = searchTerm.toLowerCase();
            const matchSearch = 
                product.name.toLowerCase().includes(searchLower) ||
                (product.code && product.code.toLowerCase().includes(searchLower)) ||
                (product.brand && product.brand.toLowerCase().includes(searchLower)) ||
                v.name.toLowerCase().includes(searchLower);

            return matchSearch;
        });
    }, [productVariants, products, searchTerm, selectedCategory]);

    const handleToggleSelect = (variantId: string) => {
        const newSet = new Set(selectedVariants);
        if (newSet.has(variantId)) {
            newSet.delete(variantId);
        } else {
            newSet.add(variantId);
        }
        setSelectedVariants(newSet);
    };

    const handleConfirm = () => {
        onConfirm(Array.from(selectedVariants));
        setSelectedVariants(new Set());
        onClose();
    };

    const getProductInfo = (variant: ProductVariant) => {
        return products.find(p => p.id === variant.productId);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="flex flex-col h-[70vh]">
                <div className="flex flex-col md:flex-row gap-4 mb-4 pb-4 border-b dark:border-gray-700">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <Input placeholder="Cerca..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 w-full" />
                    </div>
                    <div className="w-full md:w-1/3">
                        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600">
                            <option value="all">Tutte le Categorie</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredVariants.map(v => {
                                const p = getProductInfo(v);
                                return (
                                    <tr key={v.id} onClick={() => handleToggleSelect(v.id)} className={`cursor-pointer ${selectedVariants.has(v.id) ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50'}`}>
                                        <td className="px-4 py-3"><input type="checkbox" checked={selectedVariants.has(v.id)} onChange={() => {}} className="h-4 w-4" /></td>
                                        <td className="px-4 py-3 text-sm">{p?.name} - {v.name}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="pt-4 mt-4 border-t flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onClose}>Annulla</Button>
                    <Button onClick={handleConfirm} disabled={selectedVariants.size === 0}>Aggiungi</Button>
                </div>
            </div>
        </Modal>
    );
};

// --- NUOVA DASHBOARD STILE iOS ---

const DashboardView: React.FC = () => { 
    const { state, settings } = useAppContext(); 

    const handleAppClick = (viewName: View) => {
        const event = new CustomEvent('navigate-view', { detail: viewName });
        window.dispatchEvent(event);
    };

    const yearData = state[settings.currentYear];
    
    // Calcolo Dati Widget
    const totalSales = yearData.sales.reduce((acc, s) => acc + s.total, 0); // Fatturato Lordo Totale (inc. IVA)
    const todaySales = yearData.sales
        .filter(s => new Date(s.date).toDateString() === new Date().toDateString())
        .reduce((acc, s) => acc + s.total, 0);
    const pendingQuotes = yearData.quotes.filter(q => q.status === 'aperto').length;
    const maceratingBatches = yearData.inventoryBatches.filter(b => b.status === 'macerating').length;

    // Calcolo Utile Totale (Stimato)
    const totalProfit = useMemo(() => {
        return yearData.sales.reduce((acc, sale) => {
             // Ricavo netto riga per riga (approssimazione: imponibile - costi merce)
             // Per semplicità usiamo: (Prezzo Vendita Item * Qtà) - (Prezzo Acquisto * Qtà)
             // Nota: questo calcola il margine lordo sulle vendite, ignorando sconti globali se applicati al totale e non alle righe
             
             let saleGrossMargin = 0;
             sale.items.forEach(item => {
                 const variant = yearData.productVariants.find(v => v.id === item.variantId);
                 const cost = variant ? variant.purchasePrice : 0;
                 const revenue = item.price; // Prezzo unitario di vendita
                 saleGrossMargin += (revenue - cost) * item.quantity;
             });

             // Sottrai sconti globali se presenti
             if (sale.discountValue) {
                 const discountAmount = sale.discountType === 'percentage'
                    ? (sale.subtotal * sale.discountValue / 100)
                    : sale.discountValue;
                 saleGrossMargin -= discountAmount;
             }

             return acc + saleGrossMargin;
        }, 0);
    }, [yearData.sales, yearData.productVariants]);

    // Filter navItems to exclude Dashboard itself from the grid
    const appIcons = navItems.filter(item => item.view !== 'dashboard');

    return ( 
        <div className="space-y-8 animate-fade-in p-2"> 
            {/* Header & Date */}
            <div className="flex flex-col mb-4">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-500 dark:from-white dark:to-gray-400">
                    {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">Buongiorno, ecco il riepilogo.</p>
            </div>

            {/* WIDGETS ROW (Scrollabile orizzontalmente su mobile) */}
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
                
                {/* Total Revenue Widget */}
                <div 
                    onClick={() => handleAppClick('sales-history')}
                    className="snap-center shrink-0 w-40 h-40 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:scale-105 transition-transform cursor-pointer"
                >
                    <div className="bg-blue-100 dark:bg-blue-900/30 w-8 h-8 rounded-full flex items-center justify-center text-blue-600">
                        <TrendingUp size={16} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Fatturato Totale</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white">€{totalSales.toFixed(0)}</p>
                        <p className="text-[10px] text-blue-500 mt-1">Anno Corrente</p>
                    </div>
                </div>

                {/* Total Profit Widget */}
                <div 
                    onClick={() => handleAppClick('sales-history')}
                    className="snap-center shrink-0 w-40 h-40 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:scale-105 transition-transform cursor-pointer"
                >
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 w-8 h-8 rounded-full flex items-center justify-center text-emerald-600">
                        <PiggyBank size={16} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Utile Stimato</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white">€{totalProfit.toFixed(0)}</p>
                        <p className="text-[10px] text-emerald-500 mt-1">Margine Lordo</p>
                    </div>
                </div>

                {/* Sales Widget */}
                <div 
                    onClick={() => handleAppClick('sales-history')}
                    className="snap-center shrink-0 w-40 h-40 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:scale-105 transition-transform cursor-pointer"
                >
                    <div className="bg-green-100 dark:bg-green-900/30 w-8 h-8 rounded-full flex items-center justify-center text-green-600">
                        <Euro size={16} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Vendite Oggi</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white">€{todaySales.toFixed(0)}</p>
                        <p className="text-[10px] text-green-500 mt-1">Incasso giornaliero</p>
                    </div>
                </div>

                {/* Quotes Widget */}
                <div 
                    onClick={() => handleAppClick('quotes-history')}
                    className="snap-center shrink-0 w-40 h-40 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:scale-105 transition-transform cursor-pointer"
                >
                     <div className="bg-indigo-100 dark:bg-indigo-900/30 w-8 h-8 rounded-full flex items-center justify-center text-indigo-600">
                        <FileTextIcon size={16} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Preventivi</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white">{pendingQuotes}</p>
                        <p className="text-[10px] text-indigo-500 mt-1">In attesa</p>
                    </div>
                </div>

                {/* Production Widget */}
                <div 
                    onClick={() => handleAppClick('cellar')}
                    className="snap-center shrink-0 w-40 h-40 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:scale-105 transition-transform cursor-pointer"
                >
                     <div className="bg-amber-100 dark:bg-amber-900/30 w-8 h-8 rounded-full flex items-center justify-center text-amber-600">
                        <Wine size={16} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Cantina</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white">{maceratingBatches}</p>
                        <p className="text-[10px] text-amber-500 mt-1">Lotti in macerazione</p>
                    </div>
                </div>

                 {/* Quick Action Widget */}
                 <div onClick={() => handleAppClick('new-sale')} className="snap-center shrink-0 w-40 h-40 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-4 shadow-lg flex flex-col justify-center items-center text-white cursor-pointer hover:scale-105 transition-transform">
                    <PlusCircle size={32} className="mb-2" />
                    <p className="font-bold text-sm">Nuova Vendita</p>
                </div>
            </div>

            {/* APP GRID */}
            <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Le tue App</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {appIcons.map((app) => (
                        <div 
                            key={app.view} 
                            onClick={() => handleAppClick(app.view as View)}
                            className="group flex flex-col items-center cursor-pointer"
                        >
                            <div className={`
                                w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] 
                                bg-gradient-to-br ${app.color} 
                                shadow-lg shadow-gray-200 dark:shadow-black/50
                                flex items-center justify-center text-white
                                transform transition-all duration-300
                                group-hover:scale-110 group-hover:shadow-xl
                                mb-3 relative overflow-hidden
                            `}>
                                {/* Glossy effect */}
                                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                                <app.icon size={32} strokeWidth={1.5} />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {app.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div> 
    ); 
};

// --- ALTRE VISTE ---

export const CompanyInfoModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { settings, updateSettings } = useAppContext();
    const [info, setInfo] = useState(settings.companyInfo);

    useEffect(() => {
        setInfo(settings.companyInfo);
    }, [settings.companyInfo, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInfo({ ...info, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        updateSettings({ companyInfo: info });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Dati Azienda">
            <div className="space-y-4">
                <Input label="Nome Azienda" name="name" value={info.name} onChange={handleChange} />
                <Input label="Indirizzo" name="address" value={info.address} onChange={handleChange} />
                <Input label="Città" name="city" value={info.city} onChange={handleChange} />
                <Input label="Partita IVA" name="vatNumber" value={info.vatNumber} onChange={handleChange} />
                <Input label="Email" name="email" value={info.email} onChange={handleChange} />
                <Input label="Telefono" name="phone" value={info.phone} onChange={handleChange} />
                <div className="flex justify-end pt-4">
                    <Button variant="secondary" onClick={onClose}>Annulla</Button>
                    <Button onClick={handleSave} className="ml-2">Salva</Button>
                </div>
            </div>
        </Modal>
    );
};

const DocumentDetailModal: React.FC<{ isOpen: boolean, onClose: () => void, doc: Sale | Quote | null }> = ({ isOpen, onClose, doc }) => {
    const { state, settings } = useAppContext();
    const yearData = state[settings.currentYear];
    
    if (!doc) return null;

    const getProductName = (variantId: string) => {
        const variant = yearData.productVariants.find(v => v.id === variantId);
        const product = yearData.products.find(p => p.id === variant?.productId);
        return product && variant ? `${product.name} - ${variant.name}` : 'Sconosciuto';
    };

    const isSale = doc.type === 'vendita';
    const isQuote = doc.type === 'preventivo';

    const getPartnerName = (id?: string) => {
        if (!id) return 'Sconosciuto';
        return state.partners.find(p => p.id === id)?.name || 'Sconosciuto';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Dettaglio Documento #${doc.id.substring(0,8).toUpperCase()}`}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Data:</strong> {new Date(doc.date).toLocaleDateString()}</div>
                    <div><strong>Totale:</strong> €{doc.total.toFixed(2)}</div>
                    <div><strong>Tipo:</strong> {doc.type}</div>
                    <div><strong>Stato:</strong> {'status' in doc ? doc.status : 'N/A'}</div>
                </div>
                <Table headers={["Prodotto", "Qtà", "Prezzo", "Totale"]}>
                    {doc.items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{getProductName(item.variantId)}</td>
                            <td className="px-4 py-2 text-sm text-center">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right">€{item.price.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-right">€{(item.quantity * item.price).toFixed(2)}</td>
                        </tr>
                    ))}
                </Table>
                {doc.discountValue ? (
                    <div className="text-right text-sm text-red-600">
                        Sconto: -€{doc.discountType === 'percentage' ? ((doc.subtotal * doc.discountValue)/100).toFixed(2) : doc.discountValue}
                    </div>
                ) : null}
                {doc.shippingCost ? (
                    <div className="text-right text-sm">
                        Spedizione: €{doc.shippingCost}
                    </div>
                ) : null}

                {/* Sezione Pagamenti per Vendite o Preventivi */}
                {(isSale || isQuote) && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="font-semibold text-sm mb-2">Storico Pagamenti (Incassi)</h4>
                        {((doc as Sale | Quote).payments && (doc as Sale | Quote).payments!.length > 0) ? (
                            <ul className="text-sm space-y-1 bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
                                {(doc as Sale | Quote).payments!.map(p => (
                                    <li key={p.id} className="flex justify-between border-b dark:border-gray-600 last:border-0 pb-1">
                                        <span>{new Date(p.date).toLocaleDateString()}</span>
                                        <span>Incassato da: <strong>{getPartnerName(p.partnerId)}</strong></span>
                                        <span className="font-mono font-bold text-green-600">€{p.amount.toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (isSale && (doc as Sale).collectedByPartnerId) ? (
                            // Legacy support for Sale
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Incassato da: <strong>{getPartnerName((doc as Sale).collectedByPartnerId)}</strong> il {new Date((doc as Sale).collectionDate || doc.date).toLocaleDateString()}
                            </p>
                        ) : (
                            <p className="text-sm text-gray-500 italic">Nessun pagamento registrato.</p>
                        )}
                    </div>
                )}

                 <div className="flex justify-end pt-4">
                    <Button variant="secondary" onClick={onClose}>Chiudi</Button>
                </div>
            </div>
        </Modal>
    );
};

const CollectionModal: React.FC<{ isOpen: boolean, onClose: () => void, doc: Sale | Quote | null }> = ({ isOpen, onClose, doc }) => {
    const { state, dispatch } = useAppContext();
    const [amount, setAmount] = useState(0);
    const [partnerId, setPartnerId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (doc) {
            const paid = doc.payments ? doc.payments.reduce((acc, p) => acc + p.amount, 0) : ((doc as Sale).collectedByPartnerId ? (doc as Sale).total : 0);
            const remaining = Math.max(0, doc.total - paid);
            setAmount(remaining);
        }
    }, [doc]);

    if (!doc) return null;

    const handleSave = () => {
        if (amount <= 0 || !partnerId) return;
        
        if (doc.type === 'vendita') {
            dispatch({
                type: 'COLLECT_SALE',
                payload: {
                    saleId: doc.id,
                    partnerId,
                    date,
                    amount
                }
            });
        } else if (doc.type === 'preventivo') {
             dispatch({
                type: 'COLLECT_QUOTE',
                payload: {
                    quoteId: doc.id,
                    partnerId,
                    date,
                    amount
                }
            });
        }

        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Registra Incasso #${doc.id.substring(0,8).toUpperCase()}`}>
            <div className="space-y-4">
                <p className="text-sm">Registra un pagamento per il documento selezionato.</p>
                <Input type="number" label="Importo Incassato" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} />
                <Input type="date" label="Data Incasso" value={date} onChange={e => setDate(e.target.value)} />
                <div>
                    <label className="block text-sm font-medium mb-1">Incassato da (Socio)</label>
                    <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={partnerId} onChange={e => setPartnerId(e.target.value)}>
                        <option value="">Seleziona...</option>
                        {state.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="flex justify-end pt-4">
                    <Button variant="secondary" onClick={onClose}>Annulla</Button>
                    <Button onClick={handleSave} className="ml-2">Salva</Button>
                </div>
            </div>
        </Modal>
    );
};

const BulkCollectionModal: React.FC<{ isOpen: boolean, onClose: () => void, sales: Sale[] }> = ({ isOpen, onClose, sales }) => {
    const { state, dispatch } = useAppContext();
    const [partnerId, setPartnerId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Calcola il totale rimanente da pagare per tutte le vendite selezionate
    const totalToCollect = useMemo(() => {
        return sales.reduce((acc, sale) => {
            const paid = sale.payments ? sale.payments.reduce((sum, p) => sum + p.amount, 0) : (sale.collectedByPartnerId ? sale.total : 0);
            return acc + Math.max(0, sale.total - paid);
        }, 0);
    }, [sales]);

    const handleSave = () => {
        if (!partnerId) return alert("Seleziona un socio.");
        
        const collections = sales.map(sale => {
            const paid = sale.payments ? sale.payments.reduce((sum, p) => sum + p.amount, 0) : (sale.collectedByPartnerId ? sale.total : 0);
            const remaining = Math.max(0, sale.total - paid);
            return { saleId: sale.id, amount: remaining };
        }).filter(c => c.amount > 0.001); // Filtra importi zero

        if (collections.length > 0) {
            dispatch({
                type: 'BULK_COLLECT_SALES',
                payload: {
                    collections,
                    partnerId,
                    date
                }
            });
        } else {
            alert("Nessun importo da incassare per le vendite selezionate.");
        }
        
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Incasso Multiplo">
            <div className="space-y-4">
                <Alert message={`Stai registrando il saldo per ${sales.length} vendite selezionate. Verrà creata un'unica voce nel mastro con il riferimento a tutti i documenti.`} type="info" />
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded text-center">
                    <p className="text-sm text-gray-500">Totale da Incassare</p>
                    <p className="text-2xl font-bold text-green-600">€{totalToCollect.toFixed(2)}</p>
                </div>
                
                <div className="text-xs text-gray-500 max-h-20 overflow-y-auto">
                    <p className="font-semibold mb-1">Documenti inclusi:</p>
                    <ul className="list-disc pl-4">
                        {sales.map(s => (
                            <li key={s.id}>Vendita #{s.id.substring(0,8).toUpperCase()} - €{s.total.toFixed(2)}</li>
                        ))}
                    </ul>
                </div>

                <Input type="date" label="Data Incasso" value={date} onChange={e => setDate(e.target.value)} />
                <div>
                    <label className="block text-sm font-medium mb-1">Incassato da (Socio)</label>
                    <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={partnerId} onChange={e => setPartnerId(e.target.value)}>
                        <option value="">Seleziona...</option>
                        {state.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="flex justify-end pt-4">
                    <Button variant="secondary" onClick={onClose}>Annulla</Button>
                    <Button onClick={handleSave} className="ml-2">Conferma Incasso Totale</Button>
                </div>
            </div>
        </Modal>
    );
};

const PartnerTransferModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { state, dispatch } = useAppContext();
    const [fromPartnerId, setFromPartnerId] = useState('');
    const [toPartnerId, setToPartnerId] = useState('');
    const [amount, setAmount] = useState(0);
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('');

    const handleSave = () => {
        if (!fromPartnerId || !toPartnerId) return alert("Seleziona entrambi i soci.");
        if (fromPartnerId === toPartnerId) return alert("I soci devono essere diversi.");
        if (amount <= 0) return alert("Inserisci un importo valido.");
        if (!description.trim()) return alert("Inserisci una causale.");

        dispatch({
            type: 'TRANSFER_BETWEEN_PARTNERS',
            payload: { fromPartnerId, toPartnerId, amount, date, description, paymentMethod }
        });
        
        // Reset form
        setFromPartnerId('');
        setToPartnerId('');
        setAmount(0);
        setDescription('');
        setPaymentMethod('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registra Trasferimento tra Soci">
            <div className="space-y-4">
                <Alert message="Registra un passaggio di denaro diretto tra due soci (es. Giroconto incasso)." />
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Da Socio (Paga/Cede)</label>
                        <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={fromPartnerId} onChange={e => setFromPartnerId(e.target.value)}>
                            <option value="">Seleziona...</option>
                            {state.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">A Socio (Riceve)</label>
                        <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={toPartnerId} onChange={e => setToPartnerId(e.target.value)}>
                            <option value="">Seleziona...</option>
                            {state.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>

                <Input type="number" label="Importo" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} />
                <Input type="date" label="Data" value={date} onChange={e => setDate(e.target.value)} />
                
                <div>
                    <label className="block text-sm font-medium mb-1">Causale (Obbligatoria)</label>
                    <textarea 
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" 
                        rows={2}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Es. Giroconto incasso Cliente Rossi..."
                    />
                </div>

                <Input 
                    label="Modalità di Pagamento (Opzionale)" 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value)} 
                    placeholder="Es. Bonifico, Contanti..."
                />

                <div className="flex justify-end pt-4">
                    <Button variant="secondary" onClick={onClose}>Annulla</Button>
                    <Button onClick={handleSave} className="ml-2">Registra Movimento</Button>
                </div>
            </div>
        </Modal>
    );
};

const SettlementPaymentModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    data: { fromId: string; fromName: string; toId: string; toName: string; amount: number } | null 
}> = ({ isOpen, onClose, data }) => {
    const { dispatch } = useAppContext();
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('');

    useEffect(() => {
        if (data) {
            setAmount(data.amount);
        } else {
            setPaymentMethod('');
        }
    }, [data]);

    if (!data) return null;

    const handleSave = () => {
        if (amount <= 0) return alert("Inserisci un importo valido.");

        const isTotalSettlement = Math.abs(amount - data.amount) < 0.01;

        dispatch({
            type: 'RECORD_SETTLEMENT_PAYMENT',
            payload: {
                fromPartnerId: data.fromId,
                fromPartnerName: data.fromName,
                toPartnerId: data.toId,
                toPartnerName: data.toName,
                amount,
                date,
                paymentMethod,
                isTotalSettlement
            }
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registra Pagamento Pareggio">
            <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                    <div className="text-center flex-1">
                        <p className="font-bold text-gray-800 dark:text-gray-200">{data.fromName}</p>
                        <span className="text-xs text-red-500 font-semibold">DEBITORE</span>
                    </div>
                    <ArrowRight className="text-gray-400 mx-2" />
                    <div className="text-center flex-1">
                        <p className="font-bold text-gray-800 dark:text-gray-200">{data.toName}</p>
                         <span className="text-xs text-green-500 font-semibold">CREDITORE</span>
                    </div>
                </div>

                <Input type="number" label="Importo da Versare" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} step="0.01" />
                <Input type="date" label="Data Pagamento" value={date} onChange={e => setDate(e.target.value)} />
                <Input 
                    label="Modalità di Pagamento (Opzionale)" 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value)} 
                    placeholder="Es. Bonifico, Contanti..."
                />
                
                <p className="text-xs text-gray-500 italic">
                    Verrà creato un movimento nel mastro con causale automatica "Pareggio conti: {data.fromName} versa a {data.toName}".
                </p>

                <div className="flex justify-end pt-4 space-x-2">
                    <Button variant="secondary" onClick={onClose}>Annulla</Button>
                    <Button onClick={handleSave}>Registra Pagamento</Button>
                </div>
            </div>
        </Modal>
    );
};

const StockLoadDetailModal: React.FC<{ isOpen: boolean, onClose: () => void, load: StockLoad | null }> = ({ isOpen, onClose, load }) => {
    const { state, settings } = useAppContext();
    const yearData = state[settings.currentYear];

    if (!load) return null;

    const getProductName = (variantId: string) => {
        const variant = yearData.productVariants.find(v => v.id === variantId);
        const product = yearData.products.find(p => p.id === variant?.productId);
        return product && variant ? `${product.name} - ${variant.name}` : 'Sconosciuto';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Dettaglio Carico #${load.id.substring(0,8).toUpperCase()}`}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                 <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><strong>Data:</strong> {new Date(load.date).toLocaleDateString()}</div>
                    <div><strong>Totale:</strong> €{load.total.toFixed(2)}</div>
                </div>
                <Table headers={["Prodotto", "Lotto", "Qtà", "Prezzo", "Totale"]}>
                    {load.items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{getProductName(item.variantId)}</td>
                            <td className="px-4 py-2 text-sm font-mono">{item.batchNumber || '-'}</td>
                            <td className="px-4 py-2 text-sm text-center">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right">€{item.price.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-right">€{(item.quantity * item.price).toFixed(2)}</td>
                        </tr>
                    ))}
                </Table>
            </div>
             <div className="flex justify-end pt-4">
                <Button variant="secondary" onClick={onClose}>Chiudi</Button>
            </div>
        </Modal>
    );
}

const EditStockLoadModal: React.FC<{ isOpen: boolean, onClose: () => void, load: StockLoad | null }> = ({ isOpen, onClose, load }) => {
    const { state, settings, dispatch } = useAppContext();
    const yearData = state[settings.currentYear];
    const [formData, setFormData] = useState({ date: '', supplierId: '', paidByPartnerId: '', note: '' });

    useEffect(() => {
        if (load) {
            setFormData({
                date: load.date,
                supplierId: load.supplierId || '',
                paidByPartnerId: load.paidByPartnerId || '',
                note: load.items[0]?.batchNumber || '' // Using batchNumber of first item as note placeholder for now
            });
        }
    }, [load]);

    if (!load) return null;

    const handleSave = () => {
        dispatch({
            type: 'UPDATE_STOCK_LOAD',
            payload: {
                id: load.id,
                date: formData.date,
                supplierId: formData.supplierId || undefined,
                paidByPartnerId: formData.paidByPartnerId || undefined
            }
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Modifica Intestazione Carico">
             <div className="space-y-4">
                <Input type="date" label="Data" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                <div>
                    <label className="block text-sm font-medium mb-1">Fornitore</label>
                    <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})}>
                        <option value="">Deposito / Interno</option>
                        {yearData.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Pagato da</label>
                    <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.paidByPartnerId} onChange={e => setFormData({...formData, paidByPartnerId: e.target.value})}>
                        <option value="">Nessuno (Interno)</option>
                        {state.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                 <div className="flex justify-end pt-4">
                    <Button variant="secondary" onClick={onClose}>Annulla</Button>
                    <Button onClick={handleSave} className="ml-2">Salva</Button>
                </div>
            </div>
        </Modal>
    );
}


const DocumentEditor: React.FC<{ type: 'sale' | 'quote' }> = ({ type }) => { 
    const { state, settings, dispatch } = useAppContext(); 
    const yearData = state[settings.currentYear]; 
    const [customerId, setCustomerId] = useState(''); 
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); 
    const [items, setItems] = useState<{ variantId: string, quantity: number, price: number }[]>([]); 
    const [vatApplied, setVatApplied] = useState(true); 
    const [isProductSelectorOpen, setProductSelectorOpen] = useState(false); 
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('percentage');
    const [shippingCost, setShippingCost] = useState<number>(0);
    const [note, setNote] = useState('');

    const customers = yearData.customers; 
    const variants = useMemo(() => yearData.productVariants.map(v => { const p = yearData.products.find(prod => prod.id === v.productId); const qty = yearData.inventoryBatches.filter(b => b.variantId === v.id && b.status === 'available').reduce((acc, b) => acc + b.currentQuantity, 0); return { ...v, productName: p?.name || '?', available: qty }; }), [yearData]); 
    
    const addItem = () => setItems([...items, { variantId: '', quantity: 1, price: 0 }]); 
    const updateItem = (index: number, field: string, value: any) => { const newItems = [...items]; if (field === 'variantId') { const variant = variants.find(v => v.id === value); newItems[index] = { ...newItems[index], variantId: value, price: variant?.salePrice || 0 }; } else { newItems[index] = { ...newItems[index], [field]: value }; } setItems(newItems); }; 
    const handleBulkSelect = (variantIds: string[]) => { const newItems = variantIds.map(vid => { const variant = variants.find(v => v.id === vid); return { variantId: vid, quantity: 1, price: variant?.salePrice || 0 }; }); setItems(prev => [...prev, ...newItems]); }; 
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index)); 
    
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0); 
    const total = useMemo(() => {
        let discount = 0;
        if (discountValue) {
            discount = discountType === 'percentage' 
                ? subtotal * (discountValue / 100) 
                : discountValue;
        }
        const shipping = shippingCost || 0;
        const taxable = Math.max(0, subtotal - discount + shipping);
        return vatApplied ? taxable * 1.22 : taxable;
    }, [subtotal, vatApplied, discountValue, discountType, shippingCost]);

    const handleSubmit = () => { 
        if (!customerId || items.length === 0 || items.some(i => !i.variantId)) return alert("Compila tutti i campi."); 
        const payload = { 
            date, 
            customerId, 
            items, 
            vatApplied, 
            discountValue,
            discountType,
            shippingCost,
            note
        }; 
        if (type === 'sale') dispatch({ type: 'ADD_SALE', payload }); 
        else dispatch({ type: 'ADD_QUOTE', payload }); 
        
        alert("Documento salvato!"); 
        setItems([]); 
        setCustomerId(''); 
        setDiscountValue(0);
        setShippingCost(0);
        setNote('');
    }; 

    return ( 
        <Card title={type === 'sale' ? "Nuova Vendita" : "Nuovo Preventivo"}> 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"> 
                <Input type="date" label="Data" value={date} onChange={e => setDate(e.target.value)} /> 
                <div><label className="block text-sm font-medium mb-1">Cliente</label><select className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600" value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">Seleziona Cliente...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div> 
                <div className="flex items-center pt-6"><label className="flex items-center space-x-2"><input type="checkbox" checked={vatApplied} onChange={e => setVatApplied(e.target.checked)} /><span>Applica IVA 22%</span></label></div> 
            </div> 
            
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Note (opzionale)</label>
                <textarea className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Note aggiuntive sul documento..."></textarea>
            </div>

            <div className="space-y-2"> 
                {items.map((item, idx) => ( 
                    <div key={idx} className="flex gap-2 items-end"> 
                        <div className="flex-grow"><label className="text-xs">Prodotto</label><select className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600" value={item.variantId} onChange={e => updateItem(idx, 'variantId', e.target.value)}><option value="">Seleziona...</option>{variants.map(v => <option key={v.id} value={v.id}>{v.productName} - {v.name} (Disp: {v.available})</option>)}</select></div> 
                        <div className="w-24"><Input type="number" step="1" min="1" label="Qtà" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} /></div> 
                        <div className="w-32"><Input type="number" label="Prezzo" value={item.price} onChange={e => updateItem(idx, 'price', parseFloat(e.target.value))} /></div> 
                        <div className="pb-2"><Button variant="danger" size="sm" onClick={() => removeItem(idx)}><Trash2 size={16} /></Button></div> 
                    </div> 
                ))} 
                <div className="flex gap-2"> 
                    <Button variant="secondary" size="sm" onClick={addItem}><PlusCircle className="mr-2" size={16} /> Aggiungi Riga</Button> 
                    <Button variant="secondary" size="sm" onClick={() => setProductSelectorOpen(true)}><ListTree className="mr-2" size={16} /> Seleziona da Catalogo</Button> 
                </div> 
            </div> 
            
            <div className="mt-8 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700 grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Sconto</label>
                        <div className="flex">
                            <input 
                                type="number" min="0" step="0.01" 
                                className="w-full p-2 border rounded-l dark:bg-gray-700 dark:border-gray-600"
                                value={discountValue}
                                onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                            />
                            <select 
                                className="bg-gray-100 dark:bg-gray-600 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r px-2 text-sm"
                                value={discountType}
                                onChange={e => setDiscountType(e.target.value as any)}
                            >
                                <option value="percentage">%</option>
                                <option value="amount">€</option>
                            </select>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Spedizione</label>
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
                            <input 
                                type="number" min="0" step="0.01" 
                                className="w-full pl-6 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                value={shippingCost}
                                onChange={e => setShippingCost(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                     </div>
                 </div>
                 
                 <div className="flex flex-col items-end justify-center space-y-2">
                    <p className="text-gray-600">Imponibile (esclusi sconti/sped): €{subtotal.toFixed(2)}</p>
                    <p className="text-3xl font-bold text-primary-600">Totale: €{total.toFixed(2)}</p>
                    <Button onClick={handleSubmit} size="lg" className="mt-2">Salva Documento</Button> 
                 </div>
            </div>
            
            <ProductSelectorModal isOpen={isProductSelectorOpen} onClose={() => setProductSelectorOpen(false)} onConfirm={handleBulkSelect} title="Aggiungi Prodotti" /> 
        </Card> 
    ); 
};
const NewSaleView = () => <DocumentEditor type="sale" />;
const NewQuoteView = () => <DocumentEditor type="quote" />;
const QuotesHistoryView: React.FC = () => { 
    const { state, settings, dispatch } = useAppContext(); 
    const yearData = state[settings.currentYear]; 
    const [viewDoc, setViewDoc] = useState<Quote | null>(null); 
    const [collectionQuote, setCollectionQuote] = useState<Quote | null>(null);
    
    // Preparazione dati con lookup per ordinamento
    const mappedQuotes = useMemo(() => {
        return yearData.quotes.map(q => {
            const paid = q.payments ? q.payments.reduce((acc, p) => acc + p.amount, 0) : 0;
            const remaining = q.total - paid;
            
            let statusText = 'Non Pagato';
            let statusColor = 'text-red-500';
            let StatusIcon = X;
            
            if (remaining <= 0.01) {
                statusText = 'Pagato';
                statusColor = 'text-green-600';
                StatusIcon = Check;
            } else if (paid > 0) {
                statusText = `Acconto (€${paid.toFixed(2)})`;
                statusColor = 'text-orange-500';
                StatusIcon = Clock;
            }

            return {
                ...q,
                customerName: yearData.customers.find(c => c.id === q.customerId)?.name || 'N/A',
                shortId: q.id.substring(0,8).toUpperCase(),
                paid,
                statusText,
                statusColor,
                StatusIcon
            };
        });
    }, [yearData.quotes, yearData.customers]);

    const { items: sortedQuotes, requestSort, sortConfig } = useSortableData(mappedQuotes, { key: 'date', direction: 'ascending' });

    return ( 
        <Card title="Storico Preventivi"> 
            <Table headers={[
                <SortHeader label="Numero / Data" sortKey="date" currentSort={sortConfig} onSort={requestSort} />,
                <SortHeader label="Cliente" sortKey="customerName" currentSort={sortConfig} onSort={requestSort} />,
                <SortHeader label="Totale" sortKey="total" currentSort={sortConfig} onSort={requestSort} />,
                <SortHeader label="Incassato" sortKey="paid" currentSort={sortConfig} onSort={requestSort} />,
                <SortHeader label="Stato" sortKey="status" currentSort={sortConfig} onSort={requestSort} />,
                "Azioni"
            ]}> 
                {sortedQuotes.map(q => ( 
                    <tr key={q.id}> 
                        <td className="px-6 py-4">
                            <span className="block font-mono font-bold text-xs text-gray-500">#{q.shortId}</span>
                            <span>{new Date(q.date).toLocaleDateString()}</span>
                        </td> 
                        <td className="px-6 py-4">{q.customerName}</td> 
                        <td className="px-6 py-4">€{q.total.toFixed(2)}</td> 
                        <td className="px-6 py-4">
                            <span className={`flex items-center font-semibold ${q.statusColor}`}>
                                <q.StatusIcon size={16} className="mr-1" /> {q.statusText}
                            </span>
                        </td>
                        <td className="px-6 py-4">{q.status}</td> 
                        <td className="px-6 py-4 space-x-2">
                             <Button variant="ghost" size="sm" onClick={() => setCollectionQuote(q)} title="Registra Acconto/Saldo" className="text-green-600 hover:bg-green-100">
                                 <CircleDollarSign size={18} />
                             </Button>
                            <Button variant="ghost" size="sm" onClick={() => setViewDoc(q)} title="Vedi"><Eye size={16} /></Button>
                            {q.status === 'aperto' && (<Button variant="ghost" size="sm" onClick={() => { if(confirm("Convertire in vendita?")) dispatch({ type: 'CONVERT_QUOTE_TO_SALE', payload: q.id }) }} title="Converti in Vendita"><Check size={16} /></Button>)}
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if(confirm("Eliminare?")) dispatch({ type: 'DELETE_QUOTE', payload: q.id }) }} title="Elimina"><Trash2 size={16} /></Button>
                        </td> 
                    </tr> 
                ))} 
            </Table> 
            <DocumentDetailModal isOpen={!!viewDoc} onClose={() => setViewDoc(null)} doc={viewDoc} /> 
            <CollectionModal isOpen={!!collectionQuote} onClose={() => setCollectionQuote(null)} doc={collectionQuote} />
        </Card> 
    ); 
};

// SalesHistoryView
const SalesHistoryView: React.FC = () => {
    const { state, settings, dispatch } = useAppContext();
    const yearData = state[settings.currentYear];
    const [viewDoc, setViewDoc] = useState<Sale | null>(null);
    const [printDoc, setPrintDoc] = useState<Sale | null>(null);
    const [collectionSale, setCollectionSale] = useState<Sale | null>(null);
    
    // Stato per la selezione multipla
    const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
    const [isBulkCollectionOpen, setBulkCollectionOpen] = useState(false);
    
    const getCustomerName = (id: string) => yearData.customers.find(c => c.id === id)?.name || 'N/A';
    
    const allVariants = useMemo(() => {
        return yearData.productVariants.map(variant => {
            const product = yearData.products.find(p => p.id === variant.productId);
            return { ...variant, productName: product?.name || 'N/A' };
        });
    }, [yearData]);

    const getPaymentStatus = (sale: Sale) => {
        const paid = sale.payments ? sale.payments.reduce((acc, p) => acc + p.amount, 0) : (sale.collectedByPartnerId ? sale.total : 0);
        const remaining = sale.total - paid;
        
        if (remaining <= 0.01) return { status: 'Pagato', color: 'text-green-600', icon: Check };
        if (paid > 0) return { status: `Parziale (€${paid.toFixed(2)})`, color: 'text-orange-500', icon: Clock };
        return { status: 'Non Pagato', color: 'text-red-500', icon: X };
    };

    // Mappatura per sorting
    const mappedSales = useMemo(() => {
        return yearData.sales.map(s => {
            const { status } = getPaymentStatus(s);
            return {
                ...s,
                customerName: getCustomerName(s.customerId),
                paymentStatusText: status,
                shortId: s.id.substring(0,8).toUpperCase()
            };
        });
    }, [yearData.sales, yearData.customers]);

    const { items: sortedSales, requestSort, sortConfig } = useSortableData(mappedSales, { key: 'date', direction: 'ascending' });

    // Gestione Selezione
    const toggleSaleSelection = (id: string) => {
        const newSet = new Set(selectedSales);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedSales(newSet);
    };

    const handleBulkClick = () => {
        const selectedIds = Array.from(selectedSales);
        const sales = yearData.sales.filter(s => selectedIds.includes(s.id));
        
        if (sales.length === 0) return;

        // Check if all belong to same customer
        const customerId = sales[0].customerId;
        if (!sales.every(s => s.customerId === customerId)) {
            alert("Per effettuare un incasso cumulativo, seleziona vendite dello stesso cliente.");
            return;
        }

        setBulkCollectionOpen(true);
    };

    const bulkCollectionSales = useMemo(() => {
         return yearData.sales.filter(s => selectedSales.has(s.id));
    }, [yearData.sales, selectedSales]);

    return (
        <Card title="Storico Vendite">
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">Gestisci lo storico e i pagamenti delle vendite.</p>
                {selectedSales.size > 0 && (
                    <Button onClick={handleBulkClick} className="bg-green-600 hover:bg-green-700 animate-fade-in">
                        <CircleDollarSign className="mr-2" size={18} /> Incassa Selezionati ({selectedSales.size})
                    </Button>
                )}
            </div>
            
            <Table headers={[
                <div className="w-8 text-center"><CheckSquare size={16} /></div>, // Checkbox header
                <SortHeader label="Numero / Data" sortKey="date" currentSort={sortConfig} onSort={requestSort} />,
                <SortHeader label="Cliente" sortKey="customerName" currentSort={sortConfig} onSort={requestSort} />,
                <SortHeader label="Totale" sortKey="total" currentSort={sortConfig} onSort={requestSort} />,
                <SortHeader label="Stato Pagamento" sortKey="paymentStatusText" currentSort={sortConfig} onSort={requestSort} />,
                "Azioni"
            ]}>
                {sortedSales.map(s => {
                    const statusInfo = getPaymentStatus(s);
                    const StatusIcon = statusInfo.icon;
                    const isFullyPaid = statusInfo.status === 'Pagato';

                    return (
                        <tr key={s.id} className={selectedSales.has(s.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                            <td className="px-6 py-4 text-center">
                                {!isFullyPaid && (
                                    <input 
                                        type="checkbox" 
                                        checked={selectedSales.has(s.id)} 
                                        onChange={() => toggleSaleSelection(s.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                    />
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <span className="block font-mono font-bold text-xs text-gray-500">#{s.shortId}</span>
                                <span>{new Date(s.date).toLocaleDateString()}</span>
                            </td>
                            <td className="px-6 py-4">{s.customerName}</td>
                            <td className="px-6 py-4">€{s.total.toFixed(2)}</td>
                            <td className="px-6 py-4">
                                <span className={`flex items-center font-semibold ${statusInfo.color}`}>
                                    <StatusIcon size={16} className="mr-1" /> {statusInfo.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 space-x-2 flex">
                                 {!isFullyPaid && (
                                     <Button variant="ghost" size="sm" onClick={() => setCollectionSale(s)} title="Registra Incasso" className="text-green-600 hover:bg-green-100">
                                         <CircleDollarSign size={18} />
                                     </Button>
                                 )}
                                 <Button variant="ghost" size="sm" onClick={() => setViewDoc(s)} title="Vedi Dettagli"><Eye size={16} /></Button>
                                 <Button variant="ghost" size="sm" onClick={() => setPrintDoc(s)} title="Stampa"><Printer size={16} /></Button>
                                 <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if(confirm("Eliminare?")) dispatch({ type: 'DELETE_SALE', payload: s.id }) }} title="Elimina"><Trash2 size={16} /></Button>
                            </td>
                        </tr>
                    );
                })}
            </Table>
            <DocumentDetailModal isOpen={!!viewDoc} onClose={() => setViewDoc(null)} doc={viewDoc} />
            <CollectionModal isOpen={!!collectionSale} onClose={() => setCollectionSale(null)} doc={collectionSale} />
            <BulkCollectionModal 
                isOpen={isBulkCollectionOpen} 
                onClose={() => { setBulkCollectionOpen(false); setSelectedSales(new Set()); }} 
                sales={bulkCollectionSales} 
            />
            {printDoc && (
                <PrintModal isOpen={!!printDoc} onClose={() => setPrintDoc(null)} title="Stampa Vendita" documentName={`vendita_${printDoc.id}`}>
                    <PrintableSaleQuote 
                        doc={printDoc} 
                        customer={yearData.customers.find(c => c.id === printDoc.customerId)!} 
                        allVariants={allVariants}
                        companyInfo={settings.companyInfo}
                    />
                </PrintModal>
            )}
        </Card>
    );
};

const StockLoadView: React.FC = () => { 
    const { state, settings, dispatch } = useAppContext(); 
    const yearData = state[settings.currentYear]; 
    const { productVariants, products } = yearData; 
    const [isProductSelectorOpen, setProductSelectorOpen] = useState(false); 
    const [formData, setFormData] = useState({ 
        date: new Date().toISOString().split('T')[0], 
        supplierId: '', 
        paidByPartnerId: '', 
        items: [] as StockLoadItem[], 
        vatApplied: true,
        discountValue: 0,
        discountType: 'percentage' as 'amount' | 'percentage',
        shippingCost: 0
    }); 
    const [isInternalLoad, setIsInternalLoad] = useState(false);

    const variants = useMemo(() => { return productVariants.map(v => { const p = products.find(prod => prod.id === v.productId); return { ...v, productName: p?.name || '?', unit: p?.unit || 'pz' }; }); }, [yearData, productVariants, products]); 
    const addItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, { variantId: '', quantity: 1, price: 0 }] })); 
    const updateItem = (idx: number, field: string, val: any) => { const newItems = [...formData.items]; newItems[idx] = { ...newItems[idx], [field]: val }; setFormData(prev => ({ ...prev, items: newItems })); }; 
    const removeItem = (idx: number) => { const newItems = formData.items.filter((_, i) => i !== idx); setFormData(prev => ({ ...prev, items: newItems })); }; 
    const handleBulkSelect = (variantIds: string[]) => { const newItems = variantIds.map(vid => ({ variantId: vid, quantity: 1, price: 0, batchNumber: '', expirationDate: '' })); setFormData(prev => ({ ...prev, items: [...prev.items, ...newItems] })); }; 
    
    const handleSubmit = () => { 
        if(!isInternalLoad && (!formData.supplierId || !formData.paidByPartnerId)) return alert("Seleziona Fornitore e Chi Paga, oppure attiva 'Carico da Deposito'."); 
        if(formData.items.length === 0) return alert("Inserisci almeno un articolo"); 
        if(formData.items.some(i => !i.variantId)) return alert("Seleziona un prodotto per tutte le righe"); 
        
        dispatch({ 
            type: 'ADD_STOCK_LOAD', 
            payload: { 
                ...formData,
                supplierId: isInternalLoad ? undefined : formData.supplierId,
                paidByPartnerId: isInternalLoad ? undefined : formData.paidByPartnerId
            } 
        }); 
        
        alert("Carico salvato con successo!"); 
        setFormData({ 
            date: new Date().toISOString().split('T')[0], 
            supplierId: '', 
            paidByPartnerId: '', 
            items: [], 
            vatApplied: true,
            discountValue: 0,
            discountType: 'percentage',
            shippingCost: 0
        }); 
        setIsInternalLoad(false);
    }; 
    
    const getProductUnit = (variantId: string) => { return variants.find(v => v.id === variantId)?.unit || 'pz'; }; 
    const grandTotal = useMemo(() => { 
        const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        let discount = 0;
        if (formData.discountValue) {
            discount = formData.discountType === 'percentage' 
                ? subtotal * (formData.discountValue / 100) 
                : formData.discountValue;
        }
        const shipping = formData.shippingCost || 0;
        const taxable = Math.max(0, subtotal - discount + shipping);
        return formData.vatApplied ? taxable * 1.22 : taxable;
    }, [formData.items, formData.vatApplied, formData.discountValue, formData.discountType, formData.shippingCost]); 
    
    return ( 
        <Card title="Nuovo Carico Magazzino"> 
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700"> 
                <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
                     <h4 className="font-semibold">Dati Testata</h4>
                     <label className="flex items-center space-x-2 cursor-pointer bg-white dark:bg-gray-700 px-3 py-1 rounded border shadow-sm">
                        <input type="checkbox" checked={isInternalLoad} onChange={e => setIsInternalLoad(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        <span className="text-sm font-medium">Carico Iniziale / Merce da Deposito (Nessun Pagamento)</span>
                    </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div> 
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fattura / DDT</label> 
                        <div className="relative"> 
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /> 
                            <input type="date" className="pl-10 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /> 
                        </div> 
                    </div> 
                    
                    {!isInternalLoad && (
                        <>
                            <div> 
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fornitore</label> 
                                <div className="relative"> 
                                    <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /> 
                                    <select className="pl-10 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})}> 
                                        <option value="">Seleziona Fornitore...</option> 
                                        {yearData.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)} 
                                    </select> 
                                </div> 
                            </div> 
                            <div> 
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pagato da (Socio)</label> 
                                <div className="relative"> 
                                    <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /> 
                                    <select className="pl-10 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.paidByPartnerId} onChange={e => setFormData({...formData, paidByPartnerId: e.target.value})}> 
                                        <option value="">Seleziona Chi Paga...</option> 
                                        {state.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)} 
                                    </select> 
                                </div> 
                            </div> 
                        </>
                    )}
                    {isInternalLoad && (
                        <div className="md:col-span-2 flex items-center p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded text-sm">
                            <Warehouse className="mr-2" size={20} />
                            Modalità Deposito: Il carico aumenterà la giacenza senza generare movimenti finanziari nel mastro soci.
                        </div>
                    )}
                </div> 
                <div className="flex items-center pt-6"> 
                    <label className="flex items-center space-x-2 cursor-pointer"> 
                        <input type="checkbox" checked={formData.vatApplied} onChange={e => setFormData({...formData, vatApplied: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" /> 
                        <span className="text-sm font-medium">Applica IVA 22% al Totale</span> 
                    </label> 
                </div> 
            </div> 
            <div className="space-y-4"> 
                <h4 className="font-semibold flex items-center"><PackageIcon className="mr-2" /> Articoli in Entrata</h4> 
                {formData.items.length === 0 && ( 
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500"> 
                        <p>Nessun articolo inserito nel carico.</p> 
                        <div className="flex justify-center gap-2 mt-2"> 
                            <Button variant="ghost" onClick={addItem}>Aggiungi Riga Singola</Button> 
                            <Button variant="primary" onClick={() => setProductSelectorOpen(true)}>Seleziona da Catalogo</Button> 
                        </div> 
                    </div> 
                )} 
                {formData.items.map((item, idx) => ( 
                    <div key={idx} className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm relative animate-fade-in"> 
                        <button onClick={() => removeItem(idx)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"> <X size={20} /> </button> 
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end"> 
                            <div className="lg:col-span-5"> 
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Prodotto</label> 
                                <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={item.variantId} onChange={e => updateItem(idx, 'variantId', e.target.value)}> 
                                    <option value="">Seleziona Prodotto...</option> 
                                    {variants.map(v => <option key={v.id} value={v.id}>{v.productName} - {v.name}</option>)} 
                                </select> 
                            </div> 
                            <div className="lg:col-span-2"> 
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Quantità</label> 
                                <div className="flex"> 
                                    <input 
                                        type="number" 
                                        min="1" 
                                        step="1" 
                                        className="w-full p-2 border rounded-l dark:bg-gray-700 dark:border-gray-600" 
                                        placeholder="Qtà" 
                                        value={item.quantity} 
                                        onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} 
                                    /> 
                                    <span className="inline-flex items-center px-3 rounded-r border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 text-sm"> {item.variantId ? getProductUnit(item.variantId) : '-'} </span> 
                                </div> 
                            </div> 
                            <div className="lg:col-span-2"> 
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Prezzo Unit.</label> 
                                <div className="relative"> 
                                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500">€</span> 
                                    <input type="number" min="0" step="0.0001" className="w-full pl-6 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="0.00" value={item.price} onChange={e => updateItem(idx, 'price', parseFloat(e.target.value))} /> 
                                </div> 
                            </div> 
                            <div className="lg:col-span-3 flex flex-col justify-center h-full pb-1"> 
                                <span className="text-xs text-gray-500 text-right">Totale Riga</span> 
                                <span className="text-lg font-bold text-gray-800 dark:text-gray-200 text-right">€{(item.quantity * item.price).toFixed(2)}</span> 
                            </div> 
                        </div> 
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700"> 
                            <div className="flex items-center space-x-2"> 
                                <Barcode size={16} className="text-gray-400" /> 
                                <input className="flex-1 p-1 text-sm border-b border-gray-300 dark:border-gray-600 focus:border-primary-500 bg-transparent focus:outline-none" placeholder="Numero Lotto (Opzionale)" value={item.batchNumber || ''} onChange={e => updateItem(idx, 'batchNumber', e.target.value)} /> 
                            </div> 
                            <div className="flex items-center space-x-2"> 
                                <Clock size={16} className="text-gray-400" /> 
                                <span className="text-xs text-gray-500 whitespace-nowrap">Scadenza:</span> 
                                <input type="date" className="flex-1 p-1 text-sm border-b border-gray-300 dark:border-gray-600 focus:border-primary-500 bg-transparent focus:outline-none" value={item.expirationDate || ''} onChange={e => updateItem(idx, 'expirationDate', e.target.value)} /> 
                            </div> 
                        </div> 
                    </div> 
                ))} 
            </div> 
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 mt-8 pt-6 border-t dark:border-gray-700">
                 <div className="w-full md:w-1/2 space-y-4">
                    <div className="flex space-x-2"> 
                        <Button onClick={addItem} variant="secondary"><PlusCircle size={16} className="mr-2"/> Aggiungi Riga</Button> 
                        <Button onClick={() => setProductSelectorOpen(true)} variant="secondary"><ListTree size={16} className="mr-2"/> Seleziona da Catalogo</Button> 
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700">
                         <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Sconto</label>
                            <div className="flex">
                                <input 
                                    type="number" min="0" step="0.01" 
                                    className="w-full p-2 border rounded-l dark:bg-gray-700 dark:border-gray-600"
                                    value={formData.discountValue}
                                    onChange={e => setFormData({...formData, discountValue: parseFloat(e.target.value) || 0})}
                                />
                                <select 
                                    className="bg-gray-100 dark:bg-gray-600 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r px-2 text-sm"
                                    value={formData.discountType}
                                    onChange={e => setFormData({...formData, discountType: e.target.value as any})}
                                >
                                    <option value="percentage">%</option>
                                    <option value="amount">€</option>
                                </select>
                            </div>
                         </div>
                         <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Spedizione</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
                                <input 
                                    type="number" min="0" step="0.01" 
                                    className="w-full pl-6 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    value={formData.shippingCost}
                                    onChange={e => setFormData({...formData, shippingCost: parseFloat(e.target.value) || 0})}
                                />
                            </div>
                         </div>
                    </div>
                 </div>
                 
                 <div className="w-full md:w-auto flex flex-col items-end">
                    <span className="block text-sm text-gray-500">Totale Documento</span> 
                    <span className="block text-3xl font-bold text-primary-600">€{grandTotal.toFixed(2)}</span> 
                    <Button onClick={handleSubmit} size="lg" className="mt-4 w-full md:w-auto">Registra Carico</Button> 
                 </div>
            </div>

            <ProductSelectorModal isOpen={isProductSelectorOpen} onClose={() => setProductSelectorOpen(false)} onConfirm={handleBulkSelect} title="Seleziona Articoli per Carico" /> 
        </Card> 
    ); 
};

const CategoryManagerModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => { const { state, settings, dispatch } = useAppContext(); const { categories } = state[settings.currentYear]; const [newCategoryName, setNewCategoryName] = useState(''); const [newCategoryIsComponent, setNewCategoryIsComponent] = useState(false); const [newCategoryIsFinishedProduct, setNewCategoryIsFinishedProduct] = useState(false); const [parentId, setParentId] = useState(''); const [editingCategory, setEditingCategory] = useState<Category | null>(null); const [editingCategoryName, setEditingCategoryName] = useState(''); const handleAddCategory = () => { if (newCategoryName.trim()) { dispatch({ type: 'ADD_CATEGORY', payload: { name: newCategoryName.trim(), isComponent: newCategoryIsComponent, isFinishedProduct: newCategoryIsFinishedProduct, parentId: parentId || undefined }}); setNewCategoryName(''); setNewCategoryIsComponent(false); setNewCategoryIsFinishedProduct(false); setParentId(''); } }; const handleStartEdit = (category: Category) => { setEditingCategory(category); setEditingCategoryName(category.name); }; const handleCancelEdit = () => { setEditingCategory(null); setEditingCategoryName(''); }; const handleSaveEdit = () => { if (editingCategory && editingCategoryName.trim()) { dispatch({ type: 'UPDATE_CATEGORY', payload: { oldName: editingCategory.name, category: { ...editingCategory, name: editingCategoryName.trim() } } }); handleCancelEdit(); } }; const handleToggleIsComponent = (category: Category) => { dispatch({ type: 'UPDATE_CATEGORY', payload: { oldName: category.name, category: { ...category, isComponent: !category.isComponent } } }); }; const handleToggleIsFinishedProduct = (category: Category) => { dispatch({ type: 'UPDATE_CATEGORY', payload: { oldName: category.name, category: { ...category, isFinishedProduct: !category.isFinishedProduct } } }); }; const handleDelete = (category: Category) => { dispatch({ type: 'DELETE_CATEGORY', payload: category.id }); }; const hierarchicalCategories = useMemo(() => { const roots = categories.filter(c => !c.parentId); const structure: { node: Category, level: number }[] = []; const traverse = (node: Category, level: number) => { structure.push({ node, level }); const children = categories.filter(c => c.parentId === node.id); children.forEach(child => traverse(child, level + 1)); }; roots.forEach(root => traverse(root, 0)); return structure; }, [categories]); return ( <Modal isOpen={isOpen} onClose={onClose} title="Gestisci Categorie Prodotti"> <div className="space-y-4"> <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"> <h4 className="font-semibold mb-2 text-sm">Aggiungi Nuova Categoria</h4> <div className="grid grid-cols-1 gap-2"> <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nome categoria" label="Nome" /> <div className="flex gap-2"> <div className="flex-1"> <label className="block text-sm font-medium mb-1">Categoria Padre (Opzionale)</label> <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm" value={parentId} onChange={e => setParentId(e.target.value)} > <option value="">Nessuna (Principale)</option> {categories.map(c => ( <option key={c.id} value={c.id}>{c.name}</option> ))} </select> </div> </div> <div className="flex flex-col space-y-2 mt-2"> <label className="flex items-center space-x-2 cursor-pointer"> <input type="checkbox" checked={newCategoryIsComponent} onChange={(e) => setNewCategoryIsComponent(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" /> <span className="text-sm">È un Componente (Materia Prima)</span> </label> <label className="flex items-center space-x-2 cursor-pointer"> <input type="checkbox" checked={newCategoryIsFinishedProduct} onChange={(e) => setNewCategoryIsFinishedProduct(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" /> <span className="text-sm">È un Prodotto Finito / Vendibile</span> </label> </div> <div className="flex justify-end mt-2"> <Button onClick={handleAddCategory}>Aggiungi</Button> </div> </div> </div> <div> <h4 className="font-semibold mb-2">Struttura Categorie</h4> <ul className="space-y-1 max-h-60 overflow-y-auto border rounded p-2 bg-white dark:bg-gray-800"> {hierarchicalCategories.map(({node: cat, level}) => ( <li key={cat.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border-b last:border-0 dark:border-gray-700"> <div className="flex items-center flex-grow" style={{ marginLeft: `${level * 20}px` }}> {level > 0 && <span className="text-gray-400 mr-2">↳</span>} {editingCategory?.id === cat.id ? ( <Input value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} className="flex-grow h-8 text-sm" /> ) : ( <span className="text-sm font-medium">{cat.name}</span> )} </div> <div className="flex items-center"> <label className="flex items-center space-x-1 mx-2 cursor-pointer text-xs text-gray-500" title="Componente"> <input type="checkbox" checked={cat.isComponent} onChange={() => handleToggleIsComponent(cat)} className="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500" /> <span>Comp.</span> </label> <label className="flex items-center space-x-1 mx-2 cursor-pointer text-xs text-gray-500" title="Prodotto Finito"> <input type="checkbox" checked={cat.isFinishedProduct !== false} onChange={() => handleToggleIsFinishedProduct(cat)} className="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500" /> <span>Fin.</span> </label> <div className="flex space-x-1"> {editingCategory?.id === cat.id ? ( <> <Button variant="ghost" size="sm" onClick={handleSaveEdit}><Check size={14} className="text-green-500" /></Button> <Button variant="ghost" size="sm" onClick={handleCancelEdit}><X size={14} className="text-red-500" /></Button> </> ) : ( <> <Button variant="ghost" size="sm" onClick={() => handleStartEdit(cat)}><Edit size={14} /></Button> <Button variant="ghost" size="sm" onClick={() => handleDelete(cat)}><Trash2 size={14} /></Button> </> )} </div> </div> </li> ))} </ul> </div> </div> <div className="flex justify-end space-x-2 pt-4 mt-4 border-t dark:border-gray-700"> <Button variant="secondary" onClick={onClose}>Chiudi</Button> </div> </Modal> ) };
const VariantForm: React.FC<{ variant: ProductVariant | null, onSave: (data: Omit<ProductVariant, 'id'|'quantity'|'productId'>) => void, onCancel: () => void }> = ({ variant, onSave, onCancel }) => { const [formData, setFormData] = useState({ name: '', purchasePrice: 0, salePrice: 0, location: '', capacity: 0, imageUrl: '' }); const [imagePreview, setImagePreview] = useState<string | null>(null); React.useEffect(() => { if(variant) { setFormData({ name: variant.name, purchasePrice: variant.purchasePrice, salePrice: variant.salePrice, location: variant.location || '', capacity: variant.capacity || 0, imageUrl: variant.imageUrl || '' }); setImagePreview(variant.imageUrl || null); } else { setFormData({ name: '', purchasePrice: 0, salePrice: 0, location: '', capacity: 0, imageUrl: '' }); setImagePreview(null); } }, [variant]); const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value, type } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value })); }; const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const reader = new FileReader(); reader.onloadend = () => { const result = reader.result as string; setImagePreview(result); setFormData(prev => ({ ...prev, imageUrl: result })); }; reader.readAsDataURL(e.target.files[0]); } }; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); setFormData({ name: '', purchasePrice: 0, salePrice: 0, location: '', capacity: 0, imageUrl: '' }); }; return ( <form onSubmit={handleSubmit} className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Input label="Nome Variante (es. 50ml)" name="name" value={formData.name} onChange={handleChange} required /> <Input label="Capacità (Numero)" name="capacity" type="number" step="0.1" value={formData.capacity} onChange={handleChange} placeholder="Es. 50" /> <Input label="Prezzo Acquisto" name="purchasePrice" type="number" step="0.0001" value={formData.purchasePrice} onChange={handleChange} /> <Input label="Prezzo Vendita" name="salePrice" type="number" step="0.0001" value={formData.salePrice} onChange={handleChange} /> <Input label="Posizione" name="location" value={formData.location} onChange={handleChange} placeholder="Es. Scaffale A1" /> <div className="col-span-1 md:col-span-2"> <label className="block text-sm font-medium mb-1">Foto Specifica Variante (Opzionale)</label> <input type="file" accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-gray-700 dark:file:text-gray-300"/> {imagePreview && ( <div className="mt-2 relative inline-block"> <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded shadow" /> <button type="button" onClick={() => { setImagePreview(null); setFormData(prev => ({...prev, imageUrl: ''}))}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button> </div> )} </div> </div> <div className="flex justify-end space-x-2"> {variant && <Button type="button" variant="secondary" onClick={onCancel}>Annulla</Button>} <Button type="submit">{variant ? "Salva Modifiche" : "Aggiungi Variante"}</Button> </div> </form> ); };
const VariantManagerModal: React.FC<{ isOpen: boolean, onClose: () => void, product: Product | null }> = ({ isOpen, onClose, product }) => { const { state, settings, dispatch } = useAppContext(); const { productVariants } = state[settings.currentYear]; const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null); const useVariantQuantity = useCallback((variantId: string) => { return state[settings.currentYear].inventoryBatches .filter(b => b.variantId === variantId) .reduce((sum, b) => sum + b.currentQuantity, 0); }, [state, settings.currentYear]); const variantsForProduct = useMemo(() => { return product ? productVariants.filter(v => v.productId === product.id) : []; }, [product, productVariants]); if (!product) return null; const handleSaveVariant = (variantData: Omit<ProductVariant, 'id' | 'quantity' | 'productId'>) => { if (editingVariant) { dispatch({ type: 'UPDATE_VARIANT', payload: { ...variantData, id: editingVariant.id, productId: product.id } }); } else { dispatch({ type: 'ADD_VARIANT', payload: { ...variantData, productId: product.id } }); } setEditingVariant(null); }; const handleDeleteVariant = (variantId: string) => { if(confirm("Sei sicuro di voler eliminare questa variante? L'operazione è irreversibile e cancellerà anche tutti i lotti associati.")) { dispatch({ type: 'DELETE_VARIANT', payload: variantId }); } }; return ( <Modal isOpen={isOpen} onClose={onClose} title={`Gestisci Varianti per: ${product.name}`}> <div className="space-y-4"> <h4 className="font-semibold">Varianti Esistenti</h4> <Table headers={["Nome Variante", "Giacenza", "Posizione", "P. Acquisto", "P. Vendita", "Azioni"]}> {variantsForProduct.map(v => ( <tr key={v.id}> <td className="px-6 py-4 text-sm font-medium">{v.name}</td> <td className="px-6 py-4 text-sm font-bold">{useVariantQuantity(v.id)}</td> <td className="px-6 py-4 text-sm">{v.location || '-'}</td> <td className="px-6 py-4 text-sm">€{v.purchasePrice.toFixed(4)}</td> <td className="px-6 py-4 text-sm">€{v.salePrice.toFixed(4)}</td> <td className="px-6 py-4 text-sm space-x-2"> <Button variant="ghost" size="sm" onClick={() => setEditingVariant(v)}><Edit size={16} /></Button> <Button variant="ghost" size="sm" onClick={() => handleDeleteVariant(v.id)}><Trash2 size={16} /></Button> </td> </tr> ))} </Table> <div className="border-t pt-4 mt-4"> <h4 className="font-semibold mb-2">{editingVariant ? "Modifica Variante" : "Aggiungi Nuova Variante"}</h4> <VariantForm variant={editingVariant} onSave={handleSaveVariant} onCancel={() => setEditingVariant(null)} /> </div> </div> </Modal> ); };
const ProductForm: React.FC<{ isOpen: boolean, onClose: () => void, product: Product | null }> = ({ isOpen, onClose, product }) => { const { state, settings, dispatch } = useAppContext(); const { categories } = state[settings.currentYear]; const getInitialFormState = (): Omit<Product, 'id'> => ({ name: '', code: '', brand: '', category: categories.find(c => !c.isComponent)?.name || categories[0]?.name || '', unit: 'pz', imageUrl: '', additionalImages: [], description: '', olfactoryPyramid: { head: '', heart: '', base: '' }, essenceCode: '', ifraLimit: undefined }); const [formData, setFormData] = useState(getInitialFormState()); const [initialCapacity, setInitialCapacity] = useState<number>(0); React.useEffect(() => { if (isOpen) { const initialData = product ? { ...product } : getInitialFormState(); if (!initialData.olfactoryPyramid) initialData.olfactoryPyramid = { head: '', heart: '', base: '' }; if (!initialData.brand) initialData.brand = ''; if (!initialData.code) initialData.code = ''; if (!initialData.additionalImages) initialData.additionalImages = []; if (!initialData.essenceCode) initialData.essenceCode = ''; setFormData(initialData); setInitialCapacity(0); } }, [product, isOpen, categories]); const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { const { name, value, type } = e.target; setFormData({ ...formData, [name]: type === 'number' ? (parseFloat(value) || 0) : value }); }; const handlePyramidChange = (field: 'head'|'heart'|'base', value: string) => { setFormData(prev => ({ ...prev, olfactoryPyramid: { ...prev.olfactoryPyramid!, [field]: value } })); }; const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isGallery: boolean = false) => { if (e.target.files) { Array.from(e.target.files).forEach((file: File) => { const reader = new FileReader(); reader.onloadend = () => { const result = reader.result as string; if (isGallery) { setFormData(prev => ({...prev, additionalImages: [...(prev.additionalImages || []), result] })); } else { setFormData(prev => ({...prev, imageUrl: result })); } }; reader.readAsDataURL(file); }); } }; const removeGalleryImage = (index: number) => { setFormData(prev => ({ ...prev, additionalImages: prev.additionalImages?.filter((_, i) => i !== index) })); }; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (product) { dispatch({ type: 'UPDATE_PRODUCT', payload: { ...formData, id: product.id } }); } else { dispatch({ type: 'ADD_PRODUCT', payload: { ...formData, initialCapacity } }); } onClose(); }; const categoryOptions = useMemo(() => { return categories.map(c => { let label = c.name; if (c.parentId) { const parent = categories.find(p => p.id === c.parentId); if(parent) label = `${parent.name} > ${c.name}`; } return { value: c.name, label, isComponent: c.isComponent }; }).sort((a,b) => a.label.localeCompare(b.label)); }, [categories]); return ( <Modal isOpen={isOpen} onClose={onClose} title={product ? "Modifica Prodotto Base" : "Nuovo Prodotto Base"}> <form onSubmit={handleSubmit} className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> <div className="md:col-span-1"> <Input label="Codice Prodotto" name="code" value={formData.code || ''} onChange={handleChange} placeholder="Es. PR-001" /> </div> <div className="md:col-span-3"> <Input label="Nome Prodotto" name="name" value={formData.name} onChange={handleChange} required /> </div> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Input label="Brand / Marchio" name="brand" value={formData.brand || ''} onChange={handleChange} placeholder="Es. Profumeria Pro" /> {!product && ( <Input label={`Capacità Formato Base (${formData.unit})`} type="number" step="0.1" value={initialCapacity || ''} onChange={e => setInitialCapacity(parseFloat(e.target.value))} placeholder="Es. 50 (crea variante '50ml')" /> )} </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div> <label className="block text-sm font-medium mb-1">Categoria</label> <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"> {categoryOptions.map(cat => ( <option key={cat.value} value={cat.value}> {cat.label} {cat.isComponent ? '(Comp.)' : ''} </option> ))} </select> </div> <div> <label className="block text-sm font-medium mb-1">Unità di Misura</label> <select name="unit" value={formData.unit} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"> <option value="pz">pz</option><option value="ml">ml</option><option value="l">l</option> <option value="g">g</option><option value="kg">kg</option> </select> </div> </div> <div> <label className="block text-sm font-medium mb-1">Descrizione Commerciale</label> <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600" placeholder="Descrivi il product..."></textarea> </div> <div className="border p-3 rounded bg-gray-50 dark:bg-gray-700/50"> <h4 className="font-semibold text-sm mb-2">Piramide Olfattiva</h4> <div className="space-y-2"> <Input label="Note di Testa" value={formData.olfactoryPyramid?.head || ''} onChange={e => handlePyramidChange('head', e.target.value)} placeholder="Es. Bergamotto, Limone" /> <Input label="Note di Cuore" value={formData.olfactoryPyramid?.heart || ''} onChange={e => handlePyramidChange('heart', e.target.value)} placeholder="Es. Rosa, Gelsomino" /> <Input label="Note di Fondo" value={formData.olfactoryPyramid?.base || ''} onChange={e => handlePyramidChange('base', e.target.value)} placeholder="Es. Legno di Cedro, Muschio" /> </div> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded border dark:border-gray-600"> <Input label="Codice Essenza" name="essenceCode" value={formData.essenceCode || ''} onChange={handleChange} placeholder="Es. ESS-1234" /> </div> <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded border dark:border-gray-600 relative"> <Input label="Limite IFRA (%)" name="ifraLimit" type="number" step="0.01" value={formData.ifraLimit || ''} onChange={e => setFormData({...formData, ifraLimit: e.target.value === '' ? undefined : parseFloat(e.target.value)})} placeholder="0.00" /> <span className="absolute right-4 top-9 text-gray-500">%</span> </div> </div> <div className="space-y-4"> <div> <label className="block text-sm font-medium mb-1">Foto Copertina</label> <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, false)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-gray-700 dark:file:text-gray-300"/> {formData.imageUrl && ( <div className="mt-2 relative inline-block"> <img src={formData.imageUrl} alt="Anteprima Copertina" className="h-24 w-24 object-cover rounded-md shadow-sm" /> <Button variant="ghost" size="sm" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 h-6 w-6 flex items-center justify-center" onClick={() => setFormData(prev => ({...prev, imageUrl: ''}))}><X size={12}/></Button> </div> )} </div> <div> <label className="block text-sm font-medium mb-1">Galleria / Altre Foto</label> <input type="file" accept="image/*" multiple onChange={(e) => handleImageChange(e, true)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-gray-700 dark:file:text-gray-300"/> <div className="mt-2 flex flex-wrap gap-2"> {formData.additionalImages?.map((img, idx) => ( <div key={idx} className="relative inline-block"> <img src={img} alt={`Gallery ${idx}`} className="h-16 w-16 object-cover rounded shadow-sm" /> <button type="button" onClick={() => removeGalleryImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10} /></button> </div> ))} </div> </div> </div> <div className="flex justify-end space-x-2 pt-4"> <Button type="button" variant="secondary" onClick={onClose}>Annulla</Button> <Button type="submit">Salva</Button> </div> </form> </Modal> ); };
const ProductBaseManagerModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => { const { state, settings, dispatch } = useAppContext(); const data = state[settings.currentYear]; const [isProductModalOpen, setProductModalOpen] = useState(false); const [editingProduct, setEditingProduct] = useState<Product | null>(null); const [isVariantModalOpen, setVariantModalOpen] = useState(false); const [managingVariantsFor, setManagingVariantsFor] = useState<Product | null>(null); const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null); const [searchTerm, setSearchTerm] = useState(''); const openProductModal = (product: Product | null = null) => { setEditingProduct(product); setProductModalOpen(true); }; const openVariantModal = (product: Product) => { setManagingVariantsFor(product); setVariantModalOpen(true); }; const handleProductFormClose = () => { setProductModalOpen(false); setEditingProduct(null); }; const handleVariantModalClose = () => { setVariantModalOpen(false); setManagingVariantsFor(null); }; const filteredProducts = useMemo(() => { return data.products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) || p.code?.toLowerCase().includes(searchTerm.toLowerCase())); }, [data.products, searchTerm]); return ( <Modal isOpen={isOpen} onClose={onClose} title="Gestione Prodotti Base"> <div className="flex flex-wrap items-center justify-between mb-4 gap-4"> <Input placeholder="Cerca per nome, brand o codice..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-xs" /> <Button onClick={() => openProductModal()}><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Prodotto Base</Button> </div> <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col max-h-[65vh]"> <div className="overflow-auto relative"> <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"> <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-20"> <tr> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Foto</th> <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Codice</th> <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Brand</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nome Prodotto</th> <th scope="col" className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Categoria</th> <th scope="col" className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unità</th> <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky right-0 z-20 bg-gray-50 dark:bg-gray-700 shadow-[-4px_0px_6px_-2px_rgba(0,0,0,0.1)]">Azioni</th> </tr> </thead> <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"> {filteredProducts.map(p => ( <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"> <td className="px-6 py-4 whitespace-nowrap"> {p.imageUrl ? ( <img src={p.imageUrl} alt={p.name} className="h-10 w-10 object-cover rounded cursor-pointer" onClick={() => setViewingImageUrl(p.imageUrl)} /> ) : ( <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center"> <ImageIcon size={20} className="text-gray-400" /> </div> )} </td> <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{p.code || '-'}</td> <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600 dark:text-gray-400">{p.brand || '-'}</td> <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</td> <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.category}</td> <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.unit}</td> <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 text-center sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0px_6px_-2px_rgba(0,0,0,0.1)]"> <div className="flex justify-center space-x-1"> <Button variant="secondary" size="sm" onClick={() => openVariantModal(p)} title="Gestisci Varianti"><Layers size={16} /></Button> <Button variant="ghost" size="sm" onClick={() => openProductModal(p)} title="Modifica"><Edit size={16} /></Button> <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {if(confirm("Eliminando il prodotto base eliminerai anche TUTTE le sue varianti e i relativi lotti. Continuare?")) dispatch({type:'DELETE_PRODUCT', payload: p.id})}} title="Elimina"><Trash2 size={16} /></Button> </div> </td> </tr> ))} </tbody> </table> </div> </div> {isProductModalOpen && <ProductForm isOpen={isProductModalOpen} onClose={handleProductFormClose} product={editingProduct} />} {isVariantModalOpen && <VariantManagerModal isOpen={isVariantModalOpen} onClose={handleVariantModalClose} product={managingVariantsFor} />} <Modal isOpen={!!viewingImageUrl} onClose={() => setViewingImageUrl(null)} title="Visualizza Immagine"> {viewingImageUrl && <img src={viewingImageUrl} alt="Immagine Prodotto" className="max-w-full max-h-[70vh] mx-auto" />} </Modal> </Modal> ); };
const EditVariantModal: React.FC<{ isOpen: boolean, onClose: () => void, variant: ProductVariant | null }> = ({ isOpen, onClose, variant }) => { const { dispatch } = useAppContext(); if (!variant) return null; const handleSave = (variantData: Omit<ProductVariant, 'id' | 'quantity' | 'productId'>) => { dispatch({ type: 'UPDATE_VARIANT', payload: { ...variantData, id: variant.id, productId: variant.productId } }); onClose(); }; return ( <Modal isOpen={isOpen} onClose={onClose} title={`Modifica Variante`}> <VariantForm variant={variant} onSave={handleSave} onCancel={onClose} /> </Modal> ); };
const BatchDetailModal: React.FC<{ isOpen: boolean, onClose: () => void, variant: any | null }> = ({ isOpen, onClose, variant }) => { const { state, settings } = useAppContext(); const batches = useMemo(() => { if (!variant) return []; return state[settings.currentYear].inventoryBatches .filter(b => b.variantId === variant.id) .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }, [variant, state, settings.currentYear]); if (!variant) return null; return ( <Modal isOpen={isOpen} onClose={onClose} title={`Dettaglio Lotti per: ${variant.productName} - ${variant.name}`}> <div className="max-h-[60vh] overflow-y-auto"> <Table headers={["Lotto", "Scadenza", "Qtà Attuale", "Qtà Iniziale", "Stato", "Macerazione", "Origine"]}> {batches.map(batch => { let origin = "Sconosciuta"; if (batch.stockLoadId) { const stockLoad = state[settings.currentYear].stockLoads.find(sl => sl.id === batch.stockLoadId); if (stockLoad) { const supplier = state[settings.currentYear].suppliers.find(s => s.id === stockLoad.supplierId); origin = `Carico (${supplier?.name || 'Deposito / Interno'})`; } else { origin = 'Carico eliminato'; } } else if (batch.productionId) { origin = `Produzione`; } let statusBadge = <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Disponibile</span>; let macerationInfo = <span className="text-gray-400 text-xs">-</span>; if (batch.status === 'macerating') { statusBadge = <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs flex items-center w-fit"><Clock size={12} className="mr-1"/> Macerazione</span>; if (batch.macerationEndDate) { const end = new Date(batch.macerationEndDate); const today = new Date(); const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24)); macerationInfo = <span className="text-amber-600 text-xs font-semibold">In corso ({daysLeft > 0 ? daysLeft : 0} gg rimasti)</span>; } } else if (batch.status === 'available') { if (batch.actualMacerationDays !== undefined) { macerationInfo = <span className="text-green-600 text-xs font-bold">Completata ({batch.actualMacerationDays} gg)</span>; } else if (batch.productionId) { macerationInfo = <span className="text-gray-500 text-xs">Immediata / N.D.</span>; } } return ( <tr key={batch.id}> <td className="px-6 py-4 text-sm font-mono">{batch.batchNumber || '-'}</td> <td className="px-6 py-4 text-sm">{batch.expirationDate ? new Date(batch.expirationDate).toLocaleDateString() : '-'}</td> <td className="px-6 py-4 text-sm font-bold">{batch.currentQuantity}</td> <td className="px-6 py-4 text-sm">{batch.initialQuantity}</td> <td className="px-6 py-4 text-sm">{statusBadge}</td> <td className="px-6 py-4 text-sm">{macerationInfo}</td> <td className="px-6 py-4 text-sm">{origin}</td> </tr> ); })} </Table> {batches.length === 0 && <p className="text-center p-4">Nessun lotto presente per questa variante.</p>} </div> </Modal> ); };

const ProductLifecycleModal: React.FC<{ isOpen: boolean, onClose: () => void, variant: any | null }> = ({ isOpen, onClose, variant }) => {
    const { state, settings } = useAppContext();
    const yearData = state[settings.currentYear];
    
    // Hooks and Calculations
    const historyData = useMemo(() => {
        if (!variant) return null;

        const batches = yearData.inventoryBatches.filter(b => b.variantId === variant.id);
        
        // Origins
        const producedBatches = batches.filter(b => b.productionId);
        const loadedBatches = batches.filter(b => b.stockLoadId);

        // Sales
        const sales = yearData.sales.filter(s => s.items.some(i => i.variantId === variant.id));
        const totalSold = sales.reduce((acc, s) => {
            const item = s.items.find(i => i.variantId === variant.id);
            return acc + (item ? item.quantity : 0);
        }, 0);

        const totalRevenue = sales.reduce((acc, s) => {
             const item = s.items.find(i => i.variantId === variant.id);
             return acc + (item ? (item.quantity * item.price) : 0);
        }, 0);

        // Calculate Average Cost Price
        let weightedCostSum = 0;
        let totalQuantityForCost = 0;
        let costDetails: { type: string, cost: number, date: string, batchNumber: string, details?: any }[] = [];

        // Cost from Production
        for (const batch of producedBatches) {
            const prod = yearData.productions.find(p => p.id === batch.productionId);
            if (prod) {
                // Calculate production cost based on components
                const batchCost = prod.components.reduce((acc, comp) => {
                    const compVariant = yearData.productVariants.find(v => v.id === comp.variantId);
                    return acc + (comp.totalQuantityUsed * (compVariant?.purchasePrice || 0));
                }, 0);
                const unitCost = batchCost / prod.quantityProduced;
                
                weightedCostSum += (unitCost * batch.initialQuantity);
                totalQuantityForCost += batch.initialQuantity;

                costDetails.push({
                    type: 'Produzione',
                    cost: unitCost,
                    date: prod.date,
                    batchNumber: batch.batchNumber || '-',
                    details: {
                        maceration: prod.macerationDays,
                        components: prod.components
                    }
                });
            }
        }

        // Cost from Stock Loads
        for (const batch of loadedBatches) {
             const load = yearData.stockLoads.find(sl => sl.id === batch.stockLoadId);
             if (load) {
                 const item = load.items.find(i => i.variantId === variant.id && i.batchNumber === batch.batchNumber); // Match strictly by batch if possible, else approximation
                 // If batch number matching is loose, we iterate load items.
                 const loadItem = load.items.find(i => i.variantId === variant.id); // Simple fallback
                 if (loadItem) {
                     weightedCostSum += (loadItem.price * batch.initialQuantity);
                     totalQuantityForCost += batch.initialQuantity;
                     costDetails.push({
                         type: 'Carico',
                         cost: loadItem.price,
                         date: load.date,
                         batchNumber: batch.batchNumber || '-',
                         details: { supplierId: load.supplierId }
                     });
                 }
             }
        }
        
        const avgCost = totalQuantityForCost > 0 ? weightedCostSum / totalQuantityForCost : (variant.purchasePrice || 0);

        // Timeline Construction
        const timeline = [
            ...producedBatches.map(b => ({ date: b.createdAt, type: 'IN_PROD', quantity: b.initialQuantity, batchNumber: b.batchNumber, refId: b.productionId })),
            ...loadedBatches.map(b => ({ date: b.createdAt, type: 'IN_LOAD', quantity: b.initialQuantity, batchNumber: b.batchNumber, refId: b.stockLoadId })),
            ...sales.map(s => ({ date: s.date, type: 'OUT_SALE', quantity: s.items.find(i => i.variantId === variant.id)?.quantity || 0, batchNumber: '-', refId: s.id }))
        ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            totalProducedOrLoaded: totalQuantityForCost,
            totalSold,
            totalRevenue,
            avgCost,
            costDetails,
            timeline,
            currentStock: variant.quantity // comes from displayVariants logic passed in props
        };

    }, [variant, yearData]);

    if (!variant || !historyData) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Vita del Prodotto: ${variant.productName} - ${variant.name}`}>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
                {/* Header Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border dark:border-blue-900">
                        <span className="text-xs text-blue-600 uppercase font-bold">Totale Entrate</span>
                        <p className="text-xl font-bold">{historyData.totalProducedOrLoaded}</p>
                        <span className="text-[10px] text-gray-500">Pezzi prodotti/caricati</span>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border dark:border-green-900">
                        <span className="text-xs text-green-600 uppercase font-bold">Totale Vendite</span>
                        <p className="text-xl font-bold">{historyData.totalSold}</p>
                        <span className="text-[10px] text-gray-500">Pezzi venduti</span>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border dark:border-amber-900">
                        <span className="text-xs text-amber-600 uppercase font-bold">Giacenza Attuale</span>
                        <p className="text-xl font-bold">{historyData.currentStock}</p>
                         <span className="text-[10px] text-gray-500">Pezzi disponibili</span>
                    </div>
                     <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
                        <span className="text-xs text-gray-600 dark:text-gray-400 uppercase font-bold">Costo Medio Unit.</span>
                        <p className="text-xl font-bold">€{historyData.avgCost.toFixed(2)}</p>
                         <span className="text-[10px] text-gray-500">Calcolato su storico</span>
                    </div>
                </div>

                <div className="flex gap-6 flex-col md:flex-row">
                    {/* Left Column: Timeline */}
                    <div className="flex-1">
                        <h4 className="font-semibold mb-3 flex items-center"><History size={16} className="mr-2"/> Timeline Movimenti</h4>
                        <div className="border rounded-lg dark:border-gray-700 max-h-60 overflow-y-auto bg-white dark:bg-gray-800">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                    <tr>
                                        <th className="p-2">Data</th>
                                        <th className="p-2">Tipo</th>
                                        <th className="p-2 text-right">Quantità</th>
                                        <th className="p-2">Rif.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyData.timeline.map((event, idx) => (
                                        <tr key={idx} className="border-b dark:border-gray-700">
                                            <td className="p-2">{new Date(event.date).toLocaleDateString()}</td>
                                            <td className="p-2">
                                                {event.type === 'IN_PROD' && <span className="text-amber-600 font-bold">Produzione</span>}
                                                {event.type === 'IN_LOAD' && <span className="text-blue-600 font-bold">Carico</span>}
                                                {event.type === 'OUT_SALE' && <span className="text-green-600 font-bold">Vendita</span>}
                                            </td>
                                            <td className={`p-2 text-right font-mono font-bold ${event.type === 'OUT_SALE' ? 'text-red-500' : 'text-green-500'}`}>
                                                {event.type === 'OUT_SALE' ? '-' : '+'}{event.quantity}
                                            </td>
                                            <td className="p-2 text-gray-400 font-mono">
                                                {event.type !== 'OUT_SALE' ? event.batchNumber : `Doc #${event.refId.substring(0,6)}`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Column: Production/Cost Details */}
                    <div className="flex-1">
                        <h4 className="font-semibold mb-3 flex items-center"><FlaskConical size={16} className="mr-2"/> Dettagli Origine & Costi</h4>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {historyData.costDetails.map((detail, idx) => {
                                const supplierName = detail.type === 'Carico' 
                                    ? yearData.suppliers.find(s => s.id === detail.details.supplierId)?.name || 'Deposito/Interno' 
                                    : null;

                                return (
                                    <div key={idx} className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
                                        <div className="flex justify-between font-bold mb-1">
                                            <span className={detail.type === 'Produzione' ? 'text-amber-600' : 'text-blue-600'}>
                                                {detail.type} ({new Date(detail.date).toLocaleDateString()})
                                            </span>
                                            <span>€{detail.cost.toFixed(3)} / pz</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">Lotto: {detail.batchNumber}</p>
                                        
                                        {detail.type === 'Produzione' && detail.details.components && (
                                            <div className="text-xs bg-white dark:bg-gray-700 p-2 rounded">
                                                <p className="font-semibold mb-1">Componenti Utilizzati:</p>
                                                <ul className="list-disc pl-4 space-y-1">
                                                    {detail.details.components.map((comp: ProductionComponent, cIdx: number) => {
                                                        const cVariant = yearData.productVariants.find(v => v.id === comp.variantId);
                                                        const cProduct = yearData.products.find(p => p.id === cVariant?.productId);
                                                        return (
                                                            <li key={cIdx}>{cProduct?.name} ({cVariant?.name}): {comp.totalQuantityUsed} {cProduct?.unit}</li>
                                                        );
                                                    })}
                                                </ul>
                                                <p className="mt-2 text-gray-500">Macerazione: {detail.details.maceration} giorni</p>
                                            </div>
                                        )}
                                        {detail.type === 'Carico' && (
                                            <p className="text-xs">Fornitore: {supplierName}</p>
                                        )}
                                    </div>
                                );
                            })}
                             {historyData.costDetails.length === 0 && <p className="text-gray-500 italic">Nessun dettaglio costo disponibile.</p>}
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t dark:border-gray-700">
                <Button variant="secondary" onClick={onClose}>Chiudi</Button>
            </div>
        </Modal>
    );
};

const InventoryView: React.FC = () => { const { state, settings, dispatch } = useAppContext(); const { products, productVariants, categories, inventoryBatches } = state[settings.currentYear]; const [isProductBaseModalOpen, setProductBaseModalOpen] = useState(false); const [isCategoryModalOpen, setCategoryModalOpen] = useState(false); const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null); const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null); const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null); const [batchDetailVariant, setBatchDetailVariant] = useState<any | null>(null); const [lifecycleVariant, setLifecycleVariant] = useState<any | null>(null); const [isPrintModalOpen, setPrintModalOpen] = useState(false); const [searchTerm, setSearchTerm] = useState(''); const [selectedCategory, setSelectedCategory] = useState('all'); const [showProducedOnly, setShowProducedOnly] = useState(false); const [sortConfig, setSortConfig] = useState<{ key: 'quantity'; direction: 'ascending' | 'descending' }>({ key: 'quantity', direction: 'descending' }); const variantStats = useMemo(() => { const stats = new Map<string, { total: number, available: number, macerating: number }>(); inventoryBatches.forEach(batch => { const current = stats.get(batch.variantId) || { total: 0, available: 0, macerating: 0 }; current.total += batch.currentQuantity; if (batch.status === 'available') current.available += batch.currentQuantity; if (batch.status === 'macerating') current.macerating += batch.currentQuantity; stats.set(batch.variantId, current); }); return stats; }, [inventoryBatches]); const displayVariants = useMemo(() => { let variants = productVariants.map(variant => { const product = products.find(p => p.id === variant.productId); const stats = variantStats.get(variant.id) || { total: 0, available: 0, macerating: 0 }; return { ...variant, productName: product?.name || 'N/A', brand: product?.brand || '', category: product?.category || 'N/A', imageUrl: product?.imageUrl, quantity: stats.total, availableQuantity: stats.available, maceratingQuantity: stats.macerating }; }); if (selectedCategory !== 'all') { variants = variants.filter(v => v.category === selectedCategory); } if (showProducedOnly) { variants = variants.filter(v => inventoryBatches.some(b => b.variantId === v.id && b.productionId)); } if (searchTerm) { const lowercasedFilter = searchTerm.toLowerCase(); variants = variants.filter(v => v.productName.toLowerCase().includes(lowercasedFilter) || v.name.toLowerCase().includes(lowercasedFilter) || v.brand.toLowerCase().includes(lowercasedFilter) ); } if (sortConfig) { variants.sort((a, b) => { if (a[sortConfig.key] < b[sortConfig.key]) { return sortConfig.direction === 'ascending' ? -1 : 1; } if (a[sortConfig.key] > b[sortConfig.key]) { return sortConfig.direction === 'ascending' ? 1 : -1; } return 0; }); } return variants; }, [productVariants, products, selectedCategory, searchTerm, sortConfig, variantStats, showProducedOnly, inventoryBatches]); const handleSort = () => { setSortConfig(prev => ({ key: 'quantity', direction: prev.direction === 'ascending' ? 'descending' : 'ascending' })); }; const openEditModal = (variant: ProductVariant) => { setEditingVariant(variant); }; const openDeleteDialog = (variantId: string) => { setDeletingVariantId(variantId); }; const confirmDelete = () => { if(deletingVariantId) { dispatch({ type: 'DELETE_VARIANT', payload: deletingVariantId }); } setDeletingVariantId(null); }; return ( <Card title="Giacenze / Magazzino"> <div className="flex flex-wrap items-center justify-between mb-4 gap-4"> <div className="flex flex-wrap items-center gap-4 w-full md:w-auto"> <div className="relative w-full md:w-64"> <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /> <Input placeholder="Filtra rapido (Brand, Nome, Variante)" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 w-full" /> </div> <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="block w-full md:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-800"> <option value="all">Tutte le categorie</option> {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)} </select> <label className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded border cursor-pointer hover:bg-gray-100"> <input type="checkbox" checked={showProducedOnly} onChange={e => setShowProducedOnly(e.target.checked)} className="rounded text-amber-600 focus:ring-amber-500"/> <span className="text-sm font-medium text-gray-700 dark:text-gray-300"><Factory size={16} className="inline mr-1"/> Solo Produzione</span> </label> </div> <div className="flex items-center space-x-2"> <Button variant="secondary" onClick={() => setPrintModalOpen(true)}>Stampa/Esporta Giacenze</Button> <Button variant="secondary" onClick={() => setCategoryModalOpen(true)}>Gestisci Categorie</Button> <Button onClick={() => setProductBaseModalOpen(true)}>Gestisci Prodotti Base</Button> </div> </div> <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col max-h-[70vh]"> <div className="overflow-auto relative"> <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"> <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-20"> <tr> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Foto</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Brand</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Prodotto</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Variante</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Categoria</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"> <Button variant="ghost" size="sm" onClick={handleSort} className="flex items-center -ml-3"> Quantità Totale <ArrowUpDown size={14} className="ml-1" /> </Button> </th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stato Giacenza</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Posizione</th> <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky right-0 z-20 bg-gray-50 dark:bg-gray-700 shadow-[-4px_0px_6px_-2px_rgba(0,0,0,0.1)]">Azioni</th> </tr> </thead> <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"> {displayVariants.map(v => ( <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"> <td className="px-6 py-4"> {v.imageUrl ? ( <img src={v.imageUrl} alt={v.productName} className="h-12 w-12 object-cover rounded cursor-pointer" onClick={() => setViewingImageUrl(v.imageUrl)} /> ) : ( <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center"> <ImageIcon size={24} className="text-gray-400" /> </div> )} </td> <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">{v.brand}</td> <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{v.productName}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{v.name}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{v.category}</td> <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{v.quantity}</td> <td className="px-6 py-4 whitespace-nowrap text-sm"> <div className="flex flex-col text-xs"> <span className="text-green-600 font-semibold">Disp: {v.availableQuantity}</span> {v.maceratingQuantity > 0 && ( <span className="text-amber-600 font-semibold flex items-center mt-1"> <Clock size={10} className="mr-1"/> Maceraz: {v.maceratingQuantity} </span> )} </div> </td> <td className="px-6 py-4 whitespace-nowrap text-sm">{v.location || '-'}</td> <td className="px-6 py-4 whitespace-nowrap text-sm space-x-1 text-center sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0px_6px_-2px_rgba(0,0,0,0.1)]"> <div className="flex justify-center space-x-1"> <Button variant="ghost" size="sm" onClick={() => setLifecycleVariant(v)} title="Dettagli e Storico Vita" className="text-blue-600"><ScrollText size={16} /></Button> <Button variant="ghost" size="sm" onClick={() => setBatchDetailVariant(v)} title="Dettaglio Lotti"><ListTree size={16} /></Button> <Button variant="ghost" size="sm" onClick={() => openEditModal(v)} title="Modifica Variante"><Edit size={16} /></Button> <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(v.id)} title="Elimina Variante"><Trash2 size={16} /></Button> </div> </td> </tr> ))} </tbody> </table> </div> </div> {displayVariants.length === 0 && <p className="text-center text-gray-500 mt-4">Nessuna variante trovata. Prova a modificare i filtri o ad aggiungere nuovi prodotti.</p>} <ProductBaseManagerModal isOpen={isProductBaseModalOpen} onClose={() => setProductBaseModalOpen(false)} /> <CategoryManagerModal isOpen={isCategoryModalOpen} onClose={() => setCategoryModalOpen(false)} /> <EditVariantModal isOpen={!!editingVariant} onClose={() => setEditingVariant(null)} variant={editingVariant} /> <BatchDetailModal isOpen={!!batchDetailVariant} onClose={() => setBatchDetailVariant(null)} variant={batchDetailVariant} /> <ProductLifecycleModal isOpen={!!lifecycleVariant} onClose={() => setLifecycleVariant(null)} variant={lifecycleVariant} /> <ConfirmDialog isOpen={!!deletingVariantId} onClose={() => setDeletingVariantId(null)} onConfirm={confirmDelete} title="Conferma Eliminazione" message="Sei sicuro di voler eliminare questa variante? Verranno eliminati anche tutti i lotti in magazzino." /> <Modal isOpen={!!viewingImageUrl} onClose={() => setViewingImageUrl(null)} title="Visualizza Immagine"> {viewingImageUrl && <img src={viewingImageUrl} alt="Immagine Prodotto" className="max-w-full max-h-[70vh] mx-auto" />} </Modal> <PrintModal isOpen={isPrintModalOpen} onClose={() => setPrintModalOpen(false)} title="Stampa Report Giacenze" documentName={`report-giacenze-${new Date().toISOString().split('T')[0]}`} > <PrintableInventory variants={displayVariants} companyInfo={settings.companyInfo} /> </PrintModal> </Card> ); };

interface ProductDetailCatalogModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    variants: ProductVariant[];
}

const ProductDetailCatalogModal: React.FC<ProductDetailCatalogModalProps> = ({ isOpen, onClose, product, variants }) => { const { state, settings } = useAppContext(); const batches = state[settings.currentYear].inventoryBatches; const [activeImage, setActiveImage] = useState<string | null>(product.imageUrl || null); React.useEffect(() => { setActiveImage(product.imageUrl || null); }, [product]); const galleryImages = useMemo(() => { const imgs = []; if (product.imageUrl) imgs.push({ src: product.imageUrl, type: 'Copertina' }); if (product.additionalImages) product.additionalImages.forEach(img => imgs.push({ src: img, type: 'Galleria' })); variants.forEach(v => { if (v.imageUrl) imgs.push({ src: v.imageUrl, type: `Variante ${v.name}` }); }); return imgs; }, [product, variants]); const getBatchInfo = (variantId: string) => { const variantBatches = batches.filter(b => b.variantId === variantId && b.currentQuantity > 0); if (variantBatches.length === 0) return { status: 'Non disponibile', color: 'text-gray-400' }; const macerating = variantBatches.some(b => b.status === 'macerating'); if (macerating) { const minDate = variantBatches .filter(b => b.status === 'macerating' && b.macerationEndDate) .map(b => new Date(b.macerationEndDate!).getTime()) .sort()[0]; const readyDate = minDate ? new Date(minDate).toLocaleDateString() : 'N/D'; return { status: `In arrivo (Macerazione termina il ${readyDate})`, color: 'text-amber-600' }; } return { status: 'Disponibile', color: 'text-green-600' }; }; return ( <Modal isOpen={isOpen} onClose={onClose} title={product.name}> <div className="flex flex-col md:flex-row gap-6"> <div className="w-full md:w-1/3"> <div className="w-full h-64 md:h-80 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden mb-2"> {activeImage ? ( <img src={activeImage} alt={product.name} className="w-full h-full object-contain" /> ) : ( <ImageIcon size={64} /> )} </div> {galleryImages.length > 1 && ( <div className="flex overflow-x-auto space-x-2 pb-2"> {galleryImages.map((img, idx) => ( <img key={idx} src={img.src} alt={img.type} className={`h-16 w-16 object-cover rounded cursor-pointer border-2 ${activeImage === img.src ? 'border-primary-500' : 'border-transparent'}`} onClick={() => setActiveImage(img.src)} title={img.type} /> ))} </div> )} </div> <div className="w-full md:w-2/3 space-y-6"> <div> <div className="flex justify-between items-start"> <div> {product.brand && <span className="text-sm font-bold text-gray-500 uppercase block">{product.brand}</span>} <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{product.name}</h3> </div> {product.code && <span className="text-xs font-mono text-gray-500 border px-2 py-1 rounded bg-gray-50 dark:bg-gray-800">#{product.code}</span>} </div> <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full mt-2">{product.category}</span> </div> {product.description && ( <p className="text-gray-600 dark:text-gray-300 italic">{product.description}</p> )} {product.olfactoryPyramid && (product.olfactoryPyramid.head || product.olfactoryPyramid.heart || product.olfactoryPyramid.base) && ( <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600"> <h4 className="font-semibold mb-2 flex items-center text-sm uppercase text-gray-500"><Layers size={14} className="mr-2"/> Piramide Olfattiva</h4> <div className="space-y-2 text-sm"> {product.olfactoryPyramid.head && ( <div className="flex"><span className="w-16 font-bold text-gray-500">Testa:</span> <span>{product.olfactoryPyramid.head}</span></div> )} {product.olfactoryPyramid.heart && ( <div className="flex"><span className="w-16 font-bold text-gray-500">Cuore:</span> <span>{product.olfactoryPyramid.heart}</span></div> )} {product.olfactoryPyramid.base && ( <div className="flex"><span className="w-16 font-bold text-gray-500">Fondo:</span> <span>{product.olfactoryPyramid.base}</span></div> )} </div> </div> )} {(product.essenceCode || product.ifraLimit) && ( <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900 grid grid-cols-2 gap-4"> {product.essenceCode && ( <div> <h5 className="font-semibold text-xs uppercase text-blue-500 flex items-center mb-1"><FlaskConical size={12} className="mr-1"/> Codice Essenza</h5> <p className="font-mono text-sm">{product.essenceCode}</p> </div> )} {product.ifraLimit && ( <div> <h5 className="font-semibold text-xs uppercase text-blue-500 flex items-center mb-1"><Info size={12} className="mr-1"/> Limite IFRA</h5> <p className="font-bold text-sm">{product.ifraLimit.toFixed(2)}%</p> </div> )} </div> )} <div> <h4 className="font-semibold mb-2">Formati Disponibili</h4> <Table headers={["Formato", "Capacità", "Prezzo", "Disponibilità"]}> {variants.map(v => { const info = getBatchInfo(v.id); return ( <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => { if(v.imageUrl) setActiveImage(v.imageUrl) }}> <td className="px-4 py-2 font-medium">{v.name}</td> <td className="px-4 py-2 text-xs text-gray-500">{v.capacity ? `${v.capacity} ${product.unit}` : '-'}</td> <td className="px-4 py-2">€{v.salePrice.toFixed(2)}</td> <td className={`px-4 py-2 font-bold text-xs ${info.color}`}>{info.status}</td> </tr> ); })} </Table> {variants.length === 0 && <p className="text-gray-500 italic">Nessun formato disponibile per la vendita.</p>} <p className="text-xs text-gray-400 mt-2">* Clicca su un formato per vedere la foto specifica (se presente).</p> </div> </div> </div> <div className="flex justify-end pt-6 mt-4 border-t dark:border-gray-700"> <Button variant="secondary" onClick={onClose}>Chiudi</Button> </div> </Modal> ); };
const CatalogView: React.FC = () => { const { state, settings } = useAppContext(); const { products, productVariants, categories } = state[settings.currentYear]; const [selectedCategory, setSelectedCategory] = useState('all'); const [searchTerm, setSearchTerm] = useState(''); const [selectedProduct, setSelectedProduct] = useState<Product | null>(null); const [isPrintModalOpen, setPrintModalOpen] = useState(false); const salesCategories = useMemo(() => categories.filter(c => !c.isComponent), [categories]); const catalogProducts = useMemo(() => { let filtered = products.filter(p => { const cat = categories.find(c => c.name === p.category); return cat && !cat.isComponent; }); if (selectedCategory !== 'all') { filtered = filtered.filter(p => p.category === selectedCategory); } if (searchTerm) { const lowercased = searchTerm.toLowerCase(); filtered = filtered.filter(p => p.name.toLowerCase().includes(lowercased) || p.brand?.toLowerCase().includes(lowercased) || p.code?.toLowerCase().includes(lowercased)); } return filtered.map(p => ({ ...p, variants: productVariants.filter(v => v.productId === p.id) })); }, [products, categories, selectedCategory, searchTerm, productVariants]); return ( <Card title="Catalogo Prodotti"> <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4"> <div className="flex gap-4 w-full md:w-auto"> <Input placeholder="Cerca prodotto, brand o codice..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-xs" /> <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="block w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-800" > <option value="all">Tutti i Prodotti</option> {salesCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)} </select> </div> <Button onClick={() => setPrintModalOpen(true)} variant="secondary"><Printer className="mr-2 h-4 w-4"/> Stampa Catalogo</Button> </div> <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"> {catalogProducts.map(product => { const minPrice = product.variants.length > 0 ? Math.min(...product.variants.map(v => v.salePrice)) : 0; const maxPrice = product.variants.length > 0 ? Math.max(...product.variants.map(v => v.salePrice)) : 0; const priceString = minPrice === maxPrice ? `€${minPrice.toFixed(2)}` : `€${minPrice.toFixed(2)} - €${maxPrice.toFixed(2)}`; return ( <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col group" > <div className="h-48 w-full bg-gray-100 dark:bg-gray-700 relative overflow-hidden"> {product.imageUrl ? ( <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> ) : ( <div className="flex items-center justify-center h-full text-gray-400"> <ImageIcon size={48} /> </div> )} <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-900/90 px-2 py-1 rounded text-xs font-bold shadow-sm"> {product.category} </div> {(product.additionalImages?.length || 0) > 0 && ( <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center"> <Layers size={10} className="mr-1"/> +{product.additionalImages!.length} </div> )} </div> <div className="p-4 flex-grow flex flex-col"> <div className="flex justify-between items-start mb-1"> {product.brand && <span className="text-xs font-bold text-gray-500 uppercase">{product.brand}</span>} {product.code && <span className="text-[10px] font-mono text-gray-400 border px-1 rounded">#{product.code}</span>} </div> <h3 className="font-bold text-lg mb-1 text-gray-800 dark:text-gray-100 truncate">{product.name}</h3> <p className="text-primary-600 font-semibold mt-auto">{product.variants.length > 0 ? priceString : 'Non disponibile'}</p> </div> </div> ); })} </div> {catalogProducts.length === 0 && ( <div className="text-center py-12 text-gray-500"> <PackageIcon size={48} className="mx-auto mb-4 opacity-30" /> <p>Nessun prodotto trovato nel catalogo.</p> <p className="text-sm">Assicurati di aver creato prodotti in categorie non marcate come "Componente".</p> </div> )} {selectedProduct && ( <ProductDetailCatalogModal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} product={selectedProduct} variants={productVariants.filter(v => v.productId === selectedProduct.id)} /> )} <PrintModal isOpen={isPrintModalOpen} onClose={() => setPrintModalOpen(false)} title="Anteprima di Stampa Catalogo" documentName={`catalogo_${new Date().toISOString().split('T')[0]}`}> <PrintableCatalog products={catalogProducts} companyInfo={settings.companyInfo} title={selectedCategory === 'all' ? 'Catalogo Generale' : `Catalogo ${selectedCategory}`} /> </PrintModal> </Card> ); };

interface ProductionTargetSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (variantId: string) => void;
    variants: ProductVariant[];
    products: Product[];
    categories: Category[];
}

const ProductionTargetSelectorModal: React.FC<ProductionTargetSelectorModalProps> = ({ isOpen, onClose, onSelect, variants, products, categories }) => {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedBrand, setSelectedBrand] = useState('all');

    // Extract unique brands from the available finished products
    const availableBrands = useMemo(() => {
        const brandSet = new Set<string>();
        variants.forEach(v => {
            const p = products.find(prod => prod.id === v.productId);
            if (p && p.brand) brandSet.add(p.brand);
        });
        return Array.from(brandSet).sort();
    }, [variants, products]);

    // Available categories (only those present in variants)
    const availableCategories = useMemo(() => {
         const catSet = new Set<string>();
         variants.forEach(v => {
             const p = products.find(prod => prod.id === v.productId);
             if (p && p.category) catSet.add(p.category);
         });
         return Array.from(catSet).sort();
    }, [variants, products]);

    const filteredVariants = useMemo(() => {
        return variants.filter(v => {
            const p = products.find(prod => prod.id === v.productId);
            if (!p) return false;

            // Filter by Category
            if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;

            // Filter by Brand
            if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;

            // Filter by Search (Name, Code, Variant Name)
            const searchLower = search.toLowerCase();
            return (
                p.name.toLowerCase().includes(searchLower) ||
                v.name.toLowerCase().includes(searchLower) ||
                (p.code && p.code.toLowerCase().includes(searchLower))
            );
        });
    }, [variants, products, search, selectedCategory, selectedBrand]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Seleziona Prodotto da Produrre">
            <div className="flex flex-col h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pb-4 border-b dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <Input placeholder="Cerca nome o codice..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-full" />
                    </div>
                    <div>
                        <select 
                            value={selectedCategory} 
                            onChange={e => setSelectedCategory(e.target.value)} 
                            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                        >
                            <option value="all">Tutte le Categorie</option>
                            {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <select 
                            value={selectedBrand} 
                            onChange={e => setSelectedBrand(e.target.value)} 
                            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                        >
                            <option value="all">Tutti i Brand</option>
                            {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Foto</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prodotto</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variante</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredVariants.map(v => {
                                const p = products.find(prod => prod.id === v.productId);
                                if (!p) return null;
                                return (
                                    <tr 
                                        key={v.id} 
                                        onClick={() => { onSelect(v.id); onClose(); }} 
                                        className="cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                    >
                                        <td className="px-4 py-2">
                                            {p.imageUrl ? (
                                                <img src={p.imageUrl} alt={p.name} className="h-10 w-10 object-cover rounded" />
                                            ) : (
                                                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400">
                                                    <ImageIcon size={20} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm font-medium">{p.name} <br/> <span className="text-xs text-gray-400">{p.category}</span></td>
                                        <td className="px-4 py-2 text-sm text-gray-500">{p.brand}</td>
                                        <td className="px-4 py-2 text-sm font-bold">{v.name}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredVariants.length === 0 && (
                        <div className="p-8 text-center text-gray-500">Nessun prodotto trovato con i filtri attuali.</div>
                    )}
                </div>
                <div className="pt-4 mt-4 border-t flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Chiudi</Button>
                </div>
            </div>
        </Modal>
    );
};

interface ProductionComponentSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (variantId: string) => void;
    variants: ProductVariant[];
    products: Product[];
    categories: Category[];
    inventoryBatches: InventoryBatch[];
}

const ProductionComponentSelectorModal: React.FC<ProductionComponentSelectorModalProps> = ({ isOpen, onClose, onSelect, variants, products, categories, inventoryBatches }) => {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedBrand, setSelectedBrand] = useState('all');

    // Extract unique brands
    const availableBrands = useMemo(() => {
        const brandSet = new Set<string>();
        variants.forEach(v => {
            const p = products.find(prod => prod.id === v.productId);
            if (p && p.brand) brandSet.add(p.brand);
        });
        return Array.from(brandSet).sort();
    }, [variants, products]);

    // Available categories
    const availableCategories = useMemo(() => {
         const catSet = new Set<string>();
         variants.forEach(v => {
             const p = products.find(prod => prod.id === v.productId);
             if (p && p.category) catSet.add(p.category);
         });
         return Array.from(catSet).sort();
    }, [variants, products]);

    // Helper to get available quantity
    const getAvailableQuantity = (variantId: string) => {
        return inventoryBatches
            .filter(b => b.variantId === variantId && b.status === 'available')
            .reduce((sum, b) => sum + b.currentQuantity, 0);
    };

    const filteredVariants = useMemo(() => {
        return variants.filter(v => {
            const p = products.find(prod => prod.id === v.productId);
            if (!p) return false;

            if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
            if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;

            const searchLower = search.toLowerCase();
            return (
                p.name.toLowerCase().includes(searchLower) ||
                v.name.toLowerCase().includes(searchLower) ||
                (p.code && p.code.toLowerCase().includes(searchLower))
            );
        });
    }, [variants, products, search, selectedCategory, selectedBrand]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Seleziona Ingrediente / Componente">
            <div className="flex flex-col h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pb-4 border-b dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <Input placeholder="Cerca ingrediente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-full" />
                    </div>
                    <div>
                        <select 
                            value={selectedCategory} 
                            onChange={e => setSelectedCategory(e.target.value)} 
                            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                        >
                            <option value="all">Tutte le Categorie</option>
                            {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <select 
                            value={selectedBrand} 
                            onChange={e => setSelectedBrand(e.target.value)} 
                            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                        >
                            <option value="all">Tutti i Brand</option>
                            {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Foto</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Componente</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variante</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Disponibilità</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredVariants.map(v => {
                                const p = products.find(prod => prod.id === v.productId);
                                if (!p) return null;
                                const stock = getAvailableQuantity(v.id);
                                return (
                                    <tr 
                                        key={v.id} 
                                        onClick={() => { onSelect(v.id); onClose(); }} 
                                        className="cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                    >
                                        <td className="px-4 py-2">
                                            {p.imageUrl ? (
                                                <img src={p.imageUrl} alt={p.name} className="h-10 w-10 object-cover rounded" />
                                            ) : (
                                                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400">
                                                    <ImageIcon size={20} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm font-medium">{p.name} <br/> <span className="text-xs text-gray-400">{p.category}</span></td>
                                        <td className="px-4 py-2 text-sm text-gray-500">{p.brand}</td>
                                        <td className="px-4 py-2 text-sm font-bold">{v.name}</td>
                                        <td className="px-4 py-2 text-sm font-bold text-green-600">{stock} {p.unit}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredVariants.length === 0 && (
                        <div className="p-8 text-center text-gray-500">Nessun componente trovato con i filtri attuali.</div>
                    )}
                </div>
                <div className="pt-4 mt-4 border-t flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Chiudi</Button>
                </div>
            </div>
        </Modal>
    );
};

const ProductionView: React.FC = () => { const { state, settings, dispatch } = useAppContext(); const { products, productVariants, categories, inventoryBatches } = state[settings.currentYear]; const [isProductSelectorOpen, setProductSelectorOpen] = useState(false); const [isTargetSelectorOpen, setTargetSelectorOpen] = useState(false); const [isComponentSelectorOpen, setComponentSelectorOpen] = useState(false); const [activeComponentIndex, setActiveComponentIndex] = useState<number | null>(null); const [formData, setFormData] = useState<{ date: string; finishedProductId: string; quantityProduced: number; macerationDays: number; components: { variantId: string; quantityUsed: number; weightInGrams?: number }[]; productionType: 'finished_sale' | 'bulk_refill'; colorCode: string; colorDrops: number; enableColor: boolean; targetPercentage: number; skipMaceration: boolean; }>({ date: new Date().toISOString().split('T')[0], finishedProductId: '', quantityProduced: 1, macerationDays: 30, components: [{ variantId: '', quantityUsed: 1, weightInGrams: undefined }], productionType: 'finished_sale', colorCode: '#ffffff', colorDrops: 0, enableColor: false, targetPercentage: 20, skipMaceration: false }); const useVariantAvailableQuantity = useCallback((variantId: string) => { return inventoryBatches .filter(b => b.variantId === variantId && b.status === 'available') .reduce((sum, b) => sum + b.currentQuantity, 0); }, [inventoryBatches]); const getVariantDisplayName = (variant: ProductVariant) => { const product = products.find(p => p.id === variant.productId); return `${product?.name || 'Prodotto Sconosciuto'} - ${variant.name}`; }; const getProductUnit = (variantId: string) => { const variant = productVariants.find(v => v.id === variantId); const product = products.find(p => p.id === variant?.productId); return product?.unit || 'pz'; }; 

// Updated Logic for finished goods
const finishedGoodVariants = useMemo(() => { 
    const finishedCategoryNames = categories.filter(c => {
        if (c.isFinishedProduct !== undefined) return c.isFinishedProduct;
        return !c.isComponent;
    }).map(c => c.name);
    
    const finishedProductIds = products.filter(p => finishedCategoryNames.includes(p.category)).map(p => p.id);
    return productVariants.filter(v => finishedProductIds.includes(v.productId)); 
}, [products, productVariants, categories]); 

// Updated Logic for components
const availableComponents = useMemo(() => { 
    return productVariants.filter(v => {
        const product = products.find(p => p.id === v.productId);
        if (!product) return false;
        
        const category = categories.find(c => c.name === product.category);
        if (!category || !category.isComponent) return false;

        return useVariantAvailableQuantity(v.id) > 0;
    }); 
}, [productVariants, products, categories, useVariantAvailableQuantity]); 

const selectedVariantForProduction = productVariants.find(v => v.id === formData.finishedProductId);
const selectedProductForProduction = products.find(p => p.id === selectedVariantForProduction?.productId);


const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const { name, value, type } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value })); }; const handleAddComponent = () => { setFormData(prev => ({ ...prev, components: [...prev.components, { variantId: '', quantityUsed: 1 }] })); }; const handleBulkSelectComponents = (variantIds: string[]) => { const newComponents = variantIds.map(vid => ({ variantId: vid, quantityUsed: 1, weightInGrams: undefined })); setFormData(prev => ({ ...prev, components: [...prev.components, ...newComponents] })); }; const handleRemoveComponent = (index: number) => { setFormData(prev => ({ ...prev, components: prev.components.filter((_, i) => i !== index) })); }; const handleComponentChange = (index: number, field: 'variantId' | 'quantityUsed' | 'weightInGrams', value: string | number) => { const newComponents = [...formData.components]; newComponents[index] = { ...newComponents[index], [field]: value }; setFormData(prev => ({ ...prev, components: newComponents })); }; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!formData.finishedProductId || formData.quantityProduced <= 0 || formData.components.length === 0 || formData.components.some(c => !c.variantId || c.quantityUsed <= 0)) { alert("Compila tutti i campi obbligatori: prodotto finito, quantità e componenti."); return; } dispatch({ type: 'ADD_PRODUCTION', payload: { ...formData, macerationDays: formData.skipMaceration ? 0 : formData.macerationDays, colorCode: formData.enableColor ? formData.colorCode : undefined, colorDrops: formData.enableColor ? formData.colorDrops : undefined, enableColor: undefined, skipMaceration: undefined } as any }); alert("Produzione registrata con successo!"); setFormData({ date: formData.date, finishedProductId: '', quantityProduced: 1, macerationDays: 30, components: [{ variantId: '', quantityUsed: 1, weightInGrams: undefined }], productionType: 'finished_sale', colorCode: '#ffffff', colorDrops: 0, enableColor: false, targetPercentage: 20, skipMaceration: false }); };

const suggestedEssence = (formData.quantityProduced * (formData.targetPercentage / 100));
const suggestedAlcohol = formData.quantityProduced - suggestedEssence;

return ( <Card title="Registra Nuova Produzione"> <form onSubmit={handleSubmit} className="space-y-8"> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> <div className="space-y-2"> <label className="block text-sm font-medium">Data Produzione</label> <Input name="date" type="date" value={formData.date} onChange={handleFormChange} required /> </div> <div className="space-y-2"> <label className="block text-sm font-medium">Tipo Produzione</label> <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1"> <button type="button" onClick={() => setFormData(p => ({...p, productionType: 'finished_sale'}))} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${formData.productionType === 'finished_sale' ? 'bg-white dark:bg-gray-600 shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`} > <PackageIcon className="inline mr-1 h-4 w-4" /> Prodotto Finito (Vendita) </button> <button type="button" onClick={() => setFormData(p => ({...p, productionType: 'bulk_refill'}))} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${formData.productionType === 'bulk_refill' ? 'bg-white dark:bg-gray-600 shadow text-amber-600' : 'text-gray-500 hover:text-gray-700'}`} > <Beaker className="inline mr-1 h-4 w-4" /> Semilavorato (Sfuso) </button> </div> <p className="text-xs text-gray-500 mt-1"> {formData.productionType === 'finished_sale' ? 'Es: Bottiglia 50ml pronta per lo scaffale.' : 'Es: Tanica da 2 litri per riempimenti futuri.'} </p> </div> <div className="space-y-2"> <label className="block text-sm font-medium">Articolo da Produrre</label> <div className="flex gap-2"> <div className="flex-1 p-2 border rounded dark:bg-gray-800 dark:border-gray-600 text-sm flex items-center bg-gray-50 dark:bg-gray-900/50"> {selectedVariantForProduction ? ( <span className="font-medium text-gray-900 dark:text-gray-100"> {getVariantDisplayName(selectedVariantForProduction)} </span> ) : ( <span className="text-gray-400 italic">Nessun prodotto selezionato</span> )} </div> <Button type="button" variant="secondary" onClick={() => setTargetSelectorOpen(true)} title="Cerca e Seleziona Prodotto"> <Search size={18} /> </Button> </div> </div> <div className="space-y-2"> <label className="block text-sm font-medium">Quantità Prodotta</label> <div className="flex items-center"> <Input name="quantityProduced" type="number" min="1" value={formData.quantityProduced} onChange={handleFormChange} required className="rounded-r-none" /> <span className="bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 px-3 py-2 rounded-r-md text-gray-500"> {formData.finishedProductId ? getProductUnit(formData.finishedProductId) : 'unità'} </span> </div> </div> <div className="space-y-2"> <label className="block text-sm font-medium">Concentrazione (%)</label> <div className="flex items-center">
                            <Input name="targetPercentage" type="number" min="0" max="100" step="0.1" value={formData.targetPercentage} onChange={handleFormChange} required className="rounded-r-md" />
                            <span className="bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 px-3 py-2 rounded-r-md text-gray-500">%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Concentrazione finale desiderata (es. 20% per Eau de Parfum).</p>
                    </div>

                    <div className="space-y-2">
                         <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={formData.enableColor} onChange={e => setFormData(p => ({...p, enableColor: e.target.checked}))} className="rounded text-primary-600 focus:ring-primary-500" />
                            <span className="text-sm font-medium">Aggiungi Colorante</span>
                        </label>
                        {formData.enableColor && (
                            <div className="flex gap-4 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                                <div>
                                    <label className="block text-xs mb-1">Colore</label>
                                    <input type="color" name="colorCode" value={formData.colorCode} onChange={handleFormChange} className="h-8 w-16" />
                                </div>
                                <div>
                                    <label className="block text-xs mb-1">Gocce</label>
                                    <Input name="colorDrops" type="number" min="1" value={formData.colorDrops} onChange={handleFormChange} className="w-20" />
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="space-y-2">
                         <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={formData.skipMaceration} onChange={e => setFormData(p => ({...p, skipMaceration: e.target.checked}))} className="rounded text-primary-600 focus:ring-primary-500" />
                            <span className="text-sm font-medium">Salta Macerazione (Disponibile Subito)</span>
                        </label>
                        {!formData.skipMaceration && (
                            <div className="mt-2">
                                <label className="block text-sm font-medium">Giorni Macerazione</label>
                                <Input name="macerationDays" type="number" min="0" value={formData.macerationDays} onChange={handleFormChange} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4 border-t pt-4 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                         <h4 className="font-semibold text-lg">Componenti / Ingredienti</h4>
                         <div className="space-x-2">
                             <Button type="button" variant="secondary" onClick={handleAddComponent}><Plus size={16} className="mr-2"/> Aggiungi Riga</Button>
                             <Button type="button" variant="secondary" onClick={() => setComponentSelectorOpen(true)}><ListTree size={16} className="mr-2"/> Seleziona</Button>
                         </div>
                    </div>
                    
                    <div className="space-y-2">
                        {formData.components.map((comp, idx) => {
                             const variant = productVariants.find(v => v.id === comp.variantId);
                             const available = variant ? useVariantAvailableQuantity(variant.id) : 0;
                             const unit = variant ? getProductUnit(variant.id) : '';

                             return (
                                <div key={idx} className="flex flex-col md:flex-row gap-4 items-end p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                                    <div className="flex-1 w-full">
                                        <label className="text-xs text-gray-500 mb-1 block">Ingrediente</label>
                                        <select 
                                            value={comp.variantId} 
                                            onChange={e => handleComponentChange(idx, 'variantId', e.target.value)}
                                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                                        >
                                            <option value="">Seleziona...</option>
                                            {availableComponents.map(v => (
                                                <option key={v.id} value={v.id}>
                                                    {getVariantDisplayName(v)} (Disp: {useVariantAvailableQuantity(v.id)} {getProductUnit(v.id)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-32">
                                        <label className="text-xs text-gray-500 mb-1 block">Qtà Utilizzata ({unit})</label>
                                        <Input 
                                            type="number" 
                                            step="0.001" 
                                            value={comp.quantityUsed} 
                                            onChange={e => handleComponentChange(idx, 'quantityUsed', parseFloat(e.target.value))} 
                                        />
                                    </div>
                                    {unit === 'ml' || unit === 'l' ? (
                                         <div className="w-32">
                                            <label className="text-xs text-gray-500 mb-1 block">Peso (g) [Opz.]</label>
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                value={comp.weightInGrams || ''} 
                                                onChange={e => handleComponentChange(idx, 'weightInGrams', parseFloat(e.target.value))} 
                                                placeholder="g"
                                            />
                                        </div>
                                    ) : null}
                                    <Button type="button" variant="danger" onClick={() => handleRemoveComponent(idx)}><Trash2 size={16}/></Button>
                                </div>
                             );
                        })}
                    </div>
                    {formData.components.length === 0 && <p className="text-gray-500 italic text-center py-4">Nessun componente aggiunto.</p>}
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" size="lg">Avvia Produzione</Button>
                </div>
            </form>

            <ProductionTargetSelectorModal 
                isOpen={isTargetSelectorOpen} 
                onClose={() => setTargetSelectorOpen(false)} 
                onSelect={(vid) => setFormData(p => ({...p, finishedProductId: vid}))} 
                variants={finishedGoodVariants} 
                products={products} 
                categories={categories}
            />
            
            <ProductionComponentSelectorModal
                isOpen={isComponentSelectorOpen}
                onClose={() => setComponentSelectorOpen(false)}
                onSelect={(vid) => handleBulkSelectComponents([vid])}
                variants={availableComponents}
                products={products}
                categories={categories}
                inventoryBatches={inventoryBatches}
            />
        </Card>
    );
};

export const PartnerManagementModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { state, dispatch } = useAppContext();
    const [name, setName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            const partner = state.partners.find(p => p.id === editingId);
            if (partner) dispatch({ type: 'UPDATE_PARTNER', payload: { ...partner, name } });
        } else {
            dispatch({ type: 'ADD_PARTNER', payload: { name } });
        }
        setName('');
        setEditingId(null);
    };

    const handleEdit = (partner: Partner) => {
        setName(partner.name);
        setEditingId(partner.id);
    };

    const handleDelete = (id: string) => {
        if (confirm('Sei sicuro?')) dispatch({ type: 'DELETE_PARTNER', payload: id });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gestione Soci">
            <div className="space-y-4">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome Socio" required />
                    <Button type="submit">{editingId ? 'Salva' : 'Aggiungi'}</Button>
                    {editingId && <Button type="button" variant="secondary" onClick={() => { setName(''); setEditingId(null); }}>Annulla</Button>}
                </form>
                <Table headers={['Nome', 'Azioni']}>
                    {state.partners.map(p => (
                        <tr key={p.id}>
                            <td className="px-6 py-4">{p.name}</td>
                            <td className="px-6 py-4 space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}><Edit size={16}/></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-red-500"><Trash2 size={16}/></Button>
                            </td>
                        </tr>
                    ))}
                </Table>
                <div className="flex justify-end pt-4"><Button variant="secondary" onClick={onClose}>Chiudi</Button></div>
            </div>
        </Modal>
    );
};

// --- PLACEHOLDER VIEWS TO FIX COMPILATION AND PROVIDE FUNCTIONALITY ---

const GenericCrudView = <T extends { id: string, name: string } & Record<string, any>>({ 
    title, 
    items, 
    onAdd, 
    onUpdate, 
    onDelete, 
    fields,
    renderRow 
}: { 
    title: string, 
    items: T[], 
    onAdd: (item: Omit<T, 'id'>) => void, 
    onUpdate: (item: T) => void, 
    onDelete: (id: string) => void,
    fields: { name: keyof T, label: string }[],
    renderRow?: (item: T) => React.ReactNode
}) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<T | null>(null);
    const [formData, setFormData] = useState<any>({});

    const openAdd = () => { setEditingItem(null); setFormData({}); setModalOpen(true); };
    const openEdit = (item: T) => { setEditingItem(item); setFormData(item); setModalOpen(true); };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) onUpdate({ ...formData, id: editingItem.id });
        else onAdd(formData);
        setModalOpen(false);
    };

    return (
        <Card title={title}>
            <div className="flex justify-end mb-4"><Button onClick={openAdd}><PlusCircle className="mr-2" size={16}/> Aggiungi</Button></div>
            <Table headers={[...fields.map(f => f.label), "Azioni"]}>
                {items.map(item => (
                    <tr key={item.id}>
                        {renderRow ? renderRow(item) : fields.map(f => <td key={String(f.name)} className="px-6 py-4">{item[f.name]}</td>)}
                        <td className="px-6 py-4 space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Edit size={16}/></Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if(confirm("Sicuro?")) onDelete(item.id) }}><Trash2 size={16}/></Button>
                        </td>
                    </tr>
                ))}
            </Table>
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingItem ? "Modifica" : "Aggiungi"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {fields.map(f => (
                         <Input key={String(f.name)} label={f.label} value={formData[f.name] || ''} onChange={e => setFormData({...formData, [f.name]: e.target.value})} required={f.name === 'name'} />
                    ))}
                    <div className="flex justify-end pt-4"><Button type="submit">Salva</Button></div>
                </form>
            </Modal>
        </Card>
    );
};

const CustomersView: React.FC = () => {
    const { state, settings, dispatch } = useAppContext();
    return <GenericCrudView 
        title="Clienti" 
        items={state[settings.currentYear].customers} 
        onAdd={c => dispatch({ type: 'ADD_CUSTOMER', payload: c as any })} 
        onUpdate={c => dispatch({ type: 'UPDATE_CUSTOMER', payload: c })} 
        onDelete={id => dispatch({ type: 'DELETE_CUSTOMER', payload: id })} 
        fields={[
            { name: 'name', label: 'Nome' }, { name: 'email', label: 'Email' }, { name: 'phone', label: 'Telefono' },
            { name: 'city', label: 'Città' }, { name: 'vatNumber', label: 'P.IVA/CF' }
        ]}
    />;
};

const SuppliersView: React.FC = () => {
    const { state, settings, dispatch } = useAppContext();
    return <GenericCrudView 
        title="Fornitori" 
        items={state[settings.currentYear].suppliers} 
        onAdd={s => dispatch({ type: 'ADD_SUPPLIER', payload: s as any })} 
        onUpdate={s => dispatch({ type: 'UPDATE_SUPPLIER', payload: s })} 
        onDelete={id => dispatch({ type: 'DELETE_SUPPLIER', payload: id })} 
        fields={[
            { name: 'name', label: 'Nome' }, { name: 'email', label: 'Email' }, { name: 'phone', label: 'Telefono' },
            { name: 'city', label: 'Città' }, { name: 'vatNumber', label: 'P.IVA' }
        ]}
    />;
};

const AgentsView: React.FC = () => {
    const { state, settings, dispatch } = useAppContext();
    return <GenericCrudView 
        title="Agenti" 
        items={state[settings.currentYear].agents} 
        onAdd={a => dispatch({ type: 'ADD_AGENT', payload: a as any })} 
        onUpdate={a => dispatch({ type: 'UPDATE_AGENT', payload: a })} 
        onDelete={id => dispatch({ type: 'DELETE_AGENT', payload: id })} 
        fields={[{ name: 'name', label: 'Nome' }, { name: 'city', label: 'Zona/Città' }, { name: 'phone', label: 'Telefono' }]}
        renderRow={(agent) => (
            <>
                <td className="px-6 py-4">{agent.name}</td>
                <td className="px-6 py-4">{agent.city}</td>
                <td className="px-6 py-4">{agent.phone}</td>
                <td className="px-6 py-4">{agent.associatedClients} Clienti</td>
            </>
        )}
    />;
};

const StockLoadHistoryView: React.FC = () => {
    const { state, settings, dispatch } = useAppContext();
    const yearData = state[settings.currentYear];
    const [viewLoad, setViewLoad] = useState<StockLoad | null>(null);
    const [editLoad, setEditLoad] = useState<StockLoad | null>(null);
    const [printLoad, setPrintLoad] = useState<StockLoad | null>(null);

    const getSupplierName = (id?: string) => yearData.suppliers.find(s => s.id === id)?.name || 'Deposito/Interno';
    
    // Preparation for PrintableStockLoad
    const allVariants = useMemo(() => {
        return yearData.productVariants.map(variant => {
            const product = yearData.products.find(p => p.id === variant.productId);
            return { ...variant, productName: product?.name || 'N/A' };
        });
    }, [yearData]);

    const sortedStockLoads = useMemo(() => {
        return [...yearData.stockLoads].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [yearData.stockLoads]);

    return (
        <Card title="Storico Carichi">
            <Table headers={["Data", "Fornitore", "Totale", "Azioni"]}>
                {sortedStockLoads.map(sl => (
                    <tr key={sl.id}>
                        <td className="px-6 py-4">{new Date(sl.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">{getSupplierName(sl.supplierId)}</td>
                        <td className="px-6 py-4">€{sl.total.toFixed(2)}</td>
                        <td className="px-6 py-4 space-x-2">
                             <Button variant="ghost" size="sm" onClick={() => setViewLoad(sl)}><Eye size={16}/></Button>
                             <Button variant="ghost" size="sm" onClick={() => setEditLoad(sl)}><Edit size={16}/></Button>
                             <Button variant="ghost" size="sm" onClick={() => setPrintLoad(sl)}><Printer size={16}/></Button>
                             <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if(confirm("Eliminare?")) dispatch({type: 'DELETE_STOCK_LOAD', payload: sl.id}) }}><Trash2 size={16}/></Button>
                        </td>
                    </tr>
                ))}
            </Table>
            <StockLoadDetailModal isOpen={!!viewLoad} onClose={() => setViewLoad(null)} load={viewLoad} />
            <EditStockLoadModal isOpen={!!editLoad} onClose={() => setEditLoad(null)} load={editLoad} />
             {printLoad && (
                <PrintModal isOpen={!!printLoad} onClose={() => setPrintLoad(null)} title="Stampa Carico" documentName={`carico_${printLoad.id}`}>
                    <PrintableStockLoad 
                        load={printLoad} 
                        supplier={yearData.suppliers.find(s => s.id === printLoad.supplierId)} 
                        allVariants={allVariants}
                        companyInfo={settings.companyInfo}
                    />
                </PrintModal>
            )}
        </Card>
    );
};

const ProductionHistoryView: React.FC = () => {
    const { state, settings, dispatch } = useAppContext();
    const yearData = state[settings.currentYear];
    
    const getProductName = (variantId: string) => {
        const variant = yearData.productVariants.find(v => v.id === variantId);
        const product = yearData.products.find(p => p.id === variant?.productId);
        return product ? `${product.name} ${variant?.name}` : 'Sconosciuto';
    };

    return (
        <Card title="Storico Produzione">
            <Table headers={["Lotto", "Data", "Prodotto Finito", "Qtà", "Scadenza", "Azioni"]}>
                {yearData.productions.map(prod => (
                    <tr key={prod.id}>
                        <td className="px-6 py-4 font-mono text-xs">{prod.batchNumber}</td>
                        <td className="px-6 py-4">{new Date(prod.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">{getProductName(prod.finishedProductId)}</td>
                        <td className="px-6 py-4">{prod.quantityProduced}</td>
                        <td className="px-6 py-4">{new Date(prod.expirationDate).toLocaleDateString()}</td>
                         <td className="px-6 py-4">
                             <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if(confirm("Annullare produzione? Le quantità verranno ripristinate.")) dispatch({type: 'DELETE_PRODUCTION', payload: prod.id}) }}><Trash2 size={16}/></Button>
                        </td>
                    </tr>
                ))}
            </Table>
        </Card>
    );
};

const CellarView: React.FC = () => {
    const { state, settings, dispatch } = useAppContext();
    const yearData = state[settings.currentYear];
    const maceratingBatches = yearData.inventoryBatches.filter(b => b.status === 'macerating');

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Cantina</h2>
                <p className="text-gray-500">Qui puoi monitorare i lotti in fase di macerazione. Quando un profumo è pronto, clicca su "Termina Macerazione" per renderlo disponibile alla vendita (imbottigliamento).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {maceratingBatches.map(batch => {
                    const variant = yearData.productVariants.find(v => v.id === batch.variantId);
                    const product = yearData.products.find(p => p.id === variant?.productId);
                    const endDate = batch.macerationEndDate ? new Date(batch.macerationEndDate) : new Date();
                    const today = new Date();
                    const diffTime = endDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isReady = diffDays <= 0;

                    return (
                        <div key={batch.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col relative">
                            <div className="absolute top-6 right-6 text-amber-500">
                                <Wine size={24} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5 pr-8">{product?.name || 'Sconosciuto'}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{variant?.name || '-'}</p>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Lotto:</span>
                                    <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{batch.batchNumber}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Quantità:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{batch.currentQuantity}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Fine Macerazione:</span>
                                    <span className="text-gray-700 dark:text-gray-300">{endDate.toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-2 border-t dark:border-gray-700">
                                    <span className="text-gray-500">Stato:</span>
                                    <span className={`font-bold flex items-center ${isReady ? 'text-green-600' : 'text-amber-600'}`}>
                                        <Clock size={14} className="mr-1" />
                                        {isReady ? 'PRONTO' : `${diffDays} giorni`} 
                                        {!isReady ? `-${diffDays} giorni` : ''}
                                    </span>
                                </div>
                            </div>

                            <button 
                                onClick={() => dispatch({type: 'COMPLETE_MACERATION', payload: batch.id})}
                                className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded transition-colors mt-auto"
                            >
                                Forza Fine Macerazione
                            </button>
                        </div>
                    );
                })}
            </div>
            {maceratingBatches.length === 0 && (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed dark:border-gray-700">
                    <Wine size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Nessun prodotto in macerazione al momento.</p>
                </div>
            )}
        </div>
    );
};

interface PrintableCompletePartnerReportProps {
    stats: any[];
    totalSystemBalance: number;
    settlementPlan: any[];
    partners: Partner[];
    ledgerEntries: PartnerLedgerEntry[];
    companyInfo: CompanyInfo;
}

const PrintableCompletePartnerReport: React.FC<PrintableCompletePartnerReportProps> = ({ stats, totalSystemBalance, settlementPlan, partners, ledgerEntries, companyInfo }) => {
    return (
        <div className="font-sans text-sm p-8">
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800 mb-6">
                <div>
                     <h1 className="text-2xl font-bold">{companyInfo.name}</h1>
                     <p>Report Soci e Contabilità</p>
                </div>
                <div className="text-right">
                    <p>Data: <strong>{new Date().toLocaleDateString()}</strong></p>
                </div>
            </header>

            <section className="mb-8">
                <h3 className="font-bold text-lg mb-4">Riepilogo Saldi Soci</h3>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">Socio</th>
                            <th className="p-2 border text-right">Incassato (+)</th>
                            <th className="p-2 border text-right">Speso (-)</th>
                            <th className="p-2 border text-right">Saldo Attuale</th>
                            <th className="p-2 border text-center">Stato</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map(s => (
                            <tr key={s.id} className="border-b">
                                <td className="p-2 border">{s.name}</td>
                                <td className="p-2 border text-right text-green-600">€{s.in.toFixed(2)}</td>
                                <td className="p-2 border text-right text-red-600">€{Math.abs(s.out).toFixed(2)}</td>
                                <td className="p-2 border text-right font-bold">€{s.balance.toFixed(2)}</td>
                                <td className="p-2 border text-center">
                                    {s.status === 'debtor' ? 'Deve Versare' : s.status === 'creditor' ? 'Deve Ricevere' : 'In Pari'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-4 text-right">
                    <p>Totale Sistema: <strong>€{totalSystemBalance.toFixed(2)}</strong></p>
                    <p>Target per Socio: <strong>€{(totalSystemBalance / partners.length).toFixed(2)}</strong></p>
                </div>
            </section>

             <section>
                <h3 className="font-bold text-lg mb-4">Piano di Pareggio (Dare/Avere)</h3>
                {settlementPlan.length > 0 ? (
                    <ul className="list-disc pl-5">
                        {settlementPlan.map((s, idx) => (
                            <li key={idx} className="mb-2">
                                <strong>{s.fromName}</strong> versa a <strong>{s.toName}</strong>: €{s.amount.toFixed(2)}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Nessun pareggio necessario.</p>
                )}
            </section>

            <div style={{ pageBreakBefore: 'always' }}>
              <h3 className="font-bold text-lg mb-4">Dettaglio Movimenti per Socio</h3>
                {partners.map(partner => {
                    const partnerEntries = ledgerEntries.filter(e => e.partnerId === partner.id);
                    return (
                        <section key={partner.id} className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                            <h4 className="font-bold text-md mb-2 border-b pb-2">{partner.name}</h4>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr>
                                        <th className="p-1 border text-left">Data</th>
                                        <th className="p-1 border text-left">Descrizione</th>
                                        <th className="p-1 border text-right">Importo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {partnerEntries.map(entry => (
                                        <tr key={entry.id}>
                                            <td className="p-1 border">{new Date(entry.date).toLocaleDateString()}</td>
                                            <td className="p-1 border">{entry.description}</td>
                                            <td className={`p-1 border text-right font-mono ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {entry.amount >= 0 ? '+' : ''}€{entry.amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    );
                })}
            </div>
        </div>
    );
};

const PartnerDetailModal: React.FC<{ isOpen: boolean, onClose: () => void, partner: any, entries: PartnerLedgerEntry[] }> = ({ isOpen, onClose, partner, entries }) => {
    if (!partner) return null;

    // Sort by date desc
    const sortedEntries = [...entries].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const incomings = sortedEntries.filter(e => e.amount > 0);
    const outgoings = sortedEntries.filter(e => e.amount < 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Dettaglio: ${partner.name}`}>
            {/* Summary Header */}
            <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-center">
                <span className="font-bold">Saldo Attuale:</span>
                <span className={`text-xl font-bold ${partner.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    €{partner.balance.toFixed(2)}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                {/* Column 1: Entrate */}
                <div className="border rounded-lg p-2 bg-green-50 dark:bg-green-900/10 border-green-200">
                    <h4 className="font-bold text-green-700 mb-2 border-b border-green-200 pb-1 sticky top-0 bg-green-50 dark:bg-transparent flex items-center"><ArrowUpCircle size={16} className="mr-1"/> Entrate (Incassi)</h4>
                    <ul className="space-y-2 text-sm">
                        {incomings.map(e => (
                            <li key={e.id} className="flex justify-between items-start border-b border-green-100 last:border-0 pb-1">
                                <div>
                                    <span className="block text-xs text-gray-500">{new Date(e.date).toLocaleDateString()}</span>
                                    <span className="block text-gray-700 dark:text-gray-300">{e.description}</span>
                                </div>
                                <span className="font-bold text-green-600">+€{e.amount.toFixed(2)}</span>
                            </li>
                        ))}
                        {incomings.length === 0 && <li className="text-gray-400 italic text-xs">Nessuna entrata</li>}
                    </ul>
                </div>

                {/* Column 2: Uscite */}
                <div className="border rounded-lg p-2 bg-red-50 dark:bg-red-900/10 border-red-200">
                    <h4 className="font-bold text-red-700 mb-2 border-b border-red-200 pb-1 sticky top-0 bg-red-50 dark:bg-transparent flex items-center"><ArrowDownCircle size={16} className="mr-1"/> Uscite (Spese/Prelievi)</h4>
                     <ul className="space-y-2 text-sm">
                        {outgoings.map(e => (
                            <li key={e.id} className="flex justify-between items-start border-b border-red-100 last:border-0 pb-1">
                                <div>
                                    <span className="block text-xs text-gray-500">{new Date(e.date).toLocaleDateString()}</span>
                                    <span className="block text-gray-700 dark:text-gray-300">{e.description}</span>
                                </div>
                                <span className="font-bold text-red-600">€{Math.abs(e.amount).toFixed(2)}</span>
                            </li>
                        ))}
                        {outgoings.length === 0 && <li className="text-gray-400 italic text-xs">Nessuna uscita</li>}
                    </ul>
                </div>
            </div>
            <div className="flex justify-end pt-4">
                <Button variant="secondary" onClick={onClose}>Chiudi</Button>
            </div>
        </Modal>
    );
}

const EditSettlementPaymentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    settlement: PartnerSettlement | null
}> = ({ isOpen, onClose, settlement }) => {
    const { dispatch } = useAppContext();
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');

    useEffect(() => {
        if (settlement?.payment) {
            setAmount(settlement.payment.amount);
            setDate(settlement.payment.date);
            setPaymentMethod(settlement.payment.paymentMethod || '');
        }
    }, [settlement]);

    if (!settlement) return null;

    const handleSave = () => {
        if (amount <= 0) return alert("Inserisci un importo valido.");

        dispatch({
            type: 'UPDATE_SETTLEMENT',
            payload: {
                settlementId: settlement.id,
                updatedPayment: {
                    ...settlement.payment!,
                    amount,
                    date,
                    paymentMethod,
                }
            }
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Modifica Pagamento Chiusura">
            <div className="space-y-4">
                 <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                    <div className="text-center flex-1">
                        <p className="font-bold text-gray-800 dark:text-gray-200">{settlement.payment?.fromPartnerName}</p>
                    </div>
                    <ArrowRight className="text-gray-400 mx-2" />
                    <div className="text-center flex-1">
                        <p className="font-bold text-gray-800 dark:text-gray-200">{settlement.payment?.toPartnerName}</p>
                    </div>
                </div>
                <Input type="number" label="Importo Versato" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} step="0.01" />
                <Input type="date" label="Data Pagamento" value={date} onChange={e => setDate(e.target.value)} />
                <Input
                    label="Modalità di Pagamento"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    placeholder="Es. Bonifico, Contanti..."
                />
                <div className="flex justify-end pt-4 space-x-2">
                    <Button variant="secondary" onClick={onClose}>Annulla</Button>
                    <Button onClick={handleSave}>Salva Modifiche</Button>
                </div>
            </div>
        </Modal>
    );
};

const PartnerSettlementHistoryModal: React.FC<{ isOpen: boolean, onClose: () => void, settlements: PartnerSettlement[] }> = ({ isOpen, onClose, settlements }) => {
    const { state, settings, dispatch } = useAppContext();
    const yearData = state[settings.currentYear];
    const [selectedSettlement, setSelectedSettlement] = useState<PartnerSettlement | null>(null);
    const [editingSettlement, setEditingSettlement] = useState<PartnerSettlement | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deletingSettlementId, setDeletingSettlementId] = useState<string | null>(null);

    const sortedSettlements = useMemo(() => {
        return [...settlements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [settlements]);


    const handleViewDetails = (settlement: PartnerSettlement) => {
        setSelectedSettlement(settlement);
    };

    const handleDelete = (settlementId: string) => {
        setDeletingSettlementId(settlementId);
        setIsConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (deletingSettlementId) {
            dispatch({ type: 'DELETE_SETTLEMENT', payload: { settlementId: deletingSettlementId } });
        }
        setIsConfirmOpen(false);
        setDeletingSettlementId(null);
    };

    const DetailsView = () => {
        if (!selectedSettlement) return null;
        return (
            <Modal isOpen={!!selectedSettlement} onClose={() => setSelectedSettlement(null)} title={`Dettaglio Chiusura del ${new Date(selectedSettlement.date).toLocaleDateString()}`}>
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h4 className="font-semibold mb-2">Riepilogo Pagamento</h4>
                        <div className="text-sm space-y-1">
                            <p><strong>Importo:</strong> €{selectedSettlement.payment?.amount.toFixed(2)}</p>
                            <p><strong>Metodo:</strong> {selectedSettlement.payment?.paymentMethod || 'Non specificato'}</p>
                            <p><strong>Da:</strong> {selectedSettlement.payment?.fromPartnerName}</p>
                            <p><strong>A:</strong> {selectedSettlement.payment?.toPartnerName}</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Saldi dei Soci (Prima del Pagamento)</h4>
                        <Table headers={["Socio", "Saldo", "Stato"]}>
                            {selectedSettlement.partnerSnapshots.map(snap => (
                                <tr key={snap.partnerId}>
                                    <td className="px-6 py-4">{snap.partnerName}</td>
                                    <td className={`px-6 py-4 font-bold ${snap.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        €{snap.balance.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">{snap.status}</td>
                                </tr>
                            ))}
                        </Table>
                    </div>
                </div>
            </Modal>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Storico Chiusure e Pareggi">
            <div className="max-h-[60vh] overflow-y-auto">
                {sortedSettlements.map((settlement, idx) => (
                    <div key={settlement.id} className="p-4 mb-2 border rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-bold">{new Date(settlement.date).toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="text-sm text-gray-500">
                                Pagamento di €{settlement.payment?.amount.toFixed(2)} da {settlement.payment?.fromPartnerName} a {settlement.payment?.toPartnerName}
                            </p>
                            <p className="text-xs text-gray-400">Metodo: {settlement.payment?.paymentMethod || 'N/D'}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="secondary" onClick={() => handleViewDetails(settlement)}>Vedi Dettagli</Button>
                           <Button variant="ghost" onClick={() => setEditingSettlement(settlement)}><Edit size={16}/></Button>
                          <Button
                            variant="danger"
                            onClick={() => handleDelete(settlement.id)}
                          >
                            Elimina
                          </Button>
                        </div>
                    </div>
                ))}
                {sortedSettlements.length === 0 && (
                    <div className="text-center p-8 text-gray-500 italic">
                        Nessuna chiusura archiviata.
                    </div>
                )}
            </div>
            <div className="flex justify-end pt-4">
                <Button variant="secondary" onClick={onClose}>Chiudi</Button>
            </div>
            <DetailsView />
            <EditSettlementPaymentModal
                isOpen={!!editingSettlement}
                onClose={() => setEditingSettlement(null)}
                settlement={editingSettlement}
            />
            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Conferma Eliminazione"
                message="Sei sicuro di voler eliminare questa chiusura? L'operazione è irreversibile e potrebbe causare incongruenze nei dati se sono state registrate altre operazioni successivamente."
            />
        </Modal>
    );
};

const PartnerLedgerView: React.FC = () => {
    const { state, settings, dispatch } = useAppContext();
    const yearData = state[settings.currentYear];
    const { partners } = state;
    const ledger = yearData.partnerLedger;
    const settlementsHistory = yearData.partnerSettlements || [];

    const stats = useMemo(() => {
        return partners.map(p => {
            const entries = ledger.filter(e => e.partnerId === p.id);
            const totalIn = entries.filter(e => e.amount > 0).reduce((acc, e) => acc + e.amount, 0);
            const totalOut = entries.filter(e => e.amount < 0).reduce((acc, e) => acc + e.amount, 0);
            const balance = totalIn + totalOut;
            return { ...p, in: totalIn, out: totalOut, balance };
        });
    }, [partners, ledger]);

    const totalSystemBalance = stats.reduce((acc, p) => acc + p.balance, 0);
    const target = totalSystemBalance / partners.length;

    const enhancedStats = useMemo(() => {
        return stats.map(p => ({
            ...p,
            diff: p.balance - target,
            status: (p.balance > target + 0.01) ? 'debtor' : (p.balance < target - 0.01) ? 'creditor' : 'balanced'
        }));
    }, [stats, target]);

    const settlements = useMemo(() => {
        const plan = [];
        // Clone to avoid mutation of state derived data during calculation
        let debtors = enhancedStats.filter(p => p.status === 'debtor').map(p => ({...p}));
        let creditors = enhancedStats.filter(p => p.status === 'creditor').map(p => ({...p}));
        
        // Convert negative diffs to positive for calculation
        creditors.forEach(c => c.diff = Math.abs(c.diff));

        let d = 0;
        let c = 0;

        while(d < debtors.length && c < creditors.length) {
            let debtor = debtors[d];
            let creditor = creditors[c];
            
            let amount = Math.min(debtor.diff, creditor.diff);
            
            if (amount > 0.01) {
                plan.push({
                    fromId: debtor.id,
                    fromName: debtor.name,
                    toId: creditor.id,
                    toName: creditor.name,
                    amount: amount
                });
            }
            
            debtor.diff -= amount;
            creditor.diff -= amount;
            
            if(debtor.diff < 0.01) d++;
            if(creditor.diff < 0.01) c++;
        }
        return plan;
    }, [enhancedStats]);

    const [isTransferModalOpen, setTransferModalOpen] = useState(false);
    const [settlementModalData, setSettlementModalData] = useState<any>(null);
    const [isPrintModalOpen, setPrintModalOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<any>(null);
    const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);

    const handleArchiveSettlement = () => {
        if (!confirm("Sei sicuro di voler chiudere il periodo corrente? \n\nQuesta azione salverà un'istantanea dei saldi attuali nello storico e genererà movimenti di rettifica per AZZERARE i saldi di tutti i soci nel mastro visuale. \n\nProcedere solo se la divisione utili/pareggio è stata completata o concordata.")) {
            return;
        }

        const snapshot: PartnerSettlement = {
            id: uuidv4(),
            date: new Date().toISOString(),
            totalSystemBalance,
            targetPerPartner: target,
            partnerSnapshots: enhancedStats.map(p => ({
                partnerId: p.id,
                partnerName: p.name,
                balance: p.balance,
                status: p.status as 'creditor' | 'debtor' | 'balanced'
            }))
        };

        dispatch({
            type: 'ARCHIVE_PARTNER_SETTLEMENT',
            payload: snapshot
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                    <p className="text-xs text-gray-500 font-bold uppercase">Totale in Cassa (Soci)</p>
                    <p className="text-2xl font-bold text-primary-600">€{totalSystemBalance.toFixed(2)}</p>
                 </div>
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                    <p className="text-xs text-gray-500 font-bold uppercase">Target per Socio</p>
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">€{target.toFixed(2)}</p>
                 </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Left Column: Cards */}
                 <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {enhancedStats.map(partner => (
                            <div 
                                key={partner.id} 
                                onClick={() => setSelectedPartner(partner)}
                                className={`p-4 rounded-lg border-2 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-1 ${partner.status === 'debtor' ? 'border-red-100 bg-red-50 dark:bg-red-900/10' : partner.status === 'creditor' ? 'border-green-100 bg-green-50 dark:bg-green-900/10' : 'border-gray-100 bg-white dark:bg-gray-800'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg">{partner.name}</h3>
                                    {partner.status === 'debtor' && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">DEVE VERSARE</span>}
                                    {partner.status === 'creditor' && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">DEVE RICEVERE</span>}
                                    {partner.status === 'balanced' && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-bold">IN PARI</span>}
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Saldo Attuale:</span>
                                        <span className="font-bold">€{partner.balance.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>Tot. Incassato:</span>
                                        <span className="text-green-600">+€{partner.in.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>Tot. Speso:</span>
                                        <span className="text-red-500">-€{Math.abs(partner.out).toFixed(2)}</span>
                                    </div>
                                    <div className="pt-2 mt-2 border-t dark:border-gray-700 flex justify-between font-bold">
                                        <span>Differenza dal target:</span>
                                        <span className={partner.diff > 0 ? 'text-red-600' : partner.diff < 0 ? 'text-green-600' : 'text-gray-600'}>
                                            {partner.diff > 0 ? '+' : ''}{partner.diff.toFixed(2)} €
                                        </span>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-full h-full bg-transparent flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-white/20 dark:bg-black/20 pointer-events-none">
                                    <span className="bg-white dark:bg-gray-800 shadow px-3 py-1 rounded-full text-xs font-bold">Clicca per Dettagli</span>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Right Column: Actions & Settlements */}
                 <div className="lg:col-span-1 space-y-4">
                     <Card title="Azioni Rapide">
                         <div className="space-y-2">
                             <Button className="w-full justify-start" onClick={() => setTransferModalOpen(true)}>
                                 <ArrowRightLeft className="mr-2" size={16} /> Trasferimento Manuale
                             </Button>
                             <Button className="w-full justify-start" variant="secondary" onClick={() => setPrintModalOpen(true)}>
                                 <Printer className="mr-2" size={16} /> Stampa Report Completo
                             </Button>
                             <div className="border-t dark:border-gray-700 my-2 pt-2"></div>
                             <Button className="w-full justify-start bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleArchiveSettlement}>
                                 <Save className="mr-2" size={16} /> Archivia e Chiudi Periodo
                             </Button>
                             <Button className="w-full justify-start" variant="secondary" onClick={() => setHistoryModalOpen(true)}>
                                 <History className="mr-2" size={16} /> Storico Chiusure
                             </Button>
                         </div>
                     </Card>

                     <Card title="Dare / Avere (Pareggio)">
                         {settlements.length === 0 ? (
                             <div className="text-center py-8 text-gray-500">
                                 <CheckCircle2 size={48} className="mx-auto mb-2 text-green-500 opacity-50" />
                                 <p>I conti sono bilanciati.</p>
                                 <p className="text-xs">Nessun movimento necessario.</p>
                             </div>
                         ) : (
                             <div className="space-y-3">
                                 {settlements.map((s, idx) => (
                                     <div key={idx} className="bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-700 shadow-sm">
                                         <div className="flex items-center justify-between mb-2 text-sm">
                                             <div className="flex flex-col items-center">
                                                 <span className="font-bold text-red-600">{s.fromName}</span>
                                             </div>
                                             <div className="flex flex-col items-center px-2">
                                                 <span className="text-xs text-gray-400">versa a</span>
                                                 <ArrowRight size={14} className="text-gray-400" />
                                             </div>
                                             <div className="flex flex-col items-center">
                                                 <span className="font-bold text-green-600">{s.toName}</span>
                                             </div>
                                         </div>
                                         <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                             <span className="font-bold text-lg">€{s.amount.toFixed(2)}</span>
                                             <Button size="sm" onClick={() => setSettlementModalData(s)}>Registra</Button>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </Card>
                 </div>
            </div>

            <PartnerTransferModal isOpen={isTransferModalOpen} onClose={() => setTransferModalOpen(false)} />
            <SettlementPaymentModal isOpen={!!settlementModalData} onClose={() => setSettlementModalData(null)} data={settlementModalData} />
            
            <PartnerDetailModal 
                isOpen={!!selectedPartner} 
                onClose={() => setSelectedPartner(null)} 
                partner={selectedPartner} 
                entries={selectedPartner ? ledger.filter(e => e.partnerId === selectedPartner.id) : []} 
            />

            <PartnerSettlementHistoryModal 
                isOpen={isHistoryModalOpen}
                onClose={() => setHistoryModalOpen(false)}
                settlements={settlementsHistory}
            />

            <PrintModal isOpen={isPrintModalOpen} onClose={() => setPrintModalOpen(false)} title="Report Soci" documentName={`report_soci_${new Date().toISOString().split('T')[0]}`}>
                <PrintableCompletePartnerReport 
                    stats={enhancedStats} 
                    totalSystemBalance={totalSystemBalance} 
                    settlementPlan={settlements} 
                    partners={partners} 
                    ledgerEntries={ledger} 
                    companyInfo={settings.companyInfo}
                />
            </PrintModal>
        </div>
    );
};

export const MainViews: React.FC<{ view: View }> = ({ view }) => {
    switch (view) {
        case 'dashboard': return <DashboardView />;
        case 'new-sale': return <NewSaleView />;
        case 'new-quote': return <NewQuoteView />;
        case 'sales-history': return <SalesHistoryView />;
        case 'quotes-history': return <QuotesHistoryView />;
        case 'customers': return <CustomersView />;
        case 'suppliers': return <SuppliersView />;
        case 'agents': return <AgentsView />;
        case 'inventory': return <InventoryView />;
        case 'stock-load': return <StockLoadView />;
        case 'stock-load-history': return <StockLoadHistoryView />;
        case 'production': return <ProductionView />;
        case 'production-history': return <ProductionHistoryView />;
        case 'cellar': return <CellarView />;
        case 'partner-ledger': return <PartnerLedgerView />;
        case 'catalog': return <CatalogView />;
        case 'spese': return <SpeseView />;
        case 'ordini-clienti': return <OrdiniClientiView />;
        case 'archives': return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Archive size={64} className="mb-4 text-gray-300" />
                <h2 className="text-2xl font-bold">Archivi Storici</h2>
                <p>Funzionalità per consultare gli anni passati in arrivo.</p>
            </div>
        );
        default: return <div>Vista non trovata: {view}</div>;
    }
};
