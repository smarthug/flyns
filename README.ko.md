# FlyNS — 이름으로 이어지는 초파리 에이전트

**여러 초파리 에이전트가 각각 ENSv2 이름·네임스페이스·Resolver를 가지고, 실행 환경을 바꾸어도 검증된 상태를 복원하는 새 프로젝트입니다.**

현재 제공물은 로컬에서 동작하는 프로토타입과 ENSv2 Sepolia 연결 코드입니다. Sepolia 실배포·실제 지갑을 이용한 전체 경로 검증·공개 웹 배포·GitHub 업로드는 아직 하지 않았습니다. 로컬 시연만으로 해커톤의 실제 ENSv2 사용 요건이 충족되지는 않습니다.

## 바로 실행

Node.js 22.16 이상에서 압축을 푼 프로젝트 폴더로 이동합니다.

```sh
npm run dev
```

브라우저에서 `http://localhost:4173`을 엽니다. 기본 실행에는 `npm install`이 필요 없습니다.

초기 개체 3마리를 관찰합니다. 개체 선택 → Publish checkpoint → Save & resume in other arena를 누르면 파일로 저장한 상태를 이름으로 찾아 실제 새 엔진 인스턴스에 복원합니다. 현재 신경 상태뿐 아니라 난수 생성기와 환경도 저장합니다.

Capability Lab에서 소유자로 checkpoint 권한을 부여합니다. Acting as를 runtime으로 바꾸어 저장은 허용되고 모델 변경은 거부되는지 확인합니다. 다시 소유자로 돌아와 Revoke writer를 누르고 runtime으로 저장하면 거부됩니다. **이 actor 선택은 로컬 권한 모델입니다. Sepolia에서는 반드시 서로 다른 실제 지갑을 사용합니다.**

```sh
npm test
npm run check
npm run build
```

## 선택 기능

```sh
npm run setup:3d   # 인터넷 연결 필요. Three.js를 설치한 뒤 3D 체크박스 사용
npm run data:fetch # 출처가 고정된 80-neuron 회로 데이터 가져오기
```

기본 제공 데이터는 실제 MaleCNS 유래 데이터에서 가져온 **12개 뉴런·26개 연결의 제한된 fixture**입니다. 전체 뇌, 학습된 정책, 생물학적으로 검증된 초파리는 아닙니다. 외부 데이터 다운로드와 Three.js 경로는 이 제공 환경에서 검증하지 못했습니다. 회로를 바꾸면 모델 해시가 달라져 기존 체크포인트와 호환되지 않습니다.

## 제출까지 이어갈 작업

`AGENTS.md`를 Codex에 읽히고 `docs/DEMO.md`의 Sepolia 경로를 먼저 완성하십시오. ENSv2 parent 이름 확보 → 공식 배포주소·ABI 확인 → 부화·저장·조회·권한 부여·회수의 실제 트랜잭션 확보 → HTTPS 공개 배포 → 공개 GitHub 저장소 및 시연 링크 등록 순서입니다. `docs/SUBMISSION.md`에는 아직 비어 있는 제출 증거 항목을 정리했습니다.

기획 의도는 `docs/PROJECT.ko.md`, 기술 구조는 `docs/ENS-INTEGRATION.md`, 검증 범위는 `docs/VALIDATION.md`, 원본 출처와 라이선스는 `docs/SOURCES.md`를 참고하십시오.
