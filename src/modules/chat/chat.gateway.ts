import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.headers.authorization?.split(' ')[1] 
        || client.handshake.auth?.token;
        
      if (!token) {
        client.disconnect();
        return;
      }
      
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.accessSecret')
      });
      client.data.user = payload;
    } catch (error) {
      console.log('Socket Connection Error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup if needed
  }

  @SubscribeMessage('join_team_room')
  async handleJoinRoom(
    @MessageBody() teamId: number,
    @ConnectedSocket() client: Socket,
  ) {
    if (!client.data.user) {
      return { error: 'Unauthorized' };
    }

    const userId = Number(client.data.user.sub || client.data.user.id);
    const role = client.data.user.role;

    try {
      await this.chatService.assertTeamChatAccess(userId, role, teamId);
      const roomName = `team_${teamId}`;
      client.join(roomName);
      return { event: 'joined_room', data: roomName };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('leave_team_room')
  handleLeaveRoom(
    @MessageBody() teamId: number,
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `team_${teamId}`;
    client.leave(roomName);
    return { event: 'left_room', data: roomName };
  }

  @SubscribeMessage('send_chat_message')
  async handleMessage(
    @MessageBody() data: { teamId: number; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!client.data.user) return { error: 'Unauthorized' };

    const { teamId, content } = data;
    const userId = Number(client.data.user.sub || client.data.user.id);
    const role = client.data.user.role;

    try {
      const savedMessage = await this.chatService.saveMessage(
        teamId,
        userId,
        content,
        role,
      );

      const roomName = `team_${teamId}`;
      this.server.to(roomName).emit('receive_chat_message', savedMessage);

      return savedMessage;
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @MessageBody() teamId: number,
    @ConnectedSocket() client: Socket,
  ) {
    if (!client.data.user) return { error: 'Unauthorized' };
    const userId = Number(client.data.user.sub || client.data.user.id);
    const role = client.data.user.role;

    try {
      const updatedMessages = await this.chatService.markMessagesAsRead(
        teamId,
        userId,
        role,
      );
      if (updatedMessages && updatedMessages.length > 0) {
        const roomName = `team_${teamId}`;
        this.server.to(roomName).emit('messages_read_updated', updatedMessages);
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('edit_chat_message')
  async handleEditMessage(
    @MessageBody() data: { messageId: number; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!client.data.user) return { error: 'Unauthorized' };
    const userId = Number(client.data.user.sub || client.data.user.id);
    const role = client.data.user.role;
    
    try {
      const updatedMessage = await this.chatService.editMessage(userId, role, data.messageId, data.content);
      const roomName = `team_${updatedMessage.teamId}`;
      this.server.to(roomName).emit('chat_message_edited', updatedMessage);
      return updatedMessage;
    } catch (e) {
      return { error: e.message };
    }
  }

  @SubscribeMessage('delete_chat_message')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (!client.data.user) return { error: 'Unauthorized' };
    const userId = Number(client.data.user.sub || client.data.user.id);
    const role = client.data.user.role;
    
    try {
      const deletedMessage = await this.chatService.deleteMessage(userId, role, data.messageId);
      const roomName = `team_${deletedMessage.teamId}`;
      this.server.to(roomName).emit('chat_message_deleted', deletedMessage);
      return deletedMessage;
    } catch (e) {
      return { error: e.message };
    }
  }
}
