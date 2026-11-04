
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
    const invitationUrl =
      `${WEBSITE_URL}/family-organizer/invitations`;

    const ses = new SESv2Client({
      region: SES_REGION,
      credentials: {
        accessKeyId: awsAccessKey.value(),
        secretAccessKey: awsSecretKey.value(),
      },
    });

    const subject =
      "You're Invited to Join a Family Team on Autivoya";

    const html = `
      <div style="margin:0;padding:32px 16px;background:#F7FAFB;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #DCE7EC;border-radius:12px;overflow:hidden;">

          <div style="height:6px;background:#F7AD3F;"></div>

          <div style="padding:28px 32px;background:#EAF6F5;text-align:center;">
            <h1 style="margin:0;color:#204D6A;font-size:32px;letter-spacing:-0.5px;">
              Autivoya
            </h1>
            <p style="margin:10px 0 0;color:#317E7B;font-size:15px;font-weight:bold;">
              Every journey is unique. No family should navigate it alone.
            </p>
          </div>

          <div style="padding:32px;">

            <h2 style="margin:0 0 12px;color:#173B52;font-size:25px;line-height:1.3;">
              You've been invited to join a Family Team!
            </h2>

            <p style="color:#334155;font-size:16px;line-height:1.7;">
              Someone you know has invited you to join their
              Family Team on <strong>Autivoya</strong> as a
              <strong>${safeRelationship}</strong>.
            </p>

            <h3 style="color:#204D6A;font-size:18px;margin:28px 0 10px;">
              What is Autivoya?
            </h3>

            <p style="color:#334155;font-size:15px;line-height:1.8;">
              Autivoya is a family support platform designed to
              help parents, caregivers, and loved ones navigate
              the autism journey together.
            </p>

            <p style="color:#334155;font-size:15px;line-height:1.8;">
              From organizing important information and tracking
              milestones to coordinating care and everyday support,
              Autivoya helps families stay connected and informed
              throughout their journey.
            </p>

            <h3 style="color:#204D6A;font-size:18px;margin:28px 0 10px;">
              What does joining a Family Team mean?
            </h3>

            <p style="color:#334155;font-size:15px;line-height:1.8;">
              A Family Team brings trusted family members and
              caregivers together in one shared space.
              Once you accept your invitation, you can collaborate
              through the Family Organizer tools based on the
              access provided to you.
            </p>

            <div style="background:#F7FAFB;border:1px solid #DCE7EC;border-radius:10px;padding:20px;margin:28px 0;">
              <h3 style="margin:0 0 10px;color:#173B52;font-size:18px;">
                Ready to join?
              </h3>

              <p style="margin:0;color:#334155;font-size:15px;line-height:1.7;">
                Click the button below to view your invitation.
                Sign in with your Autivoya account, or create
                a free account if you're new.
              </p>

              <p style="margin:22px 0 4px;text-align:center;">
                <a href="${invitationUrl}"
                   style="display:inline-block;background:#317E7B;color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:bold;padding:15px 26px;border-radius:8px;">
                  View Your Invitation
                </a>
              </p>
            </div>

            <p style="color:#64748B;font-size:13px;line-height:1.7;">
              <strong>Important:</strong> Use the same email address
              that received this invitation when signing in or
              creating your account.
            </p>

            <p style="color:#64748B;font-size:13px;line-height:1.7;">
              If the button doesn't work, copy and paste this
              address into your browser:
              <a href="${invitationUrl}"
                 style="color:#317E7B;overflow-wrap:anywhere;">
                ${invitationUrl}
              </a>
            </p>

            <hr style="border:0;border-top:1px solid #DCE7EC;margin:28px 0 20px;">

            <p style="color:#64748B;font-size:12px;line-height:1.7;">
              If you weren't expecting this invitation,
              you can safely ignore this email.
            </p>

          </div>

          <div style="background:#F7FAFB;border-top:1px solid #DCE7EC;padding:22px 32px;text-align:center;">
            <p style="margin:0;color:#204D6A;font-size:15px;font-weight:bold;">
              Autivoya
            </p>
            <p style="margin:8px 0 0;color:#64748B;font-size:12px;">
              Supporting families through every unique journey.
            </p>
          </div>

        </div>
      </div>
    `;

    const plainText = [
      "AUTIVOYA",
      "Every journey is unique. No family should navigate it alone.",
      "",
      "YOU'VE BEEN INVITED TO JOIN A FAMILY TEAM!",
      "",
      `Someone you know has invited you to join their Family Team on Autivoya as a ${relationship}.`,
      "",
      "WHAT IS AUTIVOYA?",
      "",
      "Autivoya is a family support platform designed to help parents, caregivers, and loved ones navigate the autism journey together.",
      "",
      "Autivoya helps families organize important information, track milestones, coordinate care and support, and stay connected throughout their journey.",
      "",
      "WHAT DOES JOINING A FAMILY TEAM MEAN?",
      "",
      "A Family Team brings trusted family members and caregivers together in one shared space. Once you accept your invitation, you can collaborate using Family Organizer tools based on the access provided to you.",
      "",
      "READY TO JOIN?",
      "",
      "View your invitation here:",
      invitationUrl,
      "",
      "Sign in with your Autivoya account or create a free account if you're new.",
      "",
      "IMPORTANT: Use the same email address that received this invitation.",
      "",
      "If you weren't expecting this invitation, you can safely ignore this email.",
      "",
      "Autivoya",
      "Supporting families through every unique journey.",
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
