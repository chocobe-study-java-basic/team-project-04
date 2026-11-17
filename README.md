# OUTPICK 로컬 개발 환경

## 장소 화면과 API 통합 확인

통합 브랜치의 장소 목록·상세·지도는 실제 Backend API를 호출한다. Backend를 `local,demo` 프로필로 실행하면 로컬 DB에 `[데모]` 가상 장소 6개를 생성해 연결을 확인할 수 있다. 공공 API 수집 데이터는 아니다. 실행 방법과 브랜치 구성은 [장소 API 연결 문서](backend/docs/place-integration.md)를 참고한다.

## CI 자동 검사

GitHub Actions 설정은 `.github/workflows/frontend-ci.yml`, `.github/workflows/backend-ci.yml`에서 관리합니다.

- `develop`·`main` 대상 PR 생성/갱신 및 두 브랜치에 푸시할 때 프론트·백엔드를 각각 검사합니다. 개인 작업 브랜치에 푸시만 한 경우에는 실행하지 않으며, 대상 브랜치로 PR을 생성해야 합니다.
- 프론트: `.nvmrc`의 Node.js 준비 → `npm ci` → 린트 → 타입 검사 → 테스트 → 정적 빌드.
- 백엔드: Java 25 준비 → Docker 확인 → `./gradlew --no-daemon build`로 테스트·빌드. Testcontainers가 테스트용 MySQL을 생성하므로 별도 MySQL 서비스나 로컬 `.env`가 필요하지 않습니다.
- 프론트 CI는 검사용 API 주소를 사용하며 실제 서버에 접속하지 않습니다. 개인 `.env.local`·카카오 키·AWS 키를 등록하지 않습니다. 실제 지도·브라우저 연동 검증은 별도로 수행합니다.
- 백엔드 테스트 결과는 실행 화면의 Artifacts에서 `backend-test-reports`로 내려받을 수 있으며 7일간 보관합니다.
- 결과는 PR의 Checks 또는 저장소 Actions 탭에서 확인합니다. 실패한 단계의 로그를 보고 수정한 뒤 같은 브랜치에 다시 푸시합니다.
- 이 설정은 자동 검사(CI)이며 운영 배포(CD)는 포함하지 않습니다. 실패 시 머지를 막으려면 팀 관리자가 브랜치 보호 규칙에 두 검사를 필수로 지정해야 합니다.

외부 Action은 검증한 버전의 커밋 SHA로 고정했으며, 주석에 major 버전을 표시했습니다.

## MySQL 실행

Java 25, Docker Compose, Make가 필요합니다. Docker를 먼저 실행합니다.

1. 프로젝트 루트에서 환경 변수 파일을 복사합니다.

   ```bash
   cp .env.example .env
   ```

2. `.env`의 `MYSQL_PASSWORD`와 `MYSQL_ROOT_PASSWORD`에 서로 다른 로컬 비밀번호를 입력합니다. `.env`는 Git에서 제외됩니다. 셸에서도 읽을 수 있도록 값은 작은따옴표로 감싸고, 값 자체에는 작은따옴표를 넣지 않습니다.
3. MySQL을 시작합니다.

   ```bash
   make compose-up
   ```

MySQL은 `127.0.0.1:3306`에 노출됩니다. 포트가 사용 중이면 `.env`의 `MYSQL_PORT`를 변경합니다. 데이터는 Compose 프로젝트의 `mysql-data` named volume에 저장됩니다.

## Spring Boot 실행

profile을 지정하지 않으면 `local`이 적용됩니다. 기본 Java가 다르면 `JAVA_HOME`을 Java 25 경로로 지정합니다.

### IntelliJ에서 실행

1. 위의 MySQL 실행 절차에 따라 `.env`를 작성하고, 프로젝트 루트에서 `make compose-up`을 실행합니다.
2. `File → Project Structure`에서 Project SDK와 language level을 Java 25로 맞춥니다. Modules의 language level도 25 또는 프로젝트 설정을 상속하도록 지정합니다.
3. `backend/src/main/java/com/outpick/BackendApplication.java`를 열고 `main` 메서드 옆 실행 버튼으로 실행 구성을 만듭니다. 환경 변수 등록 전에는 DB 연결 오류가 발생할 수 있습니다.
4. `Run → Edit Configurations`에서 `BackendApplication`을 선택합니다.
5. `Environment variables` 항목을 엽니다. 항목이 보이지 않으면 `Modify options`에서 추가합니다.
6. 다음 변수에 실제 `.env`의 값을 등록합니다. `.env`에서 값을 감싼 따옴표는 입력하지 않습니다.

   - `MYSQL_DATABASE`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_PORT`

7. 실행 JRE가 Java 25인지 확인합니다. Active profiles는 비워 두면 기본 `local`이 적용됩니다.
8. `Apply → OK`로 저장하고 `BackendApplication`을 실행합니다.

`MYSQL_ROOT_PASSWORD`는 MySQL 컨테이너 초기화용이므로 IntelliJ에 등록하지 않습니다. 비밀번호를 입력한 실행 구성은 `Store as project file`로 공유하지 않습니다. `.env`의 연결 정보를 바꾸면 IntelliJ의 값도 함께 변경합니다.

### 터미널에서 실행

Compose는 루트 `.env`를 자동으로 읽지만 Spring Boot는 읽지 않습니다. 프로젝트 루트의 전용 터미널에서 환경 변수를 내보낸 뒤 실행합니다.

```bash
set -a
. ./.env
set +a
cd backend
./gradlew bootRun
```

### 실행 확인

다른 환경에서는 `SPRING_PROFILES_ACTIVE`로 profile을 명시합니다. 예를 들어 `prod`를 지정하면 기본 `local` 설정은 적용되지 않습니다. 운영용 설정은 아직 추가하지 않았습니다.

애플리케이션이 시작되면 Flyway가 `flyway_schema_history`와 `V1__create_place_tables.sql`의 장소 관련 8개 테이블을 생성합니다. Hibernate는 테이블을 자동 생성하지 않습니다. 적용한 마이그레이션을 수정하지 않고 후속 변경은 `V2__설명.sql` 등 새 파일로 추가합니다. 구현 범위와 미정 정책은 [장소 모델 문서](backend/docs/place-model.md)를 참고하세요.

```bash
curl --fail http://localhost:8080/actuator/health
```

정상 실행 시 상태는 `UP`입니다.

## 테스트 실행

Docker가 실행된 상태에서 다음 명령을 실행합니다.

```bash
cd backend
./gradlew test
```

테스트는 Testcontainers가 별도 MySQL 컨테이너를 생성하고 접속 정보를 주입합니다. 기본 `local` profile이 적용되어도 컨테이너 접속 정보가 DataSource 설정보다 우선하므로 `.env`와 `make compose-up`은 필요하지 않습니다. 개발 DB와 볼륨을 공유하지 않으며 테스트 종료 후 컨테이너는 제거됩니다. 첫 실행에는 이미지 다운로드가 필요합니다.

## MySQL 종료 및 초기화

```bash
make compose-down
```

종료 후에도 데이터는 유지됩니다. 기존 볼륨이 있으면 `.env`의 DB 이름·사용자·비밀번호를 변경해도 MySQL 초기 설정에 반영되지 않습니다.

초기화 명령은 로컬 DB 데이터를 모두 삭제하며, 확인 문구에 `RESET`을 입력해야 실행됩니다.

```bash
make compose-reset
```

이 Compose 구성은 로컬 개발용입니다. 운영 DB와 비밀 정보 관리는 배포 구조를 정할 때 별도로 구성합니다.

Backend와 MySQL을 함께 컨테이너로 실행할 때는 별도의 `compose.deploy.yaml`을 사용합니다. IntelliJ 개발은 기존 `compose.yaml`을 그대로 사용합니다. 이미지 빌드·배포용 Compose 실행·종료는 [Backend Docker 실행 안내](backend/README.md#docker로-backend-실행)를 참고하세요.

## Docker 이미지 빌드

Docker Desktop을 실행하고 프로젝트 루트에서 사용합니다.

Frontend 이미지 빌드에는 Node.js 26도 필요합니다. `frontend/.env`의 `NEXT_PUBLIC_KAKAO_MAP_JS_KEY`에 카카오 JavaScript 키를 설정합니다. 두 Frontend 명령 모두 이 파일의 지도 키만 읽어 Docker 빌드 인자로 전달하며, 파일이 없거나 키가 비어 있으면 빌드를 중단합니다. 환경 파일 자체는 Git과 이미지에 포함하지 않습니다. 배포용 API 주소는 `/`로 고정하고 `.env.local`은 읽지 않습니다. 키는 빌드된 JavaScript에 공개되므로 REST API·Admin 키를 넣지 않습니다.

```bash
make backend-docker-build
make frontend-docker-build
```

각 명령은 현재 소스를 Docker 내부에서 AMD64·ARM64로 빌드합니다. 결과는 `chocobe/outpick-backend:v0`, `chocobe/outpick-frontend:v0` 이름으로 로컬 Docker에 저장합니다. 로컬의 JAR나 Frontend 정적 파일을 미리 빌드할 필요는 없습니다. 테스트는 별도로 실행합니다.

태그를 바꾸려면 `IMAGE_TAG`를 지정합니다.

```bash
make backend-docker-build IMAGE_TAG=v1
make frontend-docker-build IMAGE_TAG=v1
```

`--load`로 여러 플랫폼을 로컬에 저장하므로 Docker Desktop의 containerd 이미지 저장소가 필요합니다. Windows는 Linux 컨테이너 모드를 사용합니다. 지원하지 않는 저장소에서는 빌드가 실패하므로 Docker Desktop 설정의 `Use containerd for pulling and storing images`를 확인합니다.

로컬에 보관한 두 플랫폼을 나중에 함께 업로드하려면 Docker Hub 로그인 후 실행합니다. Push에 `--platform`을 지정하지 않습니다.

```bash
docker push chocobe/outpick-backend:v0
docker push chocobe/outpick-frontend:v0
```

빌드와 업로드를 한 번에 하려면 다음 명령을 사용합니다.

```bash
make backend-docker-build-push
make frontend-docker-build-push
```

각 명령은 현재 소스로 AMD64·ARM64 이미지를 함께 빌드하고 같은 태그로 Docker Hub에 올립니다. 별도의 `*-docker-build` 실행이나 `docker push`는 필요하지 않습니다. `IMAGE_TAG=v1`처럼 태그를 변경할 수 있으며 같은 태그가 이미 있으면 교체됩니다. `*-docker-build-push`는 `--push`로 업로드하며, 로컬 이미지 갱신은 `*-docker-build` 또는 Pull로 진행합니다. 두 명령 모두 멀티 플랫폼으로 빌드합니다.

업로드한 이미지를 Mac이나 EC2에서 사용하려면 다음 명령으로 내려받고 컨테이너에 적용합니다.

```bash
docker compose -f compose.deploy.yaml pull backend nginx
docker compose -f compose.deploy.yaml up -d --wait
```

`nginx`는 Frontend 이미지를 사용하는 서비스 이름입니다. Pull 시 각 컴퓨터에 맞는 플랫폼이 선택됩니다. 다른 태그로 만든 이미지를 Compose에서 사용하려면 `compose.deploy.yaml`의 해당 `image` 태그도 맞춥니다. EC2 파일 업로드와 응답 확인은 [Frontend 배포 안내](frontend/docs/deployment.md)를 참고합니다.

## Frontend 개발 환경

Next.js·TypeScript 기반 Frontend의 Node 버전, 실행·검사·테스트·정적 빌드 방법은 [Frontend README](frontend/README.md)를 참고합니다. 공통 기반과 로컬 브라우저 검증을 마쳤으며, Zustand는 공유할 UI 상태가 확정될 때까지 보류합니다.

Frontend Docker 이미지 빌드와 기존 EC2에서의 화면·API 확인은 [Frontend 배포 안내](frontend/docs/deployment.md)를 참고합니다.
