import { Bell, Network, Settings } from 'lucide-react';

import { Header } from '@/components/Header';
import { NetworkSwitcher } from '@/components/NetworkSwitcher';
import { NotificationSettings } from '@/components/NotificationSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <Settings className="h-8 w-8 text-[#3737A4]" />
            <h1 className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
              Settings
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your app preferences and network configuration
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <CardTitle>Network Settings</CardTitle>
              </div>
              <CardDescription>
                Choose which Stellar network to use for transactions and smart contracts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NetworkSwitcher />
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <CardTitle>Notification Preferences</CardTitle>
              </div>
              <CardDescription>
                Choose notification categories independently or mute everything at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationSettings />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
