import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import { Process, TypedElements, ElementType, TypedSequenceFlow } from './types/bpmn/elements';
import { EventType, Log, Services, State } from './types/engine/engine';
import BPMNError from './common/error';
import { sanitizeEval } from './helper/eval';

// @Doc : https://github.com/NaturalIntelligence/fast-xml-parser/blob/master/docs/v4/2.XMLparseOptions.md
const xmlParserOptions = {
  ignoreAttributes : false,
  attributeNamePrefix : '',
  attributesGroupName: 'attributes',
};

/**
 * @class Engine
 * @description BPMN engine, used to run a BPMN process made with camunda
 * @author Jérémy Gendre
 */
export default class Engine {
  /* the state of the process */
  private state: State;
  /* the elements of the process, listed in an object to be more easily accessible */
  private typedElements: TypedElements;
  /* the services that can be used during the process */
  private services: Services = {};

  constructor(config?: { filePath?: string; services?: Services }) {
    if (config.filePath) {
      this.useFile(config.filePath);
    }
    if (config.services) {
      this.services = config.services;
    }
  }

  /* use a file to set the process or reset it */
  useFile(filePath: string): Engine {
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
    return this;
  }

  getProcess(): Process {
    return this.state.process;
  }

  /* list the process elements in an object to be more easily accessible */
  private setupTypedElements(): TypedElements {
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
      } else if(element.attributes?.id) { 
        // if the element is not an array, we can directly add it to the result if it has an id
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

  /* set the state of the process (for example, after a process has been started or after a process has been stopped and we need to resume from a state) */
  setState(state: State): Engine {
    if (!this.isProcessExecutable(state.process)) {
      throw new Error('Process is not executable');
    }
    this.state = state;
    // as the state changed, we need to update the typed elements
    this.setupTypedElements();
    return this;
  }

  private getLastLog(): Log {
    return this.state.logs[this.state.logs.length - 1];
  }

  private addLog(eventType: EventType, id?: string, errorMessage?: string): Log {
    const log: Log = {
      eventType,
      timestamp: Date.now()
    };
    if (id) {
      log.id = id;
      this.state.lastActivity = id;
    }
    if(errorMessage) {
      log.errorMessage = errorMessage;
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

  async run(): Promise<State> {
    if (!this.isProcessExecutable()) {
      throw new BPMNError('Process is not executable');
    }
    console.log('Running engine');
    const processElements = this.typedElements;
    try {
      while(!([EventType.END_PROCESS, EventType.ERROR, EventType.WAIT, EventType.STOP].includes(this.getLastLog()?.eventType))) {
        const lastLog = this.getLastLog();
        // if there is no current log, it means the process has not started yet, so we start it
        if (!lastLog) {
          this.addLog(EventType.START_PROCESS);
          if (!this.state.process['bpmn:startEvent']?.attributes?.id) {
            throw new BPMNError('No start event found');
          }
          // start the process with the first event that should be a startEvent
          const startEvent = this.state.process['bpmn:startEvent'];
          this.addLog(EventType.START_ACTIVITY, startEvent.attributes.id);
        } else if (lastLog.eventType === EventType.RESUMING) {
          // if we are resuming, we need to find the previous step and resume from there
          const resumingElement = this.getTypedElementOrThrow(lastLog.id);
          if (resumingElement.type === ElementType.BOUNDARY_EVENT) {
            // if the resuming element is a boundary event, we need to check the attached element
            const elementAttachedTo = processElements[resumingElement.attributes.attachedToRef];
            if (!elementAttachedTo) {
              throw new BPMNError(`Can't resume process : attached ref element with id ${resumingElement.attributes.attachedToRef} not found for boundary event with id ${resumingElement.attributes.id}`);
            }
            this.addLog(EventType.START_ACTIVITY, resumingElement.attributes.id);
          } else {
            // else we just resume the element by ending it
            this.addLog(EventType.END_ACTIVITY, resumingElement.attributes.id);
          }
        } else {
          // get the last element with type property
          const lastElement = this.getTypedElementOrThrow(lastLog.id);
          // depending on the type of the last element, we need to handle the next step
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
              const attachedElement = this.getTypedElementOrThrow(lastElement.attributes?.attachedToRef);
              // end the activity of the attached element
              this.addLog(EventType.END_ACTIVITY, attachedElement.attributes.id);
              // end itself
              this.addLog(EventType.END_ACTIVITY, lastElement.attributes.id);
              // take the flow to the next step
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
                // if the service task has an expression, we need to evaluate it
                const camundaExpression = lastElement.attributes['camunda:expression'];
                if (camundaExpression) {
                  const method = this.services[camundaExpression];
                  if (method) {
                    const result = await method(this.state);
                    const resultVariable = lastElement.attributes['camunda:resultVariable'];
                    // store the result in the outputs if necessary
                    if (resultVariable && result) {
                      this.state.outputs.variables[resultVariable] = result;
                    } else if (result) {
                      this.state.outputs.tasks[lastElement.attributes.id] = result;
                    }
                  }
                }
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
                  // sanitize the condition before evaluating it
                  const sanitizedCondition = sanitizeEval(flow['bpmn:conditionExpression']['#text']);
                  // evaluate the condition
                  const condition = !!(new Function(`return ${sanitizedCondition}`).bind(this)());
                  // if the condition is met, we take the flow
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
                // if no flow found, throw an error, else take the flow
                if (chosenFlow) {
                  this.addLog(EventType.END_ACTIVITY, lastLog.id);
                  this.addLog(EventType.TAKE_FLOW, chosenFlow.attributes.id);
                } else {
                  throw new BPMNError(`No conditionnal flow taken and no default flow found for exclusive gateway ${lastLog.id}`);
                }
              } else {
                // if not an array, we can directly take the flow
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
      this.addLog(EventType.ERROR, undefined, error.message);
      // if the error is a BPMNError, we can add it to the logs
      // if (error instanceof BPMNError) {
      //   this.addLog(EventType.ERROR, undefined, error.message);
      // } else {
      //   throw error; // else we let the others errors bubble up
      // }
    }
    if(this.getLastLog()?.eventType !== EventType.END_PROCESS) {
      this.addLog(EventType.STOP);
    }
    console.log('Engine finished');
    return this.state;
  }

  async resumeWithId(id: string, result?: any): Promise<State> {
    if (!this.state.process) {
      throw new BPMNError("Can't resume process : no process found");
    }
    const resumingElement = this.typedElements[id];
    if (!resumingElement) {
      throw new BPMNError(`Can't resume process : element with id ${id} not found`);
    }
    if (this.getLastLog()?.eventType !== EventType.STOP) {
      throw new BPMNError("Can't resume process : process is not stopped");
    }
    // if the resuming element is a boundary event, we need to check the attached element.
    // if the attached element is not the last activity, we throw an error
    if (resumingElement.type === ElementType.BOUNDARY_EVENT && resumingElement.attributes.attachedToRef !== this.state.lastActivity) {
      throw new BPMNError(`Can't resume process : attached ref element with id ${resumingElement.attributes.attachedToRef} does not correspond to the last process activity ${this.state.lastActivity}`);
    } else if (resumingElement.attributes.id !== this.state.lastActivity) {
      throw new BPMNError(`Can't resume process : resuming element ${id} does not correspond to the last process activity ${this.state.lastActivity}`);
    }
    this.addLog(EventType.RESUMING, id);
    if (result) {
      this.state.outputs.tasks[id] = result;
    }
    return this.run();
  }
}