import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        logout();
        setSettingsOpen(false);
        setMobileMenuOpen(false);
        navigate('/');
    };

    // Close panels on route change
    useEffect(() => {
        setSettingsOpen(false);
        setMobileMenuOpen(false);
    }, [location.pathname]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setSettingsOpen(false);
            }
        };
        if (settingsOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [settingsOpen]);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSettingsOpen(false);
                setMobileMenuOpen(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, []);

    return (
        <>
            <nav className="bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center">
                            <Link to="/" className="flex items-center gap-2.5 group">
                                {/* 4-pointed spark mark */}
                                <svg className="w-5 h-5 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 0 L11.8 8.2 L20 10 L11.8 11.8 L10 20 L8.2 11.8 L0 10 L8.2 8.2 Z" />
                                </svg>
                                <span className="text-[22px] font-black tracking-tight leading-none">
                                    <span className="text-white">TECH</span><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">SPARK</span><span className="text-cyan-300">X</span>
                                </span>
                            </Link>
                        </div>

                        {/* Desktop Navigation - hidden on mobile */}
                        <div className="hidden md:flex items-center gap-1">
                            <Link to="/" className="text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-800/50">
                                Home
                            </Link>
                            <Link to="/projects" className="text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-800/50">
                                Browse Jobs
                            </Link>
                            {user ? (
                                <>
                                    <Link to="/my-projects" className="text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-800/50">
                                        My Projects
                                    </Link>
                                    <Link to="/inbox" className="text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-800/50">
                                        Messages
                                    </Link>
                                    <div className="w-px h-6 bg-gray-800 mx-2"></div>
                                    {user.role === 'employer' && (
                                        <Link to="/post-project" className="btn-primary !py-2 !px-4 text-sm mr-2">
                                            Post Job
                                        </Link>
                                    )}
                                    {/* Credit Badge */}
                                    <Link
                                        to="/membership"
                                        title="Buy more credits"
                                        className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                    >
                                        <span>💳</span>
                                        <span>{(user as any).credits ?? 0} credits</span>
                                    </Link>
                                    {/* Settings Button */}
                                    <button
                                        onClick={() => setSettingsOpen(!settingsOpen)}
                                        className="flex items-center gap-2 text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-800/50"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Settings
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/help" className="text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-800/50">
                                        Help
                                    </Link>
                                    <Link to="/login" className="text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-800/50">
                                        Log In
                                    </Link>
                                    <Link to="/register" className="btn-primary !py-2 !px-4 text-sm ml-2">
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Mobile: Action buttons + Hamburger */}
                        <div className="flex md:hidden items-center gap-2">
                            {user && user.role === 'employer' && (
                                <Link to="/post-project" className="btn-primary !py-1.5 !px-3 text-xs">
                                    Post
                                </Link>
                            )}
                            {!user && (
                                <Link to="/login" className="btn-primary !py-1.5 !px-3 text-xs">
                                    Login
                                </Link>
                            )}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                            >
                                {mobileMenuOpen ? (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-800 bg-gray-950/95 backdrop-blur-xl" style={{ animation: 'fadeIn 0.15s ease-out' }}>
                        <div className="px-4 py-3 space-y-1">
                            <Link to="/" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                Home
                            </Link>
                            <Link to="/projects" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                Browse Jobs
                            </Link>
                            {user ? (
                                <>
                                    <Link to="/my-projects" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                        My Projects
                                    </Link>
                                    <Link to="/inbox" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                        Messages
                                    </Link>

                                    <div className="my-2 border-t border-gray-800"></div>

                                    <Link to="/profile" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                        Profile
                                    </Link>
                                    <Link to="/membership" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                        Membership
                                    </Link>
                                    <Link to="/referral" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                        Refer & Earn
                                    </Link>
                                    <Link to="/escrow" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                        Payment
                                    </Link>
                                    <Link to="/help" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                        Help
                                    </Link>
                                    <Link to="/about" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                        About Us
                                    </Link>
                                    <Link to="/terms" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                        Terms & Conditions
                                    </Link>

                                    <div className="my-2 border-t border-gray-800"></div>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm font-medium transition-all"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/help" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                        Help
                                    </Link>
                                    <Link to="/about" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                        About Us
                                    </Link>
                                    <div className="my-2 border-t border-gray-800"></div>
                                    <Link to="/login" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
                                        Log In
                                    </Link>
                                    <Link to="/register" className="block px-3 py-2.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-sm font-bold transition-all">
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Settings Slide-out Panel (Desktop) */}
            {settingsOpen && (
                <div className="fixed inset-0 z-[60]">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        style={{ animation: 'fadeIn 0.2s ease-out' }}
                    />

                    {/* Panel */}
                    <div
                        ref={panelRef}
                        className="absolute top-0 right-0 h-full w-72 bg-gray-900 border-l border-gray-800 shadow-2xl"
                        style={{ animation: 'slideInRight 0.25s ease-out' }}
                    >
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                            <h2 className="text-lg font-bold text-white">Settings</h2>
                            <button
                                onClick={() => setSettingsOpen(false)}
                                className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* User Info */}
                        {user && (
                            <div className="px-5 py-4 border-b border-gray-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold text-lg">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-sm">{user.name}</p>
                                        <p className="text-gray-500 text-xs">{user.email}</p>
                                    </div>
                                </div>
                                <Link
                                    to="/membership"
                                    className="flex items-center justify-between bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl px-3 py-2.5 transition-all group"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">💳</span>
                                        <div>
                                            <p className="text-emerald-400 font-bold text-sm">{(user as any).credits ?? 0} Credits</p>
                                            <p className="text-gray-500 text-[11px]">Tap to buy more</p>
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </div>
                        )}

                        {/* Menu Items */}
                        <div className="px-3 py-3 space-y-1">
                            <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-all text-sm font-medium group">
                                <svg className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Profile
                            </Link>
                            <Link to="/membership" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-all text-sm font-medium group">
                                <svg className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                                <strong>Membership</strong>
                            </Link>
                            <Link to="/referral" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-all text-sm font-medium group">
                                <svg className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Refer & Earn
                            </Link>
                            <Link to="/escrow" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-all text-sm font-medium group">
                                <svg className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Payment
                            </Link>
                            <Link to="/help" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-all text-sm font-medium group">
                                <svg className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Help
                            </Link>
                            <Link to="/about" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-all text-sm font-medium group">
                                <svg className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                About Us
                            </Link>
                            <Link to="/terms" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-all text-sm font-medium group">
                                <svg className="w-5 h-5 text-gray-500 group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Terms & Conditions
                            </Link>

                            <div className="my-2 border-t border-gray-800"></div>

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-sm font-medium group w-full"
                            >
                                <svg className="w-5 h-5 text-red-500/60 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </>
    );
};
