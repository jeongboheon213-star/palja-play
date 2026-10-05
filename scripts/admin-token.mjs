// 운영자 비밀번호(ADMIN_DASHBOARD_TOKEN) 만들기: 무작위 32자. 화면에만 출력하고 어디에도 저장하지 않는다.
//   npm run admin:token
// 출력된 값을 Vercel → Settings → Environment Variables 의 ADMIN_DASHBOARD_TOKEN 에 붙여넣고,
// 비밀번호 관리 앱 등 안전한 곳에 따로 보관하세요. 채팅·GitHub 에는 올리지 마세요.
import { randomBytes } from "node:crypto";
console.log(randomBytes(24).toString("base64url"));
