import { CalendarOutlined, IdcardOutlined, LogoutOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Layout, Menu, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import NotificationCenter from '../components/NotificationCenter';

const { Sider, Content, Header } = Layout;

export default function AppLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuthStore();

  return (
    <Layout className="app-shell">
      <Sider className="sidebar" width={236}>
        <div className="brand">TalentFlow</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[loc.pathname.split('/')[1] || 'jobs']}
          onClick={(e) => nav('/' + e.key)}
          items={[
            { key: 'jobs', icon: <IdcardOutlined />, label: '职位管理' },
            { key: 'candidates', icon: <TeamOutlined />, label: '候选人' },
            { key: 'interviews', icon: <CalendarOutlined />, label: '面试日历' },
          ]}
        />
        <div style={{ position: 'absolute', bottom: 18, left: 18, right: 18, color: '#f6f0df' }}>
          <Typography.Text style={{ color: '#f6f0df' }}>{user?.name} · {user?.role}</Typography.Text>
          <Button block icon={<LogoutOutlined />} style={{ marginTop: 10 }} onClick={() => { logout(); nav('/login'); }}>退出</Button>
        </div>
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            height: 56,
            lineHeight: '56px',
            boxShadow: '0 1px 4px rgba(0,21,41,0.06)',
          }}
        >
          <NotificationCenter />
        </Header>
        <Content className="content-band">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
