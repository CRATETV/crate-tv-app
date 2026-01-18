
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
    image = 'https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png', 
    url,
    type = 'website',
    schemaData
}) => {
    const fullTitle = `${title} | Crate TV`;
    const siteUrl = url || window.location.href;

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

        if (schemaData) {
            const script = document.createElement('script');
            script.id = 'json-ld-schema';
            script.type = 'application/ld+json';
            script.text = JSON.stringify({
                "@context": "https://schema.org",
                ...schemaData
            });
            document.head.appendChild(script);
        }
    }, [fullTitle, description, image, siteUrl, type, schemaData]);

    return null;
};

export default SEO;
