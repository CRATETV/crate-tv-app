# Crate TV

Crate TV is a sleek, professional, and fully-featured streaming web application designed for discovering and watching independent films. It serves as a modern alternative to major streaming platforms, providing a dedicated space for unique cinematic voices from talented indie filmmakers.

## 🌟 Features

- **Modern & Responsive UI**: A Netflix-inspired interface that looks great on all devices, from desktops to mobile phones.
- **Dynamic Content**: All movie and category data is centralized in `constants.ts`, making content updates simple and code-free.
- **Film Submission Form**: A dedicated page for filmmakers to submit their work, which sends a formatted email to the site admin using Resend.
- **AI-Powered Bios**: Click on any actor to see their bio and a unique, AI-generated "fun fact" powered by the Gemini API.
- **Advanced Search**: Instantly search for movies by title, actor, or genre.
- **Persistent Likes**: Users can "like" movies, and their preferences are saved in their browser's local storage.
- **Dedicated Movie Pages**: Every film has a unique, shareable URL with automatically generated SEO and schema markup for better discovery on search engines.
- **Staging Environment**: Preview unreleased movies by adding `?env=staging` to the URL. A banner indicates you're in preview mode.
- **Built-in Admin Panel**: A password-protected page (`/admin`) to perform mock CRUD operations on movie data.
- **Automated Roku Channel Packager**: A one-click tool in the Admin Panel that generates a complete, ready-to-upload Roku channel ZIP file, automatically configured to pull data from your live web app.

---

## ✨ Developed with Google Gemini

This entire web application was built and is maintained by a world-class senior frontend engineer powered by Google Gemini. The AI handles everything from UI/UX design and component creation to API implementation and deployment configuration.

-   **Find the AI on GitHub**: [Google Gemini](https://github.com/google-gemini)

---

## 🚀 Quick Start & Deployment

### 1. Set Up Environment Variables
This project requires API keys for its AI and email features. You will need to configure these in your deployment environment (e.g., Vercel).

-   `API_KEY`: Your Google Gemini API key.
-   `RESEND_API_KEY`: Your API key from Resend for handling email submissions.

### 2. Deploy to Vercel
The simplest way to get started is to deploy this repository directly to Vercel.

<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fexample%2Fcratetv-repo" target="_blank">
  <img src="https://vercel.com/button" alt="Deploy with Vercel"/>
</a>

During the import process, Vercel will prompt you to enter the Environment Variables listed above.

### 3. Access Your Live App
Once deployed, Vercel will provide you with a public URL (e.g., `https://your-project-name.vercel.app`). You can now access your live Crate TV application.

---

## 📺 How to Create and Sideload the Roku Channel

The web application includes an amazing feature: an automated packager that creates a working Roku channel for you.

**Prerequisite**: You must complete the deployment steps above first. The Roku channel needs a public URL to fetch movie data from.

### Step 1: Enable Developer Mode on Your Roku
1.  On your Roku remote, press: **Home (3x), Up (2x), Right, Left, Right, Left, Right**.
2.  Follow the on-screen instructions to enable Developer Mode and accept the terms.
3.  Your Roku will restart and display a URL on the screen (e.g., `http://192.168.1.100`). Keep this URL handy.

### Step 2: Generate the Roku Channel Package
1.  Navigate to the Admin Panel of your **live, deployed** web application (e.g., `https://your-project-name.vercel.app/admin`).
2.  Enter the admin password (`admin123` for this demo).
3.  In the "Automated Roku Channel Packager" section, click the **"Generate & Download Roku ZIP"** button. A file named `cratv.zip` will be downloaded.

### Step 3: Install the Channel on Your Roku
1.  On your computer (which must be on the same Wi-Fi network as your Roku), open a web browser and go to the Roku URL from Step 1.
2.  You will see the "Development Application Installer" page.
3.  Click **"Upload"** and select the `cratv.zip` file you just downloaded.
4.  Click **"Install"**. The Crate TV channel will appear on your Roku's home screen.

Your Roku channel is now installed and will stream content directly from your web application's API!

---

## 🔧 Local Development (Optional)

If you wish to run the application on your local machine for development purposes:

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd crate-tv
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a local environment file:**
    Create a file named `.env.local` in the root of the project and add your API keys:
    ```
    API_KEY=your_gemini_api_key
    RESEND_API_KEY=your_resend_api_key
    ```
    *Note: Vite automatically loads `.env.local` files, but these will not be used by the Vercel deployment.*

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.