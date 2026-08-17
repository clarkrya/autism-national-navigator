import {
    onAuthStateChanged,
    type User,
  } from "firebase/auth";
  
  import { auth } from "./firebase";
  
  /*
   * ============================================================
   * AUTHENTICATION HELPERS
   * ============================================================
   *
   * Centralizes Firebase authentication state so components
   * don't need to interact with Firebase directly.
   *
   * Used by:
   *
   * - Login
   * - Signup
   * - Save My Journey
   * - Future account features
   * ============================================================
   */
  
  /*
   * ------------------------------------------------------------
   * GET CURRENT USER
   * ------------------------------------------------------------
   *
   * Returns the currently authenticated Firebase user.
   *
   * Returns null when no user is signed in.
   */
  
  export function getCurrentUser(): User | null {
    return auth.currentUser;
  }
  
  
  /*
   * ------------------------------------------------------------
   * WATCH AUTH STATE
   * ------------------------------------------------------------
   *
   * Allows client components to react when a user:
   *
   * - logs in
   * - creates an account
   * - logs out
   * - restores an existing session
   */
  
  export function watchAuthState(
    callback: (user: User | null) => void
  ) {
    return onAuthStateChanged(
      auth,
      callback
    );
  }