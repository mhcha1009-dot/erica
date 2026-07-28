export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }

  try {
    const { grades, time } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'Vercel 환경변수(GEMINI_API_KEY)가 설정되지 않았습니다.' });
    if (!grades || !time) return res.status(400).json({ error: '성적과 시간 정보가 모두 전달되지 않았습니다.' });

    const systemInstruction = `
      당신은 학생들의 학습을 돕는 최고 수준의 AI 입시 멘토입니다.
      사용자가 과목별 성적/등급과 공부 가능 시간을 입력했습니다.
      
      [필수 행동 지침]
      1. 입력된 성적을 분석하여 점수가 상대적으로 가장 낮거나 취약한 과목을 파악하세요.
      2. 취약 과목의 개념 보충 및 문제 풀이에 전체 시간의 50% 이상을 배분하세요.
      3. 점수가 높은 우수 과목은 감을 잃지 않을 정도로만(복습 위주) 시간을 짧게 배분하세요.
      4. 적절한 휴식 시간(50분 공부, 10분 휴식 등)을 반드시 포함하세요.
      5. explanation(멘토링 조언)에는 성적 분석 결과, 왜 이런 계획을 짰는지, 취약 과목을 효과적으로 공부하는 팁을 친절하게 작성해 주세요.
      
      반드시 아래의 순수 JSON 형식으로만 응답해야 합니다. 다른 텍스트는 절대 포함하지 마세요.
      {
        "timetable": [
          { "time": "16:00", "task": "[취약 과목] 수학 - 오답노트 및 개념 복습" },
          { "time": "16:50", "task": "휴식 및 간식" },
          { "time": "17:00", "task": "[우수 과목] 국어 - 비문학 1지문 풀이 (감 유지)" }
        ],
        "explanation": "성적표를 살펴보니 수학 점수가 상대적으로 낮고 국어 점수가 아주 훌륭하네요! 따라서 오늘은 수학의 부족한 개념을 잡는 데 집중하는 일정을 짰습니다..."
      }
      주의: time은 반드시 24시간 형식의 "HH:MM" (예: 16:00)으로 작성해야 알람이 정상 작동합니다.
    `;

    const userPrompt = `사용자 성적 정보: ${grades}\n공부 가능 시간: ${time}`;
    const targetModel = "models/gemini-3.5-flash"; // 최신 활성화 모델

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${targetModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemInstruction + "\n\n" + userPrompt }] }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok || !data.candidates || data.candidates.length === 0) {
      console.error("Gemini API Error:", data);
      return res.status(500).json({ error: data.error?.message || 'Gemini API 호출 중 오류가 발생했습니다.' });
    }

    let aiText = data.candidates[0].content.parts[0].text;
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(aiText);
    return res.status(200).json(parsedData);

  } catch (error) {
    console.error('Server Catch Error:', error);
    return res.status(500).json({ error: '서버 내부 오류: ' + error.message });
  }
}
