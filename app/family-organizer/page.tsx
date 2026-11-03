
"use client";

import Link from "next/link";

import FamilyOrganizerWorkspaceSelector from "../../components/familyOrganizer/FamilyOrganizerWorkspaceSelector";
import FamilyOrganizerPendingInvitations from "../../components/familyOrganizer/FamilyOrganizerPendingInvitations";

import {
  useFamilyOrganizerWorkspace,
} from "../../lib/familyOrganizer/useFamilyOrganizerWorkspace";

/*
 * ============================================================
 * AUTIVOYA — FAMILY ORGANIZER
 * ============================================================
 *
 * Premium family coordination workspace.
 *
 * Family Organizer complements the Journey rather than
 * duplicating Journey functionality.
 *
 * Supports:
 * 1. Family Team
 * 2. Shared Calendar
 * 3. Support Team
 *
 * The workspace selector supports children owned by the
 * signed-in user and children shared through Family Team.
 *
 * Shared children remain under the original owner's UID.
 * ============================================================
 */

const BRAND = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  teal: "#58AAA7",
  darkTeal: "#317E7B",
  gold: "#F7AD3F",
  lightTeal: "#EAF6F5",
  background: "#F7FAFB",
  white: "#FFFFFF",
  muted: "#647B8B",
  border: "#DCE7EC",
};

interface OrganizerFeatureCardProps {
  icon: string;
  title: string;
  description: string;
  details: string[];
  href: string;
  actionLabel: string;
  status?: string;
  disabled?: boolean;
}

/*
 * ============================================================
 * FEATURE CARD
 * ============================================================
 */

function OrganizerFeatureCard({
  icon,
  title,
  description,
  details,
  href,
  actionLabel,
  status,
  disabled = false,
}: OrganizerFeatureCardProps) {
  return (
    <section
      style={{
        background: BRAND.white,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 18,
        padding: 26,
        boxShadow:
          "0 8px 24px rgba(23, 59, 82, 0.05)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ICON AND STATUS */}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            background: BRAND.lightTeal,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 21,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {status ? (
          <div
            style={{
              padding: "5px 9px",
              borderRadius: 999,
              background: BRAND.background,
              color: BRAND.navy,
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            {status}
          </div>
        ) : null}
      </div>

      {/* TITLE */}

      <h2
        style={{
          margin: "18px 0 0",
          color: BRAND.darkNavy,
          fontSize: 21,
          lineHeight: 1.3,
          fontWeight: 800,
        }}
      >
        {title}
      </h2>

      {/* DESCRIPTION */}

      <p
        style={{
          margin: "9px 0 0",
          color: BRAND.muted,
          fontSize: 14,
          lineHeight: 1.65,
        }}
      >
        {description}
      </p>

      {/* FEATURE DETAILS */}

      <div
        style={{
          marginTop: 20,
          paddingTop: 18,
          borderTop: `1px solid ${BRAND.border}`,
          flex: 1,
        }}
      >
        {details.map((detail) => (
          <div
            key={detail}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              marginBottom: 11,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: BRAND.teal,
                marginTop: 7,
                flexShrink: 0,
              }}
            />

            <div
              style={{
                color: BRAND.navy,
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {detail}
            </div>
          </div>
        ))}
      </div>

      {/* ACTION */}

      {disabled ? (
        <div
          style={{
            marginTop: 12,
            width: "100%",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "11px 16px",
            borderRadius: 10,
            background: BRAND.border,
            color: BRAND.muted,
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          Select a child
        </div>
      ) : (
        <Link
          href={href}
          style={{
            marginTop: 12,
            width: "100%",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "11px 16px",
            borderRadius: 10,
            background: BRAND.darkTeal,
            color: BRAND.white,
            fontSize: 13,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          {actionLabel}
        </Link>
      )}
    </section>
  );
}

/*
 * ============================================================
 * MAIN FAMILY ORGANIZER PAGE
 * ============================================================
 */

export default function FamilyOrganizerPage() {
  const {
    currentUser,
    authReady,
    loading,
    error,
    workspaces,
    selectedWorkspace,
    selectWorkspace,
  } = useFamilyOrganizerWorkspace();

  const hasWorkspace = Boolean(selectedWorkspace);

  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        background: BRAND.background,
        padding: "48px 24px 72px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* ==================================================
            PAGE INTRODUCTION
        ================================================== */}

        <section style={{ marginBottom: 30 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: 999,
              background: BRAND.lightTeal,
              color: BRAND.darkTeal,
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 16,
            }}
          >
            Autivoya Premium
          </div>

          <h1
            style={{
              margin: 0,
              color: BRAND.darkNavy,
              fontSize: 36,
              lineHeight: 1.15,
              fontWeight: 850,
            }}
          >
            Family Organizer
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              maxWidth: 760,
              color: BRAND.muted,
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            Keep the people, dates, and support
            around your child organized in one
            place so your family can coordinate
            more easily.
          </p>
        </section>

        {/* ==================================================
            PENDING INVITATIONS
        ================================================== */}

        {authReady && currentUser ? (
          <div style={{ marginBottom: 24 }}>
            <FamilyOrganizerPendingInvitations />
          </div>
        ) : null}

        {/* ==================================================
            AUTHENTICATION / WORKSPACE
        ================================================== */}

        {!authReady ? (
          <section
            style={{
              background: BRAND.white,
              border: `1px solid ${BRAND.border}`,
              borderRadius: 16,
              padding: "20px 22px",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                color: BRAND.muted,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Loading your Family Organizer...
            </div>
          </section>
        ) : null}

        {authReady && !currentUser ? (
          <section
            style={{
              background: BRAND.white,
              border: `1px solid ${BRAND.border}`,
              borderRadius: 16,
              padding: 22,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                color: BRAND.darkNavy,
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              Sign in to use Family Organizer
            </div>

            <p
              style={{
                margin: "6px 0 0",
                color: BRAND.muted,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Family Organizer uses your Autivoya
              account to connect you with the
              children you own or have been
              invited to support.
            </p>

            <Link
              href="/login"
              style={{
                display: "inline-flex",
                marginTop: 14,
                padding: "9px 14px",
                borderRadius: 9,
                background: BRAND.darkTeal,
                color: BRAND.white,
                fontSize: 12,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
          </section>
        ) : null}

        {authReady && currentUser ? (
          <section
            style={{
              background: BRAND.white,
              border: `1px solid ${BRAND.border}`,
              borderRadius: 16,
              padding: "18px 20px",
              marginBottom: 24,
              boxShadow:
                "0 4px 14px rgba(23, 59, 82, 0.04)",
            }}
          >
            {loading ? (
              <div
                style={{
                  color: BRAND.muted,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Loading children...
              </div>
            ) : null}

            {!loading && error ? (
              <div
                role="alert"
                style={{
                  color: "#B91C1C",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                {error}
              </div>
            ) : null}

            {!loading &&
            !error &&
            workspaces.length === 0 ? (
              <div>
                <div
                  style={{
                    color: BRAND.darkNavy,
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  No child workspace available
                </div>

                <div
                  style={{
                    marginTop: 5,
                    color: BRAND.muted,
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  Start a Journey for a child
                  or accept a Family Team
                  invitation to use Family Organizer.
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    flexWrap: "wrap",
                    marginTop: 13,
                  }}
                >
                  <Link
                    href="/journey"
                    style={{
                      color: BRAND.darkTeal,
                      fontSize: 12,
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    Go to My Journey
                  </Link>

                  <Link
                    href="/family-organizer/invitations"
                    style={{
                      color: BRAND.darkTeal,
                      fontSize: 12,
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    Check Invitations
                  </Link>
                </div>
              </div>
            ) : null}

            {!loading &&
            !error &&
            workspaces.length > 0 ? (
              <FamilyOrganizerWorkspaceSelector
                workspaces={workspaces}
                selectedWorkspace={selectedWorkspace}
                onSelect={selectWorkspace}
              />
            ) : null}
          </section>
        ) : null}

        {/* ==================================================
            ORGANIZER SUMMARY
        ================================================== */}

        <section
          style={{
            background:
              "linear-gradient(135deg, #EAF6F5 0%, #F7FAFB 100%)",
            border: "1px solid #D1EAE8",
            borderRadius: 18,
            padding: "24px 26px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              color: BRAND.darkNavy,
              fontSize: 17,
              fontWeight: 800,
            }}
          >
            {selectedWorkspace
              ? `${selectedWorkspace.childName}'s coordination hub`
              : "Your family's coordination hub"}
          </div>

          <p
            style={{
              margin: "7px 0 0",
              color: BRAND.navy,
              fontSize: 14,
              lineHeight: 1.65,
              maxWidth: 800,
            }}
          >
            Your Journey remains the place
            for personalized next steps.
            Family Organizer helps coordinate
            the people and schedule surrounding
            that Journey.
          </p>

          {selectedWorkspace?.role ===
          "family_member" ? (
            <div
              style={{
                marginTop: 13,
                display: "inline-flex",
                padding: "6px 9px",
                borderRadius: 999,
                background: BRAND.white,
                border: "1px solid #D1EAE8",
                color: BRAND.darkTeal,
                fontSize: 10,
                fontWeight: 850,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Shared Family Access
            </div>
          ) : null}
        </section>

        {/* ==================================================
            FEATURE CARDS
        ================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <OrganizerFeatureCard
            icon="👥"
            title="Family Team"
            description="Bring the people coordinating your child's care and daily life into one shared family workspace."
            details={[
              "Invite a parent, guardian, grandparent, caregiver, or other family member",
              "Each person uses their own Autivoya account",
              "Shared access connects to the same child rather than creating duplicate profiles",
            ]}
            href="/family-organizer/family-team"
            actionLabel="Manage Family Team"
            status="Sharing"
            disabled={!hasWorkspace}
          />

          <OrganizerFeatureCard
            icon="📅"
            title="Shared Calendar"
            description="Keep important dates visible to the family members helping coordinate your child's support."
            details={[
              "Appointments and evaluations",
              "Therapy and school meetings",
              "IEP dates, insurance deadlines, and other important events",
            ]}
            href="/family-organizer/calendar"
            actionLabel="Open Calendar"
            status="Calendar"
            disabled={!hasWorkspace}
          />

          <OrganizerFeatureCard
            icon="🤝"
            title="Support Team"
            description="Keep the professionals and other people supporting your child organized in one easy-to-reference place."
            details={[
              "Doctors, specialists, and therapists",
              "Teachers, school staff, and advocates",
              "Insurance, care coordination, and community contacts",
            ]}
            href="/family-organizer/support-team"
            actionLabel="View Support Team"
            status="Contacts"
            disabled={!hasWorkspace}
          />
        </div>

        {/* ==================================================
            FAMILY TEAM INVITATIONS
        ================================================== */}

        {authReady && currentUser ? (
          <section
            style={{
              marginTop: 22,
              padding: "19px 21px",
              borderRadius: 14,
              background: BRAND.white,
              border: `1px solid ${BRAND.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color: BRAND.darkNavy,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  Family Team Invitations
                </div>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: BRAND.muted,
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  Review invitations to join
                  another child&apos;s shared
                  Family Organizer.
                </p>
              </div>

              <Link
                href="/family-organizer/invitations"
                style={{
                  padding: "9px 13px",
                  borderRadius: 9,
                  background: BRAND.lightTeal,
                  color: BRAND.darkTeal,
                  fontSize: 11,
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                View Invitations
              </Link>
            </div>
          </section>
        ) : null}

        {/* ==================================================
            FAMILY ACCESS INFORMATION
        ================================================== */}

        <section
          style={{
            marginTop: 22,
            padding: "19px 21px",
            borderRadius: 14,
            background: BRAND.white,
            border: `1px solid ${BRAND.border}`,
          }}
        >
          <div
            style={{
              color: BRAND.darkNavy,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Family access and Support Team
            contacts are different
          </div>

          <p
            style={{
              margin: "6px 0 0",
              color: BRAND.muted,
              fontSize: 12,
              lineHeight: 1.65,
            }}
          >
            Family Team members may be invited
            to use their own Autivoya account
            to collaborate around a shared
            child. Adding someone to the
            Support Team is for organization
            only and does not give that
            person access to your Autivoya
            account or your child&apos;s
            information.
          </p>
        </section>

        {/* ==================================================
            BACK TO JOURNEY
        ================================================== */}

        <div style={{ marginTop: 28 }}>
          <Link
            href="/journey"
            style={{
              color: BRAND.darkTeal,
              fontSize: 14,
              fontWeight: 750,
              textDecoration: "none",
            }}
          >
            ← Back to My Journey
          </Link>
        </div>
      </div>
    </main>
  );
}
