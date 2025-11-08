
export const avatars: { [key: string]: string } = {
    fox: `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="foxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#FB923C;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#F97316;stop-opacity:1" />
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#foxGrad)"/>
            <path d="M 30 70 C 30 50, 70 50, 70 70 Q 50 85, 30 70" fill="white"/>
            <path d="M 50 60 L 45 45 L 55 45 Z" fill="#111827"/>
            <path d="M 25 35 L 45 50 L 35 50 Z" fill="white"/>
            <path d="M 75 35 L 55 50 L 65 50 Z" fill="white"/>
            <circle cx="43" cy="55" r="3" fill="#111827"/>
            <circle cx="57" cy="55" r="3" fill="#111827"/>
        </svg>
    `,
    bear: `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#A16207;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#78350F;stop-opacity:1" />
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#bearGrad)"/>
            <circle cx="33" cy="33" r="10" fill="#A16207"/>
            <circle cx="67" cy="33" r="10" fill="#A16207"/>
            <circle cx="50" cy="65" r="18" fill="#FDE68A"/>
            <path d="M 50 60 L 45 55 L 55 55 Z" fill="#111827"/>
            <path d="M 45 70 A 5 5 0 0 0 55 70" fill="#111827"/>
            <circle cx="42" cy="52" r="3" fill="#111827"/>
            <circle cx="58" cy="52" r="3" fill="#111827"/>
        </svg>
    `,
    cat: `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="catGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#9CA3AF;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#4B5563;stop-opacity:1" />
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#catGrad)"/>
            <path d="M 20 50 L 45 30" stroke="white" stroke-width="2" />
            <path d="M 80 50 L 55 30" stroke="white" stroke-width="2" />
            <path d="M 25 25 L 40 40" fill="none" stroke="white" stroke-width="2" />
            <path d="M 75 25 L 60 40" fill="none" stroke="white" stroke-width="2" />
            <path d="M 50 70 L 48 65 L 52 65 Z" fill="#F472B6"/>
            <circle cx="40" cy="55" r="4" fill="#111827"/>
            <circle cx="60" cy="55" r="4" fill="#111827"/>
        </svg>
    `,
     owl: `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="owlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#57534E;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#44403C;stop-opacity:1" />
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#owlGrad)"/>
            <circle cx="38" cy="50" r="15" fill="#FBBF24"/>
            <circle cx="62" cy="50" r="15" fill="#FBBF24"/>
            <circle cx="38" cy="50" r="8" fill="#111827"/>
            <circle cx="62" cy="50" r="8" fill="#111827"/>
            <circle cx="36" cy="48" r="3" fill="white"/>
            <circle cx="60" cy="48" r="3" fill="white"/>
            <path d="M 50 65 L 45 75 L 55 75 Z" fill="#F97316"/>
        </svg>
    `,
    penguin: `
         <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="penGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#374151;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#111827;stop-opacity:1" />
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#penGrad)"/>
            <path d="M 50 30 C 30 30, 25 80, 50 80 C 75 80, 70 30, 50 30" fill="white"/>
            <circle cx="42" cy="50" r="5" fill="#111827"/>
            <circle cx="58" cy="50" r="5" fill="#111827"/>
            <path d="M 50 60 L 45 70 L 55 70 Z" fill="#F59E0B"/>
        </svg>
    `,
};
