export type ArrayOrSingle<T> = Array<T> | T;

export interface OutgoingFlows {
  "bpmn:outgoing": ArrayOrSingle<string>;
}
export interface IncomingFlows {
  "bpmn:incoming": ArrayOrSingle<string>;
}

export interface OutgoingFlow {
  "bpmn:outgoing"?: string;
}
export interface IncomingFlow {
  "bpmn:incoming"?: string;
}

export interface WithText {
  "#text": string;
}

export interface WithAttributes<T> {
  attributes: T;
}
