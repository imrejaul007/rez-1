// @ts-nocheck
/**
 * Product zod schemas — API-boundary validation.
 *
 * Canonical pricing: `original` + `selling`, NOT `price.current / price.original`
 * (legacy shape the consumer was writing). The ProductResponseSchema
 * deliberately accepts the richer backend shape (variants, modifiers, GST)
 * so merchant app reads validate cleanly, while CreateProductSchema is the
 * minimal contract the merchant must supply.
 */
import { z } from 'zod';
export declare const PRODUCT_TYPE: z.ZodEnum<['product', 'service']>;
export declare const PRODUCT_VISIBILITY: z.ZodEnum<['public', 'hidden', 'featured']>;
export declare const TAX_SLAB: z.ZodEnum<['0', '5', '12', '18', '28', 'exempt']>;
export declare const MENU_PERIOD: z.ZodEnum<['all_day', 'breakfast', 'lunch', 'dinner', 'custom']>;
export declare const ProductImageSchema: z.ZodObject<
  {
    url: z.ZodString;
    alt: z.ZodOptional<z.ZodString>;
    isPrimary: z.ZodOptional<z.ZodBoolean>;
  },
  'strict',
  z.ZodTypeAny,
  {
    url?: string;
    alt?: string;
    isPrimary?: boolean;
  },
  {
    url?: string;
    alt?: string;
    isPrimary?: boolean;
  }
>;
export declare const ProductGSTSchema: z.ZodObject<
  {
    hsnCode: z.ZodOptional<z.ZodString>;
    sacCode: z.ZodOptional<z.ZodString>;
    gstRate: z.ZodOptional<z.ZodNumber>;
    taxSlab: z.ZodOptional<z.ZodEnum<['0', '5', '12', '18', '28', 'exempt']>>;
    isIGST: z.ZodOptional<z.ZodBoolean>;
  },
  'strict',
  z.ZodTypeAny,
  {
    hsnCode?: string;
    sacCode?: string;
    gstRate?: number;
    taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
    isIGST?: boolean;
  },
  {
    hsnCode?: string;
    sacCode?: string;
    gstRate?: number;
    taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
    isIGST?: boolean;
  }
>;
export declare const ProductPricingSchema: z.ZodEffects<
  z.ZodObject<
    {
      original: z.ZodNumber;
      selling: z.ZodNumber;
      discount: z.ZodOptional<z.ZodNumber>;
      currency: z.ZodDefault<z.ZodString>;
      bulk: z.ZodOptional<
        z.ZodArray<
          z.ZodObject<
            {
              minQuantity: z.ZodNumber;
              price: z.ZodNumber;
            },
            'strict',
            z.ZodTypeAny,
            {
              price?: number;
              minQuantity?: number;
            },
            {
              price?: number;
              minQuantity?: number;
            }
          >,
          'many'
        >
      >;
      gst: z.ZodOptional<
        z.ZodObject<
          {
            hsnCode: z.ZodOptional<z.ZodString>;
            sacCode: z.ZodOptional<z.ZodString>;
            gstRate: z.ZodOptional<z.ZodNumber>;
            taxSlab: z.ZodOptional<z.ZodEnum<['0', '5', '12', '18', '28', 'exempt']>>;
            isIGST: z.ZodOptional<z.ZodBoolean>;
          },
          'strict',
          z.ZodTypeAny,
          {
            hsnCode?: string;
            sacCode?: string;
            gstRate?: number;
            taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
            isIGST?: boolean;
          },
          {
            hsnCode?: string;
            sacCode?: string;
            gstRate?: number;
            taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
            isIGST?: boolean;
          }
        >
      >;
    },
    'strict',
    z.ZodTypeAny,
    {
      currency?: string;
      discount?: number;
      selling?: number;
      original?: number;
      bulk?: {
        price?: number;
        minQuantity?: number;
      }[];
      gst?: {
        hsnCode?: string;
        sacCode?: string;
        gstRate?: number;
        taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
        isIGST?: boolean;
      };
    },
    {
      currency?: string;
      discount?: number;
      selling?: number;
      original?: number;
      bulk?: {
        price?: number;
        minQuantity?: number;
      }[];
      gst?: {
        hsnCode?: string;
        sacCode?: string;
        gstRate?: number;
        taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
        isIGST?: boolean;
      };
    }
  >,
  {
    currency?: string;
    discount?: number;
    selling?: number;
    original?: number;
    bulk?: {
      price?: number;
      minQuantity?: number;
    }[];
    gst?: {
      hsnCode?: string;
      sacCode?: string;
      gstRate?: number;
      taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
      isIGST?: boolean;
    };
  },
  {
    currency?: string;
    discount?: number;
    selling?: number;
    original?: number;
    bulk?: {
      price?: number;
      minQuantity?: number;
    }[];
    gst?: {
      hsnCode?: string;
      sacCode?: string;
      gstRate?: number;
      taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
      isIGST?: boolean;
    };
  }
>;
export declare const ProductRatingDistributionSchema: z.ZodObject<
  {
    5: z.ZodNumber;
    4: z.ZodNumber;
    3: z.ZodNumber;
    2: z.ZodNumber;
    1: z.ZodNumber;
  },
  'strict',
  z.ZodTypeAny,
  {
    1?: number;
    2?: number;
    3?: number;
    4?: number;
    5?: number;
  },
  {
    1?: number;
    2?: number;
    3?: number;
    4?: number;
    5?: number;
  }
>;
export declare const ProductRatingSchema: z.ZodObject<
  {
    average: z.ZodNumber;
    count: z.ZodNumber;
    distribution: z.ZodObject<
      {
        5: z.ZodNumber;
        4: z.ZodNumber;
        3: z.ZodNumber;
        2: z.ZodNumber;
        1: z.ZodNumber;
      },
      'strict',
      z.ZodTypeAny,
      {
        1?: number;
        2?: number;
        3?: number;
        4?: number;
        5?: number;
      },
      {
        1?: number;
        2?: number;
        3?: number;
        4?: number;
        5?: number;
      }
    >;
  },
  'strict',
  z.ZodTypeAny,
  {
    count?: number;
    average?: number;
    distribution?: {
      1?: number;
      2?: number;
      3?: number;
      4?: number;
      5?: number;
    };
  },
  {
    count?: number;
    average?: number;
    distribution?: {
      1?: number;
      2?: number;
      3?: number;
      4?: number;
      5?: number;
    };
  }
>;
export declare const ProductVariantSchema: z.ZodObject<
  {
    variantId: z.ZodString;
    type: z.ZodString;
    value: z.ZodString;
    attributes: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    price: z.ZodOptional<z.ZodNumber>;
    compareAtPrice: z.ZodOptional<z.ZodNumber>;
    stock: z.ZodNumber;
    sku: z.ZodOptional<z.ZodString>;
    images: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    barcode: z.ZodOptional<z.ZodString>;
    weight: z.ZodOptional<z.ZodNumber>;
    isAvailable: z.ZodOptional<z.ZodBoolean>;
  },
  'strict',
  z.ZodTypeAny,
  {
    type?: string;
    value?: string;
    sku?: string;
    price?: number;
    variantId?: string;
    attributes?: Record<string, string>;
    compareAtPrice?: number;
    stock?: number;
    images?: string[];
    barcode?: string;
    weight?: number;
    isAvailable?: boolean;
  },
  {
    type?: string;
    value?: string;
    sku?: string;
    price?: number;
    variantId?: string;
    attributes?: Record<string, string>;
    compareAtPrice?: number;
    stock?: number;
    images?: string[];
    barcode?: string;
    weight?: number;
    isAvailable?: boolean;
  }
>;
export declare const ProductInventorySchema: z.ZodObject<
  {
    stock: z.ZodNumber;
    isAvailable: z.ZodBoolean;
    lowStockThreshold: z.ZodOptional<z.ZodNumber>;
    variants: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            variantId: z.ZodString;
            type: z.ZodString;
            value: z.ZodString;
            attributes: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            price: z.ZodOptional<z.ZodNumber>;
            compareAtPrice: z.ZodOptional<z.ZodNumber>;
            stock: z.ZodNumber;
            sku: z.ZodOptional<z.ZodString>;
            images: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
            barcode: z.ZodOptional<z.ZodString>;
            weight: z.ZodOptional<z.ZodNumber>;
            isAvailable: z.ZodOptional<z.ZodBoolean>;
          },
          'strict',
          z.ZodTypeAny,
          {
            type?: string;
            value?: string;
            sku?: string;
            price?: number;
            variantId?: string;
            attributes?: Record<string, string>;
            compareAtPrice?: number;
            stock?: number;
            images?: string[];
            barcode?: string;
            weight?: number;
            isAvailable?: boolean;
          },
          {
            type?: string;
            value?: string;
            sku?: string;
            price?: number;
            variantId?: string;
            attributes?: Record<string, string>;
            compareAtPrice?: number;
            stock?: number;
            images?: string[];
            barcode?: string;
            weight?: number;
            isAvailable?: boolean;
          }
        >,
        'many'
      >
    >;
    unlimited: z.ZodBoolean;
    estimatedRestockDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    allowBackorder: z.ZodOptional<z.ZodBoolean>;
    reservedStock: z.ZodOptional<z.ZodNumber>;
  },
  'strict',
  z.ZodTypeAny,
  {
    stock?: number;
    isAvailable?: boolean;
    lowStockThreshold?: number;
    variants?: {
      type?: string;
      value?: string;
      sku?: string;
      price?: number;
      variantId?: string;
      attributes?: Record<string, string>;
      compareAtPrice?: number;
      stock?: number;
      images?: string[];
      barcode?: string;
      weight?: number;
      isAvailable?: boolean;
    }[];
    unlimited?: boolean;
    estimatedRestockDate?: string | Date;
    allowBackorder?: boolean;
    reservedStock?: number;
  },
  {
    stock?: number;
    isAvailable?: boolean;
    lowStockThreshold?: number;
    variants?: {
      type?: string;
      value?: string;
      sku?: string;
      price?: number;
      variantId?: string;
      attributes?: Record<string, string>;
      compareAtPrice?: number;
      stock?: number;
      images?: string[];
      barcode?: string;
      weight?: number;
      isAvailable?: boolean;
    }[];
    unlimited?: boolean;
    estimatedRestockDate?: string | Date;
    allowBackorder?: boolean;
    reservedStock?: number;
  }
>;
export declare const ProductModifierOptionSchema: z.ZodObject<
  {
    label: z.ZodString;
    price: z.ZodNumber;
    isDefault: z.ZodOptional<z.ZodBoolean>;
  },
  'strict',
  z.ZodTypeAny,
  {
    price?: number;
    label?: string;
    isDefault?: boolean;
  },
  {
    price?: number;
    label?: string;
    isDefault?: boolean;
  }
>;
export declare const ProductModifierSchema: z.ZodObject<
  {
    _id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    required: z.ZodOptional<z.ZodBoolean>;
    multiSelect: z.ZodOptional<z.ZodBoolean>;
    options: z.ZodArray<
      z.ZodObject<
        {
          label: z.ZodString;
          price: z.ZodNumber;
          isDefault: z.ZodOptional<z.ZodBoolean>;
        },
        'strict',
        z.ZodTypeAny,
        {
          price?: number;
          label?: string;
          isDefault?: boolean;
        },
        {
          price?: number;
          label?: string;
          isDefault?: boolean;
        }
      >,
      'many'
    >;
  },
  'strict',
  z.ZodTypeAny,
  {
    name?: string;
    _id?: string;
    required?: boolean;
    options?: {
      price?: number;
      label?: string;
      isDefault?: boolean;
    }[];
    multiSelect?: boolean;
  },
  {
    name?: string;
    _id?: string;
    required?: boolean;
    options?: {
      price?: number;
      label?: string;
      isDefault?: boolean;
    }[];
    multiSelect?: boolean;
  }
>;
export declare const CreateProductSchema: z.ZodObject<
  {
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    shortDescription: z.ZodOptional<z.ZodString>;
    productType: z.ZodDefault<z.ZodEnum<['product', 'service']>>;
    category: z.ZodString;
    subCategory: z.ZodOptional<z.ZodString>;
    store: z.ZodString;
    merchantId: z.ZodOptional<z.ZodString>;
    brand: z.ZodOptional<z.ZodString>;
    sku: z.ZodString;
    barcode: z.ZodOptional<z.ZodString>;
    images: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
    pricing: z.ZodEffects<
      z.ZodObject<
        {
          original: z.ZodNumber;
          selling: z.ZodNumber;
          discount: z.ZodOptional<z.ZodNumber>;
          currency: z.ZodDefault<z.ZodString>;
          bulk: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  minQuantity: z.ZodNumber;
                  price: z.ZodNumber;
                },
                'strict',
                z.ZodTypeAny,
                {
                  price?: number;
                  minQuantity?: number;
                },
                {
                  price?: number;
                  minQuantity?: number;
                }
              >,
              'many'
            >
          >;
          gst: z.ZodOptional<
            z.ZodObject<
              {
                hsnCode: z.ZodOptional<z.ZodString>;
                sacCode: z.ZodOptional<z.ZodString>;
                gstRate: z.ZodOptional<z.ZodNumber>;
                taxSlab: z.ZodOptional<z.ZodEnum<['0', '5', '12', '18', '28', 'exempt']>>;
                isIGST: z.ZodOptional<z.ZodBoolean>;
              },
              'strict',
              z.ZodTypeAny,
              {
                hsnCode?: string;
                sacCode?: string;
                gstRate?: number;
                taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
                isIGST?: boolean;
              },
              {
                hsnCode?: string;
                sacCode?: string;
                gstRate?: number;
                taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
                isIGST?: boolean;
              }
            >
          >;
        },
        'strict',
        z.ZodTypeAny,
        {
          currency?: string;
          discount?: number;
          selling?: number;
          original?: number;
          bulk?: {
            price?: number;
            minQuantity?: number;
          }[];
          gst?: {
            hsnCode?: string;
            sacCode?: string;
            gstRate?: number;
            taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
            isIGST?: boolean;
          };
        },
        {
          currency?: string;
          discount?: number;
          selling?: number;
          original?: number;
          bulk?: {
            price?: number;
            minQuantity?: number;
          }[];
          gst?: {
            hsnCode?: string;
            sacCode?: string;
            gstRate?: number;
            taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
            isIGST?: boolean;
          };
        }
      >,
      {
        currency?: string;
        discount?: number;
        selling?: number;
        original?: number;
        bulk?: {
          price?: number;
          minQuantity?: number;
        }[];
        gst?: {
          hsnCode?: string;
          sacCode?: string;
          gstRate?: number;
          taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
          isIGST?: boolean;
        };
      },
      {
        currency?: string;
        discount?: number;
        selling?: number;
        original?: number;
        bulk?: {
          price?: number;
          minQuantity?: number;
        }[];
        gst?: {
          hsnCode?: string;
          sacCode?: string;
          gstRate?: number;
          taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
          isIGST?: boolean;
        };
      }
    >;
    inventory: z.ZodObject<
      {
        stock: z.ZodNumber;
        isAvailable: z.ZodBoolean;
        lowStockThreshold: z.ZodOptional<z.ZodNumber>;
        variants: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                variantId: z.ZodString;
                type: z.ZodString;
                value: z.ZodString;
                attributes: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                price: z.ZodOptional<z.ZodNumber>;
                compareAtPrice: z.ZodOptional<z.ZodNumber>;
                stock: z.ZodNumber;
                sku: z.ZodOptional<z.ZodString>;
                images: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                barcode: z.ZodOptional<z.ZodString>;
                weight: z.ZodOptional<z.ZodNumber>;
                isAvailable: z.ZodOptional<z.ZodBoolean>;
              },
              'strict',
              z.ZodTypeAny,
              {
                type?: string;
                value?: string;
                sku?: string;
                price?: number;
                variantId?: string;
                attributes?: Record<string, string>;
                compareAtPrice?: number;
                stock?: number;
                images?: string[];
                barcode?: string;
                weight?: number;
                isAvailable?: boolean;
              },
              {
                type?: string;
                value?: string;
                sku?: string;
                price?: number;
                variantId?: string;
                attributes?: Record<string, string>;
                compareAtPrice?: number;
                stock?: number;
                images?: string[];
                barcode?: string;
                weight?: number;
                isAvailable?: boolean;
              }
            >,
            'many'
          >
        >;
        unlimited: z.ZodBoolean;
        estimatedRestockDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        allowBackorder: z.ZodOptional<z.ZodBoolean>;
        reservedStock: z.ZodOptional<z.ZodNumber>;
      },
      'strict',
      z.ZodTypeAny,
      {
        stock?: number;
        isAvailable?: boolean;
        lowStockThreshold?: number;
        variants?: {
          type?: string;
          value?: string;
          sku?: string;
          price?: number;
          variantId?: string;
          attributes?: Record<string, string>;
          compareAtPrice?: number;
          stock?: number;
          images?: string[];
          barcode?: string;
          weight?: number;
          isAvailable?: boolean;
        }[];
        unlimited?: boolean;
        estimatedRestockDate?: string | Date;
        allowBackorder?: boolean;
        reservedStock?: number;
      },
      {
        stock?: number;
        isAvailable?: boolean;
        lowStockThreshold?: number;
        variants?: {
          type?: string;
          value?: string;
          sku?: string;
          price?: number;
          variantId?: string;
          attributes?: Record<string, string>;
          compareAtPrice?: number;
          stock?: number;
          images?: string[];
          barcode?: string;
          weight?: number;
          isAvailable?: boolean;
        }[];
        unlimited?: boolean;
        estimatedRestockDate?: string | Date;
        allowBackorder?: boolean;
        reservedStock?: number;
      }
    >;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
    modifiers: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            _id: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            required: z.ZodOptional<z.ZodBoolean>;
            multiSelect: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodArray<
              z.ZodObject<
                {
                  label: z.ZodString;
                  price: z.ZodNumber;
                  isDefault: z.ZodOptional<z.ZodBoolean>;
                },
                'strict',
                z.ZodTypeAny,
                {
                  price?: number;
                  label?: string;
                  isDefault?: boolean;
                },
                {
                  price?: number;
                  label?: string;
                  isDefault?: boolean;
                }
              >,
              'many'
            >;
          },
          'strict',
          z.ZodTypeAny,
          {
            name?: string;
            _id?: string;
            required?: boolean;
            options?: {
              price?: number;
              label?: string;
              isDefault?: boolean;
            }[];
            multiSelect?: boolean;
          },
          {
            name?: string;
            _id?: string;
            required?: boolean;
            options?: {
              price?: number;
              label?: string;
              isDefault?: boolean;
            }[];
            multiSelect?: boolean;
          }
        >,
        'many'
      >
    >;
    isActive: z.ZodDefault<z.ZodBoolean>;
    isFeatured: z.ZodDefault<z.ZodBoolean>;
    isDigital: z.ZodDefault<z.ZodBoolean>;
    visibility: z.ZodOptional<z.ZodEnum<['public', 'hidden', 'featured']>>;
  },
  'strict',
  z.ZodTypeAny,
  {
    name?: string;
    description?: string;
    merchantId?: string;
    isActive?: boolean;
    store?: string;
    sku?: string;
    pricing?: {
      currency?: string;
      discount?: number;
      selling?: number;
      original?: number;
      bulk?: {
        price?: number;
        minQuantity?: number;
      }[];
      gst?: {
        hsnCode?: string;
        sacCode?: string;
        gstRate?: number;
        taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
        isIGST?: boolean;
      };
    };
    images?: string[];
    barcode?: string;
    slug?: string;
    shortDescription?: string;
    productType?: 'service' | 'product';
    category?: string;
    subCategory?: string;
    brand?: string;
    inventory?: {
      stock?: number;
      isAvailable?: boolean;
      lowStockThreshold?: number;
      variants?: {
        type?: string;
        value?: string;
        sku?: string;
        price?: number;
        variantId?: string;
        attributes?: Record<string, string>;
        compareAtPrice?: number;
        stock?: number;
        images?: string[];
        barcode?: string;
        weight?: number;
        isAvailable?: boolean;
      }[];
      unlimited?: boolean;
      estimatedRestockDate?: string | Date;
      allowBackorder?: boolean;
      reservedStock?: number;
    };
    tags?: string[];
    modifiers?: {
      name?: string;
      _id?: string;
      required?: boolean;
      options?: {
        price?: number;
        label?: string;
        isDefault?: boolean;
      }[];
      multiSelect?: boolean;
    }[];
    isFeatured?: boolean;
    isDigital?: boolean;
    visibility?: 'hidden' | 'public' | 'featured';
  },
  {
    name?: string;
    description?: string;
    merchantId?: string;
    isActive?: boolean;
    store?: string;
    sku?: string;
    pricing?: {
      currency?: string;
      discount?: number;
      selling?: number;
      original?: number;
      bulk?: {
        price?: number;
        minQuantity?: number;
      }[];
      gst?: {
        hsnCode?: string;
        sacCode?: string;
        gstRate?: number;
        taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
        isIGST?: boolean;
      };
    };
    images?: string[];
    barcode?: string;
    slug?: string;
    shortDescription?: string;
    productType?: 'service' | 'product';
    category?: string;
    subCategory?: string;
    brand?: string;
    inventory?: {
      stock?: number;
      isAvailable?: boolean;
      lowStockThreshold?: number;
      variants?: {
        type?: string;
        value?: string;
        sku?: string;
        price?: number;
        variantId?: string;
        attributes?: Record<string, string>;
        compareAtPrice?: number;
        stock?: number;
        images?: string[];
        barcode?: string;
        weight?: number;
        isAvailable?: boolean;
      }[];
      unlimited?: boolean;
      estimatedRestockDate?: string | Date;
      allowBackorder?: boolean;
      reservedStock?: number;
    };
    tags?: string[];
    modifiers?: {
      name?: string;
      _id?: string;
      required?: boolean;
      options?: {
        price?: number;
        label?: string;
        isDefault?: boolean;
      }[];
      multiSelect?: boolean;
    }[];
    isFeatured?: boolean;
    isDigital?: boolean;
    visibility?: 'hidden' | 'public' | 'featured';
  }
>;
export declare const UpdateProductSchema: z.ZodObject<
  {
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    shortDescription: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    productType: z.ZodOptional<z.ZodDefault<z.ZodEnum<['product', 'service']>>>;
    category: z.ZodOptional<z.ZodString>;
    subCategory: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    store: z.ZodOptional<z.ZodString>;
    merchantId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    brand: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    sku: z.ZodOptional<z.ZodString>;
    barcode: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    images: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>>;
    pricing: z.ZodOptional<
      z.ZodEffects<
        z.ZodObject<
          {
            original: z.ZodNumber;
            selling: z.ZodNumber;
            discount: z.ZodOptional<z.ZodNumber>;
            currency: z.ZodDefault<z.ZodString>;
            bulk: z.ZodOptional<
              z.ZodArray<
                z.ZodObject<
                  {
                    minQuantity: z.ZodNumber;
                    price: z.ZodNumber;
                  },
                  'strict',
                  z.ZodTypeAny,
                  {
                    price?: number;
                    minQuantity?: number;
                  },
                  {
                    price?: number;
                    minQuantity?: number;
                  }
                >,
                'many'
              >
            >;
            gst: z.ZodOptional<
              z.ZodObject<
                {
                  hsnCode: z.ZodOptional<z.ZodString>;
                  sacCode: z.ZodOptional<z.ZodString>;
                  gstRate: z.ZodOptional<z.ZodNumber>;
                  taxSlab: z.ZodOptional<z.ZodEnum<['0', '5', '12', '18', '28', 'exempt']>>;
                  isIGST: z.ZodOptional<z.ZodBoolean>;
                },
                'strict',
                z.ZodTypeAny,
                {
                  hsnCode?: string;
                  sacCode?: string;
                  gstRate?: number;
                  taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
                  isIGST?: boolean;
                },
                {
                  hsnCode?: string;
                  sacCode?: string;
                  gstRate?: number;
                  taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
                  isIGST?: boolean;
                }
              >
            >;
          },
          'strict',
          z.ZodTypeAny,
          {
            currency?: string;
            discount?: number;
            selling?: number;
            original?: number;
            bulk?: {
              price?: number;
              minQuantity?: number;
            }[];
            gst?: {
              hsnCode?: string;
              sacCode?: string;
              gstRate?: number;
              taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
              isIGST?: boolean;
            };
          },
          {
            currency?: string;
            discount?: number;
            selling?: number;
            original?: number;
            bulk?: {
              price?: number;
              minQuantity?: number;
            }[];
            gst?: {
              hsnCode?: string;
              sacCode?: string;
              gstRate?: number;
              taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
              isIGST?: boolean;
            };
          }
        >,
        {
          currency?: string;
          discount?: number;
          selling?: number;
          original?: number;
          bulk?: {
            price?: number;
            minQuantity?: number;
          }[];
          gst?: {
            hsnCode?: string;
            sacCode?: string;
            gstRate?: number;
            taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
            isIGST?: boolean;
          };
        },
        {
          currency?: string;
          discount?: number;
          selling?: number;
          original?: number;
          bulk?: {
            price?: number;
            minQuantity?: number;
          }[];
          gst?: {
            hsnCode?: string;
            sacCode?: string;
            gstRate?: number;
            taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
            isIGST?: boolean;
          };
        }
      >
    >;
    inventory: z.ZodOptional<
      z.ZodObject<
        {
          stock: z.ZodNumber;
          isAvailable: z.ZodBoolean;
          lowStockThreshold: z.ZodOptional<z.ZodNumber>;
          variants: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  variantId: z.ZodString;
                  type: z.ZodString;
                  value: z.ZodString;
                  attributes: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                  price: z.ZodOptional<z.ZodNumber>;
                  compareAtPrice: z.ZodOptional<z.ZodNumber>;
                  stock: z.ZodNumber;
                  sku: z.ZodOptional<z.ZodString>;
                  images: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                  barcode: z.ZodOptional<z.ZodString>;
                  weight: z.ZodOptional<z.ZodNumber>;
                  isAvailable: z.ZodOptional<z.ZodBoolean>;
                },
                'strict',
                z.ZodTypeAny,
                {
                  type?: string;
                  value?: string;
                  sku?: string;
                  price?: number;
                  variantId?: string;
                  attributes?: Record<string, string>;
                  compareAtPrice?: number;
                  stock?: number;
                  images?: string[];
                  barcode?: string;
                  weight?: number;
                  isAvailable?: boolean;
                },
                {
                  type?: string;
                  value?: string;
                  sku?: string;
                  price?: number;
                  variantId?: string;
                  attributes?: Record<string, string>;
                  compareAtPrice?: number;
                  stock?: number;
                  images?: string[];
                  barcode?: string;
                  weight?: number;
                  isAvailable?: boolean;
                }
              >,
              'many'
            >
          >;
          unlimited: z.ZodBoolean;
          estimatedRestockDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          allowBackorder: z.ZodOptional<z.ZodBoolean>;
          reservedStock: z.ZodOptional<z.ZodNumber>;
        },
        'strict',
        z.ZodTypeAny,
        {
          stock?: number;
          isAvailable?: boolean;
          lowStockThreshold?: number;
          variants?: {
            type?: string;
            value?: string;
            sku?: string;
            price?: number;
            variantId?: string;
            attributes?: Record<string, string>;
            compareAtPrice?: number;
            stock?: number;
            images?: string[];
            barcode?: string;
            weight?: number;
            isAvailable?: boolean;
          }[];
          unlimited?: boolean;
          estimatedRestockDate?: string | Date;
          allowBackorder?: boolean;
          reservedStock?: number;
        },
        {
          stock?: number;
          isAvailable?: boolean;
          lowStockThreshold?: number;
          variants?: {
            type?: string;
            value?: string;
            sku?: string;
            price?: number;
            variantId?: string;
            attributes?: Record<string, string>;
            compareAtPrice?: number;
            stock?: number;
            images?: string[];
            barcode?: string;
            weight?: number;
            isAvailable?: boolean;
          }[];
          unlimited?: boolean;
          estimatedRestockDate?: string | Date;
          allowBackorder?: boolean;
          reservedStock?: number;
        }
      >
    >;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>>;
    modifiers: z.ZodOptional<
      z.ZodOptional<
        z.ZodArray<
          z.ZodObject<
            {
              _id: z.ZodOptional<z.ZodString>;
              name: z.ZodString;
              required: z.ZodOptional<z.ZodBoolean>;
              multiSelect: z.ZodOptional<z.ZodBoolean>;
              options: z.ZodArray<
                z.ZodObject<
                  {
                    label: z.ZodString;
                    price: z.ZodNumber;
                    isDefault: z.ZodOptional<z.ZodBoolean>;
                  },
                  'strict',
                  z.ZodTypeAny,
                  {
                    price?: number;
                    label?: string;
                    isDefault?: boolean;
                  },
                  {
                    price?: number;
                    label?: string;
                    isDefault?: boolean;
                  }
                >,
                'many'
              >;
            },
            'strict',
            z.ZodTypeAny,
            {
              name?: string;
              _id?: string;
              required?: boolean;
              options?: {
                price?: number;
                label?: string;
                isDefault?: boolean;
              }[];
              multiSelect?: boolean;
            },
            {
              name?: string;
              _id?: string;
              required?: boolean;
              options?: {
                price?: number;
                label?: string;
                isDefault?: boolean;
              }[];
              multiSelect?: boolean;
            }
          >,
          'many'
        >
      >
    >;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    isFeatured: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    isDigital: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    visibility: z.ZodOptional<z.ZodOptional<z.ZodEnum<['public', 'hidden', 'featured']>>>;
  },
  'strict',
  z.ZodTypeAny,
  {
    name?: string;
    description?: string;
    merchantId?: string;
    isActive?: boolean;
    store?: string;
    sku?: string;
    pricing?: {
      currency?: string;
      discount?: number;
      selling?: number;
      original?: number;
      bulk?: {
        price?: number;
        minQuantity?: number;
      }[];
      gst?: {
        hsnCode?: string;
        sacCode?: string;
        gstRate?: number;
        taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
        isIGST?: boolean;
      };
    };
    images?: string[];
    barcode?: string;
    slug?: string;
    shortDescription?: string;
    productType?: 'service' | 'product';
    category?: string;
    subCategory?: string;
    brand?: string;
    inventory?: {
      stock?: number;
      isAvailable?: boolean;
      lowStockThreshold?: number;
      variants?: {
        type?: string;
        value?: string;
        sku?: string;
        price?: number;
        variantId?: string;
        attributes?: Record<string, string>;
        compareAtPrice?: number;
        stock?: number;
        images?: string[];
        barcode?: string;
        weight?: number;
        isAvailable?: boolean;
      }[];
      unlimited?: boolean;
      estimatedRestockDate?: string | Date;
      allowBackorder?: boolean;
      reservedStock?: number;
    };
    tags?: string[];
    modifiers?: {
      name?: string;
      _id?: string;
      required?: boolean;
      options?: {
        price?: number;
        label?: string;
        isDefault?: boolean;
      }[];
      multiSelect?: boolean;
    }[];
    isFeatured?: boolean;
    isDigital?: boolean;
    visibility?: 'hidden' | 'public' | 'featured';
  },
  {
    name?: string;
    description?: string;
    merchantId?: string;
    isActive?: boolean;
    store?: string;
    sku?: string;
    pricing?: {
      currency?: string;
      discount?: number;
      selling?: number;
      original?: number;
      bulk?: {
        price?: number;
        minQuantity?: number;
      }[];
      gst?: {
        hsnCode?: string;
        sacCode?: string;
        gstRate?: number;
        taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
        isIGST?: boolean;
      };
    };
    images?: string[];
    barcode?: string;
    slug?: string;
    shortDescription?: string;
    productType?: 'service' | 'product';
    category?: string;
    subCategory?: string;
    brand?: string;
    inventory?: {
      stock?: number;
      isAvailable?: boolean;
      lowStockThreshold?: number;
      variants?: {
        type?: string;
        value?: string;
        sku?: string;
        price?: number;
        variantId?: string;
        attributes?: Record<string, string>;
        compareAtPrice?: number;
        stock?: number;
        images?: string[];
        barcode?: string;
        weight?: number;
        isAvailable?: boolean;
      }[];
      unlimited?: boolean;
      estimatedRestockDate?: string | Date;
      allowBackorder?: boolean;
      reservedStock?: number;
    };
    tags?: string[];
    modifiers?: {
      name?: string;
      _id?: string;
      required?: boolean;
      options?: {
        price?: number;
        label?: string;
        isDefault?: boolean;
      }[];
      multiSelect?: boolean;
    }[];
    isFeatured?: boolean;
    isDigital?: boolean;
    visibility?: 'hidden' | 'public' | 'featured';
  }
>;
export declare const ProductResponseSchema: z.ZodObject<
  {
    _id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    slug: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    productType: z.ZodEnum<['product', 'service']>;
    category: z.ZodString;
    store: z.ZodString;
    merchantId: z.ZodOptional<z.ZodString>;
    sku: z.ZodString;
    images: z.ZodArray<z.ZodString, 'many'>;
    pricing: z.ZodEffects<
      z.ZodObject<
        {
          original: z.ZodNumber;
          selling: z.ZodNumber;
          discount: z.ZodOptional<z.ZodNumber>;
          currency: z.ZodDefault<z.ZodString>;
          bulk: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  minQuantity: z.ZodNumber;
                  price: z.ZodNumber;
                },
                'strict',
                z.ZodTypeAny,
                {
                  price?: number;
                  minQuantity?: number;
                },
                {
                  price?: number;
                  minQuantity?: number;
                }
              >,
              'many'
            >
          >;
          gst: z.ZodOptional<
            z.ZodObject<
              {
                hsnCode: z.ZodOptional<z.ZodString>;
                sacCode: z.ZodOptional<z.ZodString>;
                gstRate: z.ZodOptional<z.ZodNumber>;
                taxSlab: z.ZodOptional<z.ZodEnum<['0', '5', '12', '18', '28', 'exempt']>>;
                isIGST: z.ZodOptional<z.ZodBoolean>;
              },
              'strict',
              z.ZodTypeAny,
              {
                hsnCode?: string;
                sacCode?: string;
                gstRate?: number;
                taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
                isIGST?: boolean;
              },
              {
                hsnCode?: string;
                sacCode?: string;
                gstRate?: number;
                taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
                isIGST?: boolean;
              }
            >
          >;
        },
        'strict',
        z.ZodTypeAny,
        {
          currency?: string;
          discount?: number;
          selling?: number;
          original?: number;
          bulk?: {
            price?: number;
            minQuantity?: number;
          }[];
          gst?: {
            hsnCode?: string;
            sacCode?: string;
            gstRate?: number;
            taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
            isIGST?: boolean;
          };
        },
        {
          currency?: string;
          discount?: number;
          selling?: number;
          original?: number;
          bulk?: {
            price?: number;
            minQuantity?: number;
          }[];
          gst?: {
            hsnCode?: string;
            sacCode?: string;
            gstRate?: number;
            taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
            isIGST?: boolean;
          };
        }
      >,
      {
        currency?: string;
        discount?: number;
        selling?: number;
        original?: number;
        bulk?: {
          price?: number;
          minQuantity?: number;
        }[];
        gst?: {
          hsnCode?: string;
          sacCode?: string;
          gstRate?: number;
          taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
          isIGST?: boolean;
        };
      },
      {
        currency?: string;
        discount?: number;
        selling?: number;
        original?: number;
        bulk?: {
          price?: number;
          minQuantity?: number;
        }[];
        gst?: {
          hsnCode?: string;
          sacCode?: string;
          gstRate?: number;
          taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
          isIGST?: boolean;
        };
      }
    >;
    inventory: z.ZodObject<
      {
        stock: z.ZodNumber;
        isAvailable: z.ZodBoolean;
        lowStockThreshold: z.ZodOptional<z.ZodNumber>;
        variants: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                variantId: z.ZodString;
                type: z.ZodString;
                value: z.ZodString;
                attributes: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                price: z.ZodOptional<z.ZodNumber>;
                compareAtPrice: z.ZodOptional<z.ZodNumber>;
                stock: z.ZodNumber;
                sku: z.ZodOptional<z.ZodString>;
                images: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                barcode: z.ZodOptional<z.ZodString>;
                weight: z.ZodOptional<z.ZodNumber>;
                isAvailable: z.ZodOptional<z.ZodBoolean>;
              },
              'strict',
              z.ZodTypeAny,
              {
                type?: string;
                value?: string;
                sku?: string;
                price?: number;
                variantId?: string;
                attributes?: Record<string, string>;
                compareAtPrice?: number;
                stock?: number;
                images?: string[];
                barcode?: string;
                weight?: number;
                isAvailable?: boolean;
              },
              {
                type?: string;
                value?: string;
                sku?: string;
                price?: number;
                variantId?: string;
                attributes?: Record<string, string>;
                compareAtPrice?: number;
                stock?: number;
                images?: string[];
                barcode?: string;
                weight?: number;
                isAvailable?: boolean;
              }
            >,
            'many'
          >
        >;
        unlimited: z.ZodBoolean;
        estimatedRestockDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        allowBackorder: z.ZodOptional<z.ZodBoolean>;
        reservedStock: z.ZodOptional<z.ZodNumber>;
      },
      'strict',
      z.ZodTypeAny,
      {
        stock?: number;
        isAvailable?: boolean;
        lowStockThreshold?: number;
        variants?: {
          type?: string;
          value?: string;
          sku?: string;
          price?: number;
          variantId?: string;
          attributes?: Record<string, string>;
          compareAtPrice?: number;
          stock?: number;
          images?: string[];
          barcode?: string;
          weight?: number;
          isAvailable?: boolean;
        }[];
        unlimited?: boolean;
        estimatedRestockDate?: string | Date;
        allowBackorder?: boolean;
        reservedStock?: number;
      },
      {
        stock?: number;
        isAvailable?: boolean;
        lowStockThreshold?: number;
        variants?: {
          type?: string;
          value?: string;
          sku?: string;
          price?: number;
          variantId?: string;
          attributes?: Record<string, string>;
          compareAtPrice?: number;
          stock?: number;
          images?: string[];
          barcode?: string;
          weight?: number;
          isAvailable?: boolean;
        }[];
        unlimited?: boolean;
        estimatedRestockDate?: string | Date;
        allowBackorder?: boolean;
        reservedStock?: number;
      }
    >;
    ratings: z.ZodObject<
      {
        average: z.ZodNumber;
        count: z.ZodNumber;
        distribution: z.ZodObject<
          {
            5: z.ZodNumber;
            4: z.ZodNumber;
            3: z.ZodNumber;
            2: z.ZodNumber;
            1: z.ZodNumber;
          },
          'strict',
          z.ZodTypeAny,
          {
            1?: number;
            2?: number;
            3?: number;
            4?: number;
            5?: number;
          },
          {
            1?: number;
            2?: number;
            3?: number;
            4?: number;
            5?: number;
          }
        >;
      },
      'strict',
      z.ZodTypeAny,
      {
        count?: number;
        average?: number;
        distribution?: {
          1?: number;
          2?: number;
          3?: number;
          4?: number;
          5?: number;
        };
      },
      {
        count?: number;
        average?: number;
        distribution?: {
          1?: number;
          2?: number;
          3?: number;
          4?: number;
          5?: number;
        };
      }
    >;
    tags: z.ZodArray<z.ZodString, 'many'>;
    isActive: z.ZodBoolean;
    isFeatured: z.ZodBoolean;
    isDigital: z.ZodBoolean;
    visibility: z.ZodOptional<z.ZodEnum<['public', 'hidden', 'featured']>>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    isDeleted: z.ZodBoolean;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string;
    _id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    description?: string;
    merchantId?: string;
    isActive?: boolean;
    store?: string;
    sku?: string;
    pricing?: {
      currency?: string;
      discount?: number;
      selling?: number;
      original?: number;
      bulk?: {
        price?: number;
        minQuantity?: number;
      }[];
      gst?: {
        hsnCode?: string;
        sacCode?: string;
        gstRate?: number;
        taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
        isIGST?: boolean;
      };
    };
    images?: string[];
    slug?: string;
    productType?: 'service' | 'product';
    category?: string;
    inventory?: {
      stock?: number;
      isAvailable?: boolean;
      lowStockThreshold?: number;
      variants?: {
        type?: string;
        value?: string;
        sku?: string;
        price?: number;
        variantId?: string;
        attributes?: Record<string, string>;
        compareAtPrice?: number;
        stock?: number;
        images?: string[];
        barcode?: string;
        weight?: number;
        isAvailable?: boolean;
      }[];
      unlimited?: boolean;
      estimatedRestockDate?: string | Date;
      allowBackorder?: boolean;
      reservedStock?: number;
    };
    tags?: string[];
    isFeatured?: boolean;
    isDigital?: boolean;
    visibility?: 'hidden' | 'public' | 'featured';
    ratings?: {
      count?: number;
      average?: number;
      distribution?: {
        1?: number;
        2?: number;
        3?: number;
        4?: number;
        5?: number;
      };
    };
    isDeleted?: boolean;
  },
  {
    name?: string;
    _id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    description?: string;
    merchantId?: string;
    isActive?: boolean;
    store?: string;
    sku?: string;
    pricing?: {
      currency?: string;
      discount?: number;
      selling?: number;
      original?: number;
      bulk?: {
        price?: number;
        minQuantity?: number;
      }[];
      gst?: {
        hsnCode?: string;
        sacCode?: string;
        gstRate?: number;
        taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
        isIGST?: boolean;
      };
    };
    images?: string[];
    slug?: string;
    productType?: 'service' | 'product';
    category?: string;
    inventory?: {
      stock?: number;
      isAvailable?: boolean;
      lowStockThreshold?: number;
      variants?: {
        type?: string;
        value?: string;
        sku?: string;
        price?: number;
        variantId?: string;
        attributes?: Record<string, string>;
        compareAtPrice?: number;
        stock?: number;
        images?: string[];
        barcode?: string;
        weight?: number;
        isAvailable?: boolean;
      }[];
      unlimited?: boolean;
      estimatedRestockDate?: string | Date;
      allowBackorder?: boolean;
      reservedStock?: number;
    };
    tags?: string[];
    isFeatured?: boolean;
    isDigital?: boolean;
    visibility?: 'hidden' | 'public' | 'featured';
    ratings?: {
      count?: number;
      average?: number;
      distribution?: {
        1?: number;
        2?: number;
        3?: number;
        4?: number;
        5?: number;
      };
    };
    isDeleted?: boolean;
  }
>;
export declare const ProductListResponseSchema: z.ZodArray<
  z.ZodObject<
    {
      _id: z.ZodOptional<z.ZodString>;
      name: z.ZodString;
      slug: z.ZodString;
      description: z.ZodOptional<z.ZodString>;
      productType: z.ZodEnum<['product', 'service']>;
      category: z.ZodString;
      store: z.ZodString;
      merchantId: z.ZodOptional<z.ZodString>;
      sku: z.ZodString;
      images: z.ZodArray<z.ZodString, 'many'>;
      pricing: z.ZodEffects<
        z.ZodObject<
          {
            original: z.ZodNumber;
            selling: z.ZodNumber;
            discount: z.ZodOptional<z.ZodNumber>;
            currency: z.ZodDefault<z.ZodString>;
            bulk: z.ZodOptional<
              z.ZodArray<
                z.ZodObject<
                  {
                    minQuantity: z.ZodNumber;
                    price: z.ZodNumber;
                  },
                  'strict',
                  z.ZodTypeAny,
                  {
                    price?: number;
                    minQuantity?: number;
                  },
                  {
                    price?: number;
                    minQuantity?: number;
                  }
                >,
                'many'
              >
            >;
            gst: z.ZodOptional<
              z.ZodObject<
                {
                  hsnCode: z.ZodOptional<z.ZodString>;
                  sacCode: z.ZodOptional<z.ZodString>;
                  gstRate: z.ZodOptional<z.ZodNumber>;
                  taxSlab: z.ZodOptional<z.ZodEnum<['0', '5', '12', '18', '28', 'exempt']>>;
                  isIGST: z.ZodOptional<z.ZodBoolean>;
                },
                'strict',
                z.ZodTypeAny,
                {
                  hsnCode?: string;
                  sacCode?: string;
                  gstRate?: number;
                  taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
                  isIGST?: boolean;
                },
                {
                  hsnCode?: string;
                  sacCode?: string;
                  gstRate?: number;
                  taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
                  isIGST?: boolean;
                }
              >
            >;
          },
          'strict',
          z.ZodTypeAny,
          {
            currency?: string;
            discount?: number;
            selling?: number;
            original?: number;
            bulk?: {
              price?: number;
              minQuantity?: number;
            }[];
            gst?: {
              hsnCode?: string;
              sacCode?: string;
              gstRate?: number;
              taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
              isIGST?: boolean;
            };
          },
          {
            currency?: string;
            discount?: number;
            selling?: number;
            original?: number;
            bulk?: {
              price?: number;
              minQuantity?: number;
            }[];
            gst?: {
              hsnCode?: string;
              sacCode?: string;
              gstRate?: number;
              taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
              isIGST?: boolean;
            };
          }
        >,
        {
          currency?: string;
          discount?: number;
          selling?: number;
          original?: number;
          bulk?: {
            price?: number;
            minQuantity?: number;
          }[];
          gst?: {
            hsnCode?: string;
            sacCode?: string;
            gstRate?: number;
            taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
            isIGST?: boolean;
          };
        },
        {
          currency?: string;
          discount?: number;
          selling?: number;
          original?: number;
          bulk?: {
            price?: number;
            minQuantity?: number;
          }[];
          gst?: {
            hsnCode?: string;
            sacCode?: string;
            gstRate?: number;
            taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
            isIGST?: boolean;
          };
        }
      >;
      inventory: z.ZodObject<
        {
          stock: z.ZodNumber;
          isAvailable: z.ZodBoolean;
          lowStockThreshold: z.ZodOptional<z.ZodNumber>;
          variants: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  variantId: z.ZodString;
                  type: z.ZodString;
                  value: z.ZodString;
                  attributes: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                  price: z.ZodOptional<z.ZodNumber>;
                  compareAtPrice: z.ZodOptional<z.ZodNumber>;
                  stock: z.ZodNumber;
                  sku: z.ZodOptional<z.ZodString>;
                  images: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                  barcode: z.ZodOptional<z.ZodString>;
                  weight: z.ZodOptional<z.ZodNumber>;
                  isAvailable: z.ZodOptional<z.ZodBoolean>;
                },
                'strict',
                z.ZodTypeAny,
                {
                  type?: string;
                  value?: string;
                  sku?: string;
                  price?: number;
                  variantId?: string;
                  attributes?: Record<string, string>;
                  compareAtPrice?: number;
                  stock?: number;
                  images?: string[];
                  barcode?: string;
                  weight?: number;
                  isAvailable?: boolean;
                },
                {
                  type?: string;
                  value?: string;
                  sku?: string;
                  price?: number;
                  variantId?: string;
                  attributes?: Record<string, string>;
                  compareAtPrice?: number;
                  stock?: number;
                  images?: string[];
                  barcode?: string;
                  weight?: number;
                  isAvailable?: boolean;
                }
              >,
              'many'
            >
          >;
          unlimited: z.ZodBoolean;
          estimatedRestockDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          allowBackorder: z.ZodOptional<z.ZodBoolean>;
          reservedStock: z.ZodOptional<z.ZodNumber>;
        },
        'strict',
        z.ZodTypeAny,
        {
          stock?: number;
          isAvailable?: boolean;
          lowStockThreshold?: number;
          variants?: {
            type?: string;
            value?: string;
            sku?: string;
            price?: number;
            variantId?: string;
            attributes?: Record<string, string>;
            compareAtPrice?: number;
            stock?: number;
            images?: string[];
            barcode?: string;
            weight?: number;
            isAvailable?: boolean;
          }[];
          unlimited?: boolean;
          estimatedRestockDate?: string | Date;
          allowBackorder?: boolean;
          reservedStock?: number;
        },
        {
          stock?: number;
          isAvailable?: boolean;
          lowStockThreshold?: number;
          variants?: {
            type?: string;
            value?: string;
            sku?: string;
            price?: number;
            variantId?: string;
            attributes?: Record<string, string>;
            compareAtPrice?: number;
            stock?: number;
            images?: string[];
            barcode?: string;
            weight?: number;
            isAvailable?: boolean;
          }[];
          unlimited?: boolean;
          estimatedRestockDate?: string | Date;
          allowBackorder?: boolean;
          reservedStock?: number;
        }
      >;
      ratings: z.ZodObject<
        {
          average: z.ZodNumber;
          count: z.ZodNumber;
          distribution: z.ZodObject<
            {
              5: z.ZodNumber;
              4: z.ZodNumber;
              3: z.ZodNumber;
              2: z.ZodNumber;
              1: z.ZodNumber;
            },
            'strict',
            z.ZodTypeAny,
            {
              1?: number;
              2?: number;
              3?: number;
              4?: number;
              5?: number;
            },
            {
              1?: number;
              2?: number;
              3?: number;
              4?: number;
              5?: number;
            }
          >;
        },
        'strict',
        z.ZodTypeAny,
        {
          count?: number;
          average?: number;
          distribution?: {
            1?: number;
            2?: number;
            3?: number;
            4?: number;
            5?: number;
          };
        },
        {
          count?: number;
          average?: number;
          distribution?: {
            1?: number;
            2?: number;
            3?: number;
            4?: number;
            5?: number;
          };
        }
      >;
      tags: z.ZodArray<z.ZodString, 'many'>;
      isActive: z.ZodBoolean;
      isFeatured: z.ZodBoolean;
      isDigital: z.ZodBoolean;
      visibility: z.ZodOptional<z.ZodEnum<['public', 'hidden', 'featured']>>;
      createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
      updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
      isDeleted: z.ZodBoolean;
    },
    'strip',
    z.ZodTypeAny,
    {
      name?: string;
      _id?: string;
      createdAt?: string | Date;
      updatedAt?: string | Date;
      description?: string;
      merchantId?: string;
      isActive?: boolean;
      store?: string;
      sku?: string;
      pricing?: {
        currency?: string;
        discount?: number;
        selling?: number;
        original?: number;
        bulk?: {
          price?: number;
          minQuantity?: number;
        }[];
        gst?: {
          hsnCode?: string;
          sacCode?: string;
          gstRate?: number;
          taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
          isIGST?: boolean;
        };
      };
      images?: string[];
      slug?: string;
      productType?: 'service' | 'product';
      category?: string;
      inventory?: {
        stock?: number;
        isAvailable?: boolean;
        lowStockThreshold?: number;
        variants?: {
          type?: string;
          value?: string;
          sku?: string;
          price?: number;
          variantId?: string;
          attributes?: Record<string, string>;
          compareAtPrice?: number;
          stock?: number;
          images?: string[];
          barcode?: string;
          weight?: number;
          isAvailable?: boolean;
        }[];
        unlimited?: boolean;
        estimatedRestockDate?: string | Date;
        allowBackorder?: boolean;
        reservedStock?: number;
      };
      tags?: string[];
      isFeatured?: boolean;
      isDigital?: boolean;
      visibility?: 'hidden' | 'public' | 'featured';
      ratings?: {
        count?: number;
        average?: number;
        distribution?: {
          1?: number;
          2?: number;
          3?: number;
          4?: number;
          5?: number;
        };
      };
      isDeleted?: boolean;
    },
    {
      name?: string;
      _id?: string;
      createdAt?: string | Date;
      updatedAt?: string | Date;
      description?: string;
      merchantId?: string;
      isActive?: boolean;
      store?: string;
      sku?: string;
      pricing?: {
        currency?: string;
        discount?: number;
        selling?: number;
        original?: number;
        bulk?: {
          price?: number;
          minQuantity?: number;
        }[];
        gst?: {
          hsnCode?: string;
          sacCode?: string;
          gstRate?: number;
          taxSlab?: '0' | '5' | '12' | '18' | '28' | 'exempt';
          isIGST?: boolean;
        };
      };
      images?: string[];
      slug?: string;
      productType?: 'service' | 'product';
      category?: string;
      inventory?: {
        stock?: number;
        isAvailable?: boolean;
        lowStockThreshold?: number;
        variants?: {
          type?: string;
          value?: string;
          sku?: string;
          price?: number;
          variantId?: string;
          attributes?: Record<string, string>;
          compareAtPrice?: number;
          stock?: number;
          images?: string[];
          barcode?: string;
          weight?: number;
          isAvailable?: boolean;
        }[];
        unlimited?: boolean;
        estimatedRestockDate?: string | Date;
        allowBackorder?: boolean;
        reservedStock?: number;
      };
      tags?: string[];
      isFeatured?: boolean;
      isDigital?: boolean;
      visibility?: 'hidden' | 'public' | 'featured';
      ratings?: {
        count?: number;
        average?: number;
        distribution?: {
          1?: number;
          2?: number;
          3?: number;
          4?: number;
          5?: number;
        };
      };
      isDeleted?: boolean;
    }
  >,
  'many'
>;
export type CreateProductRequest = z.infer<typeof CreateProductSchema>;
export type UpdateProductRequest = z.infer<typeof UpdateProductSchema>;
export type ProductResponse = z.infer<typeof ProductResponseSchema>;
export type ProductListResponse = z.infer<typeof ProductListResponseSchema>;
//# sourceMappingURL=product.schema.d.ts.map
