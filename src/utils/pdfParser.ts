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
  const clean = (val: string) => val.replace(/[😊👳🏻🎂🌱✨🏡🙏👪🇮🇱🎓👱🏼‍♀🎯🙌🚬🎚]/g, '').trim();
  const extract = (regex: RegExp) => {
    const match = text.match(regex);
    return match ? clean(match[1]) : '';
  };
  
  const data = {
    full_name: extract(/(?:😊\s*)?שם:\s*(.*)/i),
    phone: extract(/(?:📞\s*)?טלפון:\s*(.*)/i),
    email: extract(/(?:📧\s*)?אימייל:\s*(.*)/i) || extract(/דוא"ל:\s*(.*)/i) || extract(/email:\s*(.*)/i),
    age: parseInt(extract(/(?:🎂\s*)?גיל:\s*(\d+)/i)) || 0,
    city: extract(/(?:🏡\s*)?מגורים:\s*(.*)/i),
    ethnicity: extract(/(?:👳🏻\s*)?עדה:\s*(.*)/i),
    marital_status: extract(/(?:✨\s*)?מצב משפחתי:\s*(.*)/i),
    occupation: extract(/(?:🎓\s*)?עיסוק:\s*(.*)/i),
    about: extract(/(?:👱🏼‍♀\s*)?קצת עלי:\s*(.*)/i),
    looking_for: extract(/(?:🎯\s*)?אני מחפש\/ת:\s*(.*)/i),
    image_url: extract(/תמונה:\s*(.*)/i),
    age_range: extract(/(?:🎚\s*)?טווח גילאים:\s*(\d+-\d+)/i),
    affiliation_group: extract(/שיוך:\s*(.*)/i)
  };

  if (!data.full_name || !data.age || !data.city) {
    throw new Error(`
💚 כרטיס שידוכים ״החצי השני״

😊 שם: הדסה ונונו
👳🏻 עדה: מרוקאי/ת
🎂 גיל: 31
🌱 גובה: 1.56
✨ מצב משפחתי: רווק/ה
🏡 מגורים: אשקלון
🙏 מגזר+רמה דתית: דתי לאומי
👪 תאר/י בקווים כלליים את משפחתך: משפחה דתית וחמה, זוג הורים מקסימים , שני אחים גדולים ונשואים ו5 אחיינים מתוקים
🇮🇱 שירות צבאי/לאומי/ישיבה: לאומי
🎓 עיסוק: גננת בגן תקשורת
👱🏼♀ קצת עלי: > באופן כללי אני מאוד אוהבת ללמוד ,להתפתח ולהתמקצע במה שמעניין אותי , שואפת קדימה , אני מתאמנת 4 פעמים בסטודיו לנשים בלבד, אוהבת מאוד ים וברכה, נהנת ממוזיקה טובה, נהנת מחברה טובה, אוהבת לטייל ולצאת לבית קפה או מסעדה טובה עם חברות, נהנת מלצפות בסרט בקולנוע
🎯 אני מחפש/ת: אני מחפשת אדם דתי וטוב , רציני ויציב, ממשפחה טובה, שיהיה החבר הכי טוב שלי , אוזן קשבת, תומך ומכיל, אמין ורגיש , כנות ויושר, בעל תכונות אופי דומות לשלי, שיהיה , שיהיה אינטראקציה טובה, אדם בעל שאיפות ומטרות בחיים, בעל עבודה מכובדת, לא מעשן, איש שיחה ובעל אינטליגנציה, חיבור וכימייה טובה
🙌 שומר/ת נגיעה? לא
🚬 מעשן/ת? לא
🎚 טווח גילאים: 29 - 36
`);
  }

  return data;
};
