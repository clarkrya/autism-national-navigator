
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  CSSProperties,
  FormEvent,
  ReactNode,
} from "react";

import FamilyOrganizerWorkspaceSelector from "../../../components/familyOrganizer/FamilyOrganizerWorkspaceSelector";

import {
  useFamilyOrganizerWorkspace,
} from "../../../lib/familyOrganizer/useFamilyOrganizerWorkspace";

import {
  createFamilyOrganizerSupportTeamMember,
  deleteFamilyOrganizerSupportTeamMember,
  getFamilyOrganizerSupportTeam,
  updateFamilyOrganizerSupportTeamMember,
} from "../../../lib/familyOrganizer/familyOrganizerSupportTeamRepository";

import type {
  FamilyOrganizerSupportTeamCategory,
  FamilyOrganizerSupportTeamMember,
} from "../../../lib/familyOrganizer/familyOrganizerTypes";

/*
 * ============================================================
 * AUTIVOYA — SUPPORT TEAM
 * ============================================================
 *
 * Organizes professionals and other contacts supporting the
 * selected child.
 *
 * Support Team contacts do NOT automatically receive access
 * to Autivoya or the child's shared Family Organizer workspace.
 *
 * Existing repository calls and workspace access are preserved.
 * ============================================================
 */

const BRAND = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  teal: "#58AAA7",
  darkTeal: "#278482",
  gold: "#F7AD3F",
  lightTeal: "#EAF6F5",
  background: "#F7FAFB",
  white: "#FFFFFF",
  muted: "#647B8B",
  border: "#DCE7EC",
};

const SUPPORT_TEAM_CATEGORIES: {
  value: FamilyOrganizerSupportTeamCategory;
  label: string;
}[] = [
  { value: "medical", label: "Medical" },
  { value: "therapy", label: "Therapy" },
  { value: "school", label: "School" },
  { value: "insurance", label: "Insurance" },
  { value: "advocacy", label: "Advocacy" },
  { value: "care_coordination", label: "Care Coordination" },
  { value: "community", label: "Community" },
  { value: "other", label: "Other" },
];

/*
 * FORM
 */

interface SupportTeamFormState {
  name: string;
  title: string;
  organization: string;
  category: FamilyOrganizerSupportTeamCategory;
  email: string;
  phone: string;
  notes: string;
}

function getEmptyForm(): SupportTeamFormState {
  return {
    name: "",
    title: "",
    organization: "",
    category: "medical",
    email: "",
    phone: "",
    notes: "",
  };
}

/*
 * HELPERS
 */

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function getCategoryLabel(
  category: FamilyOrganizerSupportTeamCategory
): string {
  return (
    SUPPORT_TEAM_CATEGORIES.find(
      (item) => item.value === category
    )?.label ?? "Other"
  );
}

/*
 * SHARED STYLES
 */

const styles: Record<string, CSSProperties> = {
  card: {
    background: BRAND.white,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 18,
    padding: 26,
    marginBottom: 18,
    boxShadow: "0 8px 24px rgba(23,59,82,0.04)",
  },
  heading: {
    margin: 0,
    color: BRAND.darkNavy,
    fontSize: 20,
    fontWeight: 800,
  },
  button: {
    padding: "11px 17px",
    border: "none",
    borderRadius: 10,
    background: BRAND.darkTeal,
    color: BRAND.white,
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "7px 10px",
    borderRadius: 8,
    border: `1px solid ${BRAND.border}`,
    background: BRAND.white,
    color: BRAND.darkTeal,
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },
  body: {
    color: BRAND.muted,
    fontSize: 13,
    lineHeight: 1.65,
  },
  link: {
    color: BRAND.darkTeal,
    fontSize: 14,
    fontWeight: 750,
    textDecoration: "none",
  },
};

/*
 * PAGE
 */

export default function FamilyOrganizerSupportTeamPage() {
  const {
    currentUser,
    authReady,
    loading: loadingWorkspaces,
    error: workspaceError,
    workspaces,
    selectedWorkspace,
    selectWorkspace,
  } = useFamilyOrganizerWorkspace();

  const [members, setMembers] = useState<
    FamilyOrganizerSupportTeamMember[]
  >([]);

  const [loadingMembers, setLoadingMembers] =
    useState(false);

  const [supportTeamError, setSupportTeamError] =
    useState("");

  const [form, setForm] =
    useState<SupportTeamFormState>(getEmptyForm());

  const [editingMemberId, setEditingMemberId] =
    useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [deletingMemberId, setDeletingMemberId] =
    useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /*
   * LOAD SUPPORT TEAM
   */

  const loadMembers = useCallback(async () => {
    if (!currentUser || !selectedWorkspace) {
      setMembers([]);
      return;
    }

    try {
      setLoadingMembers(true);
      setSupportTeamError("");

      const loadedMembers =
        await getFamilyOrganizerSupportTeam(
          currentUser.uid,
          selectedWorkspace.ownerUserId,
          selectedWorkspace.childId
        );

      setMembers(loadedMembers);
    } catch (error) {
      console.error(
        "Unable to load Family Organizer Support Team:",
        error
      );

      setMembers([]);

      setSupportTeamError(
        getErrorMessage(
          error,
          "We couldn't load the Support Team right now."
        )
      );
    } finally {
      setLoadingMembers(false);
    }
  }, [currentUser, selectedWorkspace]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  /*
   * RESET WHEN WORKSPACE CHANGES
   */

  useEffect(() => {
    setForm(getEmptyForm());
    setEditingMemberId(null);
    setFormError("");
    setSuccessMessage("");
    setSupportTeamError("");
  }, [
    selectedWorkspace?.ownerUserId,
    selectedWorkspace?.childId,
  ]);

  /*
   * SORT MEMBERS
   */

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        const categoryCompare = getCategoryLabel(
          a.category
        ).localeCompare(getCategoryLabel(b.category));

        if (categoryCompare !== 0) {
          return categoryCompare;
        }

        return a.name.localeCompare(b.name);
      }),
    [members]
  );

  /*
   * UPDATE FORM
   */

  function updateForm<K extends keyof SupportTeamFormState>(
    key: K,
    value: SupportTeamFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setFormError("");
    setSuccessMessage("");
  }

  function resetForm() {
    setForm(getEmptyForm());
    setEditingMemberId(null);
    setFormError("");
  }

  /*
   * EDIT
   */

  function beginEditing(
    member: FamilyOrganizerSupportTeamMember
  ) {
    setEditingMemberId(member.id);

    setForm({
      name: member.name,
      title: member.title ?? "",
      organization: member.organization ?? "",
      category: member.category,
      email: member.email ?? "",
      phone: member.phone ?? "",
      notes: member.notes ?? "",
    });

    setFormError("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * SAVE
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!currentUser || !selectedWorkspace) {
      return;
    }

    const name = form.name.trim();

    if (!name) {
      setFormError(
        "Enter the Support Team member's name."
      );
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setSuccessMessage("");

      const memberData = {
        currentUserId: currentUser.uid,
        ownerUserId: selectedWorkspace.ownerUserId,
        childId: selectedWorkspace.childId,
        name,
        title: form.title,
        organization: form.organization,
        category: form.category,
        email: form.email,
        phone: form.phone,
        notes: form.notes,
      };

      if (editingMemberId) {
        await updateFamilyOrganizerSupportTeamMember({
          ...memberData,
          memberId: editingMemberId,
        });

        setSuccessMessage(
          "Support Team member updated."
        );
      } else {
        await createFamilyOrganizerSupportTeamMember(
          memberData
        );

        setSuccessMessage(
          "Support Team member added."
        );
      }

      setForm(getEmptyForm());
      setEditingMemberId(null);

      await loadMembers();
    } catch (error) {
      console.error(
        "Unable to save Support Team member:",
        error
      );

      setFormError(
        getErrorMessage(
          error,
          "We couldn't save this Support Team member."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * DELETE
   */

  async function handleDelete(memberId: string) {
    if (!currentUser || !selectedWorkspace) {
      return;
    }

    const confirmed = window.confirm(
      "Remove this person from the Support Team?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingMemberId(memberId);
      setSupportTeamError("");

      await deleteFamilyOrganizerSupportTeamMember({
        currentUserId: currentUser.uid,
        ownerUserId: selectedWorkspace.ownerUserId,
        childId: selectedWorkspace.childId,
        memberId,
      });

      if (editingMemberId === memberId) {
        resetForm();
      }

      await loadMembers();
    } catch (error) {
      console.error(
        "Unable to remove Support Team member:",
        error
      );

      setSupportTeamError(
        getErrorMessage(
          error,
          "We couldn't remove this Support Team member."
        )
      );
    } finally {
      setDeletingMemberId("");
    }
  }

  /*
   * MEMBER CARD
   */

  function renderMember(
    member: FamilyOrganizerSupportTeamMember
  ) {
    return (
      <article
        key={member.id}
        style={{
          padding: 20,
          border: `1px solid ${BRAND.border}`,
          borderRadius: 14,
          background: BRAND.white,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 220,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: BRAND.darkNavy,
                  fontSize: 17,
                  fontWeight: 800,
                }}
              >
                {member.name}
              </h3>

              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: BRAND.lightTeal,
                  color: BRAND.darkTeal,
                  fontSize: 9,
                  fontWeight: 850,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {getCategoryLabel(member.category)}
              </span>
            </div>

            {member.title || member.organization ? (
              <div
                style={{
                  marginTop: 7,
                  color: BRAND.navy,
                  fontSize: 13,
                  fontWeight: 650,
                }}
              >
                {member.title}
                {member.title && member.organization
                  ? " • "
                  : ""}
                {member.organization}
              </div>
            ) : null}

            {member.phone ? (
              <div
                style={{
                  marginTop: 9,
                  color: BRAND.muted,
                  fontSize: 12,
                }}
              >
                Phone:{" "}
                <a
                  href={`tel:${member.phone}`}
                  style={{
                    color: BRAND.darkTeal,
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  {member.phone}
                </a>
              </div>
            ) : null}

            {member.email ? (
              <div
                style={{
                  marginTop: 6,
                  color: BRAND.muted,
                  fontSize: 12,
                }}
              >
                Email:{" "}
                <a
                  href={`mailto:${member.email}`}
                  style={{
                    color: BRAND.darkTeal,
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  {member.email}
                </a>
              </div>
            ) : null}

            {member.notes ? (
              <div
                style={{
                  marginTop: 10,
                  color: BRAND.muted,
                  fontSize: 12,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {member.notes}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => beginEditing(member)}
              style={styles.secondaryButton}
            >
              Edit
            </button>

            <button
              type="button"
              disabled={deletingMemberId === member.id}
              onClick={() => {
                void handleDelete(member.id);
              }}
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                border: "1px solid #FECACA",
                background: BRAND.white,
                color: "#B91C1C",
                fontSize: 11,
                fontWeight: 800,
                cursor:
                  deletingMemberId === member.id
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  deletingMemberId === member.id
                    ? 0.6
                    : 1,
              }}
            >
              {deletingMemberId === member.id
                ? "Removing..."
                : "Remove"}
            </button>
          </div>
        </div>
      </article>
    );
  }

  /*
   * PAGE
   */

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
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        {/* PAGE INTRODUCTION */}

        <section style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
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
            Autivoya Family Organizer
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
            Support Team
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
            Keep doctors, specialists, therapists, school
            staff, advocates, insurance contacts, care
            coordinators, and other important people
            organized in one place.
          </p>
        </section>

        {/* AUTHENTICATION */}

        {!authReady ? (
          <section style={styles.card}>
            <div style={styles.body}>
              Loading Support Team...
            </div>
          </section>
        ) : null}

        {authReady && !currentUser ? (
          <section style={styles.card}>
            <h2 style={styles.heading}>
              Sign in to use Support Team
            </h2>

            <p style={styles.body}>
              Sign in to your Autivoya account to organize
              your child's Support Team contacts.
            </p>

            <Link
              href="/login"
              style={{
                ...styles.button,
                display: "inline-flex",
                marginTop: 12,
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
          </section>
        ) : null}

        {authReady && currentUser ? (
          <>
            {/* CHILD WORKSPACE SELECTOR */}

            <section style={styles.card}>
              {loadingWorkspaces ? (
                <div style={styles.body}>
                  Loading children...
                </div>
              ) : null}

              {!loadingWorkspaces && workspaceError ? (
                <Message type="error">
                  {workspaceError}
                </Message>
              ) : null}

              {!loadingWorkspaces &&
              !workspaceError &&
              workspaces.length > 0 ? (
                <FamilyOrganizerWorkspaceSelector
                  workspaces={workspaces}
                  selectedWorkspace={selectedWorkspace}
                  onSelect={selectWorkspace}
                />
              ) : null}

              {!loadingWorkspaces &&
              !workspaceError &&
              workspaces.length === 0 ? (
                <div style={styles.body}>
                  No child workspace is available yet.
                </div>
              ) : null}
            </section>

            {selectedWorkspace ? (
              <>
                {/* SELECTED CHILD BANNER */}

                <section
                  style={{
                    background:
                      "linear-gradient(135deg, #EAF6F5 0%, #F7FAFB 100%)",
                    border: "1px solid #CFE7E5",
                    borderRadius: 16,
                    padding: "20px 22px",
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: BRAND.navy,
                          fontSize: 16,
                          fontWeight: 800,
                        }}
                      >
                        {selectedWorkspace.childName}
                        &apos;s Support Team
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          color: BRAND.muted,
                          fontSize: 12,
                          lineHeight: 1.6,
                        }}
                      >
                        These are organizational contacts
                        only. Adding someone here does not
                        give them access to Autivoya or the
                        child's shared Family Organizer
                        workspace.
                      </div>
                    </div>

                    {selectedWorkspace.role ===
                    "family_member" ? (
                      <span
                        style={{
                          padding: "5px 9px",
                          borderRadius: 999,
                          background: BRAND.white,
                          border: "1px solid #CFE7E5",
                          color: BRAND.darkTeal,
                          fontSize: 9,
                          fontWeight: 850,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Shared Family Access
                      </span>
                    ) : null}
                  </div>
                </section>

                {/* ADD / EDIT CONTACT */}

                <section style={styles.card}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <h2 style={styles.heading}>
                      {editingMemberId
                        ? "Edit Support Team Member"
                        : "Add Support Team Member"}
                    </h2>

                    {editingMemberId ? (
                      <button
                        type="button"
                        onClick={resetForm}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: BRAND.darkTeal,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Cancel Edit
                      </button>
                    ) : null}
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    style={{ marginTop: 20 }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 14,
                      }}
                    >
                      <Field
                        label="Name"
                        value={form.name}
                        required
                        placeholder="Name"
                        onChange={(value) =>
                          updateForm("name", value)
                        }
                      />

                      <Field
                        label="Title / Role"
                        value={form.title}
                        placeholder="e.g. Speech Therapist"
                        onChange={(value) =>
                          updateForm("title", value)
                        }
                      />

                      <Field
                        label="Organization"
                        value={form.organization}
                        placeholder="Optional"
                        onChange={(value) =>
                          updateForm("organization", value)
                        }
                      />

                      <div>
                        <label style={labelStyle}>
                          Category
                        </label>

                        <select
                          value={form.category}
                          onChange={(event) =>
                            updateForm(
                              "category",
                              event.target
                                .value as FamilyOrganizerSupportTeamCategory
                            )
                          }
                          style={inputStyle}
                        >
                          {SUPPORT_TEAM_CATEGORIES.map(
                            (category) => (
                              <option
                                key={category.value}
                                value={category.value}
                              >
                                {category.label}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <Field
                        label="Phone"
                        value={form.phone}
                        type="tel"
                        placeholder="Optional"
                        onChange={(value) =>
                          updateForm("phone", value)
                        }
                      />

                      <Field
                        label="Email"
                        value={form.email}
                        type="email"
                        placeholder="Optional"
                        onChange={(value) =>
                          updateForm("email", value)
                        }
                      />
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <label style={labelStyle}>
                        Notes
                      </label>

                      <textarea
                        value={form.notes}
                        onChange={(event) =>
                          updateForm(
                            "notes",
                            event.target.value
                          )
                        }
                        rows={4}
                        placeholder="Optional notes"
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>

                    {formError ? (
                      <Message type="error">
                        {formError}
                      </Message>
                    ) : null}

                    {successMessage ? (
                      <Message type="success">
                        {successMessage}
                      </Message>
                    ) : null}

                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        ...styles.button,
                        marginTop: 18,
                        cursor: saving
                          ? "not-allowed"
                          : "pointer",
                        opacity: saving ? 0.65 : 1,
                      }}
                    >
                      {saving
                        ? "Saving..."
                        : editingMemberId
                          ? "Save Changes"
                          : "Add to Support Team"}
                    </button>
                  </form>
                </section>

                {/* CONTACT DIRECTORY */}

                <section style={styles.card}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <h2 style={styles.heading}>
                      Support Team
                    </h2>

                    {members.length > 0 ? (
                      <span
                        style={{
                          color: BRAND.muted,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {members.length}{" "}
                        {members.length === 1
                          ? "contact"
                          : "contacts"}
                      </span>
                    ) : null}
                  </div>

                  {loadingMembers ? (
                    <div
                      style={{
                        ...styles.body,
                        marginTop: 16,
                      }}
                    >
                      Loading Support Team...
                    </div>
                  ) : null}

                  {!loadingMembers &&
                  sortedMembers.length === 0 ? (
                    <div
                      style={{
                        marginTop: 16,
                        padding: 20,
                        borderRadius: 12,
                        background: BRAND.lightTeal,
                        color: BRAND.navy,
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      No Support Team contacts have been
                      added yet.
                    </div>
                  ) : null}

                  {!loadingMembers &&
                  sortedMembers.length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 12,
                        marginTop: 18,
                      }}
                    >
                      {sortedMembers.map(renderMember)}
                    </div>
                  ) : null}

                  {supportTeamError ? (
                    <Message type="error">
                      {supportTeamError}
                    </Message>
                  ) : null}
                </section>
              </>
            ) : null}

            {/* BACK NAVIGATION */}

            <div style={{ marginTop: 28 }}>
              <Link
                href="/family-organizer"
                style={styles.link}
              >
                ← Back to Family Organizer
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

/*
 * FIELD
 */

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: FieldProps) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        style={inputStyle}
      />
    </div>
  );
}

/*
 * MESSAGE
 */

function Message({
  type,
  children,
}: {
  type: "error" | "success";
  children: ReactNode;
}) {
  const isError = type === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      style={{
        marginTop: 14,
        padding: "11px 13px",
        borderRadius: 9,
        background: isError
          ? "#FEF2F2"
          : BRAND.lightTeal,
        border: isError
          ? "1px solid #FECACA"
          : "1px solid #C9E7E4",
        color: isError
          ? "#B91C1C"
          : BRAND.darkTeal,
        fontSize: 12,
      }}
    >
      {children}
    </div>
  );
}

/*
 * FIELD STYLES
 */

const labelStyle: CSSProperties = {
  display: "block",
  color: BRAND.navy,
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 7,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 9,
  border: `1px solid ${BRAND.border}`,
  background: BRAND.white,
  color: BRAND.darkNavy,
  fontSize: 14,
};
