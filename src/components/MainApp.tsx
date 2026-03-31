import React, { useState, useEffect } from 'react';
import Header from './navigation/Header';
import BottomNav, { TabType } from './navigation/BottomNav';
import PolicyVault from './policy/PolicyVault';
import PolicyTimeline from './policy/PolicyTimeline';
import QuoteScreen from './quote/QuoteScreen';
import ServicesScreen from './services/ServicesScreen';
import RequestCOI from './services/RequestCOI';
import FileClaim from './services/FileClaim';
import UpdatePaymentMethod from './services/UpdatePaymentMethod';
import DownloadDocuments from './services/DownloadDocuments';
import Billing from './services/Billing';
import COIRequestHistory from './services/COIRequestHistory';
import ClaimHistory from './services/ClaimHistory';
import CarrierDetail from './services/CarrierDetail';
import CarrierBrowser from './CarrierBrowser';
import ClaimDetail from './services/ClaimDetail';

import RenewalReminders from './renewal/RenewalReminders';
import RenewalComparison from './renewal/RenewalComparison';
import ProfileScreen from './profile/ProfileScreen';
import AmICoveredChat from './coverage/AmICoveredChat';
import InstantCOI from './coi/InstantCOI';
import AdminDashboard from './admin/AdminDashboard';
import AdminTrainAI from './admin/AdminTrainAI';
import QuoteHistory from './history/QuoteHistory';
import QuoteComparison from './quote/QuoteComparison';
import { Policy, Claim, Quote } from '@/types';

import { useAuth } from '@/contexts/AuthContext';
import { isStaffOrAdmin, getClaimById, ActivityItem } from '@/api';


type ServiceView = 
  | 'main' 
  | 'coi' 
  | 'claim' 
  | 'chat' 
  | 'payment' 
  | 'documents' 
  | 'billing'
  | 'claim-history'
  | 'claim-detail'
  | 'renewal-reminders' 
  | 'shop-renewal'
  | 'admin'
  | 'train-ai'
  | 'carrier-detail'
  | 'quote-history'
  | 'quote-compare'
  | 'browse-carriers'
  | 'policy-timeline';





const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('policy');
  const [serviceView, setServiceView] = useState<ServiceView>('main');
  const [coiView, setCoiView] = useState<'hub' | 'form' | 'history'>('hub');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);



  // Check if user is admin/staff
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = await isStaffOrAdmin(user.id);
        setIsAdmin(adminStatus);
      }
    };
    checkAdminStatus();
  }, [user]);

  const handleRequestCOI = () => {
    setCoiView('form');
    setActiveTab('coi');
  };

  const handleFileClaim = () => {
    setServiceView('claim');
    setActiveTab('services');
  };

  const handleCoverageChat = () => {
    setActiveTab('covered');
  };

  const handleUpdatePayment = () => {
    setServiceView('payment');
    setActiveTab('services');
  };

  const handleDownloadDocuments = () => {
    setServiceView('documents');
    setActiveTab('services');
  };

  const handleBilling = () => {
    setServiceView('billing');
    setActiveTab('services');
  };

  const handleCoiHistory = () => {
    setCoiView('history');
    setActiveTab('coi');
  };

  const handleClaimHistory = () => {
    setServiceView('claim-history');
    setActiveTab('services');
  };


  const handleRenewalReminders = () => {
    setServiceView('renewal-reminders');
    setActiveTab('services');
  };

  const handleShopRenewal = () => {
    setServiceView('shop-renewal');
    setActiveTab('services');
  };

  const handleAdminDashboard = () => {
    setServiceView('admin');
    setActiveTab('services');
  };

  const handleTrainAI = () => {
    setServiceView('train-ai');
    setActiveTab('services');
  };

  const handleQuoteHistory = () => {
    setServiceView('quote-history');
    setActiveTab('services');
  };

  const handleCompareQuotes = (quoteIds: string[]) => {
    setSelectedCompareIds(quoteIds);
    setServiceView('quote-compare');
    setActiveTab('services');
  };


  const handleBrowseCarriers = () => {
    setServiceView('browse-carriers');
    setActiveTab('services');
  };

  const handleViewTimeline = (policyId: string) => {
    setSelectedPolicyId(policyId);
    setServiceView('policy-timeline');
    setActiveTab('services');
  };


  const handleOpenQuoteFromHistory = (quote: Quote) => {
    const key = quote.quote_id || quote.id;
    if (!key) return;
    setSelectedQuoteId(key);
    setActiveTab('quote');
    setServiceView('main');
  };

  const handleCarrierDetail = (carrierId: string) => {
    setSelectedCarrierId(carrierId);
    setServiceView('carrier-detail');
    setActiveTab('services');
  };

  const handleBackToServices = () => {
    setServiceView('main');
  };



  const handleBackToPolicy = () => {
    setServiceView('main');
    setActiveTab('policy');
  };

  // Handle successful bind - redirect to Policy Vault

  const handleBindSuccess = (policy: Policy) => {
    console.log('Policy created successfully:', policy);
    setSelectedQuoteId(null); // Clear any loaded quote
    setActiveTab('policy');
    setServiceView('main');
  };


  // Handle activity feed navigation
  const handleNavigateActivity = async (item: ActivityItem) => {
    switch (item.type) {
      case 'claim': {
        const claim = await getClaimById(item.id);
        if (claim) {
          setSelectedClaim(claim);
          setServiceView('claim-detail');
          setActiveTab('services');
        }
        break;
      }
      case 'coi':
        setCoiView('history');
        setActiveTab('coi');
        break;
      case 'policy':
        setActiveTab('policy');
        setServiceView('main');
        break;
    }
  };

  const renderContent = () => {
    if (activeTab === 'covered') {
      return <AmICoveredChat onBack={handleBackToPolicy} />;
    }

    if (activeTab === 'coi') {
      if (coiView === 'form') {
        return <RequestCOI onBack={() => setCoiView('hub')} />;
      }
      if (coiView === 'history') {
        return <COIRequestHistory onBack={() => setCoiView('hub')} />;
      }
      return <InstantCOI onStartRequest={() => setCoiView('form')} onViewHistory={() => setCoiView('history')} />;
    }

    // Handle Quote tab — pass selectedQuoteId so QuoteScreen loads it
    if (activeTab === 'quote') {
      const qid = selectedQuoteId ?? undefined;
      return (
        <QuoteScreen
          quoteIdFromUrl={qid}
          onBindSuccess={handleBindSuccess}
        />
      );
    }


    // Handle Services tab with sub-views
    if (activeTab === 'services') {
      switch (serviceView) {
        case 'claim':
          return <FileClaim onBack={handleBackToServices} />;
        case 'payment':
          return <UpdatePaymentMethod onBack={handleBackToServices} />;
        case 'documents':
          return <DownloadDocuments onBack={handleBackToServices} />;
        case 'billing':
          return <Billing onBack={handleBackToServices} />;
        case 'claim-history':
          return (
            <ClaimHistory 
              onBack={handleBackToServices} 
              onOpenClaim={(c) => { setSelectedClaim(c); setServiceView('claim-detail'); }}
            />
          );
        case 'claim-detail':
          if (!selectedClaim) { setServiceView('claim-history'); return null; }
          return (
            <ClaimDetail
              claim={selectedClaim}
              onBack={() => { setSelectedClaim(null); setServiceView('claim-history'); }}
            />
          );
        case 'carrier-detail':
          if (!selectedCarrierId) { setServiceView('main'); return null; }
          return (
            <CarrierDetail
              carrierId={selectedCarrierId}
              onBack={() => {
                setSelectedCarrierId(null);
                setServiceView('main');
                setActiveTab('policy');
              }}
            />
          );
        case 'quote-history':
          return (
            <QuoteHistory
              onBack={handleBackToServices}
              onOpenQuote={handleOpenQuoteFromHistory}
              onCompareQuotes={handleCompareQuotes}
            />
          );
        case 'quote-compare':
          if (selectedCompareIds.length < 2) {
            setServiceView('quote-history');
            return null;
          }
          return (
            <QuoteComparison
              quoteIds={selectedCompareIds}
              onBack={() => {
                setSelectedCompareIds([]);
                setServiceView('quote-history');
              }}
            />
          );

        case 'renewal-reminders':
          return (
            <RenewalReminders 
              onBack={handleBackToServices} 
              onShopRenewal={handleShopRenewal}
            />
          );
        case 'shop-renewal':
          return <RenewalComparison onBack={handleBackToServices} />;
        case 'admin':
          return <AdminDashboard onBack={handleBackToServices} />;
        case 'train-ai':
          return <AdminTrainAI onBack={handleBackToServices} />;
        case 'browse-carriers':
          return (
            <CarrierBrowser
              onBack={handleBackToServices}
              onSelectCarrier={handleCarrierDetail}
            />
          );
        case 'policy-timeline':
          if (!selectedPolicyId) { setServiceView('main'); setActiveTab('policy'); return null; }
          return (
            <PolicyTimeline
              policyId={selectedPolicyId}
              onBack={() => { setSelectedPolicyId(null); setServiceView('main'); setActiveTab('policy'); }}
            />
          );
        default:
          return (
            <ServicesScreen
              onRequestCOI={handleRequestCOI}
              onFileClaim={handleFileClaim}
              onCoverageChat={handleCoverageChat}
              onUpdatePayment={handleUpdatePayment}
              onDownloadDocuments={handleDownloadDocuments}
              onBilling={handleBilling}
              onCoiHistory={handleCoiHistory}
              onClaimHistory={handleClaimHistory}
              onRenewalReminders={handleRenewalReminders}
              onShopRenewal={handleShopRenewal}
              onAdminDashboard={isAdmin ? handleAdminDashboard : undefined}
              onTrainAI={isAdmin ? handleTrainAI : undefined}
              isAdmin={isAdmin}
              onNavigateActivity={handleNavigateActivity}
              onQuoteHistory={handleQuoteHistory}
              onBrowseCarriers={handleBrowseCarriers}
            />
          );
      }
    }




    // Handle other tabs
    switch (activeTab) {
      case 'policy':
        return (
          <PolicyVault
            onRequestCOI={handleRequestCOI}
            onFileClaim={handleFileClaim}
            onCoverageChat={handleCoverageChat}
            onDownloadDocuments={handleDownloadDocuments}
            onShopRenewal={handleShopRenewal}
            onUpdatePayment={handleUpdatePayment}
            onRenewalReminders={handleRenewalReminders}
            onCarrierDetail={handleCarrierDetail}
            onViewTimeline={handleViewTimeline}
          />
        );
      case 'profile':
        return <ProfileScreen />;
      default:
        return (
          <PolicyVault
            onRequestCOI={handleRequestCOI}
            onFileClaim={handleFileClaim}
            onCoverageChat={handleCoverageChat}
            onDownloadDocuments={handleDownloadDocuments}
            onShopRenewal={handleShopRenewal}
            onUpdatePayment={handleUpdatePayment}
            onRenewalReminders={handleRenewalReminders}
            onCarrierDetail={handleCarrierDetail}
            onViewTimeline={handleViewTimeline}
          />
        );
    }

  };


  const getTitle = () => {
    if (activeTab === 'covered') {
      return 'Am I Covered?';
    }

    if (activeTab === 'coi') {
      if (coiView === 'form') return 'Request COI';
      if (coiView === 'history') return 'COI History';
      return 'Instant COI';
    }

    if (activeTab === 'quote') {
      return 'Get a Quote';
    }
    
    if (activeTab === 'services') {
      switch (serviceView) {
        case 'claim':
          return 'File a Claim';
        case 'payment':
          return 'Update Payment';
        case 'documents':
          return 'Documents';
        case 'billing':
          return 'Payments & Billing';
        case 'renewal-reminders':
          return 'Renewal Reminders';
        case 'shop-renewal':
          return 'Shop Renewal';
        case 'admin':
          return 'Admin Dashboard';
        case 'train-ai':
          return 'Train AI';
        case 'carrier-detail':
          return 'Carrier Details';
        case 'quote-history':
          return 'Quote History';
        case 'quote-compare':
          return 'Compare Quotes';
        case 'browse-carriers':
          return 'Browse Carriers';
        case 'policy-timeline':
          return 'Policy Timeline';
        default:
          return 'Services';
      }


    }

    switch (activeTab) {
      case 'policy':
        return 'My Policy';
      case 'profile':
        return 'My Profile';
      default:
        return 'CID Connect';

    }
  };



  // Reset service view and clear selectedQuoteId when changing tabs
  const handleTabChange = (tab: TabType) => {
    if (tab !== 'services') {
      setServiceView('main');
    }
    if (tab !== 'coi') {
      setCoiView('hub');
    }
    // Clear loaded quote when navigating away from quote tab
    if (tab !== 'quote') {
      setSelectedQuoteId(null);
    }
    setActiveTab(tab);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={getTitle()} />
      
      <main className="pb-20 pt-4 px-4">
        {renderContent()}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default MainApp;

