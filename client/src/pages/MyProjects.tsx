import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_BASE } from '../config';

interface Project {
    _id: string;
    title: string;
    description: string;
    budget: number;
    user: string;
    userName: string;
    createdAt: string;
    bids: any[];
    status?: string;
    awardedTo?: string;
    awardedToName?: string;
}

type Tab = 'posted' | 'working';

export const MyProjects = () => {
    const { user } = useAuth();
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('posted');

    useEffect(() => { if (user) fetchProjects(); }, [user]);

    const fetchProjects = async () => {
        try {
            const res = await fetch(`${API_BASE}/projects`);
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                setAllProjects(data);
            } else {
                console.error('Failed to fetch projects or invalid format:', data);
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
        } finally {
            setLoading(false);
        }
    };

    const timeAgo = (date: string) => {
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return new Date(date).toLocaleDateString();
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gray-900 rounded-2xl border border-gray-800 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <p className="text-gray-400 text-lg mb-6">Sign in to access your projects</p>
                    <Link to="/login" className="btn-primary">Log In</Link>
                </div>
            </div>
        );
    }

    const posted = allProjects.filter(p => p.user === user._id);
    const working = allProjects.filter(p => p.awardedTo === user._id);
    const projects = tab === 'posted' ? posted : working;

    const totalEarnings = working.reduce((sum, p) => {
        const myBid = p.bids.find((b: any) => b.userId === user._id);
        return sum + Number(myBid ? myBid.amount : p.budget || 0);
    }, 0);

    const totalSpend = posted.reduce((sum, p) => sum + Number(p.budget || 0), 0);

    return (
        <div className="min-h-screen">
            {/* Hero Header */}
            <div className="relative overflow-hidden border-b border-gray-800/50">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-emerald-500/5" />
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl -translate-y-1/2" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-emerald-500/8 rounded-full blur-3xl translate-y-1/2" />

                <div className="relative container mx-auto px-4 py-12 pb-8">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-emerald-500 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </div>
                                <span className="text-violet-400 text-sm font-bold uppercase tracking-wider">Dashboard</span>
                            </div>
                            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">My Projects</h1>
                            <p className="text-gray-400 text-lg">Manage your posted projects and active freelance work</p>
                        </div>

                        <Link to="/post-project" className="btn-primary flex items-center gap-2 w-fit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                            </svg>
                            Post New Project
                        </Link>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
                        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl px-4 py-3">
                            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Posted</p>
                            <p className="text-2xl font-black text-white">{posted.length}</p>
                        </div>
                        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl px-4 py-3">
                            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Working On</p>
                            <p className="text-2xl font-black text-white">{working.length}</p>
                        </div>
                        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl px-4 py-3">
                            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Spend</p>
                            <p className="text-2xl font-black text-emerald-400">${totalSpend.toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl px-4 py-3">
                            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Earnings</p>
                            <p className="text-2xl font-black text-cyan-400">${totalEarnings.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Tabs */}
                <div className="flex gap-1 mb-8 bg-gray-900/60 backdrop-blur-sm p-1.5 rounded-xl border border-gray-800 w-fit">
                    <button
                        onClick={() => setTab('posted')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${tab === 'posted'
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-gray-950 shadow-lg shadow-emerald-500/20'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Posted ({posted.length})
                    </button>
                    <button
                        onClick={() => setTab('working')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${tab === 'working'
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-gray-950 shadow-lg shadow-emerald-500/20'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Working On ({working.length})
                    </button>
                </div>

                {/* Loading */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4" style={{ animation: `fadeUp 0.5s ease-out ${i * 0.1}s both` }}>
                                <div className="flex justify-between">
                                    <div className="h-6 w-20 bg-gray-800 rounded-full animate-pulse" />
                                    <div className="h-6 w-16 bg-gray-800 rounded animate-pulse" />
                                </div>
                                <div className="h-5 w-3/4 bg-gray-800 rounded animate-pulse" />
                                <div className="space-y-2">
                                    <div className="h-3 w-full bg-gray-800/60 rounded animate-pulse" />
                                    <div className="h-3 w-2/3 bg-gray-800/60 rounded animate-pulse" />
                                </div>
                                <div className="pt-4 border-t border-gray-800 flex justify-between">
                                    <div className="h-4 w-20 bg-gray-800 rounded animate-pulse" />
                                    <div className="h-4 w-16 bg-gray-800 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-20" style={{ animation: 'fadeUp 0.6s ease-out' }}>
                        <div className="relative w-24 h-24 mx-auto mb-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-emerald-500/20 rounded-2xl rotate-6 animate-pulse" />
                            <div className="absolute inset-0 bg-gray-900 rounded-2xl border border-gray-800 flex items-center justify-center">
                                {tab === 'posted' ? (
                                    <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                ) : (
                                    <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            {tab === 'posted' ? 'No projects posted yet' : 'Not working on any projects'}
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            {tab === 'posted'
                                ? "Post your first project and connect with talented freelancers!"
                                : "Browse available jobs and place bids to start working!"}
                        </p>
                        <Link to={tab === 'posted' ? '/post-project' : '/projects'} className="btn-primary">
                            {tab === 'posted' ? 'Post a Project' : 'Browse Jobs'}
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project, idx) => {
                            const isFreelancerView = tab === 'working';
                            return (
                                <Link
                                    key={project._id}
                                    to={`/projects/${project._id}`}
                                    className="group relative"
                                    style={{ animation: `fadeUp 0.5s ease-out ${Math.min(idx * 0.07, 0.5)}s both` }}
                                >
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/0 to-emerald-500/0 rounded-xl blur-lg opacity-0 group-hover:opacity-40 group-hover:from-violet-500/20 group-hover:to-emerald-500/20 transition-all duration-500" />

                                    <div className="relative bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-800/80 p-6 h-full flex flex-col transition-all duration-300 group-hover:border-violet-500/30 group-hover:bg-gray-900">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {project.status === 'awarded' ? (
                                                    <span className="bg-amber-500/10 text-amber-400 text-[11px] font-bold px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" /> Awarded
                                                    </span>
                                                ) : (
                                                    <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Open
                                                    </span>
                                                )}
                                                {isFreelancerView && (
                                                    <span className="bg-blue-500/10 text-blue-400 text-[11px] font-bold px-2.5 py-1 rounded-full border border-blue-500/20">
                                                        Freelancing
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-emerald-400 font-black text-xl leading-none">${project.budget}</p>
                                                <p className="text-gray-600 text-[10px] font-medium mt-0.5">BUDGET</p>
                                            </div>
                                        </div>

                                        <h3 className="text-[17px] font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors duration-300 line-clamp-2 leading-snug">
                                            {project.title}
                                        </h3>

                                        <p className="text-gray-500 mb-5 flex-1 line-clamp-3 text-sm leading-relaxed">
                                            {project.description}
                                        </p>

                                        <div className="pt-4 border-t border-gray-800/60 flex items-center justify-between">
                                            {isFreelancerView ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-gray-800">
                                                        {project.userName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-300 text-xs font-semibold">{project.userName}</p>
                                                        <p className="text-gray-600 text-[10px]">Employer</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-gray-500">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span className="text-xs font-semibold">{project.bids.length} bid{project.bids.length !== 1 ? 's' : ''}</span>
                                                </div>
                                            )}
                                            {!isFreelancerView && project.status === 'awarded' && project.awardedToName && (
                                                <span className="text-amber-400 text-[11px] font-semibold flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                    {project.awardedToName}
                                                </span>
                                            )}
                                            <span className="text-gray-600 text-xs">{timeAgo(project.createdAt)}</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
