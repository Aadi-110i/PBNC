import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, Loader2, FileCheck, AlertCircle, ChevronRight,
  Check, BrainCircuit, FileText, Trash2, RefreshCw, Edit3, Save, BookOpen,
  Clock, CheckCircle, XCircle, AlertTriangle, Link
} from 'lucide-react';

const API_URL = 'http://localhost:8000/api/v1';

// ─── Toast Notification System ───────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }

const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: number) => void }) => (
  <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
    <AnimatePresence>
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.9 }}
          className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl text-sm font-medium min-w-[280px] ${
            t.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200' :
            t.type === 'error'   ? 'bg-rose-500/20 border-rose-500/30 text-rose-200' :
                                   'bg-brand-500/20 border-brand-500/30 text-brand-200'
          }`}
        >
          {t.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> :
           t.type === 'error'   ? <XCircle className="w-5 h-5 shrink-0" /> :
                                  <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    completed:  { bg: 'bg-emerald-500/15 border-emerald-500/20', text: 'text-emerald-400', icon: <CheckCircle className="w-3 h-3" />, label: 'Completed' },
    processing: { bg: 'bg-amber-500/15 border-amber-500/20',    text: 'text-amber-400',   icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Processing' },
    failed:     { bg: 'bg-rose-500/15 border-rose-500/20',      text: 'text-rose-400',    icon: <XCircle className="w-3 h-3" />, label: 'Failed' },
    pending:    { bg: 'bg-slate-500/15 border-slate-500/20',    text: 'text-slate-400',   icon: <Clock className="w-3 h-3" />, label: 'Pending' },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider border ${c.bg} ${c.text}`}>
      {c.icon} {c.label}
    </span>
  );
};

// ─── Confidence Bar ───────────────────────────────────────────────────────────
const ConfidenceBar = ({ value }: { value: number }) => {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-slate-400 font-medium tabular-nums">{pct}%</span>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'detail' | 'review'>('all');
  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [editAnswer, setEditAnswer] = useState('');
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isReprocessing, setIsReprocessing] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/documents`);
      setDocuments(res.data);
    } catch {
      // silently retry
    }
  }, []);

  const fetchReviewQuestions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/questions/review`);
      setReviewQuestions(res.data);
    } catch {
      // silently retry
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchDocuments();
    fetchReviewQuestions();
    const interval = setInterval(() => {
      fetchDocuments();
      fetchReviewQuestions();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchDocuments, fetchReviewQuestions]);

  // Re-fetch selected doc when documents update (catches status changes)
  useEffect(() => {
    if (selectedDoc && activeTab === 'detail') {
      const updated = documents.find(d => d.id === selectedDoc.id);
      if (updated && updated.status !== selectedDoc.status) {
        viewDetail(updated);
      }
    }
  }, [documents]);

  // ─── Upload Handler ─────────────────────────────────────────────────────────
  const processUpload = async (file: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      addToast('Invalid file type. Please upload a PDF or image (JPEG/PNG).', 'error');
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addToast(`"${file.name}" uploaded! AI extraction started.`, 'success');
      fetchDocuments();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Upload failed. Please try again.';
      addToast(msg, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUpload(file);
  };

  // ─── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUpload(file);
  };

  // ─── Document Actions ───────────────────────────────────────────────────────
  const viewDetail = async (doc: any) => {
    try {
      const res = await axios.get(`${API_URL}/documents/${doc.id}`);
      setSelectedDoc(res.data);
      setActiveTab('detail');
    } catch {
      addToast('Failed to load document details.', 'error');
    }
  };

  const deleteDocument = async (docId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(docId);
    try {
      await axios.delete(`${API_URL}/documents/${docId}`);
      addToast('Document deleted.', 'success');
      if (selectedDoc?.id === docId) { setSelectedDoc(null); setActiveTab('all'); }
      fetchDocuments();
    } catch {
      addToast('Failed to delete document.', 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const reprocessDocument = async (docId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsReprocessing(docId);
    try {
      await axios.post(`${API_URL}/documents/${docId}/reprocess`);
      addToast('Re-extraction started!', 'success');
      fetchDocuments();
      if (selectedDoc?.id === docId) viewDetail(selectedDoc);
    } catch {
      addToast('Failed to start re-processing.', 'error');
    } finally {
      setIsReprocessing(null);
    }
  };

  // ─── Question Edit ──────────────────────────────────────────────────────────
  const saveQuestionEdit = async (questionId: number) => {
    try {
      await axios.put(`${API_URL}/questions/${questionId}`, { answer: editAnswer });
      addToast('Answer updated!', 'success');
      setEditingQuestion(null);
      if (selectedDoc) viewDetail(selectedDoc);
      fetchReviewQuestions();
    } catch {
      addToast('Failed to update answer.', 'error');
    }
  };

  // ─── Link Answer Key ────────────────────────────────────────────────────────
  const linkAnswerKey = async (answerKeyId: string) => {
    if (!answerKeyId || !selectedDoc) return;
    try {
      const res = await axios.post(`${API_URL}/documents/${selectedDoc.id}/link_answer_key?answer_key_id=${answerKeyId}`);
      setSelectedDoc(res.data);
      addToast('Answer key linked!', 'success');
      fetchDocuments();
    } catch {
      addToast('Failed to link answer key.', 'error');
    }
  };

  const getAnswerKeyFilename = (parentId: number) => {
    const doc = documents.find(d => d.id === parentId);
    return doc?.filename ?? `Doc #${parentId}`;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen text-slate-50 relative overflow-hidden pt-24 pb-16 px-4 md:px-8"
      style={{ backgroundColor: '#0f172a' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Drag-over overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
            style={{ background: 'rgba(20, 184, 166, 0.08)', backdropFilter: 'blur(4px)' }}
          >
            <div className="text-center" style={{ border: '2px dashed #14b8a6', borderRadius: '2rem', padding: '4rem 6rem' }}>
              <Upload className="w-16 h-16 mx-auto mb-4" style={{ color: '#14b8a6' }} />
              <p className="text-2xl font-bold" style={{ color: '#14b8a6' }}>Drop your file here</p>
              <p className="text-slate-400 mt-2">PDF or Image (JPEG/PNG)</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)', transform: 'translate(-20%, -20%)' }} />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', transform: 'translate(20%, 20%)' }} />

      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 10 }}>

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Intelligence Dashboard</h1>
            <p className="text-slate-400 font-light">Upload documents for AI-powered question extraction & review.</p>
          </div>

          {/* Tab navigation + Upload */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('all')}
              className="px-5 py-2.5 font-medium rounded-xl transition-all focus-visible:outline-none"
              style={activeTab === 'all' ? { background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } : { color: '#94a3b8' }}
            >
              All Documents
              {documents.length > 0 && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', color: '#cbd5e1' }}>{documents.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className="px-5 py-2.5 font-medium rounded-xl transition-all flex items-center gap-2 focus-visible:outline-none"
              style={activeTab === 'review' ? { background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' } : { color: '#94a3b8' }}
            >
              <AlertTriangle className="w-4 h-4" />
              Review Needed
              {reviewQuestions.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#ef4444', color: 'white' }}>{reviewQuestions.length}</span>
              )}
            </button>

            {/* Upload button */}
            <div className="relative ml-2">
              <input
                ref={fileInputRef}
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileInput}
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium cursor-pointer transition-all"
                style={{
                  background: isUploading ? 'rgba(20,184,166,0.5)' : '#14b8a6',
                  color: 'white',
                  boxShadow: '0 0 20px rgba(20,184,166,0.3)',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                }}
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                {isUploading ? 'Uploading…' : 'Upload Document'}
              </label>
            </div>
          </div>
        </div>

        {/* ── Drag hint ── */}
        {documents.length === 0 && activeTab === 'all' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-16 text-center mb-8 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            style={{ border: '2px dashed rgba(255,255,255,0.1)' }}
          >
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
              <BrainCircuit className="w-10 h-10" style={{ color: '#14b8a6' }} />
            </div>
            <h3 className="text-2xl font-bold mb-3">No documents yet</h3>
            <p className="text-slate-400 mb-6">Upload a PDF or image to extract questions with AI</p>
            <p className="text-sm" style={{ color: '#14b8a6' }}>Click here or drag & drop a file anywhere on the page</p>
          </motion.div>
        )}

        {/* ── All Documents Tab ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'all' && documents.length > 0 && (
            <motion.div key="all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bento-grid">
                {documents.map((doc, i) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 200, damping: 22 }}
                    onClick={() => viewDetail(doc)}
                    className="glass-card p-6 cursor-pointer flex flex-col justify-between group relative"
                    role="button"
                    tabIndex={0}
                    aria-label={`View document ${doc.filename}`}
                    onKeyDown={(e) => e.key === 'Enter' && viewDetail(doc)}
                    style={{ minHeight: '180px' }}
                  >
                    {/* Action buttons */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(doc.status === 'failed' || doc.status === 'completed') && (
                        <button
                          onClick={(e) => reprocessDocument(doc.id, e)}
                          className="p-2 rounded-lg transition-all"
                          style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}
                          title="Re-extract questions"
                        >
                          {isReprocessing === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={(e) => deleteDocument(doc.id, e)}
                        className="p-2 rounded-lg transition-all"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                        title="Delete document"
                      >
                        {isDeleting === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={
                        doc.status === 'completed' ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' } :
                        doc.status === 'failed'    ? { background: 'rgba(239,68,68,0.1)',  border: '1px solid rgba(239,68,68,0.2)',  color: '#f87171' } :
                                                     { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }
                      }>
                        {doc.status === 'completed' ? <CheckCircle className="w-6 h-6" /> :
                         doc.status === 'failed'    ? <XCircle className="w-6 h-6" /> :
                         doc.status === 'processing' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                                                       <Clock className="w-6 h-6" />}
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>

                    <div>
                      <h4 className="font-bold text-lg mb-1 pr-8 leading-tight" style={{ wordBreak: 'break-word' }}>{doc.filename}</h4>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-sm text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Review Tab ── */}
          {activeTab === 'review' && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#fca5a5' }}>Questions Requiring Review</h2>
              {reviewQuestions.length === 0 ? (
                <div className="glass-card p-16 text-center text-slate-400">
                  <CheckCircle className="w-14 h-14 mx-auto mb-4" style={{ color: '#34d399', opacity: 0.6 }} />
                  <p className="text-xl font-semibold text-slate-300 mb-2">All clear!</p>
                  <p>No questions need review right now.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
                  {reviewQuestions.map((q, i) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="glass-card p-6"
                      style={{ borderLeft: '4px solid #ef4444' }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                          Doc: {documents.find(d => d.id === q.document_id)?.filename ?? `#${q.document_id}`}
                        </span>
                        <ConfidenceBar value={q.confidence} />
                      </div>

                      <h3 className="text-base font-medium text-slate-200 mb-4 leading-relaxed">{q.question_text}</h3>

                      {editingQuestion === q.id ? (
                        <div className="flex gap-2 mt-4">
                          <input
                            autoFocus
                            value={editAnswer}
                            onChange={e => setEditAnswer(e.target.value)}
                            placeholder="Enter correct answer…"
                            className="flex-1 px-3 py-2 rounded-xl text-sm text-slate-200 focus:outline-none"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                            onKeyDown={e => e.key === 'Enter' && saveQuestionEdit(q.id)}
                          />
                          <button onClick={() => saveQuestionEdit(q.id)} className="p-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingQuestion(null)} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <span className="text-sm px-3 py-1 rounded-full" style={
                            q.answer && q.answer !== 'null' && q.answer !== 'TBD'
                              ? { background: 'rgba(16,185,129,0.1)', color: '#34d399' }
                              : { background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }
                          }>
                            {q.answer && q.answer !== 'null' && q.answer !== 'TBD' ? `Answer: ${q.answer}` : '⚠ Missing answer'}
                          </span>
                          <button
                            onClick={() => { setEditingQuestion(q.id); setEditAnswer(q.answer ?? ''); }}
                            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition-all"
                            style={{ background: 'rgba(20,184,166,0.15)', color: '#2dd4bf' }}
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Document Detail Tab ── */}
          {activeTab === 'detail' && selectedDoc && (
            <motion.div key="detail" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Back button */}
              <button
                className="flex items-center gap-2 mb-8 font-medium transition-colors group focus-visible:outline-none"
                style={{ color: '#2dd4bf' }}
                onClick={() => setActiveTab('all')}
              >
                <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                Back to Documents
              </button>

              {/* Doc header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between pb-8 mb-8 gap-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <StatusBadge status={selectedDoc.status} />
                    {selectedDoc.parent_id && (
                      <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
                        <Link className="w-3 h-3" />
                        Answer key: {getAnswerKeyFilename(selectedDoc.parent_id)}
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold break-words">{selectedDoc.filename}</h2>
                  <p className="text-slate-400 mt-1 text-sm">{selectedDoc.questions?.length ?? 0} questions extracted · {new Date(selectedDoc.created_at).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Link answer key */}
                  {!selectedDoc.parent_id && documents.filter(d => d.id !== selectedDoc.id).length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => linkAnswerKey(e.target.value)}
                      className="text-sm rounded-xl px-4 py-2.5 focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                    >
                      <option value="" disabled>Link Answer Key…</option>
                      {documents.filter(d => d.id !== selectedDoc.id).map(d => (
                        <option key={d.id} value={d.id} style={{ background: '#1e293b' }}>{d.filename}</option>
                      ))}
                    </select>
                  )}
                  {/* Reprocess button */}
                  <button
                    onClick={() => reprocessDocument(selectedDoc.id)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}
                  >
                    {isReprocessing === selectedDoc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Re-extract
                  </button>
                </div>
              </div>

              {/* Processing states */}
              {selectedDoc.status === 'processing' || selectedDoc.status === 'pending' ? (
                <div className="glass-card p-20 text-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
                    <BrainCircuit className="w-10 h-10 animate-pulse" style={{ color: '#14b8a6' }} />
                  </div>
                  <p className="text-xl font-bold text-slate-300 mb-2">AI is analyzing your document…</p>
                  <p className="text-slate-500">This page will update automatically when complete.</p>
                </div>
              ) : selectedDoc.status === 'failed' ? (
                <div className="glass-card p-16 text-center" style={{ borderLeft: '4px solid #ef4444' }}>
                  <XCircle className="w-14 h-14 mx-auto mb-4" style={{ color: '#f87171', opacity: 0.7 }} />
                  <p className="text-xl font-bold text-slate-300 mb-2">Extraction failed</p>
                  <p className="text-slate-500 mb-6">This can happen if the Gemini API key is missing or the file is unreadable.</p>
                  <button
                    onClick={() => reprocessDocument(selectedDoc.id)}
                    className="px-6 py-3 rounded-xl font-medium transition-all"
                    style={{ background: '#14b8a6', color: 'white' }}
                  >
                    Try Again
                  </button>
                </div>
              ) : selectedDoc.questions?.length === 0 ? (
                <div className="glass-card p-16 text-center">
                  <FileText className="w-14 h-14 mx-auto mb-4 text-slate-500 opacity-50" />
                  <p className="text-xl font-bold text-slate-300 mb-2">No questions found</p>
                  <p className="text-slate-500">The AI didn't detect any questions in this document.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {selectedDoc.questions.map((q: any, i: number) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="glass-card p-8"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
                        <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full inline-block w-fit" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)', color: '#2dd4bf' }}>
                          Question {q.question_number || (i + 1)}
                        </span>
                        <div className="flex items-center gap-4">
                          {q.source_pages?.length > 0 && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5" />
                              Page {q.source_pages.join(', ')}
                            </span>
                          )}
                          <ConfidenceBar value={q.confidence} />
                        </div>
                      </div>

                      <h3 className="text-lg font-medium text-slate-200 mb-5 leading-relaxed">{q.question_text}</h3>

                      {q.options && q.options.length > 0 && (
                        <div className="grid sm:grid-cols-2 gap-3 mb-6">
                          {q.options.map((opt: string, j: number) => (
                            <div
                              key={j}
                              className="p-4 rounded-xl text-slate-300 transition-colors"
                              style={{
                                background: q.answer && opt.toString().startsWith(q.answer)
                                  ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                                border: q.answer && opt.toString().startsWith(q.answer)
                                  ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.06)',
                              }}
                            >
                              <span className="font-bold mr-2" style={{ color: '#2dd4bf' }}>{String.fromCharCode(65 + j)}.</span>
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex flex-wrap items-center gap-4">
                          {q.question_type && (
                            <span className="text-sm text-slate-400 flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-slate-500" />
                              {q.question_type}
                            </span>
                          )}
                          <span className="text-sm flex items-center gap-1.5" style={q.answer && q.answer !== 'null' && q.answer !== 'TBD' ? { color: '#34d399' } : { color: '#fbbf24' }}>
                            <Check className="w-4 h-4" />
                            {q.answer && q.answer !== 'null' && q.answer !== 'TBD' ? q.answer : 'No answer identified'}
                          </span>
                        </div>
                        {/* Edit answer inline */}
                        {editingQuestion === q.id ? (
                          <div className="flex gap-2">
                            <input
                              autoFocus
                              value={editAnswer}
                              onChange={e => setEditAnswer(e.target.value)}
                              placeholder="Correct answer…"
                              className="px-3 py-1.5 rounded-xl text-sm focus:outline-none"
                              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0' }}
                              onKeyDown={e => e.key === 'Enter' && saveQuestionEdit(q.id)}
                            />
                            <button onClick={() => saveQuestionEdit(q.id)} className="p-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditingQuestion(null)} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)', color: '#64748b' }}><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingQuestion(q.id); setEditAnswer(q.answer ?? ''); }}
                            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition-all"
                            style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit Answer
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;
