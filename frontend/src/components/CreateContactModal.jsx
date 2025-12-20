import React, { useState, useEffect } from 'react';
import { Dialog, Button, Input, Label, Alert, Badge } from './ui';

/**
 * Create Contact Modal
 * Modal form for creating a new contact
 */
export const CreateContactModal = ({
  isOpen,
  onClose,
  onContactCreated,
  onCreated,
  availableTags = []
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    consent_whatsapp: false,
    consent_email: false,
    tags: []
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        phone: '',
        email: '',
        consent_whatsapp: false,
        consent_email: false,
        tags: []
      });
      setErrors({});
      setSuccessMessage('');
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone || !formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleTagToggle = (tag) => {
    const tagId = String(tag.id ?? tag);
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(t => t !== tagId)
        : [...prev.tags, tagId]
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setSuccessMessage('');

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          consent_whatsapp: formData.consent_whatsapp,
          consent_email: formData.consent_email,
          tags: Array.from(new Set(formData.tags))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrors({ submit: errorData.message || 'Failed to create contact' });
        return;
      }

      setSuccessMessage('Contact created successfully!');

      setTimeout(() => {
        if (onContactCreated) onContactCreated();
        if (onCreated) onCreated();
        onClose();
      }, 500);

    } catch (error) {
      console.error('Create contact error:', error);
      setErrors({ submit: error.message || 'An error occurred while creating the contact' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Create Contact"
      description="Add a new contact with consent and tags."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Create Contact'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {successMessage && (
          <Alert variant="success">{successMessage}</Alert>
        )}

        {errors.submit && (
          <Alert variant="error">{errors.submit}</Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={errors.name ? 'border-red-500' : ''}
            placeholder="John Doe"
            disabled={loading}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className={errors.phone ? 'border-red-500' : ''}
            placeholder="+1 (555) 000-0000"
            disabled={loading}
          />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={errors.email ? 'border-red-500' : ''}
            placeholder="john@example.com"
            disabled={loading}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="consent_whatsapp"
              checked={formData.consent_whatsapp}
              onChange={handleInputChange}
              className="w-4 h-4 text-primary-600"
              disabled={loading}
            />
            <span className="text-sm text-[var(--text)]">WhatsApp Consent</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="consent_email"
              checked={formData.consent_email}
              onChange={handleInputChange}
              className="w-4 h-4 text-primary-600"
              disabled={loading}
            />
            <span className="text-sm text-[var(--text)]">Email Consent</span>
          </label>
        </div>

        {availableTags.length > 0 && (
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <Badge
                  key={tag.id || tag}
                  variant={formData.tags.includes(String(tag.id ?? tag)) ? 'primary' : 'neutral'}
                  className="cursor-pointer"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag.name || tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
