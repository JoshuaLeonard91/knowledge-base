'use client';

/**
 * Dynamic Form Field Component
 *
 * Renders a form field based on CMS configuration.
 * Supports various field types: TEXT, EMAIL, SELECT, COLOR, THEME, IMAGE_URL, TEXTAREA
 */

import type { OnboardingField } from '@/lib/cms';

// Theme option type
export interface ThemeOption {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    background: string;
    surface: string;
    text: string;
  };
}

// Predefined theme options - exported for use in theme application
export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Midnight',
    description: 'Sleek dark theme with indigo accents',
    colors: {
      primary: '#6366f1',
      background: '#0a0a0f',
      surface: '#16161f',
      text: '#ffffff',
    },
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Clean white theme with indigo accents',
    colors: {
      primary: '#4f46e5',
      background: '#ffffff',
      surface: '#f6f8fa',
      text: '#1f2328',
    },
  },
  {
    id: 'spooky',
    name: 'Spooky',
    description: 'Halloween orange & toxic green on deep purple',
    colors: {
      primary: '#f97316',
      background: '#0d0a12',
      surface: '#161022',
      text: '#f5f0e8',
    },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    description: 'Cool blue-gray with teal accents',
    colors: {
      primary: '#88c0d0',
      background: '#2e3440',
      surface: '#3b4252',
      text: '#eceff4',
    },
  },
  {
    id: 'dusk',
    name: 'Dusk',
    description: 'Warm purple-mauve with rose accents',
    colors: {
      primary: '#c4a7e7',
      background: '#232136',
      surface: '#2a273f',
      text: '#e0def4',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Earthy browns with warm amber accents',
    colors: {
      primary: '#fabd2f',
      background: '#282828',
      surface: '#3c3836',
      text: '#ebdbb2',
    },
  },
  {
    id: 'twilight',
    name: 'Twilight',
    description: 'Refined navy with periwinkle accents',
    colors: {
      primary: '#7aa2f7',
      background: '#1a1b26',
      surface: '#24283b',
      text: '#c0caf5',
    },
  },
  {
    id: 'pastel',
    name: 'Pastel',
    description: 'Soothing dark with soft pastel accents',
    colors: {
      primary: '#89b4fa',
      background: '#1e1e2e',
      surface: '#181825',
      text: '#cdd6f4',
    },
  },
  {
    id: 'oceanic',
    name: 'Oceanic',
    description: 'Teal-green with cyan accents',
    colors: {
      primary: '#2aa198',
      background: '#002b36',
      surface: '#073642',
      text: '#eee8d5',
    },
  },
];

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
    case 'THEME':
      return (
        <div>
          <label className="block text-sm font-medium text-white/80 mb-3">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <div className="grid gap-3">
            {THEME_OPTIONS.map((theme) => {
              const isSelected = value === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onChange(field.name, theme.id)}
                  className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-white/10 hover:border-white/20 bg-white/5'
                  }`}
                >
                  {/* Theme Preview */}
                  <div
                    className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-white/10"
                    style={{ backgroundColor: theme.colors.background }}
                  >
                    <div
                      className="h-3 w-full"
                      style={{ backgroundColor: theme.colors.surface }}
                    />
                    <div className="p-1.5 flex gap-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <div
                        className="flex-1 h-2 rounded"
                        style={{ backgroundColor: theme.colors.surface }}
                      />
                    </div>
                    <div className="px-1.5">
                      <div
                        className="h-1.5 w-3/4 rounded"
                        style={{ backgroundColor: theme.colors.text, opacity: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white">{theme.name}</div>
                    <div className="text-sm text-white/50">{theme.description}</div>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      );

    default:
      return null;
  }
}
