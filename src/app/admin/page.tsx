import { redirect } from 'next/navigation';

export default function AdminPage() {
  // Redirect to settings as the default admin page
  redirect('/admin/settings');
}
