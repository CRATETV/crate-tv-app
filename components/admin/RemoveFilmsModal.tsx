import React, { useEffect, useState } from 'react';
import { Button, Modal, Notice, adminPost, inputClass } from './ui';

// Films → "Remove selected" (Oct 2026). Checks the chosen films on the server
// first, shows which can go (with their files) and which stay and why, then
// removes them once you type REMOVE. Server: api/admin-remove-films.ts.

interface FilmCheck { key: string; title: string; ok: boolean; why: string | null; files: number; size: number }
interface Result { removed: string[]; kept: { title: string; why: string }[]; filesDeleted: number; bytes: number; fileErrors: string[] }

const GB = 1024 ** 3;
const fmtSize = (b: number) => b >= GB ? `${(b / GB).toFixed(2)} GB` : b > 0 ? `${Math.max(1, Math.round(b / 1024 ** 2))} MB` : 'no files';

const RemoveFilmsModal: React.FC<{ keys: string[]; onClose: () => void; onRemoved: () => void }> = ({ keys, onClose, onRemoved }) => {
    const [films, setFilms] = useState<FilmCheck[] | null>(null);
    const [error, setError] = useState('');
    const [typed, setTyped] = useState('');
    const [working, setWorking] = useState(false);
    const [result, setResult] = useState<Result | null>(null);

    useEffect(() => {
        adminPost<{ films: FilmCheck[] }>('/api/admin-remove-films', { action: 'check', keys })
            .then(r => setFilms(r.films))
            .catch(e => setError(e instanceof Error ? e.message : 'Could not check those films.'));
    }, [keys]);

    const going = (films || []).filter(f => f.ok);
    const staying = (films || []).filter(f => !f.ok);
    const goingBytes = going.reduce((s, f) => s + f.size, 0);

    const remove = async () => {
        setWorking(true); setError('');
        try {
            const r = await adminPost<Result>('/api/admin-remove-films', { action: 'remove', keys: going.map(f => f.key) });
            setResult(r);
            onRemoved();
        } catch (e) { setError(e instanceof Error ? e.message : 'Removing failed.'); }
        finally { setWorking(false); }
    };

    return (
        <Modal title={result ? 'Done' : `Remove ${keys.length} film${keys.length === 1 ? '' : 's'}?`} onClose={() => { if (!working) onClose(); }}>
            <div className="space-y-4">
                {error && <Notice tone="error">{error}</Notice>}
                {!films && !error && <p className="text-sm text-[#A1A1AD]">Checking those films… (looks at earnings and storage, can take a moment)</p>}

                {result ? (
                    <>
                        <Notice tone="success">
                            Removed {result.removed.length} film{result.removed.length === 1 ? '' : 's'} and deleted {result.filesDeleted} file{result.filesDeleted === 1 ? '' : 's'} ({fmtSize(result.bytes)}).
                        </Notice>
                        {result.kept.length > 0 && <p className="text-xs text-[#8A8A96]">Kept: {result.kept.map(k => `${k.title} (${k.why})`).join(', ')}</p>}
                        {result.fileErrors.length > 0 && <p className="text-xs text-amber-300">{result.fileErrors.length} file(s) couldn't be deleted; Storage clean-up will list them later.</p>}
                        <div className="flex justify-end"><Button variant="primary" onClick={onClose}>Close</Button></div>
                    </>
                ) : films && (
                    <>
                        {going.length > 0 && (
                            <div>
                                <p className="text-sm text-white font-semibold mb-1">Will be removed, with their files ({fmtSize(goingBytes)}):</p>
                                <ul className="max-h-48 overflow-y-auto text-xs text-[#A1A1AD] space-y-1">
                                    {going.map(f => <li key={f.key} className="truncate">• {f.title} ({f.files} file{f.files === 1 ? '' : 's'}, {fmtSize(f.size)})</li>)}
                                </ul>
                                <p className="text-xs text-[#8A8A96] mt-2">Video, streaming version, poster, trailer and photos go too. Files another film or the site itself uses are kept.</p>
                            </div>
                        )}
                        {staying.length > 0 && (
                            <div>
                                <p className="text-sm text-white font-semibold mb-1">Can't be removed (nothing happens to these):</p>
                                <ul className="max-h-40 overflow-y-auto text-xs text-[#8A8A96] space-y-1">
                                    {staying.map(f => <li key={f.key}>• {f.title}: {f.why}</li>)}
                                </ul>
                            </div>
                        )}
                        {going.length > 0 ? (
                            <>
                                <p className="text-sm text-[#A1A1AD]">This can't be undone. Type <strong className="text-white">REMOVE</strong> to go ahead.</p>
                                <input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Type REMOVE" className={inputClass} autoFocus />
                                <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" disabled={working} onClick={onClose}>Cancel</Button>
                                    <Button variant="primary" accent="coral" disabled={typed !== 'REMOVE' || working} onClick={remove}>
                                        {working ? 'Removing…' : `Remove ${going.length} film${going.length === 1 ? '' : 's'}`}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex justify-end"><Button variant="primary" onClick={onClose}>OK</Button></div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};

export default RemoveFilmsModal;
