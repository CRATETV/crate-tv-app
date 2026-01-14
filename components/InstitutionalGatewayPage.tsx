
import React from 'react';
import SEO from './SEO';

const InfoSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-4">
        <h3 className="text-xl font-black uppercase tracking-widest text-red-600 border-l-4 border-red-600 pl-4">{title}</h3>
        <div className="text-gray-300 text-base leading-relaxed pl-5">{children}</div>
    </div>
);

const InstitutionalGatewayPage: React.FC = () => {
    const handleBackToMain = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 selection:text-white p-6 md:p-20">
            <SEO title="Institutional Access Gateway" description="Educational and civic justification for Crate TV network access." />
            
            <div className="max-w-4xl mx-auto space-y-16 animate-[fadeIn_0.8s_ease-out]">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-10 gap-8">
                    <div className="space-y-2">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-40 mb-4" alt="Crate" />
                        <h1 className="text-4xl font-black uppercase tracking-tighter italic">Institutional Access Gateway.</h1>
                        <p className="text-gray-500 font-bold uppercase tracking-[0.4em] text-[10px]">Resource Identification: ACADEMIC_NODE_BRIDGE</p>
                    </div>
                    <button 
                        onClick={handleBackToMain}
                        className="bg-white text-black font-black px-8 py-3 rounded-xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-gray-200 transition-all"
                    >
                        Enter Application
                    </button>
                </header>

                <div className="bg-white/5 border border-white/10 p-8 md:p-12 rounded-[3rem] shadow-2xl space-y-12">
                    <div className="prose prose-invert max-w-none">
                        <p className="text-2xl text-gray-200 font-medium italic leading-relaxed">
                            "Crate TV is a specialized digital infrastructure dedicated to the preservation of Philadelphia's cinematic records and the advancement of digital media pedagogy."
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <InfoSection title="Educational Context">
                            <p>Crate TV serves as a primary exhibition platform for student filmmakers and academic researchers. It hosts the <strong>Public Square</strong>, a dedicated sector for non-commercial civic dispatches and experimental thesis work from Philadelphia universities.</p>
                        </InfoSection>

                        <InfoSection title="Safety & Content Moderation">
                            <p>Unlike open video platforms, Crate TV does not allow unvetted user-generated uploads. Every film in the catalog is processed through an internal <strong>Grand Jury</strong> vetting protocol to ensure professional and artistic standards are maintained.</p>
                        </InfoSection>

                        <InfoSection title="Technical Infrastructure">
                            <p>The application is built on enterprise-grade cloud architecture using <strong>Amazon Web Services (AWS S3)</strong> and <strong>Vercel</strong>. All transmissions are encrypted (SSL/TLS) and follow strict data privacy protocols for user identity protection.</p>
                        </InfoSection>

                        <InfoSection title="Pedagogical Tools">
                            <p>Features include AI-driven narrative analysis (Gemini 3 Pro) and audience sentiment mapping, tools used by students to study the intersection of traditional cinema and modern data science.</p>
                        </InfoSection>
                    </div>

                    <div className="pt-10 border-t border-white/5">
                        <div className="bg-red-600/10 border border-red-500/20 p-8 rounded-3xl space-y-4">
                            <h4 className="text-sm font-black text-red-500 uppercase tracking-widest">Notice to Network Administrators</h4>
                            <p className="text-sm text-gray-400 font-medium leading-relaxed">
                                To enable student access to this educational resource, please whitelist the following domains:
                            </p>
                            <code className="block bg-black/60 p-4 rounded-xl text-green-500 font-mono text-xs overflow-x-auto">
                                *.cratetv.net<br/>
                                cratetv.com<br/>
                                vercel.app<br/>
                                cratetelevision.s3.us-east-1.amazonaws.com
                            </code>
                        </div>
                    </div>
                </div>

                <footer className="text-center pb-20">
                    <p className="text-[10px] font-black text-gray-700 uppercase tracking-[1em] mr-[-1em]">Digital Media Literacy // Philadelphia Archive Project</p>
                </footer>
            </div>
        </div>
    );
};

export default InstitutionalGatewayPage;
