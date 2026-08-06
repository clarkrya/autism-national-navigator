import { RoadmapTask } from "../../lib/recommendationEngine";

interface RoadmapProps {
  childName: string;
  tasks: RoadmapTask[];
}

export default function Roadmap({
  childName,
  tasks,
}: RoadmapProps) {
  const completedTasks = tasks.filter(
    (task) => task.completed
  );

  const remainingTasks = tasks.filter(
    (task) => !task.completed
  );

  const firstTask = remainingTasks[0];

  const progress =
    tasks.length === 0
      ? 0
      : Math.round(
          (completedTasks.length / tasks.length) * 100
        );

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <h1
        style={{
          fontSize: "42px",
          color: "#0057B8",
        }}
      >
        Welcome, {childName}'s Family 👋
      </h1>

      <p
        style={{
          fontSize: "20px",
          color: "#666",
          marginBottom: "40px",
        }}
      >
        Your Personalized Family Roadmap
      </p>

      {/* Progress */}

      <div
        style={{
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: "10px",
          }}
        >
          Progress
        </div>

        <div
          style={{
            background: "#E5E7EB",
            height: "18px",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "#0057B8",
              transition: ".4s",
            }}
          />
        </div>

        <div
          style={{
            marginTop: "8px",
            color: "#666",
          }}
        >
          {completedTasks.length} of {tasks.length} tasks completed
        </div>
      </div>

      {/* Today's Task */}

      {firstTask && (
        <div
          style={{
            background: "#F4F9FF",
            border: "2px solid #0057B8",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              color: "#0057B8",
              fontWeight: 700,
              marginBottom: "10px",
            }}
          >
            ⭐ Today's First Step
          </div>

          <h2>{firstTask.title}</h2>

          <p
            style={{
              lineHeight: 1.7,
              color: "#555",
            }}
          >
            {firstTask.description}
          </p>

          <p
            style={{
              color: "#0057B8",
              fontWeight: 700,
            }}
          >
            Estimated Time: {firstTask.estimatedTime}
          </p>

          <button
            style={{
              marginTop: "20px",
              padding: "14px 30px",
              borderRadius: "10px",
              border: "none",
              background: "#0057B8",
              color: "white",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Start Here →
          </button>
        </div>
      )}

      {/* Upcoming */}

      <h2
        style={{
          color: "#0057B8",
        }}
      >
        Upcoming Tasks
      </h2>

      <div
        style={{
          display: "grid",
          gap: "18px",
        }}
      >
        {remainingTasks.slice(1).map((task) => (
          <div
            key={task.id}
            style={{
              border: "1px solid #E5E7EB",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <div
              style={{
                fontWeight: 700,
              }}
            >
              ☐ {task.title}
            </div>

            <div
              style={{
                marginTop: "6px",
                color: "#666",
              }}
            >
              {task.description}
            </div>
          </div>
        ))}
      </div>

      {/* Completed */}

      {completedTasks.length > 0 && (
        <>
          <h2
            style={{
              marginTop: "50px",
              color: "#0057B8",
            }}
          >
            Completed
          </h2>

          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            {completedTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  border: "1px solid #D1FAE5",
                  background: "#ECFDF5",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                ✅ {task.title}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}