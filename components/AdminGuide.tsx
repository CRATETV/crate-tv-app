import React from 'react';

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <pre className="bg-gray-900/70 border border-gray-700 rounded-lg p-4 my-4 overflow-x-auto">
        <code className="text-sm text-gray-300 font-mono">{children}</code>
    </pre>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-4 border-b-2 border-purple-500 pb-2">{title}</h2>
        <div className="space-y-4 text-gray-300">
            {children}
        </div>
    </section>
);


const AdminGuide: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Developer & Contribution Guide</h1>
                <p className="text-lg text-gray-400">
                   Welcome to the team! Here's how to get started, contribute, and publish to Roku.
                </p>
            </div>

            <div className="space-y-12">
                <Section title="Quick Start & Deployment">
                     <h3 className="text-xl font-semibold text-white mt-6 mb-2">1. Set Up Environment Variables</h3>
                     <p>This project requires API keys and a password for its features. You will need to configure these in your deployment environment (e.g., Vercel).</p>
                     
                     <h4 className="font-bold mt-4">Core Features:</h4>
                     <ul className="list-disc list-inside space-y-1">
                        <li>`API_KEY`: Your Google Gemini API key.</li>
                        <li>`ADMIN_PASSWORD`: A secure password for the main super administrator.</li>
                        <li>`COLLABORATOR_PASSWORD`, `FESTIVAL_ADMIN_PASSWORD`: Passwords for limited-access roles.</li>
                     </ul>
                     
                     <h4 className="font-bold mt-4">Email (Resend):</h4>
                     <ul className="list-disc list-inside space-y-1">
                        <li>`RESEND_API_KEY`: Your API key from Resend.</li>
                        <li>`FROM_EMAIL`: The email address you want to send emails from.</li>
                     </ul>

                     <h4 className="font-bold mt-4">Firebase (Authentication & Database):</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, etc.</li>
                        <li>`FIREBASE_SERVICE_ACCOUNT_KEY`: A **base64 encoded** JSON key for the Firebase Admin SDK.</li>
                     </ul>
                     
                     <h4 className="font-bold mt-4">Square Payments:</h4>
                     <ul className="list-disc list-inside space-y-1">
                        <li>Production: `SQUARE_APPLICATION_ID`, `SQUARE_LOCATION_ID`, `SQUARE_ACCESS_TOKEN`.</li>
                        <li>Sandbox (for local dev): `SQUARE_SANDBOX_...`</li>
                     </ul>
                     
                     <h4 className="font-bold mt-4">File Uploads & Live Data (AWS S3):</h4>
                     <ul className="list-disc list-inside space-y-1">
                        <li>`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_REGION`, `AWS_S3_BUCKET_NAME`.</li>
                     </ul>
                     
                     <h3 className="text-xl font-semibold text-white mt-6 mb-2">2. Configure AWS S3 Bucket CORS</h3>
                     <p>For file uploads to work, your S3 bucket must have the correct CORS configuration to accept `PUT` requests from your website's domain.</p>
                     
                     <h3 className="text-xl font-semibold text-white mt-6 mb-2">3. Deploy to Vercel</h3>
                     <p>The simplest way to get started is to deploy this repository directly to Vercel, which will prompt you for the environment variables.</p>
                </Section>
                
                <Section title="Roku Channel Setup: Two Methods">
                    <p>You have two options for getting your content onto Roku. Choose the one that best fits your needs.</p>
                    
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg mt-4">
                        <h3 className="text-xl font-bold text-white mb-2">Method 1: Instant TV Channel (Easy & Fast)</h3>
                        <p>This is the **easiest method** and is recommended if you just want to get your content library on Roku quickly without needing a custom-branded experience or special features like the Film Festival.</p>
                        <ol className="list-decimal list-inside space-y-2 mt-4">
                            <li><strong>Get Your Feed URL:</strong> Your Crate TV application automatically generates a compatible JSON feed at:<br /><CodeBlock>{`https://[your-live-domain.com]/api/instant-tv-feed`}</CodeBlock></li>
                            <li><strong>Configure Instant TV Channel:</strong> Log into your Instant TV Channel account and provide the feed URL from Step 1. Your Roku channel will now automatically update whenever you publish changes in your Crate TV admin panel.</li>
                        </ol>
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg mt-6">
                        <h3 className="text-xl font-bold text-white mb-2">Method 2: Custom SDK Channel (Recommended for Full Experience)</h3>
                        <p>This method provides a **fully custom, branded Roku channel** that mirrors the look and feel of your web app and supports advanced features like the **Live Film Festival**.</p>
                        <ol className="list-decimal list-inside space-y-2 mt-4">
                            <li><strong>Download Your Channel Package:</strong> In the **"Roku"** tab of this admin panel, click the **"Download Roku Package (.zip)"** button. This downloads a complete, production-ready package.</li>
                            <li><strong>Upload and Publish:</strong> Log into your **Roku Developer Dashboard**, go to **"Manage My Channels"**, and upload the ZIP file you just downloaded. Follow Roku's instructions to preview and publish.</li>
                        </ol>
                    </div>
                </Section>

                <Section title="Local Development">
                    <p>If you wish to run the application on your local machine, you will need the Vercel CLI to emulate the full serverless environment.</p>
                    <CodeBlock>{`npm install -g vercel\nvercel dev`}</CodeBlock>
                    <p>The application will be available at `http://localhost:3000`.</p>
                </Section>
            </div>
        </div>
    );
};

export default AdminGuide;
