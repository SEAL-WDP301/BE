import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Event, EventStatus } from "@prisma/client";

type RegistrationEvent = Pick<Event, "status" | "registrationDeadline">;

export function assertRegistrationOpen(event: RegistrationEvent | null): void {
  if (!event) {
    throw new NotFoundException("Event not found");
  }

  if (event.status !== EventStatus.active) {
    throw new BadRequestException(
      "Registration is closed. The event is not in the active registration phase.",
    );
  }

  if (
    event.registrationDeadline &&
    new Date() > new Date(event.registrationDeadline)
  ) {
    throw new BadRequestException(
      `Registration closed. The deadline was ${new Date(event.registrationDeadline).toISOString()}.`,
    );
  }
}
