// @ts-nocheck
/**
 * User API validation schemas
 * Validates CreateUser, UpdateProfile, and UserResponse requests/responses
 */
import { z } from 'zod';
export declare const USER_ROLE: z.ZodEnum<
  ['user', 'consumer', 'merchant', 'admin', 'support', 'operator', 'super_admin']
>;
export declare const GENDER: z.ZodEnum<['male', 'female', 'other', 'prefer_not_to_say']>;
export declare const ACCOUNT_VERIFICATION_STATUS: z.ZodEnum<
  ['unverified', 'pending', 'verified', 'rejected', 'expired']
>;
export declare const THEME: z.ZodEnum<['light', 'dark', 'auto']>;
export declare const UserLocationSchema: z.ZodObject<
  {
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    pincode: z.ZodOptional<z.ZodString>;
    coordinates: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    city?: string;
    state?: string;
    pincode?: string;
    coordinates?: [number, number, ...unknown[]];
    address?: string;
  },
  {
    city?: string;
    state?: string;
    pincode?: string;
    coordinates?: [number, number, ...unknown[]];
    address?: string;
  }
>;
export declare const UserLocationHistorySchema: z.ZodObject<
  {
    coordinates: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
    address: z.ZodString;
    city: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodDate;
    source: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    source?: string;
    timestamp?: Date;
    city?: string;
    coordinates?: [number, number, ...unknown[]];
    address?: string;
  },
  {
    source?: string;
    timestamp?: Date;
    city?: string;
    coordinates?: [number, number, ...unknown[]];
    address?: string;
  }
>;
export declare const UserJewelryPreferencesSchema: z.ZodObject<
  {
    preferredMetals: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    preferredStones: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    style: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    preferredMetals?: string[];
    preferredStones?: string[];
    style?: string;
  },
  {
    preferredMetals?: string[];
    preferredStones?: string[];
    style?: string;
  }
>;
export declare const UserVerificationDocumentSchema: z.ZodObject<
  {
    documentType: z.ZodString;
    documentNumber: z.ZodString;
    documentImage: z.ZodString;
    submittedAt: z.ZodDate;
  },
  'strip',
  z.ZodTypeAny,
  {
    documentType?: string;
    documentNumber?: string;
    documentImage?: string;
    submittedAt?: Date;
  },
  {
    documentType?: string;
    documentNumber?: string;
    documentImage?: string;
    submittedAt?: Date;
  }
>;
export declare const UserNotificationPreferencesSchema: z.ZodObject<
  {
    push: z.ZodOptional<z.ZodBoolean>;
    email: z.ZodOptional<z.ZodBoolean>;
    sms: z.ZodOptional<z.ZodBoolean>;
  },
  'strip',
  z.ZodTypeAny,
  {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
  },
  {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
  }
>;
export declare const UserProfileSchema: z.ZodObject<
  {
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    avatar: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    website: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodOptional<z.ZodDate>;
    gender: z.ZodOptional<z.ZodEnum<['male', 'female', 'other', 'prefer_not_to_say']>>;
    location: z.ZodOptional<
      z.ZodObject<
        {
          address: z.ZodOptional<z.ZodString>;
          city: z.ZodOptional<z.ZodString>;
          state: z.ZodOptional<z.ZodString>;
          pincode: z.ZodOptional<z.ZodString>;
          coordinates: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
        },
        'strip',
        z.ZodTypeAny,
        {
          city?: string;
          state?: string;
          pincode?: string;
          coordinates?: [number, number, ...unknown[]];
          address?: string;
        },
        {
          city?: string;
          state?: string;
          pincode?: string;
          coordinates?: [number, number, ...unknown[]];
          address?: string;
        }
      >
    >;
    locationHistory: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            coordinates: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
            address: z.ZodString;
            city: z.ZodOptional<z.ZodString>;
            timestamp: z.ZodDate;
            source: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            source?: string;
            timestamp?: Date;
            city?: string;
            coordinates?: [number, number, ...unknown[]];
            address?: string;
          },
          {
            source?: string;
            timestamp?: Date;
            city?: string;
            coordinates?: [number, number, ...unknown[]];
            address?: string;
          }
        >,
        'many'
      >
    >;
    timezone: z.ZodOptional<z.ZodString>;
    ringSize: z.ZodOptional<z.ZodString>;
    jewelryPreferences: z.ZodOptional<
      z.ZodObject<
        {
          preferredMetals: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          preferredStones: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          style: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodTypeAny,
        {
          preferredMetals?: string[];
          preferredStones?: string[];
          style?: string;
        },
        {
          preferredMetals?: string[];
          preferredStones?: string[];
          style?: string;
        }
      >
    >;
    verificationStatus: z.ZodOptional<z.ZodEnum<['unverified', 'pending', 'verified', 'rejected', 'expired']>>;
    verificationDocuments: z.ZodOptional<
      z.ZodObject<
        {
          documentType: z.ZodString;
          documentNumber: z.ZodString;
          documentImage: z.ZodString;
          submittedAt: z.ZodDate;
        },
        'strip',
        z.ZodTypeAny,
        {
          documentType?: string;
          documentNumber?: string;
          documentImage?: string;
          submittedAt?: Date;
        },
        {
          documentType?: string;
          documentNumber?: string;
          documentImage?: string;
          submittedAt?: Date;
        }
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    location?: {
      city?: string;
      state?: string;
      pincode?: string;
      coordinates?: [number, number, ...unknown[]];
      address?: string;
    };
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    website?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    locationHistory?: {
      source?: string;
      timestamp?: Date;
      city?: string;
      coordinates?: [number, number, ...unknown[]];
      address?: string;
    }[];
    timezone?: string;
    ringSize?: string;
    jewelryPreferences?: {
      preferredMetals?: string[];
      preferredStones?: string[];
      style?: string;
    };
    verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
    verificationDocuments?: {
      documentType?: string;
      documentNumber?: string;
      documentImage?: string;
      submittedAt?: Date;
    };
  },
  {
    location?: {
      city?: string;
      state?: string;
      pincode?: string;
      coordinates?: [number, number, ...unknown[]];
      address?: string;
    };
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    website?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    locationHistory?: {
      source?: string;
      timestamp?: Date;
      city?: string;
      coordinates?: [number, number, ...unknown[]];
      address?: string;
    }[];
    timezone?: string;
    ringSize?: string;
    jewelryPreferences?: {
      preferredMetals?: string[];
      preferredStones?: string[];
      style?: string;
    };
    verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
    verificationDocuments?: {
      documentType?: string;
      documentNumber?: string;
      documentImage?: string;
      submittedAt?: Date;
    };
  }
>;
export declare const UserPreferencesSchema: z.ZodObject<
  {
    language: z.ZodOptional<z.ZodString>;
    notifications: z.ZodOptional<
      z.ZodObject<
        {
          push: z.ZodOptional<z.ZodBoolean>;
          email: z.ZodOptional<z.ZodBoolean>;
          sms: z.ZodOptional<z.ZodBoolean>;
        },
        'strip',
        z.ZodTypeAny,
        {
          push?: boolean;
          email?: boolean;
          sms?: boolean;
        },
        {
          push?: boolean;
          email?: boolean;
          sms?: boolean;
        }
      >
    >;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    theme: z.ZodOptional<z.ZodEnum<['light', 'dark', 'auto']>>;
    emailNotifications: z.ZodOptional<z.ZodBoolean>;
    pushNotifications: z.ZodOptional<z.ZodBoolean>;
    smsNotifications: z.ZodOptional<z.ZodBoolean>;
  },
  'strip',
  z.ZodTypeAny,
  {
    language?: string;
    notifications?: {
      push?: boolean;
      email?: boolean;
      sms?: boolean;
    };
    categories?: string[];
    theme?: 'auto' | 'light' | 'dark';
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
  },
  {
    language?: string;
    notifications?: {
      push?: boolean;
      email?: boolean;
      sms?: boolean;
    };
    categories?: string[];
    theme?: 'auto' | 'light' | 'dark';
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
  }
>;
export declare const UserAuthSchema: z.ZodObject<
  {
    isVerified: z.ZodBoolean;
    isOnboarded: z.ZodBoolean;
    lastLogin: z.ZodOptional<z.ZodDate>;
    loginAttempts: z.ZodNumber;
    totpEnabled: z.ZodOptional<z.ZodBoolean>;
  },
  'strip',
  z.ZodTypeAny,
  {
    isVerified?: boolean;
    isOnboarded?: boolean;
    lastLogin?: Date;
    loginAttempts?: number;
    totpEnabled?: boolean;
  },
  {
    isVerified?: boolean;
    isOnboarded?: boolean;
    lastLogin?: Date;
    loginAttempts?: number;
    totpEnabled?: boolean;
  }
>;
export declare const CreateUserSchema: z.ZodObject<
  {
    email: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
    role: z.ZodDefault<
      z.ZodOptional<z.ZodEnum<['user', 'consumer', 'merchant', 'admin', 'support', 'operator', 'super_admin']>>
    >;
    profile: z.ZodOptional<
      z.ZodObject<
        {
          firstName: z.ZodOptional<z.ZodString>;
          lastName: z.ZodOptional<z.ZodString>;
          avatar: z.ZodOptional<z.ZodString>;
          bio: z.ZodOptional<z.ZodString>;
          website: z.ZodOptional<z.ZodString>;
          dateOfBirth: z.ZodOptional<z.ZodDate>;
          gender: z.ZodOptional<z.ZodEnum<['male', 'female', 'other', 'prefer_not_to_say']>>;
          location: z.ZodOptional<
            z.ZodObject<
              {
                address: z.ZodOptional<z.ZodString>;
                city: z.ZodOptional<z.ZodString>;
                state: z.ZodOptional<z.ZodString>;
                pincode: z.ZodOptional<z.ZodString>;
                coordinates: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
              },
              'strip',
              z.ZodTypeAny,
              {
                city?: string;
                state?: string;
                pincode?: string;
                coordinates?: [number, number, ...unknown[]];
                address?: string;
              },
              {
                city?: string;
                state?: string;
                pincode?: string;
                coordinates?: [number, number, ...unknown[]];
                address?: string;
              }
            >
          >;
          locationHistory: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  coordinates: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
                  address: z.ZodString;
                  city: z.ZodOptional<z.ZodString>;
                  timestamp: z.ZodDate;
                  source: z.ZodString;
                },
                'strip',
                z.ZodTypeAny,
                {
                  source?: string;
                  timestamp?: Date;
                  city?: string;
                  coordinates?: [number, number, ...unknown[]];
                  address?: string;
                },
                {
                  source?: string;
                  timestamp?: Date;
                  city?: string;
                  coordinates?: [number, number, ...unknown[]];
                  address?: string;
                }
              >,
              'many'
            >
          >;
          timezone: z.ZodOptional<z.ZodString>;
          ringSize: z.ZodOptional<z.ZodString>;
          jewelryPreferences: z.ZodOptional<
            z.ZodObject<
              {
                preferredMetals: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                preferredStones: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                style: z.ZodOptional<z.ZodString>;
              },
              'strip',
              z.ZodTypeAny,
              {
                preferredMetals?: string[];
                preferredStones?: string[];
                style?: string;
              },
              {
                preferredMetals?: string[];
                preferredStones?: string[];
                style?: string;
              }
            >
          >;
          verificationStatus: z.ZodOptional<z.ZodEnum<['unverified', 'pending', 'verified', 'rejected', 'expired']>>;
          verificationDocuments: z.ZodOptional<
            z.ZodObject<
              {
                documentType: z.ZodString;
                documentNumber: z.ZodString;
                documentImage: z.ZodString;
                submittedAt: z.ZodDate;
              },
              'strip',
              z.ZodTypeAny,
              {
                documentType?: string;
                documentNumber?: string;
                documentImage?: string;
                submittedAt?: Date;
              },
              {
                documentType?: string;
                documentNumber?: string;
                documentImage?: string;
                submittedAt?: Date;
              }
            >
          >;
        },
        'strip',
        z.ZodTypeAny,
        {
          location?: {
            city?: string;
            state?: string;
            pincode?: string;
            coordinates?: [number, number, ...unknown[]];
            address?: string;
          };
          firstName?: string;
          lastName?: string;
          avatar?: string;
          bio?: string;
          website?: string;
          dateOfBirth?: Date;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
          locationHistory?: {
            source?: string;
            timestamp?: Date;
            city?: string;
            coordinates?: [number, number, ...unknown[]];
            address?: string;
          }[];
          timezone?: string;
          ringSize?: string;
          jewelryPreferences?: {
            preferredMetals?: string[];
            preferredStones?: string[];
            style?: string;
          };
          verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
          verificationDocuments?: {
            documentType?: string;
            documentNumber?: string;
            documentImage?: string;
            submittedAt?: Date;
          };
        },
        {
          location?: {
            city?: string;
            state?: string;
            pincode?: string;
            coordinates?: [number, number, ...unknown[]];
            address?: string;
          };
          firstName?: string;
          lastName?: string;
          avatar?: string;
          bio?: string;
          website?: string;
          dateOfBirth?: Date;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
          locationHistory?: {
            source?: string;
            timestamp?: Date;
            city?: string;
            coordinates?: [number, number, ...unknown[]];
            address?: string;
          }[];
          timezone?: string;
          ringSize?: string;
          jewelryPreferences?: {
            preferredMetals?: string[];
            preferredStones?: string[];
            style?: string;
          };
          verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
          verificationDocuments?: {
            documentType?: string;
            documentNumber?: string;
            documentImage?: string;
            submittedAt?: Date;
          };
        }
      >
    >;
    preferences: z.ZodOptional<
      z.ZodObject<
        {
          language: z.ZodOptional<z.ZodString>;
          notifications: z.ZodOptional<
            z.ZodObject<
              {
                push: z.ZodOptional<z.ZodBoolean>;
                email: z.ZodOptional<z.ZodBoolean>;
                sms: z.ZodOptional<z.ZodBoolean>;
              },
              'strip',
              z.ZodTypeAny,
              {
                push?: boolean;
                email?: boolean;
                sms?: boolean;
              },
              {
                push?: boolean;
                email?: boolean;
                sms?: boolean;
              }
            >
          >;
          categories: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          theme: z.ZodOptional<z.ZodEnum<['light', 'dark', 'auto']>>;
          emailNotifications: z.ZodOptional<z.ZodBoolean>;
          pushNotifications: z.ZodOptional<z.ZodBoolean>;
          smsNotifications: z.ZodOptional<z.ZodBoolean>;
        },
        'strip',
        z.ZodTypeAny,
        {
          language?: string;
          notifications?: {
            push?: boolean;
            email?: boolean;
            sms?: boolean;
          };
          categories?: string[];
          theme?: 'auto' | 'light' | 'dark';
          emailNotifications?: boolean;
          pushNotifications?: boolean;
          smsNotifications?: boolean;
        },
        {
          language?: string;
          notifications?: {
            push?: boolean;
            email?: boolean;
            sms?: boolean;
          };
          categories?: string[];
          theme?: 'auto' | 'light' | 'dark';
          emailNotifications?: boolean;
          pushNotifications?: boolean;
          smsNotifications?: boolean;
        }
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    password?: string;
    role?: 'admin' | 'user' | 'consumer' | 'super_admin' | 'operator' | 'merchant' | 'support';
    phone?: string;
    email?: string;
    profile?: {
      location?: {
        city?: string;
        state?: string;
        pincode?: string;
        coordinates?: [number, number, ...unknown[]];
        address?: string;
      };
      firstName?: string;
      lastName?: string;
      avatar?: string;
      bio?: string;
      website?: string;
      dateOfBirth?: Date;
      gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
      locationHistory?: {
        source?: string;
        timestamp?: Date;
        city?: string;
        coordinates?: [number, number, ...unknown[]];
        address?: string;
      }[];
      timezone?: string;
      ringSize?: string;
      jewelryPreferences?: {
        preferredMetals?: string[];
        preferredStones?: string[];
        style?: string;
      };
      verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
      verificationDocuments?: {
        documentType?: string;
        documentNumber?: string;
        documentImage?: string;
        submittedAt?: Date;
      };
    };
    preferences?: {
      language?: string;
      notifications?: {
        push?: boolean;
        email?: boolean;
        sms?: boolean;
      };
      categories?: string[];
      theme?: 'auto' | 'light' | 'dark';
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      smsNotifications?: boolean;
    };
  },
  {
    password?: string;
    role?: 'admin' | 'user' | 'consumer' | 'super_admin' | 'operator' | 'merchant' | 'support';
    phone?: string;
    email?: string;
    profile?: {
      location?: {
        city?: string;
        state?: string;
        pincode?: string;
        coordinates?: [number, number, ...unknown[]];
        address?: string;
      };
      firstName?: string;
      lastName?: string;
      avatar?: string;
      bio?: string;
      website?: string;
      dateOfBirth?: Date;
      gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
      locationHistory?: {
        source?: string;
        timestamp?: Date;
        city?: string;
        coordinates?: [number, number, ...unknown[]];
        address?: string;
      }[];
      timezone?: string;
      ringSize?: string;
      jewelryPreferences?: {
        preferredMetals?: string[];
        preferredStones?: string[];
        style?: string;
      };
      verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
      verificationDocuments?: {
        documentType?: string;
        documentNumber?: string;
        documentImage?: string;
        submittedAt?: Date;
      };
    };
    preferences?: {
      language?: string;
      notifications?: {
        push?: boolean;
        email?: boolean;
        sms?: boolean;
      };
      categories?: string[];
      theme?: 'auto' | 'light' | 'dark';
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      smsNotifications?: boolean;
    };
  }
>;
export declare const UpdateProfileSchema: z.ZodObject<
  {
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    avatar: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    website: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodOptional<z.ZodDate>;
    gender: z.ZodOptional<z.ZodEnum<['male', 'female', 'other', 'prefer_not_to_say']>>;
    location: z.ZodOptional<
      z.ZodObject<
        {
          address: z.ZodOptional<z.ZodString>;
          city: z.ZodOptional<z.ZodString>;
          state: z.ZodOptional<z.ZodString>;
          pincode: z.ZodOptional<z.ZodString>;
          coordinates: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
        },
        'strip',
        z.ZodTypeAny,
        {
          city?: string;
          state?: string;
          pincode?: string;
          coordinates?: [number, number, ...unknown[]];
          address?: string;
        },
        {
          city?: string;
          state?: string;
          pincode?: string;
          coordinates?: [number, number, ...unknown[]];
          address?: string;
        }
      >
    >;
    timezone: z.ZodOptional<z.ZodString>;
    ringSize: z.ZodOptional<z.ZodString>;
    jewelryPreferences: z.ZodOptional<
      z.ZodObject<
        {
          preferredMetals: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          preferredStones: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          style: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodTypeAny,
        {
          preferredMetals?: string[];
          preferredStones?: string[];
          style?: string;
        },
        {
          preferredMetals?: string[];
          preferredStones?: string[];
          style?: string;
        }
      >
    >;
    preferences: z.ZodOptional<
      z.ZodObject<
        {
          language: z.ZodOptional<z.ZodString>;
          notifications: z.ZodOptional<
            z.ZodObject<
              {
                push: z.ZodOptional<z.ZodBoolean>;
                email: z.ZodOptional<z.ZodBoolean>;
                sms: z.ZodOptional<z.ZodBoolean>;
              },
              'strip',
              z.ZodTypeAny,
              {
                push?: boolean;
                email?: boolean;
                sms?: boolean;
              },
              {
                push?: boolean;
                email?: boolean;
                sms?: boolean;
              }
            >
          >;
          categories: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          theme: z.ZodOptional<z.ZodEnum<['light', 'dark', 'auto']>>;
          emailNotifications: z.ZodOptional<z.ZodBoolean>;
          pushNotifications: z.ZodOptional<z.ZodBoolean>;
          smsNotifications: z.ZodOptional<z.ZodBoolean>;
        },
        'strip',
        z.ZodTypeAny,
        {
          language?: string;
          notifications?: {
            push?: boolean;
            email?: boolean;
            sms?: boolean;
          };
          categories?: string[];
          theme?: 'auto' | 'light' | 'dark';
          emailNotifications?: boolean;
          pushNotifications?: boolean;
          smsNotifications?: boolean;
        },
        {
          language?: string;
          notifications?: {
            push?: boolean;
            email?: boolean;
            sms?: boolean;
          };
          categories?: string[];
          theme?: 'auto' | 'light' | 'dark';
          emailNotifications?: boolean;
          pushNotifications?: boolean;
          smsNotifications?: boolean;
        }
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    location?: {
      city?: string;
      state?: string;
      pincode?: string;
      coordinates?: [number, number, ...unknown[]];
      address?: string;
    };
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    website?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    timezone?: string;
    ringSize?: string;
    jewelryPreferences?: {
      preferredMetals?: string[];
      preferredStones?: string[];
      style?: string;
    };
    preferences?: {
      language?: string;
      notifications?: {
        push?: boolean;
        email?: boolean;
        sms?: boolean;
      };
      categories?: string[];
      theme?: 'auto' | 'light' | 'dark';
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      smsNotifications?: boolean;
    };
  },
  {
    location?: {
      city?: string;
      state?: string;
      pincode?: string;
      coordinates?: [number, number, ...unknown[]];
      address?: string;
    };
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    website?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    timezone?: string;
    ringSize?: string;
    jewelryPreferences?: {
      preferredMetals?: string[];
      preferredStones?: string[];
      style?: string;
    };
    preferences?: {
      language?: string;
      notifications?: {
        push?: boolean;
        email?: boolean;
        sms?: boolean;
      };
      categories?: string[];
      theme?: 'auto' | 'light' | 'dark';
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      smsNotifications?: boolean;
    };
  }
>;
export declare const UserResponseSchema: z.ZodObject<
  {
    _id: z.ZodOptional<z.ZodString>;
    email: z.ZodString;
    phone: z.ZodString;
    role: z.ZodEnum<['user', 'consumer', 'merchant', 'admin', 'support', 'operator', 'super_admin']>;
    profile: z.ZodOptional<
      z.ZodObject<
        {
          firstName: z.ZodOptional<z.ZodString>;
          lastName: z.ZodOptional<z.ZodString>;
          avatar: z.ZodOptional<z.ZodString>;
          bio: z.ZodOptional<z.ZodString>;
          website: z.ZodOptional<z.ZodString>;
          dateOfBirth: z.ZodOptional<z.ZodDate>;
          gender: z.ZodOptional<z.ZodEnum<['male', 'female', 'other', 'prefer_not_to_say']>>;
          location: z.ZodOptional<
            z.ZodObject<
              {
                address: z.ZodOptional<z.ZodString>;
                city: z.ZodOptional<z.ZodString>;
                state: z.ZodOptional<z.ZodString>;
                pincode: z.ZodOptional<z.ZodString>;
                coordinates: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
              },
              'strip',
              z.ZodTypeAny,
              {
                city?: string;
                state?: string;
                pincode?: string;
                coordinates?: [number, number, ...unknown[]];
                address?: string;
              },
              {
                city?: string;
                state?: string;
                pincode?: string;
                coordinates?: [number, number, ...unknown[]];
                address?: string;
              }
            >
          >;
          locationHistory: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  coordinates: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
                  address: z.ZodString;
                  city: z.ZodOptional<z.ZodString>;
                  timestamp: z.ZodDate;
                  source: z.ZodString;
                },
                'strip',
                z.ZodTypeAny,
                {
                  source?: string;
                  timestamp?: Date;
                  city?: string;
                  coordinates?: [number, number, ...unknown[]];
                  address?: string;
                },
                {
                  source?: string;
                  timestamp?: Date;
                  city?: string;
                  coordinates?: [number, number, ...unknown[]];
                  address?: string;
                }
              >,
              'many'
            >
          >;
          timezone: z.ZodOptional<z.ZodString>;
          ringSize: z.ZodOptional<z.ZodString>;
          jewelryPreferences: z.ZodOptional<
            z.ZodObject<
              {
                preferredMetals: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                preferredStones: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                style: z.ZodOptional<z.ZodString>;
              },
              'strip',
              z.ZodTypeAny,
              {
                preferredMetals?: string[];
                preferredStones?: string[];
                style?: string;
              },
              {
                preferredMetals?: string[];
                preferredStones?: string[];
                style?: string;
              }
            >
          >;
          verificationStatus: z.ZodOptional<z.ZodEnum<['unverified', 'pending', 'verified', 'rejected', 'expired']>>;
          verificationDocuments: z.ZodOptional<
            z.ZodObject<
              {
                documentType: z.ZodString;
                documentNumber: z.ZodString;
                documentImage: z.ZodString;
                submittedAt: z.ZodDate;
              },
              'strip',
              z.ZodTypeAny,
              {
                documentType?: string;
                documentNumber?: string;
                documentImage?: string;
                submittedAt?: Date;
              },
              {
                documentType?: string;
                documentNumber?: string;
                documentImage?: string;
                submittedAt?: Date;
              }
            >
          >;
        },
        'strip',
        z.ZodTypeAny,
        {
          location?: {
            city?: string;
            state?: string;
            pincode?: string;
            coordinates?: [number, number, ...unknown[]];
            address?: string;
          };
          firstName?: string;
          lastName?: string;
          avatar?: string;
          bio?: string;
          website?: string;
          dateOfBirth?: Date;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
          locationHistory?: {
            source?: string;
            timestamp?: Date;
            city?: string;
            coordinates?: [number, number, ...unknown[]];
            address?: string;
          }[];
          timezone?: string;
          ringSize?: string;
          jewelryPreferences?: {
            preferredMetals?: string[];
            preferredStones?: string[];
            style?: string;
          };
          verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
          verificationDocuments?: {
            documentType?: string;
            documentNumber?: string;
            documentImage?: string;
            submittedAt?: Date;
          };
        },
        {
          location?: {
            city?: string;
            state?: string;
            pincode?: string;
            coordinates?: [number, number, ...unknown[]];
            address?: string;
          };
          firstName?: string;
          lastName?: string;
          avatar?: string;
          bio?: string;
          website?: string;
          dateOfBirth?: Date;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
          locationHistory?: {
            source?: string;
            timestamp?: Date;
            city?: string;
            coordinates?: [number, number, ...unknown[]];
            address?: string;
          }[];
          timezone?: string;
          ringSize?: string;
          jewelryPreferences?: {
            preferredMetals?: string[];
            preferredStones?: string[];
            style?: string;
          };
          verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
          verificationDocuments?: {
            documentType?: string;
            documentNumber?: string;
            documentImage?: string;
            submittedAt?: Date;
          };
        }
      >
    >;
    preferences: z.ZodOptional<
      z.ZodObject<
        {
          language: z.ZodOptional<z.ZodString>;
          notifications: z.ZodOptional<
            z.ZodObject<
              {
                push: z.ZodOptional<z.ZodBoolean>;
                email: z.ZodOptional<z.ZodBoolean>;
                sms: z.ZodOptional<z.ZodBoolean>;
              },
              'strip',
              z.ZodTypeAny,
              {
                push?: boolean;
                email?: boolean;
                sms?: boolean;
              },
              {
                push?: boolean;
                email?: boolean;
                sms?: boolean;
              }
            >
          >;
          categories: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          theme: z.ZodOptional<z.ZodEnum<['light', 'dark', 'auto']>>;
          emailNotifications: z.ZodOptional<z.ZodBoolean>;
          pushNotifications: z.ZodOptional<z.ZodBoolean>;
          smsNotifications: z.ZodOptional<z.ZodBoolean>;
        },
        'strip',
        z.ZodTypeAny,
        {
          language?: string;
          notifications?: {
            push?: boolean;
            email?: boolean;
            sms?: boolean;
          };
          categories?: string[];
          theme?: 'auto' | 'light' | 'dark';
          emailNotifications?: boolean;
          pushNotifications?: boolean;
          smsNotifications?: boolean;
        },
        {
          language?: string;
          notifications?: {
            push?: boolean;
            email?: boolean;
            sms?: boolean;
          };
          categories?: string[];
          theme?: 'auto' | 'light' | 'dark';
          emailNotifications?: boolean;
          pushNotifications?: boolean;
          smsNotifications?: boolean;
        }
      >
    >;
    auth: z.ZodOptional<
      z.ZodObject<
        {
          isVerified: z.ZodBoolean;
          isOnboarded: z.ZodBoolean;
          lastLogin: z.ZodOptional<z.ZodDate>;
          loginAttempts: z.ZodNumber;
          totpEnabled: z.ZodOptional<z.ZodBoolean>;
        },
        'strip',
        z.ZodTypeAny,
        {
          isVerified?: boolean;
          isOnboarded?: boolean;
          lastLogin?: Date;
          loginAttempts?: number;
          totpEnabled?: boolean;
        },
        {
          isVerified?: boolean;
          isOnboarded?: boolean;
          lastLogin?: Date;
          loginAttempts?: number;
          totpEnabled?: boolean;
        }
      >
    >;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
  },
  'strip',
  z.ZodTypeAny,
  {
    _id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    role?: 'admin' | 'user' | 'consumer' | 'super_admin' | 'operator' | 'merchant' | 'support';
    phone?: string;
    email?: string;
    profile?: {
      location?: {
        city?: string;
        state?: string;
        pincode?: string;
        coordinates?: [number, number, ...unknown[]];
        address?: string;
      };
      firstName?: string;
      lastName?: string;
      avatar?: string;
      bio?: string;
      website?: string;
      dateOfBirth?: Date;
      gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
      locationHistory?: {
        source?: string;
        timestamp?: Date;
        city?: string;
        coordinates?: [number, number, ...unknown[]];
        address?: string;
      }[];
      timezone?: string;
      ringSize?: string;
      jewelryPreferences?: {
        preferredMetals?: string[];
        preferredStones?: string[];
        style?: string;
      };
      verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
      verificationDocuments?: {
        documentType?: string;
        documentNumber?: string;
        documentImage?: string;
        submittedAt?: Date;
      };
    };
    auth?: {
      isVerified?: boolean;
      isOnboarded?: boolean;
      lastLogin?: Date;
      loginAttempts?: number;
      totpEnabled?: boolean;
    };
    preferences?: {
      language?: string;
      notifications?: {
        push?: boolean;
        email?: boolean;
        sms?: boolean;
      };
      categories?: string[];
      theme?: 'auto' | 'light' | 'dark';
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      smsNotifications?: boolean;
    };
  },
  {
    _id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    role?: 'admin' | 'user' | 'consumer' | 'super_admin' | 'operator' | 'merchant' | 'support';
    phone?: string;
    email?: string;
    profile?: {
      location?: {
        city?: string;
        state?: string;
        pincode?: string;
        coordinates?: [number, number, ...unknown[]];
        address?: string;
      };
      firstName?: string;
      lastName?: string;
      avatar?: string;
      bio?: string;
      website?: string;
      dateOfBirth?: Date;
      gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
      locationHistory?: {
        source?: string;
        timestamp?: Date;
        city?: string;
        coordinates?: [number, number, ...unknown[]];
        address?: string;
      }[];
      timezone?: string;
      ringSize?: string;
      jewelryPreferences?: {
        preferredMetals?: string[];
        preferredStones?: string[];
        style?: string;
      };
      verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
      verificationDocuments?: {
        documentType?: string;
        documentNumber?: string;
        documentImage?: string;
        submittedAt?: Date;
      };
    };
    auth?: {
      isVerified?: boolean;
      isOnboarded?: boolean;
      lastLogin?: Date;
      loginAttempts?: number;
      totpEnabled?: boolean;
    };
    preferences?: {
      language?: string;
      notifications?: {
        push?: boolean;
        email?: boolean;
        sms?: boolean;
      };
      categories?: string[];
      theme?: 'auto' | 'light' | 'dark';
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      smsNotifications?: boolean;
    };
  }
>;
export declare const UserListResponseSchema: z.ZodArray<
  z.ZodObject<
    {
      _id: z.ZodOptional<z.ZodString>;
      email: z.ZodString;
      phone: z.ZodString;
      role: z.ZodEnum<['user', 'consumer', 'merchant', 'admin', 'support', 'operator', 'super_admin']>;
      profile: z.ZodOptional<
        z.ZodObject<
          {
            firstName: z.ZodOptional<z.ZodString>;
            lastName: z.ZodOptional<z.ZodString>;
            avatar: z.ZodOptional<z.ZodString>;
            bio: z.ZodOptional<z.ZodString>;
            website: z.ZodOptional<z.ZodString>;
            dateOfBirth: z.ZodOptional<z.ZodDate>;
            gender: z.ZodOptional<z.ZodEnum<['male', 'female', 'other', 'prefer_not_to_say']>>;
            location: z.ZodOptional<
              z.ZodObject<
                {
                  address: z.ZodOptional<z.ZodString>;
                  city: z.ZodOptional<z.ZodString>;
                  state: z.ZodOptional<z.ZodString>;
                  pincode: z.ZodOptional<z.ZodString>;
                  coordinates: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
                },
                'strip',
                z.ZodTypeAny,
                {
                  city?: string;
                  state?: string;
                  pincode?: string;
                  coordinates?: [number, number, ...unknown[]];
                  address?: string;
                },
                {
                  city?: string;
                  state?: string;
                  pincode?: string;
                  coordinates?: [number, number, ...unknown[]];
                  address?: string;
                }
              >
            >;
            locationHistory: z.ZodOptional<
              z.ZodArray<
                z.ZodObject<
                  {
                    coordinates: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
                    address: z.ZodString;
                    city: z.ZodOptional<z.ZodString>;
                    timestamp: z.ZodDate;
                    source: z.ZodString;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    source?: string;
                    timestamp?: Date;
                    city?: string;
                    coordinates?: [number, number, ...unknown[]];
                    address?: string;
                  },
                  {
                    source?: string;
                    timestamp?: Date;
                    city?: string;
                    coordinates?: [number, number, ...unknown[]];
                    address?: string;
                  }
                >,
                'many'
              >
            >;
            timezone: z.ZodOptional<z.ZodString>;
            ringSize: z.ZodOptional<z.ZodString>;
            jewelryPreferences: z.ZodOptional<
              z.ZodObject<
                {
                  preferredMetals: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                  preferredStones: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                  style: z.ZodOptional<z.ZodString>;
                },
                'strip',
                z.ZodTypeAny,
                {
                  preferredMetals?: string[];
                  preferredStones?: string[];
                  style?: string;
                },
                {
                  preferredMetals?: string[];
                  preferredStones?: string[];
                  style?: string;
                }
              >
            >;
            verificationStatus: z.ZodOptional<z.ZodEnum<['unverified', 'pending', 'verified', 'rejected', 'expired']>>;
            verificationDocuments: z.ZodOptional<
              z.ZodObject<
                {
                  documentType: z.ZodString;
                  documentNumber: z.ZodString;
                  documentImage: z.ZodString;
                  submittedAt: z.ZodDate;
                },
                'strip',
                z.ZodTypeAny,
                {
                  documentType?: string;
                  documentNumber?: string;
                  documentImage?: string;
                  submittedAt?: Date;
                },
                {
                  documentType?: string;
                  documentNumber?: string;
                  documentImage?: string;
                  submittedAt?: Date;
                }
              >
            >;
          },
          'strip',
          z.ZodTypeAny,
          {
            location?: {
              city?: string;
              state?: string;
              pincode?: string;
              coordinates?: [number, number, ...unknown[]];
              address?: string;
            };
            firstName?: string;
            lastName?: string;
            avatar?: string;
            bio?: string;
            website?: string;
            dateOfBirth?: Date;
            gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
            locationHistory?: {
              source?: string;
              timestamp?: Date;
              city?: string;
              coordinates?: [number, number, ...unknown[]];
              address?: string;
            }[];
            timezone?: string;
            ringSize?: string;
            jewelryPreferences?: {
              preferredMetals?: string[];
              preferredStones?: string[];
              style?: string;
            };
            verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
            verificationDocuments?: {
              documentType?: string;
              documentNumber?: string;
              documentImage?: string;
              submittedAt?: Date;
            };
          },
          {
            location?: {
              city?: string;
              state?: string;
              pincode?: string;
              coordinates?: [number, number, ...unknown[]];
              address?: string;
            };
            firstName?: string;
            lastName?: string;
            avatar?: string;
            bio?: string;
            website?: string;
            dateOfBirth?: Date;
            gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
            locationHistory?: {
              source?: string;
              timestamp?: Date;
              city?: string;
              coordinates?: [number, number, ...unknown[]];
              address?: string;
            }[];
            timezone?: string;
            ringSize?: string;
            jewelryPreferences?: {
              preferredMetals?: string[];
              preferredStones?: string[];
              style?: string;
            };
            verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
            verificationDocuments?: {
              documentType?: string;
              documentNumber?: string;
              documentImage?: string;
              submittedAt?: Date;
            };
          }
        >
      >;
      preferences: z.ZodOptional<
        z.ZodObject<
          {
            language: z.ZodOptional<z.ZodString>;
            notifications: z.ZodOptional<
              z.ZodObject<
                {
                  push: z.ZodOptional<z.ZodBoolean>;
                  email: z.ZodOptional<z.ZodBoolean>;
                  sms: z.ZodOptional<z.ZodBoolean>;
                },
                'strip',
                z.ZodTypeAny,
                {
                  push?: boolean;
                  email?: boolean;
                  sms?: boolean;
                },
                {
                  push?: boolean;
                  email?: boolean;
                  sms?: boolean;
                }
              >
            >;
            categories: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
            theme: z.ZodOptional<z.ZodEnum<['light', 'dark', 'auto']>>;
            emailNotifications: z.ZodOptional<z.ZodBoolean>;
            pushNotifications: z.ZodOptional<z.ZodBoolean>;
            smsNotifications: z.ZodOptional<z.ZodBoolean>;
          },
          'strip',
          z.ZodTypeAny,
          {
            language?: string;
            notifications?: {
              push?: boolean;
              email?: boolean;
              sms?: boolean;
            };
            categories?: string[];
            theme?: 'auto' | 'light' | 'dark';
            emailNotifications?: boolean;
            pushNotifications?: boolean;
            smsNotifications?: boolean;
          },
          {
            language?: string;
            notifications?: {
              push?: boolean;
              email?: boolean;
              sms?: boolean;
            };
            categories?: string[];
            theme?: 'auto' | 'light' | 'dark';
            emailNotifications?: boolean;
            pushNotifications?: boolean;
            smsNotifications?: boolean;
          }
        >
      >;
      auth: z.ZodOptional<
        z.ZodObject<
          {
            isVerified: z.ZodBoolean;
            isOnboarded: z.ZodBoolean;
            lastLogin: z.ZodOptional<z.ZodDate>;
            loginAttempts: z.ZodNumber;
            totpEnabled: z.ZodOptional<z.ZodBoolean>;
          },
          'strip',
          z.ZodTypeAny,
          {
            isVerified?: boolean;
            isOnboarded?: boolean;
            lastLogin?: Date;
            loginAttempts?: number;
            totpEnabled?: boolean;
          },
          {
            isVerified?: boolean;
            isOnboarded?: boolean;
            lastLogin?: Date;
            loginAttempts?: number;
            totpEnabled?: boolean;
          }
        >
      >;
      createdAt: z.ZodOptional<z.ZodDate>;
      updatedAt: z.ZodOptional<z.ZodDate>;
    },
    'strip',
    z.ZodTypeAny,
    {
      _id?: string;
      createdAt?: Date;
      updatedAt?: Date;
      role?: 'admin' | 'user' | 'consumer' | 'super_admin' | 'operator' | 'merchant' | 'support';
      phone?: string;
      email?: string;
      profile?: {
        location?: {
          city?: string;
          state?: string;
          pincode?: string;
          coordinates?: [number, number, ...unknown[]];
          address?: string;
        };
        firstName?: string;
        lastName?: string;
        avatar?: string;
        bio?: string;
        website?: string;
        dateOfBirth?: Date;
        gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
        locationHistory?: {
          source?: string;
          timestamp?: Date;
          city?: string;
          coordinates?: [number, number, ...unknown[]];
          address?: string;
        }[];
        timezone?: string;
        ringSize?: string;
        jewelryPreferences?: {
          preferredMetals?: string[];
          preferredStones?: string[];
          style?: string;
        };
        verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
        verificationDocuments?: {
          documentType?: string;
          documentNumber?: string;
          documentImage?: string;
          submittedAt?: Date;
        };
      };
      auth?: {
        isVerified?: boolean;
        isOnboarded?: boolean;
        lastLogin?: Date;
        loginAttempts?: number;
        totpEnabled?: boolean;
      };
      preferences?: {
        language?: string;
        notifications?: {
          push?: boolean;
          email?: boolean;
          sms?: boolean;
        };
        categories?: string[];
        theme?: 'auto' | 'light' | 'dark';
        emailNotifications?: boolean;
        pushNotifications?: boolean;
        smsNotifications?: boolean;
      };
    },
    {
      _id?: string;
      createdAt?: Date;
      updatedAt?: Date;
      role?: 'admin' | 'user' | 'consumer' | 'super_admin' | 'operator' | 'merchant' | 'support';
      phone?: string;
      email?: string;
      profile?: {
        location?: {
          city?: string;
          state?: string;
          pincode?: string;
          coordinates?: [number, number, ...unknown[]];
          address?: string;
        };
        firstName?: string;
        lastName?: string;
        avatar?: string;
        bio?: string;
        website?: string;
        dateOfBirth?: Date;
        gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
        locationHistory?: {
          source?: string;
          timestamp?: Date;
          city?: string;
          coordinates?: [number, number, ...unknown[]];
          address?: string;
        }[];
        timezone?: string;
        ringSize?: string;
        jewelryPreferences?: {
          preferredMetals?: string[];
          preferredStones?: string[];
          style?: string;
        };
        verificationStatus?: 'pending' | 'expired' | 'rejected' | 'unverified' | 'verified';
        verificationDocuments?: {
          documentType?: string;
          documentNumber?: string;
          documentImage?: string;
          submittedAt?: Date;
        };
      };
      auth?: {
        isVerified?: boolean;
        isOnboarded?: boolean;
        lastLogin?: Date;
        loginAttempts?: number;
        totpEnabled?: boolean;
      };
      preferences?: {
        language?: string;
        notifications?: {
          push?: boolean;
          email?: boolean;
          sms?: boolean;
        };
        categories?: string[];
        theme?: 'auto' | 'light' | 'dark';
        emailNotifications?: boolean;
        pushNotifications?: boolean;
        smsNotifications?: boolean;
      };
    }
  >,
  'many'
>;
export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type UserListResponse = z.infer<typeof UserListResponseSchema>;
export type UserRole = z.infer<typeof USER_ROLE>;
export type Gender = z.infer<typeof GENDER>;
export type AccountVerificationStatus = z.infer<typeof ACCOUNT_VERIFICATION_STATUS>;
export type Theme = z.infer<typeof THEME>;
//# sourceMappingURL=user.schema.d.ts.map
