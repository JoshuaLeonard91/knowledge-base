'use client';

import { useState, useEffect } from 'react';
import { X, SpinnerGap, CheckCircle, WarningCircle, EnvelopeSimple, User, Buildings } from '@phosphor-icons/react';
import type { ContactSettings, InquiryType } from '@/lib/cms';

interface ServiceOption {
  id: string;
  name: string;
}

interface ServiceContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedService?: string;
  services?: ServiceOption[];
  contactSettings: ContactSettings;
  inquiryTypes: InquiryType[];
}

interface FormData {
  name: string;
  email: string;
  company: string;
  service: string;
  inquiryType: string;
  message: string;
}

export function ServiceContactModal({ isOpen, onClose, preselectedService, services = [], contactSettings, inquiryTypes }: ServiceContactModalProps) {
  const defaultInquiryType = inquiryTypes[0]?.id || 'general';

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    company: '',
    service: preselectedService || '',
    inquiryType: defaultInquiryType,
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  // Update service when preselectedService changes
  useEffect(() => {
    if (preselectedService) {
      setFormData(prev => ({ ...prev, service: preselectedService }));
    }
  }, [preselectedService]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubmitResult(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch('/api/service-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      setSubmitResult({
        success: data.success,
        message: data.message || data.error || 'Inquiry submitted successfully!',
      });

      if (data.success) {
        // Reset form after successful submission
        setFormData({
          name: '',
          email: '',
          company: '',
          service: '',
          inquiryType: defaultInquiryType,
          message: '',
        });
      }
    } catch {
      setSubmitResult({
        success: false,
        message: 'Failed to submit inquiry. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-2xl animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors z-10"
        >
          <X size={20} weight="bold" className="text-[var(--text-muted)]" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-[var(--border-primary)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{contactSettings.formTitle}</h2>
          <p className="text-[var(--text-secondary)] mt-1">
            {contactSettings.formSubtitle}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitResult?.success ? (
            <div className="text-center py-8 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent-success)]/10 flex items-center justify-center">
                <CheckCircle size={32} weight="duotone" className="text-[var(--accent-success)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {contactSettings.successTitle}
              </h3>
              <p className="text-[var(--text-secondary)] mb-6">
                {contactSettings.successMessage}
              </p>
              <button onClick={onClose} className="btn btn-primary">
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitResult?.success === false && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20">
                  <WarningCircle size={20} weight="duotone" className="text-[var(--accent-danger)] flex-shrink-0" />
                  <p className="text-sm text-[var(--accent-danger)]">{submitResult.message}</p>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Your Name <span className="text-[var(--accent-danger)]">*</span>
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] z-10 pointer-events-none" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="John Doe"
                    className="input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Email Address <span className="text-[var(--accent-danger)]">*</span>
                </label>
                <div className="relative">
                  <EnvelopeSimple size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] z-10 pointer-events-none" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="john@example.com"
                    className="input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              {/* Company (optional) */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  {contactSettings.companyFieldLabel}
                </label>
                <div className="relative">
                  <Buildings size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] z-10 pointer-events-none" />
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder={contactSettings.companyFieldPlaceholder}
                    className="input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Service of Interest <span className="text-[var(--accent-danger)]">*</span>
                </label>
                <select
                  name="service"
                  value={formData.service}
                  onChange={handleChange}
                  required
                  className="input"
                >
                  <option value="">Select a service...</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                  <option value="general">General Inquiry</option>
                </select>
              </div>

              {/* Inquiry Type */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Inquiry Type <span className="text-[var(--accent-danger)]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {inquiryTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, inquiryType: type.id as FormData['inquiryType'] }))}
                      className={`p-2.5 rounded-lg border text-sm transition-all cursor-pointer ${
                        formData.inquiryType === type.id
                          ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                          : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Message <span className="text-[var(--accent-danger)]">*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Tell us about your needs, questions, or how we can help..."
                  rows={4}
                  className="input resize-none"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || !formData.name || !formData.email || !formData.service || !formData.message}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <SpinnerGap size={20} weight="bold" className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  contactSettings.submitButtonText
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
