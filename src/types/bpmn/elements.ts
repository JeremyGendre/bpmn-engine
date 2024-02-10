import { BoundaryEventAttributes, EndEventAttributes, ExclusiveGatewayAttributes, SequenceFlowAttributes, ServiceTaskAttributes, StartEventAttributes, UserTaskAttributes } from "./attributes";
import { ArrayOrSingle, IncomingFlow, OutgoingFlow, WithAttributes, WithText } from "./general";

export interface StartEvent extends OutgoingFlow, WithAttributes<StartEventAttributes> {}

export interface EndEvent extends IncomingFlow, WithAttributes<EndEventAttributes> {}

interface ConditionExpression extends WithText {}
export interface SequenceFlow extends WithAttributes<SequenceFlowAttributes>{
  'bpmn:conditionExpression'?: ConditionExpression;
}

export interface UserTask extends OutgoingFlow, IncomingFlow, WithAttributes<UserTaskAttributes> {}

export interface ServiceTask extends OutgoingFlow, IncomingFlow, WithAttributes<ServiceTaskAttributes> {}
export interface ExclusiveGateway extends OutgoingFlow, IncomingFlow, WithAttributes<ExclusiveGatewayAttributes> {}

export interface BoundaryEvent extends OutgoingFlow, WithAttributes<BoundaryEventAttributes> {}

export interface Process {
  'bpmn:startEvent'?: StartEvent;
  'bpmn:endEvent'?: EndEvent;
  'bpmn:sequenceFlow': ArrayOrSingle<SequenceFlow>;
  'bpmn:userTask'?: ArrayOrSingle<UserTask>;
  'bpmn:serviceTask'?: ArrayOrSingle<ServiceTask>;
  'bpmn:exclusiveGateway'?: ArrayOrSingle<ExclusiveGateway>;
  'bpmn:boundaryEvent'?: ArrayOrSingle<BoundaryEvent>;
}