
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useAppContext } from '../state/AppContext';
import { Button, Input } from './ui';
import { Send, Loader } from 'lucide-react';

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

export const AIChat: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { state, settings } = useAppContext();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // NOTA: La chiave API dovrebbe essere gestita in modo sicuro. 
            // process.env.API_KEY viene iniettato dall'ambiente di esecuzione.
            if (!process.env.API_KEY) {
                throw new Error("API_KEY non trovata. Assicurati che sia configurata nell'ambiente.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Fornisce un contesto di base all'AI
            const contextPrompt = `Sei un assistente per un'app di gestione di una profumeria. I dati attuali sono: ${JSON.stringify(state[settings.currentYear], null, 2).substring(0, 3000)}... Rispondi in modo conciso e pertinente alla gestione.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `${contextPrompt}\n\nDomanda utente: ${input}`,
            });

            const aiMessage: Message = { sender: 'ai', text: response.text };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Errore durante la chiamata all'API Gemini:", error);
            const errorMessage: Message = { sender: 'ai', text: "Spiacente, si è verificato un errore. Controlla la console per i dettagli." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-20 right-6 w-full max-w-sm h-auto max-h-[70vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col z-40">
            <header className="p-4 border-b dark:border-gray-700">
                <h3 className="font-semibold text-lg">Assistente AI</h3>
            </header>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`rounded-lg px-4 py-2 max-w-[80%] ${msg.sender === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex justify-start">
                        <div className="rounded-lg px-4 py-2 bg-gray-200 dark:bg-gray-700 flex items-center">
                            <Loader className="animate-spin h-5 w-5" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <footer className="p-4 border-t dark:border-gray-700">
                <div className="flex items-center space-x-2">
                    <Input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Chiedi qualcosa..."
                        disabled={isLoading}
                    />
                    <Button onClick={handleSend} disabled={isLoading}>
                       <Send size={18} />
                    </Button>
                </div>
            </footer>
        </div>
    );
};
