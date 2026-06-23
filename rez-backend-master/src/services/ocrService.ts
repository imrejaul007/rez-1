import { logger } from '../config/logger';
/**
 * OCR Service - Bill Text Extraction
 *
 * Supports two OCR providers:
 * 1. Google Cloud Vision API (Recommended - 90%+ accuracy)
 * 2. AWS Textract (Alternative)
 *
 * Setup Instructions:
 *
 * GOOGLE CLOUD VISION:
 * 1. Create a Google Cloud project: https://console.cloud.google.com
 * 2. Enable Cloud Vision API
 * 3. Create service account and download JSON key
 * 4. Set environment variable: GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 * 5. Or set GOOGLE_CLOUD_API_KEY in .env
 *
 * AWS TEXTRACT:
 * 1. Create AWS account and IAM user with Textract permissions
 * 2. Set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 *
 * Default provider: Google Cloud Vision
 * Fallback: Manual text parsing
 */

import axios from 'axios';
import { IExtractedData } from '../models/Bill';

interface OCRResult {
  success: boolean;
  extractedData?: IExtractedData;
  confidence?: number;
  rawText?: string;
  error?: string;
}

class OCRService {
  private provider: 'google' | 'aws' | 'manual';
  private googleApiKey?: string;
  private awsConfig?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };

  constructor() {
    // Determine which OCR provider to use
    this.googleApiKey = process.env.GOOGLE_CLOUD_API_KEY;

    if (this.googleApiKey) {
      this.provider = 'google';
      logger.info('✅ [OCR SERVICE] Using Google Cloud Vision API');
    } else if (
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_REGION
    ) {
      this.provider = 'aws';
      this.awsConfig = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
      };
      logger.info('✅ [OCR SERVICE] Using AWS Textract');
    } else {
      this.provider = 'manual';
      logger.warn('⚠️ [OCR SERVICE] No OCR provider configured, using manual extraction');
    }
  }

  /**
   * Extract text from bill image
   */
  async extractTextFromBill(imageUrl: string): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      logger.info(`📸 [OCR] Extracting text from bill image...`);
      logger.info(`Provider: ${this.provider}`);

      let result: OCRResult;

      switch (this.provider) {
        case 'google':
          result = await this.extractWithGoogleVision(imageUrl);
          break;
        case 'aws':
          result = await this.extractWithAWSTextract(imageUrl);
          break;
        default:
          result = this.manualExtraction();
          break;
      }

      const processingTime = Date.now() - startTime;
      logger.info(`✅ [OCR] Text extraction completed in ${processingTime}ms`);
      logger.info(`Confidence: ${result.confidence || 0}%`);

      return result;
    } catch (error) {
      logger.error('❌ [OCR] Text extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR extraction failed',
      };
    }
  }

  /**
   * Extract text using Google Cloud Vision API
   */
  private async extractWithGoogleVision(imageUrl: string): Promise<OCRResult> {
    try {
      logger.info('📤 [GOOGLE VISION] Sending request...');

      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleApiKey}`,
        {
          requests: [
            {
              image: {
                source: {
                  imageUri: imageUrl,
                },
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1,
                },
                {
                  type: 'DOCUMENT_TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }
      );

      const annotations = response.data.responses[0];

      if (!annotations.textAnnotations || annotations.textAnnotations.length === 0) {
        return {
          success: false,
          error: 'No text detected in image',
        };
      }

      // Get full text
      const rawText = annotations.fullTextAnnotation?.text || annotations.textAnnotations[0].description;

      logger.info('📄 [GOOGLE VISION] Raw text extracted:');
      logger.info(rawText);

      // Parse the text to extract bill details
      const extractedData = this.parseTextToBillData(rawText);

      // Calculate confidence
      const confidence = annotations.fullTextAnnotation?.pages?.[0]?.confidence
        ? annotations.fullTextAnnotation.pages[0].confidence * 100
        : 85; // Default confidence

      return {
        success: true,
        extractedData,
        confidence,
        rawText,
      };
    } catch (error) {
      logger.error('❌ [GOOGLE VISION] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google Vision API error',
      };
    }
  }

  /**
   * Extract text using AWS Textract
   */
  private async extractWithAWSTextract(imageUrl: string): Promise<OCRResult> {
    try {
      logger.info('📤 [AWS TEXTRACT] Sending request...');

      // Note: This is a simplified version. In production, use AWS SDK
      // npm install aws-sdk
      // import AWS from 'aws-sdk';

      const AWS = require('aws-sdk');
      AWS.config.update(this.awsConfig);

      const textract = new AWS.Textract();

      // Download image to buffer
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const imageBuffer = Buffer.from(imageResponse.data);

      const params = {
        Document: {
          Bytes: imageBuffer,
        },
        FeatureTypes: ['FORMS', 'TABLES'],
      };

      const result = await textract.analyzeDocument(params).promise();

      // Extract text from blocks
      let rawText = '';
      if (result.Blocks) {
        result.Blocks.forEach((block: any) => {
          if (block.BlockType === 'LINE') {
            rawText += block.Text + '\n';
          }
        });
      }

      logger.info('📄 [AWS TEXTRACT] Raw text extracted:');
      logger.info(rawText);

      // Parse the text to extract bill details
      const extractedData = this.parseTextToBillData(rawText);

      // Calculate confidence
      const confidence = result.Blocks?.[0]?.Confidence || 85;

      return {
        success: true,
        extractedData,
        confidence,
        rawText,
      };
    } catch (error) {
      logger.error('❌ [AWS TEXTRACT] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AWS Textract error',
      };
    }
  }

  /**
   * Manual extraction (fallback)
   */
  private manualExtraction(): OCRResult {
    logger.info('⚠️ [MANUAL] No OCR provider available, returning empty result');
    return {
      success: true,
      extractedData: {},
      confidence: 0,
    };
  }

  /**
   * Parse raw text to extract bill data
   */
  private parseTextToBillData(text: string): IExtractedData {
    const extractedData: IExtractedData = {};

    // Convert to lowercase for easier matching
    const lowerText = text.toLowerCase();
    const lines = text.split('\n');

    // Extract merchant name (usually first few lines)
    if (lines.length > 0) {
      extractedData.merchantName = lines[0].trim();
    }

    // Extract amount (look for patterns like: Total: 1,234.56, Amount: 1234, etc.)
    const amountPatterns = [
      /(?:total|amount|grand total|net total|bill amount)[:\s]*(?:rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
      /(?:rs\.?|₹)\s*([\d,]+\.?\d*)/i,
      /(?:total|amount)[:\s]*([\d,]+\.?\d*)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > 0) {
          extractedData.amount = amount;
          break;
        }
      }
    }

    // Extract date (look for date patterns)
    const datePatterns = [
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/,
      /(\d{2,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,
      /(?:date|dt)[:\s]*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          // Try different date formats
          let day, month, year;

          // Format: DD/MM/YYYY or DD-MM-YYYY
          if (match[1].length <= 2) {
            day = parseInt(match[1]);
            month = parseInt(match[2]) - 1; // JS months are 0-indexed
            year = parseInt(match[3]);
          } else {
            // Format: YYYY/MM/DD or YYYY-MM-DD
            year = parseInt(match[1]);
            month = parseInt(match[2]) - 1;
            day = parseInt(match[3]);
          }

          // Handle 2-digit year
          if (year < 100) {
            year += 2000;
          }

          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            extractedData.date = date;
            break;
          }
        } catch (error) {
          logger.error('Error parsing date:', error);
        }
      }
    }

    // Extract bill number (look for invoice/bill number patterns)
    const billNumberPatterns = [
      /(?:invoice|bill|receipt)\s*(?:no|number|#)[:\s]*([A-Z0-9\-\/]+)/i,
      /(?:no|#)[:\s]*([A-Z0-9\-\/]{3,})/i,
    ];

    for (const pattern of billNumberPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        extractedData.billNumber = match[1].trim();
        break;
      }
    }

    // Extract tax amount
    const taxPatterns = [
      /(?:tax|gst|vat)[:\s]*(?:rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
      /(?:cgst|sgst|igst)[:\s]*(?:rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const taxStr = match[1].replace(/,/g, '');
        const tax = parseFloat(taxStr);
        if (!isNaN(tax) && tax > 0) {
          extractedData.taxAmount = tax;
          break;
        }
      }
    }

    // Extract discount amount
    const discountPatterns = [
      /(?:discount|off|savings)[:\s]*(?:rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
    ];

    for (const pattern of discountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const discountStr = match[1].replace(/,/g, '');
        const discount = parseFloat(discountStr);
        if (!isNaN(discount) && discount > 0) {
          extractedData.discountAmount = discount;
          break;
        }
      }
    }

    // Calculate overall confidence based on extracted fields
    let fieldsExtracted = 0;
    if (extractedData.merchantName) fieldsExtracted++;
    if (extractedData.amount) fieldsExtracted++;
    if (extractedData.date) fieldsExtracted++;
    if (extractedData.billNumber) fieldsExtracted++;

    const confidenceScore = (fieldsExtracted / 4) * 100;
    extractedData.confidence = Math.round(confidenceScore);

    logger.info('📊 [OCR PARSER] Extracted data:');
    logger.info(JSON.stringify(extractedData, null, 2));

    return extractedData;
  }

  /**
   * Validate extracted data against user input
   */
  validateExtractedData(
    extracted: IExtractedData,
    userInput: {
      amount: number;
      billDate: Date;
      merchantName?: string;
    }
  ): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check amount mismatch (allow 10% variance)
    if (extracted.amount) {
      const variance = Math.abs(extracted.amount - userInput.amount);
      const percentVariance = (variance / userInput.amount) * 100;

      if (percentVariance > 10) {
        warnings.push(
          `Amount mismatch: OCR detected ₹${extracted.amount}, but user entered ₹${userInput.amount}`
        );
      }
    }

    // Check date mismatch (allow 7 days variance)
    if (extracted.date) {
      const daysDiff = Math.abs(
        (extracted.date.getTime() - userInput.billDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > 7) {
        warnings.push(
          `Date mismatch: OCR detected ${extracted.date.toDateString()}, but user entered ${userInput.billDate.toDateString()}`
        );
      }
    }

    // Check merchant name mismatch
    if (extracted.merchantName && userInput.merchantName) {
      const similarity = this.calculateStringSimilarity(
        extracted.merchantName.toLowerCase(),
        userInput.merchantName.toLowerCase()
      );

      if (similarity < 0.5) {
        warnings.push(
          `Merchant name mismatch: OCR detected "${extracted.merchantName}", but user selected "${userInput.merchantName}"`
        );
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Calculate string similarity (simple Levenshtein-based)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    return (longer.length - this.levenshteinDistance(longer, shorter)) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// Export singleton instance
export const ocrService = new OCRService();
export default ocrService;
