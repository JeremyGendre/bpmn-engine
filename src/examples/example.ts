import Engine from "..";
import { State } from "../types/engine/engine";

const engine = new Engine({
  filePath: "./resources/internal-validation-test.bpmn",
  services: {
    travaux_resumerWorkflowParentApresRefus_1: (state: State) => {
      // you can get the state of the process, and do actions based on that
      console.log(state);
      return {
        financialCompetence: 1000,
        technicalCompetence: 2500,
      };
    },
    travaux_resumerWorkflowParentApresValidation_1: (state: State) => {
      // you can get the state of the process, and do actions based on that
      console.log(state);
      return {
        financialCompetence: 900,
        technicalCompetence: 1200,
      };
    },
  },
});

async function start() {
  await engine.run();
  await engine.resumeWithId("UserTask_ValiderBonDeTravail", {
    action: "refuser",
  });
  const state = await engine.resumeWithId(
    "UserTask_DonnerRaisonRefusPourValidationInterne",
  );
  console.log(state);
}

start();
