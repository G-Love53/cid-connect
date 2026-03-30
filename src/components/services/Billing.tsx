import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  CreditCard, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  Clock,
  Building2,
  DollarSign,
  Info,
  Receipt,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface BillingProps {
  onBack: () => void;
}

// Extended policy type with billing information
interface BillingPolicy {
  id: string;
  policy_number: string;
  carrier: string;
  coverage_type: string;
  billing_type: 'direct' | 'agency';
  amount_due: number;
  due_date: string;
  autopay_enabled: boolean;
  carrier_payment_url?: string;
}

interface Transaction {
  id: string;
  date: string;
  policy_number: string;
  carrier: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  method: string;
}

const Billing: React.FC<BillingProps> = ({ onBack }) => {
  const [policies, setPolicies] = useState<BillingPolicy[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Fetch policy data (mock data for now - will be wired to Supabase later)
  useEffect(() => {
    const fetchBillingData = async () => {
      setLoading(true);
      
      // Simulated API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock policy data - will be replaced with Supabase fetch
      const mockPolicies: BillingPolicy[] = [
        {
          id: '1',
          policy_number: 'TRV-GL-2024-001',
          carrier: 'Travelers',
          coverage_type: 'General Liability',
          billing_type: 'direct',
          amount_due: 1250.00,
          due_date: '2025-01-15',
          autopay_enabled: true,
          carrier_payment_url: 'https://www.travelers.com/pay'
        },
        {
          id: '2',
          policy_number: 'HART-WC-2024-042',
          carrier: 'Hartford',
          coverage_type: 'Workers Comp',
          billing_type: 'agency',
          amount_due: 450.00,
          due_date: '2025-01-10',
          autopay_enabled: false
        },
        {
          id: '3',
          policy_number: 'PROG-AUTO-2024-118',
          carrier: 'Progressive',
          coverage_type: 'Commercial Auto',
          billing_type: 'direct',
          amount_due: 875.00,
          due_date: '2025-01-20',
          autopay_enabled: true,
          carrier_payment_url: 'https://www.progressive.com/pay'
        },
        {
          id: '4',
          policy_number: 'CNA-PROP-2024-055',
          carrier: 'CNA',
          coverage_type: 'Property',
          billing_type: 'agency',
          amount_due: 325.00,
          due_date: '2025-01-25',
          autopay_enabled: false
        }
      ];

      // Mock transaction history (only for agency bill payments)
      const mockTransactions: Transaction[] = [
        {
          id: 't1',
          date: '2024-12-15',
          policy_number: 'HART-WC-2024-042',
          carrier: 'Hartford',
          amount: 450.00,
          status: 'completed',
          method: 'Visa ending in 4242'
        },
        {
          id: 't2',
          date: '2024-11-15',
          policy_number: 'HART-WC-2024-042',
          carrier: 'Hartford',
          amount: 450.00,
          status: 'completed',
          method: 'Visa ending in 4242'
        },
        {
          id: 't3',
          date: '2024-11-10',
          policy_number: 'CNA-PROP-2024-055',
          carrier: 'CNA',
          amount: 325.00,
          status: 'completed',
          method: 'ACH ending in 9876'
        }
      ];

      setPolicies(mockPolicies);
      setTransactions(mockTransactions);
      setLoading(false);
    };

    fetchBillingData();
  }, []);

  const handlePayNow = async (policyId: string) => {
    setProcessingPayment(policyId);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setProcessingPayment(null);
    setPaymentSuccess(policyId);
    
    // Clear success message after 3 seconds
    setTimeout(() => setPaymentSuccess(null), 3000);
  };

  const handlePayOnCarrierSite = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Services</span>
        </button>
        
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#F7941D] mx-auto mb-4" />
            <p className="text-gray-500">Loading billing information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Services</span>
      </button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-[#F7941D] to-[#E07D0D] rounded-xl shadow-lg">
          <CreditCard className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payments & Billing</h1>
          <p className="text-gray-500">Manage your policy payments</p>
        </div>
      </div>

      {/* Active Invoices */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#1B3A5F]" />
          Active Invoices
        </h2>
        
        <div className="space-y-3">
          {policies.map((policy) => {
            const daysUntilDue = getDaysUntilDue(policy.due_date);
            const isOverdue = daysUntilDue < 0;
            const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;
            
            return (
              <Card key={policy.id} className="border-0 shadow-md overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4">
                    {/* Policy Info Row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-800">
                            {policy.carrier} - {policy.coverage_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 ml-6">{policy.policy_number}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          policy.billing_type === 'direct' 
                            ? 'border-blue-200 bg-blue-50 text-blue-700' 
                            : 'border-orange-200 bg-orange-50 text-orange-700'
                        }`}
                      >
                        {policy.billing_type === 'direct' ? 'Direct Bill' : 'Agency Bill'}
                      </Badge>
                    </div>

                    {/* Due Date & Amount */}
                    <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Due Date</p>
                        <p className={`font-medium ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-gray-800'}`}>
                          {formatDate(policy.due_date)}
                          {isOverdue && <span className="text-xs ml-1">(Overdue)</span>}
                          {isDueSoon && !isOverdue && <span className="text-xs ml-1">({daysUntilDue} days)</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Amount Due</p>
                        <p className="font-bold text-xl text-gray-800">{formatCurrency(policy.amount_due)}</p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="space-y-2">
                      {paymentSuccess === policy.id ? (
                        <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-lg text-green-700">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-medium">Payment Successful!</span>
                        </div>
                      ) : policy.billing_type === 'direct' ? (
                        <Button
                          variant="outline"
                          className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                          onClick={() => policy.carrier_payment_url && handlePayOnCarrierSite(policy.carrier_payment_url)}
                        >
                          <span>Pay on Carrier Site</span>
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      ) : (
                        <Button
                          className="w-full bg-[#F7941D] hover:bg-[#E07D0D] text-white"
                          onClick={() => handlePayNow(policy.id)}
                          disabled={processingPayment === policy.id}
                        >
                          {processingPayment === policy.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-4 h-4 mr-1" />
                              Pay Now ({formatCurrency(policy.amount_due)})
                            </>
                          )}
                        </Button>
                      )}

                      {/* Autopay Status */}
                      <div className="flex items-center gap-2 text-sm">
                        {policy.autopay_enabled ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-green-700">Autopay Active</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-500">Manual Payment</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Payment Instructions (Collapsible) */}
      <Collapsible open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <Card className="border-0 shadow-md">
          <CollapsibleTrigger asChild>
            <button className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-semibold text-gray-800">Payment Instructions</span>
              </div>
              {instructionsOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4">
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 leading-relaxed">
                <p className="mb-3">
                  <strong>Most policies are Direct Bill.</strong> If you are set up on Autopay with the carrier, 
                  no action is needed here. Your payment will be automatically processed on the due date.
                </p>
                <p className="mb-3">
                  <strong>To update your card on file with the carrier,</strong> click the "Pay on Carrier Site" 
                  button above. You'll be redirected to the carrier's secure payment portal.
                </p>
                <p>
                  <strong>Agency Bill policies</strong> are billed through our agency. Use the orange "Pay Now" 
                  button to make a payment directly through this app using your saved payment method.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Transaction History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#1B3A5F]" />
          Transaction History
        </h2>
        <p className="text-sm text-gray-500 -mt-1">
          Payments made through this app (Agency Bill only)
        </p>
        
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {transactions.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800">
                          {transaction.carrier}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            transaction.status === 'completed' 
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : transaction.status === 'pending'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                          }`}
                        >
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{transaction.policy_number}</p>
                      <p className="text-xs text-gray-400 mt-1">{transaction.method}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">{formatCurrency(transaction.amount)}</p>
                      <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No transactions yet</p>
                <p className="text-sm text-gray-400">Payments made through this app will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Help Card */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-[#1B3A5F] to-[#2C5282] text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Need to update your payment method?</h3>
              <p className="text-sm text-blue-200">
                For Agency Bill policies, go to your Profile to update your card on file.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;
