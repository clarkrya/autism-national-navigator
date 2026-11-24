
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Review the terms and conditions governing your access to and use of Autivoya.",
};

const sections = [
  {
    title: "1. Acceptance of Terms",
    paragraphs: [
      "These Terms of Service govern your access to and use of Autivoya, including its website, applications, personalized tools, resources, and subscription services.",
      "By creating an account or using Autivoya, you agree to these Terms of Service. If you do not agree to these terms, you should not use the platform.",
    ],
  },
  {
    title: "2. About Autivoya",
    paragraphs: [
      "Autivoya is an educational, informational, and organizational platform designed to help parents, caregivers, and authorized adults navigate the autism journey.",
      "Autivoya provides personalized guidance, educational resources, recommended next steps, organizational tools, and other features intended to support informed decision-making.",
      "Autivoya does not provide medical care, clinical diagnoses, treatment, legal representation, or professional educational services.",
    ],
  },
  {
    title: "3. Eligibility and Account Registration",
    paragraphs: [
      "You must be at least 18 years old to create an account and use Autivoya.",
      "By creating an account, you represent that the information you provide is accurate and that you have the legal authority to provide information concerning any child or individual associated with your account.",
    ],
    bullets: [
      "Maintain accurate and current account information.",
      "Protect your login credentials.",
      "Notify Autivoya of suspected unauthorized account access.",
      "Use the platform only for lawful and authorized purposes.",
    ],
  },
  {
    title: "4. Medical and Professional Disclaimer",
    paragraphs: [
      "Autivoya provides information for educational and informational purposes only. Information provided through the platform is not medical advice and is not a substitute for professional diagnosis, treatment, or consultation.",
      "Always seek guidance from qualified healthcare providers, educational professionals, legal professionals, or other appropriate specialists regarding individual circumstances.",
      "Never disregard professional medical advice or delay seeking appropriate care because of information obtained through Autivoya.",
      "Autivoya is not an emergency service. If you are experiencing a medical emergency or immediate safety concern, contact emergency services.",
    ],
  },
  {
    title: "5. Artificial Intelligence and Personalized Tools",
    paragraphs: [
      "Certain Autivoya features use artificial intelligence and automated technologies to generate personalized guidance, recommended tasks, resources, meeting preparation materials, and responses.",
      "AI-generated information may contain inaccuracies, omissions, outdated information, or recommendations that are not appropriate for your individual circumstances.",
      "Users are responsible for reviewing and independently verifying information before relying on it or making important decisions.",
      "Autivoya does not guarantee the accuracy, completeness, reliability, or suitability of AI-generated content.",
    ],
  },
  {
    title: "6. Personalized Journeys and Resources",
    paragraphs: [
      "Autivoya's personalized journeys and recommended tasks are intended to help users organize information, identify potential next steps, and explore available resources.",
      "Recommendations may vary based on information provided by users and may change as the platform evolves.",
      "Completion of a journey, task, or recommended action does not guarantee eligibility for services, insurance coverage, educational accommodations, clinical improvements, or any specific outcome.",
    ],
  },
  {
    title: "7. Subscriptions and Payments",
    paragraphs: [
      "Autivoya may offer free and paid subscription plans with different features and levels of access.",
      "Subscription pricing, billing frequency, renewal terms, and applicable charges will be presented before purchase.",
      "By purchasing a recurring subscription, you authorize recurring charges according to the billing terms disclosed during checkout until your subscription is canceled.",
      "Payments are processed through Stripe or another designated payment service provider.",
      "Any changes to subscription pricing or billing terms will be communicated as required by applicable law.",
    ],
  },
  {
    title: "8. Subscription Cancellation and Refunds",
    paragraphs: [
      "Users may cancel recurring subscriptions through the available subscription management functionality or by contacting Autivoya support.",
      "Cancellation generally prevents future renewal charges. Unless otherwise disclosed or required by law, access to paid features continues through the applicable paid subscription period.",
      "Refund eligibility is subject to the terms disclosed at purchase and applicable consumer protection laws.",
      "Nothing in these terms limits any cancellation, refund, or other consumer rights provided by applicable law.",
    ],
  },
  {
    title: "9. User Content and Document Vault",
    paragraphs: [
      "Users retain ownership of documents, notes, profile information, and other original content they submit to Autivoya.",
      "By submitting content, you grant Autivoya limited permission to store, process, display, and transmit that content as reasonably necessary to provide the requested services and operate the platform in accordance with the Privacy Policy.",
      "You are responsible for ensuring that you have the appropriate rights and permissions to upload, store, or share information.",
      "The Document Vault is intended as an organizational tool and should not be relied upon as the sole repository for important medical, educational, legal, or personal records.",
      "Users are encouraged to maintain independent copies of important documents.",
    ],
  },
  {
    title: "10. Family Organizer and Shared Access",
    paragraphs: [
      "Autivoya may allow users to invite authorized family members, caregivers, and other individuals to collaborate through shared features.",
      "Users are responsible for determining whom they invite, reviewing available permissions, and ensuring that shared information is disclosed only to appropriately authorized individuals.",
      "Users should promptly remove access when an individual is no longer authorized to view or participate in shared information.",
      "Autivoya cannot guarantee that an authorized recipient will not independently copy or retain information they have accessed.",
    ],
  },
  {
    title: "11. Community and Acceptable Use",
    paragraphs: [
      "Users agree to interact respectfully and responsibly when using Autivoya and any available community or collaboration features.",
    ],
    bullets: [
      "Do not engage in harassment, discrimination, threats, or abusive conduct.",
      "Do not impersonate another person or misrepresent your identity.",
      "Do not submit unlawful, fraudulent, or intentionally misleading content.",
      "Do not disclose another person's private information without appropriate authorization.",
      "Do not distribute malicious software, spam, or unauthorized promotional content.",
      "Do not attempt to bypass security controls or access another user's account or information.",
      "Do not interfere with the operation, security, or availability of the platform.",
    ],
  },
  {
    title: "12. Third-Party Resources and Services",
    paragraphs: [
      "Autivoya may provide links to external organizations, websites, healthcare resources, educational services, and other third-party content.",
      "The inclusion of a resource does not constitute an endorsement, guarantee, or certification of that organization or its services.",
      "Third-party services are subject to their own terms, privacy practices, eligibility requirements, and availability.",
      "Users are responsible for independently evaluating third-party resources before engaging with them.",
    ],
  },
  {
    title: "13. Intellectual Property",
    paragraphs: [
      "The Autivoya platform, branding, logos, website design, software, original content, and proprietary features are owned by Autivoya or its applicable licensors.",
      "Users are granted a limited, non-exclusive, non-transferable, and revocable right to access and use the platform for authorized purposes.",
      "Users may not reproduce, distribute, sell, commercially exploit, or create unauthorized copies of proprietary platform materials except as permitted by applicable law or with written authorization.",
      "These restrictions do not transfer ownership of user-submitted content to Autivoya.",
    ],
  },
  {
    title: "14. Privacy and Data Protection",
    paragraphs: [
      "Autivoya's collection, use, storage, and sharing of personal information are described in its Privacy Policy.",
      "Users should review the Privacy Policy before submitting personal, family, educational, or health-related information.",
      "Users are responsible for providing information lawfully and obtaining any permissions required to submit or share information concerning another individual.",
    ],
  },
  {
    title: "15. Platform Availability and Changes",
    paragraphs: [
      "Autivoya may update, modify, improve, or discontinue platform features as its services evolve.",
      "Temporary interruptions may occur due to maintenance, technical issues, third-party service interruptions, or circumstances beyond Autivoya's reasonable control.",
      "Autivoya does not guarantee uninterrupted or error-free access to the platform.",
      "Material changes affecting paid subscriptions will be handled in accordance with applicable law and disclosed subscription terms.",
    ],
  },
  {
    title: "16. Account Suspension and Termination",
    paragraphs: [
      "Autivoya may restrict, suspend, or terminate access when reasonably necessary to address violations of these terms, fraudulent activity, unauthorized access, security threats, or legal obligations.",
      "Where appropriate and reasonably practicable, Autivoya will provide notice regarding account restrictions.",
      "Users may discontinue use of the platform and request account deletion in accordance with the Privacy Policy.",
      "Termination does not eliminate obligations or rights that accrued before termination.",
    ],
  },
  {
    title: "17. Disclaimer of Warranties",
    paragraphs: [
      "To the extent permitted by applicable law, Autivoya is provided on an as-is and as-available basis without warranties of uninterrupted availability, accuracy, completeness, or suitability for a particular purpose.",
      "Autivoya does not guarantee specific medical, developmental, educational, financial, or personal outcomes.",
      "Nothing in these terms excludes warranties or consumer protections that cannot lawfully be excluded.",
    ],
  },
  {
    title: "18. Limitation of Liability",
    paragraphs: [
      "To the extent permitted by applicable law, Autivoya will not be liable for indirect, incidental, special, or consequential damages arising from use of or inability to use the platform.",
      "Users acknowledge that decisions concerning medical care, education, treatment, legal matters, and other important personal circumstances should be made with appropriate professional guidance.",
      "Nothing in these terms excludes or limits liability where such exclusion or limitation is prohibited by applicable law.",
    ],
  },
  {
    title: "19. Governing Law and Dispute Resolution",
    paragraphs: [
      "These Terms of Service are governed by the applicable laws of the United States and the State of Florida, without limiting any mandatory consumer protections available under applicable law.",
      "Users are encouraged to contact Autivoya support to seek an informal resolution of concerns or disputes before pursuing formal legal remedies.",
      "Nothing in these terms prevents users from exercising legal rights or remedies available under applicable law.",
    ],
  },
  {
    title: "20. Changes to These Terms",
    paragraphs: [
      "Autivoya may update these Terms of Service to reflect changes in platform functionality, business operations, technology, or legal requirements.",
      "Updated terms will be published on this page. Additional notice or renewed acceptance will be requested when required by applicable law.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "56px 24px 80px",
        color: "#334155",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #E2E8F0",
          paddingBottom: 24,
          marginBottom: 32,
        }}
      >
        <h1
          style={{
            color: "#204D6A",
            fontSize: 34,
            fontWeight: 800,
            margin: "0 0 12px",
          }}
        >
          Terms of Service
        </h1>

        <p
          style={{
            color: "#64748B",
            fontSize: 14,
            margin: 0,
          }}
        >
          Autivoya
        </p>
      </header>

      {sections.map((section) => (
        <section
          key={section.title}
          style={{
            marginBottom: 32,
          }}
        >
          <h2
            style={{
              color: "#204D6A",
              fontSize: 20,
              fontWeight: 750,
              marginBottom: 12,
            }}
          >
            {section.title}
          </h2>

          {section.paragraphs.map((paragraph, index) => (
            <p
              key={index}
              style={{
                fontSize: 14,
                lineHeight: 1.8,
                marginBottom: 12,
              }}
            >
              {paragraph}
            </p>
          ))}

          {section.bullets && (
            <ul
              style={{
                paddingLeft: 24,
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              {section.bullets.map((bullet) => (
                <li
                  key={bullet}
                  style={{
                    marginBottom: 6,
                  }}
                >
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section
        style={{
          borderTop: "1px solid #E2E8F0",
          paddingTop: 24,
        }}
      >
        <h2
          style={{
            color: "#204D6A",
            fontSize: 20,
            fontWeight: 750,
          }}
        >
          21. Contact Us
        </h2>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.8,
          }}
        >
          For questions regarding these Terms of Service,
          subscriptions, or use of the Autivoya platform,
          please contact Autivoya support.
        </p>

        <a
          href="mailto:support@autivoya.com"
          style={{
            color: "#204D6A",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "underline",
          }}
        >
          support@autivoya.com
        </a>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            marginTop: 28,
          }}
        >
          <Link
            href="/privacy"
            style={{
              color: "#204D6A",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Privacy Policy
          </Link>

          <Link
            href="/contact"
            style={{
              color: "#204D6A",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Contact Autivoya
          </Link>
        </div>
      </section>
    </main>
  );
}
