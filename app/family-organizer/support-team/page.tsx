"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
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
 * SUPPORT TEAM
 * ============================================================
 *
 * Organizes professionals and other contacts supporting the
 * selected child.
 *
 * Support Team contacts do NOT automatically receive access
 * to Myriad or the child's shared Family Organizer workspace.
 * ============================================================
 */

const SUPPORT_TEAM_CATEGORIES: {
  value: FamilyOrganizerSupportTeamCategory;
  label: string;
}[] = [
  {
    value: "medical",
    label: "Medical",
  },
  {
    value: "therapy",
    label: "Therapy",
  },
  {
    value: "school",
    label: "School",
  },
  {
    value: "insurance",
    label: "Insurance",
  },
  {
    value: "advocacy",
    label: "Advocacy",
  },
  {
    value: "care_coordination",
    label: "Care Coordination",
  },
  {
    value: "community",
    label: "Community",
  },
  {
    value: "other",
    label: "Other",
  },
];

/*
 * ============================================================
 * FORM
 * ============================================================
 */

interface SupportTeamFormState {
  name: string;

  title: string;

  organization: string;

  category:
    FamilyOrganizerSupportTeamCategory;

  email: string;

  phone: string;

  notes: string;
}

function getEmptyForm():
  SupportTeamFormState {
  return {
    name: "",

    title: "",

    organization: "",

    category:
      "medical",

    email: "",

    phone: "",

    notes: "",
  };
}

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

function getCategoryLabel(
  category:
    FamilyOrganizerSupportTeamCategory
): string {
  return (
    SUPPORT_TEAM_CATEGORIES.find(
      (item) =>
        item.value ===
        category
    )?.label ??
    "Other"
  );
}

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function FamilyOrganizerSupportTeamPage() {
  const {
    currentUser,
    authReady,
    loading:
      loadingWorkspaces,
    error:
      workspaceError,
    workspaces,
    selectedWorkspace,
    selectWorkspace,
  } =
    useFamilyOrganizerWorkspace();

  const [
    members,
    setMembers,
  ] = useState<
    FamilyOrganizerSupportTeamMember[]
  >([]);

  const [
    loadingMembers,
    setLoadingMembers,
  ] = useState(false);

  const [
    supportTeamError,
    setSupportTeamError,
  ] = useState("");

  const [
    form,
    setForm,
  ] =
    useState<SupportTeamFormState>(
      getEmptyForm()
    );

  const [
    editingMemberId,
    setEditingMemberId,
  ] = useState<
    string | null
  >(null);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingMemberId,
    setDeletingMemberId,
  ] = useState("");

  const [
    formError,
    setFormError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  /*
   * ==========================================================
   * LOAD SUPPORT TEAM
   * ==========================================================
   */

  const loadMembers =
    useCallback(
      async () => {
        if (
          !currentUser ||
          !selectedWorkspace
        ) {
          setMembers(
            []
          );

          return;
        }

        try {
          setLoadingMembers(
            true
          );

          setSupportTeamError(
            ""
          );

          const loadedMembers =
            await getFamilyOrganizerSupportTeam(
              currentUser.uid,
              selectedWorkspace.ownerUserId,
              selectedWorkspace.childId
            );

          setMembers(
            loadedMembers
          );
        } catch (error) {
          console.error(
            "Unable to load Family Organizer Support Team:",
            error
          );

          setMembers(
            []
          );

          setSupportTeamError(
            getErrorMessage(
              error,
              "We couldn't load the Support Team right now."
            )
          );
        } finally {
          setLoadingMembers(
            false
          );
        }
      },
      [
        currentUser,
        selectedWorkspace,
      ]
    );

  useEffect(() => {
    void loadMembers();
  }, [
    loadMembers,
  ]);

  /*
   * ==========================================================
   * RESET WHEN WORKSPACE CHANGES
   * ==========================================================
   */

  useEffect(() => {
    setForm(
      getEmptyForm()
    );

    setEditingMemberId(
      null
    );

    setFormError(
      ""
    );

    setSuccessMessage(
      ""
    );

    setSupportTeamError(
      ""
    );
  }, [
    selectedWorkspace?.ownerUserId,
    selectedWorkspace?.childId,
  ]);

  /*
   * ==========================================================
   * SORT MEMBERS
   * ==========================================================
   */

  const sortedMembers =
    useMemo(
      () =>
        [...members].sort(
          (a, b) => {
            const categoryCompare =
              getCategoryLabel(
                a.category
              ).localeCompare(
                getCategoryLabel(
                  b.category
                )
              );

            if (
              categoryCompare !==
              0
            ) {
              return categoryCompare;
            }

            return a.name.localeCompare(
              b.name
            );
          }
        ),
      [members]
    );

  /*
   * ==========================================================
   * UPDATE FORM
   * ==========================================================
   */

  function updateForm<
    K extends keyof SupportTeamFormState
  >(
    key: K,
    value:
      SupportTeamFormState[K]
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]:
          value,
      })
    );

    setFormError(
      ""
    );

    setSuccessMessage(
      ""
    );
  }

  function resetForm() {
    setForm(
      getEmptyForm()
    );

    setEditingMemberId(
      null
    );

    setFormError(
      ""
    );
  }

  /*
   * ==========================================================
   * EDIT
   * ==========================================================
   */

  function beginEditing(
    member:
      FamilyOrganizerSupportTeamMember
  ) {
    setEditingMemberId(
      member.id
    );

    setForm({
      name:
        member.name,

      title:
        member.title ??
        "",

      organization:
        member.organization ??
        "",

      category:
        member.category,

      email:
        member.email ??
        "",

      phone:
        member.phone ??
        "",

      notes:
        member.notes ??
        "",
    });

    setFormError(
      ""
    );

    setSuccessMessage(
      ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * ==========================================================
   * SAVE
   * ==========================================================
   */

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !currentUser ||
      !selectedWorkspace
    ) {
      return;
    }

    const name =
      form.name.trim();

    if (!name) {
      setFormError(
        "Enter the Support Team member's name."
      );

      return;
    }

    try {
      setSaving(
        true
      );

      setFormError(
        ""
      );

      setSuccessMessage(
        ""
      );

      if (
        editingMemberId
      ) {
        await updateFamilyOrganizerSupportTeamMember(
          {
            currentUserId:
              currentUser.uid,

            ownerUserId:
              selectedWorkspace.ownerUserId,

            childId:
              selectedWorkspace.childId,

            memberId:
              editingMemberId,

            name,

            title:
              form.title,

            organization:
              form.organization,

            category:
              form.category,

            email:
              form.email,

            phone:
              form.phone,

            notes:
              form.notes,
          }
        );

        setSuccessMessage(
          "Support Team member updated."
        );
      } else {
        await createFamilyOrganizerSupportTeamMember(
          {
            currentUserId:
              currentUser.uid,

            ownerUserId:
              selectedWorkspace.ownerUserId,

            childId:
              selectedWorkspace.childId,

            name,

            title:
              form.title,

            organization:
              form.organization,

            category:
              form.category,

            email:
              form.email,

            phone:
              form.phone,

            notes:
              form.notes,
          }
        );

        setSuccessMessage(
          "Support Team member added."
        );
      }

      setForm(
        getEmptyForm()
      );

      setEditingMemberId(
        null
      );

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
      setSaving(
        false
      );
    }
  }

  /*
   * ==========================================================
   * DELETE
   * ==========================================================
   */

  async function handleDelete(
    memberId: string
  ) {
    if (
      !currentUser ||
      !selectedWorkspace
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Remove this person from the Support Team?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingMemberId(
        memberId
      );

      setSupportTeamError(
        ""
      );

      await deleteFamilyOrganizerSupportTeamMember(
        {
          currentUserId:
            currentUser.uid,

          ownerUserId:
            selectedWorkspace.ownerUserId,

          childId:
            selectedWorkspace.childId,

          memberId,
        }
      );

      if (
        editingMemberId ===
        memberId
      ) {
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
      setDeletingMemberId(
        ""
      );
    }
  }

  /*
   * ==========================================================
   * MEMBER CARD
   * ==========================================================
   */

  function renderMember(
    member:
      FamilyOrganizerSupportTeamMember
  ) {
    return (
      <article
        key={member.id}
        style={{
          padding:
            "20px",
          border:
            "1px solid #E2E8F0",
          borderRadius:
            "14px",
          background:
            "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: "18px",
            flexWrap:
              "wrap",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth:
                "220px",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "8px",
                flexWrap:
                  "wrap",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color:
                    "#0F172A",
                  fontSize:
                    "17px",
                  fontWeight: 800,
                }}
              >
                {member.name}
              </h3>

              <span
                style={{
                  padding:
                    "4px 8px",
                  borderRadius:
                    "999px",
                  background:
                    "#EFF6FF",
                  color:
                    "#1D4ED8",
                  fontSize:
                    "9px",
                  fontWeight: 850,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.04em",
                }}
              >
                {getCategoryLabel(
                  member.category
                )}
              </span>
            </div>

            {member.title ||
            member.organization ? (
              <div
                style={{
                  marginTop:
                    "7px",
                  color:
                    "#475569",
                  fontSize:
                    "13px",
                  fontWeight: 650,
                }}
              >
                {member.title}

                {member.title &&
                member.organization
                  ? " • "
                  : ""}

                {member.organization}
              </div>
            ) : null}

            {member.phone ? (
              <div
                style={{
                  marginTop:
                    "9px",
                  color:
                    "#64748B",
                  fontSize:
                    "12px",
                }}
              >
                Phone:{" "}
                <a
                  href={`tel:${member.phone}`}
                  style={{
                    color:
                      "#2563EB",
                    textDecoration:
                      "none",
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
                  marginTop:
                    "6px",
                  color:
                    "#64748B",
                  fontSize:
                    "12px",
                }}
              >
                Email:{" "}
                <a
                  href={`mailto:${member.email}`}
                  style={{
                    color:
                      "#2563EB",
                    textDecoration:
                      "none",
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
                  marginTop:
                    "10px",
                  color:
                    "#64748B",
                  fontSize:
                    "12px",
                  lineHeight: 1.6,
                  whiteSpace:
                    "pre-wrap",
                }}
              >
                {member.notes}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() =>
                beginEditing(
                  member
                )
              }
              style={{
                padding:
                  "7px 10px",
                borderRadius:
                  "8px",
                border:
                  "1px solid #CBD5E1",
                background:
                  "#FFFFFF",
                color:
                  "#334155",
                fontSize:
                  "11px",
                fontWeight: 800,
                cursor:
                  "pointer",
              }}
            >
              Edit
            </button>

            <button
              type="button"
              disabled={
                deletingMemberId ===
                member.id
              }
              onClick={() => {
                void handleDelete(
                  member.id
                );
              }}
              style={{
                padding:
                  "7px 10px",
                borderRadius:
                  "8px",
                border:
                  "1px solid #FECACA",
                background:
                  "#FFFFFF",
                color:
                  "#B91C1C",
                fontSize:
                  "11px",
                fontWeight: 800,
                cursor:
                  deletingMemberId ===
                  member.id
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  deletingMemberId ===
                  member.id
                    ? 0.6
                    : 1,
              }}
            >
              {deletingMemberId ===
              member.id
                ? "Removing..."
                : "Remove"}
            </button>
          </div>
        </div>
      </article>
    );
  }

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <main
      style={{
        minHeight:
          "calc(100vh - 72px)",
        background:
          "#F8FAFC",
        padding:
          "48px 24px 72px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth:
            "1000px",
          margin:
            "0 auto",
        }}
      >
        <section
          style={{
            marginBottom:
              "28px",
          }}
        >
          <div
            style={{
              display:
                "inline-flex",
              padding:
                "6px 10px",
              borderRadius:
                "999px",
              background:
                "#DBEAFE",
              color:
                "#1D4ED8",
              fontSize:
                "11px",
              fontWeight: 800,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.05em",
              marginBottom:
                "16px",
            }}
          >
            Family Organizer
          </div>

          <h1
            style={{
              margin: 0,
              color:
                "#0F172A",
              fontSize:
                "36px",
              lineHeight: 1.15,
              fontWeight: 850,
            }}
          >
            Support Team
          </h1>

          <p
            style={{
              margin:
                "12px 0 0",
              maxWidth:
                "760px",
              color:
                "#64748B",
              fontSize:
                "16px",
              lineHeight: 1.7,
            }}
          >
            Keep doctors,
            specialists,
            therapists, school
            staff, advocates,
            insurance contacts,
            care coordinators,
            and other important
            people organized in
            one place.
          </p>
        </section>

        {!authReady ? (
          <section
            style={{
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              borderRadius:
                "18px",
              padding:
                "26px",
            }}
          >
            Loading Support Team...
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
                "18px",
              padding:
                "26px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize:
                  "20px",
              }}
            >
              Sign in to use
              Support Team
            </h2>

            <Link
              href="/login"
              style={{
                display:
                  "inline-flex",
                marginTop:
                  "16px",
                padding:
                  "10px 15px",
                borderRadius:
                  "9px",
                background:
                  "#2563EB",
                color:
                  "#FFFFFF",
                fontSize:
                  "12px",
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
          <>
            <section
              style={{
                background:
                  "#FFFFFF",
                border:
                  "1px solid #E2E8F0",
                borderRadius:
                  "16px",
                padding:
                  "20px",
                marginBottom:
                  "18px",
              }}
            >
              {loadingWorkspaces ? (
                <div>
                  Loading children...
                </div>
              ) : null}

              {!loadingWorkspaces &&
              workspaceError ? (
                <div
                  style={{
                    color:
                      "#B91C1C",
                    fontSize:
                      "12px",
                  }}
                >
                  {workspaceError}
                </div>
              ) : null}

              {!loadingWorkspaces &&
              !workspaceError &&
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

              {!loadingWorkspaces &&
              !workspaceError &&
              workspaces.length ===
                0 ? (
                <div
                  style={{
                    color:
                      "#64748B",
                    fontSize:
                      "13px",
                  }}
                >
                  No child workspace
                  is available yet.
                </div>
              ) : null}
            </section>

            {selectedWorkspace ? (
              <>
                <section
                  style={{
                    background:
                      "linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)",
                    border:
                      "1px solid #DBEAFE",
                    borderRadius:
                      "16px",
                    padding:
                      "20px 22px",
                    marginBottom:
                      "18px",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap:
                        "14px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color:
                            "#1E3A8A",
                          fontSize:
                            "16px",
                          fontWeight: 800,
                        }}
                      >
                        {
                          selectedWorkspace.childName
                        }
                        &apos;s Support
                        Team
                      </div>

                      <div
                        style={{
                          marginTop:
                            "5px",
                          color:
                            "#64748B",
                          fontSize:
                            "12px",
                          lineHeight: 1.6,
                        }}
                      >
                        These are
                        organizational
                        contacts only.
                        Adding someone
                        here does not
                        give them access
                        to Myriad.
                      </div>
                    </div>

                    {selectedWorkspace.role ===
                    "family_member" ? (
                      <span
                        style={{
                          padding:
                            "5px 9px",
                          borderRadius:
                            "999px",
                          background:
                            "#FFFFFF",
                          border:
                            "1px solid #DDD6FE",
                          color:
                            "#6D28D9",
                          fontSize:
                            "9px",
                          fontWeight: 850,
                          textTransform:
                            "uppercase",
                          letterSpacing:
                            "0.05em",
                        }}
                      >
                        Shared Family
                        Access
                      </span>
                    ) : null}
                  </div>
                </section>

                <section
                  style={{
                    background:
                      "#FFFFFF",
                    border:
                      "1px solid #E2E8F0",
                    borderRadius:
                      "18px",
                    padding:
                      "26px",
                    marginBottom:
                      "18px",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap:
                        "12px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize:
                          "20px",
                        color:
                          "#0F172A",
                      }}
                    >
                      {editingMemberId
                        ? "Edit Support Team Member"
                        : "Add Support Team Member"}
                    </h2>

                    {editingMemberId ? (
                      <button
                        type="button"
                        onClick={
                          resetForm
                        }
                        style={{
                          border:
                            "none",
                          background:
                            "transparent",
                          color:
                            "#2563EB",
                          fontWeight: 800,
                          cursor:
                            "pointer",
                        }}
                      >
                        Cancel Edit
                      </button>
                    ) : null}
                  </div>

                  <form
                    onSubmit={
                      handleSubmit
                    }
                    style={{
                      marginTop:
                        "20px",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap:
                          "14px",
                      }}
                    >
                      <Field
                        label="Name"
                        value={
                          form.name
                        }
                        required
                        placeholder="Name"
                        onChange={(
                          value
                        ) =>
                          updateForm(
                            "name",
                            value
                          )
                        }
                      />

                      <Field
                        label="Title / Role"
                        value={
                          form.title
                        }
                        placeholder="e.g. Speech Therapist"
                        onChange={(
                          value
                        ) =>
                          updateForm(
                            "title",
                            value
                          )
                        }
                      />

                      <Field
                        label="Organization"
                        value={
                          form.organization
                        }
                        placeholder="Optional"
                        onChange={(
                          value
                        ) =>
                          updateForm(
                            "organization",
                            value
                          )
                        }
                      />

                      <div>
                        <label
                          style={
                            labelStyle
                          }
                        >
                          Category
                        </label>

                        <select
                          value={
                            form.category
                          }
                          onChange={(
                            event
                          ) =>
                            updateForm(
                              "category",
                              event
                                .target
                                .value as
                                FamilyOrganizerSupportTeamCategory
                            )
                          }
                          style={
                            inputStyle
                          }
                        >
                          {SUPPORT_TEAM_CATEGORIES.map(
                            (
                              category
                            ) => (
                              <option
                                key={
                                  category.value
                                }
                                value={
                                  category.value
                                }
                              >
                                {
                                  category.label
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <Field
                        label="Phone"
                        value={
                          form.phone
                        }
                        type="tel"
                        placeholder="Optional"
                        onChange={(
                          value
                        ) =>
                          updateForm(
                            "phone",
                            value
                          )
                        }
                      />

                      <Field
                        label="Email"
                        value={
                          form.email
                        }
                        type="email"
                        placeholder="Optional"
                        onChange={(
                          value
                        ) =>
                          updateForm(
                            "email",
                            value
                          )
                        }
                      />
                    </div>

                    <div
                      style={{
                        marginTop:
                          "16px",
                      }}
                    >
                      <label
                        style={
                          labelStyle
                        }
                      >
                        Notes
                      </label>

                      <textarea
                        value={
                          form.notes
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "notes",
                            event
                              .target
                              .value
                          )
                        }
                        rows={4}
                        placeholder="Optional notes"
                        style={{
                          ...inputStyle,
                          resize:
                            "vertical",
                          fontFamily:
                            "inherit",
                        }}
                      />
                    </div>

                    {formError ? (
                      <Message
                        type="error"
                      >
                        {formError}
                      </Message>
                    ) : null}

                    {successMessage ? (
                      <Message
                        type="success"
                      >
                        {
                          successMessage
                        }
                      </Message>
                    ) : null}

                    <button
                      type="submit"
                      disabled={
                        saving
                      }
                      style={{
                        marginTop:
                          "18px",
                        padding:
                          "11px 17px",
                        border:
                          "none",
                        borderRadius:
                          "10px",
                        background:
                          "#2563EB",
                        color:
                          "#FFFFFF",
                        fontSize:
                          "13px",
                        fontWeight: 800,
                        cursor:
                          saving
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          saving
                            ? 0.65
                            : 1,
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

                <section
                  style={{
                    background:
                      "#FFFFFF",
                    border:
                      "1px solid #E2E8F0",
                    borderRadius:
                      "18px",
                    padding:
                      "26px",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap:
                        "12px",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        color:
                          "#0F172A",
                        fontSize:
                          "20px",
                      }}
                    >
                      Support Team
                    </h2>

                    {members.length >
                    0 ? (
                      <span
                        style={{
                          color:
                            "#64748B",
                          fontSize:
                            "12px",
                          fontWeight: 700,
                        }}
                      >
                        {
                          members.length
                        }{" "}
                        {members.length ===
                        1
                          ? "contact"
                          : "contacts"}
                      </span>
                    ) : null}
                  </div>

                  {loadingMembers ? (
                    <div
                      style={{
                        marginTop:
                          "16px",
                        color:
                          "#64748B",
                        fontSize:
                          "12px",
                      }}
                    >
                      Loading Support
                      Team...
                    </div>
                  ) : null}

                  {!loadingMembers &&
                  sortedMembers.length ===
                    0 ? (
                    <div
                      style={{
                        marginTop:
                          "16px",
                        padding:
                          "20px",
                        borderRadius:
                          "12px",
                        background:
                          "#F8FAFC",
                        color:
                          "#64748B",
                        fontSize:
                          "12px",
                        lineHeight: 1.6,
                      }}
                    >
                      No Support Team
                      contacts have
                      been added yet.
                    </div>
                  ) : null}

                  {!loadingMembers &&
                  sortedMembers.length >
                    0 ? (
                    <div
                      style={{
                        display:
                          "grid",
                        gap:
                          "12px",
                        marginTop:
                          "18px",
                      }}
                    >
                      {sortedMembers.map(
                        renderMember
                      )}
                    </div>
                  ) : null}

                  {supportTeamError ? (
                    <Message
                      type="error"
                    >
                      {
                        supportTeamError
                      }
                    </Message>
                  ) : null}
                </section>
              </>
            ) : null}

            <div
              style={{
                marginTop:
                  "28px",
              }}
            >
              <Link
                href="/family-organizer"
                style={{
                  color:
                    "#2563EB",
                  fontSize:
                    "14px",
                  fontWeight: 750,
                  textDecoration:
                    "none",
                }}
              >
                ← Back to Family
                Organizer
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

/*
 * ============================================================
 * FIELD
 * ============================================================
 */

interface FieldProps {
  label: string;

  value: string;

  onChange:
    (value: string) => void;

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
      <label
        style={
          labelStyle
        }
      >
        {label}
      </label>

      <input
        type={type}
        value={value}
        required={
          required
        }
        placeholder={
          placeholder
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        style={
          inputStyle
        }
      />
    </div>
  );
}

/*
 * ============================================================
 * MESSAGE
 * ============================================================
 */

function Message({
  type,
  children,
}: {
  type:
    | "error"
    | "success";

  children:
    React.ReactNode;
}) {
  const isError =
    type === "error";

  return (
    <div
      style={{
        marginTop:
          "14px",
        padding:
          "11px 13px",
        borderRadius:
          "9px",
        background:
          isError
            ? "#FEF2F2"
            : "#F0FDF4",
        border:
          isError
            ? "1px solid #FECACA"
            : "1px solid #BBF7D0",
        color:
          isError
            ? "#B91C1C"
            : "#166534",
        fontSize:
          "12px",
      }}
    >
      {children}
    </div>
  );
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const labelStyle:
  React.CSSProperties = {
    display: "block",
    color: "#334155",
    fontSize: "12px",
    fontWeight: 800,
    marginBottom: "7px",
  };

const inputStyle:
  React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: "9px",
    border:
      "1px solid #CBD5E1",
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: "14px",
  };