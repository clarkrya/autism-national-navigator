import ChildName from "./ChildName";
import ChildAge from "./ChildAge";
import StateSelector from "./StateSelector";
import JourneyStage from "./JourneyStage";
import Supports from "./Supports";
import Priority from "./Priority";

export const journeyQuestions = [
  {
    id: "childName",
    component: ChildName,
    field: "childName",
  },
  {
    id: "childAge",
    component: ChildAge,
    field: "childAge",
  },
  {
    id: "state",
    component: StateSelector,
    field: "state",
  },
  {
    id: "journeyStage",
    component: JourneyStage,
    field: "journeyStage",
  },
  {
    id: "supports",
    component: Supports,
    field: "supports",
  },
  {
    id: "priority",
    component: Priority,
    field: "priority",
  },
];