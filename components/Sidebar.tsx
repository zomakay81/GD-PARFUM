
import React from 'react';
import type { View } from '../types';
import { LayoutDashboard, ShoppingCart, FileText, History, Users, Building, UserCheck, Package, PackagePlus, Factory, Archive, Scale, Wine, ClipboardList, BookOpen, CreditCard } from 'lucide-react';

export const navItems = [
    { view: 'dashboard', label: 'Home', icon: LayoutDashboard, color: 'from-gray-700 to-gray-900', description: 'Panoramica' },
    { view: 'catalog', label: 'Catalogo', icon: BookOpen, color: 'from-blue-400 to-blue-600', description: 'Prodotti e Listini' },
    { view: 'new-sale', label: 'Vendita', icon: ShoppingCart, color: 'from-green-400 to-emerald-600', description: 'Nuova Fattura' },
    { view: 'new-quote', label: 'Preventivo', icon: FileText, color: 'from-indigo-400 to-purple-600', description: 'Crea Offerta' },
    { view: 'inventory', label: 'Magazzino', icon: Package, color: 'from-orange-400 to-red-500', description: 'Giacenze' },
    { view: 'production', label: 'Produzione', icon: Factory, color: 'from-pink-500 to-rose-600', description: 'Laboratorio' },
    { view: 'cellar', label: 'Cantina', icon: Wine, color: 'from-amber-700 to-amber-900', description: 'Macerazione' },
    { view: 'customers', label: 'Clienti', icon: Users, color: 'from-cyan-400 to-blue-500', description: 'Rubrica' },
    { view: 'suppliers', label: 'Fornitori', icon: Building, color: 'from-slate-500 to-slate-700', description: 'Acquisti' },
    { view: 'agents', label: 'Agenti', icon: UserCheck, color: 'from-teal-400 to-teal-600', description: 'Rete Vendita' },
    { view: 'stock-load', label: 'Carico', icon: PackagePlus, color: 'from-lime-500 to-green-700', description: 'Entrata Merce' },
    { view: 'sales-history', label: 'Storico Vendite', icon: History, color: 'from-green-600 to-green-800', description: 'Archivio' },
    { view: 'quotes-history', label: 'Storico Prev.', icon: History, color: 'from-indigo-600 to-indigo-800', description: 'Archivio' },
    { view: 'stock-load-history', label: 'Storico Carichi', icon: ClipboardList, color: 'from-lime-600 to-lime-800', description: 'Archivio' },
    { view: 'production-history', label: 'Storico Prod.', icon: History, color: 'from-rose-700 to-rose-900', description: 'Archivio' },
    { view: 'partner-ledger', label: 'Soci', icon: Scale, color: 'from-violet-500 to-purple-700', description: 'Contabilità' },
    { view: 'spese', label: 'Spese', icon: CreditCard, color: 'from-red-500 to-orange-700', description: 'Spese' },
    { view: 'ordini-clienti', label: 'Ordini Clienti', icon: ClipboardList, color: 'from-yellow-500 to-amber-700', description: 'Ordini' },
    { view: 'archives', label: 'Archivi', icon: Archive, color: 'from-gray-500 to-gray-700', description: 'Anni passati' },
];

interface SidebarProps {
    isOpen: boolean;
    setView: (view: View) => void;
    currentView: View;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setView, currentView }) => {
    return (
        <aside className={`
            fixed lg:relative inset-y-0 left-0 z-30
            w-64 transform transition-transform duration-300 ease-in-out
            bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-700
            ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${currentView === 'dashboard' ? 'lg:-translate-x-full lg:hidden' : ''} 
        `}>
            <div className="h-full flex flex-col">
                <div className="p-6 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-purple-600">
                        Profumeria OS
                    </h2>
                </div>
                
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = currentView === item.view;
                        // Skip dashboard link in sidebar if we are already in "Launcher" mode conceptually, 
                        // but usually good to keep "Home" available.
                        return (
                            <button
                                key={item.view}
                                onClick={() => setView(item.view as View)}
                                className={`
                                    w-full flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200
                                    ${isActive 
                                        ? 'bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm' 
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:scale-[1.02]'
                                    }
                                `}
                            >
                                <div className={`p-1.5 rounded-lg mr-3 bg-gradient-to-br ${item.color} text-white shadow-sm`}>
                                    <item.icon size={16} />
                                </div>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
                
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-center text-gray-400">v4.5 iOS Style</p>
                </div>
            </div>
        </aside>
    );
};
