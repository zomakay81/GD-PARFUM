
import React, { useState, useMemo } from 'react';
import { Card, Button, Input, Table, Modal, ConfirmDialog, Alert } from './ui';
import { PlusCircle, Edit, Trash2, Eye, CheckSquare, XSquare, FileCheck } from 'lucide-react';
import { useAppContext } from '../state/AppContext';
import { Order, OrderItem, Customer } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { VAT_RATE } from '../constants';

export const OrdiniClientiView: React.FC = () => {
    const { state, dispatch, settings } = useAppContext();
    const yearData = state[settings.currentYear];
    const { orders, customers, productVariants, products, inventoryBatches } = yearData;

    const [isModalOpen, setModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [formData, setFormData] = useState<Partial<Order>>({ items: [] });
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [convertingOrder, setConvertingOrder] = useState<Order | null>(null);

    const variants = useMemo(() => productVariants.map(v => {
        const p = products.find(prod => prod.id === v.productId);
        const qty = inventoryBatches.filter(b => b.variantId === v.id && b.status === 'available').reduce((acc, b) => acc + b.currentQuantity, 0);
        return { ...v, productName: p?.name || '?', available: qty };
    }), [productVariants, products, inventoryBatches]);

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
        const total = formData.vatApplied ? subtotal * VAT_RATE : total;

        const payload = {
            ...formData,
            subtotal,
            total,
            id: editingOrder?.id || uuidv4(),
        } as Order;

        if (editingOrder) {
            dispatch({ type: 'UPDATE_ORDER', payload });
        } else {
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

    const handleItemPreparedToggle = (index: number) => {
        const newItems = [...(formData.items || [])];
        newItems[index] = { ...newItems[index], prepared: !newItems[index].prepared };
        setFormData({ ...formData, items: newItems });
    };

    const convertToSale = (order: Order) => {
        setConvertingOrder(order);
        setConfirmOpen(true);
    };
    
    const confirmConvertToSale = () => {
        if (convertingOrder) {
            dispatch({ type: 'CONVERT_ORDER_TO_SALE', payload: convertingOrder.id });
        }
        setConfirmOpen(false);
        setConvertingOrder(null);
    };

    const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'N/A';

    const isOrderReadyForConversion = (order: Order) => order.items.every(item => item.prepared);

    return (
        <Card title="Gestione Ordini Clienti">
            <div className="flex justify-end mb-4">
                <Button onClick={openAddModal}><PlusCircle className="mr-2" size={16}/> Nuovo Ordine</Button>
            </div>
            <Table headers={["Data", "Cliente", "Stato", "Totale", "Azioni"]}>
                {orders.map(order => (
                    <tr key={order.id}>
                        <td className="px-6 py-4">{new Date(order.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">{getCustomerName(order.customerId)}</td>
                        <td className="px-6 py-4">{order.status}</td>
                        <td className="px-6 py-4">€{order.total.toFixed(2)}</td>
                        <td className="px-6 py-4 space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(order)}><Edit size={16}/></Button>
                            {order.status === 'in-preparazione' && isOrderReadyForConversion(order) && (
                                <Button variant="ghost" size="sm" className="text-green-500" onClick={() => convertToSale(order)}><FileCheck size={16}/></Button>
                            )}
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(order.id)}><Trash2 size={16}/></Button>
                        </td>
                    </tr>
                ))}
            </Table>

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

                    <div className="space-y-2">
                        <h4 className="font-semibold">Prodotti</h4>
                        {(formData.items || []).map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <input type="checkbox" checked={item.prepared} onChange={() => handleItemPreparedToggle(idx)} />
                                <select className="w-full p-2 border rounded" value={item.variantId} onChange={e => handleItemChange(idx, 'variantId', e.target.value)}>
                                    <option value="">Seleziona Prodotto...</option>
                                    {variants.map(v => <option key={v.id} value={v.id}>{v.productName} - {v.name}</option>)}
                                </select>
                                <Input type="number" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value))} />
                                <Input type="number" value={item.price} onChange={e => handleItemChange(idx, 'price', parseFloat(e.target.value))} />
                                <Button variant="danger" size="sm" onClick={() => {
                                    const newItems = [...(formData.items || [])];
                                    newItems.splice(idx, 1);
                                    setFormData({...formData, items: newItems});
                                }}><Trash2 size={16} /></Button>
                            </div>
                        ))}
                        <Button variant="secondary" size="sm" onClick={() => {
                            const newItems = [...(formData.items || []), { variantId: '', quantity: 1, price: 0, prepared: false }];
                            setFormData({...formData, items: newItems});
                        }}><PlusCircle size={16} className="mr-2"/> Aggiungi Prodotto</Button>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
                        <Button onClick={handleSave} className="ml-2">Salva</Button>
                    </div>
                </div>
            </Modal>
            <ConfirmDialog
                isOpen={isConfirmOpen && (!!deletingId || !!convertingOrder)}
                onClose={() => {
                    setConfirmOpen(false);
                    setDeletingId(null);
                    setConvertingOrder(null);
                }}
                onConfirm={() => {
                    if (deletingId) confirmDelete();
                    if (convertingOrder) confirmConvertToSale();
                }}
                title="Conferma Azione"
                message={deletingId ? "Sei sicuro di voler eliminare questo ordine?" : "Sei sicuro di voler convertire questo ordine in una vendita? L'inventario verrà aggiornato."}
            />
        </Card>
    );
};
