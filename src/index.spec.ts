import Engine from ".";
import { EngineOptions, EventType } from "./types/engine/engine";

describe('Test each elements', () => {
  it('user task', async () => {
    const engine = new Engine({
      filePath: './resources/test-user-task.bpmn',
    });
    let state = await engine.run()
    expect(state.lastActivity).toEqual('UserTask_1');
    expect(engine.isProcessStopped()).toBeTruthy();
    expect(state.outputs).toEqual({ variables: {}, tasks: {} });
    state = await engine.resumeWithId('UserTask_1', { 'action': 'valider' });
    expect(state.lastActivity).toEqual('EndEvent_1');
    expect(engine.isProcessStopped()).toBeTruthy();
    expect(state.outputs).toEqual({ variables: {}, tasks: {
      UserTask_1: { 'action': 'valider' }
    } });
  });

  it('service task', async () => {
    const engine = new Engine({
      filePath: './resources/test-service-task.bpmn',
      services: {
        testFunctionServiceTask1: () => {
          return 'Hello';
        },
        testFunctionServiceTask2: () => {
          return 42;
        }
      }
    });
    const state = await engine.run();
    expect(state.lastActivity).toEqual('EndEvent_1');
    expect(engine.isProcessStopped()).toBeTruthy();
    expect(state.outputs).toEqual({ variables: {
      testResultVariable: 42
    }, tasks: {
      ServiceTask_1: 'Hello'
    } });
  });

  it('gateway', async () => {
    const engine = new Engine({
      filePath: './resources/test-gateway.bpmn',
    });
    const state = await engine.run();
    console.log(state);
    expect(state.lastActivity).toEqual('EndEvent_1');
    expect(engine.isProcessStopped()).toBeTruthy();
    expect(state.outputs).toEqual({ variables: {}, tasks: {} });
  });

  it('gateway default flow', async () => {
    const engine = new Engine({
      filePath: './resources/test-gateway-default.bpmn',
    });
    const state = await engine.run();
    expect(state.lastActivity).toEqual('EndEvent_2');
    expect(engine.isProcessStopped()).toBeTruthy();
    expect(state.outputs).toEqual({ variables: {}, tasks: {} });
  });

  it('signal event', async () => {
    const engine = new Engine({
      filePath: './resources/test-signal-event.bpmn',
    });
    let state = await engine.run();
    expect(state.lastActivity).toEqual('UserTask_1');
    expect(engine.isProcessStopped()).toBeTruthy();
    expect(state.outputs).toEqual({ variables: {}, tasks: {} });
    state = await engine.resumeWithId('UserTask_1');
    expect(state.lastActivity).toEqual('UserTask_2');
    expect(engine.isProcessStopped()).toBeTruthy();
    expect(state.outputs).toEqual({ variables: {}, tasks: {} });
    state = await engine.resumeWithId('SignalEvent_1');
    expect(state.lastActivity).toEqual('UserTask_1');
    expect(engine.isProcessStopped()).toBeTruthy();
    expect(state.outputs).toEqual({ variables: {}, tasks: {} });
    state = await engine.resumeWithId('UserTask_1');
    expect(state.lastActivity).toEqual('UserTask_2');
    expect(engine.isProcessStopped()).toBeTruthy();
    expect(state.outputs).toEqual({ variables: {}, tasks: {} });
    state = await engine.resumeWithId('UserTask_2');
    expect(state.lastActivity).toEqual('EndEvent_1');
    expect(engine.isProcessStopped()).toBeTruthy();
    expect(state.outputs).toEqual({ variables: {}, tasks: {} });
  });
});

const sophisticatedBpmnFile = './resources/internal-validation-test.bpmn';

const config: EngineOptions = {
  filePath: sophisticatedBpmnFile,
  services: {
    travaux_resumerWorkflowParentApresRefus_1: () => {
      return {
        financialCompetence: 1000,
        technicalCompetence: 2500,
      }
    },
    travaux_resumerWorkflowParentApresValidation_1: () => {
      return {
        financialCompetence: 900,
        technicalCompetence: 1200,
      }
    }
  },
  logCallback: () => {
    //console.log(log);
  }
};

describe('More sophisticated engine', () => {
  it('check process running depending on initialization', async () => {
    const engine = new Engine(config)
    const engine2 = new Engine();
    engine2.useFile(sophisticatedBpmnFile);
    engine2.addLogCallback(config.logCallback);
    engine2.addService('travaux_resumerWorkflowParentApresRefus_1', config.services.travaux_resumerWorkflowParentApresRefus_1);
    engine2.addService('travaux_resumerWorkflowParentApresValidation_1', config.services.travaux_resumerWorkflowParentApresValidation_1);

    const stateEngine1 = await engine.run();
    const stateEngine2 = await engine2.run();
    expect(stateEngine1.outputs).toEqual(stateEngine2.outputs);
    expect(stateEngine1.process).toEqual(stateEngine2.process);
    expect(stateEngine1.lastActivity).toEqual(stateEngine2.lastActivity);
    expect(stateEngine1.lastLog.eventType).toEqual(stateEngine2.lastLog.eventType);
  });

  it('check process stop', async () => {
    const engine = new Engine(config);
    const stateEngine = await engine.run();
    expect(stateEngine.outputs).toEqual({ variables: {}, tasks: {} });
    expect(stateEngine.lastActivity).toEqual('UserTask_ValiderBonDeTravail');
    expect(stateEngine.lastLog.errorMessage).toBeUndefined();
    expect(stateEngine.lastLog.eventType).toEqual(EventType.WAIT);
    expect(engine.isProcessStopped()).toBeTruthy();
  });

  it('check process resuming', async () => {
    const engine = new Engine(config);
    await engine.run();
    expect(engine.isProcessStopped()).toBeTruthy();
    const stateAfterResuming = await engine.resumeWithId('UserTask_ValiderBonDeTravail', { 'action': 'refuser' });
    expect(engine.isProcessStopped()).toBeTruthy();
    expect(stateAfterResuming.outputs).toEqual({ variables: {}, tasks: {
      UserTask_ValiderBonDeTravail: { 'action': 'refuser' }
    } });
    expect(stateAfterResuming.lastActivity).toEqual('UserTask_DonnerRaisonRefusPourValidationInterne');
    expect(stateAfterResuming.lastLog.errorMessage).toBeUndefined();
  });

  it('check signal', async () => {
    const engine = new Engine(config);
    await engine.run();
    await engine.resumeWithId('UserTask_ValiderBonDeTravail', { 'action': 'refuser' });
    const state = await engine.resumeWithId('SignalEvent_DonnerRaisonCloture');
    expect(state.outputs).toEqual({ variables: {}, tasks: {
      UserTask_ValiderBonDeTravail: { 'action': 'refuser' }
    } });
    expect(state.lastActivity).toEqual('UserTask_ValiderBonDeTravail');
    expect(state.lastLog.errorMessage).toBeUndefined();
    expect(state.lastLog.eventType).toEqual(EventType.WAIT);
    expect(engine.isProcessStopped()).toBeTruthy();
  });

  it('check process complete after refusal', async () => {
    const engine = new Engine(config);
    await engine.run();
    await engine.resumeWithId('UserTask_ValiderBonDeTravail', { 'action': 'refuser' });
    const stateAfterResuming = await engine.resumeWithId('UserTask_DonnerRaisonRefusPourValidationInterne');
    expect(stateAfterResuming.outputs).toEqual({ variables: {
      test: {
        financialCompetence: 1000,
        technicalCompetence: 2500
      }
    }, tasks: {
      UserTask_ValiderBonDeTravail: { 'action': 'refuser' }
    } });
    expect(stateAfterResuming.lastActivity).toEqual('EndEvent_Cloture');
    expect(stateAfterResuming.lastLog.errorMessage).toBeUndefined();
    expect(engine.isProcessStopped()).toBeTruthy();
  });

  it('check process complete after validation', async () => {
    const engine = new Engine(config);
    await engine.run();
    const stateAfterResuming = await engine.resumeWithId('UserTask_ValiderBonDeTravail', { 'action': 'valider' });
    expect(stateAfterResuming.outputs).toEqual({ variables: {}, tasks: {
      ServiceTask_ResumerWorkflowParentApresValidation: {
        financialCompetence: 900,
        technicalCompetence: 1200
      },
      UserTask_ValiderBonDeTravail: { 'action': 'valider' }
    } });
    expect(stateAfterResuming.lastActivity).toEqual('EndEvent_Cloture');
    expect(stateAfterResuming.lastLog.errorMessage).toBeUndefined();
    expect(engine.isProcessStopped()).toBeTruthy();
  });
});