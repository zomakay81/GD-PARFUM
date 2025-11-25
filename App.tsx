
import React, { useState, useCallback, useMemo } from 'react';
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

    return (
        <div className={`flex h-screen font-sans text-gray-900 dark:text-gray-100 ${settings.theme}`}>
            <Sidebar isOpen={isSidebarOpen} setView={handleViewChange} currentView={currentView} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
                    <div className="container mx-auto max-w-7xl">
                        <MainViews view={currentView} />
                    </div>
                </main>
            </div>
            {settings.aiAssistantEnabled && (
                <>
                    <button
                        onClick={() => setAiChatOpen(!isAiChatOpen)}
                        className="fixed bottom-6 right-6 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg transition-transform transform hover:scale-110 z-50"
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
