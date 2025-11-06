import React, { useState } from 'react';
import { SecurityReport, AiSecurityAdvice, SecurityEvent } from '../types';
import LoadingSpinner from './LoadingSpinner';

const SecurityTab: React.FC = () => {
    const [report, setReport] = useState<SecurityReport | null>(null);
    const [advice, setAdvice] = useState<AiSecurityAdvice | null>(null);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
    const [error, setError] = useState('');

    const fetchReport = async () => {
        setIsLoadingReport(true);
        setReport(null);
        setAdvice(null);
        setError('');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/get-security-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch report.');
            setReport(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoadingReport(false);
        }
    };

    const generateAdvice = async () => {
        if (!report) return;
        setIsGeneratingAdvice(true);
        setAdvice(null);
        setError('');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/generate-security-advice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, report }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to generate advice.');
            setAdvice(data.advice);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsGeneratingAdvice(false);
        }
    };

    const handleTakeAction = (ip: string) => {
        navigator.clipboard.writeText(ip);
        alert(`IP address ${ip} copied to clipboard. You can now add this to your firewall blocklist in your hosting provider's dashboard (e.g., Vercel Firewall).`);
    };

    return (
        <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-bold text-red-400 mb-4">AI Security Center</h2>
                <p className="text-gray-300 mb-6">
                    Analyze recent platform activity to identify potential threats like brute-force login attempts or payment fraud. The AI Analyst can provide actionable recommendations based on the findings.
                </p>
                <button
                    onClick={fetchReport}
                    disabled={isLoadingReport}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition-colors disabled:bg-blue-800"
                >
                    {isLoadingReport ? 'Scanning Events...' : 'Scan Activity (Last 24 Hours)'}
                </button>
            </div>

            {isLoadingReport && <div className="text-center p-8"><LoadingSpinner /></div>}
            {error && <div className="p-4 text-red-300 bg-red-900/50 border border-red-700 rounded-md">{error}</div>}

            {report && (
                <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                    {/* Report Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-800 p-4 rounded-lg text-center"><h3 className="text-sm text-gray-400">Total Events</h3><p className="text-3xl font-bold">{report.totalEvents}</p></div>
                        <div className="bg-gray-800 p-4 rounded-lg text-center"><h3 className="text-sm text-gray-400">Suspicious IPs</h3><p className="text-3xl font-bold text-red-400">{report.suspiciousIps.length}</p></div>
                        <div className="bg-gray-800 p-4 rounded-lg text-center"><h3 className="text-sm text-gray-400">Failed Logins</h3><p className="text-3xl font-bold">{report.eventsByType['FAILED_ADMIN_LOGIN'] || 0}</p></div>
                    </div>

                    {/* AI Advisor Section */}
                    <div className="bg-gradient-to-br from-purple-900/30 to-gray-900 p-6 rounded-lg border border-purple-800">
                        <h3 className="text-xl font-bold text-purple-300 mb-4">AI Security Analyst</h3>
                        <button
                            onClick={generateAdvice}
                            disabled={isGeneratingAdvice}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-purple-800"
                        >
                            {isGeneratingAdvice ? 'Analyzing...' : 'Ask AI Analyst for Advice'}
                        </button>
                        {isGeneratingAdvice && <div className="mt-4"><LoadingSpinner /></div>}
                        {advice && (
                            <div className="mt-6 space-y-4 animate-[fadeIn_0.5s_ease-out]">
                                <div>
                                    <h4 className="font-bold text-lg text-white">Summary</h4>
                                    <p className="text-gray-300 text-sm mt-1">{advice.summary}</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-white">Recommendations</h4>
                                    <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm mt-2">{advice.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}</ul>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Suspicious IPs */}
                    {report.suspiciousIps.length > 0 && (
                        <div>
                            <h3 className="text-xl font-bold text-white mb-4">Suspicious IP Addresses</h3>
                            <div className="bg-gray-800/50 rounded-lg border border-gray-700">
                                <ul className="divide-y divide-gray-700">
                                    {report.suspiciousIps.map(({ ip, count, types }) => (
                                        <li key={ip} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                            <div>
                                                <p className="font-mono text-lg text-red-400">{ip}</p>
                                                <p className="text-sm text-gray-400">{count} events: {types.join(', ')}</p>
                                            </div>
                                            <button onClick={() => handleTakeAction(ip)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-xs self-start sm:self-center">Take Action</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SecurityTab;
