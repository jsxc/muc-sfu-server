import { Socket } from "socket.io";
import kurento from "kurento-client";
import { Room } from "./Room";


export class Participant {
   private outgoingMedia: Promise<kurento.WebRtcEndpoint> | undefined;

   private incomingMedia: { [name: string]: kurento.WebRtcEndpoint; } = {};

   private iceCandidateCache: { [name: string]: RTCIceCandidate[]; } = {};

   constructor(private name: string, private room: Room, private socket: Socket) {
   }

   public getName(): string {
      return this.name;
   }

   public async getOutgoingMedia(): Promise<kurento.WebRtcEndpoint> {
      if (!this.outgoingMedia) {
         this.outgoingMedia = new Promise(async (resolve) => {
            const pipeline = await this.room.getPipeline();

            console.log(`${pipeline.id} is used for outgoing media (${this.getName()})`);

            const outgoingMedia = await pipeline.create('WebRtcEndpoint');

            outgoingMedia.on('OnIceCandidate', (ev) => {
               const candidate = kurento.getComplexType('IceCandidate')(ev.candidate);

               this.socket.emit('iceCandidate', {
                  roomId: this.room.getName(),
                  peerId: this.name,
                  candidate,
               });
            });

            resolve(outgoingMedia);
         });
      }

      return this.outgoingMedia;
   }

   public async addIceCandidate(name: string, candidate: string): Promise<void> {
      const iceCandidate = kurento.getComplexType('IceCandidate')(candidate);

      if (name === this.name) {
         return (await this.getOutgoingMedia()).addIceCandidate(iceCandidate);
      }

      if (this.incomingMedia[name]) {
         this.incomingMedia[name].addIceCandidate(iceCandidate);
      } else {
         if (!this.iceCandidateCache[name]) {
            this.iceCandidateCache[name] = [];
         }

         this.iceCandidateCache[name].push(iceCandidate);
      }
   }

   public async receiveVideoFrom(name: string, sdpOffer: string): Promise<string> {
      const endpoint = await this.getEndpointForUser(name);
      const sdpAnswer = await endpoint.processOffer(sdpOffer);

      endpoint.gatherCandidates();

      return sdpAnswer;
   }

   private async getEndpointForUser(name: string): Promise<kurento.WebRtcEndpoint> {
      if (name === this.name) {
         return this.getOutgoingMedia();
      }

      if (!this.incomingMedia[name]) {
         const pipeline = await this.room.getPipeline();
         console.log(`${pipeline.id} is used for incoming media (${this.getName()} <-- ${name})`);
         const incomingMedia = await pipeline.create('WebRtcEndpoint');

         incomingMedia.on('OnIceCandidate', (ev) => {
            const candidate = kurento.getComplexType('IceCandidate')(ev.candidate);

            this.socket.emit('iceCandidate', {
               roomId: this.room.getName(),
               peerId: name,
               candidate,
            });
         });

         this.incomingMedia[name] = incomingMedia;

         if (this.iceCandidateCache[name]) {
            let candidate = this.iceCandidateCache[name].pop();

            while (candidate) {
               incomingMedia.addIceCandidate(candidate);

               candidate = this.iceCandidateCache[name].pop();
            }
         }
      }

      const srcMedia = await this.room.getParticipant(name)?.getOutgoingMedia();

      if (srcMedia) {
         srcMedia.connect(this.incomingMedia[name]);
      } else {
         console.warn(`Participant ${name} is unknown. Can therefore not connect media.`);
      }

      return this.incomingMedia[name];
   }
}
