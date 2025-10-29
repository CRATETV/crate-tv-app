import React from 'react';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import BackToTopButton from './BackToTopButton.tsx';

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
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
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
                            <h2 className="text-3xl font-bold text-white mb-4">How to Package & Test the Roku Channel</h2>
                            <p className="text-gray-300 mb-4">
                                The web app includes an amazing feature: an automated packager that creates a working Roku channel for you. Here’s how to generate the channel package and install it on your Roku device for testing (this is called "sideloading").
                            </p>
                            <p className="text-gray-300 mb-4">
                                <strong className="text-yellow-400">Prerequisite:</strong> The Roku channel needs a public URL to fetch movie data from. Ensure your web application is deployed and accessible online before proceeding.
                            </p>
                        
                            <h3 className="text-xl font-semibold text-white mt-6 mb-2">Step 1: Enable Developer Mode on Your Roku</h3>
                            <ol className="list-decimal list-inside space-y-2 text-gray-300 mb-4">
                                <li>On your Roku remote, press the following sequence:</li>
                                <CodeBlock>Home (3x), Up (2x), Right, Left, Right, Left, Right</CodeBlock>
                                <li>Follow the on-screen instructions to enable Developer Mode. You'll need to agree to the developer agreement.</li>
                                <li>Your Roku will restart and display a URL on the screen (e.g., <code className="bg-gray-700 p-1 rounded-md">http://192.168.1.100</code>). This is your Roku's IP address. Keep this URL handy and make sure your computer is on the same Wi-Fi network.</li>
                            </ol>
                        
                            <h3 className="text-xl font-semibold text-white mt-6 mb-2">Step 2: Generate the Roku Channel Package</h3>
                            <ol className="list-decimal list-inside space-y-2 text-gray-300 mb-4">
                                <li>Navigate to the <a href="/admin" onClick={(e) => handleNavigate(e, '/admin')} className="text-red-400 hover:underline">Admin Panel</a> of your live application.</li>
                                <li>Go to the <strong>"Tools"</strong> tab.</li>
                                <li>In the "Automated Roku Channel Packager" section, click the <strong>"Generate & Download Roku ZIP"</strong> button.</li>
                                <li>A file named <code className="bg-gray-700 p-1 rounded-md">cratv.zip</code> will be downloaded to your computer.</li>
                            </ol>
                        
                            <h3 className="text-xl font-semibold text-white mt-6 mb-2">Step 3: Install ("Sideload") the Channel</h3>
                            <ol className="list-decimal list-inside space-y-2 text-gray-300 mb-4">
                                <li>On your computer, open a web browser and go to the Roku IP address from Step 1.</li>
                                <li>You will see the "Development Application Installer" page.</li>
                                <li>Click <strong>"Upload"</strong> and select the <code className="bg-gray-700 p-1 rounded-md">cratv.zip</code> file you just downloaded.</li>
                                <li>Click <strong>"Install"</strong>. After a few moments, the Crate TV channel will appear on your Roku's home screen.</li>
                            </ol>
                            <p className="text-gray-300">
                                Your Roku channel is now installed and will stream content directly from your web application's API! If you make changes to the Roku source code (in the <code className="bg-gray-700 p-1 rounded-md">/roku</code> directory), you'll need to generate and install a new ZIP file to see them.
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
