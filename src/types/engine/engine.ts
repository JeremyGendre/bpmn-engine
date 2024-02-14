import { Process } from "../bpmn/elements";

// the different types of events that can happen
export enum EventType {
  START_PROCESS = 'start:process',
  END_PROCESS = 'end:process',
  START_ACTIVITY = 'start:activity',
  END_ACTIVITY = 'end:activity',
  TAKE_FLOW = 'take:flow',
  RESUMING = 'resuming',
  WAIT = 'wait',
  ERROR = 'error'
}

export interface Log {
  eventType: EventType;
  timestamp: string;
  id?: string;
  errorMessage?: string;
}

export interface State {
  process: Process;
  lastLog?: Log;
  lastActivity: string; // the id of the last activity
  outputs: Outputs;
}

// where the results of the tasks are stored
export interface Outputs {
  variables: Record<string, any>;
  tasks: Record<string, any>;
}

export type Service = (state: State) => any | ((state: State) => Promise<any>);

// the services that can be called by the engine
export interface Services {
  [key: string]: Service;
}

export interface EngineOptions {
  filePath?: string;
  services?: Services;
  logCallback?: (log: Log) => void;
}