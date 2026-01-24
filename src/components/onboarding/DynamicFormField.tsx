'use client';

/**
 * Dynamic Form Field Component
 *
 * Renders a form field based on CMS configuration.
 * Supports various field types: TEXT, EMAIL, SELECT, COLOR, IMAGE_URL, TEXTAREA
 */

import type { OnboardingField } from '@/lib/cms';

interface DynamicFormFieldProps {
  field: OnboardingField;
  value: string;
  onChange: (name: string, value: string) => void;
  error?: string;
}

export function DynamicFormField({ field, value, onChange, error }: DynamicFormFieldProps) {
  const baseInputClasses =
    'w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition';
  const errorClasses = error ? 'border-red-500/50' : 'border-white/10';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange(field.name, e.target.value);
  };

  switch (field.type) {
    case 'TEXT':
    case 'EMAIL':
    case 'IMAGE_URL':
      return (
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <input
            type={field.type === 'EMAIL' ? 'email' : field.type === 'IMAGE_URL' ? 'url' : 'text'}
            name={field.name}
            value={value}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            className={`${baseInputClasses} ${errorClasses}`}
          />
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </div>
      );

    case 'TEXTAREA':
      return (
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <textarea
            name={field.name}
            value={value}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className={`${baseInputClasses} ${errorClasses} resize-none`}
          />
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </div>
      );

    case 'SELECT':
      return (
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <select
            name={field.name}
            value={value}
            onChange={handleChange}
            required={field.required}
            className={`${baseInputClasses} ${errorClasses}`}
          >
            <option value="">Select an option...</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </div>
      );

    case 'COLOR':
      return (
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              name={field.name}
              value={value || '#6366f1'}
              onChange={handleChange}
              className="w-12 h-12 rounded-lg border border-white/10 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={value || '#6366f1'}
              onChange={handleChange}
              placeholder="#6366f1"
              className={`flex-1 ${baseInputClasses} ${errorClasses}`}
            />
          </div>
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </div>
      );

    default:
      return null;
  }
}
