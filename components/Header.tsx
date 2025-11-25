
import React, { useState, useRef } from 'react';
import { Menu, Settings as SettingsIcon, Undo, Redo, Sun, Moon, Archive, Save, Upload, Users, LogOut, Check, Briefcase, Trash2 } from 'lucide-react';
import { useAppContext } from '../state/AppContext';
import { Button, ConfirmDialog } from './ui';
import { PartnerManagementModal, CompanyInfoModal } from './views';

export const Header: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
    const { settings, updateSettings, undo, redo, canUndo, canRedo, backupData, restoreData, dispatch } = useAppContext();
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [isPartnerModalOpen, setPartnerModalOpen] = useState(false);
    const [isCompanyInfoModalOpen, setCompanyInfoModalOpen] = useState(false);
    const [isArchiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
    const [isResetConfirmOpen, setResetConfirmOpen] = useState(false);
    const restoreInputRef = useRef<HTMLInputElement>(null);

    const handleThemeToggle = () => {
        updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
    };

    const handleRestoreClick = () => {
        restoreInputRef.current?.click();
    }

    const handleArchive = () => {
        dispatch({ type: 'ARCHIVE_YEAR' });
        setArchiveConfirmOpen(false);
        setSettingsOpen(false);
    };

    const handleResetApp = () => {
        dispatch({ type: 'RESET_APP' });
        setResetConfirmOpen(false);
        setSettingsOpen(false);
    };

    return (
        <header className="bg-white dark:bg-gray-800 shadow-md z-10 p-4 flex items-center justify-between">
            <div className="flex items-center">
                <Button variant="ghost" className="lg:hidden mr-2" onClick={toggleSidebar}>
                    <Menu />
                </Button>
                <h1 className="text-xl font-semibold">Gestionale Profumeria</h1>
            </div>
            <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}><Undo size={20} /></Button>
                <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo}><Redo size={20} /></Button>
                <div className="relative">
                    <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(!isSettingsOpen)}><SettingsIcon size={20} /></Button>
                    {isSettingsOpen && (
                        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg z-20">
                            <div className="p-4 space-y-4">
                                <h4 className="font-semibold">Impostazioni</h4>
                                <div className="flex items-center justify-between">
                                    <span>Tema Scuro</span>
                                    <button onClick={handleThemeToggle} className="p-1 rounded-full bg-gray-200 dark:bg-gray-700">
                                        {settings.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Anno Corrente</span>
                                    <input type="number" value={settings.currentYear} onChange={e => updateSettings({currentYear: parseInt(e.target.value)})} className="w-20 p-1 text-sm rounded bg-gray-200 dark:bg-gray-700" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Abilita Firebase</span>
                                     <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={settings.firebaseEnabled} onChange={e => updateSettings({ firebaseEnabled: e.target.checked })} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>
                                 <div className="flex items-center justify-between">
                                    <span>Assistente AI</span>
                                     <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={settings.aiAssistantEnabled} onChange={e => updateSettings({ aiAssistantEnabled: e.target.checked })} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>
                                <Button variant="secondary" className="w-full justify-start" onClick={() => { setCompanyInfoModalOpen(true); setSettingsOpen(false); }}><Briefcase size={16} className="mr-2"/> Gestisci Dati Azienda</Button>
                                <Button variant="secondary" className="w-full justify-start" onClick={() => { setPartnerModalOpen(true); setSettingsOpen(false); }}><Users size={16} className="mr-2"/> Gestisci Soci</Button>
                                <Button variant="secondary" className="w-full justify-start" onClick={() => setArchiveConfirmOpen(true)}><Archive size={16} className="mr-2"/> Archivia Anno Corrente</Button>
                                <Button variant="secondary" className="w-full justify-start" onClick={backupData}><Save size={16} className="mr-2"/> Backup Dati</Button>
                                <Button variant="secondary" className="w-full justify-start" onClick={handleRestoreClick}><Upload size={16} className="mr-2"/> Ripristina Dati</Button>
                                <input type="file" ref={restoreInputRef} onChange={restoreData} accept=".json" className="hidden"/>
                                
                                <div className="pt-2 border-t dark:border-gray-600">
                                     <Button variant="danger" className="w-full justify-start" onClick={() => setResetConfirmOpen(true)}><Trash2 size={16} className="mr-2" /> Reset Totale App</Button>
                                </div>

                                {settings.firebaseEnabled && <Button variant="danger" className="w-full justify-start"><LogOut size={16} className="mr-2" /> Logout</Button>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <PartnerManagementModal isOpen={isPartnerModalOpen} onClose={() => setPartnerModalOpen(false)} />
            <CompanyInfoModal isOpen={isCompanyInfoModalOpen} onClose={() => setCompanyInfoModalOpen(false)} />
            <ConfirmDialog 
                isOpen={isArchiveConfirmOpen} 
                onClose={() => setArchiveConfirmOpen(false)} 
                onConfirm={handleArchive}
                title="Conferma Archiviazione"
                message={`Sei sicuro di voler archiviare l'anno ${settings.currentYear}? Verrà creato un nuovo anno di lavoro (${settings.currentYear + 1}) e non potrai più modificare i dati dell'anno archiviato. L'operazione è irreversibile.`}
            />
            <ConfirmDialog 
                isOpen={isResetConfirmOpen} 
                onClose={() => setResetConfirmOpen(false)} 
                onConfirm={handleResetApp}
                title="RESET TOTALE APP"
                message="SEI SICURO? Questa azione CANCELLERÀ TUTTI I DATI, clienti, vendite, magazzino e impostazioni. L'app tornerà allo stato iniziale. Assicurati di aver fatto un backup prima di procedere."
            />
        </header>
    );
};
