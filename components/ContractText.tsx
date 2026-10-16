import React from 'react';

// Renders CRATE agreement text (a small, safe subset of Markdown:
// "## " headings, "- " bullets, "1. " numbered items and **bold**).
// No HTML from the text is ever injected.

const inline = (text: string, keyBase: string) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
            ? <strong key={`${keyBase}-${i}`} className="font-bold">{part.slice(2, -2)}</strong>
            : <React.Fragment key={`${keyBase}-${i}`}>{part}</React.Fragment>);

const ContractText: React.FC<{ text: string; tone?: 'light' | 'dark' }> = ({ text, tone = 'light' }) => {
    const lines = text.split('\n');
    const blocks: React.ReactNode[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;
    const flush = () => {
        if (!list) return;
        const items = list.items.map((it, i) => <li key={i} className="pl-1">{inline(it, `li${blocks.length}-${i}`)}</li>);
        blocks.push(list.ordered
            ? <ol key={`b${blocks.length}`} className="list-decimal pl-6 space-y-1.5 my-3">{items}</ol>
            : <ul key={`b${blocks.length}`} className="list-disc pl-6 space-y-1.5 my-3">{items}</ul>);
        list = null;
    };
    for (const raw of lines) {
        const line = raw.trimEnd();
        const bullet = line.match(/^- (.*)$/);
        const numbered = line.match(/^\d+\. (.*)$/);
        if (bullet || numbered) {
            const ordered = !!numbered;
            if (list && list.ordered !== ordered) flush();
            if (!list) list = { ordered, items: [] };
            list.items.push((bullet || numbered)![1]);
            continue;
        }
        flush();
        if (!line.trim()) continue;
        if (line.startsWith('## ')) {
            blocks.push(<h3 key={`b${blocks.length}`} className={`text-lg font-black mt-7 mb-2 ${tone === 'light' ? 'text-gray-900' : 'text-white'}`}>{line.slice(3)}</h3>);
        } else {
            blocks.push(<p key={`b${blocks.length}`} className="my-3">{inline(line, `p${blocks.length}`)}</p>);
        }
    }
    flush();
    return <div className={`text-[15px] leading-relaxed ${tone === 'light' ? 'text-gray-700' : 'text-[#C9C9D1]'}`}>{blocks}</div>;
};

export default ContractText;
