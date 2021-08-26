import { Socket } from "socket.io";
import kurento from "kurento-client";
import { Participant } from "./Participant";

export class Room {
   private participants: { [name: string]: Participant; } = {};

   private pipeline: Promise<kurento.MediaPipeline> | undefined;

   constructor(private name: string, private requestPipeline: () => Promise<kurento.MediaPipeline>) {
   }

   public getName(): string {
      return this.name;
   }

   public getParticipant(name: string): Participant | undefined {
      return this.participants[name];
   }

   public getParticipantNames(): string[] {
      return Object.keys(this.participants);
   }

   public join(name: string, socket: Socket): Participant {
      if (!this.participants[name]) {
         this.participants[name] = new Participant(name, this, socket);
      }

      return this.participants[name];
   }

   public leave(name: string): void {
      delete this.participants[name];
   }

   public async getPipeline(): Promise<kurento.MediaPipeline> {
      if (!this.pipeline) {
         this.pipeline = this.requestPipeline();
      }

      return this.pipeline;
   }
}
