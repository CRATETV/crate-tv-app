

import React from 'react';
import Header from './Header';
// FIX: Corrected import path
import Footer from './Footer';
// FIX: Corrected the casing of the import from 'BackTotopButton' to 'BackToTopButton' to match the actual filename and prevent case-sensitivity issues.
import BackToTopButton from './BackToTopButton';

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <pre className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 my-4 overflow-x-auto">
        <code className="text-sm text-gray-300 font-mono">{children}</code>
    </pre>
);

const DeveloperGuidePage: React.FC = () => {
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };
    
    return (
        <div className="flex flex-col min-h-screen text-white">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
            />

            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Developer & Contribution Guide</h1>
                        <p className="text-lg text-gray-400">
                           Welcome to the team! Here's how to get started and contribute to the Crate TV project.
                        </p>
                    </div>

                    <div className="space-y-10">
                        <section>
                            <h2 className="text-3xl font-bold text-white mb-4">Getting Started</h2>
                            <p className="text-gray-300 mb-4">
                                First, clone the repository to your local machine and install the necessary dependencies.
                            </p>
                            <CodeBlock>
                                {`git clone <repository_url>\ncd crate-tv\nnpm install`}
                            </CodeBlock>
                            <p className="text-gray-300">
                                Next, create a <code className="bg-gray-700 p-1 rounded-md">.env.local</code> file in the root directory and add the required environment variables for the API keys.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-white mb-4">Our Commit Philosophy: Keep It Clean</h2>
                            <p className="text-gray-300 mb-4">
                                To keep our project history readable and easy to navigate, we follow a simple rule: one feature, one commit. This means that a pull request for a new feature or a bug fix should ideally contain only a single, well-written commit that summarizes all the work done.
                            </p>
                            <p className="text-gray-300">
                                This avoids cluttering the main branch history with small, intermediate commits like "fix typo," "trying something," or "oops forgot a file." This is where "archiving" or **squashing** commits comes in.
                            </p>
                        </section>
                        
                        <section>
                            <h2 className="text-3xl font-bold text-white mb-4">How to "Archive" Commits by Squashing</h2>
                            <p className="text-gray-300 mb-4">
                                Squashing is the process of combining multiple commits into one. You should do this on your feature branch right before you're ready to create a pull request. The tool for this is <strong className="text-red-400">interactive rebase</strong>.
                            </p>

                            <h3 className="text-xl font-semibold text-white mt-6 mb-2">Step 1: Count Your Commits</h3>
                            <p className="text-gray-300 mb-4">
                                Let's say your work on a feature branch involved 4 commits. You can see them with <code className="bg-gray-700 p-1 rounded-md">git log</code>.
                            </p>

                            <h3 className="text-xl font-semibold text-white mt-6 mb-2">Step 2: Start Interactive Rebase</h3>
                            <p className="text-gray-300 mb-4">
                                To squash the last 4 commits, run the following command:
                            </p>
                            <CodeBlock>git rebase -i HEAD~4</CodeBlock>
                            <p className="text-gray-300">
                                This will open a text editor showing your 4 commits.
                            </p>

                            <h3 className="text-xl font-semibold text-white mt-6 mb-2">Step 3: Pick and Squash</h3>
                            <p className="text-gray-300 mb-4">
                                Your editor will look something like this. The commits are listed from oldest to newest.
                            </p>
                            <CodeBlock>
{`pick a1b2c3d Start feature A
pick d4e5f6g Add button
pick h7i8j9k Fix styling issue
pick l0m1n2o Final adjustments`}
                            </CodeBlock>
                            <p className="text-gray-300 mb-4">
                                You want to combine commits 2, 3, and 4 into the very first one. To do this, change the word <code className="bg-gray-700 p-1 rounded-md">pick</code> to <code className="bg-gray-700 p-1 rounded-md">squash</code> (or just <code className="bg-gray-700 p-1 rounded-md">s</code>) for the commits you want to merge into the previous one.
                            </p>
                            <CodeBlock>
{`pick a1b2c3d Start feature A
squash d4e5f6g Add button
squash h7i8j9k Fix styling issue
squash l0m1n2o Final adjustments`}
                            </CodeBlock>
                            <p className="text-gray-300">
                                Now, save the file and close the editor.
                            </p>

                            <h3 className="text-xl font-semibold text-white mt-6 mb-2">Step 4: Write the New Commit Message</h3>
                            <p className="text-gray-300 mb-4">
                                Another editor window will open, containing the messages from all your squashed commits. Delete all the old messages and write one new, clear message that describes the entire feature.
                            </p>
                             <CodeBlock>
{`# This is a combination of 4 commits.
# The first line will be the new commit message.

Implement Feature A with new styling and adjustments`}
                            </CodeBlock>
                             <p className="text-gray-300">
                                Save and close this file. Your 4 commits are now one clean commit! You're ready to push and create your pull request.
                            </p>
                        </section>
                        
                        <section>
                            <h2 className="text-3xl font-bold text-white mb-4">How to Set Up the Roku Channel (Automated SDK Method)</h2>
                            <p className="text-gray-300 mb-4">
                                This project includes a full **SDK (Software Development Kit) channel** that loads its content from a live feed. The Admin Panel automates the packaging process, so you never have to edit code or manually zip files.
                            </p>
                            <p className="text-gray-300 mb-4">
                                <strong className="text-yellow-400">Prerequisite:</strong> The Roku channel needs a public URL to fetch movie data from. Ensure your web application is deployed and accessible online before proceeding.
                            </p>
                        
                             <h3 className="text-xl font-semibold text-white mt-6 mb-2">Publishing Process</h3>
                            <ol className="list-decimal list-inside space-y-4 text-gray-300 mb-4">
                                <li>
                                    <strong>Download Your Channel Package:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2">
                                        <li>Log into your Crate TV admin panel (`/admin`).</li>
                                        <li>Navigate to the **"Roku"** tab.</li>
                                        <li>Click the **"Download Roku Package (.zip)"** button. The downloaded ZIP file is a complete, production-ready package. It automatically includes the latest Crate TV branding (logo and splash screen), so no manual image handling is required.</li>
                                    </ul>
                                </li>
                                <li>
                                    <strong>Upload and Publish:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2">
                                        <li>Log into your <a href="https://developer.roku.com/" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">Roku Developer Dashboard</a>.</li>
                                        <li>Go to "Manage My Channels" and select your SDK channel.</li>
                                        <li>Navigate to the "Package Upload" page and upload the ZIP file.</li>
                                        <li>Follow Roku's instructions to install a preview on your device, test it, and then submit it for publishing.</li>
                                    </ul>
                                </li>
                            </ol>
                            <p className="text-gray-300">
                               Once published, any content you update and **"Publish"** in the Crate TV admin panel will automatically appear in your live Roku channel. You only need to re-package and re-upload if you make changes to the channel's source code itself.
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            <Footer />
            <BackToTopButton />
        </div>
    );
};

export default DeveloperGuidePage;
