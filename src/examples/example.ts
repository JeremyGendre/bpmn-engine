import Engine from "..";

const logs = [];

const engine = new Engine({
  filePath: './resources/internal-validation-test.bpmn',
  services: {
    travaux_resumerWorkflowParentApresRefus_1: () => {
      // you can get the state of the process, and do actions based on that
      return {
        financialCompetence: 1000,
        technicalCompetence: 2500,
      }
    },
    travaux_resumerWorkflowParentApresValidation_1: () => {
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
