import React, { useState } from 'react';
import { useFestival } from '../../contexts/FestivalContext';
import { Button, Card, Notice, SectionTitle, adminPost, inputClass } from './ui';
import { DEFAULT_THANK_YOU } from '../../api/_lib/thankYou';

// Watch Party tab: the automatic "thank you for watching" email. Off until switched on here.
const ThankYouEmailCard: React.FC = () => {
    const { settings } = useFestival();
    const s: any = settings;
    const [on, setOn] = useState<boolean>(s.thankYouEnabled === true);
    const [message, setMessage] = useState<string>(s.thankYouMessage || DEFAULT_THANK_YOU);
    const [busy, setBusy] = useState<'save' | 'test' | null>(null);
    const [note, setNote] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

    const save = async (nextOn = on) => {
        setBusy('save'); setNote(null);
        try { await adminPost('/api/publish-data', { type: 'settings', data: { thankYouEnabled: nextOn, thankYouMessage: message } }); setOn(nextOn); setNote({ tone: 'success', text: nextOn ? 'Saved. The thank-you goes out the morning after each watch party.' : 'Saved. The thank-you email is off.' }); }
        catch { setNote({ tone: 'error', text: 'Could not save. Try again.' }); }
        setBusy(null);
    };
    const test = async () => {
        setBusy('test'); setNote(null);
        try { const r = await adminPost<{ to: string }>('/api/send-watchparty-thanks', { action: 'test', message }); setNote({ tone: 'success', text: `Sample sent to ${r.to}.` }); }
        catch (e) { setNote({ tone: 'error', text: e instanceof Error ? e.message : 'Could not send the sample.' }); }
        setBusy(null);
    };

    return (
        <div className="space-y-4">
            <SectionTitle title="Thank-you email" hint="Everyone who joined a watch party gets one simple thank-you the next morning (about 10 AM Eastern). Once per person per film." />
            {note && <Notice tone={note.tone}>{note.text}</Notice>}
            <Card>
                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                    <input type="checkbox" checked={on} onChange={e => save(e.target.checked)} disabled={busy !== null} className="h-5 w-5" />
                    <span className="text-white font-bold">{on ? 'On' : 'Off'}</span>
                    <span className="text-sm text-[#8A8A96]">Turn on after you've sent yourself a sample.</span>
                </label>
                <p className="text-xs font-bold text-[#8A8A96] mb-1">Message</p>
                <textarea className={inputClass} rows={9} value={message} onChange={e => setMessage(e.target.value)} />
                <p className="text-xs text-[#8A8A96] mt-1">{'{name}'} becomes their first name and {'{film}'} the film's title.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="primary" onClick={() => save()} disabled={busy !== null}>{busy === 'save' ? 'Saving…' : 'Save message'}</Button>
                    <Button onClick={test} disabled={busy !== null}>{busy === 'test' ? 'Sending…' : 'Send me a sample'}</Button>
                </div>
            </Card>
        </div>
    );
};
export default ThankYouEmailCard;
