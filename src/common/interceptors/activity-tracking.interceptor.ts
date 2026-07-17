import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../../database/prisma/prisma.service";

@Injectable()
export class ActivityTrackingInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      route?: { path?: string };
      originalUrl?: string;
      user?: { id?: string | number };
      params?: Record<string, string>;
      query?: Record<string, string>;
      body?: Record<string, unknown>;
    }>();

    return next.handle().pipe(
      tap(() => {
        const userId = Number(request.user?.id);
        if (!Number.isInteger(userId) || userId <= 0) return;

        // Dashboard reads fan out into several aggregate requests. Recording
        // those reads would add write pressure, pollute the activity metrics,
        // and make the dashboard measure its own refresh traffic.
        if (
          request.method === "GET" &&
          request.originalUrl?.includes("/organizer/dashboard/")
        )
          return;

        const rawEventId =
          request.params?.eventId ??
          request.params?.id ??
          request.query?.eventId ??
          request.body?.eventId;
        const parsedEventId = Number(rawEventId);
        const path = request.route?.path ?? request.originalUrl ?? "unknown";

        void this.prisma.activityEvent
          .create({
            data: {
              userId,
              eventId:
                Number.isInteger(parsedEventId) && parsedEventId > 0
                  ? parsedEventId
                  : null,
              action: `${request.method}:${path}`.slice(0, 255),
            },
          })
          .catch(() => undefined);
      }),
    );
  }
}
