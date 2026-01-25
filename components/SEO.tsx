import React, { useEffect } from 'react';

interface SEOProps {
    title: string;
    description: string;
    image?: string;
    url?: string;
    type?: 'website' | 'video.movie' | 'profile' | 'article';
    schemaData?: any;
}

const SEO: React.FC<SEOProps> = ({ 
    title, 
    description, 
    image = 'https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png', 
    url,
    type = 'website',
    schemaData
}) => {
    const fullTitle = `${title} | Crate TV`;
    const siteUrl = url || window.location.href;
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://cratetv.net';

    useEffect(() => {
        // Update Title
        document.title = fullTitle;

        // Update Meta Tags
        const updateMeta = (nameOrProp: string, content: string, isProperty = false) => {
            const attr = isProperty ? 'property' : 'name';
            let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attr, nameOrProp);
                document.head.appendChild(el);
            }
            el.setAttribute('content', content);
        };

        const cleanDesc = description.replace(/<[^>]+>/g, '').substring(0, 160);

        updateMeta('description', cleanDesc);
        updateMeta('og:title', fullTitle, true);
        updateMeta('og:description', cleanDesc, true);
        updateMeta('og:image', image, true);
        updateMeta('og:url', siteUrl, true);
        updateMeta('og:type', type, true);
        updateMeta('og:site_name', 'Crate TV', true);
        updateMeta('twitter:card', 'summary_large_image');
        updateMeta('twitter:title', fullTitle);
        updateMeta('twitter:description', cleanDesc);
        updateMeta('twitter:image', image);

        // Update Canonical
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.setAttribute('rel', 'canonical');
            document.head.appendChild(canonical);
        }
        canonical.setAttribute('href', siteUrl);

        // Handle JSON-LD Schema
        const existingSchema = document.getElementById('json-ld-schema');
        if (existingSchema) existingSchema.remove();

        // 1. BRAND IDENTITY SCHEMA (Organization)
        const brandSchema = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Crate TV",
            "alternateName": "Crate",
            "url": baseOrigin,
            "logo": "https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png",
            "sameAs": [
                "https://www.instagram.com/cratetv.philly/",
                "https://playhousewest.com/philly/"
            ],
            "description": "The distribution afterlife for independent cinema. Based in Philadelphia.",
            "location": {
                "@type": "Place",
                "name": "Philadelphia, PA"
            }
        };

        // 2. SEARCH BOX SCHEMA (WebSite)
        const websiteSchema = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Crate TV",
            "url": baseOrigin,
            "potentialAction": {
                "@type": "SearchAction",
                "target": `${baseOrigin}/?search={search_term_string}`,
                "query-input": "required name=search_term_string"
            }
        };

        const combinedSchema = [brandSchema, websiteSchema];
        if (schemaData) combinedSchema.push({ "@context": "https://schema.org", ...schemaData });

        const script = document.createElement('script');
        script.id = 'json-ld-schema';
        script.type = 'application/ld+json';
        script.text = JSON.stringify(combinedSchema);
        document.head.appendChild(script);
        
    }, [fullTitle, description, image, siteUrl, type, schemaData, baseOrigin]);

    return null;
};

export default SEO;