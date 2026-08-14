import { describe, expect, it } from 'vitest';
import {
  buildContactVCard,
  buildRoleCollisionPreview,
  contactProfilePermissions,
  CONTACT_ROLE_OPTIONS,
  validateContactMerge,
} from '@/lib/contacts/contact-profile';

describe('contact role collision preview', () => {
  it('supports the five requested roles and multiple simultaneous selections', () => {
    expect(CONTACT_ROLE_OPTIONS.map((role) => role.label)).toEqual([
      'Primary Contact',
      '2nd Contact',
      'PPP #2',
      'PPP #3',
      'Billing Contact',
    ]);

    expect(buildRoleCollisionPreview({
      selectedRoles: ['PRIMARY_CONTACT', 'BILLING_CONTACT'],
      candidateContactId: 'new-contact',
      existingAssignments: {
        PRIMARY_CONTACT: [],
        BILLING_CONTACT: [],
      },
    })).toEqual([]);
  });

  it('warns only when a selected slot belongs to another contact', () => {
    expect(buildRoleCollisionPreview({
      selectedRoles: ['PRIMARY_CONTACT', 'PPP_2', 'BILLING_CONTACT'],
      candidateContactId: 'contact-a',
      existingAssignments: {
        PRIMARY_CONTACT: [{ id: 'contact-b', name: 'Existing Buyer' }],
        PPP_2: [{ id: 'contact-a', name: 'Same Contact' }],
        BILLING_CONTACT: [],
      },
    })).toEqual([
      {
        role: 'PRIMARY_CONTACT',
        label: 'Primary Contact',
        existingContacts: [{ id: 'contact-b', name: 'Existing Buyer' }],
      },
    ]);
  });
});

describe('contact profile utilities', () => {
  it('matches contact profile controls to API role guards', () => {
    expect(contactProfilePermissions('ADMIN')).toEqual({ canEditProfile: true, canManageLifecycle: true, canDeleteOrMerge: true });
    expect(contactProfilePermissions('OPS_TEAM')).toEqual({ canEditProfile: true, canManageLifecycle: true, canDeleteOrMerge: true });
    expect(contactProfilePermissions('SALES_REP')).toEqual({ canEditProfile: true, canManageLifecycle: true, canDeleteOrMerge: false });
    expect(contactProfilePermissions('BRAND_AMBASSADOR')).toEqual({ canEditProfile: true, canManageLifecycle: false, canDeleteOrMerge: false });
    expect(contactProfilePermissions('FINANCE')).toEqual({ canEditProfile: false, canManageLifecycle: false, canDeleteOrMerge: false });
    expect(contactProfilePermissions('GUEST_VIEWER')).toEqual({ canEditProfile: false, canManageLifecycle: false, canDeleteOrMerge: false });
  });

  it('builds an importable vCard with escaped values and supported social links', () => {
    const card = buildContactVCard({
      name: 'Mara Vega',
      company: 'Harbor House, LLC',
      roleTitle: 'Buyer; Owner',
      email: 'mara@harbor.example',
      phone: '+1 (347) 555-0198',
      instagramUrl: 'https://instagram.com/maravega',
      linkedinUrl: 'https://linkedin.com/in/maravega',
    });

    expect(card).toContain('BEGIN:VCARD');
    expect(card).toContain('FN:Mara Vega');
    expect(card).toContain('ORG:Harbor House\\, LLC');
    expect(card).toContain('TITLE:Buyer\\; Owner');
    expect(card).toContain('EMAIL;TYPE=INTERNET:mara@harbor.example');
    expect(card).toContain('TEL;TYPE=CELL:+13475550198');
    expect(card).toContain('X-SOCIALPROFILE;TYPE=instagram:https://instagram.com/maravega');
    expect(card).toContain('X-SOCIALPROFILE;TYPE=linkedin:https://linkedin.com/in/maravega');
    expect(card).toContain('END:VCARD');
  });

  it('rejects merging a contact into itself', () => {
    expect(() => validateContactMerge({ sourceId: 'same-id', targetId: 'same-id' })).toThrow('Choose a different contact to merge into.');
    expect(validateContactMerge({ sourceId: 'source', targetId: 'target' })).toEqual({ sourceId: 'source', targetId: 'target' });
  });
});
