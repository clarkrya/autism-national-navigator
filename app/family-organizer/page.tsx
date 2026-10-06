"use client";

import Link from "next/link";

import FamilyOrganizerWorkspaceSelector from "../../components/familyOrganizer/FamilyOrganizerWorkspaceSelector";

import FamilyOrganizerPendingInvitations from "../../components/familyOrganizer/FamilyOrganizerPendingInvitations";

import {
  useFamilyOrganizerWorkspace,
} from "../../lib/familyOrganizer/useFamilyOrganizerWorkspace";

/*
 * ============================================================
 * FAMILY ORGANIZER PAGE
 * ============================================================
 *
 * Premium family coordination workspace.
 *
 * Family Organizer complements the Journey rather than
 * duplicating Journey functionality.
 *
 * Family Organizer supports:
 *
 * 1. Family Team
 * 2. Shared Calendar
 * 3. Support Team
 *
 * The workspace selector supports both:
 *
 * - children owned by the signed-in user
 * - children shared through Family Team
 *
 * Shared children remain canonical under the original owner's
 * UID and are never duplicated into another user's account.
 * ============================================================
 */

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
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "18px",
        padding: "26px",
        boxShadow:
          "0 8px 24px rgba(15, 23, 42, 0.04)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent:
            "space-between",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "13px",
            background: "#EFF6FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "21px",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {icon}
        </div>

        {status ? (
          <div
            style={{
              padding: "5px 9px",
              borderRadius: "999px",
              background: "#F1F5F9",
              color: "#475569",
              fontSize: "10px",
              fontWeight: 800,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            {status}
          </div>
        ) : null}
      </div>

      <h2
        style={{
          margin: "18px 0 0",
          color: "#0F172A",
          fontSize: "21px",
          lineHeight: 1.3,
          fontWeight: 800,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: "9px 0 0",
          color: "#64748B",
          fontSize: "14px",
          lineHeight: 1.65,
        }}
      >
        {description}
      </p>

      <div
        style={{
          marginTop: "20px",
          paddingTop: "18px",
          borderTop:
            "1px solid #E2E8F0",
          flex: 1,
        }}
      >
        {details.map(
          (detail) => (
            <div
              key={detail}
              style={{
                display: "flex",
                alignItems:
                  "flex-start",
                gap: "9px",
                marginBottom:
                  "11px",
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius:
                    "999px",
                  background:
                    "#3B82F6",
                  marginTop: "7px",
                  flexShrink: 0,
                }}
              />

              <div
                style={{
                  color: "#475569",
                  fontSize: "13px",
                  lineHeight: 1.55,
                }}
              >
                {detail}
              </div>
            </div>
          )
        )}
      </div>

      {disabled ? (
        <div
          style={{
            marginTop: "12px",
            width: "100%",
            boxSizing:
              "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            padding:
              "11px 16px",
            borderRadius: "10px",
            background: "#E2E8F0",
            color: "#64748B",
            fontSize: "13px",
            fontWeight: 800,
          }}
        >
          Select a child
        </div>
      ) : (
        <Link
          href={href}
          style={{
            marginTop: "12px",
            width: "100%",
            boxSizing:
              "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            padding:
              "11px 16px",
            borderRadius: "10px",
            background: "#2563EB",
            color: "#FFFFFF",
            fontSize: "13px",
            fontWeight: 800,
            textDecoration:
              "none",
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
 * PAGE
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
  } =
    useFamilyOrganizerWorkspace();

  const hasWorkspace =
    Boolean(
      selectedWorkspace
    );

  return (
    <main
      style={{
        minHeight:
          "calc(100vh - 72px)",
        background: "#F8FAFC",
        padding:
          "48px 24px 72px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* ==================================================
            PAGE INTRODUCTION
        =================================================== */}

        <section
          style={{
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              display:
                "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius:
                "999px",
              background: "#DBEAFE",
              color: "#1D4ED8",
              fontSize: "11px",
              fontWeight: 800,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.05em",
              marginBottom:
                "16px",
            }}
          >
            Premium
          </div>

          <h1
            style={{
              margin: 0,
              color: "#0F172A",
              fontSize: "36px",
              lineHeight: 1.15,
              fontWeight: 850,
            }}
          >
            Family Organizer
          </h1>

          <p
            style={{
              margin:
                "12px 0 0",
              maxWidth: "760px",
              color: "#64748B",
              fontSize: "16px",
              lineHeight: 1.7,
            }}
          >
            Keep the people, dates,
            and support around your
            child organized in one
            place so your family can
            coordinate more easily.
          </p>
        </section>

        {/* ==================================================
            PENDING INVITATIONS
        =================================================== */}

        {authReady &&
        currentUser ? (
          <div
            style={{
              marginBottom:
                "24px",
            }}
          >
            <FamilyOrganizerPendingInvitations />
          </div>
        ) : null}

        {/* ==================================================
            AUTH / WORKSPACE
        =================================================== */}

        {!authReady ? (
          <section
            style={{
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              borderRadius:
                "16px",
              padding:
                "20px 22px",
              marginBottom:
                "24px",
            }}
          >
            <div
              style={{
                color: "#64748B",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              Loading your Family
              Organizer...
            </div>
          </section>
        ) : null}

        {authReady &&
        !currentUser ? (
          <section
            style={{
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              borderRadius:
                "16px",
              padding:
                "22px",
              marginBottom:
                "24px",
            }}
          >
            <div
              style={{
                color: "#0F172A",
                fontSize: "16px",
                fontWeight: 800,
              }}
            >
              Sign in to use Family
              Organizer
            </div>

            <p
              style={{
                margin:
                  "6px 0 0",
                color: "#64748B",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              Family Organizer uses
              your Myriad account to
              connect you with the
              children you own or
              have been invited to
              support.
            </p>

            <Link
              href="/login"
              style={{
                display:
                  "inline-flex",
                marginTop: "14px",
                padding:
                  "9px 14px",
                borderRadius:
                  "9px",
                background:
                  "#2563EB",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 800,
                textDecoration:
                  "none",
              }}
            >
              Sign In
            </Link>
          </section>
        ) : null}

        {authReady &&
        currentUser ? (
          <section
            style={{
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              borderRadius:
                "16px",
              padding:
                "18px 20px",
              marginBottom:
                "24px",
              boxShadow:
                "0 4px 14px rgba(15, 23, 42, 0.03)",
            }}
          >
            {loading ? (
              <div
                style={{
                  color:
                    "#64748B",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                Loading children...
              </div>
            ) : null}

            {!loading &&
            error ? (
              <div
                style={{
                  color:
                    "#B91C1C",
                  fontSize: "12px",
                  lineHeight: 1.6,
                }}
              >
                {error}
              </div>
            ) : null}

            {!loading &&
            !error &&
            workspaces.length ===
              0 ? (
              <div>
                <div
                  style={{
                    color:
                      "#334155",
                    fontSize: "14px",
                    fontWeight: 800,
                  }}
                >
                  No child workspace
                  available
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    color:
                      "#64748B",
                    fontSize: "12px",
                    lineHeight: 1.6,
                  }}
                >
                  Start a Journey for
                  a child or accept a
                  Family Team
                  invitation to use
                  Family Organizer.
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "14px",
                    flexWrap: "wrap",
                    marginTop: "13px",
                  }}
                >
                  <Link
                    href="/journey"
                    style={{
                      color:
                        "#2563EB",
                      fontSize:
                        "12px",
                      fontWeight: 800,
                      textDecoration:
                        "none",
                    }}
                  >
                    Go to My Journey
                  </Link>

                  <Link
                    href="/family-organizer/invitations"
                    style={{
                      color:
                        "#7C3AED",
                      fontSize:
                        "12px",
                      fontWeight: 800,
                      textDecoration:
                        "none",
                    }}
                  >
                    Check Invitations
                  </Link>
                </div>
              </div>
            ) : null}

            {!loading &&
            !error &&
            workspaces.length >
              0 ? (
              <FamilyOrganizerWorkspaceSelector
                workspaces={
                  workspaces
                }
                selectedWorkspace={
                  selectedWorkspace
                }
                onSelect={
                  selectWorkspace
                }
              />
            ) : null}
          </section>
        ) : null}

        {/* ==================================================
            ORGANIZER SUMMARY
        =================================================== */}

        <section
          style={{
            background:
              "linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)",
            border:
              "1px solid #DBEAFE",
            borderRadius:
              "18px",
            padding:
              "24px 26px",
            marginBottom:
              "24px",
          }}
        >
          <div
            style={{
              color: "#1E3A8A",
              fontSize: "17px",
              fontWeight: 800,
            }}
          >
            {selectedWorkspace
              ? `${selectedWorkspace.childName}'s coordination hub`
              : "Your family's coordination hub"}
          </div>

          <p
            style={{
              margin:
                "7px 0 0",
              color: "#475569",
              fontSize: "14px",
              lineHeight: 1.65,
              maxWidth: "800px",
            }}
          >
            Your Journey remains the
            place for personalized
            next steps. Family
            Organizer helps
            coordinate the people
            and schedule surrounding
            that Journey.
          </p>

          {selectedWorkspace?.role ===
          "family_member" ? (
            <div
              style={{
                marginTop: "13px",
                display:
                  "inline-flex",
                padding:
                  "6px 9px",
                borderRadius:
                  "999px",
                background:
                  "#FFFFFF",
                border:
                  "1px solid #DDD6FE",
                color: "#6D28D9",
                fontSize: "10px",
                fontWeight: 850,
                textTransform:
                  "uppercase",
                letterSpacing:
                  "0.04em",
              }}
            >
              Shared Family Access
            </div>
          ) : null}
        </section>

        {/* ==================================================
            FEATURE CARDS
        =================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
            alignItems:
              "stretch",
          }}
        >
          <OrganizerFeatureCard
            icon="👥"
            title="Family Team"
            description="Bring the people coordinating your child's care and daily life into one shared family workspace."
            details={[
              "Invite a parent, guardian, grandparent, caregiver, or other family member",
              "Each person uses their own Myriad login",
              "Shared access connects to the same child rather than creating duplicate profiles",
            ]}
            href="/family-organizer/family-team"
            actionLabel="Manage Family Team"
            status="Sharing"
            disabled={
              !hasWorkspace
            }
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
            disabled={
              !hasWorkspace
            }
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
            disabled={
              !hasWorkspace
            }
          />
        </div>

        {/* ==================================================
            INVITATIONS
        =================================================== */}

        {authReady &&
        currentUser ? (
          <section
            style={{
              marginTop: "22px",
              padding:
                "19px 21px",
              borderRadius:
                "14px",
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color:
                      "#334155",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  Family Team
                  Invitations
                </div>

                <p
                  style={{
                    margin:
                      "5px 0 0",
                    color:
                      "#64748B",
                    fontSize: "12px",
                    lineHeight: 1.6,
                  }}
                >
                  Review invitations
                  to join another
                  child&apos;s shared
                  Family Organizer.
                </p>
              </div>

              <Link
                href="/family-organizer/invitations"
                style={{
                  padding:
                    "9px 13px",
                  borderRadius:
                    "9px",
                  background:
                    "#F5F3FF",
                  color:
                    "#6D28D9",
                  fontSize:
                    "11px",
                  fontWeight: 800,
                  textDecoration:
                    "none",
                }}
              >
                View Invitations
              </Link>
            </div>
          </section>
        ) : null}

        {/* ==================================================
            PRIVACY / ACCESS NOTE
        =================================================== */}

        <section
          style={{
            marginTop: "22px",
            padding:
              "19px 21px",
            borderRadius:
              "14px",
            background: "#FFFFFF",
            border:
              "1px solid #E2E8F0",
          }}
        >
          <div
            style={{
              color: "#334155",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            Family access and Support
            Team contacts are
            different
          </div>

          <p
            style={{
              margin:
                "6px 0 0",
              color: "#64748B",
              fontSize: "12px",
              lineHeight: 1.65,
            }}
          >
            Family Team members may
            be invited to use their
            own Myriad account to
            collaborate around a
            shared child. Adding
            someone to the Support
            Team is for organization
            only and does not give
            that person access to
            your Myriad account or
            your child&apos;s information.
          </p>
        </section>

        {/* ==================================================
            JOURNEY LINK
        =================================================== */}

        <div
          style={{
            marginTop: "28px",
          }}
        >
          <Link
            href="/journey"
            style={{
              color: "#2563EB",
              fontSize: "14px",
              fontWeight: 750,
              textDecoration:
                "none",
            }}
          >
            ← Back to My Journey
          </Link>
        </div>
      </div>
    </main>
  );
}