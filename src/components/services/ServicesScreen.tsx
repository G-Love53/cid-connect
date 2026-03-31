import React from 'react';
import {
  FileText, 
  AlertTriangle, 
  ChevronRight,
  FileSearch,
  RefreshCw,
  CreditCard,
  Bell,
  Download,
  Sparkles,
  Shield,
  Settings,
  Receipt,
  Brain,
  History,
  ClipboardList,
  Building2
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ServicesActivityFeed from './ServicesActivityFeed';
import { ActivityItem } from '@/api';




interface ServicesScreenProps {
  onRequestCOI: () => void;
  onFileClaim: () => void;
  onCoverageChat: () => void;
  onUpdatePayment: () => void;
  onDownloadDocuments: () => void;
  onBilling: () => void;
  onRenewalReminders: () => void;
  onShopRenewal: () => void;
  onCoiHistory: () => void;
  onClaimHistory: () => void;
  onAdminDashboard?: () => void;
  onTrainAI?: () => void;
  isAdmin?: boolean;
  onNavigateActivity?: (item: ActivityItem) => void;
  onQuoteHistory?: () => void;
  onBrowseCarriers?: () => void;
}




const ServicesScreen: React.FC<ServicesScreenProps> = ({ 
  onRequestCOI, 
  onFileClaim, 
  onCoverageChat,
  onUpdatePayment,
  onDownloadDocuments,
  onBilling,
  onRenewalReminders,
  onShopRenewal,
  onCoiHistory,
  onClaimHistory,
  onAdminDashboard,
  onTrainAI,
  isAdmin = false,
  onNavigateActivity,
  onQuoteHistory,
  onBrowseCarriers
}) => {






  const primaryServices = [
    {
      id: 'claim',
      title: 'File a Claim',
      description: 'Report an incident, accident, or loss',
      icon: AlertTriangle,
      color: 'bg-[#F7941D]',
      onClick: onFileClaim
    }
  ];

  const documentServices = [
    {
      id: 'documents',
      title: 'Download Documents',
      description: 'Access your policy documents and declarations',
      icon: Download,
      onClick: onDownloadDocuments
    },
    {
      id: 'coi-history',
      title: 'COI Request History',
      description: 'Track your certificate of insurance requests',
      icon: History,
      onClick: onCoiHistory
    },
    {
      id: 'claim-history',
      title: 'Claim History',
      description: 'View all your filed claims and their status',
      icon: ClipboardList,
      onClick: onClaimHistory
    },
    ...(onQuoteHistory ? [{
      id: 'quote-history',
      title: 'Quote History',
      description: 'View and manage your past quote submissions',
      icon: FileSearch,
      onClick: onQuoteHistory
    }] : [])
  ];




  const billingServices = [
    {
      id: 'billing',
      title: 'Payments & Billing',
      description: 'View invoices and make payments',
      icon: Receipt,
      onClick: onBilling
    },
    {
      id: 'payment',
      title: 'Update Payment Method',
      description: 'Change your credit card or bank account',
      icon: CreditCard,
      onClick: onUpdatePayment
    }
  ];

  const renewalServices = [
    {
      id: 'reminders',
      title: 'Renewal Reminders',
      description: 'Manage your renewal notification preferences',
      icon: Bell,
      onClick: onRenewalReminders
    },
    {
      id: 'shop',
      title: 'Shop Your Renewal',
      description: 'Compare options and find the best rate',
      icon: Sparkles,
      onClick: onShopRenewal,
      highlight: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Admin Section - Only visible to staff/admin */}
      {isAdmin && onAdminDashboard && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#1B3A5F]" />
            Admin Tools
          </h2>
          <div className="grid gap-3">
            <button
              onClick={onAdminDashboard}
              className="w-full bg-gradient-to-r from-[#1B3A5F] to-[#2C5282] rounded-xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <div className="p-3 rounded-xl bg-white/20">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-white">Admin Dashboard</h3>
                <p className="text-sm text-blue-200">View all policies and claims across segments</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70" />
            </button>
            
            {onTrainAI && (
              <button
                onClick={onTrainAI}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <div className="p-3 rounded-xl bg-white/20">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white">Train the AI</h3>
                  <p className="text-sm text-purple-200">Upload documents to the Knowledge Hub</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/70" />
              </button>
            )}
          </div>
        </div>
      )}



      {/* Featured */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Featured</h2>
        <div className="grid gap-3">
          <button onClick={onRequestCOI} className="w-full bg-white rounded-xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 rounded-xl bg-[#F7941D]"><FileText className="w-6 h-6 text-white" /></div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-800">Instant COI</h3>
              <p className="text-sm text-gray-500">Fast certificate workflow in its own tab</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button onClick={onCoverageChat} className="w-full bg-white rounded-xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 rounded-xl bg-green-500"><MessageCircle className="w-6 h-6 text-white" /></div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-800">Am I Covered?</h3>
              <p className="text-sm text-gray-500">Claude AI with Gemini fallback transparency</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Primary Services */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Quick Actions</h2>
        <div className="grid gap-3">
          {primaryServices.map((service) => (
            <button
              key={service.id}
              onClick={service.onClick}
              className="w-full bg-white rounded-xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <div className={`p-3 rounded-xl ${service.color}`}>
                <service.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-800">{service.title}</h3>
                <p className="text-sm text-gray-500">{service.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Documents Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Documents</h2>
        <Card className="border-0 shadow-md">
          <CardContent className="p-0 divide-y divide-gray-100">
            {documentServices.map((service) => (
              <button
                key={service.id}
                onClick={service.onClick}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="p-2 bg-orange-50 rounded-lg">
                  <service.icon className="w-5 h-5 text-[#F7941D]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{service.title}</h3>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Billing Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Billing & Payments</h2>
        <Card className="border-0 shadow-md">
          <CardContent className="p-0 divide-y divide-gray-100">
            {billingServices.map((service) => (
              <button
                key={service.id}
                onClick={service.onClick}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="p-2 bg-orange-50 rounded-lg">
                  <service.icon className="w-5 h-5 text-[#F7941D]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{service.title}</h3>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Renewal Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Renewal Center</h2>
        <Card className="border-0 shadow-md">
          <CardContent className="p-0 divide-y divide-gray-100">
            {renewalServices.map((service) => (
              <button
                key={service.id}
                onClick={service.onClick}
                className={`w-full p-4 flex items-center gap-4 text-left transition-colors ${
                  service.highlight 
                    ? 'bg-orange-50 hover:bg-orange-100' 
                    : 'hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  service.highlight ? 'bg-[#F7941D]' : 'bg-orange-50'
                }`}>
                  <service.icon className={`w-5 h-5 ${
                    service.highlight ? 'text-white' : 'text-[#F7941D]'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-800">{service.title}</h3>
                    {service.highlight && (
                      <span className="text-xs bg-[#F7941D] text-white px-2 py-0.5 rounded-full">
                        AI Powered
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>


      {/* Carriers Section */}
      {onBrowseCarriers && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Carriers</h2>
          <Card className="border-0 shadow-md">
            <CardContent className="p-0">
              <button
                onClick={onBrowseCarriers}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-[#1B3A5F]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">Browse Carriers</h3>
                  <p className="text-sm text-gray-500">Explore our network of active insurance carriers</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            </CardContent>
          </Card>
        </div>
      )}



      {/* Recent Activity */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
        <Card className="border-0 shadow-md">
          <CardContent className="p-2">
            <ServicesActivityFeed onNavigateActivity={onNavigateActivity} />
          </CardContent>
        </Card>
      </div>


      {/* Help Section */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-[#1B3A5F] to-[#2C5282] text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Need Help?</h3>
              <p className="text-sm text-blue-200">Our AI assistant can answer your coverage questions</p>
            </div>
            <button 
              onClick={onCoverageChat}
              className="px-4 py-2 bg-[#F7941D] text-white rounded-lg font-medium text-sm hover:bg-[#E07D0D] transition-colors"
            >
              Chat Now
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServicesScreen;
