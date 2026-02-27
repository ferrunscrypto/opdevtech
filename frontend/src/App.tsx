import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';

export function App() {
    const { walletAddress } = useWalletConnect();

    return (
        <BrowserRouter>
            <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
                <Header />
                <Routes>
                    <Route path="/" element={walletAddress ? <DashboardPage /> : <LandingPage />} />
                    <Route path="/profile/:address" element={<DashboardPage />} />
                    <Route path="*" element={walletAddress ? <DashboardPage /> : <LandingPage />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}
