import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';

export default function Checkout() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/catalog" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold mb-6">Checkout</h2>
              
              <div className="flex items-center gap-3 mb-8 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
                <p className="text-sm font-medium">Your payment is secure and encrypted.</p>
              </div>

              <form onSubmit={handlePayment} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-4">Payment Method</h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 border-2 border-blue-600 rounded-xl bg-blue-50/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input type="radio" name="payment" defaultChecked className="text-blue-600 focus:ring-blue-500 w-4 h-4" />
                        <span className="font-bold">Credit Card</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-10 h-6 bg-slate-200 rounded"></div>
                        <div className="w-10 h-6 bg-slate-200 rounded"></div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Name on Card</label>
                    <input type="text" required placeholder="Alex Johnson" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Card Number</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input type="text" required placeholder="0000 0000 0000 0000" className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Expiry Date</label>
                      <input type="text" required placeholder="MM/YY" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">CVC</label>
                      <input type="text" required placeholder="123" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
                >
                  {isProcessing ? (
                    'Processing...'
                  ) : (
                    <>
                      <Lock className="w-4 h-4" /> Pay $89.99
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-8">
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>
              
              <div className="flex gap-4 mb-6 pb-6 border-b border-slate-100">
                <img src="https://images.unsplash.com/photo-1555099962-4199c345e5dd?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Course" className="w-16 h-16 rounded-lg object-cover" />
                <div>
                  <h4 className="font-bold text-sm line-clamp-2">Advanced React Patterns & Best Practices</h4>
                  <p className="text-xs text-slate-500 mt-1">By Sarah Chen</p>
                </div>
              </div>

              <div className="space-y-3 text-sm mb-6 pb-6 border-b border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Original Price</span>
                  <span className="font-medium">$129.99</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-medium">-$40.00</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-2xl text-slate-900">$89.99</span>
              </div>

              <p className="text-xs text-slate-500 text-center">
                By completing your purchase you agree to our <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
