
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Autivoya collects, uses, protects, and manages personal information.",
};

const sections = [
  {
    title: "1. Introduction",
    paragraphs: [
      "Autivoya respects your privacy and recognizes the importance of protecting personal and family information. This Privacy Policy describes how information is collected, used, stored, and shared when you access or use the Autivoya platform.",
      "Autivoya is designed to help parents, caregivers, and authorized adults navigate the autism journey through personalized guidance, educational resources, and organizational tools.",
    ],
  },
  {
    title: "2. Information We Collect",
    paragraphs: [
      "Depending on the features you use, Autivoya may collect the following categories of information:",
    ],
    bullets: [
      "Account information, including your name, email address, and authentication information.",
      "Child and family profile information voluntarily provided by parents, caregivers, or authorized adults.",
      "Developmental, educational, behavioral, and health-related information you choose to provide.",
      "Journey responses, completed tasks, personal notes, preferences, and progress information.",
      "Documents and records uploaded through the Document Vault.",
      "Calendar events, support team information, and Family Organizer activity.",
      "Questions, prompts, and responses associated with personalized and AI-powered tools.",
      "Subscription status, billing-related information, and transaction records.",
      "Device, browser, usage, diagnostic, and technical information.",
      "Communications submitted to Autivoya support.",
    ],
  },
  {
    title: "3. How We Use Information",
    paragraphs: [
      "Autivoya uses information to provide, maintain, personalize, secure, and improve the platform.",
    ],
    bullets: [
      "Create and manage user accounts.",
      "Generate personalized journeys and recommended next steps.",
      "Provide educational resources and personalized support tools.",
      "Store and organize information and documents requested by users.",
      "Enable authorized family collaboration.",
      "Manage subscriptions and payments.",
      "Respond to support requests and technical issues.",
      "Detect fraud, unauthorized access, and security concerns.",
      "Comply with applicable legal obligations.",
    ],
  },
  {
    title: "4. Children's Privacy",
    paragraphs: [
      "Autivoya is intended for individuals who are at least 18 years old. Children under the age of 13 are not permitted to independently create accounts or submit personal information.",
      "Parents, legal guardians, and other appropriately authorized adults may provide information about children for the purpose of receiving personalized guidance and using platform features.",
      "Users must have appropriate legal authority or permission before submitting or sharing another person's information.",
      "If you believe a child has provided personal information without appropriate authorization, please contact Autivoya so the matter can be reviewed and appropriate action taken.",
    ],
  },
  {
    title: "5. Sensitive Information and Document Vault",
    paragraphs: [
      "Certain features allow users to voluntarily provide sensitive information, including educational records, evaluations, medical documents, and developmental information.",
      "Users should upload only information necessary for their intended use and should avoid submitting unnecessary identifiers, Social Security numbers, financial account details, or other highly sensitive information.",
      "Autivoya is not a healthcare provider or an electronic medical record system. Users should not assume that information submitted to Autivoya receives the same legal protections as information maintained by a healthcare provider.",
    ],
  },
  {
    title: "6. Artificial Intelligence and Personalized Guidance",
    paragraphs: [
      "Autivoya may use artificial intelligence and automated technologies to generate personalized recommendations, educational content, meeting preparation materials, and responses to user questions.",
      "Information you provide may be processed by technology service providers as necessary to deliver these features.",
      "AI-generated information may be incomplete, inaccurate, or outdated. Users should independently verify important information and consult qualified professionals when making medical, educational, legal, or financial decisions.",
      "Users should avoid including unnecessary identifying or sensitive information when submitting questions to AI-powered tools.",
    ],
  },
  {
    title: "7. Third-Party Service Providers",
    paragraphs: [
      "Autivoya uses third-party technology providers to support platform operations. Depending on the services used, these providers may process information necessary to perform their functions.",
    ],
    bullets: [
      "Firebase and Google Cloud services for authentication, database, and application infrastructure.",
      "Amazon Web Services for applicable cloud infrastructure and email services.",
      "Stripe for payment processing and subscription management.",
      "Vercel for website hosting and application deployment.",
      "Artificial intelligence service providers for applicable personalized features.",
    ],
  },
  {
    title: "8. Information Sharing",
    paragraphs: [
      "Information may be shared with service providers as necessary to operate the platform, with individuals authorized through collaboration features, or when required by applicable law.",
      "Information may also be disclosed when reasonably necessary to investigate security incidents, prevent fraud, protect users, or respond to lawful requests.",
      "Users who invite another person to collaborate should review the permissions associated with shared information before granting access.",
    ],
  },
  {
    title: "9. Payments and Subscriptions",
    paragraphs: [
      "Payment processing is handled through Stripe. Payment information submitted through Stripe is subject to Stripe's applicable privacy practices.",
      "Autivoya may receive subscription status, transaction identifiers, billing-related information, and other information necessary to administer subscriptions and account access.",
    ],
  },
  {
    title: "10. Cookies and Similar Technologies",
    paragraphs: [
      "Autivoya and its service providers may use cookies, local storage, and similar technologies to maintain authentication, remember preferences, support platform functionality, and monitor performance.",
      "Users may manage certain cookie preferences through their browser settings. Disabling essential technologies may affect platform functionality.",
    ],
  },
  {
    title: "11. Data Security",
    paragraphs: [
      "Autivoya seeks to implement reasonable administrative, technical, and organizational safeguards designed to protect personal information.",
      "No method of electronic transmission or storage can be guaranteed to be completely secure. Users are responsible for maintaining the confidentiality of their account credentials and managing authorized access to their information.",
      "Suspected unauthorized access or security concerns should be reported promptly to Autivoya support.",
    ],
  },
  {
    title: "12. Data Retention and Deletion",
    paragraphs: [
      "Personal information may be retained for as long as necessary to provide requested services, maintain accounts, resolve disputes, meet legal obligations, and support legitimate operational and security purposes.",
      "Users may request deletion of their account and associated personal information by contacting Autivoya support.",
      "Certain information may need to be retained for legal, financial, security, or technical reasons, including information maintained in backups for a limited period.",
    ],
  },
  {
    title: "13. Your Privacy Rights",
    paragraphs: [
      "Depending on your location and applicable law, you may have rights concerning your personal information.",
    ],
    bullets: [
      "Request access to personal information.",
      "Request correction of inaccurate information.",
      "Request deletion of personal information.",
      "Request a copy of eligible personal information.",
      "Withdraw consent where processing relies on consent.",
      "Exercise other rights available under applicable privacy laws.",
    ],
  },
  {
    title: "14. Third-Party Websites and Resources",
    paragraphs: [
      "Autivoya may provide links to external websites, organizations, educational materials, and other resources.",
      "Autivoya does not control the privacy practices of external websites. Users should review the privacy policies of those services before submitting personal information.",
    ],
  },
  {
    title: "15. Changes to This Privacy Policy",
    paragraphs: [
      "Autivoya may update this Privacy Policy to reflect changes in platform functionality, business operations, technology, or legal requirements.",
      "Updated policies will be published on this page. Additional notice or consent will be provided when required by applicable law.",
    ],
  },
];

export default function PrivacyPage() {
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
          Privacy Policy
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
          16. Contact Us
        </h2>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.8,
          }}
        >
          For privacy questions, concerns, or requests
          regarding your personal information, please
          contact Autivoya.
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
      </section>
    </main>
  );
}
