import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui'

/**
 * WhatsApp Preview Component
 * Displays a live preview of the template as it would appear in WhatsApp
 */
const WhatsAppPreview = ({ components, template }) => {
  // Handle both component structure (from create) and template structure (from API)
  const comp = components || (template?.components) || {}
  const headerText = comp.HEADER?.text || template?.header_text
  const bodyText = comp.BODY?.text || template?.body || template?.body_template
  const footerText = comp.FOOTER?.text || template?.footer_text
  const buttons = comp.BUTTONS?.buttons || template?.buttons || []

  const renderVariablePlaceholder = (text) => {
    if (!text) return text

    // Replace {{1}}, {{2}}, etc. with visual placeholders
    const parts = text.split(/(\{\{\d+\}\})/g)
    return parts.map((part, index) => {
      if (/\{\{\d+\}\}/.test(part)) {
        const varNum = part.match(/\d+/)[0]
        return (
          <span key={index} className="bg-blue-100 text-blue-800 px-1 rounded text-xs font-mono">
            [var{varNum}]
          </span>
        )
      }
      return part
    })
  }

  return (
    <Card className="border-2 border-gray-200 shadow-lg">
      <CardHeader>
        <CardTitle className="text-sm">📱 WhatsApp Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-100 rounded-lg overflow-hidden">
          {/* WhatsApp Header */}
          <div className="bg-green-600 text-white px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center text-lg">
              💼
            </div>
            <div>
              <p className="text-sm font-semibold">Business Account</p>
              <p className="text-xs text-green-100">Active now</p>
            </div>
          </div>

          {/* Message Bubble */}
          <div className="bg-white p-4 space-y-3">
            {/* Header */}
            {headerText && (
              <div>
                {comp.HEADER?.format === 'TEXT' || typeof headerText === 'string' ? (
                  <div className="bg-gray-100 p-3 rounded mb-2 border-l-4 border-green-500">
                    <p className="text-sm font-semibold text-gray-800">
                      {renderVariablePlaceholder(headerText)}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-200 h-32 rounded mb-2 flex items-center justify-center">
                    <p className="text-xs text-gray-600 text-center">
                      📦 Media\n(Uploaded on send)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Body */}
            {bodyText && (
              <div className="bg-white text-gray-800">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {renderVariablePlaceholder(bodyText)}
                </p>
              </div>
            )}

            {!bodyText && (
              <div className="text-center py-6">
                <p className="text-xs text-gray-400 italic">Template body appears here...</p>
              </div>
            )}

            {/* Footer */}
            {footerText && (
              <div className="border-t border-gray-200 pt-2 mt-3">
                <p className="text-xs text-gray-600 text-center">
                  {renderVariablePlaceholder(footerText)}
                </p>
              </div>
            )}

            {/* Buttons */}
            {buttons && buttons.length > 0 && (
              <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
                {buttons.map((button, index) => (
                  <button
                    key={index}
                    disabled
                    className="w-full py-2 px-3 border border-green-600 text-green-600 rounded text-sm font-medium hover:bg-green-50 disabled:opacity-70"
                  >
                    {button.type === 'URL' && '🔗 '}
                    {button.type === 'PHONE_NUMBER' && '📞 '}
                    {button.text || 'Button'}
                  </button>
                ))}
              </div>
            )}

            {/* Timestamp */}
            <div className="text-right pt-2">
              <p className="text-xs text-gray-400">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* WhatsApp Footer Info */}
          <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              ✓✓ Delivered (preview only)
            </p>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-700 space-y-1">
          <p>
            <strong>Note:</strong> This is a visual preview of how your template will appear in WhatsApp.
          </p>
          <p>
            Variables {`({{1}}, {{2}}, etc.)`} will be replaced with actual values when sending.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default WhatsAppPreview
