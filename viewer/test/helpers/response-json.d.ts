// The tests read fields of the server's JSON replies directly, so Response.json() is typed any here (it is unknown by default).
export {};
declare global {
  interface Response {
    json(): Promise<any>;
  }
}
