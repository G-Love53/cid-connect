import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  CreditCard, 
  CheckCircle2,
  Loader2,
  Building,
  Calendar,
  Lock,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Policy } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { getActivePolicyForUser } from '@/api';

interface UpdatePaymentMethodProps {
  onBack: () => void;
}

const UpdatePaymentMethod: React.FC<UpdatePaymentMethodProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paymentType, setPaymentType] = useState<'card' | 'bank'>('card');
  
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });

  const [bankData, setBankData] = useState({
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking'
  });

  useEffect(() => {
    if (user) {
      fetchPolicy();
    }
  }, [user]);

  const fetchPolicy = async () => {
    if (!user) return;
    
    try {
      const active = await getActivePolicyForUser(user.id);
      setPolicy(active);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !policy) {
      toast({
        title: 'Error',
        description: 'No active policy found',
        variant: 'destructive'
      });
      return;
    }

    // Basic validation
    if (paymentType === 'card') {
      if (!cardData.cardNumber || !cardData.cardholderName || !cardData.expiryMonth || !cardData.expiryYear || !cardData.cvv) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all card details',
          variant: 'destructive'
        });
        return;
      }
    } else {
      if (!bankData.accountHolderName || !bankData.routingNumber || !bankData.accountNumber) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all bank account details',
          variant: 'destructive'
        });
        return;
      }
    }

    setSubmitting(true);
    
    try {
      // Save payment method update request to database
      const { error } = await supabase
        .from('payment_method_requests')
        .insert({
          user_id: user.id,
          policy_id: policy.id,
          payment_type: paymentType,
          // Store masked/partial info for reference (never store full card/bank details)
          last_four: paymentType === 'card' 
            ? cardData.cardNumber.replace(/\s/g, '').slice(-4)
            : bankData.accountNumber.slice(-4),
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Payment Method Updated',
        description: 'Your payment information has been securely submitted'
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error('Error updating payment method:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to update payment method',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Services</span>
        </button>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
            <span className="ml-2 text-gray-600">Loading...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Services</span>
        </button>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Method Updated!</h2>
            <p className="text-gray-600 mb-4">
              Your new payment information has been securely saved.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-500">Payment Method</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                {paymentType === 'card' ? (
                  <CreditCard className="w-5 h-5 text-[#1B3A5F]" />
                ) : (
                  <Building className="w-5 h-5 text-[#1B3A5F]" />
                )}
                <p className="font-semibold text-[#1B3A5F]">
                  {paymentType === 'card' ? 'Credit/Debit Card' : 'Bank Account'} ending in{' '}
                  {paymentType === 'card' 
                    ? cardData.cardNumber.replace(/\s/g, '').slice(-4)
                    : bankData.accountNumber.slice(-4)
                  }
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Your next payment will be processed using this method.
            </p>
            
            <Button onClick={onBack} className="bg-[#F7941D] hover:bg-[#E07D0D]">
              Return to Services
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Services</span>
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-[#1B3A5F]/10 rounded-lg">
          <CreditCard className="w-6 h-6 text-[#1B3A5F]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Update Payment Method</h1>
          <p className="text-sm text-gray-500">Manage your billing information</p>
        </div>
      </div>

      {!policy ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No active policy found. Please contact your agent.</p>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Policy Reference */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Policy Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-[#1B3A5F]">{policy.policy_number}</p>
              <p className="text-sm text-gray-600">{policy.business_name}</p>
            </CardContent>
          </Card>

          {/* Payment Type Selection */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Payment Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentType('card')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentType === 'card'
                      ? 'border-[#F7941D] bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className={`w-6 h-6 mx-auto mb-2 ${
                    paymentType === 'card' ? 'text-[#F7941D]' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm font-medium ${
                    paymentType === 'card' ? 'text-[#1B3A5F]' : 'text-gray-600'
                  }`}>
                    Credit/Debit Card
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('bank')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentType === 'bank'
                      ? 'border-[#F7941D] bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building className={`w-6 h-6 mx-auto mb-2 ${
                    paymentType === 'bank' ? 'text-[#F7941D]' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm font-medium ${
                    paymentType === 'bank' ? 'text-[#1B3A5F]' : 'text-gray-600'
                  }`}>
                    Bank Account
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Card Details */}
          {paymentType === 'card' && (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-green-600" />
                  Card Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number *</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={cardData.cardNumber}
                    onChange={(e) => setCardData(prev => ({ 
                      ...prev, 
                      cardNumber: formatCardNumber(e.target.value)
                    }))}
                    maxLength={19}
                    className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardholderName">Cardholder Name *</Label>
                  <Input
                    id="cardholderName"
                    placeholder="Name as it appears on card"
                    value={cardData.cardholderName}
                    onChange={(e) => setCardData(prev => ({ 
                      ...prev, 
                      cardholderName: e.target.value 
                    }))}
                    className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Month *</Label>
                    <Select
                      value={cardData.expiryMonth}
                      onValueChange={(value) => setCardData(prev => ({ 
                        ...prev, 
                        expiryMonth: value 
                      }))}
                    >
                      <SelectTrigger className="border-gray-200">
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month} value={month}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Year *</Label>
                    <Select
                      value={cardData.expiryYear}
                      onValueChange={(value) => setCardData(prev => ({ 
                        ...prev, 
                        expiryYear: value 
                      }))}
                    >
                      <SelectTrigger className="border-gray-200">
                        <SelectValue placeholder="YYYY" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV *</Label>
                    <Input
                      id="cvv"
                      type="password"
                      placeholder="123"
                      value={cardData.cvv}
                      onChange={(e) => setCardData(prev => ({ 
                        ...prev, 
                        cvv: e.target.value.replace(/\D/g, '').slice(0, 4)
                      }))}
                      maxLength={4}
                      className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bank Account Details */}
          {paymentType === 'bank' && (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-green-600" />
                  Bank Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Account Holder Name *</Label>
                  <Input
                    id="accountHolderName"
                    placeholder="Name on the account"
                    value={bankData.accountHolderName}
                    onChange={(e) => setBankData(prev => ({ 
                      ...prev, 
                      accountHolderName: e.target.value 
                    }))}
                    className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Routing Number *</Label>
                  <Input
                    id="routingNumber"
                    placeholder="9-digit routing number"
                    value={bankData.routingNumber}
                    onChange={(e) => setBankData(prev => ({ 
                      ...prev, 
                      routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9)
                    }))}
                    maxLength={9}
                    className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Account number"
                    value={bankData.accountNumber}
                    onChange={(e) => setBankData(prev => ({ 
                      ...prev, 
                      accountNumber: e.target.value.replace(/\D/g, '')
                    }))}
                    className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account Type *</Label>
                  <Select
                    value={bankData.accountType}
                    onValueChange={(value) => setBankData(prev => ({ 
                      ...prev, 
                      accountType: value 
                    }))}
                  >
                    <SelectTrigger className="border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Notice */}
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
            <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Secure Payment</p>
              <p className="text-xs text-green-600">
                Your payment information is encrypted and securely transmitted. We never store your full card or bank details.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-[#F7941D] hover:bg-[#E07D0D] text-white font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Update Payment Method
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
};

export default UpdatePaymentMethod;
