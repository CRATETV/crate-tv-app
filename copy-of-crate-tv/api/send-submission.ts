// This is a Vercel Serverless Function
// It will be accessible at the path /api/send-submission
import { Resend } from 'resend';

interface SubmissionFormData {
  filmTitle: string;
  directorName: string;
  email: string;
  synopsis: string;
  actorBio?: string;
  awards?: string;
  relevantInfo?: string;
}

const createEmailBody = (data: SubmissionFormData): string => {
  const styles = {
    body: 'font-family: Arial, sans-serif; line-height: 1.6; color: #333;',
    container: 'max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #fff;',
    header: 'font-size: 24px; color: #141414; margin-bottom: 20px;',
    label: 'font-weight: bold; color: #555; display: block; margin-top: 15px;',
    content: 'background-color: #f9f9f9; border: 1px solid #eee; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word;',
  };

  let awardsHtml = data.awards ? `<p><span style="${styles.label}">Awards & Recognition:</span><div style="${styles.content}">${data.awards}</div></p>` : '';
  let bioHtml = data.actorBio ? `<p><span style="${styles.label}">Actor Bios:</span><div style="${styles.content}">${data.actorBio}</div></p>` : '';
  let infoHtml = data.relevantInfo ? `<p><span style="${styles.label}">Relevant Information:</span><div style="${styles.content}">${data.relevantInfo}</div></p>` : '';

  return `
    <div style="${styles.body}">
      <div style="${styles.container}">
        <h1 style="${styles.header}">New Film Submission for Crate TV</h1>
        <p><span style="${styles.label}">Film Title:</span> ${data.filmTitle}</p>
        <p><span style="${styles.label}">Director's Name:</span> ${data.directorName}</p>
        <p><span style="${styles.label}">Submitter's Email:</span> ${data.email}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p><span style="${styles.label}">Synopsis:</span><div style="${styles.content}">${data.synopsis}</div></p>
        ${bioHtml}
        ${awardsHtml}
        ${infoHtml}
      </div>
    </div>
  `;
};

export async function POST(request: Request) {
  try {
    const data: SubmissionFormData = await request.json();

    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set.");
    }

    if (!data.filmTitle || !data.directorName || !data.email || !data.synopsis) {
      return new Response(JSON.stringify({ error: '