import { BellOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { Badge, Button, Empty, List, Popover, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNotificationStore } from '../stores/notificationStore';
import { NotificationType } from '../constants/enums';

const { Text } = Typography;

const typeTagColor: Record<string, string> = {
  [NotificationType.RESUME_SUBMITTED]: 'blue',
  [NotificationType.RESUME_STATUS_CHANGED]: 'cyan',
  [NotificationType.INTERVIEW_SCHEDULED]: 'purple',
  [NotificationType.INTERVIEW_RESULT_UPDATED]: 'magenta',
  [NotificationType.OFFER_CREATED]: 'gold',
  [NotificationType.OFFER_STATUS_CHANGED]: 'orange',
  [NotificationType.SYSTEM]: 'default',
};

const typeTagText: Record<string, string> = {
  [NotificationType.RESUME_SUBMITTED]: '简历投递',
  [NotificationType.RESUME_STATUS_CHANGED]: '状态变更',
  [NotificationType.INTERVIEW_SCHEDULED]: '面试安排',
  [NotificationType.INTERVIEW_RESULT_UPDATED]: '面试结果',
  [NotificationType.OFFER_CREATED]: 'Offer创建',
  [NotificationType.OFFER_STATUS_CHANGED]: 'Offer状态',
  [NotificationType.SYSTEM]: '系统',
};

export default function NotificationCenter() {
  const { items, unreadCount, fetchList, fetchUnreadCount, markAsRead, markAllAsRead, startPolling, stopPolling } = useNotificationStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    startPolling();
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (open) fetchList();
  }, [open]);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (val) fetchList();
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    fetchUnreadCount();
  };

  const handleItemClick = async (n: Notification) => {
    if (!n.isRead) {
      await markAsRead(n.id);
      fetchUnreadCount();
    }
  };

  const content = (
    <div style={{ width: 380 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Text strong>通知中心</Text>
        <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={handleMarkAll} disabled={unreadCount === 0}>
          全部已读
        </Button>
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <Empty description="暂无通知" style={{ padding: '32px 0' }} />
        ) : (
          <List
            size="small"
            dataSource={items}
            locale={{ emptyText: '暂无通知' }}
            renderItem={(n) => (
              <List.Item
                key={n.id}
                onClick={() => handleItemClick(n)}
                style={{
                  cursor: 'pointer',
                  padding: '10px 12px',
                  background: n.isRead ? 'transparent' : '#f6ffed',
                  borderLeft: n.isRead ? 'none' : '3px solid #52c41a',
                }}
              >
                <List.Item.Meta
                  avatar={<Badge dot={!n.isRead}><Tag color={typeTagColor[n.type] || 'default'} style={{ margin: 0 }}>{typeTagText[n.type] || n.type}</Tag></Badge>}
                  title={<div style={{ display: 'flex', justifyContent: 'space-between' }}><Text strong={!n.isRead}>{n.title}</Text><Text type="secondary" style={{ fontSize: 12 }}>{dayjs(n.createdAt).fromNow()}</Text></div>}
                  description={<Text type="secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>{n.content}</Text>}
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <Popover
      placement="bottomRight"
      content={content}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      arrow={true}
    >
      <Badge count={unreadCount} overflowCount={99} offset={[-2, 2]}>
        <Button type="text" icon={<BellOutlined style={{ fontSize: 18, color: '#f6f0df' }} />} style={{ color: '#f6f0df' }} />
      </Badge>
    </Popover>
  );
}
