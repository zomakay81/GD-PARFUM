
import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { View, Customer, Supplier, Agent, Product, StockLoad, StockLoadItem, Category, Partner, ProductVariant, Sale, PartnerLedgerEntry, Quote, Production, ProductionComponent, InventoryBatch, YearData, CompanyInfo, PartnerSettlement } from '../types';
import { useAppContext } from '../state/AppContext';
import { Button, Input, Modal, ConfirmDialog, Card, Table, Alert } from './ui';
import { PlusCircle, Edit, Trash2, Check, X, DollarSign, Layers, ArrowUpDown, Image as ImageIcon, Eye, Euro, Users as UsersIcon, Package as PackageIcon, FileText as FileTextIcon, ListTree, Printer, FileDown, Briefcase, TrendingUp, Wine, Clock, Lock, ShoppingCart, Factory, CircleDollarSign, Calendar, PiggyBank, ArrowRightLeft, Archive, Droplets, Beaker, Barcode, Truck, Wallet, BookOpen, Info, Search, Plus, Filter, CheckSquare, Warehouse, FlaskConical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
                {/* Removed p-8 to allow children to control padding/margins perfectly for pagination */}
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
    // 1. Raggruppa e Ordina per Brand
    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => {
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
            {pages.map((chunk, pageIndex) => (
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
                    
                    {/* Content: 5 Items */}
                    <div className="flex-grow flex flex-col justify-start space-y-4">
                        {chunk.map((product) => (
                            <div key={product.id} className="flex flex-row border-b last:border-0 pb-2 h-[42mm] overflow-hidden">
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
                        ))}
                    </div>
                    
                    {/* Footer */}
                    <footer className="mt-auto pt-2 border-t text-center text-[9px] text-gray-400 shrink-0">
                        {companyInfo.address} - {companyInfo.city} | P.IVA: {companyInfo.vatNumber} | {companyInfo.email}
                    </footer>
                </div>
            ))}
            
            {pages.length === 0 && (
                <div className="p-10 text-center">Nessun prodotto da visualizzare.</div>
            )}
        </div>
    );
};

// --- MODALS DI SUPPORTO ---

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

    // Filter logic
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
        setSelectedVariants(new Set()); // Reset selections
        onClose();
    };

    const getProductInfo = (variant: ProductVariant) => {
        return products.find(p => p.id === variant.productId);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="flex flex-col h-[70vh]">
                {/* Header Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-4 pb-4 border-b dark:border-gray-700">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <Input 
                            placeholder="Cerca per Nome, Codice o Brand..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="pl-10 w-full"
                        />
                    </div>
                    <div className="w-full md:w-1/3">
                        <select 
                            value={selectedCategory} 
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                        >
                            <option value="all">Tutte le Categorie</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left w-10">
                                    <CheckSquare size={16} className="text-gray-500" />
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Codice</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Brand</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Prodotto</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Variante</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cat.</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredVariants.map(v => {
                                const p = getProductInfo(v);
                                return (
                                    <tr 
                                        key={v.id} 
                                        onClick={() => handleToggleSelect(v.id)} 
                                        className={`cursor-pointer transition-colors ${selectedVariants.has(v.id) ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                    >
                                        <td className="px-4 py-3">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedVariants.has(v.id)} 
                                                onChange={() => {}} // Handled by row click
                                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{p?.code || '-'}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-gray-600 dark:text-gray-400">{p?.brand || '-'}</td>
                                        <td className="px-4 py-3 text-sm font-medium">{p?.name}</td>
                                        <td className="px-4 py-3 text-sm">{v.name}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{p?.category}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredVariants.length === 0 && (
                        <div className="text-center py-8 text-gray-500">Nessun prodotto trovato.</div>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-4 mt-4 border-t dark:border-gray-700 flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                        {selectedVariants.size} prodott{selectedVariants.size === 1 ? 'o' : 'i'} selezionat{selectedVariants.size === 1 ? 'o' : 'i'}
                    </span>
                    <div className="flex space-x-2">
                        <Button variant="secondary" onClick={onClose}>Annulla</Button>
                        <Button onClick={handleConfirm} disabled={selectedVariants.size === 0}>
                            Aggiungi Selezionati
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

interface DocumentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: Sale | Quote | null;
}
const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({ isOpen, onClose, doc }) => {
    const { state, settings } = useAppContext();
    const yearData = state[settings.currentYear];

    if (!doc) return null;

    const customer = yearData.customers.find(c => c.id === doc.customerId);
    const getVariantName = (id: string) => {
        const v = yearData.productVariants.find(v => v.id === id);
        const p = yearData.products.find(prod => prod.id === v?.productId);
        return p && v ? `${p.name} - ${v.name}` : 'Sconosciuto';
    };
    
    let discountAmount = 0;
    if (doc.discountValue) {
        discountAmount = doc.discountType === 'percentage' 
            ? doc.subtotal * (doc.discountValue / 100)
            : doc.discountValue;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Dettaglio Documento #${doc.id.substring(0, 8)}`}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="font-semibold text-gray-500">Data</p>
                        <p>{new Date(doc.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                         <p className="font-semibold text-gray-500">Cliente</p>
                         <p>{customer?.name || 'Sconosciuto'}</p>
                    </div>
                    <div>
                         <p className="font-semibold text-gray-500">Tipo</p>
                         <p className="capitalize">{doc.type}</p>
                    </div>
                    <div>
                         <p className="font-semibold text-gray-500">Totale</p>
                         <p className="font-bold">€{doc.total.toFixed(2)}</p>
                    </div>
                </div>
                <Table headers={["Prodotto", "Q.tà", "Prezzo", "Totale"]}>
                    {doc.items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{getVariantName(item.variantId)}</td>
                            <td className="px-4 py-2 text-sm text-center">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right">€{item.price.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-right">€{(item.quantity * item.price).toFixed(2)}</td>
                        </tr>
                    ))}
                </Table>
                
                 <div className="flex flex-col items-end text-sm space-y-1">
                    <p>Subtotale: €{doc.subtotal.toFixed(2)}</p>
                    {discountAmount > 0 && <p className="text-red-600">Sconto: -€{discountAmount.toFixed(2)}</p>}
                    {doc.shippingCost && <p>Spedizione: €{doc.shippingCost.toFixed(2)}</p>}
                    <p className="font-bold text-lg">Totale: €{doc.total.toFixed(2)}</p>
                </div>
            </div>
             <div className="flex justify-end pt-4">
                <Button variant="secondary" onClick={onClose}>Chiudi</Button>
            </div>
        </Modal>
    );
};

interface StockLoadDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    load: StockLoad | null;
}
const StockLoadDetailModal: React.FC<StockLoadDetailModalProps> = ({ isOpen, onClose, load }) => {
    const { state, settings } = useAppContext();
    const yearData = state[settings.currentYear];

    if (!load) return null;

    const supplier = yearData.suppliers.find(s => s.id === load.supplierId);
    const partner = state.partners.find(p => p.id === load.paidByPartnerId);
    const getVariantName = (id: string) => {
        const v = yearData.productVariants.find(v => v.id === id);
        const p = yearData.products.find(prod => prod.id === v?.productId);
        return p && v ? `${p.name} - ${v.name}` : 'Sconosciuto';
    };
    
    const subtotal = load.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    let discountAmount = 0;
    if (load.discountValue) {
        discountAmount = load.discountType === 'percentage' 
            ? subtotal * (load.discountValue / 100)
            : load.discountValue;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Dettaglio Carico #${load.id.substring(0, 8)}`}>
            <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="font-semibold text-gray-500">Data</p>
                        <p>{new Date(load.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                         <p className="font-semibold text-gray-500">Fornitore</p>
                         <p>{supplier?.name || 'Deposito / Interno'}</p>
                    </div>
                    <div>
                         <p className="font-semibold text-gray-500">Pagato da</p>
                         <p>{partner?.name || 'Nessuno (Carico Interno)'}</p>
                    </div>
                    <div>
                         <p className="font-semibold text-gray-500">Totale</p>
                         <p className="font-bold">€{load.total.toFixed(2)}</p>
                         {load.vatApplied && <p className="text-xs text-gray-500">(IVA Inclusa)</p>}
                    </div>
                </div>
                 <Table headers={["Prodotto", "Lotto", "Scad.", "Q.tà", "Prezzo"]}>
                    {load.items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{getVariantName(item.variantId)}</td>
                            <td className="px-4 py-2 text-sm font-mono">{item.batchNumber || '-'}</td>
                             <td className="px-4 py-2 text-sm">{item.expirationDate || '-'}</td>
                            <td className="px-4 py-2 text-sm text-center">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right">€{item.price.toFixed(4)}</td>
                        </tr>
                    ))}
                </Table>
                
                <div className="flex flex-col items-end text-sm space-y-1">
                    <p>Subtotale: €{subtotal.toFixed(2)}</p>
                    {discountAmount > 0 && <p className="text-red-600">Sconto: -€{discountAmount.toFixed(2)}</p>}
                    {load.shippingCost && <p>Spedizione: €{load.shippingCost.toFixed(2)}</p>}
                    <p className="font-bold text-lg">Totale: €{load.total.toFixed(2)}</p>
                </div>
            </div>
             <div className="flex justify-end pt-4">
                <Button variant="secondary" onClick={onClose}>Chiudi</Button>
            </div>
        </Modal>
    );
}

interface CollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: Sale | null;
}
const CollectionModal: React.FC<CollectionModalProps> = ({ isOpen, onClose, sale }) => {
    const { state, dispatch } = useAppContext();
    const [partnerId, setPartnerId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState<number>(0);

    const paidAmount = sale?.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
    const remainingAmount = sale ? Math.max(0, sale.total - paidAmount) : 0;

    React.useEffect(() => {
        if (sale) {
            setAmount(remainingAmount);
            setPartnerId('');
        }
    }, [sale, remainingAmount]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (sale && partnerId && amount > 0) {
            dispatch({ 
                type: 'COLLECT_SALE', 
                payload: { saleId: sale.id, partnerId, date, amount } 
            });
            onClose();
        }
    };

    if (!sale) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registra Pagamento / Incasso">
            <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700">
                    <div className="flex justify-between items-center text-sm">
                        <span>Totale Documento:</span>
                        <span className="font-bold">€{sale.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-green-600">
                        <span>Già Pagato:</span>
                        <span>€{paidAmount.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between items-center text-sm text-red-600 border-t mt-2 pt-2">
                        <span>Residuo da Pagare:</span>
                        <span className="font-bold">€{remainingAmount.toFixed(2)}</span>
                    </div>
                </div>

                {sale.payments && sale.payments.length > 0 && (
                    <div className="text-sm">
                        <h5 className="font-semibold mb-2">Storico Pagamenti</h5>
                        <ul className="space-y-1">
                            {sale.payments.map((p, idx) => (
                                <li key={idx} className="flex justify-between text-gray-600 dark:text-gray-400 border-b pb-1">
                                    <span>{new Date(p.date).toLocaleDateString()} - {state.partners.find(par => par.id === p.partnerId)?.name}</span>
                                    <span>€{p.amount.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {remainingAmount > 0.01 ? (
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
                        <Input type="date" label="Data Incasso" value={date} onChange={e => setDate(e.target.value)} required />
                        
                        <Input 
                            type="number" 
                            label="Importo da Incassare" 
                            step="0.01" 
                            max={remainingAmount}
                            value={amount} 
                            onChange={e => setAmount(parseFloat(e.target.value))} 
                            required 
                        />
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">Incassato da (Socio)</label>
                            <select 
                                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600" 
                                value={partnerId} 
                                onChange={e => setPartnerId(e.target.value)} 
                                required
                            >
                                <option value="">Seleziona Socio...</option>
                                {state.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button type="button" variant="secondary" onClick={onClose}>Annulla</Button>
                            <Button type="submit">Registra Pagamento</Button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center text-green-600 font-bold py-4">
                        Il documento è interamente saldato.
                    </div>
                )}
            </div>
        </Modal>
    );
};

interface EditStockLoadModalProps {
    isOpen: boolean;
    onClose: () => void;
    load: StockLoad | null;
}
const EditStockLoadModal: React.FC<EditStockLoadModalProps> = ({ isOpen, onClose, load }) => {
    const { state, settings, dispatch } = useAppContext();
    const [date, setDate] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [paidByPartnerId, setPaidByPartnerId] = useState('');
    const [isInternalLoad, setIsInternalLoad] = useState(false);

    React.useEffect(() => {
        if (load) {
            setDate(load.date);
            setSupplierId(load.supplierId || '');
            setPaidByPartnerId(load.paidByPartnerId || '');
            setIsInternalLoad(!load.paidByPartnerId);
        }
    }, [load]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (load) {
            dispatch({
                type: 'UPDATE_STOCK_LOAD',
                payload: { 
                    id: load.id, 
                    date, 
                    supplierId: isInternalLoad ? undefined : supplierId, 
                    paidByPartnerId: isInternalLoad ? undefined : paidByPartnerId 
                }
            });
            onClose();
        }
    };

    if (!load) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Modifica Dati Carico">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Alert type="warning" message="Attenzione: Puoi modificare solo i dati di testata. Per modificare gli articoli, elimina il carico e ricrealo per garantire la coerenza del magazzino." />
                <Input type="date" label="Data Carico" value={date} onChange={e => setDate(e.target.value)} required />
                
                <div className="p-2 border rounded bg-gray-50 dark:bg-gray-700/50">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={isInternalLoad} 
                            onChange={e => setIsInternalLoad(e.target.checked)} 
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium">Carico da Deposito / Merce Esistente (Nessun Pagamento)</span>
                    </label>
                </div>

                {!isInternalLoad && (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1">Fornitore</label>
                            <select className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600" value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                                {state[settings.currentYear].suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Pagato da</label>
                            <select className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600" value={paidByPartnerId} onChange={e => setPaidByPartnerId(e.target.value)} required>
                                {state.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Annulla</Button>
                    <Button type="submit">Salva Modifiche</Button>
                </div>
            </form>
        </Modal>
    );
};

export const CompanyInfoModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { settings, updateSettings } = useAppContext();
    const [formData, setFormData] = useState<CompanyInfo>(settings.companyInfo);
    React.useEffect(() => { if(isOpen) setFormData(settings.companyInfo); }, [isOpen, settings.companyInfo]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); updateSettings({ companyInfo: formData }); onClose(); };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gestisci Dati Azienda">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nome Azienda" name="name" value={formData.name} onChange={handleChange} required />
                <Input label="Indirizzo" name="address" value={formData.address} onChange={handleChange} />
                <Input label="Città (con CAP e Provincia)" name="city" value={formData.city} onChange={handleChange} placeholder="Es. 40100 Bologna (BO)" />
                <Input label="Partita IVA" name="vatNumber" value={formData.vatNumber} onChange={handleChange} />
                <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
                <Input label="Telefono" name="phone" value={formData.phone} onChange={handleChange} />
                 <div className="flex justify-end space-x-2 pt-4"><Button type="button" variant="secondary" onClick={onClose}>Annulla</Button><Button type="submit">Salva Modifiche</Button></div>
            </form>
        </Modal>
    );
};

const SalesHistoryView: React.FC = () => {
    const { state, settings, dispatch } = useAppContext();
    const yearData = state[settings.currentYear];
    const [viewDoc, setViewDoc] = useState<Sale | null>(null);
    const [printDoc, setPrintDoc] = useState<Sale | null>(null);
    const [collectionSale, setCollectionSale] = useState<Sale | null>(null);
    
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

    return (
        <Card title="Storico Vendite">
            <Table headers={["Data", "Cliente", "Totale", "Stato Pagamento", "Azioni"]}>
                {yearData.sales.map(s => {
                    const statusInfo = getPaymentStatus(s);
                    const StatusIcon = statusInfo.icon;
                    return (
                        <tr key={s.id}>
                            <td className="px-6 py-4">{new Date(s.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4">{getCustomerName(s.customerId)}</td>
                            <td className="px-6 py-4">€{s.total.toFixed(2)}</td>
                            <td className="px-6 py-4">
                                <span className={`flex items-center font-semibold ${statusInfo.color}`}>
                                    <StatusIcon size={16} className="mr-1" /> {statusInfo.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 space-x-2 flex">
                                 {statusInfo.status !== 'Pagato' && (
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
            <CollectionModal isOpen={!!collectionSale} onClose={() => setCollectionSale(null)} sale={collectionSale} />
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

const StockLoadHistoryView: React.FC = () => {
    const { state, settings, dispatch } = useAppContext();
    const yearData = state[settings.currentYear];
    const [viewLoad, setViewLoad] = useState<StockLoad | null>(null);
    const [editLoad, setEditLoad] = useState<StockLoad | null>(null);
    const [printLoad, setPrintLoad] = useState<StockLoad | null>(null);

    const getSupplierName = (id?: string) => id ? (yearData.suppliers.find(s => s.id === id)?.name || 'N/A') : 'Deposito / Interno';
    const getPartnerName = (id?: string) => id ? (state.partners.find(p => p.id === id)?.name || 'N/A') : '-';

    const allVariants = useMemo(() => {
        return yearData.productVariants.map(variant => {
            const product = yearData.products.find(p => p.id === variant.productId);
            return { ...variant, productName: product?.name || 'N/A' };
        });
    }, [yearData]);

    return (
        <Card title="Storico Carichi Magazzino">
            <Table headers={["Data", "Fornitore", "Pagato da", "Totale", "Articoli", "Azioni"]}>
                {yearData.stockLoads.map(load => (
                    <tr key={load.id}>
                        <td className="px-6 py-4">{new Date(load.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">{getSupplierName(load.supplierId)}</td>
                        <td className="px-6 py-4">{getPartnerName(load.paidByPartnerId)}</td>
                        <td className="px-6 py-4">€{load.total.toFixed(2)}</td>
                        <td className="px-6 py-4">{load.items.length}</td>
                        <td className="px-6 py-4 space-x-2 flex">
                            <Button variant="ghost" size="sm" onClick={() => setViewLoad(load)} title="Vedi Dettagli"><Eye size={16} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditLoad(load)} title="Modifica Intestazione"><Edit size={16} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setPrintLoad(load)} title="Stampa"><Printer size={16} /></Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { 
                                if(confirm("Attenzione: Eliminando il carico verranno rimosse le quantità dal magazzino. Se i prodotti sono già stati venduti, la giacenza potrebbe diventare negativa. Continuare?")) 
                                    dispatch({ type: 'DELETE_STOCK_LOAD', payload: load.id }) 
                            }} title="Elimina"><Trash2 size={16} /></Button>
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
                        supplier={printLoad.supplierId ? yearData.suppliers.find(s => s.id === printLoad.supplierId) : undefined}
                        allVariants={allVariants}
                        companyInfo={settings.companyInfo}
                    />
                </PrintModal>
            )}
        </Card>
    );
}

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
const DashboardView: React.FC = () => { const { state, settings } = useAppContext(); const yearData = state[settings.currentYear]; const totalSales = yearData.sales.reduce((acc, s) => acc + s.total, 0); const totalQuotes = yearData.quotes.reduce((acc, q) => acc + q.total, 0); const productionCount = yearData.productions.length; const chartData = useMemo(() => { const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']; const data = months.map(m => ({ name: m, vendite: 0 })); yearData.sales.forEach(s => { const date = new Date(s.date); data[date.getMonth()].vendite += s.total; }); return data; }, [yearData.sales]); return ( <div className="space-y-6"> <h2 className="text-2xl font-bold">Dashboard {settings.currentYear}</h2> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <Card className="border-l-4 border-blue-500"><div className="flex justify-between items-center"><div><p className="text-gray-500">Vendite Totali</p><h3 className="text-2xl font-bold">€{totalSales.toFixed(2)}</h3></div><ShoppingCart size={32} className="text-blue-500" /></div></Card> <Card className="border-l-4 border-purple-500"><div className="flex justify-between items-center"><div><p className="text-gray-500">Preventivi Emessi</p><h3 className="text-2xl font-bold">€{totalQuotes.toFixed(2)}</h3></div><FileTextIcon size={32} className="text-purple-500" /></div></Card> <Card className="border-l-4 border-green-500"><div className="flex justify-between items-center"><div><p className="text-gray-500">Produzioni</p><h3 className="text-2xl font-bold">{productionCount}</h3></div><Factory size={32} className="text-green-500" /></div></Card> </div> <Card title="Andamento Vendite"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="vendite" fill="#3b82f6" /></BarChart></ResponsiveContainer></div></Card> </div> ); };
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
            shippingCost
        }; 
        if (type === 'sale') dispatch({ type: 'ADD_SALE', payload }); 
        else dispatch({ type: 'ADD_QUOTE', payload }); 
        
        alert("Documento salvato!"); 
        setItems([]); 
        setCustomerId(''); 
        setDiscountValue(0);
        setShippingCost(0);
    }; 

    return ( 
        <Card title={type === 'sale' ? "Nuova Vendita" : "Nuovo Preventivo"}> 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"> 
                <Input type="date" label="Data" value={date} onChange={e => setDate(e.target.value)} /> 
                <div><label className="block text-sm font-medium mb-1">Cliente</label><select className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600" value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">Seleziona Cliente...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div> 
                <div className="flex items-center pt-6"><label className="flex items-center space-x-2"><input type="checkbox" checked={vatApplied} onChange={e => setVatApplied(e.target.checked)} /><span>Applica IVA 22%</span></label></div> 
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
const QuotesHistoryView: React.FC = () => { const { state, settings, dispatch } = useAppContext(); const yearData = state[settings.currentYear]; const [viewDoc, setViewDoc] = useState<Quote | null>(null); const getCustomerName = (id: string) => yearData.customers.find(c => c.id === id)?.name || 'N/A'; return ( <Card title="Storico Preventivi"> <Table headers={["Data", "Cliente", "Totale", "Stato", "Azioni"]}> {yearData.quotes.map(q => ( <tr key={q.id}> <td className="px-6 py-4">{new Date(q.date).toLocaleDateString()}</td> <td className="px-6 py-4">{getCustomerName(q.customerId)}</td> <td className="px-6 py-4">€{q.total.toFixed(2)}</td> <td className="px-6 py-4">{q.status}</td> <td className="px-6 py-4 space-x-2"><Button variant="ghost" size="sm" onClick={() => setViewDoc(q)}><Eye size={16} /></Button>{q.status === 'aperto' && (<Button variant="ghost" size="sm" onClick={() => { if(confirm("Convertire in vendita?")) dispatch({ type: 'CONVERT_QUOTE_TO_SALE', payload: q.id }) }} title="Converti in Vendita"><Check size={16} /></Button>)}<Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if(confirm("Eliminare?")) dispatch({ type: 'DELETE_QUOTE', payload: q.id }) }}><Trash2 size={16} /></Button></td> </tr> ))} </Table> <DocumentDetailModal isOpen={!!viewDoc} onClose={() => setViewDoc(null)} doc={viewDoc} /> </Card> ); };
const CustomersView: React.FC = () => { const { state, settings, dispatch } = useAppContext(); const data = state[settings.currentYear]; const [isModalOpen, setModalOpen] = useState(false); const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null); const [isConfirmOpen, setConfirmOpen] = useState(false); const [deletingId, setDeletingId] = useState<string | null>(null); const openModal = (customer: Customer | null = null) => { setEditingCustomer(customer); setModalOpen(true); }; const handleDeleteClick = (id: string) => { setDeletingId(id); setConfirmOpen(true); }; const confirmDelete = () => { if (deletingId) { dispatch({ type: 'DELETE_CUSTOMER', payload: deletingId }); } setConfirmOpen(false); setDeletingId(null); }; const getAgentName = (agentId?: string) => { if (!agentId) return 'N/A'; return data.agents.find(a => a.id === agentId)?.name || 'Sconosciuto'; }; return ( <Card title="Gestione Clienti"> <div className="flex justify-end mb-4"> <Button onClick={() => openModal()}><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Cliente</Button> </div> <Table headers={["Nome", "Città", "Telefono", "Email", "Agente", "Azioni"]}> {data.customers.map(customer => ( <tr key={customer.id}> <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{customer.name}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{customer.city}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{customer.phone}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{customer.email}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{getAgentName(customer.agentId)}</td> <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2"> <Button variant="ghost" size="sm" onClick={() => openModal(customer)}><Edit size={16} /></Button> <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(customer.id)}><Trash2 size={16} /></Button> </td> </tr> ))} </Table> <CustomerForm isOpen={isModalOpen} onClose={() => setModalOpen(false)} customer={editingCustomer} agents={data.agents} /> <ConfirmDialog isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDelete} title="Conferma Eliminazione" message="Sei sicuro di voler eliminare questo cliente?" /> </Card> ); };
const CustomerForm: React.FC<{ isOpen: boolean, onClose: () => void, customer: Customer | null, agents: Agent[] }> = ({ isOpen, onClose, customer, agents }) => { const { dispatch } = useAppContext(); const [formData, setFormData] = useState<Omit<Customer, 'id'>>({ name: '', address: '', city: '', zip: '', province: '', phone: '', email: '', vatNumber: '', sdi: '', agentId: '' }); React.useEffect(() => { if (customer) { setFormData(customer); } else { setFormData({ name: '', address: '', city: '', zip: '', province: '', phone: '', email: '', vatNumber: '', sdi: '', agentId: '' }); } }, [customer, isOpen]); const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setFormData({ ...formData, [e.target.name]: e.target.value }); }; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (customer) { dispatch({ type: 'UPDATE_CUSTOMER', payload: { ...formData, id: customer.id } }); } else { dispatch({ type: 'ADD_CUSTOMER', payload: formData }); } onClose(); }; return ( <Modal isOpen={isOpen} onClose={onClose} title={customer ? "Modifica Cliente" : "Nuovo Cliente"}> <form onSubmit={handleSubmit} className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Input label="Nome" name="name" value={formData.name} onChange={handleChange} required /> <Input label="Indirizzo" name="address" value={formData.address} onChange={handleChange} /> <Input label="Città" name="city" value={formData.city} onChange={handleChange} /> <Input label="CAP" name="zip" value={formData.zip} onChange={handleChange} /> <Input label="Provincia" name="province" value={formData.province} onChange={handleChange} /> <Input label="Telefono" name="phone" value={formData.phone} onChange={handleChange} /> <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} /> <Input label="Partita IVA" name="vatNumber" value={formData.vatNumber} onChange={handleChange} /> <Input label="Codice SDI" name="sdi" value={formData.sdi} onChange={handleChange} /> <div> <label htmlFor="agentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agente</label> <select name="agentId" id="agentId" value={formData.agentId || ''} onChange={handleChange} className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-800"> <option value="">Nessun agente</option> {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)} </select> </div> </div> <div className="flex justify-end space-x-2 pt-4"> <Button type="button" variant="secondary" onClick={onClose}>Annulla</Button> <Button type="submit">Salva</Button> </div> </form> </Modal> ); };

const SuppliersView: React.FC = () => { const { state, settings, dispatch } = useAppContext(); const data = state[settings.currentYear]; const [isModalOpen, setModalOpen] = useState(false); const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null); const [isConfirmOpen, setConfirmOpen] = useState(false); const [deletingId, setDeletingId] = useState<string | null>(null); const openModal = (supplier: Supplier | null = null) => { setEditingSupplier(supplier); setModalOpen(true); }; const handleDeleteClick = (id: string) => { setDeletingId(id); setConfirmOpen(true); }; const confirmDelete = () => { if (deletingId) { dispatch({ type: 'DELETE_SUPPLIER', payload: deletingId }); } setConfirmOpen(false); setDeletingId(null); }; return ( <Card title="Gestione Fornitori"> <div className="flex justify-end mb-4"> <Button onClick={() => openModal()}><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Fornitore</Button> </div> <Table headers={["Nome", "Città", "Telefono", "Email", "P.IVA", "Azioni"]}> {data.suppliers.map(supplier => ( <tr key={supplier.id}> <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{supplier.name}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{supplier.city}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{supplier.phone}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{supplier.email}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{supplier.vatNumber}</td> <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2"> <Button variant="ghost" size="sm" onClick={() => openModal(supplier)}><Edit size={16} /></Button> <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(supplier.id)}><Trash2 size={16} /></Button> </td> </tr> ))} </Table> <SupplierForm isOpen={isModalOpen} onClose={() => setModalOpen(false)} supplier={editingSupplier} /> <ConfirmDialog isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDelete} title="Conferma Eliminazione" message="Sei sicuro di voler eliminare questo fornitore?" /> </Card> ); };
const SupplierForm: React.FC<{ isOpen: boolean, onClose: () => void, supplier: Supplier | null }> = ({ isOpen, onClose, supplier }) => { const { dispatch } = useAppContext(); const [formData, setFormData] = useState<Omit<Supplier, 'id'>>({ name: '', address: '', city: '', phone: '', email: '', vatNumber: '' }); React.useEffect(() => { if (supplier) { setFormData(supplier); } else { setFormData({ name: '', address: '', city: '', phone: '', email: '', vatNumber: '' }); } }, [supplier, isOpen]); const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { setFormData({ ...formData, [e.target.name]: e.target.value }); }; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (supplier) { dispatch({ type: 'UPDATE_SUPPLIER', payload: { ...formData, id: supplier.id } }); } else { dispatch({ type: 'ADD_SUPPLIER', payload: formData }); } onClose(); }; return ( <Modal isOpen={isOpen} onClose={onClose} title={supplier ? "Modifica Fornitore" : "Nuovo Fornitore"}> <form onSubmit={handleSubmit} className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Input label="Nome" name="name" value={formData.name} onChange={handleChange} required /> <Input label="Indirizzo" name="address" value={formData.address} onChange={handleChange} /> <Input label="Città" name="city" value={formData.city} onChange={handleChange} /> <Input label="Telefono" name="phone" value={formData.phone} onChange={handleChange} /> <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} /> <Input label="Partita IVA" name="vatNumber" value={formData.vatNumber} onChange={handleChange} /> </div> <div className="flex justify-end space-x-2 pt-4"> <Button type="button" variant="secondary" onClick={onClose}>Annulla</Button> <Button type="submit">Salva</Button> </div> </form> </Modal> ); };
const AgentsView: React.FC = () => { const { state, settings, dispatch } = useAppContext(); const data = state[settings.currentYear]; const [isModalOpen, setModalOpen] = useState(false); const [editingAgent, setEditingAgent] = useState<Agent | null>(null); const [isConfirmOpen, setConfirmOpen] = useState(false); const [deletingId, setDeletingId] = useState<string | null>(null); const openModal = (agent: Agent | null = null) => { setEditingAgent(agent); setModalOpen(true); }; const handleDeleteClick = (id: string) => { setDeletingId(id); setConfirmOpen(true); }; const confirmDelete = () => { if (deletingId) { dispatch({ type: 'DELETE_AGENT', payload: deletingId }); } setConfirmOpen(false); setDeletingId(null); }; return ( <Card title="Gestione Agenti"> <div className="flex justify-end mb-4"> <Button onClick={() => openModal()}><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Agente</Button> </div> <Table headers={["Nome", "Città", "Telefono", "Clienti Associati", "Azioni"]}> {data.agents.map(agent => ( <tr key={agent.id}> <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{agent.name}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{agent.city}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{agent.phone}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{agent.associatedClients}</td> <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2"> <Button variant="ghost" size="sm" onClick={() => openModal(agent)}><Edit size={16} /></Button> <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(agent.id)}><Trash2 size={16} /></Button> </td> </tr> ))} </Table> <AgentForm isOpen={isModalOpen} onClose={() => setModalOpen(false)} agent={editingAgent} /> <ConfirmDialog isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDelete} title="Conferma Eliminazione" message="Sei sicuro di voler eliminare questo agente? I clienti associati verranno scollegati." /> </Card> ); };
const AgentForm: React.FC<{ isOpen: boolean, onClose: () => void, agent: Agent | null }> = ({ isOpen, onClose, agent }) => { const { dispatch } = useAppContext(); const [formData, setFormData] = useState<Omit<Agent, 'id' | 'associatedClients'>>({ name: '', city: '', phone: '' }); React.useEffect(() => { if (agent) { setFormData({name: agent.name, city: agent.city, phone: agent.phone}); } else { setFormData({ name: '', city: '', phone: '' }); } }, [agent, isOpen]); const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { setFormData({ ...formData, [e.target.name]: e.target.value }); }; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (agent) { dispatch({ type: 'UPDATE_AGENT', payload: { ...formData, id: agent.id, associatedClients: agent.associatedClients } }); } else { dispatch({ type: 'ADD_AGENT', payload: formData }); } onClose(); }; return ( <Modal isOpen={isOpen} onClose={onClose} title={agent ? "Modifica Agente" : "Nuovo Agente"}> <form onSubmit={handleSubmit} className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Input label="Nome" name="name" value={formData.name} onChange={handleChange} required /> <Input label="Città" name="city" value={formData.city} onChange={handleChange} /> <Input label="Telefono" name="phone" value={formData.phone} onChange={handleChange} /> </div> <div className="flex justify-end space-x-2 pt-4"> <Button type="button" variant="secondary" onClick={onClose}>Annulla</Button> <Button type="submit">Salva</Button> </div> </form> </Modal> ); };
const CategoryManagerModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => { const { state, settings, dispatch } = useAppContext(); const { categories } = state[settings.currentYear]; const [newCategoryName, setNewCategoryName] = useState(''); const [newCategoryIsComponent, setNewCategoryIsComponent] = useState(false); const [newCategoryIsFinishedProduct, setNewCategoryIsFinishedProduct] = useState(false); const [parentId, setParentId] = useState(''); const [editingCategory, setEditingCategory] = useState<Category | null>(null); const [editingCategoryName, setEditingCategoryName] = useState(''); const handleAddCategory = () => { if (newCategoryName.trim()) { dispatch({ type: 'ADD_CATEGORY', payload: { name: newCategoryName.trim(), isComponent: newCategoryIsComponent, isFinishedProduct: newCategoryIsFinishedProduct, parentId: parentId || undefined }}); setNewCategoryName(''); setNewCategoryIsComponent(false); setNewCategoryIsFinishedProduct(false); setParentId(''); } }; const handleStartEdit = (category: Category) => { setEditingCategory(category); setEditingCategoryName(category.name); }; const handleCancelEdit = () => { setEditingCategory(null); setEditingCategoryName(''); }; const handleSaveEdit = () => { if (editingCategory && editingCategoryName.trim()) { dispatch({ type: 'UPDATE_CATEGORY', payload: { oldName: editingCategory.name, category: { ...editingCategory, name: editingCategoryName.trim() } } }); handleCancelEdit(); } }; const handleToggleIsComponent = (category: Category) => { dispatch({ type: 'UPDATE_CATEGORY', payload: { oldName: category.name, category: { ...category, isComponent: !category.isComponent } } }); }; const handleToggleIsFinishedProduct = (category: Category) => { dispatch({ type: 'UPDATE_CATEGORY', payload: { oldName: category.name, category: { ...category, isFinishedProduct: !category.isFinishedProduct } } }); }; const handleDelete = (category: Category) => { dispatch({ type: 'DELETE_CATEGORY', payload: category.id }); }; const hierarchicalCategories = useMemo(() => { const roots = categories.filter(c => !c.parentId); const structure: { node: Category, level: number }[] = []; const traverse = (node: Category, level: number) => { structure.push({ node, level }); const children = categories.filter(c => c.parentId === node.id); children.forEach(child => traverse(child, level + 1)); }; roots.forEach(root => traverse(root, 0)); return structure; }, [categories]); return ( <Modal isOpen={isOpen} onClose={onClose} title="Gestisci Categorie Prodotti"> <div className="space-y-4"> <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"> <h4 className="font-semibold mb-2 text-sm">Aggiungi Nuova Categoria</h4> <div className="grid grid-cols-1 gap-2"> <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nome categoria" label="Nome" /> <div className="flex gap-2"> <div className="flex-1"> <label className="block text-sm font-medium mb-1">Categoria Padre (Opzionale)</label> <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm" value={parentId} onChange={e => setParentId(e.target.value)} > <option value="">Nessuna (Principale)</option> {categories.map(c => ( <option key={c.id} value={c.id}>{c.name}</option> ))} </select> </div> </div> <div className="flex flex-col space-y-2 mt-2"> <label className="flex items-center space-x-2 cursor-pointer"> <input type="checkbox" checked={newCategoryIsComponent} onChange={(e) => setNewCategoryIsComponent(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" /> <span className="text-sm">È un Componente (Materia Prima)</span> </label> <label className="flex items-center space-x-2 cursor-pointer"> <input type="checkbox" checked={newCategoryIsFinishedProduct} onChange={(e) => setNewCategoryIsFinishedProduct(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" /> <span className="text-sm">È un Prodotto Finito / Vendibile</span> </label> </div> <div className="flex justify-end mt-2"> <Button onClick={handleAddCategory}>Aggiungi</Button> </div> </div> </div> <div> <h4 className="font-semibold mb-2">Struttura Categorie</h4> <ul className="space-y-1 max-h-60 overflow-y-auto border rounded p-2 bg-white dark:bg-gray-800"> {hierarchicalCategories.map(({node: cat, level}) => ( <li key={cat.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border-b last:border-0 dark:border-gray-700"> <div className="flex items-center flex-grow" style={{ marginLeft: `${level * 20}px` }}> {level > 0 && <span className="text-gray-400 mr-2">↳</span>} {editingCategory?.id === cat.id ? ( <Input value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} className="flex-grow h-8 text-sm" /> ) : ( <span className="text-sm font-medium">{cat.name}</span> )} </div> <div className="flex items-center"> <label className="flex items-center space-x-1 mx-2 cursor-pointer text-xs text-gray-500" title="Componente"> <input type="checkbox" checked={cat.isComponent} onChange={() => handleToggleIsComponent(cat)} className="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500" /> <span>Comp.</span> </label> <label className="flex items-center space-x-1 mx-2 cursor-pointer text-xs text-gray-500" title="Prodotto Finito"> <input type="checkbox" checked={cat.isFinishedProduct !== false} onChange={() => handleToggleIsFinishedProduct(cat)} className="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500" /> <span>Fin.</span> </label> <div className="flex space-x-1"> {editingCategory?.id === cat.id ? ( <> <Button variant="ghost" size="sm" onClick={handleSaveEdit}><Check size={14} className="text-green-500" /></Button> <Button variant="ghost" size="sm" onClick={handleCancelEdit}><X size={14} className="text-red-500" /></Button> </> ) : ( <> <Button variant="ghost" size="sm" onClick={() => handleStartEdit(cat)}><Edit size={14} /></Button> <Button variant="ghost" size="sm" onClick={() => handleDelete(cat)}><Trash2 size={14} /></Button> </> )} </div> </div> </li> ))} </ul> </div> </div> <div className="flex justify-end space-x-2 pt-4 mt-4 border-t dark:border-gray-700"> <Button variant="secondary" onClick={onClose}>Chiudi</Button> </div> </Modal> ) };
const VariantForm: React.FC<{ variant: ProductVariant | null, onSave: (data: Omit<ProductVariant, 'id'|'quantity'|'productId'>) => void, onCancel: () => void }> = ({ variant, onSave, onCancel }) => { const [formData, setFormData] = useState({ name: '', purchasePrice: 0, salePrice: 0, location: '', capacity: 0, imageUrl: '' }); const [imagePreview, setImagePreview] = useState<string | null>(null); React.useEffect(() => { if(variant) { setFormData({ name: variant.name, purchasePrice: variant.purchasePrice, salePrice: variant.salePrice, location: variant.location || '', capacity: variant.capacity || 0, imageUrl: variant.imageUrl || '' }); setImagePreview(variant.imageUrl || null); } else { setFormData({ name: '', purchasePrice: 0, salePrice: 0, location: '', capacity: 0, imageUrl: '' }); setImagePreview(null); } }, [variant]); const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value, type } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value })); }; const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const reader = new FileReader(); reader.onloadend = () => { const result = reader.result as string; setImagePreview(result); setFormData(prev => ({ ...prev, imageUrl: result })); }; reader.readAsDataURL(e.target.files[0]); } }; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); setFormData({ name: '', purchasePrice: 0, salePrice: 0, location: '', capacity: 0, imageUrl: '' }); }; return ( <form onSubmit={handleSubmit} className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Input label="Nome Variante (es. 50ml)" name="name" value={formData.name} onChange={handleChange} required /> <Input label="Capacità (Numero)" name="capacity" type="number" step="0.1" value={formData.capacity} onChange={handleChange} placeholder="Es. 50" /> <Input label="Prezzo Acquisto" name="purchasePrice" type="number" step="0.0001" value={formData.purchasePrice} onChange={handleChange} /> <Input label="Prezzo Vendita" name="salePrice" type="number" step="0.0001" value={formData.salePrice} onChange={handleChange} /> <Input label="Posizione" name="location" value={formData.location} onChange={handleChange} placeholder="Es. Scaffale A1" /> <div className="col-span-1 md:col-span-2"> <label className="block text-sm font-medium mb-1">Foto Specifica Variante (Opzionale)</label> <input type="file" accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-gray-700 dark:file:text-gray-300"/> {imagePreview && ( <div className="mt-2 relative inline-block"> <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded shadow" /> <button type="button" onClick={() => { setImagePreview(null); setFormData(prev => ({...prev, imageUrl: ''}))}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button> </div> )} </div> </div> <div className="flex justify-end space-x-2"> {variant && <Button type="button" variant="secondary" onClick={onCancel}>Annulla</Button>} <Button type="submit">{variant ? "Salva Modifiche" : "Aggiungi Variante"}</Button> </div> </form> ); };
const VariantManagerModal: React.FC<{ isOpen: boolean, onClose: () => void, product: Product | null }> = ({ isOpen, onClose, product }) => { const { state, settings, dispatch } = useAppContext(); const { productVariants } = state[settings.currentYear]; const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null); const useVariantQuantity = useCallback((variantId: string) => { return state[settings.currentYear].inventoryBatches .filter(b => b.variantId === variantId) .reduce((sum, b) => sum + b.currentQuantity, 0); }, [state, settings.currentYear]); const variantsForProduct = useMemo(() => { return product ? productVariants.filter(v => v.productId === product.id) : []; }, [product, productVariants]); if (!product) return null; const handleSaveVariant = (variantData: Omit<ProductVariant, 'id' | 'quantity' | 'productId'>) => { if (editingVariant) { dispatch({ type: 'UPDATE_VARIANT', payload: { ...variantData, id: editingVariant.id, productId: product.id } }); } else { dispatch({ type: 'ADD_VARIANT', payload: { ...variantData, productId: product.id } }); } setEditingVariant(null); }; const handleDeleteVariant = (variantId: string) => { if(confirm("Sei sicuro di voler eliminare questa variante? L'operazione è irreversibile e cancellerà anche tutti i lotti associati.")) { dispatch({ type: 'DELETE_VARIANT', payload: variantId }); } }; return ( <Modal isOpen={isOpen} onClose={onClose} title={`Gestisci Varianti per: ${product.name}`}> <div className="space-y-4"> <h4 className="font-semibold">Varianti Esistenti</h4> <Table headers={["Nome Variante", "Giacenza", "Posizione", "P. Acquisto", "P. Vendita", "Azioni"]}> {variantsForProduct.map(v => ( <tr key={v.id}> <td className="px-6 py-4 text-sm font-medium">{v.name}</td> <td className="px-6 py-4 text-sm font-bold">{useVariantQuantity(v.id)}</td> <td className="px-6 py-4 text-sm">{v.location || '-'}</td> <td className="px-6 py-4 text-sm">€{v.purchasePrice.toFixed(4)}</td> <td className="px-6 py-4 text-sm">€{v.salePrice.toFixed(4)}</td> <td className="px-6 py-4 text-sm space-x-2"> <Button variant="ghost" size="sm" onClick={() => setEditingVariant(v)}><Edit size={16} /></Button> <Button variant="ghost" size="sm" onClick={() => handleDeleteVariant(v.id)}><Trash2 size={16} /></Button> </td> </tr> ))} </Table> <div className="border-t pt-4 mt-4"> <h4 className="font-semibold mb-2">{editingVariant ? "Modifica Variante" : "Aggiungi Nuova Variante"}</h4> <VariantForm variant={editingVariant} onSave={handleSaveVariant} onCancel={() => setEditingVariant(null)} /> </div> </div> </Modal> ); };
const ProductForm: React.FC<{ isOpen: boolean, onClose: () => void, product: Product | null }> = ({ isOpen, onClose, product }) => { const { state, settings, dispatch } = useAppContext(); const { categories } = state[settings.currentYear]; const getInitialFormState = (): Omit<Product, 'id'> => ({ name: '', code: '', brand: '', category: categories.find(c => !c.isComponent)?.name || categories[0]?.name || '', unit: 'pz', imageUrl: '', additionalImages: [], description: '', olfactoryPyramid: { head: '', heart: '', base: '' }, essenceCode: '', ifraLimit: undefined }); const [formData, setFormData] = useState(getInitialFormState()); const [initialCapacity, setInitialCapacity] = useState<number>(0); React.useEffect(() => { if (isOpen) { const initialData = product ? { ...product } : getInitialFormState(); if (!initialData.olfactoryPyramid) initialData.olfactoryPyramid = { head: '', heart: '', base: '' }; if (!initialData.brand) initialData.brand = ''; if (!initialData.code) initialData.code = ''; if (!initialData.additionalImages) initialData.additionalImages = []; if (!initialData.essenceCode) initialData.essenceCode = ''; setFormData(initialData); setInitialCapacity(0); } }, [product, isOpen, categories]); const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { const { name, value, type } = e.target; setFormData({ ...formData, [name]: type === 'number' ? (parseFloat(value) || 0) : value }); }; const handlePyramidChange = (field: 'head'|'heart'|'base', value: string) => { setFormData(prev => ({ ...prev, olfactoryPyramid: { ...prev.olfactoryPyramid!, [field]: value } })); }; const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isGallery: boolean = false) => { if (e.target.files) { Array.from(e.target.files).forEach((file: File) => { const reader = new FileReader(); reader.onloadend = () => { const result = reader.result as string; if (isGallery) { setFormData(prev => ({...prev, additionalImages: [...(prev.additionalImages || []), result] })); } else { setFormData(prev => ({...prev, imageUrl: result })); } }; reader.readAsDataURL(file); }); } }; const removeGalleryImage = (index: number) => { setFormData(prev => ({ ...prev, additionalImages: prev.additionalImages?.filter((_, i) => i !== index) })); }; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (product) { dispatch({ type: 'UPDATE_PRODUCT', payload: { ...formData, id: product.id } }); } else { dispatch({ type: 'ADD_PRODUCT', payload: { ...formData, initialCapacity } }); } onClose(); }; const categoryOptions = useMemo(() => { return categories.map(c => { let label = c.name; if (c.parentId) { const parent = categories.find(p => p.id === c.parentId); if(parent) label = `${parent.name} > ${c.name}`; } return { value: c.name, label, isComponent: c.isComponent }; }).sort((a,b) => a.label.localeCompare(b.label)); }, [categories]); return ( <Modal isOpen={isOpen} onClose={onClose} title={product ? "Modifica Prodotto Base" : "Nuovo Prodotto Base"}> <form onSubmit={handleSubmit} className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> <div className="md:col-span-1"> <Input label="Codice Prodotto" name="code" value={formData.code || ''} onChange={handleChange} placeholder="Es. PR-001" /> </div> <div className="md:col-span-3"> <Input label="Nome Prodotto" name="name" value={formData.name} onChange={handleChange} required /> </div> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Input label="Brand / Marchio" name="brand" value={formData.brand || ''} onChange={handleChange} placeholder="Es. Profumeria Pro" /> {!product && ( <Input label={`Capacità Formato Base (${formData.unit})`} type="number" step="0.1" value={initialCapacity || ''} onChange={e => setInitialCapacity(parseFloat(e.target.value))} placeholder="Es. 50 (crea variante '50ml')" /> )} </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div> <label className="block text-sm font-medium mb-1">Categoria</label> <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"> {categoryOptions.map(cat => ( <option key={cat.value} value={cat.value}> {cat.label} {cat.isComponent ? '(Comp.)' : ''} </option> ))} </select> </div> <div> <label className="block text-sm font-medium mb-1">Unità di Misura</label> <select name="unit" value={formData.unit} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"> <option value="pz">pz</option><option value="ml">ml</option><option value="l">l</option> <option value="g">g</option><option value="kg">kg</option> </select> </div> </div> <div> <label className="block text-sm font-medium mb-1">Descrizione Commerciale</label> <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600" placeholder="Descrivi il product..."></textarea> </div> <div className="border p-3 rounded bg-gray-50 dark:bg-gray-700/50"> <h4 className="font-semibold text-sm mb-2">Piramide Olfattiva</h4> <div className="space-y-2"> <Input label="Note di Testa" value={formData.olfactoryPyramid?.head || ''} onChange={e => handlePyramidChange('head', e.target.value)} placeholder="Es. Bergamotto, Limone" /> <Input label="Note di Cuore" value={formData.olfactoryPyramid?.heart || ''} onChange={e => handlePyramidChange('heart', e.target.value)} placeholder="Es. Rosa, Gelsomino" /> <Input label="Note di Fondo" value={formData.olfactoryPyramid?.base || ''} onChange={e => handlePyramidChange('base', e.target.value)} placeholder="Es. Legno di Cedro, Muschio" /> </div> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded border dark:border-gray-600"> <Input label="Codice Essenza" name="essenceCode" value={formData.essenceCode || ''} onChange={handleChange} placeholder="Es. ESS-1234" /> </div> <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded border dark:border-gray-600 relative"> <Input label="Limite IFRA (%)" name="ifraLimit" type="number" step="0.01" value={formData.ifraLimit || ''} onChange={e => setFormData({...formData, ifraLimit: e.target.value === '' ? undefined : parseFloat(e.target.value)})} placeholder="0.00" /> <span className="absolute right-4 top-9 text-gray-500">%</span> </div> </div> <div className="space-y-4"> <div> <label className="block text-sm font-medium mb-1">Foto Copertina</label> <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, false)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-gray-700 dark:file:text-gray-300"/> {formData.imageUrl && ( <div className="mt-2 relative inline-block"> <img src={formData.imageUrl} alt="Anteprima Copertina" className="h-24 w-24 object-cover rounded-md shadow-sm" /> <Button variant="ghost" size="sm" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 h-6 w-6 flex items-center justify-center" onClick={() => setFormData(prev => ({...prev, imageUrl: ''}))}><X size={12}/></Button> </div> )} </div> <div> <label className="block text-sm font-medium mb-1">Galleria / Altre Foto</label> <input type="file" accept="image/*" multiple onChange={(e) => handleImageChange(e, true)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-gray-700 dark:file:text-gray-300"/> <div className="mt-2 flex flex-wrap gap-2"> {formData.additionalImages?.map((img, idx) => ( <div key={idx} className="relative inline-block"> <img src={img} alt={`Gallery ${idx}`} className="h-16 w-16 object-cover rounded shadow-sm" /> <button type="button" onClick={() => removeGalleryImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10} /></button> </div> ))} </div> </div> </div> <div className="flex justify-end space-x-2 pt-4"> <Button type="button" variant="secondary" onClick={onClose}>Annulla</Button> <Button type="submit">Salva</Button> </div> </form> </Modal> ); };
const ProductBaseManagerModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => { const { state, settings, dispatch } = useAppContext(); const data = state[settings.currentYear]; const [isProductModalOpen, setProductModalOpen] = useState(false); const [editingProduct, setEditingProduct] = useState<Product | null>(null); const [isVariantModalOpen, setVariantModalOpen] = useState(false); const [managingVariantsFor, setManagingVariantsFor] = useState<Product | null>(null); const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null); const [searchTerm, setSearchTerm] = useState(''); const openProductModal = (product: Product | null = null) => { setEditingProduct(product); setProductModalOpen(true); }; const openVariantModal = (product: Product) => { setManagingVariantsFor(product); setVariantModalOpen(true); }; const handleProductFormClose = () => { setProductModalOpen(false); setEditingProduct(null); }; const handleVariantModalClose = () => { setVariantModalOpen(false); setManagingVariantsFor(null); }; const filteredProducts = useMemo(() => { return data.products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) || p.code?.toLowerCase().includes(searchTerm.toLowerCase())); }, [data.products, searchTerm]); return ( <Modal isOpen={isOpen} onClose={onClose} title="Gestione Prodotti Base"> <div className="flex flex-wrap items-center justify-between mb-4 gap-4"> <Input placeholder="Cerca per nome, brand o codice..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-xs" /> <Button onClick={() => openProductModal()}><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Prodotto Base</Button> </div> <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col max-h-[65vh]"> <div className="overflow-auto relative"> <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"> <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-20"> <tr> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Foto</th> <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Codice</th> <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Brand</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nome Prodotto</th> <th scope="col" className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Categoria</th> <th scope="col" className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unità</th> <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky right-0 z-20 bg-gray-50 dark:bg-gray-700 shadow-[-4px_0px_6px_-2px_rgba(0,0,0,0.1)]">Azioni</th> </tr> </thead> <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"> {filteredProducts.map(p => ( <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"> <td className="px-6 py-4 whitespace-nowrap"> {p.imageUrl ? ( <img src={p.imageUrl} alt={p.name} className="h-10 w-10 object-cover rounded cursor-pointer" onClick={() => setViewingImageUrl(p.imageUrl)} /> ) : ( <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center"> <ImageIcon size={20} className="text-gray-400" /> </div> )} </td> <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{p.code || '-'}</td> <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600 dark:text-gray-400">{p.brand || '-'}</td> <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</td> <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.category}</td> <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.unit}</td> <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 text-center sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0px_6px_-2px_rgba(0,0,0,0.1)]"> <div className="flex justify-center space-x-1"> <Button variant="secondary" size="sm" onClick={() => openVariantModal(p)} title="Gestisci Varianti"><Layers size={16} /></Button> <Button variant="ghost" size="sm" onClick={() => openProductModal(p)} title="Modifica"><Edit size={16} /></Button> <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {if(confirm("Eliminando il prodotto base eliminerai anche TUTTE le sue varianti e i relativi lotti. Continuare?")) dispatch({type:'DELETE_PRODUCT', payload: p.id})}} title="Elimina"><Trash2 size={16} /></Button> </div> </td> </tr> ))} </tbody> </table> </div> </div> {isProductModalOpen && <ProductForm isOpen={isProductModalOpen} onClose={handleProductFormClose} product={editingProduct} />} {isVariantModalOpen && <VariantManagerModal isOpen={isVariantModalOpen} onClose={handleVariantModalClose} product={managingVariantsFor} />} <Modal isOpen={!!viewingImageUrl} onClose={() => setViewingImageUrl(null)} title="Visualizza Immagine"> {viewingImageUrl && <img src={viewingImageUrl} alt="Immagine Prodotto" className="max-w-full max-h-[70vh] mx-auto" />} </Modal> </Modal> ); };
const EditVariantModal: React.FC<{ isOpen: boolean, onClose: () => void, variant: ProductVariant | null }> = ({ isOpen, onClose, variant }) => { const { dispatch } = useAppContext(); if (!variant) return null; const handleSave = (variantData: Omit<ProductVariant, 'id' | 'quantity' | 'productId'>) => { dispatch({ type: 'UPDATE_VARIANT', payload: { ...variantData, id: variant.id, productId: variant.productId } }); onClose(); }; return ( <Modal isOpen={isOpen} onClose={onClose} title={`Modifica Variante`}> <VariantForm variant={variant} onSave={handleSave} onCancel={onClose} /> </Modal> ); };
const BatchDetailModal: React.FC<{ isOpen: boolean, onClose: () => void, variant: any | null }> = ({ isOpen, onClose, variant }) => { const { state, settings } = useAppContext(); const batches = useMemo(() => { if (!variant) return []; return state[settings.currentYear].inventoryBatches .filter(b => b.variantId === variant.id) .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }, [variant, state, settings.currentYear]); if (!variant) return null; return ( <Modal isOpen={isOpen} onClose={onClose} title={`Dettaglio Lotti per: ${variant.productName} - ${variant.name}`}> <div className="max-h-[60vh] overflow-y-auto"> <Table headers={["Lotto", "Scadenza", "Qtà Attuale", "Qtà Iniziale", "Stato", "Macerazione", "Origine"]}> {batches.map(batch => { let origin = "Sconosciuta"; if (batch.stockLoadId) { const stockLoad = state[settings.currentYear].stockLoads.find(sl => sl.id === batch.stockLoadId); if (stockLoad) { const supplier = state[settings.currentYear].suppliers.find(s => s.id === stockLoad.supplierId); origin = `Carico (${supplier?.name || 'Deposito / Interno'})`; } else { origin = 'Carico eliminato'; } } else if (batch.productionId) { origin = `Produzione`; } let statusBadge = <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Disponibile</span>; let macerationInfo = <span className="text-gray-400 text-xs">-</span>; if (batch.status === 'macerating') { statusBadge = <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs flex items-center w-fit"><Clock size={12} className="mr-1"/> Macerazione</span>; if (batch.macerationEndDate) { const end = new Date(batch.macerationEndDate); const today = new Date(); const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24)); macerationInfo = <span className="text-amber-600 text-xs font-semibold">In corso ({daysLeft > 0 ? daysLeft : 0} gg rimasti)</span>; } } else if (batch.status === 'available') { if (batch.actualMacerationDays !== undefined) { macerationInfo = <span className="text-green-600 text-xs font-bold">Completata ({batch.actualMacerationDays} gg)</span>; } else if (batch.productionId) { macerationInfo = <span className="text-gray-500 text-xs">Immediata / N.D.</span>; } } return ( <tr key={batch.id}> <td className="px-6 py-4 text-sm font-mono">{batch.batchNumber || '-'}</td> <td className="px-6 py-4 text-sm">{batch.expirationDate ? new Date(batch.expirationDate).toLocaleDateString() : '-'}</td> <td className="px-6 py-4 text-sm font-bold">{batch.currentQuantity}</td> <td className="px-6 py-4 text-sm">{batch.initialQuantity}</td> <td className="px-6 py-4 text-sm">{statusBadge}</td> <td className="px-6 py-4 text-sm">{macerationInfo}</td> <td className="px-6 py-4 text-sm">{origin}</td> </tr> ); })} </Table> {batches.length === 0 && <p className="text-center p-4">Nessun lotto presente per questa variante.</p>} </div> </Modal> ); };
const InventoryView: React.FC = () => { const { state, settings, dispatch } = useAppContext(); const { products, productVariants, categories, inventoryBatches } = state[settings.currentYear]; const [isProductBaseModalOpen, setProductBaseModalOpen] = useState(false); const [isCategoryModalOpen, setCategoryModalOpen] = useState(false); const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null); const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null); const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null); const [batchDetailVariant, setBatchDetailVariant] = useState<any | null>(null); const [isPrintModalOpen, setPrintModalOpen] = useState(false); const [searchTerm, setSearchTerm] = useState(''); const [selectedCategory, setSelectedCategory] = useState('all'); const [sortConfig, setSortConfig] = useState<{ key: 'quantity'; direction: 'ascending' | 'descending' }>({ key: 'quantity', direction: 'descending' }); const variantStats = useMemo(() => { const stats = new Map<string, { total: number, available: number, macerating: number }>(); inventoryBatches.forEach(batch => { const current = stats.get(batch.variantId) || { total: 0, available: 0, macerating: 0 }; current.total += batch.currentQuantity; if (batch.status === 'available') current.available += batch.currentQuantity; if (batch.status === 'macerating') current.macerating += batch.currentQuantity; stats.set(batch.variantId, current); }); return stats; }, [inventoryBatches]); const displayVariants = useMemo(() => { let variants = productVariants.map(variant => { const product = products.find(p => p.id === variant.productId); const stats = variantStats.get(variant.id) || { total: 0, available: 0, macerating: 0 }; return { ...variant, productName: product?.name || 'N/A', brand: product?.brand || '', category: product?.category || 'N/A', imageUrl: product?.imageUrl, quantity: stats.total, availableQuantity: stats.available, maceratingQuantity: stats.macerating }; }); if (selectedCategory !== 'all') { variants = variants.filter(v => v.category === selectedCategory); } if (searchTerm) { const lowercasedFilter = searchTerm.toLowerCase(); variants = variants.filter(v => v.productName.toLowerCase().includes(lowercasedFilter) || v.name.toLowerCase().includes(lowercasedFilter) || v.brand.toLowerCase().includes(lowercasedFilter) ); } if (sortConfig) { variants.sort((a, b) => { if (a[sortConfig.key] < b[sortConfig.key]) { return sortConfig.direction === 'ascending' ? -1 : 1; } if (a[sortConfig.key] > b[sortConfig.key]) { return sortConfig.direction === 'ascending' ? 1 : -1; } return 0; }); } return variants; }, [productVariants, products, selectedCategory, searchTerm, sortConfig, variantStats]); const handleSort = () => { setSortConfig(prev => ({ key: 'quantity', direction: prev.direction === 'ascending' ? 'descending' : 'ascending' })); }; const openEditModal = (variant: ProductVariant) => { setEditingVariant(variant); }; const openDeleteDialog = (variantId: string) => { setDeletingVariantId(variantId); }; const confirmDelete = () => { if(deletingVariantId) { dispatch({ type: 'DELETE_VARIANT', payload: deletingVariantId }); } setDeletingVariantId(null); }; return ( <Card title="Giacenze / Magazzino"> <div className="flex flex-wrap items-center justify-between mb-4 gap-4"> <div className="flex flex-wrap items-center gap-4 w-full md:w-auto"> <div className="relative w-full md:w-64"> <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /> <Input placeholder="Filtra rapido (Brand, Nome, Variante)" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 w-full" /> </div> <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="block w-full md:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-800"> <option value="all">Tutte le categorie</option> {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)} </select> </div> <div className="flex items-center space-x-2"> <Button variant="secondary" onClick={() => setPrintModalOpen(true)}>Stampa/Esporta Giacenze</Button> <Button variant="secondary" onClick={() => setCategoryModalOpen(true)}>Gestisci Categorie</Button> <Button onClick={() => setProductBaseModalOpen(true)}>Gestisci Prodotti Base</Button> </div> </div> <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col max-h-[70vh]"> <div className="overflow-auto relative"> <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"> <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-20"> <tr> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Foto</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Brand</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Prodotto</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Variante</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Categoria</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"> <Button variant="ghost" size="sm" onClick={handleSort} className="flex items-center -ml-3"> Quantità Totale <ArrowUpDown size={14} className="ml-1" /> </Button> </th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stato Giacenza</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Posizione</th> <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky right-0 z-20 bg-gray-50 dark:bg-gray-700 shadow-[-4px_0px_6px_-2px_rgba(0,0,0,0.1)]">Azioni</th> </tr> </thead> <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"> {displayVariants.map(v => ( <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"> <td className="px-6 py-4"> {v.imageUrl ? ( <img src={v.imageUrl} alt={v.productName} className="h-12 w-12 object-cover rounded cursor-pointer" onClick={() => setViewingImageUrl(v.imageUrl)} /> ) : ( <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center"> <ImageIcon size={24} className="text-gray-400" /> </div> )} </td> <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">{v.brand}</td> <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{v.productName}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{v.name}</td> <td className="px-6 py-4 whitespace-nowrap text-sm">{v.category}</td> <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{v.quantity}</td> <td className="px-6 py-4 whitespace-nowrap text-sm"> <div className="flex flex-col text-xs"> <span className="text-green-600 font-semibold">Disp: {v.availableQuantity}</span> {v.maceratingQuantity > 0 && ( <span className="text-amber-600 font-semibold flex items-center mt-1"> <Clock size={10} className="mr-1"/> Maceraz: {v.maceratingQuantity} </span> )} </div> </td> <td className="px-6 py-4 whitespace-nowrap text-sm">{v.location || '-'}</td> <td className="px-6 py-4 whitespace-nowrap text-sm space-x-1 text-center sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0px_6px_-2px_rgba(0,0,0,0.1)]"> <div className="flex justify-center space-x-1"> <Button variant="ghost" size="sm" onClick={() => setBatchDetailVariant(v)} title="Dettaglio Lotti"><ListTree size={16} /></Button> <Button variant="ghost" size="sm" onClick={() => openEditModal(v)} title="Modifica Variante"><Edit size={16} /></Button> <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(v.id)} title="Elimina Variante"><Trash2 size={16} /></Button> </div> </td> </tr> ))} </tbody> </table> </div> </div> {displayVariants.length === 0 && <p className="text-center text-gray-500 mt-4">Nessuna variante trovata. Prova a modificare i filtri o ad aggiungere nuovi prodotti.</p>} <ProductBaseManagerModal isOpen={isProductBaseModalOpen} onClose={() => setProductBaseModalOpen(false)} /> <CategoryManagerModal isOpen={isCategoryModalOpen} onClose={() => setCategoryModalOpen(false)} /> <EditVariantModal isOpen={!!editingVariant} onClose={() => setEditingVariant(null)} variant={editingVariant} /> <BatchDetailModal isOpen={!!batchDetailVariant} onClose={() => setBatchDetailVariant(null)} variant={batchDetailVariant} /> <ConfirmDialog isOpen={!!deletingVariantId} onClose={() => setDeletingVariantId(null)} onConfirm={confirmDelete} title="Conferma Eliminazione" message="Sei sicuro di voler eliminare questa variante? Verranno eliminati anche tutti i lotti in magazzino." /> <Modal isOpen={!!viewingImageUrl} onClose={() => setViewingImageUrl(null)} title="Visualizza Immagine"> {viewingImageUrl && <img src={viewingImageUrl} alt="Immagine Prodotto" className="max-w-full max-h-[70vh] mx-auto" />} </Modal> <PrintModal isOpen={isPrintModalOpen} onClose={() => setPrintModalOpen(false)} title="Stampa Report Giacenze" documentName={`report-giacenze-${new Date().toISOString().split('T')[0]}`} > <PrintableInventory variants={displayVariants} companyInfo={settings.companyInfo} /> </PrintModal> </Card> ); };

interface ProductDetailCatalogModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    variants: ProductVariant[];
}

const ProductDetailCatalogModal: React.FC<ProductDetailCatalogModalProps> = ({ isOpen, onClose, product, variants }) => { const { state, settings } = useAppContext(); const batches = state[settings.currentYear].inventoryBatches; const [activeImage, setActiveImage] = useState<string | null>(product.imageUrl || null); React.useEffect(() => { setActiveImage(product.imageUrl || null); }, [product]); const galleryImages = useMemo(() => { const imgs = []; if (product.imageUrl) imgs.push({ src: product.imageUrl, type: 'Copertina' }); if (product.additionalImages) product.additionalImages.forEach(img => imgs.push({ src: img, type: 'Galleria' })); variants.forEach(v => { if (v.imageUrl) imgs.push({ src: v.imageUrl, type: `Variante ${v.name}` }); }); return imgs; }, [product, variants]); const getBatchInfo = (variantId: string) => { const variantBatches = batches.filter(b => b.variantId === variantId && b.currentQuantity > 0); if (variantBatches.length === 0) return { status: 'Non disponibile', color: 'text-gray-400' }; const macerating = variantBatches.some(b => b.status === 'macerating'); if (macerating) { const minDate = variantBatches .filter(b => b.status === 'macerating' && b.macerationEndDate) .map(b => new Date(b.macerationEndDate!).getTime()) .sort()[0]; const readyDate = minDate ? new Date(minDate).toLocaleDateString() : 'N/D'; return { status: `In arrivo (Macerazione termina il ${readyDate})`, color: 'text-amber-600' }; } return { status: 'Disponibile', color: 'text-green-600' }; }; return ( <Modal isOpen={isOpen} onClose={onClose} title={product.name}> <div className="flex flex-col md:flex-row gap-6"> <div className="w-full md:w-1/3"> <div className="w-full h-64 md:h-80 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden mb-2"> {activeImage ? ( <img src={activeImage} alt={product.name} className="w-full h-full object-contain" /> ) : ( <ImageIcon size={64} /> )} </div> {galleryImages.length > 1 && ( <div className="flex overflow-x-auto space-x-2 pb-2"> {galleryImages.map((img, idx) => ( <img key={idx} src={img.src} alt={img.type} className={`h-16 w-16 object-cover rounded cursor-pointer border-2 ${activeImage === img.src ? 'border-primary-500' : 'border-transparent'}`} onClick={() => setActiveImage(img.src)} title={img.type} /> ))} </div> )} </div> <div className="w-full md:w-2/3 space-y-6"> <div> <div className="flex justify-between items-start"> <div> {product.brand && <span className="text-sm font-bold text-gray-500 uppercase block">{product.brand}</span>} <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{product.name}</h3> </div> {product.code && <span className="text-xs font-mono text-gray-500 border px-2 py-1 rounded bg-gray-50 dark:bg-gray-800">#{product.code}</span>} </div> <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full mt-2">{product.category}</span> </div> {product.description && ( <p className="text-gray-600 dark:text-gray-300 italic">{product.description}</p> )} {product.olfactoryPyramid && (product.olfactoryPyramid.head || product.olfactoryPyramid.heart || product.olfactoryPyramid.base) && ( <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600"> <h4 className="font-semibold mb-2 flex items-center text-sm uppercase text-gray-500"><Layers size={14} className="mr-2"/> Piramide Olfattiva</h4> <div className="space-y-2 text-sm"> {product.olfactoryPyramid.head && ( <div className="flex"><span className="w-16 font-bold text-gray-500">Testa:</span> <span>{product.olfactoryPyramid.head}</span></div> )} {product.olfactoryPyramid.heart && ( <div className="flex"><span className="w-16 font-bold text-gray-500">Cuore:</span> <span>{product.olfactoryPyramid.heart}</span></div> )} {product.olfactoryPyramid.base && ( <div className="flex"><span className="w-16 font-bold text-gray-500">Fondo:</span> <span>{product.olfactoryPyramid.base}</span></div> )} </div> </div> )} {(product.essenceCode || product.ifraLimit) && ( <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900 grid grid-cols-2 gap-4"> {product.essenceCode && ( <div> <h5 className="font-semibold text-xs uppercase text-blue-500 flex items-center mb-1"><FlaskConical size={12} className="mr-1"/> Codice Essenza</h5> <p className="font-mono text-sm">{product.essenceCode}</p> </div> )} {product.ifraLimit && ( <div> <h5 className="font-semibold text-xs uppercase text-blue-500 flex items-center mb-1"><Info size={12} className="mr-1"/> Limite IFRA</h5> <p className="font-bold text-sm">{product.ifraLimit.toFixed(2)}%</p> </div> )} </div> )} <div> <h4 className="font-semibold mb-2">Formati Disponibili</h4> <Table headers={["Formato", "Capacità", "Prezzo", "Disponibilità"]}> {variants.map(v => { const info = getBatchInfo(v.id); return ( <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => { if(v.imageUrl) setActiveImage(v.imageUrl) }}> <td className="px-4 py-2 font-medium">{v.name}</td> <td className="px-4 py-2 text-xs text-gray-500">{v.capacity ? `${v.capacity} ${product.unit}` : '-'}</td> <td className="px-4 py-2">€{v.salePrice.toFixed(2)}</td> <td className={`px-4 py-2 font-bold text-xs ${info.color}`}>{info.status}</td> </tr> ); })} </Table> {variants.length === 0 && <p className="text-gray-500 italic">Nessun formato disponibile per la vendita.</p>} <p className="text-xs text-gray-400 mt-2">* Clicca su un formato per vedere la foto specifica (se presente).</p> </div> </div> </div> <div className="flex justify-end pt-6 mt-4 border-t dark:border-gray-700"> <Button variant="secondary" onClick={onClose}>Chiudi</Button> </div> </Modal> ); };
const CatalogView: React.FC = () => { const { state, settings } = useAppContext(); const { products, productVariants, categories } = state[settings.currentYear]; const [selectedCategory, setSelectedCategory] = useState('all'); const [searchTerm, setSearchTerm] = useState(''); const [selectedProduct, setSelectedProduct] = useState<Product | null>(null); const [isPrintModalOpen, setPrintModalOpen] = useState(false); const salesCategories = useMemo(() => categories.filter(c => !c.isComponent), [categories]); const catalogProducts = useMemo(() => { let filtered = products.filter(p => { const cat = categories.find(c => c.name === p.category); return cat && !cat.isComponent; }); if (selectedCategory !== 'all') { filtered = filtered.filter(p => p.category === selectedCategory); } if (searchTerm) { const lowercased = searchTerm.toLowerCase(); filtered = filtered.filter(p => p.name.toLowerCase().includes(lowercased) || p.brand?.toLowerCase().includes(lowercased) || p.code?.toLowerCase().includes(lowercased)); } return filtered.map(p => ({ ...p, variants: productVariants.filter(v => v.productId === p.id) })); }, [products, categories, selectedCategory, searchTerm, productVariants]); return ( <Card title="Catalogo Prodotti"> <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4"> <div className="flex gap-4 w-full md:w-auto"> <Input placeholder="Cerca prodotto, brand o codice..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-xs" /> <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="block w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-800" > <option value="all">Tutti i Prodotti</option> {salesCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)} </select> </div> <Button onClick={() => setPrintModalOpen(true)} variant="secondary"><Printer className="mr-2 h-4 w-4"/> Stampa Catalogo</Button> </div> <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"> {catalogProducts.map(product => { const minPrice = product.variants.length > 0 ? Math.min(...product.variants.map(v => v.salePrice)) : 0; const maxPrice = product.variants.length > 0 ? Math.max(...product.variants.map(v => v.salePrice)) : 0; const priceString = minPrice === maxPrice ? `€${minPrice.toFixed(2)}` : `€${minPrice.toFixed(2)} - €${maxPrice.toFixed(2)}`; return ( <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col group" > <div className="h-48 w-full bg-gray-100 dark:bg-gray-700 relative overflow-hidden"> {product.imageUrl ? ( <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> ) : ( <div className="flex items-center justify-center h-full text-gray-400"> <ImageIcon size={48} /> </div> )} <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-900/90 px-2 py-1 rounded text-xs font-bold shadow-sm"> {product.category} </div> {(product.additionalImages?.length || 0) > 0 && ( <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center"> <Layers size={10} className="mr-1"/> +{product.additionalImages!.length} </div> )} </div> <div className="p-4 flex-grow flex flex-col"> <div className="flex justify-between items-start mb-1"> {product.brand && <span className="text-xs font-bold text-gray-500 uppercase">{product.brand}</span>} {product.code && <span className="text-[10px] font-mono text-gray-400 border px-1 rounded">#{product.code}</span>} </div> <h3 className="font-bold text-lg mb-1 text-gray-800 dark:text-gray-100 truncate">{product.name}</h3> <p className="text-primary-600 font-semibold mt-auto">{product.variants.length > 0 ? priceString : 'Non disponibile'}</p> </div> </div> ); })} </div> {catalogProducts.length === 0 && ( <div className="text-center py-12 text-gray-500"> <PackageIcon size={48} className="mx-auto mb-4 opacity-30" /> <p>Nessun prodotto trovato nel catalogo.</p> <p className="text-sm">Assicurati di aver creato prodotti in categorie non marcate come "Componente".</p> </div> )} {selectedProduct && ( <ProductDetailCatalogModal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} product={selectedProduct} variants={productVariants.filter(v => v.productId === selectedProduct.id)} /> )} <PrintModal isOpen={isPrintModalOpen} onClose={() => setPrintModalOpen(false)} title="Anteprima di Stampa Catalogo" documentName={`catalogo_${new Date().toISOString().split('T')[0]}`}> <PrintableCatalog products={catalogProducts} companyInfo={settings.companyInfo} title={selectedCategory === 'all' ? 'Catalogo Generale' : `Catalogo ${selectedCategory}`} /> </PrintModal> </Card> ); };
const ProductionView: React.FC = () => { const { state, settings, dispatch } = useAppContext(); const { products, productVariants, categories, inventoryBatches } = state[settings.currentYear]; const [isProductSelectorOpen, setProductSelectorOpen] = useState(false); const [formData, setFormData] = useState<{ date: string; finishedProductId: string; quantityProduced: number; macerationDays: number; components: { variantId: string; quantityUsed: number; weightInGrams?: number }[]; productionType: 'finished_sale' | 'bulk_refill'; colorCode: string; colorDrops: number; enableColor: boolean; targetPercentage: number; }>({ date: new Date().toISOString().split('T')[0], finishedProductId: '', quantityProduced: 1, macerationDays: 30, components: [{ variantId: '', quantityUsed: 1, weightInGrams: undefined }], productionType: 'finished_sale', colorCode: '#ffffff', colorDrops: 0, enableColor: false, targetPercentage: 20 }); const useVariantAvailableQuantity = useCallback((variantId: string) => { return inventoryBatches .filter(b => b.variantId === variantId && b.status === 'available') .reduce((sum, b) => sum + b.currentQuantity, 0); }, [inventoryBatches]); const getVariantDisplayName = (variant: ProductVariant) => { const product = products.find(p => p.id === variant.productId); return `${product?.name || 'Prodotto Sconosciuto'} - ${variant.name}`; }; const getProductUnit = (variantId: string) => { const variant = productVariants.find(v => v.id === variantId); const product = products.find(p => p.id === variant?.productId); return product?.unit || 'pz'; }; 

// Updated Logic for finished goods: Include categories where isFinishedProduct is true (or undefined/null fallback based on isComponent)
const finishedGoodVariants = useMemo(() => { 
    const finishedCategoryNames = categories.filter(c => {
        // If flag is explicitly set, use it.
        if (c.isFinishedProduct !== undefined) return c.isFinishedProduct;
        // Fallback: if not component, it is finished product
        return !c.isComponent;
    }).map(c => c.name);
    
    const finishedProductIds = products.filter(p => finishedCategoryNames.includes(p.category)).map(p => p.id);
    return productVariants.filter(v => finishedProductIds.includes(v.productId)); 
}, [products, productVariants, categories]); 

// Updated Logic for components: Include categories where isComponent is true.
const availableComponents = useMemo(() => { 
    // Filter variants that belong to "Component" categories AND have stock
    return productVariants.filter(v => {
        const product = products.find(p => p.id === v.productId);
        if (!product) return false;
        
        const category = categories.find(c => c.name === product.category);
        if (!category || !category.isComponent) return false;

        return useVariantAvailableQuantity(v.id) > 0;
    }); 
}, [productVariants, products, categories, useVariantAvailableQuantity]); 

// --- INFO PRODOTTO SELEZIONATO (NUOVO) ---
const selectedVariantForProduction = productVariants.find(v => v.id === formData.finishedProductId);
const selectedProductForProduction = products.find(p => p.id === selectedVariantForProduction?.productId);


const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const { name, value, type } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value })); }; const handleAddComponent = () => { setFormData(prev => ({ ...prev, components: [...prev.components, { variantId: '', quantityUsed: 1 }] })); }; const handleBulkSelectComponents = (variantIds: string[]) => { const newComponents = variantIds.map(vid => ({ variantId: vid, quantityUsed: 1, weightInGrams: undefined })); setFormData(prev => ({ ...prev, components: [...prev.components, ...newComponents] })); }; const handleRemoveComponent = (index: number) => { setFormData(prev => ({ ...prev, components: prev.components.filter((_, i) => i !== index) })); }; const handleComponentChange = (index: number, field: 'variantId' | 'quantityUsed' | 'weightInGrams', value: string | number) => { const newComponents = [...formData.components]; newComponents[index] = { ...newComponents[index], [field]: value }; setFormData(prev => ({ ...prev, components: newComponents })); }; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!formData.finishedProductId || formData.quantityProduced <= 0 || formData.components.length === 0 || formData.components.some(c => !c.variantId || c.quantityUsed <= 0)) { alert("Compila tutti i campi obbligatori: prodotto finito, quantità e componenti."); return; } dispatch({ type: 'ADD_PRODUCTION', payload: { ...formData, colorCode: formData.enableColor ? formData.colorCode : undefined, colorDrops: formData.enableColor ? formData.colorDrops : undefined, enableColor: undefined } as any }); alert("Produzione registrata con successo!"); setFormData({ date: formData.date, finishedProductId: '', quantityProduced: 1, macerationDays: 30, components: [{ variantId: '', quantityUsed: 1, weightInGrams: undefined }], productionType: 'finished_sale', colorCode: '#ffffff', colorDrops: 0, enableColor: false, targetPercentage: 20 }); };

const suggestedEssence = (formData.quantityProduced * (formData.targetPercentage / 100));
const suggestedAlcohol = formData.quantityProduced - suggestedEssence;

return ( <Card title="Registra Nuova Produzione"> <form onSubmit={handleSubmit} className="space-y-8"> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> <div className="space-y-2"> <label className="block text-sm font-medium">Data Produzione</label> <Input name="date" type="date" value={formData.date} onChange={handleFormChange} required /> </div> <div className="space-y-2"> <label className="block text-sm font-medium">Tipo Produzione</label> <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1"> <button type="button" onClick={() => setFormData(p => ({...p, productionType: 'finished_sale'}))} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${formData.productionType === 'finished_sale' ? 'bg-white dark:bg-gray-600 shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`} > <PackageIcon className="inline mr-1 h-4 w-4" /> Prodotto Finito (Vendita) </button> <button type="button" onClick={() => setFormData(p => ({...p, productionType: 'bulk_refill'}))} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${formData.productionType === 'bulk_refill' ? 'bg-white dark:bg-gray-600 shadow text-amber-600' : 'text-gray-500 hover:text-gray-700'}`} > <Beaker className="inline mr-1 h-4 w-4" /> Semilavorato (Sfuso) </button> </div> <p className="text-xs text-gray-500 mt-1"> {formData.productionType === 'finished_sale' ? 'Es: Bottiglia 50ml pronta per lo scaffale.' : 'Es: Tanica da 2 litri per riempimenti futuri.'} </p> </div> <div className="space-y-2"> <label className="block text-sm font-medium">Articolo da Produrre</label> <select name="finishedProductId" value={formData.finishedProductId} onChange={handleFormChange} required className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"> <option value="">Seleziona prodotto...</option> {finishedGoodVariants.map(v => <option key={v.id} value={v.id}>{getVariantDisplayName(v)}</option>)} </select> </div> <div className="space-y-2"> <label className="block text-sm font-medium">Quantità Prodotta</label> <div className="flex items-center"> <Input name="quantityProduced" type="number" min="1" value={formData.quantityProduced} onChange={handleFormChange} required className="rounded-r-none" /> <span className="bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 px-3 py-2 rounded-r-md text-gray-500"> {formData.finishedProductId ? getProductUnit(formData.finishedProductId) : 'unità'} </span> </div> </div> <div className="space-y-2"> <label className="block text-sm font-medium">Concentrazione (%)</label> <div className="flex items-center"> <Input name="targetPercentage" type="number" min="0" max="100" step="0.1" value={formData.targetPercentage} onChange={handleFormChange} required className="rounded-r-none" /> <span className="bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 px-3 py-2 rounded-r-md text-gray-500"> % </span> </div> {selectedProductForProduction?.ifraLimit && ( <p className="text-xs text-blue-600 mt-1 flex items-center"> <Info size={12} className="mr-1" /> Limite IFRA scheda prodotto: <strong>{selectedProductForProduction.ifraLimit}%</strong> </p> )} </div> </div> <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row gap-4 items-center justify-between text-sm"> <div className="flex items-center"> <Info className="mr-2 text-blue-600" size={20} /> <span className="text-blue-800 dark:text-blue-200 font-medium">Suggerimento Dosaggio ({formData.targetPercentage}%):</span> </div> <div className="flex gap-6"> <div> <span className="block text-xs text-gray-500 uppercase">Essenza Totale</span> <span className="font-bold text-lg">{suggestedEssence.toFixed(2)} {formData.finishedProductId ? getProductUnit(formData.finishedProductId) : 'unità'}</span> </div> <div> <span className="block text-xs text-gray-500 uppercase">Alcool/Solvente</span> <span className="font-bold text-lg">{suggestedAlcohol.toFixed(2)} {formData.finishedProductId ? getProductUnit(formData.finishedProductId) : 'unità'}</span> </div> </div> </div> <hr className="dark:border-gray-700" /> <div> <h4 className="text-lg font-semibold mb-4 flex items-center"><Layers className="mr-2" /> Ingredienti / Componenti</h4> <div className="space-y-3"> {formData.components.map((component, index) => { const stock = useVariantAvailableQuantity(component.variantId); const unit = component.variantId ? getProductUnit(component.variantId) : ''; const isLiquid = unit === 'ml' || unit === 'l'; const isStockLow = component.quantityUsed > stock; const percentOfTotal = formData.quantityProduced > 0 ? ((component.quantityUsed / formData.quantityProduced) * 100).toFixed(1) : '0.0'; return ( <div key={index} className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 relative"> <div className="flex-grow"> <label className="text-xs font-semibold text-gray-500 uppercase">Componente</label> <select value={component.variantId} onChange={e => handleComponentChange(index, 'variantId', e.target.value)} required className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" > <option value="">Seleziona ingrediente...</option> {availableComponents.map(v => <option key={v.id} value={v.id}>{getVariantDisplayName(v)} (Disp: {useVariantAvailableQuantity(v.id)} {getProductUnit(v.id)})</option>)} </select> </div> <div className="w-full md:w-32"> <label className="text-xs font-semibold text-gray-500 uppercase">Quantità</label> <div className="flex mt-1 items-center"> <input type="number" min="0.0001" step="0.0001" value={component.quantityUsed} onChange={e => handleComponentChange(index, 'quantityUsed', parseFloat(e.target.value) || 0)} className={`w-full p-2 border rounded-l dark:bg-gray-700 dark:border-gray-600" ${isStockLow ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`} /> <span className="inline-flex items-center px-3 rounded-r border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 text-sm"> {unit || '-'} </span> </div> <span className="text-xs text-blue-600 font-medium mt-1 block"> {percentOfTotal}% del totale </span> </div> {isLiquid && ( <div className="w-full md:w-32"> <label className="text-xs font-semibold text-gray-500 uppercase">Peso (Opz.)</label> <div className="flex mt-1"> <input type="number" min="0" step="0.01" value={component.weightInGrams || ''} placeholder="0" onChange={e => handleComponentChange(index, 'weightInGrams', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded-l dark:bg-gray-700 dark:border-gray-600" /> <span className="inline-flex items-center px-3 rounded-r border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 text-sm"> g </span> </div> </div> )} <div className="flex items-end pb-1"> <Button type="button" variant="ghost" className="text-red-500 hover:bg-red-100" onClick={() => handleRemoveComponent(index)}><Trash2 size={18} /></Button> </div> </div> ) })} <div className="flex gap-2"> <Button type="button" variant="secondary" onClick={handleAddComponent} className="flex-1 border-dashed border-2 border-gray-300 dark:border-gray-600"><PlusCircle size={16} className="mr-2" /> Aggiungi Riga Singola</Button> <Button type="button" variant="secondary" onClick={() => setProductSelectorOpen(true)} className="flex-1 border-dashed border-2 border-gray-300 dark:border-gray-600"><ListTree size={16} className="mr-2" /> Seleziona da Catalogo</Button> </div> </div> </div> <hr className="dark:border-gray-700" /> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700"> <div className="flex items-center justify-between mb-4"> <h4 className="font-semibold flex items-center"><Droplets className="mr-2 text-purple-500" /> Colorazione</h4> <label className="relative inline-flex items-center cursor-pointer"> <input type="checkbox" checked={formData.enableColor} onChange={e => setFormData(p => ({...p, enableColor: e.target.checked}))} className="sr-only peer" /> <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div> </label> </div> {formData.enableColor && ( <div className="grid grid-cols-2 gap-4 animate-fade-in"> <div> <label className="block text-xs font-semibold text-gray-500 mb-1">Colore</label> <div className="flex items-center space-x-2"> <input type="color" value={formData.colorCode} onChange={e => setFormData(p => ({...p, colorCode: e.target.value}))} className="h-10 w-10 p-0 border-0 rounded cursor-pointer" /> <span className="text-xs font-mono text-gray-500">{formData.colorCode}</span> </div> </div> <div> <label className="block text-xs font-semibold text-gray-500 mb-1">Quantità Gocce</label> <Input type="number" min="0" value={formData.colorDrops} onChange={e => setFormData(p => ({...p, colorDrops: parseFloat(e.target.value)}))} /> </div> </div> )} {!formData.enableColor && <p className="text-sm text-gray-500">Nessuna colorazione aggiuntiva.</p>} </div> <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg"> <div className="flex items-center mb-4"> <Wine className="text-amber-600 mr-2" size={20} /> <h4 className="font-semibold text-amber-800 dark:text-amber-200">Macerazione</h4> </div> <div className="flex items-center space-x-4"> <div className="w-full"> <Input label="Giorni di Riposo" name="macerationDays" type="number" min="0" value={formData.macerationDays} onChange={handleFormChange} /> </div> </div> <p className="text-xs text-gray-600 dark:text-gray-400 mt-2"> {formData.macerationDays > 0 ? `Disponibile dal: ${(() => { const d = new Date(formData.date); d.setDate(d.getDate() + formData.macerationDays); return d.toLocaleDateString(); })()}` : "Disponibile immediatamente." } </p> </div> </div> <div className="flex justify-end pt-4"> <Button type="submit" size="lg">Registra Produzione</Button> </div> </form> <ProductSelectorModal isOpen={isProductSelectorOpen} onClose={() => setProductSelectorOpen(false)} onConfirm={handleBulkSelectComponents} title="Seleziona Ingredienti" /> </Card> ); };
const CellarView: React.FC = () => { const { state, settings, dispatch } = useAppContext(); const { inventoryBatches, products, productVariants } = state[settings.currentYear]; const maceratingBatches = useMemo(() => { return inventoryBatches .filter(b => b.status === 'macerating' && b.currentQuantity > 0) .map(b => { const variant = productVariants.find(v => v.id === b.variantId); const product = products.find(p => p.id === variant?.productId); const endDate = b.macerationEndDate ? new Date(b.macerationEndDate) : new Date(); const today = new Date(); const isReady = today >= endDate; const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24)); return { ...b, productName: product?.name || 'N/A', variantName: variant?.name || 'N/A', daysLeft: daysLeft > 0 ? daysLeft : 0, isReady }; }) .sort((a, b) => (a.isReady === b.isReady) ? 0 : a.isReady ? -1 : 1); }, [inventoryBatches, products, productVariants]); const handleCompleteMaceration = (batchId: string) => { if (confirm("Confermi che questo lotto ha terminato la macerazione? Verrà reso disponibile per la vendita.")) { dispatch({ type: 'COMPLETE_MACERATION', payload: batchId }); } }; return ( <Card title="Cantina & Macerazione"> <p className="text-sm text-gray-600 dark:text-gray-400 mb-6"> Qui puoi monitorare i lotti in fase di macerazione. Quando un profumo è pronto, clicca su "Termina Macerazione" per renderlo disponibile alla vendita (imbottigliamento). </p> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> {maceratingBatches.map(batch => ( <div key={batch.id} className={`border rounded-lg p-4 shadow-sm relative overflow-hidden ${batch.isReady ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-white dark:bg-gray-800 border-gray-200'}`}> {batch.isReady && ( <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 font-bold rounded-bl">PRONTO</div> )} <div className="flex items-start justify-between mb-2"> <div> <h3 className="font-bold text-lg">{batch.productName}</h3> <p className="text-sm text-gray-500">{batch.variantName}</p> </div> <Wine className={batch.isReady ? "text-green-500" : "text-amber-500"} size={24} /> </div> <div className="space-y-2 text-sm mt-4"> <div className="flex justify-between"> <span className="text-gray-600 dark:text-gray-400">Lotto:</span> <span className="font-mono">{batch.batchNumber}</span> </div> <div className="flex justify-between"> <span className="text-gray-600 dark:text-gray-400">Quantità:</span> <span className="font-bold">{batch.currentQuantity}</span> </div> <div className="flex justify-between"> <span className="text-gray-600 dark:text-gray-400">Fine Macerazione:</span> <span>{batch.macerationEndDate ? new Date(batch.macerationEndDate).toLocaleDateString() : 'N/D'}</span> </div> <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700"> <span className="text-gray-600 dark:text-gray-400">Stato:</span> {batch.isReady ? ( <span className="text-green-600 font-bold flex items-center"><Check size={14} className="mr-1"/> Pronto all'uso</span> ) : ( <span className="text-amber-600 font-bold flex items-center"><Clock size={14} className="mr-1"/> -{batch.daysLeft} giorni</span> )} </div> </div> <Button onClick={() => handleCompleteMaceration(batch.id)} className={`w-full mt-4 ${batch.isReady ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`} > {batch.isReady ? "Imbottiglia / Rendi Disponibile" : "Forza Fine Macerazione"} </Button> </div> ))} </div> {maceratingBatches.length === 0 && ( <div className="text-center py-10 text-gray-500"> <Wine size={48} className="mx-auto mb-4 opacity-50" /> <p>La cantina è vuota. Nessun prodotto in macerazione al momento.</p> </div> )} </Card> ); };
export const PartnerManagementModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => { const { state, dispatch } = useAppContext(); const [newPartnerName, setNewPartnerName] = useState(''); const handleAdd = () => { if (newPartnerName.trim()) { dispatch({ type: 'ADD_PARTNER', payload: { name: newPartnerName.trim() } }); setNewPartnerName(''); } }; const handleDelete = (id: string) => { if (confirm("Sei sicuro di voler eliminare questo socio?")) { dispatch({ type: 'DELETE_PARTNER', payload: id }); } }; const handleUpdate = (id: string, name: string) => { const newName = prompt("Nuovo nome:", name); if (newName && newName.trim()) { dispatch({ type: 'UPDATE_PARTNER', payload: { id, name: newName.trim() } }); } }; return ( <Modal isOpen={isOpen} onClose={onClose} title="Gestione Soci"> <div className="space-y-4"> <div className="flex gap-2"> <Input value={newPartnerName} onChange={e => setNewPartnerName(e.target.value)} placeholder="Nome nuovo socio" /> <Button onClick={handleAdd}>Aggiungi</Button> </div> <ul className="divide-y dark:divide-gray-700"> {state.partners.map(p => ( <li key={p.id} className="py-2 flex justify-between items-center"> <span>{p.name}</span> <div className="space-x-1"> <Button variant="ghost" size="sm" onClick={() => handleUpdate(p.id, p.name)}><Edit size={16} /></Button> <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></Button> </div> </li> ))} </ul> </div> </Modal> ); };
const ProductionHistoryView: React.FC = () => { const { state, settings, dispatch } = useAppContext(); const yearData = state[settings.currentYear]; const getVariantName = (id: string) => { const v = yearData.productVariants.find(v => v.id === id); const p = yearData.products.find(p => p.id === v?.productId); return `${p?.name} - ${v?.name}`; }; return ( <Card title="Storico Produzioni"> <Table headers={["Data", "Lotto", "Tipo", "Prodotto", "Colore", "Quantità", "Scadenza", "Azioni"]}> {yearData.productions.map(p => ( <tr key={p.id}> <td className="px-6 py-4">{new Date(p.date).toLocaleDateString()}</td> <td className="px-6 py-4 font-mono">{p.batchNumber}</td> <td className="px-6 py-4"> {p.productionType === 'bulk_refill' ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800"><Beaker size={12} className="mr-1"/> Sfuso</span> : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"><PackageIcon size={12} className="mr-1"/> Finito</span> } </td> <td className="px-6 py-4">{getVariantName(p.finishedProductId)}</td> <td className="px-6 py-4 text-center"> {p.colorCode ? ( <div className="flex flex-col items-center"> <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: p.colorCode }}></div> {p.colorDrops && <span className="text-xs text-gray-500">{p.colorDrops} gc.</span>} </div> ) : ( <span className="text-gray-400 text-xs">-</span> )} </td> <td className="px-6 py-4 font-bold">{p.quantityProduced}</td> <td className="px-6 py-4">{p.expirationDate}</td> <td className="px-6 py-4"> <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if(confirm("Eliminare produzione? Questo ripristinerà le giacenze dei componenti.")) dispatch({ type: 'DELETE_PRODUCTION', payload: p.id }) }}><Trash2 size={16} /></Button> </td> </tr> ))} </Table> <div className="text-center mt-4"> <Button variant="ghost" className="text-gray-500" onClick={() => alert("Il supporto per la modifica delle produzioni verrà aggiunto in una versione futura. Per ora, elimina e ricrea.")}> <Edit size={16} className="mr-2" /> Hai bisogno di modificare una produzione? </Button> </div> </Card> ); };

// --- MODALS FOR PARTNER DETAILS ---
interface PartnerDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    partner: { id: string, name: string } | null;
}
const PartnerDetailModal: React.FC<PartnerDetailModalProps> = ({ isOpen, onClose, partner }) => {
    const { state, settings } = useAppContext();
    const yearData = state[settings.currentYear];
    
    const entries = useMemo(() => {
        if(!partner || !yearData.partnerLedger) return [];
        return yearData.partnerLedger
            .filter(e => e.partnerId === partner.id)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [partner, yearData.partnerLedger]);

    if (!partner) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Dettaglio Movimenti: ${partner.name}`}>
            <div className="max-h-[60vh] overflow-y-auto">
                <Table headers={["Data", "Descrizione", "Entrate (+)", "Uscite (-)"]}>
                    {entries.map(e => (
                        <tr key={e.id}>
                            <td className="px-4 py-2 text-sm">{new Date(e.date).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-sm">{e.description}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-green-600">{e.amount > 0 ? `€${e.amount.toFixed(2)}` : ''}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-red-600">{e.amount < 0 ? `€${Math.abs(e.amount).toFixed(2)}` : ''}</td>
                        </tr>
                    ))}
                </Table>
                {entries.length === 0 && <p className="text-center p-4 text-gray-500">Nessun movimento registrato.</p>}
            </div>
             <div className="flex justify-end pt-4">
                <Button variant="secondary" onClick={onClose}>Chiudi</Button>
            </div>
        </Modal>
    );
};

interface SettlementDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    settlement: PartnerSettlement | null;
}
const SettlementDetailModal: React.FC<SettlementDetailModalProps> = ({ isOpen, onClose, settlement }) => {
    if(!settlement) return null;
    return (
         <Modal isOpen={isOpen} onClose={onClose} title={`Dettaglio Conteggio del ${new Date(settlement.date).toLocaleString()}`}>
            <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                    <p><strong>Totale Bilancio:</strong> €{settlement.totalSystemBalance.toFixed(2)}</p>
                    <p><strong>Target per Socio:</strong> €{settlement.targetPerPartner.toFixed(2)}</p>
                </div>
                <Table headers={["Socio", "Saldo", "Stato"]}>
                    {settlement.partnerSnapshots.map(snap => (
                        <tr key={snap.partnerId}>
                            <td className="px-6 py-4">{snap.partnerName}</td>
                            <td className={`px-6 py-4 font-bold ${snap.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                €{snap.balance.toFixed(2)}
                            </td>
                            <td className="px-6 py-4">
                                {snap.status === 'creditor' && <span className="text-green-600 text-xs uppercase font-bold">Deve Ricevere</span>}
                                {snap.status === 'debtor' && <span className="text-red-600 text-xs uppercase font-bold">Deve Versare</span>}
                                {snap.status === 'balanced' && <span className="text-gray-500 text-xs uppercase font-bold">In Pari</span>}
                            </td>
                        </tr>
                    ))}
                </Table>
            </div>
             <div className="flex justify-end pt-4">
                <Button variant="secondary" onClick={onClose}>Chiudi</Button>
            </div>
        </Modal>
    );
};

const PartnerLedgerView: React.FC = () => {
    const { state, settings, dispatch } = useAppContext();
    const yearData = state[settings.currentYear];
    const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<{id: string, name: string} | null>(null);
    const [selectedSettlement, setSelectedSettlement] = useState<PartnerSettlement | null>(null);

    // --- DIFESA CONTRO CRASH: yearData undefined ---
    if (!yearData) {
        return (
            <Card title="Errore Caricamento">
                <Alert type="error" message="Impossibile caricare i dati per l'anno corrente. Prova a cambiare anno o ripristinare un backup." />
            </Card>
        );
    }

    // --- LOGICA DI CALCOLO ---
    const partnerStats = useMemo(() => {
        // Fallback se partnerLedger non esiste ancora (es. vecchi salvataggi)
        const currentLedger = yearData.partnerLedger || [];
        
        const stats = state.partners.map(p => {
            const entries = currentLedger.filter(e => e.partnerId === p.id);
            const paid = entries.filter(e => e.amount < 0).reduce((acc, e) => acc + Math.abs(e.amount), 0);
            const collected = entries.filter(e => e.amount > 0).reduce((acc, e) => acc + e.amount, 0);
            const netBalance = paid - collected; 
            
            return {
                id: p.id,
                name: p.name,
                paid,
                collected,
                netBalance
            };
        });

        const totalSystemBalance = stats.reduce((acc, p) => acc + p.netBalance, 0); 
        const targetPerPartner = state.partners.length > 0 ? totalSystemBalance / state.partners.length : 0;

        const finalStats = stats.map(p => ({
            ...p,
            diff: p.netBalance - targetPerPartner,
            status: (p.netBalance - targetPerPartner) > 0.01 ? 'creditor' as const : (p.netBalance - targetPerPartner) < -0.01 ? 'debtor' as const : 'balanced' as const
        }));

        return { stats: finalStats, totalSystemBalance, targetPerPartner };
    }, [state.partners, yearData.partnerLedger]); 

    // --- LOGICA DI RICONCILIAZIONE (CHI DEVE A CHI) ---
    const settlementPlan = useMemo(() => {
        let debtors = partnerStats.stats.filter(s => s.status === 'debtor').map(s => ({ ...s, remainder: Math.abs(s.diff) }));
        let creditors = partnerStats.stats.filter(s => s.status === 'creditor').map(s => ({ ...s, remainder: s.diff }));
        
        const plan: { fromId: string; fromName: string; toId: string; toName: string; amount: number }[] = [];

        let i = 0; // debtor index
        let j = 0; // creditor index

        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            
            const amount = Math.min(debtor.remainder, creditor.remainder);
            
            if (amount > 0.01) {
                plan.push({
                    fromId: debtor.id,
                    fromName: debtor.name,
                    toId: creditor.id,
                    toName: creditor.name,
                    amount
                });
            }

            debtor.remainder -= amount;
            creditor.remainder -= amount;

            if (debtor.remainder < 0.01) i++;
            if (creditor.remainder < 0.01) j++;
        }
        return plan;
    }, [partnerStats]);

    const handleSettle = (fromId: string, toId: string, amount: number) => {
        if(confirm(`Confermi che ${state.partners.find(p=>p.id===fromId)?.name} ha pagato €${amount.toFixed(2)} a ${state.partners.find(p=>p.id===toId)?.name}?`)) {
            dispatch({
                type: 'SETTLE_PARTNER_DEBT',
                payload: {
                    fromPartnerId: fromId,
                    toPartnerId: toId,
                    amount,
                    date: new Date().toISOString().split('T')[0]
                }
            });
        }
    };

    const handleArchiveAndReset = () => {
        const snapshot: PartnerSettlement = {
            id: uuidv4(),
            date: new Date().toISOString(),
            totalSystemBalance: partnerStats.totalSystemBalance,
            targetPerPartner: partnerStats.targetPerPartner,
            partnerSnapshots: partnerStats.stats.map(s => ({
                partnerId: s.id,
                partnerName: s.name,
                balance: s.netBalance, // This is the "net balance" we want to zero out.
                status: s.status
            }))
        };

        dispatch({ type: 'ARCHIVE_PARTNER_SETTLEMENT', payload: snapshot });
        setIsArchiveConfirmOpen(false);
    };

    const historySettlements = yearData.partnerSettlements || []; // Fallback array vuoto

    return (
        <Card title="Dare / Avere Soci">
            <div className="flex space-x-4 mb-6 border-b dark:border-gray-700">
                <button className={`pb-2 px-4 ${activeTab === 'dashboard' ? 'border-b-2 border-primary-500 font-bold' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard & Saldi</button>
                <button className={`pb-2 px-4 ${activeTab === 'history' ? 'border-b-2 border-primary-500 font-bold' : ''}`} onClick={() => setActiveTab('history')}>Storico Conteggi</button>
            </div>

            {activeTab === 'dashboard' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                        {partnerStats.stats.map(p => (
                            <div 
                                key={p.id} 
                                className={`p-4 rounded-lg border shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedPartner?.id === p.id ? 'ring-2 ring-primary-500' : ''} ${p.status === 'creditor' ? 'bg-green-50 border-green-200 dark:bg-green-900/20' : p.status === 'debtor' ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-gray-50 border-gray-200 dark:bg-gray-800'}`}
                                onClick={() => setSelectedPartner({id: p.id, name: p.name})}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-lg">{p.name}</h3>
                                    {p.status === 'creditor' && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">CREDITORE</span>}
                                    {p.status === 'debtor' && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">DEBITORE</span>}
                                    {p.status === 'balanced' && <span className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full font-bold">BILANCIATO</span>}
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Versamenti:</span> <span className="font-semibold text-green-600">€{p.paid.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span>Prelievi/Incassi:</span> <span className="font-semibold text-red-600">€{p.collected.toFixed(2)}</span></div>
                                    <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                                        <span>Saldo Netto:</span> 
                                        <span>€{p.netBalance.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 pt-1">
                                        <span>Diff. Media:</span> 
                                        <span className={p.diff > 0 ? 'text-green-600' : 'text-red-600'}>{p.diff > 0 ? '+' : ''}{p.diff.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {settlementPlan.length > 0 ? (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800 mb-8">
                            <h3 className="text-xl font-bold mb-4 text-blue-800 dark:text-blue-200 flex items-center"><ArrowRightLeft className="mr-2" /> Piano di Pareggiamento (Suggerito)</h3>
                            <div className="space-y-3">
                                {settlementPlan.map((plan, idx) => (
                                    <div key={idx} className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                                        <div className="flex items-center space-x-2 mb-2 md:mb-0">
                                            <span className="font-bold text-red-600">{plan.fromName}</span>
                                            <span className="text-gray-500">deve versare a</span>
                                            <span className="font-bold text-green-600">{plan.toName}</span>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <span className="text-lg font-bold">€{plan.amount.toFixed(2)}</span>
                                            <Button size="sm" onClick={() => handleSettle(plan.fromId, plan.toId, plan.amount)}>Registra Pagamento</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-300 mt-4">* Registrando il pagamento, il sistema aggiornerà i saldi di entrambi i soci per pareggiare i conti.</p>
                        </div>
                    ) : (
                        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800 mb-8 text-center">
                            <div className="flex justify-center mb-2"><Check className="text-green-600" size={32} /></div>
                            <h3 className="text-xl font-bold text-green-800 dark:text-green-200">I conti sono perfettamente bilanciati!</h3>
                            <p className="text-green-600 dark:text-green-300">Tutti i soci hanno contribuito o prelevato equamente rispetto alla media.</p>
                        </div>
                    )}

                    <div className="flex justify-end">
                         <Button variant="secondary" onClick={() => setIsArchiveConfirmOpen(true)}><Archive className="mr-2" size={16}/> Archivia Periodo / Resetta Saldi</Button>
                    </div>
                </>
            )}

            {activeTab === 'history' && (
                <div className="overflow-x-auto">
                    <Table headers={["Data", "Totale Bilancio", "Target/Socio", "Azioni"]}>
                         {historySettlements.map(s => (
                            <tr key={s.id}>
                                <td className="px-6 py-4">{new Date(s.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4">€{s.totalSystemBalance.toFixed(2)}</td>
                                 <td className="px-6 py-4">€{s.targetPerPartner.toFixed(2)}</td>
                                 <td className="px-6 py-4">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedSettlement(s)}><Eye size={16} /></Button>
                                 </td>
                            </tr>
                         ))}
                    </Table>
                     {historySettlements.length === 0 && (
                        <p className="text-center py-8 text-gray-500">Nessuna archiviazione storica presente.</p>
                     )}
                </div>
            )}

            <PartnerDetailModal isOpen={!!selectedPartner} onClose={() => setSelectedPartner(null)} partner={selectedPartner} />
            <SettlementDetailModal isOpen={!!selectedSettlement} onClose={() => setSelectedSettlement(null)} settlement={selectedSettlement} />
            
            <ConfirmDialog 
                isOpen={isArchiveConfirmOpen}
                onClose={() => setIsArchiveConfirmOpen(false)}
                onConfirm={handleArchiveAndReset}
                title="Archiviazione Periodo"
                message="Sei sicuro di voler archiviare il periodo corrente? Verrà salvato uno snapshot dei saldi e verranno generate delle scritture contabili automatiche per azzerare i saldi di tutti i soci (ricominciando da zero)."
            />
        </Card>
    );
};

const ArchivesView: React.FC = () => {
    return (
        <Card title="Archivi Storici">
            <div className="text-center py-12 text-gray-500">
                <Archive size={48} className="mx-auto mb-4 opacity-30" />
                <p>Funzionalità Archivi Storici in arrivo.</p>
                <p className="text-sm">Qui potrai consultare i dati degli anni passati.</p>
            </div>
        </Card>
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
        case 'archives': return <ArchivesView />;
        default: return <DashboardView />;
    }
};
