
import React, { useState, useMemo } from 'react';
import { Card, Button, Input, Table, Modal, ConfirmDialog, Alert } from './ui';
import { PlusCircle, Edit, Trash2, Eye, CheckSquare, XSquare, FileCheck, Printer, Briefcase, ImageIcon } from 'lucide-react';
import { useAppContext } from '../state/AppContext';
import { Order, OrderItem, Customer, Product, ProductVariant, CompanyInfo } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { VAT_RATE } from '../constants';

// --- Nuove interfacce per i dati di stampa pre-elaborati ---
interface PrintableOrderItem {
    variantId: string;
    quantity: number;
    price: number;
    productName: string;
    variantName: string;
    code?: string;
    brand?: string;
    imageUrl?: string;
}

const PrintableOrder: React.FC<{
    order: Order;
    customer: Customer;
    items: PrintableOrderItem[];
    companyInfo: CompanyInfo;
}> = ({ order, customer, items, companyInfo }) => {

    return (
        <div className="font-sans text-sm p-8 bg-white text-black">
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800">
                <div>
                    <Briefcase size={48} className="text-primary-600" />
                    <h1 className="text-2xl font-bold mt-2">{companyInfo.name}</h1>
                    <p>{companyInfo.address}, {companyInfo.city}</p>
                    <p>P.IVA: {companyInfo.vatNumber}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold uppercase text-gray-600">Ordine Cliente</h2>
                    <p className="mt-2">Numero: <strong>{order.id.substring(0, 8)}</strong></p>
                    <p>Data: <strong>{new Date(order.date).toLocaleDateString()}</strong></p>
                </div>
            </header>

            <section className="mt-8 mb-8">
                <h3 className="font-bold text-gray-600">Cliente:</h3>
                <div className="p-4 border rounded bg-gray-50">
                    <p className="font-bold text-lg">{customer.name}</p>
                    <p>{customer.address}, {customer.zip} {customer.city} ({customer.province})</p>
                </div>
            </section>

            <section>
                <table className="w-full text-left">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="p-2 w-16">Foto</th>
                            <th className="p-2">Codice</th>
                            <th className="p-2">Brand</th>
                            <th className="p-2">Prodotto</th>
                            <th className="p-2 text-center">Quantità</th>
                            <th className="p-2 text-right">Prezzo Unit.</th>
                            <th className="p-2 text-right">Totale</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index} className="border-b">
                                <td className="p-2">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.productName} className="h-12 w-12 object-cover rounded" />
                                    ) : (
                                        <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center"><ImageIcon size={24} className="text-gray-400" /></div>
                                    )}
                                </td>
                                <td className="p-2 font-mono text-xs">{item.code}</td>
                                <td className="p-2">{item.brand}</td>
                                <td className="p-2">{item.productName} - {item.variantName}</td>
                                <td className="p-2 text-center">{item.quantity}</td>
                                <td className="p-2 text-right">€{item.price.toFixed(2)}</td>
                                <td className="p-2 text-right">€{(item.quantity * item.price).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className="flex justify-end mt-8">
                <div className="w-1/2 space-y-2">
                    <div className="flex justify-between"><span>Subtotale:</span> <span>€{order.subtotal.toFixed(2)}</span></div>
                    {order.vatApplied && (
                        <div className="flex justify-between"><span>IVA ({((VAT_RATE - 1) * 100).toFixed(0)}%):</span> <span>€{(order.total - order.subtotal).toFixed(2)}</span></div>
                    )}
                    <div className="flex justify-between font-bold text-xl border-t-2 pt-2 mt-2"><span>Totale Ordine:</span> <span>€{order.total.toFixed(2)}</span></div>
                </div>
            </section>
        </div>
    );
};

export const OrdiniClientiView: React.FC = () => {
    const { state, settings, dispatch } = useAppContext();
    const yearData = state[settings.currentYear];
    const { orders, customers, productVariants, products, inventoryBatches } = yearData;

    const [isModalOpen, setModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [formData, setFormData] = useState<Partial<Order>>({ items: [] });
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [printableOrderData, setPrintableOrderData] = useState<{
        order: Order;
        customer: Customer;
        items: PrintableOrderItem[];
    } | null>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [productSearch, setProductSearch] = useState('');

    const handleClosePrintModal = () => {
        setIsPrintModalOpen(false);
        setPrintableOrderData(null);
    };

    const handlePrintOrder = (orderToPrint: Order) => {
        const customer = customers.find(c => c.id === orderToPrint.customerId);
        if (!customer) {
            alert("Cliente non trovato. Impossibile stampare l'ordine.");
            return;
        }

        const processedItems: PrintableOrderItem[] = orderToPrint.items.map(item => {
            const variant = productVariants.find(v => v.id === item.variantId);
            
            if (!variant) {
                return {
                    ...item,
                    productName: 'Prodotto Eliminato',
                    variantName: '',
                    code: 'N/D',
                    brand: 'N/D',
                    imageUrl: undefined,
                };
            }
            
            const product = products.find(p => p.id === variant.productId);
            
            if (!product) {
                return {
                    ...item,
                    productName: 'Prodotto Base Eliminato',
                    variantName: variant.name || '',
                    code: 'N/D',
                    brand: 'N/D',
                    imageUrl: variant.imageUrl,
                };
            }

            return {
                ...item,
                productName: product.name,
                variantName: variant.name,
                code: product.code,
                brand: product.brand,
                imageUrl: product.imageUrl || variant.imageUrl,
            };
        });

        setPrintableOrderData({ order: orderToPrint, customer, items: processedItems });
        setIsPrintModalOpen(true);
    };

    const variants = useMemo(() => productVariants.map(v => {
        const p = products.find(prod => prod.id === v.productId);
        const qty = inventoryBatches.filter(b => b.variantId === v.id && b.status === 'available').reduce((acc, b) => acc + b.currentQuantity, 0);
        return { ...v, productName: p?.name || '?', available: qty, category: p?.category || 'N/A' };
    }), [productVariants, products, inventoryBatches]);

    const filteredVariants = useMemo(() => {
        if (!productSearch) return variants;
        const searchLower = productSearch.toLowerCase();
        return variants.filter(v => 
            v.productName.toLowerCase().includes(searchLower) ||
            v.name.toLowerCase().includes(searchLower) ||
            v.category.toLowerCase().includes(searchLower)
        );
    }, [variants, productSearch]);

    const openAddModal = () => {
        setEditingOrder(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            items: [],
            vatApplied: true,
            status: 'in-preparazione',
        });
        setModalOpen(true);
    };

    const openEditModal = (order: Order) => {
        setEditingOrder(order);
        setFormData(order);
        setSelectedItems([]); // Reset selection when opening modal
        setModalOpen(true);
    };

    const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
        const newItems = [...(formData.items || [])];
        const item = { ...newItems[index], [field]: value };

        if (field === 'variantId') {
            const variant = variants.find(v => v.id === value);
            item.price = variant?.salePrice || 0;
        }

        newItems[index] = item;
        setFormData({ ...formData, items: newItems });
    };

    const handleSave = () => {
        const subtotal = (formData.items || []).reduce((acc, item) => acc + item.quantity * item.price, 0);
        const total = formData.vatApplied ? subtotal * VAT_RATE : subtotal;

        if (editingOrder) {
            const payload = {
                ...formData,
                subtotal,
                total,
                id: editingOrder.id,
            } as Order;
            dispatch({ type: 'UPDATE_ORDER', payload });
        } else {
            const payload = {
                ...formData,
                id: uuidv4(),
                subtotal,
                total,
            } as Order;
            dispatch({ type: 'ADD_ORDER', payload });
        }
        setModalOpen(false);
    };

    const handleDelete = (id: string) => {
        setDeletingId(id);
        setConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (deletingId) {
            dispatch({ type: 'DELETE_ORDER', payload: deletingId });
        }
        setConfirmOpen(false);
        setDeletingId(null);
    };

    const handleItemSelectToggle = (variantId: string) => {
        setSelectedItems(prev =>
            prev.includes(variantId)
                ? prev.filter(id => id !== variantId)
                : [...prev, variantId]
        );
    };

    const handlePartialConversion = () => {
        if (!editingOrder || selectedItems.length === 0) return;
        
        dispatch({ type: 'CONVERT_ORDER_TO_SALE', payload: editingOrder.id });
        
        setModalOpen(false);
    };

    const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'N/A';

    return (
        <Card title="Gestione Ordini Clienti">
            <div className="flex justify-end mb-4">
                <Button onClick={openAddModal}><PlusCircle className="mr-2" size={16}/> Nuovo Ordine</Button>
            </div>
            <Table headers={["Numero", "Data", "Cliente", "Stato", "Totale", "Azioni"]}>
                {orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => (
                    <tr key={order.id}>
                        <td className="px-6 py-4 font-bold">{order.id.substring(0, 8)}</td>
                        <td className="px-6 py-4">{new Date(order.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">{getCustomerName(order.customerId)}</td>
                        <td className="px-6 py-4">{order.status}</td>
                        <td className="px-6 py-4">€{order.total.toFixed(2)}</td>
                        <td className="px-6 py-4 space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(order)}><Edit size={16}/></Button>
                            <Button variant="ghost" size="sm" onClick={() => handlePrintOrder(order)}><Printer size={16}/></Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(order.id)}><Trash2 size={16}/></Button>
                        </td>
                    </tr>
                ))}
            </Table>

            {printableOrderData && (
                <PrintModal
                    isOpen={isPrintModalOpen}
                    onClose={handleClosePrintModal}
                    title={`Stampa Ordine #${printableOrderData.order.id.substring(0, 8)}`}
                    documentName={`ordine_${printableOrderData.order.id.substring(0, 8)}`}
                >
                    <PrintableOrder
                        order={printableOrderData.order}
                        customer={printableOrderData.customer}
                        items={printableOrderData.items}
                        companyInfo={settings.companyInfo}
                    />
                </PrintModal>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingOrder ? "Modifica Ordine" : "Nuovo Ordine"}>
                <div className="space-y-4">
                    <Input label="Data" type="date" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                    <div>
                        <label className="block text-sm font-medium mb-1">Cliente</label>
                        <select className="w-full p-2 border rounded" value={formData.customerId || ''} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                            <option value="">Seleziona Cliente...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="vatApplied"
                            checked={formData.vatApplied || false}
                            onChange={e => setFormData({ ...formData, vatApplied: e.target.checked })}
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label htmlFor="vatApplied" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                            Applica IVA
                        </label>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold">Prodotti</h4>
                            <Input 
                                placeholder="Cerca prodotto..." 
                                value={productSearch} 
                                onChange={e => setProductSearch(e.target.value)}
                                className="w-1/3"
                            />
                        </div>
                        {(formData.items || []).map((item, idx) => {
                            const variant = variants.find(v => v.id === item.variantId);
                            const product = variant ? products.find(p => p.id === variant.productId) : null;
                            const imageUrl = product?.imageUrl || variant?.imageUrl;
                            const isConverted = item.prepared;

                            return (
                                <div key={idx} className={`flex gap-3 items-center p-2 border rounded ${isConverted ? 'bg-green-50 dark:bg-green-900/30 opacity-60' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.includes(item.variantId)}
                                        onChange={() => handleItemSelectToggle(item.variantId)}
                                        className="h-5 w-5 rounded"
                                        disabled={isConverted}
                                    />
                                    
                                    {imageUrl ? (
                                        <img src={imageUrl} alt={variant?.productName} className="h-12 w-12 object-cover rounded" />
                                     ) : (
                                        <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center"><ImageIcon size={24} className="text-gray-400" /></div>
                                    )}

                                    <div className="flex-grow" style={{flexBasis: '40%'}}>
                                        <select className="w-full p-2 border rounded text-sm" value={item.variantId} onChange={e => handleItemChange(idx, 'variantId', e.target.value)}>
                                            <option value="">Seleziona Prodotto...</option>
                                            {filteredVariants.map(v => <option key={v.id} value={v.id}>{v.productName} - {v.name}</option>)}
                                        </select>
                                        <div className="flex justify-between items-center mt-1">
                                           <div>
                                             <span className="text-xs text-gray-500 font-mono">Cod: {product?.code || 'N/D'}</span>
                                             <span className="text-xs text-gray-500 font-bold uppercase ml-2">{product?.brand || ''}</span>
                                           </div>
                                           <span className={`text-xs font-bold ${variant && variant.available > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                               Disp: {variant?.available || 0}
                                           </span>
                                        </div>
                                    </div>

                                    <div className="flex-grow" style={{flexBasis: '15%'}}>
                                        <Input type="number" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value))} placeholder="Qtà" />
                                    </div>
                                    <div className="flex-grow" style={{flexBasis: '20%'}}>
                                        <Input type="number" value={item.price} onChange={e => handleItemChange(idx, 'price', parseFloat(e.target.value))} placeholder="Prezzo" />
                                    </div>
                                    
                                    <Button variant="danger" size="sm" onClick={() => {
                                        const newItems = [...(formData.items || [])];
                                        newItems.splice(idx, 1);
                                        setFormData({...formData, items: newItems});
                                    }}><Trash2 size={16} /></Button>
                                </div>
                            );
                        })}
                        <Button variant="secondary" size="sm" onClick={() => {
                            const newItems = [...(formData.items || []), { variantId: '', quantity: 1, price: 0, prepared: false }];
                            setFormData({...formData, items: newItems});
                        }}><PlusCircle size={16} className="mr-2"/> Aggiungi Prodotto</Button>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t mt-4">
                         <div>
                            <span className="text-sm text-gray-500">Totale Ordine:</span>
                            <p className="font-bold text-2xl">
                                €{((formData.items || []).reduce((acc, item) => acc + item.quantity * item.price, 0) * (formData.vatApplied ? VAT_RATE : 1)).toFixed(2)}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
                            <Button onClick={handleSave}>Salva Modifiche</Button>
                            <Button
                                onClick={handlePartialConversion}
                                disabled={selectedItems.length === 0}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <FileCheck size={16} className="mr-2"/> Crea Vendita da Selezione ({selectedItems.length})
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
            <ConfirmDialog
                isOpen={isConfirmOpen && !!deletingId}
                onClose={() => {
                    setConfirmOpen(false);
                    setDeletingId(null);
                }}
                onConfirm={confirmDelete}
                title="Conferma Eliminazione"
                message="Sei sicuro di voler eliminare questo ordine?"
            />
        </Card>
    );
};
