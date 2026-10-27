/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndustryType, Policy } from '../domain/types.ts';

export interface IndustryConfig {
  id: IndustryType;
  labelEn: string;
  labelTa: string;
  scopeNoticeEn: string;
  scopeNoticeTa: string;
  roles: {
    id: string;
    titleEn: string;
    titleTa: string;
    defaultRatePaisePerHour: number;
    requiredTrainingTags: string[];
  }[];
  trainingTags: {
    id: string;
    nameEn: string;
    nameTa: string;
  }[];
  defaultPolicy: Policy;
}

export const INDUSTRY_CONFIGS: Record<IndustryType, IndustryConfig> = {
  construction: {
    id: 'construction',
    labelEn: 'Construction & Civil Works',
    labelTa: 'கட்டுமானம் & குடிமைப் பணிகள்',
    scopeNoticeEn: 'Civil infrastructure and construction site logistics. Heavy machinery operations excluded.',
    scopeNoticeTa: 'கட்டுமான உள்கட்டமைப்பு தளப் பணிகள். கனரக இயந்திர இயக்கம் சேர்க்கப்படவில்லை.',
    roles: [
      {
        id: 'Site Porter',
        titleEn: 'Site Porter',
        titleTa: 'கட்டுமான தள உதவியாளர்',
        defaultRatePaisePerHour: 9500, // ₹95/hr
        requiredTrainingTags: ['Site Induction', 'Fall Protection'],
      },
      {
        id: 'Material Handler',
        titleEn: 'Material Handler',
        titleTa: 'பொருட்கள் கையாளுபவர்',
        defaultRatePaisePerHour: 11000, // ₹110/hr
        requiredTrainingTags: ['Site Induction', 'Heavy Lift Protocol'],
      },
      {
        id: 'Scaffolding Assistant',
        titleEn: 'Scaffolding Assistant',
        titleTa: 'சாரக்கட்டு உதவியாளர்',
        defaultRatePaisePerHour: 12500, // ₹125/hr
        requiredTrainingTags: ['Fall Protection', 'Scaffolding Safety'],
      },
      {
        id: 'Safety Marshall',
        titleEn: 'Safety Marshall',
        titleTa: 'பாதுகாப்பு மேற்பார்வையாளர்',
        defaultRatePaisePerHour: 13500, // ₹135/hr
        requiredTrainingTags: ['Site Induction', 'First Response Protocol', 'Fall Protection'],
      },
    ],
    trainingTags: [
      { id: 'Site Induction', nameEn: 'Site Induction', nameTa: 'தள அறிமுகப் பயிற்சி' },
      { id: 'Fall Protection', nameEn: 'Fall Protection', nameTa: 'வீழ்ச்சி தடுப்பு பாதுகாப்பு' },
      { id: 'Heavy Lift Protocol', nameEn: 'Heavy Lift Protocol', nameTa: 'கனரக சுமை விதிமுறை' },
      { id: 'Scaffolding Safety', nameEn: 'Scaffolding Safety', nameTa: 'சாரக்கட்டு பாதுகாப்பு' },
      { id: 'First Response Protocol', nameEn: 'First Response Protocol', nameTa: 'முதலுதவி நெறிமுறை' },
    ],
    defaultPolicy: {
      minimumRestMinutes: 660, // 11 hours
      maximumWorkMinutesInWindow: 2880, // 48 hours in rolling week
      overtimeThresholdMinutesPerShift: 480, // 8 hours
      overtimeMultiplierNumerator: 150,
      overtimeMultiplierDenominator: 100, // 1.5x
      budgetMode: 'warning',
      budgetCapPaise: 4500000, // ₹45,000
    },
  },

  college_facilities: {
    id: 'college_facilities',
    labelEn: 'College Facilities & Campus',
    labelTa: 'கல்லூரி வசதிகள் & வளாகம்',
    scopeNoticeEn: 'Academic campus maintenance, sanitation, and auditorium event logistics.',
    scopeNoticeTa: 'கல்வி வளாக பராமரிப்பு, துப்புரவு மற்றும் அரங்கு நிகழ்வு பணிகள்.',
    roles: [
      {
        id: 'Campus Sanitation',
        titleEn: 'Campus Sanitation',
        titleTa: 'வளாக துப்புரவு பணியாளர்',
        defaultRatePaisePerHour: 8500, // ₹85/hr
        requiredTrainingTags: ['Campus Protocol', 'Sanitation Safety'],
      },
      {
        id: 'Auditorium Crew',
        titleEn: 'Auditorium Crew',
        titleTa: 'அரங்கு ஏற்பாட்டுக் குழு',
        defaultRatePaisePerHour: 10000, // ₹100/hr
        requiredTrainingTags: ['Campus Protocol', 'Event Setup'],
      },
      {
        id: 'Facilities Porter',
        titleEn: 'Facilities Porter',
        titleTa: 'வளாக சுமை உதவியாளர்',
        defaultRatePaisePerHour: 9000, // ₹90/hr
        requiredTrainingTags: ['Campus Protocol'],
      },
      {
        id: 'Waste Logistics',
        titleEn: 'Waste Logistics',
        titleTa: 'கழிவு மேலாண்மை உதவியாளர்',
        defaultRatePaisePerHour: 9500, // ₹95/hr
        requiredTrainingTags: ['Campus Protocol', 'Segregation Safety'],
      },
    ],
    trainingTags: [
      { id: 'Campus Protocol', nameEn: 'Campus Protocol', nameTa: 'வளாக நெறிமுறை' },
      { id: 'Sanitation Safety', nameEn: 'Sanitation Safety', nameTa: 'துப்புரவு பாதுகாப்பு' },
      { id: 'Event Setup', nameEn: 'Event Setup', nameTa: 'நிகழ்வு அமைப்பு' },
      { id: 'Segregation Safety', nameEn: 'Segregation Safety', nameTa: 'கழிவு பிரிப்பு முறை' },
    ],
    defaultPolicy: {
      minimumRestMinutes: 720, // 12 hours
      maximumWorkMinutesInWindow: 2880, // 48 hours
      overtimeThresholdMinutesPerShift: 480, // 8 hours
      overtimeMultiplierNumerator: 150,
      overtimeMultiplierDenominator: 100, // 1.5x
      budgetMode: 'flexible',
      budgetCapPaise: 3800000, // ₹38,000
    },
  },

  hospital_support: {
    id: 'hospital_support',
    labelEn: 'Hospital Support Services',
    labelTa: 'மருத்துவமனை ஆதரவு சேவைகள்',
    scopeNoticeEn: 'Strictly housekeeping, linen handling, and ward porter escort. No clinical or patient healthcare duties.',
    scopeNoticeTa: 'துப்புரவு, துணி மேலாண்மை மற்றும் தள்ளுவண்டி உதவி மட்டும். மருத்துவ சிகிச்சை பணிகளல்ல.',
    roles: [
      {
        id: 'Ward Housekeeper',
        titleEn: 'Ward Housekeeper',
        titleTa: 'வார்டு துப்புரவாளர்',
        defaultRatePaisePerHour: 10000, // ₹100/hr
        requiredTrainingTags: ['Infection Prevention', 'Hospital Protocol'],
      },
      {
        id: 'Patient Escort Porter',
        titleEn: 'Patient Escort Porter',
        titleTa: 'நோயாளி அழைத்துச் செல்லும் உதவியாளர்',
        defaultRatePaisePerHour: 11000, // ₹110/hr
        requiredTrainingTags: ['Patient Mobility Escort', 'Hospital Protocol'],
      },
      {
        id: 'Linen & Laundry Logistics',
        titleEn: 'Linen & Laundry Logistics',
        titleTa: 'மருத்துவமனை துணி மேலாண்மை',
        defaultRatePaisePerHour: 9500, // ₹95/hr
        requiredTrainingTags: ['Hospital Protocol', 'Biohazard Handling'],
      },
      {
        id: 'Sanitary Waste Handler',
        titleEn: 'Sanitary Waste Handler',
        titleTa: 'மருத்துவ கழிவு கையாளுபவர்',
        defaultRatePaisePerHour: 12000, // ₹120/hr
        requiredTrainingTags: ['Biohazard Handling', 'Infection Prevention'],
      },
    ],
    trainingTags: [
      { id: 'Hospital Protocol', nameEn: 'Hospital Protocol', nameTa: 'மருத்துவமனை நெறிமுறை' },
      { id: 'Infection Prevention', nameEn: 'Infection Prevention', nameTa: 'தொற்று தடுப்பு பயிற்சி' },
      { id: 'Biohazard Handling', nameEn: 'Biohazard Handling', nameTa: 'உயிரியல் கழிவு கையாளுதல்' },
      { id: 'Patient Mobility Escort', nameEn: 'Patient Mobility Escort', nameTa: 'நோயாளி நடமாட்ட பாதுகாப்பு' },
    ],
    defaultPolicy: {
      minimumRestMinutes: 720, // 12 hours required between non-clinical hospital shifts
      maximumWorkMinutesInWindow: 2640, // 44 hours
      overtimeThresholdMinutesPerShift: 480, // 8 hours
      overtimeMultiplierNumerator: 175,
      overtimeMultiplierDenominator: 100, // 1.75x
      budgetMode: 'strict',
      budgetCapPaise: 5000000, // ₹50,000
    },
  },

  factory: {
    id: 'factory',
    labelEn: 'Factory & Manufacturing',
    labelTa: 'தொழிற்சாலை & உற்பத்தி',
    scopeNoticeEn: 'Assembly floor support, packaging operations, and pallet movement. Heavy machinery maintenance excluded.',
    scopeNoticeTa: 'இணைப்புப் பிரிவு ஆதரவு, பொதி செய்தல் மற்றும் சரக்கு பெட்டி கையாளுதல்.',
    roles: [
      {
        id: 'Assembly Floor Support',
        titleEn: 'Assembly Floor Support',
        titleTa: 'உற்பத்திப் பிரிவு உதவியாளர்',
        defaultRatePaisePerHour: 10500, // ₹105/hr
        requiredTrainingTags: ['Factory Safety Induction', '5S Workspace'],
      },
      {
        id: 'Packing Operator',
        titleEn: 'Packing Operator',
        titleTa: 'பொதியிடும் பணியாளர்',
        defaultRatePaisePerHour: 9500, // ₹95/hr
        requiredTrainingTags: ['Factory Safety Induction'],
      },
      {
        id: 'Pallet Handler',
        titleEn: 'Pallet Handler',
        titleTa: 'சரக்குப் பலகை நகர்த்துபவர்',
        defaultRatePaisePerHour: 11500, // ₹115/hr
        requiredTrainingTags: ['Factory Safety Induction', 'Pallet Jack Certified'],
      },
      {
        id: 'Inventory Assistant',
        titleEn: 'Inventory Assistant',
        titleTa: 'சரக்கு இருப்பு உதவியாளர்',
        defaultRatePaisePerHour: 11000, // ₹110/hr
        requiredTrainingTags: ['Factory Safety Induction', '5S Workspace'],
      },
    ],
    trainingTags: [
      { id: 'Factory Safety Induction', nameEn: 'Factory Safety Induction', nameTa: 'தொழிற்சாலை பாதுகாப்பு அறிமுகம்' },
      { id: '5S Workspace', nameEn: '5S Workspace', nameTa: '5S பணியிட முறை' },
      { id: 'Pallet Jack Certified', nameEn: 'Pallet Jack Certified', nameTa: 'சரக்கு பலகை இயக்குதல்' },
    ],
    defaultPolicy: {
      minimumRestMinutes: 660, // 11 hours
      maximumWorkMinutesInWindow: 2880, // 48 hours
      overtimeThresholdMinutesPerShift: 480, // 8 hours
      overtimeMultiplierNumerator: 150,
      overtimeMultiplierDenominator: 100, // 1.5x
      budgetMode: 'warning',
      budgetCapPaise: 4800000, // ₹48,000
    },
  },
};
