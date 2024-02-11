import Engine from "./engine";

const engine = new Engine({
  filePath: './resources/internal-validation-test.bpmn',
  services: {
    travaux_resumerWorkflowParentApresRefus_1: () => {
      return {
        financialCompetence: 1000,
        technicalCompetence: 2500,
      }
    }
  }
});

async function start(){
  // console.log(engine.getProcess());
  await engine.run();
  await engine.resumeWithId('UserTask_ValiderBonDeTravail', { 'action': 'refuser' });
  console.log(await engine.resumeWithId('UserTask_DonnerRaisonRefusPourValidationInterne'));
}

start()

