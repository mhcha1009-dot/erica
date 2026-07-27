export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'POST 요청만 지원합니다.' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  const systemInstruction = `
    당신은 학생들의 학습 및 일상 계획을 세워주는 친절한 AI 멘토입니다.
    사용자의 요청에 따라 계획을 짜주세요.
    반드시 아래의 순수 JSON 형식으로만 응답해야 합니다. 다른 텍스트는 절대 포함하지 마세요.
    {
      "timetable": [
        { "time": "09:00", "task": "수학 공부" },
        { "time": "10:30", "task": "휴식 및 간식" }
      ],
      "explanation": "오늘 하루 수학을 집중적으로 공부하면서 충분한 휴식을 취하는 편안한 일정이에요. 화이팅!"
    }
    주의: time은 반드시 24시간 형식의 "HH:MM" (예: 09:00, 14:30)으로 작성해야 알람이 정상 작동합니다.
  `;

  try {
    // 💡 1단계: 현재 API 키로 사용 가능한 전체 모델 목록을 구글에서 먼저 가져옵니다.
    const modelListRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const modelListData = await modelListRes.json();

    if (!modelListData.models) {
      console.error("Model List Error:", modelListData);
      return res.status(500).json({ error: '구글 서버에서 사용 가능한 모델 목록을 가져오지 못했습니다. API 키를 다시 확인해 주세요.' });
    }

    // 텍스트 생성(generateContent) 기능을 지원하는 모델들만 추려냅니다.
    const validModels = modelListData.models
      .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name); // 예: 'models/gemini-2.0-flash' 등 현재 작동하는 이름

    if (validModels.length === 0) {
      return res.status(500).json({ error: '이 API 키로 텍스트 생성을 지원하는 모델이 없습니다.' });
    }

    // 빠르고 가벼운 'flash' 모델을 최우선으로 찾고, 없으면 사용 가능한 첫 번째 모델을 알아서 선택합니다.
    const targetModel = validModels.find(m => m.includes('flash')) || validModels[0];
    console.log("✅ 자동 탐색 및 선택된 모델:", targetModel);

    // 💡 2단계: 찾아낸 정확한 모델 이름으로 계획표 생성을 요청합니다.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${targetModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemInstruction + "\n\n사용자 요청: " + prompt }] }
        ]
      })
    });

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error("Gemini API Error Detail:", data);
      return res.status(500).json({ 
        error: data.error?.message || 'AI가 올바른 응답을 생성하지 못했습니다.' 
      });
    }

    let aiText = data.candidates[0].content.parts[0].text;
    
    // 마크다운 잔여물(```json 등) 제거
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(aiText);
    res.status(200).json(parsedData);

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: '서버에서 계획을 생성하는 중 오류가 발생했습니다.' });
  }
}
