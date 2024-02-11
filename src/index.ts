import Engine from "./engine";

const engine = new Engine('./resources/internal-validation-test.bpmn');

// console.log(engine.getProcess());
engine.run();
engine.resumeWithId('UserTask_ValiderBonDeTravail', { 'action': 'refuser' });
console.log(engine.resumeWithId('UserTask_DonnerRaisonRefusPourValidationInterne'));
