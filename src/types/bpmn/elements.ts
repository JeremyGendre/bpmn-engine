import { BoundaryEventAttributes, EndEventAttributes, ExclusiveGatewayAttributes, ProcessAttributes, SequenceFlowAttributes, ServiceTaskAttributes, StartEventAttributes, UserTaskAttributes } from "./attributes";
import { ArrayOrSingle, IncomingFlows, OutgoingFlow, OutgoingFlows, WithAttributes, WithText } from "./general";

interface ConditionExpression extends WithText {}
export interface SequenceFlow extends WithAttributes<SequenceFlowAttributes>{
  'bpmn:conditionExpression'?: ConditionExpression;
}
export interface StartEvent extends OutgoingFlow, WithAttributes<StartEventAttributes> {}
export interface EndEvent extends IncomingFlows, WithAttributes<EndEventAttributes> {}
export interface UserTask extends OutgoingFlow, IncomingFlows, WithAttributes<UserTaskAttributes> {}
export interface ServiceTask extends OutgoingFlow, IncomingFlows, WithAttributes<ServiceTaskAttributes> {}
export interface ExclusiveGateway extends OutgoingFlows, IncomingFlows, WithAttributes<ExclusiveGatewayAttributes> {}
export interface BoundaryEvent extends OutgoingFlow, WithAttributes<BoundaryEventAttributes> {}

export interface Process extends WithAttributes<ProcessAttributes> {
  'bpmn:startEvent'?: StartEvent;
  'bpmn:endEvent'?: EndEvent;
  'bpmn:sequenceFlow': ArrayOrSingle<SequenceFlow>;
  'bpmn:userTask'?: ArrayOrSingle<UserTask>;
  'bpmn:serviceTask'?: ArrayOrSingle<ServiceTask>;
  'bpmn:exclusiveGateway'?: ArrayOrSingle<ExclusiveGateway>;
  'bpmn:boundaryEvent'?: ArrayOrSingle<BoundaryEvent>;
}

export enum ElementType {
  START_EVENT = 'bpmn:startEvent',
  END_EVENT = 'bpmn:endEvent',
  SEQUENCE_FLOW = 'bpmn:sequenceFlow',
  USER_TASK = 'bpmn:userTask',
  SERVICE_TASK = 'bpmn:serviceTask',
  EXCLUSIVE_GATEWAY = 'bpmn:exclusiveGateway',
  BOUNDARY_EVENT = 'bpmn:boundaryEvent',
}

export interface TypedStartEvent extends StartEvent {
  type: ElementType.START_EVENT;
}
export interface TypedEndEvent extends EndEvent {
  type: ElementType.END_EVENT;
}
export interface TypedSequenceFlow extends SequenceFlow {
  type: ElementType.SEQUENCE_FLOW;
}
export interface TypedUserTask extends UserTask {
  type: ElementType.USER_TASK;
}
export interface TypedServiceTask extends ServiceTask {
  type: ElementType.SERVICE_TASK;
}
export interface TypedExclusiveGateway extends ExclusiveGateway {
  type: ElementType.EXCLUSIVE_GATEWAY;
}
export interface TypedBoundaryEvent extends BoundaryEvent {
  type: ElementType.BOUNDARY_EVENT;
}

// <string> is the id of the element
export type TypedElements = Record<string, TypedStartEvent | TypedEndEvent | TypedSequenceFlow | TypedUserTask | TypedServiceTask | TypedExclusiveGateway | TypedBoundaryEvent>;