"use client";

import type { Task } from "../../lib/journeyEngine";

interface TaskChecklistProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
}

export default function TaskChecklist({
  tasks,
  onToggleTask,
}: TaskChecklistProps) {
  function priorityColor(priority: Task["priority"]) {
    switch (priority) {
      case "High":
        return "#DC2626";
      case "Medium":
        return "#D97706";
      case "Low":
        return "#059669";
      default:
        return "#64748B";
    }
  }

  return (
    <div
      style={{
        marginTop: "30px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      {tasks.map((task) => (
        <div
          key={task.id}
          style={{
            border: "1px solid #E2E8F0",
            borderRadius: "18px",
            padding: "22px",
            background: task.completed
              ? "#ECFDF5"
              : "#FFFFFF",
            transition: "all .25s ease",
            boxShadow: "0 6px 20px rgba(15,23,42,.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "22px",
                  color: "#0F172A",
                }}
              >
                {task.title}
              </h3>

              <p
                style={{
                  marginTop: "10px",
                  marginBottom: "18px",
                  color: "#64748B",
                  lineHeight: 1.7,
                }}
              >
                {task.description}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  flexWrap: "wrap",
                  fontSize: "15px",
                }}
              >
                <span
                  style={{
                    color: priorityColor(task.priority),
                    fontWeight: 700,
                  }}
                >
                  ● {task.priority} Priority
                </span>

                <span
                  style={{
                    color: "#475569",
                  }}
                >
                  ⏱ {task.estimatedTime}
                </span>
              </div>
            </div>

            <button
              onClick={() => onToggleTask(task.id)}
              style={{
                marginLeft: "24px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "30px",
              }}
            >
              {task.completed ? "✅" : "⬜"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}