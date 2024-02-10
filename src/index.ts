import Engine from "./engine";

const engine = new Engine('./resources/internal-validation-test.bpmn');

console.log(engine.getProcess());
