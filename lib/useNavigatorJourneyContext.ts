"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  watchAuthState,
} from "./auth";

import {
  getCurrentJourney,
  getSavedChildren,
  type SavedChild,
  type SavedJourney,
} from "./journeyRepository";


/*
 * ============================================================
 * NAVIGATOR JOURNEY CONTEXT
 * ============================================================
 *
 * Loads the signed-in family's saved children and the currently
 * selected child's active Journey.
 *
 * This hook is intentionally read-only.
 *
 * It does NOT:
 * - change the Journey
 * - save Journey progress
 * - archive Journeys
 * - create children
 *
 * ============================================================
 */


export type NavigatorJourneyContext = {
  children:
    SavedChild[];

  selectedChildId:
    string;

  selectedChild:
    SavedChild | null;

  currentJourney:
    SavedJourney | null;

  loading:
    boolean;

  error:
    string;

  setSelectedChildId:
    (
      childId: string
    ) => void;

  refresh:
    () => Promise<void>;
};


/*
 * ============================================================
 * HOOK
 * ============================================================
 */

export function useNavigatorJourneyContext():
  NavigatorJourneyContext {

  /*
   * ----------------------------------------------------------
   * CHILDREN
   * ----------------------------------------------------------
   */

  const [
    children,
    setChildren,
  ] = useState<
    SavedChild[]
  >(
    []
  );


  /*
   * ----------------------------------------------------------
   * SELECTED CHILD
   * ----------------------------------------------------------
   */

  const [
    selectedChildId,
    setSelectedChildIdState,
  ] = useState(
    ""
  );


  /*
   * ----------------------------------------------------------
   * CURRENT JOURNEY
   * ----------------------------------------------------------
   */

  const [
    currentJourney,
    setCurrentJourney,
  ] = useState<
    SavedJourney | null
  >(
    null
  );


  /*
   * ----------------------------------------------------------
   * AUTH USER
   * ----------------------------------------------------------
   */

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState(
    ""
  );


  /*
   * ----------------------------------------------------------
   * STATUS
   * ----------------------------------------------------------
   */

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );


  const [
    error,
    setError,
  ] = useState(
    ""
  );


  /*
   * ==========================================================
   * LOAD CHILD JOURNEY
   * ==========================================================
   */

  const loadJourneyForChild =
    useCallback(
      async (
        userId: string,
        childId: string
      ) => {

        if (
          !userId ||
          !childId
        ) {

          setCurrentJourney(
            null
          );

          return;
        }


        try {

          const savedJourney =
            await getCurrentJourney(
              userId,
              childId
            );


          setCurrentJourney(
            savedJourney
          );

        } catch (
          loadError
        ) {

          console.error(
            "Unable to load Navigator Journey context:",
            loadError
          );


          setCurrentJourney(
            null
          );


          setError(
            "We couldn't load this child's current Journey."
          );

        }

      },
      []
    );


  /*
   * ==========================================================
   * LOAD ACCOUNT CONTEXT
   * ==========================================================
   */

  const loadAccountContext =
    useCallback(
      async (
        userId: string,
        preferredChildId?: string
      ) => {

        setLoading(
          true
        );


        setError(
          ""
        );


        try {

          const savedChildren =
            await getSavedChildren(
              userId
            );


          setChildren(
            savedChildren
          );


          /*
           * ----------------------------------------------------
           * NO SAVED CHILDREN
           * ----------------------------------------------------
           */

          if (
            savedChildren.length ===
            0
          ) {

            setSelectedChildIdState(
              ""
            );


            setCurrentJourney(
              null
            );


            return;
          }


          /*
           * ----------------------------------------------------
           * PREFERRED CHILD
           * ----------------------------------------------------
           *
           * Preserve the current selection when possible.
           * Otherwise use the first child that actually has an
           * active Journey.
           * ----------------------------------------------------
           */

          let childIdToUse =
            preferredChildId &&
            savedChildren.some(
              (
                child
              ) =>
                child.childId ===
                preferredChildId
            )

              ? preferredChildId

              : "";


          /*
           * ----------------------------------------------------
           * FIND FIRST CHILD WITH ACTIVE JOURNEY
           * ----------------------------------------------------
           */

          if (
            !childIdToUse
          ) {

            for (
              const child
              of savedChildren
            ) {

              const savedJourney =
                await getCurrentJourney(
                  userId,
                  child.childId
                );


              if (
                savedJourney
              ) {

                childIdToUse =
                  child.childId;


                setCurrentJourney(
                  savedJourney
                );


                break;
              }

            }

          }


          /*
           * ----------------------------------------------------
           * CHILDREN EXIST, BUT NONE HAVE AN ACTIVE JOURNEY
           * ----------------------------------------------------
           */

          if (
            !childIdToUse
          ) {

            childIdToUse =
              savedChildren[0]
                .childId;


            setCurrentJourney(
              null
            );

          }


          setSelectedChildIdState(
            childIdToUse
          );


          /*
           * We already loaded the Journey while looking for the
           * first active child above. Only fetch again when the
           * selected child came from an existing preference.
           */

          if (
            preferredChildId &&
            childIdToUse ===
              preferredChildId
          ) {

            await loadJourneyForChild(
              userId,
              childIdToUse
            );

          }

        } catch (
          loadError
        ) {

          console.error(
            "Unable to load Navigator account context:",
            loadError
          );


          setChildren(
            []
          );


          setSelectedChildIdState(
            ""
          );


          setCurrentJourney(
            null
          );


          setError(
            "We couldn't load your saved Journey information."
          );

        } finally {

          setLoading(
            false
          );

        }

      },
      [
        loadJourneyForChild,
      ]
    );


  /*
   * ==========================================================
   * AUTH WATCH
   * ==========================================================
   */

  useEffect(
    () => {

      let active =
        true;


      const unsubscribe =
        watchAuthState(
          async (
            user
          ) => {

            if (
              !active
            ) {
              return;
            }


            if (
              !user
            ) {

              setCurrentUserId(
                ""
              );


              setChildren(
                []
              );


              setSelectedChildIdState(
                ""
              );


              setCurrentJourney(
                null
              );


              setError(
                ""
              );


              setLoading(
                false
              );


              return;
            }


            setCurrentUserId(
              user.uid
            );


            await loadAccountContext(
              user.uid
            );

          }
        );


      return () => {

        active =
          false;


        unsubscribe();

      };

    },
    [
      loadAccountContext,
    ]
  );


  /*
   * ==========================================================
   * CHANGE CHILD
   * ==========================================================
   */

  const setSelectedChildId =
    useCallback(
      (
        childId: string
      ) => {

        if (
          !childId
        ) {
          return;
        }


        if (
          !children.some(
            (
              child
            ) =>
              child.childId ===
              childId
          )
        ) {
          return;
        }


        setSelectedChildIdState(
          childId
        );


        setError(
          ""
        );


        setLoading(
          true
        );


        void loadJourneyForChild(
          currentUserId,
          childId
        ).finally(
          () => {

            setLoading(
              false
            );

          }
        );

      },
      [
        children,
        currentUserId,
        loadJourneyForChild,
      ]
    );


  /*
   * ==========================================================
   * REFRESH
   * ==========================================================
   */

  const refresh =
    useCallback(
      async () => {

        if (
          !currentUserId
        ) {
          return;
        }


        await loadAccountContext(
          currentUserId,
          selectedChildId
        );

      },
      [
        currentUserId,
        selectedChildId,
        loadAccountContext,
      ]
    );


  /*
   * ==========================================================
   * SELECTED CHILD OBJECT
   * ==========================================================
   */

  const selectedChild =
    children.find(
      (
        child
      ) =>
        child.childId ===
        selectedChildId
    ) ??
    null;


  /*
   * ==========================================================
   * RETURN
   * ==========================================================
   */

  return {
    children,
    selectedChildId,
    selectedChild,
    currentJourney,
    loading,
    error,
    setSelectedChildId,
    refresh,
  };
}