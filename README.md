# Crate TV

Crate TV is a sleek, professional, and fully-featured streaming web application designed for discovering and watching independent films. It serves as a modern alternative to major streaming platforms, providing a dedicated space for unique cinematic voices from talented indie filmmakers.

## 🌟 Features

- **Modern & Responsive UI**: A Netflix-inspired interface that looks great on all devices, from desktops to mobile phones.
- **Dynamic Content**: All movie and category data is managed from a secure admin panel and published directly to the live site, eliminating the need for code changes or redeployments for content updates.
- **Secure Contact & Submission Forms**: Dedicated pages for filmmakers to submit their work and for users to send messages. Both are powered by secure, serverless backend functions using Resend.
- **AI-Powered Bios**: Click on any actor to see their bio and a unique, AI-generated "fun fact" powered by the Gemini API.
- **Real Payments with Square**: Securely accept payments for film festival passes or individual movies using the Square Payments SDK.
- **Advanced Search**: Instantly search for movies by title, actor, or genre.
- **Persistent Likes**: Users can "like" movies, and their preferences are saved in their browser's local storage.
- **Dedicated Movie Pages**: Every film has a unique, shareable URL with automatically generated SEO and schema markup for better discovery on search engines.
- **Staging Environment**: Preview unreleased movies and content changes by adding `?env=staging` to the URL. A banner indicates you're in preview mode.
- **Secure Admin Panel**: A password-protected page (`/admin`) for content management. Authentication is handled by a secure, serverless API endpoint, and the password is stored safely as an environment variable.
- **Integrated Secure File Uploader**: Upload movie files, trailers, and posters directly to Amazon S3 from the admin panel. The system uses secure presigned URLs for fast, direct-to-S3 uploads.
- **Automated Roku Channel Packager**: A one-click tool in the Admin Panel that generates a complete, ready-to-upload Roku channel ZIP file, automatically configured to pull data from your live web app.
- **NEW: Analytics Dashboard**: A secure page to view total users, recent sign-ups, sales data from Square, filmmaker payout reports, and movie view counts.

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
-   `ADMIN_PASSWORD`: A secure password of your choice to protect the `/admin` page.

**Required for Email Functionality (Resend):**
-   `RESEND_API_KEY`: Your API key from Resend.
-   `FROM_EMAIL`: The email address you want to send emails from (e.g., `noreply@yourdomain.com`).

**CRITICAL: Verify Your Sending Domain**
For password reset and portal access emails to be delivered reliably and not end up in spam, you **must** verify your domain with Resend.
1.  Log in to your Resend account.
2.  Go to the "Domains" section and add your domain (e.g., `cratetv.net`).
3.  Resend will provide you with DNS records (like MX, TXT, CNAME) that you need to add to your domain's DNS settings (where you bought your domain, like GoDaddy, Namecheap, etc.).
4.  Once Resend verifies the records, your emails will be properly authenticated and delivered.

**Required for Firebase Integration (Authentication, Database, User Analytics):**
-   `FIREBASE_API_KEY`: Your Firebase project's Web API Key.
-   `FIREBASE_AUTH_DOMAIN`: Your Firebase project's Auth Domain.
-   `FIREBASE_PROJECT_ID`: Your Firebase project's ID.
-   `FIREBASE_STORAGE_BUCKET`: Your Firebase project's Storage Bucket.
-   `FIREBASE_MESSAGING_SENDER_ID`: Your Firebase project's Messaging Sender ID.
-   `FIREBASE_APP_ID`: Your Firebase project's App ID.
-   `FIREBASE_SERVICE_ACCOUNT_KEY`: **(Crucial for Admin Features)** This is a base64 encoded JSON key for the Firebase Admin SDK. To get this:
    1.  Go to your Firebase Project Settings > Service accounts.
    2.  Click "Generate new private key" and download the JSON file.
    3.  Open the file and copy its entire JSON content.
    4.  Encode the JSON content into a single-line base64 string (you can use an online tool like [Base64 Encode](https://www.base64encode.org/)).
    5.  Use the resulting base64 string as the value for this environment variable.

**Required for Payment Processing:**

This application supports both Square's Sandbox (for testing on `localhost`) and Production environments. You will need credentials for both.

***Production Credentials (for your live Vercel deployment):***
-   `SQUARE_APPLICATION_ID`: Your **Production** Square Application ID.
-   `SQUARE_LOCATION_ID`: Your **Production** Square Location ID.
-   `SQUARE_ACCESS_TOKEN`: Your **Production** Square Access Token (secret).

***Sandbox Credentials (for local development with `vercel dev`):***
-   `SQUARE_SANDBOX_APPLICATION_ID`: Your **Sandbox** Square Application ID.
-   `SQUARE_SANDBOX_LOCATION_ID`: Your **Sandbox** Square Location ID.
-   `SQUARE_SANDBOX_ACCESS_TOKEN`: Your **Sandbox** Square Access Token (secret).

**Required for File Uploads & Live Data Publishing:**
You need an AWS account and an S3 bucket to use the file uploader and the new live data publishing feature.
-   `AWS_ACCESS_KEY_ID`: Your AWS IAM user's access key ID.
-   `AWS_SECRET_ACCESS_KEY`: Your AWS IAM user's secret access key.
-   `AWS_S3_REGION`: The region of your S3 bucket (e.g., `us-east-1`).
-   `AWS_S3_BUCKET_NAME`: The name of your S3 bucket.

### 2. Configure AWS S3 Bucket for Uploads (CRITICAL STEP)
For the file uploader in the admin panel to work, your S3 bucket must be configured to allow public read access and accept uploads from your website.

**Step A: Create an IAM User (if you haven't already)**
1.  In your AWS Console, go to IAM > Users > Create user.
2.  Give it a name (e.g., `cratetv-s3-uploader`).
3.  Attach the `AmazonS3FullAccess` policy directly to the user for simplicity.
4.  After the user is created, go to the "Security credentials" tab and create an access key. **Save the Access Key ID and Secret Access Key immediately.** These are your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables.

**Step B: Configure Your S3 Bucket**
1.  Go to the S3 service in your AWS Console and create a new bucket or use an existing one.
2.  **Permissions Tab:**
    *   Under "Block public access (bucket settings)", **uncheck** "Block all public access" and save the changes. This is required so that the uploaded files can be viewed on your website.
3.  **Permissions Tab > Cross-origin resource sharing (CORS):**
    *   Click "Edit" and paste the following JSON. Replace `https://your-live-domain.com` with your actual Vercel deployment URL. For local development, add your localhost URL (e.g., `http://localhost:3000`).
    ```json
    [
        {
            "AllowedHeaders": [
                "Content-Type",
                "Authorization"
            ],
            "AllowedMethods": [
                "PUT"
            ],
            "AllowedOrigins": [
                "https://your-live-domain.com",
                "http://localhost:3000"
            ],
            "ExposeHeaders": []
        }
    ]
    ```

### 3. Deploy to Vercel
The simplest way to get started is to deploy this repository directly to Vercel.

<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fexample%2Fcratetv-repo" target="_blank">
  <img src="https://vercel.com/button" alt="Deploy with Vercel"/>
</a>

During the import process, Vercel will prompt you to enter the Environment Variables listed above.

### 4. Access Your Live App
Once deployed, Vercel will provide you with a public URL (e.g., `https://your-project-name.vercel.app`). You can now access your live Crate TV application. To manage content, simply navigate to `/admin`. Changes saved in the admin panel can be published to the live site instantly with the "Publish" button.

---

## 📺 How to Create and Sideload the Roku Channel

The web application includes an amazing feature: an automated packager that creates a working Roku channel for you.

**Prerequisite**: You must complete the deployment steps above first. The Roku channel needs a public URL to fetch movie data from.

**Note**: The Roku channel's source code (BrightScript and XML) is contained entirely within the `/api/generate-roku-zip.ts` serverless function. The files located in the `/roku` directory of this repository are placeholders and are not used in the final packaged channel. All development for the Roku channel should happen by editing the string contents within the API file.

### Step 1: Enable Developer Mode on Your Roku
1.  On your Roku remote, press: **Home (3x), Up (2x), Right, Left, Right, Left, Right**.
2.  Follow the on-screen instructions to enable Developer Mode and accept the terms.
3.  Your Roku will restart and display a URL on the screen (e.g., `http://192.168.1.100`). Keep this URL handy.

### Step 2: Generate the Roku Channel Package
1.  Navigate to the Admin Panel of your **live, deployed** web application (e.g., `https://your-project-name.vercel.app/admin`).
2.  Enter the admin password you set in your environment variables.
3.  Go to the **"Tools"** tab.
4.  In the "Automated Roku Channel Packager" section, click the **"Generate & Download Roku ZIP"** button. A file named `cratv.zip` will be downloaded.

### Step 3: Install the Channel on Your Roku
1.  On your computer (which must be on the same Wi-Fi network as your Roku), open a web browser and go to the Roku URL from Step 1.
2.  You will see the "Development Application Installer" page.
3.  Click **"Upload"** and select the `cratv.zip` file you just downloaded.
4.  Click **"Install"**. The Crate TV channel will appear on your Roku's home screen.

Your Roku channel is now installed and will stream content directly from your web application's API!

---

## 🔧 Local Development

If you wish to run the application on your local machine for development purposes, follow these steps.

### 1. Clone & Install
```bash
git clone <repository_url>
cd crate-tv
npm install
```

### 2. Create Local Environment File
Create a file named `.env.local` in the root of the project. This file will hold your secret keys. Refer to the `.env.example` file for the correct structure and variable names.

### 3. Run the Development Server
You have two ways to run the server locally. For most admin tasks, you will need the **Full-Stack Mode**.

#### A) Full-Stack Mode (Required for Admin Panel)
This is the **recommended** way to run the app locally. This command uses the Vercel CLI to emulate the entire production environment, including all backend API functions. This is necessary to test features like the admin login, database connection, file uploads, and publishing.

First, ensure you have the Vercel CLI installed:
```bash
npm install -g vercel
```
Then, run the server:
```bash
vercel dev
```
The application will be available at `http://localhost:3000`.

#### B) UI-Only Mode (Limited Functionality)
This mode is only for making simple UI changes that do not require a database connection. It starts a fast Vite server but does **not** run the backend API functions. The admin panel will be stuck in **Read-Only Mode** when using this command.

```bash
npm run dev
```
The application will be available at `http://localhost:5173`.