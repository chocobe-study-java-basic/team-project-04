# EC2에서 Frontend 화면과 API 확인하기

이번 결과물은 브라우저에서 `http://EC2_PUBLIC_IP/main-example/`을 열어 화면과 Backend의 예시 응답을 함께 확인하는 것이다. `EC2_PUBLIC_IP`는 실제 EC2의 EIP로 바꾼다. Terraform 변경이나 EC2 재생성은 필요 없다.

```text
브라우저 → Nginx ┬─ 화면·JS·CSS 요청 → 이미지에 포함된 Frontend 파일
                └─ /api/ 요청 → backend:8080
```

`frontend/Dockerfile`은 Node.js 26에서 `npm ci`와 정적 빌드를 실행한다. 최종 이미지에는 Nginx와 `out/` 전체만 담는다. EC2에는 Node.js를 설치하지 않는다. Nginx 설정은 기존처럼 `nginx/default.conf`를 읽기 전용으로 연결하며, Compose 서비스 이름도 `nginx`를 유지한다.

## Mac에서 이미지 빌드와 실행 확인하기

Docker Desktop을 실행하고 프로젝트 루트에서 이미지를 만든다.

```bash
docker build -t chocobe/outpick-frontend:v0 ./frontend
```

`-t`는 이미지 이름과 태그를 지정한다. `./frontend`는 Docker에 전달할 파일의 기준 디렉터리다. `.dockerignore`는 개인 `.env` 파일·키 파일·기존 빌드 결과를 제외한다. 기본 API 주소는 `/`이며 로컬 개발용 `.env.local`은 읽지 않는다. 이미지 빌드는 테스트를 실행하지 않으므로 기존 Frontend 검사와 테스트는 별도로 실행한다.

루트 `.env`가 없다면 [MySQL 실행 안내](../../README.md#mysql-실행)에 따라 작성한다. Backend 이미지는 기존 `chocobe/outpick-backend:v0`를 사용한다. 각 명령이 성공한 뒤 다음 명령을 실행한다.

```bash
docker compose -f compose.deploy.yaml config --quiet
docker compose -f compose.deploy.yaml run --rm --no-deps nginx nginx -t
docker compose -f compose.deploy.yaml up -d --wait
docker compose -f compose.deploy.yaml logs --tail 100 backend
```

`config --quiet`는 비밀번호를 포함한 설정을 출력하지 않고 검사한다. `run --rm --no-deps`는 다른 서비스를 시작하지 않고 임시 컨테이너에서 설정을 검사한 뒤 제거한다. `nginx -t`의 `test is successful`을 확인한다. `up -d --wait`는 백그라운드 실행 후 컨테이너 상태를 기다린다. Backend에는 healthcheck가 없으므로 `Started BackendApplication` 로그와 실제 API 응답으로 준비 완료를 확인한다.

브라우저에서 `http://localhost/main-example/`을 연다. ID 1의 이름·참여 인원, ID 2의 오류 안내, 다시 조회와 새로고침을 확인한다. `/`에서는 기존 샘플 장소 탐색 화면을 제공하며, 장소 데이터는 실제 Backend API와 연결되지 않은 가상 데이터다.

종료할 때는 다음 명령을 사용한다. MySQL 데이터 볼륨은 유지한다.

```bash
docker compose -f compose.deploy.yaml down
```

## Mac에서 Docker Hub에 업로드하기

로컬 검증 후 프로젝트 루트에서 ARM64와 AMD64 이미지를 함께 빌드해 올린다. Docker Hub 로그인이 필요하며 저장소를 Public으로 공개해야 EC2에서 로그인 없이 내려받을 수 있다.

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t chocobe/outpick-frontend:v0 --push ./frontend
```

`--platform`은 EC2용 AMD64와 Mac용 ARM64를 지정한다. `--push`는 완성한 이미지를 Docker Hub에 업로드한다. 기본 빌드에서는 카카오 지도 키를 넣지 않으므로 지도 영역에 키 누락 안내가 표시된다. 예시 API 배포 확인에는 필요하지 않다. 실제 지도 연결은 JavaScript 키를 `NEXT_PUBLIC_KAKAO_MAP_JS_KEY` 빌드 인자로 전달하고 Kakao에 서비스 도메인을 등록한 뒤 다시 빌드한다. 이 키는 브라우저에 공개되며 REST API·Admin 키는 사용하지 않는다.

## Mac에서 배포 파일 업로드하기

기존과 동일한 두 파일을 다시 복사한다. `/개인키/경로.pem`과 `EC2_PUBLIC_IP`는 실제 값으로 바꾼다. `frontend/out/`은 이미지에 포함되므로 따로 복사하지 않는다.

```bash
ssh -i /개인키/경로.pem ubuntu@EC2_PUBLIC_IP 'mkdir -p ~/outpick/nginx'
scp -i /개인키/경로.pem ./compose.deploy.yaml ubuntu@EC2_PUBLIC_IP:~/outpick/
scp -i /개인키/경로.pem ./nginx/default.conf ubuntu@EC2_PUBLIC_IP:~/outpick/nginx/
```

`ssh`는 서버에서 디렉터리를 만들고, `scp`는 파일을 복사한다. `-i`는 개인 키 경로를 지정한다. 목적지의 `:`를 생략하지 않는다. EC2의 기존 `~/outpick/.env`는 그대로 사용한다. 새 EC2라면 Docker 설치가 끝난 뒤 이 파일을 작성하고 `chmod 600 .env`로 소유자만 읽고 쓸 수 있게 한다. Frontend API 주소는 이미지에 포함되어 있어 EC2 `.env`에 추가하지 않는다.

## EC2에서 이미지 교체와 응답 확인하기

SSH로 EC2에 접속한 터미널에서 실행한다. Docker Hub 업로드가 끝나고 배포 파일을 복사한 뒤 진행한다.

```bash
cd ~/outpick
docker compose -f compose.deploy.yaml config --quiet
docker compose -f compose.deploy.yaml pull
docker compose -f compose.deploy.yaml run --rm --no-deps nginx nginx -t
docker compose -f compose.deploy.yaml up -d --wait
docker compose -f compose.deploy.yaml logs --tail 100 backend
curl -i -w '\n' http://localhost/main-example/
curl -i -w '\n' http://localhost/api/v1/examples/1
```

`pull`은 Compose의 이미지를 내려받는다. `up`은 이미지가 바뀐 서비스를 교체한다. `curl -i`는 상태 코드·헤더·본문을 보여주고, `-w '\n'`은 마지막에 줄바꿈을 추가한다. 화면 요청은 HTTP 200의 HTML, API 요청은 HTTP 200의 예시 JSON이어야 한다. 앱 시작 직후 API가 502이면 Backend 시작 로그를 확인한 뒤 다시 요청한다.

마지막으로 Mac 브라우저에서 `http://EC2_PUBLIC_IP/main-example/`을 열고 로컬에서 확인한 조회·오류 안내·재조회·새로고침을 확인한다. 아직 HTTP 단계이며 도메인과 HTTPS 연결은 후속 작업이다. 없는 화면 경로는 404를 반환한다. Swagger와 Actuator는 외부로 전달하지 않는다.

참고: [Next.js 정적 배포](https://nextjs.org/docs/app/guides/static-exports), [빌드 시 공개 환경변수](https://nextjs.org/docs/app/guides/environment-variables), [Nginx 파일 탐색](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files).

## 이번 로컬 검증 결과

2026-11-17 Apple Silicon Mac에서 린트·타입 검사·테스트 76개와 ARM64 Docker 이미지 빌드를 통과했다. 배포용 Compose로 MySQL·Backend·Nginx를 실행해 다음 결과를 확인했다.

- `/`, `/main-example/`, `/minimal-example/`, `/admin-example/`, `/places/detail/?id=1`의 HTML과 JS·CSS 자원 16개가 HTTP 200을 반환했다.
- 빌드한 JavaScript의 API 주소는 `/`이며 개발용 `http://localhost:8080`은 포함되지 않았다.
- Backend health는 `UP`이었다. Nginx 경유 GET 성공 JSON·요청 ID, ID 2의 404 ProblemDetail, POST 본문 전달을 확인했다.
- Next.js의 화면 이동용 `index.txt`가 제공되고, 없는 화면·Swagger·Actuator 요청은 HTTP 404를 반환했다.

브라우저 자동 확인 도구에 연결할 수 없어 버튼 동작·화면 이동·새로고침은 아직 확인하지 않았다. Docker Hub 업로드·AMD64 이미지 실행·EC2 적용도 이번 로컬 검증에 포함하지 않는다. 기존 Backend 코드는 변경하지 않았으며 Java 테스트는 다시 실행하지 않았다.
