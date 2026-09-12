import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SuperAdminLayout>{children}</SuperAdminLayout>;
}
