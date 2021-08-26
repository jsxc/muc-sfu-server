import kurento from "kurento-client";


export class KurentoClient {
   private static client: kurento.ClientInstance;

   public static async get() {
      if (!this.client) {
         this.client = await kurento('ws://localhost:8888/kurento');
      }

      return this.client;
   }
}
