export default class BPMNError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BPMNError";
  }
}
