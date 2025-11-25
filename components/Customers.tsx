
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../App';
import { Customer } from '../types';

const CustomerForm: React.FC<{ customer?: Customer; onSave: (customer: Customer) => void; onCancel: () => void; }> = ({ customer, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Omit<Customer, 'id'>>({
        name: customer?.name || '',
        address: customer?.address || '',
        city: customer?.city || '',
        zip: customer?.zip || '',
        province: customer?.province || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
        vatNumber: customer?.vatNumber || '',
        sdi: customer?.sdi || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: customer?.id || `c-${Date.now()}`, ...formData });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nome Cognome / Ragione Sociale" required className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                <input type="text" name="vatNumber" value={formData.vatNumber} onChange={handleChange} placeholder="P. IVA / Codice Fiscale" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Indirizzo" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Città" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                <input type="text" name="zip" value={formData.zip} onChange={handleChange} placeholder="CAP" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                <input type="text" name="province" value={formData.province} onChange={handleChange} placeholder="Provincia" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Telefono" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                <input type="text" name="sdi" value={formData.sdi} onChange={handleChange} placeholder="SDI" className="md:col-span-2 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
             </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded">Annulla</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Salva</button>
            </div>
        </form>
    );
};

const Customers: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [isFormVisible, setFormVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
    const [filter, setFilter] = useState('');

    const filteredCustomers = useMemo(() => 
        state.customers.filter(c => 
            c.name.toLowerCase().includes(filter.toLowerCase()) ||
            c.vatNumber.toLowerCase().includes(filter.toLowerCase())
        ),
        [state.customers, filter]
    );

    const handleSave = (customer: Customer) => {
        if (editingCustomer) {
            dispatch({ type: 'UPDATE_CUSTOMER', payload: customer });
        } else {
            dispatch({ type: 'ADD_CUSTOMER', payload: customer });
        }
        setFormVisible(false);
        setEditingCustomer(undefined);
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormVisible(true);
    };

    const handleDelete = (id: string) => {
        if(window.confirm('Sei sicuro di voler eliminare questo cliente?')) {
            dispatch({ type: 'DELETE_CUSTOMER', payload: id });
        }
    };
    
    const handleAddNew = () => {
        setEditingCustomer(undefined);
        setFormVisible(true);
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Gestione Clienti</h1>
                <button onClick={handleAddNew} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Aggiungi Cliente
                </button>
            </div>
            
            {isFormVisible && (
                <div className="mb-6">
                    <CustomerForm 
                        customer={editingCustomer} 
                        onSave={handleSave} 
                        onCancel={() => { setFormVisible(false); setEditingCustomer(undefined); }} 
                    />
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="mb-4">
                    <input 
                        type="text"
                        placeholder="Filtra per nome o P.IVA..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Ragione Sociale</th>
                                <th scope="col" className="px-6 py-3">P.IVA / CF</th>
                                <th scope="col" className="px-6 py-3">Città</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Telefono</th>
                                <th scope="col" className="px-6 py-3">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map(customer => (
                                <tr key={customer.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{customer.name}</td>
                                    <td className="px-6 py-4">{customer.vatNumber}</td>
                                    <td className="px-6 py-4">{customer.city}</td>
                                    <td className="px-6 py-4">{customer.email}</td>
                                    <td className="px-6 py-4">{customer.phone}</td>
                                    <td className="px-6 py-4 flex space-x-2">
                                        <button onClick={() => handleEdit(customer)} className="text-primary-600 hover:text-primary-800">Modifica</button>
                                        <button onClick={() => handleDelete(customer.id)} className="text-red-600 hover:text-red-800">Elimina</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {filteredCustomers.length === 0 && <p className="text-center py-4">Nessun cliente trovato.</p>}
            </div>
        </div>
    );
};

export default Customers;
