import type {
    JourneyProgressSummary,
    ProgressInsight,
    ProgressInsightInput,
  } from "./progressInsightTypes";
  
  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */
  
  function clampPercentage(
    value: number
  ): number {
    return Math.max(
      0,
      Math.min(100, value)
    );
  }
  
  function getCompletionPercentage(
    totalTasks: number,
    completedTasks: number
  ): number {
    if (totalTasks <= 0) {
      return 0;
    }
  
    return clampPercentage(
      Math.round(
        (completedTasks / totalTasks) *
          100
      )
    );
  }
  
  /*
   * ============================================================
   * BUILD INSIGHTS
   * ============================================================
   */
  
  function buildInsights(
    totalTasks: number,
    completedTasks: number,
    remainingTasks: number,
    completionPercentage: number
  ): ProgressInsight[] {
    const insights: ProgressInsight[] =
      [];
  
    /*
     * ----------------------------------------------------------
     * NO TASKS
     * ----------------------------------------------------------
     */
  
    if (totalTasks === 0) {
      insights.push({
        id: "journey-ready",
        category: "next_step",
        title: "Your next steps are ready",
        summary:
          "Your Journey is ready to help organize what comes next.",
        suggestedAction:
          "Review the Journey and begin with the steps that feel most useful for your family.",
        status: "informational",
      });
  
      return insights;
    }
  
    /*
     * ----------------------------------------------------------
     * JOURNEY COMPLETE
     * ----------------------------------------------------------
     */
  
    if (
      completedTasks === totalTasks
    ) {
      insights.push({
        id: "journey-complete",
        category: "progress",
        title:
          "You completed this Journey",
        summary: `You completed all ${totalTasks} ${
          totalTasks === 1
            ? "step"
            : "steps"
        } in this Journey.`,
        suggestedAction:
          "Review what you accomplished and continue to the next Journey when your family is ready.",
        status: "positive",
      });
  
      return insights;
    }
  
    /*
     * ----------------------------------------------------------
     * PROGRESS
     * ----------------------------------------------------------
     */
  
    if (completedTasks > 0) {
      insights.push({
        id: "progress-made",
        category: "progress",
        title:
          "You're making progress",
        summary: `You've completed ${completedTasks} of ${totalTasks} Journey ${
          totalTasks === 1
            ? "step"
            : "steps"
        }.`,
        status: "positive",
      });
    } else {
      insights.push({
        id: "journey-start",
        category: "focus",
        title:
          "Your Journey is ready to begin",
        summary: `You have ${totalTasks} ${
          totalTasks === 1
            ? "step"
            : "steps"
        } available in your current Journey.`,
        suggestedAction:
          "Choose one step that feels manageable and start there.",
        status: "informational",
      });
    }
  
    /*
     * ----------------------------------------------------------
     * MOMENTUM
     * ----------------------------------------------------------
     */
  
    if (
      completionPercentage >= 75
    ) {
      insights.push({
        id: "strong-momentum",
        category: "momentum",
        title:
          "You're nearing the end of this Journey",
        summary: `${remainingTasks} ${
          remainingTasks === 1
            ? "step remains"
            : "steps remain"
        } in your current Journey.`,
        suggestedAction:
          "Review the remaining steps and decide which one makes the most sense to address next.",
        status: "positive",
      });
    } else if (
      completionPercentage >= 40
    ) {
      insights.push({
        id: "journey-momentum",
        category: "momentum",
        title:
          "Your Journey is moving forward",
        summary: `${completionPercentage}% of the current Journey is complete.`,
        suggestedAction:
          "Keep working through the remaining steps at a pace that works for your family.",
        status: "positive",
      });
    }
  
    /*
     * ----------------------------------------------------------
     * NEXT STEP
     * ----------------------------------------------------------
     */
  
    if (
      completedTasks > 0 &&
      remainingTasks > 0
    ) {
      insights.push({
        id: "next-step",
        category: "next_step",
        title:
          "Keep your next step simple",
        summary: `You have ${remainingTasks} ${
          remainingTasks === 1
            ? "step"
            : "steps"
        } remaining.`,
        suggestedAction:
          "Focus on one remaining Journey step at a time rather than trying to complete everything at once.",
        status: "informational",
      });
    }
  
    return insights;
  }
  
  /*
   * ============================================================
   * BUILD PROGRESS SUMMARY
   * ============================================================
   */
  
  export function buildProgressInsights(
    input: ProgressInsightInput
  ): JourneyProgressSummary {
    const totalTasks = Math.max(
      0,
      input.totalTasks
    );
  
    /*
     * De-duplicate completed IDs before
     * calculating progress.
     */
  
    const uniqueCompletedTaskIds =
      Array.from(
        new Set(
          input.completedTaskIds.filter(
            (taskId) =>
              typeof taskId ===
                "string" &&
              taskId.trim().length > 0
          )
        )
      );
  
    /*
     * Completed tasks should never exceed
     * the number of tasks in the Journey.
     */
  
    const completedTasks = Math.min(
      totalTasks,
      uniqueCompletedTaskIds.length
    );
  
    const remainingTasks = Math.max(
      0,
      totalTasks - completedTasks
    );
  
    const completionPercentage =
      getCompletionPercentage(
        totalTasks,
        completedTasks
      );
  
    const insights = buildInsights(
      totalTasks,
      completedTasks,
      remainingTasks,
      completionPercentage
    );
  
    return {
      childId: input.childId,
      childName: input.childName,
      journeyId: input.journeyId,
      stageNumber: input.stageNumber,
  
      counts: {
        totalTasks,
        completedTasks,
        remainingTasks,
        completionPercentage,
      },
  
      insights,
  
      generatedAt: Date.now(),
    };
  }