import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    writeBatch,
  } from "firebase/firestore";
  
  import {
    db,
  } from "./firebase";
  
  
  /*
   * ============================================================
   * NAVIGATOR CONVERSATION REPOSITORY
   * ============================================================
   *
   * Stores the current Ask Your Navigator conversation for each
   * saved child.
   *
   * Firestore structure:
   *
   * users/{userId}/children/{childId}/navigatorConversations/current
   *
   * Messages:
   *
   * users/{userId}/children/{childId}/navigatorConversations/
   * current/messages/{messageId}
   *
   * This structure keeps Navigator conversations isolated by:
   *
   * - authenticated user
   * - saved child
   *
   * The "current" conversation can later be archived if we add
   * multiple conversation history.
   *
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * TYPES
   * ============================================================
   */
  
  export type SavedNavigatorMessageRole =
    | "user"
    | "navigator";
  
  
  export type SavedNavigatorMessage = {
    id:
      string;
  
    role:
      SavedNavigatorMessageRole;
  
    text:
      string;
  
    createdAt:
      number;
  };
  
  
  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */
  
  function getConversationRef(
    userId:
      string,
    childId:
      string
  ) {
  
    return doc(
      db,
      "users",
      userId,
      "children",
      childId,
      "navigatorConversations",
      "current"
    );
  }
  
  
  function getMessagesCollectionRef(
    userId:
      string,
    childId:
      string
  ) {
  
    return collection(
      db,
      "users",
      userId,
      "children",
      childId,
      "navigatorConversations",
      "current",
      "messages"
    );
  }
  
  
  function timestampToMillis(
    value:
      unknown
  ): number {
  
    if (
      value instanceof Timestamp
    ) {
      return value.toMillis();
    }
  
  
    if (
      typeof value ===
        "number" &&
      Number.isFinite(
        value
      )
    ) {
      return value;
    }
  
  
    return 0;
  }
  
  
  /*
   * ============================================================
   * SAVE MESSAGE
   * ============================================================
   */
  
  export async function saveNavigatorMessage(
    userId:
      string,
    childId:
      string,
    message: {
      id:
        string;
  
      role:
        SavedNavigatorMessageRole;
  
      text:
        string;
    }
  ): Promise<void> {
  
    if (
      !userId ||
      !childId
    ) {
      throw new Error(
        "A user ID and child ID are required to save a Navigator message."
      );
    }
  
  
    const messageId =
      message.id.trim();
  
  
    const text =
      message.text.trim();
  
  
    if (
      !messageId
    ) {
      throw new Error(
        "A Navigator message ID is required."
      );
    }
  
  
    if (
      !text
    ) {
      throw new Error(
        "A Navigator message cannot be empty."
      );
    }
  
  
    if (
      message.role !==
        "user" &&
      message.role !==
        "navigator"
    ) {
      throw new Error(
        "Invalid Navigator message role."
      );
    }
  
  
    const conversationRef =
      getConversationRef(
        userId,
        childId
      );
  
  
    const messageRef =
      doc(
        getMessagesCollectionRef(
          userId,
          childId
        ),
        messageId
      );
  
  
    const batch =
      writeBatch(
        db
      );
  
  
    batch.set(
      conversationRef,
      {
        conversationId:
          "current",
  
        childId,
  
        updatedAt:
          serverTimestamp(),
      },
      {
        merge:
          true,
      }
    );
  
  
    batch.set(
      messageRef,
      {
        id:
          messageId,
  
        role:
          message.role,
  
        text,
  
        createdAt:
          serverTimestamp(),
      }
    );
  
  
    await batch.commit();
  }
  
  
  /*
   * ============================================================
   * LOAD CURRENT CONVERSATION
   * ============================================================
   */
  
  export async function getNavigatorMessages(
    userId:
      string,
    childId:
      string
  ): Promise<SavedNavigatorMessage[]> {
  
    if (
      !userId ||
      !childId
    ) {
      return [];
    }
  
  
    const messagesRef =
      getMessagesCollectionRef(
        userId,
        childId
      );
  
  
    const messagesQuery =
      query(
        messagesRef,
        orderBy(
          "createdAt",
          "asc"
        )
      );
  
  
    const snapshot =
      await getDocs(
        messagesQuery
      );
  
  
    const messages:
      SavedNavigatorMessage[] =
      [];
  
  
    snapshot.forEach(
      (
        messageDocument
      ) => {
  
        const data =
          messageDocument.data();
  
  
        const role =
          data.role;
  
  
        const text =
          typeof data.text ===
            "string"
  
            ? data.text.trim()
  
            : "";
  
  
        if (
          (
            role !==
              "user" &&
            role !==
              "navigator"
          ) ||
          !text
        ) {
          return;
        }
  
  
        messages.push({
          id:
            typeof data.id ===
              "string" &&
            data.id.trim()
  
              ? data.id.trim()
  
              : messageDocument.id,
  
          role,
  
          text,
  
          createdAt:
            timestampToMillis(
              data.createdAt
            ),
        });
  
      }
    );
  
  
    return messages;
  }
  
  
  /*
   * ============================================================
   * CLEAR CURRENT CONVERSATION
   * ============================================================
   */
  
  export async function clearNavigatorConversation(
    userId:
      string,
    childId:
      string
  ): Promise<void> {
  
    if (
      !userId ||
      !childId
    ) {
      throw new Error(
        "A user ID and child ID are required to clear a Navigator conversation."
      );
    }
  
  
    const messagesRef =
      getMessagesCollectionRef(
        userId,
        childId
      );
  
  
    const snapshot =
      await getDocs(
        messagesRef
      );
  
  
    const documents =
      snapshot.docs;
  
  
    for (
      let index = 0;
      index < documents.length;
      index += 450
    ) {
  
      const batch =
        writeBatch(
          db
        );
  
  
      const chunk =
        documents.slice(
          index,
          index + 450
        );
  
  
      chunk.forEach(
        (
          messageDocument
        ) => {
  
          batch.delete(
            messageDocument.ref
          );
  
        }
      );
  
  
      await batch.commit();
    }
  
  
    await deleteDoc(
      getConversationRef(
        userId,
        childId
      )
    );
  }