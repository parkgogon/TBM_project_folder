
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LanguageSelector } from './components/LanguageSelector';
import { Spinner } from './components/Spinner';
import { Alert } from './components/Alert';
import { translateText, convertTextToMarkdown, extractTextFromImageData } from './services/geminiService';
import { useTTS } from './hooks/useTTS';
import { TargetLanguage } from './types';
import { supportedLanguages, KOREAN_CONSTRUCTION_TERMS } from './constants';
import { PlayIcon, DocumentTextIcon, LanguageIcon, InformationCircleIcon, StopIcon, DocumentArrowUpIcon } from './components/Icons';

import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(supportedLanguages[0]);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false); // For translation loading
  const [error, setError] = useState<string | null>(null); // General/Translation errors
  
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false); // Covers PDF page OCR & image OCR
  const [isFormattingToMarkdown, setIsFormattingToMarkdown] = useState<boolean>(false);
  const [fileProcessingError, setFileProcessingError] = useState<string | null>(null); 

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // Still needed for PDF page rendering

  const { speak, cancel, isSpeaking, isSynthesizing, ttsError, isSupported: isTtsSupported } = useTTS();
  const [currentTtsError, setCurrentTtsError] = useState<string | null>(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
    
    setInputText(
`# 작업 전 안전점검 사항

1.  **개인 보호구** 착용 상태 확인 (안전모, 안전화, 안전벨트)
2.  작업 발판 및 안전 난간 이상 유무 확인
3.  작업 구역 내 위험 요소 사전 제거 (낙하물, 전선 등)
4.  비상 대피로 확보 여부 확인`
    );
  }, []);

  useEffect(() => {
    if (ttsError) {
      setCurrentTtsError(ttsError);
    }
  }, [ttsError]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtractingText(true);
    setIsFormattingToMarkdown(false);
    setFileProcessingError(null);
    setError(null); 
    setInputText(''); 
    setTranslatedText(''); 
    if (isTtsSupported) cancel();

    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullRawText = '';
        const canvas = canvasRef.current || document.createElement('canvas');
        if (!canvasRef.current) { /* canvas is used locally if ref is null, not stored back to ref */ }

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          const context = canvas.getContext('2d');
          if (!context) {
              throw new Error("Could not get canvas context for PDF page rendering.");
          }

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
          
          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85); // OCR from JPEG
          const base64ImageData = imageDataUrl.split(',')[1];

          if (base64ImageData) {
            try {
              const textFromPage = await extractTextFromImageData(base64ImageData, 'image/jpeg');
              fullRawText += textFromPage + '\n\n';
            } catch (ocrErr: any) {
              console.warn(`OCR failed for PDF page ${i}:`, ocrErr);
              // Continue processing other pages, maybe accumulate errors or show one prominent one.
            }
          }
          page.cleanup();
        }
        
        const rawPdfText = fullRawText.trim();
        
        if (rawPdfText) {
          setInputText(rawPdfText); // Show raw text first
          setIsExtractingText(false); // Raw text extraction from PDF is done
          setIsFormattingToMarkdown(true);
          try {
            const markdownText = await convertTextToMarkdown(rawPdfText);
            setInputText(markdownText);
          } catch (mdErr: any) {
            console.error('Error converting PDF OCR text to Markdown:', mdErr);
            setFileProcessingError(`Markdown Conversion Error (PDF): ${mdErr.message || 'Could not format extracted text.'}. Raw text loaded.`);
            // inputText is already set to rawPdfText
          } finally {
            setIsFormattingToMarkdown(false);
          }
        } else {
           setFileProcessingError("No text content could be extracted from the PDF (OCR).");
           setIsExtractingText(false);
        }

      } catch (err: any) {
        console.error('Error processing PDF:', err);
        setFileProcessingError(`PDF Processing/OCR Error: ${err.message || 'Could not process PDF.'}`);
        setIsExtractingText(false);
        setIsFormattingToMarkdown(false);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; 
        }
      }
    } else if (validImageTypes.includes(file.type.toLowerCase())) {
        try {
            const base64ImageData = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    if (reader.result) {
                        resolve((reader.result as string).split(',')[1]);
                    } else {
                        reject(new Error("File reading resulted in null."));
                    }
                };
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });
            const mimeType = file.type;

            let rawTextFromImage = '';
            try {
                rawTextFromImage = await extractTextFromImageData(base64ImageData, mimeType);
            } catch (ocrErr: any) {
                console.error(`OCR failed for image ${file.name}:`, ocrErr);
                setFileProcessingError(`Image OCR Error: ${ocrErr.message || 'Could not extract text from image.'}`);
                setIsExtractingText(false); // Stop extraction spinner
                if (fileInputRef.current) fileInputRef.current.value = '';
                return; // Exit if OCR fails
            }
            
            setInputText(rawTextFromImage); // Show raw text
            setIsExtractingText(false); // Text extraction (OCR) from image is done

            if (rawTextFromImage.trim()) {
                setIsFormattingToMarkdown(true);
                try {
                    const markdownText = await convertTextToMarkdown(rawTextFromImage);
                    setInputText(markdownText);
                } catch (mdErr: any) {
                    console.error('Error converting image OCR text to Markdown:', mdErr);
                    setFileProcessingError(`Markdown Conversion Error (Image): ${mdErr.message || 'Could not format extracted text.'}. Raw text loaded.`);
                    // inputText is already rawTextFromImage
                } finally {
                    setIsFormattingToMarkdown(false);
                }
            } else {
                 setFileProcessingError("No text content could be extracted from the image (OCR).");
            }
        } catch (err: any) {
            console.error('Error processing image file:', err);
            if (!fileProcessingError) { // Don't overwrite a more specific OCR error
                 setFileProcessingError(`Image Processing Error: ${err.message || 'Could not process image file.'}`);
            }
            setIsExtractingText(false);
            setIsFormattingToMarkdown(false);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    } else {
        setFileProcessingError(`Unsupported file type: ${file.name} (${file.type}). Please upload a PDF, JPG, PNG, or WEBP file.`);
        setIsExtractingText(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) {
      setError('Please upload a file or ensure there is content to translate.');
      return;
    }
    setError(null);
    setCurrentTtsError(null);
    setIsLoading(true);
    setTranslatedText('');
    if (isTtsSupported) cancel(); 

    const lawTermsString = Object.entries(KOREAN_CONSTRUCTION_TERMS)
        .map(([ko, en]) => `* ${ko}: ${en}`)
        .join('\n');
    
    const baseSystemInstruction = `Reference for some Korean construction/safety terms (use if relevant):
${lawTermsString}`;

    try {
      const result = await translateText(inputText, targetLanguage.code, baseSystemInstruction);
      setTranslatedText(result); 
    } catch (err) {
      console.error('Translation error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during translation.');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, targetLanguage, cancel, isTtsSupported]);

  const handleSpeakOrStop = () => {
    if (!isTtsSupported) {
      setCurrentTtsError("Text-to-Speech is not supported by this browser.");
      return;
    }
    setCurrentTtsError(null);
    if (isSpeaking || isSynthesizing) {
      cancel();
    } else {
      if (translatedText && targetLanguage) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = DOMPurify.sanitize(marked.parse(translatedText) as string, { USE_PROFILES: { html: true } });
        const textToSpeak = tempDiv.textContent || tempDiv.innerText || "";
        
        if (textToSpeak.trim()) {
            speak(textToSpeak.trim(), targetLanguage.code);
        } else {
            setCurrentTtsError("No text content available to speak.");
        }
      }
    }
  };
  
  const showOverallSpinner = isExtractingText || isFormattingToMarkdown;
  const uploadButtonText = isExtractingText ? 'Extracting Text (OCR)...' : isFormattingToMarkdown ? 'Formatting...' : '파일 업로드 (PDF/이미지)';

  let ttsButtonIcon;
  let ttsButtonText;
  if (isSynthesizing) {
    ttsButtonIcon = <Spinner size="sm" />;
    ttsButtonText = "Synthesizing...";
  } else if (isSpeaking) {
    ttsButtonIcon = <StopIcon className="w-5 h-5 mr-2" />;
    ttsButtonText = "멈추기";
  } else {
    ttsButtonIcon = <PlayIcon className="w-5 h-5 mr-2" />;
    ttsButtonText = "번역 듣기";
  }
  if (!isTtsSupported) {
    ttsButtonText = "TTS Not Supported";
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 text-slate-100">
      <Header />
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      <main className="flex-grow container mx-auto px-4 py-8 space-y-8">
        {error && <Alert message={error} type="error" onClose={() => setError(null)} />}
        {fileProcessingError && <Alert message={fileProcessingError} type="warning" onClose={() => setFileProcessingError(null)} />}
        {currentTtsError && <Alert message={`TTS Info: ${currentTtsError}`} type={currentTtsError.startsWith("Speech error:") || currentTtsError.includes("not supported") ? "error" : "info"} onClose={() => setCurrentTtsError(null)} />}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-slate-800 p-6 rounded-xl shadow-2xl space-y-4 ring-1 ring-slate-700 flex flex-col">
            <h2 className="text-2xl font-semibold text-sky-400 flex items-center mb-1">
              <DocumentTextIcon className="w-7 h-7 mr-2" />
              TBM Docs Input (Korean)
            </h2>
            
            {showOverallSpinner && inputText === '' && (
               <div className="flex-grow flex justify-center items-center h-[45rem]">
                 <Spinner />
               </div>
            )}
            {!showOverallSpinner && !inputText && (
              <div className="flex-grow flex justify-center items-center h-[45rem] p-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-400 italic">
                Upload a PDF or Image (JPG, PNG, WEBP) to see its Markdown content here, or use the example.
              </div>
            )}
            {/* Display input text if available, even during formatting, or when not spinning */}
            {inputText && (!showOverallSpinner || (showOverallSpinner && inputText !== '')) && (
              <div
                className="flex-grow w-full h-[45rem] p-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-200 overflow-y-auto rendered-markdown"
                aria-live="polite"
                aria-label="TBM Material Input (Rendered Markdown)"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(inputText) as string) }}
              >
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
                disabled={showOverallSpinner || isLoading || (isTtsSupported && (isSynthesizing || isSpeaking))}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={showOverallSpinner || isLoading || (isTtsSupported && (isSynthesizing || isSpeaking))}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition-colors duration-150 flex items-center justify-center order-1 sm:order-none"
                aria-label="Upload TBM document (PDF or Image)"
              >
                {showOverallSpinner ? <Spinner size="sm" /> : <DocumentArrowUpIcon className="w-5 h-5 mr-2" />}
                {uploadButtonText}
              </button>
              
              <div className="flex-grow sm:flex-grow-0 order-2 sm:order-none">
                <LanguageSelector
                  selectedLanguage={targetLanguage}
                  onSelectLanguage={(lang) => {
                    setTargetLanguage(lang);
                    if (isTtsSupported) cancel(); 
                    setCurrentTtsError(null);
                  }}
                />
              </div>
              
              <button
                onClick={handleTranslate}
                disabled={isLoading || showOverallSpinner || !inputText.trim() || (isTtsSupported && (isSynthesizing || isSpeaking))}
                className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-5 rounded-lg shadow-md transition-colors duration-150 flex items-center justify-center order-3 sm:order-none"
              >
                {isLoading ? <Spinner size="sm" /> : <LanguageIcon className="w-5 h-5 mr-2" />}
                번역
              </button>
            </div>
          </div>

          {/* Output Section */}
          <div className="bg-slate-800 p-6 rounded-xl shadow-2xl space-y-4 ring-1 ring-slate-700 flex flex-col">
            <h2 className="text-2xl font-semibold text-emerald-400 flex items-center">
              <LanguageIcon className="w-7 h-7 mr-2" />
              Translated Output ({targetLanguage.name})
            </h2>
            {isLoading && !translatedText && (
              <div className="flex-grow flex justify-center items-center h-[45rem]">
                <Spinner />
              </div>
            )}
            {!isLoading && !translatedText && !error && (
              <div className="flex-grow flex justify-center items-center h-[45rem] text-slate-400 italic">
                Translated text (Markdown rendered) will appear here.
              </div>
            )}
            {translatedText && !isLoading && (
              <div 
                className="flex-grow w-full h-[45rem] p-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-200 overflow-y-auto rendered-markdown"
                aria-live="polite"
                aria-label="Translated TBM Material (Rendered Markdown)"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(translatedText) as string) }}
              >
              </div>
            )}
             {!isLoading && error && !translatedText && (
              <div className="flex-grow flex justify-center items-center h-[45rem] text-red-400 p-3 bg-slate-700/50 border border-red-500 rounded-md">
                Translation failed. Please check error messages above.
              </div>
            )}
            <button
              onClick={handleSpeakOrStop}
              disabled={!isTtsSupported || isLoading || showOverallSpinner || !translatedText.trim()}
              className={`w-full text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-150 flex items-center justify-center disabled:cursor-not-allowed disabled:text-slate-400 ${
                (isSpeaking || isSynthesizing)
                  ? 'bg-red-600 hover:bg-red-500 disabled:bg-red-800' 
                  : 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800'
              }`}
              aria-label={isSpeaking ? "멈추기" : (isSynthesizing ? "Synthesizing audio" : "번역 듣기")}
            >
              {isTtsSupported ? ttsButtonIcon : <StopIcon className="w-5 h-5 mr-2 text-slate-500" />}
              {ttsButtonText}
            </button>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl shadow-lg ring-1 ring-slate-700">
          <h3 className="text-xl font-semibold text-amber-400 mb-3 flex items-center">
            <InformationCircleIcon className="w-6 h-6 mr-2" />
            참고 / Note
          </h3>
          <p className="text-slate-300 text-sm mb-3">
            이 애플리케이션은 업로드된 PDF 또는 이미지 파일(JPG, PNG, WEBP)을 처리합니다. 먼저 스캔된 문서나 이미지의 경우 OCR을 사용하여 원시 텍스트를 추출한 다음, AI 모델을 사용하여 해당 텍스트를 입력 필드용 마크다운 형식으로 변환합니다. 
            번역 프로세스는 또한 이 마크다운 구조를 출력물에 보존하는 것을 목표로 합니다. 
            음성 변환은 브라우저에 내장된 Web Speech API (SpeechSynthesis)를 사용합니다. 사용 가능한 음성 및 품질은 브라우저 및 운영 체제에 따라 다를 수 있습니다.
            원시 텍스트(특히 OCR로 처리된 콘텐츠)로부터의 구조에 대한 AI의 해석 및 후속 마크다운 변환/번역은 경험적이며 달라질 수 있습니다. 
            법률 및 안전 용어(예: <code>KOREAN_CONSTRUCTION_TERMS</code>)는 번역 정확도를 향상시키기 위해 AI에 제공됩니다.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
