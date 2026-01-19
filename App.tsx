
import React, { useState, useCallback, useEffect } from 'react';
import { AppProvider, useAppContext } from './state/AppContext';
import { AuthProvider, useAuth } from './state/AuthContext';
import { MainViews } from './components/views';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AIChat } from './components/AIChat';
import { AuthView } from './components/Auth';
import type { View } from './types';
import { Bot, X } from 'lucide-react';

const AppContent: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isAiChatOpen, setAiChatOpen] = useState(false);
    const { settings, isLoading } = useAppContext();

    const handleViewChange = useCallback((view: View) => {
        setCurrentView(view);
        setSidebarOpen(false);
    }, []);

    useEffect(() => {
        const handleNavigate = (e: Event) => {
            const customEvent = e as CustomEvent<View>;
            handleViewChange(customEvent.detail);
        };
        window.addEventListener('navigate-view', handleNavigate);
        return () => window.removeEventListener('navigate-view', handleNavigate);
    }, [handleViewChange]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
                <p className="text-lg text-gray-700 dark:text-gray-300">Caricamento in corso...</p>
            </div>
        );
    }

    return (
        <div className={`flex h-screen font-sans text-gray-900 dark:text-gray-100 ${settings.theme}`}>
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
}


const AppContainer: React.FC = () => {
    const { session, loading: isAuthLoading, user } = useAuth();

    if (isAuthLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
                <p className="text-lg text-gray-700 dark:text-gray-300">Autenticazione in corso...</p>
            </div>
        );
    }

    if (!session) {
        return <AuthView />;
    }

    // AppProvider is now inside, ensuring user is not null
    return (
        <AppProvider user={user}>
            <AppContent />
        </AppProvider>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContainer />
        </AuthProvider>
    );
};

export default App;
