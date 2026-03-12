import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { courseService } from '../services/courseService';
import { billingService } from '../services/billingService';
import type { Course } from '../types/lms';
import { useToast } from '../contexts/ToastContext';

export default function Checkout() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!id) return;
    courseService
      .getCourse(id)
      .then(setCourse)
      .catch(() => {
        const message = 'Cours introuvable.';
        showToast(message, 'error');
      });
  }, [id, showToast]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsProcessing(true);
    try {
      await billingService.checkoutCourse(id);
      showToast('Paiement confirme. Vous etes inscrit au cours.', 'success');
      navigate('/courses', { replace: true });
    } catch {
      const message = "Paiement impossible. Vous etes peut-etre deja inscrit.";
      showToast(message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/catalog" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold mb-6">Checkout</h2>

              <div className="flex items-center gap-3 mb-8 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
                <p className="text-sm font-medium">Your payment is secure and encrypted.</p>
              </div>

              <form onSubmit={handlePayment} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Name on Card</label>
                  <input type="text" required placeholder="Alex Johnson" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Card Number</label>
                  <input type="text" required placeholder="0000 0000 0000 0000" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

                <button
                  type="submit"
                  disabled={isProcessing || !course}
                  className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
                >
                  {isProcessing ? 'Processing...' : (<><Lock className="w-4 h-4" /> Pay ${course?.price || '0.00'}</>)}
                </button>
              </form>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-8">
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>
              <div className="flex gap-4 mb-6 pb-6 border-b border-slate-100">
                <img src={course?.thumbnail_url || 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&w=200&q=80'} alt="Course" className="w-16 h-16 rounded-lg object-cover" />
                <div>
                  <h4 className="font-bold text-sm line-clamp-2">{course?.title || 'Loading course...'}</h4>
                  <p className="text-xs text-slate-500 mt-1">By {course?.instructor_name || 'Instructor'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-2xl text-slate-900">${course?.price || '0.00'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
