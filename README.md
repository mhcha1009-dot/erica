# AI 학생 계획표 📝

Vercel 배포용 AI 학생 계획표 웹 애플리케이션 프로젝트입니다.

## 📂 프로젝트 구조
```
├── index.html         # 프론트엔드 UI 및 클라이언트 로직
├── package.json       # 프로젝트 설정 파일
└── api/
    └── generate.js    # Gemini API 호출 서버리스 함수
```

## 🚀 Vercel 배포 방법
1. 본 압축 파일의 해제 결과를 GitHub 레포지토리에 푸시합니다.
2. [Vercel](https://vercel.com)에서 해당 레포지토리를 Import합니다.
3. Environment Variables 탭에서 `GEMINI_API_KEY` 환경 변수를 등록합니다.
4. `Deploy` 버튼을 클릭하여 배포를 완료합니다.
