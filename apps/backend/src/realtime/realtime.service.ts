import { Injectable, MessageEvent } from "@nestjs/common";
import { Observable, Subject, filter, map } from "rxjs";
import { LocationUpdateEvent, SSE_EVENTS } from "@orbit/shared";

interface CircleBroadcast {
  circleId: string;
  event: LocationUpdateEvent;
}

@Injectable()
export class RealtimeService {
  private readonly updates$ = new Subject<CircleBroadcast>();

  broadcastLocationUpdate(circleId: string, event: LocationUpdateEvent) {
    this.updates$.next({ circleId, event });
  }

  streamForCircle(circleId: string): Observable<MessageEvent> {
    return this.updates$.pipe(
      filter((broadcast) => broadcast.circleId === circleId),
      map((broadcast) => ({ type: SSE_EVENTS.LOCATION_UPDATE, data: broadcast.event })),
    );
  }
}
