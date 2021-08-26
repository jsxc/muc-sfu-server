import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { RoomManager } from "./RoomManager";
import { Participant } from "./Participant";

const httpServer = createServer();
const io = new Server(httpServer, {
   cors: {
      origin: '*'
   }
});

const roomManager = new RoomManager();

io.on("connection", (socket: Socket) => {
   const { id } = socket;
   let participant: Participant | undefined;

   console.log(`${id} is in the house`);

   socket.on('error', (err) => {
      console.log(`Connection ${id} is in trouble: `, err);
   });

   socket.on('close', () => {
      console.log(`Connection ${id} has left the building.`);
   });

   socket.on('leave', ({ room, name }) => {
      socket.leave(room);

      roomManager.get(room).leave(name);

      io.to(room).emit('left', { room, name });
   });

   socket.on('join', (data, callback) => {
      if (!data.roomId || !data.name) {
         callback(false);

         return;
      }

      const room = roomManager.get(data.roomId);
      participant = room.join(data.name, socket);

      io.to(data.roomId).emit('joined', data);
      socket.join(data.roomId);

      callback(room.getParticipantNames().filter(n => n !== data.name));
   });

   socket.on('iceCandidate', ({ name, candidate }) => {
      participant?.addIceCandidate(name, candidate);
   });

   socket.on('requestStream', ({ roomId, name, src, offer }, callback) => {
      const me = roomManager.get(roomId)?.getParticipant(name);

      if (!me) {
         return;
      }

      console.log(`"${name}" is requesting stream from "${src}" in room "${roomId}"`);

      me.receiveVideoFrom(src, offer).then((answer) => {
         callback(answer);
      });
   });
});

httpServer.listen(3000, () => {
   console.log('Server listening...');
});