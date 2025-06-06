
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME } from '../constants';

// API_KEY must be obtained exclusively from process.env.API_KEY.
// Assume this variable is pre-configured, valid, and accessible.
// The GoogleGenAI constructor will use this key.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// This function ensures that process.env.API_KEY, which is passed to GoogleGenAI,
// meets the basic expectation of being a non-empty string.
// The GoogleGenAI SDK itself will handle the actual validity of the key.
function ensureApiKeyIsConfigured(): void {
  const apiKey = process.env.API_KEY;
  // Check if apiKey is a string and if, after trimming, it has length.
  // This covers undefined, null, empty string, or whitespace-only string.
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    console.error("API_KEY for Gemini is not set as a non-empty string in environment variables. It's assumed to be pre-configured and valid.");
    throw new Error("API Key for Gemini is not configured as expected in environment variables. Please ensure API_KEY is a non-empty string.");
  }
}

export async function extractTextFromImageData(base64ImageData: string, mimeType: string): Promise<string> {
  ensureApiKeyIsConfigured();

  const model = GEMINI_MODEL_NAME;
  const prompt = `Perform OCR on this image and extract all text content.
Preserve line breaks and paragraph structure as accurately as possible from the image.
If the image contains forms or tables, try to maintain a semblance of that structure in the extracted text.
The primary goal is to get all readable text.`;

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64ImageData,
    },
  };
  const textPart = { text: prompt };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        temperature: 0.1, // Low temperature for more deterministic OCR
        topP: 0.9,
        topK: 20,
      }
    });

    const extractedText = response.text;
    if (typeof extractedText === 'string') {
      return extractedText.trim();
    } else {
      console.warn("Gemini API returned non-text response for OCR:", response);
      throw new Error("OCR failed: Unexpected response format from AI.");
    }
  } catch (error) {
    console.error("Error calling Gemini API for OCR:", error);
    if (error instanceof Error) {
        if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID") || error.message.includes("API key is invalid")) {
             throw new Error("Invalid API Key for Gemini. Please check your Gemini API key configuration.");
        }
         throw new Error(`AI OCR service error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI OCR service.");
  }
}


export async function convertTextToMarkdown(rawText: string): Promise<string> {
  ensureApiKeyIsConfigured();
  if (!rawText.trim()) {
    return "";
  }

  const model = GEMINI_MODEL_NAME;
  const prompt = `Convert the following text content, which may have been extracted via OCR, into well-formatted Markdown.
Infer structure like headings, paragraphs, lists, and tables if discernible from the text.
Ensure the output is only Markdown.
Raw text:
---
${rawText}
---`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert text processor specializing in converting unstructured text (potentially from OCR) to clean Markdown.",
        temperature: 0.2,
        topP: 0.8,
        topK: 20,
      }
    });

    const markdownText = response.text;
    if (typeof markdownText === 'string') {
      let cleanedText = markdownText.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = cleanedText.match(fenceRegex);
      if (match && match[2]) {
        cleanedText = match[2].trim();
      }
      return cleanedText;
    } else {
      console.warn("Gemini API returned non-text response for Markdown conversion:", response);
      throw new Error("Markdown conversion failed: Unexpected response format from AI.");
    }

  } catch (error) {
    console.error("Error calling Gemini API for Markdown conversion:", error);
    if (error instanceof Error) {
        if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID") || error.message.includes("API key is invalid")) {
             throw new Error("Invalid API Key for Gemini. Please check your Gemini API key configuration.");
        }
         throw new Error(`AI Markdown conversion service error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI Markdown conversion service.");
  }
}


export async function translateText(
  text: string,
  targetLanguageCode: string,
  systemInstructionText?: string
): Promise<string> {
  ensureApiKeyIsConfigured();

  const model = GEMINI_MODEL_NAME;
  const prompt = `Translate the following text (which may be in Markdown format) into ${targetLanguageCode}.
Preserve the Markdown formatting (headings, lists, bold, italics, tables, etc.) in the translated output.
Original text:
---
${text}
---`;

  const fullSystemInstruction = `${systemInstructionText || 'You are a helpful translation assistant.'}
You are translating TBM (Toolbox Meeting) material for construction site safety.
The input text might be in Markdown format. Your translated output MUST also be in Markdown format, preserving the original structure (headings, lists, paragraphs, tables, emphasis, etc.).
Ensure the translation is clear, accurate, and uses terminology appropriate for a construction safety context.
The target audience is foreign workers who may not be native speakers of the target language, so keep the language accessible but precise for safety instructions.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: 0.3,
        topP: 0.9,
        topK: 30,
      }
    });

    const translatedMarkdown = response.text;
    if (typeof translatedMarkdown === 'string') {
      let cleanedText = translatedMarkdown.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = cleanedText.match(fenceRegex);
      if (match && match[2]) {
        cleanedText = match[2].trim();
      }
      return cleanedText;
    } else {
      console.warn("Gemini API returned non-text response for translation:", response);
      throw new Error("Translation failed: Unexpected response format from AI.");
    }

  } catch (error) {
    console.error("Error calling Gemini API for translation:", error);
    if (error instanceof Error) {
        if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID") || error.message.includes("API key is invalid")) {
             throw new Error("Invalid API Key for Gemini. Please check your Gemini API key configuration.");
        }
         throw new Error(`AI translation service error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI translation service.");
  }
}
