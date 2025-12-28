import React, { useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Alert,
  Select
} from '../ui'

/**
 * Template Builder Component
 * Allows users to build WhatsApp message templates with components
 */
const TemplateBuilder = ({ components, onChange, disabled = false }) => {
  const [showHeaderBuilder, setShowHeaderBuilder] = useState(!!components.HEADER)
  const [showFooterBuilder, setShowFooterBuilder] = useState(!!components.FOOTER)
  const [showButtonsBuilder, setShowButtonsBuilder] = useState(!!components.BUTTONS)

  const updateComponent = (componentType, updates) => {
    onChange({
      ...components,
      [componentType]: updates ? { ...components[componentType], ...updates } : null
    })
  }

  const addVariable = (text) => {
    const variableCount = (text.match(/\{\{(\d+)\}\}/g) || []).length
    return `{{${variableCount + 1}}}`
  }

  return (
    <div className="space-y-4">
      {/* Header Component */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">📌 Header (Optional)</CardTitle>
            <Button
              size="sm"
              variant={showHeaderBuilder ? 'destructive' : 'outline'}
              onClick={() => {
                setShowHeaderBuilder(!showHeaderBuilder)
                if (showHeaderBuilder) {
                  updateComponent('HEADER', null)
                } else {
                  updateComponent('HEADER', {
                    type: 'TEXT',
                    format: 'TEXT',
                    text: '',
                    example: { header_text: [] }
                  })
                }
              }}
              disabled={disabled}
            >
              {showHeaderBuilder ? '✕ Remove' : '➕ Add Header'}
            </Button>
          </div>
        </CardHeader>

        {showHeaderBuilder && (
          <CardContent className="space-y-3">
            {/* Header Type */}
            <div>
              <Label htmlFor="headerType">Header Type</Label>
              <Select
                id="headerType"
                value={components.HEADER?.format || 'TEXT'}
                onChange={(e) =>
                  updateComponent('HEADER', {
                    type: e.target.value,
                    format: e.target.value
                  })
                }
                disabled={disabled}
              >
                <option value="TEXT">📝 Text</option>
                <option value="IMAGE">🖼️ Image</option>
                <option value="VIDEO">🎥 Video</option>
                <option value="DOCUMENT">📄 Document</option>
              </Select>
            </div>

            {/* Header Text (only for TEXT type) */}
            {components.HEADER?.format === 'TEXT' && (
              <div>
                <Label htmlFor="headerText">Header Text</Label>
                <Input
                  id="headerText"
                  value={components.HEADER?.text || ''}
                  onChange={(e) =>
                    updateComponent('HEADER', {
                      text: e.target.value
                    })
                  }
                  placeholder="Welcome to our store!"
                  disabled={disabled}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Header text will appear at the top of the message
                </p>
              </div>
            )}

            {components.HEADER?.format !== 'TEXT' && (
              <div className="p-3 bg-blue-50 rounded text-sm">
                <p className="text-blue-700">
                  📦 {components.HEADER?.format} headers will be uploaded when sending messages
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Body Component */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💬 Message Body (Required)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="bodyText">Message Text</Label>
            <textarea
              id="bodyText"
              value={components.BODY?.text || ''}
              onChange={(e) =>
                updateComponent('BODY', {
                  text: e.target.value
                })
              }
              placeholder="Hi {{1}}, your order {{2}} is confirmed!"
              disabled={disabled}
              className="w-full border border-gray-300 rounded-lg p-2 min-h-[120px] font-mono text-sm mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use {'{{1}}, {{2}}, etc.'} for variables that will be replaced when sending messages
            </p>
          </div>

          {/* Add Variable Button */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const currentText = components.BODY?.text || ''
              const newVariable = addVariable(currentText)
              updateComponent('BODY', {
                text: currentText ? currentText + ` ${newVariable}` : newVariable
              })
            }}
            disabled={disabled}
            className="w-full"
          >
            ➕ Add Variable Placeholder
          </Button>

          {/* Variable Count */}
          {components.BODY?.text && (
            <div className="p-2 bg-green-50 rounded text-sm">
              <p className="text-green-700">
                ✓ {(components.BODY.text.match(/\{\{(\d+)\}\}/g) || []).length} variable placeholder
                {(components.BODY.text.match(/\{\{(\d+)\}\}/g) || []).length !== 1 ? 's' : ''} detected
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Component */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">👣 Footer (Optional)</CardTitle>
            <Button
              size="sm"
              variant={showFooterBuilder ? 'destructive' : 'outline'}
              onClick={() => {
                setShowFooterBuilder(!showFooterBuilder)
                if (showFooterBuilder) {
                  updateComponent('FOOTER', null)
                } else {
                  updateComponent('FOOTER', {
                    type: 'FOOTER',
                    text: ''
                  })
                }
              }}
              disabled={disabled}
            >
              {showFooterBuilder ? '✕ Remove' : '➕ Add Footer'}
            </Button>
          </div>
        </CardHeader>

        {showFooterBuilder && (
          <CardContent>
            <Label htmlFor="footerText">Footer Text</Label>
            <Input
              id="footerText"
              value={components.FOOTER?.text || ''}
              onChange={(e) =>
                updateComponent('FOOTER', {
                  text: e.target.value
                })
              }
              placeholder="Powered by EngageNinja"
              disabled={disabled}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Brief text that appears at the bottom of the message
            </p>
          </CardContent>
        )}
      </Card>

      {/* Buttons Component */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">🔘 Buttons (Optional)</CardTitle>
            <Button
              size="sm"
              variant={showButtonsBuilder ? 'destructive' : 'outline'}
              onClick={() => {
                setShowButtonsBuilder(!showButtonsBuilder)
                if (showButtonsBuilder) {
                  updateComponent('BUTTONS', null)
                } else {
                  updateComponent('BUTTONS', {
                    type: 'BUTTONS',
                    buttons: []
                  })
                }
              }}
              disabled={disabled}
            >
              {showButtonsBuilder ? '✕ Remove' : '➕ Add Buttons'}
            </Button>
          </div>
        </CardHeader>

        {showButtonsBuilder && (
          <CardContent className="space-y-4">
            {/* Buttons List */}
            {components.BUTTONS?.buttons && components.BUTTONS.buttons.length > 0 && (
              <div className="space-y-3">
                {components.BUTTONS.buttons.map((button, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <Label className="font-semibold">Button {index + 1}</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const newButtons = components.BUTTONS.buttons.filter(
                            (_, i) => i !== index
                          )
                          updateComponent('BUTTONS', { buttons: newButtons })
                        }}
                        disabled={disabled}
                      >
                        🗑️ Remove
                      </Button>
                    </div>

                    {/* Button Type */}
                    <div className="mb-3">
                      <Label htmlFor={`btnType-${index}`} className="text-sm">
                        Type
                      </Label>
                      <Select
                        id={`btnType-${index}`}
                        value={button.type || 'QUICK_REPLY'}
                        onChange={(e) => {
                          const newButtons = [...components.BUTTONS.buttons]
                          newButtons[index] = { ...button, type: e.target.value }
                          updateComponent('BUTTONS', { buttons: newButtons })
                        }}
                        disabled={disabled}
                      >
                        <option value="QUICK_REPLY">💬 Quick Reply</option>
                        <option value="URL">🔗 Website URL</option>
                        <option value="PHONE_NUMBER">📞 Phone Number</option>
                      </Select>
                    </div>

                    {/* Button Text */}
                    <div className="mb-3">
                      <Label htmlFor={`btnText-${index}`} className="text-sm">
                        Button Text
                      </Label>
                      <Input
                        id={`btnText-${index}`}
                        placeholder="Click here"
                        value={button.text || ''}
                        onChange={(e) => {
                          const newButtons = [...components.BUTTONS.buttons]
                          newButtons[index] = { ...button, text: e.target.value }
                          updateComponent('BUTTONS', { buttons: newButtons })
                        }}
                        disabled={disabled}
                        className="mt-1 text-sm"
                      />
                    </div>

                    {/* URL (for URL type) */}
                    {button.type === 'URL' && (
                      <div>
                        <Label htmlFor={`btnUrl-${index}`} className="text-sm">
                          URL
                        </Label>
                        <Input
                          id={`btnUrl-${index}`}
                          placeholder="https://example.com"
                          value={button.url || ''}
                          onChange={(e) => {
                            const newButtons = [...components.BUTTONS.buttons]
                            newButtons[index] = { ...button, url: e.target.value }
                            updateComponent('BUTTONS', { buttons: newButtons })
                          }}
                          disabled={disabled}
                          className="mt-1 text-sm"
                        />
                      </div>
                    )}

                    {/* Phone Number (for PHONE_NUMBER type) */}
                    {button.type === 'PHONE_NUMBER' && (
                      <div>
                        <Label htmlFor={`btnPhone-${index}`} className="text-sm">
                          Phone Number
                        </Label>
                        <Input
                          id={`btnPhone-${index}`}
                          placeholder="+1 (555) 000-0000"
                          value={button.phone_number || ''}
                          onChange={(e) => {
                            const newButtons = [...components.BUTTONS.buttons]
                            newButtons[index] = { ...button, phone_number: e.target.value }
                            updateComponent('BUTTONS', { buttons: newButtons })
                          }}
                          disabled={disabled}
                          className="mt-1 text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Button */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const newButtons = [...(components.BUTTONS?.buttons || []), { type: 'QUICK_REPLY', text: '' }]
                updateComponent('BUTTONS', { buttons: newButtons })
              }}
              disabled={disabled || (components.BUTTONS?.buttons?.length || 0) >= 3}
              className="w-full"
            >
              ➕ Add Button (Max 3)
            </Button>

            {!components.BUTTONS?.buttons || components.BUTTONS.buttons.length === 0 && (
              <p className="text-sm text-gray-500 text-center">No buttons added yet</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> After creation, Meta will review your template. Most templates are approved within minutes.
        </p>
      </Alert>
    </div>
  )
}

export default TemplateBuilder
