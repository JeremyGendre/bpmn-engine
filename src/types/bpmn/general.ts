export type ArrayOrSingle<T> = Array<T> | T;

export interface OutgoingFlow {
  'bpmn:outgoing': ArrayOrSingle<string>;
}
export interface IncomingFlow {
  'bpmn:incoming': ArrayOrSingle<string>;
}
export interface WithText {
  '#text': string;
}

export interface WithAttributes<T> {
  attributes: T;
} 