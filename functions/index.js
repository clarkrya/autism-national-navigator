
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const {
  SESv2Client,
  SendEmailCommand,
} = require("@aws-sdk/client-sesv2");

initializeApp();

const db = getFirestore();

const awsAccessKey = defineSecret("AWS_SES_ACCESS_KEY_ID");
const awsSecretKey = defineSecret("AWS_SES_SECRET_ACCESS_KEY");

const SES_REGION = "us-east-2";
const FROM_EMAIL = "invitations@autivoya.com";
const WEBSITE_URL = "https://autivoya.com";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

exports.sendFamilyTeamInvitation = onDocumentCreated(
  {
    document: "familyOrganizerInvitations/{invitationId}",
    region: "us-east1",
    secrets: [awsAccessKey, awsSecretKey],
    retry: false,
  },
  async (event) => {
    const snapshot = event.data;

    if (!snapshot) {
      return;
    }

    const invitation = snapshot.data();
    const invitationRef = snapshot.ref;

    const email = String(invitation.invitedEmail || "")
      .trim()
      .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await invitationRef.update({
        emailDeliveryStatus: "failed",
        emailDeliveryError: "Invalid recipient email address",
        emailDeliveryUpdatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const relationship = String(
      invitation.relationship || "Family Team member"
    ).slice(0, 100);

    const safeRelationship = escapeHtml(relationship);

    const ses = new SESv2Client({
      region: SES_REGION,
      credentials: {
        accessKeyId: awsAccessKey.value(),
        secretAccessKey: awsSecretKey.value(),
      },
    });

    const subject = "You're invited to join a Family Team on Autivoya";

    const html = `
      <div style="background:#F7FAFB;padding:32px 16px;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:auto;background:#FFFFFF;border:1px solid #DCE7EC;border-radius:12px;padding:32px;">
          <h1 style="color:#204D6A;margin-top:0;">Autivoya</h1>
          <h2 style="color:#173B52;">You're invited!</h2>
          <p style="color:#334155;line-height:1.7;">
            Someone has invited you to join their Family Team on Autivoya
            as a ${safeRelationship}.
          </p>
          <p style="color:#334155;line-height:1.7;">
            Autivoya helps families organize information, coordinate
            support, and navigate their journeys together.
          </p>
          <p style="margin:28px 0;">
            <a href="${WEBSITE_URL}/family-organizer/invitations"
               style="background:#317E7B;color:#FFFFFF;padding:14px 22px;text-decoration:none;border-radius:8px;display:inline-block;">
              View Your Invitation
            </a>
          </p>
          <p style="color:#64748B;font-size:13px;line-height:1.6;">
            Sign in using the email address that received this invitation.
            If you weren't expecting it, you can ignore this email.
          </p>
          <hr style="border:0;border-top:1px solid #DCE7EC;margin:24px 0;" />
          <p style="color:#64748B;font-size:12px;">
            Autivoya · Supporting families on their journeys
          </p>
        </div>
      </div>
    `;

    const plainText = [
      "You're invited to join a Family Team on Autivoya.",
      "",
      `You've been invited as a ${relationship}.`,
      "",
      "To view your invitation, sign in using this email address:",
      `${WEBSITE_URL}/family-organizer/invitations`,
      "",
      "If you weren't expecting this invitation, you can ignore this email.",
      "",
      "The Autivoya Team",
    ].join("\n");

    try {
      const response = await ses.send(
        new SendEmailCommand({
          FromEmailAddress: FROM_EMAIL,
          Destination: {
            ToAddresses: [email],
          },
          Content: {
            Simple: {
              Subject: {
                Data: subject,
                Charset: "UTF-8",
              },
              Body: {
                Html: {
                  Data: html,
                  Charset: "UTF-8",
                },
                Text: {
                  Data: plainText,
                  Charset: "UTF-8",
                },
              },
            },
          },
        })
      );

      await invitationRef.update({
        emailDeliveryStatus: "accepted_by_ses",
        emailMessageId: response.MessageId || null,
        emailDeliveryUpdatedAt: FieldValue.serverTimestamp(),
      });

      console.log("Invitation accepted by SES", {
        invitationId: event.params.invitationId,
        messageId: response.MessageId,
      });
    } catch (error) {
      console.error("Failed to submit invitation to SES", {
        invitationId: event.params.invitationId,
        error: error.message,
      });

      await invitationRef.update({
        emailDeliveryStatus: "failed",
        emailDeliveryError: "Email provider submission failed",
        emailDeliveryUpdatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
);
