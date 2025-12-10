
import React, { useState, useMemo } from 'react';
import { Card, Button, Input, Table, ConfirmDialog, Modal } from './ui';
import { PlusCircle, Edit, Trash2, Eye } from 'lucide-react';
import { useAppContext } from '../state/AppContext';
import { Expense } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { VAT_RATE } from '../constants';

export const SpeseView: React.FC = () => {
    const { state, dispatch, settings } = useAppContext();
    const yearData = state[settings.currentYear];
    const { expenses, suppliers, partners } = yearData;

    const [isModalOpen, setModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [formData, setFormData] = useState<Partial<Expense>>({});
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const openAddModal = () => {
        setEditingExpense(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            quantity: 1,
            price: 0,
            vatApplied: true,
        });
        setModalOpen(true);
    };

    const openEditModal = (expense: Expense) => {
        setEditingExpense(expense);
        setFormData(expense);
        setModalOpen(true);
    };

    const handleSave = () => {
        const total = (formData.quantity || 0) * (formData.price || 0);
        const finalTotal = formData.vatApplied ? total * VAT_RATE : total;

        const payload = {
            ...formData,
            total: finalTotal,
            id: editingExpense?.id || uuidv4(),
        } as Expense;

        if (editingExpense) {
            dispatch({ type: 'UPDATE_EXPENSE', payload });
        } else {
            dispatch({ type: 'ADD_EXPENSE', payload });
        }
        setModalOpen(false);
    };

    const handleDelete = (id: string) => {
        setDeletingId(id);
        setConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (deletingId) {
            dispatch({ type: 'DELETE_EXPENSE', payload: deletingId });
        }
        setConfirmOpen(false);
        setDeletingId(null);
    };

    const getSupplierName = (id?: string) => suppliers.find(s => s.id === id)?.name || 'N/A';
    const getPartnerName = (id?: string) => partners.find(p => p.id === id)?.name || 'N/A';

    return (
        <Card title="Gestione Spese">
            <div className="flex justify-end mb-4">
                <Button onClick={openAddModal}><PlusCircle className="mr-2" size={16}/> Aggiungi Spesa</Button>
            </div>
            <Table headers={["Data", "Descrizione", "Fornitore", "Pagato da", "Totale", "Azioni"]}>
                {expenses.map(expense => (
                    <tr key={expense.id}>
                        <td className="px-6 py-4">{new Date(expense.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">{expense.description}</td>
                        <td className="px-6 py-4">{getSupplierName(expense.supplierId)}</td>
                        <td className="px-6 py-4">{getPartnerName(expense.paidByPartnerId)}</td>
                        <td className="px-6 py-4">€{expense.total.toFixed(2)}</td>
                        <td className="px-6 py-4 space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(expense)}><Edit size={16}/></Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(expense.id)}><Trash2 size={16}/></Button>
                        </td>
                    </tr>
                ))}
            </Table>

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingExpense ? "Modifica Spesa" : "Nuova Spesa"}>
                <div className="space-y-4">
                    <Input label="Data" type="date" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                    <Input label="Descrizione" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} required />
                    <Input label="Quantità" type="number" value={formData.quantity || 1} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} />
                    <Input label="Prezzo (Unitario, IVA esclusa)" type="number" step="0.01" value={formData.price || 0} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                    <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={formData.vatApplied} onChange={e => setFormData({...formData, vatApplied: e.target.checked})} />
                        <span>Applica IVA 22%</span>
                    </label>
                    <div>
                        <label className="block text-sm font-medium mb-1">Fornitore</label>
                        <select className="w-full p-2 border rounded" value={formData.supplierId || ''} onChange={e => setFormData({...formData, supplierId: e.target.value})}>
                            <option value="">Seleziona Fornitore...</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">Pagato da (Socio)</label>
                        <select className="w-full p-2 border rounded" value={formData.paidByPartnerId || ''} onChange={e => setFormData({...formData, paidByPartnerId: e.target.value})}>
                            <option value="">Nessuno</option>
                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <Input label="Note" value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} />
                    <div className="flex justify-end pt-4">
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
                        <Button onClick={handleSave} className="ml-2">Salva</Button>
                    </div>
                </div>
            </Modal>
            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Conferma Eliminazione"
                message="Sei sicuro di voler eliminare questa spesa?"
            />
        </Card>
    );
};
