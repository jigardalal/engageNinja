export const TEST_CONTACTS = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    tags: ['VIP', 'Customer'],
    consent: true,
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1234567891',
    tags: ['Lead', 'Marketing'],
    consent: true,
  },
  {
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    phone: '+1234567892',
    tags: ['Customer'],
    consent: false,
  },
];

export const TEST_CAMPAIGNS = [
  {
    name: 'Welcome Campaign',
    type: 'whatsapp',
    template: 'Welcome Message',
    audience: ['VIP', 'Customer'],
    status: 'draft',
  },
  {
    name: 'Monthly Newsletter',
    type: 'email',
    template: 'Newsletter Template',
    audience: ['Marketing', 'Lead'],
    status: 'active',
  },
];

export const TEST_TEMPLATES = [
  {
    name: 'Welcome Message',
    type: 'whatsapp',
    content: 'Hello {{contact.name}}, welcome to our service!',
    variables: ['contact.name'],
    status: 'active',
  },
  {
    name: 'Newsletter Template',
    type: 'email',
    content: '<h1>Hello {{contact.name}}</h1><p>Here are your updates...</p>',
    variables: ['contact.name'],
    status: 'active',
  },
];

export function generateRandomEmail() {
  return `test.${Date.now()}@example.com`;
}

export function generateRandomPhone() {
  return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
}