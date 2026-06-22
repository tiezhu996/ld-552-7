import { Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.notifications.findAll(req, query);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.notifications.getUnreadCount(req);
    return { count };
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.notifications.markAsRead(+id, req);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notifications.markAllAsRead(req);
  }
}

