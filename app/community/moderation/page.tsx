"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { auth } from "../../../lib/firebase";


type ModeratorRole =
  | "moderator"
  | "admin";


type ReportStatus =
  | "open"
  | "reviewing"
  | "resolved"
  | "dismissed";


type ReportTargetType =
  | "post"
  | "reply";


type ReportReason =
  | "harassment"
  | "hate_or_abuse"
  | "misinformation"
  | "privacy"
  | "spam"
  | "unsafe_content"
  | "other";


  type CommunityModerationReport = {
    id: string;
  
    reporterId: string;
  
    targetType: ReportTargetType;
  
    targetId: string;
  
    parentPostId: string;
  
    reason: ReportReason;

  details: string;

  status: ReportStatus;

  createdAt: number;

  updatedAt: number;
};


type ModerationReportsResponse = {
  success?: boolean;

  role?: ModeratorRole;

  reports?: CommunityModerationReport[];

  count?: number;

  error?: string;
};


type ModerationStatusResponse = {
  success?: boolean;

  reportId?: string;

  status?: ReportStatus;

  error?: string;
};


const REASON_LABELS:
  Record<ReportReason, string> = {
    harassment:
      "Harassment or bullying",

    hate_or_abuse:
      "Hate or abusive content",

    misinformation:
      "Potentially harmful misinformation",

    privacy:
      "Privacy or personal information",

    spam:
      "Spam or promotional content",

    unsafe_content:
      "Unsafe or concerning content",

    other:
      "Other",
  };


const STATUS_LABELS:
  Record<ReportStatus, string> = {
    open:
      "Open",

    reviewing:
      "Reviewing",

    resolved:
      "Resolved",

    dismissed:
      "Dismissed",
  };


const STATUS_OPTIONS:
  ReportStatus[] = [
    "open",
    "reviewing",
    "resolved",
    "dismissed",
  ];


function formatDate(
  timestamp: number
): string {

  if (!timestamp) {
    return "";
  }


  try {

    return new Intl.DateTimeFormat(
      "en-US",
      {
        month:
          "long",

        day:
          "numeric",

        year:
          "numeric",

        hour:
          "numeric",

        minute:
          "2-digit",
      }
    ).format(
      new Date(timestamp)
    );

  } catch {

    return "";
  }
}


function getStatusStyle(
  status: ReportStatus
) {

  if (
    status === "open"
  ) {

    return {
      background:
        "#FEF2F2",

      color:
        "#B91C1C",

      border:
        "1px solid #FECACA",
    };
  }


  if (
    status === "reviewing"
  ) {

    return {
      background:
        "#FFF7ED",

      color:
        "#C2410C",

      border:
        "1px solid #FED7AA",
    };
  }


  if (
    status === "resolved"
  ) {

    return {
      background:
        "#F0FDF4",

      color:
        "#166534",

      border:
        "1px solid #BBF7D0",
    };
  }


  return {
    background:
      "#F8FAFC",

    color:
      "#475569",

    border:
      "1px solid #CBD5E1",
  };
}


function getConversationUrl(
  report: CommunityModerationReport
): string {

  if (
    report.targetType ===
      "post"
  ) {

    return `/community/${report.targetId}`;
  }


  if (
    report.targetType ===
      "reply" &&
    report.parentPostId
  ) {

    return `/community/${report.parentPostId}`;
  }


  return "";
}


export default function CommunityModerationPage() {

  const [
    reports,
    setReports,
  ] =
    useState<
      CommunityModerationReport[]
    >([]);


  const [
    role,
    setRole,
  ] =
    useState<
      ModeratorRole | null
    >(null);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState("");


  /*
   * Track the report currently being updated so
   * only that report's controls are disabled.
   */

  const [
    updatingReportId,
    setUpdatingReportId,
  ] =
    useState<
      string | null
    >(null);


  /*
   * Success/error feedback for moderation actions.
   */

  const [
    actionMessage,
    setActionMessage,
  ] =
    useState("");


  const [
    actionError,
    setActionError,
  ] =
    useState("");


  /*
   * ============================================================
   * LOAD MODERATION QUEUE
   * ============================================================
   */

  const loadReports =
    useCallback(
      async () => {

        setLoading(true);

        setError("");


        try {

          const user =
            auth.currentUser;


          if (!user) {

            setRole(null);

            setReports([]);

            setError(
              "Please log in with an authorized Community moderation account."
            );

            return;
          }


          const idToken =
            await user.getIdToken();


          const response =
            await fetch(
              "/api/community/moderation/reports",
              {
                method:
                  "GET",

                headers: {
                  Authorization:
                    `Bearer ${idToken}`,
                },

                cache:
                  "no-store",
              }
            );


          let result:
            ModerationReportsResponse =
            {};


          try {

            result =
              await response.json() as
                ModerationReportsResponse;

          } catch {

            result =
              {};
          }


          if (!response.ok) {

            setRole(null);

            setReports([]);

            setError(
              result.error ||
              "You do not have permission to access Community moderation."
            );

            return;
          }


          if (
            result.role !==
              "moderator" &&
            result.role !==
              "admin"
          ) {

            throw new Error(
              "INVALID_MODERATOR_ROLE"
            );
          }


          setRole(
            result.role
          );


          setReports(
            Array.isArray(
              result.reports
            )
              ? result.reports
              : []
          );


        } catch (
          loadError
        ) {

          console.error(
            "Unable to load Community moderation queue:",
            loadError
          );


          setRole(null);

          setReports([]);


          setError(
            "We couldn't load the Community moderation queue right now."
          );


        } finally {

          setLoading(false);
        }
      },
      []
    );


  /*
   * ============================================================
   * WAIT FOR FIREBASE AUTH INITIALIZATION
   * ============================================================
   */

  useEffect(
    () => {

      const unsubscribe =
        onAuthStateChanged(
          auth,
          (
            user: User | null
          ) => {

            if (!user) {

              setRole(null);

              setReports([]);

              setError(
                "Please log in with an authorized Community moderation account."
              );

              setLoading(false);

              return;
            }


            void loadReports();
          }
        );


      return () => {
        unsubscribe();
      };

    },
    [
      loadReports,
    ]
  );


  /*
   * ============================================================
   * UPDATE REPORT STATUS
   * ============================================================
   */

  const updateReportStatus =
    useCallback(
      async (
        reportId: string,
        status: ReportStatus
      ) => {

        /*
         * Do nothing if another status update for this
         * report is already in progress.
         */

        if (
          updatingReportId ===
            reportId
        ) {
          return;
        }


        setUpdatingReportId(
          reportId
        );

        setActionMessage("");

        setActionError("");


        try {

          const user =
            auth.currentUser;


          if (!user) {

            setActionError(
              "Please log in again before performing a moderation action."
            );

            return;
          }


          const idToken =
            await user.getIdToken();


          const response =
            await fetch(
              "/api/community/moderation/reports/status",
              {
                method:
                  "POST",

                headers: {
                  Authorization:
                    `Bearer ${idToken}`,

                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    reportId,
                    status,
                  }),

                cache:
                  "no-store",
              }
            );


          let result:
            ModerationStatusResponse =
            {};


          try {

            result =
              await response.json() as
                ModerationStatusResponse;

          } catch {

            result =
              {};
          }


          if (!response.ok) {

            setActionError(
              result.error ||
              "We couldn't update this Community report."
            );

            return;
          }


          /*
           * Update the local queue immediately.
           *
           * We still reload from the server afterward so
           * Firestore remains the authoritative source.
           */

          setReports(
            (
              currentReports
            ) =>
              currentReports.map(
                (report) =>
                  report.id ===
                    reportId
                    ? {
                        ...report,

                        status,

                        updatedAt:
                          Date.now(),
                      }
                    : report
              )
          );


          setActionMessage(
            `Report status changed to ${STATUS_LABELS[status]}.`
          );


          /*
           * Re-read the moderation queue from Firestore.
           */

          await loadReports();


        } catch (
          updateError
        ) {

          console.error(
            "Unable to update Community report status:",
            updateError
          );


          setActionError(
            "We couldn't update this Community report right now."
          );


        } finally {

          setUpdatingReportId(
            null
          );
        }
      },
      [
        loadReports,
        updatingReportId,
      ]
    );


  /*
   * ============================================================
   * STATUS COUNTS
   * ============================================================
   */

  const openCount =
    reports.filter(
      (report) =>
        report.status ===
        "open"
    ).length;


  const reviewingCount =
    reports.filter(
      (report) =>
        report.status ===
        "reviewing"
    ).length;


  const resolvedCount =
    reports.filter(
      (report) =>
        report.status ===
        "resolved"
    ).length;


  const dismissedCount =
    reports.filter(
      (report) =>
        report.status ===
        "dismissed"
    ).length;


  return (
    <main
      style={{
        maxWidth:
          "900px",

        margin:
          "0 auto",

        padding:
          "45px 24px 90px",
      }}
    >

      <Link
        href="/community"
        style={{
          color:
            "#2563EB",

          fontSize:
            "14px",

          fontWeight:
            800,

          textDecoration:
            "none",
        }}
      >
        ← Back to Community
      </Link>


      <section
        style={{
          marginTop:
            "22px",

          padding:
            "30px",

          borderRadius:
            "20px",

          border:
            "1px solid #E2E8F0",

          background:
            "#FFFFFF",

          boxShadow:
            "0 6px 20px rgba(15, 23, 42, 0.04)",
        }}
      >

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "flex-start",

            gap:
              "18px",

            flexWrap:
              "wrap",
          }}
        >

          <div>

            <div
              style={{
                marginBottom:
                  "8px",

                color:
                  "#2563EB",

                fontSize:
                  "11px",

                fontWeight:
                  850,

                textTransform:
                  "uppercase",

                letterSpacing:
                  "0.06em",
              }}
            >
              Community Safety
            </div>


            <h1
              style={{
                margin:
                  "0 0 8px",

                color:
                  "#0F172A",

                fontSize:
                  "30px",

                lineHeight:
                  1.2,

                fontWeight:
                  850,
              }}
            >
              Moderation Queue
            </h1>


            <p
              style={{
                maxWidth:
                  "620px",

                margin:
                  0,

                color:
                  "#64748B",

                fontSize:
                  "14px",

                lineHeight:
                  1.65,
              }}
            >
              Review Community content reported by members.
              Reports remain part of the moderation audit
              trail after review.
            </p>

          </div>


          {
            role && (
              <span
                style={{
                  padding:
                    "7px 11px",

                  borderRadius:
                    "999px",

                  border:
                    "1px solid #BFDBFE",

                  background:
                    "#EFF6FF",

                  color:
                    "#1D4ED8",

                  fontSize:
                    "11px",

                  fontWeight:
                    800,

                  textTransform:
                    "capitalize",
                }}
              >
                {role}
              </span>
            )
          }

        </div>

      </section>


      {
        loading && (
          <section
            style={{
              marginTop:
                "18px",

              padding:
                "35px",

              borderRadius:
                "18px",

              border:
                "1px solid #E2E8F0",

              background:
                "#FFFFFF",

              textAlign:
                "center",

              color:
                "#64748B",

              fontSize:
                "14px",
            }}
          >
            Loading moderation queue...
          </section>
        )
      }


      {
        !loading &&
        error && (
          <section
            role="alert"
            style={{
              marginTop:
                "18px",

              padding:
                "24px",

              borderRadius:
                "16px",

              border:
                "1px solid #FECACA",

              background:
                "#FEF2F2",

              color:
                "#B91C1C",

              fontSize:
                "14px",

              lineHeight:
                1.6,
            }}
          >

            <strong>
              Moderation access unavailable
            </strong>


            <div
              style={{
                marginTop:
                  "7px",
              }}
            >
              {error}
            </div>

          </section>
        )
      }


      {
        !loading &&
        !error &&
        role && (
          <>

            <section
              style={{
                marginTop:
                  "18px",

                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(150px, 1fr))",

                gap:
                  "10px",
              }}
            >

              {
                [
                  {
                    label:
                      "Open",

                    value:
                      openCount,
                  },

                  {
                    label:
                      "Reviewing",

                    value:
                      reviewingCount,
                  },

                  {
                    label:
                      "Resolved",

                    value:
                      resolvedCount,
                  },

                  {
                    label:
                      "Dismissed",

                    value:
                      dismissedCount,
                  },
                ].map(
                  (item) => (

                    <div
                      key={
                        item.label
                      }
                      style={{
                        padding:
                          "18px",

                        borderRadius:
                          "14px",

                        border:
                          "1px solid #E2E8F0",

                        background:
                          "#FFFFFF",
                      }}
                    >

                      <div
                        style={{
                          color:
                            "#64748B",

                          fontSize:
                            "11px",

                          fontWeight:
                            800,

                          textTransform:
                            "uppercase",
                        }}
                      >
                        {item.label}
                      </div>


                      <div
                        style={{
                          marginTop:
                            "5px",

                          color:
                            "#0F172A",

                          fontSize:
                            "25px",

                          fontWeight:
                            850,
                        }}
                      >
                        {item.value}
                      </div>

                    </div>
                  )
                )
              }

            </section>


            {
              actionMessage && (
                <div
                  role="status"
                  style={{
                    marginTop:
                      "18px",

                    padding:
                      "13px 15px",

                    borderRadius:
                      "10px",

                    border:
                      "1px solid #BBF7D0",

                    background:
                      "#F0FDF4",

                    color:
                      "#166534",

                    fontSize:
                      "13px",

                    lineHeight:
                      1.5,
                  }}
                >
                  {actionMessage}
                </div>
              )
            }


            {
              actionError && (
                <div
                  role="alert"
                  style={{
                    marginTop:
                      "18px",

                    padding:
                      "13px 15px",

                    borderRadius:
                      "10px",

                    border:
                      "1px solid #FECACA",

                    background:
                      "#FEF2F2",

                    color:
                      "#B91C1C",

                    fontSize:
                      "13px",

                    lineHeight:
                      1.5,
                  }}
                >
                  {actionError}
                </div>
              )
            }


            <div
              style={{
                marginTop:
                  "25px",

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
                  margin:
                    0,

                  color:
                    "#0F172A",

                  fontSize:
                    "21px",

                  fontWeight:
                    800,
                }}
              >
                Reports
              </h2>


              <button
                type="button"
                onClick={
                  () => {

                    setActionMessage("");

                    setActionError("");

                    void loadReports();
                  }
                }
                disabled={
                  loading
                }
                style={{
                  padding:
                    "9px 13px",

                  borderRadius:
                    "9px",

                  border:
                    "1px solid #CBD5E1",

                  background:
                    "#FFFFFF",

                  color:
                    "#475569",

                  fontSize:
                    "12px",

                  fontWeight:
                    800,

                  cursor:
                    loading
                      ? "not-allowed"
                      : "pointer",

                  opacity:
                    loading
                      ? 0.6
                      : 1,
                }}
              >
                Refresh
              </button>

            </div>


            {
              reports.length ===
                0
                ? (
                  <section
                    style={{
                      marginTop:
                        "14px",

                      padding:
                        "35px",

                      borderRadius:
                        "18px",

                      border:
                        "1px solid #E2E8F0",

                      background:
                        "#FFFFFF",

                      textAlign:
                        "center",
                    }}
                  >

                    <div
                      style={{
                        fontSize:
                          "28px",

                        marginBottom:
                          "9px",
                      }}
                    >
                      ✓
                    </div>


                    <h3
                      style={{
                        margin:
                          0,

                        color:
                          "#0F172A",

                        fontSize:
                          "18px",

                        fontWeight:
                          800,
                      }}
                    >
                      No reports to review
                    </h3>


                    <p
                      style={{
                        margin:
                          "8px 0 0",

                        color:
                          "#64748B",

                        fontSize:
                          "13px",

                        lineHeight:
                          1.6,
                      }}
                    >
                      Community reports will appear here
                      when members submit them.
                    </p>

                  </section>
                )
                : (
                  <section
                    style={{
                      marginTop:
                        "14px",

                      display:
                        "grid",

                      gap:
                        "12px",
                    }}
                  >

                    {
                      reports.map(
                        (report) => {

                          const statusStyle =
                            getStatusStyle(
                              report.status
                            );


                          const conversationUrl =
                            getConversationUrl(
                              report
                            );


                          const isUpdating =
                            updatingReportId ===
                            report.id;


                          return (
                            <article
                              key={
                                report.id
                              }
                              style={{
                                padding:
                                  "22px",

                                borderRadius:
                                  "16px",

                                border:
                                  "1px solid #E2E8F0",

                                background:
                                  "#FFFFFF",

                                boxShadow:
                                  "0 4px 14px rgba(15, 23, 42, 0.03)",
                              }}
                            >

                              <div
                                style={{
                                  display:
                                    "flex",

                                  justifyContent:
                                    "space-between",

                                  alignItems:
                                    "flex-start",

                                  gap:
                                    "12px",

                                  flexWrap:
                                    "wrap",
                                }}
                              >

                                <div>

                                  <div
                                    style={{
                                      color:
                                        "#64748B",

                                      fontSize:
                                        "11px",

                                      fontWeight:
                                        800,

                                      textTransform:
                                        "uppercase",
                                    }}
                                  >
                                    {
                                      report.targetType ===
                                        "post"
                                        ? "Reported Conversation"
                                        : "Reported Reply"
                                    }
                                  </div>


                                  <h3
                                    style={{
                                      margin:
                                        "5px 0 0",

                                      color:
                                        "#0F172A",

                                      fontSize:
                                        "17px",

                                      fontWeight:
                                        800,
                                    }}
                                  >
                                    {
                                      REASON_LABELS[
                                        report.reason
                                      ]
                                    }
                                  </h3>

                                </div>


                                <span
                                  style={{
                                    padding:
                                      "6px 10px",

                                    borderRadius:
                                      "999px",

                                    fontSize:
                                      "11px",

                                    fontWeight:
                                      800,

                                    ...statusStyle,
                                  }}
                                >
                                  {
                                    STATUS_LABELS[
                                      report.status
                                    ]
                                  }
                                </span>

                              </div>


                              {
                                report.details && (
                                  <div
                                    style={{
                                      marginTop:
                                        "15px",

                                      padding:
                                        "13px 14px",

                                      borderRadius:
                                        "10px",

                                      background:
                                        "#F8FAFC",

                                      color:
                                        "#475569",

                                      fontSize:
                                        "13px",

                                      lineHeight:
                                        1.6,

                                      whiteSpace:
                                        "pre-wrap",
                                    }}
                                  >
                                    {report.details}
                                  </div>
                                )
                              }


                              <div
                                style={{
                                  marginTop:
                                    "16px",

                                  display:
                                    "grid",

                                  gap:
                                    "6px",

                                  color:
                                    "#64748B",

                                  fontSize:
                                    "12px",

                                  lineHeight:
                                    1.5,
                                }}
                              >

                                <div>
                                  <strong>
                                    Reported:
                                  </strong>{" "}
                                  {
                                    formatDate(
                                      report.createdAt
                                    )
                                  }
                                </div>


                                <div>
                                  <strong>
                                    Reporter:
                                  </strong>{" "}
                                  {report.reporterId}
                                </div>


                                <div>
                                  <strong>
                                    Target ID:
                                  </strong>{" "}
                                  {report.targetId}
                                </div>

                              </div>


                              <div
                                style={{
                                  marginTop:
                                    "17px",

                                  paddingTop:
                                    "14px",

                                  borderTop:
                                    "1px solid #F1F5F9",
                                }}
                              >

                                <div
                                  style={{
                                    marginBottom:
                                      "8px",

                                    color:
                                      "#64748B",

                                    fontSize:
                                      "11px",

                                    fontWeight:
                                      800,

                                    textTransform:
                                      "uppercase",
                                  }}
                                >
                                  Moderation Status
                                </div>


                                <div
                                  style={{
                                    display:
                                      "flex",

                                    gap:
                                      "7px",

                                    flexWrap:
                                      "wrap",
                                  }}
                                >

                                  {
                                    STATUS_OPTIONS.map(
                                      (
                                        statusOption
                                      ) => {

                                        const isCurrentStatus =
                                          report.status ===
                                          statusOption;


                                        return (
                                          <button
                                            key={
                                              statusOption
                                            }
                                            type="button"
                                            onClick={
                                              () =>
                                                void updateReportStatus(
                                                  report.id,
                                                  statusOption
                                                )
                                            }
                                            disabled={
                                              isUpdating ||
                                              isCurrentStatus
                                            }
                                            aria-pressed={
                                              isCurrentStatus
                                            }
                                            style={{
                                              padding:
                                                "8px 11px",

                                              borderRadius:
                                                "8px",

                                              border:
                                                isCurrentStatus
                                                  ? "1px solid #2563EB"
                                                  : "1px solid #CBD5E1",

                                              background:
                                                isCurrentStatus
                                                  ? "#EFF6FF"
                                                  : "#FFFFFF",

                                              color:
                                                isCurrentStatus
                                                  ? "#1D4ED8"
                                                  : "#475569",

                                              fontSize:
                                                "11px",

                                              fontWeight:
                                                800,

                                              cursor:
                                                isUpdating ||
                                                isCurrentStatus
                                                  ? "not-allowed"
                                                  : "pointer",

                                              opacity:
                                                isUpdating &&
                                                !isCurrentStatus
                                                  ? 0.55
                                                  : 1,
                                            }}
                                          >
                                            {
                                              isUpdating &&
                                              !isCurrentStatus
                                                ? STATUS_LABELS[
                                                    statusOption
                                                  ]
                                                : STATUS_LABELS[
                                                    statusOption
                                                  ]
                                            }
                                          </button>
                                        );
                                      }
                                    )
                                  }

                                </div>


                                {
                                  isUpdating && (
                                    <div
                                      style={{
                                        marginTop:
                                          "8px",

                                        color:
                                          "#64748B",

                                        fontSize:
                                          "11px",

                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      Updating report...
                                    </div>
                                  )
                                }

                              </div>


                              <div
                                style={{
                                  marginTop:
                                    "17px",

                                  paddingTop:
                                    "14px",

                                  borderTop:
                                    "1px solid #F1F5F9",

                                  display:
                                    "flex",

                                  gap:
                                    "9px",

                                  flexWrap:
                                    "wrap",
                                }}
                              >

                                {
                                  conversationUrl
                                    ? (
                                      <Link
                                        href={
                                          conversationUrl
                                        }
                                        style={{
                                          padding:
                                            "9px 13px",

                                          borderRadius:
                                            "9px",

                                          background:
                                            "#2563EB",

                                          color:
                                            "#FFFFFF",

                                          fontSize:
                                            "12px",

                                          fontWeight:
                                            800,

                                          textDecoration:
                                            "none",
                                        }}
                                      >
                                        Review Conversation
                                      </Link>
                                    )
                                    : (
                                      <span
                                        style={{
                                          padding:
                                            "9px 0",

                                          color:
                                            "#94A3B8",

                                          fontSize:
                                            "12px",

                                          fontWeight:
                                            700,
                                        }}
                                      >
                                        Reply context will be available
                                        in the next moderation step.
                                      </span>
                                    )
                                }

                              </div>

                            </article>
                          );
                        }
                      )
                    }

                  </section>
                )
            }

          </>
        )
      }

    </main>
  );
}