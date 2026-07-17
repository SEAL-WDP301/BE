import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { RolesGuard } from "../src/common/guards/roles.guard";
import { JwtAuthGuard } from "../src/modules/auth/guards/jwt-auth.guard";
import { OrganizerDashboardController } from "../src/modules/organizer-dashboard/organizer-dashboard.controller";
import { OrganizerDashboardService } from "../src/modules/organizer-dashboard/organizer-dashboard.service";
import { OrganizerNotificationsController } from "../src/modules/organizer-notifications/organizer-notifications.controller";
import { OrganizerNotificationsService } from "../src/modules/organizer-notifications/organizer-notifications.service";

class OrganizerTestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requestContext = context.switchToHttp().getRequest<{
      user?: { id: number; role: string };
    }>();
    requestContext.user = { id: 42, role: "organizer" };
    return true;
  }
}

describe("Organizer dashboard API (e2e)", () => {
  let app: INestApplication;
  const dashboardService = {
    getOverview: jest.fn(),
    getEventsByMonth: jest.fn(),
    getParticipationConversion: jest.fn(),
  };
  const notificationService = {
    sendDeadlineReminder: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        OrganizerDashboardController,
        OrganizerNotificationsController,
      ],
      providers: [
        { provide: OrganizerDashboardService, useValue: dashboardService },
        {
          provide: OrganizerNotificationsService,
          useValue: notificationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(OrganizerTestGuard)
      .overrideGuard(RolesGuard)
      .useClass(OrganizerTestGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => jest.clearAllMocks());

  it("GET /api/organizer/dashboard/overview", async () => {
    dashboardService.getOverview.mockResolvedValue({
      totalEvents: { value: 2 },
    });
    const response = await request(app.getHttpServer())
      .get("/api/organizer/dashboard/overview?year=2026")
      .expect(200);
    expect(response.body.data.totalEvents.value).toBe(2);
    expect(dashboardService.getOverview).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ year: 2026 }),
    );
  });

  it("GET /api/organizer/dashboard/events-by-month", async () => {
    dashboardService.getEventsByMonth.mockResolvedValue({
      year: 2026,
      data: Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        created: 0,
        starting: 0,
        completed: 0,
      })),
    });
    const response = await request(app.getHttpServer())
      .get("/api/organizer/dashboard/events-by-month?year=2026")
      .expect(200);
    expect(response.body.data.data).toHaveLength(12);
  });

  it("GET /api/organizer/dashboard/participation-conversion", async () => {
    dashboardService.getParticipationConversion.mockResolvedValue({
      registrationFunnel: [],
      submissionFunnel: [],
      largestDrop: null,
    });
    const response = await request(app.getHttpServer())
      .get("/api/organizer/dashboard/participation-conversion")
      .expect(200);
    expect(response.body.data).toHaveProperty("registrationFunnel");
    expect(response.body.data).toHaveProperty("submissionFunnel");
  });

  it("POST /api/organizer/notifications/reminders", async () => {
    notificationService.sendDeadlineReminder.mockResolvedValue({
      notificationId: 105,
      recipientCount: 2,
      channels: ["IN_APP"],
      status: "SENT",
    });
    const response = await request(app.getHttpServer())
      .post("/api/organizer/notifications/reminders")
      .send({
        eventId: 1,
        audience: "TEAM_LEADERS",
        channels: ["IN_APP"],
      })
      .expect(201);
    expect(response.body.data.recipientCount).toBe(2);
    expect(notificationService.sendDeadlineReminder).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ eventId: 1 }),
    );
  });
});
