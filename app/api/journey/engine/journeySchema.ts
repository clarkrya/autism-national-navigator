/*
 * ============================================================
 * JOURNEY RESPONSE SCHEMA
 * ============================================================
 *
 * This schema defines exactly what the AI is allowed to return.
 *
 * The schema is intentionally kept separate from the API route
 * so the journey engine can be maintained independently.
 */

export const journeySchema = {
    type: "object",
    additionalProperties: false,
  
    properties: {
      summary: {
        type: "string",
      },
  
      currentFocus: {
        type: "object",
        additionalProperties: false,
  
        properties: {
          title: {
            type: "string",
          },
  
          explanation: {
            type: "string",
          },
        },
  
        required: [
          "title",
          "explanation",
        ],
      },
  
      priorities: {
        type: "array",
  
        items: {
          type: "object",
          additionalProperties: false,
  
          properties: {
            id: {
              type: "string",
            },
  
            title: {
              type: "string",
            },
  
            explanation: {
              type: "string",
            },
  
            priority: {
              type: "string",
  
              enum: [
                "High",
                "Medium",
                "Low",
              ],
            },
          },
  
          required: [
            "id",
            "title",
            "explanation",
            "priority",
          ],
        },
      },
  
      tasks: {
        type: "array",
  
        items: {
          type: "object",
          additionalProperties: false,
  
          properties: {
            id: {
              type: "string",
            },
  
            title: {
              type: "string",
            },
  
            description: {
              type: "string",
            },
  
            priority: {
              type: "string",
  
              enum: [
                "High",
                "Medium",
                "Low",
              ],
            },
  
            estimatedTime: {
              type: "string",
            },
  
            completed: {
              type: "boolean",
            },
  
            resourceLink: {
              type: "string",
            },
          },
  
          required: [
            "id",
            "title",
            "description",
            "priority",
            "estimatedTime",
            "completed",
            "resourceLink",
          ],
        },
      },
  
      resources: {
        type: "array",
  
        items: {
          type: "object",
          additionalProperties: false,
  
          properties: {
            id: {
              type: "string",
            },
  
            title: {
              type: "string",
            },
  
            description: {
              type: "string",
            },
  
            url: {
              type: "string",
            },
          },
  
          required: [
            "id",
            "title",
            "description",
            "url",
          ],
        },
      },
  
      nextStep: {
        type: "object",
        additionalProperties: false,
  
        properties: {
          title: {
            type: "string",
          },
  
          description: {
            type: "string",
          },
        },
  
        required: [
          "title",
          "description",
        ],
      },
    },
  
    required: [
      "summary",
      "currentFocus",
      "priorities",
      "tasks",
      "resources",
      "nextStep",
    ],
  } as const;