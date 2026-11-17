# OUTPICK 백엔드

백엔드를 로컬에서 실행하면 기본 주소는 `http://localhost:8080`입니다. 

MySQL과 Spring Boot 실행 절차는 [프로젝트 README](../README.md)를 참고하세요.

## Docker로 Backend 실행

`compose.yaml`은 개발용 MySQL만 실행합니다. Backend는 IntelliJ에서 실행하며 기존 개발 방법을 유지합니다. `compose.deploy.yaml`은 MySQL·Backend·Nginx를 함께 컨테이너로 실행합니다. 다음 로컬 실행 명령은 프로젝트 루트에서 실행합니다. EC2 적용은 아래의 Nginx 안내에서 별도로 설명합니다.

### 이미지 만들기

Docker Desktop을 실행한 뒤 이미지를 빌드합니다.

```bash
docker build -t chocobe/outpick-backend:v0 ./backend
```

`Dockerfile`의 첫 단계는 Java 25 JDK와 저장소의 Gradle Wrapper로 `bootJar`를 실행해 앱 JAR 파일을 만듭니다. 최종 이미지에는 Java 25 JRE와 JAR 파일을 담고, 관리자 권한이 없는 사용자로 앱을 실행합니다. 로컬에 Java를 설치하지 않아도 이미지 빌드가 가능합니다.

`bootJar`는 테스트를 실행하지 않습니다. 자동 테스트는 기존 Backend CI 또는 Docker가 실행 중인 PC의 `backend/`에서 `./gradlew test`로 별도 확인합니다. Testcontainers가 사용하는 Docker 엔진을 이미지 빌드 내부에 연결하지 않습니다.

`backend/`가 Docker에 전달할 파일의 기준 디렉터리입니다. `.dockerignore`는 로컬 빌드 결과와 `.env`, 키 파일 등을 제외합니다. DB 비밀번호는 이미지에 저장하지 않고 컨테이너 실행 시 전달합니다.

### Backend와 MySQL 함께 실행하기

루트 `.env`가 없다면 [MySQL 실행 안내](../README.md#mysql-실행)에 따라 먼저 작성합니다. Compose가 `.env`의 값을 자동으로 읽으므로 터미널에서 `source`나 `set -a`를 실행할 필요가 없습니다. 셸에 같은 이름의 환경 변수가 등록돼 있으면 그 값이 `.env`보다 우선하므로, 앞서 값을 내보냈다면 새 터미널에서 진행합니다.

먼저 설정을 검사합니다. `--quiet`는 비밀번호가 포함된 설정을 화면에 출력하지 않습니다.

```bash
docker compose -f compose.deploy.yaml config --quiet
```

오류 없이 끝나면 실행합니다.

```bash
docker compose -f compose.deploy.yaml up -d --wait --wait-timeout 180
```

Compose는 다음 순서로 실행합니다.

1. `outpick-network` 네트워크와 MySQL 데이터 볼륨을 준비합니다.
2. MySQL이 앱용 계정으로 SQL 요청을 처리할 수 있는지 healthcheck로 확인합니다.
3. MySQL이 `healthy`가 되면 Backend를 실행합니다.
4. Backend 컨테이너가 시작되면 Nginx를 실행해 HTTP 80번 포트로 `/api/` 요청을 받습니다. Backend 앱의 시작 완료는 로그와 API로 확인합니다.

`--wait`는 MySQL의 정상 상태와 Backend 컨테이너 실행까지 기다립니다. Backend에는 별도 healthcheck가 없으므로 앱 시작 완료 여부는 다음 단계에서 로그와 API로 확인합니다. `restart: unless-stopped`는 오류 종료나 Docker 엔진 재시작 시 컨테이너를 다시 실행하되, 직접 중지한 컨테이너는 중지 상태로 유지하는 설정입니다.

주요 설정은 다음과 같습니다.

| 설정 | 역할 |
|---|---|
| `name: outpick-deploy` | 개발용과 컨테이너·데이터 볼륨을 분리하는 Compose 프로젝트 이름 |
| `networks.default.name: outpick-network` | 두 서비스를 자동으로 연결할 실제 네트워크 이름 |
| `MYSQL_HOST=mysql`, `MYSQL_PORT=3306` | Backend가 Docker 네트워크 안에서 접근할 MySQL 주소 |
| `127.0.0.1:18080:8080` | 내 PC의 18080 포트를 Backend 컨테이너의 8080 포트에 연결 |
| `80:80` | 호스트의 HTTP 80번 포트를 Nginx에 연결 |
| `./nginx/default.conf` | 컨테이너에 읽기 전용으로 연결할 Nginx 설정 파일. 파일이 없으면 실행 실패 |
| `outpick-deploy_mysql-data` 볼륨 | 개발용과 별도로 MySQL 데이터를 보관 |

MySQL은 호스트에 포트를 공개하지 않습니다. `.env`의 `MYSQL_PORT`는 개발용 MySQL에만 사용하며, 배포용 Backend는 MySQL 컨테이너 내부 포트 3306을 사용합니다. `MYSQL_ROOT_PASSWORD`는 MySQL 초기화에만 전달하고 Backend에는 전달하지 않습니다.

현재 앱에 DB 접속 설정이 있는 프로필은 `local`이므로 배포용 Compose에서도 이를 명시합니다. 이 파일의 이름만으로 Spring의 운영용 프로필이 적용되지는 않습니다. 운영용 프로필과 CORS 정책은 EC2 배포 단계에서 정합니다.

### 응답 확인과 종료

```bash
docker compose -f compose.deploy.yaml ps
docker compose -f compose.deploy.yaml logs --tail 100 backend
```

로그에 `Started BackendApplication`이 나오면 API를 확인합니다.

```bash
curl --fail http://localhost:18080/actuator/health
curl --fail http://localhost:18080/api/v1/examples/1
```

첫 요청의 `status`는 `UP`이어야 합니다. 두 번째 요청은 `{"name":"예시 액티비티","participantCount":3}`을 반환해야 합니다. 예시 API는 고정 데이터를 반환하므로 DB 연결은 health 응답과 시작 로그로 함께 확인합니다.

배포용 컨테이너를 종료하고 네트워크를 정리하려면 다음 명령을 사용합니다.

```bash
docker compose -f compose.deploy.yaml down
```

이미지와 MySQL 데이터 볼륨은 유지됩니다. `down --volumes`는 DB 데이터까지 삭제하므로 데이터 보존이 필요할 때 사용하지 않습니다. 이후에도 동일한 `up` 명령으로 기존 데이터를 사용해 실행할 수 있습니다. 기존 볼륨의 DB 계정·비밀번호는 `.env`를 바꾸는 것만으로 변경되지 않습니다.

개발용과 배포용은 서로 다른 DB입니다. 개발용 데이터는 배포용으로 자동 복사되지 않습니다. 개발용 종료에는 기존 `make compose-down`을 사용하고, 배포용 종료에는 위의 `-f compose.deploy.yaml down`을 사용합니다.

코드 변경 후에는 이미지를 다시 빌드하고 Backend 컨테이너를 교체합니다. MySQL은 그대로 유지합니다.

```bash
docker build -t chocobe/outpick-backend:v0 ./backend
docker compose -f compose.deploy.yaml up -d --no-deps --force-recreate backend
```

Backend의 18080 포트는 루프백 주소에만 공개합니다. 외부 API 요청은 Nginx의 HTTP 80번 포트로 받습니다. Nginx 경유 로컬 확인 주소는 `http://localhost/api/v1/examples/1`이며, 80번이 HTTP 기본 포트라 URL에서 생략할 수 있습니다.

Mac의 Apple Silicon은 ARM64이고 현재 EC2의 t3.small은 AMD64입니다. 기본 명령으로 만든 Mac용 이미지를 EC2에 그대로 옮겨 실행할 수는 없습니다. 사용자가 `chocobe/outpick-backend:v0`에 두 플랫폼 이미지를 Docker Hub로 업로드하고, EC2에서 pull·Compose 실행·정상 API 응답까지 확인했습니다.

참고: [Docker의 여러 단계 빌드](https://docs.docker.com/build/building/multi-stage/), [Compose 시작 순서](https://docs.docker.com/compose/how-tos/startup-order/).

2026-11-16 Apple Silicon Mac에서 Docker 이미지 빌드와 수동 컨테이너 실행으로 MySQL 연결, health의 `UP`, 예시 API 정상 응답을 확인했습니다. 기존 Backend 테스트 38개도 모두 통과했습니다. 이후 EC2 실행 결과는 위의 사용자 확인 기록을 따릅니다.

같은 날 `chocobe/outpick-backend:v0`로 배포용 Compose 설정 검사, MySQL 준비 후 Backend 시작, 공통 네트워크에서의 DB 연결, health의 `UP`, 예시 API 정상 응답을 확인했습니다. 개발용 서비스는 MySQL만 유지되며, 배포용 DB 볼륨이 별도로 생성되는 것도 확인했습니다. 이 Compose 작업에서는 앱 코드를 변경하지 않아 기존 Java 테스트를 다시 실행하지 않았습니다.

## Nginx로 외부 API 접속하기

이번 결과물은 내 Mac의 브라우저에서 `http://EC2_PUBLIC_IP/api/v1/examples/1`로 접속해 예시 JSON을 확인하는 것입니다. `EC2_PUBLIC_IP`는 실제 EC2의 EIP로 바꿉니다.

```text
브라우저 → EC2의 80번 포트 → Nginx → backend:8080 → Spring Boot
```

`nginx/default.conf`는 `/api/` 경로만 Backend에 전달합니다. `proxy_pass`에 경로를 덧붙이지 않아 `/api/v1/...`를 그대로 유지합니다. 그 외 경로는 404를 반환합니다. Frontend 화면·Swagger·Actuator의 외부 전달은 아직 구성하지 않습니다. EC2 내부의 기존 `localhost:18080/actuator/health`는 계속 사용할 수 있습니다.

`backend`는 같은 Docker 네트워크의 서비스 이름입니다. `upstream`은 요청을 전달할 서버 설정이고, `resolver 127.0.0.11`은 Docker 내부 DNS를 사용한다는 뜻입니다. `resolve`와 공유 영역인 `zone`을 함께 사용해 Backend 교체 후 바뀐 IP를 다시 조회합니다. Backend가 교체되는 동안이나 시작 중에는 일시적으로 502가 나올 수 있습니다.

### 내 Mac에서 준비하기

먼저 [HTTP 보안 그룹 적용 안내](../infra/README.md#nginx-외부-http-접속-허용하기)에 따라 Terraform 계획을 확인하고 HTTP 80번을 허용합니다. EC2 교체나 전체 삭제는 이 작업에 필요하지 않습니다.

프로젝트 루트에서 다음 명령으로 EC2에 Nginx 디렉터리를 만듭니다. `/개인키/경로.pem`과 `EC2_PUBLIC_IP`는 실제 값으로 바꿉니다.

```bash
ssh -i /개인키/경로.pem ubuntu@EC2_PUBLIC_IP 'mkdir -p ~/outpick/nginx'
scp -i /개인키/경로.pem ./compose.deploy.yaml ubuntu@EC2_PUBLIC_IP:~/outpick/
scp -i /개인키/경로.pem ./nginx/default.conf ubuntu@EC2_PUBLIC_IP:~/outpick/nginx/
```

`ssh`는 서버에서 디렉터리 생성 명령을 실행하고, `scp`는 파일을 복사합니다. `-i`는 SSH 개인 키 경로입니다. 목적지의 `:`는 원격 서버 경로를 뜻하므로 생략하지 않습니다. EC2에 작성한 `.env`는 그대로 사용합니다.

### EC2에서 실행하기

다음 명령은 EC2에 SSH로 접속한 터미널에서 순서대로 실행합니다. 각 명령이 오류 없이 끝난 뒤 다음 명령으로 넘어갑니다.

```bash
cd ~/outpick
docker compose -f compose.deploy.yaml config --quiet
docker compose -f compose.deploy.yaml pull nginx
docker compose -f compose.deploy.yaml run --rm --no-deps nginx nginx -t
docker compose -f compose.deploy.yaml up -d --wait
```

- `-f`는 사용할 Compose 파일을 지정합니다.
- `config --quiet`는 최종 설정을 출력하지 않고 검사합니다.
- `pull nginx`는 Nginx 이미지를 내려받습니다.
- `run --rm --no-deps nginx nginx -t`는 Nginx 서비스를 바탕으로 임시 컨테이너를 만들고 설정 문법을 검사합니다. `--rm`은 검사 후 컨테이너를 지우고, `--no-deps`는 다른 서비스를 함께 시작하지 않습니다. `syntax is ok`와 `test is successful`을 확인합니다.
- `up -d --wait`는 서비스를 백그라운드에서 실행하고 실행 상태를 확인합니다. Backend 앱의 준비 완료는 아래 HTTP 요청으로 확인합니다.

```bash
curl -i -w '\n' http://localhost/api/v1/examples/1
```

`curl`은 HTTP 요청을 보내고, `-i`는 상태 코드와 헤더도 보여줍니다. `-w '\n'`은 출력 끝에 줄바꿈을 추가합니다. HTTP 200과 `{"name":"예시 액티비티","participantCount":3}`이 나오면 Nginx의 내부 전달이 정상입니다.

그다음 내 Mac의 브라우저에서 `http://EC2_PUBLIC_IP/api/v1/examples/1`을 엽니다. 반드시 `http://`로 접속합니다. 아직 HTTPS와 도메인은 연결하지 않았습니다. 같은 JSON 응답이 나오면 외부 접속까지 완료입니다.

### 설정 변경과 오류 확인

Nginx 설정 파일만 수정했다면 EC2에 다시 복사한 후 설정 검사와 재적용을 실행합니다.

```bash
docker compose -f compose.deploy.yaml exec nginx nginx -t
docker compose -f compose.deploy.yaml exec nginx nginx -s reload
```

`exec`는 실행 중인 컨테이너 안에서 명령을 실행합니다. `nginx -t`가 성공한 경우에만 `nginx -s reload`로 새 설정을 적용합니다. Compose의 포트나 볼륨 설정을 변경했다면 `up -d --wait`로 반영합니다.

EC2 내부 요청도 실패하면 다음 로그를 확인합니다.

```bash
docker compose -f compose.deploy.yaml ps
docker compose -f compose.deploy.yaml logs --tail 100 nginx backend
```

EC2 내부에서는 정상인데 내 Mac에서 접속이 안 되면 EIP와 보안 그룹의 TCP 80번 허용을 확인합니다. 이 단계에서는 EC2의 앱 8080번·18080번이나 DB 3306번을 외부에 열지 않습니다.

참고: [Nginx proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass), [Nginx upstream 주소 갱신](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#resolve).

로컬 Nginx 1.30.6에서 설정 문법 검사, GET 정상 JSON과 요청 ID 전달, POST 본문 전달, Backend의 404 ProblemDetail 전달을 확인했습니다. `/`, `/actuator/health`, `/swagger-ui.html`은 Nginx에서 404를 반환했습니다. Backend 컨테이너를 다른 내부 IP로 교체한 뒤에도 Nginx를 재시작하지 않고 HTTP 200 응답이 복구되는 것을 확인했습니다. 검증용 컨테이너는 종료하며 DB 볼륨은 보존합니다. 이번 변경은 설정 파일만 수정했으므로 기존 Java 테스트는 다시 실행하지 않았습니다. EC2에서 Nginx 실행과 외부 브라우저 접속 확인은 남아 있습니다.

## 장소 저장 모델

ERD v3 기반 장소·지역·종목·시즌·출처·공지 엔티티와 Flyway 마이그레이션을 추가했다. 장소와 공지의 게시 상태는 `0=검수 전(기본값)`, `1=공개`, `2=비공개`이며 각각 V2/V3에서 적용한다. 구현 범위, SQL 대비 변경점과 미정 사항은 [장소 모델 문서](docs/place-model.md)를 참고한다. 대표 사진·운영시간 저장 방식은 아직 확정하지 않았다. 검색·상세 API는 구현했으며 등록 API는 후속 작업이다.

## 활성화된 로컬 URL

| 로컬 URL | 용도 |
|---|---|
| [`/actuator`](http://localhost:8080/actuator) | HTTP로 공개된 Actuator 엔드포인트 목록을 확인합니다. |
| [`/actuator/health`](http://localhost:8080/actuator/health) | 애플리케이션 상태를 확인합니다. 정상 기동과 DB 연결이 확인되면 `UP`을 반환합니다. |
| [`/swagger-ui.html`](http://localhost:8080/swagger-ui.html) | Swagger UI 진입점입니다. `/swagger-ui/index.html`로 이동합니다. |
| [`/v3/api-docs`](http://localhost:8080/v3/api-docs) | OpenAPI 명세를 JSON으로 제공합니다. |
| [`/v3/api-docs.yaml`](http://localhost:8080/v3/api-docs.yaml) | 같은 OpenAPI 명세를 YAML로 제공합니다. |

## 도메인 API 공통 경로

공개 장소 검색은 `GET /api/v1/places`로 제공한다. 필터·지도 범위·정렬·페이지 응답과 검증 방법은 [장소 검색 API 문서](docs/place-search-api.md)를 참고한다. 통합 브랜치의 프론트 연결·필터 선택지·demo 프로필 실행은 [연결 문서](docs/place-integration.md)를 참고한다.

공개 장소 상세는 `GET /api/v1/places/{placeId}`로 제공한다. 활동·시즌·확인된 출처·유효한 공개 공지를 반환하며 비공개 장소는 404로 처리한다. 응답과 공지 시각 정책은 [장소 상세 API 문서](docs/place-detail-api.md)를 참고한다.

`com.outpick.domain` 아래의 `@RestController`에는 Spring MVC가 `/api/v1`을 공통으로 붙입니다. 컨트롤러에는 `@RequestMapping("/examples")`처럼 리소스 경로만 작성합니다. 실제 요청 주소는 `/api/v1/examples/1`입니다. 접두사를 컨트롤러마다 중복 작성하지 않습니다.

공통 접두사는 [`WebConfig.API_PREFIX`](src/main/java/com/outpick/global/config/WebConfig.java)에서 관리합니다. 실행 환경별 설정이 아니라 클라이언트와 공유하는 API 계약입니다. 이 값을 바꾸면 전체 도메인 API의 주소가 바뀌므로, 향후 v1·v2를 동시에 제공하려면 별도의 버전 구성이 필요합니다.

Swagger UI가 안내하는 도메인 API도 같은 접두사를 사용합니다. Swagger 문서(`/v3/api-docs`), Swagger UI, Actuator는 도메인 컨트롤러가 아니므로 기존 경로를 유지합니다. Prometheus도 활성화할 경우 `/actuator/prometheus`를 사용합니다. 이번 작업에서 지표 공개 설정을 추가한 것은 아닙니다.

## 환경별 CORS 정책

[`CorsProperties`](src/main/java/com/outpick/global/config/CorsProperties.java)가 `app.cors.allowed-origins`를 읽고 `WebConfig`가 `/api/v1/**`에 적용합니다. 허용 출처는 현재 `application-local.yaml`에만 등록했습니다.

```yaml
app:
  cors:
    allowed-origins:
      - http://localhost:3000
```

- 정확히 등록한 출처에 쿠키 등 자격 증명 전송을 허용합니다. 허용 출처에 `*`는 사용하지 않습니다.
- 메서드는 `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, 요청 헤더는 `Content-Type`, `Authorization`을 허용합니다.
- 포트가 다르거나 `127.0.0.1`을 사용하면 다른 출처입니다. 필요한 주소를 해당 환경의 목록에 명시적으로 추가합니다.
- 다른 프로필에서는 허용 출처가 기본적으로 비어 있습니다. 필요한 출처를 해당 환경에서 별도로 설정해야 합니다.
- 허용 출처의 정상 응답과 컨트롤러의 ProblemDetail·Validation 오류 응답에 CORS 헤더를 제공합니다. CORS 정책 자체가 거부한 요청은 Spring의 403 응답으로 처리됩니다.

CORS는 브라우저의 교차 출처 접근 정책이며 인증·권한 검사나 CSRF 방어를 대신하지 않습니다. 서버 간 호출과 Prometheus 수집은 브라우저의 CORS 제한을 받지 않습니다. Swagger UI가 Backend와 같은 출처에서 실행되면 별도 Frontend 출처 허용 없이 호출할 수 있습니다.

Spring Security 도입 시 Security 필터에서도 이 MVC CORS 정책을 사용하도록 연결해야 합니다. 허용 메서드·헤더 추가는 인증·CSRF 정책을 정할 때 함께 검토합니다. 이번에는 인증·CSRF 설정을 변경하지 않았습니다.

로컬 Backend 실행 후 다음 요청으로 응답 헤더를 확인할 수 있습니다.

```bash
# 성공 응답의 출처·자격 증명 허용 헤더 확인
curl -i http://localhost:8080/api/v1/examples/1 \
  -H 'Origin: http://localhost:3000'

# JSON POST 전 사전 요청 확인
curl -i -X OPTIONS http://localhost:8080/api/v1/examples/preview \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,authorization'
```

curl은 브라우저처럼 CORS를 강제하지 않습니다. 이 요청은 서버가 반환하는 헤더 확인용입니다. 사용자가 Frontend에서 ID 1 성공·ID 2 업무 오류 응답을 확인했습니다. 인증 쿠키 전송 검증은 별도입니다.

[`WebConfigTests`](src/test/java/com/outpick/global/config/WebConfigTests.java)와 [`WebConfigWithoutOriginsTests`](src/test/java/com/outpick/global/config/WebConfigWithoutOriginsTests.java)는 실제 MVC에서 허용·거부 출처, 오류 응답, 사전 요청과 v1 경로를 검증합니다. [`BackendApplicationTests`](src/test/java/com/outpick/BackendApplicationTests.java)는 Testcontainers MySQL과 전체 애플리케이션에서 OpenAPI·Swagger·Actuator 경로도 확인합니다.

참고: [Spring MVC CORS 공식 문서](https://docs.spring.io/spring-framework/reference/web/webmvc-cors.html).

## API 성공 응답

본문이 있는 성공 응답은 각 API의 DTO를 JSON 본문으로 직접 반환합니다. 

공통 `data` 래퍼는 사용하지 않습니다.

- 조회는 `200 OK`와 단건 또는 목록 DTO를 반환합니다.
- 생성은 `201 Created`를 반환합니다. 생성한 리소스를 조회할 URL이 있으면 `Location` 헤더에 담습니다.
- 본문이 필요 없는 성공 응답은 `204 No Content`를 반환합니다.

단건 조회 응답 예시입니다.

```json
{
  "id": 42,
  "name": "한강 카약 체험장"
}
```

페이지 목록은 항목과 페이지 정보를 하나의 DTO로 반환합니다. 

아래는 페이지 번호를 사용하는 목록의 예시입니다.

```json
{
  "items": [
    { "id": 42, "name": "한강 카약 체험장" }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1
}
```

## 공통 오류 응답

Spring MVC에서 발생한 오류는 RFC 9457의 `ProblemDetail` 형식으로 반환합니다. 

응답의 Content-Type은 `application/problem+json`입니다. 

HTTP 상태 코드와 본문의 `status`는 같은 값을 사용합니다.

다음은 장소를 찾지 못한 경우의 `404 Not Found` 응답 예시입니다.

```json
{
  "title": "Not Found",
  "status": 404,
  "detail": "장소를 찾을 수 없습니다.",
  "instance": "/api/v1/places/42",
  "code": "PLACE_NOT_FOUND",
  "requestId": "c187928f-5800-4d36-9f62-1ccf86445e17"
}
```

| 필드 | 용도 |
|---|---|
| `title` | HTTP 상태의 기본 제목 |
| `status` | HTTP 상태 코드 |
| `detail` | 사용자에게 공개할 오류 안내 |
| `instance` | 오류가 발생한 요청 경로 |
| `code` | 프론트가 오류를 구분할 때 사용하는 코드 |
| `requestId` | 같은 요청의 서버 로그를 찾는 식별자 |

`type`의 기본값은 `about:blank`이며 현재 JSON 직렬화에서는 생략됩니다. 

`code`와 `requestId`는 OUTPICK이 추가한 확장 필드입니다.

### 도메인 오류 사용법

각 도메인은 enum으로 오류 목록을 정의합니다.

각 요소는 HTTP 상태, 오류 코드, 공개할 안내 문구를 담은 `global.error.ErrorCode` record를 보관합니다.

아래 코드는 장소 도메인에 적용할 예시입니다.

```java
@Getter
public enum PlaceErrorCode {
    PLACE_NOT_FOUND(HttpStatus.NOT_FOUND, "장소를 찾을 수 없습니다."),
    PLACE_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 등록된 장소입니다.");

    private final ErrorCode errorCode;

    PlaceErrorCode(HttpStatus status, String message) {
        this.errorCode = new ErrorCode(status, name(), message);
    }
}
```

Lombok의 `@Getter`가 `getErrorCode()`를 생성합니다.

새 오류는 enum에 상태와 문구를 추가하고, 요소 이름을 오류 코드로 사용합니다.

요소 이름은 프론트의 오류 분기에 사용되므로 변경 시 연동을 함께 확인합니다.

기능 코드에서는 `throw new BusinessException(PlaceErrorCode.PLACE_NOT_FOUND.getErrorCode());`처럼 record를 전달합니다.

`GlobalExceptionHandler`가 해당 오류를 공통 응답으로 변환합니다.

안내 문구에는 클라이언트에 공개할 내용을 사용합니다.

<br />

Spring MVC 오류는 상태 이름을 코드로 사용합니다. 

잘못된 JSON은 `400`·`BAD_REQUEST`, 없는 경로는 `404`·`NOT_FOUND`, 지원하지 않는 HTTP 메서드는 `405`·`METHOD_NOT_ALLOWED`를 반환합니다.

필요한 `Allow` 등의 HTTP 헤더도 유지합니다.

예상하지 못한 예외는 `500`·`INTERNAL_SERVER_ERROR`와 공통 안내 문구로 반환하고, 원인과 스택 트레이스는 서버 로그에 기록합니다.

### 요청 ID와 로그 확인

`RequestIdFilter`가 요청마다 UUID를 생성하고 `X-Request-Id` 응답 헤더에 담습니다. 

오류 본문의 `requestId`도 같은 값을 사용합니다. 

요청 처리 중 MDC에 저장한 ID는 로그의 `[requestId=...]`에 표시됩니다. 

오류를 조사할 때 응답에서 받은 ID를 서버 로그에서 검색합니다.

<br />

각 요청의 ID는 서버에서 생성합니다. 
비동기 재디스패치에는 같은 ID를 사용하며, 별도 작업 스레드의 로그에 MDC를 전파하는 기능은 추후 비동기 실행 구성 시 검토합니다.

### 테스트로 사용 예시 확인

[`GlobalExceptionHandlerTests`](src/test/java/com/outpick/global/error/GlobalExceptionHandlerTests.java)의 테스트 전용 컨트롤러와 오류 코드를 참고하세요. 

도메인 오류, 잘못된 JSON, 없는 경로, HTTP 메서드 오류, 예상치 못한 예외, 성공 응답의 요청 ID를 검증합니다.

```bash
# backend 디렉터리에서 실행
./gradlew test --tests com.outpick.global.error.GlobalExceptionHandlerTests
```

이 MVC 테스트는 DB 없이 실행됩니다. 

## 요청 값 검증

요청 DTO에는 Jakarta Validation 제약을 선언하고, 컨트롤러의 요청 본문에는 `@Valid`를 붙입니다.

`GlobalExceptionHandler`가 검증 실패를 `400`·`VALIDATION_FAILED` 응답으로 변환합니다.

```java
public record CreatePlaceRequest(
    @NotBlank(message = "장소 이름을 입력해 주세요.") String name
) {}
```

컨트롤러에서는 `@Valid @RequestBody CreatePlaceRequest request`로 받습니다. 

쿼리·경로 파라미터에는 `@Min`, `@Max` 등의 제약을 직접 선언합니다. 

예를 들어 `@RequestParam("size") @Max(value = 50, message = "페이지 크기는 50 이하여야 합니다.") int pageSize`처럼 작성합니다. 

오류에는 Java 변수명인 `pageSize` 대신 공개 파라미터명인 `size`를 담습니다.

<br />

컨트롤러 클래스에 `@Validated`를 추가하면 AOP 방식의 메서드 검증으로 처리 경로가 달라집니다. 

현재 공통 처리기는 Spring MVC 내장 메서드 검증을 사용하므로 컨트롤러 클래스의 `@Validated` 없이 사용합니다.

<br />

검증 실패 응답은 기존 ProblemDetail 필드에 `fieldErrors`를 추가합니다.

```json
{
  "title": "Bad Request",
  "status": 400,
  "detail": "요청 값을 확인해 주세요.",
  "instance": "/api/v1/places",
  "code": "VALIDATION_FAILED",
  "requestId": "c187928f-5800-4d36-9f62-1ccf86445e17",
  "fieldErrors": [
    {
      "field": "name",
      "message": "장소 이름을 입력해 주세요."
    }
  ]
}
```

- `field`는 요청 필드 경로나 쿼리·경로 파라미터 이름입니다.
- 중첩 DTO와 배열은 `@Valid`로 함께 검증하면 `address.city`, `photos[0].url`처럼 위치를 반환합니다.
- 같은 필드의 여러 제약이 실패하면 오류를 각각 담습니다. 배열 순서는 보장하지 않으며 프론트는 `field`로 입력란과 연결합니다.
- 오류 객체에는 `field`와 `message`만 담습니다. 제약의 안내 문구는 클라이언트에 공개할 내용으로 작성하고 비밀번호 등 실제 입력값을 포함하지 않습니다.
- JSON 문법 오류, 필수 파라미터 누락, 숫자 변환 실패는 기존 `BAD_REQUEST` 응답으로 처리합니다. 필드별 제약 검증은 `VALIDATION_FAILED`로 구분합니다.

[`ValidationExceptionHandlerTests`](src/test/java/com/outpick/global/error/ValidationExceptionHandlerTests.java)에 DTO·파라미터 제약 선언과 정상·오류 요청 예시가 있습니다. 중첩 경로, 한 필드의 여러 오류, 비밀번호 입력값 제외, 반환값 검증 실패의 `500` 응답도 확인합니다.

```bash
# backend 디렉터리에서 실행
./gradlew test --tests com.outpick.global.error.ValidationExceptionHandlerTests
```

[Spring MVC 공식 검증 문서](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html)

[Spring MVC 공식 오류 응답 문서](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html)

## 예시 도메인과 패키지 구조

`com.outpick.domain.example`은 도메인 안에 계층별 패키지를 두는 구조와 공통 기능 사용법을 보여 줍니다.

```text
domain/example/
├── controller/ExampleController.java
├── service/ExampleService.java
├── dto/
│   ├── ExampleCreateRequest.java
│   └── ExampleResponse.java
└── exception/ExampleErrorCode.java
```

| 패키지 | 예시에서의 역할 |
|---|---|
| `controller` | HTTP 요청을 받고 입력 검증 후 서비스를 호출해 응답 DTO 반환 |
| `service` | 고정 예시 조회와 미리보기 처리, 상황에 맞는 도메인 예외 발생 |
| `dto` | 입력 필드 제약과 응답 데이터 정의 |
| `exception` | 도메인별 오류 목록과 공통 `ErrorCode` record 보관 |

`global`에는 여러 도메인이 사용하는 예외 처리·검증 오류 응답·요청 ID 필터가 있습니다. 예시 도메인은 이 공통 코드를 사용합니다.

### 예시 API 호출

앱을 실행한 뒤 다음 API를 호출하거나 Swagger UI에서 실행할 수 있습니다. 예시 서비스는 DB 접근 없이 고정 데이터와 입력값으로 응답을 만듭니다. 앱 기동에는 기존 MySQL 실행 설정이 필요합니다.

| API | 동작 |
|---|---|
| `GET /api/v1/examples/1` | 고정 예시를 `200`과 DTO 본문으로 반환 |
| `GET /api/v1/examples/2` | 서비스에서 `BusinessException` 발생, 공통 처리기가 `404`·`EXAMPLE_NOT_FOUND` 반환 |
| `GET /api/v1/examples/0` | 양수 ID 제약에 실패해 `400`·`VALIDATION_FAILED`와 `id` 오류 반환 |
| `POST /api/v1/examples/preview` | 입력 필드를 검증하고 미리보기 DTO를 `200`으로 반환 |

미리보기는 데이터를 저장하지 않으므로 이후 조회 결과는 고정 예시를 유지합니다. 생성 요청 DTO의 필드 제약을 확인할 수 있는 API입니다.

```bash
# 정상 조회
curl -i http://localhost:8080/api/v1/examples/1

# 도메인 오류
curl -i http://localhost:8080/api/v1/examples/2

# 정상 미리보기
curl -i http://localhost:8080/api/v1/examples/preview \
  -H 'Content-Type: application/json' \
  -d '{"name":"예시 액티비티","participantCount":3}'

# 필수 필드 오류: 이름 공백, 인원수 누락
curl -i http://localhost:8080/api/v1/examples/preview \
  -H 'Content-Type: application/json' \
  -d '{"name":" "}'
```

정상 조회와 미리보기의 응답 본문은 다음 형식입니다.

```json
{
  "name": "예시 액티비티",
  "participantCount": 3
}
```

`ExampleCreateRequest`는 이름의 `@NotBlank`·`@Size(max = 30)`과 인원수의 `@NotNull`·`@Min(1)`·`@Max(10)`을 보여 줍니다. 인원수는 `Integer`여서 누락을 `null`로 받아 필수값 제약으로 처리할 수 있습니다. 필드 오류는 기존 `fieldErrors` 응답으로 반환합니다.

[`ExampleControllerTests`](src/test/java/com/outpick/domain/example/ExampleControllerTests.java)는 실제 컨트롤러와 서비스를 연결하고 공통 예외 처리기·필터를 사용합니다. DB 없이 예시 API의 정상 응답, 범위의 경계, 필수값·길이·숫자 범위 검증, 도메인 오류를 확인합니다.

```bash
# backend 디렉터리에서 실행
./gradlew test --tests com.outpick.domain.example.ExampleControllerTests
```
