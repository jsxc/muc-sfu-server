import { Room } from "./Room";
import { KurentoClient } from "./KurentoClient";

export class RoomManager {
   private rooms: { [name: string]: Room; } = {};

   constructor() {
   }

   public exists(name: string): boolean {
      return !!this.rooms[name];
   }

   public get(name: string): Room {
      if (!this.rooms[name]) {
         this.rooms[name] = new Room(name, async () => {
            const client = await KurentoClient.get();

            return client.create('MediaPipeline');
         });
      }

      return this.rooms[name];
   }
}
