import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType, ResumeStatus, InterviewResult, OfferStatus, UserRole } from '../../constants/enums';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  findAll(req: any, query: any) {
    const where: any = { userId: req.user.sub };
    if (query.isRead !== undefined) where.isRead = query.isRead === 'true';
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(query.limit) || 50,
      skip: Number(query.offset) || 0,
    });
  }

  getUnreadCount(req: any) {
    return this.prisma.notification.count({ where: { userId: req.user.sub, isRead: false } });
  }

  markAsRead(id: number, req: any) {
    return this.prisma.notification.updateMany({
      where: { id, userId: req.user.sub },
      data: { isRead: true },
    });
  }

  markAllAsRead(req: any) {
    return this.prisma.notification.updateMany({
      where: { userId: req.user.sub, isRead: false },
      data: { isRead: true },
    });
  }

  async dispatchForResumeSubmit(resume: any) {
    const job = await this.prisma.job.findUnique({ where: { id: resume.jobId } });
    if (!job) return;
    const hrUsers = await this.prisma.user.findMany({ where: { role: UserRole.HR } });
    const recipients = [...hrUsers];
    if (job.hiringManagerId) {
      const hm = await this.prisma.user.findUnique({ where: { id: job.hiringManagerId } });
      if (hm && !recipients.find(r => r.id === hm.id)) recipients.push(hm);
    }
    const candidate = await this.prisma.candidate.findUnique({ where: { id: resume.candidateId } });
    await this.batchCreate(recipients, {
      type: NotificationType.RESUME_SUBMITTED,
      title: '新简历投递',
      content: `候选人「${candidate?.name ?? '未知'}」投递了职位「${job.title}」，请及时筛选。`,
      entity: 'Resume',
      entityId: resume.id,
      candidateId: resume.candidateId,
    });
  }

  async dispatchForResumeStatusChange(resume: any, beforeStatus: string, afterStatus: string) {
    const job = await this.prisma.job.findUnique({ where: { id: resume.jobId } });
    const candidate = await this.prisma.candidate.findUnique({ where: { id: resume.candidateId } });
    if (!job || !candidate) return;

    const statusLabel: Record<string, string> = {
      [ResumeStatus.SUBMITTED]: '已投递', [ResumeStatus.SCREENING]: '筛选中',
      [ResumeStatus.SHORTLISTED]: '已通过初筛', [ResumeStatus.INTERVIEWING]: '面试中',
      [ResumeStatus.OFFERED]: '已发Offer', [ResumeStatus.HIRED]: '已入职',
      [ResumeStatus.REJECTED]: '已拒绝',
    };

    const recipients: any[] = [];
    const hrUsers = await this.prisma.user.findMany({ where: { role: UserRole.HR } });
    recipients.push(...hrUsers);

    if ([ResumeStatus.SHORTLISTED, ResumeStatus.INTERVIEWING, ResumeStatus.OFFERED, ResumeStatus.HIRED, ResumeStatus.REJECTED].includes(afterStatus as ResumeStatus)) {
      const hm = await this.prisma.user.findUnique({ where: { id: job.hiringManagerId } });
      if (hm && !recipients.find(r => r.id === hm.id)) recipients.push(hm);
    }

    if (afterStatus === ResumeStatus.REJECTED) {
      const interviews = await this.prisma.interview.findMany({ where: { resumeId: resume.id }, select: { interviewerId: true, interviewer: true } });
      interviews.forEach(i => { if (i.interviewer && !recipients.find(r => r.id === i.interviewerId)) recipients.push(i.interviewer); });
    }

    await this.batchCreate(recipients, {
      type: NotificationType.RESUME_STATUS_CHANGED,
      title: '候选人状态变更',
      content: `候选人「${candidate.name}」的状态已从「${statusLabel[beforeStatus] || beforeStatus}」变更为「${statusLabel[afterStatus] || afterStatus}」（职位：${job.title}）。`,
      entity: 'Resume',
      entityId: resume.id,
      candidateId: resume.candidateId,
    });
  }

  async dispatchForInterviewScheduled(interview: any, actorId?: number) {
    const resume = await this.prisma.resume.findUnique({ where: { id: interview.resumeId }, include: { candidate: true, job: true } });
    if (!resume) return;
    const recipients: any[] = [];
    if (interview.interviewerId && interview.interviewerId !== actorId) {
      const interviewer = await this.prisma.user.findUnique({ where: { id: interview.interviewerId } });
      if (interviewer) recipients.push(interviewer);
    }
    const hrUsers = await this.prisma.user.findMany({ where: { role: UserRole.HR } });
    hrUsers.forEach(u => { if (!recipients.find(r => r.id === u.id) && u.id !== actorId) recipients.push(u); });
    if (resume.job.hiringManagerId && resume.job.hiringManagerId !== actorId) {
      const hm = await this.prisma.user.findUnique({ where: { id: resume.job.hiringManagerId } });
      if (hm && !recipients.find(r => r.id === hm.id)) recipients.push(hm);
    }
    const typeLabel: Record<string, string> = { PHONE: '电话面试', ONSITE: '现场面试', VIDEO: '视频面试', TECHNICAL: '技术面试' };
    const when = new Date(interview.scheduledAt).toLocaleString('zh-CN');
    await this.batchCreate(recipients, {
      type: NotificationType.INTERVIEW_SCHEDULED,
      title: '面试已安排',
      content: `候选人「${resume.candidate.name}」的${typeLabel[interview.type] || '面试'}已安排在${when}，第${interview.round}轮（职位：${resume.job.title}）。`,
      entity: 'Interview',
      entityId: interview.id,
      candidateId: resume.candidateId,
    });
  }

  async dispatchForInterviewResult(interview: any, beforeResult: string, actorId?: number) {
    const resume = await this.prisma.resume.findUnique({ where: { id: interview.resumeId }, include: { candidate: true, job: true } });
    if (!resume) return;
    const recipients: any[] = [];
    const hrUsers = await this.prisma.user.findMany({ where: { role: UserRole.HR } });
    hrUsers.forEach(u => { if (u.id !== actorId) recipients.push(u); });
    if (resume.job.hiringManagerId && resume.job.hiringManagerId !== actorId) {
      const hm = await this.prisma.user.findUnique({ where: { id: resume.job.hiringManagerId } });
      if (hm) recipients.push(hm);
    }
    const resultLabel: Record<string, string> = { PASS: '通过', FAIL: '未通过', PENDING: '待定' };
    const scorePart = interview.score ? `，评分：${interview.score}` : '';
    await this.batchCreate(recipients, {
      type: NotificationType.INTERVIEW_RESULT_UPDATED,
      title: '面试结果已更新',
      content: `候选人「${resume.candidate.name}」的面试结果：${resultLabel[interview.result] || interview.result}${scorePart}（职位：${resume.job.title}）。`,
      entity: 'Interview',
      entityId: interview.id,
      candidateId: resume.candidateId,
    });
  }

  async dispatchForOfferCreated(offer: any, actorId?: number) {
    const candidate = await this.prisma.candidate.findUnique({ where: { id: offer.candidateId } });
    const job = await this.prisma.job.findUnique({ where: { id: offer.jobId } });
    if (!candidate || !job) return;
    const recipients: any[] = [];
    if (offer.approverId && offer.approverId !== actorId) {
      const approver = await this.prisma.user.findUnique({ where: { id: offer.approverId } });
      if (approver) recipients.push(approver);
    }
    const hrUsers = await this.prisma.user.findMany({ where: { role: UserRole.HR } });
    hrUsers.forEach(u => { if (!recipients.find(r => r.id === u.id) && u.id !== actorId) recipients.push(u); });
    await this.batchCreate(recipients, {
      type: NotificationType.OFFER_CREATED,
      title: '新Offer待审批',
      content: `候选人「${candidate.name}」的Offer已创建，薪资：${offer.salary}，请审批（职位：${job.title}）。`,
      entity: 'Offer',
      entityId: offer.id,
      candidateId: offer.candidateId,
    });
  }

  async dispatchForOfferStatusChange(offer: any, beforeStatus: string, afterStatus: string, actorId?: number) {
    const candidate = await this.prisma.candidate.findUnique({ where: { id: offer.candidateId } });
    const job = await this.prisma.job.findUnique({ where: { id: offer.jobId } });
    if (!candidate || !job) return;
    const statusLabel: Record<string, string> = {
      [OfferStatus.DRAFT]: '草稿', [OfferStatus.APPROVED]: '已审批',
      [OfferStatus.SENT]: '已发送', [OfferStatus.ACCEPTED]: '已接受',
      [OfferStatus.REJECTED]: '已拒绝', [OfferStatus.WITHDRAWN]: '已撤回',
    };
    const recipients: any[] = [];
    const hrUsers = await this.prisma.user.findMany({ where: { role: UserRole.HR } });
    hrUsers.forEach(u => { if (u.id !== actorId) recipients.push(u); });
    if (job.hiringManagerId && job.hiringManagerId !== actorId) {
      const hm = await this.prisma.user.findUnique({ where: { id: job.hiringManagerId } });
      if (hm) recipients.push(hm);
    }
    await this.batchCreate(recipients, {
      type: NotificationType.OFFER_STATUS_CHANGED,
      title: 'Offer状态变更',
      content: `候选人「${candidate.name}」的Offer已从「${statusLabel[beforeStatus] || beforeStatus}」变更为「${statusLabel[afterStatus] || afterStatus}」（职位：${job.title}）。`,
      entity: 'Offer',
      entityId: offer.id,
      candidateId: offer.candidateId,
    });
  }

  private async batchCreate(users: any[], template: { type: NotificationType; title: string; content: string; entity?: string; entityId?: number; candidateId?: number }) {
    if (!users.length) return;
    const data = users.map(u => ({ userId: u.id, ...template }));
    await this.prisma.notification.createMany({ data });
  }
}
