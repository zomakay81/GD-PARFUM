import React, { useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import { Button, Input, Card, Alert } from './ui';
import { Lock, Mail } from 'lucide-react';

export const AuthView: React.FC = () => {
    const [view, setView] = useState<'login' | 'signup'>('login');

    if (view === 'signup') {
        return <SignUpView onLoginClick={() => setView('login')} />;
    }

    return <LoginView onSignUpClick={() => setView('signup')} />;
}

const LoginView: React.FC<{ onSignUpClick: () => void }> = ({ onSignUpClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert(error.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full mx-auto p-4">
                <Card title="Login">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input type="email" label="Email" value={email} onChange={e => setEmail(e.target.value)} placeholder="iltuo@indirizzo.email" icon={<Mail size={16} />} required />
                        <Input type="password" label="Password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" icon={<Lock size={16} />} required />
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? 'Accesso in corso...' : 'Accedi'}
                        </Button>
                    </form>
                    <div className="text-center mt-4">
                        <button onClick={onSignUpClick} className="text-sm text-primary-600 hover:underline">
                            Non hai un account? Registrati
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

const SignUpView: React.FC<{ onLoginClick: () => void }> = ({ onLoginClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            alert(error.message);
        } else {
            setMessage('Registrazione avvenuta! Controlla la tua email per il link di conferma.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full mx-auto p-4">
                <Card title="Registra un Nuovo Account">
                    {message && <Alert type="info" message={message} />}
                    <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                        <Input type="email" label="Email" value={email} onChange={e => setEmail(e.target.value)} placeholder="iltuo@indirizzo.email" icon={<Mail size={16} />} required />
                        <Input type="password" label="Password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" icon={<Lock size={16} />} required />
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? 'Registrazione in corso...' : 'Registrati'}
                        </Button>
                    </form>
                    <div className="text-center mt-4">
                        <button onClick={onLoginClick} className="text-sm text-primary-600 hover:underline">
                            Hai già un account? Accedi
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
};
