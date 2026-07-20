import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

@WebSocketGateway({
  namespace: "/admin-realtime",
  cors: {
    origin: "*", // allow all for hackathon prototype
  },
})
export class AdminRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminRealtimeGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Admin/Organizer connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Admin/Organizer disconnected: ${client.id}`);
  }

  @SubscribeMessage("joinEvent")
  handleJoinEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: number },
  ) {
    const room = `admin-event-${data.eventId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    return { event: "joined", room };
  }

  @SubscribeMessage("joinRound")
  handleJoinRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roundId: number },
  ) {
    const room = `admin-round-${data.roundId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    return { event: "joined", room };
  }

  @SubscribeMessage("joinTeam")
  handleJoinTeam(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { teamId: number },
  ) {
    const room = `team-${data.teamId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    return { event: "joined", room };
  }

  @OnEvent("team.registered")
  handleTeamRegistered(data: any) {
    if (!data.eventId) return;
    const room = `admin-event-${data.eventId}`;
    this.server.to(room).emit("team.registered", data);
    this.logger.log(
      `Emitted team.registered to ${room} for team ${data.teamName}`,
    );
  }

  @OnEvent("submission.created")
  handleSubmissionCreated(data: any) {
    if (!data.roundId) return;
    const room = `admin-round-${data.roundId}`;
    this.server.to(room).emit("submission.created", data);
    this.logger.log(
      `Emitted submission.created to ${room} for team ${data.teamName}`,
    );
  }
}
