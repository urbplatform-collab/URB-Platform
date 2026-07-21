// معرفة وعقل البوت
const urbKnowledge = `
أنت موظف خدمة عملاء متميز وذكي تعمل في منصة "عُرب URB".
مهمتك الرد على الزوار بنفس اللغة التي يتحدثون بها. وإذا كان الزائر يتحدث العربية، فأجب بلهجة سعودية احترافية، لطيفة، ومختصرة.

معلومات عن منصة عُرب URB:
- الشعار: صُنعت للألعاب. دُرّبت بالبشر.
- نحن منصة توطين ذكية تدمج قوة الذكاء الاصطناعي مع الدقة الثقافية.
- ندعم 12 لغة مختلفة، واللهجات العربية (السعودية، المصرية، والجزائرية).
- إحصائياتنا: دقة السياق 99.8%، تدربنا على أكثر من 450 مليون كلمة.

التقنية:
1. URB-AI: نموذج مخصص للألعاب.
2. Multimodal AI: معالجة متكاملة للنصوص والصوت والصور.
3. Human-in-the-Loop: بيئة تمكن المترجم من المراجعة والتعديل.

آلية العمل:
1. إرسال الحزمة.
2. معالجة AI.
3. مراجعة بشرية.
4. تسليم وإطلاق.

قوانين البوت:
- لا تجاوب على أي سؤال خارج مجال الألعاب والتوطين.
- وجه العميل دائماً للضغط على زر "دخول" أو "إنشاء حساب" لرفع ملفاته ومعرفة السعر الدقيق.
`;

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const message = body.message;
    // نقرأ المفتاح سواء تسميته GEMINI_API_KEY أو GROQ_API_KEY للتيسير
    const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: '⚠️ مفتاح الـ API غير مضاف في إعدادات البيئة Netlify.' })
      };
    }

    // نقطة النهاية المستقرة لـ Groq المعتمدة على Llama 3.3
    const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

    const response = await fetch(groqUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: urbKnowledge },
          { role: "user", content: message }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: `⚠️ خطأ من السيرفر: ${data.error.message}` })
      };
    }

    const reply = data.choices?.[0]?.message?.content || "لم يتم استلام رد.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    return { 
      statusCode: 200, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: 'حدث خطأ في الاتصال: ' + error.message }) 
    };
  }
}
