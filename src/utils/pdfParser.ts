import * as pdfjsLib from 'pdfjs-dist';

export const parseCandidatePDF = async (file: File) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Use disableWorker: true to run in the main thread
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      disableWorker: true 
    } as any);
    
    const pdf = await loadingTask.promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ');
    }
    
    return extractDataFromText(text);
  } catch (error) {
    console.error('PDF parsing error, falling back to raw FileReader:', error);
    try {
      // Fallback to raw text extraction (might be garbled but sometimes works for basic text)
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || '');
        reader.onerror = reject;
        reader.readAsText(file);
      });
      return extractDataFromText(text);
    } catch (fallbackError) {
      console.error('Fallback parsing failed:', fallbackError);
      throw new Error('לא ניתן לפענח את קובץ ה-PDF');
    }
  }
};

const extractDataFromText = (text: string) => {
  const extract = (regex: RegExp) => text.match(regex)?.[1]?.trim() || '';
  
  return {
    full_name: extract(/שם:\s*(.*)/i),
    phone: extract(/טלפון:\s*(.*)/i),
    email: extract(/אימייל:\s*(.*)/i) || extract(/דוא"ל:\s*(.*)/i) || extract(/email:\s*(.*)/i),
    age: parseInt(extract(/גיל:\s*(\d+)/i)),
    city: extract(/מגורים:\s*(.*)/i),
    ethnicity: extract(/עדה:\s*(.*)/i),
    marital_status: extract(/מצב משפחתי:\s*(.*)/i),
    occupation: extract(/עיסוק:\s*(.*)/i),
    about: extract(/קצת עלי:\s*(.*)/i),
    looking_for: extract(/מה אני מחפש:\s*(.*)/i),
    image_url: extract(/תמונה:\s*(.*)/i),
    age_range: extract(/טווח גילאים:\s*(\d+-\d+)/i),
    affiliation_group: extract(/שיוך:\s*(.*)/i)
  };
};
