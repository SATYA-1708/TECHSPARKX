import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface FileInfo {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
}

interface Message {
    _id: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: string;
    file?: FileInfo;
}

import { SERVER_BASE } from '../config';
const API_URL = SERVER_BASE;

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const Chat = () => {
    const { userId } = useParams<{ userId: string }>();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [partnerData, setPartnerData] = useState<any>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [calling, setCalling] = useState<'voice' | 'video' | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const prevMessageCountRef = useRef(0);
    const isUserNearBottomRef = useRef(true);

    useEffect(() => {
        fetchMessages();
        fetchPartnerProfile();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [userId, user]);

    // Smart scroll: only auto-scroll if user is near the bottom or new messages were sent
    useEffect(() => {
        const isNewMessage = messages.length > prevMessageCountRef.current;
        prevMessageCountRef.current = messages.length;

        if (isNewMessage && isUserNearBottomRef.current) {
            scrollToBottom();
        }
    }, [messages]);

    // Track if user is near bottom of the chat
    const handleScroll = useCallback(() => {
        if (!messagesContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        isUserNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchPartnerProfile = async () => {
        try {
            const response = await fetch(`${API_URL}/api/auth/${userId}`);
            const data = await response.json();
            setPartnerData(data);
        } catch (error) { console.error(error); }
    };

    const fetchMessages = async () => {
        if (!user || !userId) return;
        try {
            const response = await fetch(`${API_URL}/api/messages/${userId}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await response.json();
            if (response.ok && Array.isArray(data)) {
                setMessages(data);
            } else {
                console.error('Failed to fetch messages:', data);
            }
        } catch (error) { console.error('Error fetching messages:', error); }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || (!newMessage.trim() && !selectedFile)) return;

        // Force scroll to bottom when user sends a message
        isUserNearBottomRef.current = true;

        setUploading(true);
        try {
            let body;
            let headers: Record<string, string> = { 'Authorization': `Bearer ${user.token}` };

            if (selectedFile) {
                const formData = new FormData();
                formData.append('receiverId', userId!);
                if (newMessage.trim()) formData.append('content', newMessage);
                formData.append('file', selectedFile);
                body = formData;
            } else {
                body = JSON.stringify({
                    receiverId: userId,
                    content: newMessage
                });
                headers['Content-Type'] = 'application/json';
            }

            const response = await fetch(`${API_URL}/api/messages`, {
                method: 'POST',
                headers,
                body,
            });

            if (response.ok) {
                setNewMessage('');
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                fetchMessages();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const isImage = (mimetype: string) => mimetype.startsWith('image/');

    const renderFileAttachment = (file: FileInfo, isMe: boolean) => {
        const fileUrl = `${API_URL}/uploads/${file.filename}`;

        if (isImage(file.mimetype)) {
            return (
                <div className="mt-2">
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        <img
                            src={fileUrl}
                            alt={file.originalName}
                            className="max-w-full rounded-lg max-h-48 object-cover border border-gray-700"
                        />
                    </a>
                    <div className={`text-[10px] mt-1 ${isMe ? 'text-emerald-800' : 'text-gray-500'}`}>
                        {file.originalName} · {formatFileSize(file.size)}
                    </div>
                </div>
            );
        }

        return (
            <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-2 flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${isMe
                    ? 'bg-emerald-600 border-emerald-700 hover:bg-emerald-700'
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    }`}
            >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${isMe ? 'bg-emerald-700' : 'bg-gray-600'
                    }`}>
                    📄
                </div>
                <div className="min-w-0 flex-1">
                    <div className={`text-xs font-semibold truncate ${isMe ? 'text-white' : 'text-gray-200'}`}>
                        {file.originalName}
                    </div>
                    <div className={`text-[10px] ${isMe ? 'text-emerald-200' : 'text-gray-400'}`}>
                        {formatFileSize(file.size)}
                    </div>
                </div>
                <svg className={`w-4 h-4 shrink-0 ${isMe ? 'text-emerald-200' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </a>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100dvh-64px)] max-w-3xl mx-auto px-2 sm:px-4 py-2 sm:py-6">
            {/* Calling Modal */}
            {calling && (
                <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-xl flex items-center justify-center" style={{ animation: 'fadeUp 0.3s ease-out' }}>
                    <div className="text-center px-4">
                        {/* Animated rings */}
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-8">
                            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                            <div className="absolute inset-2 rounded-full border-2 border-emerald-500/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                            <div className="absolute inset-4 rounded-full border-2 border-emerald-500/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-black">
                                    {partnerData?.name?.charAt(0)}
                                </div>
                            </div>
                        </div>

                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{partnerData?.name || 'Partner'}</h2>
                        <p className="text-gray-400 mb-2">
                            {calling === 'video' ? 'Video calling…' : 'Calling…'}
                        </p>
                        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-10">
                            {calling === 'video' ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            )}
                            <span>Ringing</span>
                            <span className="animate-pulse">•••</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-center gap-6">
                            {calling === 'video' && (
                                <>
                                    <button className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white hover:bg-gray-700 transition-colors" title="Toggle Mic">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                        </svg>
                                    </button>
                                    <button className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white hover:bg-gray-700 transition-colors" title="Toggle Camera">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setCalling(null)}
                                className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                                title="End Call"
                            >
                                <svg className="w-6 h-6 rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header - compact on mobile */}
            <div className="bg-gray-900 rounded-t-xl border border-gray-800 px-3 py-3 sm:p-4 flex items-center gap-2 sm:gap-4 shrink-0">
                <Link to="/inbox" className="text-gray-500 hover:text-white transition-colors shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </Link>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-gray-950 font-bold text-sm sm:text-base shrink-0">
                    {partnerData?.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <h2 className="font-bold text-white leading-tight text-sm sm:text-base truncate">{partnerData?.name || 'Chat'}</h2>
                        {partnerData?.badge === 'Pro' && (
                            <div className="bg-gradient-to-r from-amber-200 to-yellow-400 text-gray-950 text-[8px] sm:text-[10px] font-black px-1 sm:px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                                <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                PRO
                            </div>
                        )}
                        {partnerData?.badge === 'Expert' && (
                            <div className="bg-gradient-to-r from-blue-400 to-cyan-400 text-gray-950 text-[8px] sm:text-[10px] font-black px-1 sm:px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                                <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                EXPERT
                            </div>
                        )}
                    </div>
                    <span className="text-[10px] sm:text-xs text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> Online
                    </span>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
                    {/* Voice Call */}
                    <button
                        onClick={() => setCalling('voice')}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        title="Voice Call"
                    >
                        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </button>
                    {/* Video Call */}
                    <button
                        onClick={() => setCalling('video')}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                        title="Video Call"
                    >
                        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                    {/* View Profile */}
                    <Link to={`/profile/${userId}`} className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all" title="View Profile">
                        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </Link>
                </div>
            </div>

            {/* Messages area */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 bg-gray-950 border-x border-gray-800 px-3 py-3 sm:p-6 overflow-y-auto min-h-0"
            >
                <div className="space-y-3 sm:space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-600">No messages yet. Say hello! 👋</p>
                        </div>
                    )}
                    {messages.map((msg) => {
                        const isMe = msg.senderId === user?._id;
                        return (
                            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] sm:max-w-xs md:max-w-md px-3 py-2 sm:px-4 sm:py-3 rounded-2xl ${isMe
                                    ? 'bg-emerald-500 text-gray-950 rounded-br-md'
                                    : 'bg-gray-800 text-gray-200 rounded-bl-md'
                                    }`}>
                                    {msg.content && <p className="leading-relaxed text-[13px] sm:text-sm break-words">{msg.content}</p>}
                                    {msg.file && renderFileAttachment(msg.file, isMe)}
                                    {!msg.file && (
                                        <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-emerald-800' : 'text-gray-500'}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* File preview */}
            {selectedFile && (
                <div className="bg-gray-900 px-3 py-2 sm:px-4 sm:py-3 border-x border-gray-800 flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-800 rounded-lg flex items-center justify-center text-sm sm:text-lg shrink-0">
                        {selectedFile.type.startsWith('image/') ? '🖼️' : '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-medium text-white truncate">{selectedFile.name}</div>
                        <div className="text-[10px] sm:text-xs text-gray-500">{formatFileSize(selectedFile.size)}</div>
                    </div>
                    <button
                        onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1 shrink-0"
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {/* Input area */}
            <div className="bg-gray-900 px-2 py-2 sm:p-4 border border-t-0 border-gray-800 rounded-b-xl shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-1.5 sm:gap-3 items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={handleFileSelect}
                        className="text-gray-500 hover:text-emerald-400 transition-colors p-2 rounded-lg hover:bg-gray-800 shrink-0"
                        title="Attach file"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-full text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                        placeholder={selectedFile ? "Caption..." : "Message..."}
                    />
                    <button
                        type="submit"
                        className="bg-emerald-500 text-gray-950 p-2.5 sm:p-3 rounded-full hover:bg-emerald-400 transition-all active:scale-90 disabled:opacity-50 shrink-0"
                        disabled={(!newMessage.trim() && !selectedFile) || uploading}
                    >
                        {uploading ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
