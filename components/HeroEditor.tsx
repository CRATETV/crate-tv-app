
import React, { useState } from 'react';
import { HeroConfig } from '../types';

// Must match the hardcoded copy in LandingPage.tsx's hero section — these
// are the values shown when nothing has been saved to heroConfig yet.
export const HERO_DEFAULTS: Required<HeroConfig> = {
    eyebrow: 'Official Distribution Afterlife',
    headlineLine1: 'Cinema',
    headlineLine2: 'Unbound.',
    subheadline: 'Unlimited independent stories. Zero subscriptions. Pure cinema.',
    emailPromptText: 'Ready to watch? Enter your email to create your free account.',
    ctaButtonText: 'Get Started',
};

interface HeroEditorProps {
    config: HeroConfig;
    onSave: (config: HeroConfig) => Promise<void>;
    isSaving: boolean;
}

const HeroEditor: React.FC<HeroEditorProps> = ({ config: initialConfig, onSave, isSaving }) => {
    const [config, setConfig] = useState<Required<HeroConfig>>({ ...HERO_DEFAULTS, ...initialConfig });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleResetToDefaults = () => {
        if (window.confirm('Reset all hero fields back to the original launch copy? This will save immediately.')) {
            setConfig(HERO_DEFAULTS);
        }
    };

    return (
        <div className="space-y-10 pb-20 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-red-600/10 border border-red-500/20 p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between gap-6">
                <div>
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Hero Section</h3>
                    <p className="text-gray-400 mt-2 font-medium">Edit the headline, subheadline, and CTA on the homepage — no code deploy needed. Saves instantly to every device.</p>
                </div>
                <button
                    onClick={handleResetToDefaults}
                    className="flex-shrink-0 self-start bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-black px-6 py-3 rounded-2xl uppercase tracking-widest text-[10px] transition-all"
                >
                    Reset to Original
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <section className="bg-[#0f0f0f] p-8 md:p-12 rounded-[2.5rem] border border-white/5 space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">Copy</h4>

                    <div>
                        <label className="form-label">Eyebrow Label</label>
                        <input name="eyebrow" value={config.eyebrow} onChange={handleChange} placeholder="Official Distribution Afterlife" className="form-input bg-black/40" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Headline — Line 1</label>
                            <input name="headlineLine1" value={config.headlineLine1} onChange={handleChange} placeholder="Cinema" className="form-input bg-black/40" />
                        </div>
                        <div>
                            <label className="form-label">Headline — Line 2 (red)</label>
                            <input name="headlineLine2" value={config.headlineLine2} onChange={handleChange} placeholder="Unbound." className="form-input bg-black/40 text-red-500" />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Subheadline</label>
                        <textarea name="subheadline" value={config.subheadline} onChange={handleChange} placeholder="Unlimited independent stories..." className="form-input bg-black/40" rows={2} />
                    </div>

                    <div>
                        <label className="form-label">Email Prompt Text</label>
                        <input name="emailPromptText" value={config.emailPromptText} onChange={handleChange} placeholder="Ready to watch? Enter your email..." className="form-input bg-black/40" />
                    </div>

                    <div>
                        <label className="form-label">CTA Button Text</label>
                        <input name="ctaButtonText" value={config.ctaButtonText} onChange={handleChange} placeholder="Get Started" className="form-input bg-black/40" />
                    </div>

                    <button
                        onClick={() => onSave(config)}
                        disabled={isSaving}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl uppercase tracking-[0.3em] text-xs shadow-2xl shadow-red-900/40 transition-all active:scale-95"
                    >
                        {isSaving ? 'Publishing…' : 'Publish Hero Changes'}
                    </button>
                </section>

                {/* Live preview — approximates the real hero styling so the admin
                    doesn't have to publish + reload the site just to see how copy reads. */}
                <section className="bg-black rounded-[2.5rem] border border-white/5 overflow-hidden">
                    <div className="px-6 py-3 border-b border-white/5 bg-white/5">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Live Preview</span>
                    </div>
                    <div className="relative min-h-[520px] flex flex-col items-center justify-center text-center px-8 py-16 overflow-hidden bg-[#050505]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.15)_0%,transparent_70%)]"></div>
                        <div className="relative z-10 space-y-8 max-w-lg">
                            <div className="space-y-3">
                                <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px] break-words">{config.eyebrow || '—'}</p>
                                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-[0.9] italic break-words">
                                    {config.headlineLine1 || '—'} <br /><span className="text-red-600">{config.headlineLine2}</span>
                                </h1>
                            </div>
                            <p className="text-gray-300 text-base md:text-lg font-medium leading-tight break-words">
                                {config.subheadline || '—'}
                            </p>
                            <div className="w-full pt-4 space-y-4">
                                <p className="text-gray-500 text-xs break-words">{config.emailPromptText || '—'}</p>
                                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                                    <div className="p-3 bg-black/80 border border-white/10 rounded-xl text-gray-600 text-xs text-left">Email Address</div>
                                    <button disabled className="bg-red-600 text-white font-black py-3 px-6 rounded-xl text-sm uppercase tracking-tighter cursor-default">
                                        {config.ctaButtonText || '—'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default HeroEditor;
