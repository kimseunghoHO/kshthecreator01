# ARSENAL - Interactive Media Art

가가 정교한 3D 고딕 타이포그래피와 인터랙티브 물리 효과가 결합된 미디어 아트 전시물입니다.

## 🚀 시작하기

### 1. 로컬에서 실행하기 (Local Development)

가장 간단한 방법은 터미널에서 다음 명령어를 실행하는 것입니다:

```bash
# 터미널에서 프로젝트 폴더로 이동 후
python3 -m http.server 8080
```
그 후 브라우저에서 `localhost:8080`을 열어주세요.

---

### 2. 언제 어디서든 접속하기 (Cloud Deployment)

이 작업물은 **Vercel** 또는 **GitHub Pages**와 같은 정적 호스팅 서비스를 통해 누구나 볼 수 있는 웹 주소로 만들 수 있습니다.

#### Option A: Vercel로 배포 (가장 추천 - 1분 소요)
1. [Vercel](https://vercel.com)에 가입합니다.
2. 자신의 GitHub 저장소에 이 프로젝트 폴더 안의 파일들을 올립니다. (**주의**: `package.json`은 삭제된 상태여야 합니다. 현재 폴더 구성 그대로 올리시면 됩니다.)
3. Vercel 사이트에서 **"Add New Project"**를 누르고 해당 저장소를 선택합니다.
4. **Build Setting**에서 아무것도 건드리지 않고 그대로 **Deploy**를 누르면 끝납니다.

#### Option B: GitHub Pages로 배포
1. GitHub 저장소의 **Settings > Pages** 탭으로 이동합니다.
2. **Deploy from a branch** 설정을 유지하고 `main` 브랜치를 선택하여 저장합니다.
3. 약 1분 후 `https://{username}.github.io/{repo-name}/` 주소로 접속 가능합니다.

---

> [!IMPORTANT]
> **왜 화면이 안 나왔었나요?**
> 배포 서비스들이 `package.json` 파일을 발견하면 자동으로 '빌드 단계(Vite 등)'를 거치려 시도하는데, 이 과정에서 경로가 꼬이거나 설정이 충돌할 수 있습니다. 이를 해결하기 위해 **완전 정적(Static) 방식**으로 구조를 변경했습니다. 이제 `index.html`을 바로 읽어들이므로 훨씬 안정적입니다.

---

## 🎨 주요 기능

- **인터랙티브 회전**: 마우스 드래그를 통해 3D 고딕 폰트를 자유롭게 회전시킬 수 있으며, 손을 떼면 물리 관성(Inertia)에 의해 매끄럽게 돌아갑니다.
- **반응형 펄스 (Boing & Flash)**: 클릭 시 글자가 탄성 있게 튀어 오르며 순간적으로 조명이 강렬하게 빛납니다.
- **선택적 가시성**: 조명이 지나가는 부분만 어둠 속에서 형상이 드러나는 시네마틱한 연출이 적용되어 있습니다.
- **고딕 비주얼**: 묵직하고 단단한 매스감이 느껴지는 고딕 서체와 네온 컬러의 조화.

---

## 🛠 기술 스택
- **Three.js**: 3D 렌더링 엔진
- **GLSL**: 커스텀 조명 및 가시성 쉐이더
- **Post-processing**: UnrealBloomPass를 통한 시네마틱 블러 효과
