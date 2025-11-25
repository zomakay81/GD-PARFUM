
import React from 'react';
import type { View } from '../types';
import { LayoutDashboard, ShoppingCart, FileText, History, Users, Building, UserCheck, Package, PackagePlus, Factory, BookUser, Archive, Scale, Wine, ClipboardList, BookOpen } from 'lucide-react';

const navItems = [
    { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { view: 'catalog', label: 'Catalogo Prodotti', icon: BookOpen },
    { view: 'new-sale', label: 'Nuova Vendita/Fattura', icon: ShoppingCart },
    { view: 'new-quote', label: 'Nuovo Preventivo', icon: FileText },
    { view: 'sales-history', label: 'Storico Vendite', icon: History },
    { view: 'quotes-history', label: 'Storico Preventivi', icon: History },
    { view: 'customers', label: 'Gestione Clienti', icon: Users },
    { view: 'suppliers', label: 'Gestione Fornitori', icon: Building },
    { view: 'agents', label: 'Gestione Agenti', icon: UserCheck },
    { view: 'inventory', label: 'Gestione Giacenze', icon: Package },
    { view: 'stock-load', label: 'Nuovo Carico', icon: PackagePlus },
    { view: 'stock-load-history', label: 'Storico Carichi', icon: ClipboardList },
    { view: 'production', label: 'Produzione', icon: Factory },
    { view: 'production-history', label: 'Storico Produzioni', icon: History },
    { view: 'cellar', label: 'Cantina (Macerazione)', icon: Wine },
    { view: 'partner-ledger', label: 'Dare/Avere Soci', icon: Scale },
    { view: 'archives', label: 'Archivi Storici', icon: Archive },
];

interface SidebarProps {
    isOpen: boolean;
    setView: (view: View) => void;
    currentView: View;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setView, currentView }) => {
    return (
        <aside className={`bg-white dark:bg-gray-800 shadow-lg w-64 min-h-screen flex-shrink-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:relative transition-transform duration-200 ease-in-out z-20 lg:z-auto`}>
            <div className="p-4 text-xl font-bold border-b dark:border-gray-700">
                Profumeria Pro
            </div>
            <nav className="p-2 space-y-1">
                {navItems.map(item => (
                    <a
                        key={item.view}
                        href="#"
                        onClick={(e) => { e.preventDefault(); setView(item.view as View); }}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            currentView === item.view
                                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                    >
                        <item.icon className="mr-3 h-5 w-5" />
                        <span>{item.label}</span>
                    </a>
                ))}
            </nav>
        </aside>
    );
};
