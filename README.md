# BPMN Engine

Run a simple BPMN instance, made with camunda

## Installation

From package : 

`npm install @jeremygendre/bpmn-engine`

If you want to test it locally, after cloning the project :

- `npm install`    => install dep
- `npm run start`  => start launch script in `src/examples/index.ts`


## Accepted elements

| Element | multiple | required | description |
|---------|:--------:|:--------:|-------------|
| `bpmn:startEvent` | no | yes | A start event is the entry point of any BPMN schema. It is required to start the process. Only one start event is supported |
| `bpmn:endEvent` | yes | yes | End events are the last step of a BPMN schema. Schemas must contain at least one end event to terminate properly. |
| `bpmn:sequenceFlow` | yes | yes | Sequence flows are the linking elements they are required to link 2 elements. |
| `bpmn:userTask` | yes | no | User tasks are elements that paused the process. It needs to be resumed afterwards to be completed. |
| `bpmn:serviceTask` | yes | no | Services tasks can execute code from services, given in the engine configuration |
| `bpmn:exclusiveGateway` | yes | no | Gateways are usefull to make choices based on flows conditions. |
| `bpmn:boundaryEvent` | yes | no | Boundary events are signals, used to jump to another point of the process |

## Usage

- **The `Engine` object**

The `Engine` constructor has a `config` parameter to initialize the Engine instance.

`const engine = new Engine(config)`

Here are the available properties of the `config` object :

| property | type | required | description |
|----------|:----:|:--------:|-------------|
| `filePath` | `string` | no | Path to the `.bpmn` file to use when running the process |
| `services` | `Record<string, (state: State) => any \| ((state: State) => Promise<any>)>` | no | The different services that can be called in a service task |
| `logCallback` | `(log: Log) => void` | no | Optional callback to call when a log is added  |

Example :
```typescript
const engine = new Engine({
  filePath: './resources/internal-validation-test.bpmn',
  services: {
    method1: (state: State) => {
      return {
        resultProperty1: 1000,
        resultProperty2: 'test',
      }
    },
    method2: (state: State) => {
      return 42
    }
  },
  logCallback: (log) => {
    console.log(log)
  }
});
```


- **`Engine` Public methods**

| method | return value | args | description |
|--------|:------------:|:----:|-------------|
| `addService` | `this` | `(name: string, method: Service)` | Add a service to the engine |
| `removeService` | `this` | `(name: string)` | Remove a service from the engine |
| `addLogCallback` | `this` | `(callback: (log: Log) => void)` | Add a callback to call when a log is added |
| `useFile` | `this` | `(filePath: string)` | Specify a file to use to run the process |
| `getProcess` | `Process` | - | Get the current process used by the engine |
| `isProcessExecutable` | `boolean` | `(process?: Process)` | Check if the process (given via argument or by default the actual used process) is executable |
| `setState` | `this` | `(state: State)` | Set the state that the engine have to use when running |
| `getState` | `State` | - | Get the state of the engine |
| `run` | `Promise<State>` | - | Run the engine |
| `resumeWithId` | `Promise<State>` | `(id: string, result?: any)` | Resume the engine from the element with id `id`. You can also give an optionnal `result` that will be stored in the state's output |


## Full Example

```typescript
import Engine from "@jeremygendre/bpmn-engine";

const logs = [];

const engine = new Engine({
  filePath: './path/to/your-bpmn-file.bpmn',
  services: {
    travaux_resumerWorkflowParentApresRefus_1: (state) => {
      // you can get the state of the process, and do actions based on that
      return {
        financialCompetence: 1000,
        technicalCompetence: 2500,
      }
    },
    travaux_resumerWorkflowParentApresValidation_1: (state) => {
      // you can get the state of the process, and do actions based on that
      return {
        financialCompetence: 900,
        technicalCompetence: 1200,
      }
    }
  },
  logCallback: (log) => {
    // handle the history of the process if you want
    logs.push(log);
  }
});

async function start(){
  await engine.run();
  await engine.resumeWithId('UserTask_ValiderBonDeTravail', { 'action': 'refuser' });
  const state = await engine.resumeWithId('UserTask_DonnerRaisonRefusPourValidationInterne');
  console.log(state);
  console.log(logs);
}

start();

```

