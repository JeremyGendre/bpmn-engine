import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import { Process, TypedElements, ElementType, TypedSequenceFlow } from './types/bpmn/elements';
import { EventType, Log, State } from './types/engine/engine';
import BPMNError from './common/error';
import { sanitizeEval } from './helper/eval';

// @Doc : https://github.com/NaturalIntelligence/fast-xml-parser/blob/master/docs/v4/2.XMLparseOptions.md
const xmlParserOptions = {
  ignoreAttributes : false,
  attributeNamePrefix : '',
  attributesGroupName: 'attributes',
};

export default class Engine {
  private state: State;
  private typedElements: TypedElements;

  constructor(filePath?: string) {
    if (filePath) {
      this.useFile(filePath);
    }
  }

  useFile(filePath: string) {
    const xmlDataStr = fs.readFileSync(filePath, 'utf8');
  
    const parser = new XMLParser(xmlParserOptions);
    const jsonObj = parser.parse(xmlDataStr);
  
    const definitions = jsonObj['bpmn:definitions'];
    this.setState({
      process: definitions['bpmn:process'],
      logs: [],
      lastActivity: '',
      outputs: {
        variables: {},
        tasks: {}
      }
    });
  }

  getProcess(): Process {
    return this.state.process;
  }

  /* get the element listed in an object to be more easily accessible */
  private setTypedElements(): TypedElements {
    const result: TypedElements = {};
    if(!this.state.process) {
      this.typedElements = result;
      return;
    }
    for (const key in this.state.process) {
      // ignore attributes of process
      if(key === 'attributes') continue;
      const element = this.state.process[key];
      // if the element is an array, we need to iterate over it
      if (Array.isArray(element)) {
        element.forEach((el) => {
          if(el.attributes?.id){
            result[el.attributes.id] = {
              type: key,
              ...el
            };
          }
        });
      } else if(element.attributes?.id) { // if the element is not an array, we can directly add it to the result if it has an id
        result[element.attributes.id] = {
          type: key,
          ...element
        };
      }
    }
    this.typedElements = result;
  }

  isProcessExecutable(process?: Process): boolean {
    const processToEvaluate = process ? process : this.state.process;
    return processToEvaluate?.attributes.isExecutable === 'true';
  }

  /* set the state of the process (for example, after a process has been started or after a process has been stopped) */
  setState(state: State) {
    if (!this.isProcessExecutable(state.process)) {
      throw new Error('Process is not executable');
    }
    this.state = state;
    this.setTypedElements();
  }

  private getLastLog(): Log {
    return this.state.logs[this.state.logs.length - 1];
  }

  private addLog(eventType: EventType, id?: string, errorMessage?: string): Log {
    const log: Log = {
      eventType,
      timestamp: Date.now(),
      id,
      errorMessage
    };
    if (id) {
      this.state.lastActivity = id;
    }
    this.state.logs.push(log);
    return log;
  }

  private getTypedElementOrThrow(id: string) {
    const element = this.typedElements[id];
    if (!element) {
      throw new BPMNError(`Element with id ${id} not found`);
    }
    return element;
  }

  run() {
    if (!this.isProcessExecutable()) {
      throw new BPMNError('Process is not executable');
    }
    console.log('Running engine');
    const processElements = this.typedElements;
    try {
      while(!([EventType.END_PROCESS, EventType.ERROR, EventType.WAIT, EventType.STOP].includes(this.getLastLog()?.eventType))) {
        const lastLog = this.getLastLog();
        // if there is no current step, we need to start the process
        if (!lastLog) {
          this.addLog(EventType.START_PROCESS);
          if (!this.state.process['bpmn:startEvent']?.attributes?.id) {
            this.addLog(EventType.ERROR, undefined, 'No start event found');
            break;
          }
          // start the process with the first event that should be a startEvent
          const startEvent = this.state.process['bpmn:startEvent'];
          this.addLog(EventType.START_ACTIVITY, startEvent.attributes.id);
        } else if (lastLog.eventType === EventType.RESUMING) {
          // if we are resuming, we need to find the previous step and resume from there
          const resumingElement = this.getTypedElementOrThrow(lastLog.id);
          if (resumingElement.type === ElementType.BOUNDARY_EVENT) {
            // end the attachedref
            const elementAttachedTo = processElements[resumingElement.attributes.attachedToRef];
            if (!elementAttachedTo) {
              throw new BPMNError(`Can't resume process : attached ref element with id ${resumingElement.attributes.attachedToRef} not found for boundary event with id ${resumingElement.attributes.id}`);
            }
            this.addLog(EventType.END_ACTIVITY, elementAttachedTo.attributes.id);
            this.addLog(EventType.START_ACTIVITY, resumingElement.attributes.id);
          } else {
            this.addLog(EventType.END_ACTIVITY, resumingElement.attributes.id);
          }
        } else {
          const lastElement = this.getTypedElementOrThrow(lastLog.id);
          switch (lastElement.type) {
            case ElementType.START_EVENT: {
              if (lastLog.eventType === EventType.END_ACTIVITY) {
                const nextStep = this.getTypedElementOrThrow(lastElement['bpmn:outgoing']);
                this.addLog(EventType.TAKE_FLOW, nextStep.attributes.id);
              } else {
                this.addLog(EventType.END_ACTIVITY, lastElement.attributes.id);
              }
              break;
            }
            case ElementType.SEQUENCE_FLOW:{
              const nextStep = this.getTypedElementOrThrow(lastElement.attributes.targetRef);
              this.addLog(EventType.START_ACTIVITY, nextStep.attributes.id);
              break;
            }
            case ElementType.BOUNDARY_EVENT: {
              const targetElement = this.getTypedElementOrThrow(lastElement.attributes?.attachedToRef);
              this.addLog(EventType.END_ACTIVITY, targetElement.attributes.id);
              this.addLog(EventType.START_ACTIVITY, lastElement.attributes.id);
              this.addLog(EventType.END_ACTIVITY, lastElement.attributes.id);
              const nextStep = this.getTypedElementOrThrow(lastElement['bpmn:outgoing']);
              this.addLog(EventType.TAKE_FLOW, nextStep.attributes.id);
              break;
            }
            case ElementType.USER_TASK: {
              if(lastLog.eventType === EventType.START_ACTIVITY) {
                this.addLog(EventType.WAIT, lastElement.attributes.id);
              } else {
                const nextStep = this.getTypedElementOrThrow(lastElement['bpmn:outgoing']);
                this.addLog(EventType.TAKE_FLOW, nextStep.attributes.id);
              }
              break;
            }
            case ElementType.SERVICE_TASK: {
              if(lastLog.eventType === EventType.START_ACTIVITY) {
                // todo execute function
                this.addLog(EventType.END_ACTIVITY, lastElement.attributes.id);
              } else {
                const nextStep = this.getTypedElementOrThrow(lastElement['bpmn:outgoing']);
                this.addLog(EventType.TAKE_FLOW, nextStep.attributes.id);
              }
              break;
            }
            case ElementType.EXCLUSIVE_GATEWAY: {
              // handle the different flows
              const outgoingFlows = lastElement['bpmn:outgoing'];
              if (!outgoingFlows) {
                throw new BPMNError('No outgoing flows found');
              }
              // if array, we need to iterate over it and evaluate each flow condition or default if no condition is met
              if (Array.isArray(outgoingFlows)) {
                let chosenFlow: TypedSequenceFlow | undefined;
                for (let i = 0; i < outgoingFlows.length; i++) {
                  const flow = this.getTypedElementOrThrow(outgoingFlows[i]);
                  const sanitizedCondition = sanitizeEval(flow['bpmn:conditionExpression']['#text']);
                  const condition = !!(new Function(`return ${sanitizedCondition}`).bind(this)());
                  if (flow['bpmn:conditionExpression'] && condition) {
                    chosenFlow = flow as TypedSequenceFlow;
                  }
                }
                if(!chosenFlow) {
                  // if no flow found yet, check if there is a default flow
                  const defaultFlowId = lastElement.attributes.default;
                  if (defaultFlowId) {
                    chosenFlow = this.getTypedElementOrThrow(defaultFlowId) as TypedSequenceFlow;
                  }
                }
                if (chosenFlow) {
                  this.addLog(EventType.END_ACTIVITY, lastLog.id);
                  this.addLog(EventType.TAKE_FLOW, chosenFlow.attributes.id);
                } else {
                  throw new BPMNError(`No conditionnal flow taken and no default flow found for exclusive gateway ${lastLog.id}`);
                }
              } else {
                const flow = this.getTypedElementOrThrow(outgoingFlows);
                this.addLog(EventType.END_ACTIVITY, lastLog.id);
                this.addLog(EventType.TAKE_FLOW, flow.attributes.id);
              }
              break;
            }
            case ElementType.END_EVENT: {
              this.addLog(EventType.END_PROCESS, lastElement.attributes.id);
              break;
            }
          }
        }
      }
    } catch (error) {
      // if the error is a BPMNError, we can add it to the logs
      if (error instanceof BPMNError) {
        this.addLog(EventType.ERROR, undefined, error.message);
       } else {
         throw error; // else we let the others errors bubble up
       }
    }
    if(this.getLastLog()?.eventType !== EventType.END_PROCESS) {
      this.addLog(EventType.STOP);
    }
    console.log('Engine finished');
    return this.state;
  }

  resumeWithId(id: string, result?: any) {
    if (!this.state.process) {
      throw new BPMNError("Can't resume process : no process found");
    }
    const processElements = this.typedElements;
    const resumingElement = processElements[id];
    if (!resumingElement) {
      throw new BPMNError(`Can't resume process : element with id ${id} not found`);
    }
    if (this.getLastLog()?.eventType !== EventType.STOP) {
      throw new BPMNError("Can't resume process : process is not stopped");
    }
    this.addLog(EventType.RESUMING, id);
    if (result) {
      this.state.outputs.tasks[id] = result;
    }
    return this.run();
  }
}