
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AppProvider, useAppContext } from './state/AppContext';
import { MainViews } from './components/views';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AIChat } from './components/AIChat';
import type { View } from './types';
import { Bot, X } from 'lucide-react';

const AppContainer: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isAiChatOpen, setAiChatOpen] = useState(false);
    const { settings } = useAppContext();

    const handleViewChange = useCallback((view: View) => {
        setCurrentView(view);
        setSidebarOpen(false);
    }, []);

    // Ascolta l'evento personalizzato dalla Dashboard per la navigazione
    useEffect(() => {
        const handleNavigate = (e: Event) => {
            const customEvent = e as CustomEvent<View>;
            handleViewChange(customEvent.detail);
        };
        window.addEventListener('navigate-view', handleNavigate);
        return () => window.removeEventListener('navigate-view', handleNavigate);
    }, [handleViewChange]);

    return (
        <div className={`flex h-screen font-sans text-gray-900 dark:text-gray-100 ${settings.theme}`}>
            {/* Background Layer iOS Style */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
            
            <Sidebar isOpen={isSidebarOpen} setView={handleViewChange} currentView={currentView} />
            
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="container mx-auto max-w-7xl pb-20">
                        <MainViews view={currentView} />
                    </div>
                </main>
            </div>

            {settings.aiAssistantEnabled && (
                <>
                    <button
                        onClick={() => setAiChatOpen(!isAiChatOpen)}
                        className="fixed bottom-6 right-6 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-full p-4 shadow-xl transition-transform transform hover:scale-110 z-50 border border-white/20"
                        aria-label="Apri assistente AI"
                    >
                        {isAiChatOpen ? <X size={24} /> : <Bot size={24} />}
                    </button>
                    {isAiChatOpen && <AIChat onClose={() => setAiChatOpen(false)} />}
                </>
            )}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AppProvider>
            <AppContainer />
        </AppProvider>
    );
};

export default App;
