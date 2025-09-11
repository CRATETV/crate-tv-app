# Crate TV

Crate TV is a sleek, professional, and fully-featured streaming web application designed for discovering and watching independent films. It serves as a modern alternative to major streaming platforms, providing a dedicated space for unique cinematic voices from talented indie filmmakers.

## 🌟 Features

- **Modern & Responsive UI**: A Netflix-inspired interface that looks great on all devices, from desktops to mobile phones.
- **Dynamic Content**: All movie and category data is centralized in `constants.ts`, making content updates simple and code-free.
- **Secure Contact & Submission Forms**: Dedicated pages for filmmakers to submit their work and for users to send messages. Both are powered by secure, serverless backend functions using Resend.
- **AI-Powered Bios**: Click on any actor to see their bio and a unique, AI-generated "fun fact" powered by the Gemini API.
- **Real Payments with Square**: Securely accept payments for film festival passes or individual movies using the Square Payments SDK.
- **Advanced Search**: Instantly search for movies by title, actor, or genre.
- **Persistent Likes**: Users can "like" movies, and their preferences are saved in their browser's local storage.
- **Dedicated Movie Pages**: Every film has a unique, shareable URL with automatically generated SEO and schema markup for better discovery on search engines.
- **Staging Environment**: Preview unreleased movies by adding `?env=staging` to the URL. A banner indicates you're in preview mode.
- **Secure Admin Panel**: A password-protected page (`/admin`) for content management. Authentication is handled by a secure, serverless API endpoint, and the password is stored safely as an environment variable.
- **Integrated Secure File Uploader**: Upload movie files, trailers, and posters directly to Amazon S3 from the admin panel. The system uses secure presigned URLs for fast, direct-to-S3 uploads.
- **Automated Roku Channel Packager**: A one-click tool in the Admin Panel that generates a complete, ready-to-upload Roku channel ZIP file, automatically configured to pull data from your live web app.

---

## ✨ Developed with Google Gemini

This entire web application was built and is maintained by a world-class senior frontend engineer powered by Google Gemini. The AI handles everything from UI/UX design and component creation to API implementation and deployment configuration.

-   **Find the AI on GitHub**: [Google Gemini](https://github.com/google-gemini)

---

## 🚀 Quick Start & Deployment

### 1. Set Up Environment Variables
This project requires API keys and a password for its features. You will need to configure these in your deployment environment (e.g., Vercel).

**Required for Core Features:**
-   `API_KEY`: Your Google Gemini API key.
-   `RESEND_API_KEY`: Your API key from Resend for handling email submissions.
-   `ADMIN_PASSWORD`: A secure password of your choice to protect the `/admin` page.

**Required for Payment Processing:**
To enable users to purchase festival passes or movies, you need a [Square Developer account](https://developer.squareup.com/apps).
-   `SQUARE_APPLICATION_ID`: Your Square Application ID (public).
-   `SQUARE_LOCATION_ID`: Your Square Location ID (public).
-   `SQUARE_ACCESS_TOKEN`: Your Square Access Token (this is a secret and should be kept private).

**Required for File Uploads:**
You need an AWS account and an S3 bucket to use the file uploader in the admin panel. The bucket must have public read access enabled and CORS configured to allow PUT requests from your website's domain.
-   `AWS_ACCESS_KEY_ID`: Your AWS IAM user's access key ID.
-   `AWS_SECRET_ACCESS_KEY`: Your AWS IAM user's secret access key.
-   `AWS_S3_REGION`: The region of your S3 bucket (e.g., `us-east-1`).
-   `AWS_S3_BUCKET_NAME`: The name of your S3 bucket.

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
2.  Enter the admin password you set in your environment variables.
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
    Create a file named `.env.local` in the root of the project and add your API keys and admin password:
    ```
    API_KEY=your_gemini_api_key
    RESEND_API_KEY=your_resend_api_key
    ADMIN_PASSWORD=your_secure_password
    SQUARE_APPLICATION_ID=your_square_application_id
    SQUARE_LOCATION_ID=your_square_location_id
    SQUARE_ACCESS_TOKEN=your_square_access_token
    AWS_ACCESS_KEY_ID=your_aws_access_key
    AWS_SECRET_ACCESS_KEY=your_aws_secret_key
    AWS_S3_REGION=your_s3_bucket_region
    AWS_S3_BUCKET_NAME=your_s3_bucket_name
    ```
    *Note: Vite automatically loads `.env.local` files, but these will not be used by the Vercel deployment.*

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.