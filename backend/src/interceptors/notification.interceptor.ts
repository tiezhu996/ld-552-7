import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { NotificationsService } from '../modules/notifications/notifications.service';

@Injectable()
export class NotificationInterceptor implements NestInterceptor {
  constructor(private readonly notifications: NotificationsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const path = req.path;
    const actorId = req.user?.sub;

    return next.handle().pipe(tap(async (payload: any) => {
      if (!payload) return;

      if (method === 'POST' && path.startsWith('/resumes')) {
        await this.notifications.dispatchForResumeSubmit(payload);
      }

      if (method === 'PATCH' && path.match(/^\/resumes\/\d+\/status$/)) {
        const beforeStatus = payload?.beforeStatus;
        const afterStatus = payload?.status;
        if (beforeStatus && afterStatus && beforeStatus !== afterStatus) {
          await this.notifications.dispatchForResumeStatusChange(payload, beforeStatus, afterStatus);
        }
      }

      if (method === 'POST' && path.startsWith('/interviews')) {
        await this.notifications.dispatchForInterviewScheduled(payload, actorId);
      }

      if (method === 'PATCH' && path.match(/^\/interviews\/\d+$/)) {
        const beforeResult = payload?.beforeStatus;
        const afterResult = payload?.result;
        if (beforeResult !== undefined && afterResult !== undefined && beforeResult !== afterResult) {
          await this.notifications.dispatchForInterviewResult(payload, beforeResult, actorId);
        }
      }

      if (method === 'POST' && path.startsWith('/offers')) {
        await this.notifications.dispatchForOfferCreated(payload, actorId);
      }

      if (method === 'PATCH' && path.match(/^\/offers\/\d+\/status$/)) {
        const beforeStatus = payload?.beforeStatus;
        const afterStatus = payload?.status;
        if (beforeStatus && afterStatus && beforeStatus !== afterStatus) {
          await this.notifications.dispatchForOfferStatusChange(payload, beforeStatus, afterStatus, actorId);
        }
      }
    }));
  }
}
