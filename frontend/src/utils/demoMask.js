/**
 * Demo Mode Data Masking Utilities
 * When demo mode is active, all client-sensitive data is replaced with dummy info.
 * This prevents real client data from being visible during platform demonstrations.
 */

// Deterministic fake names based on index
const DEMO_NAMES = [
  'Alexandre Silva', 'Maria Santos', 'Pedro Costa', 'Ana Ferreira',
  'Carlos Oliveira', 'Sofia Rodrigues', 'Miguel Pereira', 'Beatriz Almeida',
  'Joao Martins', 'Ines Gomes', 'Tiago Sousa', 'Catarina Lopes',
  'Ricardo Fernandes', 'Mariana Ribeiro', 'Hugo Marques', 'Sara Pinto',
  'Andre Carvalho', 'Rita Correia', 'Bruno Teixeira', 'Laura Mendes',
];

const DEMO_COMPANIES = [
  'Alpha Capital Ltd', 'Nexus Ventures SA', 'Horizon Group AG', 'Stellar Partners',
  'Quantum Holdings', 'Apex Investments', 'Global Trust Corp', 'Prime Capital GmbH',
  'Vanguard Assets SA', 'Summit Finance Ltd', 'Atlas Trading Co', 'Zenith Fund',
];

const DEMO_EMAILS_MAP = {};
let emailIdx = 0;

// Consistent mapping: same input always produces same output
const hashStr = (str) => {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

/**
 * Mask a person's name
 */
export const maskName = (name) => {
  if (!name) return 'Cliente Demo';
  const idx = hashStr(name) % DEMO_NAMES.length;
  return DEMO_NAMES[idx];
};

/**
 * Mask a company name
 */
export const maskCompany = (name) => {
  if (!name) return 'Demo Company Ltd';
  const idx = hashStr(name) % DEMO_COMPANIES.length;
  return DEMO_COMPANIES[idx];
};

/**
 * Mask an email address
 */
export const maskEmail = (email) => {
  if (!email) return 'demo@kbex.io';
  if (!DEMO_EMAILS_MAP[email]) {
    emailIdx++;
    const name = DEMO_NAMES[emailIdx % DEMO_NAMES.length].toLowerCase().replace(/\s/g, '.');
    DEMO_EMAILS_MAP[email] = `${name}@demo-kbex.io`;
  }
  return DEMO_EMAILS_MAP[email];
};

/**
 * Mask a phone number
 */
export const maskPhone = (phone) => {
  if (!phone) return '+351 9** *** ***';
  return phone.slice(0, 4) + ' *** *** ' + phone.slice(-2);
};

/**
 * Mask an IBAN
 */
export const maskIBAN = (iban) => {
  if (!iban) return '****';
  return iban.slice(0, 4) + ' **** **** **** ' + iban.slice(-4);
};

/**
 * Mask a wallet address (crypto)
 */
export const maskAddress = (addr) => {
  if (!addr) return '0x****';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
};

/**
 * Mask a generic ID or reference
 */
export const maskId = (id) => {
  if (!id) return 'DEMO-****';
  return id.slice(0, 4) + '****' + id.slice(-2);
};

/**
 * Randomize a monetary amount (within ±30% of original, min $100)
 * Deterministic based on the original value
 */
export const maskAmount = (amount) => {
  if (amount === null || amount === undefined) return 0;
  const n = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  if (n === 0) return 0;
  const factor = 0.7 + (hashStr(String(n)) % 60) / 100; // 0.7 to 1.3
  return Math.round(n * factor * 100) / 100;
};

/**
 * Apply demo masking to a user/client object
 */
export const maskUser = (user) => {
  if (!user) return user;
  return {
    ...user,
    name: maskName(user.name),
    email: maskEmail(user.email),
    phone: user.phone ? maskPhone(user.phone) : user.phone,
    contact_name: user.contact_name ? maskName(user.contact_name) : user.contact_name,
    contact_email: user.contact_email ? maskEmail(user.contact_email) : user.contact_email,
    contact_phone: user.contact_phone ? maskPhone(user.contact_phone) : user.contact_phone,
    entity_name: user.entity_name ? maskCompany(user.entity_name) : user.entity_name,
    company_name: user.company_name ? maskCompany(user.company_name) : user.company_name,
    iban: user.iban ? maskIBAN(user.iban) : user.iban,
    swift_bic: user.swift_bic ? '****' : user.swift_bic,
    account_number: user.account_number ? maskId(user.account_number) : user.account_number,
  };
};

/**
 * Apply demo masking to a transaction object
 */
export const maskTransaction = (tx) => {
  if (!tx) return tx;
  return {
    ...tx,
    user_name: tx.user_name ? maskName(tx.user_name) : tx.user_name,
    user_email: tx.user_email ? maskEmail(tx.user_email) : tx.user_email,
    counterparty_name: tx.counterparty_name ? maskName(tx.counterparty_name) : tx.counterparty_name,
    iban: tx.iban ? maskIBAN(tx.iban) : tx.iban,
    destination_address: tx.destination_address ? maskAddress(tx.destination_address) : tx.destination_address,
    reference: tx.reference ? maskId(tx.reference) : tx.reference,
    reference_code: tx.reference_code ? maskId(tx.reference_code) : tx.reference_code,
    account_holder: tx.account_holder ? maskName(tx.account_holder) : tx.account_holder,
    bank_name: tx.bank_name ? 'Demo Bank' : tx.bank_name,
  };
};

/**
 * Apply demo masking to an OTC lead object
 */
export const maskLead = (lead) => {
  if (!lead) return lead;
  return {
    ...lead,
    contact_name: maskName(lead.contact_name),
    contact_email: maskEmail(lead.contact_email),
    contact_phone: lead.contact_phone ? maskPhone(lead.contact_phone) : lead.contact_phone,
    entity_name: maskCompany(lead.entity_name),
    notes: lead.notes ? 'Notas confidenciais mascaradas em modo demo' : lead.notes,
  };
};

/**
 * Generic masker: auto-detects fields and masks them
 * Use on any object that might contain sensitive data
 */
export const maskObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };

  // Name fields
  ['name', 'user_name', 'contact_name', 'account_holder', 'counterparty_name', 'seller_name', 'buyer_name', 'client_name']
    .forEach(f => { if (result[f]) result[f] = maskName(result[f]); });

  // Email fields
  ['email', 'user_email', 'contact_email']
    .forEach(f => { if (result[f]) result[f] = maskEmail(result[f]); });

  // Phone fields
  ['phone', 'contact_phone']
    .forEach(f => { if (result[f]) result[f] = maskPhone(result[f]); });

  // Company fields
  ['entity_name', 'company_name', 'company']
    .forEach(f => { if (result[f]) result[f] = maskCompany(result[f]); });

  // Financial fields
  ['iban', 'swift_bic', 'account_number', 'routing_number']
    .forEach(f => { if (result[f]) result[f] = maskIBAN(result[f]); });

  // Address fields
  ['destination_address', 'wallet_address', 'address']
    .forEach(f => { if (result[f] && result[f].startsWith('0x')) result[f] = maskAddress(result[f]); });

  return result;
};

/**
 * Mask an array of objects
 */
export const maskArray = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.map(maskObject);
};
