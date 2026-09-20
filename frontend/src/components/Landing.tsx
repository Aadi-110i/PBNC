import React from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, BrainCircuit, ShieldCheck, ArrowRight } from 'lucide-react';

const Landing = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 premium-blur">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(20,184,166,0.5)]">P</div>
            <span className="font-semibold text-xl tracking-tight">Pragati Bharati</span>
          </div>
          <button 
            onClick={onGetStarted}
            className="bg-white/10 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-medium text-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              Document Intelligence Engine 2.0
            </div>
            <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-[1.1] tracking-tight">
              Extract knowledge <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-400">with absolute precision.</span>
            </h1>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
              Transform unstructured exam papers and question banks into structured, high-fidelity data. Powered by multimodal AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onGetStarted}
                className="bg-brand-500 text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-brand-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(20,184,166,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-brand-500"
              >
                Upload Document
              </button>
              <button className="text-slate-300 px-8 py-4 rounded-full text-lg font-medium hover:bg-white/5 transition-colors flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">
                View Documentation
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="bento-grid">
            {[
              {
                icon: <BrainCircuit className="w-8 h-8 text-brand-400" />,
                title: "AI Extraction",
                desc: "Automatically segment questions, options, and answer keys.",
                colSpan: "md:col-span-2"
              },
              {
                icon: <FileText className="w-8 h-8 text-indigo-400" />,
                title: "Multimodal",
                desc: "Handle PDFs and images.",
                colSpan: "md:col-span-1"
              },
              {
                icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
                title: "Confidence Scoring",
                desc: "Receive reliability metrics for every extraction.",
                colSpan: "md:col-span-3"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15, type: "spring", stiffness: 100 }}
                className={`glass-card p-8 hover:bg-white/10 group ${feature.colSpan}`}
              >
                <div className="mb-6 p-3 bg-white/5 rounded-2xl inline-block border border-white/5 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 text-lg leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-white/10 px-6 text-center text-slate-500 text-sm">
        &copy; 2026 Pragati Bharati. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;

