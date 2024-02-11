import Engine from "./engine";

const engine = new Engine({
  filePath: './resources/internal-validation-test.bpmn',
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
  }
});

async function start(){
  await engine.run();
  await engine.resumeWithId('UserTask_ValiderBonDeTravail', { 'action': 'refuser' });
  const state = await engine.resumeWithId('SignalEvent_DonnerRaisonCloture') 
  engine.setState(state);
  const state2 = await engine.resumeWithId('UserTask_ValiderBonDeTravail', { 'action': 'valider' });
  console.log(state2);
}

start()

