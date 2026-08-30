'use client';

import { Header } from '@/components/Header';
import { NetworkSwitcher } from '@/components/NetworkSwitcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationSettings } from '@/components/NotificationSettings';
import { Settings, Bell, Network } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-[#3737A4]" />
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent">
              Settings
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your app preferences and network configuration
          </p>
        </div>

        <div className="space-y-6">
          {/* Network Settings */}
          <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-slate-600 dark:text-slate-400" />
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

          {/* Notification Settings */}
          <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <CardTitle>Notification Preferences</CardTitle>
              </div>
              <CardDescription>Control what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationSettings />
            </CardContent>
          </Card>

          {/* Developer Info */}
          <Card className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">Developer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span>Environment:</span>
                  <span className="font-semibold">
                    {process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>RPC URL:</span>
                  <span className="font-semibold truncate ml-4">
                    {process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'Default'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
