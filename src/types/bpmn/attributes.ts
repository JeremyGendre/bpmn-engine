export interface BaseAttributes {
  id: string;
  name?: string;
}

export interface GatewayAttributes extends BaseAttributes {
  default?: string; // the id of the default sequence flow
}

export interface ExclusiveGatewayAttributes extends GatewayAttributes {}

export interface ServiceTaskAttributes extends BaseAttributes {
  "camunda:expression"?: string; // the expression to evaluate
  "camunda:resultVariable"?: string; // the name of the variable to store the result in
}

export interface UserTaskAttributes extends BaseAttributes {}
export interface StartEventAttributes extends BaseAttributes {}
export interface EndEventAttributes extends BaseAttributes {}
export interface SequenceFlowAttributes extends BaseAttributes {
  sourceRef: string; // the id of the source element
  targetRef: string; // the id of the target element
}
export interface BoundaryEventAttributes extends BaseAttributes {
  attachedToRef?: string; // the id of the element this event is attached to
}

export interface ProcessAttributes extends BaseAttributes {
  isExecutable: "true" | "false"; // whether the process is executable
  "camunda:historyTimeToLive"?: string;
}

export interface SignalAttributes extends BaseAttributes {}
