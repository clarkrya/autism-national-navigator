
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CSSProperties, FormEvent } from "react";

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
 * AUTIVOYA — SHARED CALENDAR
 *
 * Events remain in the canonical child workspace:
 * users/{ownerUserId}/children/{childId}/calendarEvents
 *
 * Authorized Family Team members access the same calendar.
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

const EVENT_TYPES: {
  value: FamilyOrganizerCalendarEventType;
  label: string;
}[] = [
  { value: "appointment", label: "Appointment" },
  { value: "therapy", label: "Therapy" },
  { value: "school", label: "School" },
  { value: "iep", label: "IEP" },
  { value: "evaluation", label: "Evaluation" },
  { value: "insurance", label: "Insurance" },
  { value: "deadline", label: "Deadline" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

interface CalendarFormState {
  title: string;
  eventType: FamilyOrganizerCalendarEventType;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  notes: string;
}

function getEmptyForm(): CalendarFormState {
  return {
    title: "",
    eventType: "appointment",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    location: "",
    notes: "",
  };
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function getEventTypeLabel(
  eventType: FamilyOrganizerCalendarEventType
): string {
  return (
    EVENT_TYPES.find((item) => item.value === eventType)
      ?.label ?? "Other"
  );
}

function formatEventDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatEventTime(
  event: FamilyOrganizerCalendarEvent
): string {
  if (event.allDay) {
    return "All day";
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const start = formatter.format(new Date(event.startAt));

  if (typeof event.endAt !== "number") {
    return start;
  }

  return `${start} – ${formatter.format(
    new Date(event.endAt)
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
    return new Date(`${date}T00:00:00`).getTime();
  }

  if (!time) {
    return Number.NaN;
  }

  return new Date(`${date}T${time}:00`).getTime();
}

function toDateInputValue(timestamp: number): string {
  const date = new Date(timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toTimeInputValue(timestamp: number): string {
  const date = new Date(timestamp);

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

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
  label: {
    display: "block",
    color: BRAND.navy,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 7,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 9,
    border: `1px solid ${BRAND.border}`,
    background: BRAND.white,
    color: BRAND.darkNavy,
    fontSize: 14,
    fontFamily: "inherit",
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
  link: {
    color: BRAND.darkTeal,
    fontSize: 13,
    fontWeight: 800,
    textDecoration: "none",
  },
  body: {
    color: BRAND.muted,
    fontSize: 13,
    lineHeight: 1.65,
  },
  error: {
    marginTop: 14,
    padding: "11px 13px",
    borderRadius: 9,
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#B91C1C",
    fontSize: 12,
  },
  success: {
    marginTop: 14,
    padding: "11px 13px",
    borderRadius: 9,
    background: BRAND.lightTeal,
    border: "1px solid #C9E7E4",
    color: BRAND.darkTeal,
    fontSize: 12,
  },
};

export default function FamilyOrganizerCalendarPage() {
  const {
    currentUser,
    authReady,
    loading: loadingWorkspaces,
    error: workspaceError,
    workspaces,
    selectedWorkspace,
    selectWorkspace,
  } = useFamilyOrganizerWorkspace();

  const [events, setEvents] = useState<
    FamilyOrganizerCalendarEvent[]
  >([]);

  const [loadingEvents, setLoadingEvents] = useState(false);
  const [calendarError, setCalendarError] = useState("");

  const [form, setForm] = useState<CalendarFormState>(
    getEmptyForm()
  );

  const [editingEventId, setEditingEventId] = useState<
    string | null
  >(null);

  const [saving, setSaving] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /*
   * LOAD SHARED CALENDAR EVENTS
   */

  const loadEvents = useCallback(async () => {
    if (!currentUser || !selectedWorkspace) {
      setEvents([]);
      return;
    }

    try {
      setLoadingEvents(true);
      setCalendarError("");

      const loadedEvents =
        await getFamilyOrganizerCalendarEvents(
          currentUser.uid,
          selectedWorkspace.ownerUserId,
          selectedWorkspace.childId
        );

      setEvents(loadedEvents);
    } catch (error) {
      console.error(
        "Unable to load Family Organizer calendar:",
        error
      );

      setEvents([]);

      setCalendarError(
        getErrorMessage(
          error,
          "We couldn't load the shared calendar right now."
        )
      );
    } finally {
      setLoadingEvents(false);
    }
  }, [currentUser, selectedWorkspace]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  /*
   * RESET FORM WHEN CHILD WORKSPACE CHANGES
   */

  useEffect(() => {
    setForm(getEmptyForm());
    setEditingEventId(null);
    setFormError("");
    setSuccessMessage("");
    setCalendarError("");
  }, [
    selectedWorkspace?.ownerUserId,
    selectedWorkspace?.childId,
  ]);

  /*
   * UPCOMING AND PAST EVENTS
   */

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = Date.now();

    const upcoming = events
      .filter(
        (event) =>
          (event.endAt ?? event.startAt) >= now
      )
      .sort((a, b) => a.startAt - b.startAt);

    const past = events
      .filter(
        (event) =>
          (event.endAt ?? event.startAt) < now
      )
      .sort((a, b) => b.startAt - a.startAt);

    return {
      upcomingEvents: upcoming,
      pastEvents: past,
    };
  }, [events]);

  /*
   * FORM HELPERS
   */

  function updateForm<K extends keyof CalendarFormState>(
    key: K,
    value: CalendarFormState[K]
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
    setEditingEventId(null);
    setFormError("");
  }

  /*
   * EDIT EXISTING EVENT
   */

  function beginEditing(
    event: FamilyOrganizerCalendarEvent
  ) {
    setEditingEventId(event.id);

    setForm({
      title: event.title,
      eventType: event.eventType,
      date: toDateInputValue(event.startAt),
      startTime: event.allDay
        ? "09:00"
        : toTimeInputValue(event.startAt),
      endTime: event.allDay
        ? "10:00"
        : typeof event.endAt === "number"
          ? toTimeInputValue(event.endAt)
          : "",
      allDay: event.allDay === true,
      location: event.location ?? "",
      notes: event.notes ?? "",
    });

    setFormError("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * CREATE OR UPDATE EVENT
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!currentUser || !selectedWorkspace) {
      return;
    }

    const title = form.title.trim();

    if (!title) {
      setFormError("Enter an event title.");
      return;
    }

    if (!form.date) {
      setFormError("Select an event date.");
      return;
    }

    const startAt = buildTimestamp(
      form.date,
      form.startTime,
      form.allDay
    );

    if (!Number.isFinite(startAt)) {
      setFormError("Enter a valid event date and time.");
      return;
    }

    let endAt: number | undefined;

    if (!form.allDay && form.endTime) {
      endAt = buildTimestamp(
        form.date,
        form.endTime,
        false
      );

      if (!Number.isFinite(endAt)) {
        setFormError("Enter a valid end time.");
        return;
      }

      if (endAt < startAt) {
        setFormError(
          "End time cannot be before the start time."
        );
        return;
      }
    }

    try {
      setSaving(true);
      setFormError("");
      setSuccessMessage("");

      const eventData = {
        currentUserId: currentUser.uid,
        ownerUserId: selectedWorkspace.ownerUserId,
        childId: selectedWorkspace.childId,
        title,
        eventType: form.eventType,
        startAt,
        ...(endAt !== undefined ? { endAt } : {}),
        allDay: form.allDay,
        location: form.location,
        notes: form.notes,
      };

      if (editingEventId) {
        await updateFamilyOrganizerCalendarEvent({
          ...eventData,
          eventId: editingEventId,
        });

        setSuccessMessage("Calendar event updated.");
      } else {
        await createFamilyOrganizerCalendarEvent(eventData);

        setSuccessMessage("Calendar event added.");
      }

      setForm(getEmptyForm());
      setEditingEventId(null);

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
      setSaving(false);
    }
  }

  /*
   * DELETE EVENT
   */

  async function handleDelete(eventId: string) {
    if (!currentUser || !selectedWorkspace) {
      return;
    }

    const confirmed = window.confirm(
      "Remove this event from the shared calendar?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingEventId(eventId);
      setCalendarError("");

      await deleteFamilyOrganizerCalendarEvent({
        currentUserId: currentUser.uid,
        ownerUserId: selectedWorkspace.ownerUserId,
        childId: selectedWorkspace.childId,
        eventId,
      });

      if (editingEventId === eventId) {
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
      setDeletingEventId("");
    }
  }

  /*
   * EVENT DISPLAY
   */

  function renderEvent(
    event: FamilyOrganizerCalendarEvent
  ) {
    return (
      <article
        key={event.id}
        style={{
          padding: "18px 0",
          borderBottom: `1px solid ${BRAND.border}`,
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
          <div style={{ flex: 1, minWidth: 220 }}>
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
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                {event.title}
              </h3>

              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: BRAND.lightTeal,
                  color: BRAND.darkTeal,
                  fontSize: 9,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {getEventTypeLabel(event.eventType)}
              </span>
            </div>

            <div
              style={{
                marginTop: 8,
                color: BRAND.navy,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {formatEventDate(event.startAt)}
              {" • "}
              {formatEventTime(event)}
            </div>

            {event.location ? (
              <div
                style={{
                  marginTop: 6,
                  color: BRAND.muted,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                📍 {event.location}
              </div>
            ) : null}

            {event.notes ? (
              <div
                style={{
                  marginTop: 8,
                  color: BRAND.muted,
                  fontSize: 12,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {event.notes}
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
              onClick={() => beginEditing(event)}
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                border: `1px solid ${BRAND.border}`,
                background: BRAND.white,
                color: BRAND.darkTeal,
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Edit
            </button>

            <button
              type="button"
              disabled={deletingEventId === event.id}
              onClick={() => {
                void handleDelete(event.id);
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
                  deletingEventId === event.id
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  deletingEventId === event.id ? 0.6 : 1,
              }}
            >
              {deletingEventId === event.id
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
            Shared Calendar
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
            Keep appointments, therapy, school meetings,
            IEP dates, evaluations, deadlines, and other
            important events visible to your Family Team.
          </p>
        </section>

        {/* AUTHENTICATION */}

        {!authReady ? (
          <section style={styles.card}>
            <div style={styles.body}>
              Loading shared calendar...
            </div>
          </section>
        ) : null}

        {authReady && !currentUser ? (
          <section style={styles.card}>
            <h2 style={styles.heading}>
              Sign in to use the Shared Calendar
            </h2>

            <p style={styles.body}>
              Sign in to your Autivoya account to access
              your family's shared calendar.
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
                <div role="alert" style={styles.error}>
                  {workspaceError}
                </div>
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
                        &apos;s Shared Calendar
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          color: BRAND.muted,
                          fontSize: 12,
                          lineHeight: 1.6,
                        }}
                      >
                        Events added here are shared with
                        authorized Family Team members.
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

                {/* ADD / EDIT EVENT */}

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
                      {editingEventId
                        ? "Edit Event"
                        : "Add Event"}
                    </h2>

                    {editingEventId ? (
                      <button
                        type="button"
                        onClick={resetForm}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: BRAND.darkTeal,
                          fontSize: 12,
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
                      <div>
                        <label
                          htmlFor="calendar-title"
                          style={styles.label}
                        >
                          Event Title
                        </label>

                        <input
                          id="calendar-title"
                          type="text"
                          required
                          value={form.title}
                          onChange={(event) =>
                            updateForm(
                              "title",
                              event.target.value
                            )
                          }
                          placeholder="e.g. Speech therapy"
                          style={styles.input}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="calendar-type"
                          style={styles.label}
                        >
                          Type
                        </label>

                        <select
                          id="calendar-type"
                          value={form.eventType}
                          onChange={(event) =>
                            updateForm(
                              "eventType",
                              event.target
                                .value as FamilyOrganizerCalendarEventType
                            )
                          }
                          style={styles.input}
                        >
                          {EVENT_TYPES.map((item) => (
                            <option
                              key={item.value}
                              value={item.value}
                            >
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="calendar-date"
                          style={styles.label}
                        >
                          Date
                        </label>

                        <input
                          id="calendar-date"
                          type="date"
                          required
                          value={form.date}
                          onChange={(event) =>
                            updateForm(
                              "date",
                              event.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>

                      {!form.allDay ? (
                        <>
                          <div>
                            <label
                              htmlFor="calendar-start"
                              style={styles.label}
                            >
                              Start Time
                            </label>

                            <input
                              id="calendar-start"
                              type="time"
                              required
                              value={form.startTime}
                              onChange={(event) =>
                                updateForm(
                                  "startTime",
                                  event.target.value
                                )
                              }
                              style={styles.input}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="calendar-end"
                              style={styles.label}
                            >
                              End Time
                            </label>

                            <input
                              id="calendar-end"
                              type="time"
                              value={form.endTime}
                              onChange={(event) =>
                                updateForm(
                                  "endTime",
                                  event.target.value
                                )
                              }
                              style={styles.input}
                            />
                          </div>
                        </>
                      ) : null}

                      <div>
                        <label
                          htmlFor="calendar-location"
                          style={styles.label}
                        >
                          Location
                        </label>

                        <input
                          id="calendar-location"
                          type="text"
                          value={form.location}
                          onChange={(event) =>
                            updateForm(
                              "location",
                              event.target.value
                            )
                          }
                          placeholder="Optional"
                          style={styles.input}
                        />
                      </div>
                    </div>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        marginTop: 16,
                        color: BRAND.navy,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.allDay}
                        onChange={(event) =>
                          updateForm(
                            "allDay",
                            event.target.checked
                          )
                        }
                        style={{
                          accentColor: BRAND.darkTeal,
                        }}
                      />
                      All-day event
                    </label>

                    <div style={{ marginTop: 16 }}>
                      <label
                        htmlFor="calendar-notes"
                        style={styles.label}
                      >
                        Notes
                      </label>

                      <textarea
                        id="calendar-notes"
                        value={form.notes}
                        onChange={(event) =>
                          updateForm(
                            "notes",
                            event.target.value
                          )
                        }
                        placeholder="Optional details or reminders"
                        rows={4}
                        style={{
                          ...styles.input,
                          lineHeight: 1.6,
                          resize: "vertical",
                        }}
                      />
                    </div>

                    {formError ? (
                      <div
                        role="alert"
                        style={styles.error}
                      >
                        {formError}
                      </div>
                    ) : null}

                    {successMessage ? (
                      <div
                        role="status"
                        style={styles.success}
                      >
                        {successMessage}
                      </div>
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
                        : editingEventId
                          ? "Save Changes"
                          : "Add to Calendar"}
                    </button>
                  </form>
                </section>

                {/* UPCOMING EVENTS */}

                <section style={styles.card}>
                  <h2 style={styles.heading}>
                    Upcoming
                  </h2>

                  {loadingEvents ? (
                    <div
                      style={{
                        ...styles.body,
                        marginTop: 14,
                      }}
                    >
                      Loading events...
                    </div>
                  ) : null}

                  {!loadingEvents &&
                  upcomingEvents.length === 0 ? (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 18,
                        borderRadius: 12,
                        background: BRAND.lightTeal,
                        color: BRAND.navy,
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      No upcoming events yet. Add an
                      appointment, meeting, deadline, or
                      other important date above.
                    </div>
                  ) : null}

                  {!loadingEvents
                    ? upcomingEvents.map(renderEvent)
                    : null}

                  {calendarError ? (
                    <div
                      role="alert"
                      style={styles.error}
                    >
                      {calendarError}
                    </div>
                  ) : null}
                </section>

                {/* PAST EVENTS */}

                {pastEvents.length > 0 ? (
                  <section style={styles.card}>
                    <h2 style={styles.heading}>
                      Past Events
                    </h2>

                    {pastEvents.map(renderEvent)}
                  </section>
                ) : null}
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
