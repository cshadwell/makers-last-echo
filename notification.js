// MOCK ONLY. No network calls or private credentials. Replace this module with a hosted
// endpoint adapter; require server-confirmed acceptance and server-side idempotency.
export const mockNotification = {
  failNext:false,
  async submit(payload) {
    await new Promise(resolve=>setTimeout(resolve,500));
    if(this.failNext) {this.failNext=false;throw Error('Simulated submission failure. Your victory is saved; please retry.');}
    return {accepted:true,mock:true,id:payload.id};
  }
};
