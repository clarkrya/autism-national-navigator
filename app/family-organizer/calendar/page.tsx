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
  createFamilyOrganizerCalendarEvent,
  deleteFamilyOrganizerCalendarEvent,
  getFamilyOrganizerCalendarEvents,
  updateFamilyOrganizerCalendarEvent,
} from "../../../lib/familyOrganizer/familyOrganizerCalendarRepository";

import type {
  FamilyOrganizerCalendarEvent,
  FamilyOrganizerCalendarEventType,
} from "../../../lib/familyOrganizer/familyOrganizerTypes";

/*
 * ============================================================
 * SHARED CALENDAR
 * ============================================================
 *
 * Family Organizer shared calendar.
 *
 * Events belong to the canonical child workspace:
 *
 * users/{ownerUserId}/children/{childId}/calendarEvents
 *
 * Authorized Family Team members therefore see and update
 * the SAME calendar while using their own Myriad accounts.
 * ============================================================
 */

const EVENT_TYPES: {
  value: FamilyOrganizerCalendarEventType;
  label: string;
}[] = [
  {
    value: "appointment",
    label: "Appointment",
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
    value: "iep",
    label: "IEP",
  },
  {
    value: "evaluation",
    label: "Evaluation",
  },
  {
    value: "insurance",
    label: "Insurance",
  },
  {
    value: "deadline",
    label: "Deadline",
  },
  {
    value: "meeting",
    label: "Meeting",
  },
  {
    value: "other",
    label: "Other",
  },
];

/*
 * ============================================================
 * FORM STATE
 * ============================================================
 */

interface CalendarFormState {
  title: string;

  eventType:
    FamilyOrganizerCalendarEventType;

  date: string;

  startTime: string;

  endTime: string;

  allDay: boolean;

  location: string;

  notes: string;
}

function getEmptyForm():
  CalendarFormState {
  return {
    title: "",

    eventType:
      "appointment",

    date: "",

    startTime:
      "09:00",

    endTime:
      "10:00",

    allDay:
      false,

    location: "",

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

function getEventTypeLabel(
  eventType:
    FamilyOrganizerCalendarEventType
): string {
  return (
    EVENT_TYPES.find(
      (item) =>
        item.value ===
        eventType
    )?.label ??
    "Other"
  );
}

function formatEventDate(
  timestamp: number
): string {
  return new Intl.DateTimeFormat(
    undefined,
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(
    new Date(timestamp)
  );
}

function formatEventTime(
  event:
    FamilyOrganizerCalendarEvent
): string {
  if (event.allDay) {
    return "All day";
  }

  const formatter =
    new Intl.DateTimeFormat(
      undefined,
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );

  const start =
    formatter.format(
      new Date(
        event.startAt
      )
    );

  if (
    typeof event.endAt !==
    "number"
  ) {
    return start;
  }

  return `${start} – ${formatter.format(
    new Date(
      event.endAt
    )
  )}`;
}

function buildTimestamp(
  date: string,
  time: string,
  allDay: boolean
): number {
  if (!date) {
    return Number.NaN;
  }

  if (allDay) {
    const timestamp =
      new Date(
        `${date}T00:00:00`
      ).getTime();

    return timestamp;
  }

  if (!time) {
    return Number.NaN;
  }

  return new Date(
    `${date}T${time}:00`
  ).getTime();
}

function toDateInputValue(
  timestamp: number
): string {
  const date =
    new Date(timestamp);

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function toTimeInputValue(
  timestamp: number
): string {
  const date =
    new Date(timestamp);

  const hours =
    String(
      date.getHours()
    ).padStart(
      2,
      "0"
    );

  const minutes =
    String(
      date.getMinutes()
    ).padStart(
      2,
      "0"
    );

  return `${hours}:${minutes}`;
}

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function FamilyOrganizerCalendarPage() {
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
    events,
    setEvents,
  ] = useState<
    FamilyOrganizerCalendarEvent[]
  >([]);

  const [
    loadingEvents,
    setLoadingEvents,
  ] = useState(false);

  const [
    calendarError,
    setCalendarError,
  ] = useState("");

  const [
    form,
    setForm,
  ] =
    useState<CalendarFormState>(
      getEmptyForm()
    );

  const [
    editingEventId,
    setEditingEventId,
  ] = useState<
    string | null
  >(null);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingEventId,
    setDeletingEventId,
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
   * LOAD EVENTS
   * ==========================================================
   */

  const loadEvents =
    useCallback(
      async () => {
        if (
          !currentUser ||
          !selectedWorkspace
        ) {
          setEvents(
            []
          );

          return;
        }

        try {
          setLoadingEvents(
            true
          );

          setCalendarError(
            ""
          );

          const loadedEvents =
            await getFamilyOrganizerCalendarEvents(
              currentUser.uid,
              selectedWorkspace.ownerUserId,
              selectedWorkspace.childId
            );

          setEvents(
            loadedEvents
          );
        } catch (error) {
          console.error(
            "Unable to load Family Organizer calendar:",
            error
          );

          setEvents(
            []
          );

          setCalendarError(
            getErrorMessage(
              error,
              "We couldn't load the shared calendar right now."
            )
          );
        } finally {
          setLoadingEvents(
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
    void loadEvents();
  }, [
    loadEvents,
  ]);

  /*
   * ==========================================================
   * RESET FORM WHEN CHILD CHANGES
   * ==========================================================
   */

  useEffect(() => {
    setForm(
      getEmptyForm()
    );

    setEditingEventId(
      null
    );

    setFormError(
      ""
    );

    setSuccessMessage(
      ""
    );

    setCalendarError(
      ""
    );
  }, [
    selectedWorkspace
      ?.ownerUserId,
    selectedWorkspace
      ?.childId,
  ]);

  /*
   * ==========================================================
   * UPCOMING / PAST EVENTS
   * ==========================================================
   */

  const {
    upcomingEvents,
    pastEvents,
  } = useMemo(() => {
    const now =
      Date.now();

    const upcoming =
      events
        .filter(
          (event) =>
            (event.endAt ??
              event.startAt) >=
            now
        )
        .sort(
          (a, b) =>
            a.startAt -
            b.startAt
        );

    const past =
      events
        .filter(
          (event) =>
            (event.endAt ??
              event.startAt) <
            now
        )
        .sort(
          (a, b) =>
            b.startAt -
            a.startAt
        );

    return {
      upcomingEvents:
        upcoming,

      pastEvents:
        past,
    };
  }, [
    events,
  ]);

  /*
   * ==========================================================
   * FORM
   * ==========================================================
   */

  function updateForm<
    K extends keyof CalendarFormState
  >(
    key: K,
    value:
      CalendarFormState[K]
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

    setEditingEventId(
      null
    );

    setFormError(
      ""
    );
  }

  /*
   * ==========================================================
   * EDIT EVENT
   * ==========================================================
   */

  function beginEditing(
    event:
      FamilyOrganizerCalendarEvent
  ) {
    setEditingEventId(
      event.id
    );

    setForm({
      title:
        event.title,

      eventType:
        event.eventType,

      date:
        toDateInputValue(
          event.startAt
        ),

      startTime:
        event.allDay
          ? "09:00"
          : toTimeInputValue(
              event.startAt
            ),

      endTime:
        event.allDay
          ? "10:00"
          : typeof event.endAt ===
              "number"
            ? toTimeInputValue(
                event.endAt
              )
            : "",

      allDay:
        event.allDay ===
        true,

      location:
        event.location ??
        "",

      notes:
        event.notes ??
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
   * SAVE EVENT
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

    const title =
      form.title.trim();

    if (!title) {
      setFormError(
        "Enter an event title."
      );

      return;
    }

    if (!form.date) {
      setFormError(
        "Select an event date."
      );

      return;
    }

    const startAt =
      buildTimestamp(
        form.date,
        form.startTime,
        form.allDay
      );

    if (
      !Number.isFinite(
        startAt
      )
    ) {
      setFormError(
        "Enter a valid event date and time."
      );

      return;
    }

    let endAt:
      number | undefined;

    if (
      !form.allDay &&
      form.endTime
    ) {
      endAt =
        buildTimestamp(
          form.date,
          form.endTime,
          false
        );

      if (
        !Number.isFinite(
          endAt
        )
      ) {
        setFormError(
          "Enter a valid end time."
        );

        return;
      }

      if (
        endAt <
        startAt
      ) {
        setFormError(
          "End time cannot be before the start time."
        );

        return;
      }
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
        editingEventId
      ) {
        await updateFamilyOrganizerCalendarEvent(
          {
            currentUserId:
              currentUser.uid,

            ownerUserId:
              selectedWorkspace.ownerUserId,

            childId:
              selectedWorkspace.childId,

            eventId:
              editingEventId,

            title,

            eventType:
              form.eventType,

            startAt,

            ...(endAt !==
            undefined
              ? {
                  endAt,
                }
              : {}),

            allDay:
              form.allDay,

            location:
              form.location,

            notes:
              form.notes,
          }
        );

        setSuccessMessage(
          "Calendar event updated."
        );
      } else {
        await createFamilyOrganizerCalendarEvent(
          {
            currentUserId:
              currentUser.uid,

            ownerUserId:
              selectedWorkspace.ownerUserId,

            childId:
              selectedWorkspace.childId,

            title,

            eventType:
              form.eventType,

            startAt,

            ...(endAt !==
            undefined
              ? {
                  endAt,
                }
              : {}),

            allDay:
              form.allDay,

            location:
              form.location,

            notes:
              form.notes,
          }
        );

        setSuccessMessage(
          "Calendar event added."
        );
      }

      setForm(
        getEmptyForm()
      );

      setEditingEventId(
        null
      );

      await loadEvents();
    } catch (error) {
      console.error(
        "Unable to save calendar event:",
        error
      );

      setFormError(
        getErrorMessage(
          error,
          "We couldn't save this calendar event."
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
   * DELETE EVENT
   * ==========================================================
   */

  async function handleDelete(
    eventId: string
  ) {
    if (
      !currentUser ||
      !selectedWorkspace
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Remove this event from the shared calendar?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingEventId(
        eventId
      );

      setCalendarError(
        ""
      );

      await deleteFamilyOrganizerCalendarEvent(
        {
          currentUserId:
            currentUser.uid,

          ownerUserId:
            selectedWorkspace.ownerUserId,

          childId:
            selectedWorkspace.childId,

          eventId,
        }
      );

      if (
        editingEventId ===
        eventId
      ) {
        resetForm();
      }

      await loadEvents();
    } catch (error) {
      console.error(
        "Unable to delete calendar event:",
        error
      );

      setCalendarError(
        getErrorMessage(
          error,
          "We couldn't remove this calendar event."
        )
      );
    } finally {
      setDeletingEventId(
        ""
      );
    }
  }

  /*
   * ==========================================================
   * EVENT CARD
   * ==========================================================
   */

  function renderEvent(
    event:
      FamilyOrganizerCalendarEvent
  ) {
    return (
      <article
        key={event.id}
        style={{
          padding:
            "18px 0",
          borderBottom:
            "1px solid #E2E8F0",
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
                    "16px",
                  fontWeight: 800,
                }}
              >
                {event.title}
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
                  fontWeight: 800,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.04em",
                }}
              >
                {getEventTypeLabel(
                  event.eventType
                )}
              </span>
            </div>

            <div
              style={{
                marginTop:
                  "8px",
                color:
                  "#475569",
                fontSize:
                  "13px",
                fontWeight: 700,
              }}
            >
              {formatEventDate(
                event.startAt
              )}
              {" • "}
              {formatEventTime(
                event
              )}
            </div>

            {event.location ? (
              <div
                style={{
                  marginTop:
                    "6px",
                  color:
                    "#64748B",
                  fontSize:
                    "12px",
                  lineHeight: 1.5,
                }}
              >
                📍{" "}
                {event.location}
              </div>
            ) : null}

            {event.notes ? (
              <div
                style={{
                  marginTop:
                    "8px",
                  color:
                    "#64748B",
                  fontSize:
                    "12px",
                  lineHeight: 1.6,
                  whiteSpace:
                    "pre-wrap",
                }}
              >
                {event.notes}
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
                  event
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
                deletingEventId ===
                event.id
              }
              onClick={() => {
                void handleDelete(
                  event.id
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
                  deletingEventId ===
                  event.id
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  deletingEventId ===
                  event.id
                    ? 0.6
                    : 1,
              }}
            >
              {deletingEventId ===
              event.id
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
            Shared Calendar
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
            Keep appointments,
            therapy, school
            meetings, IEP dates,
            evaluations, deadlines,
            and other important
            events visible to the
            family.
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
            <div
              style={{
                color:
                  "#64748B",
                fontSize:
                  "13px",
                fontWeight: 700,
              }}
            >
              Loading shared
              calendar...
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
                "18px",
              padding:
                "26px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color:
                  "#0F172A",
                fontSize:
                  "20px",
                fontWeight: 800,
              }}
            >
              Sign in to use the
              Shared Calendar
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
                <div
                  style={{
                    color:
                      "#64748B",
                    fontSize:
                      "13px",
                  }}
                >
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
                    lineHeight: 1.6,
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
                      gap:
                        "14px",
                      alignItems:
                        "center",
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
                        &apos;s Shared
                        Calendar
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
                        Events added
                        here are shared
                        with authorized
                        Family Team
                        members.
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

                {/* ==========================================
                    ADD / EDIT EVENT
                =========================================== */}

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
                    boxShadow:
                      "0 8px 24px rgba(15, 23, 42, 0.04)",
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
                        color:
                          "#0F172A",
                        fontSize:
                          "20px",
                        fontWeight: 800,
                      }}
                    >
                      {editingEventId
                        ? "Edit Event"
                        : "Add Event"}
                    </h2>

                    {editingEventId ? (
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
                          fontSize:
                            "12px",
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
                      <div>
                        <label
                          htmlFor="calendar-title"
                          style={{
                            display:
                              "block",
                            color:
                              "#334155",
                            fontSize:
                              "12px",
                            fontWeight: 800,
                            marginBottom:
                              "7px",
                          }}
                        >
                          Event Title
                        </label>

                        <input
                          id="calendar-title"
                          type="text"
                          required
                          value={
                            form.title
                          }
                          onChange={(
                            event
                          ) =>
                            updateForm(
                              "title",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="e.g. Speech therapy"
                          style={{
                            width:
                              "100%",
                            boxSizing:
                              "border-box",
                            padding:
                              "10px 12px",
                            borderRadius:
                              "9px",
                            border:
                              "1px solid #CBD5E1",
                            fontSize:
                              "14px",
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="calendar-type"
                          style={{
                            display:
                              "block",
                            color:
                              "#334155",
                            fontSize:
                              "12px",
                            fontWeight: 800,
                            marginBottom:
                              "7px",
                          }}
                        >
                          Type
                        </label>

                        <select
                          id="calendar-type"
                          value={
                            form.eventType
                          }
                          onChange={(
                            event
                          ) =>
                            updateForm(
                              "eventType",
                              event
                                .target
                                .value as
                                FamilyOrganizerCalendarEventType
                            )
                          }
                          style={{
                            width:
                              "100%",
                            boxSizing:
                              "border-box",
                            padding:
                              "10px 12px",
                            borderRadius:
                              "9px",
                            border:
                              "1px solid #CBD5E1",
                            background:
                              "#FFFFFF",
                            fontSize:
                              "14px",
                          }}
                        >
                          {EVENT_TYPES.map(
                            (
                              item
                            ) => (
                              <option
                                key={
                                  item.value
                                }
                                value={
                                  item.value
                                }
                              >
                                {
                                  item.label
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="calendar-date"
                          style={{
                            display:
                              "block",
                            color:
                              "#334155",
                            fontSize:
                              "12px",
                            fontWeight: 800,
                            marginBottom:
                              "7px",
                          }}
                        >
                          Date
                        </label>

                        <input
                          id="calendar-date"
                          type="date"
                          required
                          value={
                            form.date
                          }
                          onChange={(
                            event
                          ) =>
                            updateForm(
                              "date",
                              event
                                .target
                                .value
                            )
                          }
                          style={{
                            width:
                              "100%",
                            boxSizing:
                              "border-box",
                            padding:
                              "10px 12px",
                            borderRadius:
                              "9px",
                            border:
                              "1px solid #CBD5E1",
                            fontSize:
                              "14px",
                          }}
                        />
                      </div>

                      {!form.allDay ? (
                        <>
                          <div>
                            <label
                              htmlFor="calendar-start"
                              style={{
                                display:
                                  "block",
                                color:
                                  "#334155",
                                fontSize:
                                  "12px",
                                fontWeight: 800,
                                marginBottom:
                                  "7px",
                              }}
                            >
                              Start Time
                            </label>

                            <input
                              id="calendar-start"
                              type="time"
                              required
                              value={
                                form.startTime
                              }
                              onChange={(
                                event
                              ) =>
                                updateForm(
                                  "startTime",
                                  event
                                    .target
                                    .value
                                )
                              }
                              style={{
                                width:
                                  "100%",
                                boxSizing:
                                  "border-box",
                                padding:
                                  "10px 12px",
                                borderRadius:
                                  "9px",
                                border:
                                  "1px solid #CBD5E1",
                                fontSize:
                                  "14px",
                              }}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="calendar-end"
                              style={{
                                display:
                                  "block",
                                color:
                                  "#334155",
                                fontSize:
                                  "12px",
                                fontWeight: 800,
                                marginBottom:
                                  "7px",
                              }}
                            >
                              End Time
                            </label>

                            <input
                              id="calendar-end"
                              type="time"
                              value={
                                form.endTime
                              }
                              onChange={(
                                event
                              ) =>
                                updateForm(
                                  "endTime",
                                  event
                                    .target
                                    .value
                                )
                              }
                              style={{
                                width:
                                  "100%",
                                boxSizing:
                                  "border-box",
                                padding:
                                  "10px 12px",
                                borderRadius:
                                  "9px",
                                border:
                                  "1px solid #CBD5E1",
                                fontSize:
                                  "14px",
                              }}
                            />
                          </div>
                        </>
                      ) : null}

                      <div>
                        <label
                          htmlFor="calendar-location"
                          style={{
                            display:
                              "block",
                            color:
                              "#334155",
                            fontSize:
                              "12px",
                            fontWeight: 800,
                            marginBottom:
                              "7px",
                          }}
                        >
                          Location
                        </label>

                        <input
                          id="calendar-location"
                          type="text"
                          value={
                            form.location
                          }
                          onChange={(
                            event
                          ) =>
                            updateForm(
                              "location",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Optional"
                          style={{
                            width:
                              "100%",
                            boxSizing:
                              "border-box",
                            padding:
                              "10px 12px",
                            borderRadius:
                              "9px",
                            border:
                              "1px solid #CBD5E1",
                            fontSize:
                              "14px",
                          }}
                        />
                      </div>
                    </div>

                    <label
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap:
                          "9px",
                        marginTop:
                          "16px",
                        color:
                          "#334155",
                        fontSize:
                          "13px",
                        fontWeight: 700,
                        cursor:
                          "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          form.allDay
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "allDay",
                            event
                              .target
                              .checked
                          )
                        }
                      />

                      All-day event
                    </label>

                    <div
                      style={{
                        marginTop:
                          "16px",
                      }}
                    >
                      <label
                        htmlFor="calendar-notes"
                        style={{
                          display:
                            "block",
                          color:
                            "#334155",
                          fontSize:
                            "12px",
                          fontWeight: 800,
                          marginBottom:
                            "7px",
                        }}
                      >
                        Notes
                      </label>

                      <textarea
                        id="calendar-notes"
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
                        placeholder="Optional details or reminders"
                        rows={4}
                        style={{
                          width:
                            "100%",
                          boxSizing:
                            "border-box",
                          padding:
                            "10px 12px",
                          borderRadius:
                            "9px",
                          border:
                            "1px solid #CBD5E1",
                          fontSize:
                            "14px",
                          lineHeight: 1.6,
                          resize:
                            "vertical",
                          fontFamily:
                            "inherit",
                        }}
                      />
                    </div>

                    {formError ? (
                      <div
                        style={{
                          marginTop:
                            "14px",
                          padding:
                            "11px 13px",
                          borderRadius:
                            "9px",
                          background:
                            "#FEF2F2",
                          border:
                            "1px solid #FECACA",
                          color:
                            "#B91C1C",
                          fontSize:
                            "12px",
                        }}
                      >
                        {formError}
                      </div>
                    ) : null}

                    {successMessage ? (
                      <div
                        style={{
                          marginTop:
                            "14px",
                          padding:
                            "11px 13px",
                          borderRadius:
                            "9px",
                          background:
                            "#F0FDF4",
                          border:
                            "1px solid #BBF7D0",
                          color:
                            "#166534",
                          fontSize:
                            "12px",
                        }}
                      >
                        {successMessage}
                      </div>
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
                        : editingEventId
                          ? "Save Changes"
                          : "Add to Calendar"}
                    </button>
                  </form>
                </section>

                {/* ==========================================
                    UPCOMING EVENTS
                =========================================== */}

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
                  <h2
                    style={{
                      margin: 0,
                      color:
                        "#0F172A",
                      fontSize:
                        "20px",
                      fontWeight: 800,
                    }}
                  >
                    Upcoming
                  </h2>

                  {loadingEvents ? (
                    <div
                      style={{
                        marginTop:
                          "14px",
                        color:
                          "#64748B",
                        fontSize:
                          "12px",
                      }}
                    >
                      Loading events...
                    </div>
                  ) : null}

                  {!loadingEvents &&
                  upcomingEvents.length ===
                    0 ? (
                    <div
                      style={{
                        marginTop:
                          "14px",
                        padding:
                          "18px",
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
                      No upcoming
                      events yet. Add
                      an appointment,
                      meeting,
                      deadline, or
                      other important
                      date above.
                    </div>
                  ) : null}

                  {!loadingEvents
                    ? upcomingEvents.map(
                        renderEvent
                      )
                    : null}

                  {calendarError ? (
                    <div
                      style={{
                        marginTop:
                          "14px",
                        padding:
                          "11px 13px",
                        borderRadius:
                          "9px",
                        background:
                          "#FEF2F2",
                        border:
                          "1px solid #FECACA",
                        color:
                          "#B91C1C",
                        fontSize:
                          "12px",
                      }}
                    >
                      {calendarError}
                    </div>
                  ) : null}
                </section>

                {/* ==========================================
                    PAST EVENTS
                =========================================== */}

                {pastEvents.length >
                0 ? (
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
                    <h2
                      style={{
                        margin: 0,
                        color:
                          "#0F172A",
                        fontSize:
                          "18px",
                        fontWeight: 800,
                      }}
                    >
                      Past Events
                    </h2>

                    {pastEvents.map(
                      renderEvent
                    )}
                  </section>
                ) : null}
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