import { MouseEvent, useCallback } from "react";
import { Categories_Event } from "@core/types/event.types";
import { getElemById } from "@web/common/utils/grid.util";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";

import { State_GridDraft, Util_GridDraft } from "./useDraftUtil";
import { useEventListener } from "../mouse/useEventListener";

export const useGridClick = (
  draftState: State_GridDraft,
  draftUtil: Util_GridDraft
) => {
  const {
    draft,
    dragStatus,
    isDrafting,
    isDragging,
    isResizing,
    reduxDraft,
    reduxDraftType,
    resizeStatus,
  } = draftState;

  const { discard, setDraft, stopDragging, stopResizing, submit } = draftUtil;

  const getNextAction = useCallback(
    (category: Categories_Event) => {
      let shouldSubmit: boolean;
      let hasMoved: boolean;
      const isNew = !draft?._id;

      if (category === Categories_Event.TIMED) {
        hasMoved = resizeStatus?.hasMoved || dragStatus?.hasMoved;
        shouldSubmit = !draft.isOpen;
      } else if (category === Categories_Event.ALLDAY) {
        hasMoved = dragStatus?.hasMoved;
        shouldSubmit = hasMoved;
      }

      const clickedOnExisting = !isNew && !hasMoved;
      const shouldOpenForm = (isNew || clickedOnExisting) && !draft?.isOpen;

      return { shouldOpenForm, shouldSubmit };
    },
    [draft?._id, draft?.isOpen, dragStatus?.hasMoved, resizeStatus?.hasMoved]
  );

  const _onAllDayRowMouseUp = useCallback(() => {
    if (isDragging) {
      stopDragging();
    }

    if (!draft || !isDrafting) {
      console.log("nothing, returning...");
      return;
    }

    const { shouldSubmit, shouldOpenForm } = getNextAction(
      Categories_Event.ALLDAY
    );

    if (shouldOpenForm) {
      setDraft((_draft) => {
        return { ..._draft, isOpen: true };
      });
      return;
    }

    shouldSubmit && submit(draft);
  }, [
    isDragging,
    draft,
    isDrafting,
    getNextAction,
    submit,
    stopDragging,
    setDraft,
  ]);

  const _onMainGridMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!draft || !isDrafting) {
        return;
      }

      if (isDrafting && reduxDraft === Categories_Event.ALLDAY) {
        discard();
        return;
      }

      if (isDrafting && reduxDraftType === Categories_Event.SOMEDAY) {
        e.stopPropagation();
        discard();
        return;
      }

      if (isResizing) {
        stopResizing();
      }

      if (isDragging) {
        stopDragging();
      }

      const { shouldSubmit, shouldOpenForm } = getNextAction(
        Categories_Event.TIMED
      );
      if (shouldOpenForm) {
        setDraft((_draft) => {
          return { ..._draft, isOpen: true };
        });
        return;
      }

      shouldSubmit && submit(draft);
    },
    [
      discard,
      draft,
      getNextAction,
      isDrafting,
      isDragging,
      isResizing,
      reduxDraft,
      reduxDraftType,
      setDraft,
      stopDragging,
      stopResizing,
      submit,
    ]
  );

  useEventListener(
    "mouseup",
    _onAllDayRowMouseUp,
    getElemById(ID_GRID_ALLDAY_ROW)
  );
  useEventListener("mouseup", _onMainGridMouseUp, getElemById(ID_GRID_MAIN));
};
