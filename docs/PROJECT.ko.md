# FlyNS 기획서
## 목표: Best Use of ENSv2

### 한 문장

**초파리에게 이름표를 붙이는 것이 아니라, 이름을 통해 개체의 정체성·상태·쓰기 권한을 다시 찾을 수 있게 한다.**

영문 피치: “FlyNS makes experimental agents portable: resolve a name, verify its model and state, and resume it under explicit, revocable permissions.”

### 자료를 읽고 선택한 문제

awesome-fly에는 게임 제어, 데스크톱 개체, 테라리움, 신경회로 시각화와 신체 시뮬레이션 등 다양한 방향이 있다. 리스트 자체가 강조하듯 측정된 연결도, 동역학 모델, 감각·운동 입출력과 생물학적 타당성은 서로 다른 문제다. 여기에서 또 하나의 거대한 뇌 모델을 재현하기보다, 서로 다른 실행 환경 사이에서 한 실험 개체를 어떻게 식별하고 상태를 검증하며 운영 권한을 넘길지를 제품 문제로 선택했다.

이 판단은 모든 기존 프로젝트에 이 기능이 없다고 주장하는 시장조사가 아니다. FlyNS의 차별화 목표는 **ENSv2를 이용한 권한이 분리된 상태 이동성**이다. 초파리는 검증 가능한 작은 상태를 가진, 심사 현장에서 이해하기 쉬운 실험 대상이다.

### ENSv2를 빼면 무엇이 사라지나

로컬 실험실의 저장 기능은 일반 데이터베이스로도 만들 수 있다. 그러나 독립적인 클라이언트가 같은 이름을 기준으로 소유자가 선택한 모델과 최신 상태를 찾고, 공개 컨트랙트 권한으로 누가 이를 갱신할 수 있는지 확인하는 기능은 이 프로젝트가 ENS를 사용하는 이유다. 앱 서버 계정 하나로 정체성·저장·관리 권한을 묶지 않는다.

이름 예시(실제 등록을 의미하지 않음):

```
your-parent.eth
└── colony UserRegistry
    ├── ada.your-parent.eth  → Ada Resolver + Ada UserRegistry
    │   └── live.ada.your-parent.eth → 같은 레코드 번들에 대한 wildcard alias
    ├── kibo.your-parent.eth → Kibo Resolver + Kibo UserRegistry
    └── mori.your-parent.eth → Mori Resolver + Mori UserRegistry
```

각 개체는 UUID, 모델 해시, 현재 상태, 난수 생성기 상태와 개별 Resolver를 가진다. 같은 소유자가 여러 개체를 만들 수 있다. 에이전트마다 별도의 자금 보유 지갑을 자동 생성하는 기능은 없다. 주소 레코드에는 custodian이 들어가고, runtime 지갑은 쓰기 권한을 따로 받는다.

### 4개 핵심 행동

**Hatch:** 이름을 등록하고 해당 개체의 Resolver와 하위 네임스페이스를 만든다. 데이터 출처·모델 해시·정체성을 기록한다.

**Observe:** 회로에서 계산된 활동값이 이동 제어에 영향을 주는 모습을 관찰한다. 순수 장식용 신경망 그래픽과 실제 계산을 혼동하지 않는다. 화면의 날개 애니메이션은 장식이고 이동은 정의된 모델이다.

**Save & Resume:** 상태를 저장하고 해시를 ENS의 단일 checkpoint 레코드에 연결한다. 새로운 엔진이 이름을 조회하고 바이트 무결성·모델·개체 ID·sequence를 확인한 뒤 같은 상태에서 이어간다. 기본 화면의 Arena A/B는 한 앱 내 독립 엔진 인스턴스이며, 서로 다른 서버 간 이동을 이미 배포했다는 뜻은 아니다.

**Delegate & Revoke:** runtime에는 checkpoint 키만 허용하고 모델·정체성·별칭 편집 권한을 주지 않는다. 소유자가 회수하면 그 이후 canonical checkpoint 쓰기가 실패한다. 이미 받은 데이터를 삭제하거나 실행 중인 프로세스를 강제 종료하는 기능은 아니다.

### ENSv2 특유의 설계 판단

Resolver EAC 권한은 이름별이 아니라 해당 인스턴스의 레코드 인자별이다. 같은 Resolver에 Ada와 Kibo를 넣고 checkpoint 키를 위임하면 양쪽 모두 편집할 수 있다. 따라서 **한 개체당 하나의 Resolver**가 핵심이다. 단순한 “이름별 역할 부여” 설명보다 이 문제를 실제로 막는 구조와 실패 테스트를 보여주는 편이 설득력이 있다.

부모 네임스페이스의 개입 가능성과 만료는 명시한다. MVP는 별도 Resolver 관리권과 토큰 소유권의 이전을 안전하게 묶는 범위를 구현하지 않았으므로 이름 양도를 의도적으로 막는다. 영구성·완전한 탈중앙화·살아 있는 복사본의 유일성을 주장하지 않는다.

### 시연의 절정

심사위원에게 Ada 이름을 입력해 복원시킨다. 그다음 runtime 지갑으로 체크포인트를 갱신한다. 소유자가 권한을 회수하고 같은 runtime이 재시도하면 실패한다. 발표 문장은 다음 정도면 충분하다.

> “The fly can keep running. But this runtime no longer has the right to define its canonical state.”

이 장면에서 부여한 권한과 회수한 권한이 ENSv2에서 실제로 집행되어야 한다. 현재 로컬 시연은 이를 위한 rehearsal이며, 실제 Sepolia 영수증을 확보해야 제출 자격을 뒷받침할 수 있다.

### 범위에서 제외한 것

전체 뇌 실시간 재현, 생물학적 기억 이전, 학습 성과, 의식, 번식·교배, 토큰 보상, 투자·트레이딩, 추가 체인, 다른 스폰서 통합은 이번 핵심 범위에 넣지 않는다. IPFS/S3 저장 어댑터와 다른 게임 엔진 연결은 핵심 데모가 실제 Sepolia에서 동작한 후의 확장이다.

### 제작 상태와 다음 우선순위

현재: 원본 웹 UI, 독립 런타임, 해시 검증 체크포인트, 로컬 권한 테스트, 공식 ENSv2용 연결 코드, 테스트·시연·제출 문서.

다음: ① 공식 beta 배포와 ABI를 체인에서 확인 ② 두 지갑으로 live 경로 검증 ③ 공개 HTTPS+영속 저장소 배포 ④ 필요시 80-neuron 데이터와 Three.js 보강 ⑤ GitHub 공개·동영상·실제 거래 증거 첨부.

우승은 심사와 다른 출품작에 달려 있어 보장할 수 없다. 이 기획은 스폰서가 강조한 에이전트 네임스페이스·계층 registry·분리된 Resolver·세밀한 권한·aliasing을 하나의 사용자 행동으로 연결하는 전략이다.

출처: `SOURCES.md`의 공식 해커톤 안내, ENSv2 문서, awesome-fly 및 데이터 원본. 금액·요건·beta 배포는 제출 직전에 다시 확인한다.
