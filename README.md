# Crate TV

Crate TV is a sleek, professional, and fully-featured streaming web application designed for discovering and watching independent films. It serves as a modern alternative to major streaming platforms, providing a dedicated space for unique cinematic voices from talented indie filmmakers.

## 🌟 Features

- **Modern & Responsive UI**: A Netflix-inspired interface that looks great on all devices, from desktops to mobile phones.
- **Dynamic Content Management**: All movie, category, and site data is managed from a secure admin panel and published directly to the live site via a serverless architecture, eliminating the need for redeployments for content updates.
- **AI-Powered Features**: Integrates with the Google Gemini API to provide AI-generated "fun facts" for actor bios and to offer strategic growth advice in the analytics dashboard.
- **Secure Payments & File Uploads**: Utilizes Square for payments and AWS S3 for secure, direct file uploads, all powered by serverless API endpoints.
- **Automated Roku Channel Packaging**: A one-click tool in the Admin Panel downloads a production-ready Roku channel package, automating the entire build process.
- **Advanced Analytics**: A comprehensive dashboard provides insights into user growth, revenue, film performance, and more.

---

## ✨ Developed with Google Gemini

This entire web application was built and is maintained by a world-class senior frontend engineer powered by Google Gemini. The AI handles everything from UI/UX design and component creation to API implementation and deployment configuration.

---

## 🚀 Quick Start & Deployment

Full, detailed instructions for setting up environment variables, configuring AWS, and deploying the application can now be found inside the application's **Admin Panel** under the **"Developer Guide"** tab. This ensures the guide is always accessible to administrators.

### Local Development

For developers wishing to run the application locally:

1.  **Clone & Install**
    ```bash
    git clone <repository_url>
    cd crate-tv
    npm install
    ```

2.  **Set Up Environment**
    *   Create a `.env.local` file in the project root.
    *   Add all the required environment variables as specified in the **Developer Guide** (found in the live app's Admin Panel).

3.  **Run the Server**
    *   To run the full-stack application (including backend APIs), you must use the Vercel CLI.
    ```bash
    npm install -g vercel
    vercel dev
    ```
    *   The application will be available at `http://localhost:3000`.
