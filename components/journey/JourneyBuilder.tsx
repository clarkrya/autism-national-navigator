"use client";

import { useMemo, useState } from "react";

import type { Milestone } from "../../lib/journeyEngine";

import TaskChecklist from "./TaskChecklist";

interface JourneyDashboardProps {
  milestones: Milestone[];
}

export default function JourneyDashboard({
  milestones,
}: JourneyDashboardProps) {
  // Copy milestones into state so we can update them
  const [journey, setJourney] =
    useState<Milestone[]>(milestones);

  // Find the current milestone
  const currentMilestone =
    journey.find((m) => m.current);

  // Toggle a task
  function toggleTask(taskId: string) {
    setJourney((currentJourney) =>
      currentJourney.map((milestone) => {
        if (!milestone.current) return milestone;

        const updatedTasks = milestone.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                completed: !task.completed,
              }
            : task
        );

        const milestoneCompleted =
          updatedTasks.every((task) => task.completed);

        return {
          ...milestone,
          completed: milestoneCompleted,
          tasks: updatedTasks,
        };
      })
    );
  }

  // Overall milestone progress
  const completedMilestones =
    journey.filter((m) => m.completed).length;

  const journeyPercent = Math.round(
    (completedMilestones / journey.length) * 100
  );

  // Current milestone task progress
  const milestonePercent = useMemo(() => {
    if (!currentMilestone) return 0;

    const completed =
      currentMilestone.tasks.filter(
        (t) => t.completed
      ).length;

    return Math.round(
      (completed / currentMilestone.tasks.length) *
        100
    );
  }, [currentMilestone]);

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "60px auto",
        padding: "20px",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          fontWeight: 800,
        }}
      >
        Your Family Journey
      </h1>

      <p
        style={{
          color: "#64748B",
          fontSize: "20px",
          marginBottom: "30px",
        }}
      >
        {completedMilestones} of {journey.length} milestones completed
      </p>

      {/* Overall Journey Progress */}

      <h3>Journey Progress</h3>

      <div
        style={{
          height: "14px",
          background: "#E2E8F0",
          borderRadius: "999px",
          overflow: "hidden",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            width: `${journeyPercent}%`,
            height: "100%",
            background:
              "linear-gradient(90deg,#2563EB,#14B8A6)",
            transition: "width .3s ease",
          }}
        />
      </div>

      <p
        style={{
          marginBottom: "40px",
          color: "#475569",
        }}
      >
        {journeyPercent}% Complete
      </p>

      {currentMilestone && (
        <>
          <div
            style={{
              padding: "36px",
              borderRadius: "24px",
              border: "1px solid #E2E8F0",
              background: "#F8FAFC",
            }}
          >
            <div
              style={{
                color: "#2563EB",
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Current Focus
            </div>

            <h2
              style={{
                fontSize: "34px",
                margin: 0,
              }}
            >
              {currentMilestone.title}
            </h2>

            <p
              style={{
                marginTop: "12px",
                color: "#64748B",
                lineHeight: 1.8,
              }}
            >
              {currentMilestone.description}
            </p>

            {/* Milestone Progress */}

            <div
              style={{
                marginTop: "30px",
              }}
            >
              <strong>
                Milestone Progress
              </strong>

              <div
                style={{
                  marginTop: "10px",
                  height: "10px",
                  background: "#E2E8F0",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${milestonePercent}%`,
                    height: "100%",
                    background: "#14B8A6",
                    transition: "width .3s ease",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: "8px",
                  color: "#475569",
                }}
              >
                {milestonePercent}% Complete
              </div>
            </div>

            <TaskChecklist
              tasks={currentMilestone.tasks}
              onToggleTask={toggleTask}
            />
          </div>
        </>
      )}
    </div>
  );
}